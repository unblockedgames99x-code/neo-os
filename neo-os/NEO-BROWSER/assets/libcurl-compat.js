(() => {
  "use strict";

  const compatibilityApi = {};
  const scriptUrl = document.currentScript?.src || document.baseURI;
  const runtimeUrl = new URL("libcurl-0.7.4.js?v=20260831-chromebook-fallback-v1", scriptUrl).href;
  let realRuntimePromise = null;
  let websocketUrl = "";

  function getRealRuntime() {
    // The vendored runtime exposes a global lexical `const libcurl` rather
    // than replacing window.libcurl. That binding appears only after its
    // script executes, so look it up lazily on every readiness check.
    try {
      if (typeof libcurl !== "undefined" && libcurl !== compatibilityApi) return libcurl;
    } catch (_error) {}
    const runtime = globalThis.libcurl;
    return runtime !== compatibilityApi ? runtime : null;
  }

  function loadRealRuntime() {
    const loadedRuntime = getRealRuntime();
    if (typeof loadedRuntime?.HTTPSession === "function") {
      return Promise.resolve(loadedRuntime);
    }
    if (realRuntimePromise) return realRuntimePromise;
    realRuntimePromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-neo-libcurl-fallback]');
      const script = existing || document.createElement("script");
      const ready = () => {
        const runtime = getRealRuntime();
        if (!runtime || typeof runtime.HTTPSession !== "function") {
          script.remove();
          reject(new Error("The Chromebook compatibility transport did not start."));
          return;
        }
        resolve(runtime);
      };
      script.addEventListener("load", ready, { once: true });
      script.addEventListener(
        "error",
        () => {
          script.remove();
          reject(new Error("The Chromebook compatibility transport could not be loaded."));
        },
        { once: true },
      );
      if (!existing) {
        script.src = runtimeUrl;
        script.async = true;
        script.dataset.neoLibcurlFallback = "";
        document.head.appendChild(script);
      }
    }).catch((error) => {
      realRuntimePromise = null;
      throw error;
    });
    return realRuntimePromise;
  }

  // Start with the tiny compatibility surface so the normal service-worker
  // transport remains fast. If that path is blocked (for example by managed
  // Chromebook policy or an embedded Google Script origin), the first legacy
  // request upgrades itself to the complete local WebAssembly transport.
  class LegacySession {
    constructor() {
      this.connections = [16, 16, 16];
      this.session = null;
    }

    set_connections(...limits) {
      if (limits.length) this.connections = limits;
      if (this.session?.set_connections) this.session.set_connections(...this.connections);
    }

    async fetch(...args) {
      if (!this.session) {
        const runtime = await loadRealRuntime();
        if (typeof runtime.load_wasm === "function") await runtime.load_wasm();
        if (websocketUrl && typeof runtime.set_websocket === "function") runtime.set_websocket(websocketUrl);
        this.session = new runtime.HTTPSession();
        if (this.session.set_connections) this.session.set_connections(...this.connections);
      }
      return this.session.fetch(...args);
    }

    close() {
      try { this.session?.close(); } catch (_error) {}
      this.session = null;
    }
  }

  Object.assign(compatibilityApi, {
    load_wasm: () => Promise.resolve(),
    set_websocket: (url) => { websocketUrl = String(url || ""); },
    HTTPSession: LegacySession,
  });
  globalThis.libcurl = compatibilityApi;

  queueMicrotask(() => document.dispatchEvent(new Event("libcurl_load")));
})();
