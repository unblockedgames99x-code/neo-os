(function () {
  "use strict";

  var STORAGE_KEY = "neo_bottom_visualizer_v1";
  var BAND_COUNT = 64;
  var root = document.documentElement;
  var canvas = document.getElementById("neo-bottom-visualizer");
  if (!canvas) return;

  var context = canvas.getContext("2d", { alpha: true, desynchronized: true });
  if (!context) return;

  var enabled = false;
  var playing = false;
  var measured = false;
  var fallbackGain = 0;
  var mediaStates = new Map();
  var spectrumSources = new Map();
  var targets = new Float32Array(BAND_COUNT);
  var levels = new Float32Array(BAND_COUNT);
  var peaks = new Float32Array(BAND_COUNT);
  var frame = 0;
  var resizeFrame = 0;
  var lastFrame = 0;
  var phase = 0;
  var framesDrawn = 0;
  var canvasWidth = 0;
  var canvasHeight = 0;
  var barGradient = null;
  var reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

  try { enabled = localStorage.getItem(STORAGE_KEY) === "true"; } catch (_error) {}

  function clamp(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
  }

  function masterGain() {
    var state = window.NEO_SYSTEM_BRIDGE && window.NEO_SYSTEM_BRIDGE.get();
    if (state && state.muted) return 0;
    return clamp(state && state.volume !== undefined ? state.volume / 100 : 1);
  }

  function displayLevel(value, gain) {
    return Math.min(.94, Math.pow(clamp(value), 1.12) * .98 * clamp(gain));
  }

  function windowInteracting() {
    return Boolean(root.classList && root.classList.contains("is-window-interacting"));
  }

  function normalize(values) {
    var source = Array.isArray(values) ? values : [];
    if (!source.length) return new Float32Array(BAND_COUNT);
    var normalized = new Float32Array(BAND_COUNT);
    for (var index = 0; index < BAND_COUNT; index += 1) {
      var point = index / (BAND_COUNT - 1) * (source.length - 1);
      var before = Math.floor(point);
      var after = Math.min(source.length - 1, Math.ceil(point));
      var mix = point - before;
      normalized[index] = clamp(Number(source[before]) + (Number(source[after]) - Number(source[before])) * mix);
    }
    return normalized;
  }

  function refreshSources() {
    var now = Date.now();
    var nextTargets = new Float32Array(BAND_COUNT);
    var nextPlaying = false;
    var nextMeasured = false;
    var nextFallbackGain = 0;
    var systemGain = masterGain();
    spectrumSources.forEach(function (entry, source) {
      if (now - entry.updatedAt > 1600) {
        spectrumSources.delete(source);
        return;
      }
      if (!entry.active || now - entry.updatedAt > 800) return;
      var mediaState = mediaStates.get(source);
      var sourceGain = systemGain * (mediaState ? (mediaState.muted ? 0 : mediaState.volume) : 1);
      nextPlaying = true;
      nextMeasured = nextMeasured || entry.measured;
      nextFallbackGain = Math.max(nextFallbackGain, sourceGain);
      for (var index = 0; index < BAND_COUNT; index += 1) {
        nextTargets[index] = Math.max(nextTargets[index], displayLevel(entry.levels[index] || 0, sourceGain));
      }
    });
    mediaStates.forEach(function (entry, source) {
      if (now - entry.updatedAt > 1600) mediaStates.delete(source);
      else if (entry.playing) {
        nextPlaying = true;
        nextFallbackGain = Math.max(nextFallbackGain, systemGain * (entry.muted ? 0 : entry.volume));
      }
    });
    targets = nextTargets;
    playing = nextPlaying;
    measured = nextMeasured;
    fallbackGain = nextFallbackGain;
    schedule();
  }

  function accentRgb() {
    var value = getComputedStyle(root).getPropertyValue("--desktop-accent").trim() ||
      getComputedStyle(root).getPropertyValue("--neo-accent").trim() || "#f58b47";
    var hex = value.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
    if (hex) {
      var digits = hex[1].length === 3 ? hex[1].split("").map(function (part) { return part + part; }).join("") : hex[1];
      return [parseInt(digits.slice(0, 2), 16), parseInt(digits.slice(2, 4), 16), parseInt(digits.slice(4, 6), 16)];
    }
    var rgb = value.match(/[\d.]+/g);
    return rgb && rgb.length >= 3 ? rgb.slice(0, 3).map(Number) : [245, 139, 71];
  }

  function roundedBar(x, y, width, height, radius) {
    var safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
    context.beginPath();
    context.roundRect(x, y, width, height, safeRadius);
    context.fill();
  }

  function syncVisualizerGeometry() {
    var taskbar = typeof document.querySelector === "function" ? document.querySelector(".taskbar") : null;
    var viewportWidth = Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1);
    var center = viewportWidth / 2;
    var width = Math.min(420, viewportWidth - 16);
    if (taskbar) {
      var taskbarBounds = taskbar.getBoundingClientRect();
      var position = String(root.dataset.taskbarPosition || "left");
      var horizontal = position === "top" || position === "bottom";
      var workspaceLeft = position === "left" ? taskbarBounds.right : 0;
      var workspaceRight = position === "right" ? taskbarBounds.left : viewportWidth;
      var workspaceWidth = Math.max(1, workspaceRight - workspaceLeft);
      center = workspaceLeft + workspaceWidth / 2;
      width = horizontal
        ? taskbarBounds.width + 64
        : Math.max(300, taskbarBounds.width + 64);
      width = Math.min(width, workspaceWidth - 16, viewportWidth - 16);
    }
    if (canvas.style && typeof canvas.style.setProperty === "function") {
      canvas.style.setProperty("--neo-visualizer-center-x", Math.round(center) + "px");
      canvas.style.setProperty("--neo-visualizer-width", Math.max(1, Math.round(width)) + "px");
    }
  }

  function resize() {
    resizeFrame = 0;
    if (!enabled) return;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    syncVisualizerGeometry();
    var bounds = canvas.getBoundingClientRect();
    canvasWidth = bounds.width;
    canvasHeight = bounds.height;
    var pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    var width = Math.max(1, Math.round(bounds.width * pixelRatio));
    var height = Math.max(1, Math.round(bounds.height * pixelRatio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    var rgb = accentRgb();
    barGradient = context.createLinearGradient(0, canvasHeight - 8, 0, 0);
    barGradient.addColorStop(0, "rgba(" + rgb.join(",") + ",.48)");
    barGradient.addColorStop(.68, "rgba(" + rgb.join(",") + ",.88)");
    barGradient.addColorStop(1, "rgba(255,255,255,.94)");
    draw(performance.now(), true);
  }

  function draw(now, once) {
    frame = 0;
    if (!enabled || document.hidden || windowInteracting()) return;
    if (!once && now - lastFrame < 30) {
      frame = requestAnimationFrame(draw);
      return;
    }
    lastFrame = now;
    framesDrawn += 1;
    var width = canvasWidth;
    var height = canvasHeight;
    context.clearRect(0, 0, width, height);

    var reduced = reducedMotion.matches ||
      root.dataset.desktopMotion === "reduced" || root.dataset.performanceMode === "ultimate";
    var moving = false;
    var maxLevel = 0;
    phase += .042;
    for (var index = 0; index < BAND_COUNT; index += 1) {
      var fallback = playing && !measured && !reduced
        ? .055 + .04 * Math.max(0, Math.sin(phase * 2.1 + index * .47))
        : 0;
      var target = playing ? Math.max(targets[index], displayLevel(fallback, fallbackGain)) : 0;
      var speed = target > levels[index] ? .72 : .18;
      levels[index] += (target - levels[index]) * speed;
      if (levels[index] < .002) levels[index] = 0;
      peaks[index] = Math.max(levels[index], peaks[index] - (playing ? .014 : .045));
      maxLevel = Math.max(maxLevel, levels[index], peaks[index]);
      if (levels[index] > .002 || peaks[index] > .002) moving = true;
    }

    var gap = Math.max(2, Math.min(6, width / 210));
    var barWidth = Math.max(2, (width - gap * (BAND_COUNT - 1)) / BAND_COUNT);
    var baseline = height - 8;
    var usable = Math.max(12, height - 18);
    context.fillStyle = barGradient;

    for (var bar = 0; bar < BAND_COUNT; bar += 1) {
      var barHeight = Math.max(3, levels[bar] * usable);
      var x = bar * (barWidth + gap);
      roundedBar(x, baseline - barHeight, barWidth, barHeight, Math.min(3, barWidth / 2));
      if (peaks[bar] > .06) {
        context.globalAlpha = .5;
        roundedBar(x, baseline - peaks[bar] * usable - 3, barWidth, 2, 1);
        context.globalAlpha = 1;
      }
    }

    if (!reduced && (playing || moving || maxLevel > .002)) frame = requestAnimationFrame(draw);
  }

  function schedule() {
    if (enabled && !frame && !document.hidden && !windowInteracting()) frame = requestAnimationFrame(draw);
  }

  function syncMenu() {
    document.querySelectorAll('[data-widget-action="bottom-visualizer"]').forEach(function (button) {
      button.setAttribute("aria-checked", enabled ? "true" : "false");
      var label = button.querySelector("[data-bottom-visualizer-label]");
      if (label) label.textContent = enabled ? "Remove bottom sound visualizer" : "Add bottom sound visualizer";
    });
  }

  function setEnabled(next) {
    enabled = next === true;
    root.dataset.bottomVisualizer = String(enabled);
    canvas.hidden = !enabled;
    canvas.setAttribute("aria-hidden", String(!enabled));
    try { localStorage.setItem(STORAGE_KEY, String(enabled)); } catch (_error) {}
    syncMenu();
    if (enabled) {
      resize();
      schedule();
    } else {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
    window.dispatchEvent(new CustomEvent("neo-bottom-visualizer-change", { detail: { enabled: enabled } }));
    return enabled;
  }

  window.addEventListener("neo-media-state", function (event) {
    var detail = event.detail || {};
    mediaStates.set(String(detail.source || "media"), {
      playing: detail.active !== false && detail.playing === true,
      volume: detail.volume === undefined ? 1 : clamp(detail.volume),
      muted: detail.muted === true,
      updatedAt: Date.now()
    });
    refreshSources();
  });

  window.addEventListener("neo-media-levels", function (event) {
    var detail = event.detail || {};
    var levels = normalize(detail.levels);
    var peak = Math.max.apply(Math, Array.from(levels));
    var mediaState = mediaStates.get(String(detail.source || "audio"));
    spectrumSources.set(String(detail.source || "audio"), {
      levels: levels,
      measured: detail.measured === true,
      active: detail.active === true || (detail.active !== false && ((mediaState && mediaState.playing) || peak > .006)),
      updatedAt: Date.now()
    });
    refreshSources();
  });

  window.addEventListener("neo-system-state", refreshSources);

  function scheduleResize() {
    if (!enabled || resizeFrame) return;
    resizeFrame = requestAnimationFrame(resize);
  }
  window.addEventListener("resize", scheduleResize, { passive: true });
  // Refresh measurements only when geometry or theme changes, never per bar frame.
  if (typeof ResizeObserver === "function") {
    var geometryObserver = new ResizeObserver(scheduleResize);
    geometryObserver.observe(canvas);
    var taskbar = typeof document.querySelector === "function" ? document.querySelector(".taskbar") : null;
    if (taskbar) geometryObserver.observe(taskbar);
  }
  window.addEventListener("neo-taskbar-layout-change", scheduleResize);
  if (typeof MutationObserver === "function") {
    new MutationObserver(scheduleResize).observe(root, { attributes: true,
      attributeFilter: ["class", "style", "data-neo-theme", "data-theme", "data-desktop-motion", "data-performance-mode", "data-taskbar-position", "data-taskbar-style", "data-taskbar-app-names"] });
  }
  if (typeof reducedMotion.addEventListener === "function") reducedMotion.addEventListener("change", scheduleResize);

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      return;
    }
    if (enabled) resize();
  });

  window.addEventListener("neo-window-interaction", function (event) {
    if (event.detail && event.detail.active === true) {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      return;
    }
    schedule();
  });

  window.NEO_BOTTOM_VISUALIZER = {
    isEnabled: function () { return enabled; },
    setEnabled: setEnabled,
    toggle: function () { return setEnabled(!enabled); },
    getState: function () {
      return { enabled: enabled, playing: playing, measured: measured, framesDrawn: framesDrawn, peak: Math.max.apply(Math, Array.from(levels)) };
    }
  };

  window.setInterval(function () { if (!document.hidden) refreshSources(); }, 300);
  setEnabled(enabled);
})();
