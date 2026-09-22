(function () {
  "use strict";

  var cache = new Map();
  var activeRequests = new WeakMap();
  var importerPromise;
  var stylePromise;
  var activeMotionPreview = null;
  var MAX_ORIGINAL_SIZE = 512 * 1024 * 1024;
  var videoProbe = document.createElement("video");
  var SEARCH_TOPICS = {
    abstract: ["abstract", "fractal", "particles", "generative"],
    calm: ["calm", "relaxing", "clouds", "sunset"],
    cars: ["car", "cars", "automotive", "racing"],
    city: ["city", "skyline", "urban"],
    nature: ["nature", "landscape", "forest", "mountain"],
    ocean: ["ocean", "sea", "underwater", "waves"],
    rain: ["rain", "rainfall", "storm"],
    space: ["space", "nebula", "planet", "astronomy"]
  };
  var SEARCH_WORDS = Object.keys(SEARCH_TOPICS).concat([
    "aerial", "animation", "clouds", "forest", "landscape", "mountain", "night", "snow", "sunset", "waterfall"
  ]);

  function loadStyles() {
    if (document.querySelector("link[data-neo-wallpaper-discover-styles]")) return Promise.resolve();
    if (stylePromise) return stylePromise;
    stylePromise = new Promise(function (resolve, reject) {
      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "./neo-wallpaper-discover.css?v=20260907-theme-sync-v2";
      link.dataset.neoWallpaperDiscoverStyles = "true";
      link.onload = resolve;
      link.onerror = function () { reject(new Error("Discover styles could not be loaded.")); };
      document.head.appendChild(link);
    }).catch(function (error) {
      stylePromise = null;
      throw error;
    });
    return stylePromise;
  }

  function loadImporter() {
    if (window.NEOWallpaperImport) return Promise.resolve(window.NEOWallpaperImport);
    if (importerPromise) return importerPromise;
    importerPromise = new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = "./neo-wallpaper-import.js?v=20260824-discover-download-v4";
      script.async = true;
      script.onload = function () {
        if (window.NEOWallpaperImport) resolve(window.NEOWallpaperImport);
        else reject(new Error("The wallpaper downloader did not start."));
      };
      script.onerror = function () { reject(new Error("The wallpaper downloader could not be loaded.")); };
      document.head.appendChild(script);
    }).catch(function (error) {
      importerPromise = null;
      throw error;
    });
    return importerPromise;
  }

  function normalizedText(value) {
    var text = String(value || "").toLowerCase();
    try { text = text.normalize("NFKD").replace(/[\u0300-\u036f]/g, ""); } catch (_error) {}
    return text.replace(/[^a-z0-9]+/g, " ").trim();
  }

  function editDistanceAtMostOne(left, right) {
    if (left === right) return true;
    if (Math.abs(left.length - right.length) > 1) return false;
    if (left.length === right.length) {
      var mismatch = [];
      for (var index = 0; index < left.length; index += 1) {
        if (left[index] !== right[index]) mismatch.push(index);
        if (mismatch.length > 2) return false;
      }
      return mismatch.length <= 1 || (mismatch.length === 2
        && mismatch[1] === mismatch[0] + 1
        && left[mismatch[0]] === right[mismatch[1]]
        && left[mismatch[1]] === right[mismatch[0]]);
    }
    var longer = left.length >= right.length ? left : right;
    var shorter = left.length >= right.length ? right : left;
    var longIndex = 0;
    var shortIndex = 0;
    var edits = 0;
    while (longIndex < longer.length && shortIndex < shorter.length) {
      if (longer[longIndex] === shorter[shortIndex]) {
        longIndex += 1;
        shortIndex += 1;
        continue;
      }
      edits += 1;
      if (edits > 1) return false;
      longIndex += 1;
    }
    return true;
  }

  function correctedSearchWord(word) {
    if (word.length < 4 || SEARCH_WORDS.indexOf(word) !== -1) return word;
    return SEARCH_WORDS.find(function (candidate) {
      return editDistanceAtMostOne(word, candidate);
    }) || word;
  }

  function matchesWord(haystack, words, needle) {
    if (haystack.indexOf(needle) !== -1) return true;
    return needle.length > 3 && words.some(function (word) {
      return word.length > 3 && editDistanceAtMostOne(needle, word);
    });
  }

  function matchesSearch(value, query) {
    var haystack = normalizedText(value);
    var needles = normalizedText(query).split(" ").filter(Boolean).map(correctedSearchWord);
    if (!needles.length) return true;
    var words = haystack.split(" ");
    var topic = SEARCH_TOPICS[needles.join(" ")];
    if (topic) {
      return topic.some(function (needle) {
        return matchesWord(haystack, words, needle);
      });
    }
    return needles.every(function (needle) {
      return matchesWord(haystack, words, needle);
    });
  }

  function compactNumber(value) {
    var number = Number(value) || 0;
    if (number >= 1_000_000) return (number / 1_000_000).toFixed(number >= 10_000_000 ? 0 : 1).replace(/\.0$/, "") + "M";
    if (number >= 1_000) return (number / 1_000).toFixed(number >= 10_000 ? 0 : 1).replace(/\.0$/, "") + "K";
    return String(number);
  }

  function normalizeOptions(options) {
    options = options || {};
    return {
      source: options.source === "workshop" ? "workshop" : "discover",
      query: String(options.query || "").trim().replace(/\s+/g, " ").slice(0, 120),
      sort: String(options.sort || "featured"),
      type: String(options.type || ""),
      catalog: options.catalog === "browser-ready" ? "browser-ready" : "",
      page: Math.min(1000, Math.max(1, Number.parseInt(options.page, 10) || 1)),
      force: Boolean(options.force),
      requestId: String(options.requestId || "")
    };
  }

  function cacheKey(options) {
    return [options.source, normalizedText(options.query), options.sort, options.type, options.catalog, options.page].join("|");
  }

  function remember(key, payload) {
    if (cache.has(key)) cache.delete(key);
    cache.set(key, payload);
    while (cache.size > 32) cache.delete(cache.keys().next().value);
  }

  function supportedSource(item) {
    var sources = Array.isArray(item && item.downloadSources) ? item.downloadSources.slice() : [];
    if (item && item.downloadUrl) sources.unshift({
      url: item.downloadUrl,
      mime: item.downloadMime,
      width: item.width,
      height: item.height,
      bandwidth: 0
    });
    var seen = new Set();
    sources = sources.filter(function (source) {
      var key = String(source && source.url || "");
      if (!key || seen.has(key) || !/^video\/(?:mp4|webm)$|^image\/gif$/.test(String(source.mime || ""))) return false;
      seen.add(key);
      return true;
    });
    return sources.find(function (source) {
      return source.mime === "image/gif" || videoProbe.canPlayType(source.mime) !== "";
    }) || sources[0] || null;
  }

  function playableItem(item) {
    var source = supportedSource(item);
    if (!source) return item;
    return Object.assign({}, item, {
      downloadUrl: source.url,
      downloadMime: source.mime,
      width: Number(source.width) || Number(item.width) || 0,
      height: Number(source.height) || Number(item.height) || 0,
      browserPlayable: true
    });
  }

  function canInstall(item) {
    var size = Number(item && item.fileSize) || 0;
    return Boolean(item && item.browserPlayable && item.downloadUrl && (!size || size <= MAX_ORIGINAL_SIZE));
  }

  function canUse(item) {
    return canInstall(item);
  }

  function motionPreviewSource(item) {
    var url = String(item && item.previewVideoUrl || "");
    var mime = String(item && item.previewVideoMime || "").toLowerCase();
    if (url && /^video\/(?:mp4|webm)$/.test(mime) && videoProbe.canPlayType(mime) !== "") {
      return { url: url, mime: mime };
    }
    return null;
  }

  function stopMotionPreview(video) {
    if (!video) return;
    video.pause();
    video.classList.remove("is-animated");
    if (video.parentElement) video.parentElement.classList.remove("is-motion-active");
    video.removeAttribute("src");
    video.load();
    if (activeMotionPreview === video) activeMotionPreview = null;
  }

  function bindMotionPreview(card, preview, item) {
    var source = motionPreviewSource(item);
    var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!source || reducedMotion) return;
    var video = document.createElement("video");
    video.className = "wallpaper-card-motion-preview";
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "none";
    video.setAttribute("aria-hidden", "true");
    video.setAttribute("disablepictureinpicture", "");
    preview.appendChild(video);

    function start() {
      if (activeMotionPreview && activeMotionPreview !== video) stopMotionPreview(activeMotionPreview);
      activeMotionPreview = video;
      if (!video.getAttribute("src")) video.src = source.url;
      video.play().then(function () {
        if (activeMotionPreview !== video) return;
        video.classList.add("is-animated");
        preview.classList.add("is-motion-active");
      }).catch(function () {
        stopMotionPreview(video);
      });
    }

    function stopWhenInactive() {
      setTimeout(function () {
        if (card.matches(":hover") || card.contains(document.activeElement)) return;
        stopMotionPreview(video);
      }, 0);
    }

    video.addEventListener("error", function () { stopMotionPreview(video); });
    card.addEventListener("pointerenter", start);
    card.addEventListener("pointerleave", stopWhenInactive);
    card.addEventListener("focusin", start);
    card.addEventListener("focusout", stopWhenInactive);
  }

  function recordFor(id) {
    var engine = window.NEOWallpaperEngine;
    return engine && typeof engine.getRecord === "function" ? engine.getRecord(id) : null;
  }

  function activeWallpaperId() {
    var engine = window.NEOWallpaperEngine;
    var state = engine && typeof engine.getState === "function" ? engine.getState() : null;
    return String(state && state.id || "");
  }

  function setInstallState(button, card, item) {
    var id = card.dataset.wallpaperCard;
    var title = card.dataset.wallpaperName || "wallpaper";
    var record = recordFor(id);
    var active = Boolean(record && activeWallpaperId() === id);
    var installable = canInstall(item);
    var detailsAvailable = Boolean(card.dataset.wallpaperUrl);
    if (button.dataset.wallpaperInstallState === "downloading") return;
    button.disabled = active || (!record && !installable && !detailsAvailable);
    button.dataset.wallpaperInstallState = active ? "active" : record ? "installed" : installable ? "ready" : detailsAvailable ? "details" : "unavailable";
    button.textContent = active ? "Active" : record ? "Use" : installable ? "Download" : detailsAvailable ? "Get in Wallpaper Engine" : "Project unavailable";
    button.setAttribute("aria-label", active
      ? "Active wallpaper: " + title
      : record ? "Use " + title
        : installable ? "Download " + title
          : detailsAvailable ? "Get " + title + " in Wallpaper Engine"
            : "Project unavailable for " + title);
    button.title = active
      ? "This wallpaper is active."
      : record ? "Apply this installed wallpaper."
        : installable ? "Download the complete verified animation and apply it."
          : detailsAvailable ? "Open the original project page to get it in Wallpaper Engine."
            : "No project page is available for this item.";
  }

  function selectCard(card) {
    var select = card.querySelector("[data-wallpaper-option]");
    if (select) select.click();
  }

  function cardFor(studio, rawItem, source, onOpen, index) {
    var item = playableItem(rawItem);
    var fallbackPrefix = item.provider === "commons" ? "commons-" : "steam-";
    var id = String(item.installId || (fallbackPrefix + item.id)).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 100);
    if (!id || !item.title || !item.preview) return null;
    var type = String(item.type || "video").toLowerCase();
    var tags = Array.isArray(item.tags) ? item.tags : [];
    var sourceName = String(item.source || (item.provider === "commons" ? "Wikimedia Commons" : "Steam Workshop"));
    var quality = String(item.qualityLabel || (canInstall(item) ? "1080P+" : "WORKSHOP"));
    var card = document.createElement("article");
    card.className = "wallpaper-card wallpaper-online-card";
    card.dataset.wallpaperCard = id;
    card.dataset.wallpaperOnline = "true";
    card.dataset.wallpaperOnlineSource = source;
    card.dataset.wallpaperName = item.title;
    card.dataset.wallpaperType = type;
    card.dataset.wallpaperSourceType = type;
    card.dataset.wallpaperAuthor = item.author || sourceName;
    card.dataset.wallpaperCopy = item.description || (tags.length ? tags.slice(0, 4).join(" - ") : "Online animated wallpaper");
    card.dataset.wallpaperSearch = (item.searchableText || [item.title, item.description, item.author, sourceName].concat(tags).join(" ")) + (item.matchedQuery ? " " + item.matchedQuery : "");
    card.dataset.wallpaperMatchKind = item.matchKind || "exact";
    card.dataset.wallpaperPreview = item.preview;
    card.dataset.wallpaperUrl = item.url || "";
    card.dataset.wallpaperProvider = item.provider === "commons" ? "commons" : "steam";
    card.dataset.wallpaperInstallable = canInstall(item) ? "true" : "false";
    card.dataset.wallpaperOriginalAvailable = canInstall(item) ? "true" : "false";
    card.dataset.wallpaperPreviewAvailable = "false";
    card.dataset.wallpaperPlayable = recordFor(id) ? "true" : "false";
    card.dataset.wallpaperTags = tags.map(normalizedText).filter(Boolean).join("|");
    card.dataset.wallpaperQuality = /(?:4k|2160p)/i.test(quality) ? "4k" : /1080p/i.test(quality) ? "1080p" : "preview";
    card.dataset.wallpaperSubscriptions = String(Number(item.subscriptions) || 0);
    card.dataset.wallpaperUpdatedAt = String(Number(item.updatedAt) || 0);

    var select = document.createElement("button");
    select.className = "wallpaper-card-select";
    select.type = "button";
    select.dataset.wallpaperOption = id;
    select.setAttribute("aria-pressed", "false");
    select.setAttribute("aria-label", "Select " + item.title);
    var preview = document.createElement("span");
    preview.className = "wallpaper-card-preview local-wallpaper-preview is-loading";
    preview.dataset.mediaBadge = quality;
    var previewImage = document.createElement("img");
    previewImage.alt = "";
    previewImage.loading = index < 8 ? "eager" : "lazy";
    previewImage.decoding = "async";
    previewImage.draggable = false;
    previewImage.referrerPolicy = "no-referrer";
    previewImage.src = item.preview;
    previewImage.addEventListener("load", function () { preview.classList.remove("is-loading"); }, { once: true });
    previewImage.addEventListener("error", function () {
      preview.classList.remove("is-loading");
      preview.classList.add("is-missing");
      previewImage.remove();
    }, { once: true });
    preview.appendChild(previewImage);
    bindMotionPreview(card, preview, item);
    var copy = document.createElement("span");
    copy.className = "wallpaper-card-copy";
    var title = document.createElement("strong");
    title.textContent = item.title;
    var detail = document.createElement("small");
    var detailParts = [quality, type.charAt(0).toUpperCase() + type.slice(1)];
    if (item.matchKind === "related") detailParts.push("Related");
    if (item.matchKind === "fallback") detailParts.push("Popular alternative");
    if (item.subscriptions) detailParts.push(compactNumber(item.subscriptions) + " saves");
    else if (item.views) detailParts.push(compactNumber(item.views) + " views");
    detail.textContent = detailParts.join(" - ");
    copy.append(title, detail);
    select.append(preview, copy);

    var install = document.createElement("button");
    install.className = "wallpaper-online-install";
    install.type = "button";
    install.dataset.wallpaperInstall = id;
    install.setAttribute("aria-live", "polite");
    setInstallState(install, card, item);
    install.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      selectCard(card);
      var record = recordFor(id);
      if (record) {
        var apply = studio.querySelector("[data-wallpaper-apply]");
        if (apply && !apply.disabled) apply.click();
        return;
      }
      if (!canInstall(item)) {
        if (card.dataset.wallpaperUrl) onOpen(item);
        return;
      }
      if (install.dataset.wallpaperInstallState === "downloading") return;
      install.disabled = true;
      install.dataset.wallpaperInstallState = "downloading";
      install.textContent = "Downloading";
      install.setAttribute("aria-label", "Downloading " + item.title);
      card.setAttribute("aria-busy", "true");
      studio.dispatchEvent(new Event("neo-wallpaper-install-state"));
      var selectionRevision = studio.dataset.wallpaperSelectionRevision || "0";
      var explicitlyRequestedApply = install.dataset.applyAfterInstall === "true";
      var selectedWhenStarted = studio.dataset.selectedWallpaper === id;
      loadImporter().then(function (importer) {
        return importer.downloadOriginal(item, function (received, expected, phase) {
          if (phase === "verify") install.textContent = "Verifying";
          else if (expected > 0) install.textContent = received >= expected ? "Saving" : Math.min(99, Math.floor(received / expected * 100)) + "%";
        });
      }).then(function (result) {
        card.dataset.wallpaperPlayable = "true";
        install.dataset.wallpaperInstallState = "installed";
        result.applyAfterInstall = explicitlyRequestedApply || (selectedWhenStarted
          && studio.dataset.selectedWallpaper === id
          && (studio.dataset.wallpaperSelectionRevision || "0") === selectionRevision);
        if (result.applyAfterInstall && result.record) studio.dataset.selectedWallpaper = result.record.id;
        delete install.dataset.applyAfterInstall;
        studio.dispatchEvent(new CustomEvent("neo-wallpaper-library-change", { detail: result }));
      }).catch(function (error) {
        install.dataset.wallpaperInstallState = "ready";
        install.disabled = false;
        install.textContent = "Try again";
        studio.dispatchEvent(new CustomEvent("neo-wallpaper-library-error", {
          detail: { title: item.title, message: error && error.message ? error.message : "The wallpaper could not be downloaded." }
        }));
      }).finally(function () {
        delete install.dataset.applyAfterInstall;
        card.removeAttribute("aria-busy");
        setInstallState(install, card, item);
      });
    });

    var link = document.createElement("button");
    link.className = "wallpaper-online-link";
    link.type = "button";
    link.textContent = "Details";
    link.setAttribute("aria-label", "View source details for " + item.title);
    link.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      onOpen(item);
    });
    card.append(select, install);
    if (canInstall(item)) card.append(link);
    return card;
  }

  function clearOnlineCards(studio) {
    if (activeMotionPreview && studio.contains(activeMotionPreview)) stopMotionPreview(activeMotionPreview);
    studio.querySelectorAll('[data-wallpaper-online="true"], [data-wallpaper-skeleton]').forEach(function (card) { card.remove(); });
    studio.querySelectorAll("[data-wallpaper-shelf]").forEach(function (shelf) { shelf.remove(); });
    var grid = studio.querySelector("[data-wallpaper-grid]");
    if (grid) grid.classList.remove("is-shelved");
  }

  function updateTagFilters(studio, items) {
    var container = studio.querySelector("[data-we-filter-tags]");
    if (!container) return;
    var selected = new Set(Array.from(container.querySelectorAll("[data-we-tag-filter]:checked")).map(function (input) {
      return input.value;
    }));
    var counts = new Map();
    var labels = new Map();
    items.forEach(function (item) {
      (Array.isArray(item.tags) ? item.tags : []).forEach(function (tag) {
        var key = normalizedText(tag);
        if (!key || ["scene", "video", "web", "application", "preview", "image"].indexOf(key) !== -1) return;
        counts.set(key, (counts.get(key) || 0) + 1);
        if (!labels.has(key)) labels.set(key, String(tag).trim().slice(0, 36));
      });
    });
    var keys = Array.from(counts.keys()).sort(function (left, right) {
      return (counts.get(right) - counts.get(left)) || labels.get(left).localeCompare(labels.get(right));
    }).slice(0, 20);
    selected.forEach(function (key) {
      if (labels.has(key) && keys.indexOf(key) === -1) keys.push(key);
    });
    container.replaceChildren();
    if (!keys.length) {
      var empty = document.createElement("span");
      empty.className = "we-filter-placeholder";
      empty.textContent = "No tags on this page.";
      container.appendChild(empty);
      return;
    }
    keys.forEach(function (key) {
      var label = document.createElement("label");
      var input = document.createElement("input");
      var copy = document.createElement("span");
      var count = document.createElement("small");
      input.type = "checkbox";
      input.value = key;
      input.dataset.weTagFilter = "true";
      input.checked = selected.has(key);
      copy.textContent = labels.get(key);
      count.textContent = String(counts.get(key) || 0);
      label.append(input, copy, count);
      container.appendChild(label);
    });
  }

  function shelfNode(title, entries) {
    var shelf = document.createElement("section");
    shelf.className = "we-discover-shelf";
    shelf.dataset.wallpaperShelf = "true";
    var heading = document.createElement("header");
    var label = document.createElement("h3");
    var count = document.createElement("span");
    var track = document.createElement("div");
    label.textContent = title;
    count.textContent = entries.length + (entries.length === 1 ? " wallpaper" : " wallpapers");
    track.className = "we-shelf-track";
    entries.forEach(function (entry) { track.appendChild(entry.card); });
    heading.append(label, count);
    shelf.append(heading, track);
    return shelf;
  }

  function renderShelves(grid, entries) {
    var featured = entries.slice(0, 9);
    var used = new Set(featured);
    var recent = entries.slice().sort(function (left, right) {
      return Number(right.item.updatedAt || 0) - Number(left.item.updatedAt || 0);
    }).filter(function (entry) { return !used.has(entry); }).slice(0, 9);
    recent.forEach(function (entry) { used.add(entry); });
    var highResolution = entries.filter(function (entry) {
      return entry.card.dataset.wallpaperQuality === "4k" && !used.has(entry);
    }).slice(0, 9);
    highResolution.forEach(function (entry) { used.add(entry); });
    var remaining = entries.filter(function (entry) { return !used.has(entry); });
    var shelves = [
      ["Featured now", featured],
      ["Recently updated", recent]
    ];
    if (highResolution.length) shelves.push(["4K picks", highResolution]);
    if (remaining.length) shelves.push(["More to explore", remaining]);
    grid.classList.add("is-shelved");
    shelves.forEach(function (shelf) {
      if (shelf[1].length) grid.appendChild(shelfNode(shelf[0], shelf[1]));
    });
  }

  function showLoading(studio) {
    var grid = studio.querySelector("[data-wallpaper-grid]");
    if (!grid) return;
    clearOnlineCards(studio);
    grid.classList.remove("is-shelved");
    var fragment = document.createDocumentFragment();
    for (var index = 0; index < 10; index += 1) {
      var skeleton = document.createElement("div");
      skeleton.className = "wallpaper-card wallpaper-card-skeleton";
      skeleton.dataset.wallpaperSkeleton = "true";
      skeleton.setAttribute("aria-hidden", "true");
      skeleton.innerHTML = '<span class="wallpaper-card-preview"></span><span class="wallpaper-card-copy"><i></i><i></i></span>';
      fragment.appendChild(skeleton);
    }
    grid.appendChild(fragment);
  }

  function render(studio, source, items, onOpen, options) {
    var grid = studio.querySelector("[data-wallpaper-grid]");
    if (!grid) return 0;
    clearOnlineCards(studio);
    updateTagFilters(studio, items);
    var fragment = document.createDocumentFragment();
    var entries = [];
    var rendered = 0;
    items.forEach(function (item, index) {
      var card = cardFor(studio, item, source, onOpen, index);
      if (!card) return;
      entries.push({ item: item, card: card });
      rendered += 1;
    });
    if (source === "discover" && options && !options.query && entries.length >= 12) {
      renderShelves(grid, entries);
    } else {
      entries.forEach(function (entry) { fragment.appendChild(entry.card); });
      grid.appendChild(fragment);
    }
    return rendered;
  }

  function fetchCatalog(studio, options) {
    var params = new URLSearchParams();
    params.set("source", options.source);
    params.set("sort", options.sort);
    params.set("page", String(options.page));
    params.set("catalogVersion", "5");
    if (options.query) params.set("q", options.query);
    if (options.type) params.set("type", options.type);
    if (options.catalog) params.set("catalog", options.catalog);
    var previous = activeRequests.get(studio);
    if (previous) previous.abort();
    var controller = typeof AbortController === "function" ? new AbortController() : null;
    if (controller) activeRequests.set(studio, controller);
    var timer = controller ? setTimeout(function () { controller.abort(); }, 15_000) : 0;
    return fetch("/.netlify/functions/wallpaper-discover?" + params.toString(), {
      cache: options.force || options.query ? "no-store" : "default",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      signal: controller ? controller.signal : undefined
    }).then(function (response) {
      if (!response.ok) throw new Error(response.status === 504 ? "Discover took too long to respond." : "Discover could not connect.");
      return response.json();
    }).then(function (payload) {
      if (!payload || !Array.isArray(payload.items)) throw new Error("Discover returned an invalid response.");
      payload.items = payload.items.map(playableItem);
      payload.playableCount = payload.items.filter(canInstall).length;
      return payload;
    }).finally(function () {
      if (timer) clearTimeout(timer);
      if (controller && activeRequests.get(studio) === controller) activeRequests.delete(studio);
    });
  }

  function load(studio, rawOptions, onOpen) {
    var options = normalizeOptions(rawOptions);
    var key = cacheKey(options);
    var previous = activeRequests.get(studio);
    if (previous) previous.abort();
    var stale = cache.get(key);
    if (stale && !options.force) {
      if (!options.requestId || studio.dataset.onlineRequestId === options.requestId) {
        stale.count = render(studio, options.source, stale.items, onOpen, options);
      }
      return loadStyles().then(function () { return stale; });
    }
    showLoading(studio);
    return Promise.all([loadStyles(), fetchCatalog(studio, options)]).then(function (results) {
      var payload = results[1];
      remember(key, payload);
      if (!options.requestId || studio.dataset.onlineRequestId === options.requestId) {
        payload.count = render(studio, options.source, payload.items, onOpen, options);
      }
      return payload;
    }).catch(function (error) {
      if (options.requestId && studio.dataset.onlineRequestId !== options.requestId) throw error;
      clearOnlineCards(studio);
      if (stale && (!options.requestId || studio.dataset.onlineRequestId === options.requestId)) {
        stale.count = render(studio, options.source, stale.items, onOpen, options);
        stale.stale = true;
        return stale;
      }
      throw error;
    });
  }

  function sync(studio) {
    studio.querySelectorAll('[data-wallpaper-online="true"]').forEach(function (card) {
      var button = card.querySelector("[data-wallpaper-install]");
      if (!button) return;
      setInstallState(button, card, {
        browserPlayable: card.dataset.wallpaperOriginalAvailable === "true",
        downloadUrl: card.dataset.wallpaperOriginalAvailable === "true" ? "available" : ""
      });
    });
  }

  window.NEO_WALLPAPER_ONLINE = {
    load: load,
    matchesSearch: matchesSearch,
    showLoading: showLoading,
    sync: sync,
    __test: {
      cacheKey: cacheKey,
      matchesSearch: matchesSearch,
      normalizeOptions: normalizeOptions,
      supportedSource: supportedSource,
      motionPreviewSource: motionPreviewSource,
      canInstall: canInstall,
      canUse: canUse
    }
  };
})();
