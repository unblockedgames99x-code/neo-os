(function () {
  "use strict";

  var STORAGE_KEY = "neo_os_rainmeter_v2";
  var clock = document.getElementById("rainmeter-clock");
  if (!clock) return;

  var defaults = {
    enabled: true,
    style: "poster",
    color: "#f7f7f7",
    accentColor: "#ef4cff",
    dateColor: "#f7f7f7",
    scale: 100,
    opacity: 100,
    position: "middle-center",
    shadow: true
  };
  var styles = ["poster", "classic", "retro", "botanical", "wheel", "glyph"];
  var positions = [
    "top-left", "top-center", "top-right",
    "middle-left", "middle-center", "middle-right",
    "bottom-left", "bottom-center", "bottom-right"
  ];
  var presetColors = ["#f7f7f7", "#d9dee5", "#9ed6ff", "#ffd38a", "#ffb8c7"];
  var saveTimer = 0;
  var returnFocus = null;
  var lastAnchor = { x: Math.max(8, window.innerWidth / 2 - 154), y: 80 };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || min));
  }

  function readState() {
    try {
      var parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return normalize(parsed);
    } catch (error) {
      return Object.assign({}, defaults);
    }
  }

  function normalize(value) {
    var next = Object.assign({}, defaults, value && typeof value === "object" ? value : {});
    if (styles.indexOf(next.style) === -1) next.style = defaults.style;
    if (!/^#[0-9a-f]{6}$/i.test(next.color)) next.color = defaults.color;
    if (!/^#[0-9a-f]{6}$/i.test(next.accentColor)) next.accentColor = defaults.accentColor;
    if (!/^#[0-9a-f]{6}$/i.test(next.dateColor)) next.dateColor = defaults.dateColor;
    next.color = next.color.toLowerCase();
    next.accentColor = next.accentColor.toLowerCase();
    next.dateColor = next.dateColor.toLowerCase();
    next.scale = clamp(next.scale, 70, 250);
    next.opacity = clamp(next.opacity, 35, 100);
    if (positions.indexOf(next.position) === -1) next.position = defaults.position;
    next.enabled = next.enabled !== false;
    next.shadow = next.shadow !== false;
    return next;
  }

  var state = readState();
  var panel = document.createElement("section");
  panel.id = "rainmeter-editor";
  panel.className = "rainmeter-editor";
  panel.hidden = true;
  panel.tabIndex = -1;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "false");
  panel.setAttribute("aria-labelledby", "rainmeter-editor-title");
  panel.innerHTML = [
    '<header class="rainmeter-editor-header">',
    '  <span class="rainmeter-editor-mark" aria-hidden="true">R</span>',
    '  <span class="rainmeter-editor-heading"><strong id="rainmeter-editor-title">Rainmeter</strong><small>Clock appearance</small></span>',
    '  <button class="rainmeter-editor-close" type="button" data-rainmeter-close aria-label="Close Rainmeter settings"><svg class="icon" aria-hidden="true"><use href="#i-close"></use></svg></button>',
    '</header>',
    '<div class="rainmeter-editor-section rainmeter-enabled-section">',
    '  <label class="rainmeter-switch-row"><span class="rainmeter-switch-copy"><strong>Show Rainmeter</strong><small>Display the desktop clock and date</small></span><input class="sr-only" type="checkbox" data-rainmeter-enabled checked /><span class="rainmeter-switch" aria-hidden="true"></span></label>',
    '</div>',
    '<div class="rainmeter-editor-section">',
    '  <div class="rainmeter-control-heading"><strong>Style</strong><output data-rainmeter-style-value>Poster</output></div>',
    '  <div class="rainmeter-style-options" role="group" aria-label="Clock style">',
    '    <button class="rainmeter-style-option" type="button" data-rainmeter-style="poster" aria-pressed="false"><span class="rainmeter-style-preview is-poster" aria-hidden="true">SUN</span><span>Poster</span></button>',
    '    <button class="rainmeter-style-option" type="button" data-rainmeter-style="classic" aria-pressed="false"><span class="rainmeter-style-preview is-classic" aria-hidden="true">S U N</span><span>Classic</span></button>',
    '    <button class="rainmeter-style-option" type="button" data-rainmeter-style="retro" aria-pressed="false"><span class="rainmeter-style-preview is-retro" aria-hidden="true">SUN 07</span><span>Retro</span></button>',
    '    <button class="rainmeter-style-option" type="button" data-rainmeter-style="botanical" aria-pressed="false"><span class="rainmeter-style-preview is-botanical" aria-hidden="true">SAT</span><span>Botanical</span></button>',
    '    <button class="rainmeter-style-option" type="button" data-rainmeter-style="wheel" aria-pressed="false"><span class="rainmeter-style-preview is-wheel" aria-hidden="true">17:46</span><span>Wheel</span></button>',
    '    <button class="rainmeter-style-option" type="button" data-rainmeter-style="glyph" aria-pressed="false"><span class="rainmeter-style-preview is-glyph" aria-hidden="true">SAT</span><span>Glyph</span></button>',
    '  </div>',
    '</div>',
    '<div class="rainmeter-editor-section">',
    '  <div class="rainmeter-control-heading"><strong>Main color</strong><output data-rainmeter-color-value></output></div>',
    '  <div class="rainmeter-colors" role="group" aria-label="Main color presets">',
    presetColors.map(function (color, index) { return '<button class="rainmeter-color" type="button" data-rainmeter-color="' + color + '" style="--swatch:' + color + '" aria-label="Color preset ' + (index + 1) + '" aria-pressed="false"></button>'; }).join(""),
    '    <label class="rainmeter-custom-color" aria-label="Choose a custom main color"><input type="color" data-rainmeter-custom-color value="#f7f7f7" /></label>',
    '  </div>',
    '  <div class="rainmeter-palette-fields">',
    '    <label class="rainmeter-color-field"><span><strong>Offset shadow</strong><small>Poster depth color</small></span><input type="color" data-rainmeter-accent-color value="#ef4cff" aria-label="Offset shadow color" /></label>',
    '    <label class="rainmeter-color-field"><span><strong>Date</strong><small>Small line color</small></span><input type="color" data-rainmeter-date-color value="#f7f7f7" aria-label="Date color" /></label>',
    '  </div>',
    '</div>',
    '<div class="rainmeter-editor-section">',
    '  <div class="rainmeter-control-heading"><label for="rainmeter-size">Size</label><output data-rainmeter-size-value>100%</output></div>',
    '  <input class="rainmeter-range" id="rainmeter-size" data-rainmeter-size type="range" min="70" max="250" step="5" value="100" />',
    '</div>',
    '<div class="rainmeter-editor-section">',
    '  <div class="rainmeter-control-heading"><label for="rainmeter-opacity">Opacity</label><output data-rainmeter-opacity-value>100%</output></div>',
    '  <input class="rainmeter-range" id="rainmeter-opacity" data-rainmeter-opacity type="range" min="35" max="100" step="5" value="100" />',
    '</div>',
    '<div class="rainmeter-editor-section">',
    '  <div class="rainmeter-control-heading"><strong>Position</strong><output data-rainmeter-position-value>Middle Center</output></div>',
    '  <div class="rainmeter-position-grid" role="group" aria-label="Clock position">',
    positions.map(function (position) { return '<button class="rainmeter-position" type="button" data-rainmeter-position="' + position + '" aria-label="' + labelFor(position) + '" aria-pressed="false"><span aria-hidden="true"></span></button>'; }).join(""),
    '  </div>',
    '</div>',
    '<div class="rainmeter-editor-section">',
    '  <label class="rainmeter-switch-row"><span class="rainmeter-switch-copy"><strong>Text shadow</strong><small>Contrast in Classic and Retro, offset depth in Poster</small></span><input class="sr-only" type="checkbox" data-rainmeter-shadow checked /><span class="rainmeter-switch" aria-hidden="true"></span></label>',
    '</div>',
    '<footer class="rainmeter-editor-footer"><button type="button" data-rainmeter-reset>Reset</button><button class="rainmeter-done" type="button" data-rainmeter-close>Done</button></footer>'
  ].join("");
  document.body.appendChild(panel);

  var sizeInput = panel.querySelector("[data-rainmeter-size]");
  var opacityInput = panel.querySelector("[data-rainmeter-opacity]");
  var customColor = panel.querySelector("[data-rainmeter-custom-color]");
  var accentColor = panel.querySelector("[data-rainmeter-accent-color]");
  var dateColor = panel.querySelector("[data-rainmeter-date-color]");
  var enabledInput = panel.querySelector("[data-rainmeter-enabled]");
  var shadowInput = panel.querySelector("[data-rainmeter-shadow]");

  function labelFor(value) {
    return value.split("-").map(function (word) { return word.charAt(0).toUpperCase() + word.slice(1); }).join(" ");
  }

  function applyState() {
    clock.dataset.rainmeterReady = "true";
    clock.dataset.rainmeterEnabled = state.enabled ? "true" : "false";
    clock.dataset.rainmeterStyle = state.style;
    clock.dataset.rainmeterPosition = state.position;
    clock.dataset.rainmeterShadow = state.shadow ? "true" : "false";
    clock.style.setProperty("--rainmeter-color", state.color);
    clock.style.setProperty("--rainmeter-accent-color", state.accentColor);
    clock.style.setProperty("--rainmeter-date-color", state.dateColor);
    clock.style.setProperty("--rainmeter-scale", String(state.scale / 100));
    clock.style.setProperty("--rainmeter-opacity", String(state.opacity / 100));
    clock.style.setProperty("--rainmeter-text-shadow", state.shadow ? "0 2px 14px rgba(0, 0, 0, .58)" : "none");
    clock.hidden = !state.enabled;
    clock.tabIndex = state.enabled ? 0 : -1;
    window.dispatchEvent(new CustomEvent("neo-rainmeter-change", { detail: Object.assign({}, state) }));
  }

  function saveState() {
    window.clearTimeout(saveTimer);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (error) {}
  }

  function scheduleSave() {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(saveState, 120);
  }

  function syncPanel() {
    sizeInput.value = String(state.scale);
    opacityInput.value = String(state.opacity);
    customColor.value = state.color;
    accentColor.value = state.accentColor;
    dateColor.value = state.dateColor;
    panel.style.setProperty("--rainmeter-editor-main", state.color);
    panel.style.setProperty("--rainmeter-editor-accent", state.accentColor);
    enabledInput.checked = state.enabled;
    shadowInput.checked = state.shadow;
    panel.querySelector("[data-rainmeter-size-value]").textContent = state.scale + "%";
    panel.querySelector("[data-rainmeter-opacity-value]").textContent = state.opacity + "%";
    panel.querySelector("[data-rainmeter-color-value]").textContent = state.color.toUpperCase();
    panel.querySelector("[data-rainmeter-style-value]").textContent = labelFor(state.style);
    panel.querySelector("[data-rainmeter-position-value]").textContent = labelFor(state.position);
    panel.querySelectorAll("[data-rainmeter-style]").forEach(function (button) {
      button.setAttribute("aria-pressed", button.dataset.rainmeterStyle === state.style ? "true" : "false");
    });
    panel.querySelectorAll("[data-rainmeter-color]").forEach(function (button) {
      button.setAttribute("aria-pressed", button.dataset.rainmeterColor === state.color ? "true" : "false");
    });
    panel.querySelectorAll("[data-rainmeter-position]").forEach(function (button) {
      button.setAttribute("aria-pressed", button.dataset.rainmeterPosition === state.position ? "true" : "false");
    });
  }

  function placePanel(x, y) {
    lastAnchor = { x: x, y: y };
    panel.style.left = "8px";
    panel.style.top = "8px";
    var rect = panel.getBoundingClientRect();
    var clockRect = clock.getBoundingClientRect();
    var hasClockAnchor = state.enabled && clockRect.width > 0 && clockRect.height > 0;
    var left = Math.max(8, Math.min(x + 8, window.innerWidth - rect.width - 8));
    var top = y + 8;
    var fitsRight = clockRect.right + rect.width + 10 < window.innerWidth - 8;
    var fitsLeft = clockRect.left - rect.width - 10 > 8;
    if (hasClockAnchor && (fitsRight || fitsLeft)) {
      left = fitsRight && (x >= clockRect.left + clockRect.width / 2 || !fitsLeft) ? clockRect.right + 10 : clockRect.left - rect.width - 10;
      top = clockRect.top;
    } else if (hasClockAnchor && clockRect.bottom + rect.height + 12 < window.innerHeight - 58) top = clockRect.bottom + 10;
    else if (hasClockAnchor && clockRect.top - rect.height - 10 > 8) top = clockRect.top - rect.height - 10;
    top = Math.max(8, Math.min(top, window.innerHeight - rect.height - 8));
    panel.style.left = left + "px";
    panel.style.top = top + "px";
  }

  function keepPanelVisible() {
    if (panel.hidden) return;
    var rect = panel.getBoundingClientRect();
    var left = clamp(rect.left, 8, Math.max(8, window.innerWidth - rect.width - 8));
    var top = clamp(rect.top, 8, Math.max(8, window.innerHeight - rect.height - 8));
    panel.style.left = Math.round(left) + "px";
    panel.style.top = Math.round(top) + "px";
  }

  function openPanel(x, y) {
    var desktopMenu = document.getElementById("desktop-context-menu");
    var taskbarMenu = document.getElementById("neo-taskbar-menu");
    if (desktopMenu) desktopMenu.hidden = true;
    if (taskbarMenu) taskbarMenu.hidden = true;
    returnFocus = document.activeElement;
    syncPanel();
    panel.hidden = false;
    clock.setAttribute("aria-expanded", "true");
    requestAnimationFrame(function () {
      placePanel(x, y);
      panel.focus({ preventScroll: true });
    });
  }

  function closePanel(restore) {
    if (panel.hidden) return;
    panel.hidden = true;
    clock.setAttribute("aria-expanded", "false");
    saveState();
    if (restore && returnFocus && typeof returnFocus.focus === "function") returnFocus.focus({ preventScroll: true });
  }

  clock.tabIndex = 0;
  clock.setAttribute("aria-haspopup", "dialog");
  clock.setAttribute("aria-expanded", "false");
  clock.title = "Right-click to customize Rainmeter";
  applyState();

  document.addEventListener("contextmenu", function (event) {
    if (!clock.contains(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    openPanel(event.clientX, event.clientY);
  }, true);

  clock.addEventListener("keydown", function (event) {
    if (event.key !== "ContextMenu" && !(event.shiftKey && event.key === "F10")) return;
    event.preventDefault();
    var rect = clock.getBoundingClientRect();
    openPanel(rect.left + Math.min(rect.width, 220), rect.top + 28);
  });
  panel.addEventListener("contextmenu", function (event) { event.preventDefault(); });
  panel.addEventListener("click", function (event) {
    var style = event.target.closest("[data-rainmeter-style]");
    var color = event.target.closest("[data-rainmeter-color]");
    var position = event.target.closest("[data-rainmeter-position]");
    if (style) state.style = style.dataset.rainmeterStyle;
    if (color) state.color = color.dataset.rainmeterColor;
    if (position) state.position = position.dataset.rainmeterPosition;
    if (event.target.closest("[data-rainmeter-reset]")) {
      state = Object.assign({}, defaults);
      if (window.NEO_SHELL) window.NEO_SHELL.notify("Rainmeter reset", "Clock settings returned to default.", "refresh");
    }
    if (style || color || position || event.target.closest("[data-rainmeter-reset]")) {
      applyState();
      syncPanel();
      saveState();
    }
    if (event.target.closest("[data-rainmeter-close]")) closePanel(true);
  });

  sizeInput.addEventListener("input", function () {
    state.scale = clamp(sizeInput.value, 70, 250);
    applyState();
    syncPanel();
    scheduleSave();
  });
  opacityInput.addEventListener("input", function () {
    state.opacity = clamp(opacityInput.value, 35, 100);
    applyState();
    syncPanel();
    scheduleSave();
  });
  customColor.addEventListener("input", function () {
    state.color = customColor.value.toLowerCase();
    applyState();
    syncPanel();
    scheduleSave();
  });
  accentColor.addEventListener("input", function () {
    state.accentColor = accentColor.value.toLowerCase();
    applyState();
    syncPanel();
    scheduleSave();
  });
  dateColor.addEventListener("input", function () {
    state.dateColor = dateColor.value.toLowerCase();
    applyState();
    syncPanel();
    scheduleSave();
  });
  shadowInput.addEventListener("change", function () {
    state.shadow = shadowInput.checked;
    applyState();
    saveState();
  });
  enabledInput.addEventListener("change", function () {
    state.enabled = enabledInput.checked;
    applyState();
    syncPanel();
    saveState();
  });

  window.NEO_RAINMETER = {
    getState: function () { return Object.assign({}, state); },
    setEnabled: function (enabled) {
      state.enabled = enabled !== false;
      applyState();
      syncPanel();
      saveState();
      return state.enabled;
    },
    open: function () { openPanel(lastAnchor.x, lastAnchor.y); }
  };

  document.addEventListener("pointerdown", function (event) {
    if (!panel.hidden && !panel.contains(event.target) && !clock.contains(event.target)) closePanel(false);
  }, true);
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !panel.hidden) {
      event.preventDefault();
      closePanel(true);
    }
  });
  window.addEventListener("resize", function () {
    keepPanelVisible();
  }, { passive: true });
})();
