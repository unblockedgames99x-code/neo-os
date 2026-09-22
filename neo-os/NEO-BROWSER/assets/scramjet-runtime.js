(() => {
  "use strict";

  const pageBase = new URL("./", document.baseURI);
  const serviceWorkerUrl = new URL("sw.js?v=20260922-cinecat-source-recovery-v10", pageBase);
  const serviceWorkerScope = pageBase.pathname;
  const proxyBase = new URL("~/", pageBase).pathname;
  const bareMuxWorkerUrl = new URL(
    "scramjet/baremux-worker.js?v=20260910-nextnode-proxy-v1",
    pageBase,
  ).href;
  const bareMuxTransportUrl = new URL(
    "scramjet/libcurl.mjs?v=20260921-reference-runtime-v1",
    pageBase,
  ).href;
  const bareMuxRuntimeUrl = new URL(
    "scramjet/baremux.js?v=20260910-fast-browser-v2",
    pageBase,
  ).href;
  const jetCoreUrl = new URL(
    "jet/jet.core.js?v=20260921-reference-runtime-v1",
    pageBase,
  ).href;
  const jetApiUrl = new URL(
    "jet/jet.api.js?v=20260921-reference-runtime-v1",
    pageBase,
  ).href;
  if (location.href === "about:srcdoc") {
    const NativeURL = globalThis.URL;
    globalThis.URL = class URL extends NativeURL {
      constructor(input, base) {
        super(input, /^about:srcdoc(?:[?#]|$)/i.test(String(base || "")) ? pageBase.href : base);
      }
    };
  }
  const initialServiceWorker = navigator.serviceWorker?.controller || null;
  const canRegisterServiceWorker = pageBase.origin === location.origin || Boolean(
    initialServiceWorker && new URL(initialServiceWorker.scriptURL).origin === pageBase.origin
  );
  const NEXTNODE_PROXY_ORIGIN = "https://nextnode9124.b-cdn.net/";
  // Cleanhost's production browser exposes its WISP transport at /wisp/.
  // Keep this exact path in sync with the upstream browser; /w/ serves the
  // wrong endpoint and can return the host application instead of the target.
  const CLEANHOST_WISP_RELAY = "wss://cleanhost5896.b-cdn.net/wisp/";
  const REFERENCE_WISP_RELAY = "wss://cdn.northstreetumc.org/adblock/";
  const REFERENCE_BACKUP_RELAY = "wss://athollcottage.com/connection/";
  const REFERENCE_SECONDARY_RELAY = "wss://kristenblackburnvolleyballcamps.com/socket/";
  const NEXTNODE_WISP_RELAY = "wss://nextnode9124.b-cdn.net/w/";
  // Cleanhost's same-origin relay rejects third-party origins. The published
  // reference build uses this public relay for CDN-hosted copies.
  const DEFAULT_WISP_RELAY = REFERENCE_BACKUP_RELAY;
  const WISP_SERVERS = Object.freeze([
    Object.freeze({ name: "Reference Wisp", url: REFERENCE_BACKUP_RELAY }),
    Object.freeze({ name: "Reference Wisp 2", url: REFERENCE_SECONDARY_RELAY }),
    Object.freeze({ name: "Reference Wisp 3", url: REFERENCE_WISP_RELAY }),
    Object.freeze({ name: "Cleanhost Wisp", url: CLEANHOST_WISP_RELAY }),
    Object.freeze({ name: "NextNode Wisp", url: NEXTNODE_WISP_RELAY }),
    Object.freeze({ name: "Probuilding Wisp", url: "wss://probuildingsupplies.com/w/" }),
    Object.freeze({ name: "Mercury Wisp", url: "wss://wisp.mercurywork.shop/" }),
  ]);
  const relayCacheKey = "neo:jet:last-relay:selected-v1";
  const preferredRelayKey = "neo:browser:wisp:v1";
  const controllerReloadKey = "neo:jet:controller-reload:v3";
  const relayHosts = WISP_SERVERS.map((server) => server.url);

  let initializePromise = null;
  let runtimePromise = null;
  let serviceWorkerPromise = null;
  let controller = null;
  let proxyFrame = null;
  let attachedFrame = null;
  let active = false;
  let lastVisibleUrl = "";
  let selectedRelay = "";
  let bareMuxConnection = null;
  let activeTransport = null;
  let navigationSerial = 0;
  let readySerial = 0;

  function withTimeout(promise, milliseconds, message) {
    let timer = 0;
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = window.setTimeout(() => reject(new Error(message)), milliseconds);
      }),
    ]).finally(() => window.clearTimeout(timer));
  }

  function loadScript(url, ready) {
    if (ready()) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const existing = Array.from(document.scripts).find((script) => script.dataset.neoRuntime === url);
      const script = existing || document.createElement("script");
      const finish = () => ready()
        ? resolve()
        : reject(new Error(`The browser engine did not start: ${new URL(url).pathname}`));
      script.addEventListener("load", finish, { once: true });
      script.addEventListener("error", () => {
        script.remove();
        reject(new Error(`The browser engine could not load: ${new URL(url).pathname}`));
      }, { once: true });
      if (!existing) {
        script.src = url;
        script.async = true;
        script.dataset.neoRuntime = url;
        document.head.appendChild(script);
      }
    });
  }

  function ensureProxyRuntime() {
    if (globalThis.$scramjetController?.Controller && globalThis.BareMux?.BareClient) {
      return Promise.resolve();
    }
    if (!runtimePromise) {
      runtimePromise = Promise.all([
        loadScript(bareMuxRuntimeUrl, () => Boolean(globalThis.BareMux?.BareClient)),
        loadScript(jetCoreUrl, () => Boolean(globalThis.$scramjet)),
      ]).then(() => loadScript(
        jetApiUrl,
        () => Boolean(globalThis.$scramjetController?.Controller),
      )).catch((error) => {
        runtimePromise = null;
        throw error;
      });
    }
    return runtimePromise;
  }

  function supports(value) {
    if (!canRegisterServiceWorker) return false;
    try {
      const url = new URL(value);
      return (url.protocol === "https:" || url.protocol === "http:") &&
        url.origin !== location.origin;
    } catch {
      return false;
    }
  }

  function isProxyUrl(value) {
    // While Jet owns the frame, transient about:blank/original-looking URLs must
    // not be handed back to NEO's legacy renderer.
    if (active) return true;
    try {
      const url = new URL(value, location.href);
      return url.origin === location.origin && url.pathname.startsWith(proxyBase);
    } catch {
      return false;
    }
  }

  function normalizeRelay(value) {
    const relay = String(value || "").trim();
    if (!/^wss?:\/\//i.test(relay)) return "";
    try {
      const url = new URL(relay);
      if (url.protocol !== "ws:" && url.protocol !== "wss:") return "";
      return url.href.endsWith("/") ? url.href : `${url.href}/`;
    } catch {
      return "";
    }
  }

  function cachedRelay() {
    try {
      return normalizeRelay(localStorage.getItem(relayCacheKey));
    } catch {
      return "";
    }
  }

  function preferredRelay() {
    try {
      const saved = normalizeRelay(localStorage.getItem(preferredRelayKey));
      // Named choices and explicitly supplied Custom endpoints are attempted
      // first. If a school network blocks one socket, the runtime continues
      // through another published WISP endpoint.
      if (saved) return saved;
    } catch {}
    try {
      const configured = normalizeRelay(globalThis.parent?.NEO_LOCAL_CONFIG?.browserWisp);
      if (configured) return configured;
    } catch {}
    return DEFAULT_WISP_RELAY;
  }

  function relayCandidates() {
    return [...new Set([
      preferredRelay(),
      cachedRelay(),
      ...relayHosts,
    ].map(normalizeRelay).filter(Boolean))];
  }

  function waitForWorkerState(worker, expectedState) {
    if (!worker || worker.state === expectedState) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error("The compatibility service timed out.")), 8000);
      const onStateChange = () => {
        if (worker.state !== expectedState && worker.state !== "redundant") return;
        window.clearTimeout(timer);
        worker.removeEventListener("statechange", onStateChange);
        worker.state === expectedState ? resolve() : reject(new Error("The compatibility service was replaced."));
      };
      worker.addEventListener("statechange", onStateChange);
    });
  }

  function isExpectedController(worker) {
    if (!worker?.scriptURL) return false;
    try {
      const active = new URL(worker.scriptURL);
      return active.origin === serviceWorkerUrl.origin &&
        active.pathname === serviceWorkerUrl.pathname &&
        active.search === serviceWorkerUrl.search;
    } catch {
      return false;
    }
  }

  function waitForExpectedController(timeout = 3000) {
    const current = navigator.serviceWorker.controller;
    if (isExpectedController(current)) return Promise.resolve(current);

    return new Promise((resolve) => {
      const finish = (worker = null) => {
        window.clearTimeout(timer);
        navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
        resolve(worker);
      };
      const onControllerChange = () => {
        const next = navigator.serviceWorker.controller;
        if (isExpectedController(next)) finish(next);
      };
      const timer = window.setTimeout(() => finish(null), timeout);
      navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    });
  }

  async function registerServiceWorker() {
    if (!canRegisterServiceWorker) {
      throw new Error("This host uses the Chromebook compatibility transport.");
    }
    if (!("serviceWorker" in navigator)) throw new Error("This browser does not support service workers.");

    const inheritedController = navigator.serviceWorker.controller;
    if (isExpectedController(inheritedController)) return inheritedController;
    if (pageBase.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(pageBase.hostname)) {
      throw new Error("Secure browsing compatibility requires HTTPS.");
    }

    const registration = await navigator.serviceWorker.register(serviceWorkerUrl.href, {
      scope: serviceWorkerScope,
    });
    await registration.update();
    if (registration.installing) await waitForWorkerState(registration.installing, "activated");
    if (registration.waiting) {
      registration.waiting.postMessage({ type: "neo:jet:activate" });
      await waitForWorkerState(registration.waiting, "activated");
    }
    await navigator.serviceWorker.ready;

    const activeWorker = registration.active;
    if (activeWorker) activeWorker.postMessage({ type: "neo:jet:claim" });
    const current = await waitForExpectedController();
    if (current) {
      sessionStorage.removeItem(controllerReloadKey);
      return current;
    }

    // Chrome can activate a worker one navigation before it controls this
    // iframe. Reload once, then fail clearly instead of sending a proxy URL to
    // the static host and displaying its 404 response.
    if (sessionStorage.getItem(controllerReloadKey) !== serviceWorkerUrl.href) {
      sessionStorage.setItem(controllerReloadKey, serviceWorkerUrl.href);
      location.reload();
      return new Promise(() => {});
    }

    sessionStorage.removeItem(controllerReloadKey);
    throw new Error("The secure browsing service could not control this page.");
  }

  function ensureServiceWorker() {
    if (!serviceWorkerPromise) serviceWorkerPromise = registerServiceWorker();
    return serviceWorkerPromise;
  }

  async function initializeTransport(instance) {
    for (let attempt = 0; attempt < 28; attempt += 1) {
      try {
        await instance.init();
        return;
      } catch (error) {
        if (!String(error).includes("wasm not loaded")) throw error;
        await new Promise((resolve) => window.setTimeout(resolve, 95));
      }
    }
    throw new Error("The network transport did not initialize in time.");
  }

  function headersObject(headers) {
    if (!headers) return {};
    if (headers instanceof Headers) return Object.fromEntries(headers.entries());
    if (Array.isArray(headers)) return Object.fromEntries(headers);
    return headers;
  }

  function rawHeaderEntries(headers, fallback) {
    if (Array.isArray(headers)) return headers;
    if (headers && typeof headers[Symbol.iterator] === "function") return [...headers];
    if (headers && typeof headers === "object") {
      return Object.entries(headers).flatMap(([name, values]) => (
        Array.isArray(values) ? values.map((value) => [name, String(value)]) : [[name, String(values)]]
      ));
    }
    return [...fallback.entries()];
  }

  async function responseBodyBuffer(body) {
    if (!body) return new ArrayBuffer(0);
    if (body instanceof ArrayBuffer) return body;
    if (ArrayBuffer.isView(body)) {
      return body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength);
    }
    return new Response(body).arrayBuffer();
  }

  window.addEventListener("message", async (event) => {
    const message = event.data;
    if (!message || message.type !== "neo:cinecat:transport-request") return;
    const reply = event.ports?.[0];
    if (!reply) return;
    try {
      if (!activeTransport) throw new Error("The movie network service is not ready.");
      const remote = new URL(String(message.url || ""));
      if (!/^https?:$/.test(remote.protocol)) throw new Error("Unsupported movie request protocol.");
      const method = String(message.method || "GET").toUpperCase();
      let body = message.body || null;
      if (body && ArrayBuffer.isView(body)) {
        body = body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength);
      }
      const response = await activeTransport.request(
        remote,
        method,
        /^(?:GET|HEAD)$/.test(method) ? null : body,
        Object.entries(message.headers || {}),
      );
      const responseBody = await responseBodyBuffer(response.body);
      reply.postMessage({
        ok: true,
        response: {
          status: response.status,
          statusText: response.statusText || "",
          headers: rawHeaderEntries(response.headers, new Headers()),
          finalUrl: remote.href,
          body: responseBody,
        },
      }, [responseBody]);
    } catch (error) {
      console.warn("[NEO Movies transport] failed", error instanceof Error ? error.message : String(error));
      reply.postMessage({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      reply.close();
    }
  });

  function createWorkerTransport(client) {
    return {
      ready: true,
      async init() {},
      async request(remote, method, body, headers, signal) {
        const response = await client.fetch(remote.href, {
          method,
          headers: headersObject(headers),
          body,
          redirect: "manual",
          signal,
          ...(typeof ReadableStream === "function" && body instanceof ReadableStream ? { duplex: "half" } : {}),
        });
        return {
          body: response.body,
          headers: rawHeaderEntries(response.rawHeaders, response.headers),
          status: response.status,
          statusText: response.statusText,
        };
      },
      connect(url, protocols, requestHeaders, onopen, onmessage, onclose, onerror) {
        const socket = client.createWebSocket(url, protocols, undefined, headersObject(requestHeaders));
        socket.binaryType = "arraybuffer";
        socket.onopen = () => onopen("", "");
        socket.onmessage = (event) => onmessage(event.data);
        socket.onclose = (event) => onclose(event.code, event.reason);
        socket.onerror = () => onerror("");
        return [
          (data) => socket.send(data),
          (code, reason) => socket.close(code, reason),
        ];
      },
    };
  }

  // Managed Chromebooks handle a shared networking worker more reliably than
  // a tab-owned worker. BareMux also lets the service worker reuse the exact
  // same Libcurl/WISP connection instead of rebuilding it for every request.
  async function createBareMuxTransport(relay) {
    if (
      typeof SharedWorker !== "function" ||
      !globalThis.BareMux?.BareMuxConnection ||
      !globalThis.BareMux?.BareClient
    ) return null;

    const connection = bareMuxConnection || new globalThis.BareMux.BareMuxConnection(bareMuxWorkerUrl);
    bareMuxConnection = connection;
    await withTimeout(
      connection.setTransport(bareMuxTransportUrl, [{ wisp: relay }]),
      12000,
      "The shared network service took too long to start.",
    );
    const selectedTransport = await withTimeout(
      connection.getTransport(),
      4000,
      "The shared network service could not be verified.",
    );
    if (selectedTransport !== bareMuxTransportUrl) {
      throw new Error("The shared network service did not stay connected.");
    }
    return createWorkerTransport(new globalThis.BareMux.BareClient(bareMuxWorkerUrl));
  }

  async function createOffMainThreadTransport(relay) {
    if (typeof Worker !== "function") return null;
    const workerUrl = new URL("scramjet/transport-worker.js", pageBase).href;
    const transportUrl = new URL("scramjet/libcurl.mjs", pageBase).href;
    const worker = new Worker(workerUrl, { type: "module", name: "neo-network" });
    const pending = new Map();
    const sockets = new Map();
    let nextId = 0;

    const call = (type, detail = {}, transfer = [], timeoutMs = 15000) => {
      const id = ++nextId;
      const promise = new Promise((resolve, reject) => {
        const timer = window.setTimeout(() => {
          pending.delete(id);
          worker.postMessage({ type: "cancel", requestId: id });
          reject(new Error("The background network worker timed out."));
        }, timeoutMs);
        pending.set(id, {
          resolve(value) { window.clearTimeout(timer); resolve(value); },
          reject(error) { window.clearTimeout(timer); reject(error); },
        });
        worker.postMessage({ id, type, transportUrl, relay, ...detail }, transfer);
      });
      promise.neoRequestId = id;
      return promise;
    };
    worker.addEventListener("message", (event) => {
      const message = event.data || {};
      if (message.event && message.socketId) {
        const socket = sockets.get(message.socketId);
        if (!socket) return;
        if (message.event === "socket-open") socket.onopen(message.protocol || "", "");
        if (message.event === "socket-message") socket.onmessage(message.data);
        if (message.event === "socket-close") {
          sockets.delete(message.socketId);
          socket.onclose(message.code, message.reason || "");
        }
        if (message.event === "socket-error") socket.onerror(message.error || "");
        return;
      }
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      if (message.ok) request.resolve(message.value);
      else request.reject(new Error(message.error || "The network worker failed."));
    });
    worker.addEventListener("error", (event) => {
      const error = new Error(event.message || "The network worker stopped.");
      pending.forEach((request) => request.reject(error));
      pending.clear();
    });
    await call("init");

    return {
      ready: true,
      async init() {},
      async request(url, method, body, headers, signal) {
        let payload = null;
        if (body instanceof ReadableStream) payload = await new Response(body).arrayBuffer();
        else if (body instanceof ArrayBuffer) payload = body;
        else if (ArrayBuffer.isView(body)) payload = body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength);
        else if (body != null) payload = new TextEncoder().encode(String(body)).buffer;
        const requestPromise = call("fetch", {
          url: String(url),
          method,
          body: payload,
          headers: headersObject(headers),
        }, payload ? [payload] : [], 45000);
        let abortRequest = null;
        if (signal) {
          abortRequest = () => worker.postMessage({
            type: "cancel",
            requestId: requestPromise.neoRequestId,
          });
          if (signal.aborted) {
            abortRequest();
            throw new DOMException("The request was cancelled.", "AbortError");
          }
          signal.addEventListener("abort", abortRequest, { once: true });
        }
        let value;
        try {
          value = await requestPromise;
        } finally {
          if (abortRequest) signal.removeEventListener("abort", abortRequest);
        }
        return {
          ...value,
          headers: rawHeaderEntries(value.headers, new Headers()),
        };
      },
      connect(url, protocols, requestHeaders, onopen, onmessage, onclose, onerror) {
        const socketId = `socket-${++nextId}`;
        sockets.set(socketId, { onopen, onmessage, onclose, onerror });
        call("connect", {
          socketId,
          url: String(url),
          protocols: protocols || [],
          headers: headersObject(requestHeaders),
        }).catch((error) => onerror(error.message));
        return [
          (data) => worker.postMessage({ type: "socket-send", socketId, data }),
          (code, reason) => worker.postMessage({ type: "socket-close", socketId, code, reason }),
        ];
      },
    };
  }

  async function selectTransport() {
    const candidates = relayCandidates();
    const selectedUrl = candidates[0];
    if (!selectedUrl) throw new Error("No compatible relay is configured.");
    const selected = { url: selectedUrl, latency: 0 };

    let transport = null;
    try {
      const { default: ReferenceTransport } = await import(bareMuxTransportUrl);
      transport = new ReferenceTransport({ wisp: selected.url });
      await initializeTransport(transport);
    } catch (error) {
      globalThis.__neoDirectTransportError = String(error?.stack || error?.message || error);
      console.warn("[NEO] Direct reference transport unavailable; using the shared fallback.", error);
      transport = null;
    }
    try {
      if (!transport) transport = await createBareMuxTransport(selected.url);
    } catch (error) {
      globalThis.__neoSharedTransportError = String(error?.stack || error?.message || error);
      console.warn("[NEO] Shared transport unavailable; using the compatibility fallback.", error);
    }
    if (!transport) {
      try {
        transport = await createOffMainThreadTransport(selected.url);
      } catch (error) {
        globalThis.__neoWorkerTransportError = String(error?.stack || error?.message || error);
        console.warn("[NEO] Compatibility transport unavailable.", error);
      }
    }
    if (!transport) throw new Error("The background network service is unavailable.");
    selectedRelay = selected.url;
    try { localStorage.setItem(relayCacheKey, selected.url); } catch {}
    return transport;
  }

  async function initialize() {
    if (initializePromise) return initializePromise;
    initializePromise = (async () => {
      await ensureProxyRuntime();
      if (!globalThis.$scramjetController?.Controller) throw new Error("The Jet runtime did not load.");
      await ensureServiceWorker();

      const transport = await selectTransport();
      activeTransport = transport;

      controller = new globalThis.$scramjetController.Controller({
        serviceworker: navigator.serviceWorker.controller,
        transport,
        config: {
          scramjetPath: new URL("jet/jet.core.js", pageBase).href,
          wasmPath: new URL("jet/jet.wasm", pageBase).href,
          injectPath: new URL("jet/jet.inject.js", pageBase).href,
          virtualWasmPath: "jet.wasm.js",
          codec: {
            encode: (value) => value ? encodeURIComponent(value) : value,
            decode: (value) => value ? decodeURIComponent(value) : value,
          },
          prefix: proxyBase,
        },
        scramjetConfig: {
          maskedfiles: ["jet.inject.js", "jet.wasm.js"],
        },
      });
      await controller.wait();
      window.dispatchEvent(new CustomEvent("neo:scramjet:transportready", {
        detail: { relay: selectedRelay },
      }));
      return controller;
    })().catch((error) => {
      initializePromise = null;
      throw error;
    });
    return initializePromise;
  }

  function originalUrl() {
    if (!proxyFrame || !attachedFrame) return "";
    try {
      const current = new URL(attachedFrame.contentWindow?.location?.href || attachedFrame.src);
      if (!current.pathname.startsWith(proxyFrame.prefix)) return "";
      return decodeURIComponent(current.pathname.slice(proxyFrame.prefix.length));
    } catch {
      return "";
    }
  }

  function emitUrl(url) {
    if (!url || url === lastVisibleUrl) return;
    lastVisibleUrl = url;
    window.dispatchEvent(new CustomEvent("neo:scramjet:urlchange", { detail: { url } }));
  }

  function announceReady(frameElement, serial) {
    if (!active || attachedFrame !== frameElement || serial !== navigationSerial || readySerial === serial) return;
    readySerial = serial;
    try { globalThis.NEOAdShield?.install(frameElement.contentWindow); } catch {}
    installImageRecovery(frameElement.contentWindow);
    emitUrl(originalUrl());
    let title = "";
    try { title = frameElement.contentDocument?.title || ""; } catch {}
    window.dispatchEvent(new CustomEvent("neo:scramjet:ready", { detail: { title } }));
  }

  function waitForFirstPaint(frameElement, serial) {
    const startedAt = performance.now();
    const check = () => {
      if (!active || attachedFrame !== frameElement || serial !== navigationSerial || readySerial === serial) return;
      let interactive = false;
      try {
        const frameDocument = frameElement.contentDocument;
        interactive = Boolean(frameDocument?.body) && frameDocument.readyState !== "loading";
      } catch {}
      if (interactive || performance.now() - startedAt > 6000) {
        announceReady(frameElement, serial);
        return;
      }
      window.setTimeout(check, 80);
    };
    window.setTimeout(check, 80);
  }

  function installImageRecovery(frameWindow) {
    let frameDocument;
    try { frameDocument = frameWindow?.document; } catch { return; }
    if (!frameDocument?.documentElement || frameDocument.__neoImageRecovery) return;
    frameDocument.__neoImageRecovery = true;

    const retry = (image) => {
      const attempts = Number(image.dataset.neoImageRetries || 0);
      const source = image.currentSrc || image.src || image.getAttribute("src") || "";
      if (attempts >= 2 || !source || /^(?:data:|blob:|about:)/i.test(source)) return;
      image.dataset.neoImageRetries = String(attempts + 1);
      window.setTimeout(() => {
        if (!image.isConnected) return;
        try {
          const retryUrl = new URL(source, frameDocument.baseURI);
          retryUrl.searchParams.set("__neo_asset_retry", String(attempts + 1));
          image.src = retryUrl.href;
        } catch {}
      }, 180 * (attempts + 1));
    };

    frameDocument.addEventListener("error", (event) => {
      if (event.target?.tagName === "IMG") retry(event.target);
    }, true);
    frameDocument.querySelectorAll("img[src]").forEach((image) => {
      if (image.complete && image.naturalWidth === 0) retry(image);
    });
  }

  function attachFrame(frameElement) {
    if (proxyFrame && attachedFrame === frameElement) return proxyFrame;
    proxyFrame = controller.createFrame(frameElement);
    attachedFrame = frameElement;
    frameElement.addEventListener("load", () => {
      if (!active || !isProxyUrl(frameElement.src)) return;
      announceReady(frameElement, navigationSerial);
    });
    return proxyFrame;
  }

  function localCompatibilityPage(value) {
    try {
      const target = new URL(value);
      const googleSitesPage = target.hostname === 'sites.google.com' &&
        /^\/view\/staticquasar\/gm3z\/snow-rider\/?$/i.test(target.pathname);
      const gadgetSource = target.searchParams.get('url') || '';
      const retiredGoogleGadget = target.hostname === 'images-opensocial.googleusercontent.com' &&
        /\/gadgets\/ifr$/i.test(target.pathname) &&
        /\/mind4ur\/debugactions@[^/]+\/sr3d2\.xml(?:[?#]|$)/i.test(gadgetSource);
      if (!googleSitesPage && !retiredGoogleGadget) return '';
      return new URL('compat/staticquasar-snow-rider.html?v=20260911-google-sites-v1', pageBase).href;
    } catch {
      return '';
    }
  }

  function openLocalCompatibilityPage(requestedUrl, localUrl, frameElement) {
    active = true;
    lastVisibleUrl = requestedUrl;
    proxyFrame = null;
    attachedFrame = frameElement;
    frameElement.dataset.neoScramjet = 'true';
    frameElement.removeAttribute('srcdoc');
    frameElement.style.opacity = '1';
    frameElement.addEventListener('load', () => {
      if (!active || attachedFrame !== frameElement) return;
      let title = 'Snow Rider 3D';
      try { title = frameElement.contentDocument?.title || title; } catch {}
      window.dispatchEvent(new CustomEvent('neo:scramjet:ready', { detail: { title } }));
    }, { once: true });
    frameElement.src = localUrl;
  }

  async function go(url, frameElement) {
    const serial = ++navigationSerial;
    readySerial = 0;
    const requestedUrl = String(url);
    const localPage = localCompatibilityPage(requestedUrl);
    if (localPage) {
      openLocalCompatibilityPage(requestedUrl, localPage, frameElement);
      return;
    }
    try {
      const destination = new URL(requestedUrl);
      if (/^(?:www\.|m\.)?youtube\.com$/i.test(destination.hostname)) {
        destination.hostname = "m.youtube.com";
        destination.searchParams.set("app", "m");
        destination.searchParams.set("persist_app", "1");
        url = destination.href;
      }
    } catch {}
    await initialize();
    const frame = attachFrame(frameElement);
    active = true;
    lastVisibleUrl = requestedUrl;
    frameElement.dataset.neoScramjet = "true";
    frameElement.removeAttribute("srcdoc");
    frameElement.style.opacity = "1";
    frame.go(url);
    waitForFirstPaint(frameElement, serial);
  }

  function deactivate() {
    active = false;
    if (attachedFrame) delete attachedFrame.dataset.neoScramjet;
  }

  let urlPollTimer = 0;
  const pollVisibleUrl = () => {
    if (active && !document.hidden) emitUrl(originalUrl());
    urlPollTimer = window.setTimeout(pollVisibleUrl, document.hidden ? 5000 : 750);
  };
  urlPollTimer = window.setTimeout(pollVisibleUrl, 750);
  window.addEventListener("pagehide", () => window.clearTimeout(urlPollTimer), { once: true });

  globalThis.NeoScramjet = Object.freeze({
    proxyOrigin: NEXTNODE_PROXY_ORIGIN,
    supports,
    isProxyUrl,
    go,
    deactivate,
    configuredRelay: () => selectedRelay || cachedRelay() || preferredRelay() || "",
    allowRelay: (value) => Boolean(normalizeRelay(value)),
    relayCandidates: () => relayCandidates(),
    relayOptions: () => WISP_SERVERS.map((server) => ({ ...server })),
    get active() { return active; },
  });

  const warmRuntimeFromIntent = (event) => {
    if (!event.target?.closest?.("#url, #ntSearch, #newtab, #go, #ntSearchBtn")) return;
    document.removeEventListener("pointerdown", warmRuntimeFromIntent, true);
    document.removeEventListener("focusin", warmRuntimeFromIntent, true);
    ensureProxyRuntime().catch(() => {});
  };
  document.addEventListener("pointerdown", warmRuntimeFromIntent, true);
  document.addEventListener("focusin", warmRuntimeFromIntent, true);

  // initialize() is intentionally started by go(). Prewarming here used to
  // download and compile the full proxy runtime even on an untouched new tab,
  // which could block low-powered Chromebooks for several hundred milliseconds.
})();
