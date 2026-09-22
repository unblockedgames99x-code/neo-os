(function () {
  "use strict";
  // Keep the Browser document and its service worker on the same host as NEO OS.
  // CDN copies use the public relay from the working reference build. The
  // Cleanhost /wisp/ socket is same-origin only and rejects jsDelivr pages.
  // Edit this relative path or absolute asset origin; routes and resolve() both use it.
  var configuredAssetBase = "./";
  var base = new URL(configuredAssetBase, document.currentScript.src);
  var previewBase = new URL("http://127.0.0.1:3092/neo-os/");
  var runtimeHost = String(window.location && window.location.hostname || "").toLowerCase();
  var localRuntime = Boolean(
    window.location && window.location.protocol === "file:" ||
    runtimeHost === "localhost" ||
    runtimeHost === "127.0.0.1" ||
    runtimeHost === "0.0.0.0" ||
    runtimeHost === "::1"
  );
  window.NEO_LOCAL_CONFIG = Object.freeze({
    enabled: localRuntime,
    externalIntegrations: !localRuntime,
    onlineApps: Object.freeze(["chat", "youtube-app", "games", "movies", "neo-ai"]),
    assetBase: base.href,
    music: new URL("music-v2/index.html?v=20260919-scholarnook-v1&theme=system-v1&widgets=live-v1", base).href,
    browser: new URL("nextnode-browser/index.html?v=20260921-search-navigation-v2", base).href,
    browserWarmAssets: Object.freeze([
      "study/sf-engine.js",
      "study/sf-ctl.js",
      "study/sf-utils.js",
      "study/libcurl.js",
      "study/sf-engine.wasm"
    ].map(function (asset) { return new URL("nextnode-browser/" + asset, base).href; })),
    browserWisp: "wss://athollcottage.com/connection/",
    browserWispServers: Object.freeze([
      Object.freeze({ name: "Reference Wisp", url: "wss://athollcottage.com/connection/" }),
      Object.freeze({ name: "Reference Wisp 2", url: "wss://kristenblackburnvolleyballcamps.com/socket/" }),
      Object.freeze({ name: "Reference Wisp 3", url: "wss://cdn.northstreetumc.org/adblock/" }),
      Object.freeze({ name: "Cleanhost Wisp", url: "wss://cleanhost5896.b-cdn.net/wisp/" }),
      Object.freeze({ name: "NextNode Wisp", url: "wss://nextnode9124.b-cdn.net/w/" }),
      Object.freeze({ name: "Probuilding Wisp", url: "wss://probuildingsupplies.com/w/" }),
      Object.freeze({ name: "Mercury Wisp", url: "wss://wisp.mercurywork.shop/" })
    ]),
    appProxy: new URL("NEO-BROWSER/index.html?v=20260922-worker-version-check-v13", base).href,
    gameDocumentRelay: "https://neo-stratus-api-w6nw.onrender.com/games/v1/document",
    gamesCatalog: new URL("../games/index.json", base).href,
    gamesCovers: new URL("../games/covers.json", base).href,
    preview: previewBase.href,
    previewMusic: new URL("music-v2/", previewBase).href,
    previewBrowser: new URL("NEO-BROWSER/", previewBase).href,
    support: new URL("local-browser/support.html", base).href,
    unavailable: new URL("local-browser/unavailable.html", base).href,
    playableGames: Object.freeze(["grandmaster-chess", "quantum-clicker", "tetris"]),
    resolve: function (path) { return new URL(path, base).href; }
  });
  if (localRuntime) document.documentElement.dataset.localPreview = "true";
  else document.documentElement.dataset.deployment = "production";
})();
