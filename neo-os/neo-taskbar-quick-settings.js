(function () {
  "use strict";

  var panel = document.getElementById("taskbar-quick-settings");
  var toggle = document.querySelector("[data-taskbar-quick-toggle]");
  if (!panel || !toggle) return;

  var root = document.documentElement;
  var volume = panel.querySelector("[data-taskbar-quick-volume]");
  var volumeOutput = panel.querySelector("[data-taskbar-quick-volume-output]");
  var brightness = panel.querySelector("[data-taskbar-quick-brightness]");
  var brightnessOutput = panel.querySelector("[data-taskbar-quick-brightness-output]");
  var dnd = panel.querySelector("[data-taskbar-quick-dnd]");
  var night = panel.querySelector("[data-taskbar-quick-night]");
  var battery = panel.querySelector("[data-taskbar-quick-battery]");
  var focusKey = "neo_os_do_not_disturb_v1";
  var nightKey = "neo_os_night_light_v1";
  var returnFocus = null;

  function readBoolean(key) {
    try { return localStorage.getItem(key) === "true"; } catch (error) { return false; }
  }

  function writeBoolean(key, value) {
    try { localStorage.setItem(key, String(Boolean(value))); } catch (error) {}
  }

  function setPressed(button, value) {
    if (!button) return;
    button.setAttribute("aria-pressed", String(Boolean(value)));
    button.classList.toggle("is-active", Boolean(value));
  }

  function sync() {
    var system = window.NEO_SYSTEM_BRIDGE && window.NEO_SYSTEM_BRIDGE.get
      ? window.NEO_SYSTEM_BRIDGE.get()
      : { volume: 70, brightness: 100 };
    var volumeValue = Math.max(0, Math.min(100, Number(system.volume) || 0));
    var brightnessValue = Math.max(45, Math.min(100, Number(system.brightness) || 100));
    volume.value = String(volumeValue);
    volumeOutput.textContent = Math.round(volumeValue) + "%";
    brightness.value = String(brightnessValue);
    brightnessOutput.textContent = Math.round(brightnessValue) + "%";
    var batterySaver = Boolean(window.NEO_SHELL && window.NEO_SHELL.getSetting("batterySaver"));
    setPressed(battery, batterySaver);
    setPressed(dnd, root.dataset.neoDnd === "true");
    setPressed(night, root.dataset.nightLight === "true");
  }

  function setOpen(open) {
    var shouldOpen = Boolean(open);
    panel.hidden = !shouldOpen;
    toggle.setAttribute("aria-expanded", String(shouldOpen));
    if (!shouldOpen) {
      if (returnFocus && returnFocus.isConnected) returnFocus.focus({ preventScroll: true });
      returnFocus = null;
      return;
    }
    returnFocus = document.activeElement;
    sync();
    requestAnimationFrame(function () {
      var first = panel.querySelector("button:not([disabled]), input:not([disabled])");
      if (first) first.focus({ preventScroll: true });
    });
  }

  root.dataset.neoDnd = String(readBoolean(focusKey));
  root.dataset.nightLight = String(readBoolean(nightKey));
  sync();

  volume.addEventListener("input", function () {
    var value = Math.max(0, Math.min(100, Number(volume.value) || 0));
    if (window.NEO_SYSTEM_BRIDGE) window.NEO_SYSTEM_BRIDGE.set({ volume: value, muted: false });
    volumeOutput.textContent = Math.round(value) + "%";
  });

  brightness.addEventListener("input", function () {
    var value = Math.max(45, Math.min(100, Number(brightness.value) || 100));
    if (window.NEO_SYSTEM_BRIDGE) window.NEO_SYSTEM_BRIDGE.set({ brightness: value });
    brightnessOutput.textContent = Math.round(value) + "%";
  });

  document.addEventListener("click", function (event) {
    if (event.target.closest("[data-taskbar-quick-toggle]")) {
      event.preventDefault();
      setOpen(panel.hidden);
      return;
    }
    if (event.target.closest("[data-taskbar-quick-close]")) {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.target.closest("[data-taskbar-quick-dnd]")) {
      var quiet = root.dataset.neoDnd !== "true";
      root.dataset.neoDnd = String(quiet);
      writeBoolean(focusKey, quiet);
      setPressed(dnd, quiet);
      return;
    }
    if (event.target.closest("[data-taskbar-quick-night]")) {
      var warm = root.dataset.nightLight !== "true";
      root.dataset.nightLight = String(warm);
      writeBoolean(nightKey, warm);
      setPressed(night, warm);
      return;
    }
    if (event.target.closest("[data-taskbar-quick-battery]")) {
      var saver = !(window.NEO_SHELL && window.NEO_SHELL.getSetting("batterySaver"));
      if (window.NEO_SHELL) window.NEO_SHELL.setSetting("batterySaver", saver);
      setPressed(battery, saver);
      return;
    }
    if (event.target.closest("[data-taskbar-quick-network], [data-notification-toggle], [data-taskbar-quick-settings-link]")) {
      setOpen(false);
      return;
    }
    if (!panel.hidden && !event.target.closest("#taskbar-quick-settings")) setOpen(false);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !panel.hidden) {
      event.preventDefault();
      setOpen(false);
    }
  });
  window.addEventListener("neo-system-state", sync);
  window.addEventListener("neo-performance-mode-change", sync);
})();
