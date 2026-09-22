(function () {
  "use strict";

  if (window.parent === window) return;

  var stopped = true;
  var lastSignature = "";
  var stateTimer = 0;
  var levelTimer = 0;
  var analysisContext = null;
  var analysisSource = null;
  var analysisAnalyser = null;
  var analysisData = null;
  var analysisMedia = null;
  var analysisRetryAt = 0;
  var analysisSilenceFrames = 0;
  var rememberedCover = "";
  var rememberedCoverKey = "";
  var LEVEL_BANDS = 32;

  function parentTargetOrigin() {
    return window.location.origin === "null" ? "*" : window.location.origin;
  }

  function clamp(value, min, max) {
    value = Number(value);
    return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : min;
  }

  function mediaElements() {
    return Array.from(document.querySelectorAll("audio, video"));
  }

  function activeMedia() {
    var items = mediaElements();
    return items.find(function (item) { return !item.paused && !item.ended && Boolean(item.currentSrc || item.src); }) ||
      items.find(function (item) { return Boolean(item.currentSrc || item.src) && item.readyState > 0; }) ||
      document.getElementById("audio-player") || document.getElementById("video-player") || null;
  }

  function text(selector) {
    var element = document.querySelector(selector);
    return element ? String(element.textContent || "").trim() : "";
  }

  function textWithout(selector, excludedSelector) {
    var element = document.querySelector(selector);
    if (!element) return "";
    var copy = element.cloneNode(true);
    Array.from(copy.querySelectorAll(excludedSelector)).forEach(function (child) { child.remove(); });
    return String(copy.textContent || "").trim();
  }

  function absoluteUrl(value) {
    if (!value) return "";
    try { return new URL(value, window.location.href).href; } catch (error) { return ""; }
  }

  function usableCoverUrl(value) {
    var source = absoluteUrl(value);
    if (!source || !/^(?:https?:|blob:|data:image\/)/i.test(source)) return "";
    if (/(?:^|\/)(?:appicon|spotify-official|neo-logo)(?:[-_.?]|$)/i.test(source)) return "";
    if (/^data:image\/gif;base64,R0lGODlhAQABA/i.test(source)) return "";
    return source;
  }

  function imageUrl(element) {
    if (!element) return "";
    var candidates = [element.currentSrc, element.getAttribute("src"), element.src];
    var srcset = String(element.getAttribute("srcset") || "");
    srcset.split(",").forEach(function (candidate) {
      candidates.push(candidate.trim().split(/\s+/)[0]);
    });
    for (var index = 0; index < candidates.length; index += 1) {
      var source = usableCoverUrl(candidates[index]);
      if (source) return source;
    }
    return "";
  }

  function mediaSessionCover() {
    try {
      var mediaMetadata = navigator.mediaSession && navigator.mediaSession.metadata;
      var artwork = mediaMetadata && Array.isArray(mediaMetadata.artwork) ? mediaMetadata.artwork : [];
      for (var index = artwork.length - 1; index >= 0; index -= 1) {
        var source = usableCoverUrl(artwork[index] && artwork[index].src);
        if (source) return source;
      }
    } catch (error) {}
    return "";
  }

  function currentCover() {
    var selectors = [
      "#npmCover",
      "#npThumb",
      ".now-playing-bar .track-info img.cover",
      ".now-playing-bar img[alt*='Current Track Cover']",
      "#fullscreen-cover-image",
      ".track-item.playing img",
      ".track-item.active img",
      "[aria-current='true'] img"
    ];
    for (var index = 0; index < selectors.length; index += 1) {
      var source = imageUrl(document.querySelector(selectors[index]));
      if (source) return source;
    }
    return mediaSessionCover();
  }

  function metadata() {
    var title = text("#npmTrackTitle") || text("#npTitle") || textWithout(".now-playing-bar .title", ".quality-badge, [class*='quality-badge']");
    var artist = text("#npmTrackArtist") || text(".now-playing-bar .artist");
    var album = text(".now-playing-bar .album");
    var subtitle = artist || album || "";
    var coverKey = [title.toLowerCase(), subtitle.toLowerCase()].join("\n");
    var cover = currentCover();
    if (cover) {
      rememberedCover = cover;
      rememberedCoverKey = coverKey;
    } else if (coverKey && coverKey === rememberedCoverKey) {
      cover = rememberedCover;
    }
    return {
      title: title || "Music",
      subtitle: subtitle,
      cover: cover
    };
  }

  function hasTrack(info, media) {
    if (stopped) return false;
    if (media && Boolean(media.currentSrc || media.src)) return true;
    return !/^(select|choose|pick)\s+(a\s+)?(song|track)/i.test(info.title || "");
  }

  function volumeValue(media) {
    var stored = NaN;
    try {
      stored = Number(localStorage.getItem("music-volume"));
      if (!Number.isFinite(stored)) stored = Number(localStorage.getItem("volume"));
    } catch (error) {}
    if (Number.isFinite(stored)) return clamp(stored, 0, 1);
    return media ? clamp(media.volume, 0, 1) : 1;
  }

  function restoreMediaPreferences(media) {
    if (!media) return;
    try {
      var savedVolume = Number(localStorage.getItem("music-volume"));
      if (!Number.isFinite(savedVolume)) savedVolume = Number(localStorage.getItem("volume"));
      if (Number.isFinite(savedVolume)) media.volume = clamp(savedVolume, 0, 1);
      var savedMuted = localStorage.getItem("music-muted");
      if (savedMuted !== "true" && savedMuted !== "false") savedMuted = localStorage.getItem("muted");
      if (savedMuted === "true" || savedMuted === "false") media.muted = savedMuted === "true";
    } catch (error) {}
  }

  function saveMediaPreferences(media) {
    if (!media) return;
    try {
      localStorage.setItem("music-volume", String(clamp(media.volume, 0, 1)));
      localStorage.setItem("music-muted", String(Boolean(media.muted)));
      localStorage.setItem("volume", String(clamp(media.volume, 0, 1)));
      localStorage.setItem("muted", String(Boolean(media.muted)));
    } catch (error) {}
  }

  function currentState() {
    var media = activeMedia();
    var info = metadata();
    var active = hasTrack(info, media);
    var controller = window.__NEO_METING_PLAYER__;
    var repeatMode = media && media.loop ? "one" : "off";
    try {
      if (controller && typeof controller.repeatMode === "function") repeatMode = controller.repeatMode();
      else {
        var storedRepeatMode = localStorage.getItem("music-repeat-mode");
        if (/^(?:off|all|one)$/.test(storedRepeatMode || "")) repeatMode = storedRepeatMode;
      }
    } catch (error) {}
    return {
      active: active,
      playing: active && media ? !media.paused && !media.ended : false,
      title: info.title,
      subtitle: info.subtitle,
      cover: info.cover,
      kind: media && media.tagName === "VIDEO" ? "video" : "audio",
      position: media ? Math.max(0, Number(media.currentTime) || 0) : 0,
      duration: media && Number.isFinite(media.duration) ? Math.max(0, media.duration) : 0,
      volume: volumeValue(media),
      muted: mediaElements().some(function (item) { return item.muted; }),
      repeatMode: repeatMode
    };
  }

  function discardAnalyser() {
    try { if (analysisSource) analysisSource.disconnect(); } catch (error) {}
    try { if (analysisContext && analysisContext.state !== "closed") analysisContext.close(); } catch (error) {}
    analysisContext = null;
    analysisSource = null;
    analysisAnalyser = null;
    analysisData = null;
    analysisMedia = null;
    analysisSilenceFrames = 0;
  }

  function ensureAnalyser(media) {
    if (!media || media.paused || media.ended) return false;
    if (analysisAnalyser && analysisMedia === media) {
      if (analysisContext && analysisContext.state === "suspended") analysisContext.resume().catch(function () {});
      return true;
    }
    if (analysisMedia && analysisMedia !== media) discardAnalyser();
    if (Date.now() < analysisRetryAt) return false;
    try {
      var capture = media.captureStream || media.mozCaptureStream;
      var AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!capture || !AudioContextClass) throw new Error("Audio spectrum capture is unavailable");
      var stream = capture.call(media);
      if (!stream || !stream.getAudioTracks || !stream.getAudioTracks().length) throw new Error("No audio track to analyse");
      analysisContext = new AudioContextClass({ latencyHint: "playback" });
      if (window.__neoMusicAudioGate && typeof window.__neoMusicAudioGate.registerContext === "function") {
        window.__neoMusicAudioGate.registerContext(analysisContext);
      }
      analysisSource = analysisContext.createMediaStreamSource(stream);
      analysisAnalyser = analysisContext.createAnalyser();
      analysisAnalyser.fftSize = 512;
      analysisAnalyser.smoothingTimeConstant = 0.12;
      analysisAnalyser.minDecibels = -92;
      analysisAnalyser.maxDecibels = -18;
      analysisData = new Uint8Array(analysisAnalyser.frequencyBinCount);
      analysisSource.connect(analysisAnalyser);
      analysisMedia = media;
      if (analysisContext.state === "suspended") analysisContext.resume().catch(function () {});
      return true;
    } catch (error) {
      discardAnalyser();
      analysisRetryAt = Date.now() + 1200;
      return false;
    }
  }

  function spectrumLevels(media) {
    if (!ensureAnalyser(media)) return null;
    try {
      analysisAnalyser.getByteFrequencyData(analysisData);
      var nyquist = analysisContext.sampleRate / 2;
      var floorFrequency = 34;
      var ceilingFrequency = Math.min(18000, nyquist);
      var values = [];
      for (var band = 0; band < LEVEL_BANDS; band += 1) {
        var lowFrequency = floorFrequency * Math.pow(ceilingFrequency / floorFrequency, band / LEVEL_BANDS);
        var highFrequency = floorFrequency * Math.pow(ceilingFrequency / floorFrequency, (band + 1) / LEVEL_BANDS);
        var start = Math.max(1, Math.floor((lowFrequency / nyquist) * analysisData.length));
        var end = Math.max(start + 1, Math.ceil((highFrequency / nyquist) * analysisData.length));
        end = Math.min(analysisData.length, end);
        var total = 0;
        var peak = 0;
        for (var bin = start; bin < end; bin += 1) {
          var sample = analysisData[bin];
          total += sample;
          if (sample > peak) peak = sample;
        }
        var average = total / Math.max(1, end - start);
        var energy = ((average * 0.58) + (peak * 0.42)) / 255;
        values.push(clamp(Math.pow(Math.max(0, energy - 0.018), 0.88) * 0.92, 0, 0.94));
      }
      var loudest = Math.max.apply(Math, values);
      analysisSilenceFrames = loudest < 0.012 ? analysisSilenceFrames + 1 : 0;
      return analysisSilenceFrames > 5 ? null : values;
    } catch (error) {
      discardAnalyser();
      analysisRetryAt = Date.now() + 1200;
      return null;
    }
  }

  function playbackLevels(state) {
    var values = [];
    if (!state.playing) return Array(LEVEL_BANDS).fill(0);
    var clock = state.position;
    var beat = Math.pow((Math.sin(clock * 6.4) + 1) / 2, 5);
    for (var band = 0; band < LEVEL_BANDS; band += 1) {
      var position = band / Math.max(1, LEVEL_BANDS - 1);
      var bass = Math.max(0, 1 - (position * 0.72));
      var motion = Math.abs(Math.sin((clock * (8.5 + position * 5.5)) + (band * 1.71)));
      var detail = Math.abs(Math.sin((clock * 17.3) - (band * 0.83)));
      var energy = 0.08 + (motion * 0.5) + (detail * 0.22) + (beat * bass * 0.48);
      values.push(clamp(energy * (1 - position * 0.24), 0.035, 1));
    }
    return values;
  }

  function postState(force) {
    var state = currentState();
    var signature = JSON.stringify(state);
    if (!force && signature === lastSignature) return;
    lastSignature = signature;
    updateMediaSession(state);
    try { window.parent.postMessage({ neoMusicState: state }, parentTargetOrigin()); } catch (error) {}
  }

  function updateMediaSession(state) {
    if (!("mediaSession" in navigator)) return;
    try {
      if (state.active && typeof MediaMetadata === "function") {
        var artwork = state.cover ? [{ src: state.cover }] : [];
        navigator.mediaSession.metadata = new MediaMetadata({
          title: state.title || "Music",
          artist: state.subtitle || "",
          artwork: artwork
        });
      }
      navigator.mediaSession.playbackState = state.playing ? "playing" : state.active ? "paused" : "none";
      if (state.duration > 0 && state.position >= 0 && state.position <= state.duration) {
        navigator.mediaSession.setPositionState({ duration: state.duration, position: state.position, playbackRate: 1 });
      }
    } catch (error) {}
  }

  function postLevels() {
    if (document.hidden) {
      if (analysisContext && analysisContext.state === "running") analysisContext.suspend().catch(function () {});
      return;
    }
    var media = activeMedia();
    var state = {
      playing: Boolean(!stopped && media && !media.paused && !media.ended),
      position: media ? Math.max(0, Number(media.currentTime) || 0) : 0
    };
    var measuredLevels = spectrumLevels(media);
    var values = measuredLevels || playbackLevels(state);
    try {
      window.parent.postMessage({
        neoMusicLevels: { values: values, measured: Boolean(measuredLevels), bands: LEVEL_BANDS, interval: 40 }
      }, parentTargetOrigin());
    } catch (error) {}
  }

  function click(selector) {
    var element = document.querySelector(selector);
    if (!element) return false;
    element.click();
    return true;
  }

  function setVolume(value) {
    value = clamp(value, 0, 1);
    var controller = window.__NEO_METING_PLAYER__;
    if (controller && typeof controller.setVolume === "function") {
      controller.setVolume(value);
      window.setTimeout(function () { postState(true); }, 40);
      return;
    }
    var bar = document.getElementById("volume-bar");
    if (bar) {
      var rect = bar.getBoundingClientRect();
      var x = rect.left + (Math.max(1, rect.width) * value);
      bar.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: x, clientY: rect.top + (rect.height / 2) }));
    }
    try { localStorage.setItem("volume", String(value)); } catch (error) {}
    mediaElements().forEach(function (media) {
      media.muted = false;
      media.volume = value;
    });
    window.setTimeout(function () { postState(true); }, 40);
  }

  function setMuted(muted) {
    var controller = window.__NEO_METING_PLAYER__;
    if (controller && typeof controller.setMuted === "function") {
      controller.setMuted(muted);
      postState(true);
      return;
    }
    var current = mediaElements().some(function (item) { return item.muted; });
    if (current !== muted) click("#volume-btn");
    mediaElements().forEach(function (item) { item.muted = muted; });
    try { localStorage.setItem("muted", String(muted)); } catch (error) {}
    postState(true);
  }

  function stopPlayback() {
    stopped = true;
    var controller = window.__NEO_METING_PLAYER__;
    if (controller && typeof controller.stop === "function") controller.stop();
    mediaElements().forEach(function (media) {
      try { media.pause(); } catch (error) {}
      try { media.currentTime = 0; } catch (error) {}
    });
    postState(true);
    postLevels();
  }

  function handleControl(control) {
    var action = String(control && control.action || "");
    var media = activeMedia();
    var controller = window.__NEO_METING_PLAYER__;
    if (action === "getstate") postState(true);
    else if (action === "play") {
      stopped = false;
      if (controller && typeof controller.play === "function") controller.play().catch(function () {});
      else if (media && media.paused) media.play().catch(function () { click("#npmPlayBtn, #npPlayBtn, .now-playing-bar .play-pause-btn"); });
      else if (!media) click("#npmPlayBtn, #npPlayBtn, .now-playing-bar .play-pause-btn");
    } else if (action === "pause") {
      if (controller && typeof controller.pause === "function") controller.pause();
      else if (media && !media.paused) media.pause();
    } else if (action === "toggle") {
      if (controller && typeof controller.toggle === "function") {
        stopped = false;
        controller.toggle().catch(function () {});
      } else if (media) {
        if (media.paused || media.ended) {
          stopped = false;
          media.play().catch(function () { click(".now-playing-bar .play-pause-btn"); });
        } else {
          media.pause();
        }
      } else {
        click("#npmPlayBtn, #npPlayBtn, .now-playing-bar .play-pause-btn");
      }
    }
    else if (action === "next") {
      if (controller && typeof controller.next === "function") controller.next();
      else click("#npmNextBtn, #next-btn");
    }
    else if (action === "previous") {
      if (controller && typeof controller.previous === "function") controller.previous();
      else click("#npmPrevBtn, #prev-btn");
    }
    else if (action === "repeat") {
      if (controller && typeof controller.setRepeatMode === "function" && /^(?:off|all|one)$/.test(String(control.value || ""))) controller.setRepeatMode(String(control.value));
      else if (controller && typeof controller.cycleRepeatMode === "function") controller.cycleRepeatMode();
      else click("#autoplayBtn, #repeat-btn");
    }
    else if (action === "volume") setVolume(control.value);
    else if (action === "mute") setMuted(Boolean(control.value));
    else if (action === "seek" && controller && typeof controller.seek === "function") controller.seek(control.value);
    else if (action === "seek" && media && Number.isFinite(media.duration)) media.currentTime = clamp(control.value, 0, media.duration);
    else if (action === "stop") stopPlayback();
    window.setTimeout(function () { postState(true); }, 60);
  }

  function bindMedia(media) {
    if (media.dataset.neoBridgeBound === "1") return;
    media.dataset.neoBridgeBound = "1";
    restoreMediaPreferences(media);
    ["play", "playing", "pause", "ended", "loadedmetadata", "durationchange", "timeupdate", "volumechange", "emptied"].forEach(function (eventName) {
      media.addEventListener(eventName, function () {
        if (eventName === "play" || eventName === "playing") stopped = false;
        if (eventName === "volumechange") saveMediaPreferences(media);
        postState(eventName !== "timeupdate");
      });
    });
  }

  function bindAll() {
    mediaElements().forEach(bindMedia);
  }

  window.addEventListener("message", function (event) {
    var trustedOpaqueParent = event.origin === "null" && window.location.origin === "null";
    if (event.source !== window.parent || (event.origin !== window.location.origin && !trustedOpaqueParent)) return;
    if (event.data && event.data.neoMusicControl) handleControl(event.data.neoMusicControl);
  });

  window.addEventListener("neo-meting-statechange", function () {
    bindAll();
    postState(true);
  });

  if ("mediaSession" in navigator) {
    try { navigator.mediaSession.setActionHandler("play", function () { handleControl({ action: "play" }); }); } catch (error) {}
    try { navigator.mediaSession.setActionHandler("pause", function () { handleControl({ action: "pause" }); }); } catch (error) {}
    try { navigator.mediaSession.setActionHandler("previoustrack", function () { handleControl({ action: "previous" }); }); } catch (error) {}
    try { navigator.mediaSession.setActionHandler("nexttrack", function () { handleControl({ action: "next" }); }); } catch (error) {}
    try { navigator.mediaSession.setActionHandler("seekto", function (details) { if (details && Number.isFinite(details.seekTime)) handleControl({ action: "seek", value: details.seekTime }); }); } catch (error) {}
  }

  var observer = new MutationObserver(function () {
    bindAll();
    postState(false);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
  bindAll();
  stateTimer = window.setInterval(function () { if (!document.hidden) postState(false); }, 750);
  levelTimer = window.setInterval(postLevels, 100);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (analysisContext && analysisContext.state === "running") analysisContext.suspend().catch(function () {});
    } else {
      var media = activeMedia();
      if (media && !media.paused && analysisContext && analysisContext.state === "suspended") {
        analysisContext.resume().catch(function () {});
      }
      postState(true);
    }
  });
  window.addEventListener("pagehide", function () {
    window.clearInterval(stateTimer);
    window.clearInterval(levelTimer);
    observer.disconnect();
    discardAnalyser();
  });
  document.documentElement.dataset.neoMusicReady = "true";
  try { window.parent.postMessage({ neoMusicUiReady: true }, parentTargetOrigin()); } catch (error) {}
  postState(true);
})();
