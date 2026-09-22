(function () {
  "use strict";

  if (window.NEO_PROXY_CLIENT) return;

  var nativeFetch = window.fetch.bind(window);
  var pending = new Map();
  var sequence = 0;

  function shellWindow() {
    var candidate = window.parent;
    for (var depth = 0; candidate && candidate !== window && depth < 6; depth += 1) {
      try {
        if (candidate.NEO_SHELL) return candidate;
        if (candidate.parent === candidate) break;
        candidate = candidate.parent;
      } catch (_error) {
        break;
      }
    }
    return window.parent;
  }

  function normalize(value) {
    var url = new URL(String(value || ""), document.baseURI);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new TypeError("Only web URLs can use the proxy.");
    url.username = "";
    url.password = "";
    return url.href;
  }

  function normalizeRoute(value) {
    var url = new URL(String(value || ""), document.baseURI);
    var trustedOrigin = new URL(document.baseURI).origin;
    if (url.protocol === "blob:" && url.origin === trustedOrigin) return url.href;
    return normalize(url.href);
  }

  function resolve(value, kind, signal) {
    var href = normalize(value);
    if (window.parent === window) return Promise.resolve(href);
    return new Promise(function (resolvePromise, rejectPromise) {
      if (signal && signal.aborted) {
        rejectPromise(new DOMException("The request was aborted.", "AbortError"));
        return;
      }
      var id = "neo-proxy-resource-" + Date.now().toString(36) + "-" + (++sequence).toString(36);
      var abort = function () {
        var request = pending.get(id);
        if (!request) return;
        pending.delete(id);
        clearTimeout(request.timer);
        rejectPromise(new DOMException("The request was aborted.", "AbortError"));
      };
      // Cold proxy startup can legitimately take up to 40 seconds while the
      // service worker and transport come online.  A shorter client timeout
      // made image-heavy apps discard every pending cover just before the
      // proxy became ready.
      var timer = setTimeout(function () {
        pending.delete(id);
        if (signal) signal.removeEventListener("abort", abort);
        rejectPromise(new Error("The NEO web proxy did not answer."));
      }, 45000);
      pending.set(id, {
        resolve: resolvePromise,
        reject: rejectPromise,
        timer: timer,
        signal: signal,
        abort: abort
      });
      if (signal) signal.addEventListener("abort", abort, { once: true });
      shellWindow().postMessage({
        type: "neo-shell:proxy-resource",
        id: id,
        href: href,
        kind: String(kind || "fetch").slice(0, 24)
      }, "*");
    });
  }

  function proxiedFetch(value, options) {
    var requestOptions = Object.assign({ credentials: "omit", cache: "no-store" }, options || {});
    return resolve(value, "fetch", requestOptions.signal).then(function (route) {
      return nativeFetch(route, requestOptions);
    });
  }

  window.addEventListener("message", function (event) {
    if (event.source !== shellWindow() && event.source !== window.parent) return;
    var data = event.data;
    if (!data || data.type !== "neo-shell:proxy-resource-result" || !pending.has(data.id)) return;
    var request = pending.get(data.id);
    pending.delete(data.id);
    clearTimeout(request.timer);
    if (request.signal) request.signal.removeEventListener("abort", request.abort);
    if (!data.ok || !data.route) {
      request.reject(new Error("The NEO web proxy could not route this resource."));
      return;
    }
    try { request.resolve(normalizeRoute(data.route)); }
    catch (error) { request.reject(error); }
  });

  window.addEventListener("pagehide", function () {
    pending.forEach(function (request) {
      clearTimeout(request.timer);
      if (request.signal) request.signal.removeEventListener("abort", request.abort);
      request.reject(new Error("The app closed before the proxy answered."));
    });
    pending.clear();
  }, { once: true });

  window.NEO_PROXY_CLIENT = Object.freeze({
    resolve: resolve,
    fetch: proxiedFetch,
    media: function (value) { return resolve(value, "media"); },
    image: function (value) { return resolve(value, "image"); }
  });
})();
