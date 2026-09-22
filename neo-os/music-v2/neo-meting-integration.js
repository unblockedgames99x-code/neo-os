(function () {
  "use strict";

  if (window.__NEO_METING_INTEGRATION__) return;
  window.__NEO_METING_INTEGRATION__ = true;
  window.__NEO_MUSIC__ = true;

  // ScholarNook's Cirrus service is already a CORS-enabled media relay. Keeping
  // catalogue, artwork, and byte-range audio on the same origin avoids the
  // mixed-provider failures that the old Music backend could produce.
  var DEFAULT_SERVER_ORIGIN = "https://cirrusbk6l.planet35.com";
  var configuredOrigin = String(window.__NEO_MUSIC_SERVER_ORIGIN__ || DEFAULT_SERVER_ORIGIN).trim();
  var serverOrigin = configuredOrigin.replace(/\/+$/, "");

  function isServerRelayUrl(value) {
    try { return new URL(String(value || ""), document.baseURI).origin === new URL(serverOrigin).origin; }
    catch (error) { return false; }
  }

  window.__NEO_MUSIC_SERVER_ORIGIN__ = serverOrigin;
  window.__NEO_MUSIC_API__ = Object.freeze({
    base: serverOrigin,
    searchUrl: function (query) {
      return serverOrigin + "/_o/m/search?q=" + encodeURIComponent(query || "");
    },
    homeUrl: function () {
      return serverOrigin + "/_o/m/discover";
    },
    trackUrl: function (id) {
      return serverOrigin + "/_o/m/stream/" + encodeURIComponent(id || "");
    },
    coverUrl: function (value) {
      try { return new URL(String(value || ""), serverOrigin + "/").href; }
      catch (error) { return ""; }
    },
    isRelayUrl: isServerRelayUrl
  });

  // Keep every external Music request on the shared NEO web route. There is
  // intentionally no direct-network fallback: restricted ChromeOS networks
  // otherwise get a mixture of proxied catalogue data and blocked media.
  var nativeFetch = window.fetch.bind(window);
  var optionalLyricsHosts = /(?:lyrics|translate)/i;
  window.fetch = function (input, options) {
    var raw = typeof input === "string" || input instanceof URL ? String(input) : input && input.url;
    var target;
    try { target = new URL(raw || "", document.baseURI); }
    catch (error) { return nativeFetch(input, options); }
    if (target.origin === location.origin || !/^https?:$/.test(target.protocol)) return nativeFetch(input, options);
    // The NEO Music API is already a server-side relay with CORS and byte-range
    // support. Sending it through the full browser proxy again adds a 40-second
    // cold start and breaks streaming on low-power Chromebooks.
    if (isServerRelayUrl(target.href)) return nativeFetch(target.href, options);
    if (window.parent === window && optionalLyricsHosts.test(target.hostname)) {
      return Promise.resolve(new Response('{"results":[]}', {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }));
    }
    if (window.NEO_PROXY_CLIENT && typeof window.NEO_PROXY_CLIENT.resolve === "function") {
      return window.NEO_PROXY_CLIENT.resolve(target.href, "fetch", options && options.signal).then(function (route) {
        return nativeFetch(route, options);
      });
    }
    return Promise.reject(new Error("NEO Music requires the NEO web proxy for external requests."));
  };
})();
