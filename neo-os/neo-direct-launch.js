(function () {
  "use strict";

  var root = document.documentElement;
  var boot;
  var openBlankButton;
  var fullscreenButton;
  var status;
  var bound = false;

  function setStatus(message) {
    if (status) status.textContent = message;
  }

  function start() {
    root.classList.remove("neo-direct-booting");
    if (boot && boot.isConnected) boot.remove();
  }

  function makePortableCopy() {
    var copy = "<!doctype html>" + document.documentElement.outerHTML;
    return copy.replace(/<body([^>]*)>/i, '<body$1 data-neo-autostart="1">');
  }

  function openInBlank(event) {
    setStatus("Opening NEO OS...");
    var popup = window.open("about:blank", "_blank");
    if (!popup) {
      setStatus("Pop-ups are blocked. Allow pop-ups, then try again.");
      return;
    }

    if (event) event.preventDefault();

    try {
      popup.document.open();
      popup.document.write(makePortableCopy());
      popup.document.close();
      popup.focus();
    } catch (error) {
      popup.close();
      setStatus("Could not open the blank window. Try Full screen instead.");
    }
  }

  function enterFullscreen(event) {
    if (event) event.preventDefault();
    var request = root.requestFullscreen || root.webkitRequestFullscreen || root.msRequestFullscreen;
    start();
    if (!request) return;

    try {
      var result = request.call(root, { navigationUI: "hide" });
      if (result && typeof result.catch === "function") result.catch(function () {});
    } catch (error) {
      // The OS remains launched even when a browser blocks fullscreen mode.
    }
  }

  function bind() {
    if (bound) return true;

    boot = document.getElementById("neo-direct-boot") ||
      document.querySelector('[role="dialog"][aria-label="Launch NEO OS"]');
    if (!boot) return false;

    var buttons = boot.querySelectorAll("button, a");
    openBlankButton = document.getElementById("neo-open-blank") || buttons[0];
    fullscreenButton = document.getElementById("neo-fullscreen") || buttons[1];
    status = document.getElementById("neo-direct-status") || boot.querySelector("p");
    if (!openBlankButton || !fullscreenButton) return false;

    bound = true;
    root.classList.add("neo-direct-booting");
    openBlankButton.onclick = openInBlank;
    fullscreenButton.onclick = enterFullscreen;

    if (document.body && document.body.getAttribute("data-neo-autostart") === "1") start();
    return true;
  }

  if (!bind()) {
    document.addEventListener("DOMContentLoaded", bind, { once: true });
    var attempts = 0;
    var bindTimer = window.setInterval(function () {
      attempts += 1;
      if (bind() || attempts >= 80) window.clearInterval(bindTimer);
    }, 50);
  }
})();
