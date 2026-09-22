(() => {
  const recoveryId = "neo-tv-recovery";
  const recoveryStyleId = "neo-tv-recovery-style";
  let recoveryVisible = false;

  const showRecovery = () => {
    if (recoveryVisible) return;
    recoveryVisible = true;

    if (!document.getElementById(recoveryStyleId)) {
      const style = document.createElement("style");
      style.id = recoveryStyleId;
      style.textContent = `
        #${recoveryId} {
          position: fixed;
          inset: 64px 0 0;
          z-index: 2147483646;
          display: grid;
          place-items: center;
          padding: 24px;
          background: var(--neo-app-bg, #000);
          color: var(--neo-app-text, #fff);
          font-family: var(--neo-font-sans, system-ui, sans-serif);
          text-align: center;
        }
        #${recoveryId} .neo-tv-recovery-card { max-width: 480px; }
        #${recoveryId} h1 { margin: 0 0 10px; font-size: clamp(24px, 4vw, 38px); }
        #${recoveryId} p { margin: 0 0 20px; color: var(--neo-app-muted, #a8a8ad); line-height: 1.55; }
        #${recoveryId} button {
          min-width: 132px;
          min-height: 44px;
          border: 1px solid var(--neo-app-border, #666);
          border-radius: var(--neo-control-radius, 10px);
          background: var(--neo-app-accent, #fff);
          color: var(--neo-app-accent-text, #000);
          font: inherit;
          font-weight: 700;
          cursor: pointer;
        }
      `;
      document.head.appendChild(style);
    }

    const panel = document.createElement("section");
    panel.id = recoveryId;
    panel.setAttribute("role", "alert");
    panel.innerHTML = `
      <div class="neo-tv-recovery-card">
        <h1>NEO TV couldn't finish loading</h1>
        <p>A movie component did not arrive. Check your connection, then retry.</p>
        <button type="button">Retry NEO TV</button>
      </div>
    `;
    panel.querySelector("button").addEventListener("click", () => window.location.reload());
    (document.body || document.documentElement).appendChild(panel);
  };

  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    showRecovery();
  });

  window.addEventListener("unhandledrejection", (event) => {
    const message = String(event.reason?.message || event.reason || "");
    if (/dynamically imported module|failed to fetch|module script|importing a module/i.test(message)) {
      showRecovery();
    }
  });

  const blockedScriptTerms = [
    "popunder",
    "adsterra",
    "doubleclick",
    "googlesyndication",
    "rybbit",
    "pungplaice",
    "maybeoneday.ch",
  ];
  const nativeScriptSrc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, "src");

  if (nativeScriptSrc?.set && nativeScriptSrc.get) {
    Object.defineProperty(HTMLScriptElement.prototype, "src", {
      configurable: nativeScriptSrc.configurable,
      enumerable: nativeScriptSrc.enumerable,
      get: nativeScriptSrc.get,
      set(value) {
        const source = String(value || "").toLowerCase();
        if (blockedScriptTerms.some((term) => source.includes(term))) return;
        nativeScriptSrc.set.call(this, value);
      },
    });
  }
  const originalAppendChild = Node.prototype.appendChild;
  const pictureInPicturePathStart = "M19 7h-8v6h8V7z";
  let shellMuted = false;

  const applyShellMute = () => {
    document.querySelectorAll("audio, video").forEach((media) => {
      media.muted = shellMuted;
      media.defaultMuted = shellMuted;
    });
    document.querySelectorAll("iframe").forEach((frame) => {
      try {
        frame.contentWindow?.postMessage({ type: "neo-shell:set-muted", muted: shellMuted }, "*");
      } catch (_error) {}
    });
  };

  const getPictureInPictureButton = () =>
    Array.from(document.querySelectorAll("button")).find((button) =>
      Array.from(button.querySelectorAll("svg path")).some((path) =>
        (path.getAttribute("d") || "").startsWith(pictureInPicturePathStart),
      ),
    );

  const setFallbackPictureInPicture = (enabled) => {
    document.body?.classList.toggle("neo-picture-in-picture", enabled);
    const button = getPictureInPictureButton();
    if (button) button.setAttribute("aria-pressed", String(enabled));
  };

  const syncPictureInPictureControl = () => {
    const button = getPictureInPictureButton();
    if (!button) {
      if (!document.querySelector("#video-element")) setFallbackPictureInPicture(false);
      return;
    }

    button.dataset.neoPictureInPicture = "true";
    button.setAttribute("aria-label", "Picture in picture");
    button.setAttribute("title", "Picture in picture");
    const video = document.querySelector("#video-element") || document.querySelector("video");
    if (video && !video.dataset.neoWebkitPipBound && typeof video.webkitSetPresentationMode === "function") {
      video.dataset.neoWebkitPipBound = "true";
      video.addEventListener("webkitpresentationmodechanged", syncPictureInPictureControl);
    }
    button.setAttribute(
      "aria-pressed",
      String(Boolean(document.pictureInPictureElement) || video?.webkitPresentationMode === "picture-in-picture" || document.body.classList.contains("neo-picture-in-picture")),
    );
  };

  const togglePictureInPicture = async () => {
    const video = document.querySelector("#video-element") || document.querySelector("video");
    if (!video) return;

    if (document.body.classList.contains("neo-picture-in-picture")) {
      setFallbackPictureInPicture(false);
      return;
    }

    if (document.pictureInPictureElement) {
      try {
        await document.exitPictureInPicture();
      } catch (_error) {
        setFallbackPictureInPicture(false);
      }
      return;
    }

    if (typeof video.webkitSetPresentationMode === "function" && video.webkitSupportsPresentationMode?.("picture-in-picture")) {
      try {
        video.webkitSetPresentationMode(video.webkitPresentationMode === "picture-in-picture" ? "inline" : "picture-in-picture");
        syncPictureInPictureControl();
        return;
      } catch (_error) {
        // Continue to the standard API or NEO TV's in-page fallback.
      }
    }

    if (document.pictureInPictureEnabled && typeof video.requestPictureInPicture === "function") {
      try {
        await video.requestPictureInPicture();
        syncPictureInPictureControl();
        return;
      } catch (_error) {
        // Some embedded browsers expose the API but reject it. Use NEO TV's
        // in-page mini-player so the control remains useful there too.
      }
    }

    setFallbackPictureInPicture(true);
  };

  Node.prototype.appendChild = function appendChild(node) {
    if (node instanceof HTMLScriptElement) {
      const source = (node.src || "").toLowerCase();
      if (blockedScriptTerms.some((term) => source.includes(term)) || node.dataset.zone) {
        return node;
      }
    }
    return originalAppendChild.call(this, node);
  };

  const removePromotions = () => {
    document.title = "NEO TV";

    document.querySelectorAll("script, iframe").forEach((element) => {
      const source = (element.getAttribute("src") || "").toLowerCase();
      if (blockedScriptTerms.some((term) => source.includes(term)) || element.hasAttribute("data-zone")) {
        element.remove();
      }
    });

    const phrases = [
      "join our discord",
      "check out our apps",
      "looking for live tv & sports",
      "support z-stream",
      "tip jar",
      "download z-stream",
    ];

    document.querySelectorAll("p, h1, h2, h3").forEach((element) => {
      const text = (element.textContent || "").trim().toLowerCase();
      if (!phrases.some((phrase) => text === phrase || text.startsWith(phrase))) return;

      let candidate = element.parentElement;
      for (let depth = 0; candidate && candidate !== document.body && depth < 5; depth += 1) {
        if (candidate.querySelector("button")) {
          candidate.setAttribute("data-neo-removed", "true");
          break;
        }
        candidate = candidate.parentElement;
      }
    });

    document.querySelectorAll("a, button, section, aside").forEach((element) => {
      const text = (element.textContent || "").trim().toLowerCase();
      const href = (element.getAttribute("href") || "").toLowerCase();
      if (
        element.getAttribute("data-neo-removed") !== "true" &&
        (href.includes("discord.gg") || phrases.some((phrase) => text === phrase || text.startsWith(phrase)))
      ) {
        element.setAttribute("data-neo-removed", "true");
      }
    });

    document.querySelectorAll("h1, h2, h3, p, span").forEach((element) => {
      const text = element.textContent || "";
      if (/z-stream/i.test(text) && element.children.length === 0) {
        element.textContent = text.replace(/z-stream/gi, "NEO TV");
      }
    });

    document.querySelectorAll("button:not([aria-label])").forEach((button) => {
      if ((button.textContent || "").trim() || !button.querySelector("svg")) return;
      const card = button.closest("a, article, [role='listitem']");
      const heading = card?.querySelector("h1, h2, h3, [data-title]");
      const label = (heading?.textContent || "").trim();
      button.setAttribute("aria-label", label ? `Options for ${label}` : (button.title || "More options"));
    });

    syncPictureInPictureControl();
    applyShellMute();
  };

  let cleanupQueued = false;
  const scheduleCleanup = () => {
    if (cleanupQueued) return;
    cleanupQueued = true;
    window.setTimeout(() => {
      cleanupQueued = false;
      removePromotions();
    }, 80);
  };

  const observer = new MutationObserver(scheduleCleanup);
  window.addEventListener("DOMContentLoaded", () => {
    scheduleCleanup();
    observer.observe(document.documentElement, { childList: true, subtree: true });
  });

  window.addEventListener("message", (event) => {
    if (!event.data || event.data.type !== "neo-shell:set-muted") return;
    shellMuted = Boolean(event.data.muted);
    applyShellMute();
  });

  document.addEventListener(
    "click",
    (event) => {
      const button = event.target.closest?.("[data-neo-picture-in-picture='true']");
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      void togglePictureInPicture();
    },
    true,
  );

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.body.classList.contains("neo-picture-in-picture")) {
      setFallbackPictureInPicture(false);
    }
  });

  document.addEventListener("enterpictureinpicture", syncPictureInPictureControl, true);
  document.addEventListener("leavepictureinpicture", syncPictureInPictureControl, true);
})();
