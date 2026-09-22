(() => {
  if (window.__neoBrowserClientReady) return;
  window.__neoBrowserClientReady = true;

  function disableLeaveConfirmation() {
    const nativeAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function addEventListenerWithoutLeavePrompt(type, listener, options) {
      if (String(type).toLowerCase() === "beforeunload") return;
      return nativeAddEventListener.call(this, type, listener, options);
    };

    nativeAddEventListener.call(window, "beforeunload", (event) => {
      event.stopImmediatePropagation();
    }, true);

    try {
      Object.defineProperty(window, "onbeforeunload", {
        configurable: true,
        enumerable: true,
        get() { return null; },
        set() {},
      });
    } catch (error) {
      try { window.onbeforeunload = null; } catch (ignored) {}
    }
  }

  disableLeaveConfirmation();

  function remotePageUrl() {
    const value = window.__uv?.meta?.url?.href || window.__uv?.meta?.url || document.querySelector("base[href]")?.href || "";
    try { return new URL(String(value), window.location.href); }
    catch (error) { return null; }
  }

  function localMusicPreviewUrl(value, meta) {
    try {
      const base = meta?.base || meta?.url?.href || meta?.url || remotePageUrl()?.href || window.location.href;
      const source = new URL(String(value || ""), base);
      if (source.hostname !== "dzr.tabs-vs-spaces.wtf" || !/^\/stream\/?$/i.test(source.pathname)) return "";
      const isrc = String(source.searchParams.get("isrc") || "").trim().toUpperCase();
      if (!/^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(isrc)) return "";
      const preview = new URL("/.netlify/functions/music-preview", window.location.origin);
      preview.searchParams.set("isrc", isrc);
      return preview.href;
    } catch (error) {
      return "";
    }
  }

  function patchMappedBlobUrls(ultraviolet) {
    if (!ultraviolet || ultraviolet.__neoMappedBlobFix) return Boolean(ultraviolet?.__neoMappedBlobFix);
    const rewriteUrl = ultraviolet.rewriteUrl;
    if (typeof rewriteUrl !== "function") return false;

    ultraviolet.rewriteUrl = function rewriteMappedBlobUrl(value, meta = this.meta) {
      const source = String(value || "").trim();
      const preview = localMusicPreviewUrl(source, meta);
      if (preview) return preview;
      if (/^blob:/i.test(source)) {
        const mapped = this.blobUrls?.get(source);
        if (mapped) return mapped;
      }
      return rewriteUrl.call(this, value, meta);
    };
    Object.defineProperty(ultraviolet, "__neoMappedBlobFix", { value: true });
    return true;
  }

  function installMappedBlobSupport() {
    if (patchMappedBlobUrls(window.__uv)) return;

    const descriptor = Object.getOwnPropertyDescriptor(window, "__uv");
    if (!descriptor) {
      let ultraviolet;
      Object.defineProperty(window, "__uv", {
        configurable: true,
        enumerable: true,
        get() { return ultraviolet; },
        set(value) {
          ultraviolet = value;
          patchMappedBlobUrls(value);
        },
      });
    }

    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (patchMappedBlobUrls(window.__uv) || attempts >= 120) window.clearInterval(timer);
    }, 0);
  }

  installMappedBlobSupport();

  function installMusicCatalogWarmup() {
    if (window.__neoMusicCatalogWarmup) return true;
    const pageUrl = remotePageUrl();
    if (!pageUrl || pageUrl.hostname !== "vcsa.huangqirui.xyz" || !/^\/listen\/?$/i.test(pageUrl.pathname)) {
      return false;
    }
    // Catalog requests already arrive in small batches. Starting several hidden
    // audio downloads here delayed the track the user actually selected.
    window.__neoMusicCatalogWarmup = true;
    return true;
  }

  if (!installMusicCatalogWarmup()) {
    let musicWarmupAttempts = 0;
    const musicWarmupTimer = window.setInterval(() => {
      musicWarmupAttempts += 1;
      if (installMusicCatalogWarmup() || musicWarmupAttempts >= 120) window.clearInterval(musicWarmupTimer);
    }, 10);
  }

  function repairVitePreloadLink(node) {
    if (!(node instanceof HTMLLinkElement)) return;
    const relation = String(node.rel || "").toLowerCase();
    if (relation !== "modulepreload" && relation !== "stylesheet") return;

    const routePrefix = window.location.pathname.match(/^.*\/browse-v\d+\//)?.[0] || "/browse/";
    let routedUrl;
    try {
      routedUrl = new URL(node.getAttribute("href") || node.href, window.location.href);
    } catch (error) {
      return;
    }
    if (routedUrl.origin !== window.location.origin || !routedUrl.pathname.startsWith(routePrefix)) return;

    const routeValue = routedUrl.pathname.slice(routePrefix.length);
    let decoded = "";
    try { decoded = decodeURIComponent(routeValue); } catch (error) { return; }
    if (!decoded || /^https?:\/\//i.test(decoded)) return;

    const pageUrl = window.__uv?.meta?.url?.href || window.__uv?.meta?.url || "";
    const script = Array.from(document.scripts).find((candidate) => {
      const source = candidate.getAttribute("__uv-attr-src") || candidate.getAttribute("src") || "";
      return /\/assets\/[^/]+\.js(?:[?#]|$)/i.test(source);
    });
    const scriptSource = script?.getAttribute("__uv-attr-src") || script?.getAttribute("src") || "";
    if (!scriptSource || !pageUrl) return;

    try {
      const remoteScript = new URL(scriptSource, pageUrl);
      const remoteAsset = new URL(decoded, remoteScript);
      node.setAttribute("href", remoteAsset.href);
    } catch (error) {
      // Keep the page's original URL if its asset base cannot be recovered.
    }
  }

  try {
    const appendChild = Node.prototype.appendChild;
    const insertBefore = Node.prototype.insertBefore;
    Node.prototype.appendChild = function appendNeoBrowserChild(node) {
      repairVitePreloadLink(node);
      return appendChild.call(this, node);
    };
    Node.prototype.insertBefore = function insertNeoBrowserChild(node, reference) {
      repairVitePreloadLink(node);
      return insertBefore.call(this, node, reference);
    };
  } catch (error) {
    // Normal static resources continue to load when a page locks DOM prototypes.
  }

  const INSPECTED_STYLE_PROPERTIES = [
    "display",
    "position",
    "z-index",
    "box-sizing",
    "width",
    "height",
    "margin",
    "padding",
    "border",
    "border-radius",
    "color",
    "background-color",
    "font-family",
    "font-size",
    "font-weight",
    "line-height",
    "opacity",
    "overflow",
    "transform",
  ];
  const VOID_ELEMENTS = new Set([
    "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr",
  ]);
  let inspectedElement = null;
  let highlightElement = null;
  let highlightFrame = 0;
  let inspectMode = false;
  let inspectCursorStyle = null;

  function sourceAttribute(element, name) {
    if (!element) return "";
    return element.getAttribute(`__uv-attr-${name}`) || element.getAttribute(name) || "";
  }

  function cssEscape(value) {
    if (window.CSS?.escape) return window.CSS.escape(value);
    return String(value).replace(/[^a-zA-Z0-9_-]/g, (character) => `\\${character}`);
  }

  function selectorForElement(element) {
    if (!(element instanceof Element)) return "html";
    const parts = [];
    let current = element;

    for (let depth = 0; current && depth < 6; depth += 1) {
      let part = current.localName || current.tagName.toLowerCase();
      if (current.id) {
        parts.unshift(`${part}#${cssEscape(current.id)}`);
        break;
      }

      const classes = Array.from(current.classList || [])
        .filter((name) => /^[a-zA-Z_][a-zA-Z0-9_-]{0,48}$/.test(name))
        .slice(0, 2);
      if (classes.length) part += classes.map((name) => `.${cssEscape(name)}`).join("");

      const parent = current.parentElement;
      if (parent) {
        const sameTag = Array.from(parent.children).filter((child) => child.localName === current.localName);
        if (sameTag.length > 1) part += `:nth-of-type(${sameTag.indexOf(current) + 1})`;
      }
      parts.unshift(part);
      current = parent;
      if (current === document.documentElement) {
        parts.unshift("html");
        break;
      }
    }
    return parts.join(" > ");
  }

  function visibleAttributeValue(name, value) {
    const text = String(value || "");
    if (name === "href" || name === "src") {
      try {
        const url = new URL(text, document.baseURI);
        return `${url.origin}${url.pathname}`.slice(0, 220);
      } catch (error) {
        return text.split(/[?#]/, 1)[0].slice(0, 220);
      }
    }
    return text.slice(0, 220);
  }

  function inspectableAttributes(element) {
    const allowed = /^(?:id|class|role|alt|title|name|type|href|src|for|checked|disabled|aria-[a-z0-9_-]+|data-testid)$/i;
    return Array.from(element.attributes || [])
      .filter((attribute) => allowed.test(attribute.name) && attribute.name.toLowerCase() !== "value")
      .slice(0, 18)
      .map((attribute) => ({
        name: attribute.name,
        value: visibleAttributeValue(attribute.name.toLowerCase(), attribute.value),
      }));
  }

  function markupForElement(element, attributes) {
    const tag = element.localName || element.tagName.toLowerCase();
    const attributeText = attributes
      .map((attribute) => ` ${attribute.name}="${attribute.value.replaceAll("&", "&amp;").replaceAll('"', "&quot;")}"`)
      .join("");
    const opening = `<${tag}${attributeText}>`;
    if (VOID_ELEMENTS.has(tag)) return opening;

    const isPrivateControl = element.matches("input, textarea, select, option");
    const directText = isPrivateControl
      ? ""
      : Array.from(element.childNodes || [])
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent || "")
          .join(" ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 360);
    const textLine = directText
      ? `\n  ${directText.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}`
      : "";
    const children = element.childElementCount
      ? `\n  ... ${element.childElementCount} child element${element.childElementCount === 1 ? "" : "s"}`
      : "";
    return `${opening}${textLine}${children}${textLine || children ? "\n" : ""}</${tag}>`;
  }

  function describeElement(element) {
    const target = element instanceof Element ? element : document.documentElement;
    const rect = target.getBoundingClientRect();
    const computed = getComputedStyle(target);
    const styles = Object.fromEntries(
      INSPECTED_STYLE_PROPERTIES.map((property) => [property, computed.getPropertyValue(property).trim().slice(0, 220)]),
    );
    const attributes = inspectableAttributes(target);
    return {
      selector: selectorForElement(target).slice(0, 800),
      tag: (target.localName || target.tagName.toLowerCase()).slice(0, 40),
      markup: markupForElement(target, attributes).slice(0, 6000),
      rect: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
      styles,
    };
  }

  function postInspectorMessage(type, element, coordinates = {}) {
    window.parent.postMessage(
      {
        type,
        inspection: describeElement(element),
        x: Number(coordinates.x) || 0,
        y: Number(coordinates.y) || 0,
      },
      window.location.origin,
    );
  }

  function ensureHighlightElement() {
    if (highlightElement?.isConnected) return highlightElement;
    highlightElement = document.createElement("div");
    highlightElement.setAttribute("data-neo-browser-highlight", "");
    Object.assign(highlightElement.style, {
      position: "fixed",
      zIndex: "2147483647",
      pointerEvents: "none",
      boxSizing: "border-box",
      border: "2px solid #4aa8ff",
      background: "rgba(74, 168, 255, 0.14)",
      borderRadius: "2px",
    });
    document.documentElement.appendChild(highlightElement);
    return highlightElement;
  }

  function paintHighlight() {
    highlightFrame = 0;
    if (!(inspectedElement instanceof Element) || !inspectedElement.isConnected) return;
    const rect = inspectedElement.getBoundingClientRect();
    const overlay = ensureHighlightElement();
    overlay.style.left = `${rect.left}px`;
    overlay.style.top = `${rect.top}px`;
    overlay.style.width = `${Math.max(0, rect.width)}px`;
    overlay.style.height = `${Math.max(0, rect.height)}px`;
  }

  function scheduleHighlight(element) {
    if (element instanceof Element) inspectedElement = element;
    if (highlightFrame) return;
    highlightFrame = requestAnimationFrame(paintHighlight);
  }

  function clearHighlight() {
    if (highlightFrame) cancelAnimationFrame(highlightFrame);
    highlightFrame = 0;
    highlightElement?.remove();
    highlightElement = null;
  }

  function setInspectMode(active) {
    inspectMode = Boolean(active);
    if (inspectMode) {
      if (!inspectCursorStyle) {
        inspectCursorStyle = document.createElement("style");
        inspectCursorStyle.textContent = "html[data-neo-inspect-mode],html[data-neo-inspect-mode] *{cursor:crosshair!important}";
        document.head.appendChild(inspectCursorStyle);
      }
      document.documentElement.setAttribute("data-neo-inspect-mode", "");
    } else {
      document.documentElement.removeAttribute("data-neo-inspect-mode");
      inspectCursorStyle?.remove();
      inspectCursorStyle = null;
    }
  }

  function keepInCurrentView(element) {
    if (!element) return;
    element.setAttribute("target", "_self");
  }

  function keepSubmissionInCurrentView(form, submitter) {
    keepInCurrentView(form);
    if (submitter?.hasAttribute?.("formtarget")) submitter.setAttribute("formtarget", "_self");
  }

  function requestParentNavigation(value) {
    try {
      const destination = new URL(String(value || ""), document.baseURI);
      if (destination.protocol !== "http:" && destination.protocol !== "https:") return false;
      window.parent.postMessage(
        { type: "neo-browser:navigate-request", href: destination.href },
        window.location.origin,
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  function isYouTubeDestination(value) {
    try {
      const url = new URL(String(value || ""), document.baseURI);
      const host = url.hostname.toLowerCase();
      return host === "youtu.be" || host === "youtube.com" || host.endsWith(".youtube.com");
    } catch (error) {
      return false;
    }
  }

  function unwrapDuckDuckGoRedirect(element) {
    if (!element) return "";
    const rawHref = element.getAttribute("__uv-attr-href") || element.getAttribute("href") || "";
    try {
      const redirect = new URL(rawHref, "https://duckduckgo.com/");
      if (!/(^|\.)duckduckgo\.com$/i.test(redirect.hostname) || redirect.pathname !== "/l/") return "";
      const destination = redirect.searchParams.get("uddg") || "";
      const parsed = new URL(destination);
      return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : "";
    } catch (error) {
      return "";
    }
  }

  const DOWNLOAD_FILE_PATTERN = /\.(?:7z|aac|apk|avi|bin|bmp|csv|doc|docx|epub|exe|flac|gif|gz|iso|jpeg|jpg|json|m4a|mkv|mov|mp3|mp4|msi|odp|ods|odt|ogg|pdf|png|ppt|pptx|rar|rtf|svg|tar|tgz|txt|wav|webm|webp|xls|xlsx|xml|zip)$/i;
  const DOWNLOAD_INTENT_PATTERN = /\b(?:download|export|save\s+(?:a\s+)?(?:copy|file|image|video|audio|document)|get\s+(?:the\s+)?file)\b/i;
  let lastDownloadActivation = 0;

  function decodedDownloadName(value) {
    const source = String(value || "").trim();
    if (!source) return "";
    try { return decodeURIComponent(source); } catch (error) { return source; }
  }

  function suggestedDownloadName(link, destination) {
    const explicitName = link.getAttribute("download");
    if (explicitName) return decodedDownloadName(explicitName);
    for (const key of ["filename", "file", "name"]) {
      const queryName = destination.searchParams.get(key);
      if (queryName && DOWNLOAD_FILE_PATTERN.test(queryName.split(/[?#]/, 1)[0])) {
        return decodedDownloadName(queryName.split(/[\\/]/).pop());
      }
    }
    const pathName = destination.pathname.split("/").filter(Boolean).pop() || "";
    return decodedDownloadName(pathName);
  }

  function downloadRequestForLink(link, event) {
    if (!(link instanceof HTMLAnchorElement || link instanceof HTMLAreaElement)) return null;
    const rawHref = sourceAttribute(link, "href");
    if (!rawHref || rawHref.startsWith("#") || /^javascript:/i.test(rawHref)) return null;

    let destination;
    try {
      destination = new URL(rawHref, remotePageUrl()?.href || document.baseURI);
    } catch (error) {
      return null;
    }
    if (!["http:", "https:", "blob:", "data:"].includes(destination.protocol)) return null;

    const explicit = link.hasAttribute("download");
    const decodedPath = decodedDownloadName(destination.pathname).split(/[?#]/, 1)[0];
    const fileLike = DOWNLOAD_FILE_PATTERN.test(decodedPath);
    const queryDownload = destination.searchParams.has("download") || destination.searchParams.has("attachment");
    const accessibleLabel = [
      link.textContent,
      link.getAttribute("aria-label"),
      link.getAttribute("title"),
      link.getAttribute("data-tooltip"),
    ].filter(Boolean).join(" ");
    const labeledDownload = DOWNLOAD_INTENT_PATTERN.test(accessibleLabel);
    if (!explicit && !fileLike && !queryDownload && !labeledDownload) return null;

    const userActivated = Boolean(
      event?.isTrusted ||
      navigator.userActivation?.isActive ||
      Date.now() - lastDownloadActivation < 5000
    );
    return {
      id: `neo-download-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      href: destination.href,
      name: suggestedDownloadName(link, destination),
      explicit,
      fileLike: fileLike || queryDownload,
      userActivated,
    };
  }

  function postDownloadError(request, error) {
    window.parent.postMessage(
      {
        type: "neo-browser:download-error",
        id: request.id,
        message: String(error?.message || "The file could not be read.").slice(0, 180),
      },
      window.location.origin,
    );
  }

  function requestDownload(request) {
    if (!request.userActivated) {
      postDownloadError(request, new Error("Click the download again to save it to Drive."));
      return;
    }
    window.parent.postMessage(
      { type: "neo-browser:download-start", id: request.id, name: request.name },
      window.location.origin,
    );
    fetch(request.href, {
      cache: "no-store",
      credentials: "include",
      redirect: "follow",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`The download server returned ${response.status}.`);
        const disposition = response.headers.get("content-disposition") || "";
        const contentType = response.headers.get("content-type") || "";
        if (
          !request.explicit &&
          !request.fileLike &&
          !/\battachment\b/i.test(disposition) &&
          contentType.toLowerCase().includes("text/html")
        ) {
          window.parent.postMessage(
            { type: "neo-browser:download-cancel", id: request.id },
            window.location.origin,
          );
          window.parent.postMessage(
            { type: "neo-browser:navigate-request", href: response.url || request.href },
            window.location.origin,
          );
          return null;
        }
        const blob = await response.blob();
        return {
          blob,
          contentDisposition: disposition,
          contentType,
          finalHref: response.url || request.href,
        };
      })
      .then((result) => {
        if (!result) return;
        window.parent.postMessage(
          { type: "neo-browser:download-request", ...request, ...result },
          window.location.origin,
        );
      })
      .catch((error) => postDownloadError(request, error));
  }

  document.addEventListener(
    "contextmenu",
    (event) => {
      const target = event.target instanceof Element ? event.target : document.documentElement;
      event.preventDefault();
      event.stopImmediatePropagation();
      inspectedElement = target;
      postInspectorMessage("neo-browser:context-menu", target, { x: event.clientX, y: event.clientY });
    },
    true,
  );
  document.addEventListener(
    "pointermove",
    (event) => {
      if (!inspectMode) return;
      scheduleHighlight(event.target);
    },
    true,
  );
  document.addEventListener(
    "pointerdown",
    (event) => {
      if (event.button === 2) return;
      if (event.isTrusted) lastDownloadActivation = Date.now();
      window.parent.postMessage({ type: "neo-browser:context-dismiss" }, window.location.origin);
    },
    true,
  );
  document.addEventListener(
    "click",
    (event) => {
      if (inspectMode) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const target = event.target instanceof Element ? event.target : document.documentElement;
        inspectedElement = target;
        setInspectMode(false);
        clearHighlight();
        postInspectorMessage("neo-browser:inspect-selected", target);
        return;
      }
      const link = event.target.closest?.("a[href], area[href]");
      const downloadRequest = downloadRequestForLink(link, event);
      if (downloadRequest) {
        event.preventDefault();
        event.stopImmediatePropagation();
        requestDownload(downloadRequest);
        return;
      }
      keepInCurrentView(link);
      const directDestination = unwrapDuckDuckGoRedirect(link);
      if (directDestination) {
        event.preventDefault();
        event.stopImmediatePropagation();
        requestParentNavigation(directDestination);
        return;
      }
      if (link) {
        const destination = sourceAttribute(link, "href");
        if (isYouTubeDestination(destination)) {
          event.preventDefault();
          event.stopImmediatePropagation();
          requestParentNavigation(destination);
          return;
        }
      }
    },
    true,
  );
  document.addEventListener(
    "auxclick",
    (event) => {
      if (event.button !== 1) return;
      const link = event.target.closest?.("a[href], area[href]");
      if (!link) return;
      const downloadRequest = downloadRequestForLink(link, event);
      if (downloadRequest) {
        event.preventDefault();
        event.stopImmediatePropagation();
        requestDownload(downloadRequest);
        return;
      }
      const destination = sourceAttribute(link, "href");
      event.preventDefault();
      event.stopImmediatePropagation();
      keepInCurrentView(link);
      if (!requestParentNavigation(destination)) window.location.assign(destination);
    },
    true,
  );
  document.addEventListener(
    "submit",
    (event) => {
      const form = event.target;
      keepSubmissionInCurrentView(form, event.submitter);
      keepInCurrentView(form);
    },
    true,
  );

  try {
    const nativeSubmit = window.HTMLFormElement.prototype.submit;
    window.HTMLFormElement.prototype.submit = function submitInsideNeo() {
      keepSubmissionInCurrentView(this);
      return nativeSubmit.call(this);
    };
  } catch (error) {
    // Event-driven form submissions are still contained.
  }

  try {
    window.open = function openInNeoBrowser(url) {
      if (typeof url === "string" && url.trim()) {
        if (!requestParentNavigation(url)) window.location.assign(url);
      }
      return window;
    };
  } catch (error) {
    // Some pages lock this property; normal links are still kept in the frame.
  }

  let activeMediaElement = null;
  let mediaReportTimer = 0;
  let mediaFollowupTimer = 0;
  let lastMediaReport = "";
  let mediaVisualizer = null;
  let mediaVisualizerRetryTimer = 0;
  let lastMediaLevels = "";
  let shellPerformanceMode = "normal";
  const observedMedia = new WeakSet();
  const pendingAudioTrackReset = new WeakSet();
  const audioTrackResetVersion = new WeakMap();
  const mediaMotionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  let pictureInPictureButton = null;
  let pictureInPictureVideo = null;
  let pictureInPictureFrame = 0;
  let pictureInPicturePointer = null;

  function importantStyle(element, properties) {
    Object.entries(properties).forEach(([name, value]) => element.style.setProperty(name, value, "important"));
  }

  function ensurePictureInPictureButton() {
    if (pictureInPictureButton?.isConnected) return pictureInPictureButton;
    if (!document.pictureInPictureEnabled) return null;

    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", "Pop video out");
    button.title = "Pop video out";
    button.dataset.neoVideoPopout = "true";
    importantStyle(button, {
      all: "initial",
      position: "fixed",
      display: "none",
      width: "38px",
      height: "32px",
      padding: "0",
      margin: "0",
      color: "#fff",
      background: "rgba(8, 8, 9, 0.82)",
      border: "0",
      "border-radius": "6px",
      "box-shadow": "0 5px 18px rgba(0, 0, 0, 0.34)",
      "backdrop-filter": "blur(12px)",
      "-webkit-backdrop-filter": "blur(12px)",
      cursor: "pointer",
      "z-index": "2147483647",
      "box-sizing": "border-box",
    });

    const screen = document.createElement("span");
    importantStyle(screen, {
      position: "absolute",
      left: "9px",
      top: "8px",
      width: "18px",
      height: "13px",
      border: "1.5px solid currentColor",
      "border-radius": "2px",
      "box-sizing": "border-box",
    });
    const inset = document.createElement("span");
    importantStyle(inset, {
      position: "absolute",
      right: "6px",
      bottom: "6px",
      width: "10px",
      height: "8px",
      background: "#fff",
      border: "2px solid rgba(8, 8, 9, 0.9)",
      "border-radius": "2px",
      "box-sizing": "border-box",
    });
    button.append(screen, inset);

    ["pointerdown", "pointerup"].forEach((name) => {
      button.addEventListener(name, (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
      }, true);
    });
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const video = pictureInPictureVideo;
      if (!(video instanceof HTMLVideoElement)) return;
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          video.disablePictureInPicture = false;
          await video.requestPictureInPicture();
        }
      } catch (error) {
        // Permissions policies and the source site can still deny Picture-in-Picture.
      }
    });
    (document.body || document.documentElement).appendChild(button);
    pictureInPictureButton = button;
    return button;
  }

  function pictureInPictureCandidateAt(x, y) {
    const elements = typeof document.elementsFromPoint === "function" ? document.elementsFromPoint(x, y) : [];
    const direct = elements.find((element) => element instanceof HTMLVideoElement);
    if (direct) return direct;
    return Array.from(document.querySelectorAll("video")).find((video) => {
      const rect = video.getBoundingClientRect();
      return rect.width >= 160 && rect.height >= 90 && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    }) || null;
  }

  function positionPictureInPictureButton() {
    pictureInPictureFrame = 0;
    const button = ensurePictureInPictureButton();
    const video = pictureInPictureVideo;
    if (!button || !(video instanceof HTMLVideoElement) || !video.isConnected || typeof video.requestPictureInPicture !== "function") {
      if (button) button.style.setProperty("display", "none", "important");
      return;
    }
    const rect = video.getBoundingClientRect();
    const visible = rect.width >= 160 && rect.height >= 90 && rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth;
    if (!visible) {
      button.style.setProperty("display", "none", "important");
      return;
    }
    const left = Math.max(8, Math.min(innerWidth - 46, rect.right - 48));
    const top = Math.max(8, Math.min(innerHeight - 40, rect.top + 10));
    button.style.setProperty("left", `${Math.round(left)}px`, "important");
    button.style.setProperty("top", `${Math.round(top)}px`, "important");
    button.style.setProperty("display", "block", "important");
    button.title = document.pictureInPictureElement === video ? "Close video pop-out" : "Pop video out";
    button.setAttribute("aria-label", button.title);
  }

  function schedulePictureInPicturePosition() {
    if (pictureInPictureFrame) return;
    pictureInPictureFrame = requestAnimationFrame(positionPictureInPictureButton);
  }

  function selectPictureInPictureVideo(video) {
    if (!(video instanceof HTMLVideoElement)) return;
    pictureInPictureVideo = video;
    schedulePictureInPicturePosition();
  }

  document.addEventListener("pointermove", (event) => {
    pictureInPicturePointer = { x: event.clientX, y: event.clientY };
    if (pictureInPictureButton?.contains(event.target)) return;
    const candidate = pictureInPictureCandidateAt(event.clientX, event.clientY);
    if (candidate) selectPictureInPictureVideo(candidate);
  }, { capture: true, passive: true });
  document.addEventListener("playing", (event) => {
    if (event.target instanceof HTMLVideoElement) selectPictureInPictureVideo(event.target);
  }, true);
  document.addEventListener("loadedmetadata", (event) => {
    if (event.target instanceof HTMLVideoElement && pictureInPicturePointer) {
      const candidate = pictureInPictureCandidateAt(pictureInPicturePointer.x, pictureInPicturePointer.y);
      if (candidate) selectPictureInPictureVideo(candidate);
    }
  }, true);
  document.addEventListener("enterpictureinpicture", schedulePictureInPicturePosition, true);
  document.addEventListener("leavepictureinpicture", schedulePictureInPicturePosition, true);
  window.addEventListener("scroll", schedulePictureInPicturePosition, true);
  window.addEventListener("resize", schedulePictureInPicturePosition, { passive: true });

  function metadataContent(selector) {
    return document.querySelector(selector)?.getAttribute("content")?.trim() || "";
  }

  function cleanMediaTitle(value) {
    return String(value || "")
      .replace(/\s+-\s+YouTube(?:\s+Music)?\s*$/i, "")
      .replace(/^\(\d+\)\s*/, "")
      .trim()
      .slice(0, 160);
  }

  function normalizedArtwork(value) {
    const source = String(value || "").trim();
    if (!source || source.length > 4096) return "";
    try {
      const url = new URL(source, document.baseURI);
      return /^(?:blob:|https?:)$/.test(url.protocol) ? url.href : "";
    } catch (error) {
      return "";
    }
  }

  function currentTrackDetails() {
    const roots = [
      "[data-now-playing]",
      "[data-current-track]",
      ".player-now-playing",
      ".now-playing",
      ".nowPlaying",
      ".np",
    ];
    const titleSelectors = ["[data-track-title]", ".track-title", ".song-title", ".npt"];
    const artistSelectors = ["[data-track-artist]", ".track-artist", ".song-artist", ".npa"];

    for (const selector of roots) {
      const root = document.querySelector(selector);
      if (!(root instanceof Element)) continue;
      const titleNode = titleSelectors.map((item) => root.querySelector(item)).find(Boolean);
      const title = cleanMediaTitle(titleNode?.textContent || "");
      if (!title) continue;
      const artistNode = artistSelectors.map((item) => root.querySelector(item)).find(Boolean);
      const image = root.querySelector("img[src]");
      return {
        title,
        artist: cleanMediaTitle(artistNode?.textContent || ""),
        cover: normalizedArtwork(sourceAttribute(image, "src")),
      };
    }
    return { title: "", artist: "", cover: "" };
  }

  function mediaDetails(media) {
    let sessionMetadata = null;
    try { sessionMetadata = navigator.mediaSession?.metadata || null; } catch (error) {}
    const artwork = sessionMetadata?.artwork ? Array.from(sessionMetadata.artwork) : [];
    const sessionCover = artwork.length ? artwork[artwork.length - 1]?.src : "";
    const poster = media instanceof HTMLVideoElement ? media.poster || sourceAttribute(media, "poster") : "";
    const currentTrack = currentTrackDetails();
    const title = cleanMediaTitle(
      sessionMetadata?.title ||
      currentTrack.title ||
      media.getAttribute("aria-label") ||
      media.getAttribute("title") ||
      metadataContent('meta[property="og:title"]') ||
      document.title ||
      "Media"
    );
    const artist = cleanMediaTitle(sessionMetadata?.artist || currentTrack.artist || "");
    const album = cleanMediaTitle(sessionMetadata?.album || "");
    const site = cleanMediaTitle(metadataContent('meta[property="og:site_name"]'));
    return {
      title: title || "Media",
      subtitle: [artist, album].filter(Boolean).join(" - ") || site || "Playing in web app",
      cover: normalizedArtwork(sessionCover || currentTrack.cover || poster || metadataContent('meta[property="og:image"]')),
      kind: media instanceof HTMLVideoElement ? "video" : "audio",
    };
  }

  function reportMediaState(media) {
    mediaReportTimer = 0;
    if (!(media instanceof HTMLMediaElement)) return;
    const source = media.currentSrc || sourceAttribute(media, "src") || sourceAttribute(media.querySelector("source[src]"), "src");
    const active = Boolean(source) && !media.ended;
    const details = active ? mediaDetails(media) : { title: "", subtitle: "", cover: "", kind: "media" };
    const duration = Number.isFinite(media.duration) && media.duration > 0 ? media.duration : 0;
    const position = Number.isFinite(media.currentTime) && media.currentTime > 0 ? Math.floor(media.currentTime) : 0;
    const payload = {
      type: "neo-browser:media-state",
      active,
      playing: active && !media.paused,
      title: details.title,
      subtitle: details.subtitle,
      cover: details.cover,
      kind: details.kind,
      position,
      duration,
      volume: media.muted ? 0 : media.volume,
      muted: media.muted,
      volumeControl: active,
    };
    const signature = JSON.stringify(payload);
    if (signature === lastMediaReport) return;
    lastMediaReport = signature;
    try { window.parent.postMessage(payload, window.location.origin); } catch (error) {}
  }

  function scheduleMediaReport(media, delay = 40) {
    if (!(media instanceof HTMLMediaElement)) return;
    window.clearTimeout(mediaReportTimer);
    mediaReportTimer = window.setTimeout(() => reportMediaState(media), delay);
  }

  function postMediaLevels(levels) {
    const normalized = Array.from(levels || []).slice(0, 8).map((value) => (
      Math.max(0, Math.min(1, Number(value) || 0))
    ));
    while (normalized.length < 8) normalized.push(0);
    const signature = normalized.map((value) => value.toFixed(2)).join(",");
    if (signature === lastMediaLevels) return;
    lastMediaLevels = signature;
    try {
      window.parent.postMessage({ type: "neo-browser:media-levels", levels: normalized }, window.location.origin);
    } catch (error) {}
  }

  function normalizeShellPerformanceMode(value) {
    return value === "ultimate" ? "ultimate" : value === "performance" ? "performance" : "normal";
  }

  function currentShellPerformanceMode() {
    const candidates = [document.documentElement.dataset.neoPerformanceMode];
    try { candidates.push(window.parent.document.documentElement.dataset.neoPerformanceMode); } catch (error) {}
    try { candidates.push(window.top.document.documentElement.dataset.performanceMode); } catch (error) {}
    const detected = candidates.find((value) => value === "performance" || value === "ultimate" || value === "normal");
    shellPerformanceMode = normalizeShellPerformanceMode(detected || shellPerformanceMode);
    return shellPerformanceMode;
  }

  function mediaVisualsEnabled() {
    return currentShellPerformanceMode() === "normal";
  }

  function stopMediaVisualizer(clearLevels = true) {
    window.clearTimeout(mediaVisualizerRetryTimer);
    mediaVisualizerRetryTimer = 0;
    if (mediaVisualizer) {
      cancelAnimationFrame(mediaVisualizer.frame);
      try { mediaVisualizer.source.disconnect(); } catch (error) {}
      try { mediaVisualizer.analyser.disconnect(); } catch (error) {}
      try { mediaVisualizer.context.close(); } catch (error) {}
      mediaVisualizer = null;
    }
    if (clearLevels) postMediaLevels(new Array(8).fill(0));
  }

  function startMediaVisualizer(media, attempt = 0) {
    // Capturing a proxied video creates a second Chromium media pipeline and can
    // terminate the embedded renderer. Video still reports metadata and play state.
    if (!(media instanceof HTMLAudioElement) || media.paused || media.ended || mediaMotionQuery?.matches || !mediaVisualsEnabled()) {
      stopMediaVisualizer();
      return;
    }
    if (mediaVisualizer?.media === media) return;

    stopMediaVisualizer();
    const captureStream = media.captureStream || media.mozCaptureStream;
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    if (typeof captureStream !== "function" || !AudioContextConstructor) return;

    let stream;
    try { stream = captureStream.call(media); } catch (error) { return; }
    if (!stream?.getAudioTracks().length) {
      if (attempt < 6) {
        mediaVisualizerRetryTimer = window.setTimeout(() => startMediaVisualizer(media, attempt + 1), 180);
      }
      return;
    }

    try {
      const context = new AudioContextConstructor({ latencyHint: "interactive" });
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.72;
      analyser.minDecibels = -86;
      analyser.maxDecibels = -18;
      source.connect(analyser);

      const frequencyData = new Uint8Array(analyser.frequencyBinCount);
      const visualizer = { media, context, source, analyser, frame: 0, lastPost: 0 };
      mediaVisualizer = visualizer;
      context.resume().catch(() => {});

      const sample = (time) => {
        if (mediaVisualizer !== visualizer || media.paused || media.ended || !mediaVisualsEnabled()) {
          stopMediaVisualizer();
          return;
        }
        if (time - visualizer.lastPost >= 72) {
          analyser.getByteFrequencyData(frequencyData);
          const usableBins = Math.max(16, Math.floor(frequencyData.length * 0.68));
          const levels = Array.from({ length: 8 }, (_, index) => {
            const start = Math.floor(1 + Math.pow(index / 8, 1.55) * (usableBins - 2));
            const end = Math.max(start + 1, Math.floor(1 + Math.pow((index + 1) / 8, 1.55) * (usableBins - 1)));
            let total = 0;
            for (let bin = start; bin < end; bin += 1) total += frequencyData[bin];
            const average = total / Math.max(1, end - start);
            return Math.max(0.06, Math.min(1, (average - 4) / 142));
          });
          postMediaLevels(levels);
          visualizer.lastPost = time;
        }
        visualizer.frame = requestAnimationFrame(sample);
      };
      visualizer.frame = requestAnimationFrame(sample);
    } catch (error) {
      stopMediaVisualizer();
    }
  }

  const mediaStateEvents = ["play", "playing", "pause", "ended", "loadedmetadata", "loadeddata", "emptied", "timeupdate", "durationchange", "volumechange", "seeked"];

  function handleMediaEvent(name, media) {
    if (!(media instanceof HTMLMediaElement)) return;
    if (name === "play" || name === "playing") activeMediaElement = media;
    if (activeMediaElement !== media && name !== "play" && name !== "playing") return;
    scheduleMediaReport(media);
    if (name === "play" || name === "playing") {
      window.clearTimeout(mediaFollowupTimer);
      mediaFollowupTimer = window.setTimeout(() => scheduleMediaReport(media), 700);
      startMediaVisualizer(media);
    } else if (name === "pause" || name === "ended" || name === "emptied") {
      stopMediaVisualizer();
    }
  }

  function observeMediaElement(media) {
    if (!(media instanceof HTMLMediaElement) || observedMedia.has(media)) return media;
    observedMedia.add(media);
    mediaStateEvents.forEach((name) => media.addEventListener(name, () => handleMediaEvent(name, media), true));
    if (!media.paused && !media.ended) handleMediaEvent("playing", media);
    return media;
  }

  function resetNewAudioTrack(media) {
    if (!(media instanceof HTMLAudioElement) || !pendingAudioTrackReset.has(media)) return;
    const version = audioTrackResetVersion.get(media) || 0;
    const applyReset = () => {
      if ((audioTrackResetVersion.get(media) || 0) !== version) return;
      try { media.currentTime = 0; } catch (error) {}
      if (media.readyState >= HTMLMediaElement.HAVE_METADATA) pendingAudioTrackReset.delete(media);
    };
    applyReset();
    if (media.readyState < HTMLMediaElement.HAVE_METADATA) {
      media.addEventListener("loadedmetadata", applyReset, { once: true, capture: true });
    }
  }

  function installMusicAudioFastStart() {
    const pageUrl = remotePageUrl();
    if (!pageUrl || pageUrl.hostname !== "vcsa.huangqirui.xyz" || !/^\/listen\/?$/i.test(pageUrl.pathname)) return;

    try {
      const srcDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "src");
      if (srcDescriptor?.get && srcDescriptor?.set) {
        Object.defineProperty(HTMLMediaElement.prototype, "src", {
          configurable: srcDescriptor.configurable,
          enumerable: srcDescriptor.enumerable,
          get: srcDescriptor.get,
          set(value) {
            const isAudio = this instanceof HTMLAudioElement;
            if (isAudio) {
              window.__neoMusicAudio = this;
              this.preload = "auto";
              audioTrackResetVersion.set(this, (audioTrackResetVersion.get(this) || 0) + 1);
              pendingAudioTrackReset.add(this);
            }
            srcDescriptor.set.call(this, value);
            if (isAudio) {
              observeMediaElement(this);
              resetNewAudioTrack(this);
            }
          },
        });
      }
    } catch (error) {
      // The normal media path remains available if a page locks the prototype.
    }

    try {
      const NativeAudio = window.Audio;
      function FastStartAudio(source) {
        const media = new NativeAudio();
        media.preload = "auto";
        window.__neoMusicAudio = media;
        observeMediaElement(media);
        if (source !== undefined) media.src = source;
        return media;
      }
      Object.setPrototypeOf(FastStartAudio, NativeAudio);
      FastStartAudio.prototype = NativeAudio.prototype;
      window.Audio = FastStartAudio;
    } catch (error) {
      // Audio created by the page is still prepared by the play wrapper below.
    }
  }

  installMusicAudioFastStart();

  mediaStateEvents.forEach((name) => {
    document.addEventListener(name, (event) => {
      const media = event.target;
      if (!(media instanceof HTMLMediaElement)) return;
      observeMediaElement(media);
      handleMediaEvent(name, media);
    }, true);
  });

  try {
    const nativePlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function playInsideNeo(...args) {
      observeMediaElement(this);
      activeMediaElement = this;
      if (this instanceof HTMLAudioElement) {
        window.__neoMusicAudio = this;
        this.preload = "auto";
        resetNewAudioTrack(this);
        const source = this.currentSrc || sourceAttribute(this, "src");
        if (source && this.networkState === HTMLMediaElement.NETWORK_EMPTY) {
          try { this.load(); } catch (error) {}
        }
      }
      const result = nativePlay.apply(this, args);
      Promise.resolve(result).then(() => handleMediaEvent("playing", this)).catch(() => scheduleMediaReport(this));
      return result;
    };
  } catch (error) {
    // Connected media elements still report through captured document events.
  }

  if (document.head && "MutationObserver" in window) {
    new MutationObserver(() => {
      if (activeMediaElement) scheduleMediaReport(activeMediaElement, 120);
    }).observe(document.head, { subtree: true, childList: true, attributes: true, attributeFilter: ["content"] });
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window.parent) return;
    if (event.data?.type === "neo-shell:performance-mode") {
      shellPerformanceMode = normalizeShellPerformanceMode(event.data.mode);
      document.documentElement.dataset.neoPerformanceMode = shellPerformanceMode;
      if (shellPerformanceMode === "normal" && activeMediaElement && !activeMediaElement.paused) startMediaVisualizer(activeMediaElement);
      else stopMediaVisualizer();
    } else if (event.data?.type === "neo-browser:inspect-highlight") {
      scheduleHighlight(inspectedElement || document.documentElement);
    } else if (event.data?.type === "neo-browser:inspect-mode") {
      setInspectMode(true);
      scheduleHighlight(inspectedElement || document.documentElement);
    } else if (event.data?.type === "neo-browser:inspect-clear") {
      setInspectMode(false);
      clearHighlight();
    } else if (event.data?.type === "neo-browser:set-volume" && activeMediaElement) {
      const volume = Math.max(0, Math.min(1, Number(event.data.volume) || 0));
      activeMediaElement.volume = volume;
      if (volume > 0) activeMediaElement.muted = false;
      scheduleMediaReport(activeMediaElement, 0);
    } else if (event.data?.type === "neo-shell:set-muted") {
      const muted = Boolean(event.data.muted);
      document.querySelectorAll("audio, video").forEach((media) => { media.muted = muted; });
      if (activeMediaElement) scheduleMediaReport(activeMediaElement, 0);
    }
  });
  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !inspectMode) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    setInspectMode(false);
    clearHighlight();
  }, true);
  window.addEventListener("scroll", () => scheduleHighlight(), true);
  window.addEventListener("resize", () => scheduleHighlight());
  window.addEventListener("pagehide", () => stopMediaVisualizer());

  let reportPending = false;
  let lastReport = "";

  function reportNavigation() {
    reportPending = false;
    try {
      const href = window.location.href;
      const title = document.title || "Web page";
      const signature = `${href}\n${title}`;
      if (signature === lastReport) return;
      lastReport = signature;
      window.parent.postMessage(
        {
          type: "neo-browser:navigation",
          href,
          title,
        },
        window.location.origin,
      );
    } catch (error) {
      // Parent communication is a convenience and must never block the page.
    }
  }

  function scheduleNavigationReport() {
    if (reportPending) return;
    reportPending = true;
    requestAnimationFrame(reportNavigation);
  }

  try {
    ["pushState", "replaceState"].forEach((method) => {
      const nativeMethod = history[method];
      history[method] = function reportHistoryNavigation(...args) {
        const result = nativeMethod.apply(this, args);
        scheduleNavigationReport();
        return result;
      };
    });
  } catch (error) {
    // Page and hash navigation events still report destinations.
  }

  window.addEventListener("pageshow", scheduleNavigationReport);
  window.addEventListener("popstate", scheduleNavigationReport);
  window.addEventListener("hashchange", scheduleNavigationReport);
  document.addEventListener("readystatechange", scheduleNavigationReport);
  scheduleNavigationReport();
})();
