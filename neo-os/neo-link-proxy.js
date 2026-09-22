(function () {
  "use strict";

  if (window.__NEOLinkProxyInstalled || window.parent === window) return;
  window.__NEOLinkProxyInstalled = true;

  var sourceMeta = document.querySelector('meta[name="neo-source-url"]');
  var sourceUrl = sourceMeta && sourceMeta.content ? sourceMeta.content : document.baseURI;
  var sourceOrigin = "";
  try { sourceOrigin = new URL(sourceUrl, document.baseURI).origin; } catch (_error) {}
  var nativeOpen = typeof window.open === "function" ? window.open.bind(window) : null;
  var nativeSetAttribute = Element.prototype.setAttribute;
  var pendingEmbeds = new Map();
  var embedSequence = 0;

  function webUrl(value) {
    try {
      var url = new URL(String(value || ""), document.baseURI);
      if (url.protocol !== "http:" && url.protocol !== "https:") return null;
      url.username = "";
      url.password = "";
      return url;
    } catch (_error) {
      return null;
    }
  }

  function isExternal(value) {
    var url = webUrl(value);
    if (!url) return null;
    if (sourceOrigin && url.origin === sourceOrigin) return null;
    return url;
  }

  function isTrustedDirectEmbed(element, value) {
    if (!element || element.dataset.neoTrustedEmbed !== "youtube") return false;
    var url = webUrl(value);
    return Boolean(url &&
      url.protocol === "https:" &&
      url.hostname === "www.youtube-nocookie.com" &&
      /^\/embed\/[A-Za-z0-9_-]{11}$/.test(url.pathname));
  }

  function postOpen(url, label) {
    window.parent.postMessage({
      type: "neo-shell:proxy-open",
      href: url.href,
      label: String(label || url.hostname || "Web page").slice(0, 100)
    }, "*");
  }

  function setNativeUrl(element, attribute, value) {
    nativeSetAttribute.call(element, attribute, value);
  }

  function requestEmbed(element, value, attribute) {
    if (isTrustedDirectEmbed(element, value)) return false;
    var url = isExternal(value);
    if (!url || !element) return false;
    if (!element.isConnected) {
      element.dataset.neoProxySrc = url.href;
      setNativeUrl(element, attribute, "about:blank");
      return true;
    }
    var requestId = "neo-proxy-embed-" + Date.now().toString(36) + "-" + (++embedSequence).toString(36);
    var previousId = element.dataset.neoProxyRequestId;
    if (previousId) pendingEmbeds.delete(previousId);
    element.dataset.neoProxyRequestId = requestId;
    element.dataset.neoProxySource = url.href;
    pendingEmbeds.set(requestId, { element: element, attribute: attribute });
    setNativeUrl(element, attribute, "about:blank");
    window.parent.postMessage({ type: "neo-shell:proxy-embed", id: requestId, href: url.href }, "*");
    return true;
  }

  function prepareEmbed(element) {
    if (!element || !element.tagName) return;
    var tag = element.tagName.toLowerCase();
    if (tag !== "iframe" && tag !== "embed" && tag !== "object") return;
    var attribute = tag === "object" ? "data" : "src";
    var value = element.getAttribute("data-neo-proxy-src") || element.getAttribute(attribute);
    if (!value || element.dataset.neoProxyReady === "true") return;
    if (requestEmbed(element, value, attribute)) element.removeAttribute("data-neo-proxy-src");
  }

  function scan(root) {
    if (!root) return;
    if (root.nodeType === 1) prepareEmbed(root);
    if (root.querySelectorAll) root.querySelectorAll("iframe,embed,object").forEach(prepareEmbed);
  }

  function patchUrlProperty(constructor, property) {
    if (!constructor || !constructor.prototype) return;
    var descriptor = Object.getOwnPropertyDescriptor(constructor.prototype, property);
    if (!descriptor || !descriptor.configurable || !descriptor.get || !descriptor.set) return;
    try {
      Object.defineProperty(constructor.prototype, property, {
        configurable: descriptor.configurable,
        enumerable: descriptor.enumerable,
        get: descriptor.get,
        set: function (value) {
          if (this && requestEmbed(this, value, property)) return;
          descriptor.set.call(this, value);
        }
      });
    } catch (_error) {}
  }

  Element.prototype.setAttribute = function (name, value) {
    var attribute = String(name || "").toLowerCase();
    var tag = String(this.tagName || "").toLowerCase();
    var isEmbedUrl = (attribute === "src" && (tag === "iframe" || tag === "embed")) ||
      (attribute === "data" && tag === "object");
    if (isEmbedUrl && requestEmbed(this, value, attribute)) return;
    return nativeSetAttribute.call(this, name, value);
  };

  patchUrlProperty(window.HTMLIFrameElement, "src");
  patchUrlProperty(window.HTMLEmbedElement, "src");
  patchUrlProperty(window.HTMLObjectElement, "data");

  document.addEventListener("click", function (event) {
    if (event.defaultPrevented || event.button > 0) return;
    var link = event.target && event.target.closest ? event.target.closest("a[href],area[href]") : null;
    if (!link || link.hasAttribute("download")) return;
    var url = isExternal(link.href || link.getAttribute("href"));
    if (!url) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    postOpen(url, link.textContent || link.getAttribute("aria-label") || link.title);
  }, true);

  document.addEventListener("submit", function (event) {
    if (event.defaultPrevented) return;
    var form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    var url = isExternal(form.action || document.baseURI);
    if (!url) return;
    if (String(form.method || "get").toLowerCase() === "get") {
      new FormData(form).forEach(function (value, key) {
        if (typeof value === "string") url.searchParams.append(key, value);
      });
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    postOpen(url, form.getAttribute("aria-label") || "Web page");
  }, true);

  if (nativeOpen) {
    window.open = function (value, target, features) {
      var url = isExternal(value);
      if (!url) return nativeOpen(value, target, features);
      postOpen(url, url.hostname);
      return null;
    };
  }

  window.addEventListener("message", function (event) {
    if (event.source !== window.parent) return;
    var data = event.data;
    if (!data || data.type !== "neo-shell:proxy-embed-result" || !pendingEmbeds.has(data.id)) return;
    var pending = pendingEmbeds.get(data.id);
    pendingEmbeds.delete(data.id);
    if (!pending.element.isConnected || pending.element.dataset.neoProxyRequestId !== data.id) return;
    delete pending.element.dataset.neoProxyRequestId;
    if (!data.ok || !webUrl(data.route)) {
      pending.element.dataset.neoProxyError = "true";
      return;
    }
    pending.element.dataset.neoProxyReady = "true";
    pending.element.removeAttribute("data-neo-proxy-source");
    setNativeUrl(pending.element, pending.attribute, data.route);
  });

  new MutationObserver(function (records) {
    records.forEach(function (record) { record.addedNodes.forEach(scan); });
  }).observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { scan(document); }, { once: true });
  else scan(document);
})();
