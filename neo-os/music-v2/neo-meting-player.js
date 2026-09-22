(function () {
  "use strict";

  var artworkPlaceholder = function (label) {
    var safe = String(label || "Music").replace(/[<>&"']/g, "").slice(0, 24);
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#20242b"/><stop offset="1" stop-color="#0b0c0f"/></linearGradient></defs><rect width="500" height="500" fill="url(#g)"/><circle cx="250" cy="225" r="92" fill="#60a5fa" opacity=".16"/><path d="M285 130v190a58 58 0 1 1-30-51V164l115-24v139a58 58 0 1 1-30-51V130z" fill="#f8fafc"/><text x="250" y="420" fill="#94a3b8" font-family="Arial,sans-serif" font-size="24" text-anchor="middle">' + safe + "</text></svg>";
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  };

  document.addEventListener("error", function (event) {
    var image = event.target;
    if (!(image instanceof HTMLImageElement)) return;
    var card = image.closest(".music-card");
    var id = card && card.dataset.id;
    if (id && image.dataset.artRetry !== "youtube") {
      image.dataset.artRetry = "youtube";
      var youtubeCover = "https://i.ytimg.com/vi/" + encodeURIComponent(id) + "/hqdefault.jpg";
      var covers = window.NEO_MUSIC_COVERS;
      if (covers && typeof covers.set === "function") covers.set(image, youtubeCover);
      else image.src = artworkPlaceholder(image.alt || "Music");
      return;
    }
    if (image.dataset.artRetry !== "placeholder") {
      image.dataset.artRetry = "placeholder";
      image.src = artworkPlaceholder(image.alt || "Music");
    }
  }, true);

  var input = document.getElementById("searchInput");
  var backButton = document.getElementById("npmBackBtn");
  if (backButton) backButton.addEventListener("click", function () { hideNPView(); });
  if (input) input.addEventListener("keydown", function (event) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    clearTimeout(debounceTimer);
    searchVinyl(input.value);
  });

  var trackCache = new Map();
  var playQueue = [];
  var queueIndex = -1;
  var audioExtrasReady = false;
  var storedRepeatMode = localStorage.getItem("music-repeat-mode");
  var legacyAutoplay = localStorage.getItem("music-autoplay");
  var repeatMode = /^(?:off|all|one)$/.test(storedRepeatMode || "")
    ? storedRepeatMode
    : legacyAutoplay === "true" ? "all" : "off";
  var savedVolume = Number(localStorage.getItem("music-volume"));
  if (!Number.isFinite(savedVolume)) savedVolume = Number(localStorage.getItem("volume"));
  savedVolume = Math.max(0, Math.min(1, Number.isFinite(savedVolume) ? savedVolume : 0.8));
  var savedMuted = localStorage.getItem("music-muted") === "true" || localStorage.getItem("muted") === "true";

  function emitState() {
    window.dispatchEvent(new CustomEvent("neo-meting-statechange"));
  }

  function syncRepeatMode() {
    if (audioEl) audioEl.loop = repeatMode === "one";
    var button = document.getElementById("autoplayBtn");
    if (button) {
      var active = repeatMode !== "off";
      var label = repeatMode === "one" ? "Repeat one" : repeatMode === "all" ? "Repeat all" : "Repeat off";
      button.classList.toggle("active", active);
      button.dataset.repeatMode = repeatMode;
      button.setAttribute("aria-label", label);
      button.setAttribute("aria-pressed", String(active));
      button.title = label;
    }
    localStorage.setItem("music-repeat-mode", repeatMode);
    localStorage.setItem("music-autoplay", String(repeatMode !== "off"));
  }

  function setRepeatMode(value) {
    repeatMode = /^(?:off|all|one)$/.test(String(value || "")) ? String(value) : "off";
    syncRepeatMode();
    emitState();
  }

  function cycleRepeatMode() {
    setRepeatMode(repeatMode === "off" ? "all" : repeatMode === "all" ? "one" : "off");
  }

  var originalRenderCard = renderCard;
  renderCard = function (track) {
    trackCache.set(String(track.id), track);
    return originalRenderCard(track);
  };

  var originalPlayTrack = playTrack;
  playTrack = function (track) {
    trackCache.set(String(track.id), track);
    var visible = Array.from(document.querySelectorAll(".music-card[data-id]")).map(function (card) {
      return trackCache.get(String(card.dataset.id));
    }).filter(Boolean);
    if (visible.length) playQueue = visible;
    if (!playQueue.some(function (item) { return String(item.id) === String(track.id); })) playQueue.push(track);
    queueIndex = playQueue.findIndex(function (item) { return String(item.id) === String(track.id); });
    originalPlayTrack(track);
    setupAudioExtras();
    renderQueue();
    emitState();
  };

  function setupAudioExtras() {
    if (!audioEl) return;
    audioEl.crossOrigin = "anonymous";
    audioEl.volume = savedVolume;
    audioEl.muted = savedMuted;
    audioEl.loop = repeatMode === "one";
    if (audioExtrasReady) return;
    audioExtrasReady = true;
    ["play", "playing", "pause", "ended", "timeupdate", "durationchange", "volumechange", "error"].forEach(function (name) {
      audioEl.addEventListener(name, emitState);
    });
    audioEl.addEventListener("ended", function () {
      if (repeatMode === "one") {
        audioEl.currentTime = 0;
        audioEl.play().catch(function () {});
      } else if (repeatMode === "all") {
        playNext();
      }
    });
  }

  function playNext() {
    if (!playQueue.length) return;
    queueIndex = (queueIndex + 1) % playQueue.length;
    playTrack(playQueue[queueIndex]);
  }

  function playPrevious() {
    if (audioEl && audioEl.currentTime > 3) {
      audioEl.currentTime = 0;
      emitState();
      return;
    }
    if (!playQueue.length) return;
    queueIndex = (queueIndex - 1 + playQueue.length) % playQueue.length;
    playTrack(playQueue[queueIndex]);
  }

  function renderQueue() {
    var list = document.getElementById("queueList");
    if (!list) return;
    list.textContent = "";
    playQueue.forEach(function (track, index) {
      var row = document.createElement("div");
      row.className = "queue-item" + (index === queueIndex ? " playing" : "");
      var covers = window.NEO_MUSIC_COVERS;
      var cover = covers ? covers.url(track.thumb) : String(track.thumb || "");
      row.innerHTML = '<img src="' + escapeHtml(covers ? covers.fallback : cover) + '" alt="' + escapeHtml(track.title) + '" decoding="async"><div class="queue-meta"><div class="queue-title">' + escapeHtml(track.title) + '</div><div class="queue-artist">' + escapeHtml(track.artist) + '</div></div><span class="queue-num">' + (index + 1) + "</span>";
      if (covers) covers.set(row.querySelector("img"), track.thumb);
      row.addEventListener("click", function () {
        queueIndex = index;
        playTrack(track);
      });
      list.appendChild(row);
    });
  }

  var volumeSlider = document.getElementById("volumeSlider");
  function setVolume(value) {
    savedVolume = Math.max(0, Math.min(1, Number(value) || 0));
    if (volumeSlider) {
      volumeSlider.value = String(savedVolume);
      volumeSlider.style.setProperty("--volume-pct", (savedVolume * 100) + "%");
    }
    if (audioEl) {
      audioEl.volume = savedVolume;
      if (savedVolume > 0 && audioEl.muted) audioEl.muted = false;
    }
    savedMuted = Boolean(audioEl && audioEl.muted);
    localStorage.setItem("music-volume", String(savedVolume));
    localStorage.setItem("volume", String(savedVolume));
    localStorage.setItem("music-muted", String(savedMuted));
    updateVolumeIcon();
    emitState();
  }

  function updateVolumeIcon() {
    var muted = Boolean(audioEl && audioEl.muted) || savedMuted || savedVolume === 0;
    var button = document.getElementById("muteBtn");
    if (!button) return;
    button.innerHTML = '<i data-lucide="' + (muted ? "volume-x" : savedVolume < 0.5 ? "volume-1" : "volume-2") + '"></i>';
    lucide.createIcons();
  }

  if (volumeSlider) {
    volumeSlider.value = String(savedVolume);
    volumeSlider.style.setProperty("--volume-pct", (savedVolume * 100) + "%");
    volumeSlider.addEventListener("input", function () { setVolume(volumeSlider.value); });
  }

  var muteButton = document.getElementById("muteBtn");
  if (muteButton) muteButton.addEventListener("click", function () {
    setupAudioExtras();
    savedMuted = audioEl ? !audioEl.muted : !savedMuted;
    if (audioEl) audioEl.muted = savedMuted;
    localStorage.setItem("music-muted", String(savedMuted));
    localStorage.setItem("muted", String(savedMuted));
    updateVolumeIcon();
    emitState();
  });

  var nextButton = document.getElementById("npmNextBtn");
  var previousButton = document.getElementById("npmPrevBtn");
  var footerNextButton = document.getElementById("spotifyNextBtn");
  var footerPreviousButton = document.getElementById("spotifyPrevBtn");
  if (nextButton) nextButton.addEventListener("click", playNext);
  if (previousButton) previousButton.addEventListener("click", playPrevious);
  if (footerNextButton) footerNextButton.addEventListener("click", playNext);
  if (footerPreviousButton) footerPreviousButton.addEventListener("click", playPrevious);

  var playerLike = typeof document.querySelector === "function" ? document.querySelector(".player-like") : null;
  if (playerLike) playerLike.addEventListener("click", function () {
    if (currentTrack) toggleFavourite(currentTrack);
  });

  var autoplayButton = document.getElementById("autoplayBtn");
  if (autoplayButton) {
    syncRepeatMode();
    autoplayButton.addEventListener("click", cycleRepeatMode);
  }

  var queuePanel = document.getElementById("queuePanel");
  var queueButton = document.getElementById("queueBtn");
  var queueCloseButton = document.getElementById("queueCloseBtn");
  if (queueButton) queueButton.addEventListener("click", function () {
    renderQueue();
    queuePanel.classList.toggle("visible");
  });
  if (queueCloseButton) queueCloseButton.addEventListener("click", function () { queuePanel.classList.remove("visible"); });

  window.__NEO_METING_PLAYER__ = Object.freeze({
    media: function () { setupAudioExtras(); return audioEl || null; },
    track: function () { return currentTrack || null; },
    queue: function () { return playQueue.slice(); },
    next: playNext,
    previous: playPrevious,
    play: function () { setupAudioExtras(); return audioEl ? audioEl.play() : Promise.resolve(); },
    pause: function () { if (audioEl) audioEl.pause(); },
    toggle: function () {
      setupAudioExtras();
      if (!audioEl) return Promise.resolve();
      if (audioEl.paused || audioEl.ended) return audioEl.play();
      audioEl.pause();
      return Promise.resolve();
    },
    seek: function (value) { if (audioEl) audioEl.currentTime = Math.max(0, Number(value) || 0); },
    setVolume: setVolume,
    repeatMode: function () { return repeatMode; },
    setRepeatMode: setRepeatMode,
    cycleRepeatMode: cycleRepeatMode,
    setMuted: function (value) {
      setupAudioExtras();
      savedMuted = value === true;
      if (audioEl) audioEl.muted = savedMuted;
      localStorage.setItem("music-muted", String(savedMuted));
      localStorage.setItem("muted", String(savedMuted));
      updateVolumeIcon();
      emitState();
    },
    stop: function () {
      if (!audioEl) return;
      audioEl.pause();
      audioEl.currentTime = 0;
      emitState();
    }
  });

  updateVolumeIcon();
  window.addEventListener("pageshow", function () {
    if (input && input.value.trim()) input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  emitState();
})();
