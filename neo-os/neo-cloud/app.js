(function () {
  "use strict";

  var DEFAULT_ENDPOINT = "https://neo-stratus-api-w6nw.onrender.com";
  var LEGACY_ENDPOINT = "https://api.stratus.lol";
  var DEFAULT_API_KEY = "sk_live_neo_21c3aa84317445fa850319adfa895999";
  var SERVICE_WAKE_TIMEOUT = 75000;
  var PAGE_SIZE = 24;
  var STORAGE = {
    favorites: "neo_cloud_favorites_v1",
    recent: "neo_cloud_recent_v1",
    endpoint: "neo_cloud_endpoint_v1"
  };

  var elements = {
    shell: document.querySelector("[data-app-shell]"),
    search: document.querySelector("[data-search]"),
    searchClear: document.querySelector("[data-search-clear]"),
    viewButtons: Array.from(document.querySelectorAll("[data-view]")),
    title: document.querySelector("[data-view-title]"),
    eyebrow: document.querySelector("[data-view-eyebrow]"),
    sort: document.querySelector("[data-sort]"),
    categories: document.querySelector("[data-category-strip]"),
    resultCount: document.querySelector("[data-result-count]"),
    catalogState: document.querySelector("[data-catalog-state]"),
    grid: document.querySelector("[data-game-grid]"),
    loadMore: document.querySelector("[data-load-more]"),
    hero: document.querySelector("[data-hero]"),
    heroBackdrop: document.querySelector("[data-hero-backdrop]"),
    heroTitle: document.querySelector("[data-hero-title]"),
    heroDescription: document.querySelector("[data-hero-description]"),
    heroTags: document.querySelector("[data-hero-tags]"),
    heroPlay: document.querySelector("[data-hero-play]"),
    heroDetails: document.querySelector("[data-hero-details]"),
    serviceNotice: document.querySelector("[data-service-notice]"),
    statusDots: Array.from(document.querySelectorAll("[data-status-dot]")),
    statusLabels: Array.from(document.querySelectorAll("[data-status-label]")),
    detailsDialog: document.querySelector("[data-details-dialog]"),
    detailsCover: document.querySelector("[data-details-cover]"),
    detailsTitle: document.querySelector("[data-details-title]"),
    detailsDescription: document.querySelector("[data-details-description]"),
    detailsTags: document.querySelector("[data-details-tags]"),
    detailsPlay: document.querySelector("[data-details-play]"),
    detailsFavorite: document.querySelector("[data-details-favorite]"),
    settingsDialog: document.querySelector("[data-settings-dialog]"),
    settingsForm: document.querySelector("[data-settings-form]"),
    endpoint: document.querySelector("[data-endpoint]"),
    connectionResult: document.querySelector("[data-connection-result]"),
    testConnection: document.querySelector("[data-test-connection]"),
    stage: document.querySelector("[data-stream-stage]"),
    video: document.querySelector("[data-stream-video]"),
    placeholder: document.querySelector("[data-stream-placeholder]"),
    streamTitle: document.querySelector("[data-stream-title]"),
    streamMessage: document.querySelector("[data-stream-message]"),
    queueMeter: document.querySelector("[data-queue-meter]"),
    streamGame: document.querySelector("[data-stream-game]"),
    sessionTime: document.querySelector("[data-session-time]"),
    audioPrompt: document.querySelector("[data-audio-prompt]"),
    mute: document.querySelector("[data-stream-mute]"),
    fullscreen: document.querySelector("[data-stream-fullscreen]"),
    exit: document.querySelector("[data-stream-exit]"),
    touchControls: document.querySelector("[data-stream-touch-controls]"),
    toasts: document.querySelector("[data-toast-region]")
  };

  var state = {
    games: [],
    gamesByKey: new Map(),
    view: "home",
    query: "",
    category: "All",
    sort: "featured",
    visible: PAGE_SIZE,
    hero: null,
    selected: null,
    favorites: new Set(readArray(STORAGE.favorites)),
    recent: readArray(STORAGE.recent),
    pendingLaunch: null,
    launch: null,
    configured: false,
    tested: false,
    testedConfig: "",
    streamFocused: false,
    mouseButtons: 0,
    cursorX: 0,
    cursorY: 0,
    virtualX: 0,
    virtualY: 0,
    escapeTimer: 0,
    activeKeys: new Set(),
    gamepadFrame: 0
  };

  function icon(name) {
    return '<svg class="icon" aria-hidden="true"><use href="#cloud-icon-' + name + '"></use></svg>';
  }

  function readJson(key, fallback, storage) {
    try {
      var raw = (storage || localStorage).getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_error) {
      return fallback;
    }
  }

  function readArray(key, storage) {
    var value = readJson(key, [], storage);
    return Array.isArray(value) ? value : [];
  }

  function writeJson(key, value, storage) {
    try {
      (storage || localStorage).setItem(key, JSON.stringify(value));
      return true;
    } catch (_error) {
      return false;
    }
  }

  function safeStorageGet(storage, key) {
    try { return storage.getItem(key) || ""; } catch (_error) { return ""; }
  }

  function safeStorageSet(storage, key, value) {
    try {
      if (value) storage.setItem(key, value);
      else storage.removeItem(key);
    } catch (_error) {}
  }

  function normalizeEndpoint(value) {
    var raw = String(value || "").trim().replace(/\/+$/, "");
    var parsed;
    try { parsed = new URL(raw); } catch (_error) { throw new Error("Enter a complete service address."); }
    var local = /^(?:localhost|127\.0\.0\.1)$/i.test(parsed.hostname);
    if (parsed.protocol !== "https:" && !(local && parsed.protocol === "http:")) {
      throw new Error("The cloud service must use HTTPS.");
    }
    if (parsed.username || parsed.password) throw new Error("Remove sign-in details from the service address.");
    parsed.hash = "";
    parsed.search = "";
    return parsed.href.replace(/\/+$/, "");
  }

  function serviceSettings() {
    var savedEndpoint = safeStorageGet(localStorage, STORAGE.endpoint);
    return {
      endpoint: !savedEndpoint || normalizeEndpoint(savedEndpoint) === LEGACY_ENDPOINT
        ? DEFAULT_ENDPOINT
        : savedEndpoint,
      key: DEFAULT_API_KEY
    };
  }

  function updateServiceStatus(mode, label) {
    state.configured = mode === "ready";
    elements.statusDots.forEach(function (dot) {
      dot.classList.toggle("is-ready", mode === "ready");
      dot.classList.toggle("is-error", mode === "error");
    });
    elements.statusLabels.forEach(function (node) { node.textContent = label; });

    if (mode === "ready") {
      elements.serviceNotice.classList.add("is-ready");
      elements.serviceNotice.querySelector("strong").textContent = "Cloud service configured";
      elements.serviceNotice.querySelector("span").textContent = state.tested
        ? "Connection accepted. Choose a game to start a session."
        : "Choose a game to test the service and start a session.";
    } else {
      elements.serviceNotice.classList.remove("is-ready");
      elements.serviceNotice.querySelector("strong").textContent = mode === "error"
        ? "Cloud service could not connect"
        : "Connect a cloud service to play";
      elements.serviceNotice.querySelector("span").textContent = mode === "error"
        ? "Open setup to check the service endpoint."
        : "The game library works now. Streaming needs a compatible Stratus endpoint.";
    }
  }

  function setConnectionResult(message, isError) {
    elements.connectionResult.textContent = String(message || "");
    elements.connectionResult.classList.toggle("is-error", Boolean(isError));
  }

  function showDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.showModal === "function") {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
  }

  function closeDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.close === "function" && dialog.open) dialog.close();
    else dialog.removeAttribute("open");
  }

  function showToast(title, message) {
    var toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = icon("info") + "<div><strong></strong><span></span></div>";
    toast.querySelector("strong").textContent = title;
    toast.querySelector("span").textContent = message;
    elements.toasts.appendChild(toast);
    window.setTimeout(function () { toast.remove(); }, 4800);
  }

  function safeImage(value) {
    try {
      var url = new URL(String(value || ""), document.baseURI);
      return url.protocol === "https:" ? url.href : "";
    } catch (_error) {
      return "";
    }
  }

  function normalizeGame(entry, index) {
    if (!entry || typeof entry !== "object") return null;
    var key = String(entry.game_key || "").trim();
    var name = String(entry.name || "").trim();
    if (!key || !name || key.length > 256 || name.length > 160) return null;
    var tags = Array.isArray(entry.tags)
      ? entry.tags.map(function (tag) { return String(tag || "").trim(); }).filter(Boolean).slice(0, 8)
      : [];
    return {
      key: key,
      name: name,
      description: String(entry.description || "No description is available for this game.").trim().replace(/å$/, ""),
      image: safeImage(entry.image),
      cover: safeImage(entry.cover) || safeImage(entry.image),
      tags: tags,
      index: index
    };
  }

  function saveFavorites() {
    writeJson(STORAGE.favorites, Array.from(state.favorites));
  }

  function recordRecent(key) {
    state.recent = [key].concat(state.recent.filter(function (item) { return item !== key; })).slice(0, 24);
    writeJson(STORAGE.recent, state.recent);
  }

  function toggleFavorite(key) {
    if (!state.gamesByKey.has(key)) return;
    var active = document.activeElement;
    var activeFavorite = active && active.closest ? active.closest('[data-action="favorite"]') : null;
    var activeCard = activeFavorite && activeFavorite.closest("[data-key]");
    var cardIndex = activeCard ? Array.from(elements.grid.children).indexOf(activeCard) : -1;
    if (state.favorites.has(key)) state.favorites.delete(key);
    else state.favorites.add(key);
    saveFavorites();
    renderCatalog();
    if (state.selected && state.selected.key === key) renderDetails(state.selected);
    if (activeCard) {
      var sameCard = Array.from(elements.grid.querySelectorAll("[data-key]")).find(function (card) { return card.dataset.key === key; });
      var cards = Array.from(elements.grid.querySelectorAll("[data-key]"));
      var focusTarget = sameCard && sameCard.querySelector('[data-action="favorite"]');
      if (!focusTarget && cards.length) focusTarget = cards[Math.min(Math.max(cardIndex, 0), cards.length - 1)].querySelector('[data-action="favorite"]');
      if (!focusTarget) focusTarget = elements.viewButtons.find(function (button) { return button.dataset.view === state.view; });
      if (focusTarget) focusTarget.focus();
    }
  }

  function topCategories(games) {
    var counts = new Map();
    games.forEach(function (game) {
      game.tags.forEach(function (tag) { counts.set(tag, (counts.get(tag) || 0) + 1); });
    });
    return Array.from(counts.entries())
      .sort(function (a, b) { return b[1] - a[1] || a[0].localeCompare(b[0]); })
      .slice(0, 12)
      .map(function (entry) { return entry[0]; });
  }

  function renderCategories() {
    elements.categories.replaceChildren();
    ["All"].concat(topCategories(state.games)).forEach(function (category) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "category-button" + (state.category === category ? " is-active" : "");
      button.dataset.category = category;
      button.textContent = category;
      elements.categories.appendChild(button);
    });
  }

  function filteredGames() {
    var games;
    if (state.view === "favorites") {
      games = state.games.filter(function (game) { return state.favorites.has(game.key); });
    } else if (state.view === "recent") {
      games = state.recent.map(function (key) { return state.gamesByKey.get(key); }).filter(Boolean);
    } else {
      games = state.games.slice();
    }

    if (state.category !== "All") {
      games = games.filter(function (game) { return game.tags.indexOf(state.category) !== -1; });
    }
    if (state.query) {
      var terms = state.query.toLowerCase().split(/\s+/).filter(Boolean);
      games = games.filter(function (game) {
        var haystack = [game.name, game.description].concat(game.tags).join(" ").toLowerCase();
        return terms.every(function (term) { return haystack.indexOf(term) !== -1; });
      });
    }
    if (state.sort === "az") games.sort(function (a, b) { return a.name.localeCompare(b.name); });
    if (state.sort === "za") games.sort(function (a, b) { return b.name.localeCompare(a.name); });
    return games;
  }

  function viewCopy() {
    if (state.query) return { eyebrow: "SEARCH RESULTS", title: 'Results for "' + state.query + '"' };
    if (state.view === "all") return { eyebrow: "FULL CATALOG", title: "All games" };
    if (state.view === "favorites") return { eyebrow: "SAVED LOCALLY", title: "Favorites" };
    if (state.view === "recent") return { eyebrow: "PLAY HISTORY", title: "Recently opened" };
    return { eyebrow: "YOUR CLOUD LIBRARY", title: "Featured games" };
  }

  function makeImage(game, kind) {
    var wrapper = document.createElement("div");
    wrapper.className = "game-fallback";
    var fallback = document.createElement("img");
    fallback.src = "../assets/neo-cloud.svg";
    fallback.alt = "";
    fallback.width = 44;
    fallback.height = 44;
    wrapper.appendChild(fallback);

    var image = document.createElement("img");
    image.loading = kind === "card" ? "lazy" : "eager";
    image.decoding = "async";
    image.referrerPolicy = "no-referrer";
    image.alt = "";
    image.src = kind === "cover" ? game.cover : game.image;
    image.addEventListener("error", function () { image.classList.add("has-error"); }, { once: true });
    return { fallback: wrapper, image: image };
  }

  function makeCard(game) {
    var card = document.createElement("article");
    card.className = "game-card";
    card.dataset.key = game.key;

    var media = document.createElement("div");
    media.className = "game-card-media";
    var art = makeImage(game, "card");
    media.append(art.fallback, art.image);

    var open = document.createElement("button");
    open.type = "button";
    open.className = "game-card-open";
    open.dataset.action = "details";
    open.setAttribute("aria-label", "View " + game.name);

    var play = document.createElement("button");
    play.type = "button";
    play.className = "game-card-play";
    play.dataset.action = "play";
    play.setAttribute("aria-label", "Play " + game.name);
    play.innerHTML = icon("play");
    media.append(open, play);

    var copy = document.createElement("div");
    copy.className = "game-card-copy";
    var text = document.createElement("div");
    var title = document.createElement("h3");
    title.textContent = game.name;
    var tags = document.createElement("p");
    tags.textContent = game.tags.slice(0, 3).join(" · ") || "Cloud game";
    text.append(title, tags);

    var favorite = document.createElement("button");
    favorite.type = "button";
    favorite.className = "favorite-button" + (state.favorites.has(game.key) ? " is-active" : "");
    favorite.dataset.action = "favorite";
    favorite.setAttribute("aria-label", (state.favorites.has(game.key) ? "Remove " : "Add ") + game.name + (state.favorites.has(game.key) ? " from favorites" : " to favorites"));
    favorite.innerHTML = icon("heart");
    copy.append(text, favorite);
    card.append(media, copy);
    return card;
  }

  function setCatalogState(title, copy) {
    elements.catalogState.hidden = false;
    elements.catalogState.innerHTML = icon("info") + "<strong></strong><span></span>";
    elements.catalogState.querySelector("strong").textContent = title;
    elements.catalogState.querySelector("span").textContent = copy;
  }

  function renderCatalog() {
    var copy = viewCopy();
    elements.eyebrow.textContent = copy.eyebrow;
    elements.title.textContent = copy.title;
    var games = filteredGames();
    elements.resultCount.textContent = games.length + (games.length === 1 ? " game" : " games");
    elements.grid.replaceChildren();

    if (!games.length) {
      var emptyTitle = state.view === "favorites" ? "No favorites yet" : state.view === "recent" ? "No recent games" : "No games found";
      var emptyCopy = state.view === "favorites"
        ? "Use the heart button on any game to keep it here."
        : state.view === "recent"
          ? "Games you open will appear here."
          : "Try another name or category.";
      setCatalogState(emptyTitle, emptyCopy);
      elements.loadMore.hidden = true;
      return;
    }

    elements.catalogState.hidden = true;
    var fragment = document.createDocumentFragment();
    games.slice(0, state.visible).forEach(function (game) { fragment.appendChild(makeCard(game)); });
    elements.grid.appendChild(fragment);
    elements.loadMore.hidden = state.visible >= games.length;
  }

  function setHero(game) {
    if (!game) return;
    state.hero = game;
    elements.heroTitle.textContent = game.name;
    elements.heroDescription.textContent = game.description;
    renderTags(elements.heroTags, game.tags.slice(0, 4));
    elements.heroPlay.disabled = false;
    elements.heroDetails.disabled = false;
    if (game.cover) {
      elements.heroBackdrop.style.setProperty("--hero-image", 'url("' + game.cover.replace(/["\\]/g, "") + '")');
    } else {
      elements.heroBackdrop.style.removeProperty("--hero-image");
    }
  }

  function renderTags(container, tags) {
    container.replaceChildren();
    tags.forEach(function (tag) {
      var node = document.createElement("span");
      node.className = "tag";
      node.textContent = tag;
      container.appendChild(node);
    });
  }

  function renderDetails(game) {
    state.selected = game;
    elements.detailsTitle.textContent = game.name;
    elements.detailsDescription.textContent = game.description;
    renderTags(elements.detailsTags, game.tags);
    elements.detailsCover.src = game.cover || game.image || "../assets/neo-cloud.svg";
    elements.detailsCover.alt = game.cover || game.image ? game.name + " artwork" : "";
    var saved = state.favorites.has(game.key);
    elements.detailsFavorite.classList.toggle("is-active", saved);
    elements.detailsFavorite.querySelector("span").textContent = saved ? "Remove favorite" : "Add favorite";
  }

  function openDetails(game) {
    if (!game) return;
    renderDetails(game);
    recordRecent(game.key);
    showDialog(elements.detailsDialog);
  }

  function changeView(view) {
    if (["home", "all", "favorites", "recent"].indexOf(view) === -1) return;
    state.view = view;
    state.visible = PAGE_SIZE;
    elements.viewButtons.forEach(function (button) {
      var selected = button.dataset.view === view;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    var destination = view === "home" ? elements.hero : document.querySelector(".catalog");
    if (destination) destination.scrollIntoView({ behavior: "smooth", block: "start" });
    renderCatalog();
  }

  async function loadCatalog() {
    try {
      var response = await fetch("./games.json", { cache: "force-cache", credentials: "same-origin" });
      if (!response.ok) throw new Error("Catalog returned HTTP " + response.status + ".");
      var entries = await response.json();
      if (!Array.isArray(entries)) throw new Error("Catalog format is invalid.");
      var seen = new Set();
      state.games = entries.map(normalizeGame).filter(function (game) {
        if (!game || seen.has(game.key)) return false;
        seen.add(game.key);
        return true;
      });
      if (!state.games.length) throw new Error("Catalog does not contain any valid games.");
      state.gamesByKey = new Map(state.games.map(function (game) { return [game.key, game]; }));
      state.favorites = new Set(Array.from(state.favorites).filter(function (key) { return state.gamesByKey.has(key); }));
      state.recent = state.recent.filter(function (key) { return state.gamesByKey.has(key); });
      saveFavorites();
      writeJson(STORAGE.recent, state.recent);
      setHero(state.games[0]);
      renderCategories();
      renderCatalog();
    } catch (error) {
      elements.resultCount.textContent = "Catalog unavailable";
      setCatalogState("Could not load the game catalog", String(error && error.message || "Reload NEO Cloud and try again."));
      showToast("Catalog unavailable", "NEO Cloud could not read its local games file.");
    }
  }

  function openSettings(message) {
    var settings = serviceSettings();
    elements.endpoint.value = settings.endpoint;
    setConnectionResult(message || "", false);
    showDialog(elements.settingsDialog);
  }

  function settingsFromForm() {
    var endpoint = normalizeEndpoint(elements.endpoint.value);
    return { endpoint: endpoint, key: DEFAULT_API_KEY };
  }

  function settingsFingerprint(settings) {
    return settings.endpoint + "\n" + settings.key;
  }

  function saveSettings() {
    var settings = settingsFromForm();
    var endpoint = settings.endpoint;
    var key = settings.key;
    safeStorageSet(localStorage, STORAGE.endpoint, endpoint);
    state.tested = state.testedConfig === settingsFingerprint(settings);
    updateServiceStatus(key ? "ready" : "idle", key ? (state.tested ? "Connected" : "Configured") : "Setup needed");
    return settings;
  }

  async function testConnection() {
    var settings;
    try {
      settings = settingsFromForm();
    } catch (error) {
      setConnectionResult(error.message, true);
      return false;
    }

    elements.testConnection.disabled = true;
    elements.testConnection.innerHTML = icon("refresh") + " Testing";
    setConnectionResult("Contacting the service...", false);
    var controller = new AbortController();
    var wakingTimer = window.setTimeout(function () {
      setConnectionResult("The cloud server is waking up. Keep this window open…", false);
    }, 4500);
    var timer = window.setTimeout(function () { controller.abort(); }, SERVICE_WAKE_TIMEOUT);
    try {
      var response = await fetch(settings.endpoint + "/cloud/v1/getQueue?uuid=00000000-0000-4000-8000-000000000000", {
        method: "GET",
        cache: "no-store",
        credentials: "omit",
        headers: { Accept: "application/json", "x-api-key": settings.key },
        signal: controller.signal
      });
      if (response.status === 401 || response.status === 403) throw new Error("The service rejected this API key.");
      if (response.status >= 500) throw new Error("The service is online but returned an error.");
      var responseType = String(response.headers.get("content-type") || "").toLowerCase();
      var responseText = await response.text();
      var responseData = null;
      try { responseData = JSON.parse(responseText); } catch (_error) {}
      var expectedNotFound = response.status === 404 && responseData && /session not found|expired/i.test(String(responseData.error || ""));
      if (!response.ok && !expectedNotFound) throw new Error("This address is not a compatible NEO Cloud service.");
      if (!responseType.includes("application/json") || !responseData || typeof responseData !== "object") {
        throw new Error("This address is not a compatible NEO Cloud service.");
      }
      var knownShape = expectedNotFound || responseData.status === "queue" || responseData.status === "finished_queue" || typeof responseData.error === "string";
      if (!knownShape) throw new Error("This address is not a compatible NEO Cloud service.");
      state.testedConfig = settingsFingerprint(settings);
      setConnectionResult("Connection accepted. Select Save connection to use it.", false);
      return true;
    } catch (error) {
      state.testedConfig = "";
      var message = error && error.name === "AbortError"
        ? "The service did not answer after its wake-up period. Try again in a moment."
        : "Could not reach the service. Check the endpoint and its CORS settings.";
      if (error && /rejected this API key|returned an error|not a compatible/i.test(error.message)) message = error.message;
      setConnectionResult(message, true);
      return false;
    } finally {
      window.clearTimeout(wakingTimer);
      window.clearTimeout(timer);
      elements.testConnection.disabled = false;
      elements.testConnection.innerHTML = icon("signal") + " Test connection";
    }
  }

  async function apiRequest(path, options, signal) {
    var settings = serviceSettings();
    if (!settings.key) throw new Error("Connect a cloud service first.");
    var endpoint = normalizeEndpoint(settings.endpoint);
    var requestOptions = Object.assign({}, options || {});
    var timeoutMs = Math.max(5000, Number(requestOptions.timeoutMs) || 45000);
    delete requestOptions.timeoutMs;
    var headers = Object.assign({ Accept: "application/json", "x-api-key": settings.key }, requestOptions.headers || {});
    var controller = new AbortController();
    var timedOut = false;
    var timer = window.setTimeout(function () {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    function abortFromCaller() { controller.abort(); }
    if (signal) {
      if (signal.aborted) controller.abort();
      else signal.addEventListener("abort", abortFromCaller, { once: true });
    }
    var response;
    try {
      response = await fetch(endpoint + path, Object.assign({}, requestOptions, {
        cache: "no-store",
        credentials: "omit",
        headers: headers,
        signal: controller.signal
      }));
      var text = await response.text();
      if (!response.ok) {
        var detail = "";
        try { detail = JSON.parse(text).error || ""; } catch (_error) {}
        throw new Error(detail || "The cloud service returned HTTP " + response.status + ".");
      }
      return { response: response, text: text };
    } catch (error) {
      if (error && error.name === "AbortError") {
        if (signal && signal.aborted) throw error;
        if (timedOut) throw new Error("The cloud service took too long to respond.");
        throw error;
      }
      if (response) throw error;
      if (error && /^The cloud service returned HTTP /.test(error.message)) throw error;
      throw new Error("The cloud service is unavailable or blocked by its network policy.");
    } finally {
      window.clearTimeout(timer);
      if (signal) signal.removeEventListener("abort", abortFromCaller);
    }
  }

  function parseEvents(text) {
    return String(text || "").split(/\r?\n/).map(function (line) {
      try { return JSON.parse(line); } catch (_error) { return null; }
    }).filter(Boolean);
  }

  function delay(milliseconds, signal) {
    return new Promise(function (resolve, reject) {
      if (signal && signal.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      var timer = window.setTimeout(done, milliseconds);
      function done() {
        if (signal) signal.removeEventListener("abort", abort);
        resolve();
      }
      function abort() {
        window.clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      }
      if (signal) signal.addEventListener("abort", abort, { once: true });
    });
  }

  function updateLaunch(title, message, progress) {
    elements.streamTitle.textContent = title;
    elements.streamMessage.textContent = message;
    elements.queueMeter.style.width = Math.max(4, Math.min(100, Number(progress) || 0)) + "%";
  }

  function setStageVisible(visible) {
    elements.stage.hidden = !visible;
    elements.shell.inert = Boolean(visible);
    if (visible) {
      window.setTimeout(function () {
        try { elements.stage.focus({ preventScroll: true }); } catch (_error) { elements.stage.focus(); }
      }, 0);
    }
  }

  async function createCloudSession(game, signal) {
    updateLaunch("Preparing secure access", "Requesting a cloud session for " + game.name + ".", 12);
    var created = await apiRequest("/cloud/v1/createSession", {
      method: "POST",
      timeoutMs: 240000,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ game_key: game.key })
    }, signal);
    var events = parseEvents(created.text);
    var errorEvent = events.find(function (event) { return event.status === "error"; });
    if (errorEvent) throw new Error(errorEvent.error || "The service could not create a session.");
    var sessionEvent = events.slice().reverse().find(function (event) { return event.uuid; });
    if (!sessionEvent) throw new Error("The service did not return a session ID.");
    return sessionEvent;
  }

  async function waitForQueue(session, signal) {
    var current = session;
    var uuid = session.uuid;
    var polls = 0;
    while (current.status === "queue") {
      polls += 1;
      var position = Math.max(1, Number(current.queue_pos) || 1);
      updateLaunch("Waiting for a cloud rig", "Queue position " + position + ". This page will continue automatically.", Math.min(82, 25 + polls * 2));
      await delay(3250, signal);
      var result = await apiRequest("/cloud/v1/getQueue?uuid=" + encodeURIComponent(uuid), { method: "GET" }, signal);
      try { current = Object.assign({ uuid: uuid }, JSON.parse(result.text)); } catch (_error) { throw new Error("The queue returned invalid data."); }
      if (polls >= 240) throw new Error("The queue took too long. Try again later.");
    }
    if (current.status !== "finished_queue") throw new Error(current.error || "The session did not become ready.");
    return current;
  }

  async function startRemoteGame(uuid, signal) {
    updateLaunch("Starting your game", "Connecting the video stream and controls.", 88);
    var result = await apiRequest("/cloud/v1/startGame", {
      method: "POST",
      timeoutMs: 60000,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ uuid: uuid })
    }, signal);
    var data;
    try { data = JSON.parse(result.text); } catch (_error) { throw new Error("The start response was invalid."); }
    if (!Array.isArray(data.ice_servers) || !data.signaling_ws) throw new Error("The service did not return streaming details.");
    return data;
  }

  function safeSignalUrl(value) {
    var url;
    try { url = new URL(String(value || "")); } catch (_error) { throw new Error("The signaling address is invalid."); }
    var local = /^(?:localhost|127\.0\.0\.1)$/i.test(url.hostname);
    if (url.protocol !== "wss:" && !(local && url.protocol === "ws:")) throw new Error("The signaling service must use a secure WebSocket.");
    return url.href;
  }

  function setupDataChannel(channel) {
    var launch = state.launch;
    if (!launch) return;
    launch.channel = channel;
    channel.binaryType = "arraybuffer";
    channel.addEventListener("message", function (event) {
      if (!(event.data instanceof ArrayBuffer) || event.data.byteLength < 5) return;
      var view = new DataView(event.data);
      if (view.getUint8(0) !== 163 || view.getUint8(1) !== 6) return;
      if (event.data.byteLength <= 32) {
        launch.cursorHidden = true;
        elements.video.style.cursor = "none";
        if (launch.cursorUrl) URL.revokeObjectURL(launch.cursorUrl);
        launch.cursorUrl = "";
        return;
      }
      var mimeTypes = { 0: "image/x-icon", 1: "image/jpeg", 2: "image/png", 3: "image/gif" };
      var mime = mimeTypes[view.getUint8(2)] || "image/png";
      var hotX = view.getUint8(3);
      var hotY = view.getUint8(4);
      if (launch.cursorUrl) URL.revokeObjectURL(launch.cursorUrl);
      launch.cursorUrl = URL.createObjectURL(new Blob([event.data.slice(5)], { type: mime }));
      launch.cursorHidden = false;
      elements.video.style.cursor = 'url("' + launch.cursorUrl + '") ' + hotX + " " + hotY + ", default";
      if (document.pointerLockElement === elements.video) document.exitPointerLock();
    });
    channel.addEventListener("close", function () {
      releaseStreamFocus(false);
    });
  }

  function connectStream(config, signal) {
    return new Promise(function (resolve, reject) {
      var launch = state.launch;
      if (!launch) return reject(new Error("The cloud session was cancelled."));
      var settled = false;
      var socket;
      try { socket = new WebSocket(safeSignalUrl(config.signaling_ws)); } catch (error) { reject(error); return; }
      launch.socket = socket;
      var timeout = window.setTimeout(function () { fail(new Error("The video stream did not connect in time.")); }, 30000);

      function send(payload) {
        if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload));
      }

      function finish() {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        signal.removeEventListener("abort", abort);
        resolve();
      }

      function fail(error) {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        signal.removeEventListener("abort", abort);
        reject(error);
      }

      function abort() {
        try { socket.close(1000, "cancelled"); } catch (_error) {}
        fail(new DOMException("Aborted", "AbortError"));
      }
      signal.addEventListener("abort", abort, { once: true });

      socket.addEventListener("message", async function (event) {
        var message;
        try { message = JSON.parse(event.data); } catch (_error) { return; }
        if (message.type === "game_ready") {
          try {
            var peer = new RTCPeerConnection({ iceServers: config.ice_servers });
            launch.peer = peer;
            peer.addTransceiver("audio", { direction: "recvonly" });
            peer.addTransceiver("video", { direction: "recvonly" });
            var channel = peer.createDataChannel("JYSDK", { id: 1, ordered: false, maxRetransmits: 0 });
            channel.addEventListener("open", function () { setupDataChannel(channel); });
            peer.addEventListener("datachannel", function (dataEvent) {
              if (dataEvent.channel && dataEvent.channel.label === "JYSDK") setupDataChannel(dataEvent.channel);
            });
            var media = new MediaStream();
            elements.video.srcObject = media;
            peer.addEventListener("track", function (trackEvent) {
              if (media.getTracks().indexOf(trackEvent.track) === -1) media.addTrack(trackEvent.track);
            });
            peer.addEventListener("icecandidate", function (iceEvent) {
              if (iceEvent.candidate) send({ type: "rtc_candidate", candidate: iceEvent.candidate.toJSON() });
            });
            function connectionChanged() {
              if (state.launch !== launch) return;
              var current = peer.connectionState || peer.iceConnectionState;
              if (current === "connected" || current === "completed") {
                window.clearTimeout(launch.disconnectTimer);
                launch.disconnectTimer = 0;
                finish();
              }
              if (current === "failed") fail(new Error("The cloud video connection failed."));
              if (settled && (current === "closed" || current === "failed")) remoteSessionEnded();
              if (settled && current === "disconnected" && !launch.disconnectTimer) {
                elements.sessionTime.textContent = "Reconnecting";
                launch.disconnectTimer = window.setTimeout(function () {
                  if (state.launch === launch && (peer.connectionState === "disconnected" || peer.iceConnectionState === "disconnected")) {
                    remoteSessionEnded();
                  }
                }, 8000);
              }
            }
            peer.addEventListener("connectionstatechange", connectionChanged);
            peer.addEventListener("iceconnectionstatechange", connectionChanged);
            var offer = await peer.createOffer();
            await peer.setLocalDescription(offer);
            send({ type: "rtc_offer", sdp: offer.sdp });
          } catch (error) {
            fail(error);
          }
        } else if (message.type === "rtc_answer" && launch.peer) {
          var answer = typeof message.sdp === "string" ? { type: "answer", sdp: message.sdp } : message.sdp;
          try {
            await launch.peer.setRemoteDescription(new RTCSessionDescription(answer));
            launch.remoteDescriptionReady = true;
            var queuedCandidates = launch.remoteCandidates.splice(0);
            for (var candidateIndex = 0; candidateIndex < queuedCandidates.length; candidateIndex += 1) {
              await launch.peer.addIceCandidate(new RTCIceCandidate(queuedCandidates[candidateIndex]));
            }
          } catch (error) {
            fail(error);
          }
        } else if (message.type === "rtc_candidate" && launch.peer && message.candidate) {
          var candidate = typeof message.candidate === "string"
            ? { candidate: message.candidate, sdpMid: "0", sdpMLineIndex: 0 }
            : message.candidate;
          if (!launch.remoteDescriptionReady) launch.remoteCandidates.push(candidate);
          else launch.peer.addIceCandidate(new RTCIceCandidate(candidate)).catch(function () {});
        }
      });
      socket.addEventListener("error", function () { fail(new Error("The signaling service could not connect.")); });
      socket.addEventListener("close", function () {
        if (state.launch !== launch) return;
        if (!settled) fail(new Error("The signaling service closed before the game connected."));
        else remoteSessionEnded();
      });
    });
  }

  function postVideoState(active) {
    try {
      window.parent.postMessage({ type: "neo-shell:video-route", active: Boolean(active) }, "*");
      window.parent.postMessage({ type: "neo-shell:media-state", active: Boolean(active), playing: Boolean(active), muted: elements.video.muted }, "*");
    } catch (_error) {}
  }

  function syncMuteControls() {
    var muted = elements.video.muted;
    elements.mute.innerHTML = icon(muted ? "muted" : "volume");
    elements.mute.setAttribute("aria-label", muted ? "Turn on game audio" : "Mute game audio");
    elements.audioPrompt.hidden = !muted || !(state.launch && state.launch.live);
  }

  function startKeepalive() {
    if (!state.launch) return;
    var launch = state.launch;
    if (launch.pingTimer) return;
    launch.startedAt = Date.now();

    async function ping() {
      if (state.launch !== launch || !launch.uuid) return;
      try {
        var result = await apiRequest("/cloud/v1/pingSession", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ uuid: launch.uuid })
        }, launch.controller.signal);
        var data = JSON.parse(result.text);
        if (data.session_time_limit_seconds) launch.maxSeconds = Number(data.session_time_limit_seconds);
        launch.pingFailures = 0;
      } catch (error) {
        if (error && error.name === "AbortError") return;
        launch.pingFailures = (launch.pingFailures || 0) + 1;
        if (launch.pingFailures === 2) showToast("Connection warning", "The session keepalive is not reaching the service.");
      }
    }

    ping();
    launch.pingTimer = window.setInterval(ping, 10000);
    launch.clockTimer = window.setInterval(updateSessionClock, 1000);
    updateSessionClock();
  }

  function formatTime(seconds) {
    var whole = Math.max(0, Math.floor(seconds));
    var minutes = Math.floor(whole / 60);
    return minutes + ":" + String(whole % 60).padStart(2, "0");
  }

  function updateSessionClock() {
    var launch = state.launch;
    if (!launch || !launch.startedAt) return;
    var used = (Date.now() - launch.startedAt) / 1000;
    elements.sessionTime.textContent = launch.maxSeconds
      ? formatTime(used) + " / " + formatTime(launch.maxSeconds)
      : formatTime(used) + " connected";
  }

  function sendData(buffer) {
    var channel = state.launch && state.launch.channel;
    if (channel && channel.readyState === "open") channel.send(buffer);
  }

  function videoRect() {
    var rect = elements.video.getBoundingClientRect();
    var videoWidth = elements.video.videoWidth || rect.width || 1;
    var videoHeight = elements.video.videoHeight || rect.height || 1;
    var scale = Math.min(rect.width / videoWidth, rect.height / videoHeight);
    var width = videoWidth * scale;
    var height = videoHeight * scale;
    return { left: rect.left + (rect.width - width) / 2, top: rect.top + (rect.height - height) / 2, width: width, height: height };
  }

  function sendMouse(moveX, moveY, scroll) {
    if (!state.streamFocused) return;
    var rect = videoRect();
    var absoluteX = Math.floor(((state.cursorX - rect.left) / rect.width) * 10000);
    var absoluteY = Math.floor(((state.cursorY - rect.top) / rect.height) * 10000);
    var buffer = new ArrayBuffer(12);
    var view = new DataView(buffer);
    view.setUint8(0, 1);
    view.setUint8(1, 11);
    view.setUint8(2, 2);
    view.setUint8(3, 8);
    view.setUint16(4, Math.max(0, Math.min(10000, absoluteX)));
    view.setUint16(6, Math.max(0, Math.min(10000, absoluteY)));
    view.setInt8(8, Math.max(-127, Math.min(127, moveX || 0)));
    view.setInt8(9, Math.max(-127, Math.min(127, moveY || 0)));
    view.setUint8(10, state.mouseButtons);
    view.setInt8(11, Math.max(-1, Math.min(1, scroll || 0)));
    sendData(buffer);
  }

  function sendKey(code, down) {
    if (down) state.activeKeys.add(code);
    else state.activeKeys.delete(code);
    var buffer = new ArrayBuffer(24);
    var view = new DataView(buffer);
    view.setUint8(0, 1);
    view.setUint8(2, 1);
    view.setUint8(3, 1);
    view.setUint16(4, code);
    view.setUint8(6, down ? 1 : 0);
    var offset = 7;
    state.activeKeys.forEach(function (activeCode) {
      if (activeCode !== code && activeCode > 0 && activeCode < 255 && offset < 21) {
        view.setUint16(offset, activeCode);
        offset += 2;
        view.setUint8(offset, 1);
        offset += 1;
      }
    });
    view.setUint8(offset, 255);
    offset += 1;
    view.setUint8(1, offset - 1);
    sendData(buffer.slice(0, offset));
  }

  function releaseActiveInputs() {
    Array.from(state.activeKeys).forEach(function (code) { sendKey(code, false); });
    state.activeKeys.clear();
    if (elements.touchControls) {
      elements.touchControls.querySelectorAll(".is-pressed").forEach(function (button) {
        button.classList.remove("is-pressed");
        delete button.dataset.touchPointer;
      });
    }
    if (state.mouseButtons) {
      state.mouseButtons = 0;
      sendMouse(0, 0, 0);
    }
  }

  function releaseStreamFocus(showMessage) {
    releaseActiveInputs();
    state.streamFocused = false;
    window.clearTimeout(state.escapeTimer);
    state.escapeTimer = 0;
    if (document.pointerLockElement === elements.video) document.exitPointerLock();
    if (navigator.keyboard && navigator.keyboard.unlock) navigator.keyboard.unlock();
    if (showMessage) showToast("Controls released", "Click the game to capture controls again.");
  }

  function requestVideoPointerLock() {
    if (!(state.launch && state.launch.live && state.launch.channel && state.launch.cursorHidden)) return;
    if (document.pointerLockElement === elements.video || !elements.video.requestPointerLock) return;
    try {
      var lockResult = elements.video.requestPointerLock();
      if (lockResult && lockResult.catch) lockResult.catch(function () {});
    } catch (_error) {}
  }

  var GAMEPAD_MASK = [4096, 8192, 16384, 32768, 256, 512, 0, 0, 32, 16, 64, 128, 1, 2, 4, 8, 0];

  function gamepadLoop() {
    if (!state.launch || !state.launch.live) {
      state.gamepadFrame = 0;
      return;
    }
    var gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (var padIndex = 0; padIndex < gamepads.length; padIndex += 1) {
      var gamepad = gamepads[padIndex];
      if (!gamepad) continue;
      var mask = 0;
      var leftTrigger = 0;
      var rightTrigger = 0;
      for (var buttonIndex = 0; buttonIndex < Math.min(gamepad.buttons.length, 17); buttonIndex += 1) {
        var button = gamepad.buttons[buttonIndex];
        var pressed = typeof button === "object" ? button.pressed : button > 0;
        var value = typeof button === "object" ? button.value : Number(button) || 0;
        if (!pressed) continue;
        if (buttonIndex === 6) leftTrigger = Math.round(value * 255);
        else if (buttonIndex === 7) rightTrigger = Math.round(value * 255);
        else mask |= GAMEPAD_MASK[buttonIndex];
      }
      var axes = gamepad.axes || [];
      var buffer = new ArrayBuffer(17);
      var view = new DataView(buffer);
      view.setUint8(0, 1);
      view.setUint8(1, 16);
      view.setUint8(2, 3);
      view.setUint8(3, 2);
      view.setUint8(4, padIndex);
      view.setUint16(5, mask);
      view.setUint8(7, leftTrigger);
      view.setUint8(8, rightTrigger);
      view.setInt16(9, Math.round(32767 * (axes[0] || 0)));
      view.setInt16(11, Math.round(-32767 * (axes[1] || 0)));
      view.setInt16(13, Math.round(32767 * (axes[2] || 0)));
      view.setInt16(15, Math.round(-32767 * (axes[3] || 0)));
      sendData(buffer);
    }
    state.gamepadFrame = window.requestAnimationFrame(gamepadLoop);
  }

  function beginInput() {
    if (!state.gamepadFrame) state.gamepadFrame = window.requestAnimationFrame(gamepadLoop);
  }

  function stopInput() {
    releaseStreamFocus(false);
    if (state.gamepadFrame) window.cancelAnimationFrame(state.gamepadFrame);
    state.gamepadFrame = 0;
  }

  async function startSession(game) {
    if (!game || state.launch) return;
    var settings = serviceSettings();
    if (!settings.key) {
      state.pendingLaunch = game;
      openSettings("Add your Stratus server endpoint to start " + game.name + ".");
      return;
    }
    closeDialog(elements.detailsDialog);
    recordRecent(game.key);
    var launch = {
      game: game,
      uuid: "",
      controller: new AbortController(),
      socket: null,
      peer: null,
      channel: null,
      pingTimer: 0,
      clockTimer: 0,
      live: false,
      pingFailures: 0,
      maxSeconds: 0,
      startedAt: 0,
      remoteCandidates: [],
      remoteDescriptionReady: false,
      disconnectTimer: 0,
      cursorUrl: "",
      cursorHidden: false
    };
    state.launch = launch;
    setStageVisible(true);
    elements.placeholder.hidden = false;
    var launchLoader = elements.placeholder.querySelector(".loader");
    if (launchLoader) launchLoader.hidden = false;
    elements.video.muted = true;
    syncMuteControls();
    elements.streamGame.textContent = game.name;
    elements.sessionTime.textContent = "Connecting";
    updateLaunch("Starting cloud session", "Preparing " + game.name + ".", 6);

    try {
      var session = await createCloudSession(game, launch.controller.signal);
      if (state.launch !== launch) return;
      launch.uuid = session.uuid;
      if (session.status === "queue") session = await waitForQueue(session, launch.controller.signal);
      if (state.launch !== launch) return;
      if (session.status !== "finished_queue") throw new Error("The cloud rig did not become ready.");
      var config = await startRemoteGame(session.uuid, launch.controller.signal);
      if (state.launch !== launch) return;
      launch.maxSeconds = Number(config.max_seconds) || 0;
      startKeepalive();
      updateLaunch("Connecting video", "Waiting for the first frame from the cloud rig.", 95);
      await connectStream(config, launch.controller.signal);
      if (state.launch !== launch) return;
      launch.live = true;
      elements.placeholder.hidden = true;
      syncMuteControls();
      elements.video.play().catch(function () {});
      state.tested = true;
      state.testedConfig = settingsFingerprint(settings);
      updateServiceStatus("ready", "Connected");
      postVideoState(true);
      beginInput();
    } catch (error) {
      if (error && error.name === "AbortError") return;
      if (state.launch !== launch) return;
      var errorMessage = error && error.message || "The cloud service returned an unknown error.";
      cleanupLaunch(true);
      updateServiceStatus("error", "Offline");
      setStageVisible(true);
      elements.placeholder.hidden = false;
      updateLaunch("Session could not start", errorMessage, 100);
      var loader = elements.placeholder.querySelector(".loader");
      if (loader) loader.hidden = true;
      showToast("Cloud launch failed", errorMessage);
    }
  }

  function remoteSessionEnded() {
    if (!state.launch || !state.launch.live) return;
    cleanupLaunch(true);
    setStageVisible(true);
    elements.placeholder.hidden = false;
    updateLaunch("Session ended", "The cloud service closed the stream.", 100);
    var loader = elements.placeholder.querySelector(".loader");
    if (loader) loader.hidden = true;
  }

  function cleanupLaunch(sendQuit) {
    var launch = state.launch;
    if (!launch) {
      setStageVisible(false);
      elements.audioPrompt.hidden = true;
      var idleLoader = elements.placeholder.querySelector(".loader");
      if (idleLoader) idleLoader.hidden = false;
      return;
    }
    launch.controller.abort();
    window.clearInterval(launch.pingTimer);
    window.clearInterval(launch.clockTimer);
    window.clearTimeout(launch.disconnectTimer);
    stopInput();
    state.launch = null;
    try { if (launch.channel) launch.channel.close(); } catch (_error) {}
    try { if (launch.peer) launch.peer.close(); } catch (_error) {}
    try { if (launch.socket) launch.socket.close(1000, "closed"); } catch (_error) {}
    postVideoState(false);
    elements.video.pause();
    elements.video.srcObject = null;
    elements.video.style.cursor = "default";
    if (launch.cursorUrl) URL.revokeObjectURL(launch.cursorUrl);
    setStageVisible(false);
    elements.placeholder.hidden = false;
    var loader = elements.placeholder.querySelector(".loader");
    if (loader) loader.hidden = false;

    if (sendQuit && launch.uuid) {
      apiRequest("/cloud/v1/quitSession", {
        method: "POST",
        keepalive: true,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ uuid: launch.uuid })
      }).catch(function () {});
    }
  }

  function handleGridAction(event) {
    var action = event.target.closest("[data-action]");
    if (!action) return;
    var card = action.closest("[data-key]");
    var game = card && state.gamesByKey.get(card.dataset.key);
    if (!game) return;
    if (action.dataset.action === "favorite") toggleFavorite(game.key);
    else if (action.dataset.action === "play") startSession(game);
    else openDetails(game);
  }

  function bindEvents() {
    document.querySelectorAll("[data-view-link]").forEach(function (link) {
      link.addEventListener("click", function (event) {
        event.preventDefault();
        changeView(link.dataset.viewLink);
      });
    });
    elements.viewButtons.forEach(function (button) {
      button.addEventListener("click", function (event) {
        event.preventDefault();
        changeView(button.dataset.view);
      });
    });
    elements.search.addEventListener("input", function () {
      state.query = elements.search.value.trim();
      state.visible = PAGE_SIZE;
      elements.searchClear.hidden = !state.query;
      renderCatalog();
    });
    elements.searchClear.addEventListener("click", function () {
      elements.search.value = "";
      state.query = "";
      state.visible = PAGE_SIZE;
      elements.searchClear.hidden = true;
      elements.search.focus();
      renderCatalog();
    });
    elements.sort.addEventListener("change", function () {
      state.sort = elements.sort.value;
      state.visible = PAGE_SIZE;
      renderCatalog();
    });
    elements.categories.addEventListener("click", function (event) {
      var button = event.target.closest("[data-category]");
      if (!button) return;
      state.category = button.dataset.category;
      state.visible = PAGE_SIZE;
      renderCategories();
      renderCatalog();
    });
    elements.grid.addEventListener("click", handleGridAction);
    elements.loadMore.addEventListener("click", function () {
      state.visible += PAGE_SIZE;
      renderCatalog();
    });
    elements.heroPlay.addEventListener("click", function () { startSession(state.hero); });
    elements.heroDetails.addEventListener("click", function () { openDetails(state.hero); });
    elements.detailsPlay.addEventListener("click", function () { startSession(state.selected); });
    elements.detailsFavorite.addEventListener("click", function () { if (state.selected) toggleFavorite(state.selected.key); });
    document.querySelectorAll("[data-open-settings]").forEach(function (button) { button.addEventListener("click", function () { openSettings(); }); });
    document.querySelector("[data-close-details]").addEventListener("click", function () { closeDialog(elements.detailsDialog); });
    function cancelSettings() {
      state.pendingLaunch = null;
      closeDialog(elements.settingsDialog);
    }
    document.querySelector("[data-close-settings]").addEventListener("click", cancelSettings);
    elements.detailsDialog.addEventListener("click", function (event) { if (event.target === elements.detailsDialog) closeDialog(elements.detailsDialog); });
    elements.settingsDialog.addEventListener("click", function (event) { if (event.target === elements.settingsDialog) cancelSettings(); });
    elements.settingsDialog.addEventListener("cancel", function () { state.pendingLaunch = null; });
    elements.testConnection.addEventListener("click", testConnection);
    elements.settingsForm.addEventListener("submit", function (event) {
      event.preventDefault();
      try {
        var settings = saveSettings();
        closeDialog(elements.settingsDialog);
        showToast("Connection saved", state.tested ? "NEO Cloud is ready to launch." : "NEO Cloud will test it when a game launches.");
        var pending = state.pendingLaunch;
        state.pendingLaunch = null;
        if (pending) startSession(pending);
      } catch (error) {
        setConnectionResult(error.message, true);
      }
    });
    elements.audioPrompt.addEventListener("click", function () {
      elements.video.muted = false;
      elements.video.play().catch(function () {});
      syncMuteControls();
      postVideoState(true);
    });
    elements.mute.addEventListener("click", function () {
      elements.video.muted = !elements.video.muted;
      syncMuteControls();
      postVideoState(Boolean(state.launch && state.launch.live));
    });
    elements.fullscreen.addEventListener("click", function () {
      if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
      else elements.stage.requestFullscreen().catch(function () { showToast("Full screen blocked", "Use the NEO OS window full-screen button instead."); });
    });
    elements.exit.addEventListener("click", function () { cleanupLaunch(true); });
    elements.video.addEventListener("click", function () {
      if (!(state.launch && state.launch.live && state.launch.channel)) return;
      state.streamFocused = true;
      if (navigator.keyboard && navigator.keyboard.lock) {
        try {
          var lockResult = navigator.keyboard.lock();
          if (lockResult && lockResult.catch) lockResult.catch(function () {});
        } catch (_error) {}
      }
      requestVideoPointerLock();
    });
    document.addEventListener("click", function (event) {
      if (state.streamFocused && event.target !== elements.video && !event.target.closest("[data-stream-touch-controls], .stream-toolbar, [data-audio-prompt]")) releaseStreamFocus(false);
    });

    var activeTouchPointer = null;
    var activeTouchPoint = null;
    elements.video.addEventListener("pointerdown", function (event) {
      if ((event.pointerType !== "touch" && event.pointerType !== "pen") || !(state.launch && state.launch.live && state.launch.channel)) return;
      state.streamFocused = true;
      activeTouchPointer = event.pointerId;
      activeTouchPoint = { x: event.clientX, y: event.clientY };
      state.cursorX = event.clientX;
      state.cursorY = event.clientY;
      state.mouseButtons = 1;
      sendMouse(0, 0, 0);
      try { elements.video.setPointerCapture(event.pointerId); } catch (_error) {}
      event.preventDefault();
    }, { passive: false });
    elements.video.addEventListener("pointermove", function (event) {
      if (event.pointerId !== activeTouchPointer || !activeTouchPoint) return;
      var moveX = event.clientX - activeTouchPoint.x;
      var moveY = event.clientY - activeTouchPoint.y;
      state.cursorX = event.clientX;
      state.cursorY = event.clientY;
      activeTouchPoint = { x: event.clientX, y: event.clientY };
      sendMouse(moveX, moveY, 0);
      event.preventDefault();
    }, { passive: false });
    function endTouchPointer(event) {
      if (event.pointerId !== activeTouchPointer) return;
      state.cursorX = event.clientX || state.cursorX;
      state.cursorY = event.clientY || state.cursorY;
      state.mouseButtons = 0;
      sendMouse(0, 0, 0);
      activeTouchPointer = null;
      activeTouchPoint = null;
    }
    elements.video.addEventListener("pointerup", endTouchPointer);
    elements.video.addEventListener("pointercancel", endTouchPointer);
    elements.video.addEventListener("lostpointercapture", endTouchPointer);

    if (elements.touchControls) {
      elements.touchControls.addEventListener("pointerdown", function (event) {
        var button = event.target.closest("[data-touch-key]");
        if (!button || !(state.launch && state.launch.live && state.launch.channel)) return;
        var code = Number(button.dataset.touchKey);
        state.streamFocused = true;
        button.classList.add("is-pressed");
        button.dataset.touchPointer = String(event.pointerId);
        try { button.setPointerCapture(event.pointerId); } catch (_error) {}
        sendKey(code, true);
        event.preventDefault();
        event.stopPropagation();
      }, { passive: false });
      function releaseTouchKey(event) {
        var button = event.target.closest && event.target.closest("[data-touch-key]");
        if (!button || button.dataset.touchPointer !== String(event.pointerId)) return;
        button.classList.remove("is-pressed");
        delete button.dataset.touchPointer;
        sendKey(Number(button.dataset.touchKey), false);
        event.preventDefault();
        event.stopPropagation();
      }
      elements.touchControls.addEventListener("pointerup", releaseTouchKey);
      elements.touchControls.addEventListener("pointercancel", releaseTouchKey);
      elements.touchControls.addEventListener("lostpointercapture", releaseTouchKey);
      elements.touchControls.addEventListener("contextmenu", function (event) { event.preventDefault(); });
    }
    document.addEventListener("mousemove", function (event) {
      if (document.pointerLockElement === elements.video) {
        var rect = videoRect();
        state.virtualX = Math.max(rect.left, Math.min(rect.left + rect.width, state.virtualX + (event.movementX || 0)));
        state.virtualY = Math.max(rect.top, Math.min(rect.top + rect.height, state.virtualY + (event.movementY || 0)));
        state.cursorX = state.virtualX;
        state.cursorY = state.virtualY;
      } else {
        state.cursorX = event.clientX;
        state.cursorY = event.clientY;
      }
      if (state.streamFocused && (document.pointerLockElement === elements.video || event.target === elements.video)) {
        sendMouse(event.movementX || 0, event.movementY || 0, 0);
      }
    });
    document.addEventListener("mousedown", function (event) {
      if (!state.streamFocused) return;
      if (document.pointerLockElement !== elements.video && event.target !== elements.video) return;
      requestVideoPointerLock();
      state.mouseButtons = event.buttons;
      sendMouse(0, 0, 0);
    });
    document.addEventListener("mouseup", function (event) {
      if (!state.streamFocused) return;
      if (document.pointerLockElement !== elements.video && event.target !== elements.video && !state.mouseButtons) return;
      state.mouseButtons = event.buttons;
      sendMouse(0, 0, 0);
    });
    elements.video.addEventListener("wheel", function (event) {
      if (!state.streamFocused) return;
      event.preventDefault();
      sendMouse(0, 0, event.deltaY > 0 ? -1 : 1);
    }, { passive: false });
    document.addEventListener("contextmenu", function (event) {
      if (state.streamFocused && (document.pointerLockElement === elements.video || event.target === elements.video)) event.preventDefault();
    });
    document.addEventListener("pointerlockchange", function () {
      if (document.pointerLockElement !== elements.video) return;
      var rect = videoRect();
      state.virtualX = Math.max(rect.left, Math.min(rect.left + rect.width, state.cursorX || rect.left + rect.width / 2));
      state.virtualY = Math.max(rect.top, Math.min(rect.top + rect.height, state.cursorY || rect.top + rect.height / 2));
    });
    document.addEventListener("keydown", function (event) {
      if (!state.streamFocused) {
        if (!elements.stage.hidden) return;
        if (event.key === "/" && document.activeElement !== elements.search) {
          event.preventDefault();
          elements.search.focus();
        }
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (event.repeat) return;
      var keyCode = event.keyCode || event.which || 0;
      if (event.key === "Escape" && !state.escapeTimer) {
        state.escapeTimer = window.setTimeout(function () {
          releaseStreamFocus(true);
        }, 1200);
      }
      sendKey(keyCode, true);
    }, true);
    document.addEventListener("keyup", function (event) {
      if (!state.streamFocused) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.key === "Escape") {
        window.clearTimeout(state.escapeTimer);
        state.escapeTimer = 0;
      }
      sendKey(event.keyCode || event.which || 0, false);
    }, true);
    window.addEventListener("message", function (event) {
      var message = event.data;
      if (!message || message.type !== "neo-shell:performance-mode") return;
      var mode = ["normal", "performance", "ultimate"].indexOf(message.mode) === -1 ? "normal" : message.mode;
      document.documentElement.dataset.neoPerformanceMode = mode;
      PAGE_SIZE = mode === "ultimate" ? 16 : 24;
      state.visible = PAGE_SIZE;
      if (state.games.length) renderCatalog();
    });
    window.addEventListener("blur", function () {
      if (!state.streamFocused) return;
      releaseStreamFocus(false);
    });
    window.addEventListener("pagehide", function () { cleanupLaunch(true); });
  }

  function init() {
    bindEvents();
    var settings = serviceSettings();
    updateServiceStatus(settings.key ? "ready" : "idle", settings.key ? "Configured" : "Setup needed");
    loadCatalog();
  }

  init();
})();
