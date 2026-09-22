(function () {
  "use strict";

  var CHECK_INTERVAL = 45000;
  var CHECK_TIMEOUT = 6000;
  var RELAY_ATTEMPT_TIMEOUT = 1800;
  var RELAY_URLS = [
    "wss://cleanhost5896.b-cdn.net/w/",
    "wss://nextnode9124.b-cdn.net/w/",
    "wss://support.pired.org/lively/",
    "wss://girlspreples.com/lively/",
    "wss://northstreetumc.org/lively/",
    "wss://pcesc.com/lively/",
    "wss://kcchallengevbc.com/lively/",
    "wss://slcbmooc.org/lively/",
    "wss://wisp.mercurywork.shop/"
  ];
  var SERVER_URLS = [
    { name: "Music server", url: "https://lol.samidy.workers.dev/" },
    { name: "Chat server", url: "https://lunchbreak.dyercountylawncare.workers.dev/api/auth/token" },
    { name: "Cloud server", url: "https://neo-stratus-api-w6nw.onrender.com/health" }
  ];
  var preferredRelay = RELAY_URLS[0];
  var listeners = [];
  var running = null;
  var sequence = 0;
  var timer = 0;
  var started = false;
  var state = Object.freeze({
    status: "checking",
    label: "Checking connection",
    summary: "Testing NEO OS services…",
    ready: 0,
    total: 8,
    latency: 0,
    checkedAt: 0,
    services: []
  });

  function notify() {
    var snapshot = getState();
    listeners.slice().forEach(function (listener) {
      try { listener(snapshot); } catch (_error) {}
    });
    window.dispatchEvent(new CustomEvent("neo-connection-change", { detail: snapshot }));
  }

  function getState() {
    return Object.assign({}, state, {
      services: state.services.map(function (service) { return Object.assign({}, service); })
    });
  }

  function checkUrl(name, path, base) {
    var controller = new AbortController();
    var timeout = window.setTimeout(function () { controller.abort(); }, CHECK_TIMEOUT);
    var url = new URL(path, base);
    var options = {
      method: "HEAD",
      cache: "force-cache",
      signal: controller.signal
    };
    if (url.origin !== window.location.origin) options.mode = "no-cors";
    var startedAt = performance.now();
    return fetch(url.href, options).then(function (response) {
      var reachable = response.ok || response.type === "opaque";
      return { name: name, ready: reachable, latency: Math.max(1, Math.round(performance.now() - startedAt)) };
    }).catch(function () {
      return { name: name, ready: false, latency: 0 };
    }).then(function (result) {
      window.clearTimeout(timeout);
      return result;
    });
  }

  function checkServer(name, url) {
    var controller = new AbortController();
    var timeout = window.setTimeout(function () { controller.abort(); }, CHECK_TIMEOUT);
    var startedAt = performance.now();
    return fetch(url, {
      method: "GET",
      cache: "no-store",
      credentials: "omit",
      signal: controller.signal
    }).then(function (response) {
      return {
        name: name,
        ready: response.type === "opaque" || response.status < 500,
        latency: Math.max(1, Math.round(performance.now() - startedAt))
      };
    }).catch(function () {
      return { name: name, ready: false, latency: 0 };
    }).then(function (result) {
      window.clearTimeout(timeout);
      // This probe only needs headers. Release an unread or streaming body
      // after recording the result instead of leaving its connection open.
      controller.abort();
      return result;
    });
  }

  function checkRelayUrl(url) {
    return new Promise(function (resolve) {
      var socket;
      var settled = false;
      var startedAt = performance.now();
      var timeout = window.setTimeout(function () { finish(false); }, RELAY_ATTEMPT_TIMEOUT);
      function finish(ready) {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        if (socket && socket.readyState < 2) {
          try { socket.close(1000, "Health check complete"); } catch (_error) {}
        }
        resolve({
          ready: ready,
          url: url,
          latency: ready ? Math.max(1, Math.round(performance.now() - startedAt)) : 0
        });
      }
      try {
        socket = new WebSocket(url);
        socket.addEventListener("open", function () { finish(true); }, { once: true });
        socket.addEventListener("error", function () { finish(false); }, { once: true });
        socket.addEventListener("close", function () { finish(false); }, { once: true });
      } catch (_error) {
        finish(false);
      }
    });
  }

  function checkRelay() {
    if (navigator.onLine === false || typeof WebSocket !== "function") {
      return Promise.resolve({ name: "Browser relay", ready: false, latency: 0 });
    }
    return checkRelayUrl(preferredRelay).then(function (primary) {
      if (primary.ready) return primary;
      var fallbacks = RELAY_URLS.filter(function (url) { return url !== preferredRelay; });
      return Promise.all(fallbacks.map(checkRelayUrl)).then(function (results) {
        return results.find(function (result) { return result.ready; }) || { ready: false, latency: 0 };
      });
    }).then(function (result) {
      if (result.ready && result.url) preferredRelay = result.url;
      return { name: "Browser relay", ready: result.ready, latency: result.latency || 0, url: result.url || "" };
    });
  }

  function resultState(services, elapsed) {
    var ready = services.filter(function (service) { return service.ready; }).length;
    var siteServices = services.filter(function (service) {
      return service.name === "Desktop" || service.name === "Browser" || service.name === "Music" || service.name === "Wallpapers";
    });
    var siteReady = siteServices.filter(function (service) { return service.ready; }).length;
    var externalServices = services.filter(function (service) { return siteServices.indexOf(service) === -1; });
    var externalReady = externalServices.filter(function (service) { return service.ready; }).length;
    var failed = services.filter(function (service) { return !service.ready; }).map(function (service) { return service.name; });
    var next = {
      status: "limited",
      label: "Connection limited",
      summary: failed.length ? "Unavailable: " + failed.join(", ") + "." : "Some services did not respond.",
      ready: ready,
      total: services.length,
      latency: elapsed,
      checkedAt: Date.now(),
      services: services
    };
    if (navigator.onLine === false) {
      next.status = "offline";
      next.label = "Offline";
      next.summary = "This device is offline. Reconnect to Wi-Fi and try again.";
    } else if (siteReady === siteServices.length && externalReady === externalServices.length) {
      next.status = "connected";
      next.label = "Online";
      next.summary = "Wi-Fi and all NEO app servers are responding.";
    } else if (siteReady === siteServices.length && externalReady) {
      next.status = "limited";
      next.label = "Online · some services limited";
      next.summary = "Wi-Fi is working. Unavailable: " + failed.join(", ") + ".";
    } else if (siteReady === siteServices.length) {
      next.status = "limited";
      next.label = "Online · servers blocked";
      next.summary = "The site is online, but this network is blocking NEO's live servers.";
    } else if (window.location.protocol === "file:" && siteReady <= 1) {
      next.status = "local";
      next.label = "Local mode";
      next.summary = "Desktop is open. Start the NEO server for full Browser and Music access.";
    } else if (!ready) {
      next.status = "offline";
      next.label = "Connection unavailable";
      next.summary = "NEO services did not respond. Check the network and try again.";
    }
    return Object.freeze(next);
  }

  function refresh(force) {
    if (running && !force) return running;
    var run = ++sequence;
    state = Object.freeze(Object.assign({}, state, {
      status: "checking",
      label: "Checking connection",
      summary: "Testing Wi-Fi, NEO apps, and live servers…"
    }));
    notify();
    var startedAt = performance.now();
    var config = window.NEO_LOCAL_CONFIG || {};
    var base = config.assetBase || (window.location.protocol === "file:" && config.preview
      ? config.preview
      : new URL("./", document.baseURI).href);
    running = Promise.all([
      checkUrl("Desktop", "index.html", base),
      checkUrl("Browser", config.browser || "NEO-BROWSER/index.html", base),
      checkUrl("Music", config.music || "music-v2/index.html", base),
      checkUrl("Wallpapers", "wallpaper-full-media.json", base),
      checkRelay()
    ].concat(SERVER_URLS.map(function (server) {
      return checkServer(server.name, server.url);
    }))).then(function (services) {
      if (run !== sequence) return getState();
      state = resultState(services, Math.max(1, Math.round(performance.now() - startedAt)));
      notify();
      return getState();
    }).finally(function () {
      if (run === sequence) running = null;
    });
    return running;
  }

  function subscribe(listener) {
    if (typeof listener !== "function") return function () {};
    listeners.push(listener);
    listener(getState());
    return function () { listeners = listeners.filter(function (item) { return item !== listener; }); };
  }

  function start() {
    if (started) return;
    started = true;
    refresh();
    window.clearInterval(timer);
    timer = window.setInterval(function () {
      if (!document.hidden) refresh();
    }, CHECK_INTERVAL);
  }

  window.addEventListener("online", function () { refresh(true); });
  window.addEventListener("offline", function () { refresh(true); });
  window.addEventListener("pageshow", function () { if (started) refresh(); });
  document.addEventListener("visibilitychange", function () { if (started && !document.hidden) refresh(); });

  window.NEO_CONNECTION_MONITOR = {
    start: start,
    refresh: function () { return refresh(true); },
    subscribe: subscribe,
    getState: getState
  };
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(start, { timeout: 5000 });
  } else {
    window.setTimeout(start, 2500);
  }
})();
