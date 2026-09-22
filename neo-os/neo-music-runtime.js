(function () {
  "use strict";

  var cachedWindows = new Map();

  function createDirectPlaybackBridge(frame, target) {
    var sourceId = "stream-music";
    var audio = new Audio();
    var queue = [];
    var index = -1;
    var shuffle = false;
    var wantsPlayback = false;
    var failures = 0;
    var sleepAt = 0;
    var sleepTimer = 0;
    var lastProgressBroadcast = 0;
    var framePlaybackActive = false;

    audio.preload = "metadata";
    try {
      var volumeMigrationKey = "neo_stream_music_volume_max_v1";
      var shouldStartAtMaximum = localStorage.getItem(volumeMigrationKey) !== "1";
      var savedVolumeValue = localStorage.getItem("neo_stream_music_volume");
      var savedVolume = Number(savedVolumeValue);
      audio.volume = shouldStartAtMaximum || savedVolumeValue === null || !Number.isFinite(savedVolume) || savedVolume < 0 || savedVolume > 1
        ? 1
        : savedVolume;
      if (shouldStartAtMaximum) {
        localStorage.setItem("neo_stream_music_volume", "1");
        localStorage.setItem(volumeMigrationKey, "1");
      }
      audio.muted = localStorage.getItem("neo_stream_music_muted") === "true";
    } catch (error) {}

    function currentTrack() {
      return queue[index] || null;
    }

    function sourceFor(track) {
      if (!track) return "";
      var raw = String(track.src || "/api/music/stream?id=" + encodeURIComponent(track.id));
      try {
        var source = new URL(raw, target.href);
        return source.origin === target.origin && source.protocol === "https:" ? source.href : "";
      } catch (error) {
        return "";
      }
    }

    function state() {
      var track = currentTrack();
      return {
        playing: !audio.paused && Boolean(audio.currentSrc),
        track: track,
        idx: index,
        list: queue,
        listLen: queue.length,
        time: audio.currentTime || 0,
        duration: audio.duration || 0,
        volume: audio.volume,
        muted: audio.muted,
        shuffle: shuffle,
        loop: audio.loop,
        radio: true,
        speed: audio.playbackRate,
        sleepAt: sleepAt
      };
    }

    function broadcast() {
      var playback = state();
      var track = playback.track;
      try { frame.contentWindow.postMessage({ sbMusicState: playback }, "*"); } catch (error) {}
      window.dispatchEvent(new CustomEvent("neo-media-state", {
        detail: track ? {
          source: sourceId,
          appId: "stream",
          active: true,
          playing: playback.playing,
          title: String(track.title || "Music").slice(0, 160),
          subtitle: String(track.artist || "").slice(0, 180),
          cover: String(track.artwork || "").slice(0, 4096),
          kind: "audio",
          position: playback.time,
          duration: playback.duration,
          volume: playback.volume,
          muted: audio.muted,
          volumeControl: true,
          transport: true,
          pauseWallpaper: false
        } : { source: sourceId, active: false }
      }));
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
              artwork: track.artwork ? [{ src: track.artwork }] : []
            });
            navigator.mediaSession.playbackState = playback.playing ? "playing" : "paused";
          }
        } catch (error) {}
      }
    }

    function loadTrack(nextIndex, autoplay) {
      var track = queue[nextIndex];
      var source = sourceFor(track);
      if (!track || !source) return;
      var sameTrack = nextIndex === index && audio.src === source && Boolean(audio.currentSrc || audio.src);
      index = nextIndex;
      wantsPlayback = autoplay !== false;
      if (!sameTrack) {
        audio.pause();
        audio.src = source;
        audio.currentTime = 0;
        audio.load();
      }
      if (wantsPlayback) requestPlayback();
      broadcast();
    }

    function requestPlayback() {
      if (!wantsPlayback || !currentTrack() || !audio.paused) return;
      audio.play().then(function () {
        failures = 0;
        broadcast();
      }).catch(function (error) {
        if (!error || error.name !== "NotAllowedError") failures += 1;
        broadcast();
      });
    }

    function unlockPlayback(event) {
      if (event && event.type === "keydown" && (event.ctrlKey || event.metaKey || event.altKey)) return;
      requestPlayback();
    }

    function next() {
      if (!queue.length) return;
      var nextIndex = shuffle && queue.length > 1 ? Math.floor(Math.random() * queue.length) : (index + 1) % queue.length;
      loadTrack(nextIndex, true);
    }

    function previous() {
      if (!queue.length) return;
      if (audio.currentTime > 3) {
        audio.currentTime = 0;
        broadcast();
        return;
      }
      loadTrack((index - 1 + queue.length) % queue.length, true);
    }

    function addToQueue(command, insertNext) {
      var tracks = Array.isArray(command.tracks) ? command.tracks.filter(Boolean) : command.track ? [command.track] : [];
      if (!tracks.length) return;
      var wasEmpty = !queue.length;
      if (insertNext && index >= 0) queue.splice.apply(queue, [index + 1, 0].concat(tracks));
      else queue.push.apply(queue, tracks);
      if (wasEmpty) loadTrack(0, true);
      else broadcast();
    }

    function handle(command) {
      if (!command || typeof command !== "object") return;
      switch (command.type) {
        case "play":
          failures = 0;
          queue = Array.isArray(command.list) && command.list.length ? command.list.filter(Boolean) : command.track ? [command.track] : queue;
          loadTrack(Math.max(0, Math.min(queue.length - 1, Number(command.idx) || 0)), true);
          break;
        case "toggle":
          if (audio.paused) {
            wantsPlayback = true;
            failures = 0;
            requestPlayback();
          } else {
            wantsPlayback = false;
            audio.pause();
          }
          break;
        case "next": next(); break;
        case "prev": previous(); break;
        case "seek":
          if (audio.duration) audio.currentTime = Math.max(0, Math.min(audio.duration, (Number(command.pct) || 0) / 100 * audio.duration));
          broadcast();
          break;
        case "seekTo":
          if (audio.duration) audio.currentTime = Math.max(0, Math.min(audio.duration, Number(command.sec) || 0));
          broadcast();
          break;
        case "speed":
          audio.playbackRate = Math.max(0.5, Math.min(2, Number(command.v) || 1));
          audio.defaultPlaybackRate = audio.playbackRate;
          broadcast();
          break;
        case "sleep":
          window.clearTimeout(sleepTimer);
          var minutes = Math.max(0, Number(command.minutes) || 0);
          sleepAt = minutes ? Date.now() + minutes * 60000 : 0;
          if (minutes) sleepTimer = window.setTimeout(function () {
            sleepAt = 0;
            wantsPlayback = false;
            audio.pause();
            broadcast();
          }, minutes * 60000);
          broadcast();
          break;
        case "volume":
          audio.volume = Math.max(0, Math.min(1, Number(command.v) || 0));
          try { localStorage.setItem("neo_stream_music_volume", String(audio.volume)); } catch (error) {}
          broadcast();
          break;
        case "mute":
          audio.muted = command.on === true;
          try { localStorage.setItem("neo_stream_music_muted", String(audio.muted)); } catch (error) {}
          broadcast();
          break;
        case "shuffle": shuffle = command.on === true; broadcast(); break;
        case "loop": audio.loop = command.on === true; broadcast(); break;
        case "queueAdd": addToQueue(command, false); break;
        case "queueNext": addToQueue(command, true); break;
        case "queueRemove": {
          var removeIndex = Number(command.idx);
          if (!Number.isInteger(removeIndex) || removeIndex < 0 || removeIndex >= queue.length) break;
          var wasCurrent = removeIndex === index;
          var wasPlaying = !audio.paused;
          queue.splice(removeIndex, 1);
          if (!queue.length) {
            wantsPlayback = false;
            audio.pause();
            audio.removeAttribute("src");
            audio.load();
            index = -1;
            broadcast();
          } else if (removeIndex < index) {
            index -= 1;
            broadcast();
          } else if (wasCurrent) {
            if (index >= queue.length) index = 0;
            loadTrack(index, wasPlaying);
          } else broadcast();
          break;
        }
        case "queueMove": {
          var from = Number(command.from);
          var to = Number(command.to);
          if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= queue.length || to >= queue.length || from === to) break;
          var moved = queue.splice(from, 1)[0];
          queue.splice(to, 0, moved);
          if (index === from) index = to;
          else {
            if (from < index) index -= 1;
            if (to <= index) index += 1;
          }
          broadcast();
          break;
        }
        case "queueClear":
          var current = currentTrack();
          queue = current ? [current] : [];
          index = current ? 0 : -1;
          broadcast();
          break;
        case "getstate": broadcast(); break;
        default: break;
      }
    }

    function relayFrameState(frameState) {
      if (!frameState || typeof frameState !== "object") return;
      var active = frameState.active !== false && Boolean(String(frameState.title || "").trim());
      var reportedVolume = Number(frameState.volume);
      var hasVolume = Number.isFinite(reportedVolume);
      framePlaybackActive = active;
      window.dispatchEvent(new CustomEvent("neo-media-state", {
        detail: active ? {
          source: sourceId,
          appId: "stream",
          active: true,
          playing: frameState.playing === true,
          title: String(frameState.title || "Music").slice(0, 160),
          subtitle: String(frameState.subtitle || "").slice(0, 180),
          cover: String(frameState.cover || "").slice(0, 4096),
          kind: frameState.kind === "video" ? "video" : "audio",
          position: Math.max(0, Number(frameState.position) || 0),
          duration: Math.max(0, Number(frameState.duration) || 0),
          volume: hasVolume ? Math.max(0, Math.min(1, reportedVolume)) : 1,
          muted: frameState.muted === true,
          volumeControl: hasVolume,
          transport: true,
          pauseWallpaper: false
        } : { source: sourceId, appId: "stream", active: false }
      }));
    }

    function sendFrameControl(action, value) {
      try {
        var control = { action: action };
        if (value !== undefined) control.value = value;
        frame.contentWindow.postMessage({ neoMusicControl: control }, "*");
        return true;
      } catch (error) {
        return false;
      }
    }

    function onMessage(event) {
      if (event.source !== frame.contentWindow || !event.data || typeof event.data !== "object") return;
      if (event.data.sbMusic) handle(event.data.sbMusic);
      if (event.data.neoMusicState) relayFrameState(event.data.neoMusicState);
      if (event.data.neoMusicLevels && Array.isArray(event.data.neoMusicLevels.values)) {
        window.dispatchEvent(new CustomEvent("neo-media-levels", {
          detail: {
            source: sourceId,
            levels: event.data.neoMusicLevels.values,
            measured: event.data.neoMusicLevels.measured === true,
            bands: Math.max(0, Number(event.data.neoMusicLevels.bands) || 0),
            interval: Math.max(0, Number(event.data.neoMusicLevels.interval) || 0)
          }
        }));
      }
    }

    function onVolume(event) {
      if (String(event.detail && event.detail.source || "") !== sourceId) return;
      var volume = Math.max(0, Math.min(1, Number(event.detail.volume) || 0));
      if (framePlaybackActive && sendFrameControl("volume", volume)) return;
      audio.volume = volume;
      try { localStorage.setItem("neo_stream_music_volume", String(audio.volume)); } catch (error) {}
      broadcast();
    }

    function onTransport(event) {
      var detail = event.detail || {};
      if (String(detail.source || "") !== sourceId) return;
      var action = String(detail.action || "");
      var frameAction = action === "prev" ? "previous" : action;
      if (framePlaybackActive && sendFrameControl(frameAction)) return;
      if (action === "previous" || action === "prev") handle({ type: "prev" });
      else if (action === "next") handle({ type: "next" });
      else if (action === "toggle") handle({ type: "toggle" });
      else if (action === "pause") pause();
      else if (action === "play" && currentTrack()) {
        wantsPlayback = true;
        failures = 0;
        requestPlayback();
        broadcast();
      }
    }

    function stop() {
      if (framePlaybackActive) sendFrameControl("stop");
      framePlaybackActive = false;
      window.clearTimeout(sleepTimer);
      sleepTimer = 0;
      sleepAt = 0;
      wantsPlayback = false;
      failures = 0;
      try { audio.pause(); } catch (error) {}
      try { audio.currentTime = 0; } catch (error) {}
      try { audio.removeAttribute("src"); } catch (error) {}
      try { audio.load(); } catch (error) {}
      queue = [];
      index = -1;
      shuffle = false;
      try { broadcast(); } catch (error) {}
    }

    function pause() {
      if (framePlaybackActive && sendFrameControl("pause")) return true;
      wantsPlayback = false;
      if (audio.paused) {
        broadcast();
        return false;
      }
      try { audio.pause(); } catch (error) { return false; }
      broadcast();
      return true;
    }

    function setMuted(muted) {
      if (framePlaybackActive && sendFrameControl("mute", Boolean(muted))) return true;
      audio.muted = Boolean(muted);
      broadcast();
      return true;
    }

    function destroy() {
      stop();
      window.removeEventListener("message", onMessage);
      window.removeEventListener("neo-media-volume-request", onVolume);
      window.removeEventListener("neo-media-transport-request", onTransport);
      window.removeEventListener("pointerdown", unlockPlayback, true);
      window.removeEventListener("touchend", unlockPlayback, true);
      window.removeEventListener("keydown", unlockPlayback, true);
    }

    ["play", "pause", "playing", "loadedmetadata", "durationchange", "volumechange", "ratechange"].forEach(function (name) {
      audio.addEventListener(name, function () {
        if (name === "volumechange") {
          try {
            localStorage.setItem("neo_stream_music_volume", String(audio.volume));
            localStorage.setItem("neo_stream_music_muted", String(audio.muted));
          } catch (error) {}
        }
        broadcast();
      });
    });
    audio.addEventListener("timeupdate", function () {
      if (document.hidden || Date.now() - lastProgressBroadcast < 200) return;
      lastProgressBroadcast = Date.now();
      broadcast();
    });
    audio.addEventListener("ended", function () { if (!audio.loop) next(); });
    audio.addEventListener("error", function () {
      if (!wantsPlayback) return;
      failures += 1;
      if (failures < 2 && currentTrack()) window.setTimeout(function () { loadTrack(index, true); }, 500);
      else { wantsPlayback = false; broadcast(); }
    });
    window.addEventListener("message", onMessage);
    window.addEventListener("neo-media-volume-request", onVolume);
    window.addEventListener("neo-media-transport-request", onTransport);
    window.addEventListener("pointerdown", unlockPlayback, { capture: true, passive: true });
    window.addEventListener("touchend", unlockPlayback, { capture: true, passive: true });
    window.addEventListener("keydown", unlockPlayback, true);
    if ("mediaSession" in navigator) {
      try { navigator.mediaSession.setActionHandler("play", function () { if (currentTrack()) audio.play().catch(function () {}); }); } catch (error) {}
      try { navigator.mediaSession.setActionHandler("pause", function () { audio.pause(); }); } catch (error) {}
      try { navigator.mediaSession.setActionHandler("nexttrack", next); } catch (error) {}
      try { navigator.mediaSession.setActionHandler("previoustrack", previous); } catch (error) {}
    }
    return { audio: audio, broadcast: broadcast, pause: pause, stop: stop, setMuted: setMuted, destroy: destroy };
  }

  function createShell(app, body, iconMarkup) {
    body.classList.add("music-unified-window-body");
    body.innerHTML =
      '<section class="music-unified-shell" data-unified-music>' +
        '<nav class="music-unified-tabs" role="tablist" aria-label="Music sources">' +
          '<button type="button" role="tab" aria-selected="true" aria-controls="music-listen-panel" data-unified-music-mode="listen">' + iconMarkup("stream") + '<span>Listen</span></button>' +
          '<button type="button" role="tab" aria-selected="false" aria-controls="music-mp3-panel" data-unified-music-mode="mp3">' + iconMarkup("music") + '<span>Audio Player</span></button>' +
        '</nav>' +
        '<div class="music-unified-panel" id="music-listen-panel" role="tabpanel" data-unified-music-panel="listen"></div>' +
        '<div class="music-unified-panel" id="music-mp3-panel" role="tabpanel" data-unified-music-panel="mp3" hidden></div>' +
      '</section>';
    var shell = body.querySelector("[data-unified-music]");
    var listenPanel = shell.querySelector('[data-unified-music-panel="listen"]');
    var direct = app.browserDirect === true && Boolean(app.browserTarget);
    if (direct) mountDirect(app, listenPanel);
    return {
      shell: shell,
      tabs: Array.from(shell.querySelectorAll("[data-unified-music-mode]")),
      listenPanel: listenPanel,
      mp3Panel: shell.querySelector('[data-unified-music-panel="mp3"]'),
      direct: direct
    };
  }

  function mountDirect(app, panel) {
    var target;
    try { target = new URL(app.browserTarget, document.baseURI); } catch (error) { target = null; }
    var localHttpTarget = target && target.protocol === "http:" && target.origin === window.location.origin;
    if (!target || (target.protocol !== "https:" && !localHttpTarget)) {
      panel.innerHTML = '<div class="feature-loader is-error" role="alert"><strong>Music is unavailable</strong><p>The listening source is not valid.</p></div>';
      return;
    }

    var session = document.createElement("div");
    session.className = "music-direct-session";
    var loader = document.createElement("div");
    loader.className = "feature-loader music-direct-loader";
    loader.setAttribute("role", "status");
    loader.innerHTML = '<span class="library-spinner" aria-hidden="true"></span><strong>Opening Music</strong><p>Connecting directly to the music library.</p><button class="button" type="button" data-music-direct-retry hidden>Retry</button>';
    var frame = document.createElement("iframe");
    frame.className = "music-direct-frame";
    frame.title = "Music library";
    frame.allow = "autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-write";
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    frame.loading = "eager";
    frame.fetchPriority = "high";
    session.append(frame, loader);
    panel.replaceChildren(session);
    session._neoPlayback = createDirectPlaybackBridge(frame, target);

    var retry = loader.querySelector("[data-music-direct-retry]");
    var slowTimer = 0;

    function startLoad(isRetry) {
      window.clearTimeout(slowTimer);
      session.classList.remove("is-ready", "is-slow");
      loader.querySelector("strong").textContent = isRetry ? "Reopening Music" : "Opening Music";
      loader.querySelector("p").textContent = "Connecting directly to the music library.";
      retry.hidden = true;
      var destination = new URL(target.href);
      if (isRetry) destination.searchParams.set("neo_retry", String(Date.now()));
      if (window.NEOFrameLoader) {
        window.NEOFrameLoader.load(frame, destination.href, {
          forceFetch: true,
          cache: isRetry ? "no-store" : "force-cache"
        }).catch(function () {
          window.clearTimeout(slowTimer);
          session.classList.add("is-slow");
          loader.querySelector("strong").textContent = "Music could not connect";
          loader.querySelector("p").textContent = "Retry the music session.";
          retry.hidden = false;
        });
      } else {
        session.classList.add("is-slow");
        loader.querySelector("strong").textContent = "Music loader unavailable";
        loader.querySelector("p").textContent = "Retry after NEO OS finishes loading.";
        retry.hidden = false;
        return;
      }
      slowTimer = window.setTimeout(function () {
        if (session.classList.contains("is-ready")) return;
        session.classList.add("is-slow");
        loader.querySelector("strong").textContent = "Music is taking longer than expected";
        loader.querySelector("p").textContent = "Check the connection or retry the music session.";
        retry.hidden = false;
      }, 12000);
    }

    frame.addEventListener("load", function () {
      window.clearTimeout(slowTimer);
      session.classList.add("is-ready");
      session.classList.remove("is-slow");
    });
    frame.addEventListener("error", function () {
      window.clearTimeout(slowTimer);
      session.classList.add("is-slow");
      loader.querySelector("strong").textContent = "Music could not connect";
      loader.querySelector("p").textContent = "Retry the direct music session.";
      retry.hidden = false;
    });
    retry.addEventListener("click", function () { startLoad(true); });
    startLoad(false);
  }

  function cacheWindow() {
    // Closing an app is a hard lifecycle boundary. Windows are never cached:
    // media, navigation history, timers, and document state must all end.
    return false;
  }


  function stopWindow(win, id) {
    if (!win || id !== "stream") return false;
    var stopped = false;
    win.querySelectorAll(".music-direct-session").forEach(function (session) {
      var playback = session._neoPlayback;
      if (!playback) return;
      try {
        if (typeof playback.destroy === "function") playback.destroy();
        else if (typeof playback.stop === "function") playback.stop();
        else return;
        stopped = true;
      } catch (error) {}
    });
    return stopped;
  }

  function pauseWindow(win, id) {
    if (!win || id !== "stream") return false;
    var paused = false;
    win.querySelectorAll(".music-direct-session").forEach(function (session) {
      var playback = session._neoPlayback;
      if (!playback || typeof playback.pause !== "function") return;
      try {
        paused = playback.pause() || paused;
      } catch (error) {}
    });
    return paused;
  }

  function setWindowMuted(win, muted) {
    if (!win) return false;
    var changed = false;
    win.querySelectorAll(".music-direct-session").forEach(function (session) {
      var playback = session._neoPlayback;
      if (!playback) return;
      try {
        if (typeof playback.setMuted === "function") playback.setMuted(muted);
        else if (playback.audio) {
          playback.audio.muted = Boolean(muted);
          if (typeof playback.broadcast === "function") playback.broadcast();
        } else return;
        changed = true;
      } catch (error) {}
    });
    return changed;
  }

  function restoreWindow(id, openWindows, renderDock, activateWindow) {
    var win = cachedWindows.get(id);
    if (!win) return null;
    window.clearTimeout(win._neoCloseTimer);
    win._neoCloseTimer = 0;
    cachedWindows.delete(id);
    win.hidden = false;
    win.removeAttribute("aria-hidden");
    win.removeAttribute("inert");
    win.classList.remove("is-closing", "is-minimized");
    win.classList.add("is-open");
    openWindows.set(id, win);
    renderDock();
    activateWindow(win);
    window.requestAnimationFrame(function () { win.focus({ preventScroll: true }); });
    return win;
  }

  function dropWindow(id) {
    var win = cachedWindows.get(id);
    if (win) window.clearTimeout(win._neoCloseTimer);
    cachedWindows.delete(id);
  }

  window.NEO_MUSIC_RUNTIME = {
    createShell: createShell,
    mountDirect: mountDirect,
    pauseWindow: pauseWindow,
    stopWindow: stopWindow,
    setWindowMuted: setWindowMuted,
    cacheWindow: cacheWindow,
    restoreWindow: restoreWindow,
    getWindow: function (id, openWindows) { return openWindows.get(id) || cachedWindows.get(id) || null; },
    dropWindow: dropWindow
  };
})();
