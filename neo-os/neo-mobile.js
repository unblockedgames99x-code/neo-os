(function () {
  "use strict";

  var root = document.documentElement;
  var desktop = document.getElementById("neo-desktop");
  var mobileQuery = window.matchMedia("(max-width: 760px), (pointer: coarse) and (max-width: 1366px), (max-height: 500px) and (max-width: 960px)");
  var coarseQuery = window.matchMedia("(pointer: coarse)");
  var resizeFrame = 0;
  var longPressTimer = 0;
  var longPressStart = null;
  var LONG_PRESS_MS = 560;
  var LONG_PRESS_SLOP = 14;
  var stableViewportHeight = Math.max(window.innerHeight || 0, window.visualViewport ? window.visualViewport.height : 0);

  function isEditable(node) {
    return !!(node && node.closest && node.closest("input, textarea, select, [contenteditable='true']"));
  }

  function isMobile() {
    return mobileQuery.matches;
  }

  function usableViewport() {
    return window.visualViewport || {
      width: window.innerWidth,
      height: window.innerHeight,
      offsetTop: 0,
      offsetLeft: 0
    };
  }

  function updateViewport() {
    resizeFrame = 0;
    var viewport = usableViewport();
    var width = Math.max(1, Math.round(viewport.width || window.innerWidth));
    var height = Math.max(1, Math.round(viewport.height || window.innerHeight));
    var editing = isEditable(document.activeElement);
    if (!editing) stableViewportHeight = Math.max(height, window.innerHeight || 0);
    else stableViewportHeight = Math.max(stableViewportHeight, height, window.innerHeight || 0);
    var keyboardInset = Math.max(0, stableViewportHeight - height - Math.max(0, viewport.offsetTop || 0));
    var keyboardOpen = isMobile() && editing && keyboardInset > 110;

    root.style.setProperty("--neo-visual-width", width + "px");
    root.style.setProperty("--neo-visual-height", height + "px");
    root.style.setProperty("--neo-mobile-keyboard-inset", keyboardInset + "px");
    root.dataset.mobile = isMobile() ? "true" : "false";
    root.dataset.coarsePointer = coarseQuery.matches ? "true" : "false";
    root.dataset.mobileKeyboard = keyboardOpen ? "true" : "false";

    document.querySelectorAll(".desktop-icon, .desktop-shortcut").forEach(function (item) {
      item.draggable = false;
    });
    document.querySelectorAll(".dock-button[data-app]").forEach(function (item) {
      item.draggable = !isMobile() && root.dataset.taskbarAppDragging !== "false";
    });

    window.dispatchEvent(new CustomEvent("neo-mobile-viewport-change", {
      detail: { mobile: isMobile(), width: width, height: height, keyboardOpen: keyboardOpen }
    }));
    window.dispatchEvent(new CustomEvent("neo-window-resized"));
  }

  function queueViewportUpdate() {
    if (resizeFrame) return;
    resizeFrame = window.requestAnimationFrame(updateViewport);
  }

  function openDesktopMenu(x, y) {
    if (!desktop) return;
    var viewport = usableViewport();
    var clientX = Number.isFinite(x) ? x : Math.max(16, Math.round(viewport.width / 2));
    var clientY = Number.isFinite(y) ? y : Math.max(16, Math.round(viewport.height - 96));
    desktop.dispatchEvent(new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: clientX,
      clientY: clientY,
      view: window
    }));
  }

  function cancelLongPress() {
    if (longPressTimer) window.clearTimeout(longPressTimer);
    longPressTimer = 0;
    longPressStart = null;
  }

  function canLongPress(target) {
    return !!(desktop && target && desktop.contains(target) && !target.closest(
      ".neo-window, .taskbar, .app-launcher, .notification-center, .desktop-context-menu, " +
      "button, a, input, textarea, select, label, [role='button'], [contenteditable='true']"
    ));
  }

  function bindLongPress() {
    if (!desktop || desktop.dataset.mobileLongPressBound === "true") return;
    desktop.dataset.mobileLongPressBound = "true";

    desktop.addEventListener("pointerdown", function (event) {
      if (!isMobile() || event.pointerType === "mouse" || !event.isPrimary || !canLongPress(event.target)) return;
      cancelLongPress();
      longPressStart = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
      longPressTimer = window.setTimeout(function () {
        if (!longPressStart) return;
        if (navigator.vibrate) {
          try { navigator.vibrate(18); } catch (error) {}
        }
        openDesktopMenu(longPressStart.x, longPressStart.y);
        cancelLongPress();
      }, LONG_PRESS_MS);
    }, { passive: true });

    desktop.addEventListener("pointermove", function (event) {
      if (!longPressStart || event.pointerId !== longPressStart.pointerId) return;
      if (Math.hypot(event.clientX - longPressStart.x, event.clientY - longPressStart.y) > LONG_PRESS_SLOP) cancelLongPress();
    }, { passive: true });

    ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (name) {
      desktop.addEventListener(name, cancelLongPress, { passive: true });
    });
  }

  function bindControls() {
    document.addEventListener("click", function (event) {
      var menuButton = event.target.closest("[data-mobile-desktop-menu]");
      if (menuButton) {
        event.preventDefault();
        event.stopPropagation();
        var rect = menuButton.getBoundingClientRect();
        openDesktopMenu(rect.left + rect.width / 2, rect.bottom + 8);
        return;
      }

      var dockButton = event.target.closest(".dock-button[data-app]");
      if (dockButton && isMobile()) {
        window.requestAnimationFrame(function () {
          try { dockButton.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" }); } catch (error) {}
        });
      }
    });

    document.addEventListener("focusin", function (event) {
      if (!isMobile() || !isEditable(event.target)) return;
      window.setTimeout(function () {
        queueViewportUpdate();
        try { event.target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" }); } catch (error) {}
      }, 180);
    });

    document.addEventListener("focusout", function () {
      window.setTimeout(queueViewportUpdate, 100);
    });
  }

  function observeInteractiveItems() {
    var dock = document.getElementById("neo-dock");
    if (!dock || !window.MutationObserver) return;
    new MutationObserver(queueViewportUpdate).observe(dock, { childList: true, subtree: true });
  }

  function init() {
    updateViewport();
    bindControls();
    bindLongPress();
    observeInteractiveItems();

    window.addEventListener("resize", queueViewportUpdate, { passive: true });
    window.addEventListener("orientationchange", function () {
      stableViewportHeight = 0;
      window.setTimeout(queueViewportUpdate, 80);
    }, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", queueViewportUpdate, { passive: true });
      window.visualViewport.addEventListener("scroll", queueViewportUpdate, { passive: true });
    }
    if (mobileQuery.addEventListener) mobileQuery.addEventListener("change", queueViewportUpdate);
    else if (mobileQuery.addListener) mobileQuery.addListener(queueViewportUpdate);

    window.NEOMobile = {
      isMobile: isMobile,
      refresh: updateViewport,
      openDesktopMenu: openDesktopMenu
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
