(function () {
  "use strict";

  var config = window.NEO_GAMES_CONFIG || {};
  var pageSize = Math.max(12, Number(config.pageSize) || 48);
  var imageBatchSize = Math.max(1, Number(config.imageBatchSize) || 8);
  var searchDelay = Math.max(100, Number(config.searchDelay) || 300);
  var providerLabel = String(config.providerLabel || "Fern");
  var favoritesKey = "neo_games_fern_favorites_v1";
  var statsKey = "neo_games_fern_stats_v1";
  var recentKey = "neo_games_fern_recent_v1";
  var localGamesKey = "neo_games_local_library_v1";
  var localGameDbName = "neo-local-games-v1";
  var localGameStoreName = "files";
  var shellOrigin = "*";

  var state = {
    ready: false,
    fernReady: false,
    fernError: "",
    fernTotal: 0,
    fernPages: 1,
    loading: false,
    failed: false,
    games: [],
    total: 0,
    page: 0,
    pages: 1,
    query: "",
    selected: null,
    activeGame: null,
    activeLaunchUrl: "",
    sessionStartedAt: 0,
    requestToken: 0,
    history: [],
    historyIndex: -1,
    favorites: new Set(readStore(favoritesKey, [])),
    stats: readStore(statsKey, {}),
    recent: readStore(recentKey, []),
    localGames: readStore(localGamesKey, []).map(normalizeLocalGame).filter(Boolean),
    gameMap: new Map(),
    imageUrls: new Map(),
    launchUrls: new Map()
  };

  var searchTimer = 0;
  var toastTimer = 0;
  var frameTimer = 0;
  var shortcutTimer = 0;
  var shortcutRequestId = "";
  var gameWindowTimer = 0;
  var gameWindowRequestId = "";
  var steamBootStartedAt = Date.now();
  var steamBootDismissed = false;
  var steamBootFallbackTimer = 0;

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function $$(selector, root) {
    return Array.from((root || document).querySelectorAll(selector));
  }

  function readStore(key, fallback) {
    try {
      var value = JSON.parse(localStorage.getItem(key) || "null");
      return value === null ? fallback : value;
    } catch (_error) {
      return fallback;
    }
  }

  function writeStore(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_error) {}
  }

  function cleanText(value, fallback) {
    var text = String(value == null ? "" : value).replace(/\s+/g, " ").trim();
    return text || fallback || "";
  }

  function safeUrl(value) {
    try {
      var url = new URL(String(value || ""), location.href);
      return /^(https?:)$/i.test(url.protocol) ? url.href : "";
    } catch (_error) {
      return "";
    }
  }

  function normalizeGame(raw, index) {
    raw = raw || {};
    var id = cleanText(raw.id || raw.game_id || raw.slug, "fern-game-" + index);
    return {
      id: id,
      name: cleanText(raw.name || raw.title, "Untitled game"),
      category: cleanText(raw.category || raw.genre || raw.type, "Game"),
      provider: "Fern",
      imageToken: cleanText(raw.image_token || raw.imageToken || raw.image, ""),
      raw: raw
    };
  }

  function normalizeLocalGame(raw, index) {
    raw = raw || {};
    var storageId = String(raw.storageId || raw.id || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 100);
    if (!storageId) return null;
    return {
      id: "local/" + storageId,
      storageId: storageId,
      name: cleanText(raw.name, "Local game " + (Number(index) + 1)),
      category: cleanText(raw.category, "Local game"),
      provider: "Local",
      image: /^data:image\/(?:avif|gif|jpeg|png|webp)(?:;[^,]*)?,/i.test(String(raw.image || "")) ? String(raw.image) : "",
      banner: /^data:image\/(?:avif|gif|jpeg|png|webp)(?:;[^,]*)?,/i.test(String(raw.banner || "")) ? String(raw.banner) : "",
      addedAt: Number(raw.addedAt) || Date.now(),
      isLocal: true,
      raw: raw
    };
  }

  function localGameRecord(game) {
    return {
      storageId: game.storageId,
      name: game.name,
      category: game.category,
      image: game.image || "",
      banner: game.banner || "",
      addedAt: game.addedAt || Date.now()
    };
  }

  function persistLocalGames() {
    writeStore(localGamesKey, state.localGames.map(localGameRecord));
  }

  function filteredLocalGames() {
    var query = cleanText(state.query, "").toLowerCase();
    if (!query) return state.localGames.slice();
    return state.localGames.filter(function (game) {
      return (game.name + " " + game.category).toLowerCase().indexOf(query) !== -1;
    });
  }

  function hydrateLocalGames() {
    state.localGames.forEach(function (game) {
      state.gameMap.set(game.id, game);
      if (game.image) state.imageUrls.set(game.id, game.image);
    });
  }

  function loadScript(url) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = url;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.onload = resolve;
      script.onerror = function () { reject(new Error("Unable to load the Fern runtime")); };
      document.head.appendChild(script);
    });
  }

  async function ensureProviderScript() {
    if (window.Lumin) return;
    var urls = [config.sdk].concat(Array.isArray(config.sdkFallbacks) ? config.sdkFallbacks : []).filter(Boolean);
    var lastError = null;
    for (var index = 0; index < urls.length; index += 1) {
      try {
        await loadScript(urls[index]);
        if (window.Lumin) return;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("The Fern runtime is unavailable");
  }

  async function initializeProvider() {
    await ensureProviderScript();
    if (!window.Lumin || typeof window.Lumin.init !== "function") throw new Error("The Fern runtime did not initialize");
    await new Promise(function (resolve, reject) {
      var settled = false;
      var timer = window.setTimeout(function () {
        if (settled) return;
        settled = true;
        reject(new Error("Fern took too long to respond"));
      }, 18000);
      function finish() {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve();
      }
      function fail(error) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(cleanText(error && error.message, "Fern could not initialize")));
      }
      try {
        var result = window.Lumin.init({ headless: true, onReady: finish, onError: fail });
        if (result && typeof result.then === "function") result.then(finish).catch(fail);
      } catch (error) {
        fail(error);
      }
    });
  }

  function setProviderStatus(message, mode) {
    var status = $("[data-provider-status]");
    status.classList.toggle("is-online", mode === "online");
    status.classList.toggle("is-error", mode === "error");
    status.lastElementChild.textContent = message;
    $("[data-footer-status]").textContent = message;
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    var toast = $("[data-toast]");
    toast.textContent = message;
    toast.hidden = false;
    toastTimer = window.setTimeout(function () { toast.hidden = true; }, 2600);
  }

  function finishSteamBoot() {
    if (steamBootDismissed) return;
    steamBootDismissed = true;
    clearTimeout(steamBootFallbackTimer);
    var bootScreen = $("[data-steam-boot]");
    if (!bootScreen) return;
    var status = $("[data-steam-boot-status]", bootScreen);
    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var minimumDuration = reduceMotion ? 0 : 1450;
    var delay = Math.max(0, minimumDuration - (Date.now() - steamBootStartedAt));
    window.setTimeout(function () {
      if (status) status.textContent = "Library ready";
      bootScreen.classList.add("is-leaving");
      window.setTimeout(function () { bootScreen.hidden = true; }, reduceMotion ? 0 : 480);
    }, delay);
  }

  function formatCategory(value) {
    var text = cleanText(value, "Game");
    return text.replace(/[-_]+/g, " ").replace(/\b\w/g, function (letter) { return letter.toUpperCase(); });
  }

  function formatLastPlayed(timestamp) {
    if (!timestamp) return "Never";
    var date = new Date(timestamp);
    var today = new Date();
    if (date.toDateString() === today.toDateString()) return "Today at " + date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return date.toLocaleDateString([], { month: "short", day: "numeric", year: date.getFullYear() === today.getFullYear() ? undefined : "numeric" });
  }

  function formatPlayTime(seconds) {
    var minutes = Math.floor((Number(seconds) || 0) / 60);
    if (minutes < 1) return seconds > 0 ? "Less than a minute" : "0 minutes";
    if (minutes < 60) return minutes + (minutes === 1 ? " minute" : " minutes");
    var hours = Math.floor(minutes / 60);
    var remainder = minutes % 60;
    return hours + (hours === 1 ? " hour" : " hours") + (remainder ? " " + remainder + " min" : "");
  }

  function getGameStats(game) {
    return state.stats[game.id] || { seconds: 0, lastPlayed: 0 };
  }

  function gameInitial(game) {
    return cleanText(game.name, "G").charAt(0).toUpperCase();
  }

  function createGameListItem(game, favoriteSection) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "game-list-item" + (state.selected && state.selected.id === game.id ? " is-selected" : "");
    button.dataset.openGame = game.id;
    button.dataset.gameId = game.id;
    button.title = game.name;

    var imageUrl = state.imageUrls.get(game.id);
    var icon;
    if (imageUrl) {
      icon = document.createElement("img");
      icon.src = imageUrl;
      icon.alt = "";
      icon.loading = "lazy";
      icon.decoding = "async";
      icon.addEventListener("error", function () {
        var fallback = document.createElement("span");
        fallback.className = "game-icon-fallback";
        fallback.textContent = gameInitial(game);
        icon.replaceWith(fallback);
      }, { once: true });
    } else {
      icon = document.createElement("span");
      icon.className = "game-icon-fallback";
      icon.textContent = gameInitial(game);
    }

    var name = document.createElement("span");
    name.className = "game-name";
    name.textContent = game.name;
    button.append(icon, name);

    if (!favoriteSection && state.favorites.has(game.id)) {
      var star = document.createElement("span");
      star.className = "favorite-star";
      star.textContent = "★";
      star.setAttribute("aria-label", "Favorite");
      button.appendChild(star);
    }
    return button;
  }

  function renderLists() {
    var list = $("[data-game-list]");
    var localList = $("[data-local-list]");
    var favoritesList = $("[data-favorites-list]");
    var fragment = document.createDocumentFragment();
    state.games.forEach(function (game) { fragment.appendChild(createGameListItem(game, false)); });
    list.replaceChildren(fragment);

    var localGames = filteredLocalGames();
    var localFragment = document.createDocumentFragment();
    localGames.forEach(function (game) { localFragment.appendChild(createGameListItem(game, false)); });
    localList.replaceChildren(localFragment);
    $("[data-local-group]").hidden = localGames.length === 0;
    $("[data-local-count]").textContent = localGames.length.toLocaleString();

    var favoriteGames = [];
    state.favorites.forEach(function (id) {
      var game = state.gameMap.get(id);
      if (game) favoriteGames.push(game);
    });
    favoriteGames.sort(function (a, b) { return a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true }); });
    var favoriteFragment = document.createDocumentFragment();
    favoriteGames.forEach(function (game) { favoriteFragment.appendChild(createGameListItem(game, true)); });
    favoritesList.replaceChildren(favoriteFragment);
    $("[data-favorites-group]").hidden = favoriteGames.length === 0;
    $("[data-favorite-count]").textContent = favoriteGames.length.toLocaleString();
    $("[data-loaded-count]").textContent = state.games.length.toLocaleString() + (state.total > state.games.length ? " / " + state.total.toLocaleString() : "");
    $("[data-load-more]").hidden = state.loading || state.page >= state.pages;
    $("[data-list-state]").hidden = state.games.length > 0 && !state.loading;
    if (state.loading) $("[data-list-state]").textContent = state.query ? "Searching the game catalogs…" : "Loading game catalogs…";
    else if (!state.games.length) $("[data-list-state]").textContent = state.query ? "No games match this search." : "No game catalog is available.";
  }

  function updateImageNodes(game, url) {
    $$('[data-game-id]').forEach(function (node) {
      if (node.dataset.gameId !== game.id) return;
      var current = node.firstElementChild;
      if (current && current.tagName === "IMG") {
        current.src = url;
        return;
      }
      var image = document.createElement("img");
      image.src = url;
      image.alt = "";
      image.loading = "lazy";
      image.decoding = "async";
      if (current) current.replaceWith(image); else node.prepend(image);
    });
    if (state.selected && state.selected.id === game.id) updateHeroImage(game);
  }

  async function requestImage(game) {
    if (!game || state.imageUrls.has(game.id)) return;
    try {
      var url = "";
      if (!game.imageToken || !window.Lumin || typeof window.Lumin.getImageUrl !== "function") return;
      var result = await window.Lumin.getImageUrl(game.imageToken);
      url = safeUrl(typeof result === "string" ? result : result && (result.url || result.image_url));
      url = safeUrl(url);
      if (!url) return;
      state.imageUrls.set(game.id, url);
      updateImageNodes(game, url);
    } catch (_error) {}
  }

  async function loadImages(games) {
    for (var index = 0; index < games.length; index += imageBatchSize) {
      await Promise.all(games.slice(index, index + imageBatchSize).map(requestImage));
    }
  }

  function updateHeroImage(game) {
    var backdrop = $("[data-hero-backdrop]");
    var url = game.banner || state.imageUrls.get(game.id);
    backdrop.style.backgroundImage = url ? 'url("' + url.replace(/"/g, "%22") + '")' : "linear-gradient(135deg, #28506d, #151d28 68%)";
  }

  function updateSelectedGame() {
    var game = state.selected;
    $("[data-welcome]").hidden = Boolean(game);
    $("[data-selected-game]").hidden = !game;
    if (!game) return;

    var category = formatCategory(game.category);
    var stats = getGameStats(game);
    $("[data-game-title]").textContent = game.name;
    $("[data-game-category]").textContent = category;
    $("[data-game-status]").textContent = "✓ Ready to play";
    $("[data-last-played]").textContent = formatLastPlayed(stats.lastPlayed);
    $("[data-play-time]").textContent = formatPlayTime(stats.seconds);
    $("[data-about-title]").textContent = game.name + " is ready";
    $("[data-about-copy]").textContent = game.isLocal
      ? "This game was added from your device. Its file, artwork, favorites, recent history, and play time stay in this browser."
      : "Launch this title directly through the Fern game service. Steam keeps your favorites, recent history, and play time on this device.";
    $("[data-meta-category]").textContent = category;
    $("[data-meta-id]").textContent = game.id;
    $("[data-game-source]").textContent = game.provider || providerLabel;
    $("[data-meta-provider]").textContent = game.provider || providerLabel;
    $("[data-remove-local]").hidden = !game.isLocal;
    updateHeroImage(game);
    requestImage(game);

    var favorite = $("[data-favorite]");
    var selected = state.favorites.has(game.id);
    favorite.classList.toggle("is-active", selected);
    favorite.textContent = selected ? "♥" : "♡";
    favorite.title = selected ? "Remove from favorites" : "Add to favorites";
    favorite.setAttribute("aria-label", favorite.title);

    var recent = state.recent.find(function (entry) { return String(entry.id) === game.id; });
    $("[data-recent-row]").hidden = !recent;
    if (recent) $("[data-recent-copy]").textContent = "Last launched " + formatLastPlayed(recent.timestamp).toLowerCase();
  }

  function selectGame(game, options) {
    if (!game) return;
    options = options || {};
    state.selected = game;
    if (!options.fromHistory) {
      state.history = state.history.slice(0, state.historyIndex + 1);
      if (!state.history.length || state.history[state.history.length - 1] !== game.id) state.history.push(game.id);
      state.historyIndex = state.history.length - 1;
    }
    $("[data-history-back]").disabled = state.historyIndex <= 0;
    $("[data-history-forward]").disabled = state.historyIndex < 0 || state.historyIndex >= state.history.length - 1;
    $("[data-home].library-home").classList.remove("is-active");
    renderLists();
    updateSelectedGame();
  }

  async function fetchGames(page, query, append) {
    if (state.loading) return;
    state.loading = true;
    state.failed = false;
    state.query = query;
    var token = ++state.requestToken;
    renderLists();
    try {
      var response = null;
      var fernError = null;
      if (state.fernReady && window.Lumin && typeof window.Lumin.getGames === "function") {
        try {
          var options = { page: page, limit: pageSize };
          if (query) options.q = query;
          response = await window.Lumin.getGames(options);
        } catch (error) {
          fernError = error;
          state.fernError = cleanText(error && error.message, "Fern is unavailable");
        }
      }
      if (token !== state.requestToken) return;
      var rows = Array.isArray(response && response.games) ? response.games : [];
      var fernGames = rows.map(normalizeGame);
      var games = fernGames;
      games.forEach(function (game) { state.gameMap.set(game.id, game); });
      if (append) {
        var known = new Set(state.games.map(function (game) { return game.id; }));
        games.forEach(function (game) { if (!known.has(game.id)) state.games.push(game); });
      } else {
        state.games = games;
      }
      state.games.sort(function (a, b) { return a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true }); });
      state.page = page;
      state.fernTotal = Number(response && response.total) || (state.fernReady ? fernGames.length : 0);
      state.fernPages = Number(response && response.pages) || Math.max(1, Math.ceil(state.fernTotal / pageSize));
      state.total = state.fernTotal;
      state.pages = state.fernReady ? state.fernPages : 1;
      var combinedTotal = state.total + filteredLocalGames().length;
      $("[data-count]").textContent = combinedTotal.toLocaleString() + " GAMES";
      var sourceParts = [];
      if (state.fernReady) sourceParts.push(state.fernTotal.toLocaleString() + " Fern");
      if (state.localGames.length) sourceParts.push(state.localGames.length.toLocaleString() + " local");
      setProviderStatus(sourceParts.length ? sourceParts.join(" · ") : "Game catalogs unavailable", sourceParts.length ? "online" : "error");
      if (!state.selected && (state.localGames.length || state.games.length)) selectGame(state.localGames[0] || state.games[0]);
      else renderLists();
      loadImages(games);
      if (!games.length && !state.localGames.length && (!state.fernReady || fernError)) {
        throw fernError || new Error(state.fernError || "The Fern catalog could not be reached.");
      }
    } catch (error) {
      if (token !== state.requestToken) return;
      state.failed = true;
      setProviderStatus("Game catalogs are currently unavailable", "error");
      $("[data-list-state]").textContent = cleanText(error && error.message, "The game catalogs could not load.");
      $("[data-list-state]").hidden = false;
      if (!state.games.length) {
        $("[data-welcome] p").textContent = "The game library could not be reached. Check the connection and try again.";
        $("[data-retry]").hidden = false;
      }
    } finally {
      if (token === state.requestToken) {
        state.loading = false;
        renderLists();
      }
    }
  }

  async function boot() {
    state.loading = true;
    renderLists();
    var firstSourceSettled = false;
    async function refreshAfterSource() {
      state.loading = false;
      $("[data-shell]").setAttribute("aria-busy", "false");
      if (!firstSourceSettled) firstSourceSettled = true;
      await fetchGames(1, state.query, false);
      finishSteamBoot();
    }
    initializeProvider().then(function () {
      state.fernReady = true;
      state.fernError = "";
      state.ready = true;
    }).catch(function (error) {
      state.fernError = cleanText(error && error.message, "Fern could not initialize");
    }).finally(refreshAfterSource);
  }

  function toggleFavorite() {
    var game = state.selected;
    if (!game) return;
    if (state.favorites.has(game.id)) state.favorites.delete(game.id); else state.favorites.add(game.id);
    writeStore(favoritesKey, Array.from(state.favorites));
    renderLists();
    updateSelectedGame();
  }

  async function resolveLaunchUrl(game) {
    if (state.launchUrls.has(game.id)) return state.launchUrls.get(game.id);
    if (game.isLocal && game.storageId) {
      var localPlayerUrl = new URL("./local-player.html", document.baseURI);
      localPlayerUrl.searchParams.set("id", game.storageId);
      localPlayerUrl.searchParams.set("name", game.name);
      state.launchUrls.set(game.id, localPlayerUrl.href);
      return localPlayerUrl.href;
    }
    // Snow Rider's legacy Unity player can apply the jump input more than once
    // on high-refresh displays. Run this title through our small compatibility
    // page so its frame clock and repeated jump events are normalized. Other
    // Fern titles continue to use their provider URL unchanged.
    if (String(game.id || "").toLowerCase() === "selenite/snowrider3d") {
      var stableSnowRiderUrl = new URL("./snow-rider-stable.html?build=20260919-jump-fix-v1", document.baseURI).href;
      state.launchUrls.set(game.id, stableSnowRiderUrl);
      return stableSnowRiderUrl;
    }
    if (!window.Lumin || typeof window.Lumin.getGameUrl !== "function") throw new Error("Fern cannot launch this game right now");
    var response = await window.Lumin.getGameUrl(game.id);
    var url = safeUrl(typeof response === "string" ? response : response && response.url);
    if (!url) throw new Error("Fern returned an invalid game URL");
    state.launchUrls.set(game.id, url);
    return url;
  }

  function resetGameFrame(frame) {
    clearTimeout(frameTimer);
    delete frame.dataset.neoGameReady;
    delete frame.dataset.neoGameSource;
    frame.setAttribute("src", "about:blank");
  }

  function showFrameMessage(title, detail, failed) {
    var status = $("[data-frame-status]");
    status.classList.remove("is-ready");
    status.classList.toggle("is-error", Boolean(failed));
    $("strong", status).textContent = title;
    $("small", status).textContent = detail || "";
  }

  function rememberLaunch(game) {
    var now = Date.now();
    state.recent = [{ id: game.id, name: game.name, timestamp: now }].concat(state.recent.filter(function (entry) { return String(entry.id) !== game.id; })).slice(0, 48);
    writeStore(recentKey, state.recent);
    var stats = getGameStats(game);
    state.stats[game.id] = { seconds: Number(stats.seconds) || 0, lastPlayed: now };
    writeStore(statsKey, state.stats);
  }

  async function openGame(game) {
    if (!game) return;
    var playButton = $("[data-play]");
    playButton.disabled = true;
    $("[data-game-status]").textContent = "Requesting launch URL…";
    try {
      var launchUrl = await resolveLaunchUrl(game);
      state.activeGame = game;
      state.activeLaunchUrl = launchUrl;
      state.sessionStartedAt = Date.now();
      rememberLaunch(game);
      if (isEmbedded()) {
        clearTimeout(gameWindowTimer);
        gameWindowRequestId = "game-window-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
        window.parent.postMessage({
          type: "neo-shell:open-game-window",
          id: gameWindowRequestId,
          game: {
            id: game.id,
            title: game.name,
            url: launchUrl,
            icon: state.imageUrls.get(game.id) || "",
            mode: "direct-game"
          }
        }, shellOrigin);
        $("[data-game-status]").textContent = "Opening in a separate window…";
        gameWindowTimer = window.setTimeout(function () {
          if (!gameWindowRequestId) return;
          gameWindowRequestId = "";
          openInlineGame(game, launchUrl);
          showToast("The OS window did not answer, so the game opened here instead.");
        }, 8000);
        return;
      }
      openInlineGame(game, launchUrl);
    } catch (error) {
      showToast(cleanText(error && error.message, "This game could not be launched."));
      $("[data-game-status]").textContent = "Launch unavailable";
    } finally {
      playButton.disabled = false;
    }
  }

  function openInlineGame(game, launchUrl) {
      var frame = $("[data-game-frame]");
      resetGameFrame(frame);
      $("[data-player-title]").textContent = game.name;
      var shortcutButton = $("[data-player-pin]");
      shortcutButton.disabled = false;
      shortcutButton.textContent = "Add to taskbar";
      $("[data-player]").hidden = false;
      document.documentElement.classList.add("is-playing");
      showFrameMessage("Launching " + game.name, game.isLocal ? "Opening the saved local game…" : "Loading directly from Fern…", false);
      frame.dataset.neoGameSource = launchUrl;
      frame.setAttribute("src", launchUrl);
      frameTimer = window.setTimeout(function () {
        if (frame.dataset.neoGameReady !== "true") showFrameMessage("Still loading " + game.name, "The game service is taking longer than usual.", false);
      }, 12000);
  }

  function recordSession() {
    if (!state.activeGame || !state.sessionStartedAt) return;
    var elapsed = Math.max(1, Math.round((Date.now() - state.sessionStartedAt) / 1000));
    var stats = getGameStats(state.activeGame);
    state.stats[state.activeGame.id] = { seconds: (Number(stats.seconds) || 0) + elapsed, lastPlayed: Number(stats.lastPlayed) || Date.now() };
    writeStore(statsKey, state.stats);
    state.sessionStartedAt = 0;
  }

  function closeGame() {
    exitPlayerFullscreen();
    recordSession();
    resetGameFrame($("[data-game-frame]"));
    clearTimeout(shortcutTimer);
    shortcutRequestId = "";
    try { if (window.Lumin && typeof window.Lumin.endGame === "function") window.Lumin.endGame(); } catch (_error) {}
    var selected = state.activeGame;
    state.activeGame = null;
    state.activeLaunchUrl = "";
    $("[data-player]").hidden = true;
    document.documentElement.classList.remove("is-playing");
    if (selected) selectGame(selected, { fromHistory: true });
  }

  function exitPlayerFullscreen() {
    var fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
    if (!fullscreenElement) return;
    var exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (typeof exit !== "function") return;
    try {
      var result = exit.call(document);
      if (result && typeof result.catch === "function") result.catch(function () {});
    } catch (_error) {}
  }

  function refreshGame() {
    if (!state.activeLaunchUrl) return;
    var frame = $("[data-game-frame]");
    var url = state.activeLaunchUrl;
    resetGameFrame(frame);
    showFrameMessage("Reloading " + state.activeGame.name, state.activeGame.isLocal ? "Opening the saved local game…" : "Loading directly from Fern…", false);
    window.setTimeout(function () {
      frame.dataset.neoGameSource = url;
      frame.setAttribute("src", url);
    }, 40);
  }

  function isEmbedded() {
    try { return window.parent && window.parent !== window; } catch (_error) { return true; }
  }

  async function addGameToTaskbar(game) {
    game = game || state.activeGame || state.selected;
    if (!game) return;
    if (!isEmbedded()) {
      showToast("Open Steam inside NEO OS to add a taskbar shortcut.");
      return;
    }
    var button = state.activeGame ? $("[data-player-pin]") : $("[data-detail-pin]");
    try {
      var launchUrl = await resolveLaunchUrl(game);
      clearTimeout(shortcutTimer);
      shortcutRequestId = "game-shortcut-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      button.disabled = true;
      if (button === $("[data-player-pin]")) button.textContent = "Adding…";
      window.parent.postMessage({
        type: "neo-shell:add-game-shortcut",
        id: shortcutRequestId,
        game: {
          title: game.name,
          url: launchUrl,
          icon: state.imageUrls.get(game.id) || "",
          mode: "direct-game"
        }
      }, shellOrigin);
      shortcutTimer = window.setTimeout(function () {
        if (!shortcutRequestId) return;
        shortcutRequestId = "";
        button.disabled = false;
        if (button === $("[data-player-pin]")) button.textContent = "Try again";
        showToast("NEO OS did not answer. Try adding the shortcut again.");
      }, 8000);
    } catch (error) {
      button.disabled = false;
      showToast(cleanText(error && error.message, "This shortcut could not be created."));
    }
  }

  function handleShellShortcutResult(event) {
    if (event.source !== window.parent) return;
    var data = event.data;
    if (!data || data.type !== "neo-shell:add-game-shortcut-result" || data.id !== shortcutRequestId) return;
    clearTimeout(shortcutTimer);
    shortcutRequestId = "";
    var button = state.activeGame ? $("[data-player-pin]") : $("[data-detail-pin]");
    button.disabled = false;
    if (data.ok) {
      if (button === $("[data-player-pin]")) button.textContent = "Added";
      showToast(gameTitleForShortcut() + " was added to the taskbar and home screen.");
    } else {
      if (button === $("[data-player-pin]")) button.textContent = "Try again";
      showToast(cleanText(data.error, "The shortcut could not be added."));
    }
  }

  function handleShellGameWindow(event) {
    if (event.source !== window.parent) return;
    var data = event.data;
    if (!data || typeof data !== "object") return;
    if (data.type === "neo-shell:open-game-window-result" && data.id === gameWindowRequestId) {
      clearTimeout(gameWindowTimer);
      gameWindowRequestId = "";
      if (data.ok) {
        $("[data-game-status]").textContent = "Running in a separate window";
        showToast((state.activeGame ? state.activeGame.name : "Game") + " opened in its own window.");
      } else {
        var game = state.activeGame;
        var launchUrl = state.activeLaunchUrl;
        if (game && launchUrl) openInlineGame(game, launchUrl);
        showToast(cleanText(data.error, "The separate game window could not be opened."));
      }
      return;
    }
    if (data.type !== "neo-shell:game-window-closed") return;
    if (!state.activeGame || (data.gameId && String(data.gameId) !== String(state.activeGame.id))) return;
    recordSession();
    try { if (window.Lumin && typeof window.Lumin.endGame === "function") window.Lumin.endGame(); } catch (_error) {}
    state.activeGame = null;
    state.activeLaunchUrl = "";
    $("[data-game-status]").textContent = "✓ Ready to play";
  }

  function gameTitleForShortcut() {
    return (state.activeGame || state.selected || { name: "Game" }).name;
  }

  function setGroupExpanded(button, expanded) {
    button.setAttribute("aria-expanded", expanded ? "true" : "false");
  }

  function goHome() {
    if (state.localGames.length || state.games.length) selectGame(state.localGames[0] || state.games[0]);
    $("[data-home].library-home").classList.add("is-active");
  }

  function navigateHistory(direction) {
    var next = state.historyIndex + direction;
    if (next < 0 || next >= state.history.length) return;
    state.historyIndex = next;
    var game = state.gameMap.get(state.history[next]);
    if (game) selectGame(game, { fromHistory: true });
  }

  function openLocalGameDatabase() {
    return new Promise(function (resolve, reject) {
      var request = indexedDB.open(localGameDbName, 1);
      request.onupgradeneeded = function () {
        if (!request.result.objectStoreNames.contains(localGameStoreName)) request.result.createObjectStore(localGameStoreName);
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error || new Error("Local game storage is unavailable.")); };
    });
  }

  async function saveLocalGameFile(id, file) {
    var database = await openLocalGameDatabase();
    await new Promise(function (resolve, reject) {
      var transaction = database.transaction(localGameStoreName, "readwrite");
      transaction.objectStore(localGameStoreName).put(file, id);
      transaction.oncomplete = resolve;
      transaction.onerror = function () { reject(transaction.error || new Error("The game file could not be saved.")); };
      transaction.onabort = transaction.onerror;
    });
    database.close();
  }

  async function deleteLocalGameFile(id) {
    var database = await openLocalGameDatabase();
    await new Promise(function (resolve, reject) {
      var transaction = database.transaction(localGameStoreName, "readwrite");
      transaction.objectStore(localGameStoreName).delete(id);
      transaction.oncomplete = resolve;
      transaction.onerror = function () { reject(transaction.error || new Error("The local game file could not be removed.")); };
      transaction.onabort = transaction.onerror;
    });
    database.close();
  }

  async function imageFileToDataUrl(file, width, height, quality) {
    if (!file) return "";
    var bitmap = await createImageBitmap(file);
    var canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    var context = canvas.getContext("2d", { alpha: false });
    context.fillStyle = "#172230";
    context.fillRect(0, 0, width, height);
    var scale = Math.max(width / bitmap.width, height / bitmap.height);
    var drawWidth = bitmap.width * scale;
    var drawHeight = bitmap.height * scale;
    context.drawImage(bitmap, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
    bitmap.close();
    return canvas.toDataURL("image/webp", quality || .82);
  }

  function resetLocalGameForm() {
    var form = $("[data-local-form]");
    form.reset();
    $("[data-local-error]").hidden = true;
    $("[data-local-cover-preview]").replaceChildren(Object.assign(document.createElement("span"), { innerHTML: "GAME<br>ART" }));
    $("[data-local-submit]").disabled = false;
    $("[data-local-submit]").textContent = "Add to library";
  }

  function openLocalGameDialog() {
    resetLocalGameForm();
    $("[data-local-dialog]").showModal();
    window.setTimeout(function () { $("[data-local-name]").focus(); }, 30);
  }

  function closeLocalGameDialog() {
    var dialog = $("[data-local-dialog]");
    if (dialog.open) dialog.close();
  }

  async function addLocalGame(event) {
    event.preventDefault();
    var name = cleanText($("[data-local-name]").value, "").slice(0, 64);
    var category = cleanText($("[data-local-category]").value, "Local game").slice(0, 36);
    var gameFile = $("[data-local-file]").files[0];
    var coverFile = $("[data-local-cover]").files[0];
    var bannerFile = $("[data-local-banner]").files[0];
    var errorNode = $("[data-local-error]");
    var submit = $("[data-local-submit]");
    function fail(message) {
      errorNode.textContent = message;
      errorNode.hidden = false;
    }
    if (!name) { fail("Enter a name for the game."); return; }
    if (!gameFile || !/\.html?$/i.test(gameFile.name)) { fail("Choose an HTML game file."); return; }
    if (gameFile.size > 16 * 1024 * 1024) { fail("Choose an HTML game smaller than 16 MB."); return; }
    submit.disabled = true;
    submit.textContent = "Adding…";
    errorNode.hidden = true;
    var storageId = "game-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    try {
      var images = await Promise.all([
        coverFile ? imageFileToDataUrl(coverFile, 256, 256, .84) : Promise.resolve(""),
        bannerFile ? imageFileToDataUrl(bannerFile, 1280, 720, .8) : Promise.resolve("")
      ]);
      await saveLocalGameFile(storageId, gameFile);
      var game = normalizeLocalGame({ storageId: storageId, name: name, category: category, image: images[0], banner: images[1] || images[0], addedAt: Date.now() }, 0);
      state.localGames.unshift(game);
      state.gameMap.set(game.id, game);
      if (game.image) state.imageUrls.set(game.id, game.image);
      persistLocalGames();
      closeLocalGameDialog();
      renderLists();
      selectGame(game);
      $("[data-count]").textContent = (state.total + state.localGames.length).toLocaleString() + " GAMES";
      showToast(game.name + " was added to your local library.");
    } catch (error) {
      fail(cleanText(error && error.message, "The local game could not be added."));
    } finally {
      submit.disabled = false;
      submit.textContent = "Add to library";
    }
  }

  async function removeSelectedLocalGame() {
    var game = state.selected;
    if (!game || !game.isLocal) return;
    if (!window.confirm("Remove " + game.name + " from your local library?")) return;
    try { await deleteLocalGameFile(game.storageId); } catch (_error) {}
    state.localGames = state.localGames.filter(function (entry) { return entry.id !== game.id; });
    state.gameMap.delete(game.id);
    state.imageUrls.delete(game.id);
    state.launchUrls.delete(game.id);
    state.favorites.delete(game.id);
    writeStore(favoritesKey, Array.from(state.favorites));
    persistLocalGames();
    state.selected = null;
    renderLists();
    var next = state.localGames[0] || state.games[0] || null;
    if (next) selectGame(next); else updateSelectedGame();
    $("[data-count]").textContent = (state.total + state.localGames.length).toLocaleString() + " GAMES";
    showToast(game.name + " was removed.");
  }

  function bindEvents() {
    document.addEventListener("click", function (event) {
      var gameButton = event.target.closest("[data-open-game]");
      if (gameButton) {
        selectGame(state.gameMap.get(gameButton.dataset.openGame));
        return;
      }
      if (event.target.closest("[data-home]")) { goHome(); return; }
      if (event.target.closest("[data-play]")) { openGame(state.selected); return; }
      if (event.target.closest("[data-favorite]")) { toggleFavorite(); return; }
      if (event.target.closest("[data-detail-pin]")) { addGameToTaskbar(state.selected); return; }
      if (event.target.closest("[data-remove-local]")) { removeSelectedLocalGame(); return; }
      if (event.target.closest("[data-add-local]")) { openLocalGameDialog(); return; }
      if (event.target.closest("[data-load-more]")) { fetchGames(state.page + 1, state.query, true); return; }
      if (event.target.closest("[data-retry]")) { location.reload(); return; }
      if (event.target.closest("[data-history-back]")) { navigateHistory(-1); return; }
      if (event.target.closest("[data-history-forward]")) { navigateHistory(1); return; }
      var favoriteToggle = event.target.closest("[data-toggle-favorites]");
      if (favoriteToggle) { setGroupExpanded(favoriteToggle, favoriteToggle.getAttribute("aria-expanded") !== "true"); return; }
      var localToggle = event.target.closest("[data-toggle-local]");
      if (localToggle) { setGroupExpanded(localToggle, localToggle.getAttribute("aria-expanded") !== "true"); return; }
      var libraryToggle = event.target.closest("[data-toggle-library]");
      if (libraryToggle) { setGroupExpanded(libraryToggle, libraryToggle.getAttribute("aria-expanded") !== "true"); return; }
      var menu = event.target.closest("[data-menu]");
      if (menu) showToast(menu.dataset.menu === "help" ? "Choose a game and select Play. Favorites and play time stay on this device." : "The Steam library view is already active.");
    });

    $("[data-local-form]").addEventListener("submit", addLocalGame);
    $$('[data-local-cancel]').forEach(function (button) { button.addEventListener("click", closeLocalGameDialog); });
    $("[data-local-cover]").addEventListener("change", function (event) {
      var file = event.target.files[0];
      var preview = $("[data-local-cover-preview]");
      if (!file) { preview.innerHTML = "<span>GAME<br>ART</span>"; return; }
      var image = document.createElement("img");
      image.alt = "Selected cover preview";
      image.src = URL.createObjectURL(file);
      image.onload = function () { URL.revokeObjectURL(image.src); };
      preview.replaceChildren(image);
    });

    $("[data-search]").addEventListener("input", function (event) {
      clearTimeout(searchTimer);
      var query = cleanText(event.target.value, "");
      searchTimer = window.setTimeout(function () {
        state.loading = false;
        fetchGames(1, query, false);
      }, searchDelay);
    });

    $("[data-library-scroll]").addEventListener("scroll", function (event) {
      var host = event.currentTarget;
      if (!state.loading && state.page < state.pages && host.scrollTop + host.clientHeight >= host.scrollHeight - 160) fetchGames(state.page + 1, state.query, true);
    }, { passive: true });

    $("[data-player-close]").addEventListener("click", closeGame);
    $$("[data-player-close]").slice(1).forEach(function (button) { button.addEventListener("click", closeGame); });
    $("[data-player-refresh]").addEventListener("click", refreshGame);
    $("[data-player-pin]").addEventListener("click", function () { addGameToTaskbar(state.activeGame); });
    $("[data-player-fullscreen]").addEventListener("click", function () {
      var player = $("[data-player]");
      if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
      else player.requestFullscreen().catch(function () {});
    });

    $("[data-game-frame]").addEventListener("load", function (event) {
      var frame = event.currentTarget;
      if (!frame.dataset.neoGameSource || frame.getAttribute("src") === "about:blank") return;
      clearTimeout(frameTimer);
      frame.dataset.neoGameReady = "true";
      $("[data-frame-status]").classList.add("is-ready");
    });

    document.addEventListener("keydown", function (event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        $("[data-search]").focus();
        $("[data-search]").select();
      }
      if (event.key === "Escape" && !$("[data-player]").hidden && !document.fullscreenElement) closeGame();
    });
    window.addEventListener("message", handleShellShortcutResult);
    window.addEventListener("message", handleShellGameWindow);
    window.addEventListener("beforeunload", recordSession);
  }

  window.NEO_GAMES = {
    search: function (query) {
      var value = cleanText(query, "");
      $("[data-search]").value = value;
      state.loading = false;
      return fetchGames(1, value, false);
    },
    favorites: function () { return Array.from(state.favorites); },
    selected: function () { return state.selected ? { id: state.selected.id, name: state.selected.name } : null; },
    reload: function () { return fetchGames(1, state.query, false); }
  };

  hydrateLocalGames();
  bindEvents();
  steamBootFallbackTimer = window.setTimeout(finishSteamBoot, 5000);
  boot();
})();
