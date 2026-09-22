(function () {
  "use strict";

  var finePointer = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)");
  if (finePointer && !finePointer.matches) return;

  var root = document.documentElement;
  var statusBar = document.querySelector(".neo-status-strip");
  var activeWindow = null;
  var lockedWindow = null;
  var statusHideTimer = 0;
  var windowHideTimer = 0;
  var statusEdge = 7;
  var hideDelay = 260;

  function windowEdgeSize() {
    if (root.dataset.windowBarStyle === "pill") return 38;
    return root.dataset.windowBarStyle === "ultra" ? 32 : 11;
  }

  function asElement(target) {
    return target && target.nodeType === 1 ? target : null;
  }

  function isVisibleWindow(win) {
    return Boolean(
      win &&
      win.isConnected &&
      !win.classList.contains("is-minimized") &&
      !win.classList.contains("is-closing")
    );
  }

  function clearStatusHide() {
    if (!statusHideTimer) return;
    window.clearTimeout(statusHideTimer);
    statusHideTimer = 0;
  }

  function revealStatus() {
    if (!statusBar) return;
    clearStatusHide();
    statusBar.classList.add("is-edge-revealed");
  }

  function hideStatusSoon() {
    if (!statusBar || statusHideTimer) return;
    statusHideTimer = window.setTimeout(function () {
      statusHideTimer = 0;
      if (statusBar.matches(":hover") || statusBar.contains(document.activeElement)) return;
      statusBar.classList.remove("is-edge-revealed");
    }, hideDelay);
  }

  function clearWindowHide() {
    if (!windowHideTimer) return;
    window.clearTimeout(windowHideTimer);
    windowHideTimer = 0;
  }

  function notifyEmbeddedChrome(win, visible) {
    if (!win) return;
    win.querySelectorAll("iframe").forEach(function (frame) {
      try {
        frame.contentWindow.postMessage({
          type: "neo-shell:window-chrome",
          visible: visible === true
        }, "*");
      } catch (error) {}
    });
  }

  function revealWindow(win) {
    if (!isVisibleWindow(win)) return;
    clearWindowHide();
    if (activeWindow && activeWindow !== win && activeWindow !== lockedWindow) {
      activeWindow.classList.remove("is-chrome-revealed");
    }
    activeWindow = win;
    win.classList.add("is-chrome-revealed");
    notifyEmbeddedChrome(win, true);
  }

  function hideWindowSoon(win) {
    if (!win || win === lockedWindow || windowHideTimer) return;
    windowHideTimer = window.setTimeout(function () {
      windowHideTimer = 0;
      var chrome = win.querySelector(":scope > .window-chrome");
      if (
        win === lockedWindow ||
        win.classList.contains("is-dragging") || win.classList.contains("is-resizing") ||
        (chrome && (chrome.matches(":hover") || chrome.contains(document.activeElement)))
      ) return;
      win.classList.remove("is-chrome-revealed");
      notifyEmbeddedChrome(win, false);
      if (activeWindow === win) activeWindow = null;
    }, hideDelay);
  }

  function edgeWindowAt(x, y) {
    if (!document.elementsFromPoint) return null;
    var stack = document.elementsFromPoint(x, y);
    var checked = null;
    for (var i = 0; i < stack.length; i += 1) {
      var element = stack[i];
      var win = element && element.closest ? element.closest(".neo-window") : null;
      if (!isVisibleWindow(win)) continue;
      if (!checked) checked = win;
      if (win !== checked) break;
      var rect = win.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.top + windowEdgeSize()) {
        return win;
      }
    }
    return null;
  }

  function onPointerMove(event) {
    if (event.pointerType === "touch") return;

    var target = asElement(event.target);
    var overStatus = Boolean(statusBar && target && statusBar.contains(target));
    if (event.clientY <= statusEdge || overStatus) revealStatus();
    else hideStatusSoon();

    var chrome = target && target.closest ? target.closest(".window-chrome") : null;
    var edgeWindow = edgeWindowAt(event.clientX, event.clientY);
    if (edgeWindow) {
      revealWindow(edgeWindow);
      return;
    }
    if (chrome) {
      revealWindow(chrome.closest(".neo-window"));
      return;
    }
    if (activeWindow) hideWindowSoon(activeWindow);
  }

  function releaseWindowLock() {
    var win = lockedWindow;
    lockedWindow = null;
    if (win) hideWindowSoon(win);
  }

  document.addEventListener("pointermove", onPointerMove, { passive: true });
  document.addEventListener("pointerdown", function (event) {
    var target = asElement(event.target);
    var chrome = target && target.closest ? target.closest(".window-chrome") : null;
    if (!chrome) return;
    lockedWindow = chrome.closest(".neo-window");
    revealWindow(lockedWindow);
  }, true);
  document.addEventListener("pointerup", releaseWindowLock, true);
  document.addEventListener("pointercancel", releaseWindowLock, true);
  document.addEventListener("pointerout", function (event) {
    var target = asElement(event.target);
    var chrome = target && target.closest ? target.closest(".window-chrome") : null;
    if (!chrome) return;
    var next = asElement(event.relatedTarget);
    if (next && chrome.contains(next)) return;
    hideWindowSoon(chrome.closest(".neo-window"));
  }, true);
  document.addEventListener("focusin", function (event) {
    var target = asElement(event.target);
    if (statusBar && target && statusBar.contains(target)) revealStatus();
    var chrome = target && target.closest ? target.closest(".window-chrome") : null;
    if (chrome) revealWindow(chrome.closest(".neo-window"));
  });
  document.addEventListener("focusout", function (event) {
    var target = asElement(event.target);
    if (statusBar && target && statusBar.contains(target)) hideStatusSoon();
    var chrome = target && target.closest ? target.closest(".window-chrome") : null;
    if (chrome) hideWindowSoon(chrome.closest(".neo-window"));
  });
  document.addEventListener("mouseleave", function () {
    hideStatusSoon();
    if (activeWindow) hideWindowSoon(activeWindow);
  });
  window.addEventListener("blur", function () {
    clearStatusHide();
    clearWindowHide();
    lockedWindow = null;
    if (statusBar) statusBar.classList.remove("is-edge-revealed");
    if (activeWindow) activeWindow.classList.remove("is-chrome-revealed");
    if (activeWindow) notifyEmbeddedChrome(activeWindow, false);
    activeWindow = null;
  });

  root.classList.add("neo-auto-hide-bars");
})();
