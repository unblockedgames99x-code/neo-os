(function () {
  "use strict";

  var api = null;
  var preview = null;
  var minimizedTray = null;
  var showTimer = 0;
  var hideTimer = 0;
  var activeId = "";
  var anchor = null;
  var xenoClose = null;
  var xenoCloseId = "";
  var xenoCloseTimer = 0;
  var nowPlayingState = null;
  var staticPreviewCache = new Map();
  var minimizedCardCache = new Map();

  function previewsEnabled() {
    // The compact hover close affordance stays available in every performance
    // mode. Large hover previews are intentionally not rendered.
    return true;
  }

  function previewSnapshotsEnabled() {
    return true;
  }

  function clearTimers() {
    window.clearTimeout(showTimer);
    window.clearTimeout(hideTimer);
    showTimer = 0;
    hideTimer = 0;
  }

  function appName(app) {
    if (!app) return "Application";
    return String(app.accessibleName || app.title || "Application");
  }

  function visibleTitle(app) {
    return app ? String(app.title || app.accessibleName || "Application") : "Application";
  }

  function cloneIcon(button) {
    var icon = button && button.querySelector(".dock-app-art");
    if (!icon) return document.createElement("span");

    // Dock artwork is tiny and owned by the shell. Recreate only that markup;
    // never copy a live application/window subtree into a preview.
    var copy = icon.cloneNode(false);
    copy.innerHTML = icon.innerHTML;
    copy.removeAttribute("id");
    copy.removeAttribute("data-app");
    copy.querySelectorAll("[id], [data-app]").forEach(function (node) {
      node.removeAttribute("id");
      node.removeAttribute("data-app");
    });
    return copy;
  }

  function mediaPlaceholder(ownerDocument, label) {
    var placeholder = ownerDocument.createElement("div");
    placeholder.className = "neo-taskbar-preview-media";
    placeholder.textContent = label || "Live content";
    return placeholder;
  }

  function replaceWithImage(copy, source, dataUrl) {
    if (!copy || !copy.parentNode || !dataUrl) return false;
    var image = copy.ownerDocument.createElement("img");
    image.className = copy.className || "";
    image.alt = "";
    image.src = dataUrl;
    image.style.cssText = copy.getAttribute("style") || "";
    image.style.width = "100%";
    image.style.height = "100%";
    image.style.objectFit = "cover";
    if (source.width) image.width = source.width;
    if (source.height) image.height = source.height;
    copy.replaceWith(image);
    return true;
  }

  function snapshotDocument(frameDocument, depth) {
    if (!frameDocument || !frameDocument.documentElement) return "";
    var root = frameDocument.documentElement.cloneNode(true);
    syncLiveState(frameDocument.documentElement, root, Math.max(0, depth || 0));
    root.querySelectorAll("script, noscript").forEach(function (node) { node.remove(); });
    [root].concat(Array.from(root.querySelectorAll("*"))).forEach(function (node) {
      Array.from(node.attributes || []).forEach(function (attribute) {
        if (/^on/i.test(attribute.name)) node.removeAttribute(attribute.name);
      });
      if (node.matches && node.matches("input, textarea, select, button, a, audio, video")) node.tabIndex = -1;
    });
    var head = root.querySelector("head");
    if (!head) {
      head = root.ownerDocument.createElement("head");
      root.prepend(head);
    }
    var base = root.ownerDocument.createElement("base");
    base.href = frameDocument.baseURI || document.baseURI;
    head.prepend(base);
    var freeze = root.ownerDocument.createElement("style");
    freeze.textContent = "*{pointer-events:none!important;animation-play-state:paused!important;caret-color:transparent!important}html,body{overflow:hidden!important}";
    head.appendChild(freeze);
    return "<!doctype html>" + root.outerHTML;
  }

  function syncLiveState(sourceRoot, cloneRoot, frameDepth) {
    var sources = [sourceRoot].concat(Array.from(sourceRoot.querySelectorAll("*")));
    var copies = [cloneRoot].concat(Array.from(cloneRoot.querySelectorAll("*")));
    sources.forEach(function (source, index) {
      var copy = copies[index];
      if (!copy || !source.tagName) return;
      var tag = source.tagName.toLowerCase();

      if (tag === "input") {
        if (source.type !== "file") {
          copy.value = source.value;
          copy.setAttribute("value", source.value);
        }
        copy.toggleAttribute("checked", Boolean(source.checked));
      } else if (tag === "textarea") {
        copy.value = source.value;
        copy.textContent = source.value;
      } else if (tag === "select") {
        copy.value = source.value;
        Array.from(copy.options || []).forEach(function (option, optionIndex) {
          option.toggleAttribute("selected", optionIndex === source.selectedIndex);
        });
      } else if (tag === "details") {
        copy.toggleAttribute("open", Boolean(source.open));
      } else if (tag === "canvas") {
        try { replaceWithImage(copy, source, source.toDataURL("image/png")); } catch (error) {}
      } else if (tag === "video") {
        try {
          var canvas = source.ownerDocument.createElement("canvas");
          canvas.width = Math.max(1, source.videoWidth || source.clientWidth || 320);
          canvas.height = Math.max(1, source.videoHeight || source.clientHeight || 180);
          canvas.getContext("2d").drawImage(source, 0, 0, canvas.width, canvas.height);
          if (!replaceWithImage(copy, source, canvas.toDataURL("image/jpeg", 0.78)) && source.poster) {
            replaceWithImage(copy, source, source.poster);
          }
        } catch (error) {
          if (source.poster) replaceWithImage(copy, source, source.poster);
        }
      } else if (tag === "iframe") {
        var sourceDocument = null;
        try { sourceDocument = source.contentDocument; } catch (error) {}
        var frameSource = frameDepth > 0 ? snapshotDocument(sourceDocument, frameDepth - 1) : "";
        if (frameSource) {
          copy.removeAttribute("src");
          copy.removeAttribute("loading");
          copy.setAttribute("sandbox", "");
          copy.srcdoc = frameSource;
        } else if (copy.parentNode) {
          copy.replaceWith(mediaPlaceholder(copy.ownerDocument, "Current app content"));
        }
      }
    });
  }

  function liveWindowSnapshot(win, viewport) {
    if (!previewSnapshotsEnabled()) return null;
    var width = Math.max(420, win.offsetWidth || parseFloat(win.style.width) || 1000);
    var height = Math.max(300, win.offsetHeight || parseFloat(win.style.height) || 700);
    var targetWidth = Math.max(240, Math.min(348, window.innerWidth - 36));
    var targetHeight = targetWidth * 9 / 16;
    var scale = Math.min(targetWidth / width, targetHeight / height);
    var left = Math.max(0, (targetWidth - width * scale) / 2);
    var top = Math.max(0, (targetHeight - height * scale) / 2);
    var clone = win.cloneNode(true);
    clone.classList.remove("is-minimized", "is-minimizing", "is-closing", "is-active", "is-dragging", "is-resizing", "is-maximized", "is-snapped", "is-tab-fullscreen");
    clone.classList.add("is-open", "neo-taskbar-preview-clone");
    clone.removeAttribute("inert");
    clone.removeAttribute("aria-hidden");
    syncLiveState(win, clone, 1);
    clone.querySelectorAll("script, noscript").forEach(function (node) { node.remove(); });
    [clone].concat(Array.from(clone.querySelectorAll("*"))).forEach(function (node) {
      Array.from(node.attributes || []).forEach(function (attribute) {
        if (/^on/i.test(attribute.name)) node.removeAttribute(attribute.name);
      });
    });

    var styles = Array.from(document.head.querySelectorAll('link[rel="stylesheet"], style'))
      .map(function (node) { return node.outerHTML; })
      .join("");
    var baseHref = String(document.baseURI).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
    var stageStyle = "position:absolute;left:" + left + "px;top:" + top + "px;width:" + width + "px;height:" + height + "px;transform:scale(" + scale + ");transform-origin:top left";
    var frameDocument = "<!doctype html><html data-performance-mode=\"" + (document.documentElement.dataset.performanceMode || "normal") + "\" data-interface-style=\"" + (document.documentElement.dataset.interfaceStyle || "modern") + "\"><head><base href=\"" + baseHref + "\">" + styles + "<style>html,body{width:100%;height:100%;margin:0;overflow:hidden;background:#08090b;color-scheme:dark}*{pointer-events:none!important;animation-play-state:paused!important;caret-color:transparent!important}#neo-preview-stage>.neo-window{position:absolute!important;inset:0!important;width:" + width + "px!important;height:" + height + "px!important;min-width:0!important;min-height:0!important;display:grid!important;visibility:visible!important;opacity:1!important;transform:none!important;transition:none!important;resize:none!important;border-radius:6px!important}</style></head><body><div id=\"neo-preview-stage\" style=\"" + stageStyle + "\">" + clone.outerHTML + "</div></body></html>";
    var frame = document.createElement("iframe");
    frame.className = "neo-taskbar-preview-snapshot";
    frame.title = "Current window preview";
    frame.tabIndex = -1;
    frame.setAttribute("sandbox", "");
    frame.srcdoc = frameDocument;
    viewport.dataset.previewType = "current-state";
    return frame;
  }

  function fullscreenActive() {
    var root = document.documentElement;
    return Boolean(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      root.hasAttribute("data-tab-fullscreen") ||
      root.dataset.fullscreen === "true"
    );
  }

  function xenoCloseMode() {
    return document.documentElement.dataset.taskbarStyle === "xeno";
  }

  function clearXenoCloseTimer() {
    window.clearTimeout(xenoCloseTimer);
    xenoCloseTimer = 0;
  }

  function positionXenoClose(button) {
    if (!xenoClose || xenoClose.hidden || !button || !button.isConnected) return;
    var rect = button.getBoundingClientRect();
    var width = xenoClose.offsetWidth || 24;
    var height = xenoClose.offsetHeight || 24;
    var left = rect.right - width - 7;
    var top = rect.top + (rect.height - height) / 2;
    xenoClose.style.left = Math.round(Math.max(4, Math.min(left, window.innerWidth - width - 4))) + "px";
    xenoClose.style.top = Math.round(Math.max(4, Math.min(top, window.innerHeight - height - 4))) + "px";
  }

  function hideXenoClose() {
    clearXenoCloseTimer();
    if (anchor) anchor.classList.remove("has-xeno-close");
    xenoCloseId = "";
    if (!xenoClose) return;
    xenoClose.hidden = true;
    xenoClose.removeAttribute("data-app");
  }

  function queueHideXenoClose(delay) {
    clearXenoCloseTimer();
    xenoCloseTimer = window.setTimeout(hideXenoClose, delay == null ? 100 : delay);
  }

  function showXenoClose(button) {
    if (!api || !xenoClose || !button || !button.isConnected) return;
    var id = button.dataset.app;
    var win = api.windows.get(id);
    if (!win) {
      hideXenoClose();
      return;
    }
    clearTimers();
    clearXenoCloseTimer();
    if (anchor && anchor !== button) anchor.classList.remove("has-xeno-close");
    activeId = "";
    anchor = button;
    preview.classList.remove("is-open");
    preview.hidden = true;
    preview.querySelector("[data-taskbar-preview-viewport]").textContent = "";
    xenoCloseId = id;
    button.classList.add("has-xeno-close");
    xenoClose.dataset.app = id;
    xenoClose.setAttribute("aria-label", "Close " + appName(api.apps[id]));
    xenoClose.hidden = false;
    requestAnimationFrame(function () {
      if (xenoCloseId === id) positionXenoClose(button);
    });
  }

  function createXenoClose() {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "neo-xeno-taskbar-close";
    button.hidden = true;
    button.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-close"></use></svg>';
    button.addEventListener("pointerenter", clearXenoCloseTimer);
    button.addEventListener("pointerleave", function (event) {
      if (anchor && event.relatedTarget && anchor.contains(event.relatedTarget)) return;
      queueHideXenoClose(90);
    });
    button.addEventListener("focus", clearXenoCloseTimer);
    button.addEventListener("blur", function () { queueHideXenoClose(80); });
    button.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      var win = api && api.windows.get(xenoCloseId);
      hideXenoClose();
      if (win) api.close(win);
    });
    document.body.appendChild(button);
    return button;
  }

  function dockButton(id) {
    if (!api || !api.dock) return null;
    return Array.from(api.dock.querySelectorAll(".dock-button[data-app]")).find(function (button) {
      return button.dataset.app === id;
    }) || null;
  }

  function previewCacheKey(slot, id, stateText) {
    return String(slot || "preview") + "\u0000" + String(id || "application") + "\u0000" + String(stateText || "Running");
  }

  function forgetCachedPreviews(id, slot) {
    var idMarker = "\u0000" + String(id || "application") + "\u0000";
    var slotMarker = slot ? String(slot) + "\u0000" : "";
    staticPreviewCache.forEach(function (node, key) {
      if (key.indexOf(idMarker) === -1 || (slotMarker && key.indexOf(slotMarker) !== 0)) return;
      if (node && node.isConnected) node.remove();
      staticPreviewCache.delete(key);
    });
  }

  function staticPreview(button, app, stateText, id, slot) {
    var key = previewCacheKey(slot, id, stateText);
    var cached = staticPreviewCache.get(key);
    if (cached) return cached;

    var fallback = document.createElement("div");
    fallback.className = "neo-taskbar-preview-fallback";
    fallback.dataset.previewType = "static";
    fallback.setAttribute("aria-hidden", "true");
    var icon = cloneIcon(button);
    icon.classList.add("neo-taskbar-preview-fallback-icon");
    fallback.appendChild(icon);
    var copy = document.createElement("span");
    var strong = document.createElement("strong");
    strong.textContent = visibleTitle(app);
    var small = document.createElement("small");
    small.textContent = stateText;
    copy.append(strong, small);
    fallback.appendChild(copy);
    staticPreviewCache.set(key, fallback);
    return fallback;
  }

  function renderWindow(win, button, app) {
    var viewport = preview.querySelector("[data-taskbar-preview-viewport]");
    viewport.textContent = "";
    var minimized = win.classList.contains("is-minimized");
    var stateText = minimized ? "Minimized" : "Running";
    preview.classList.remove("is-close-only");
    preview.dataset.windowState = minimized ? "minimized" : "running";
    preview.querySelector("[data-taskbar-preview-status]").textContent = stateText;
    preview.querySelector("[data-taskbar-preview-title]").textContent = visibleTitle(app);
    preview.querySelector("[data-taskbar-preview-open]").setAttribute("aria-label", (minimized ? "Restore " : "Switch to ") + appName(app));
    preview.querySelector("[data-taskbar-preview-close]").setAttribute("aria-label", "Close " + appName(app));
    var snapshot = liveWindowSnapshot(win, viewport);
    viewport.appendChild(snapshot || staticPreview(button, app, stateText, win.dataset.appId, "hover"));
  }

  function renderMinimizedViewport(viewport, win, button, app, id) {
    var music = minimizedMusicState(id || win.dataset.appId);
    if (music) {
      renderMinimizedMusic(viewport, music, button);
      return;
    }
    var content = staticPreview(button, app, "Minimized", id || win.dataset.appId, "minimized");
    if (viewport.childNodes.length === 1 && viewport.firstChild === content) return;
    viewport.replaceChildren(content);
  }

  function minimizedMusicState(id) {
    if (String(id || "") !== "stream" || !nowPlayingState) return null;
    if (nowPlayingState.active === false || nowPlayingState.appId !== "stream") return null;
    if (nowPlayingState.kind !== "audio" || nowPlayingState.transport !== true) return null;
    return String(nowPlayingState.title || "").trim() ? nowPlayingState : null;
  }

  function renderMinimizedMusic(viewport, state, button) {
    var content = viewport.querySelector(".neo-minimized-now-playing");
    if (!content) {
      content = document.createElement("span");
      content.className = "neo-minimized-now-playing";
      content.dataset.previewType = "now-playing";
      var image = document.createElement("img");
      image.className = "neo-minimized-now-playing-cover";
      image.alt = "";
      image.referrerPolicy = "no-referrer";
      image.hidden = true;
      var fallback = cloneIcon(button);
      fallback.classList.add("neo-minimized-now-playing-fallback");
      content.append(image, fallback);
      viewport.replaceChildren(content);
    }

    var cover = content.querySelector(".neo-minimized-now-playing-cover");
    var fallbackIcon = content.querySelector(".neo-minimized-now-playing-fallback");
    var source = String(state.cover || "");
    if (!source) {
      cover.hidden = true;
      cover.removeAttribute("src");
      delete cover.dataset.coverSource;
      fallbackIcon.hidden = false;
      return;
    }
    if (cover.dataset.coverSource === source) {
      cover.hidden = false;
      fallbackIcon.hidden = true;
      return;
    }
    cover.hidden = true;
    fallbackIcon.hidden = false;
    cover.onload = function () {
      if (cover.dataset.coverSource !== source) return;
      cover.hidden = false;
      fallbackIcon.hidden = true;
    };
    cover.onerror = function () {
      if (cover.dataset.coverSource !== source) return;
      cover.hidden = true;
      fallbackIcon.hidden = false;
    };
    cover.dataset.coverSource = source;
    cover.src = source;
  }

  function mediaControl(action, label, icon) {
    var control = document.createElement("button");
    control.type = "button";
    control.className = "neo-minimized-media-control neo-minimized-media-" + action;
    control.dataset.minimizedMediaAction = action;
    control.setAttribute("aria-label", label);
    control.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-' + icon + '"></use></svg>';
    control.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      var target = document.querySelector('[data-now-playing-action="' + action + '"]');
      if (target) target.click();
    });
    return control;
  }

  function setWindowMuted(win, muted) {
    if (!win) return;
    muted = Boolean(muted);
    if (win._neoLocalMusicCommand) win._neoLocalMusicCommand("mute", muted);
    win.dataset.neoMuted = muted ? "true" : "false";
    win.querySelectorAll("audio, video").forEach(function (media) { media.muted = muted; });
    var appId = String(win.dataset.appId || "");
    if (appId === "stream") {
      if (window.NEO_MUSIC_RUNTIME && typeof window.NEO_MUSIC_RUNTIME.setWindowMuted === "function") {
        window.NEO_MUSIC_RUNTIME.setWindowMuted(win, muted);
      }
      if (window.NEO_FEATURES && typeof window.NEO_FEATURES.setMuted === "function") {
        window.NEO_FEATURES.setMuted(muted);
      }
    }
    win.querySelectorAll("iframe").forEach(function (frame) {
      try {
        frame.contentWindow.postMessage({ type: "neo-shell:set-muted", muted: muted }, "*");
      } catch (error) {}
    });
  }

  function createMinimizedCard(id, win) {
    var app = api.apps[id];
    var button = dockButton(id);
    var card = document.createElement("article");
    card.className = "neo-minimized-card";
    card.dataset.minimizedApp = id;

    var header = document.createElement("header");
    header.className = "neo-minimized-card-header";
    var identity = document.createElement("button");
    identity.type = "button";
    identity.className = "neo-minimized-card-identity";
    identity.setAttribute("aria-label", "Restore " + appName(app));
    var icon = cloneIcon(button);
    icon.classList.add("neo-minimized-card-icon");
    var title = document.createElement("strong");
    title.textContent = appName(app);
    identity.append(icon, title);

    var controls = document.createElement("span");
    controls.className = "neo-minimized-card-controls";
    var mute = document.createElement("button");
    mute.type = "button";
    mute.className = "neo-minimized-card-mute";
    mute.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-volume"></use></svg>';
    var muted = win.dataset.neoMuted === "true";
    mute.classList.toggle("is-muted", muted);
    mute.setAttribute("aria-pressed", muted ? "true" : "false");
    mute.setAttribute("aria-label", (muted ? "Unmute " : "Mute ") + appName(app));

    var close = document.createElement("button");
    close.type = "button";
    close.className = "neo-minimized-card-close";
    close.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-close"></use></svg>';
    close.setAttribute("aria-label", "Close " + appName(app));
    controls.append(mute, close);
    header.append(identity, controls);

    var open = document.createElement("button");
    open.type = "button";
    open.className = "neo-minimized-card-open";
    open.setAttribute("aria-label", "Restore " + appName(app));
    var viewport = document.createElement("span");
    viewport.className = "neo-minimized-card-viewport";
    open.appendChild(viewport);
    var mediaControls = document.createElement("span");
    mediaControls.className = "neo-minimized-media-controls";
    mediaControls.hidden = true;
    mediaControls.append(
      mediaControl("previous", "Previous track", "skip-back"),
      mediaControl("toggle", "Play", "play"),
      mediaControl("next", "Next track", "skip-forward")
    );
    card.append(header, open, mediaControls);
    renderMinimizedViewport(viewport, win, button, app, id);

    function restore() { api.open(id); }
    identity.addEventListener("click", restore);
    open.addEventListener("click", restore);
    mute.addEventListener("click", function () {
      var currentWindow = api.windows.get(id);
      if (!currentWindow) return;
      var nextMuted = currentWindow.dataset.neoMuted !== "true";
      setWindowMuted(currentWindow, nextMuted);
      mute.classList.toggle("is-muted", nextMuted);
      mute.setAttribute("aria-pressed", nextMuted ? "true" : "false");
      mute.setAttribute("aria-label", (nextMuted ? "Unmute " : "Mute ") + appName(app));
    });
    close.addEventListener("click", function () {
      var currentWindow = api.windows.get(id);
      if (currentWindow) api.close(currentWindow);
    });
    return card;
  }

  function syncMinimizedCard(card, id, win) {
    var app = api.apps[id];
    var button = dockButton(id);
    var muted = win.dataset.neoMuted === "true";
    var mute = card.querySelector(".neo-minimized-card-mute");
    var title = card.querySelector(".neo-minimized-card-identity strong");
    var viewport = card.querySelector(".neo-minimized-card-viewport");
    var open = card.querySelector(".neo-minimized-card-open");
    var mediaControls = card.querySelector(".neo-minimized-media-controls");
    var mediaToggle = card.querySelector('[data-minimized-media-action="toggle"]');
    var music = minimizedMusicState(id);
    card.classList.toggle("is-music-now-playing", Boolean(music));
    if (title) title.textContent = appName(app);
    if (mute) {
      mute.classList.toggle("is-muted", muted);
      mute.setAttribute("aria-pressed", muted ? "true" : "false");
      mute.setAttribute("aria-label", (muted ? "Unmute " : "Mute ") + appName(app));
    }
    if (open) {
      open.setAttribute("aria-label", music
        ? "Restore " + appName(app) + " playing " + music.title
        : "Restore " + appName(app));
    }
    if (mediaControls) mediaControls.hidden = !music;
    if (mediaToggle && music) {
      var playing = music.playing === true;
      mediaToggle.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-' + (playing ? "pause" : "play") + '"></use></svg>';
      mediaToggle.setAttribute("aria-label", playing ? "Pause" : "Play");
    }
    if (viewport) renderMinimizedViewport(viewport, win, button, app, id);
  }

  function refreshMinimizedTray() {
    if (!minimizedTray) return;
    minimizedCardCache.forEach(function (card) { card.remove(); });
    minimizedCardCache.clear();
    minimizedTray.replaceChildren();
    minimizedTray.hidden = true;
  }

  function createMinimizedTray() {
    var tray = document.createElement("section");
    tray.className = "neo-minimized-tray";
    tray.hidden = true;
    tray.tabIndex = 0;
    tray.setAttribute("aria-label", "Minimized windows");
    tray.addEventListener("wheel", function (event) {
      if (tray.scrollWidth <= tray.clientWidth || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      var maxScroll = tray.scrollWidth - tray.clientWidth;
      var nextScroll = Math.max(0, Math.min(maxScroll, tray.scrollLeft + event.deltaY));
      if (nextScroll === tray.scrollLeft) return;
      tray.scrollLeft = nextScroll;
      event.preventDefault();
    }, { passive: false });
    // Desktop previews stay above widgets but below application windows.
    // App titlebar controls must never be covered by another app's preview.
    (document.getElementById('neo-desktop') || document.body).appendChild(tray);
    return tray;
  }

  function positionPreview(button) {
    if (!preview || preview.hidden || !button || !button.isConnected) return;
    var rect = button.getBoundingClientRect();
    var width = preview.offsetWidth;
    var height = preview.offsetHeight;
    var taskbar = button.closest(".taskbar");
    var taskbarRect = taskbar ? taskbar.getBoundingClientRect() : null;
    var position = document.documentElement.dataset.taskbarPosition || "left";
    var gap = 12;
    var left = rect.left + rect.width / 2 - width / 2;
    var top = rect.top + rect.height / 2 - height / 2;

    if (position === "left") {
      left = (taskbarRect ? taskbarRect.right : rect.right) + gap;
    } else if (position === "right") {
      left = (taskbarRect ? taskbarRect.left : rect.left) - width - gap;
    } else if (position === "top") {
      top = (taskbarRect ? taskbarRect.bottom : rect.bottom) + gap;
    } else {
      top = (taskbarRect ? taskbarRect.top : rect.top) - height - gap;
    }

    left = Math.max(10, Math.min(left, window.innerWidth - width - 10));
    top = Math.max(10, Math.min(top, window.innerHeight - height - 10));
    preview.style.left = Math.round(left) + "px";
    preview.style.right = "auto";
    preview.style.top = Math.round(top) + "px";
    preview.style.bottom = "auto";
  }

  function hideNow() {
    clearTimers();
    hideXenoClose();
    activeId = "";
    anchor = null;
    if (!preview) return;
    preview.classList.remove("is-open");
    window.setTimeout(function () {
      if (!activeId && preview) {
        preview.hidden = true;
        preview.querySelector("[data-taskbar-preview-viewport]").textContent = "";
      }
    }, 190);
  }

  function queueHide(delay) {
    window.clearTimeout(showTimer);
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(hideNow, delay == null ? 150 : delay);
  }

  function show(button) {
    if (!api || !button || !button.isConnected) return;
    if (fullscreenActive() || !previewsEnabled()) {
      hideNow();
      return;
    }
    var id = button.dataset.app;
    var win = api.windows.get(id);
    if (!win) {
      hideNow();
      return;
    }
    clearTimers();
    activeId = id;
    anchor = button;
    renderWindow(win, button, api.apps[id]);
    preview.hidden = false;
    positionPreview(button);
    requestAnimationFrame(function () {
      if (activeId === id) preview.classList.add("is-open");
    });
  }

  function queueShow(button, delay) {
    if (!button.classList.contains("is-running")) {
      queueHide(80);
      return;
    }
    if (xenoCloseMode()) {
      showXenoClose(button);
      return;
    }
    hideXenoClose();
    window.clearTimeout(hideTimer);
    if (activeId === button.dataset.app && !preview.hidden) {
      anchor = button;
      positionPreview(button);
      return;
    }
    window.clearTimeout(showTimer);
    showTimer = window.setTimeout(function () { show(button); }, delay == null ? 220 : delay);
  }

  function createPreview() {
    var node = document.createElement("section");
    node.className = "neo-taskbar-preview";
    node.hidden = true;
    node.setAttribute("aria-label", "Current window preview");
    node.innerHTML =
      '<header class="neo-taskbar-preview-titlebar">' +
        '<span><strong data-taskbar-preview-title></strong><small data-taskbar-preview-status></small></span>' +
        '<button type="button" data-taskbar-preview-close><svg class="icon" aria-hidden="true"><use href="#i-close"></use></svg></button>' +
      '</header>' +
      '<button class="neo-taskbar-preview-open" type="button" data-taskbar-preview-open>' +
        '<span class="neo-taskbar-preview-viewport" data-taskbar-preview-viewport></span>' +
      '</button>';
    document.body.appendChild(node);
    node.addEventListener("pointerenter", function () { window.clearTimeout(hideTimer); });
    node.addEventListener("pointerleave", function () { queueHide(120); });
    node.querySelector("[data-taskbar-preview-open]").addEventListener("click", function () {
      var id = activeId;
      hideNow();
      if (id) api.open(id);
    });
    node.querySelector("[data-taskbar-preview-close]").addEventListener("click", function (event) {
      event.stopPropagation();
      var win = api.windows.get(activeId);
      hideNow();
      if (win) api.close(win);
    });
    return node;
  }

  function syncFullscreenVisibility() {
    if (fullscreenActive()) hideNow();
    refreshMinimizedTray();
  }

  function bindDock() {
    api.dock.addEventListener("pointerover", function (event) {
      if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
      var button = event.target.closest(".dock-button[data-app]");
      if (!button || !api.dock.contains(button) || (event.relatedTarget && button.contains(event.relatedTarget))) return;
      queueShow(button);
    });
    api.dock.addEventListener("pointerout", function (event) {
      var button = event.target.closest(".dock-button[data-app]");
      if (!button || !api.dock.contains(button)) return;
      if (event.relatedTarget && (button.contains(event.relatedTarget) || preview.contains(event.relatedTarget) || (xenoClose && xenoClose.contains(event.relatedTarget)))) return;
      if (xenoCloseMode()) {
        queueHideXenoClose();
        return;
      }
      queueHide();
    });
    api.dock.addEventListener("focusin", function (event) {
      var button = event.target.closest(".dock-button[data-app]");
      if (button) queueShow(button, 0);
    });
    api.dock.addEventListener("focusout", function (event) {
      if (event.relatedTarget && (api.dock.contains(event.relatedTarget) || preview.contains(event.relatedTarget) || (xenoClose && xenoClose.contains(event.relatedTarget)))) return;
      if (xenoCloseMode()) {
        queueHideXenoClose(80);
        return;
      }
      queueHide(80);
    });
    new MutationObserver(function () {
      if (xenoCloseId) {
        var closeAnchor = dockButton(xenoCloseId);
        if (!closeAnchor || !api.windows.has(xenoCloseId)) hideXenoClose();
        else {
          anchor = closeAnchor;
          positionXenoClose(closeAnchor);
        }
      }
      if (!activeId) return;
      var next = Array.from(api.dock.querySelectorAll(".dock-button[data-app]")).find(function (button) { return button.dataset.app === activeId; });
      if (!next || !api.windows.has(activeId)) hideNow();
      else {
        anchor = next;
        renderWindow(api.windows.get(activeId), next, api.apps[activeId]);
        positionPreview(next);
      }
    }).observe(api.dock, { childList: true });
  }

  function start(dock, windows, apps, open, close) {
    if (!dock || !windows || preview) return;
    api = { dock: dock, windows: windows, apps: apps, open: open, close: close };
    preview = createPreview();
    xenoClose = createXenoClose();
    minimizedTray = createMinimizedTray();
    bindDock();
    window.addEventListener("resize", function () {
      if (xenoCloseId && anchor) positionXenoClose(anchor);
      else if (anchor) positionPreview(anchor);
    }, { passive: true });
    window.addEventListener("blur", hideNow);
    document.addEventListener("fullscreenchange", syncFullscreenVisibility);
    document.addEventListener("webkitfullscreenchange", syncFullscreenVisibility);
    new MutationObserver(syncFullscreenVisibility).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-tab-fullscreen", "data-fullscreen"]
    });
    document.addEventListener("keydown", function (event) { if (event.key === "Escape" && activeId) hideNow(); });
    document.addEventListener("pointerdown", function (event) {
      if (activeId && !preview.contains(event.target) && !event.target.closest(".dock-button[data-app]")) hideNow();
    }, { passive: true });
    window.addEventListener("neo-window-state-change", function (event) {
      var detail = event.detail || {};
      if (detail.closed && detail.id) {
        var card = Array.from(minimizedTray.querySelectorAll("[data-minimized-app]")).find(function (item) {
          return item.dataset.minimizedApp === String(detail.id);
        });
        if (card) card.remove();
        minimizedCardCache.delete(String(detail.id));
        forgetCachedPreviews(String(detail.id));
        if (!minimizedTray.children.length) minimizedTray.hidden = true;
        window.setTimeout(refreshMinimizedTray, 260);
        return;
      }
      requestAnimationFrame(refreshMinimizedTray);
    });
    window.addEventListener("neo-performance-mode-change", function () {
      hideNow();
      refreshMinimizedTray();
    });
    window.addEventListener("neo-taskbar-layout-change", function () {
      hideNow();
      requestAnimationFrame(refreshMinimizedTray);
    });
    window.addEventListener("neo-now-playing-change", function (event) {
      var detail = event.detail || {};
      nowPlayingState = detail.active === false ? null : detail;
    });
    refreshMinimizedTray();
  }

  window.NEO_TASKBAR_PREVIEW = { start: start };
})();
