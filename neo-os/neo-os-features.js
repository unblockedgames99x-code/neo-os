(function () {
  "use strict";

  var DB_NAME = "neo_os_local_media";
  var DB_STORE = "assets";
  var DB_VERSION = 1;
  var NOTIFICATION_KEY = "neo_os_notifications_v1";
  var NOTIFICATION_SEEDED_KEY = "neo_os_notifications_seeded_v1";
  var PLAYLIST_KEY = "neo_os_playlists_v1";
  var MUSIC_VOLUME_KEY = "neo_os_music_volume_v1";
  var DESKTOP_VIEW_KEY = "neo_os_desktop_view_v1";
  var DESKTOP_SORT_KEY = "neo_os_desktop_sort_v1";
  var api = null;
  var initialized = false;
  var databasePromise = null;
  var notifications = readJson(NOTIFICATION_KEY, []);
  var musicItems = [];
  var musicLoaded = false;
  var musicPromise = null;
  var musicMounts = new Set();
  var mediaItems = [];
  var mediaLoaded = false;
  var mediaPromise = null;
  var mediaMounts = new Set();
  var playlists = readJson(PLAYLIST_KEY, []);
  var currentTrackId = "";
  var currentTrackUrl = "";
  var musicShuffle = false;
  var musicRepeat = false;
  var trackCoverPromises = new Map();
  var lastNowPlayingSecond = -1;
  var desktopRecorder = null;
  var desktopRecordingStream = null;
  var desktopRecordingChunks = [];
  var audio = document.createElement("audio");
  audio.preload = "metadata";
  var savedMusicVolume = Number(readJson(MUSIC_VOLUME_KEY, 0.55));
  audio.volume = Number.isFinite(savedMusicVolume) ? Math.max(0, Math.min(1, savedMusicVolume)) : 0.55;

  if (!Array.isArray(notifications)) notifications = [];
  if (!Array.isArray(playlists)) playlists = [];

  function readJson(key, fallback) {
    try {
      var value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) {}
  }

  function makeId(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return prefix + "_" + window.crypto.randomUUID();
    return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  }

  function cleanTitle(name) {
    return String(name || "Untitled").replace(/\.[a-z0-9]{2,5}$/i, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim() || "Untitled";
  }

  function formatBytes(bytes) {
    var size = Number(bytes) || 0;
    if (size < 1024 * 1024) return Math.max(1, Math.round(size / 1024)) + " KB";
    return (size / (1024 * 1024)).toFixed(size > 100 * 1024 * 1024 ? 0 : 1) + " MB";
  }

  function formatTime(seconds) {
    var value = Number(seconds);
    if (!Number.isFinite(value) || value < 0) value = 0;
    var minutes = Math.floor(value / 60);
    return minutes + ":" + String(Math.floor(value % 60)).padStart(2, "0");
  }

  function hueFor(value) {
    var hash = 0;
    String(value || "neo").split("").forEach(function (character) { hash = ((hash << 5) - hash) + character.charCodeAt(0); });
    return Math.abs(hash) % 360;
  }

  function syncSafeInteger(bytes, offset) {
    return ((bytes[offset] & 0x7f) << 21) | ((bytes[offset + 1] & 0x7f) << 14) | ((bytes[offset + 2] & 0x7f) << 7) | (bytes[offset + 3] & 0x7f);
  }

  function bigEndianInteger(bytes, offset) {
    return (((bytes[offset] << 24) >>> 0) + (bytes[offset + 1] << 16) + (bytes[offset + 2] << 8) + bytes[offset + 3]) >>> 0;
  }

  function embeddedTrackArtwork(buffer) {
    var bytes = new Uint8Array(buffer);
    if (bytes.length < 20 || String.fromCharCode(bytes[0], bytes[1], bytes[2]) !== "ID3") return null;
    var version = bytes[3];
    if (version !== 3 && version !== 4) return null;
    var tagEnd = Math.min(bytes.length, 10 + syncSafeInteger(bytes, 6));
    var offset = 10;
    while (offset + 10 <= tagEnd) {
      var frameId = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
      if (!/^[A-Z0-9]{4}$/.test(frameId)) break;
      var frameSize = version === 4 ? syncSafeInteger(bytes, offset + 4) : bigEndianInteger(bytes, offset + 4);
      var start = offset + 10;
      var end = Math.min(tagEnd, start + frameSize);
      if (frameId === "APIC" && end > start + 5) {
        var mimeEnd = start + 1;
        while (mimeEnd < end && bytes[mimeEnd] !== 0) mimeEnd += 1;
        var mime = new TextDecoder("latin1").decode(bytes.slice(start + 1, mimeEnd)).toLowerCase();
        var encoding = bytes[start];
        var imageStart = Math.min(end, mimeEnd + 2);
        if (encoding === 1 || encoding === 2) {
          while (imageStart + 1 < end && (bytes[imageStart] !== 0 || bytes[imageStart + 1] !== 0)) imageStart += 2;
          imageStart += 2;
        } else {
          while (imageStart < end && bytes[imageStart] !== 0) imageStart += 1;
          imageStart += 1;
        }
        if (imageStart < end) {
          if (!/^image\/(?:jpeg|png|webp)$/i.test(mime)) {
            mime = bytes[imageStart] === 0x89 && bytes[imageStart + 1] === 0x50 ? "image/png" : "image/jpeg";
          }
          return new Blob([buffer.slice(imageStart, end)], { type: mime });
        }
      }
      if (!frameSize) break;
      offset = end;
    }
    return null;
  }

  function generatedTrackCover(title) {
    var canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    var context = canvas.getContext("2d");
    var hue = hueFor(title);
    context.fillStyle = "#050505";
    context.fillRect(0, 0, 256, 256);
    context.fillStyle = "hsl(" + hue + " 72% 52%)";
    context.beginPath();
    context.arc(128, 112, 68, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "rgba(0,0,0,.78)";
    context.beginPath();
    context.arc(150, 102, 18, 0, Math.PI * 2);
    context.fill();
    context.fillRect(145, 54, 10, 56);
    context.fillStyle = "#ffffff";
    context.font = "700 22px system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    var label = String(title || "Music").trim().slice(0, 18);
    context.fillText(label, 128, 211, 218);
    return canvas.toDataURL("image/png");
  }

  function artworkPng(blob, title) {
    if (!blob || typeof createImageBitmap !== "function") return Promise.resolve(generatedTrackCover(title));
    return createImageBitmap(blob).then(function (bitmap) {
      var canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      var context = canvas.getContext("2d");
      var scale = Math.max(256 / bitmap.width, 256 / bitmap.height);
      var width = bitmap.width * scale;
      var height = bitmap.height * scale;
      context.drawImage(bitmap, (256 - width) / 2, (256 - height) / 2, width, height);
      if (typeof bitmap.close === "function") bitmap.close();
      return canvas.toDataURL("image/png");
    }).catch(function () { return generatedTrackCover(title); });
  }

  function trackCoverForFile(file, title) {
    if (!file || typeof file.slice !== "function") return Promise.resolve(generatedTrackCover(title));
    return file.slice(0, Math.min(file.size || 0, 4 * 1024 * 1024)).arrayBuffer().then(function (buffer) {
      return artworkPng(embeddedTrackArtwork(buffer), title);
    }).catch(function () { return generatedTrackCover(title); });
  }

  function ensureTrackCover(item) {
    if (!item) return Promise.resolve("");
    if (item.cover) return Promise.resolve(item.cover);
    if (trackCoverPromises.has(item.id)) return trackCoverPromises.get(item.id);
    var request = trackCoverForFile(item.blob, item.title).then(function (cover) {
      item.cover = cover;
      return saveAsset(item).catch(function () {}).then(function () { return cover; });
    }).finally(function () { trackCoverPromises.delete(item.id); });
    trackCoverPromises.set(item.id, request);
    return request;
  }

  function renderTrackArtwork(host, item) {
    if (!host) return;
    host.textContent = "";
    if (!item || !item.cover) {
      host.innerHTML = icon("music");
      return;
    }
    var image = document.createElement("img");
    image.src = item.cover;
    image.alt = "";
    image.decoding = "async";
    image.onerror = function () { host.innerHTML = icon("music"); };
    host.appendChild(image);
  }

  function icon(name) {
    return api && api.icon ? api.icon(name) : "";
  }

  function reportMediaState(detail) {
    window.dispatchEvent(new CustomEvent("neo-media-state", { detail: detail }));
  }

  function openDatabase() {
    if (databasePromise) return databasePromise;
    databasePromise = new Promise(function (resolve, reject) {
      if (!window.indexedDB) {
        reject(new Error("Local media storage is not available on this device."));
        return;
      }
      var request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = function () {
        var database = request.result;
        if (!database.objectStoreNames.contains(DB_STORE)) {
          var store = database.createObjectStore(DB_STORE, { keyPath: "id" });
          store.createIndex("type", "type", { unique: false });
        }
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error || new Error("Could not open local media storage.")); };
    });
    return databasePromise;
  }

  function databaseRequest(mode, callback) {
    return openDatabase().then(function (database) {
      return new Promise(function (resolve, reject) {
        var transaction = database.transaction(DB_STORE, mode);
        var store = transaction.objectStore(DB_STORE);
        var request;
        try { request = callback(store); } catch (error) { reject(error); return; }
        request.onsuccess = function () { resolve(request.result); };
        request.onerror = function () { reject(request.error || new Error("Local media operation failed.")); };
      });
    });
  }

  function loadAssets(type) {
    return databaseRequest("readonly", function (store) { return store.index("type").getAll(type); }).then(function (items) {
      return (items || []).sort(function (left, right) { return (right.createdAt || 0) - (left.createdAt || 0); });
    });
  }

  function saveAsset(item) {
    return databaseRequest("readwrite", function (store) { return store.put(item); });
  }

  function deleteAsset(id) {
    return databaseRequest("readwrite", function (store) { return store.delete(id); });
  }

  function deleteAssetsOfType(type) {
    return loadAssets(type).then(function (items) {
      return Promise.all(items.map(function (item) { return deleteAsset(item.id); }));
    });
  }

  function ensureMusic(force) {
    if (musicLoaded && !force) return Promise.resolve(musicItems);
    if (musicPromise && !force) return musicPromise;
    musicPromise = loadAssets("audio").then(function (items) {
      musicItems = items;
      musicLoaded = true;
      musicPromise = null;
      return items;
    }).catch(function (error) {
      musicPromise = null;
      throw error;
    });
    return musicPromise;
  }

  function ensureMedia(force) {
    if (mediaLoaded && !force) return Promise.resolve(mediaItems);
    if (mediaPromise && !force) return mediaPromise;
    mediaPromise = loadAssets("video").then(function (items) {
      mediaItems = items;
      mediaLoaded = true;
      mediaPromise = null;
      return items;
    }).catch(function (error) {
      mediaPromise = null;
      throw error;
    });
    return mediaPromise;
  }

  function notify(title, copy, symbol) {
    if (api && api.notify) api.notify(title, copy, symbol);
  }

  function addNotification(title, copy, symbol, unread) {
    var newest = notifications[0];
    if (newest && newest.title === title && newest.copy === copy && Date.now() - newest.time < 3000) return;
    notifications.unshift({ id: makeId("notice"), title: title, copy: copy || "", icon: symbol || "info", time: Date.now(), unread: unread !== false });
    notifications = notifications.slice(0, 24);
    writeJson(NOTIFICATION_KEY, notifications);
    renderNotifications();
  }

  function recordNotification(title, copy, symbol) {
    addNotification(title, copy, symbol, true);
  }

  function notificationTime(time) {
    var elapsed = Math.max(0, Date.now() - Number(time || 0));
    if (elapsed < 60000) return "Now";
    if (elapsed < 3600000) return Math.floor(elapsed / 60000) + "m";
    if (elapsed < 86400000) return Math.floor(elapsed / 3600000) + "h";
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(time));
  }

  function renderNotifications() {
    var panel = document.getElementById("notification-center");
    var list = panel && panel.querySelector("[data-notification-list]");
    var unread = notifications.some(function (item) { return item.unread; });
    document.querySelectorAll("[data-notification-dot]").forEach(function (dot) { dot.hidden = !unread; });
    if (!list) return;
    list.textContent = "";
    if (!notifications.length) {
      var empty = document.createElement("div");
      empty.className = "notification-empty";
      empty.innerHTML = icon("bell") + "<strong>You are all caught up</strong><p>New system activity will appear here.</p>";
      list.appendChild(empty);
      return;
    }
    notifications.forEach(function (item) {
      var row = document.createElement("article");
      row.className = "notification-item" + (item.unread ? " is-unread" : "");
      row.innerHTML = '<span class="notification-icon">' + icon(item.icon) + '</span><span class="notification-copy"><strong></strong><small></small></span><time></time>';
      row.querySelector("strong").textContent = item.title;
      row.querySelector("small").textContent = item.copy;
      row.querySelector("time").textContent = notificationTime(item.time);
      list.appendChild(row);
    });
  }

  function toggleNotifications(trigger) {
    var panel = document.getElementById("notification-center");
    if (!panel) return;
    var open = panel.hidden;
    closeOverlays();
    panel.hidden = !open;
    document.querySelectorAll("[data-notification-toggle]").forEach(function (button) { button.setAttribute("aria-expanded", open ? "true" : "false"); });
    if (open) {
      notifications.forEach(function (item) { item.unread = false; });
      writeJson(NOTIFICATION_KEY, notifications);
      renderNotifications();
      requestAnimationFrame(function () { var close = panel.querySelector("[data-notification-close]"); if (close) close.focus({ preventScroll: true }); });
    }
  }

  function storedChoice(key, allowed, fallback) {
    var value = "";
    try { value = localStorage.getItem(key) || ""; } catch (error) {}
    return allowed.indexOf(value) === -1 ? fallback : value;
  }

  var desktopSubmenuCloseTimer = 0;

  function cancelDesktopSubmenuClose() {
    if (desktopSubmenuCloseTimer) window.clearTimeout(desktopSubmenuCloseTimer);
    desktopSubmenuCloseTimer = 0;
  }

  function scheduleDesktopSubmenuClose(menu) {
    cancelDesktopSubmenuClose();
    desktopSubmenuCloseTimer = window.setTimeout(function () {
      desktopSubmenuCloseTimer = 0;
      if (!menu || menu.hidden || menu.matches(":hover")) return;
      closeDesktopSubmenus(menu);
    }, 160);
  }

  function closeDesktopSubmenus(menu, except) {
    if (!menu) return;
    cancelDesktopSubmenuClose();
    var mobileDrillIn = Boolean(except && window.matchMedia("(max-width: 760px), (pointer: coarse) and (max-width: 1366px), (max-height: 500px) and (max-width: 960px)").matches);
    menu.classList.toggle("has-mobile-submenu", mobileDrillIn);
    menu.querySelectorAll(".context-menu-branch").forEach(function (branch) {
      var trigger = branch.querySelector("[data-context-submenu]");
      branch.classList.toggle("is-open", Boolean(trigger && trigger.dataset.contextSubmenu === except));
      branch.classList.toggle("is-active", Boolean(mobileDrillIn && trigger && trigger.dataset.contextSubmenu === except));
    });
    menu.querySelectorAll("[data-context-panel]").forEach(function (panel) {
      if (panel.dataset.contextPanel === except) return;
      panel.hidden = true;
      panel.classList.remove("opens-left", "is-mobile");
      panel.style.left = "";
      panel.style.top = "";
    });
    menu.querySelectorAll("[data-context-submenu]").forEach(function (trigger) {
      if (trigger.dataset.contextSubmenu !== except) trigger.setAttribute("aria-expanded", "false");
    });
  }

  function sortDesktopShortcuts(mode) {
    var shortcuts = Array.from(document.querySelectorAll("[data-desktop-shortcut]"));
    shortcuts.sort(function (left, right) {
      if (mode === "recent") return Number(right.dataset.openedAt || 0) - Number(left.dataset.openedAt || 0);
      var leftValue = mode === "category" ? left.dataset.category : (left.dataset.title || left.textContent);
      var rightValue = mode === "category" ? right.dataset.category : (right.dataset.title || right.textContent);
      return String(leftValue || "").localeCompare(String(rightValue || ""), undefined, { sensitivity: "base" });
    });
    shortcuts.forEach(function (shortcut, index) { shortcut.style.order = String(index); });
  }

  function syncDesktopMenuState(menu) {
    if (!menu) return;
    var view = storedChoice(DESKTOP_VIEW_KEY, ["large", "medium", "small"], "medium");
    var sort = storedChoice(DESKTOP_SORT_KEY, ["name", "category", "recent"], "name");
    document.documentElement.dataset.desktopIconSize = view;
    document.documentElement.dataset.desktopIconSort = sort;
    menu.querySelectorAll("[data-desktop-view]").forEach(function (button) {
      button.setAttribute("aria-checked", button.dataset.desktopView === view ? "true" : "false");
    });
    menu.querySelectorAll("[data-desktop-sort]").forEach(function (button) {
      button.setAttribute("aria-checked", button.dataset.desktopSort === sort ? "true" : "false");
    });
    var widgets = menu.querySelector('[data-widget-action="show"]');
    var lock = menu.querySelector('[data-widget-action="lock"]');
    var statusWidgetSettings = {
      "system-status": "desktopSystemWidget",
      "active-app": "desktopActiveAppWidget",
      "now-playing": "desktopNowPlayingWidget"
    };
    var bottomVisualizer = menu.querySelector('[data-widget-action="bottom-visualizer"]');
    var bottomVisualizerLabel = menu.querySelector("[data-bottom-visualizer-label]");
    if (widgets) widgets.setAttribute("aria-checked", !api || !api.getSetting || api.getSetting("widgets") ? "true" : "false");
    if (lock) lock.setAttribute("aria-checked", !api || !api.getSetting || api.getSetting("widgetLock") ? "true" : "false");
    Object.keys(statusWidgetSettings).forEach(function (action) {
      var button = menu.querySelector('[data-widget-action="' + action + '"]');
      if (button) button.setAttribute("aria-checked", api && api.getSetting && api.getSetting(statusWidgetSettings[action]) ? "true" : "false");
    });
    var bottomVisualizerEnabled = Boolean(window.NEO_BOTTOM_VISUALIZER && window.NEO_BOTTOM_VISUALIZER.isEnabled());
    if (bottomVisualizer) bottomVisualizer.setAttribute("aria-checked", bottomVisualizerEnabled ? "true" : "false");
    if (bottomVisualizerLabel) bottomVisualizerLabel.textContent = bottomVisualizerEnabled ? "Remove bottom music visualizer" : "Add bottom music visualizer";
    var fullscreen = menu.querySelector("[data-fullscreen-label]");
    if (fullscreen) fullscreen.textContent = document.fullscreenElement || document.webkitFullscreenElement ? "Exit fullscreen" : "Enter fullscreen";
    var recording = menu.querySelector("[data-recording-label]");
    if (recording) recording.textContent = desktopRecorder && desktopRecorder.state !== "inactive" ? "Stop Recording" : "Start Recording";
    var iconToggle = menu.querySelector('[data-desktop-action="toggle-icons"]');
    var iconToggleLabel = menu.querySelector("[data-desktop-icons-label]");
    var iconsHidden = Boolean(api && api.getDesktopShortcutsHidden && api.getDesktopShortcutsHidden());
    if (iconToggle) iconToggle.setAttribute("aria-pressed", iconsHidden ? "true" : "false");
    if (iconToggleLabel) iconToggleLabel.textContent = iconsHidden ? "Show all icons" : "Hide all icons";
    sortDesktopShortcuts(sort);
  }

  function positionSubmenu(trigger) {
    var menu = trigger.closest("#desktop-context-menu");
    var panel = menu && menu.querySelector('[data-context-panel="' + trigger.dataset.contextSubmenu + '"]');
    if (!panel) return;
    cancelDesktopSubmenuClose();
    closeDesktopSubmenus(menu, trigger.dataset.contextSubmenu);
    panel.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    panel.classList.remove("opens-left", "is-mobile");
    panel.style.left = "";
    panel.style.top = "-6px";
    var triggerRect = trigger.getBoundingClientRect();
    var panelRect = panel.getBoundingClientRect();
    if (window.matchMedia("(max-width: 760px), (pointer: coarse) and (max-width: 1366px), (max-height: 500px) and (max-width: 960px)").matches) {
      panel.classList.add("is-mobile");
      panel.style.left = "";
      panel.style.top = "";
      return;
    }
    if (triggerRect.right + panelRect.width + 8 > window.innerWidth) panel.classList.add("opens-left");
    panelRect = panel.getBoundingClientRect();
    if (panelRect.bottom > window.innerHeight - 8) panel.style.top = Math.min(-6, window.innerHeight - triggerRect.top - panelRect.height - 8) + "px";
  }

  function menuButtons(container) {
    return Array.from(container.querySelectorAll(":scope > button:not([hidden]):not([disabled]), :scope > .context-menu-branch > button:not([hidden]):not([disabled])"));
  }

  function openDesktopMenu(x, y) {
    var menu = document.getElementById("desktop-context-menu");
    if (!menu) return;
    closeOverlays();
    syncDesktopMenuState(menu);
    menu.hidden = false;
    requestAnimationFrame(function () {
      var rect = menu.getBoundingClientRect();
      menu.style.left = Math.max(8, Math.min(x, window.innerWidth - rect.width - 8)) + "px";
      menu.style.top = Math.max(8, Math.min(y, window.innerHeight - rect.height - 72)) + "px";
      var first = menuButtons(menu)[0];
      if (first) first.focus({ preventScroll: true });
    });
  }

  function closeOverlays() {
    var panel = document.getElementById("notification-center");
    var menu = document.getElementById("desktop-context-menu");
    if (panel) panel.hidden = true;
    if (menu) {
      menu.hidden = true;
      closeDesktopSubmenus(menu);
    }
    document.querySelectorAll("[data-notification-toggle]").forEach(function (trigger) { trigger.setAttribute("aria-expanded", "false"); });
  }

  function importDesktopFiles(input) {
    var files = Array.from(input.files || []);
    input.value = "";
    if (!files.length || !api || !api.saveToFiles) return;
    files.reduce(function (chain, file) {
      return chain.then(function () { return api.saveToFiles(file.name, file, { folder: "Downloads", quiet: true }); });
    }, Promise.resolve()).then(function () {
      notify("Added to Drive", files.length + (files.length === 1 ? " file is" : " files are") + " ready in My Drive.", "folder");
    }).catch(function (error) {
      notify("Items were not added", error && error.message ? error.message : "Local storage rejected the items.", "info");
    });
  }

  function recordingMimeType() {
    if (!window.MediaRecorder || typeof MediaRecorder.isTypeSupported !== "function") return "";
    return ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/mp4", "video/webm"].find(function (type) {
      return MediaRecorder.isTypeSupported(type);
    }) || "";
  }

  function updateRecordingState() {
    syncDesktopMenuState(document.getElementById("desktop-context-menu"));
  }

  function finishDesktopRecording(recorder) {
    var mime = recorder.mimeType || recordingMimeType() || "video/webm";
    var chunks = desktopRecordingChunks.slice();
    desktopRecordingChunks = [];
    if (desktopRecordingStream) desktopRecordingStream.getTracks().forEach(function (track) { track.stop(); });
    desktopRecordingStream = null;
    desktopRecorder = null;
    updateRecordingState();
    if (!chunks.length) {
      notify("Recording ended", "No video data was captured.", "record");
      return;
    }
    var extension = mime.indexOf("mp4") !== -1 ? "mp4" : "webm";
    var timestamp = new Date().toISOString().replace("T", " ").replace(/[:.]/g, "-").replace("Z", "");
    var blob = new Blob(chunks, { type: mime });
    api.saveToFiles("Screen Recording " + timestamp + "." + extension, blob, { folder: "Videos", quiet: true }).then(function () {
      notify("Recording saved", "The screen recording is ready in Drive > Videos.", "record");
    }).catch(function (error) {
      notify("Recording was not saved", error && error.message ? error.message : "Local storage rejected the recording.", "info");
    });
  }

  function startDesktopRecording() {
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getDisplayMedia !== "function" || !window.MediaRecorder) {
      notify("Screen recording unavailable", "Secure display capture is not available on this device.", "info");
      return;
    }
    navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 30, max: 60 } }, audio: true }).then(function (stream) {
      desktopRecordingStream = stream;
      desktopRecordingChunks = [];
      var mime = recordingMimeType();
      desktopRecorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      var recorder = desktopRecorder;
      recorder.addEventListener("dataavailable", function (event) { if (event.data && event.data.size) desktopRecordingChunks.push(event.data); });
      recorder.addEventListener("stop", function () { finishDesktopRecording(recorder); }, { once: true });
      stream.getVideoTracks().forEach(function (track) {
        track.addEventListener("ended", function () {
          if (desktopRecorder && desktopRecorder.state !== "inactive") desktopRecorder.stop();
        }, { once: true });
      });
      recorder.start(1000);
      updateRecordingState();
      notify("Recording started", "Use the desktop menu again to stop and save it.", "record");
    }).catch(function (error) {
      if (error && error.name === "NotAllowedError") notify("Recording canceled", "Nothing was captured or saved.", "record");
      else notify("Recording could not start", error && error.message ? error.message : "Screen capture permission was not granted.", "info");
    });
  }

  function toggleDesktopRecording() {
    if (desktopRecorder && desktopRecorder.state !== "inactive") {
      desktopRecorder.stop();
      notify("Finishing recording", "NEO is saving the video to Drive.", "record");
      return;
    }
    startDesktopRecording();
  }

  function toggleDesktopFullscreen() {
    var active = document.fullscreenElement || document.webkitFullscreenElement;
    var operation;
    try {
      operation = active
        ? (document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen())
        : (document.documentElement.requestFullscreen ? document.documentElement.requestFullscreen() : document.documentElement.webkitRequestFullscreen());
    } catch (error) {
      operation = Promise.reject(error);
    }
    Promise.resolve(operation).catch(function () { notify("Fullscreen unavailable", "Fullscreen mode could not be started.", "info"); });
  }

  function runDesktopAction(action) {
    if (!api) return;
    if (action === "files") api.openApp("files");
    else if (action === "add-files") {
      var input = document.querySelector("[data-desktop-import-input]");
      if (input) input.click();
    } else if (action === "new-folder" || action === "new-text") {
      api.createFileItem(action === "new-text" ? "text" : "folder").then(function (opened) {
        if (!opened) notify("Drive is still opening", "Try the command again in a moment.", "folder");
      }).catch(function (error) { notify("Could not create item", error && error.message ? error.message : "Drive did not respond.", "info"); });
    } else if (action === "record") toggleDesktopRecording();
    else if (action === "customize") api.openApp("control");
    else if (action === "background") api.openWallpaperSource("installed");
    else if (action === "terminal") api.openApp("terminal");
    else if (action === "toggle-icons" && api.setDesktopShortcutsHidden && api.getDesktopShortcutsHidden) {
      api.setDesktopShortcutsHidden(!api.getDesktopShortcutsHidden());
    }
    else if (action === "fullscreen") toggleDesktopFullscreen();
    else if (action === "refresh" && api.refresh) api.refresh();
  }

  function chooseDesktopView(button) {
    var value = button.dataset.desktopView;
    try { localStorage.setItem(DESKTOP_VIEW_KEY, value); } catch (error) {}
    document.documentElement.dataset.desktopIconSize = value;
    syncDesktopMenuState(button.closest("#desktop-context-menu"));
  }

  function chooseDesktopSort(button) {
    var value = button.dataset.desktopSort;
    try { localStorage.setItem(DESKTOP_SORT_KEY, value); } catch (error) {}
    document.documentElement.dataset.desktopIconSort = value;
    sortDesktopShortcuts(value);
    syncDesktopMenuState(button.closest("#desktop-context-menu"));
  }

  function runWidgetAction(button) {
    var action = button.dataset.widgetAction;
    var statusWidgetSettings = {
      "system-status": "desktopSystemWidget",
      "active-app": "desktopActiveAppWidget",
      "now-playing": "desktopNowPlayingWidget"
    };
    if (action === "manage") api.openApp("skins");
    else if (action === "bottom-visualizer" && window.NEO_BOTTOM_VISUALIZER) window.NEO_BOTTOM_VISUALIZER.toggle();
    else if (statusWidgetSettings[action]) {
      var setting = statusWidgetSettings[action];
      var enabled = !api.getSetting(setting);
      if (enabled && !api.getSetting("widgets")) api.setSetting("widgets", true);
      api.setSetting(setting, enabled);
    }
    else if (action === "reset") api.resetLayout();
    else if (action === "show") api.setSetting("widgets", !api.getSetting("widgets"));
    else if (action === "lock") api.setSetting("widgetLock", !api.getSetting("widgetLock"));
    syncDesktopMenuState(button.closest("#desktop-context-menu"));
  }

  function bindDesktopMenu(menu) {
    if (!menu || menu.dataset.ready === "true") return;
    menu.dataset.ready = "true";
    menu.addEventListener("click", function (event) {
      var back = event.target.closest("[data-context-back]");
      if (back) {
        event.preventDefault();
        var backPanel = back.closest("[data-context-panel]");
        var backTrigger = backPanel && menu.querySelector('[data-context-submenu="' + backPanel.dataset.contextPanel + '"]');
        closeDesktopSubmenus(menu);
        if (backTrigger) backTrigger.focus();
        return;
      }
      var submenu = event.target.closest("[data-context-submenu]");
      if (submenu) {
        event.preventDefault();
        if (submenu.getAttribute("aria-expanded") === "true") closeDesktopSubmenus(menu);
        else positionSubmenu(submenu);
        return;
      }
      var view = event.target.closest("[data-desktop-view]");
      var sort = event.target.closest("[data-desktop-sort]");
      var widget = event.target.closest("[data-widget-action]");
      var action = event.target.closest("[data-desktop-action]");
      if (view) chooseDesktopView(view);
      else if (sort) chooseDesktopSort(sort);
      else if (widget) runWidgetAction(widget);
      else if (action) runDesktopAction(action.dataset.desktopAction);
      if (view || sort || widget || action) closeOverlays();
    });
    menu.addEventListener("pointerover", function (event) {
      if (event.pointerType !== "mouse" || window.innerWidth < 520) return;
      cancelDesktopSubmenuClose();
      var trigger = event.target.closest("[data-context-submenu]");
      if (trigger) {
        positionSubmenu(trigger);
        return;
      }
      var button = event.target.closest("button");
      if (button && button.parentElement === menu) closeDesktopSubmenus(menu);
    });
    menu.addEventListener("pointerenter", cancelDesktopSubmenuClose);
    menu.addEventListener("pointerleave", function (event) {
      if (event.pointerType === "mouse") scheduleDesktopSubmenuClose(menu);
    });
    menu.addEventListener("keydown", function (event) {
      var current = event.target.closest("button");
      if (!current) return;
      var group = current.closest("[role='menu']");
      var buttons = menuButtons(group);
      var index = buttons.indexOf(current);
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        buttons[(index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length].focus();
      } else if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        buttons[event.key === "Home" ? 0 : buttons.length - 1].focus();
      } else if (event.key === "ArrowRight" && current.matches("[data-context-submenu]")) {
        event.preventDefault();
        positionSubmenu(current);
        var panel = menu.querySelector('[data-context-panel="' + current.dataset.contextSubmenu + '"]');
        var first = panel && menuButtons(panel)[0];
        if (first) first.focus();
      } else if (event.key === "ArrowLeft" && group.matches("[data-context-panel]")) {
        event.preventDefault();
        var trigger = menu.querySelector('[data-context-submenu="' + group.dataset.contextPanel + '"]');
        closeDesktopSubmenus(menu);
        if (trigger) trigger.focus();
      } else if (event.key === "Escape") {
        event.preventDefault();
        if (group.matches("[data-context-panel]")) {
          var parentTrigger = menu.querySelector('[data-context-submenu="' + group.dataset.contextPanel + '"]');
          closeDesktopSubmenus(menu);
          if (parentTrigger) parentTrigger.focus();
        } else closeOverlays();
      } else if (event.key === "Tab") closeOverlays();
    });
    var input = menu.querySelector("[data-desktop-import-input]");
    if (input) input.addEventListener("change", function () { importDesktopFiles(input); });
    document.addEventListener("fullscreenchange", function () { syncDesktopMenuState(menu); });
    document.addEventListener("webkitfullscreenchange", function () { syncDesktopMenuState(menu); });
    syncDesktopMenuState(menu);
  }

  function updateNowPlaying(updatePlayers) {
    var item = musicItems.find(function (entry) { return entry.id === currentTrackId; });
    reportMediaState(item ? {
      source: "local-music",
      appId: "stream",
      kind: "audio",
      icon: "stream",
      title: item.title,
      copy: "Local music",
      cover: item.cover || "",
      hue: hueFor(item.title),
      playing: !audio.paused,
      position: audio.currentTime,
      duration: audio.duration,
      volume: audio.muted ? 0 : audio.volume,
      muted: audio.muted,
      volumeControl: true,
      transport: true,
      active: true
    } : { source: "local-music", active: false });
    if (updatePlayers !== false) musicMounts.forEach(updateMusicPlayer);
  }

  function currentTrack() {
    return musicItems.find(function (item) { return item.id === currentTrackId; }) || null;
  }

  function setTrackSource(item) {
    if (currentTrackUrl) URL.revokeObjectURL(currentTrackUrl);
    currentTrackUrl = URL.createObjectURL(item.blob);
    currentTrackId = item.id;
    lastNowPlayingSecond = -1;
    audio.src = currentTrackUrl;
    audio.load();
    item.playedAt = Date.now();
    saveAsset(item).catch(function () {});
    updateNowPlaying();
    ensureTrackCover(item).then(function () {
      musicMounts.forEach(renderMusic);
      updateNowPlaying();
    }).catch(function () {});
  }

  function playTrack(id) {
    return ensureMusic().then(function () {
      var item = musicItems.find(function (entry) { return entry.id === id; });
      if (!item) return;
      if (currentTrackId !== id || !audio.src) setTrackSource(item);
      return audio.play().catch(function () { notify("Playback paused", "Press play again after allowing audio in this tab.", "music"); });
    });
  }

  function adjacentTrack(direction) {
    if (!musicItems.length) return;
    var index = musicItems.findIndex(function (item) { return item.id === currentTrackId; });
    if (musicShuffle) index = Math.floor(Math.random() * musicItems.length);
    else index = (Math.max(0, index) + direction + musicItems.length) % musicItems.length;
    playTrack(musicItems[index].id);
  }

  function transport(action) {
    ensureMusic().then(function () {
      if (action === "previous") { adjacentTrack(-1); return; }
      if (action === "next") { adjacentTrack(1); return; }
      if (action === "toggle") {
        if (!currentTrackId && musicItems[0]) { playTrack(musicItems[0].id); return; }
        if (audio.paused) audio.play().catch(function () {}); else audio.pause();
      }
    }).catch(function () {});
  }

  function setVolume(value) {
    var volume = Math.max(0, Math.min(1, Number(value) || 0));
    audio.volume = volume;
    if (volume > 0) audio.muted = false;
    writeJson(MUSIC_VOLUME_KEY, volume);
    updateNowPlaying();
  }

  function setMuted(value) {
    audio.muted = Boolean(value);
    updateNowPlaying();
    return audio.muted;
  }

  function stopMusic() {
    try { audio.pause(); } catch (error) {}
    try { audio.currentTime = 0; } catch (error) {}
    try { audio.removeAttribute("src"); } catch (error) {}
    try { audio.load(); } catch (error) {}
    if (currentTrackUrl) {
      try { URL.revokeObjectURL(currentTrackUrl); } catch (error) {}
    }
    currentTrackUrl = "";
    currentTrackId = "";
    lastNowPlayingSecond = -1;
    try { updateNowPlaying(); } catch (error) {}
  }

  function savePlaylists() {
    writeJson(PLAYLIST_KEY, playlists);
  }

  function openDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function closeDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  function musicMarkup() {
    return '<div class="feature-app music-app" data-music-app>' +
      '<aside class="feature-sidebar">' +
        '<div class="feature-brand"><span><strong>Audio Player</strong><small>Local library</small></span></div>' +
        '<nav aria-label="Audio Player views">' +
          '<button class="is-active" type="button" data-music-view="home">' + icon("music") + '<span>Home</span></button>' +
          '<button type="button" data-music-view="search">' + icon("search") + '<span>Search</span></button>' +
          '<button type="button" data-music-view="liked">' + icon("heart") + '<span>Liked Songs</span></button>' +
        '</nav>' +
        '<div class="feature-sidebar-heading"><span>PLAYLISTS</span><button type="button" data-new-playlist aria-label="Create playlist">' + icon("plus") + '</button></div>' +
        '<div class="playlist-nav" data-playlist-nav></div>' +
      '</aside>' +
      '<main class="feature-content">' +
        '<header class="feature-content-heading"><div><span class="eyebrow">YOUR MUSIC</span><h2 data-music-title>Home</h2><p data-music-subtitle>Play audio stored on this device.</p></div><label class="feature-import button primary">' + icon("upload") + '<span>Add audio</span><input type="file" accept="audio/*" multiple data-music-import aria-label="Add audio" /></label></header>' +
        '<label class="feature-search">' + icon("search") + '<span class="sr-only">Search music</span><input type="search" data-music-search placeholder="Search songs" autocomplete="off" /></label>' +
        '<div class="feature-state" data-music-state role="status"><span class="library-spinner" aria-hidden="true"></span><strong>Reading your music</strong><p>Local files stay on this device.</p></div>' +
        '<div class="music-track-list" data-music-list></div>' +
      '</main>' +
      '<footer class="music-player">' +
        '<div class="player-track"><span class="player-art" data-player-art>' + icon("music") + '</span><span><strong data-player-title>Choose a song</strong><small data-player-copy>Your imported files appear above</small></span><button type="button" data-player-like aria-label="Like current song" disabled>' + icon("heart") + '</button></div>' +
        '<div class="player-center"><div class="player-controls"><button type="button" data-player-action="shuffle" aria-label="Shuffle" aria-pressed="false">' + icon("shuffle") + '</button><button type="button" data-player-action="previous" aria-label="Previous">' + icon("skip-back") + '</button><button class="player-toggle" type="button" data-player-action="toggle" aria-label="Play">' + icon("play") + '</button><button type="button" data-player-action="next" aria-label="Next">' + icon("skip-forward") + '</button><button type="button" data-player-action="repeat" aria-label="Repeat" aria-pressed="false">' + icon("repeat") + '</button></div><div class="player-progress"><time data-player-elapsed>0:00</time><input type="range" min="0" max="1000" value="0" data-player-progress aria-label="Song progress" /><time data-player-duration>0:00</time></div></div>' +
        '<label class="player-volume">' + icon("volume") + '<span class="sr-only">Volume</span><input type="range" min="0" max="100" value="55" data-player-volume /></label>' +
      '</footer>' +
      '<dialog class="feature-dialog" data-playlist-dialog><form method="dialog"><span class="eyebrow">PLAYLIST</span><h3>Create a playlist</h3><label>Name<input type="text" maxlength="48" data-playlist-name placeholder="Playlist name" required /></label><div><button class="button" type="button" data-dialog-close>Cancel</button><button class="button primary" value="default" data-playlist-save>Create</button></div></form></dialog>' +
      '<dialog class="feature-dialog" data-add-dialog><div><span class="eyebrow">ADD TO PLAYLIST</span><h3 data-add-title>Choose a playlist</h3><div class="dialog-choice-list" data-add-list></div><button class="button" type="button" data-dialog-close>Done</button></div></dialog>' +
    '</div>';
  }

  function playlistName(id) {
    var playlist = playlists.find(function (item) { return item.id === id; });
    return playlist ? playlist.name : "Playlist";
  }

  function filteredMusic(mount) {
    var items = musicItems.slice();
    if (mount.view === "liked") items = items.filter(function (item) { return item.liked; });
    if (mount.view === "playlist") {
      var playlist = playlists.find(function (item) { return item.id === mount.playlistId; });
      var ids = playlist ? playlist.trackIds : [];
      items = items.filter(function (item) { return ids.indexOf(item.id) !== -1; });
    }
    var query = mount.query.toLocaleLowerCase();
    if (query) items = items.filter(function (item) { return item.title.toLocaleLowerCase().indexOf(query) !== -1; });
    if (mount.view === "home") items.sort(function (a, b) { return (b.playedAt || 0) - (a.playedAt || 0) || (b.createdAt || 0) - (a.createdAt || 0); });
    return items;
  }

  function renderPlaylistNav(mount) {
    var host = mount.root.querySelector("[data-playlist-nav]");
    host.textContent = "";
    if (!playlists.length) {
      var empty = document.createElement("p");
      empty.textContent = "No playlists yet";
      host.appendChild(empty);
      return;
    }
    playlists.forEach(function (playlist) {
      var button = document.createElement("button");
      button.type = "button";
      button.dataset.playlistOpen = playlist.id;
      button.className = mount.view === "playlist" && mount.playlistId === playlist.id ? "is-active" : "";
      button.innerHTML = icon("folder") + "<span></span>";
      button.querySelector("span").textContent = playlist.name;
      host.appendChild(button);
    });
  }

  function renderMusic(mount) {
    var root = mount.root;
    var state = root.querySelector("[data-music-state]");
    var list = root.querySelector("[data-music-list]");
    var title = root.querySelector("[data-music-title]");
    var subtitle = root.querySelector("[data-music-subtitle]");
    root.querySelectorAll("[data-music-view]").forEach(function (button) { button.classList.toggle("is-active", button.dataset.musicView === mount.view); });
    renderPlaylistNav(mount);
    if (mount.loading) {
      state.classList.add("is-loading");
      state.querySelector("span").className = "library-spinner";
      state.querySelector("span").textContent = "";
      state.querySelector("strong").textContent = "Reading your music";
      state.querySelector("p").textContent = "Local files stay on this device.";
      state.hidden = false;
      list.textContent = "";
      return;
    }
    if (mount.error) {
      state.hidden = false;
      state.classList.add("is-error");
      state.querySelector("strong").textContent = "Could not open local music";
      state.querySelector("p").textContent = mount.error;
      list.textContent = "";
      return;
    }
    var heading = mount.view === "liked" ? "Liked Songs" : mount.view === "playlist" ? playlistName(mount.playlistId) : mount.view === "search" ? "Search" : "Home";
    title.textContent = heading;
    subtitle.textContent = mount.view === "playlist" ? "Songs saved to this playlist." : "Play audio stored on this device.";
    var items = filteredMusic(mount);
    state.classList.remove("is-loading");
    list.textContent = "";
    state.hidden = items.length > 0;
    state.classList.remove("is-error");
    if (!items.length) {
      state.querySelector("span").className = "feature-empty-icon";
      state.querySelector("span").innerHTML = icon(mount.view === "liked" ? "heart" : "music");
      state.querySelector("strong").textContent = mount.query ? "No matching songs" : mount.view === "liked" ? "No liked songs yet" : mount.view === "playlist" ? "This playlist is empty" : "Add your first song";
      state.querySelector("p").textContent = mount.query ? "Try a different title." : "Choose local audio files to build your library.";
      return;
    }
    items.forEach(function (item, index) {
      var row = document.createElement("article");
      row.className = "music-track" + (item.id === currentTrackId ? " is-current" : "");
      row.dataset.trackId = item.id;
      row.innerHTML = '<button class="track-play" type="button" data-track-play aria-label="Play song">' + icon(item.id === currentTrackId && !audio.paused ? "pause" : "play") + '</button><span class="track-index"></span><span class="track-art">' + icon("music") + '</span><span class="track-copy"><strong></strong><small>Local file</small></span><span class="track-size"></span><button class="track-action" type="button" data-track-like aria-label="Like song" aria-pressed="false">' + icon("heart") + '</button><button class="track-action track-playlist-action" type="button" data-track-add aria-label="Add to playlist" title="Add to playlist">' + icon("plus") + '<span><span class="track-action-prefix">Add to </span>playlist</span></button>';
      row.querySelector(".track-index").textContent = String(index + 1).padStart(2, "0");
      row.querySelector(".track-art").style.setProperty("--media-hue", hueFor(item.title));
      renderTrackArtwork(row.querySelector(".track-art"), item);
      row.querySelector(".track-copy strong").textContent = item.title;
      row.querySelector(".track-size").textContent = formatBytes(item.size);
      row.querySelector("[data-track-play]").setAttribute("aria-label", (item.id === currentTrackId && !audio.paused ? "Pause " : "Play ") + item.title);
      var like = row.querySelector("[data-track-like]");
      like.setAttribute("aria-label", (item.liked ? "Unlike " : "Like ") + item.title);
      like.classList.toggle("is-active", Boolean(item.liked));
      like.setAttribute("aria-pressed", item.liked ? "true" : "false");
      var playlistAction = row.querySelector("[data-track-add]");
      playlistAction.setAttribute("aria-label", "Add " + item.title + " to playlist");
      playlistAction.setAttribute("title", "Add " + item.title + " to playlist");
      if (mount.view === "playlist") {
        var add = playlistAction;
        add.dataset.trackRemove = "";
        add.removeAttribute("data-track-add");
        add.setAttribute("aria-label", "Remove " + item.title + " from playlist");
        add.setAttribute("title", "Remove from playlist");
        add.innerHTML = icon("trash") + "<span>Remove</span>";
      }
      list.appendChild(row);
    });
    updateMusicPlayer(mount);
  }

  function updateMusicPlayer(mount) {
    if (!mount || !mount.root || !document.contains(mount.root)) return;
    var root = mount.root;
    var item = currentTrack();
    var title = root.querySelector("[data-player-title]");
    var copy = root.querySelector("[data-player-copy]");
    var art = root.querySelector("[data-player-art]");
    var toggle = root.querySelector('[data-player-action="toggle"]');
    var like = root.querySelector("[data-player-like]");
    var elapsed = root.querySelector("[data-player-elapsed]");
    var duration = root.querySelector("[data-player-duration]");
    var progress = root.querySelector("[data-player-progress]");
    title.textContent = item ? item.title : "Choose a song";
    copy.textContent = item ? "Local music" : "Your imported files appear above";
    art.style.setProperty("--media-hue", hueFor(item ? item.title : "neo"));
    renderTrackArtwork(art, item);
    toggle.innerHTML = icon(item && !audio.paused ? "pause" : "play");
    toggle.setAttribute("aria-label", item && !audio.paused ? "Pause" : "Play");
    like.disabled = !item;
    like.classList.toggle("is-active", Boolean(item && item.liked));
    like.setAttribute("aria-pressed", item && item.liked ? "true" : "false");
    elapsed.textContent = formatTime(audio.currentTime);
    duration.textContent = formatTime(audio.duration);
    progress.value = audio.duration ? String(Math.round((audio.currentTime / audio.duration) * 1000)) : "0";
    root.querySelector('[data-player-action="shuffle"]').classList.toggle("is-active", musicShuffle);
    root.querySelector('[data-player-action="shuffle"]').setAttribute("aria-pressed", musicShuffle ? "true" : "false");
    root.querySelector('[data-player-action="repeat"]').classList.toggle("is-active", musicRepeat);
    root.querySelector('[data-player-action="repeat"]').setAttribute("aria-pressed", musicRepeat ? "true" : "false");
    root.querySelector("[data-player-volume]").value = String(Math.round(audio.volume * 100));
  }

  function openAddDialog(mount, trackId) {
    var dialog = mount.root.querySelector("[data-add-dialog]");
    var list = dialog.querySelector("[data-add-list]");
    var track = musicItems.find(function (item) { return item.id === trackId; });
    dialog.dataset.trackId = trackId;
    dialog.querySelector("[data-add-title]").textContent = track ? "Add " + track.title : "Choose a playlist";
    list.textContent = "";
    if (!playlists.length) {
      var create = document.createElement("button");
      create.type = "button";
      create.dataset.createPlaylistForTrack = "";
      create.innerHTML = icon("plus") + "<span><strong>New playlist</strong><small>Create one and add this song</small></span>";
      list.appendChild(create);
    } else {
      playlists.forEach(function (playlist) {
        var button = document.createElement("button");
        button.type = "button";
        button.dataset.addPlaylist = playlist.id;
        button.innerHTML = icon("folder") + "<span><strong></strong><small></small></span>";
        button.querySelector("strong").textContent = playlist.name;
        button.querySelector("small").textContent = playlist.trackIds.length + (playlist.trackIds.length === 1 ? " song" : " songs");
        list.appendChild(button);
      });
    }
    openDialog(dialog);
  }

  function openPlaylistDialog(root, trackId) {
    var dialog = root.querySelector("[data-playlist-dialog]");
    dialog.querySelector("[data-playlist-name]").value = "";
    if (trackId) dialog.dataset.trackId = trackId;
    else delete dialog.dataset.trackId;
    openDialog(dialog);
    requestAnimationFrame(function () { dialog.querySelector("input").focus(); });
  }

  function importMusic(files, mount) {
    var accepted = Array.from(files || []).filter(function (file) { return /^audio\//.test(file.type) && file.size <= 250 * 1024 * 1024; }).slice(0, 60);
    if (!accepted.length) {
      notify("No music added", "Choose audio files smaller than 250 MB each.", "music");
      return;
    }
    mount.loading = true;
    renderMusic(mount);
    Promise.all(accepted.map(function (file) {
      var title = cleanTitle(file.name);
      return trackCoverForFile(file, title).then(function (cover) {
        return saveAsset({ id: makeId("audio"), type: "audio", title: title, mime: file.type, size: file.size, createdAt: Date.now(), playedAt: 0, liked: false, cover: cover, blob: file });
      });
    })).then(function () {
      return ensureMusic(true);
    }).then(function () {
      mount.loading = false;
      musicMounts.forEach(renderMusic);
      notify("Music added", accepted.length + (accepted.length === 1 ? " song is" : " songs are") + " ready to play.", "music");
    }).catch(function () {
      mount.loading = false;
      mount.error = "NEO could not store these files. Check available storage and try again.";
      renderMusic(mount);
    });
  }

  function mountMusic(body) {
    body.innerHTML = musicMarkup();
    var root = body.querySelector("[data-music-app]");
    var mount = { root: root, view: "home", query: "", playlistId: "", loading: true, error: "" };
    musicMounts.add(mount);
    renderMusic(mount);
    ensureMusic().then(function () { mount.loading = false; renderMusic(mount); }).catch(function (error) { mount.loading = false; mount.error = error.message; renderMusic(mount); });

    root.addEventListener("click", function (event) {
      var view = event.target.closest("[data-music-view]");
      if (view) {
        mount.view = view.dataset.musicView;
        mount.playlistId = "";
        renderMusic(mount);
        if (mount.view === "search") root.querySelector("[data-music-search]").focus();
        return;
      }
      var playlistOpen = event.target.closest("[data-playlist-open]");
      if (playlistOpen) { mount.view = "playlist"; mount.playlistId = playlistOpen.dataset.playlistOpen; renderMusic(mount); return; }
      var trackRow = event.target.closest("[data-track-id]");
      if (trackRow && event.target.closest("[data-track-play]")) {
        if (currentTrackId === trackRow.dataset.trackId && !audio.paused) audio.pause(); else playTrack(trackRow.dataset.trackId);
        return;
      }
      if (trackRow && event.target.closest("[data-track-like]")) {
        var item = musicItems.find(function (entry) { return entry.id === trackRow.dataset.trackId; });
        if (item) { item.liked = !item.liked; saveAsset(item).catch(function () {}); musicMounts.forEach(renderMusic); updateNowPlaying(); }
        return;
      }
      if (trackRow && event.target.closest("[data-track-add]")) { openAddDialog(mount, trackRow.dataset.trackId); return; }
      if (trackRow && event.target.closest("[data-track-remove]")) {
        var playlist = playlists.find(function (entry) { return entry.id === mount.playlistId; });
        if (playlist) { playlist.trackIds = playlist.trackIds.filter(function (id) { return id !== trackRow.dataset.trackId; }); savePlaylists(); renderMusic(mount); }
        return;
      }
      if (event.target.closest("[data-create-playlist-for-track]")) {
        var addDialog = root.querySelector("[data-add-dialog]");
        var pendingTrackId = addDialog.dataset.trackId;
        closeDialog(addDialog);
        openPlaylistDialog(root, pendingTrackId);
        return;
      }
      if (event.target.closest("[data-new-playlist]")) {
        openPlaylistDialog(root, "");
        return;
      }
      var add = event.target.closest("[data-add-playlist]");
      if (add) {
        var target = playlists.find(function (entry) { return entry.id === add.dataset.addPlaylist; });
        var dialogTrack = root.querySelector("[data-add-dialog]").dataset.trackId;
        if (target && target.trackIds.indexOf(dialogTrack) === -1) target.trackIds.push(dialogTrack);
        savePlaylists();
        closeDialog(root.querySelector("[data-add-dialog]"));
        renderPlaylistNav(mount);
        notify("Added to playlist", target ? target.name : "Playlist updated.", "music");
        return;
      }
      if (event.target.closest("[data-dialog-close]")) { closeDialog(event.target.closest("dialog")); return; }
      var playerAction = event.target.closest("[data-player-action]");
      if (playerAction) {
        var action = playerAction.dataset.playerAction;
        if (action === "shuffle") { musicShuffle = !musicShuffle; updateNowPlaying(); return; }
        if (action === "repeat") { musicRepeat = !musicRepeat; audio.loop = musicRepeat; updateNowPlaying(); return; }
        transport(action);
        return;
      }
      if (event.target.closest("[data-player-like]")) {
        var current = currentTrack();
        if (current) { current.liked = !current.liked; saveAsset(current).catch(function () {}); musicMounts.forEach(renderMusic); updateNowPlaying(); }
      }
    });
    root.querySelector("[data-music-import]").addEventListener("change", function (event) { importMusic(event.target.files, mount); event.target.value = ""; });
    root.querySelector("[data-music-search]").addEventListener("input", function (event) { mount.query = event.target.value.trim(); if (mount.query) mount.view = "search"; renderMusic(mount); });
    root.querySelector("[data-player-progress]").addEventListener("input", function (event) { if (audio.duration) audio.currentTime = (Number(event.target.value) / 1000) * audio.duration; });
    root.querySelector("[data-player-volume]").addEventListener("input", function (event) {
      setVolume(Number(event.target.value) / 100);
    });
    root.querySelector("[data-playlist-dialog] form").addEventListener("submit", function (event) {
      event.preventDefault();
      var dialog = event.currentTarget.closest("dialog");
      if (event.submitter && event.submitter.value === "cancel") { closeDialog(dialog); return; }
      var name = dialog.querySelector("[data-playlist-name]").value.trim();
      if (!name) return;
      var pendingTrackId = dialog.dataset.trackId || "";
      playlists.push({ id: makeId("playlist"), name: name, trackIds: pendingTrackId ? [pendingTrackId] : [] });
      delete dialog.dataset.trackId;
      savePlaylists();
      closeDialog(dialog);
      renderPlaylistNav(mount);
      if (pendingTrackId) notify("Added to playlist", name, "music");
    });
    var hostWindow = body.closest(".neo-window");
    if (hostWindow) hostWindow._neoExtraCleanup = function () { musicMounts.delete(mount); };
  }

  function mediaMarkup() {
    return '<div class="feature-app media-app" data-media-app>' +
      '<aside class="feature-sidebar"><div class="feature-brand"><span class="feature-brand-icon app-icon-film">' + icon("film") + '</span><span><strong>Media Player</strong><small>On this device</small></span></div><nav aria-label="Media Player views"><button class="is-active" type="button" data-media-view="home">' + icon("film") + '<span>Home</span></button><button type="button" data-media-view="search">' + icon("search") + '<span>Search</span></button><button type="button" data-media-view="liked">' + icon("heart") + '<span>My List</span></button><button type="button" data-media-view="settings">' + icon("settings") + '<span>Settings</span></button></nav></aside>' +
      '<main class="feature-content media-content"><section data-media-library><header class="feature-content-heading"><div><span class="eyebrow">LOCAL MEDIA</span><h2 data-media-title>Home</h2><p>Watch your own files inside NEO.</p></div><label class="feature-import button primary">' + icon("upload") + '<span>Add videos</span><input type="file" accept="video/*" multiple data-media-import /></label></header><label class="feature-search">' + icon("search") + '<span class="sr-only">Search videos</span><input type="search" data-media-search placeholder="Search your videos" autocomplete="off" /></label><div class="feature-state" data-media-state role="status"><span class="library-spinner" aria-hidden="true"></span><strong>Reading your media</strong><p>Local files stay on this device.</p></div><div class="media-grid" data-media-grid></div><div class="media-settings" data-media-settings hidden></div></section>' +
      '<section class="media-player-view" data-media-player hidden><header><button class="button" type="button" data-media-back>' + icon("chevron") + ' Library</button><div><button class="button" type="button" data-media-pip>' + icon("pip") + ' Picture in picture</button><button class="icon-button" type="button" data-media-player-like aria-label="Add to My List">' + icon("heart") + '</button></div></header><div class="media-stage"><video controls playsinline preload="metadata" data-media-video></video></div><div class="media-player-copy"><div><span class="eyebrow">NOW WATCHING</span><h2 data-media-player-title></h2><p data-media-player-meta></p></div><button class="button danger" type="button" data-media-delete>' + icon("trash") + ' Remove file</button></div></section></main>' +
      '<dialog class="feature-dialog confirm-dialog" data-media-confirm><form method="dialog"><span class="eyebrow">CONFIRM</span><h3 data-confirm-title>Remove local data?</h3><p data-confirm-copy>This cannot be undone.</p><div><button class="button" type="button" data-dialog-close>Cancel</button><button class="button danger" value="default" data-confirm-action>Remove</button></div></form></dialog>' +
    '</div>';
  }

  function filteredMedia(mount) {
    var items = mediaItems.slice();
    if (mount.view === "liked") items = items.filter(function (item) { return item.liked; });
    var query = mount.query.toLocaleLowerCase();
    if (query) items = items.filter(function (item) { return item.title.toLocaleLowerCase().indexOf(query) !== -1; });
    if (mount.view === "home") items.sort(function (a, b) { return (b.playedAt || 0) - (a.playedAt || 0) || (b.createdAt || 0) - (a.createdAt || 0); });
    return items;
  }

  function renderMediaSettings(mount) {
    var host = mount.root.querySelector("[data-media-settings]");
    var watched = mediaItems.filter(function (item) { return item.playedAt; }).length;
    var liked = mediaItems.filter(function (item) { return item.liked; }).length;
    host.innerHTML = '<section class="media-stats"><span><strong>' + mediaItems.length + '</strong><small>Videos</small></span><span><strong>' + watched + '</strong><small>Watched</small></span><span><strong>' + liked + '</strong><small>In My List</small></span></section><section class="media-data-actions"><div><span class="eyebrow">HISTORY</span><h3>Viewing history</h3><p>Reset recently watched dates without deleting files.</p></div><button class="button" type="button" data-media-clear="history">Clear history</button></section><section class="media-data-actions"><div><span class="eyebrow">MY LIST</span><h3>Saved videos</h3><p>Remove every video from My List.</p></div><button class="button" type="button" data-media-clear="liked">Clear My List</button></section><section class="media-data-actions danger-zone"><div><span class="eyebrow">LOCAL STORAGE</span><h3>Delete media library</h3><p>Removes imported videos from this device only.</p></div><button class="button danger" type="button" data-media-clear="library">Delete library</button></section>';
  }

  function renderMedia(mount) {
    var root = mount.root;
    var grid = root.querySelector("[data-media-grid]");
    var state = root.querySelector("[data-media-state]");
    var settings = root.querySelector("[data-media-settings]");
    root.querySelectorAll("[data-media-view]").forEach(function (button) { button.classList.toggle("is-active", button.dataset.mediaView === mount.view); });
    root.querySelector("[data-media-title]").textContent = mount.view === "liked" ? "My List" : mount.view === "search" ? "Search" : mount.view === "settings" ? "Settings" : "Home";
    settings.hidden = mount.view !== "settings";
    grid.hidden = mount.view === "settings";
    root.querySelector("[data-media-search]").closest("label").hidden = mount.view === "settings";
    state.hidden = true;
    if (mount.view === "settings") { renderMediaSettings(mount); return; }
    if (mount.loading) {
      state.classList.add("is-loading");
      state.querySelector("span").className = "library-spinner";
      state.querySelector("span").textContent = "";
      state.querySelector("strong").textContent = "Reading your media";
      state.querySelector("p").textContent = "Local files stay on this device.";
      state.hidden = false;
      grid.textContent = "";
      return;
    }
    if (mount.error) {
      state.hidden = false;
      state.querySelector("strong").textContent = "Could not open local media";
      state.querySelector("p").textContent = mount.error;
      grid.textContent = "";
      return;
    }
    var items = filteredMedia(mount);
    state.classList.remove("is-loading");
    grid.textContent = "";
    state.hidden = items.length > 0;
    if (!items.length) {
      state.querySelector("span").className = "feature-empty-icon";
      state.querySelector("span").innerHTML = icon(mount.view === "liked" ? "heart" : "film");
      state.querySelector("strong").textContent = mount.query ? "No matching videos" : mount.view === "liked" ? "My List is empty" : "Add your first video";
      state.querySelector("p").textContent = "Choose local video files. Nothing is fetched from another site.";
      return;
    }
    items.forEach(function (item) {
      var card = document.createElement("article");
      card.className = "media-card";
      card.dataset.mediaId = item.id;
      card.innerHTML = '<button class="media-card-open" type="button" data-media-open><span class="media-card-art">' + icon("play") + '</span><span class="media-card-copy"><strong></strong><small></small></span></button><button class="media-card-like" type="button" data-media-like aria-label="Add to My List" aria-pressed="false">' + icon("heart") + '</button>';
      card.querySelector(".media-card-art").style.setProperty("--media-hue", hueFor(item.title));
      card.querySelector("strong").textContent = item.title;
      card.querySelector("small").textContent = (item.playedAt ? "Watched | " : "") + formatBytes(item.size);
      var like = card.querySelector("[data-media-like]");
      like.classList.toggle("is-active", Boolean(item.liked));
      like.setAttribute("aria-pressed", item.liked ? "true" : "false");
      grid.appendChild(card);
    });
  }

  function openMediaItem(mount, id) {
    var item = mediaItems.find(function (entry) { return entry.id === id; });
    if (!item) return;
    var player = mount.root.querySelector("[data-media-player]");
    var library = mount.root.querySelector("[data-media-library]");
    var video = mount.root.querySelector("[data-media-video]");
    if (mount.videoUrl) URL.revokeObjectURL(mount.videoUrl);
    mount.videoUrl = URL.createObjectURL(item.blob);
    mount.playingId = item.id;
    mount.cover = "";
    video.src = mount.videoUrl;
    library.hidden = true;
    player.hidden = false;
    player.querySelector("[data-media-player-title]").textContent = item.title;
    player.querySelector("[data-media-player-meta]").textContent = "Local file | " + formatBytes(item.size);
    var like = player.querySelector("[data-media-player-like]");
    like.classList.toggle("is-active", Boolean(item.liked));
    like.setAttribute("aria-pressed", item.liked ? "true" : "false");
    item.playedAt = Date.now();
    saveAsset(item).catch(function () {});
    updateVideoNowPlaying(mount);
    video.play().catch(function () {});
  }

  function updateVideoNowPlaying(mount) {
    var item = mediaItems.find(function (entry) { return entry.id === mount.playingId; });
    var video = mount.root.querySelector("[data-media-video]");
    if (!item || !video || !video.getAttribute("src")) {
      reportMediaState({ source: "local-video", active: false });
      return;
    }
    reportMediaState({
      source: "local-video",
      appId: "media",
      kind: "video",
      icon: "film",
      title: item.title,
      copy: "Local video",
      cover: mount.cover || "",
      hue: hueFor(item.title),
      playing: !video.paused && !video.ended,
      transport: false,
      active: true
    });
  }

  function captureVideoCover(mount, video) {
    if (mount.cover || !video.videoWidth || !video.videoHeight) return;
    var canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = Math.max(90, Math.round(160 * video.videoHeight / video.videoWidth));
    try {
      canvas.getContext("2d", { alpha: false }).drawImage(video, 0, 0, canvas.width, canvas.height);
      mount.cover = canvas.toDataURL("image/jpeg", 0.78);
      updateVideoNowPlaying(mount);
    } catch (error) {
      mount.cover = "";
    }
  }

  function closeMediaPlayer(mount) {
    var video = mount.root.querySelector("[data-media-video]");
    video.pause();
    video.removeAttribute("src");
    video.load();
    if (mount.videoUrl) URL.revokeObjectURL(mount.videoUrl);
    mount.videoUrl = "";
    mount.playingId = "";
    mount.cover = "";
    reportMediaState({ source: "local-video", active: false });
    mount.root.querySelector("[data-media-player]").hidden = true;
    mount.root.querySelector("[data-media-library]").hidden = false;
    renderMedia(mount);
  }

  function importMedia(files, mount) {
    var accepted = Array.from(files || []).filter(function (file) { return /^video\//.test(file.type) && file.size <= 1200 * 1024 * 1024; }).slice(0, 30);
    if (!accepted.length) { notify("No videos added", "Choose video files smaller than 1.2 GB each.", "film"); return; }
    mount.loading = true;
    renderMedia(mount);
    Promise.all(accepted.map(function (file) { return saveAsset({ id: makeId("video"), type: "video", title: cleanTitle(file.name), mime: file.type, size: file.size, createdAt: Date.now(), playedAt: 0, liked: false, blob: file }); })).then(function () { return ensureMedia(true); }).then(function () {
      mount.loading = false;
      mediaMounts.forEach(renderMedia);
      notify("Videos added", accepted.length + (accepted.length === 1 ? " video is" : " videos are") + " ready.", "film");
    }).catch(function () {
      mount.loading = false;
      mount.error = "NEO could not store these files. Check available storage and try again.";
      renderMedia(mount);
    });
  }

  function askMediaConfirmation(mount, action) {
    var dialog = mount.root.querySelector("[data-media-confirm]");
    var titles = { history: "Clear viewing history?", liked: "Clear My List?", library: "Delete the media library?", file: "Remove this video?" };
    var copies = { history: "Your files remain in the library.", liked: "Your files remain in the library.", library: "Every imported video will be removed from this device.", file: "This local file will be removed from NEO Media." };
    dialog.dataset.confirmAction = action;
    dialog.querySelector("[data-confirm-title]").textContent = titles[action];
    dialog.querySelector("[data-confirm-copy]").textContent = copies[action];
    openDialog(dialog);
  }

  function runMediaAction(mount, action) {
    var operation;
    if (action === "history") {
      mediaItems.forEach(function (item) { item.playedAt = 0; });
      operation = Promise.all(mediaItems.map(saveAsset));
    } else if (action === "liked") {
      mediaItems.forEach(function (item) { item.liked = false; });
      operation = Promise.all(mediaItems.map(saveAsset));
    } else if (action === "file") {
      operation = deleteAsset(mount.playingId).then(function () { closeMediaPlayer(mount); return ensureMedia(true); });
    } else {
      closeMediaPlayer(mount);
      operation = deleteAssetsOfType("video").then(function () { return ensureMedia(true); });
    }
    operation.then(function () { mediaMounts.forEach(renderMedia); notify("Media updated", "Your local changes were saved.", "film"); }).catch(function () { notify("Could not update media", "Local storage rejected the change.", "info"); });
  }

  function mountMedia(body) {
    body.innerHTML = mediaMarkup();
    var root = body.querySelector("[data-media-app]");
    var mount = { root: root, view: "home", query: "", loading: true, error: "", playingId: "", videoUrl: "", cover: "" };
    mediaMounts.add(mount);
    renderMedia(mount);
    ensureMedia().then(function () { mount.loading = false; renderMedia(mount); }).catch(function (error) { mount.loading = false; mount.error = error.message; renderMedia(mount); });
    root.addEventListener("click", function (event) {
      var view = event.target.closest("[data-media-view]");
      if (view) { mount.view = view.dataset.mediaView; renderMedia(mount); if (mount.view === "search") root.querySelector("[data-media-search]").focus(); return; }
      var card = event.target.closest("[data-media-id]");
      if (card && event.target.closest("[data-media-open]")) { openMediaItem(mount, card.dataset.mediaId); return; }
      if (card && event.target.closest("[data-media-like]")) {
        var item = mediaItems.find(function (entry) { return entry.id === card.dataset.mediaId; });
        if (item) { item.liked = !item.liked; saveAsset(item).catch(function () {}); mediaMounts.forEach(renderMedia); }
        return;
      }
      if (event.target.closest("[data-media-back]")) { closeMediaPlayer(mount); return; }
      if (event.target.closest("[data-media-pip]")) {
        var video = root.querySelector("[data-media-video]");
        if (document.pictureInPictureElement) document.exitPictureInPicture().catch(function () {});
        else if (document.pictureInPictureEnabled && typeof video.requestPictureInPicture === "function") video.requestPictureInPicture().catch(function () { notify("Picture in picture unavailable", "The video could not be opened in a floating view.", "film"); });
        else notify("Picture in picture unavailable", "Picture in picture is not available on this device.", "film");
        return;
      }
      if (event.target.closest("[data-media-player-like]")) {
        var playing = mediaItems.find(function (entry) { return entry.id === mount.playingId; });
        if (playing) { playing.liked = !playing.liked; saveAsset(playing).catch(function () {}); event.target.closest("button").classList.toggle("is-active", playing.liked); }
        return;
      }
      if (event.target.closest("[data-media-delete]")) { askMediaConfirmation(mount, "file"); return; }
      if (event.target.closest("[data-dialog-close]")) { closeDialog(event.target.closest("dialog")); return; }
      var clear = event.target.closest("[data-media-clear]");
      if (clear) { askMediaConfirmation(mount, clear.dataset.mediaClear); return; }
    });
    root.querySelector("[data-media-import]").addEventListener("change", function (event) { importMedia(event.target.files, mount); event.target.value = ""; });
    root.querySelector("[data-media-search]").addEventListener("input", function (event) { mount.query = event.target.value.trim(); if (mount.query) mount.view = "search"; renderMedia(mount); });
    var mediaVideo = root.querySelector("[data-media-video]");
    ["play", "playing", "pause", "ended", "loadedmetadata"].forEach(function (name) {
      mediaVideo.addEventListener(name, function () { updateVideoNowPlaying(mount); });
    });
    mediaVideo.addEventListener("loadeddata", function () { captureVideoCover(mount, mediaVideo); });
    root.querySelector("[data-media-confirm] form").addEventListener("submit", function (event) {
      event.preventDefault();
      var dialog = event.currentTarget.closest("dialog");
      if (event.submitter && event.submitter.matches("[data-confirm-action]")) runMediaAction(mount, dialog.dataset.confirmAction);
      closeDialog(dialog);
    });
    var hostWindow = body.closest(".neo-window");
    if (hostWindow) hostWindow._neoExtraCleanup = function () { closeMediaPlayer(mount); mediaMounts.delete(mount); };
  }

  function appsMarkup() {
    return '<div class="feature-app apps-manager" data-apps-manager><header class="feature-content-heading"><div><span class="eyebrow">WORKSPACE</span><h2>My Apps</h2><p>Open apps and choose what stays on your taskbar.</p></div><span class="status-pill" data-app-count></span></header><div class="apps-toolbar"><label class="feature-search">' + icon("search") + '<span class="sr-only">Search apps</span><input type="search" data-app-search placeholder="Search installed apps" autocomplete="off" /></label><div class="app-filters" data-app-filters></div></div><div class="apps-grid" data-app-grid></div><div class="feature-state" data-app-empty hidden><span class="feature-empty-icon">' + icon("apps") + '</span><strong>No matching apps</strong><p>Try another name or category.</p></div></div>';
  }

  function mountApps(body) {
    body.innerHTML = appsMarkup();
    var root = body.querySelector("[data-apps-manager]");
    var state = { query: "", category: "All" };
    function render() {
      var all = api.getApps();
      var categories = ["All"].concat(Array.from(new Set(all.map(function (app) { return app.category || "Other"; }))).sort());
      var filters = root.querySelector("[data-app-filters]");
      filters.textContent = "";
      categories.forEach(function (category) {
        var button = document.createElement("button");
        button.type = "button";
        button.dataset.appFilter = category;
        button.className = category === state.category ? "is-active" : "";
        button.textContent = category;
        filters.appendChild(button);
      });
      var query = state.query.toLocaleLowerCase();
      var visible = all.filter(function (app) { return (state.category === "All" || app.category === state.category) && (!query || (app.title + " " + app.subtitle + " " + app.category).toLocaleLowerCase().indexOf(query) !== -1); });
      var grid = root.querySelector("[data-app-grid]");
      grid.textContent = "";
      root.querySelector("[data-app-empty]").hidden = visible.length > 0;
      root.querySelector("[data-app-count]").textContent = all.length + " installed";
      visible.forEach(function (app) {
        var card = document.createElement("article");
        card.className = "managed-app";
        card.dataset.managedApp = app.id;
        card.innerHTML = '<span class="managed-app-icon app-icon-shape">' + icon(app.icon) + '</span><span class="managed-app-copy"><strong></strong><small></small><em></em></span><div class="managed-app-actions"><label class="pin-toggle"><input type="checkbox" data-app-pin /><span></span><small>Taskbar</small></label><button class="button primary" type="button" data-app-run>Run</button></div>';
        card.querySelector(".managed-app-copy strong").textContent = app.title;
        card.querySelector(".managed-app-copy small").textContent = app.subtitle;
        card.querySelector(".managed-app-copy em").textContent = app.category;
        var pin = card.querySelector("[data-app-pin]");
        pin.checked = app.pinned;
        pin.setAttribute("aria-label", (app.pinned ? "Remove " : "Pin ") + app.title + (app.pinned ? " from taskbar" : " to taskbar"));
        card.querySelector("[data-app-run]").setAttribute("aria-label", "Open " + app.title);
        grid.appendChild(card);
      });
    }
    root.addEventListener("click", function (event) {
      var filter = event.target.closest("[data-app-filter]");
      if (filter) { state.category = filter.dataset.appFilter; render(); return; }
      var card = event.target.closest("[data-managed-app]");
      if (card && event.target.closest("[data-app-run]")) api.openApp(card.dataset.managedApp);
    });
    root.addEventListener("change", function (event) {
      var pin = event.target.closest("[data-app-pin]");
      if (!pin) return;
      var card = pin.closest("[data-managed-app]");
      api.setPinned(card.dataset.managedApp, pin.checked);
      notify(pin.checked ? "Pinned to taskbar" : "Removed from taskbar", card.querySelector("strong").textContent, "apps");
      render();
    });
    root.querySelector("[data-app-search]").addEventListener("input", function (event) { state.query = event.target.value.trim(); render(); });
    render();
  }

  function appInstallerMarkup() {
    return '<section class="feature-app app-installer" data-app-installer><header class="feature-content-heading"><div><span class="eyebrow">WEB APPS</span><h2>App Installer</h2><p>Give a website a name and icon. NEO will add it to Applications and your desktop.</p></div><span class="status-pill">LOCAL</span></header><div class="installer-layout"><form class="installer-form" data-installer-form><div class="installer-form-heading"><span class="installer-form-icon">' + icon("plus") + '</span><div><strong>Install a website</strong><small>Your installed apps stay on this device.</small></div></div><label><span>App name</span><input type="text" maxlength="48" autocomplete="off" placeholder="Example: School Portal" data-installer-name required /></label><label><span>Website URL</span><input type="text" inputmode="url" autocomplete="url" spellcheck="false" placeholder="https://example.com" data-installer-url required /></label><label><span>Icon URL <em>optional</em></span><input type="text" inputmode="url" autocomplete="url" spellcheck="false" placeholder="https://example.com/icon.png" data-installer-icon /></label><p class="installer-help">Installed websites and every link they open use the NEO web proxy.</p><div class="installer-submit-row"><button class="button primary" type="submit">Install &amp; open</button><output data-installer-status aria-live="polite"></output></div></form><section class="installed-sites"><div class="installed-sites-heading"><div><span class="eyebrow">INSTALLED</span><h3>Your website apps</h3></div><span data-custom-app-count></span></div><div class="installed-sites-list" data-custom-app-list></div><div class="feature-state installed-sites-empty" data-custom-app-empty hidden><span class="feature-empty-icon">' + icon("apps") + '</span><strong>No website apps yet</strong><p>Install one using the form.</p></div></section></div></section>';
  }

  function mountAppInstaller(body) {
    body.innerHTML = appInstallerMarkup();
    var root = body.querySelector("[data-app-installer]");
    var form = root.querySelector("[data-installer-form]");
    var status = root.querySelector("[data-installer-status]");

    function setStatus(message, error) {
      status.textContent = message || "";
      status.classList.toggle("is-error", Boolean(error));
    }

    function render() {
      var customApps = typeof api.getCustomApps === "function" ? api.getCustomApps() : [];
      var list = root.querySelector("[data-custom-app-list]");
      list.replaceChildren();
      root.querySelector("[data-custom-app-empty]").hidden = customApps.length > 0;
      root.querySelector("[data-custom-app-count]").textContent = customApps.length + (customApps.length === 1 ? " app" : " apps");
      customApps.forEach(function (app) {
        var card = document.createElement("article");
        card.className = "installed-site";
        card.dataset.customAppId = app.id;
        var artwork = document.createElement("span");
        artwork.className = "installed-site-icon app-icon-shape";
        artwork.innerHTML = icon(app.icon);
        var copy = document.createElement("span");
        copy.className = "installed-site-copy";
        var name = document.createElement("strong");
        name.textContent = app.title;
        var url = document.createElement("small");
        url.textContent = app.sourceUrl;
        var mode = document.createElement("em");
        mode.textContent = "NEO WEB PROXY";
        copy.append(name, url, mode);
        var actions = document.createElement("span");
        actions.className = "installed-site-actions";
        var open = document.createElement("button");
        open.type = "button";
        open.className = "button primary";
        open.dataset.customAppOpen = "";
        open.textContent = "Open";
        open.setAttribute("aria-label", "Open " + app.title);
        var remove = document.createElement("button");
        remove.type = "button";
        remove.className = "button danger";
        remove.dataset.customAppRemove = "";
        remove.textContent = "Remove";
        remove.setAttribute("aria-label", "Remove " + app.title);
        actions.append(open, remove);
        card.append(artwork, copy, actions);
        list.appendChild(card);
      });
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      setStatus("Installing…", false);
      try {
        var app = api.installCustomApp({
          title: root.querySelector("[data-installer-name]").value,
          url: root.querySelector("[data-installer-url]").value,
          icon: root.querySelector("[data-installer-icon]").value,
          mode: "relay"
        });
        form.reset();
        setStatus(app.title + " installed and opened.", false);
        notify("App installed", app.title + " is ready on your desktop.", "apps");
        render();
        window.requestAnimationFrame(function () { api.openApp(app.id); });
      } catch (error) {
        setStatus(error && error.message ? error.message : "This app could not be installed.", true);
      }
    });

    root.addEventListener("click", function (event) {
      var card = event.target.closest("[data-custom-app-id]");
      if (!card) return;
      if (event.target.closest("[data-custom-app-open]")) api.openApp(card.dataset.customAppId);
      if (event.target.closest("[data-custom-app-remove]")) {
        var name = card.querySelector("strong").textContent;
        if (api.removeCustomApp(card.dataset.customAppId)) {
          setStatus(name + " removed.", false);
          notify("App removed", name + " was removed from NEO.", "apps");
          render();
        }
      }
    });
    render();
    requestAnimationFrame(function () { root.querySelector("[data-installer-name]").focus({ preventScroll: true }); });
  }

  function terminalMarkup() {
    return '<section class="neo-terminal" data-terminal><div class="terminal-output" data-terminal-output role="log" aria-live="polite"></div><form class="terminal-composer" data-terminal-form><label><span aria-hidden="true">neo@desktop:~$</span><span class="sr-only">Terminal command</span><input type="text" data-terminal-input autocomplete="off" autocapitalize="off" spellcheck="false" /></label></form></section>';
  }

  function appendTerminalLine(output, text, className) {
    var line = document.createElement("div");
    line.className = "terminal-line " + (className || "");
    line.textContent = text;
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
  }

  function runTerminalCommand(output, raw) {
    var command = String(raw || "").trim();
    if (!command) return;
    appendTerminalLine(output, "neo@desktop:~$ " + command, "is-command");
    var parts = command.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
    var name = String(parts.shift() || "").toLocaleLowerCase();
    var argument = parts.join(" ").replace(/^"|"$/g, "");
    if (name === "clear" || name === "cls") output.textContent = "";
    else if (name === "help") appendTerminalLine(output, "Commands: apps, clear, date, echo, fullscreen, help, ls, open, pwd, settings, version, whoami");
    else if (name === "apps") appendTerminalLine(output, api.getApps().map(function (app) { return app.id; }).join("  "));
    else if (name === "date") appendTerminalLine(output, new Date().toString());
    else if (name === "echo") appendTerminalLine(output, argument);
    else if (name === "ls" || name === "dir") appendTerminalLine(output, "Desktop  Documents  Downloads  Music  Pictures  Videos");
    else if (name === "pwd") appendTerminalLine(output, "/home/neo/Desktop");
    else if (name === "settings") { api.openApp("control"); appendTerminalLine(output, "Opened Control Center."); }
    else if (name === "fullscreen") { toggleDesktopFullscreen(); appendTerminalLine(output, "Toggled fullscreen mode."); }
    else if (name === "version") appendTerminalLine(output, "NEO OS web edition");
    else if (name === "whoami") appendTerminalLine(output, "neo");
    else if (name === "open") {
      var match = api.getApps().find(function (app) { return app.id === argument.toLocaleLowerCase() || app.title.toLocaleLowerCase() === argument.toLocaleLowerCase(); });
      if (!argument) appendTerminalLine(output, "Usage: open <app>", "is-error");
      else if (!match) appendTerminalLine(output, "App not found: " + argument, "is-error");
      else { api.openApp(match.id); appendTerminalLine(output, "Opened " + match.title + "."); }
    } else appendTerminalLine(output, "Command not found: " + name + ". Type help for available commands.", "is-error");
  }

  function mountTerminal(body) {
    body.innerHTML = terminalMarkup();
    var root = body.querySelector("[data-terminal]");
    var output = root.querySelector("[data-terminal-output]");
    var input = root.querySelector("[data-terminal-input]");
    var form = root.querySelector("[data-terminal-form]");
    var history = [];
    var historyIndex = 0;
    appendTerminalLine(output, "NEO OS Terminal", "is-heading");
    appendTerminalLine(output, "Local NEO console. Type help to see available commands.");
    function submitCommand() {
      var command = input.value;
      if (command.trim()) { history.push(command); historyIndex = history.length; }
      input.value = "";
      runTerminalCommand(output, command);
    }
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      submitCommand();
    });
    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        submitCommand();
        return;
      }
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      event.preventDefault();
      historyIndex = Math.max(0, Math.min(history.length, historyIndex + (event.key === "ArrowUp" ? -1 : 1)));
      input.value = history[historyIndex] || "";
      requestAnimationFrame(function () { input.setSelectionRange(input.value.length, input.value.length); });
    });
    root.addEventListener("pointerdown", function (event) { if (!event.target.closest("button, input")) input.focus(); });
    requestAnimationFrame(function () { input.focus({ preventScroll: true }); });
  }

  function mountNotes(body) {
    var key = "neo_os_notes_v1";
    var saved = readJson(key, { title: "Untitled note", body: "" });
    body.innerHTML = '<section class="neo-utility neo-notes" data-notes><header><div><span class="eyebrow">LOCAL NOTE</span><h2>Notes</h2></div><div class="utility-actions"><span data-notes-status>Saved</span><button type="button" data-notes-export>' + icon("download") + '<span>Save to Drive</span></button><button type="button" data-notes-clear>' + icon("trash") + '<span>Clear</span></button></div></header><input class="neo-notes-title" data-notes-title aria-label="Note title" maxlength="80" /><textarea data-notes-body aria-label="Note contents" spellcheck="true" placeholder="Start writing..."></textarea></section>';
    var root = body.querySelector("[data-notes]");
    var title = root.querySelector("[data-notes-title]");
    var editor = root.querySelector("[data-notes-body]");
    var status = root.querySelector("[data-notes-status]");
    var timer = 0;
    title.value = String(saved.title || "Untitled note");
    editor.value = String(saved.body || "");

    function save() {
      window.clearTimeout(timer);
      writeJson(key, { title: title.value.trim() || "Untitled note", body: editor.value, updatedAt: Date.now() });
      status.textContent = "Saved";
    }
    function scheduleSave() {
      status.textContent = "Saving...";
      window.clearTimeout(timer);
      timer = window.setTimeout(save, 220);
    }
    title.addEventListener("input", scheduleSave);
    editor.addEventListener("input", scheduleSave);
    root.querySelector("[data-notes-clear]").addEventListener("click", function () {
      title.value = "Untitled note";
      editor.value = "";
      save();
      editor.focus();
    });
    root.querySelector("[data-notes-export]").addEventListener("click", function () {
      save();
      var filename = (title.value.trim() || "NEO Note").replace(/[\\/:*?\"<>|]+/g, "-") + ".txt";
      api.saveToFiles(filename, new Blob([editor.value], { type: "text/plain;charset=utf-8" }), { type: "document" }).then(function () {
        notify("Note saved", filename + " is available in Drive.", "file");
      }).catch(function () { notify("Could not save note", "Local storage rejected the file.", "info"); });
    });
    var hostWindow = body.closest(".neo-window");
    if (hostWindow) hostWindow._neoExtraCleanup = function () { save(); };
    requestAnimationFrame(function () { editor.focus({ preventScroll: true }); });
  }

  function mountCalculator(body) {
    body.innerHTML = '<section class="neo-utility neo-calculator" data-calculator><div class="calculator-display"><small data-calculator-expression>&nbsp;</small><output data-calculator-output aria-live="polite">0</output></div><div class="calculator-grid" aria-label="Calculator keypad"><button type="button" data-calculator-command="clear">AC</button><button type="button" data-calculator-command="sign">+/-</button><button type="button" data-calculator-command="percent">%</button><button class="is-operator" type="button" data-calculator-operator="/">/</button><button type="button" data-calculator-digit="7">7</button><button type="button" data-calculator-digit="8">8</button><button type="button" data-calculator-digit="9">9</button><button class="is-operator" type="button" data-calculator-operator="*">x</button><button type="button" data-calculator-digit="4">4</button><button type="button" data-calculator-digit="5">5</button><button type="button" data-calculator-digit="6">6</button><button class="is-operator" type="button" data-calculator-operator="-">-</button><button type="button" data-calculator-digit="1">1</button><button type="button" data-calculator-digit="2">2</button><button type="button" data-calculator-digit="3">3</button><button class="is-operator" type="button" data-calculator-operator="+">+</button><button class="is-zero" type="button" data-calculator-digit="0">0</button><button type="button" data-calculator-digit=".">.</button><button class="is-equals" type="button" data-calculator-command="equals">=</button></div></section>';
    var root = body.querySelector("[data-calculator]");
    var output = root.querySelector("[data-calculator-output]");
    var expression = root.querySelector("[data-calculator-expression]");
    var state = { value: "0", stored: null, operator: "", replace: true };
    function numberValue() { return Number(state.value); }
    function format(value) {
      if (!Number.isFinite(value)) return "Error";
      return String(Number(value.toPrecision(12)));
    }
    function calculate() {
      if (state.stored == null || !state.operator) return numberValue();
      var right = numberValue();
      if (state.operator === "+") return state.stored + right;
      if (state.operator === "-") return state.stored - right;
      if (state.operator === "*") return state.stored * right;
      return right === 0 ? NaN : state.stored / right;
    }
    function render() {
      output.textContent = state.value;
      expression.textContent = state.stored == null || !state.operator ? "\u00a0" : format(state.stored) + " " + state.operator;
      root.querySelectorAll("[data-calculator-operator]").forEach(function (button) { button.classList.toggle("is-active", button.dataset.calculatorOperator === state.operator && state.replace); });
    }
    function digit(value) {
      if (state.value === "Error") state.value = "0";
      if (value === "." && !state.replace && state.value.indexOf(".") !== -1) return;
      if (state.replace) state.value = value === "." ? "0." : value;
      else if (state.value.length < 15) state.value = state.value === "0" && value !== "." ? value : state.value + value;
      state.replace = false;
      render();
    }
    function operator(value) {
      if (!state.replace && state.stored != null && state.operator) state.value = format(calculate());
      state.stored = numberValue();
      state.operator = value;
      state.replace = true;
      render();
    }
    function command(value) {
      if (value === "clear") state = { value: "0", stored: null, operator: "", replace: true };
      else if (value === "sign" && state.value !== "0" && state.value !== "Error") state.value = format(-numberValue());
      else if (value === "percent" && state.value !== "Error") state.value = format(numberValue() / 100);
      else if (value === "equals" && state.stored != null && state.operator) {
        var result = calculate();
        state.value = format(result);
        state.stored = null;
        state.operator = "";
        state.replace = true;
      }
      render();
    }
    root.addEventListener("click", function (event) {
      var button = event.target.closest("button");
      if (!button) return;
      if (button.dataset.calculatorDigit != null) digit(button.dataset.calculatorDigit);
      else if (button.dataset.calculatorOperator) operator(button.dataset.calculatorOperator);
      else command(button.dataset.calculatorCommand);
    });
    function onKey(event) {
      if (!body.isConnected || event.ctrlKey || event.metaKey || event.altKey) return;
      if (/^[0-9.]$/.test(event.key)) { event.preventDefault(); digit(event.key); }
      else if (["+", "-", "*", "/"].includes(event.key)) { event.preventDefault(); operator(event.key); }
      else if (event.key === "Enter" || event.key === "=") { event.preventDefault(); command("equals"); }
      else if (event.key === "Escape" || event.key === "Delete") { event.preventDefault(); command("clear"); }
      else if (event.key === "%") { event.preventDefault(); command("percent"); }
    }
    window.addEventListener("keydown", onKey);
    var hostWindow = body.closest(".neo-window");
    if (hostWindow) hostWindow._neoExtraCleanup = function () { window.removeEventListener("keydown", onKey); };
    render();
  }

  function mountPaint(body) {
    body.innerHTML = '<section class="neo-utility neo-paint" data-paint><header><div><span class="eyebrow">LOCAL CANVAS</span><h2>Paint</h2></div><div class="paint-tools"><label><span>Color</span><input type="color" value="#ffffff" data-paint-color /></label><label><span>Size</span><input type="range" min="1" max="44" value="6" data-paint-size /></label><button type="button" data-paint-erase aria-pressed="false">' + icon("trash") + '<span>Eraser</span></button><button type="button" data-paint-clear>' + icon("refresh") + '<span>Clear</span></button><button class="is-primary" type="button" data-paint-save>' + icon("download") + '<span>Save</span></button></div></header><div class="paint-canvas-wrap"><canvas data-paint-canvas aria-label="Drawing canvas"></canvas></div></section>';
    var root = body.querySelector("[data-paint]");
    var canvas = root.querySelector("[data-paint-canvas]");
    var wrap = root.querySelector(".paint-canvas-wrap");
    var context = canvas.getContext("2d", { alpha: false });
    var drawing = false;
    var last = null;
    var erase = false;
    var scale = 1;

    function fitCanvas() {
      var rect = wrap.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      var old = document.createElement("canvas");
      old.width = canvas.width;
      old.height = canvas.height;
      if (old.width && old.height) old.getContext("2d").drawImage(canvas, 0, 0);
      scale = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      canvas.width = Math.max(1, Math.round(rect.width * scale));
      canvas.height = Math.max(1, Math.round(rect.height * scale));
      context = canvas.getContext("2d", { alpha: false });
      context.fillStyle = "#111214";
      context.fillRect(0, 0, canvas.width, canvas.height);
      if (old.width && old.height) context.drawImage(old, 0, 0, old.width, old.height, 0, 0, canvas.width, canvas.height);
    }
    function point(event) {
      var rect = canvas.getBoundingClientRect();
      return { x: (event.clientX - rect.left) * scale, y: (event.clientY - rect.top) * scale };
    }
    function stroke(from, to) {
      context.strokeStyle = erase ? "#111214" : root.querySelector("[data-paint-color]").value;
      context.lineWidth = Number(root.querySelector("[data-paint-size]").value) * scale;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      context.stroke();
    }
    canvas.addEventListener("pointerdown", function (event) {
      drawing = true;
      last = point(event);
      canvas.setPointerCapture(event.pointerId);
      stroke(last, { x: last.x + 0.01, y: last.y + 0.01 });
    });
    canvas.addEventListener("pointermove", function (event) {
      if (!drawing) return;
      var next = point(event);
      stroke(last, next);
      last = next;
    });
    function stopDraw() { drawing = false; last = null; }
    canvas.addEventListener("pointerup", stopDraw);
    canvas.addEventListener("pointercancel", stopDraw);
    root.querySelector("[data-paint-erase]").addEventListener("click", function (event) {
      erase = !erase;
      event.currentTarget.setAttribute("aria-pressed", erase ? "true" : "false");
    });
    root.querySelector("[data-paint-clear]").addEventListener("click", function () {
      context.fillStyle = "#111214";
      context.fillRect(0, 0, canvas.width, canvas.height);
    });
    root.querySelector("[data-paint-save]").addEventListener("click", function () {
      canvas.toBlob(function (blob) {
        if (!blob) return;
        var name = "NEO Paint " + new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-") + ".png";
        api.saveToFiles(name, blob, { type: "image" }).then(function () { notify("Drawing saved", name + " is available in Drive.", "image"); }).catch(function () { notify("Could not save drawing", "Local storage rejected the image.", "info"); });
      }, "image/png");
    });
    var observer = typeof ResizeObserver === "function" ? new ResizeObserver(function () { fitCanvas(); }) : null;
    if (observer) observer.observe(wrap);
    requestAnimationFrame(fitCanvas);
    var hostWindow = body.closest(".neo-window");
    if (hostWindow) hostWindow._neoExtraCleanup = function () { if (observer) observer.disconnect(); };
  }

  function mountClock(body) {
    body.innerHTML = '<section class="neo-utility neo-clock" data-clock><div class="clock-live"><span class="eyebrow">LOCAL TIME</span><time data-clock-time></time><p data-clock-date></p></div><div class="stopwatch"><span class="eyebrow">STOPWATCH</span><output data-stopwatch>00:00.00</output><div><button class="is-primary" type="button" data-stopwatch-toggle>Start</button><button type="button" data-stopwatch-reset>Reset</button></div></div></section>';
    var root = body.querySelector("[data-clock]");
    var startedAt = 0;
    var elapsed = 0;
    var running = false;
    var watchTimer = 0;
    function updateClock() {
      var now = new Date();
      root.querySelector("[data-clock-time]").textContent = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" }).format(now);
      root.querySelector("[data-clock-date]").textContent = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(now);
    }
    function updateStopwatch() {
      var value = elapsed + (running ? performance.now() - startedAt : 0);
      var minutes = Math.floor(value / 60000);
      var seconds = Math.floor(value / 1000) % 60;
      var hundredths = Math.floor(value / 10) % 100;
      root.querySelector("[data-stopwatch]").textContent = String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0") + "." + String(hundredths).padStart(2, "0");
    }
    root.querySelector("[data-stopwatch-toggle]").addEventListener("click", function (event) {
      if (running) {
        elapsed += performance.now() - startedAt;
        running = false;
        window.clearInterval(watchTimer);
        watchTimer = 0;
        updateStopwatch();
      } else {
        startedAt = performance.now();
        running = true;
        watchTimer = window.setInterval(updateStopwatch, 40);
      }
      event.currentTarget.textContent = running ? "Pause" : "Start";
      event.currentTarget.classList.toggle("is-running", running);
    });
    root.querySelector("[data-stopwatch-reset]").addEventListener("click", function () { elapsed = 0; if (running) startedAt = performance.now(); updateStopwatch(); });
    updateClock();
    updateStopwatch();
    var clockTimer = window.setInterval(updateClock, 1000);
    var hostWindow = body.closest(".neo-window");
    if (hostWindow) hostWindow._neoExtraCleanup = function () { window.clearInterval(clockTimer); window.clearInterval(watchTimer); };
  }

  function mountPhotos(body) {
    body.innerHTML = '<section class="neo-utility neo-photos" data-photos><header><div><span class="eyebrow">LOCAL GALLERY</span><h2>Photos</h2></div><label class="utility-import">' + icon("plus") + '<span>Add photos</span><input type="file" accept="image/*" multiple hidden data-photos-input /></label></header><div class="photos-empty" data-photos-empty>' + icon("image") + '<strong>No photos open</strong><p>Choose pictures from this device. They stay in this session.</p></div><div class="photos-layout" data-photos-layout hidden><div class="photos-grid" data-photos-grid></div><figure class="photos-viewer"><img data-photos-view alt="Selected photo" /><figcaption><strong data-photos-name></strong><button type="button" data-photos-remove>' + icon("trash") + '<span>Remove</span></button></figcaption></figure></div></section>';
    var root = body.querySelector("[data-photos]");
    var items = [];
    var selected = "";
    function render() {
      var empty = root.querySelector("[data-photos-empty]");
      var layout = root.querySelector("[data-photos-layout]");
      empty.hidden = items.length > 0;
      layout.hidden = !items.length;
      if (!items.length) return;
      if (!items.some(function (item) { return item.id === selected; })) selected = items[0].id;
      var grid = root.querySelector("[data-photos-grid]");
      grid.textContent = "";
      items.forEach(function (item) {
        var button = document.createElement("button");
        button.type = "button";
        button.dataset.photoId = item.id;
        button.className = item.id === selected ? "is-active" : "";
        var image = document.createElement("img");
        image.src = item.url;
        image.alt = item.name;
        button.appendChild(image);
        grid.appendChild(button);
      });
      var active = items.find(function (item) { return item.id === selected; });
      root.querySelector("[data-photos-view]").src = active.url;
      root.querySelector("[data-photos-name]").textContent = active.name;
    }
    root.querySelector("[data-photos-input]").addEventListener("change", function (event) {
      Array.from(event.target.files || []).filter(function (file) { return file.type.indexOf("image/") === 0; }).forEach(function (file) {
        items.push({ id: makeId("photo"), name: file.name, url: URL.createObjectURL(file) });
      });
      if (items.length && !selected) selected = items[0].id;
      event.target.value = "";
      render();
    });
    root.addEventListener("click", function (event) {
      var thumbnail = event.target.closest("[data-photo-id]");
      if (thumbnail) { selected = thumbnail.dataset.photoId; render(); return; }
      if (event.target.closest("[data-photos-remove]")) {
        var active = items.find(function (item) { return item.id === selected; });
        if (active) URL.revokeObjectURL(active.url);
        items = items.filter(function (item) { return item.id !== selected; });
        selected = items.length ? items[0].id : "";
        render();
      }
    });
    var hostWindow = body.closest(".neo-window");
    if (hostWindow) hostWindow._neoExtraCleanup = function () { items.forEach(function (item) { URL.revokeObjectURL(item.url); }); };
    render();
  }

  function mount(id, body, shellApi) {
    if (shellApi) api = shellApi;
    if (id === "music") mountMusic(body);
    else if (id === "media") mountMedia(body);
    else if (id === "apps") mountApps(body);
    else if (id === "app-installer") mountAppInstaller(body);
    else if (id === "terminal") mountTerminal(body);
    else if (id === "notes") mountNotes(body);
    else if (id === "calculator") mountCalculator(body);
    else if (id === "paint") mountPaint(body);
    else if (id === "clock") mountClock(body);
    else if (id === "photos") mountPhotos(body);
    else body.innerHTML = '<div class="feature-loader is-error"><strong>App unavailable</strong><p>This native feature has not been registered.</p></div>';
  }

  function init(shellApi) {
    if (shellApi) api = shellApi;
    if (initialized) return;
    initialized = true;
    if (!notifications.length && !readJson(NOTIFICATION_SEEDED_KEY, false)) {
      notifications = [
        { id: makeId("notice"), title: "Workspace ready", copy: "NEO OS is running locally.", icon: "check", time: Date.now(), unread: true },
        { id: makeId("notice"), title: "Native media apps", copy: "Music, video, and app management are ready without URL embeds.", icon: "apps", time: Date.now() - 1000, unread: true }
      ];
      writeJson(NOTIFICATION_KEY, notifications);
    }
    writeJson(NOTIFICATION_SEEDED_KEY, true);
    renderNotifications();
    bindDesktopMenu(document.getElementById("desktop-context-menu"));
    document.addEventListener("click", function (event) {
      var panel = document.getElementById("notification-center");
      var menu = document.getElementById("desktop-context-menu");
      if (event.target.closest("[data-notification-close]")) { closeOverlays(); return; }
      if (event.target.closest("[data-notification-clear]")) { notifications = []; writeJson(NOTIFICATION_KEY, notifications); renderNotifications(); return; }
      if (panel && !panel.hidden && !event.target.closest("#notification-center, [data-notification-toggle]")) closeOverlays();
      if (menu && !menu.hidden && !event.target.closest("#desktop-context-menu")) {
        menu.hidden = true;
        closeDesktopSubmenus(menu);
      }
    });
    audio.addEventListener("play", updateNowPlaying);
    audio.addEventListener("pause", updateNowPlaying);
    audio.addEventListener("loadedmetadata", updateNowPlaying);
    audio.addEventListener("timeupdate", function () {
      musicMounts.forEach(updateMusicPlayer);
      var second = Math.floor(audio.currentTime || 0);
      if (second !== lastNowPlayingSecond) {
        lastNowPlayingSecond = second;
        updateNowPlaying(false);
      }
    });
    audio.addEventListener("volumechange", updateNowPlaying);
    audio.addEventListener("ended", function () { if (!musicRepeat) adjacentTrack(1); });
  }

  window.NEO_FEATURES = {
    init: init,
    mount: mount,
    transport: transport,
    setVolume: setVolume,
    setMuted: setMuted,
    stopMusic: stopMusic,
    toggleNotifications: toggleNotifications,
    openDesktopMenu: openDesktopMenu,
    closeOverlays: closeOverlays,
    recordNotification: recordNotification
  };
})();
