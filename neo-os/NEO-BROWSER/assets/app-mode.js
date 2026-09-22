(() => {
  "use strict";

  const sourceUrl = document.querySelector('meta[name="neo-source-url"]')?.content || "";
  const launchSearch = window.location.search || (sourceUrl ? new URL(sourceUrl, document.baseURI).search : "");
  const params = new URLSearchParams(launchSearch);
  const appMode = params.get("neo-app-mode") === "1";
  const youtubeMode = appMode && params.get("neo-youtube-mode") === "1";

  const setMuted = (muted) => {
    document.querySelectorAll("audio, video").forEach((media) => {
      media.muted = muted;
    });
    const frame = document.getElementById("frame");
    if (!frame || !frame.contentWindow) return;
    try {
      frame.contentWindow.postMessage({ type: "neo-shell:set-muted", muted }, "*");
    } catch {}
  };

  const relayMediaState = (event) => {
    const frame = document.getElementById("frame");
    if (!frame || event.source !== frame.contentWindow) return;
    const data = event.data;
    if (!data || data.type !== "neo:mediaState") return;
    try {
      window.parent.postMessage({
        type: "neo-shell:media-state",
        active: Boolean(data.playing),
        playing: Boolean(data.playing),
        muted: Boolean(data.muted)
      }, window.location.origin);
    } catch {}
  };

  let videoRouteActive = null;
  const isVideoRoute = (value) => {
    try {
      const host = new URL(String(value || "")).hostname.toLowerCase();
      return host === "youtube.com"
        || host.endsWith(".youtube.com")
        || host === "youtu.be"
        || host.endsWith(".youtu.be");
    } catch {
      return false;
    }
  };
  const relayVideoRoute = (value) => {
    const active = isVideoRoute(value);
    if (active === videoRouteActive) return;
    videoRouteActive = active;
    try {
      window.parent.postMessage({
        type: "neo-shell:video-route",
        active
      }, window.location.origin);
    } catch {}
  };

  window.addEventListener("neo:scramjet:urlchange", (event) => {
    relayVideoRoute(event.detail && event.detail.url);
  });
  document.addEventListener("input", (event) => {
    if (event.target && event.target.id === "url") relayVideoRoute(event.target.value);
  });

  window.addEventListener("message", (event) => {
    if (event.source !== window.parent || event.origin !== window.location.origin) return;
    if (!event.data || event.data.type !== "neo-shell:set-muted") return;
    setMuted(Boolean(event.data.muted));
  });

  window.addEventListener("message", relayMediaState);

  const syncInitialRoute = () => {
    const address = document.getElementById("url");
    if (address) relayVideoRoute(address.value);
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", syncInitialRoute, { once: true });
  } else {
    syncInitialRoute();
  }

  if (!appMode) return;

  let target;
  try {
    target = new URL(params.get("neo-app-target") || "");
  } catch {
    return;
  }
  if (!/^https?:$/.test(target.protocol)) return;

  const mountYouTubePictureInPicture = () => {
    if (!youtubeMode) return;
    const frame = document.getElementById("frame");
    if (!frame) return;
    const currentAllow = frame.getAttribute("allow") || "";
    if (!/(?:^|;)\s*picture-in-picture\s*(?:;|$)/i.test(currentAllow)) {
      frame.setAttribute("allow", `${currentAllow}; picture-in-picture`);
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "neo-youtube-pip";
    button.hidden = true;
    button.setAttribute("aria-label", "Pop out video");
    button.title = "Pop out video";
    button.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3.5" y="4.5" width="17" height="13" rx="2"></rect>
        <rect x="11" y="11" width="9" height="7" rx="1.4"></rect>
      </svg>
      <span>Pop out video</span>`;
    document.body.appendChild(button);

    let timer = 0;
    let messageTimer = 0;
    let currentVideo = null;
    const wiredVideos = new WeakSet();

    const frameDocument = () => {
      try { return frame.contentDocument; } catch { return null; }
    };

    const videoScore = (video) => {
      if (!video) return 0;
      const rect = video.getBoundingClientRect();
      if (rect.width < 160 || rect.height < 90) return 0;
      const style = video.ownerDocument.defaultView.getComputedStyle(video);
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return 0;
      return rect.width * rect.height * (video.paused ? 1 : 2);
    };

    const findVideo = () => {
      const doc = frameDocument();
      if (!doc) return null;
      return Array.from(doc.querySelectorAll("video")).reduce((best, video) => (
        videoScore(video) > videoScore(best) ? video : best
      ), null);
    };

    const setButtonMessage = (message) => {
      window.clearTimeout(messageTimer);
      const label = button.querySelector("span");
      if (label) label.textContent = message;
      button.classList.add("has-message");
      messageTimer = window.setTimeout(() => {
        if (label) label.textContent = "Pop out video";
        button.classList.remove("has-message");
      }, 2200);
    };

    const syncButton = () => {
      if (document.hidden) {
        button.hidden = true;
        return;
      }
      const video = findVideo();
      currentVideo = video;
      if (!video) {
        button.hidden = true;
        button.classList.remove("is-active");
        return;
      }

      if (!wiredVideos.has(video)) {
        wiredVideos.add(video);
        ["loadedmetadata", "play", "pause", "enterpictureinpicture", "leavepictureinpicture"].forEach((name) => {
          video.addEventListener(name, syncButton, { passive: true });
        });
      }

      const rect = video.getBoundingClientRect();
      const frameRect = frame.getBoundingClientRect();
      const center = frameRect.left + rect.left + rect.width / 2;
      const isActive = video.ownerDocument.pictureInPictureElement === video;
      button.style.left = `${Math.max(86, Math.min(window.innerWidth - 86, center))}px`;
      button.style.top = `${Math.max(12, frameRect.top + rect.top + 14)}px`;
      button.hidden = false;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-label", isActive ? "Close popped out video" : "Pop out video");
      button.title = isActive ? "Close popped out video" : "Pop out video";
    };

    button.addEventListener("click", async () => {
      const video = currentVideo || findVideo();
      if (!video) {
        setButtonMessage("Start a video first");
        return;
      }
      const doc = video.ownerDocument;
      try {
        if (doc.pictureInPictureElement) {
          await doc.exitPictureInPicture();
        } else if (typeof video.requestPictureInPicture === "function" && doc.pictureInPictureEnabled !== false) {
          video.disablePictureInPicture = false;
          await video.requestPictureInPicture();
        } else if (typeof video.webkitSetPresentationMode === "function") {
          video.webkitSetPresentationMode("picture-in-picture");
        } else {
          setButtonMessage("Pop-out unavailable");
          return;
        }
        syncButton();
      } catch {
        setButtonMessage("Play the video, then retry");
      }
    });

    const startPolling = () => {
      window.clearInterval(timer);
      syncButton();
      if (!document.hidden) timer = window.setInterval(syncButton, 900);
    };
    frame.addEventListener("load", startPolling);
    document.addEventListener("visibilitychange", startPolling);
    window.addEventListener("resize", syncButton, { passive: true });
    window.addEventListener("pagehide", () => {
      window.clearInterval(timer);
      window.clearTimeout(messageTimer);
      button.remove();
    }, { once: true });
    startPolling();
  };

  mountYouTubePictureInPicture();

  const navigate = () => {
    const address = document.getElementById("url");
    const go = document.getElementById("go");
    if (!address || !go) return false;
    address.value = target.href;
    address.dispatchEvent(new Event("input", { bubbles: true }));
    go.click();
    return true;
  };

  const start = () => {
    if (navigate()) return;
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (navigate() || attempts >= 40) window.clearInterval(timer);
    }, 50);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
