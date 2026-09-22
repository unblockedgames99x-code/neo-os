(function () {
  "use strict";

  function proxiedAppRoute(target) {
    var browserRoute = window.NEO_LOCAL_CONFIG && window.NEO_LOCAL_CONFIG.appProxy
      ? window.NEO_LOCAL_CONFIG.appProxy
      : "./NEO-BROWSER/index.html?v=20260921-cleanhost-v2";
    var separator = browserRoute.indexOf("?") === -1 ? "?" : "&";
    return browserRoute + separator +
      "neo-app-mode=1&neo-custom-app=1&neo-app-target=" + encodeURIComponent(target);
  }

  window.NEO_EXTRA_APPS = Object.assign({}, window.NEO_EXTRA_APPS || {}, {
    stream: {
      id: "stream",
      title: "NEO Music",
      subtitle: "Search, stream, queue, and organize your music",
      icon: "stream",
      template: "browser-template",
      browserTarget: window.NEO_LOCAL_CONFIG ? window.NEO_LOCAL_CONFIG.music : "./music-v2/index.html",
      browserDirect: true,
      browserChrome: false,
      browserTheme: "stream-music",
      keepAlive: false,
      width: 1180,
      height: 760,
      launcher: true,
      pinned: true,
      category: "Media",
      aliases: ["neo music", "music", "stream", "songs", "albums", "artists", "radio", "playlists", "audio player"]
    },
    games: {
      id: "games",
      title: "Steam",
      subtitle: "Browse and play your complete Steam library",
      icon: "steam",
      route: "./neo-games/index.html?build=20260921-fern-only-v1",
      keepAlive: false,
      width: 1180,
      height: 760,
      launcher: true,
      pinned: false,
      core: true,
      category: "Games",
      aliases: ["steam", "games", "library", "arcade", "sports", "racing", "puzzle", "multiplayer"]
    },
    movies: {
      id: "movies",
      title: "Movies",
      subtitle: "Movies and series through NEO's private web connection",
      icon: "movies",
      route: proxiedAppRoute("https://cinecat.eu/"),
      proxyApp: true,
      keepAlive: false,
      width: 1180,
      height: 760,
      launcher: true,
      pinned: false,
      core: true,
      category: "Media",
      aliases: ["movies", "films", "cinema", "tv", "shows", "streaming"]
    },
    "youtube-app": {
      id: "youtube-app",
      title: "YouTube",
      subtitle: "Account-free videos, search, Shorts, and pop-out playback",
      icon: "youtube",
      route: "./neo-youtube/index.html?build=20260912-shorts-feed-v1",
      keepAlive: false,
      width: 1180,
      height: 760,
      launcher: true,
      pinned: false,
      core: true,
      category: "Media",
      aliases: ["youtube", "videos", "video", "channels", "shorts", "youtube shorts"]
    },
    "neo-ai": {
      id: "neo-ai",
      title: "NEO AI",
      subtitle: "Chat, images, web search, and study tools",
      icon: "chatgpt",
      route: "./neo-ai/index.html?v=20260920-ai-restored-v1",
      keepAlive: true,
      width: 1120,
      height: 760,
      launcher: true,
      pinned: false,
      category: "Productivity",
      aliases: ["neo ai", "ai", "assistant", "chatgpt", "chat gpt", "study", "web search", "image ai"]
    },
    notes: {
      id: "notes",
      title: "Notes",
      subtitle: "Quick local notes",
      icon: "file",
      lazy: true,
      width: 760,
      height: 600,
      launcher: true,
      pinned: false,
      core: true,
      category: "Productivity",
      aliases: ["notes", "notepad", "text", "write"]
    },
    "app-installer": {
      id: "app-installer",
      title: "App Installer",
      subtitle: "Install a site with its name and icon",
      icon: "apps",
      lazy: true,
      width: 880,
      height: 680,
      launcher: true,
      pinned: false,
      core: true,
      category: "System",
      aliases: ["app installer", "install app", "add app", "web app", "url app", "pwa"]
    },
    calculator: {
      id: "calculator",
      title: "Calculator",
      subtitle: "Fast local calculations",
      icon: "calculator",
      lazy: true,
      width: 390,
      height: 570,
      launcher: true,
      pinned: false,
      core: true,
      category: "Utilities",
      aliases: ["calculator", "math", "numbers"]
    },
    paint: {
      id: "paint",
      title: "Paint",
      subtitle: "Sketch and export locally",
      icon: "brush",
      lazy: true,
      width: 980,
      height: 700,
      launcher: true,
      pinned: false,
      core: true,
      category: "Creativity",
      aliases: ["paint", "draw", "canvas", "sketch"]
    }
  });

  window.NEORenderActiveApp = function (app, artwork, iconClass) {
    var icon = document.querySelector("[data-active-app-icon]");
    var title = document.getElementById("widget-active-title");
    var action = icon && icon.closest(".widget-action");
    title.textContent = app.hideName ? "" : app.title;
    title.hidden = app.hideName === true;
    document.getElementById("widget-active-copy").textContent = app.subtitle || "Active now";
    if (action) action.setAttribute("aria-label", "Open " + (app.accessibleName || app.title || "application"));
    icon.parentElement.dataset.app = app.id;
    icon.className = "widget-app-icon app-icon-shape " + iconClass;
    icon.innerHTML = artwork;
  };

  try {
    var removeYukiAppsKey = "neo_os_remove_yukios_apps_v1";
    if (localStorage.getItem(removeYukiAppsKey) !== "1") {
      var yukiAppIds = [
        "itch-io", "crazy-games", "newgrounds", "geforce-now", "flashpoint", "roblox", "js-dos", "ruffle", "lavat",
        "slack", "gmail", "outlook", "zoom", "x-twitter", "instagram", "pinterest", "proton-mail", "yahoo-mail", "maps", "torrent-web",
        "chatgpt-web", "deepseek", "grok", "notion", "google-docs", "office-web", "figma", "canva", "pixlr", "github", "gitlab", "codepen",
        "twitch", "soundcloud", "deezer", "tiktok", "aniwatch", "aquarium-web", "markdown", "file-converter", "clock-tools", "camera",
        "color-picker", "emoji-selector", "screenshot-studio", "clipboard-manager", "magnifier", "system-monitor", "storage-editor", "developer-tools",
        "virtual-machine-manager", "app-creator", "rhythms", "cmatrix", "mode-switcher", "shortcuts", "default-apps", "session-manager",
        "neo-guide", "intro-tour", "whats-new"
      ];
      ["neo_os_pinned_apps_v1", "neo_os_installed_apps_v1"].forEach(function (key) {
        var savedApps = JSON.parse(localStorage.getItem(key) || "null");
        if (Array.isArray(savedApps)) {
          localStorage.setItem(key, JSON.stringify(savedApps.filter(function (id) { return yukiAppIds.indexOf(id) === -1; })));
        }
      });
      if (typeof localStorage.removeItem === "function") localStorage.removeItem("neo_extended_settings_v1");
      if (typeof sessionStorage !== "undefined") sessionStorage.removeItem("neo_autostart_completed_v1");
      localStorage.setItem(removeYukiAppsKey, "1");
    }

    var searchMigrationKey = "neo_os_unpin_search_v1";
    if (localStorage.getItem(searchMigrationKey) !== "1") {
      var existingPins = JSON.parse(localStorage.getItem("neo_os_pinned_apps_v1") || "null");
      if (Array.isArray(existingPins) && existingPins.indexOf("search") !== -1) {
        localStorage.setItem("neo_os_pinned_apps_v1", JSON.stringify(existingPins.filter(function (id) { return id !== "search"; })));
      }
      localStorage.setItem(searchMigrationKey, "1");
    }

    var streamMigrationKey = "neo_os_stream_music_v1";
    if (localStorage.getItem(streamMigrationKey) !== "1") {
      ["neo_os_pinned_apps_v1", "neo_os_installed_apps_v1"].forEach(function (key) {
        var ids = JSON.parse(localStorage.getItem(key) || "null");
        if (!Array.isArray(ids)) return;
        var hadLegacyApp = ids.indexOf("monochrome") !== -1;
        ids = ids.filter(function (id) { return id !== "monochrome"; });
        if (hadLegacyApp && ids.indexOf("stream") === -1) ids.push("stream");
        localStorage.setItem(key, JSON.stringify(ids));
      });
      localStorage.setItem(streamMigrationKey, "1");
    }

    var retiredMusicMigrationKey = "neo_os_remove_youtube_music_v1";
    if (localStorage.getItem(retiredMusicMigrationKey) !== "1") {
      ["neo_os_pinned_apps_v1", "neo_os_installed_apps_v1"].forEach(function (key) {
        var ids = JSON.parse(localStorage.getItem(key) || "null");
        if (Array.isArray(ids) && ids.indexOf("youtube-music") !== -1) {
          localStorage.setItem(key, JSON.stringify(ids.filter(function (id) { return id !== "youtube-music"; })));
        }
      });
      localStorage.setItem(retiredMusicMigrationKey, "1");
    }

    var retiredVideoMigrationKey = "neo_os_remove_youtube_app_v1";
    if (localStorage.getItem(retiredVideoMigrationKey) !== "1") {
      ["neo_os_pinned_apps_v1", "neo_os_installed_apps_v1"].forEach(function (key) {
        var ids = JSON.parse(localStorage.getItem(key) || "null");
        if (Array.isArray(ids) && ids.indexOf("youtube") !== -1) {
          localStorage.setItem(key, JSON.stringify(ids.filter(function (id) { return id !== "youtube"; })));
        }
      });
      localStorage.setItem(retiredVideoMigrationKey, "1");
    }

    var restoredYouTubeMigrationKey = "neo_os_restore_youtube_app_v4";
    if (localStorage.getItem(restoredYouTubeMigrationKey) !== "1") {
      var installedYouTubeApps = JSON.parse(localStorage.getItem("neo_os_installed_apps_v1") || "null");
      if (Array.isArray(installedYouTubeApps) && installedYouTubeApps.indexOf("youtube-app") === -1) {
        installedYouTubeApps.push("youtube-app");
        localStorage.setItem("neo_os_installed_apps_v1", JSON.stringify(installedYouTubeApps));
      }
      localStorage.setItem(restoredYouTubeMigrationKey, "1");
    }

    var restoredNeoAiMigrationKey = "neo_os_restore_neo_ai_v2";
    if (localStorage.getItem(restoredNeoAiMigrationKey) !== "1") {
      var installedAiApps = JSON.parse(localStorage.getItem("neo_os_installed_apps_v1") || "null");
      if (Array.isArray(installedAiApps) && installedAiApps.indexOf("neo-ai") === -1) {
        installedAiApps.push("neo-ai");
        localStorage.setItem("neo_os_installed_apps_v1", JSON.stringify(installedAiApps));
      }
      localStorage.setItem(restoredNeoAiMigrationKey, "1");
    }

    var mergedMp3MigrationKey = "neo_os_merge_mp3_into_music_v1";
    if (localStorage.getItem(mergedMp3MigrationKey) !== "1") {
      ["neo_os_pinned_apps_v1", "neo_os_installed_apps_v1"].forEach(function (key) {
        var ids = JSON.parse(localStorage.getItem(key) || "null");
        if (!Array.isArray(ids)) return;
        var hadMp3 = ids.indexOf("music") !== -1;
        ids = ids.filter(function (id) { return id !== "music"; });
        if (hadMp3 && ids.indexOf("stream") === -1) ids.push("stream");
        localStorage.setItem(key, JSON.stringify(ids));
      });
      localStorage.setItem(mergedMp3MigrationKey, "1");
    }

    var retiredStoreMigrationKey = "neo_os_remove_app_store_v1";
    if (localStorage.getItem(retiredStoreMigrationKey) !== "1") {
      ["neo_os_pinned_apps_v1", "neo_os_installed_apps_v1"].forEach(function (key) {
        var ids = JSON.parse(localStorage.getItem(key) || "null");
        if (Array.isArray(ids) && ids.indexOf("store") !== -1) {
          localStorage.setItem(key, JSON.stringify(ids.filter(function (id) { return id !== "store"; })));
        }
      });
      localStorage.setItem(retiredStoreMigrationKey, "1");
    }

    var filesMigrationKey = "neo_os_files_app_v1";
    if (localStorage.getItem(filesMigrationKey) !== "1") {
      var filesPins = JSON.parse(localStorage.getItem("neo_os_pinned_apps_v1") || "null");
      if (Array.isArray(filesPins) && filesPins.length && filesPins.indexOf("files") === -1) {
        var browserIndex = filesPins.indexOf("browser");
        filesPins.splice(browserIndex === -1 ? 0 : browserIndex + 1, 0, "files");
        localStorage.setItem("neo_os_pinned_apps_v1", JSON.stringify(filesPins));
      }
      localStorage.setItem(filesMigrationKey, "1");
    }

    var removeAnimeAppKey = "neo_os_remove_anime_app_v1";
    if (localStorage.getItem(removeAnimeAppKey) !== "1") {
      ["neo_os_pinned_apps_v1", "neo_os_installed_apps_v1"].forEach(function (key) {
        var savedApps = JSON.parse(localStorage.getItem(key) || "null");
        if (Array.isArray(savedApps)) localStorage.setItem(key, JSON.stringify(savedApps.filter(function (id) { return id !== "anime"; })));
      });
      localStorage.setItem(removeAnimeAppKey, "1");
    }

    var removeMangaAppKey = "neo_os_remove_manga_app_v1";
    if (localStorage.getItem(removeMangaAppKey) !== "1") {
      ["neo_os_pinned_apps_v1", "neo_os_installed_apps_v1"].forEach(function (key) {
        var savedApps = JSON.parse(localStorage.getItem(key) || "null");
        if (Array.isArray(savedApps)) localStorage.setItem(key, JSON.stringify(savedApps.filter(function (id) { return id !== "manga"; })));
      });
      localStorage.setItem(removeMangaAppKey, "1");
    }

    var removeClockAppKey = "neo_os_remove_clock_app_v1";
    if (localStorage.getItem(removeClockAppKey) !== "1") {
      ["neo_os_pinned_apps_v1", "neo_os_installed_apps_v1"].forEach(function (key) {
        var savedApps = JSON.parse(localStorage.getItem(key) || "null");
        if (Array.isArray(savedApps)) localStorage.setItem(key, JSON.stringify(savedApps.filter(function (id) { return id !== "clock"; })));
      });
      localStorage.setItem(removeClockAppKey, "1");
    }

    var removePcRemoteKey = "neo_os_remove_pc_remote_v1";
    if (localStorage.getItem(removePcRemoteKey) !== "1") {
      ["neo_os_pinned_apps_v1", "neo_os_installed_apps_v1"].forEach(function (key) {
        var savedApps = JSON.parse(localStorage.getItem(key) || "null");
        if (Array.isArray(savedApps)) localStorage.setItem(key, JSON.stringify(savedApps.filter(function (id) { return id !== "pc-remote"; })));
      });
      localStorage.setItem(removePcRemoteKey, "1");
    }

    var retiredOptionalAppsKey = "neo_os_remove_duplicate_and_retired_apps_v3";
    if (localStorage.getItem(retiredOptionalAppsKey) !== "1") {
      ["neo_os_pinned_apps_v1", "neo_os_installed_apps_v1"].forEach(function (key) {
        var ids = JSON.parse(localStorage.getItem(key) || "null");
        if (!Array.isArray(ids)) return;
        localStorage.setItem(key, JSON.stringify(ids.filter(function (id) {
          return id !== "apps" && id !== "audiobooks" && id !== "photos" && id !== "search";
        })));
      });
      localStorage.setItem(retiredOptionalAppsKey, "1");
    }

    var focusedCatalogMigrationKey = "neo_os_focused_app_catalog_v1";
    if (localStorage.getItem(focusedCatalogMigrationKey) !== "1") {
      var retiredAppIds = ["discord", "geometry-dash", "neo-cloud", "nowgg"];
      ["neo_os_pinned_apps_v1", "neo_os_installed_apps_v1"].forEach(function (key) {
        var savedApps = JSON.parse(localStorage.getItem(key) || "null");
        if (!Array.isArray(savedApps)) return;
        localStorage.setItem(key, JSON.stringify(savedApps.filter(function (id) {
          return retiredAppIds.indexOf(id) === -1;
        })));
      });
      localStorage.setItem(focusedCatalogMigrationKey, "1");
    }
  } catch (error) {}
})();
