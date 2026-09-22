(() => {
  "use strict";

  const ENGINE_VERSION = "neo-browse-v71";
  const RUNTIME_SCRIPT_URL = document.currentScript?.src || document.baseURI;
  const CORE_BASE_URL = new URL("./", RUNTIME_SCRIPT_URL);
  const BROWSER_BASE_URL = (() => {
    try {
      const configuredBrowser = window.NEO_LOCAL_CONFIG?.browser;
      if (configuredBrowser) return new URL("../", configuredBrowser);
    } catch (error) {}
    return CORE_BASE_URL;
  })();
  const browserAsset = (path) => new URL(path, BROWSER_BASE_URL).href;
  const OS_SCOPE = CORE_BASE_URL.pathname;
  const ROUTE_PREFIX = new URL(`browse-v71/`, BROWSER_BASE_URL).pathname;
  const RUNTIME_ROOT = browserAsset("browser-runtime").replace(/\/$/, "");
  const NEW_TAB_DESTINATION = "neo://newtab";
  const NEW_TAB_PAGE = `${browserAsset("browser-newtab.html")}?v=${ENGINE_VERSION}`;
  const WORKER_URL = `${browserAsset("browser-sw.js")}?engine=${ENGINE_VERSION}`;
  const BAREMUX_WORKER_URL = `${RUNTIME_ROOT}/baremux/worker.js?engine=${ENGINE_VERSION}`;
  const PRIMARY_TRANSPORT_URL = `${RUNTIME_ROOT}/epoxy/index.mjs?engine=${ENGINE_VERSION}`;
  const FALLBACK_TRANSPORT_URL = `${RUNTIME_ROOT}/libcurl/index.mjs?engine=${ENGINE_VERSION}`;
  const NEXTNODE_PROXY_ORIGIN = "https://nextnode9124.b-cdn.net/";
  // Use the user's selected endpoint first, then fail over only to the published
  // WISP endpoints. ChromeOS networks frequently block an individual relay, so
  // pinning the whole desktop to one socket makes every proxied app fail at once.
  // Cleanhost uses one stable, same-stack Libcurl/WISP route and lets the
  // transport itself report a failure.  Starting ten WebSockets just to pick a
  // relay was especially expensive on managed Chromebooks, so NEO now follows
  // that connection model and only advances to a fallback after a real error.
  const PREFERRED_WISP_RELAY = "wss://athollcottage.com/connection/";
  const OFFICIAL_WISP_RELAYS = Object.freeze([
    PREFERRED_WISP_RELAY,
    "wss://cleanhost5896.b-cdn.net/wisp/",
    "wss://nextnode9124.b-cdn.net/w/",
    "wss://probuildingsupplies.com/w/",
    "wss://wisp.mercurywork.shop/",
  ]);
  const WISP_PREFERENCE_KEY = "neo:browser:wisp:v1";
  const WISP_RELAY_CACHE_KEY = `neo-wisp-relay:${ENGINE_VERSION}:selected-v1`;
  let runtimePromise = null;
  let stylesPromise = null;
  let transportConnection = null;
  let activeTransportUrl = "";
  let transportSetupPromise = null;
  let transportPrimaryPromise = null;
  let transportFallbackPromise = null;
  let transportRecoveryPromise = null;
  let wispRelayPromise = null;
  let activeWispRelay = "";
  const failedWispRelays = new Set();
  let transportRecoveryListenerInstalled = false;
  const appThemePromises = new Map();

  function withTimeout(promise, milliseconds, message) {
    let timeoutId = 0;
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        timeoutId = window.setTimeout(() => reject(new Error(message)), milliseconds);
      }),
    ]).finally(() => window.clearTimeout(timeoutId));
  }

  function normalizeWispRelay(value) {
    const text = String(value || "").trim();
    if (!/^wss?:\/\//i.test(text)) return "";
    try {
      const relay = new URL(text);
      return (relay.protocol === "wss:" || relay.protocol === "ws:")
        ? (relay.href.endsWith("/") ? relay.href : `${relay.href}/`)
        : "";
    } catch (error) {
      return "";
    }
  }

  function preferredWispRelay() {
    try {
      const selected = normalizeWispRelay(window.localStorage.getItem(WISP_PREFERENCE_KEY));
      // A custom relay is valid only when explicitly saved through Custom.
      if (selected) return selected;
    } catch (error) {}
    return normalizeWispRelay(window.NEO_LOCAL_CONFIG?.browserWisp) || PREFERRED_WISP_RELAY;
  }

  function wispRelayCandidates() {
    let cached = "";
    try { cached = normalizeWispRelay(window.sessionStorage.getItem(WISP_RELAY_CACHE_KEY)); }
    catch (error) {}
    return Array.from(new Set([
      preferredWispRelay(),
      cached,
      ...OFFICIAL_WISP_RELAYS,
    ].map(normalizeWispRelay).filter(Boolean)));
  }

  function selectWispRelay() {
    if (wispRelayPromise) return wispRelayPromise;
    wispRelayPromise = Promise.resolve().then(() => {
      const candidates = wispRelayCandidates();
      let remaining = candidates.filter((relay) => !failedWispRelays.has(relay));
      if (!remaining.length) {
        failedWispRelays.clear();
        remaining = candidates;
      }
      const selected = remaining[0];
      if (!selected) throw new Error("No web relay is available.");
      activeWispRelay = selected;
      try { window.sessionStorage.setItem(WISP_RELAY_CACHE_KEY, selected); } catch (error) {}
      return selected;
    }).catch((error) => {
      wispRelayPromise = null;
      throw error;
    });
    return wispRelayPromise;
  }

  function rotateWispRelay() {
    if (activeWispRelay) failedWispRelays.add(activeWispRelay);
    activeWispRelay = "";
    wispRelayPromise = null;
    return selectWispRelay();
  }

  function loadScript(id, src) {
    return new Promise((resolve, reject) => {
      const existing = document.getElementById(id);
      if (existing?.dataset.ready === "true") {
        resolve();
        return;
      }

      const script = existing || document.createElement("script");
      script.id = id;
      script.src = src;
      script.async = true;
      script.addEventListener(
        "load",
        () => {
          script.dataset.ready = "true";
          resolve();
        },
        { once: true },
      );
      script.addEventListener(
        "error",
        () => reject(new Error("The web app could not load its local runtime.")),
        { once: true },
      );
      if (!existing) document.head.appendChild(script);
    });
  }

  function loadStyles() {
    if (stylesPromise) return stylesPromise;
    stylesPromise = new Promise((resolve, reject) => {
      const existing = document.getElementById("neo-browser-runtime-styles");
      if (existing?.sheet) {
        resolve();
        return;
      }
      const link = existing || document.createElement("link");
      link.id = "neo-browser-runtime-styles";
      link.rel = "stylesheet";
      link.href = `${browserAsset("neo-browser-runtime.css")}?engine=${ENGINE_VERSION}&ui=stream-music-v1`;
      link.addEventListener("load", resolve, { once: true });
      link.addEventListener("error", () => reject(new Error("The web app styles could not load.")), { once: true });
      if (!existing) document.head.appendChild(link);
    }).catch((error) => {
      stylesPromise = null;
      throw error;
    });
    return stylesPromise;
  }

  function loadAppTheme(name) {
    const theme = String(name || "").trim();
    if (!theme) return Promise.resolve("");
    if (appThemePromises.has(theme)) return appThemePromises.get(theme);
    const source = theme === "stream-music" ? browserAsset("stream-music-frame.css") : "";
    if (!source) return Promise.resolve("");
    const request = withTimeout(
      fetch(`${source}?engine=${ENGINE_VERSION}`, { cache: "no-store" }).then((response) => {
        if (!response.ok) throw new Error("App theme unavailable.");
        return response.text();
      }),
      8000,
      "App theme took too long to load.",
    ).catch(() => "");
    appThemePromises.set(theme, request);
    return request;
  }

  function enhanceStreamMusic(frameDocument) {
    if (!frameDocument?.documentElement || frameDocument.__neoMusicCleanupEnhancer) return;

    const frameWindow = frameDocument.defaultView;
    const state = { scheduled: false };
    const unwantedMessage = /open music inside tung tung|use parties/i;

    function normalizeFavoriteSpelling() {
      const body = frameDocument.body;
      if (!body) return;

      const americanize = (value) =>
        String(value || "")
          .replace(/\bFavourites\b/g, "Favorites")
          .replace(/\bfavourites\b/g, "favorites");
      const walker = frameDocument.createTreeWalker(
        body,
        frameWindow.NodeFilter.SHOW_TEXT,
      );
      let textNode = walker.nextNode();
      while (textNode) {
        const corrected = americanize(textNode.nodeValue);
        if (corrected !== textNode.nodeValue) textNode.nodeValue = corrected;
        textNode = walker.nextNode();
      }

      body.querySelectorAll("[aria-label], [title], [placeholder]").forEach((node) => {
        ["aria-label", "title", "placeholder"].forEach((attribute) => {
          if (!node.hasAttribute(attribute)) return;
          const current = node.getAttribute(attribute);
          const corrected = americanize(current);
          if (corrected !== current) node.setAttribute(attribute, corrected);
        });
      });
    }

    function cleanMusicChrome() {
      state.scheduled = false;
      frameDocument.documentElement.classList.remove("neo-listen-parties-view");
      const discover = frameDocument.querySelector('.nv[data-view="discover"]');
      if (discover?.classList.contains("on")) {
        frameDocument.querySelector('.nv[data-view="home"], .nv[data-view="browse"], .nv:not([data-view="discover"])')?.click();
      }
      discover?.remove();
      frameDocument.querySelectorAll("[data-neo-listen-parties]").forEach((node) => node.remove());
      const partyButton = frameDocument.getElementById("partyBtn");
      (partyButton?.closest(".party-wrap") || partyButton)?.remove();
      ["ppStart", "ppJoin", "ppCode"].forEach((id) => {
        const control = frameDocument.getElementById(id);
        (control?.closest(".party-pop, .popover, .modal") || control)?.remove();
      });
      frameDocument.querySelectorAll(".toast, .snackbar, [role='status'], [role='alert']").forEach((node) => {
        if (unwantedMessage.test(node.textContent || "")) node.remove();
      });
      normalizeFavoriteSpelling();
    }

    function scheduleCleanup() {
      if (state.scheduled) return;
      state.scheduled = true;
      (frameWindow?.requestAnimationFrame || window.requestAnimationFrame)(cleanMusicChrome);
    }

    const observer = new frameWindow.MutationObserver(scheduleCleanup);
    observer.observe(frameDocument.body, {
      attributes: true,
      attributeFilter: ["class"],
      characterData: true,
      childList: true,
      subtree: true,
    });
    frameDocument.__neoMusicCleanupEnhancer = { observer };
    scheduleCleanup();
  }

  async function activateWorker() {
    const registration = await navigator.serviceWorker.register(WORKER_URL, {
      scope: ROUTE_PREFIX,
      type: "module",
      updateViaCache: "none",
    });
    const worker = registration.installing || registration.waiting || registration.active;
    if (!worker) throw new Error("The web app could not install its worker.");

    if (worker === registration.waiting) {
      worker.postMessage({ type: "neo-browser:activate", engine: ENGINE_VERSION });
    }

    if (worker.state !== "activated") {
      await withTimeout(
        new Promise((resolve, reject) => {
          const check = () => {
            if (worker.state === "activated") resolve();
            if (worker.state === "redundant") {
              reject(new Error("The web app worker installation failed."));
            }
          };
          worker.addEventListener("statechange", check);
          check();
        }),
        25000,
        "The web app took too long to start.",
      );
    }
    return registration.active || worker;
  }

  async function warmWorker(worker) {
    const channel = new MessageChannel();
    let bareMuxPort = null;
    try {
      bareMuxPort = new SharedWorker(BAREMUX_WORKER_URL, "bare-mux-worker").port;
    } catch (error) {
      // Older browsers can still use BareMux's client-discovery fallback.
    }
    const warmed = new Promise((resolve, reject) => {
      channel.port1.onmessage = (event) => {
        if (event.data?.ok && event.data.engine === ENGINE_VERSION) resolve();
        else if (event.data?.ok) reject(new Error("The web app is refreshing an older engine."));
        else reject(new Error(event.data?.message || "The web transport failed."));
      };
      channel.port1.onmessageerror = () => {
        reject(new Error("The web app did not receive a startup response."));
      };
    });
    const message = { type: "neo-browser:warm" };
    const transfer = [channel.port2];
    if (bareMuxPort) {
      message.bareMuxPort = bareMuxPort;
      transfer.push(bareMuxPort);
    }
    worker.postMessage(message, transfer);
    await withTimeout(warmed, 15000, "The web app could not reach its relay.");
  }

  function requestGameDocument(worker, target) {
    const channel = new MessageChannel();
    const request = new Promise((resolve, reject) => {
      channel.port1.onmessage = (event) => {
        if (event.data?.ok && typeof event.data.html === "string") {
          resolve({ html: event.data.html, fetchedUrl: event.data.url || target });
          return;
        }
        reject(new Error(event.data?.message || "The protected game document could not be loaded."));
      };
      channel.port1.onmessageerror = () => reject(new Error("The protected game response was invalid."));
    });
    worker.postMessage({
      type: "neo-browser:game-document",
      engine: ENGINE_VERSION,
      url: target,
    }, [channel.port2]);
    return withTimeout(request, 25000, "The protected game document took too long to load.");
  }

  function requestProxyResource(worker, target, accept) {
    const channel = new MessageChannel();
    const request = new Promise((resolve, reject) => {
      channel.port1.onmessage = (event) => {
        if (event.data?.ok && event.data.bytes instanceof ArrayBuffer) {
          resolve({
            bytes: event.data.bytes,
            type: event.data.type || "application/octet-stream",
            fetchedUrl: event.data.url || target,
          });
          return;
        }
        reject(new Error(event.data?.message || "The proxied resource could not be loaded."));
      };
      channel.port1.onmessageerror = () => reject(new Error("The proxied resource response was invalid."));
    });
    worker.postMessage({
      type: "neo-browser:proxy-resource",
      engine: ENGINE_VERSION,
      url: target,
      accept: accept || "*/*",
    }, [channel.port2]);
    return withTimeout(request, 30000, "The proxied resource took too long to load.");
  }

  async function configureTransportNow() {
    await loadScript(
      "neo-baremux-runtime",
      `${RUNTIME_ROOT}/baremux/index.js?engine=${ENGINE_VERSION}`,
    );
    if (!window.BareMux?.BareMuxConnection) {
      throw new Error("The web transport bridge is unavailable.");
    }

    const connection =
      transportConnection ||
      new window.BareMux.BareMuxConnection(BAREMUX_WORKER_URL);
    transportConnection = connection;
    const candidates = [FALLBACK_TRANSPORT_URL, PRIMARY_TRANSPORT_URL];
    const activeTransport = await withTimeout(
      connection.getTransport(),
      4000,
      "The web app could not inspect its transport.",
    ).catch(() => "");
    if (candidates.includes(activeTransport)) {
      candidates.splice(candidates.indexOf(activeTransport), 1);
      candidates.unshift(activeTransport);
    }

    let lastError = null;
    for (const transportUrl of candidates) {
      try {
        const relay = await selectWispRelay();
        await withTimeout(
          connection.setTransport(transportUrl, [{ wisp: relay }]),
          12000,
          "The web transport setup timed out.",
        );
        const selectedTransport = await withTimeout(
          connection.getTransport(),
          4000,
          "The web app could not verify its transport.",
        );
        if (selectedTransport !== transportUrl) {
          throw new Error("The web transport did not stay registered.");
        }
        activeTransportUrl = transportUrl;
        return transportUrl;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("The web app could not configure a transport.");
  }

  async function recoverTransport() {
    if (transportRecoveryPromise) return transportRecoveryPromise;
    transportRecoveryPromise = Promise.resolve()
      .then(() => transportSetupPromise)
      .catch(() => {})
      .then(async () => {
        if (!transportConnection) throw new Error("The web transport bridge is unavailable.");
        const relay = await rotateWispRelay();
        const current = activeTransportUrl || FALLBACK_TRANSPORT_URL;
        const alternate = current === FALLBACK_TRANSPORT_URL
          ? PRIMARY_TRANSPORT_URL
          : FALLBACK_TRANSPORT_URL;
        let lastError = null;
        for (const transportUrl of [current, alternate]) {
          try {
            await withTimeout(
              transportConnection.setTransport(transportUrl, [{ wisp: relay }]),
              12000,
              "The replacement web transport timed out.",
            );
            const selected = await withTimeout(
              transportConnection.getTransport(),
              4000,
              "The replacement web transport could not be verified.",
            );
            if (selected !== transportUrl) throw new Error("The replacement web transport did not stay registered.");
            activeTransportUrl = transportUrl;
            await activateWorker().then((worker) => warmWorker(worker));
            return transportUrl;
          } catch (error) {
            lastError = error;
          }
        }
        throw lastError || new Error("No replacement web transport is available.");
      })
      .finally(() => {
        transportRecoveryPromise = null;
      });
    return transportRecoveryPromise;
  }

  function configureTransport() {
    if (transportFallbackPromise) return transportFallbackPromise;
    if (transportSetupPromise) return transportSetupPromise;
    transportSetupPromise = configureTransportNow().finally(() => {
      transportSetupPromise = null;
    });
    return transportSetupPromise;
  }

  function ensureTransport() {
    if (transportConnection && activeTransportUrl) {
      return Promise.resolve(activeTransportUrl);
    }
    return configureTransport();
  }

  function isMusicDestination(destination) {
    try {
      const url = new URL(destination);
      return url.hostname === "vcsa.huangqirui.xyz" && /^\/listen\/?$/i.test(url.pathname);
    } catch (error) {
      return false;
    }
  }

  function isYouTubeDestination(destination) {
    try {
      const hostname = new URL(destination).hostname.replace(/^www\./, "").toLowerCase();
      return hostname === "youtube.com" || hostname === "youtu.be" || hostname === "youtube-nocookie.com";
    } catch (error) {
      return false;
    }
  }

  function switchToPrimaryTransport() {
    if (activeTransportUrl === PRIMARY_TRANSPORT_URL) {
      return Promise.resolve(PRIMARY_TRANSPORT_URL);
    }
    if (transportPrimaryPromise) return transportPrimaryPromise;

    transportPrimaryPromise = Promise.resolve()
      .then(() => transportSetupPromise)
      .catch(() => {})
      .then(() => transportFallbackPromise)
      .catch(() => {})
      .then(async () => {
        if (!transportConnection) {
          throw new Error("The web transport bridge is unavailable.");
        }
        const relay = await selectWispRelay();
        return withTimeout(
          transportConnection.setTransport(PRIMARY_TRANSPORT_URL, [
            { wisp: relay },
          ]),
          8000,
          "The music transport setup timed out.",
        );
      })
      .then(async () => {
        const selectedTransport = await withTimeout(
          transportConnection.getTransport(),
          4000,
          "The music transport could not be verified.",
        );
        if (selectedTransport !== PRIMARY_TRANSPORT_URL) {
          throw new Error("The music transport did not stay registered.");
        }
        activeTransportUrl = PRIMARY_TRANSPORT_URL;
        await activateWorker().then((worker) => warmWorker(worker));
        return PRIMARY_TRANSPORT_URL;
      })
      .finally(() => {
        transportPrimaryPromise = null;
      });
    return transportPrimaryPromise;
  }

  async function ensureNavigationTransport(destination) {
    const currentTransport = await ensureTransport();
    if (isMusicDestination(destination) && currentTransport === PRIMARY_TRANSPORT_URL) {
      return switchToFallbackTransport().catch(() => currentTransport);
    }
    if (isYouTubeDestination(destination) && currentTransport !== PRIMARY_TRANSPORT_URL) {
      return switchToPrimaryTransport().catch(() => currentTransport);
    }
    return currentTransport;
  }

  function switchToFallbackTransport() {
    if (transportFallbackPromise) return transportFallbackPromise;

    transportFallbackPromise = Promise.resolve()
      .then(() => transportSetupPromise)
      .catch(() => {})
      .then(async () => {
        if (!transportConnection) {
          throw new Error("The web transport bridge is unavailable.");
        }
        const relay = await selectWispRelay();
        return withTimeout(
          transportConnection.setTransport(FALLBACK_TRANSPORT_URL, [
            { wisp: relay },
          ]),
          12000,
          "The fallback web transport setup timed out.",
        );
      })
      .then(async () => {
        const selectedTransport = await withTimeout(
          transportConnection.getTransport(),
          4000,
          "The fallback web transport could not be verified.",
        );
        if (selectedTransport !== FALLBACK_TRANSPORT_URL) {
          throw new Error("The fallback web transport did not stay registered.");
        }
        activeTransportUrl = FALLBACK_TRANSPORT_URL;
        await activateWorker().then((worker) => warmWorker(worker));
        return FALLBACK_TRANSPORT_URL;
      })
      .finally(() => {
        transportFallbackPromise = null;
      });
    return transportFallbackPromise;
  }

  function switchToAlternateTransport() {
    return activeTransportUrl === FALLBACK_TRANSPORT_URL
      ? switchToPrimaryTransport()
      : switchToFallbackTransport();
  }

  function installTransportRecoveryListener() {
    if (transportRecoveryListenerInstalled) return;
    transportRecoveryListenerInstalled = true;
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type !== "neo-browser:transport-fallback" || event.data.engine !== ENGINE_VERSION) return;
      const reply = event.ports[0];
      recoverTransport().then(
        (transport) => reply?.postMessage({ ok: true, transport }),
        (error) =>
          reply?.postMessage({
            ok: false,
            message: String(error?.message || error),
          }),
      );
    });
  }

  async function createRuntime() {
    if (!("serviceWorker" in navigator)) {
      throw new Error("This device does not support the web app.");
    }

    await Promise.resolve(window.__neoProxyRecovery).catch(() => {});

    await loadScript(
      "neo-ultraviolet-runtime",
      `${RUNTIME_ROOT}/uv/uv.bundle.js?engine=${ENGINE_VERSION}`,
    );
    await loadScript(
      "neo-ultraviolet-config",
      `${RUNTIME_ROOT}/uv/uv.config.js?engine=${ENGINE_VERSION}`,
    );
    if (!window.Ultraviolet || !window.__uv$config) {
      throw new Error("The web app configuration is unavailable.");
    }

    installTransportRecoveryListener();
    await configureTransport();
    const worker = await activateWorker();
    await warmWorker(worker);
    return {
      config: window.__uv$config,
      fetchDocument(target) {
        return requestGameDocument(worker, target);
      },
      routeFor(target) {
        return `${ROUTE_PREFIX}${window.__uv$config.encodeUrl(target)}`;
      },
    };
  }

  function getRuntime() {
    runtimePromise ||= withTimeout(
      createRuntime(),
      40000,
      "The web app took too long to start.",
    ).catch((error) => {
      runtimePromise = null;
      throw error;
    });
    return runtimePromise;
  }

  function icon(name) {
    return `<svg class="icon" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  }

  function destinationFromRoute(value, config) {
    try {
      const url = new URL(value, window.location.origin);
      if (!url.pathname.startsWith(ROUTE_PREFIX)) return value;
      return config.decodeUrl(url.pathname.slice(ROUTE_PREFIX.length));
    } catch (error) {
      return value;
    }
  }

  function normalizeDestination(value) {
    const input = String(value || "").trim();
    if (!input || input === NEW_TAB_DESTINATION) return NEW_TAB_DESTINATION;
    try {
      const parsed = new URL(input);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed.href;
      }
    } catch (error) {
      // Plain domains and search phrases are handled below.
    }
    if (!input.includes(" ") && input.includes(".")) return `https://${input}`;
    return `https://www.bing.com/search?q=${encodeURIComponent(input)}`;
  }

  function externalDestination(value) {
    try {
      const url = new URL(String(value || ""));
      return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
    } catch (error) {
      return "";
    }
  }

  function isNeoShellDestination(value) {
    try {
      const url = new URL(value, window.location.origin);
      const shellPath = OS_SCOPE.replace(/\/$/, "");
      return (
        url.origin === window.location.origin &&
        (url.pathname === shellPath || url.pathname.startsWith(OS_SCOPE)) &&
        !url.pathname.startsWith(ROUTE_PREFIX)
      );
    } catch (error) {
      return false;
    }
  }

  function labelForDestination(destination) {
    if (destination === NEW_TAB_DESTINATION) return "New tab";
    try {
      const url = new URL(destination);
      const query = url.searchParams.get("q");
      if (query) return query;
      if (url.hostname.includes("duckduckgo.com")) return "New tab";
      return url.hostname.replace(/^www\./, "") || "New tab";
    } catch (error) {
      return "New tab";
    }
  }

  const DOWNLOAD_FILE_PATTERN = /\.(?:7z|aac|apk|avi|bin|bmp|csv|doc|docx|epub|exe|flac|gif|gz|iso|jpeg|jpg|json|m4a|mkv|mov|mp3|mp4|msi|odp|ods|odt|ogg|pdf|png|ppt|pptx|rar|rtf|svg|tar|tgz|txt|wav|webm|webp|xls|xlsx|xml|zip)$/i;
  const DOWNLOAD_MIME_EXTENSIONS = {
    "application/json": ".json",
    "application/pdf": ".pdf",
    "application/rtf": ".rtf",
    "application/zip": ".zip",
    "audio/mpeg": ".mp3",
    "audio/ogg": ".ogg",
    "audio/wav": ".wav",
    "image/gif": ".gif",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/svg+xml": ".svg",
    "image/webp": ".webp",
    "text/csv": ".csv",
    "text/plain": ".txt",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
  };

  function decodedDownloadValue(value) {
    const source = String(value || "").trim();
    if (!source) return "";
    try { return decodeURIComponent(source); } catch (error) { return source; }
  }

  function safeDownloadName(value) {
    const decoded = decodedDownloadValue(value)
      .split(/[\\/]/)
      .pop()
      .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, "-")
      .replace(/\s+/g, " ")
      .replace(/[. ]+$/g, "")
      .trim();
    return (decoded || "Download").slice(0, 180);
  }

  function downloadNameFromDisposition(value) {
    const disposition = String(value || "");
    const encoded = disposition.match(/filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i)?.[1];
    if (encoded) return safeDownloadName(encoded.replace(/^"|"$/g, ""));
    const plain = disposition.match(/filename\s*=\s*(?:"([^"]+)"|([^;]+))/i);
    return plain ? safeDownloadName(plain[1] || plain[2]) : "";
  }

  function downloadNameFromUrl(value) {
    try {
      const url = new URL(String(value || ""));
      for (const key of ["filename", "file", "name"]) {
        const candidate = url.searchParams.get(key);
        if (candidate && DOWNLOAD_FILE_PATTERN.test(candidate.split(/[?#]/, 1)[0])) return safeDownloadName(candidate);
      }
      return safeDownloadName(url.pathname.split("/").filter(Boolean).pop() || "Download");
    } catch (error) {
      return "Download";
    }
  }

  function resolvedDownloadName(detail, response, destination, blob) {
    const dispositionName = downloadNameFromDisposition(detail?.contentDisposition || response?.headers?.get("content-disposition"));
    let name = dispositionName || safeDownloadName(detail?.name || downloadNameFromUrl(destination));
    if (!DOWNLOAD_FILE_PATTERN.test(name)) {
      const mime = String(blob?.type || detail?.contentType || response?.headers?.get("content-type") || "").split(";", 1)[0].toLowerCase();
      name += DOWNLOAD_MIME_EXTENSIONS[mime] || "";
    }
    return safeDownloadName(name);
  }

  async function ensureDownloadStorage(size) {
    const bytes = Math.max(0, Number(size) || 0);
    if (!bytes || !navigator.storage?.estimate) return;
    const estimate = await navigator.storage.estimate().catch(() => null);
    if (!estimate?.quota) return;
    const available = Math.max(0, Number(estimate.quota) - Number(estimate.usage || 0));
    if (bytes > available * 0.92) throw new Error("Drive does not have enough local space for this file.");
  }

  function mountBrowser(container, runtime, target, options = {}) {
    const appMode = options.appMode === true;
    const directOrigin = options.directOrigin === true;
    const shell = document.createElement("section");
    shell.className = `neo-browser-runtime${appMode ? " is-app-mode" : ""}`;
    if (options.appTheme) shell.dataset.appTheme = options.appTheme;
    shell.setAttribute("aria-label", appMode ? `${options.label || "Web app"} content` : "Web page");
    shell.innerHTML = `
      <div class="neo-browser-tabbar">
        <div class="neo-browser-tabs" data-browser-tabs role="tablist" aria-label="Open pages"></div>
        <button class="neo-browser-new-tab" type="button" data-browser-new-tab aria-label="New tab"><span aria-hidden="true">+</span></button>
      </div>
      <nav class="neo-browser-toolbar" aria-label="Web controls">
        <button type="button" data-browser-back aria-label="Go back">${icon("arrow-left")}</button>
        <button type="button" data-browser-forward aria-label="Go forward">${icon("arrow-right")}</button>
        <button type="button" data-browser-reload aria-label="Reload page">${icon("refresh")}</button>
        <form class="neo-browser-address" data-browser-address-form>
          <span class="neo-browser-address-mark" aria-hidden="true"><img src="${browserAsset("assets/duckduckgo.png")}" width="17" height="17" alt="" /></span>
          <label class="sr-only" for="neo-runtime-address">Address or search</label>
          <input id="neo-runtime-address" data-browser-address autocomplete="off" spellcheck="false" placeholder="Search DuckDuckGo or type a URL" aria-label="Address or search" />
          <button type="submit" data-browser-submit aria-label="Open address">${icon("arrow-right")}</button>
        </form>
      </nav>
      <div class="neo-browser-page-status" data-browser-page-status role="status" aria-live="polite">Loading page</div>
      <div class="neo-browser-pages" data-browser-pages></div>
      <div class="neo-browser-download-status" data-browser-download-status role="status" aria-live="polite" hidden>
        ${icon("download")}<span data-browser-download-copy></span>
      </div>
      <div class="neo-browser-context-menu" data-browser-context-menu role="menu" aria-label="Page menu" hidden>
        <button type="button" role="menuitem" data-browser-context-action="back"><span>Back</span><kbd>Alt+Left</kbd></button>
        <button type="button" role="menuitem" data-browser-context-action="forward"><span>Forward</span><kbd>Alt+Right</kbd></button>
        <button type="button" role="menuitem" data-browser-context-action="reload"><span>Reload</span><kbd>Ctrl+R</kbd></button>
        <span class="neo-browser-context-separator" role="separator"></span>
        <button type="button" role="menuitem" data-browser-context-action="inspect"><span>Inspect</span><kbd>Ctrl+Shift+I</kbd></button>
      </div>
      <aside class="neo-browser-inspector" data-browser-inspector aria-hidden="true" aria-label="Element inspector">
        <header class="neo-browser-inspector-header">
          <button type="button" data-browser-inspector-picker aria-label="Select an element from the page" aria-pressed="false"><span aria-hidden="true">&lt;/&gt;</span></button>
          <strong>Elements</strong>
          <span data-browser-inspector-selector>Nothing selected</span>
          <span data-browser-inspector-size></span>
          <button type="button" data-browser-inspector-close aria-label="Close inspector">&times;</button>
        </header>
        <div class="neo-browser-inspector-body">
          <section aria-labelledby="neo-browser-element-label">
            <h3 id="neo-browser-element-label">Element</h3>
            <pre><code data-browser-inspector-markup>Select an element to inspect it.</code></pre>
          </section>
          <section aria-labelledby="neo-browser-computed-label">
            <h3 id="neo-browser-computed-label">Computed</h3>
            <dl data-browser-inspector-styles></dl>
          </section>
        </div>
      </aside>
    `;
    container.replaceChildren(shell);

    const tabList = shell.querySelector("[data-browser-tabs]");
    const pages = shell.querySelector("[data-browser-pages]");
    const address = shell.querySelector("[data-browser-address]");
    const addressForm = shell.querySelector("[data-browser-address-form]");
    const status = shell.querySelector("[data-browser-page-status]");
    const downloadStatus = shell.querySelector("[data-browser-download-status]");
    const downloadCopy = shell.querySelector("[data-browser-download-copy]");
    const contextMenu = shell.querySelector("[data-browser-context-menu]");
    const contextMenuButtons = Array.from(contextMenu.querySelectorAll('[role="menuitem"]'));
    const inspector = shell.querySelector("[data-browser-inspector]");
    const inspectorPicker = shell.querySelector("[data-browser-inspector-picker]");
    const inspectorSelector = shell.querySelector("[data-browser-inspector-selector]");
    const inspectorSize = shell.querySelector("[data-browser-inspector-size]");
    const inspectorMarkup = shell.querySelector("[data-browser-inspector-markup]");
    const inspectorStyles = shell.querySelector("[data-browser-inspector-styles]");
    const tabs = [];
    let activeTabId = "";
    let tabSequence = 0;
    let draggedTabId = "";
    let returningToDesktop = false;
    let contextState = null;
    let inspectorState = null;
    let downloadStatusTimer = 0;
    const activeDownloads = new Set();
    const musicOrigin = "https://vcsa.huangqirui.xyz";
    const musicAudio = new Audio();
    let musicOwnerTab = null;
    let musicList = [];
    let musicIndex = -1;
    let musicShuffle = false;
    let musicWantsPlayback = false;
    let musicFailureCount = 0;
    let musicSleepAt = 0;
    let musicSleepTimer = 0;
    let musicRadio = true;
    let lastMusicProgressBroadcast = 0;

    musicAudio.preload = "metadata";
    try {
      const savedMusicVolume = Number(localStorage.getItem("neo_music_volume"));
      if (Number.isFinite(savedMusicVolume) && savedMusicVolume >= 0 && savedMusicVolume <= 1) {
        musicAudio.volume = savedMusicVolume;
      }
      musicAudio.muted = localStorage.getItem("neo_music_muted") === "true";
    } catch (error) {}

    function currentMusicTrack() {
      return musicList[musicIndex] || null;
    }

    function musicSourceFor(track) {
      if (!track) return "";
      const rawSource = String(track.src || `/api/music/stream?id=${encodeURIComponent(track.id)}`);
      try {
        return runtime.routeFor(new URL(rawSource, musicOrigin).href);
      } catch (error) {
        return "";
      }
    }

    function broadcastMusicState() {
      const track = currentMusicTrack();
      const state = {
        playing: !musicAudio.paused && Boolean(musicAudio.currentSrc),
        track,
        idx: musicIndex,
        list: musicList,
        listLen: musicList.length,
        time: musicAudio.currentTime || 0,
        duration: musicAudio.duration || 0,
        volume: musicAudio.volume,
        shuffle: musicShuffle,
        loop: musicAudio.loop,
        radio: musicRadio,
        speed: musicAudio.playbackRate,
        sleepAt: musicSleepAt,
      };

      tabs.forEach((tab) => {
        if (!isMusicDestination(tab.destination)) return;
        try { tab.frame.contentWindow.postMessage({ sbMusicState: state }, "*"); } catch (error) {}
      });

      if (musicOwnerTab && track) {
        musicOwnerTab.mediaState = {
          active: true,
          playing: state.playing,
          title: String(track.title || "Music").slice(0, 160),
          subtitle: String(track.artist || "").slice(0, 180),
          cover: String(track.artwork || "").slice(0, 4096),
          kind: "audio",
          position: state.time,
          duration: state.duration,
          volume: state.volume,
          muted: musicAudio.muted,
          volumeControl: true,
        };
        musicOwnerTab.mediaUpdatedAt = Date.now();
      } else if (musicOwnerTab) {
        musicOwnerTab.mediaState = null;
      }
      emitBrowserMediaState();
      emitBrowserMediaPriority();

      if ("mediaSession" in navigator) {
        try {
          if (!track) {
            navigator.mediaSession.metadata = null;
            navigator.mediaSession.playbackState = "none";
          } else {
            navigator.mediaSession.metadata = new MediaMetadata({
              title: track.title || "Music",
              artist: track.artist || "",
              album: "NEO Music",
              artwork: track.artwork ? [{ src: track.artwork }] : [],
            });
            navigator.mediaSession.playbackState = state.playing ? "playing" : "paused";
          }
        } catch (error) {}
      }
    }

    function loadMusicTrack(index, autoplay = true) {
      const track = musicList[index];
      const source = musicSourceFor(track);
      if (!track || !source) return;
      const sameTrack = index === musicIndex && musicAudio.src === source && Boolean(musicAudio.currentSrc || musicAudio.src);
      musicIndex = index;
      musicWantsPlayback = autoplay;
      if (!sameTrack) {
        musicAudio.pause();
        musicAudio.src = source;
        musicAudio.currentTime = 0;
        musicAudio.load();
      }
      if (autoplay) requestMusicPlayback();
      broadcastMusicState();
    }

    function requestMusicPlayback() {
      if (!musicWantsPlayback || !currentMusicTrack() || !musicAudio.paused) return;
      musicAudio.play().then(() => {
        musicFailureCount = 0;
        broadcastMusicState();
      }).catch((error) => {
        if (!error || error.name !== "NotAllowedError") musicFailureCount += 1;
        broadcastMusicState();
      });
    }

    function unlockMusicPlayback(event) {
      if (event?.type === "keydown" && (event.ctrlKey || event.metaKey || event.altKey)) return;
      requestMusicPlayback();
    }

    function nextMusicTrack() {
      if (!musicList.length) return;
      if (musicShuffle && musicList.length > 1) {
        let nextIndex = musicIndex;
        while (nextIndex === musicIndex) nextIndex = Math.floor(Math.random() * musicList.length);
        loadMusicTrack(nextIndex, true);
        return;
      }
      loadMusicTrack((musicIndex + 1) % musicList.length, true);
    }

    function previousMusicTrack() {
      if (!musicList.length) return;
      if (musicAudio.currentTime > 3) {
        musicAudio.currentTime = 0;
        broadcastMusicState();
        return;
      }
      loadMusicTrack((musicIndex - 1 + musicList.length) % musicList.length, true);
    }

    function updateMusicQueue(command, insertNext) {
      const tracks = Array.isArray(command.tracks)
        ? command.tracks.filter(Boolean)
        : command.track ? [command.track] : [];
      if (!tracks.length) return;
      const wasEmpty = !musicList.length;
      if (insertNext && musicIndex >= 0) musicList.splice(musicIndex + 1, 0, ...tracks);
      else musicList.push(...tracks);
      if (wasEmpty) loadMusicTrack(0, true);
      else broadcastMusicState();
    }

    function handleMusicCommand(tab, command) {
      if (!command || typeof command !== "object") return;
      musicOwnerTab = tab;
      switch (command.type) {
        case "play":
          musicFailureCount = 0;
          musicList = Array.isArray(command.list) && command.list.length
            ? command.list.filter(Boolean)
            : command.track ? [command.track] : musicList;
          loadMusicTrack(Math.max(0, Math.min(musicList.length - 1, Number(command.idx) || 0)), true);
          break;
        case "toggle":
          if (musicAudio.paused) {
            musicWantsPlayback = true;
            musicFailureCount = 0;
            requestMusicPlayback();
          } else {
            musicWantsPlayback = false;
            musicAudio.pause();
          }
          break;
        case "next":
          nextMusicTrack();
          break;
        case "prev":
          previousMusicTrack();
          break;
        case "seek":
          if (musicAudio.duration) musicAudio.currentTime = Math.max(0, Math.min(musicAudio.duration, (Number(command.pct) || 0) / 100 * musicAudio.duration));
          broadcastMusicState();
          break;
        case "seekTo":
          if (musicAudio.duration) musicAudio.currentTime = Math.max(0, Math.min(musicAudio.duration, Number(command.sec) || 0));
          broadcastMusicState();
          break;
        case "speed": {
          const speed = Math.max(0.5, Math.min(2, Number(command.v) || 1));
          musicAudio.defaultPlaybackRate = speed;
          musicAudio.playbackRate = speed;
          broadcastMusicState();
          break;
        }
        case "sleep": {
          window.clearTimeout(musicSleepTimer);
          const minutes = Math.max(0, Number(command.minutes) || 0);
          musicSleepAt = minutes ? Date.now() + minutes * 60000 : 0;
          if (minutes) {
            musicSleepTimer = window.setTimeout(() => {
              musicSleepAt = 0;
              musicWantsPlayback = false;
              musicAudio.pause();
              broadcastMusicState();
            }, minutes * 60000);
          }
          broadcastMusicState();
          break;
        }
        case "volume":
          musicAudio.volume = Math.max(0, Math.min(1, Number(command.v) || 0));
          try { localStorage.setItem("neo_music_volume", String(musicAudio.volume)); } catch (error) {}
          broadcastMusicState();
          break;
        case "mute":
          musicAudio.muted = command.on === true;
          try { localStorage.setItem("neo_music_muted", String(musicAudio.muted)); } catch (error) {}
          broadcastMusicState();
          break;
        case "shuffle":
          musicShuffle = command.on === true;
          broadcastMusicState();
          break;
        case "loop":
          musicAudio.loop = command.on === true;
          broadcastMusicState();
          break;
        case "stop":
          musicWantsPlayback = false;
          musicAudio.pause();
          musicAudio.removeAttribute("src");
          musicAudio.load();
          musicList = [];
          musicIndex = -1;
          broadcastMusicState();
          break;
        case "queueAdd":
          updateMusicQueue(command, false);
          break;
        case "queueNext":
          updateMusicQueue(command, true);
          break;
        case "queueRemove": {
          const index = Number(command.idx);
          if (!Number.isInteger(index) || index < 0 || index >= musicList.length) break;
          const wasCurrent = index === musicIndex;
          const wasPlaying = !musicAudio.paused;
          musicList.splice(index, 1);
          if (!musicList.length) {
            handleMusicCommand(tab, { type: "stop" });
          } else if (index < musicIndex) {
            musicIndex -= 1;
            broadcastMusicState();
          } else if (wasCurrent) {
            if (musicIndex >= musicList.length) musicIndex = 0;
            loadMusicTrack(musicIndex, wasPlaying);
          } else {
            broadcastMusicState();
          }
          break;
        }
        case "queueMove": {
          const from = Number(command.from);
          const to = Number(command.to);
          if (![from, to].every(Number.isInteger) || from < 0 || to < 0 || from >= musicList.length || to >= musicList.length || from === to) break;
          const [track] = musicList.splice(from, 1);
          musicList.splice(to, 0, track);
          if (musicIndex === from) musicIndex = to;
          else {
            if (from < musicIndex) musicIndex -= 1;
            if (to <= musicIndex) musicIndex += 1;
          }
          broadcastMusicState();
          break;
        }
        case "queueClear": {
          const current = currentMusicTrack();
          musicList = current ? [current] : [];
          musicIndex = current ? 0 : -1;
          broadcastMusicState();
          break;
        }
        case "radio":
          musicRadio = command.on === true;
          broadcastMusicState();
          break;
        case "getstate":
          broadcastMusicState();
          break;
        default:
          break;
      }
    }

    ["play", "pause", "playing", "loadedmetadata", "durationchange", "volumechange", "ratechange"].forEach((eventName) => {
      musicAudio.addEventListener(eventName, () => {
        if (eventName === "volumechange") {
          try {
            localStorage.setItem("neo_music_volume", String(musicAudio.volume));
            localStorage.setItem("neo_music_muted", String(musicAudio.muted));
          } catch (error) {}
        }
        broadcastMusicState();
      });
    });
    musicAudio.addEventListener("timeupdate", () => {
      if (document.hidden || Date.now() - lastMusicProgressBroadcast < 200) return;
      lastMusicProgressBroadcast = Date.now();
      broadcastMusicState();
    });
    musicAudio.addEventListener("ended", () => {
      if (!musicAudio.loop) nextMusicTrack();
    });
    musicAudio.addEventListener("error", () => {
      if (!musicWantsPlayback) return;
      musicFailureCount += 1;
      if (musicFailureCount < 2 && currentMusicTrack()) {
        window.setTimeout(() => loadMusicTrack(musicIndex, true), 500);
      } else {
        musicWantsPlayback = false;
        broadcastMusicState();
      }
    });
    window.addEventListener("pointerdown", unlockMusicPlayback, { capture: true, passive: true });
    window.addEventListener("touchend", unlockMusicPlayback, { capture: true, passive: true });
    window.addEventListener("keydown", unlockMusicPlayback, true);

    if ("mediaSession" in navigator) {
      const actions = {
        play: () => currentMusicTrack() && musicAudio.play().catch(() => {}),
        pause: () => musicAudio.pause(),
        stop: () => handleMusicCommand(musicOwnerTab, { type: "stop" }),
        nexttrack: nextMusicTrack,
        previoustrack: previousMusicTrack,
        seekto: (detail) => {
          if (detail?.seekTime == null || !musicAudio.duration) return;
          musicAudio.currentTime = Math.max(0, Math.min(musicAudio.duration, detail.seekTime));
        },
      };
      Object.entries(actions).forEach(([action, handler]) => {
        try { navigator.mediaSession.setActionHandler(action, handler); } catch (error) {}
      });
    }

    function showDownloadStatus(copy, state, persistent = false) {
      window.clearTimeout(downloadStatusTimer);
      downloadCopy.textContent = String(copy || "").slice(0, 220);
      downloadStatus.dataset.state = state || "active";
      downloadStatus.hidden = false;
      if (!persistent) {
        downloadStatusTimer = window.setTimeout(() => {
          downloadStatus.hidden = true;
        }, state === "error" ? 6500 : 3800);
      }
    }

    function notifyDownload(title, copy, iconName) {
      if (window.NEO_SHELL?.notify) window.NEO_SHELL.notify(title, copy, iconName || "download");
    }

    async function saveDownloadToDrive(tab, detail) {
      const jobId = `${tab.id}:${String(detail.id || detail.href || Date.now()).slice(0, 300)}`;
      if (activeDownloads.has(jobId)) return;
      if (activeDownloads.size >= 4) {
        showDownloadStatus("Finish an active download before starting another.", "error");
        return;
      }
      if (detail.userActivated !== true) {
        showDownloadStatus("Click the download again to save it to Drive.", "error");
        return;
      }

      activeDownloads.add(jobId);
      let displayName = safeDownloadName(detail.name || "Download");
      showDownloadStatus(`Saving ${displayName} to Drive...`, "active", true);
      try {
        let blob = detail.blob;
        let response = null;
        let destination = String(detail.href || "");
        const inlineBlob = blob && typeof blob.arrayBuffer === "function" && Number.isFinite(Number(blob.size));
        if (!inlineBlob) {
          destination = externalDestination(destination);
          if (!destination) throw new Error("This download address is not supported.");
          response = await fetch(runtime.routeFor(destination), {
            cache: "no-store",
            credentials: "same-origin",
            redirect: "follow",
          });
          if (!response.ok) throw new Error(`The download server returned ${response.status}.`);

          const disposition = response.headers.get("content-disposition") || "";
          const contentType = (response.headers.get("content-type") || "").toLowerCase();
          const finalDestination = externalDestination(destinationFromRoute(response.url, runtime.config)) || destination;
          const fileLike = DOWNLOAD_FILE_PATTERN.test(new URL(finalDestination).pathname);
          if (!detail.explicit && !/\battachment\b/i.test(disposition) && contentType.includes("text/html") && !fileLike) {
            navigateTab(tab, finalDestination);
            return;
          }

          const declaredSize = Number(response.headers.get("content-length") || 0);
          await ensureDownloadStorage(declaredSize);
          blob = await response.blob();
          destination = finalDestination;
        }
        if (!blob || typeof blob.arrayBuffer !== "function") throw new Error("The site did not provide a usable file.");
        await ensureDownloadStorage(blob.size);
        displayName = resolvedDownloadName(detail, response, destination, blob);
        showDownloadStatus(`Saving ${displayName} to Drive...`, "active", true);

        if (!window.NEO_SHELL?.saveToFiles) throw new Error("NEO Drive is unavailable.");
        const saved = await window.NEO_SHELL.saveToFiles(displayName, blob, { folder: "Downloads", quiet: true });
        const savedName = safeDownloadName(saved?.name || displayName);
        showDownloadStatus(`${savedName} saved to Drive`, "success");
        notifyDownload("Saved to Drive", `${savedName} is in Drive > Downloads.`, "folder");
      } catch (error) {
        const message = String(error?.message || "The file could not be saved.").slice(0, 180);
        showDownloadStatus(message, "error");
        notifyDownload("Download not saved", message, "info");
      } finally {
        activeDownloads.delete(jobId);
      }
    }

    function applyAppTheme(tab) {
      if (!options.appTheme || !options.themeCss) {
        tab.frame.classList.remove("is-theme-pending");
        return;
      }
      try {
        const frameDocument = tab.frame.contentDocument;
        if (!frameDocument?.documentElement || !frameDocument.head) return;
        const frameRoot = frameDocument.documentElement;
        frameRoot.dataset.neoAppTheme = options.appTheme;
        frameRoot.dataset.neoTheme = document.documentElement.dataset.neoTheme || "graphite";
        const shellStyles = window.getComputedStyle(document.documentElement);
        [
          "--desktop-bg", "--desktop-surface", "--desktop-surface-2",
          "--desktop-text", "--desktop-muted", "--desktop-line",
          "--desktop-accent", "--desktop-accent-text",
          "--neo-theme-control", "--neo-theme-control-hover",
          "--neo-theme-selected", "--neo-theme-glass", "--neo-theme-overlay",
          "--neo-theme-shadow", "--neo-theme-success", "--neo-theme-warning",
          "--neo-theme-danger", "--neo-theme-transition",
        ].forEach((property) => {
          const value = shellStyles.getPropertyValue(property).trim();
          if (value) frameRoot.style.setProperty(property, value);
        });
        frameRoot.style.colorScheme = shellStyles.colorScheme || "dark";
        frameRoot.style.setProperty("--neo-music-accent", shellStyles.getPropertyValue("--desktop-accent").trim() || "#ffffff");
        frameRoot.style.setProperty("--neo-music-accent-contrast", shellStyles.getPropertyValue("--desktop-accent-text").trim() || "#000000");
        let style = frameDocument.getElementById("neo-app-theme");
        if (!style) {
          style = frameDocument.createElement("style");
          style.id = "neo-app-theme";
          frameDocument.head.appendChild(style);
        }
        style.textContent = options.themeCss;
        if (options.label) frameDocument.title = options.label;
        const brand = frameDocument.querySelector(".sidebar-logo-link span");
        if (brand && options.label) brand.textContent = options.label;
        const catalogueBrand = frameDocument.querySelector(".brand-txt");
        if (catalogueBrand && options.label) catalogueBrand.textContent = options.label;
        const brandMark = frameDocument.querySelector(".sidebar-logo-link .app-logo");
        if (brandMark) brandMark.setAttribute("aria-hidden", "true");
        const welcome = frameDocument.querySelector("#home-welcome h2");
        if (welcome && options.label) welcome.textContent = `Welcome to ${options.label}`;
        if (options.appTheme === "stream-music") enhanceStreamMusic(frameDocument);
      } catch (error) {
        // The proxied page remains functional if a third-party route blocks theming.
      } finally {
        window.requestAnimationFrame(() => {
          if (tabs.includes(tab)) tab.frame.classList.remove("is-theme-pending");
        });
      }
    }

    function returnToDesktop() {
      if (returningToDesktop) return;
      returningToDesktop = true;
      try {
        window.history.replaceState(
          window.history.state,
          "",
          `${window.location.pathname}${window.location.search}#neo-desktop`,
        );
      } catch (error) {
        window.location.hash = "neo-desktop";
      }
      const desktop = document.getElementById("neo-desktop");
      const closeButton = container
        .closest(".neo-window")
        ?.querySelector('[data-window-action="close"]');
      window.setTimeout(() => {
        closeButton?.click();
        desktop?.focus({ preventScroll: true });
      }, 0);
    }

    function activeTab() {
      return tabs.find((tab) => tab.id === activeTabId) || null;
    }

    const mediaSource = `browse-media:${options.appId || "browser"}`;

    function emitBrowserMediaPriority() {
      const hasPlayingVideo = tabs.some((tab) => (
        tab.mediaState?.playing && tab.mediaState.kind === "video"
      ));
      window.dispatchEvent(new CustomEvent("neo-media-priority", {
        detail: {
          source: mediaSource,
          kind: "video",
          active: hasPlayingVideo,
        },
      }));
    }

    function mediaTabForDisplay() {
      const selectedTab = activeTab();
      const playingTab = tabs
        .filter((tab) => tab.mediaState?.active && tab.mediaState.playing)
        .sort((left, right) => right.mediaUpdatedAt - left.mediaUpdatedAt)[0];
      return (selectedTab?.mediaState?.active && selectedTab.mediaState.playing)
        ? selectedTab
        : playingTab || (selectedTab?.mediaState?.active ? selectedTab : null);
    }

    function emitBrowserMediaState() {
      const mediaTab = mediaTabForDisplay();
      if (!mediaTab) {
        window.dispatchEvent(new CustomEvent("neo-media-state", {
          detail: { source: mediaSource, active: false },
        }));
        return;
      }
      const media = mediaTab.mediaState;
      window.dispatchEvent(new CustomEvent("neo-media-state", {
        detail: {
          source: mediaSource,
          appId: options.appId || "browser",
          kind: media.kind,
          icon: media.kind === "audio" ? "music" : "film",
          title: media.title || mediaTab.label.textContent || "Media",
          copy: media.subtitle || `Playing in ${options.label || "Web app"}`,
          cover: media.cover || "",
          playing: media.playing === true,
          position: media.position || 0,
          duration: media.duration || 0,
          volume: media.volume,
          muted: media.muted === true,
          volumeControl: media.volumeControl === true,
          transport: false,
          active: true,
        },
      }));
    }

    function emitBrowserMediaLevels(tab, values) {
      if (mediaTabForDisplay() !== tab || !tab.mediaState?.playing) return;
      const levels = Array.from(values || []).slice(0, 8).map((value) => (
        Math.max(0, Math.min(1, Number(value) || 0))
      ));
      if (levels.length !== 8) return;
      window.dispatchEvent(new CustomEvent("neo-media-levels", {
        detail: {
          source: mediaSource,
          appId: options.appId || "browser",
          levels,
        },
      }));
    }

    function postToTab(tab, message) {
      try { tab?.frame.contentWindow.postMessage(message, window.location.origin); } catch (error) {}
    }

    function closeContextMenu(restoreFocus = false) {
      if (contextMenu.hidden) return;
      contextMenu.hidden = true;
      contextMenu.style.visibility = "";
      contextState = null;
      if (restoreFocus) activeTab()?.frame.focus({ preventScroll: true });
    }

    function closeInspector() {
      if (inspectorState?.tab) postToTab(inspectorState.tab, { type: "neo-browser:inspect-clear" });
      inspectorState = null;
      inspector.classList.remove("is-open");
      inspector.setAttribute("aria-hidden", "true");
      inspectorPicker.setAttribute("aria-pressed", "false");
    }

    function renderComputedStyles(styles) {
      const fragment = document.createDocumentFragment();
      Object.entries(styles && typeof styles === "object" ? styles : {}).slice(0, 28).forEach(([property, value]) => {
        const row = document.createElement("div");
        const name = document.createElement("dt");
        const content = document.createElement("dd");
        name.textContent = String(property).slice(0, 80);
        content.textContent = String(value).slice(0, 220) || "-";
        row.append(name, content);
        fragment.appendChild(row);
      });
      inspectorStyles.replaceChildren(fragment);
    }

    function openInspector(tab, rawInspection) {
      const inspection = rawInspection && typeof rawInspection === "object" ? rawInspection : {};
      const rect = inspection.rect && typeof inspection.rect === "object" ? inspection.rect : {};
      inspectorState = { tab, inspection };
      inspectorSelector.textContent = String(inspection.selector || inspection.tag || "Selected element").slice(0, 800);
      inspectorSize.textContent = Number.isFinite(Number(rect.width)) && Number.isFinite(Number(rect.height))
        ? `${Math.max(0, Math.round(Number(rect.width)))} x ${Math.max(0, Math.round(Number(rect.height)))}`
        : "";
      inspectorMarkup.textContent = String(inspection.markup || "Element source unavailable.").slice(0, 6000);
      renderComputedStyles(inspection.styles);
      inspector.classList.add("is-open");
      inspector.setAttribute("aria-hidden", "false");
      inspectorPicker.setAttribute("aria-pressed", "false");
      postToTab(tab, { type: "neo-browser:inspect-clear" });
      closeContextMenu();
    }

    function startInspectorPicker() {
      const tab = activeTab();
      if (!tab || tab.isNewTab) return;
      inspectorState = { tab, inspection: null };
      inspectorSelector.textContent = "Select an element on the page";
      inspectorSize.textContent = "";
      inspectorMarkup.textContent = "Click an element to inspect it. Press Escape to cancel.";
      inspectorStyles.replaceChildren();
      inspector.classList.add("is-open");
      inspector.setAttribute("aria-hidden", "false");
      inspectorPicker.setAttribute("aria-pressed", "true");
      postToTab(tab, { type: "neo-browser:inspect-mode" });
      closeContextMenu();
    }

    function showContextMenu(tab, detail) {
      contextState = { tab, inspection: detail.inspection || null };
      const shellRect = shell.getBoundingClientRect();
      const frameRect = tab.frame.getBoundingClientRect();
      const requestedX = frameRect.left - shellRect.left + Number(detail.x || 0);
      const requestedY = frameRect.top - shellRect.top + Number(detail.y || 0);
      contextMenu.hidden = false;
      contextMenu.style.visibility = "hidden";
      contextMenu.style.left = "0px";
      contextMenu.style.top = "0px";
      requestAnimationFrame(() => {
        if (contextMenu.hidden || contextState?.tab !== tab) return;
        const maxX = Math.max(6, shell.clientWidth - contextMenu.offsetWidth - 6);
        const maxY = Math.max(6, shell.clientHeight - contextMenu.offsetHeight - 6);
        contextMenu.style.left = `${Math.min(Math.max(6, requestedX), maxX)}px`;
        contextMenu.style.top = `${Math.min(Math.max(6, requestedY), maxY)}px`;
        contextMenu.style.visibility = "";
        contextMenuButtons[0]?.focus({ preventScroll: true });
      });
    }

    function updateTabLabel(tab, title) {
      const nextLabel = String(title || "").trim() || labelForDestination(tab.destination);
      tab.label.textContent = nextLabel;
      tab.button.setAttribute("aria-label", nextLabel);
      tab.closeButton.setAttribute("aria-label", `Close ${nextLabel}`);
      tab.frame.title = nextLabel;
    }

    function updateTabIcon(tab) {
      if (!tab?.icon) return;
      let iconHref = browserAsset("assets/duckduckgo.png");
      try {
        const document = tab.frame.contentDocument;
        const icon = document?.querySelector('link[rel~="icon"][href], link[rel="shortcut icon"][href]');
        if (icon?.href) iconHref = icon.href;
      } catch (error) {}
      if (tab.icon.src !== iconHref) tab.icon.src = iconHref;
    }

    function syncActiveChrome() {
      const tab = activeTab();
      address.value = tab?.isNewTab ? "" : tab?.destination || "";
      const loading = Boolean(tab?.loading);
      shell.classList.toggle("is-loading", loading);
      status.hidden = !loading;
      if (loading) status.textContent = "Loading page";
    }

    function activateTab(tabId, focusTab = false) {
      const nextTab = tabs.find((tab) => tab.id === tabId);
      if (!nextTab) return;
      closeContextMenu();
      if (inspectorState?.tab && inspectorState.tab !== nextTab) closeInspector();
      activeTabId = nextTab.id;
      tabs.forEach((tab) => {
        const selected = tab === nextTab;
        tab.element.classList.toggle("is-active", selected);
        tab.button.setAttribute("aria-selected", String(selected));
        tab.button.tabIndex = selected ? 0 : -1;
        tab.frame.classList.toggle("is-active", selected);
        tab.frame.tabIndex = selected ? 0 : -1;
        tab.frame.setAttribute("aria-hidden", String(!selected));
      });
      syncActiveChrome();
      emitBrowserMediaState();
      nextTab.element.scrollIntoView({ block: "nearest", inline: "nearest" });
      if (focusTab) nextTab.button.focus();
    }

    function showTransportFailure(tab, error) {
      if (!tab || !tabs.includes(tab)) return;
      const retryTarget = JSON.stringify(tab.destination).replace(/</g, "\\u003c");
      const detail = String(error?.message || error || "The connection could not be started.")
        .replace(/[<>]/g, "")
        .slice(0, 180);
      tab.loading = false;
      tab.pendingDestination = "";
      tab.awaitingTransport = false;
      tab.frame.srcdoc = `<!doctype html><html lang="en"><meta charset="utf-8">` +
        `<meta name="viewport" content="width=device-width,initial-scale=1">` +
        `<title>Connection unavailable</title><style>` +
        `html{color-scheme:dark}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#000;color:#f5f5f7;font:14px system-ui}` +
        `main{max-width:460px;padding:32px;text-align:center}h1{font-size:22px}p{color:#a1a1aa;line-height:1.55}` +
        `button{min-height:42px;padding:0 18px;border:0;border-radius:7px;background:#fff;color:#000;font:600 14px system-ui;cursor:pointer}` +
        `</style><main><h1>Connection unavailable</h1><p>${detail}</p>` +
        `<button type="button" id="retry">Retry</button></main><script>` +
        `retry.onclick=()=>parent.postMessage({type:"neo-browser:navigate-request",href:${retryTarget}},location.origin);` +
        `<\/script></html>`;
      updateTabLabel(tab, "Connection unavailable");
      if (tab.id === activeTabId) syncActiveChrome();
    }

    function navigateTab(tab, destination) {
      if (!tab) return;
      tab.navigationId += 1;
      const navigationId = tab.navigationId;
      let normalized = normalizeDestination(destination);
      if (normalized === NEW_TAB_DESTINATION) {
        tab.destination = NEW_TAB_DESTINATION;
        tab.pendingDestination = "";
        tab.awaitingTransport = false;
        tab.isNewTab = true;
        tab.loading = false;
        tab.mediaState = null;
        updateTabLabel(tab, "New tab");
        tab.frame.referrerPolicy = "no-referrer";
        tab.frame.dataset.navigationId = String(navigationId);
        tab.frame.src = NEW_TAB_PAGE;
        emitBrowserMediaState();
        emitBrowserMediaPriority();
        if (tab.id === activeTabId) syncActiveChrome();
        return;
      }
      if (isNeoShellDestination(normalized)) {
        returnToDesktop();
        return;
      }
      tab.destination = normalized;
      tab.pendingDestination = normalized;
      tab.isNewTab = false;
      tab.loading = true;
      if (options.appTheme) tab.frame.classList.add("is-theme-pending");
      tab.mediaState = null;
      updateTabLabel(tab);
      tab.frame.referrerPolicy = "no-referrer";
      emitBrowserMediaState();
      emitBrowserMediaPriority();
      if (tab.id === activeTabId) syncActiveChrome();
      if (directOrigin) {
        tab.awaitingTransport = false;
        tab.frame.dataset.navigationId = String(navigationId);
        if (window.NEOFrameLoader) {
          window.NEOFrameLoader.load(tab.frame, tab.destination, { forceFetch: true }).catch((error) => {
            if (tab.navigationId === navigationId) showTransportFailure(tab, error);
          });
        } else if (document.querySelector('meta[name="neo-runner"]')) {
          showTransportFailure(tab, new Error("The internal app loader is not ready."));
        } else {
          tab.frame.src = tab.destination;
        }
        return;
      }
      tab.awaitingTransport = true;
      tab.frame.src = "about:blank";
      ensureNavigationTransport(tab.destination).then(
        () => {
          if (!tabs.includes(tab) || tab.navigationId !== navigationId) return;
          tab.awaitingTransport = false;
          tab.frame.removeAttribute("srcdoc");
          tab.frame.dataset.navigationId = String(navigationId);
          tab.frame.src = runtime.routeFor(tab.destination);
        },
        (error) => {
          if (tab.navigationId === navigationId) showTransportFailure(tab, error);
        },
      );
    }

    async function recoverMissingTransport(tab) {
      if (directOrigin || tab.isNewTab || !tabs.includes(tab)) return false;
      let trace = "";
      try {
        trace = `${tab.frame.contentDocument?.querySelector("#errorTrace")?.value || ""} ${tab.frame.contentDocument?.body?.textContent || ""}`;
      } catch (error) {
        return false;
      }
      if (!/there are no bare clients|No BareTransport was set|wasm not loaded yet|please call libcurl\.load_wasm|Hyper client|hyper_util::client::legacy::Error|MuxTaskEnded|Multiplexor task ended/i.test(trace)) return false;
      if (tab.transportRecoveryAttempts >= 2) {
        showTransportFailure(tab, new Error("The connection could not be restored automatically."));
        return true;
      }
      tab.transportRecoveryAttempts += 1;
      const destination = tab.destination;
      const navigationId = tab.navigationId;
      tab.loading = true;
      if (tab.id === activeTabId) syncActiveChrome();
      try {
        await switchToAlternateTransport();
        if (!tabs.includes(tab) || tab.navigationId !== navigationId || tab.destination !== destination) return true;
        tab.frame.src = runtime.routeFor(destination);
      } catch (error) {
        showTransportFailure(tab, error);
      }
      return true;
    }

    function refreshAddress(tab) {
      if (tab.isNewTab) {
        tab.loading = false;
        updateTabLabel(tab, "New tab");
        if (tab.id === activeTabId) syncActiveChrome();
        return;
      }
      try {
        const destination = externalDestination(destinationFromRoute(tab.frame.contentWindow.location.href, runtime.config));
        if (!destination) throw new Error("Destination unavailable");
        if (isNeoShellDestination(destination)) {
          returnToDesktop();
          return;
        }
        tab.destination = destination;
      } catch (error) {
        // Keep the last decoded destination when a page is between navigations.
      }
      tab.pendingDestination = "";
      tab.loading = false;
      let title = "";
      try { title = tab.frame.contentDocument?.title || ""; } catch (error) {}
      updateTabLabel(tab, title);
      updateTabIcon(tab);
      emitBrowserMediaPriority();
      if (tab.id === activeTabId) syncActiveChrome();
    }

    function wireNewTabFrame(tab) {
      if (!tab.isNewTab) return;
      let document;
      try { document = tab.frame.contentDocument; } catch (error) { return; }
      const form = document?.querySelector("[data-newtab-search]");
      const input = form?.querySelector("input");
      if (!form || !input || form.dataset.ready === "true") return;
      form.dataset.ready = "true";
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        navigateTab(tab, input.value);
      });
      input.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" || event.isComposing) return;
        event.preventDefault();
        form.requestSubmit();
      });
    }

    function createTab(destination, options = {}) {
      const id = `neo-browser-tab-${++tabSequence}`;
      const normalizedDestination = normalizeDestination(destination);
      const element = document.createElement("div");
      element.className = "neo-browser-tab-shell";
      element.dataset.tabId = id;
      element.innerHTML = `
        <button class="neo-browser-tab" type="button" role="tab" aria-selected="false" tabindex="-1">
          <img class="neo-browser-tab-icon" src="${browserAsset("assets/duckduckgo.png")}" width="16" height="16" alt="" />
          <span class="neo-browser-tab-label"></span>
        </button>
        <button class="neo-browser-tab-close" type="button" aria-label="Close tab"><span aria-hidden="true">&times;</span></button>
      `;

      const frame = document.createElement("iframe");
      frame.className = "neo-browser-frame";
      if (options.appTheme) frame.classList.add("is-theme-pending");
      frame.dataset.browserFrame = "";
      frame.referrerPolicy = "no-referrer";
      frame.allow = "autoplay; clipboard-read; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
      frame.allowFullscreen = true;
      frame.tabIndex = -1;
      frame.setAttribute("aria-hidden", "true");

      const tab = {
        id,
        element,
        button: element.querySelector(".neo-browser-tab"),
        closeButton: element.querySelector(".neo-browser-tab-close"),
        icon: element.querySelector(".neo-browser-tab-icon"),
        label: element.querySelector(".neo-browser-tab-label"),
        frame,
        destination: normalizedDestination,
        pendingDestination: "",
        isNewTab: normalizedDestination === NEW_TAB_DESTINATION,
        loading: false,
        mediaState: null,
        mediaUpdatedAt: 0,
        navigationId: 0,
        transportRecoveryAttempts: 0,
        awaitingTransport: false,
      };
      tabs.push(tab);
      element.draggable = true;
      tabList.appendChild(element);
      pages.appendChild(frame);
      frame.addEventListener("load", async () => {
        if (tab.awaitingTransport) return;
        if (await recoverMissingTransport(tab)) return;
        tab.transportRecoveryAttempts = 0;
        if (isMusicDestination(tab.destination)) {
          await switchToPrimaryTransport().catch(() => {});
        }
        wireNewTabFrame(tab);
        applyAppTheme(tab);
        refreshAddress(tab);
      });
      element.addEventListener("click", (event) => {
        if (event.target.closest(".neo-browser-tab-close")) return;
        activateTab(tab.id);
      });
      tab.closeButton.addEventListener("click", (event) => {
        event.stopPropagation();
        closeTab(tab.id);
      });
      element.addEventListener("dragstart", (event) => {
        draggedTabId = tab.id;
        element.classList.add("is-dragging");
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", tab.id);
      });
      element.addEventListener("dragend", () => {
        draggedTabId = "";
        element.classList.remove("is-dragging");
      });
      activateTab(tab.id);
      navigateTab(tab, tab.destination);
      if (options.focusAddress) {
        address.focus();
        address.select();
      }
      return tab;
    }

    function closeTab(tabId) {
      const index = tabs.findIndex((tab) => tab.id === tabId);
      if (index < 0) return;
      const [tab] = tabs.splice(index, 1);
      if (contextState?.tab === tab) closeContextMenu();
      if (inspectorState?.tab === tab) closeInspector();
      const wasActive = tab.id === activeTabId;
      try { tab.frame.contentWindow.onbeforeunload = null; } catch (error) {}
      tab.frame.remove();
      tab.element.remove();
      emitBrowserMediaPriority();
      if (!tabs.length) {
        activeTabId = "";
        createTab(NEW_TAB_DESTINATION, { focusAddress: true });
        return;
      }
      if (wasActive) activateTab(tabs[Math.min(index, tabs.length - 1)].id, true);
      else {
        syncActiveChrome();
        emitBrowserMediaState();
      }
    }

    function cycleTabs(direction) {
      const index = tabs.findIndex((tab) => tab.id === activeTabId);
      if (index < 0 || tabs.length < 2) return;
      const nextIndex = (index + direction + tabs.length) % tabs.length;
      activateTab(tabs[nextIndex].id, true);
    }

    shell.querySelector("[data-browser-back]").addEventListener("click", () => {
      try { activeTab()?.frame.contentWindow.history.back(); } catch (error) {}
    });
    shell.querySelector("[data-browser-forward]").addEventListener("click", () => {
      try { activeTab()?.frame.contentWindow.history.forward(); } catch (error) {}
    });
    shell.querySelector("[data-browser-reload]").addEventListener("click", () => {
      const tab = activeTab();
      if (!tab) return;
      navigateTab(tab, tab.destination);
    });
    shell.querySelector("[data-browser-new-tab]").addEventListener("click", () => {
      createTab(NEW_TAB_DESTINATION, { focusAddress: true });
    });
    contextMenu.addEventListener("click", (event) => {
      const action = event.target.closest("[data-browser-context-action]")?.dataset.browserContextAction;
      const tab = contextState?.tab;
      if (!action || !tab) return;
      if (action === "back") {
        try { tab.frame.contentWindow.history.back(); } catch (error) {}
      } else if (action === "forward") {
        try { tab.frame.contentWindow.history.forward(); } catch (error) {}
      } else if (action === "reload") {
        navigateTab(tab, tab.destination);
      } else if (action === "inspect") {
        openInspector(tab, contextState.inspection);
        return;
      }
      closeContextMenu(true);
    });
    contextMenu.addEventListener("keydown", (event) => {
      const index = contextMenuButtons.indexOf(document.activeElement);
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        contextMenuButtons[(Math.max(0, index) + direction + contextMenuButtons.length) % contextMenuButtons.length]?.focus();
      } else if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        contextMenuButtons[event.key === "Home" ? 0 : contextMenuButtons.length - 1]?.focus();
      } else if (event.key === "Escape") {
        event.preventDefault();
        closeContextMenu(true);
      }
    });
    shell.querySelector("[data-browser-inspector-close]").addEventListener("click", closeInspector);
    inspectorPicker.addEventListener("click", () => {
      if (inspectorPicker.getAttribute("aria-pressed") === "true") {
        closeInspector();
        return;
      }
      startInspectorPicker();
    });
    addressForm.addEventListener("submit", (event) => {
      event.preventDefault();
      navigateTab(activeTab(), address.value);
    });
    address.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" || event.isComposing) return;
      event.preventDefault();
      addressForm.requestSubmit();
    });

    tabList.addEventListener("keydown", (event) => {
      if (!event.target.closest('[role="tab"]')) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        cycleTabs(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        cycleTabs(1);
      } else if (event.key === "Home") {
        event.preventDefault();
        activateTab(tabs[0]?.id, true);
      } else if (event.key === "End") {
        event.preventDefault();
        activateTab(tabs.at(-1)?.id, true);
      }
    });
    tabList.addEventListener("dragover", (event) => {
      const dragged = tabs.find((tab) => tab.id === draggedTabId);
      const targetElement = event.target.closest(".neo-browser-tab-shell");
      const target = tabs.find((tab) => tab.element === targetElement);
      if (!dragged || !target || dragged === target) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      const placeAfter = event.clientX > targetElement.getBoundingClientRect().left + targetElement.offsetWidth / 2;
      tabs.splice(tabs.indexOf(dragged), 1);
      const targetIndex = tabs.indexOf(target);
      tabs.splice(targetIndex + (placeAfter ? 1 : 0), 0, dragged);
      tabList.insertBefore(dragged.element, placeAfter ? target.element.nextSibling : target.element);
    });
    tabList.addEventListener("drop", (event) => {
      if (draggedTabId) event.preventDefault();
    });

    const handleFrameMessage = (event) => {
      const tab = tabs.find((candidate) => event.source === candidate.frame.contentWindow);
      if (!tab) return;
      if (event.data?.sbMusic && isMusicDestination(tab.destination)) {
        handleMusicCommand(tab, event.data.sbMusic);
        return;
      }
      const messageType = event.data?.type;
      if (!["neo-browser:navigation", "neo-browser:navigate-request", "neo-browser:download-start", "neo-browser:download-cancel", "neo-browser:download-request", "neo-browser:download-error", "neo-browser:context-menu", "neo-browser:context-dismiss", "neo-browser:inspect-selected", "neo-browser:media-state", "neo-browser:media-levels"].includes(messageType)) return;
      if (messageType === "neo-browser:download-start") {
        showDownloadStatus(`Saving ${safeDownloadName(event.data.name || "Download")} to Drive...`, "active", true);
        return;
      }
      if (messageType === "neo-browser:download-cancel") {
        window.clearTimeout(downloadStatusTimer);
        downloadStatus.hidden = true;
        return;
      }
      if (messageType === "neo-browser:download-request") {
        void saveDownloadToDrive(tab, event.data || {});
        return;
      }
      if (messageType === "neo-browser:download-error") {
        showDownloadStatus(String(event.data.message || "The file could not be downloaded.").slice(0, 180), "error");
        return;
      }
      if (messageType === "neo-browser:navigate-request") {
        if (tab.loading && tab.pendingDestination) return;
        const requestedDestination = externalDestination(event.data.href);
        if (requestedDestination) navigateTab(tab, requestedDestination);
        return;
      }
      if (messageType === "neo-browser:media-levels") {
        emitBrowserMediaLevels(tab, event.data.levels);
        return;
      }
      if (messageType === "neo-browser:media-state") {
        tab.mediaState = event.data.active === false ? null : {
          active: true,
          playing: event.data.playing === true,
          title: String(event.data.title || "Media").slice(0, 160),
          subtitle: String(event.data.subtitle || "").slice(0, 180),
          cover: String(event.data.cover || "").slice(0, 4096),
          kind: event.data.kind === "audio" ? "audio" : "video",
          position: Math.max(0, Number(event.data.position) || 0),
          duration: Math.max(0, Number(event.data.duration) || 0),
          volume: Math.max(0, Math.min(1, Number(event.data.volume) || 0)),
          muted: event.data.muted === true,
          volumeControl: event.data.volumeControl === true,
        };
        tab.mediaUpdatedAt = Date.now();
        emitBrowserMediaState();
        emitBrowserMediaPriority();
        return;
      }
      if (messageType === "neo-browser:context-menu") {
        showContextMenu(tab, event.data);
        return;
      }
      if (messageType === "neo-browser:context-dismiss") {
        if (contextState?.tab === tab) closeContextMenu();
        return;
      }
      if (messageType === "neo-browser:inspect-selected") {
        openInspector(tab, event.data.inspection);
        return;
      }
      closeContextMenu();
      const destination = externalDestination(destinationFromRoute(event.data.href, runtime.config));
      if (!destination) return;
      if (messageType === "neo-browser:navigation") {
        if (tab.loading && tab.pendingDestination && tab.pendingDestination !== destination) return;
        let actualDestination = "";
        try {
          actualDestination = externalDestination(destinationFromRoute(tab.frame.contentWindow.location.href, runtime.config));
        } catch (error) {}
        if (actualDestination && actualDestination !== destination) return;
        if (!actualDestination && tab.loading && tab.pendingDestination && tab.pendingDestination !== destination) return;
      }
      if (isNeoShellDestination(destination)) {
        returnToDesktop();
        return;
      }
      tab.destination = destination;
      tab.pendingDestination = "";
      tab.loading = false;
      updateTabLabel(tab, event.data.title);
      emitBrowserMediaPriority();
      if (tab.id === activeTabId) syncActiveChrome();
    };

    const handleSystemThemeMessage = (event) => {
      const trustedOrigin = window.location.origin === "null"
        ? event.origin === "null"
        : event.origin === window.location.origin;
      if (!trustedOrigin || event.source !== window.parent || event.data?.type !== "neo-system-preferences") return;
      window.requestAnimationFrame(() => tabs.forEach((tab) => applyAppTheme(tab)));
    };

    const handleShortcuts = (event) => {
      const key = event.key.toLowerCase();
      if (event.key === "Escape" && !contextMenu.hidden) {
        event.preventDefault();
        closeContextMenu(true);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && !event.altKey && key === "i") {
        event.preventDefault();
        if (inspector.classList.contains("is-open")) closeInspector();
        else startInspectorPicker();
        return;
      }
      if (appMode) return;
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      if (key === "l") {
        event.preventDefault();
        address.focus();
        address.select();
      } else if (key === "t") {
        event.preventDefault();
        createTab(NEW_TAB_DESTINATION, { focusAddress: true });
      } else if (key === "w") {
        event.preventDefault();
        closeTab(activeTabId);
      } else if (key === "tab") {
        event.preventDefault();
        cycleTabs(event.shiftKey ? -1 : 1);
      }
    };

    const dismissContextMenu = (event) => {
      if (!contextMenu.hidden && !contextMenu.contains(event.target)) closeContextMenu();
    };

    const handleMediaVolumeRequest = (event) => {
      if (String(event.detail?.source || "") !== mediaSource) return;
      const mediaTab = mediaTabForDisplay();
      if (!mediaTab) return;
      const volume = Math.max(0, Math.min(1, Number(event.detail?.volume) || 0));
      if (mediaTab === musicOwnerTab && isMusicDestination(mediaTab.destination)) {
        musicAudio.volume = volume;
        try { localStorage.setItem("neo_music_volume", String(volume)); } catch (error) {}
        broadcastMusicState();
        return;
      }
      postToTab(mediaTab, { type: "neo-browser:set-volume", volume });
    };

    window.addEventListener("message", handleFrameMessage);
    window.addEventListener("message", handleSystemThemeMessage);
    window.addEventListener("keydown", handleShortcuts);
    window.addEventListener("pointerdown", dismissContextMenu, true);
    window.addEventListener("neo-media-volume-request", handleMediaVolumeRequest);
    shell._neoBrowserCleanup = () => {
      closeInspector();
      closeContextMenu();
      window.removeEventListener("message", handleFrameMessage);
      window.removeEventListener("message", handleSystemThemeMessage);
      window.removeEventListener("keydown", handleShortcuts);
      window.removeEventListener("pointerdown", dismissContextMenu, true);
      window.removeEventListener("neo-media-volume-request", handleMediaVolumeRequest);
      window.clearTimeout(downloadStatusTimer);
      window.clearTimeout(musicSleepTimer);
      musicWantsPlayback = false;
      musicAudio.pause();
      musicAudio.removeAttribute("src");
      musicAudio.load();
      tabs.forEach((tab) => {
        try { tab.frame.contentWindow.onbeforeunload = null; } catch (error) {}
        tab.frame.remove();
      });
      window.dispatchEvent(new CustomEvent("neo-media-state", {
        detail: { source: mediaSource, active: false },
      }));
      window.dispatchEvent(new CustomEvent("neo-media-priority", {
        detail: { source: mediaSource, active: false },
      }));
    };
    createTab(target, { focusAddress: target === NEW_TAB_DESTINATION });
    return shell;
  }

  window.NEO_BROWSER_ENGINE = {
    proxyOrigin: NEXTNODE_PROXY_ORIGIN,
    warm: getRuntime,
    async proxyUrl(value) {
      const target = normalizeDestination(value);
      if (!externalDestination(target)) throw new TypeError("Only http and https pages can use the web proxy.");
      const runtime = await getRuntime();
      await ensureNavigationTransport(target);
      return runtime.routeFor(target);
    },
    async fetchDocument(value) {
      const target = normalizeDestination(value);
      if (!externalDestination(target)) throw new TypeError("Only http and https pages can use the web proxy.");
      const runtime = await getRuntime();
      await ensureNavigationTransport(target);
      return runtime.fetchDocument(target);
    },
    async fetchResource(value, accept) {
      const target = normalizeDestination(value);
      if (!externalDestination(target)) throw new TypeError("Only http and https resources can use the web proxy.");
      const runtime = await getRuntime();
      await ensureNavigationTransport(target);
      return requestProxyResource(await activateWorker(), target, accept);
    },
    async openQuery(options) {
      if (!options?.container) throw new Error("The web app has no page container.");
      const target = normalizeDestination(options.target || options.query);
      const directOrigin = options.directOrigin === true;
      const [runtime, , themeCss] = await Promise.all([
        directOrigin
          ? Promise.resolve({ config: null, routeFor(destination) { return destination; } })
          : getRuntime(),
        loadStyles(),
        directOrigin ? Promise.resolve("") : loadAppTheme(options.appTheme),
      ]);
      return mountBrowser(options.container, runtime, target, Object.assign({}, options, { themeCss }));
    },
  };
})();
