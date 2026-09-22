(function () {
  "use strict";

  var DB_NAME = "neo_os_wallpaper_engine_v1";
  var DB_VERSION = 1;
  var STORE_NAME = "wallpapers";
  var MAX_FILE_SIZE = 512 * 1024 * 1024;

  function storageError(error) {
    return error && (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED")
      ? new Error("This device does not have enough browser storage for that wallpaper.")
      : new Error("Local storage rejected the wallpaper.");
  }

  function ensureStorageCapacity(expected) {
    if (!expected || !navigator.storage || typeof navigator.storage.estimate !== "function") return Promise.resolve();
    return navigator.storage.estimate().then(function (estimate) {
      var available = Number(estimate.quota) - Number(estimate.usage);
      if (Number.isFinite(available) && available < expected * 1.1 + 16 * 1024 * 1024) {
        throw new Error("This device needs more free browser storage for that wallpaper.");
      }
      if (typeof navigator.storage.persist === "function") return navigator.storage.persist().catch(function () {});
    }).catch(function (error) {
      if (/needs more free/.test(String(error && error.message))) throw error;
    });
  }

  function normalizedMime(file) {
    var mime = String(file && file.type || "").toLowerCase();
    if (mime) return mime;
    var name = String(file && file.name || "").toLowerCase();
    if (/\.mp4$/.test(name)) return "video/mp4";
    if (/\.webm$/.test(name)) return "video/webm";
    if (/\.gif$/.test(name)) return "image/gif";
    return "";
  }

  function openDatabase() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) {
        reject(new Error("Wallpaper storage is unavailable in this browser."));
        return;
      }
      var request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = function () {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          var store = request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("createdAt", "createdAt");
        }
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error || new Error("Could not open wallpaper storage.")); };
    });
  }

  function putRecord(record) {
    return openDatabase().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction = db.transaction(STORE_NAME, "readwrite");
        transaction.objectStore(STORE_NAME).put(record);
        transaction.oncomplete = function () { db.close(); resolve(record); };
        transaction.onerror = function () { var error = transaction.error; db.close(); reject(storageError(error)); };
        transaction.onabort = function () { var error = transaction.error; db.close(); reject(storageError(error)); };
      });
    });
  }

  function drawThumbnail(source, sourceWidth, sourceHeight) {
    var canvas = document.createElement("canvas");
    canvas.width = 480;
    canvas.height = 270;
    var context = canvas.getContext("2d", { alpha: false });
    if (!context) return Promise.resolve(null);
    var scale = Math.max(canvas.width / sourceWidth, canvas.height / sourceHeight);
    var width = sourceWidth * scale;
    var height = sourceHeight * scale;
    context.fillStyle = "#090b0e";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
    return new Promise(function (resolve) {
      canvas.toBlob(function (blob) { resolve(blob || null); }, "image/webp", 0.8);
    });
  }

  function fallbackAnimatedGif(file) {
    return file.arrayBuffer().then(function (buffer) {
      var bytes = new Uint8Array(buffer);
      var frames = 0;
      for (var index = 13; index < bytes.length && frames < 2; index += 1) {
        if (bytes[index] === 0x2c) frames += 1;
      }
      return frames > 1;
    });
  }

  function animatedGif(file) {
    if (typeof ImageDecoder === "function") {
      try {
        var decoder = new ImageDecoder({ data: file.stream(), type: "image/gif" });
        return decoder.tracks.ready.then(function () {
          var track = decoder.tracks.selectedTrack;
          var animated = Boolean(track && track.frameCount > 1);
          decoder.close();
          return animated;
        }).catch(function () { return fallbackAnimatedGif(file); });
      } catch (error) {}
    }
    return fallbackAnimatedGif(file);
  }

  function inspectImage(file) {
    return new Promise(function (resolve, reject) {
      var image = new Image();
      var url = URL.createObjectURL(file);
      var complete = false;
      var timer = window.setTimeout(function () { finish(new Error("The GIF took too long to inspect.")); }, 12_000);
      function finish(error, result) {
        if (complete) return;
        complete = true;
        window.clearTimeout(timer);
        URL.revokeObjectURL(url);
        image.removeAttribute("src");
        if (error) reject(error);
        else resolve(result);
      }
      image.onload = function () {
        var width = image.naturalWidth || 0;
        var height = image.naturalHeight || 0;
        Promise.all([drawThumbnail(image, width, height), animatedGif(file)]).then(function (results) {
          finish(null, { width: width, height: height, duration: 0, thumbnail: results[0], animated: results[1] });
        }).catch(finish);
      };
      image.onerror = function () { finish(new Error("The selected GIF could not be decoded.")); };
      image.src = url;
    });
  }

  function inspectVideo(file) {
    return new Promise(function (resolve, reject) {
      var video = document.createElement("video");
      var url = URL.createObjectURL(file);
      var complete = false;
      var metadata = null;
      var timer = window.setTimeout(function () { finish(new Error("The video took too long to inspect.")); }, 15_000);
      function finish(error, thumbnail) {
        if (complete) return;
        complete = true;
        window.clearTimeout(timer);
        video.removeAttribute("src");
        video.load();
        URL.revokeObjectURL(url);
        if (error) reject(error);
        else resolve({ width: metadata.width, height: metadata.height, duration: metadata.duration, thumbnail: thumbnail, animated: true });
      }
      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;
      video.onloadedmetadata = function () {
        metadata = {
          width: video.videoWidth || 0,
          height: video.videoHeight || 0,
          duration: Number.isFinite(video.duration) ? video.duration : 0
        };
        video.currentTime = Math.min(Math.max(metadata.duration * 0.08, 0.05), 1.5);
      };
      video.onseeked = function () {
        drawThumbnail(video, metadata.width || 16, metadata.height || 9).then(function (thumbnail) { finish(null, thumbnail); }).catch(finish);
      };
      video.onerror = function () { finish(new Error("The selected video could not be decoded by this browser.")); };
      video.src = url;
      video.load();
    });
  }

  function importOriginal(item, file) {
    item = item || {};
    var sourceId = String(item.id || "").replace(/^steam-/, "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 80);
    var provider = item.provider === "commons" ? "commons" : "steam";
    var recordId = String(item.installId || (provider + "-" + sourceId)).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 100);
    var mime = normalizedMime(file);
    if (!sourceId || !recordId) return Promise.reject(new Error("This wallpaper is missing a valid online ID."));
    if (!(file instanceof Blob) || !/^(image\/gif|video\/(mp4|webm))$/.test(mime)) {
      return Promise.reject(new Error("Choose the original MP4, WebM, or animated GIF file."));
    }
    if (file.size > MAX_FILE_SIZE) return Promise.reject(new Error("Original wallpaper files must be under 512 MB for browser storage."));
    var type = mime.indexOf("video/") === 0 ? "video" : "animated-image";
    return (type === "video" ? inspectVideo(file) : inspectImage(file)).then(function (metadata) {
      if (metadata.width < 1920 || metadata.height < 1080) {
        throw new Error("This download is below 1080p. Preview images are not accepted as wallpapers.");
      }
      if (!metadata.animated) throw new Error("That GIF is static. Choose an animated original.");
      var record = {
        id: recordId,
        name: String(item.title || file.name || "Online wallpaper").slice(0, 160),
        type: type,
        sourceType: String(item.type || type).slice(0, 32),
        mime: mime,
        size: file.size,
        width: metadata.width,
        height: metadata.height,
        duration: metadata.duration || 0,
        sourceId: sourceId,
        provider: provider,
        source: String(item.source || (provider === "commons" ? "Wikimedia Commons" : "Steam Workshop")).slice(0, 80),
        sourceUrl: String(item.url || "").slice(0, 500),
        author: String(item.author || "").slice(0, 160),
        license: String(item.license || "").slice(0, 100),
        licenseUrl: String(item.licenseUrl || "").slice(0, 500),
        description: String(item.description || "Verified high-resolution animated media saved from Discover.").slice(0, 280),
        createdAt: Date.now(),
        online: true,
        fullMedia: true,
        blob: file,
        thumbnail: metadata.thumbnail
      };
      return putRecord(record).then(function () {
        var engine = window.NEOWallpaperEngine;
        var remember = engine && typeof engine.acceptStoredRecord === "function"
          ? engine.acceptStoredRecord(record)
          : engine && typeof engine.refreshLibrary === "function" ? engine.refreshLibrary() : Promise.resolve();
        return remember.then(function () { return { record: record, added: true }; });
      });
    });
  }

  function remoteSource(item) {
    try {
      var url = new URL(String(item && item.downloadUrl || ""), window.location.href);
      var hostname = url.hostname.toLowerCase();
      var trustedSteamHost = hostname === "steamusercontent.com"
        || hostname.endsWith(".steamusercontent.com")
        || hostname === "steamusercontent-a.akamaihd.net";
      var trustedCommonsHost = hostname === "upload.wikimedia.org";
      if (url.origin !== window.location.origin && (url.protocol !== "https:" || (!trustedSteamHost && !trustedCommonsHost))) return null;
      return url.toString();
    } catch (_error) {
      return null;
    }
  }

  function remoteMime(item, response, url) {
    var mime = String(item && item.downloadMime || "").toLowerCase();
    if (!/^(image\/gif|video\/(mp4|webm))$/.test(mime)) {
      mime = String(response.headers.get("content-type") || "").split(";", 1)[0].trim().toLowerCase();
    }
    if (!/^(image\/gif|video\/(mp4|webm))$/.test(mime)) {
      mime = /\.mp4(?:$|[?#])/.test(url) ? "video/mp4"
        : /\.webm(?:$|[?#])/.test(url) ? "video/webm"
          : /\.gif(?:$|[?#])/.test(url) ? "image/gif" : "";
    }
    return mime;
  }

  function downloadOriginal(item, onProgress) {
    var url = remoteSource(item);
    if (!url) return Promise.reject(new Error("This source has not published a trusted browser-ready media file."));
    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 10 * 60 * 1000) : 0;
    function fetchWithRetry(attempt) {
      return fetch(url, {
      cache: "default",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      signal: controller ? controller.signal : undefined
      }).then(function (response) {
        if ((response.status === 429 || response.status === 503) && attempt < 2) {
          var retryAfter = Number.parseInt(response.headers.get("retry-after"), 10);
          var delay = Number.isFinite(retryAfter) ? Math.min(15_000, retryAfter * 1000) : 1500 * (attempt + 1);
          return new Promise(function (resolve) { setTimeout(resolve, delay); }).then(function () { return fetchWithRetry(attempt + 1); });
        }
        return response;
      });
    }
    return ensureStorageCapacity(Number(item && item.fileSize) || 0).then(function () { return fetchWithRetry(0); }).then(function (response) {
      if (!response.ok) throw new Error("The original wallpaper download failed (" + response.status + ").");
      var expected = Number(response.headers.get("content-length")) || Number(item && item.fileSize) || 0;
      if (expected > MAX_FILE_SIZE) throw new Error("This wallpaper is larger than the 512 MB browser-storage limit.");
      var mime = remoteMime(item, response, url);
      if (!mime) throw new Error("The source is not a supported MP4, WebM, or animated GIF.");
      if (expected > 96 * 1024 * 1024 || !response.body || typeof response.body.getReader !== "function") {
        if (typeof onProgress === "function") onProgress(0, expected);
        return response.blob().then(function (blob) {
          if (blob.size > MAX_FILE_SIZE) throw new Error("This wallpaper is larger than the 512 MB browser-storage limit.");
          return blob.type === mime ? blob : new Blob([blob], { type: mime });
        });
      }
      var reader = response.body.getReader();
      var chunks = [];
      var received = 0;
      function read() {
        return reader.read().then(function (part) {
          if (part.done) return new Blob(chunks, { type: mime });
          received += part.value.byteLength;
          if (received > MAX_FILE_SIZE) {
            if (controller) controller.abort();
            throw new Error("This wallpaper is larger than the 512 MB browser-storage limit.");
          }
          chunks.push(part.value);
          if (typeof onProgress === "function") onProgress(received, expected);
          return read();
        });
      }
      return read();
    }).then(function (blob) {
      if (typeof onProgress === "function") onProgress(blob.size, blob.size, "verify");
      return importOriginal(item, blob);
    }).catch(function (error) {
      if (error && error.name === "AbortError") throw new Error("The wallpaper download took too long or was interrupted.");
      throw error;
    }).finally(function () {
      if (timer) clearTimeout(timer);
    });
  }

  window.NEOWallpaperImport = {
    importOriginal: importOriginal,
    downloadOriginal: downloadOriginal,
    maxFileSize: MAX_FILE_SIZE
  };
})();
