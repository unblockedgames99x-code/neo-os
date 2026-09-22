(function () {
  "use strict";

  var form = document.querySelector("[data-custom-remote-form]");
  var input = document.querySelector("[data-custom-remote-url]");
  var status = document.querySelector("[data-remote-status]");
  var fallback = document.querySelector("[data-popup-fallback]");
  var STORAGE_KEY = "neo_pc_remote_client_v1";

  function setStatus(message, isError) {
    status.textContent = message || "";
    status.classList.toggle("is-error", Boolean(isError));
  }

  function normalizeRemoteUrl(value) {
    var source = String(value || "").trim();
    if (!source) throw new TypeError("Enter your remote client URL.");
    if (!/^[a-z][a-z0-9+.-]*:/i.test(source)) source = "https://" + source;
    var url;
    try { url = new URL(source); } catch (error) { throw new TypeError("Enter a valid remote client URL."); }
    var local = /^(?:localhost|127\.0\.0\.1|\[::1\])$/i.test(url.hostname);
    if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
      throw new TypeError("Remote clients must use HTTPS (local clients may use HTTP).");
    }
    url.username = "";
    url.password = "";
    return url.href;
  }

  function launchRemote(rawUrl) {
    var url;
    try { url = normalizeRemoteUrl(rawUrl); } catch (error) {
      setStatus(error.message || "This remote client could not be opened.", true);
      return false;
    }
    fallback.hidden = true;
    fallback.href = url;
    var popup = null;
    try {
      popup = window.open(url, "_blank", "popup=yes,noopener,noreferrer,resizable=yes,scrollbars=yes,width=1280,height=800");
    } catch (error) {}
    if (!popup) {
      fallback.hidden = false;
      fallback.textContent = "Open " + new URL(url).hostname + " in a secure window";
      setStatus("Your browser blocked the remote window. Use the link below to continue.", true);
      return false;
    }
    setStatus("Remote desktop opened in a separate secure window.", false);
    return true;
  }

  document.querySelectorAll("[data-remote-url]").forEach(function (button) {
    button.addEventListener("click", function () { launchRemote(button.getAttribute("data-remote-url")); });
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    try {
      var url = normalizeRemoteUrl(input.value);
      try { localStorage.setItem(STORAGE_KEY, url); } catch (error) {}
      launchRemote(url);
    } catch (error) {
      setStatus(error.message || "This remote client could not be opened.", true);
    }
  });

  try { input.value = localStorage.getItem(STORAGE_KEY) || ""; } catch (error) {}
  window.NEO_PC_REMOTE = Object.freeze({ launch: launchRemote, normalizeUrl: normalizeRemoteUrl });
})();
