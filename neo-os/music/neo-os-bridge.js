(function () {
  "use strict";

  if (window.parent === window) return;

  var stopped = true;
  var lastSignature = "";
  var stateTimer = 0;
  var levelTimer = 0;
  var performanceMode = "normal";

  function normalizePerformanceMode(value) {
    return value === "ultimate" ? "ultimate" : value === "performance" ? "performance" : "normal";
  }

  function parentPerformanceMode() {
    try {
      return normalizePerformanceMode(window.parent.document.documentElement.dataset.performanceMode);
    } catch (error) {
      return normalizePerformanceMode(performanceMode);
    }
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

  function metadata() {
    var cover = document.querySelector(".now-playing-bar .track-info img.cover");
    var title = textWithout(".now-playing-bar .title", ".quality-badge, [class*='quality-badge']");
    var artist = text(".now-playing-bar .artist");
    var album = text(".now-playing-bar .album");
    return {
      title: title || "Music",
      subtitle: artist || album || "",
      cover: absoluteUrl(cover && (cover.currentSrc || cover.src))
    };
  }

  function hasTrack(info, media) {
    if (stopped) return false;
    if (media && Boolean(media.currentSrc || media.src)) return true;
    return !/^(select|choose|pick)\s+(a\s+)?(song|track)/i.test(info.title || "");
  }

  function volumeValue(media) {
    var stored = NaN;
    try { stored = Number(localStorage.getItem("volume")); } catch (error) {}
    if (Number.isFinite(stored)) return clamp(stored, 0, 1);
    return media ? clamp(media.volume, 0, 1) : 1;
  }

  function currentState() {
    var media = activeMedia();
    var info = metadata();
    var active = hasTrack(info, media);
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
      muted: mediaElements().some(function (item) { return item.muted; })
    };
  }

  function postState(force) {
    var state = currentState();
    var signature = JSON.stringify(state);
    if (!force && signature === lastSignature) return;
    lastSignature = signature;
    try { window.parent.postMessage({ neoMusicState: state }, window.location.origin); } catch (error) {}
  }

  function postLevels() {
    var state = currentState();
    var values = [];
    for (var index = 0; index < 8; index += 1) {
      var wave = Math.sin((state.position * 4.2) + (index * 1.37));
      values.push(performanceMode === "normal" && state.playing ? 0.22 + (Math.abs(wave) * 0.72) : 0);
    }
    try { window.parent.postMessage({ neoMusicLevels: { values: values } }, window.location.origin); } catch (error) {}
  }

  function syncPerformanceTimers(nextMode) {
    performanceMode = normalizePerformanceMode(nextMode || parentPerformanceMode());
    document.documentElement.dataset.neoPerformanceMode = performanceMode;
    window.clearInterval(stateTimer);
    window.clearInterval(levelTimer);
    stateTimer = window.setInterval(function () { postState(false); }, performanceMode === "normal" ? 300 : 900);
    levelTimer = performanceMode === "normal" ? window.setInterval(postLevels, 120) : 0;
    if (performanceMode !== "normal") postLevels();
  }

  function click(selector) {
    var element = document.querySelector(selector);
    if (!element) return false;
    element.click();
    return true;
  }

  function setVolume(value) {
    value = clamp(value, 0, 1);
    var bar = document.getElementById("volume-bar");
    if (bar) {
      var rect = bar.getBoundingClientRect();
      var x = rect.left + (Math.max(1, rect.width) * value);
      bar.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: x, clientY: rect.top + (rect.height / 2) }));
    }
    try { localStorage.setItem("volume", String(value)); } catch (error) {}
    mediaElements().forEach(function (media) {
      media.muted = false;
      if (!bar) media.volume = value;
    });
    window.setTimeout(function () { postState(true); }, 40);
  }

  function setMuted(muted) {
    var current = mediaElements().some(function (item) { return item.muted; });
    if (current !== muted) click("#volume-btn");
    mediaElements().forEach(function (item) { item.muted = muted; });
    try { localStorage.setItem("muted", String(muted)); } catch (error) {}
    postState(true);
  }

  function stopPlayback() {
    stopped = true;
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
    if (action === "getstate") postState(true);
    else if (action === "play") {
      stopped = false;
      if (media && media.paused) media.play().catch(function () { click(".now-playing-bar .play-pause-btn"); });
      else if (!media) click(".now-playing-bar .play-pause-btn");
    } else if (action === "pause") {
      if (media && !media.paused) media.pause();
    } else if (action === "toggle") {
      if (media) {
        if (media.paused || media.ended) {
          stopped = false;
          media.play().catch(function () { click(".now-playing-bar .play-pause-btn"); });
        } else {
          media.pause();
        }
      } else {
        click(".now-playing-bar .play-pause-btn");
      }
    }
    else if (action === "next") click("#next-btn");
    else if (action === "previous") click("#prev-btn");
    else if (action === "volume") setVolume(control.value);
    else if (action === "mute") setMuted(Boolean(control.value));
    else if (action === "seek" && media && Number.isFinite(media.duration)) media.currentTime = clamp(control.value, 0, media.duration);
    else if (action === "stop") stopPlayback();
    window.setTimeout(function () { postState(true); }, 60);
  }

  function bindMedia(media) {
    if (media.dataset.neoBridgeBound === "1") return;
    media.dataset.neoBridgeBound = "1";
    ["play", "playing", "pause", "ended", "loadedmetadata", "durationchange", "timeupdate", "volumechange", "emptied"].forEach(function (eventName) {
      media.addEventListener(eventName, function () {
        if (eventName === "play" || eventName === "playing") stopped = false;
        postState(eventName !== "timeupdate");
      });
    });
  }

  function bindAll() {
    mediaElements().forEach(bindMedia);
  }

  window.addEventListener("message", function (event) {
    if (event.source !== window.parent || event.origin !== window.location.origin) return;
    if (event.data && event.data.neoMusicControl) handleControl(event.data.neoMusicControl);
    if (event.data && event.data.type === "neo-shell:performance-mode") syncPerformanceTimers(event.data.mode);
  });

  var observer = new MutationObserver(function () {
    bindAll();
    postState(false);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["src"] });
  bindAll();
  syncPerformanceTimers(parentPerformanceMode());
  window.addEventListener("pagehide", function () {
    window.clearInterval(stateTimer);
    window.clearInterval(levelTimer);
    observer.disconnect();
  });
  postState(true);
})();
