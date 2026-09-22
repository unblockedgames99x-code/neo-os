(function () {
  "use strict";

  var activeLoads = new WeakMap();
  var LARGE_DOCUMENT_BYTES = 4 * 1024 * 1024;

  function isRunner() {
    return Boolean(document.querySelector('meta[name="neo-runner"]'));
  }

  function isAllowedLocalSource(sourceUrl) {
    var allowedOrigins = [location.origin];
    try {
      if (window.NEO_LOCAL_CONFIG && window.NEO_LOCAL_CONFIG.assetBase) {
        allowedOrigins.push(new URL(window.NEO_LOCAL_CONFIG.assetBase, document.baseURI).origin);
      }
    } catch (_error) {}
    return allowedOrigins.indexOf(new URL(sourceUrl).origin) !== -1;
  }

  function isConfiguredDirectSource(sourceUrl) {
    try {
      var source = new URL(sourceUrl, document.baseURI);
      var config = window.NEO_LOCAL_CONFIG || {};
      return [config.browser, config.appProxy].filter(Boolean).some(function (configured) {
        var browser = new URL(configured, document.baseURI);
        return source.origin === browser.origin && source.pathname === browser.pathname;
      });
    } catch (_error) {
      return false;
    }
  }

  function isConfiguredGameDocument(sourceUrl) {
    try {
      var configured = window.NEO_LOCAL_CONFIG && window.NEO_LOCAL_CONFIG.gameDocumentRelay;
      if (!configured) return false;
      var source = new URL(sourceUrl, document.baseURI);
      var relay = new URL(configured, document.baseURI);
      return source.origin === relay.origin && source.pathname === relay.pathname && source.searchParams.has("url");
    } catch (_error) {
      return false;
    }
  }

  function originalGameDocumentUrl(sourceUrl) {
    try {
      if (!isConfiguredGameDocument(sourceUrl)) return "";
      var target = new URL(sourceUrl, document.baseURI).searchParams.get("url") || "";
      var game = new URL(target);
      if (game.protocol !== "https:" || game.hostname.toLowerCase() !== "a.luminsdk.com" || !/^\/g\/[A-Za-z0-9_-]+\//.test(game.pathname)) return "";
      return game.href;
    } catch (_error) {
      return "";
    }
  }

  function sanitizeGameDocument(source, originalUrl) {
    var html = String(source || "");
    html = html.replace(/<meta\b[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, "");
    html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, function (tag) {
      if (/cdn\.r9x\.in|googletagmanager\.com|google-analytics\.com|doubleclick\.net|googlesyndication\.com|\/js\/all\.min\.js(?:[?#"'])/i.test(tag)) return "";
      if (/\b(?:dataLayer|gtag)\s*(?:=|\(|\.push)/i.test(tag)) return "";
      return tag;
    });
    html = html.replace(/<(?:iframe|ins|aside)\b[^>]*(?:doubleclick\.net|googlesyndication\.com|cdn\.r9x\.in|\bclass=["'][^"']*\b(?:advert|interstitial|ad-container)\b)[^>]*>[\s\S]*?<\/(?:iframe|ins|aside)\s*>/gi, "");
    html = html.replace(/<base\b[^>]*>/gi, "");
    var base = '<base href="' + escapeAttribute(originalUrl) + '" target="_self">';
    if (/<head(?:\s[^>]*)?>/i.test(html)) {
      return html.replace(/<head(?:\s[^>]*)?>/i, function (head) { return head + base; });
    }
    return "<head>" + base + "</head>" + html;
  }

  function resolveUrl(route) {
    return new URL(String(route || ""), document.baseURI).href;
  }

  function escapeAttribute(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function deferExternalEmbeds(source, sourceUrl, baseUrl) {
    var sourceOrigin = new URL(sourceUrl).origin;
    return String(source || "").replace(/<(iframe|embed|object)\b[^>]*>/gi, function (tag, tagName) {
      var attribute = String(tagName).toLowerCase() === "object" ? "data" : "src";
      var pattern = new RegExp("\\b" + attribute + "\\s*=\\s*([\"'])([^\"']+)\\1", "i");
      var match = tag.match(pattern);
      if (!match) return tag;
      var target;
      try { target = new URL(match[2], baseUrl); } catch (_error) { return tag; }
      if (!/^(?:https?:)$/i.test(target.protocol) || target.origin === sourceOrigin) return tag;
      return tag.replace(match[0], attribute + '="about:blank" data-neo-proxy-src="' + escapeAttribute(target.href) + '"');
    });
  }

  function prepareDocument(source, sourceUrl) {
    var baseUrl = new URL("./", sourceUrl).href;
    var html = String(source || "");
    var gameDocument = isConfiguredGameDocument(sourceUrl);
    // A fetched document becomes srcdoc under the runner origin. Its original
    // self-only CSP would block the trusted asset base injected just below.
    html = html.replace(/<meta\b[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, "");
    html = html.replace(/<script\b(?=[^>]*\bsrc\s*=\s*["']\/ad-cleanup\.js(?:[?#][^"']*)?["'])[^>]*>\s*<\/script>/gi, "");
    var sourceBase = html.match(/<base\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/i);
    var documentBase = sourceBase ? new URL(sourceBase[1], baseUrl).href : baseUrl;
    if (sourceBase && !/^(?:https?:|data:|blob:)/i.test(sourceBase[1])) {
      html = html.replace(
        sourceBase[0],
        '<base href="' + escapeAttribute(documentBase) + '" target="_self">'
      );
    }
    if (!gameDocument) html = deferExternalEmbeds(html, sourceUrl, documentBase);
    var hasAssetBase = /<base\b[^>]*\bhref\s*=/i.test(html);
    var audioRuntime = !gameDocument && !/\/music-(?:local|v2)\//i.test(sourceUrl)
      ? '<script src="' + escapeAttribute(resolveUrl("./neo-audio-spectrum-bridge.js?v=20260909-all-audio-v1")) + '"><\/script>'
      : "";
    var adShieldRuntime = /<script\b[^>]*\bsrc\s*=\s*["'][^"']*neo-ad-shield\.js(?:[?#][^"']*)?["']/i.test(html)
      ? ""
      : '<script src="' + escapeAttribute(resolveUrl("./neo-ad-shield.js?v=20260912-sitewide-v2")) + '"><\/script>';
    var networkRuntime = "";
    if (
      isRunner() &&
      !gameDocument &&
      !/\/NEO-BROWSER\//i.test(sourceUrl) &&
      !/\/neo-games\//i.test(sourceUrl) &&
      !/\/music-(?:local|v2)\//i.test(sourceUrl) &&
      !/\/games\/web-dashers\.html(?:[?#]|$)/i.test(sourceUrl)
    ) {
      networkRuntime = '<script src="' + escapeAttribute(resolveUrl("./neo-runner-network.js?v=20260831-fast-full-stream-v5")) + '"><\/script>';
    }
    var linkProxyRuntime = gameDocument || /\/(?:NEO-BROWSER|neo-games)\//i.test(sourceUrl)
      ? ""
      : '<script id="neo-link-proxy-runtime" src="' + escapeAttribute(resolveUrl("./neo-link-proxy.js?v=20260911-all-links-v1")) + '"><\/script>';
    var injection = (hasAssetBase ? "" : '<base href="' + escapeAttribute(baseUrl) + '" target="_self">') +
      '<meta name="neo-source-url" content="' + escapeAttribute(sourceUrl) + '">' +
      '<meta name="neo-runner" content="nested">' + linkProxyRuntime + adShieldRuntime + audioRuntime + networkRuntime;
    if (/<head(?:\s[^>]*)?>/i.test(html)) {
      return html.replace(/<head(?:\s[^>]*)?>/i, function (head) {
        return head + injection;
      });
    }
    if (/<html(?:\s[^>]*)?>/i.test(html)) {
      return html.replace(/<html(?:\s[^>]*)?>/i, function (root) {
        return root + "<head>" + injection + "</head>";
      });
    }
    return "<!doctype html><html><head>" + injection + "</head><body>" + html + "</body></html>";
  }

  function documentCandidates(sourceUrl) {
    var candidates = [sourceUrl];
    try {
      var parsed = new URL(sourceUrl);
      var match = parsed.pathname.match(/^\/gh\/([^/]+)\/([^/@]+)@([^/]+)\/(.+)$/);
      if (/\.jsdelivr\.net$/i.test(parsed.hostname) && match) {
        ["fastly.jsdelivr.net", "gcore.jsdelivr.net"].forEach(function (hostname) {
          if (hostname !== parsed.hostname) {
            var mirror = new URL(parsed.href);
            mirror.hostname = hostname;
            candidates.push(mirror.href);
          }
        });
        var rawUrl = "https://raw.githubusercontent.com/" + match.slice(1).join("/");
        candidates.push(rawUrl);
      }
    } catch (_error) {}
    return candidates;
  }

  function fetchDocument(sourceUrl, options, signal) {
    var originalGameUrl = originalGameDocumentUrl(sourceUrl);
    var candidates = documentCandidates(sourceUrl);
    // Lumin game documents are CORS-readable. Fetch the original HTML before
    // the relay so NEO can strip ad bootstraps locally without ever rendering
    // the unfiltered page. Keep the relay and browser transport as fallbacks.
    if (originalGameUrl) candidates.unshift(originalGameUrl);
    var lastError = null;

    function attempt(index) {
      if (index >= candidates.length) return Promise.reject(lastError || new Error("The app could not be loaded."));
      var candidate = candidates[index];
      return fetch(candidate, {
        cache: options.cache || "force-cache",
        credentials: "omit",
        signal: signal
      }).then(function (response) {
        if (!response.ok) throw new Error("HTML request failed with status " + response.status + ".");
        return response.text();
      }).then(function (html) {
        return { html: html, fetchedUrl: candidate };
      }).catch(function (error) {
        if (error && error.name === "AbortError") throw error;
        lastError = error;
        return attempt(index + 1);
      });
    }

    return attempt(0).catch(function (error) {
      if (!originalGameUrl || typeof options.gameDocumentFallback !== "function") throw error;
      return Promise.resolve(options.gameDocumentFallback(originalGameUrl, signal)).then(function (result) {
        if (signal && signal.aborted) throw new DOMException("The request was aborted.", "AbortError");
        if (typeof result === "string") return { html: result, fetchedUrl: originalGameUrl };
        if (!result || typeof result.html !== "string") throw new Error("The protected game response was invalid.");
        return { html: result.html, fetchedUrl: result.fetchedUrl || originalGameUrl };
      });
    }).then(function (result) {
      if (originalGameUrl) result.html = sanitizeGameDocument(result.html, originalGameUrl);
      return result;
    });
  }

  function cancel(frame) {
    var previous = activeLoads.get(frame);
    if (previous && previous.controller) previous.controller.abort();
    if (previous && previous.objectUrl) URL.revokeObjectURL(previous.objectUrl);
    activeLoads.delete(frame);
  }

  function load(frame, route, options) {
    options = options || {};
    var sourceUrl = resolveUrl(route);
    if (
      window.NEO_LOCAL_CONFIG &&
      window.NEO_LOCAL_CONFIG.enabled &&
      !isAllowedLocalSource(sourceUrl) &&
      !isConfiguredDirectSource(sourceUrl) &&
      !isConfiguredGameDocument(sourceUrl)
    ) {
      return Promise.reject(new Error("External pages are unavailable in local preview."));
    }
    cancel(frame);

    if ((isConfiguredDirectSource(sourceUrl) || !isRunner() || /\/launch\.svg(?:[?#]|$)/i.test(sourceUrl)) && options.forceFetch !== true) {
      frame.removeAttribute("srcdoc");
      frame.src = sourceUrl;
      return Promise.resolve({ mode: "url", url: sourceUrl });
    }

    var state = { controller: new AbortController(), objectUrl: "" };
    activeLoads.set(frame, state);
    return fetchDocument(sourceUrl, options, state.controller.signal).then(function (result) {
      var html = result.html;
      if (activeLoads.get(frame) !== state) throw new DOMException("Frame load replaced.", "AbortError");
      if (!/<(?:!doctype|html|head|body)\b/i.test(html)) throw new Error("The requested file is not an HTML document.");
      var prepared = prepareDocument(html, sourceUrl);
      state.controller = null;
      if ((options.forceBlob === true || prepared.length >= LARGE_DOCUMENT_BYTES) && typeof Blob === "function" && URL.createObjectURL) {
        state.objectUrl = URL.createObjectURL(new Blob([prepared], { type: "text/html;charset=utf-8" }));
        frame.removeAttribute("srcdoc");
        frame.src = state.objectUrl;
        return { mode: "blob", url: sourceUrl, fetchedUrl: result.fetchedUrl };
      }
      activeLoads.delete(frame);
      frame.removeAttribute("src");
      frame.srcdoc = prepared;
      return { mode: "srcdoc", url: sourceUrl, fetchedUrl: result.fetchedUrl };
    }).catch(function (error) {
      if (activeLoads.get(frame) === state) activeLoads.delete(frame);
      throw error;
    });
  }

  function openDocument(route) {
    var sourceUrl = resolveUrl(route);
    if (!isRunner()) {
      window.open(sourceUrl, "_blank", "noopener,noreferrer");
      return Promise.resolve();
    }

    var popup = window.open("about:blank", "_blank");
    if (!popup) return Promise.reject(new Error("Pop-ups are blocked."));
    popup.document.open();
    popup.document.write("<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Opening...</title><style>html,body{width:100%;height:100%;margin:0;overflow:hidden;background:#000}iframe{position:fixed;inset:0;width:100%;height:100%;border:0;background:#000}</style></head><body></body></html>");
    popup.document.close();
    var frame = popup.document.createElement("iframe");
    frame.title = "NEO OS app";
    frame.allow = "autoplay; clipboard-read; clipboard-write; fullscreen; gamepad";
    frame.allowFullscreen = true;
    popup.document.body.appendChild(frame);
    return load(frame, sourceUrl, { cache: "force-cache" }).then(function () {
      popup.document.title = frame.title;
      popup.focus();
    }).catch(function (error) {
      try {
        popup.document.body.innerHTML = '<main style="min-height:100%;display:grid;place-items:center;color:#fff;font:14px system-ui"><p>This app could not be opened. Please try again.</p></main>';
      } catch (_error) {}
      throw error;
    });
  }

  window.NEOFrameLoader = {
    cancel: cancel,
    isRunner: isRunner,
    load: load,
    open: openDocument,
    prepare: prepareDocument,
    resolve: resolveUrl
  };
})();
