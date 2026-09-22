(function () {
  "use strict";

  var layer = document.getElementById("window-layer");
  if (!layer) return;

  var directions = ["n", "e", "s", "w", "ne", "nw", "se", "sw"];
  var active = null;
  var resizeFrame = 0;
  var tabFullscreenWindow = null;
  var openSnapPanel = null;
  var snapOpenTimer = 0;
  var snapCloseTimer = 0;
  var snapPlacements = {
    "left-half": [0, 0, 0.5, 1],
    "right-half": [0.5, 0, 0.5, 1],
    "left-wide": [0, 0, 0.66, 1],
    "right-third": [0.66, 0, 0.34, 1],
    "left-third": [0, 0, 0.34, 1],
    "center-third": [0.34, 0, 0.32, 1],
    "right-third-equal": [0.66, 0, 0.34, 1],
    "left-wide-stack": [0, 0, 0.66, 1],
    "right-top": [0.66, 0, 0.34, 0.5],
    "right-bottom": [0.66, 0.5, 0.34, 0.5],
    "left-top": [0, 0, 0.34, 0.5],
    "left-bottom": [0, 0.5, 0.34, 0.5],
    "right-wide-stack": [0.34, 0, 0.66, 1],
    "quarter-top-left": [0, 0, 0.5, 0.5],
    "quarter-top-right": [0.5, 0, 0.5, 0.5],
    "quarter-bottom-left": [0, 0.5, 0.5, 0.5],
    "quarter-bottom-right": [0.5, 0.5, 0.5, 0.5]
  };
  var snapLayouts = [
    ["left-half", "right-half"],
    ["left-wide", "right-third"],
    ["left-third", "center-third", "right-third-equal"],
    ["left-wide-stack", "right-top", "right-bottom"],
    ["left-top", "left-bottom", "right-wide-stack"],
    ["quarter-top-left", "quarter-top-right", "quarter-bottom-left", "quarter-bottom-right"]
  ];
  var snapLabels = {
    "left-half": "left half",
    "right-half": "right half",
    "left-wide": "left two thirds",
    "right-third": "right third",
    "left-third": "left third",
    "center-third": "center third",
    "right-third-equal": "right third",
    "left-wide-stack": "left two thirds",
    "right-top": "upper right",
    "right-bottom": "lower right",
    "left-top": "upper left",
    "left-bottom": "lower left",
    "right-wide-stack": "right two thirds",
    "quarter-top-left": "upper left quarter",
    "quarter-top-right": "upper right quarter",
    "quarter-bottom-left": "lower left quarter",
    "quarter-bottom-right": "lower right quarter"
  };

  function clamp(value, minimum, maximum) {
    return Math.min(Math.max(value, minimum), maximum);
  }

  function smallScreen() {
    return window.matchMedia("(max-width: 760px), (pointer: coarse) and (max-width: 1366px), (max-height: 500px) and (max-width: 960px)").matches;
  }

  function limits(win) {
    if (win.classList.contains("is-youtube-popout")) {
      return win.dataset.youtubePopoutMode === "shorts"
        ? { width: 220, height: 391 }
        : { width: 220, height: 124 };
    }
    var style = getComputedStyle(win);
    return {
      width: Math.min(layer.clientWidth, Math.max(280, parseFloat(style.minWidth) || 320)),
      height: Math.min(layer.clientHeight, Math.max(220, parseFloat(style.minHeight) || 280))
    };
  }

  function updateAccessibleSize(handle, win) {
    handle.setAttribute("aria-valuetext", Math.round(win.offsetWidth) + " by " + Math.round(win.offsetHeight) + " pixels");
  }

  function syncFullscreenButton(win, active) {
    if (!win) return;
    var button = win.querySelector('[data-window-action="fullscreen"]');
    if (!button) return;
    button.setAttribute("aria-pressed", active ? "true" : "false");
    button.setAttribute("aria-label", active ? "Exit app fullscreen" : "Enter app fullscreen");
    button.title = active ? "Exit fullscreen (Esc)" : "Fullscreen (Ctrl+B)";
  }

  function syncSnapTaskbar() {
    var root = document.documentElement;
    var taskbar = document.querySelector(".taskbar");
    var snapped = Array.prototype.slice.call(
      layer.querySelectorAll(".neo-window.is-snapped.is-open:not(.is-minimized)")
    );

    if (!taskbar || !snapped.length) {
      root.classList.remove("has-window-snap-mode");
      return;
    }

    // Measure the dock in its visible position. The hiding class moves it off
    // screen, so keeping that class during measurement would make every later
    // overlap check incorrect.
    root.classList.remove("has-window-snap-mode");
    var taskbarRect = taskbar.getBoundingClientRect();
    var covered = snapped.some(function (win) {
      var winRect = win.getBoundingClientRect();
      return winRect.left < taskbarRect.right
        && winRect.right > taskbarRect.left
        && winRect.top < taskbarRect.bottom
        && winRect.bottom > taskbarRect.top;
    });

    root.classList.toggle("has-window-snap-mode", covered);
  }

  function hideSnapLayouts() {
    window.clearTimeout(snapOpenTimer);
    window.clearTimeout(snapCloseTimer);
    snapOpenTimer = 0;
    snapCloseTimer = 0;
    if (!openSnapPanel) return;
    openSnapPanel.classList.remove("is-open");
    openSnapPanel.setAttribute("aria-hidden", "true");
    openSnapPanel = null;
  }

  function showSnapLayouts(panel) {
    if (!panel || smallScreen()) return;
    window.clearTimeout(snapOpenTimer);
    window.clearTimeout(snapCloseTimer);
    if (openSnapPanel && openSnapPanel !== panel) {
      openSnapPanel.classList.remove("is-open");
      openSnapPanel.setAttribute("aria-hidden", "true");
    }
    openSnapPanel = panel;
    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
  }

  function scheduleSnapLayouts(panel) {
    window.clearTimeout(snapCloseTimer);
    window.clearTimeout(snapOpenTimer);
    snapOpenTimer = window.setTimeout(function () { showSnapLayouts(panel); }, 280);
  }

  function scheduleSnapClose() {
    window.clearTimeout(snapOpenTimer);
    window.clearTimeout(snapCloseTimer);
    snapCloseTimer = window.setTimeout(hideSnapLayouts, 240);
  }

  function restoreSnappedWindow(win) {
    if (!win || !win.classList.contains("is-snapped")) return false;
    var restore = win._neoSnapRestore;
    win.classList.remove("is-snapped");
    win.removeAttribute("data-snap-placement");
    if (restore) {
      win.style.left = restore.left;
      win.style.top = restore.top;
      win.style.width = restore.width;
      win.style.height = restore.height;
      win._neoSnapRestore = null;
    }
    syncSnapTaskbar();
    win.dispatchEvent(new CustomEvent("neo-window-resized"));
    return true;
  }

  function snapWindow(win, placementName) {
    var placement = snapPlacements[placementName];
    if (!win || !placement || smallScreen()) return;
    if (!win._neoSnapRestore) {
      win._neoSnapRestore = {
        left: win.style.left,
        top: win.style.top,
        width: win.style.width,
        height: win.style.height
      };
    }

    win.classList.remove("is-maximized");
    var bounds = layer.getBoundingClientRect();
    var outer = 7;
    var gutter = 6;
    var usableWidth = Math.max(1, bounds.width - outer * 2);
    var usableHeight = Math.max(1, bounds.height - outer * 2);
    var x = placement[0];
    var y = placement[1];
    var width = placement[2];
    var height = placement[3];
    var leftInset = x > 0 ? gutter / 2 : 0;
    var rightInset = x + width < 0.999 ? gutter / 2 : 0;
    var topInset = y > 0 ? gutter / 2 : 0;
    var bottomInset = y + height < 0.999 ? gutter / 2 : 0;

    win.style.left = Math.round(outer + usableWidth * x + leftInset) + "px";
    win.style.top = Math.round(outer + usableHeight * y + topInset) + "px";
    win.style.width = Math.round(usableWidth * width - leftInset - rightInset) + "px";
    win.style.height = Math.round(usableHeight * height - topInset - bottomInset) + "px";
    win.classList.add("is-snapped");
    win.dataset.snapPlacement = placementName;
    syncSnapTaskbar();
    hideSnapLayouts();
    win.focus({ preventScroll: true });
    win.dispatchEvent(new CustomEvent("neo-window-snapped", { detail: { placement: placementName } }));
  }

  function createSnapLayouts(win, controls, trigger) {
    if (window.matchMedia("(pointer: coarse)").matches) {
      trigger.title = "Fullscreen";
      return;
    }
    var panel = document.createElement("div");
    panel.className = "neo-snap-layouts";
    panel.setAttribute("role", "group");
    panel.setAttribute("aria-label", "Window snap layouts");
    panel.setAttribute("aria-hidden", "true");

    snapLayouts.forEach(function (layout, layoutIndex) {
      var group = document.createElement("span");
      group.className = "neo-snap-template";
      group.setAttribute("role", "group");
      group.setAttribute("aria-label", "Layout " + (layoutIndex + 1));
      layout.forEach(function (placementName) {
        var placement = snapPlacements[placementName];
        var zone = document.createElement("button");
        zone.type = "button";
        zone.className = "neo-snap-zone";
        zone.dataset.snapPlacement = placementName;
        zone.setAttribute("aria-label", "Snap window to " + snapLabels[placementName]);
        zone.style.setProperty("--snap-x", placement[0] * 100 + "%");
        zone.style.setProperty("--snap-y", placement[1] * 100 + "%");
        zone.style.setProperty("--snap-width", placement[2] * 100 + "%");
        zone.style.setProperty("--snap-height", placement[3] * 100 + "%");
        group.appendChild(zone);
      });
      panel.appendChild(group);
    });

    trigger.title = "Fullscreen and snap layouts";
    trigger.addEventListener("pointerenter", function () { scheduleSnapLayouts(panel); });
    trigger.addEventListener("pointerleave", scheduleSnapClose);
    trigger.addEventListener("focus", function () { showSnapLayouts(panel); });
    panel.addEventListener("pointerenter", function () {
      window.clearTimeout(snapCloseTimer);
      window.clearTimeout(snapOpenTimer);
    });
    panel.addEventListener("pointerleave", scheduleSnapClose);
    panel.addEventListener("focusin", function () { showSnapLayouts(panel); });
    panel.addEventListener("focusout", function () {
      window.setTimeout(function () {
        if (!panel.contains(document.activeElement) && document.activeElement !== trigger) scheduleSnapClose();
      }, 0);
    });
    panel.addEventListener("click", function (event) {
      var zone = event.target.closest("[data-snap-placement]");
      if (!zone) return;
      event.preventDefault();
      event.stopPropagation();
      snapWindow(win, zone.dataset.snapPlacement);
    });
    controls.appendChild(panel);
  }

  function attach(win) {
    if (!win || win.dataset.resizeReady === "true") return;
    win.dataset.resizeReady = "true";
    win.setAttribute("aria-keyshortcuts", "Control+B");
    directions.forEach(function (direction) {
      var handle = document.createElement("span");
      handle.className = "window-resize-handle";
      handle.dataset.windowResize = direction;
      if (direction === "se") {
        handle.tabIndex = 0;
        handle.setAttribute("role", "separator");
        handle.setAttribute("aria-label", "Resize window");
        updateAccessibleSize(handle, win);
      } else {
        handle.setAttribute("aria-hidden", "true");
      }
      win.appendChild(handle);
    });
    var controls = win.querySelector(".window-controls");
    var fullscreen = controls && controls.querySelector('[data-window-action="fullscreen"]');
    if (controls && fullscreen) createSnapLayouts(win, controls, fullscreen);
  }

  function scan(node) {
    if (!node || node.nodeType !== 1) return;
    if (node.matches(".neo-window")) attach(node);
    node.querySelectorAll(".neo-window").forEach(attach);
  }

  function beginResize(event) {
    var handle = event.target.closest("[data-window-resize]");
    if (!handle || active || document.querySelector('.neo-window.is-dragging') || event.button !== 0 || smallScreen()) return;
    var win = handle.closest(".neo-window");
    if (!win || win.classList.contains("is-maximized") || win.classList.contains("is-tab-fullscreen")) return;
    var rect = win.getBoundingClientRect();
    active = {
      handle: handle,
      win: win,
      direction: handle.dataset.windowResize,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      rect: rect,
      bounds: layer.getBoundingClientRect(),
      minimum: limits(win),
      next: null
    };
    handle.setPointerCapture(event.pointerId);
    win.classList.add("is-resizing");
    document.documentElement.classList.add("is-resizing-window", "is-window-interacting");
    window.dispatchEvent(new CustomEvent("neo-window-interaction", { detail: { active: true, source: "window-resize" } }));
    window.dispatchEvent(new CustomEvent("neo-media-priority", { detail: { active: true, source: "window-resize", pauseWallpaper: true } }));
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function leaveSnapForWindowAction(event) {
    var action = event.target.closest("[data-window-action]");
    if (!action) return;
    var win = action.closest(".neo-window");
    if (!win || !win.classList.contains("is-snapped")) return;
    restoreSnappedWindow(win);
  }

  function leaveSnapForDrag(event) {
    if (event.button !== 0 || event.target.closest("button")) return;
    var chrome = event.target.closest(".neo-window.is-snapped > .window-chrome");
    if (!chrome) return;
    restoreSnappedWindow(chrome.closest(".neo-window"));
  }

  function paintResize() {
    resizeFrame = 0;
    if (!active || !active.next) return;
    var next = active.next;
    active.next = null;
    active.win.style.left = Math.round(next.left - active.bounds.left) + "px";
    active.win.style.top = Math.round(next.top - active.bounds.top) + "px";
    active.win.style.width = Math.round(next.width) + "px";
    active.win.style.height = Math.round(next.height) + "px";
  }

  function moveResize(event) {
    if (!active || event.pointerId !== active.pointerId) return;
    var direction = active.direction;
    var start = active.rect;
    var bounds = active.bounds;
    var minimum = active.minimum;
    var samples = typeof event.getCoalescedEvents === "function" ? event.getCoalescedEvents() : [];
    var pointer = samples.length ? samples[samples.length - 1] : event;
    var dx = pointer.clientX - active.x;
    var dy = pointer.clientY - active.y;
    var left = start.left;
    var top = start.top;
    var width = start.width;
    var height = start.height;

    if (direction.includes("e")) width = clamp(start.width + dx, minimum.width, bounds.right - start.left);
    if (direction.includes("s")) height = clamp(start.height + dy, minimum.height, bounds.bottom - start.top);
    if (direction.includes("w")) {
      left = clamp(start.left + dx, bounds.left, start.right - minimum.width);
      width = start.right - left;
    }
    if (direction.includes("n")) {
      top = clamp(start.top + dy, bounds.top, start.bottom - minimum.height);
      height = start.bottom - top;
    }

    if (active.win.classList.contains("is-youtube-popout")) {
      var ratio = active.win.dataset.youtubePopoutMode === "shorts" ? 9 / 16 : 16 / 9;
      var horizontal = direction.includes("e") || direction.includes("w");
      var vertical = direction.includes("n") || direction.includes("s");
      var useWidth = horizontal && (!vertical || Math.abs(dx / start.width) >= Math.abs(dy / start.height));
      var requestedWidth = useWidth ? width : height * ratio;
      var maximumWidth = Math.min(
        direction.includes("w") ? start.right - bounds.left : bounds.right - start.left,
        (direction.includes("n") ? start.bottom - bounds.top : bounds.bottom - start.top) * ratio
      );
      var minimumWidth = Math.max(minimum.width, minimum.height * ratio);
      width = clamp(requestedWidth, minimumWidth, maximumWidth);
      height = width / ratio;
      left = direction.includes("w") ? start.right - width : start.left;
      top = direction.includes("n") ? start.bottom - height : start.top;
    }

    active.next = { left: left, top: top, width: width, height: height };
    if (!resizeFrame) resizeFrame = requestAnimationFrame(paintResize);
  }

  function endResize(event) {
    if (!active || (event.pointerId != null && event.pointerId !== active.pointerId)) return;
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    resizeFrame = 0;
    paintResize();
    if (active.handle.hasPointerCapture(active.pointerId)) active.handle.releasePointerCapture(active.pointerId);
    active.win.classList.remove("is-resizing");
    updateAccessibleSize(active.handle, active.win);
    active.win.dispatchEvent(new CustomEvent("neo-window-resized"));
    document.documentElement.classList.remove("is-resizing-window", "is-window-interacting");
    window.dispatchEvent(new CustomEvent("neo-window-interaction", { detail: { active: false, source: "window-resize" } }));
    window.dispatchEvent(new CustomEvent("neo-media-priority", { detail: { active: false, source: "window-resize", pauseWallpaper: true } }));
    active = null;
  }

  function keyboardResize(event) {
    var handle = event.target.closest('[data-window-resize="se"]');
    if (!handle || smallScreen()) return;
    var win = handle.closest(".neo-window");
    if (!win || win.classList.contains("is-maximized") || win.classList.contains("is-tab-fullscreen")) return;
    var horizontal = event.key === "ArrowLeft" || event.key === "ArrowRight";
    var vertical = event.key === "ArrowUp" || event.key === "ArrowDown";
    if (!horizontal && !vertical) return;
    var step = event.shiftKey ? 24 : 8;
    var rect = win.getBoundingClientRect();
    var bounds = layer.getBoundingClientRect();
    var minimum = limits(win);
    var width = rect.width + (event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0);
    var height = rect.height + (event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0);
    if (win.classList.contains("is-youtube-popout")) {
      var ratio = win.dataset.youtubePopoutMode === "shorts" ? 9 / 16 : 16 / 9;
      if (horizontal) height = width / ratio;
      else width = height * ratio;
    }
    win.style.width = Math.round(clamp(width, minimum.width, bounds.right - rect.left)) + "px";
    win.style.height = Math.round(clamp(height, minimum.height, bounds.bottom - rect.top)) + "px";
    updateAccessibleSize(handle, win);
    win.dispatchEvent(new CustomEvent("neo-window-resized"));
    event.preventDefault();
  }

  function leaveTabFullscreen(returnFocus) {
    if (!tabFullscreenWindow) return false;
    var win = tabFullscreenWindow;
    tabFullscreenWindow = null;
    win.classList.remove("is-tab-fullscreen");
    syncFullscreenButton(win, false);
    document.documentElement.classList.remove("has-tab-fullscreen");
    document.documentElement.removeAttribute("data-tab-fullscreen");
    window.dispatchEvent(new CustomEvent("neo-tab-fullscreen-change", {
      detail: { active: false, appId: win.dataset.appId || "" }
    }));
    if (returnFocus && win.isConnected && !win.classList.contains("is-minimized")) {
      win.focus({ preventScroll: true });
    }
    return true;
  }

  function enterTabFullscreen(win) {
    if (!win) return false;
    if (tabFullscreenWindow && tabFullscreenWindow !== win) leaveTabFullscreen(false);
    tabFullscreenWindow = win;
    win.classList.add("is-tab-fullscreen");
    syncFullscreenButton(win, true);
    document.documentElement.classList.add("has-tab-fullscreen");
    document.documentElement.dataset.tabFullscreen = win.dataset.appId || "app";
    window.dispatchEvent(new CustomEvent("neo-tab-fullscreen-change", {
      detail: { active: true, appId: win.dataset.appId || "" }
    }));
    win.focus({ preventScroll: true });
    return true;
  }

  function activeWindow() {
    return layer.querySelector(".neo-window.is-open.is-active:not(.is-minimized)");
  }

  function handleTabFullscreenShortcut(event) {
    var isShortcut = event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey && event.code === "KeyB";
    if (isShortcut) {
      var win = tabFullscreenWindow || activeWindow();
      if (!win) return;
      event.preventDefault();
      if (event.repeat) return;
      if (tabFullscreenWindow) leaveTabFullscreen(true);
      else enterTabFullscreen(win);
      return;
    }
    if (event.key === "Escape" && tabFullscreenWindow) {
      event.preventDefault();
      leaveTabFullscreen(true);
      return;
    }
    if (event.key === "Escape" && openSnapPanel) {
      event.preventDefault();
      hideSnapLayouts();
      return;
    }
    if (event.key === "Escape") {
      var snapped = activeWindow();
      if (snapped && snapped.classList.contains("is-snapped")) {
        event.preventDefault();
        restoreSnappedWindow(snapped);
      }
    }
  }

  function handleFullscreenButton(event) {
    var button = event.target.closest('[data-window-action="fullscreen"]');
    if (!button) return;
    var win = button.closest(".neo-window");
    if (!win) return;
    event.preventDefault();
    hideSnapLayouts();
    if (tabFullscreenWindow === win) leaveTabFullscreen(true);
    else enterTabFullscreen(win);
  }

  function syncTabFullscreen() {
    if (!tabFullscreenWindow) return;
    if (!tabFullscreenWindow.isConnected || !tabFullscreenWindow.classList.contains("is-open") || tabFullscreenWindow.classList.contains("is-minimized")) {
      leaveTabFullscreen(false);
    }
  }

  document.addEventListener("pointerdown", beginResize);
  document.addEventListener("pointerdown", leaveSnapForDrag, true);
  document.addEventListener("pointermove", moveResize);
  document.addEventListener("pointerup", endResize);
  document.addEventListener("pointercancel", endResize);
  document.addEventListener("lostpointercapture", endResize);
  document.addEventListener("keydown", keyboardResize);
  document.addEventListener("keydown", handleTabFullscreenShortcut, true);
  document.addEventListener("click", leaveSnapForWindowAction, true);
  document.addEventListener("click", handleFullscreenButton);
  var windowSyncFrame = 0;
  function scheduleWindowSync() {
    if (windowSyncFrame) return;
    windowSyncFrame = requestAnimationFrame(function () {
      windowSyncFrame = 0;
      syncTabFullscreen();
      syncSnapTaskbar();
    });
  }
  window.addEventListener("resize", scheduleWindowSync);
  window.addEventListener("neo-taskbar-layout-change", scheduleWindowSync);
  document.addEventListener("pointerdown", function (event) {
    if (openSnapPanel && !event.target.closest(".neo-snap-layouts, [data-window-action='fullscreen']")) hideSnapLayouts();
  }, true);

  scan(layer);
  new MutationObserver(function (records) {
    var changed = false;
    records.forEach(function (record) {
      // App content, media progress, and widget updates do not change window
      // geometry. Only window roots and the layer's children affect this state.
      if (record.type === "attributes") {
        if (record.target.parentElement === layer && record.target.classList.contains("neo-window")) changed = true;
      } else if (record.target === layer) {
        record.addedNodes.forEach(scan);
        changed = true;
      }
    });
    if (changed) scheduleWindowSync();
  }).observe(layer, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
})();
