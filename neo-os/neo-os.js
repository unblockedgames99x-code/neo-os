(function () {
  "use strict";

  var SETTINGS_KEY = "neo_os_settings_v1";
  var localConfig = window.NEO_LOCAL_CONFIG;
  var localOnly = Boolean(localConfig && localConfig.enabled);
  var localOnlineApps = new Set(localConfig && Array.isArray(localConfig.onlineApps) ? localConfig.onlineApps : []);
  var WIDGET_LAYOUT_KEY = "neo_os_widget_layout_v1";
  var DESKTOP_SHORTCUT_LAYOUT_KEY = "neo_os_desktop_shortcut_layout_v1";
  var DESKTOP_SHORTCUT_HIDDEN_KEY = "neo_os_desktop_shortcut_hidden_v1";
  var DESKTOP_SHORTCUTS_ALL_HIDDEN_KEY = "neo_os_desktop_shortcuts_all_hidden_v1";
  var DESKTOP_VIEW_KEY = "neo_os_desktop_view_v1";
  var RECENT_APPS_KEY = "neo_os_recent_apps_v1";
  var WINDOW_STATE_KEY = "neo_os_window_states_v2";
  var DEFAULT_WINDOW_WIDTH = 1180;
  var DEFAULT_WINDOW_HEIGHT = 760;
  var WINDOW_TOP_GAP = 8;
  var PINNED_APPS_KEY = "neo_os_pinned_apps_v1";
  var RUNNING_TASKBAR_ORDER_KEY = "neo_os_running_taskbar_order_v1";
  var INSTALLED_APPS_KEY = "neo_os_installed_apps_v1";
  var CUSTOM_APPS_KEY = "neo_os_custom_apps_v1";
  var BOOT_SESSION_KEY = "neo_os_booted_session";
  var GUEST_SESSION_KEY = "neo_os_guest_session_v1";
  var MUSIC_MODE_KEY = "neo_os_music_mode_v1";
  var WALLPAPER_DB = "neo_os_wallpapers";
  var WALLPAPER_STORE = "assets";
  var NEO_CHAT_POLL_MS = 8000;
  var NEO_CHAT_SLOW_MODE_MS = 5000;
  var root = document.documentElement;
  var windowLayer = document.getElementById("window-layer");
  var launcher = document.getElementById("app-launcher");
  var launcherDismissLayer = document.getElementById("launcher-dismiss-layer");
  var launcherScroll = document.querySelector(".launcher-scroll-region");
  var launcherGrid = document.getElementById("launcher-grid");
  var launcherSearch = document.getElementById("launcher-search");
  var launcherRecent = document.getElementById("launcher-recent");
  var launcherRecentEmpty = document.getElementById("launcher-recent-empty");
  var launcherCategories = document.getElementById("launcher-categories");
  var launcherResults = document.querySelector("[data-launcher-results]");
  var launcherResultList = document.getElementById("launcher-result-list");
  var launcherResultCount = document.getElementById("launcher-result-count");
  var launcherSearchEmpty = document.getElementById("launcher-search-empty");
  var xenoCommand = document.getElementById("xeno-command-center");
  var xenoCommandDismiss = document.getElementById("xeno-command-dismiss");
  var xenoCommandSearch = document.getElementById("xeno-command-search");
  var xenoCommandResults = document.getElementById("xeno-command-results");
  var xenoCommandEmpty = document.getElementById("xeno-command-empty");
  var xenoCommandTitle = document.querySelector("[data-xeno-command-title]");
  var xenoCommandKey = document.querySelector("[data-xeno-command-key]");
  var toastRegion = document.getElementById("toast-region");
  var widgetLayer = document.getElementById("widget-layer");
  var desktopShortcutLayer = document.getElementById("desktop-shortcuts");
  var activeAppLabel = document.getElementById("active-app-label");
  var nowPlayingWidget = document.querySelector("[data-widget='now-playing']");
  var taskbarNowPlaying = document.querySelector("[data-taskbar-now-playing]");
  var nowPlayingState = null;
  var nowPlayingLevelTimer = 0;
  var taskbarNowPlayingHideTimer = 0;
  var taskbarVolumeBeforeMute = 1;
  var gameNowPlayingOverlay = null;
  var gameNowPlayingDrag = null;
  var GAME_NOW_PLAYING_POSITION_KEY = "neo_os_game_now_playing_position_v1";
  var mediaPrioritySources = new Set();
  var autoPerformanceActive = false;
  var connectionState = document.getElementById("connection-state");
  var connectionPanel = document.getElementById("connection-panel");
  var connectionPanelReturnFocus = null;
  var openWindows = new Map();
  var runningTaskbarOrder = readJson(RUNNING_TASKBAR_ORDER_KEY, []);
  if (!Array.isArray(runningTaskbarOrder)) runningTaskbarOrder = [];
  var runningTaskbarDragId = "";
  var runningTaskbarSuppressOpenUntil = 0;
  var desktopShortcutContextMenu = null;
  var desktopShortcutContextAppId = "";
  var desktopShortcutDrag = null;
  var desktopShortcutRenderFrame = 0;
  var desktopShortcutSuppressOpenUntil = 0;
  var musicRuntime = window.NEO_MUSIC_RUNTIME;
  var zIndex = 100;
  var windowSequence = 0;
  var catalogPromise = null;
  var catalog = null;
  var coverManifestPromise = null;
  var coverManifest = Object.create(null);
  var coverManifestLoaded = false;
  var customWallpaperUrl = "";
  var wallpaperEngine = window.NEOWallpaperEngine || null;
  var weatherFrame = 0;
  var weatherResizeObserver = null;
  var launcherReturnFocus = null;
  var launcherMotionFrame = 0;
  var launcherMotionTimer = 0;
  var launcherShowAll = false;
  var launcherSelectedIndex = 0;
  var xenoCommandSelectedIndex = 0;
  var xenoCommandReturnFocus = null;
  var xenoCommandMotionFrame = 0;
  var xenoCommandMotionTimer = 0;
  var ctrlTapCandidate = false;
  var searchTimer = 0;
  var featureRuntimePromise = null;
  var filesRuntimePromise = null;
  var onlineWallpaperRuntimePromise = null;
  var browseRuntimePromise = null;
  var browsePrewarmScheduled = false;
  var onlineWallpaperRequestSerial = 0;
  var shellApi = null;

  function normalizePerformanceMode(value) {
    value = String(value || "").toLowerCase();
    return value === "performance" || value === "ultimate" ? value : "normal";
  }

  function normalizeTaskbarPosition(value) {
    value = String(value || "").toLowerCase();
    return value === "top" || value === "right" || value === "bottom" ? value : "left";
  }

  function normalizeTaskbarStyle(value) {
    value = String(value || "").toLowerCase();
    return value === "transparent" || value === "typical" || value === "xeno" ? value : "current";
  }

  function normalizeTaskbarSurface(value) {
    value = String(value || "").toLowerCase();
    return value === "solid" || value === "gradient" ? value : "glass";
  }

  function normalizeTaskbarAppMode(value) {
    return "desktop";
  }

  function normalizeDockIconSize(value) {
    return String(value || "").toLowerCase() === "normal" ? "normal" : "large";
  }

  function normalizeWindowBarStyle(value) {
    value = String(value || "").toLowerCase();
    return value === "current" || value === "pill" ? value : "ultra";
  }

  function normalizeInterfaceStyle(value) {
    value = String(value || "").toLowerCase();
    return value === "retro" || value === "windows11" || value === "kali" ? value : "modern";
  }

  function normalizeCursorTheme(value) {
    value = String(value || "").toLowerCase();
    return value === "neo" || value === "neon" || value === "pixel" || value === "contrast" || value === "custom" ? value : "system";
  }

  var CUSTOM_CURSOR_MAX_BYTES = 2 * 1024 * 1024;

  function isValidCustomCursorData(value) {
    value = String(value || "");
    var match = value.match(/^data:image\/(?:png|x-icon|vnd\.microsoft\.icon);base64,([a-z0-9+/=]+)$/i);
    if (!match) return false;
    var padding = (match[1].match(/=*$/) || [""])[0].length;
    return Math.floor(match[1].length * 3 / 4) - padding <= CUSTOM_CURSOR_MAX_BYTES;
  }

  function customCursorDeclaration(fallback) {
    if (!isValidCustomCursorData(settings.customCursorData)) return fallback;
    return 'url("' + settings.customCursorData + '") 0 0, ' + fallback;
  }

  // Tab presets use local assets only. Replace these paths with CDN URLs later
  // without changing the settings UI or persistence contract.
  var tabAppearancePresets = [
    { id: "neo", label: "NEO OS", title: "NEO OS", icon: "./assets/neo-logo.svg", type: "image/svg+xml" },
    { id: "classroom", label: "Classroom", title: "Home - Classroom", icon: "./assets/tab-appearance/classroom.png", type: "image/png" },
    { id: "drive", label: "Drive", title: "Drive", icon: "./assets/tab-appearance/drive.png", type: "image/png" },
    { id: "docs", label: "Docs", title: "Docs", icon: "./assets/tab-appearance/docs.ico", type: "image/x-icon" },
    { id: "gmail", label: "Gmail", title: "Gmail", icon: "./assets/tab-appearance/gmail.ico", type: "image/x-icon" },
    { id: "canvas", label: "Canvas", title: "Canvas", icon: "./assets/tab-appearance/canvas.ico", type: "image/x-icon" },
    { id: "clever", label: "Clever", title: "Clever", icon: "./assets/tab-appearance/clever.png", type: "image/png" },
    { id: "schoology", label: "Schoology", title: "Schoology", icon: "./assets/tab-appearance/schoology.ico", type: "image/x-icon" },
    { id: "powerschool", label: "PowerSchool", title: "PowerSchool", icon: "./assets/tab-appearance/powerschool.png", type: "image/png" },
    { id: "infinite-campus", label: "Infinite Campus", title: "Infinite Campus", icon: "./assets/tab-appearance/infinite-campus.svg", type: "image/svg+xml" },
    { id: "wikipedia", label: "Wikipedia", title: "Wikipedia", icon: "./assets/tab-appearance/wikipedia.png", type: "image/png" },
    { id: "khan-academy", label: "Khan Academy", title: "Khan Academy", icon: "./assets/tab-appearance/khan-academy.ico", type: "image/x-icon" },
    { id: "desmos", label: "Desmos", title: "Desmos", icon: "./assets/tab-appearance/desmos.png", type: "image/png" },
    { id: "quizlet", label: "Quizlet", title: "Quizlet", icon: "./assets/tab-appearance/quizlet.png", type: "image/png" },
    { id: "dictionary", label: "Dictionary", title: "Dictionary", icon: "./assets/tab-appearance/dictionary.png", type: "image/png" },
    { id: "custom", label: "Custom", title: "Custom", icon: "./assets/tab-appearance/custom.svg", type: "image/svg+xml" }
  ];

  function normalizeTabAppearance(value) {
    value = String(value || "").toLowerCase();
    return tabAppearancePresets.some(function (preset) { return preset.id === value; }) ? value : "classroom";
  }

  function normalizeBrowserSearchEngine(value) {
    value = String(value || "").toLowerCase();
    return ["google", "bing", "duckduckgo", "brave", "searxng"].indexOf(value) >= 0 ? value : "duckduckgo";
  }

  var defaultSettings = {
    designVersion: 31,
    wallpaper: "we-steam-1403160205",
    wallpaperFavorites: [],
    wallpaperRecent: [],
    wallpaperFit: "cover",
    wallpaperMuted: true,
    wallpaperVolume: 60,
    wallpaperSpeed: 1,
    wallpaperLoop: true,
    wallpaperPaused: false,
    brightness: 100,
    saturation: 100,
    blur: 0,
    motion: true,
    weather: true,
    batterySaver: false,
    widgets: true,
    desktopSystemWidget: false,
    desktopActiveAppWidget: false,
    desktopNowPlayingWidget: false,
    widgetLock: true,
    dockMagnify: false,
    dockIconSize: "normal",
    taskbarPosition: "left",
    taskbarStyle: "current",
    taskbarSurface: "glass",
    taskbarOutline: true,
    taskbarRunningApps: true,
    taskbarAppDragging: true,
    taskbarAppNames: false,
    taskbarAppMode: "desktop",
    windowBarStyle: "ultra",
    interfaceStyle: "modern",
    cursorTheme: "system",
    customCursorData: "",
    customCursorName: "",
    tabAppearance: "classroom",
    customTabTitle: "My tab",
    customTabIcon: "",
    taskbarTint: "#767c84",
    taskbarGradientEnd: "#315f9b",
    taskbarTransparency: 62,
    taskbarAccent: "#ffffff",
    reduceMotion: false,
    animationSpeed: 100,
    browserSearchEngine: "duckduckgo",
    devtoolsEnabled: true,
    devtoolsPosition: "right",
    performanceMode: "normal",
    autoPerformanceMode: false
  };

  var savedSettings = readJson(SETTINGS_KEY, {});
  var savedDesignVersion = Number(savedSettings.designVersion) || 0;
  if (!Array.isArray(savedSettings.wallpaperFavorites)) savedSettings.wallpaperFavorites = [];
  if (!Array.isArray(savedSettings.wallpaperRecent)) savedSettings.wallpaperRecent = [];
  if (savedDesignVersion < 9) savedSettings.wallpaperSpeed = 1;
  if (savedDesignVersion < 10) {
    savedSettings.taskbarAccent = "#ffffff";
  }
  if (savedDesignVersion < 11) {
    if (Number(savedSettings.brightness) === 92) savedSettings.brightness = 100;
    if (Number(savedSettings.saturation) === 82) savedSettings.saturation = 100;
  }
  if (savedDesignVersion < 12 && (!savedSettings.wallpaper || savedSettings.wallpaper === "neo")) {
    savedSettings.wallpaper = "we-steam-1403160205";
  }
  if (savedDesignVersion < 13 && savedSettings.wallpaper === "we-steam-3192588052") {
    savedSettings.wallpaper = "we-steam-1403160205";
  }
  if (savedDesignVersion < 14 && !savedSettings.performanceMode) {
    savedSettings.performanceMode = savedSettings.performance === "low" ? "performance" : "normal";
  }
  if (savedDesignVersion < 15) {
    savedSettings.taskbarPosition = "left";
    savedSettings.taskbarStyle = "current";
    savedSettings.taskbarTint = "#767c84";
    savedSettings.taskbarTintStrength = 38;
  }
  if (savedDesignVersion < 16) {
    savedSettings.dockMagnify = false;
    savedSettings.dockIconSize = "normal";
  }
  if (savedDesignVersion < 17) {
    savedSettings.autoPerformanceMode = false;
  }
  if (savedDesignVersion < 18) {
    savedSettings.taskbarAppDragging = true;
  }
  if (savedDesignVersion < 19) {
    savedSettings.taskbarRunningApps = true;
  }
  if (savedDesignVersion < 20) {
    savedSettings.windowBarStyle = "ultra";
  }
  if (savedDesignVersion < 21) {
    savedSettings.taskbarAppNames = false;
  }
  if (savedDesignVersion < 22) {
    var legacyTaskbarTintStrength = Number(savedSettings.taskbarTintStrength);
    savedSettings.taskbarTransparency = Number.isFinite(legacyTaskbarTintStrength)
      ? 100 - clamp(legacyTaskbarTintStrength, 0, 100)
      : 62;
  }
  if (savedDesignVersion < 23) {
    savedSettings.desktopSystemWidget = false;
    savedSettings.desktopActiveAppWidget = false;
    savedSettings.desktopNowPlayingWidget = false;
  }
  if (savedDesignVersion < 24) {
    savedSettings.animationSpeed = 100;
  }
  if (savedDesignVersion < 25) {
    var savedWallpaperId = String(savedSettings.wallpaper || "");
    if (savedWallpaperId && savedWallpaperId !== "we-steam-1403160205" && savedWallpaperId !== "custom" && !/^(?:local|steam|commons)-/.test(savedWallpaperId)) {
      savedSettings.wallpaper = "we-steam-1403160205";
    }
    savedSettings.wallpaperFavorites = savedSettings.wallpaperFavorites.filter(function (id) {
      return id === "we-steam-1403160205" || /^(?:local|steam|commons)-/.test(String(id || ""));
    });
    savedSettings.wallpaperRecent = savedSettings.wallpaperRecent.filter(function (id) {
      return id === "we-steam-1403160205" || /^(?:local|steam|commons)-/.test(String(id || ""));
    });
  }
  if (savedDesignVersion < 26) {
    if (savedSettings.devtoolsEnabled === undefined) savedSettings.devtoolsEnabled = true;
    if (!savedSettings.devtoolsPosition) savedSettings.devtoolsPosition = "right";
  }
  if (savedDesignVersion < 27) {
    if (savedSettings.wallpaper === "neo-reactive") savedSettings.wallpaper = "we-steam-1403160205";
    savedSettings.wallpaperFavorites = savedSettings.wallpaperFavorites.filter(function (id) { return id !== "neo-reactive"; });
    savedSettings.wallpaperRecent = savedSettings.wallpaperRecent.filter(function (id) { return id !== "neo-reactive"; });
  }
  if (savedDesignVersion < 28 && !savedSettings.browserSearchEngine) {
    savedSettings.browserSearchEngine = "duckduckgo";
  }
  if (savedDesignVersion < 29 && !savedSettings.taskbarAppMode) {
    savedSettings.taskbarAppMode = "desktop";
  }
  if (savedDesignVersion < 30) {
    savedSettings.taskbarAppMode = normalizeTaskbarAppMode(savedSettings.taskbarAppMode);
  }
  if (savedDesignVersion < 31 && (!savedSettings.tabAppearance || savedSettings.tabAppearance === "neo")) {
    savedSettings.tabAppearance = "classroom";
  }
  savedSettings.performanceMode = normalizePerformanceMode(savedSettings.performanceMode);
  savedSettings.taskbarPosition = normalizeTaskbarPosition(savedSettings.taskbarPosition);
  savedSettings.taskbarStyle = normalizeTaskbarStyle(savedSettings.taskbarStyle);
  savedSettings.taskbarSurface = normalizeTaskbarSurface(savedSettings.taskbarSurface);
  savedSettings.taskbarAppMode = normalizeTaskbarAppMode(savedSettings.taskbarAppMode);
  savedSettings.dockIconSize = normalizeDockIconSize(savedSettings.dockIconSize);
  savedSettings.windowBarStyle = normalizeWindowBarStyle(savedSettings.windowBarStyle);
  savedSettings.interfaceStyle = normalizeInterfaceStyle(savedSettings.interfaceStyle);
  savedSettings.customCursorData = isValidCustomCursorData(savedSettings.customCursorData)
    ? String(savedSettings.customCursorData)
    : "";
  savedSettings.customCursorName = String(savedSettings.customCursorName || "").trim().slice(0, 80);
  savedSettings.cursorTheme = normalizeCursorTheme(savedSettings.cursorTheme);
  if (savedSettings.cursorTheme === "custom" && !savedSettings.customCursorData) savedSettings.cursorTheme = "system";
  savedSettings.tabAppearance = normalizeTabAppearance(savedSettings.tabAppearance);
  savedSettings.customTabTitle = String(savedSettings.customTabTitle || "My tab").trim().slice(0, 80) || "My tab";
  savedSettings.customTabIcon = isValidCustomTabIcon(savedSettings.customTabIcon)
    ? String(savedSettings.customTabIcon || "").trim()
    : "";
  savedSettings.taskbarTint = /^#[0-9a-f]{6}$/i.test(String(savedSettings.taskbarTint || ""))
    ? String(savedSettings.taskbarTint).toLowerCase()
    : "#767c84";
  savedSettings.taskbarGradientEnd = /^#[0-9a-f]{6}$/i.test(String(savedSettings.taskbarGradientEnd || ""))
    ? String(savedSettings.taskbarGradientEnd).toLowerCase()
    : "#315f9b";
  var savedTaskbarTransparency = Number(savedSettings.taskbarTransparency);
  savedSettings.taskbarTransparency = Number.isFinite(savedTaskbarTransparency)
    ? clamp(savedTaskbarTransparency, 0, 100)
    : 62;
  var savedAnimationSpeed = Number(savedSettings.animationSpeed);
  savedSettings.animationSpeed = Number.isFinite(savedAnimationSpeed)
    ? clamp(Math.round(savedAnimationSpeed / 25) * 25, 50, 200)
    : 100;
  savedSettings.devtoolsEnabled = savedSettings.devtoolsEnabled !== false;
  savedSettings.browserSearchEngine = normalizeBrowserSearchEngine(savedSettings.browserSearchEngine);
  savedSettings.devtoolsPosition = ["right", "left", "bottom", "top"].indexOf(String(savedSettings.devtoolsPosition || "").toLowerCase()) >= 0
    ? String(savedSettings.devtoolsPosition).toLowerCase()
    : "right";
  delete savedSettings.performance;
  delete savedSettings.taskbarMaterial;
  delete savedSettings.taskbarOpacity;
  delete savedSettings.taskbarBlur;
  delete savedSettings.taskbarTintStrength;
  savedSettings.designVersion = 30;
  var settings = Object.assign({}, defaultSettings, savedSettings);
  var appliedTabAppearanceSignature = "";
  // Preserve explicit wallpaper sound/pause choices across reloads.
  var widgetLayout = readJson(WIDGET_LAYOUT_KEY, {});
  var windowStates = readJson(WINDOW_STATE_KEY, {});
  if (!windowStates || typeof windowStates !== "object" || Array.isArray(windowStates)) windowStates = {};
  var desktopShortcutLayout = readJson(DESKTOP_SHORTCUT_LAYOUT_KEY, {});
  if (!desktopShortcutLayout || typeof desktopShortcutLayout !== "object" || Array.isArray(desktopShortcutLayout)) desktopShortcutLayout = {};
  var storedHiddenDesktopShortcuts = readJson(DESKTOP_SHORTCUT_HIDDEN_KEY, []);
  var hiddenDesktopShortcutIds = new Set(Array.isArray(storedHiddenDesktopShortcuts) ? storedHiddenDesktopShortcuts.map(String) : []);
  var desktopShortcutsManuallyHidden = readJson(DESKTOP_SHORTCUTS_ALL_HIDDEN_KEY, true) === true;

  var apps = {
    browser: {
      id: "browser",
      title: "Browse",
      hideName: true,
      accessibleName: "Web app",
      subtitle: "Private web search",
      icon: "duckduckgo",
    route: "./NEO-BROWSER/index.html?v=20260912-proxy-ready-v2",
      keepAlive: false,
      width: 1080,
      height: 720,
      launcher: true,
      pinned: true,
      core: true,
      category: "Web",
      aliases: ["duckduckgo", "browse", "internet"]
    },
    files: {
      id: "files",
      title: "Drive",
      subtitle: "My Drive",
      icon: "google-drive",
      lazy: true,
      runtime: "files",
      width: 1080,
      height: 720,
      launcher: true,
      pinned: true,
      core: true,
      category: "System",
      aliases: ["file explorer", "file manager", "downloads", "documents", "drive", "storage"]
    },
    chat: {
      id: "chat",
      title: "NEO Chat",
      subtitle: "Rooms, friends, forums, direct messages, and profiles",
      icon: "chat",
      route: "./neo-chat/index.html?v=20260921-no-call-buttons-v1",
      width: 1180,
      height: 760,
      launcher: true,
      pinned: true,
      core: true,
      category: "Social",
      aliases: ["neo chat", "chat", "messages", "rooms", "spaces", "dm"]
    },
    music: {
      id: "music",
      title: "NEO Music",
      subtitle: "Search, playback, queues, and playlists",
      icon: "music",
      lazy: true,
      width: 1120,
      height: 720,
      launcher: false,
      pinned: false,
      category: "Media",
      aliases: ["neo music", "music", "songs", "audio", "player", "playlists", "albums", "artists"]
    },
    media: {
      id: "media",
      title: "Media Player",
      subtitle: "Local video and picture-in-picture",
      icon: "media-player",
      lazy: true,
      width: 1100,
      height: 720,
      launcher: true,
      pinned: true,
      category: "Media",
      aliases: ["media player", "video", "movies", "watch", "picture in picture"]
    },
    report: {
      id: "report",
      title: "Support",
      subtitle: "Report a problem",
      icon: "info",
      route: "/report-a-bug",
      width: 940,
      height: 680,
      launcher: false,
      pinned: false,
      category: "System",
      aliases: ["help", "bug", "feedback"]
    },
    wallpaper: {
      id: "wallpaper",
      title: "Wallpaper Engine",
      subtitle: "Installed wallpaper library",
      icon: "wallpaper",
      template: "wallpaper-template",
      width: 1180,
      height: 760,
      launcher: true,
      pinned: true,
      category: "Personalization",
      aliases: ["background", "wallpaper", "theme", "animated wallpaper", "wallpaper engine"]
    },
    control: {
      id: "control",
      title: "System Settings",
      subtitle: "Styles, themes, sound, performance and taskbar",
      icon: "settings",
      template: "control-template",
      width: 780,
      height: 560,
      launcher: true,
      pinned: true,
      core: true,
      category: "System",
      aliases: ["settings", "preferences", "appearance", "styles", "modern", "retro", "windows 11", "kali", "kali linux", "linux", "cursor", "pointer", "sound", "theme", "tab appearance", "taskbar", "performance", "battery", "speed"]
    },
    terminal: {
      id: "terminal",
      title: "Terminal",
      subtitle: "NEO command line",
      icon: "terminal",
      lazy: true,
      width: 760,
      height: 480,
      launcher: true,
      pinned: false,
      core: true,
      category: "System",
      aliases: ["console", "shell", "command line"]
    },
    calendar: {
      id: "calendar",
      title: "Date & Time",
      subtitle: "Local time",
      icon: "monitor",
      template: "calendar-template",
      width: 520,
      height: 460,
      launcher: false
    }
  };
  Object.assign(apps, window.NEO_EXTRA_APPS || {});
  restoreCustomApps(apps);
  if (localConfig && localConfig.browser) {
    apps.browser.route = localConfig.browser;
    apps.browser.subtitle = "Full NextNode web proxy";
    apps.browser.hideName = false;
    apps.browser.title = "Browser";
    apps.browser.accessibleName = "NEO Browser";
  }
  if (localOnly) {
    ["report"].forEach(function (id) {
      if (!apps[id]) return;
      if (id === "report" && localConfig.support) {
        apps[id].route = localConfig.support;
        apps[id].subtitle = "Local diagnostics and report export";
        return;
      }
      if (localOnlineApps.has(id)) return;
      apps[id].route = localConfig.unavailable + "?app=" + encodeURIComponent(apps[id].title);
      apps[id].subtitle = "Requires online services; unavailable in local preview";
    });
    apps.chat.subtitle = "Rooms, friends, forums, direct messages, and profiles";
  }

  var storedInstalledApps = readJson(INSTALLED_APPS_KEY, null);
  var installedAppIds = new Set((Array.isArray(storedInstalledApps)
    ? storedInstalledApps
    : Object.keys(apps).filter(function (id) { return apps[id].launcher; }))
    .filter(function (id) { return Object.prototype.hasOwnProperty.call(apps, id); }));
  Object.keys(apps).forEach(function (id) {
    var app = apps[id];
    app.installed = !app.launcher || app.core || app.custom || installedAppIds.has(id);
    if (app.installed && app.launcher) installedAppIds.add(id);
  });
  writeJson(INSTALLED_APPS_KEY, Array.from(installedAppIds));

  var storedPinnedApps = readJson(PINNED_APPS_KEY, null);
  if (Array.isArray(storedPinnedApps) && storedPinnedApps.length && storedPinnedApps.indexOf("chat") === -1) {
    var chatInsertAt = Math.max(0, storedPinnedApps.indexOf("files") + 1);
    storedPinnedApps.splice(chatInsertAt, 0, "chat");
  }
  if (Array.isArray(storedPinnedApps)) {
    storedPinnedApps = storedPinnedApps.filter(function (id) { return Object.prototype.hasOwnProperty.call(apps, id); });
    Object.keys(apps).forEach(function (id) {
      if (apps[id].launcher) apps[id].pinned = storedPinnedApps.indexOf(id) !== -1;
    });
  }
  var pinnedAppOrder = (Array.isArray(storedPinnedApps) ? storedPinnedApps : Object.keys(apps).filter(function (id) {
    return apps[id].launcher && apps[id].pinned;
  })).filter(function (id, index, ids) {
    return ids.indexOf(id) === index && apps[id] && apps[id].launcher;
  });
  writeJson(PINNED_APPS_KEY, pinnedAppOrder);

  function readJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      showToast("Could not save locally", "Local storage may be unavailable.", "info");
    }
  }

  function normalizeCustomAppUrl(value) {
    var source = String(value || "").trim();
    if (!source) throw new TypeError("Enter the site URL.");
    if (!/^[a-z][a-z0-9+.-]*:/i.test(source)) source = "https://" + source;
    var url;
    try { url = new URL(source); } catch (error) { throw new TypeError("Enter a valid website URL."); }
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new TypeError("Only http and https websites can be installed.");
    url.username = "";
    url.password = "";
    return url.href;
  }

  function safeCustomAppIcon(value) {
    var source = String(value || "").trim();
    if (!source || source.length > 350000) return "";
    if (/^data:image\/(?:avif|gif|jpeg|png|svg\+xml|webp)(?:;[^,]*)?,/i.test(source)) return source;
    try {
      var url = new URL(source);
      return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
    } catch (error) { return ""; }
  }

  function escapeAttribute(value) {
    return String(value || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }

  function customAppRoute(url, mode) {
    var browserRoute = localConfig && localConfig.appProxy ? localConfig.appProxy : "./NEO-BROWSER/index.html";
    try {
      var route = new URL(browserRoute, document.baseURI);
      route.searchParams.set("neo-app-mode", "1");
      route.searchParams.set("neo-custom-app", "1");
      route.searchParams.set("neo-app-target", url);
      return route.href;
    } catch (error) {
      return browserRoute + (browserRoute.indexOf("?") === -1 ? "?" : "&") + "neo-app-mode=1&neo-custom-app=1&neo-app-target=" + encodeURIComponent(url);
    }
  }

  function normalizeDirectGameUrl(value) {
    var url;
    try { url = new URL(String(value || "")); } catch (error) { throw new TypeError("This game address is invalid."); }
    var githackHost = /^(?:raw|rawcdn)\.githack\.com$/i.test(url.hostname);
    var githackPath = /^\/unblockedgames99x-code\/neo-os-games-\d+-cdn\/[^/]+\/games\/[A-Za-z0-9%._()\[\] -]+\.html$/i.test(url.pathname);
    var luminRoute = url.hostname.toLowerCase() === "a.luminsdk.com" && /^\/g\/[A-Za-z0-9_-]+\//.test(url.pathname);
    var stableSnowRiderHost = /^(?:cdn|fastly|gcore|quantil)\.jsdelivr\.net$/i.test(url.hostname);
    var stableSnowRiderMatch = url.pathname.match(/^\/gh\/unblockedgames99x-code\/neo-os-chat-tv-cdn@([0-9a-f]{40})\/neo-games\/snow-rider-stable\.html$/i);
    var localStableSnowRider = url.origin === location.origin && /\/neo-games\/snow-rider-stable\.html$/i.test(url.pathname);
    var localCustomGamePlayer = url.origin === location.origin && /\/neo-games\/local-player\.html$/i.test(url.pathname) && /^[a-zA-Z0-9_-]{1,100}$/.test(url.searchParams.get("id") || "");
    if (!localStableSnowRider && !localCustomGamePlayer && (url.protocol !== "https:" || !((githackHost && githackPath) || luminRoute || (stableSnowRiderHost && stableSnowRiderMatch)))) throw new TypeError("This game is not available from the direct game service.");
    if (githackHost) url.hostname = "rawcdn.githack.com";
    url.username = "";
    url.password = "";
    url.hash = "";
    return url.href;
  }

  function customAppDefinition(record) {
    var id = String(record && record.id || "").replace(/[^a-z0-9_-]/gi, "");
    var title = String(record && record.title || "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 48);
    if (!/^custom-app-[a-z0-9_-]+$/i.test(id) || !title) return null;
    var mode = record && record.mode === "direct-game" ? "direct-game" : "relay";
    var url;
    try { url = mode === "direct-game" ? normalizeDirectGameUrl(record.url) : normalizeCustomAppUrl(record.url); } catch (error) { return null; }
    var icon = safeCustomAppIcon(record.icon) || "apps";
    var host = "Website";
    try { host = new URL(url).hostname.replace(/^www\./, "") || host; } catch (error) {}
    return {
      id: id,
      title: title,
      subtitle: mode === "direct-game" ? "HTML game · Direct CDN" : host + " · NEO web proxy",
      icon: icon,
      route: mode === "direct-game" ? url : customAppRoute(url, mode),
      sourceUrl: url,
      launchMode: mode,
      keepAlive: false,
      width: 1080,
      height: 720,
      launcher: true,
      pinned: false,
      custom: true,
      category: "Installed",
      aliases: [title, host, "custom app", "website"]
    };
  }

  function customAppRecord(app) {
    return { id: app.id, title: app.title, url: app.sourceUrl, icon: safeCustomAppIcon(app.icon), mode: app.launchMode, createdAt: app.createdAt || Date.now() };
  }

  function persistCustomApps() {
    writeJson(CUSTOM_APPS_KEY, Object.keys(apps).map(function (id) { return apps[id]; }).filter(function (app) {
      return app && app.custom && app.launcher && app.transient !== true;
    }).map(customAppRecord));
  }

  function restoreCustomApps(registry) {
    var records = readJson(CUSTOM_APPS_KEY, []);
    if (!Array.isArray(records)) records = [];
    var normalized = [];
    records.slice(0, 80).forEach(function (record) {
      var app = customAppDefinition(record);
      if (!app || registry[app.id]) return;
      app.createdAt = Number(record.createdAt) || Date.now();
      registry[app.id] = app;
      normalized.push(customAppRecord(app));
    });
    writeJson(CUSTOM_APPS_KEY, normalized);
  }

  function publicAppRecord(app) {
    return {
      id: app.id,
      title: app.title,
      subtitle: app.subtitle,
      icon: app.icon,
      category: app.category,
      pinned: Boolean(app.pinned),
      installed: Boolean(app.installed),
      core: Boolean(app.core),
      custom: Boolean(app.custom),
      sourceUrl: app.custom ? app.sourceUrl : "",
      launchMode: app.custom ? app.launchMode : "",
      hideName: Boolean(app.hideName),
      accessibleName: app.accessibleName || app.title
    };
  }

  function installCustomApp(input) {
    input = input && typeof input === "object" ? input : {};
    var title = String(input.title || "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 48);
    if (!title) throw new TypeError("Enter an app name.");
    var url = normalizeCustomAppUrl(input.url);
    var icon = String(input.icon || "").trim();
    if (icon && !safeCustomAppIcon(icon)) throw new TypeError("Use an http, https, or image-data icon.");
    var id = "custom-app-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    while (apps[id]) id += "x";
    var app = customAppDefinition({ id: id, title: title, url: url, icon: icon, mode: input.mode });
    if (!app) throw new TypeError("This app could not be installed.");
    app.createdAt = Date.now();
    app.installed = true;
    apps[id] = app;
    installedAppIds.add(id);
    hiddenDesktopShortcutIds.delete(id);
    writeJson(INSTALLED_APPS_KEY, Array.from(installedAppIds));
    persistCustomApps();
    renderDock();
    renderDesktopShortcuts();
    renderLauncher();
    return publicAppRecord(app);
  }

  function addCustomAppToTaskbarAndHomeScreen(input) {
    input = input && typeof input === "object" ? input : {};
    var mode = input.mode === "direct-game" ? "direct-game" : "relay";
    var url = mode === "direct-game" ? normalizeDirectGameUrl(input.url) : normalizeCustomAppUrl(input.url);
    var app = Object.keys(apps).map(function (id) { return apps[id]; }).find(function (candidate) {
      return candidate && candidate.custom && candidate.sourceUrl === url && candidate.launchMode === mode;
    });
    if (!app) {
      var installed = installCustomApp({ title: input.title, url: url, icon: input.icon, mode: mode });
      app = apps[installed.id];
    } else if (app.transient === true || !app.launcher) {
      app.transient = false;
      app.launcher = true;
      app.installed = true;
      app.title = String(input.title || app.title || "Game").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 48) || app.title;
      app.icon = safeCustomAppIcon(input.icon) || app.icon;
      installedAppIds.add(app.id);
      hiddenDesktopShortcutIds.delete(app.id);
      writeJson(INSTALLED_APPS_KEY, Array.from(installedAppIds));
      persistCustomApps();
    } else if (!app.installed) {
      setAppInstalled(app.id, true);
    }
    hiddenDesktopShortcutIds.delete(app.id);
    writeJson(DESKTOP_SHORTCUT_HIDDEN_KEY, Array.from(hiddenDesktopShortcutIds));
    setAppPinned(app.id, true);
    renderDesktopShortcuts();
    return publicAppRecord(app);
  }

  function openGameInWindow(input, owner) {
    input = input && typeof input === "object" ? input : {};
    var mode = input.mode === "direct-game" ? "direct-game" : "relay";
    var url = mode === "direct-game" ? normalizeDirectGameUrl(input.url) : normalizeCustomAppUrl(input.url);
    var title = String(input.title || "Game").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 48) || "Game";
    var icon = safeCustomAppIcon(input.icon) || "steam";
    var app = Object.keys(apps).map(function (id) { return apps[id]; }).find(function (candidate) {
      return candidate && candidate.custom && candidate.sourceUrl === url && candidate.launchMode === mode;
    });
    if (!app) {
      var id = "custom-app-game-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      while (apps[id]) id += "x";
      app = customAppDefinition({ id: id, title: title, url: url, icon: icon, mode: mode });
      if (!app) throw new TypeError("This game window could not be created.");
      app.launcher = false;
      app.installed = false;
      app.transient = true;
      apps[id] = app;
    } else {
      app.title = title;
      app.icon = icon;
    }
    app.gameId = String(input.id || "");
    app.gameOwner = owner || null;
    var win = openApp(app.id);
    if (!win) throw new Error("This game window could not be opened.");
    return publicAppRecord(app);
  }

  function removeCustomApp(id) {
    var app = apps[id];
    if (!app || !app.custom) return false;
    setAppInstalled(id, false);
    delete apps[id];
    delete desktopShortcutLayout[id];
    delete windowStates[id];
    hiddenDesktopShortcutIds.delete(id);
    writeJson(DESKTOP_SHORTCUT_LAYOUT_KEY, desktopShortcutLayout);
    writeJson(WINDOW_STATE_KEY, windowStates);
    writeJson(DESKTOP_SHORTCUT_HIDDEN_KEY, Array.from(hiddenDesktopShortcutIds));
    persistCustomApps();
    renderDock();
    renderDesktopShortcuts();
    renderLauncher();
    return true;
  }

  function removeUnavailableApp(app, hostWindow) {
    if (!app || app.core) return false;
    var title = app.title || "This app";
    if (app.custom) {
      if (hostWindow && (!app.launcher || app.transient === true)) closeWindow(hostWindow, true);
      removeCustomApp(app.id);
    } else if (app.launcher) {
      setAppInstalled(app.id, false);
    } else if (hostWindow) {
      closeWindow(hostWindow, true);
    }
    showToast("App removed", title + " was removed because it could not load.", "apps");
    return true;
  }

  function escapeSelector(value) {
    if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(value);
    return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }

  function iconMarkup(name) {
    if (name === "stream") {
      return '<img class="app-image-icon spotify-vector" src="./assets/spotify-official.png?v=20260827-user-artwork-v1" width="512" height="512" alt="">';
    }
    var imageIcons = {
      code: "./assets/vscode-official.png",
      duckduckgo: "./assets/duckduckgo.png",
      chat: "./assets/imessage-logo.png?v=20260908-imessage-logo-v2",
      chatgpt: "./assets/neo-ai-logo.svg?v=20260920-ai-restored-v1",
      "google-drive": "./assets/google-drive.svg?v=20260824-drive-logo-v3",
      wallpaper: "./assets/wallpaper-engine.png",
      "media-player": "./assets/media-player.svg?v=20260827-high-resolution-v1",
      youtube: "./assets/youtube.svg?v=20260920-youtube-logo-v2",
      "html-games": "./assets/html-games.svg?v=20260827-blue-controller-v1",
      widgets: "./assets/widgets.svg?v=20260907-widgets-logo-v1",
      steam: "./assets/steam.svg?v=20260919-current-steam-logo-v2",
      "xbox-games": "./assets/xbox-games.svg?v=20260912-official-shape-v2",
      movies: "./assets/movies-icon.webp?v=20260912-user-artwork-v1"
    };
    if (imageIcons[name]) return '<img class="app-image-icon" src="' + imageIcons[name] + '" width="24" height="24" alt="">';
    var customIcon = safeCustomAppIcon(name);
    if (customIcon) return '<img class="app-image-icon" src="' + escapeAttribute(customIcon) + '" width="24" height="24" alt="">';
    return '<svg class="icon" aria-hidden="true"><use href="#i-' + name + '"></use></svg>';
  }

  function appIconClass(name) {
    return "app-icon-" + String(name || "app").replace(/[^a-z0-9_-]/gi, "");
  }

  function renderActiveWidget(app) {
    window.NEORenderActiveApp(app, iconMarkup(app.icon), appIconClass(app.icon));
  }

  function safeMediaCover(value) {
    var source = String(value || "").trim();
    if (!source || source.length > 900000) return "";
    if (/^data:image\/(?:avif|gif|jpeg|png|webp);/i.test(source)) return source;
    try {
      var url = new URL(source, window.location.href);
      return /^(?:blob:|https?:)$/.test(url.protocol) ? url.href : "";
    } catch (error) {
      return "";
    }
  }

  function mediaNumber(value) {
    var number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : 0;
  }

  function formatMediaTime(value) {
    var seconds = Math.floor(mediaNumber(value));
    var hours = Math.floor(seconds / 3600);
    var minutes = Math.floor((seconds % 3600) / 60);
    var remainder = String(seconds % 60).padStart(2, "0");
    return hours ? hours + ":" + String(minutes).padStart(2, "0") + ":" + remainder : minutes + ":" + remainder;
  }

  function closeNowPlayingVolume() {
    if (!nowPlayingWidget) return;
    nowPlayingWidget.classList.remove("is-volume-open");
    var trigger = nowPlayingWidget.querySelector("[data-now-playing-volume-trigger]");
    if (trigger) trigger.setAttribute("aria-expanded", "false");
  }

  function setNowPlayingVolume(value) {
    if (!nowPlayingState) return;
    var volume = Math.max(0, Math.min(1, Number(value) || 0));
    nowPlayingState.volume = volume;
    nowPlayingState.muted = volume <= 0.001;
    if (volume > 0.001) taskbarVolumeBeforeMute = volume;
    var input = nowPlayingWidget && nowPlayingWidget.querySelector("[data-now-playing-volume]");
    var output = nowPlayingWidget && nowPlayingWidget.querySelector("[data-now-playing-volume-output]");
    var percentage = Math.round(volume * 100);
    if (input) {
      input.value = String(percentage);
      input.setAttribute("aria-valuetext", percentage + " percent");
    }
    if (output) output.textContent = percentage + "%";
    var gameInput = gameNowPlayingOverlay && gameNowPlayingOverlay.querySelector("[data-game-now-playing-volume]");
    var gameOutput = gameNowPlayingOverlay && gameNowPlayingOverlay.querySelector("[data-game-now-playing-volume-output]");
    if (gameInput) {
      gameInput.value = String(percentage);
      gameInput.setAttribute("aria-valuetext", percentage + " percent");
    }
    if (gameOutput) gameOutput.textContent = percentage + "%";
    renderTaskbarNowPlaying();
    if (nowPlayingState.source === "local-music") {
      loadFeatureRuntime().then(function (runtime) {
        if (runtime && typeof runtime.setVolume === "function") runtime.setVolume(volume);
      }).catch(function () {});
      return;
    }
    window.dispatchEvent(new CustomEvent("neo-media-volume-request", {
      detail: { source: nowPlayingState.source, volume: volume }
    }));
  }

  function clearNowPlayingLevels() {
    window.clearTimeout(nowPlayingLevelTimer);
    nowPlayingLevelTimer = 0;
    if (!nowPlayingWidget) return;
    nowPlayingWidget.classList.remove("is-reactive");
    nowPlayingWidget.querySelectorAll("[data-now-playing-wave] i").forEach(function (bar) {
      bar.style.removeProperty("--neo-wave-level");
    });
  }

  function renderNowPlayingLevels(detail) {
    if (!nowPlayingWidget || !nowPlayingState || !nowPlayingState.playing || performanceActive() || systemPrefersReducedMotion()) {
      clearNowPlayingLevels();
      return;
    }
    if (String(detail.source || "") !== nowPlayingState.source) return;
    var levels = Array.from(detail.levels || []).slice(0, 8).map(function (value) {
      return Math.max(0, Math.min(1, Number(value) || 0));
    });
    if (levels.length !== 8) return;

    var bars = nowPlayingWidget.querySelectorAll("[data-now-playing-wave] i");
    bars.forEach(function (bar, index) {
      bar.style.setProperty("--neo-wave-level", String(0.12 + (levels[index] * 0.88)));
    });
    nowPlayingWidget.classList.add("is-reactive");
    window.clearTimeout(nowPlayingLevelTimer);
    nowPlayingLevelTimer = window.setTimeout(clearNowPlayingLevels, 480);
  }

  function syncMediaCover(image, fallback, container, cover) {
    if (!image || !fallback) return;
    cover = safeMediaCover(cover);
    var current = String(image.dataset.neoCoverSource || "");
    var pending = String(image.dataset.neoCoverPending || "");

    function showCover() {
      image.hidden = false;
      fallback.hidden = true;
      if (container) container.classList.add("has-cover");
    }

    function showFallback() {
      image.hidden = true;
      fallback.hidden = false;
      if (container) container.classList.remove("has-cover");
    }

    if (!cover) {
      delete image.dataset.neoCoverPending;
      delete image.dataset.neoCoverSource;
      image.removeAttribute("src");
      showFallback();
      return;
    }
    if (cover === current) {
      showCover();
      return;
    }
    if (cover === pending) return;

    image.dataset.neoCoverPending = cover;
    var preload = new Image();
    preload.referrerPolicy = "no-referrer";
    preload.onload = function () {
      if (image.dataset.neoCoverPending !== cover) return;
      image.src = cover;
      image.dataset.neoCoverSource = cover;
      delete image.dataset.neoCoverPending;
      showCover();
    };
    preload.onerror = function () {
      if (image.dataset.neoCoverPending !== cover) return;
      delete image.dataset.neoCoverPending;
      if (!current) showFallback();
    };
    preload.src = cover;
  }

  function setTaskbarNowPlayingVisible(visible) {
    if (!taskbarNowPlaying) return;
    window.clearTimeout(taskbarNowPlayingHideTimer);
    taskbarNowPlayingHideTimer = 0;
    if (visible) {
      taskbarNowPlaying.hidden = false;
      window.requestAnimationFrame(function () {
        if (taskbarNowPlaying && !taskbarNowPlaying.hidden) taskbarNowPlaying.classList.add("is-visible");
      });
      return;
    }
    taskbarNowPlaying.classList.remove("is-visible");
    taskbarNowPlayingHideTimer = window.setTimeout(function () {
      if (taskbarNowPlaying && !taskbarNowPlaying.classList.contains("is-visible")) taskbarNowPlaying.hidden = true;
    }, settings.reduceMotion || systemPrefersReducedMotion() ? 0 : 190);
  }

  function renderTaskbarNowPlaying() {
    if (!taskbarNowPlaying) return;
    if (!nowPlayingState) {
      setTaskbarNowPlayingVisible(false);
      return;
    }
    var state = nowPlayingState;
    var app = apps[state.appId] || apps.media;
    var open = taskbarNowPlaying.querySelector("[data-taskbar-now-playing-open]");
    var title = taskbarNowPlaying.querySelector("[data-taskbar-now-playing-title]");
    var subtitle = taskbarNowPlaying.querySelector("[data-taskbar-now-playing-subtitle]");
    var image = taskbarNowPlaying.querySelector("[data-taskbar-now-playing-cover]");
    var fallback = taskbarNowPlaying.querySelector("[data-taskbar-now-playing-fallback]");
    var controls = taskbarNowPlaying.querySelector(".taskbar-now-playing-controls");
    var toggle = taskbarNowPlaying.querySelector("[data-taskbar-now-playing-toggle]");
    var volume = taskbarNowPlaying.querySelector("[data-taskbar-now-playing-volume]");
    taskbarNowPlaying.dataset.mediaSource = state.source;
    taskbarNowPlaying.classList.toggle("is-playing", state.playing === true);
    if (open) {
      open.dataset.app = state.appId;
      open.setAttribute("aria-label", "Open " + app.title + " for " + state.title);
    }
    if (title) title.textContent = state.title || "Nothing playing";
    if (subtitle) subtitle.textContent = state.subtitle || app.subtitle || "Now playing";
    if (fallback) {
      fallback.className = "taskbar-now-playing-fallback " + appIconClass(state.icon || app.icon || "music");
      fallback.innerHTML = iconMarkup(state.icon || app.icon || "music");
    }
    syncMediaCover(image, fallback, taskbarNowPlaying, state.cover);
    if (controls) controls.hidden = state.transport !== true;
    if (toggle) {
      toggle.innerHTML = iconMarkup(state.playing ? "pause" : "play");
      toggle.setAttribute("aria-label", state.playing ? "Pause" : "Play");
    }
    if (volume) {
      var muted = state.muted === true || state.volume <= 0.001;
      volume.hidden = state.volumeControl !== true;
      volume.classList.toggle("is-muted", muted);
      volume.setAttribute("aria-label", muted ? "Unmute" : "Mute");
    }
    setTaskbarNowPlayingVisible(true);
  }

  function alignGameNowPlayingPopover() {
    if (!gameNowPlayingOverlay || !gameNowPlayingOverlay.isConnected) return;
    var rect = gameNowPlayingOverlay.getBoundingClientRect();
    gameNowPlayingOverlay.classList.toggle("opens-below", rect.top < 150);
    gameNowPlayingOverlay.classList.toggle("opens-right", rect.left < 260);
  }

  function saveGameNowPlayingPosition() {
    if (!gameNowPlayingOverlay || !gameNowPlayingOverlay.isConnected) return;
    var rect = gameNowPlayingOverlay.getBoundingClientRect();
    writeJson(GAME_NOW_PLAYING_POSITION_KEY, { x: Math.round(rect.left), y: Math.round(rect.top) });
  }

  function positionGameNowPlayingOverlay() {
    if (!gameNowPlayingOverlay || !gameNowPlayingOverlay.isConnected) return;
    var saved = readJson(GAME_NOW_PLAYING_POSITION_KEY, null);
    if (saved && Number.isFinite(Number(saved.x)) && Number.isFinite(Number(saved.y))) {
      var rect = gameNowPlayingOverlay.getBoundingClientRect();
      gameNowPlayingOverlay.style.left = Math.round(clamp(Number(saved.x), 12, Math.max(12, window.innerWidth - rect.width - 12))) + "px";
      gameNowPlayingOverlay.style.top = Math.round(clamp(Number(saved.y), 12, Math.max(12, window.innerHeight - rect.height - 12))) + "px";
      gameNowPlayingOverlay.style.right = "auto";
      gameNowPlayingOverlay.style.bottom = "auto";
    } else {
      gameNowPlayingOverlay.style.removeProperty("left");
      gameNowPlayingOverlay.style.removeProperty("top");
      gameNowPlayingOverlay.style.right = "20px";
      gameNowPlayingOverlay.style.bottom = "20px";
    }
    alignGameNowPlayingPopover();
  }

  function ensureGameNowPlayingOverlay() {
    if (gameNowPlayingOverlay) return gameNowPlayingOverlay;
    var overlay = document.createElement("aside");
    overlay.className = "game-now-playing";
    overlay.hidden = true;
    overlay.setAttribute("data-game-now-playing", "");
    overlay.setAttribute("aria-label", "Now playing while gaming");
    overlay.innerHTML =
      '<div class="game-now-playing-popover">' +
        '<span class="game-now-playing-kicker">NOW PLAYING</span>' +
        '<strong data-game-now-playing-title>Music</strong>' +
        '<small data-game-now-playing-copy></small>' +
        '<div class="game-now-playing-volume-row">' +
          '<svg class="icon" aria-hidden="true"><use href="#i-volume"></use></svg>' +
          '<label><span class="sr-only">Music volume</span><input type="range" min="0" max="100" value="100" step="1" data-game-now-playing-volume aria-label="Music volume"></label>' +
          '<output data-game-now-playing-volume-output>100%</output>' +
        '</div>' +
      '</div>' +
      '<div class="game-now-playing-drag" data-game-now-playing-drag role="button" tabindex="0" aria-label="Drag now playing control">' +
        '<img class="game-now-playing-cover" data-game-now-playing-cover width="48" height="48" alt="" referrerpolicy="no-referrer" hidden>' +
        '<span class="game-now-playing-fallback app-icon-stream" data-game-now-playing-fallback></span>' +
        '<span class="game-now-playing-pulse" aria-hidden="true"><i></i><i></i><i></i></span>' +
      '</div>';

    var handle = overlay.querySelector("[data-game-now-playing-drag]");
    var volume = overlay.querySelector("[data-game-now-playing-volume]");

    handle.addEventListener("pointerdown", function (event) {
      if (event.button !== 0) return;
      var rect = overlay.getBoundingClientRect();
      gameNowPlayingDrag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        left: rect.left,
        top: rect.top
      };
      overlay.style.left = Math.round(rect.left) + "px";
      overlay.style.top = Math.round(rect.top) + "px";
      overlay.style.right = "auto";
      overlay.style.bottom = "auto";
      overlay.classList.add("is-dragging");
      handle.setAttribute("aria-grabbed", "true");
      handle.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    handle.addEventListener("pointermove", function (event) {
      if (!gameNowPlayingDrag || gameNowPlayingDrag.pointerId !== event.pointerId) return;
      var rect = overlay.getBoundingClientRect();
      var left = clamp(gameNowPlayingDrag.left + event.clientX - gameNowPlayingDrag.startX, 12, Math.max(12, window.innerWidth - rect.width - 12));
      var top = clamp(gameNowPlayingDrag.top + event.clientY - gameNowPlayingDrag.startY, 12, Math.max(12, window.innerHeight - rect.height - 12));
      overlay.style.left = Math.round(left) + "px";
      overlay.style.top = Math.round(top) + "px";
      alignGameNowPlayingPopover();
    });
    function finishGameNowPlayingDrag(event) {
      if (!gameNowPlayingDrag || gameNowPlayingDrag.pointerId !== event.pointerId) return;
      if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
      gameNowPlayingDrag = null;
      overlay.classList.remove("is-dragging");
      handle.setAttribute("aria-grabbed", "false");
      saveGameNowPlayingPosition();
    }
    handle.addEventListener("pointerup", finishGameNowPlayingDrag);
    handle.addEventListener("pointercancel", finishGameNowPlayingDrag);
    handle.addEventListener("keydown", function (event) {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
      var rect = overlay.getBoundingClientRect();
      var step = event.shiftKey ? 24 : 8;
      var left = rect.left + (event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0);
      var top = rect.top + (event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0);
      overlay.style.left = Math.round(clamp(left, 12, Math.max(12, window.innerWidth - rect.width - 12))) + "px";
      overlay.style.top = Math.round(clamp(top, 12, Math.max(12, window.innerHeight - rect.height - 12))) + "px";
      overlay.style.right = "auto";
      overlay.style.bottom = "auto";
      alignGameNowPlayingPopover();
      saveGameNowPlayingPosition();
      event.preventDefault();
    });
    volume.addEventListener("input", function () {
      setNowPlayingVolume(Number(volume.value) / 100);
    });
    gameNowPlayingOverlay = overlay;
    return overlay;
  }

  function syncGameNowPlayingOverlay() {
    var fullscreenWindow = windowLayer && windowLayer.querySelector(".neo-window.is-tab-fullscreen");
    var fullscreenApp = fullscreenWindow && apps[fullscreenWindow.dataset.appId];
    var show = Boolean(
      fullscreenWindow &&
      fullscreenApp &&
      fullscreenApp.category === "Games" &&
      nowPlayingState &&
      nowPlayingState.playing === true &&
      nowPlayingState.kind === "audio"
    );
    if (!show) {
      if (gameNowPlayingOverlay) {
        gameNowPlayingOverlay.hidden = true;
        gameNowPlayingOverlay.remove();
      }
      gameNowPlayingDrag = null;
      return;
    }

    var overlay = ensureGameNowPlayingOverlay();
    var parentChanged = overlay.parentNode !== fullscreenWindow;
    var title = overlay.querySelector("[data-game-now-playing-title]");
    var copy = overlay.querySelector("[data-game-now-playing-copy]");
    var cover = overlay.querySelector("[data-game-now-playing-cover]");
    var fallback = overlay.querySelector("[data-game-now-playing-fallback]");
    var input = overlay.querySelector("[data-game-now-playing-volume]");
    var output = overlay.querySelector("[data-game-now-playing-volume-output]");
    var percentage = Math.round(clamp(nowPlayingState.volume, 0, 1) * 100);
    title.textContent = nowPlayingState.title || "Music";
    copy.textContent = nowPlayingState.subtitle || "NEO Music";
    input.value = String(percentage);
    input.setAttribute("aria-valuetext", percentage + " percent");
    output.textContent = percentage + "%";
    fallback.className = "game-now-playing-fallback " + appIconClass(nowPlayingState.icon || "stream");
    fallback.innerHTML = iconMarkup(nowPlayingState.icon || "stream");
    syncMediaCover(cover, fallback, overlay, nowPlayingState.cover);
    overlay.hidden = false;
    if (parentChanged) {
      fullscreenWindow.appendChild(overlay);
      requestAnimationFrame(positionGameNowPlayingOverlay);
    } else {
      alignGameNowPlayingPopover();
    }
  }

  function renderNowPlaying(detail) {
    if (!nowPlayingWidget || !detail) return;
    var source = String(detail.source || "media");
    var topbarMedia = document.querySelector("[data-topbar-media]");
    if (detail.active === false) {
      if (nowPlayingState && nowPlayingState.source === source) {
        nowPlayingState = null;
        clearNowPlayingLevels();
        closeNowPlayingVolume();
        nowPlayingWidget.hidden = true;
        if (topbarMedia) topbarMedia.hidden = true;
        renderTaskbarNowPlaying();
        syncGameNowPlayingOverlay();
        window.dispatchEvent(new CustomEvent("neo-now-playing-change", {
          detail: { active: false, source: source }
        }));
      }
      return;
    }

    var title = String(detail.title || "").trim().slice(0, 160);
    if (!title) return;
    var appId = apps[detail.appId] ? detail.appId : "media";
    var app = apps[appId] || apps.media;
    var playing = detail.playing === true;
    var paused = detail.playing === false;
    var visualizing = playing || detail.visualizer === true;
    var previousState = nowPlayingState;
    var cover = safeMediaCover(detail.cover);
    if (!cover && previousState && previousState.source === source && previousState.title === title) {
      cover = previousState.cover || "";
    }
    var position = mediaNumber(detail.position);
    var duration = mediaNumber(detail.duration);
    var hasTiming = position > 0 || duration > 0;
    var reportedVolume = Number(detail.volume);
    var hasVolume = detail.volumeControl === true && Number.isFinite(reportedVolume);
    var volume = hasVolume ? Math.max(0, Math.min(1, reportedVolume)) : 0;
    if (!playing || !nowPlayingState || nowPlayingState.source !== source) clearNowPlayingLevels();
    nowPlayingState = {
      source: source,
      appId: appId,
      kind: detail.kind === "audio" ? "audio" : "media",
      title: title,
      subtitle: String(detail.copy || detail.subtitle || app.subtitle || "Now playing").trim().slice(0, 180),
      cover: cover,
      icon: detail.icon || app.icon || "stream",
      playing: playing,
      paused: paused,
      volume: hasVolume ? volume : (nowPlayingState && nowPlayingState.source === source ? nowPlayingState.volume : 1),
      muted: detail.muted === true,
      volumeControl: hasVolume,
      transport: detail.transport === true
    };

    nowPlayingWidget.hidden = false;
    nowPlayingWidget.classList.toggle("is-playing", playing);
    nowPlayingWidget.classList.toggle("is-paused", paused);
    nowPlayingWidget.classList.toggle("is-visualizing", visualizing);
    nowPlayingWidget.classList.toggle("has-cover", Boolean(cover));
    nowPlayingWidget.dataset.mediaSource = source;

    var state = nowPlayingWidget.querySelector("[data-now-playing-state]");
    var open = nowPlayingWidget.querySelector(".now-playing-open");
    var titleNode = nowPlayingWidget.querySelector("[data-now-playing-title]");
    var copyNode = nowPlayingWidget.querySelector("[data-now-playing-copy]");
    var art = nowPlayingWidget.querySelector("[data-now-playing-art]");
    var image = nowPlayingWidget.querySelector("[data-now-playing-cover]");
    var fallback = nowPlayingWidget.querySelector("[data-now-playing-fallback]");
    var controls = nowPlayingWidget.querySelector(".now-playing-controls");
    var toggle = nowPlayingWidget.querySelector("[data-now-playing-toggle]");
    var timing = nowPlayingWidget.querySelector("[data-now-playing-timing]");
    var elapsed = nowPlayingWidget.querySelector("[data-now-playing-elapsed]");
    var total = nowPlayingWidget.querySelector("[data-now-playing-duration]");
    var timingSeparator = timing && timing.querySelector("span");
    var volumePanel = nowPlayingWidget.querySelector("[data-now-playing-volume-panel]");
    var volumeTrigger = nowPlayingWidget.querySelector("[data-now-playing-volume-trigger]");
    var volumeInput = nowPlayingWidget.querySelector("[data-now-playing-volume]");
    var volumeOutput = nowPlayingWidget.querySelector("[data-now-playing-volume-output]");

    state.textContent = String(detail.state || (playing ? "PLAYING" : paused ? "PAUSED" : "OPEN")).slice(0, 18).toUpperCase();
    titleNode.textContent = title;
    copyNode.textContent = String(detail.copy || detail.subtitle || app.subtitle || "Now playing").trim().slice(0, 180);
    open.dataset.app = appId;
    open.setAttribute("aria-label", "Open " + app.title + " for " + title);
    fallback.className = "now-playing-art-fallback " + appIconClass(detail.icon || app.icon || "music");
    fallback.innerHTML = iconMarkup(detail.icon || app.icon || "music");
    art.style.setProperty("--media-hue", String(Number.isFinite(Number(detail.hue)) ? Number(detail.hue) : 158));

    if (timing) timing.hidden = !hasTiming;
    if (elapsed) elapsed.textContent = formatMediaTime(position);
    if (total) {
      total.hidden = duration <= 0;
      total.textContent = formatMediaTime(duration);
    }
    if (timingSeparator) timingSeparator.hidden = duration <= 0;
    if (volumePanel) volumePanel.hidden = !hasVolume;
    if (volumeTrigger) {
      volumeTrigger.hidden = !hasVolume;
      if (!hasVolume) closeNowPlayingVolume();
    }
    if (hasVolume) {
      var percentage = Math.round(volume * 100);
      if (volumeInput) {
        volumeInput.value = String(percentage);
        volumeInput.setAttribute("aria-valuetext", percentage + " percent");
      }
      if (volumeOutput) volumeOutput.textContent = percentage + "%";
    }

    syncMediaCover(image, fallback, nowPlayingWidget, cover);

    if (topbarMedia) {
      var topbarTitle = topbarMedia.querySelector("[data-topbar-media-title]");
      var topbarCover = topbarMedia.querySelector("[data-topbar-media-cover]");
      var topbarFallback = topbarMedia.querySelector("[data-topbar-media-fallback]");
      var topbarTime = topbarMedia.querySelector("[data-topbar-media-time]");
      topbarMedia.hidden = false;
      topbarMedia.dataset.app = appId;
      topbarMedia.classList.toggle("is-playing", playing);
      topbarMedia.setAttribute("aria-label", "Open " + app.title + " for " + title);
      if (topbarTitle) topbarTitle.textContent = title;
      if (topbarTime) {
        topbarTime.hidden = !hasTiming;
        topbarTime.textContent = formatMediaTime(position) + (duration > 0 ? " / " + formatMediaTime(duration) : "");
      }
      if (topbarCover) {
        syncMediaCover(topbarCover, topbarFallback, topbarMedia, cover);
      }
    }

    controls.hidden = detail.transport !== true;
    if (toggle) {
      toggle.innerHTML = iconMarkup(playing ? "pause" : "play");
      toggle.setAttribute("aria-label", playing ? "Pause" : "Play");
    }
    renderTaskbarNowPlaying();
    syncGameNowPlayingOverlay();
    window.dispatchEvent(new CustomEvent("neo-now-playing-change", {
      detail: Object.assign({ active: true }, nowPlayingState)
    }));
  }

  function showStreamNowPlaying() {
    var source = "browse-media:stream";
    if (nowPlayingState && nowPlayingState.appId === "stream" && nowPlayingState.source === source) return;
    if (nowPlayingState && nowPlayingState.playing) return;
    renderNowPlaying({
      source: source,
      appId: "stream",
      icon: "stream",
      title: "Music",
      copy: "Choose a song to start listening",
      state: "READY",
      playing: null,
      visualizer: true,
      active: true
    });
  }

  function isSmallScreen() {
    return window.matchMedia("(max-width: 760px), (pointer: coarse) and (max-width: 1366px), (max-height: 500px) and (max-width: 960px)").matches;
  }

  function systemPrefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function performanceMode() {
    return normalizePerformanceMode(settings.performanceMode);
  }

  function performanceActive() {
    return performanceMode() !== "normal";
  }

  function effectiveReducedMotion() {
    return performanceActive() || settings.reduceMotion || systemPrefersReducedMotion();
  }

  function effectiveWallpaperMotion() {
    if (performanceActive()) return false;
    if (!settings.motion || effectiveReducedMotion()) return false;
    return !(settings.batterySaver && isSmallScreen());
  }

  function foregroundAppOpen() {
    var visible = false;
    openWindows.forEach(function (win) {
      if (visible || !win || !win.isConnected) return;
      if (win.classList.contains("is-minimized") || win.classList.contains("is-minimizing") || win.classList.contains("is-closing")) return;
      visible = true;
    });
    return visible;
  }

  function syncAutoPerformanceMode() {
    var next = Boolean(settings.autoPerformanceMode && foregroundAppOpen());
    var changed = autoPerformanceActive !== next || root.dataset.autoPerformanceActive !== (next ? "true" : "false");
    autoPerformanceActive = next;
    root.dataset.autoPerformanceActive = next ? "true" : "false";
    if (wallpaperEngine && typeof wallpaperEngine.setAutoPerformance === "function") {
      wallpaperEngine.setAutoPerformance(next);
    }
    if (!changed) return;
    updateWeatherEngine();
    window.dispatchEvent(new CustomEvent("neo-auto-performance-change", { detail: { active: next } }));
  }

  function colorToRgb(value) {
    var match = /^#([0-9a-f]{6})$/i.exec(String(value || ""));
    var number = parseInt(match ? match[1] : "000000", 16);
    return [number >> 16, (number >> 8) & 255, number & 255].join(", ");
  }

  function buildAccentPalette(value) {
    var visible = /^#[0-9a-f]{6}$/i.test(value) ? String(value).toLowerCase() : "#ffffff";
    var visibleRgb = colorToRgb(visible);
    var rgb = visibleRgb.split(", ").map(Number);
    var onLightRgb = rgb.slice();
    var linear = function (channel) {
      channel /= 255;
      return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
    };
    var whiteContrast = function (channels) {
      var luminance = 0.2126 * linear(channels[0]) + 0.7152 * linear(channels[1]) + 0.0722 * linear(channels[2]);
      return 1.05 / (luminance + 0.05);
    };
    while (whiteContrast(onLightRgb) < 4.5) onLightRgb = onLightRgb.map(function (channel) { return Math.max(0, Math.round(channel * 0.88)); });
    var toHex = function (channels) {
      return "#" + channels.map(function (channel) { return channel.toString(16).padStart(2, "0"); }).join("");
    };
    var onLight = toHex(onLightRgb);
    var onLightHover = toHex(onLightRgb.map(function (channel) { return Math.max(0, Math.round(channel * 0.86)); }));
    return {
      visible: visible,
      visibleRgb: visibleRgb,
      contrast: rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114 > 150000 ? "#000000" : "#ffffff",
      onLight: onLight,
      onLightHover: onLightHover
    };
  }

  function tabPresetById(id) {
    return tabAppearancePresets.find(function (preset) { return preset.id === id; }) || tabAppearancePresets[0];
  }

  function isValidCustomTabIcon(value) {
    value = String(value || "").trim();
    if (!value) return true;
    if (/^data:image\/(?:png|jpeg|webp|gif|x-icon|vnd\.microsoft\.icon);base64,/i.test(value)) return value.length <= 700000;
    return value.length <= 2048 && /^https?:\/\/[^\s]+$/i.test(value);
  }

  function customTabIconType(value) {
    var match = /^data:(image\/(?:png|jpeg|webp|gif|x-icon|vnd\.microsoft\.icon));base64,/i.exec(String(value || ""));
    if (match) return match[1].toLowerCase();
    var path = String(value || "").split(/[?#]/)[0].toLowerCase();
    if (/\.svg$/.test(path)) return "image/svg+xml";
    if (/\.ico$/.test(path)) return "image/x-icon";
    if (/\.jpe?g$/.test(path)) return "image/jpeg";
    if (/\.webp$/.test(path)) return "image/webp";
    if (/\.gif$/.test(path)) return "image/gif";
    return "image/png";
  }

  function applyTabAppearanceToDocument(targetDocument, appearance) {
    if (!targetDocument || !appearance) return;
    var targetHead = targetDocument.head;
    if (!targetHead && targetDocument.documentElement) {
      targetHead = targetDocument.createElement("head");
      targetDocument.documentElement.insertBefore(targetHead, targetDocument.body || null);
    }
    if (!targetHead) return;

    var titleNode = targetDocument.querySelector("title");
    if (!titleNode) {
      titleNode = targetDocument.createElement("title");
      targetHead.appendChild(titleNode);
    }
    titleNode.textContent = appearance.title;
    targetDocument.title = appearance.title;

    var iconLink = targetDocument.querySelector('link[data-neo-tab-icon], link[rel~="icon"]');
    if (!iconLink) {
      iconLink = targetDocument.createElement("link");
      iconLink.rel = "icon";
      targetHead.appendChild(iconLink);
    }
    iconLink.dataset.neoTabIcon = "true";
    iconLink.type = appearance.type;
    iconLink.href = appearance.icon;
  }

  function syncAboutBlankTabAppearance(appearance) {
    if (window.top === window) return;
    try {
      if (window.top.location.href === "about:blank") {
        applyTabAppearanceToDocument(window.top.document, appearance);
      }
    } catch (error) {}
    try {
      window.top.postMessage({
        type: "neo-shell:tab-appearance",
        detail: appearance
      }, "*");
    } catch (error) {}
  }

  function applyTabAppearance() {
    settings.tabAppearance = normalizeTabAppearance(settings.tabAppearance);
    settings.customTabTitle = String(settings.customTabTitle || "My tab").trim().slice(0, 80) || "My tab";
    var preset = tabPresetById(settings.tabAppearance);
    var isCustom = preset.id === "custom";
    var title = isCustom ? settings.customTabTitle : preset.title;
    var icon = isCustom && settings.customTabIcon ? settings.customTabIcon : preset.icon;
    var type = isCustom && settings.customTabIcon ? customTabIconType(settings.customTabIcon) : preset.type;
    if (!icon) {
      icon = tabAppearancePresets[0].icon;
      type = tabAppearancePresets[0].type;
    }
    try { icon = new URL(icon, document.baseURI).href; } catch (error) {}
    var appearance = { id: preset.id, title: title, icon: icon, type: type };
    applyTabAppearanceToDocument(document, appearance);
    syncAboutBlankTabAppearance(appearance);
    root.dataset.tabAppearance = preset.id;
    var signature = [preset.id, title, icon].join("\n");
    if (signature !== appliedTabAppearanceSignature) {
      appliedTabAppearanceSignature = signature;
      window.dispatchEvent(new CustomEvent("neo-tab-appearance-change", {
        detail: appearance
      }));
    }
    return appearance;
  }

  function interfaceStyleScopeForApp(app) {
    if (!app) return "shell";
    if (app.custom) return "bridge";
    if (["browser", "stream", "chat", "games", "movies", "neo-ai"].indexOf(app.id) !== -1) return "bridge";
    if (["skins", "vscode", "terminal"].indexOf(app.id) !== -1) return "native";
    if (app.template || app.lazy || app.runtime) return "native";
    return "shell";
  }

  function embeddedInterfaceStyleAppId(appId) {
    if (appId === "stream") return "music";
    if (appId === "neo-cloud") return "cloud";
    if (appId === "neo-ai") return "ai";
    if (appId === "chat") return "chat";
    if (appId === "youtube-app") return "youtube";
    if (appId === "games") return "games";
    if (appId === "movies") return "movies";
    if (appId === "browser" || appId === "discord" || appId === "nowgg") return "browser";
    return "app";
  }

  function applyInterfaceStyleToFrame(frame) {
    if (!frame) return;
    var style = normalizeInterfaceStyle(settings.interfaceStyle);
    var hostWindow = frame.closest && frame.closest(".neo-window");
    var hostApp = hostWindow && apps[hostWindow.dataset.appId];
    var scope = frame.dataset.interfaceStyleScope || interfaceStyleScopeForApp(hostApp);
    frame.dataset.interfaceStyleScope = scope;
    try {
      var frameDocument = frame.contentDocument;
      var frameRoot = frameDocument && frameDocument.documentElement;
      if (frameRoot) {
        frameRoot.dataset.interfaceStyle = style;
        frameRoot.dataset.neoInterfaceStyle = style;
        frameRoot.dataset.neoInterfaceStyleScope = scope;
        if (scope === "bridge" && !frameRoot.dataset.neoApp) frameRoot.dataset.neoApp = embeddedInterfaceStyleAppId(hostApp && hostApp.id);
        if (scope === "bridge" && frameDocument.head && !frameDocument.getElementById("neo-interface-styles")) {
          var link = frameDocument.createElement("link");
          link.id = "neo-interface-styles";
          link.rel = "stylesheet";
          link.href = new URL("./neo-interface-styles.css?v=20260913-kali-style-v1&settings=combined-v1", document.baseURI).href;
          frameDocument.head.appendChild(link);
        }
      }
    } catch (error) {}
    try {
      frame.contentWindow.postMessage({ type: "neo-shell:interface-style", style: style }, "*");
    } catch (error) {}
  }

  function applyCursorThemeToFrame(frame) {
    if (!frame) return;
    var theme = normalizeCursorTheme(settings.cursorTheme);
    try {
      var frameDocument = frame.contentDocument;
      var frameRoot = frameDocument && frameDocument.documentElement;
      if (frameRoot) {
        frameRoot.dataset.cursorTheme = theme;
        if (settings.customCursorData) {
          frameRoot.style.setProperty("--neo-custom-cursor-arrow", customCursorDeclaration("auto"));
          frameRoot.style.setProperty("--neo-custom-cursor-pointer", customCursorDeclaration("pointer"));
        } else {
          frameRoot.style.removeProperty("--neo-custom-cursor-arrow");
          frameRoot.style.removeProperty("--neo-custom-cursor-pointer");
        }
        if (frameDocument.head && !frameDocument.getElementById("neo-custom-cursors")) {
          var link = frameDocument.createElement("link");
          link.id = "neo-custom-cursors";
          link.rel = "stylesheet";
          link.href = new URL("./neo-custom-cursors.css?v=20260912-import-cursor-v1", document.baseURI).href;
          frameDocument.head.appendChild(link);
        }
      }
    } catch (_error) {}
    try {
      frame.contentWindow.postMessage({ type: "neo-shell:cursor-theme", theme: theme }, "*");
    } catch (_error) {}
  }

  function applySettings(options) {
    options = options || {};
    var mode = performanceMode();
    var previousMode = normalizePerformanceMode(root.dataset.performanceMode);
    var previousInterfaceStyle = normalizeInterfaceStyle(root.dataset.interfaceStyle);
    var previousCursorTheme = normalizeCursorTheme(root.dataset.cursorTheme);
    var previousTaskbarPosition = normalizeTaskbarPosition(root.dataset.taskbarPosition);
    var previousTaskbarStyle = normalizeTaskbarStyle(root.dataset.taskbarStyle);
    var previousTaskbarRunningApps = root.dataset.taskbarRunningApps !== "false";
    var previousTaskbarAppNames = root.dataset.taskbarAppNames === "true";
    var wallpaper = settings.wallpaper;
    var previousWallpaper = root.dataset.wallpaper || wallpaper || "we-steam-1403160205";
    var wallpaperSettings = Object.assign({}, settings, {
      motion: effectiveWallpaperMotion(),
      wallpaperPaused: settings.wallpaperPaused || mode !== "normal",
      reduceMotion: settings.reduceMotion || mode !== "normal",
      performanceMode: mode
    });
    var accent = buildAccentPalette(settings.taskbarAccent);
    if (wallpaper === "custom" && !customWallpaperUrl) wallpaper = "we-steam-1403160205";
    root.dataset.wallpaper = wallpaper;
    root.dataset.performanceMode = mode;
    root.dataset.motion = wallpaperSettings.motion ? "true" : "false";
    root.dataset.weather = settings.weather && mode === "normal" && !effectiveReducedMotion() ? "true" : "false";
    root.dataset.widgets = settings.widgets && mode !== "ultimate" ? "true" : "false";
    root.dataset.desktopSystemWidget = settings.desktopSystemWidget ? "true" : "false";
    root.dataset.desktopActiveAppWidget = settings.desktopActiveAppWidget ? "true" : "false";
    root.dataset.desktopNowPlayingWidget = settings.desktopNowPlayingWidget ? "true" : "false";
    root.dataset.widgetLock = settings.widgetLock ? "true" : "false";
    settings.dockMagnify = false;
    settings.dockIconSize = "normal";
    root.dataset.dockMagnify = "false";
    root.dataset.dockIconSize = "normal";
    settings.taskbarPosition = normalizeTaskbarPosition(settings.taskbarPosition);
    settings.taskbarStyle = normalizeTaskbarStyle(settings.taskbarStyle);
    // The clear-rail preset is intentionally a vertical dock. Older builds
    // rendered it as a row of separate outlined tiles when Bottom was saved.
    // Keep the preset deterministic and match its settings preview.
    if (settings.taskbarStyle === "transparent") {
      settings.taskbarPosition = "left";
      settings.taskbarAppNames = false;
    }
    settings.taskbarSurface = normalizeTaskbarSurface(settings.taskbarSurface);
    settings.taskbarAppMode = normalizeTaskbarAppMode(settings.taskbarAppMode);
    settings.windowBarStyle = normalizeWindowBarStyle(settings.windowBarStyle);
    settings.interfaceStyle = normalizeInterfaceStyle(settings.interfaceStyle);
    settings.customCursorData = isValidCustomCursorData(settings.customCursorData) ? String(settings.customCursorData) : "";
    settings.customCursorName = String(settings.customCursorName || "").trim().slice(0, 80);
    settings.cursorTheme = normalizeCursorTheme(settings.cursorTheme);
    if (settings.cursorTheme === "custom" && !settings.customCursorData) settings.cursorTheme = "system";
    settings.tabAppearance = normalizeTabAppearance(settings.tabAppearance);
    settings.taskbarTint = /^#[0-9a-f]{6}$/i.test(String(settings.taskbarTint || ""))
      ? String(settings.taskbarTint).toLowerCase()
      : "#767c84";
    settings.taskbarGradientEnd = /^#[0-9a-f]{6}$/i.test(String(settings.taskbarGradientEnd || ""))
      ? String(settings.taskbarGradientEnd).toLowerCase()
      : "#315f9b";
    settings.taskbarTransparency = Number.isFinite(Number(settings.taskbarTransparency))
      ? clamp(Number(settings.taskbarTransparency), 0, 100)
      : 62;
    settings.animationSpeed = Number.isFinite(Number(settings.animationSpeed))
      ? clamp(Math.round(Number(settings.animationSpeed) / 25) * 25, 50, 200)
      : 100;
    settings.browserSearchEngine = normalizeBrowserSearchEngine(settings.browserSearchEngine);
    var animationDurationScale = 100 / settings.animationSpeed;
    var taskbarTintChannels = colorToRgb(settings.taskbarTint).split(", ").map(Number);
    var taskbarTintLuminance = taskbarTintChannels[0] * 0.299 + taskbarTintChannels[1] * 0.587 + taskbarTintChannels[2] * 0.114;
    var taskbarGradientChannels = colorToRgb(settings.taskbarGradientEnd).split(", ").map(Number);
    var taskbarGradientLuminance = taskbarGradientChannels[0] * 0.299 + taskbarGradientChannels[1] * 0.587 + taskbarGradientChannels[2] * 0.114;
    var taskbarSurfaceLuminance = settings.taskbarSurface === "gradient"
      ? (taskbarTintLuminance + taskbarGradientLuminance) / 2
      : taskbarTintLuminance;
    var taskbarUsesLightSurface = settings.taskbarStyle !== "transparent"
      && (settings.taskbarSurface === "glass"
        ? taskbarTintLuminance >= 178 && (settings.taskbarStyle === "typical" || settings.taskbarTransparency <= 45)
        : taskbarSurfaceLuminance >= 168);
    root.dataset.taskbarPosition = settings.taskbarPosition;
    root.dataset.taskbarStyle = settings.taskbarStyle;
    root.dataset.taskbarSurface = settings.taskbarSurface;
    root.dataset.taskbarOutline = settings.taskbarOutline ? "true" : "false";
    root.dataset.taskbarRunningApps = settings.taskbarRunningApps ? "true" : "false";
    root.dataset.taskbarAppDragging = settings.taskbarAppDragging ? "true" : "false";
    root.dataset.taskbarAppNames = settings.taskbarAppNames ? "true" : "false";
    root.dataset.taskbarAppMode = settings.taskbarAppMode;
    root.dataset.windowBarStyle = settings.windowBarStyle;
    root.dataset.interfaceStyle = settings.interfaceStyle;
    if (typeof window.__neoSyncInterfaceCss === "function") window.__neoSyncInterfaceCss();
    root.dataset.cursorTheme = settings.cursorTheme;
    if (settings.customCursorData) {
      root.style.setProperty("--neo-custom-cursor-arrow", customCursorDeclaration("auto"));
      root.style.setProperty("--neo-custom-cursor-pointer", customCursorDeclaration("pointer"));
    } else {
      root.style.removeProperty("--neo-custom-cursor-arrow");
      root.style.removeProperty("--neo-custom-cursor-pointer");
    }
    applyTabAppearance();
    root.dataset.taskbarTone = taskbarUsesLightSurface ? "light" : "dark";
    root.dataset.reduceMotion = wallpaperSettings.reduceMotion ? "true" : "false";
    root.dataset.animationSpeed = String(settings.animationSpeed);
    root.dataset.performance = mode === "normal" ? "balanced" : "low";
    root.style.setProperty("--wallpaper-brightness", String(clamp(Number(settings.brightness), 45, 115) / 100));
    root.style.setProperty("--wallpaper-saturation", String(clamp(Number(settings.saturation), 0, 140) / 100));
    root.style.setProperty("--wallpaper-blur", clamp(Number(settings.blur), 0, 12) + "px");
    root.style.setProperty("--neo-taskbar-tint", colorToRgb(settings.taskbarTint));
    root.style.setProperty("--neo-taskbar-gradient-end", colorToRgb(settings.taskbarGradientEnd));
    root.style.setProperty("--neo-taskbar-opacity", String((100 - settings.taskbarTransparency) / 100));
    root.style.setProperty("--neo-window-open-duration", Math.round(300 * animationDurationScale) + "ms");
    root.style.setProperty("--neo-window-restore-duration", Math.round(260 * animationDurationScale) + "ms");
    root.style.setProperty("--neo-window-close-duration", Math.round(210 * animationDurationScale) + "ms");
    root.style.setProperty("--neo-command-open-duration", Math.round(340 * animationDurationScale) + "ms");
    root.style.setProperty("--neo-command-close-duration", Math.round(210 * animationDurationScale) + "ms");
    root.style.setProperty("--neo-command-content-duration", Math.round(250 * animationDurationScale) + "ms");
    root.style.setProperty("--neo-command-stagger-one", Math.round(28 * animationDurationScale) + "ms");
    root.style.setProperty("--neo-command-stagger-two", Math.round(52 * animationDurationScale) + "ms");
    root.style.setProperty("--neo-taskbar-foreground", taskbarUsesLightSurface ? "#111317" : "#ffffff");
    root.style.setProperty("--neo-accent", accent.visible);
    root.style.setProperty("--neo-accent-visible", accent.visible);
    root.style.setProperty("--neo-accent-visible-rgb", accent.visibleRgb);
    root.style.setProperty("--neo-accent-contrast", accent.contrast);
    root.style.setProperty("--neo-accent-on-light", accent.onLight);
    root.style.setProperty("--neo-accent-on-light-hover", accent.onLightHover);
    root.style.setProperty("--neo-accent-soft", "rgba(" + accent.visibleRgb + ", 0.16)");
    root.style.setProperty("--messages-blue", accent.onLight);
    document.querySelectorAll("#neo-dock .dock-button[data-app]").forEach(function (button) {
      button.draggable = Boolean(settings.taskbarRunningApps && settings.taskbarAppDragging);
      if (!settings.taskbarRunningApps || !settings.taskbarAppDragging) button.classList.remove("is-dragging", "is-drop-before", "is-drop-after");
    });
    document.querySelectorAll(".neo-window iframe").forEach(function (frame) {
      applyInterfaceStyleToFrame(frame);
      applyCursorThemeToFrame(frame);
      try {
        var frameRoot = frame.contentDocument && frame.contentDocument.documentElement;
        if (frameRoot) {
          frameRoot.dataset.neoPerformanceMode = mode;
          if (frame.closest('.neo-window[data-app-id="stream"]')) {
            frameRoot.style.setProperty("--neo-music-accent", accent.visible);
            frameRoot.style.setProperty("--neo-music-accent-contrast", accent.contrast);
          }
        }
      } catch (error) {}
      try { frame.contentWindow.postMessage({ type: "neo-shell:performance-mode", mode: mode }, "*"); } catch (error) {}
      try { frame.contentWindow.postMessage({ type: "neo:browser-settings-change", searchEngine: settings.browserSearchEngine }, "*"); } catch (error) {}
    });
    if (wallpaperEngine) {
      wallpaperEngine.apply(wallpaper, wallpaperSettings).catch(function () {
        if (settings.wallpaper !== wallpaper) return;
        var activeWallpaper = wallpaperEngine.getState().id || previousWallpaper || "we-steam-1403160205";
        settings.wallpaper = activeWallpaper;
        settings.wallpaperRecent = settings.wallpaperRecent.filter(function (id) { return id !== wallpaper; });
        root.dataset.wallpaper = activeWallpaper;
        writeJson(SETTINGS_KEY, settings);
        wallpaperStudios().forEach(refreshWallpaperStudio);
        showToast("Wallpaper unavailable", "Chrome could not decode that file. Your previous wallpaper was kept.", "info");
      });
    }
    syncAutoPerformanceMode();
    syncTaskbarAppVisibility();
    syncSettingControls();
    applyWidgetLayout();
    setupWeatherCanvas();
    updateWeatherEngine();
    if (previousInterfaceStyle !== settings.interfaceStyle) {
      renderDock();
      window.requestAnimationFrame(function () { fitDockToViewport(document.getElementById("neo-dock")); });
      window.dispatchEvent(new CustomEvent("neo-interface-style-change", {
        detail: { style: settings.interfaceStyle, previousStyle: previousInterfaceStyle }
      }));
    }
    if (previousCursorTheme !== settings.cursorTheme || options.cursorAssetChanged) {
      window.dispatchEvent(new CustomEvent("neo-cursor-theme-change", {
        detail: { theme: settings.cursorTheme, previousTheme: previousCursorTheme, customName: settings.customCursorName }
      }));
    }
    if (previousTaskbarPosition !== settings.taskbarPosition || previousTaskbarStyle !== settings.taskbarStyle || previousTaskbarAppNames !== Boolean(settings.taskbarAppNames)) {
      if (previousTaskbarStyle !== settings.taskbarStyle) {
        if (settings.taskbarStyle !== "xeno") setXenoCommandOpen(false);
        else setLauncherOpen(false);
        renderDock();
      }
      window.requestAnimationFrame(function () {
        fitDockToViewport(document.getElementById("neo-dock"));
        layoutDesktopShortcuts();
        window.dispatchEvent(new CustomEvent("neo-taskbar-layout-change", {
          detail: {
            previous: { position: previousTaskbarPosition, style: previousTaskbarStyle, appNames: previousTaskbarAppNames },
            current: { position: settings.taskbarPosition, style: settings.taskbarStyle, appNames: Boolean(settings.taskbarAppNames) }
          }
        }));
      });
    }
    if (previousTaskbarRunningApps !== Boolean(settings.taskbarRunningApps)) {
      renderDock();
      window.dispatchEvent(new CustomEvent("neo-taskbar-running-apps-change", {
        detail: { enabled: Boolean(settings.taskbarRunningApps) }
      }));
    }
    if (previousMode !== mode) {
      renderDock();
      window.dispatchEvent(new CustomEvent("neo-performance-mode-change", {
        detail: { mode: mode, previousMode: previousMode }
      }));
      if (mode === "normal") scheduleBrowsePrewarm();
    }
    if (options.persist !== false) writeJson(SETTINGS_KEY, settings);
  }

  function setSetting(name, value, options) {
    if (!Object.prototype.hasOwnProperty.call(defaultSettings, name)) return;
    settings[name] = value;
    applySettings(options);
    if (/^desktop(?:System|ActiveApp|NowPlaying)Widget$/.test(name)) {
      window.dispatchEvent(new CustomEvent("neo-status-widgets-change", {
        detail: { name: name, enabled: Boolean(settings[name]) }
      }));
    }
  }

  function setCustomTabAppearance(title, icon) {
    title = String(title || "").trim().slice(0, 80);
    if (!title) {
      showToast("Add a tab name", "Enter a short title before saving the custom tab.", "info");
      return false;
    }
    if (icon !== undefined) {
      icon = String(icon || "").trim();
      if (!isValidCustomTabIcon(icon)) {
        showToast("Check the tab icon", "Enter a direct http or https icon URL, or upload an image under 500 KB.", "info");
        return false;
      }
      settings.customTabIcon = icon;
    }
    settings.customTabTitle = title;
    settings.tabAppearance = "custom";
    applySettings();
    return true;
  }

  function setCustomCursor(data, name) {
    data = String(data || "");
    if (!isValidCustomCursorData(data)) {
      showToast("Cursor not imported", "Choose a PNG, CUR, or ICO file no larger than 2 MB.", "info");
      return false;
    }
    settings.customCursorData = data;
    settings.customCursorName = String(name || "Imported cursor").trim().slice(0, 80) || "Imported cursor";
    settings.cursorTheme = "custom";
    applySettings({ cursorAssetChanged: true });
    showToast("Cursor imported", settings.customCursorName + " is now active.", "settings");
    return true;
  }

  function clearCustomCursor() {
    var hadCustomCursor = Boolean(settings.customCursorData);
    settings.customCursorData = "";
    settings.customCursorName = "";
    if (settings.cursorTheme === "custom") settings.cursorTheme = "system";
    applySettings({ cursorAssetChanged: true });
    if (hadCustomCursor) showToast("Imported cursor removed", "The system cursor is active again.", "settings");
    return hadCustomCursor;
  }

  function syncSettingControls(scope) {
    var host = scope || document;
    Object.keys(settings).forEach(function (name) {
      var nodes = host.querySelectorAll('[data-setting="' + escapeSelector(name) + '"]');
      nodes.forEach(function (node) {
        if (node.type === "checkbox") node.checked = Boolean(settings[name]);
        else node.value = String(settings[name]);
      });
    });
    host.querySelectorAll("[data-output]").forEach(function (output) {
      var name = output.getAttribute("data-output");
      if (name === "blur" || name === "taskbarBlur") output.textContent = settings[name] + "px";
      else output.textContent = settings[name] + "%";
    });
    host.querySelectorAll("[data-taskbar-position-option]").forEach(function (button) {
      var active = button.getAttribute("data-taskbar-position-option") === settings.taskbarPosition;
      button.classList.toggle("is-selected", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
      button.disabled = settings.taskbarStyle === "figure";
    });
    host.querySelectorAll("[data-taskbar-style-option]").forEach(function (button) {
      var active = button.getAttribute("data-taskbar-style-option") === settings.taskbarStyle;
      button.classList.toggle("is-selected", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    host.querySelectorAll("[data-taskbar-surface-option]").forEach(function (button) {
      var active = button.getAttribute("data-taskbar-surface-option") === settings.taskbarSurface;
      button.classList.toggle("is-selected", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    host.querySelectorAll("[data-taskbar-glass-control]").forEach(function (control) {
      var enabled = settings.taskbarSurface === "glass";
      control.classList.toggle("is-disabled", !enabled);
      control.querySelectorAll("input").forEach(function (input) { input.disabled = !enabled; });
    });
    host.querySelectorAll("[data-taskbar-gradient-control]").forEach(function (control) {
      var enabled = settings.taskbarSurface === "gradient";
      control.classList.toggle("is-disabled", !enabled);
      control.querySelectorAll("input").forEach(function (input) { input.disabled = !enabled; });
    });
    host.querySelectorAll("[data-taskbar-drag-control]").forEach(function (control) {
      var enabled = Boolean(settings.taskbarRunningApps);
      control.classList.toggle("is-disabled", !enabled);
      control.querySelectorAll("input").forEach(function (input) { input.disabled = !enabled; });
    });
    host.querySelectorAll("[data-window-bar-style-option]").forEach(function (button) {
      var active = button.getAttribute("data-window-bar-style-option") === settings.windowBarStyle;
      button.classList.toggle("is-selected", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    host.querySelectorAll("[data-interface-style-option]").forEach(function (button) {
      var active = button.getAttribute("data-interface-style-option") === settings.interfaceStyle;
      button.classList.toggle("is-selected", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    host.querySelectorAll("[data-taskbar-tint-preset]").forEach(function (button) {
      var active = button.getAttribute("data-taskbar-tint-preset").toLowerCase() === String(settings.taskbarTint).toLowerCase();
      button.classList.toggle("is-selected", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    host.querySelectorAll("[data-taskbar-options-summary]").forEach(function (summary) {
      var position = settings.taskbarPosition.charAt(0).toUpperCase() + settings.taskbarPosition.slice(1);
      var style = settings.taskbarStyle === "current" ? "Floating" : settings.taskbarStyle === "typical" ? "Full edge" : settings.taskbarStyle === "xeno" ? "XENO" : settings.taskbarStyle === "figure" ? "Figure" : "Clear rail";
      var surface = settings.taskbarSurface.charAt(0).toUpperCase() + settings.taskbarSurface.slice(1);
      summary.textContent = settings.taskbarStyle === "xeno"
        ? "Bottom center · XENO · Theme adaptive"
        : settings.taskbarStyle === "figure"
          ? "Bottom center · Figure · Smoky glass"
          : position + " · " + style + " · " + surface;
    });
    var mode = performanceMode();
    host.querySelectorAll("[data-performance-mode-button]").forEach(function (button) {
      var active = button.getAttribute("data-performance-mode-button") === mode;
      button.classList.toggle("is-selected", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    host.querySelectorAll("[data-performance-status]").forEach(function (status) {
      status.textContent = mode === "ultimate" ? "ULTIMATE" : mode === "performance" ? "PERFORMANCE" : "NORMAL";
    });
    host.querySelectorAll("[data-performance-summary]").forEach(function (summary) {
      summary.textContent = mode === "ultimate"
        ? "Minimum shell, solid desktop, and no background visual work."
        : mode === "performance"
          ? "Wallpaper motion, blur, animations, previews, and background preloading are off."
          : "Full visuals and animated wallpapers.";
    });
    host.querySelectorAll("[data-wallpaper-option]").forEach(function (option) {
      if (option.closest("[data-wallpaper-studio]")) return;
      var active = option.getAttribute("data-wallpaper-option") === settings.wallpaper;
      option.classList.toggle("is-active", active);
      option.setAttribute("aria-pressed", active ? "true" : "false");
    });
    if (!scope) wallpaperStudios().forEach(refreshWallpaperStudio);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
  }

  function updateClock() {
    var now = new Date();
    var dayName = new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(now);
    var monthDay = new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric" }).format(now);
    var monthName = new Intl.DateTimeFormat(undefined, { month: "long" }).format(now);
    var time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(now);
    var topbarDay = document.getElementById("topbar-day");
    var topbarClock = document.getElementById("topbar-clock");
    var taskbarClock = document.getElementById("taskbar-clock");
    var taskbarDate = document.getElementById("taskbar-date");
    var rainmeter = document.getElementById("rainmeter-clock");
    var rainmeterWeekday = document.getElementById("rainmeter-weekday");
    var rainmeterDate = document.getElementById("rainmeter-date");
    var rainmeterTime = document.getElementById("rainmeter-time");
    if (topbarDay) topbarDay.textContent = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(now);
    if (topbarClock) topbarClock.textContent = time;
    if (taskbarClock) taskbarClock.textContent = time;
    if (taskbarDate) taskbarDate.textContent = (now.getMonth() + 1) + "/" + now.getDate() + "/" + now.getFullYear();
    if (performanceMode() !== "ultimate") {
      if (rainmeter) {
        rainmeter.setAttribute("aria-label", dayName + ", " + monthDay + ", " + now.getFullYear() + ", " + time);
        rainmeter.dataset.rainmeterYear = now.getFullYear() + ".";
      }
      if (rainmeterWeekday) {
        delete rainmeterWeekday.dataset.rainmeterGlyphDay;
        delete rainmeterWeekday.dataset.rainmeterReferenceDay;
        var weekdayLetters = document.createDocumentFragment();
        Array.from(dayName.toUpperCase()).forEach(function (letter) {
          var glyph = document.createElement("span");
          glyph.setAttribute("aria-hidden", "true");
          glyph.textContent = letter;
          weekdayLetters.appendChild(glyph);
        });
        rainmeterWeekday.setAttribute("aria-label", dayName);
        rainmeterWeekday.replaceChildren(weekdayLetters);
      }
      if (rainmeterDate) rainmeterDate.textContent = String(now.getDate()).padStart(2, "0") + " " + monthName.toUpperCase() + ", " + now.getFullYear() + ".";
      if (rainmeterTime) {
        rainmeterTime.textContent = "- " + time + " -";
        rainmeterTime.dataset.rainmeterWheelTime = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
      }
    }
    document.querySelectorAll("[data-calendar-weekday]").forEach(function (node) { node.textContent = dayName; });
    document.querySelectorAll("[data-calendar-date]").forEach(function (node) { node.textContent = monthDay; });
    document.querySelectorAll("[data-calendar-time]").forEach(function (node) { node.textContent = time; });
    window.setTimeout(updateClock, 60000 - (Date.now() % 60000) + 20);
  }

  function setConnectionPanelOpen(open, trigger) {
    if (!connectionPanel) return;
    var shouldOpen = Boolean(open);
    connectionPanel.hidden = !shouldOpen;
    document.querySelectorAll("[data-connection-toggle]").forEach(function (button) {
      button.setAttribute("aria-expanded", String(shouldOpen));
    });
    if (!shouldOpen) {
      connectionPanel.classList.remove("is-topbar-anchor");
      var returnFocus = connectionPanelReturnFocus;
      connectionPanelReturnFocus = null;
      if (returnFocus && returnFocus.isConnected) returnFocus.focus({ preventScroll: true });
      return;
    }
    connectionPanelReturnFocus = trigger || document.activeElement;
    connectionPanel.classList.toggle("is-topbar-anchor", Boolean(trigger && trigger.closest(".topbar")));
  }

  function updateConnectionPanel(current) {
    if (!connectionPanel || !current) return;
    var label = connectionPanel.querySelector("[data-connection-panel-label]");
    var summary = connectionPanel.querySelector("[data-connection-panel-summary]");
    var checked = connectionPanel.querySelector("[data-connection-checked]");
    var list = connectionPanel.querySelector("[data-connection-services]");
    var status = current.status || "checking";
    connectionPanel.classList.toggle("is-offline", status === "offline");
    connectionPanel.classList.toggle("is-limited", status === "limited" || status === "local");
    connectionPanel.classList.toggle("is-checking", status === "checking");
    if (label) label.textContent = current.label || "Connection status";
    if (summary) summary.textContent = current.summary || "Checking NEO services…";
    if (checked) {
      checked.textContent = status === "checking" || !current.checkedAt
        ? "Checking now…"
        : "Checked " + new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" }).format(new Date(current.checkedAt));
    }
    if (!list) return;
    var services = Array.isArray(current.services) ? current.services : [];
    var fragment = document.createDocumentFragment();
    services.forEach(function (service) {
      var item = document.createElement("li");
      var dot = document.createElement("span");
      var name = document.createElement("strong");
      var result = document.createElement("small");
      item.classList.toggle("is-ready", Boolean(service.ready));
      dot.className = "connection-service-dot";
      dot.setAttribute("aria-hidden", "true");
      name.textContent = service.name;
      result.textContent = service.ready ? (service.latency ? service.latency + " ms" : "Ready") : "Unavailable";
      item.append(dot, name, result);
      fragment.appendChild(item);
    });
    list.replaceChildren(fragment);
  }

  function updateConnection(nextState) {
    var monitor = window.NEO_CONNECTION_MONITOR;
    var current = nextState && nextState.status ? nextState : (monitor ? monitor.getState() : null);
    var status = current ? current.status : (navigator.onLine ? "connected" : "offline");
    var offline = status === "offline";
    var limited = status === "limited" || status === "local" || status === "checking";
    var labelText = current ? current.label : (navigator.onLine ? "Online" : "Offline");
    var detailText = current ? current.summary : labelText;
    if (connectionState) {
      connectionState.classList.toggle("is-offline", offline);
      connectionState.classList.toggle("is-limited", limited);
      connectionState.dataset.connectionStatus = status;
      connectionState.title = detailText;
      var label = connectionState.querySelector(".connection-label");
      if (label) label.textContent = labelText;
      connectionState.setAttribute("aria-label", "Network: " + labelText + ". " + detailText);
    }
    var taskbarNetwork = document.getElementById("taskbar-network");
    if (taskbarNetwork) {
      taskbarNetwork.classList.toggle("is-offline", offline);
      taskbarNetwork.classList.toggle("is-limited", limited);
      taskbarNetwork.dataset.connectionStatus = status;
      taskbarNetwork.title = labelText + " — " + detailText;
      taskbarNetwork.setAttribute("aria-label", "Network: " + labelText + ". " + detailText);
    }
    updateConnectionPanel(current || {
      status: status,
      label: labelText,
      summary: detailText,
      services: [],
      checkedAt: 0
    });
  }

  function updateTopbarAccount() {
    var session = nativeChatSession();
    var button = document.querySelector("[data-topbar-account]");
    if (!button) return;
    var initial = button.querySelector("[data-topbar-account-initial]");
    var name = session.username || "Guest";
    if (initial) initial.textContent = session.id ? name.charAt(0).toUpperCase() : "?";
    button.classList.toggle("is-signed-in", Boolean(session.id));
    button.title = session.id ? "NEO account: " + name : "Create NEO profile";
    button.setAttribute("aria-label", session.id ? "Open NEO Chat as " + name : "Create a NEO Chat profile");
  }

  function initBatteryStatus() {
    var output = document.querySelector("[data-topbar-battery]");
    var button = output && output.closest(".topbar-battery");
    if (!output || !button || typeof navigator.getBattery !== "function") return;
    navigator.getBattery().then(function (battery) {
      function renderBattery() {
        var percent = Math.round(clamp(Number(battery.level) * 100, 0, 100));
        output.textContent = percent + "%";
        button.classList.toggle("is-charging", Boolean(battery.charging));
        button.setAttribute("aria-label", "Open settings, battery " + percent + " percent" + (battery.charging ? ", charging" : ""));
      }
      battery.addEventListener("levelchange", renderBattery);
      battery.addEventListener("chargingchange", renderBattery);
      renderBattery();
    }).catch(function () {});
  }

  function showToast(title, copy, icon) {
    var notificationPreferences = {};
    try { notificationPreferences = JSON.parse(localStorage.getItem("neo_extended_settings_v1") || "{}"); } catch (_error) {}
    if (notificationPreferences.notifications === false || notificationPreferences.doNotDisturb === true) {
      if (window.NEO_FEATURES && typeof window.NEO_FEATURES.recordNotification === "function") {
        window.NEO_FEATURES.recordNotification(title, copy, icon);
      }
      return;
    }
    if (!toastRegion) return;
    var toast = document.createElement("div");
    toast.className = "neo-toast";
    toast.innerHTML = iconMarkup(icon || "check") + "<span></span>";
    var text = toast.lastElementChild;
    var strong = document.createElement("strong");
    var small = document.createElement("small");
    strong.textContent = title;
    small.textContent = copy || "";
    text.append(strong, small);
    toastRegion.appendChild(toast);
    requestAnimationFrame(function () { toast.classList.add("is-visible"); });
    window.setTimeout(function () {
      toast.classList.add("is-leaving");
      window.setTimeout(function () { toast.remove(); }, 220);
    }, Math.max(2, Math.min(20, Number(notificationPreferences.notificationDuration) || 5)) * 1000);
    if (window.NEO_FEATURES && typeof window.NEO_FEATURES.recordNotification === "function") {
      window.NEO_FEATURES.recordNotification(title, copy, icon);
    }
  }

  function syncDockButton(button, app) {
    var win = openWindows.get(app.id);
    var minimized = Boolean(win && win.classList.contains("is-minimized"));
    var canShowRunningApps = settings.taskbarStyle === "xeno" || settings.taskbarRunningApps;
    button.draggable = Boolean(canShowRunningApps && settings.taskbarAppDragging);
    button.classList.toggle("is-running", Boolean(win));
    button.classList.toggle("is-minimized", minimized);
    button.classList.toggle("is-active", Boolean(win && win.classList.contains("is-active") && !minimized));
    button.setAttribute("aria-label", (minimized ? "Restore " : win ? "Switch to " : "Open ") + appAccessibleName(app));
    button.setAttribute("aria-description", canShowRunningApps && settings.taskbarAppDragging ? "Drag to reorder taskbar apps" : "Taskbar app");
    var label = button.querySelector(".dock-app-name");
    if (label) label.textContent = app.title;
  }

  function createDockButton(app) {
    var button = document.createElement("button");
    button.className = "dock-button is-entering";
    button.type = "button";
    button.dataset.app = app.id;
    button.dataset.tooltip = app.title;
    var art = document.createElement("span");
    art.className = "dock-app-tile dock-app-art app-icon-shape " + appIconClass(app.icon);
    art.innerHTML = iconMarkup(app.icon);
    art.querySelectorAll("img").forEach(function (image) { image.draggable = false; });
    var label = document.createElement("span");
    label.className = "dock-app-name";
    label.textContent = app.title;
    button.append(art, label);
    syncDockButton(button, app);
    window.setTimeout(function () { if (button.isConnected) button.classList.remove("is-entering"); }, 220);
    return button;
  }

  function taskbarAppIds() {
    var visibleIds = [];
    if (settings.taskbarStyle === "xeno") {
      openWindows.forEach(function (_, id) {
        if (apps[id] && visibleIds.indexOf(id) === -1) visibleIds.push(id);
      });
    } else if (performanceMode() === "ultimate") {
      if (apps.control && apps.control.installed) visibleIds.push("control");
    } else if (settings.taskbarStyle === "figure") {
      ["browser", "games", "stream", "youtube-app", "chat", "files", "media", "paint", "terminal", "control"].forEach(function (id) {
        if (apps[id] && apps[id].launcher && apps[id].installed && visibleIds.indexOf(id) === -1) visibleIds.push(id);
      });
      normalizePinnedAppOrder().forEach(function (id) {
        if (apps[id] && apps[id].installed && apps[id].pinned && visibleIds.indexOf(id) === -1) visibleIds.push(id);
      });
    } else {
      normalizePinnedAppOrder().forEach(function (id) {
        if (apps[id] && apps[id].installed && apps[id].pinned && visibleIds.indexOf(id) === -1) visibleIds.push(id);
      });
    }
    openWindows.forEach(function (_, id) {
      if (apps[id] && visibleIds.indexOf(id) === -1) visibleIds.push(id);
    });
    var availableIds = visibleIds;
    var next = settings.taskbarStyle === "figure" ? availableIds.slice() : runningTaskbarOrder.filter(function (id, index, ids) {
      return availableIds.indexOf(id) !== -1 && ids.indexOf(id) === index;
    });
    availableIds.forEach(function (id) { if (next.indexOf(id) === -1) next.push(id); });
    var changed = next.length !== runningTaskbarOrder.length || next.some(function (id, index) {
      return id !== runningTaskbarOrder[index];
    });
    runningTaskbarOrder = next;
    if (changed) writeJson(RUNNING_TASKBAR_ORDER_KEY, runningTaskbarOrder);
    return next.slice();
  }

  function bindTaskbarScrolling(dock) {
    if (!dock || dock.dataset.scrollBound === "true") return;
    dock.dataset.scrollBound = "true";
    dock.addEventListener("wheel", function (event) {
      if ((settings.taskbarPosition !== "bottom" && settings.taskbarStyle !== "figure") || dock.scrollWidth <= dock.clientWidth + 1) return;
      var delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (!delta) return;
      var multiplier = event.deltaMode === 1 ? 18 : event.deltaMode === 2 ? Math.max(1, dock.clientWidth) : 1;
      event.preventDefault();
      dock.scrollLeft += delta * multiplier;
    }, { passive: false });
  }

  function fitDockToViewport(dock) {
    var taskbar = dock && dock.closest(".taskbar");
    if (!taskbar) return;
    taskbar.style.removeProperty("--vertical-dock-hit");
    taskbar.style.removeProperty("--vertical-dock-art");
    taskbar.style.removeProperty("--vertical-dock-gap");
    if (settings.taskbarStyle === "xeno") return;
    if (settings.taskbarPosition !== "left" && settings.taskbarPosition !== "right") return;

    var count = dock.querySelectorAll(".dock-button:not(.is-leaving)").length;
    if (!count) return;
    var viewportHeight = Math.max(320, window.innerHeight || document.documentElement.clientHeight || 720);
    var naturalHit = Math.min(46, Math.max(36, viewportHeight * 0.051));
    var naturalArt = Math.min(34, Math.max(27, viewportHeight * 0.038));
    var naturalGap = Math.min(7, Math.max(2, viewportHeight * 0.0065));
    var centerGap = Math.min(7, Math.max(3, viewportHeight * 0.007));
    var startHeight = 42;
    var verticalPadding = viewportHeight <= 660 ? 12 : 28;
    var trayHeight = settings.taskbarStyle === "typical" ? 66 : 0;
    var available = viewportHeight - verticalPadding - startHeight - trayHeight - (centerGap * 2);
    var fittedHit = Math.floor((available - (naturalGap * Math.max(0, count - 1))) / count);
    var hit = Math.max(28, Math.min(naturalHit, fittedHit));
    var gap = naturalGap;

    if ((hit * count) + (gap * Math.max(0, count - 1)) > available && count > 1) {
      gap = Math.max(0, (available - (hit * count)) / (count - 1));
    }
    if (hit >= naturalHit - 0.25 && gap >= naturalGap - 0.25) return;
    taskbar.style.setProperty("--vertical-dock-hit", hit + "px");
    taskbar.style.setProperty("--vertical-dock-art", Math.max(22, Math.min(naturalArt, hit - 9)) + "px");
    taskbar.style.setProperty("--vertical-dock-gap", gap + "px");
  }

  function renderDock() {
    var dock = document.getElementById("neo-dock");
    if (!dock) return;
    var previousScrollLeft = dock.scrollLeft;
    var previousScrollTop = dock.scrollTop;
    var visibleIds = settings.taskbarStyle === "xeno" || settings.taskbarRunningApps ? taskbarAppIds() : [];
    var visibleSet = new Set(visibleIds);
    Array.from(dock.querySelectorAll(".dock-button[data-app]")).forEach(function (button) {
      var id = button.dataset.app;
      if (visibleSet.has(id)) {
        button.classList.remove("is-leaving");
        return;
      }
      if (button.classList.contains("is-leaving")) return;
      button.classList.add("is-leaving");
      button.draggable = false;
      window.setTimeout(function () {
        if (button.isConnected && !visibleSet.has(id)) button.remove();
        fitDockToViewport(dock);
      }, 190);
    });
    visibleIds.forEach(function (id, index) {
      var app = apps[id];
      var button = Array.from(dock.querySelectorAll(".dock-button[data-app]")).find(function (candidate) {
        return candidate.dataset.app === id;
      });
      if (!button) button = createDockButton(app);
      syncDockButton(button, app);
      var activeChildren = Array.from(dock.children).filter(function (child) {
        return child.classList.contains("dock-button") && !child.classList.contains("is-leaving");
      });
      var current = activeChildren[index] || null;
      if (current !== button) dock.insertBefore(button, current);
      else if (!button.isConnected) dock.appendChild(button);
    });
    fitDockToViewport(dock);
    requestAnimationFrame(function () {
      dock.scrollLeft = previousScrollLeft;
      dock.scrollTop = previousScrollTop;
    });
    syncDesktopShortcutVisibility();
  }

  function clearRunningTaskbarDropMarkers(dock) {
    if (!dock) return;
    dock.querySelectorAll(".is-drop-before, .is-drop-after").forEach(function (button) {
      button.classList.remove("is-drop-before", "is-drop-after");
    });
  }

  function moveRunningTaskbarApp(draggedId, targetId, placeAfter) {
    var ids = taskbarAppIds();
    var from = ids.indexOf(draggedId);
    var target = ids.indexOf(targetId);
    if (from === -1 || target === -1 || draggedId === targetId) return;
    ids.splice(from, 1);
    target = ids.indexOf(targetId) + (placeAfter ? 1 : 0);
    ids.splice(target, 0, draggedId);
    runningTaskbarOrder = ids;
    writeJson(RUNNING_TASKBAR_ORDER_KEY, runningTaskbarOrder);
    renderDock();
    window.dispatchEvent(new CustomEvent("neo-taskbar-order-change", { detail: { order: ids.slice() } }));
  }

  function bindRunningTaskbarDrag() {
    var dock = document.getElementById("neo-dock");
    bindTaskbarScrolling(dock);
    if (!dock || dock.dataset.dragBound === "true") return;
    dock.dataset.dragBound = "true";
    dock.addEventListener("dragstart", function (event) {
      var button = event.target.closest(".dock-button[data-app]");
      if (!button || (settings.taskbarStyle !== "xeno" && !settings.taskbarRunningApps) || !settings.taskbarAppDragging) {
        event.preventDefault();
        return;
      }
      runningTaskbarDragId = button.dataset.app;
      runningTaskbarSuppressOpenUntil = Date.now() + 500;
      button.classList.add("is-dragging");
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", runningTaskbarDragId);
      }
    });
    dock.addEventListener("dragover", function (event) {
      if (!runningTaskbarDragId || (settings.taskbarStyle !== "xeno" && !settings.taskbarRunningApps) || !settings.taskbarAppDragging) return;
      var button = event.target.closest(".dock-button[data-app]");
      if (!button || button.dataset.app === runningTaskbarDragId) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
      clearRunningTaskbarDropMarkers(dock);
      var rect = button.getBoundingClientRect();
      var vertical = settings.taskbarStyle !== "xeno" && settings.taskbarStyle !== "figure" && (settings.taskbarPosition === "left" || settings.taskbarPosition === "right");
      var placeAfter = vertical ? event.clientY >= rect.top + rect.height / 2 : event.clientX >= rect.left + rect.width / 2;
      button.classList.add(placeAfter ? "is-drop-after" : "is-drop-before");
    });
    dock.addEventListener("drop", function (event) {
      var button = event.target.closest(".dock-button[data-app]");
      if (!button || !runningTaskbarDragId) return;
      event.preventDefault();
      var rect = button.getBoundingClientRect();
      var vertical = settings.taskbarStyle !== "xeno" && settings.taskbarStyle !== "figure" && (settings.taskbarPosition === "left" || settings.taskbarPosition === "right");
      var placeAfter = vertical ? event.clientY >= rect.top + rect.height / 2 : event.clientX >= rect.left + rect.width / 2;
      moveRunningTaskbarApp(runningTaskbarDragId, button.dataset.app, placeAfter);
      clearRunningTaskbarDropMarkers(dock);
    });
    dock.addEventListener("dragend", function () {
      runningTaskbarSuppressOpenUntil = Date.now() + 300;
      runningTaskbarDragId = "";
      clearRunningTaskbarDropMarkers(dock);
      dock.querySelectorAll(".is-dragging").forEach(function (button) { button.classList.remove("is-dragging"); });
    });
    dock.addEventListener("keydown", function (event) {
      if ((settings.taskbarStyle !== "xeno" && !settings.taskbarRunningApps) || !settings.taskbarAppDragging || !event.altKey || !event.shiftKey) return;
      var vertical = settings.taskbarStyle !== "xeno" && settings.taskbarStyle !== "figure" && (settings.taskbarPosition === "left" || settings.taskbarPosition === "right");
      var direction = vertical
        ? (event.key === "ArrowUp" ? -1 : (event.key === "ArrowDown" ? 1 : 0))
        : (event.key === "ArrowLeft" ? -1 : (event.key === "ArrowRight" ? 1 : 0));
      if (!direction) return;
      var button = event.target.closest(".dock-button[data-app]");
      var ids = taskbarAppIds();
      var index = button ? ids.indexOf(button.dataset.app) : -1;
      var swap = index + direction;
      if (index === -1 || swap < 0 || swap >= ids.length) return;
      event.preventDefault();
      var targetId = ids[swap];
      moveRunningTaskbarApp(button.dataset.app, targetId, direction > 0);
      var moved = Array.from(dock.querySelectorAll(".dock-button[data-app]")).find(function (candidate) {
        return candidate.dataset.app === button.dataset.app;
      });
      if (moved) moved.focus();
    });
  }

  function normalizePinnedAppOrder() {
    var next = [];
    pinnedAppOrder.forEach(function (id) {
      if (apps[id] && apps[id].launcher && apps[id].installed && apps[id].pinned && next.indexOf(id) === -1) next.push(id);
    });
    launcherApps().forEach(function (app) {
      if (app.pinned && next.indexOf(app.id) === -1) next.push(app.id);
    });
    pinnedAppOrder = next;
    return next.slice();
  }

  function savePinnedAppOrder() {
    writeJson(PINNED_APPS_KEY, normalizePinnedAppOrder());
  }

  function setAppPinned(id, pinned) {
    var app = apps[id];
    if (!app || !app.launcher || !app.installed) return false;
    app.pinned = Boolean(pinned);
    pinnedAppOrder = pinnedAppOrder.filter(function (itemId) { return itemId !== id; });
    if (app.pinned) pinnedAppOrder.push(id);
    savePinnedAppOrder();
    renderDock();
    renderLauncher();
    return app.pinned;
  }

  function storeApps() {
    return Object.keys(apps).map(function (id) { return apps[id]; }).filter(function (app) { return app.launcher; });
  }

  function setAppInstalled(id, installed) {
    var app = apps[id];
    if (!app || !app.launcher || (app.core && !installed)) return false;
    var wasInstalled = Boolean(app.installed);
    app.installed = Boolean(installed);
    if (app.installed) {
      installedAppIds.add(id);
      if (!wasInstalled) {
        hiddenDesktopShortcutIds.delete(id);
        writeJson(DESKTOP_SHORTCUT_HIDDEN_KEY, Array.from(hiddenDesktopShortcutIds));
      }
    }
    else installedAppIds.delete(id);
    if (!app.installed) {
      app.pinned = false;
      pinnedAppOrder = pinnedAppOrder.filter(function (itemId) { return itemId !== id; });
      var open = musicRuntime.getWindow(id, openWindows);
      if (open) closeWindow(open, true);
    }
    writeJson(INSTALLED_APPS_KEY, Array.from(installedAppIds));
    savePinnedAppOrder();
    renderDock();
    renderDesktopShortcuts();
    renderLauncher();
    return app.installed;
  }

  function launcherApps() {
    return storeApps().filter(function (app) { return app.installed; });
  }

  function desktopShortcutView() {
    var value = String(root.dataset.desktopIconSize || "").toLowerCase();
    if (value === "large" || value === "small" || value === "medium") return value;
    try { value = String(localStorage.getItem(DESKTOP_VIEW_KEY) || "").toLowerCase(); } catch (error) { value = ""; }
    return value === "large" || value === "small" ? value : "medium";
  }

  function desktopShortcutMetrics() {
    var view = desktopShortcutView();
    if (view === "large") return { width: 94, height: 88, columnGap: 8, rowGap: 8 };
    if (view === "small") return { width: 74, height: 76, columnGap: 8, rowGap: 6 };
    return { width: 86, height: 94, columnGap: 8, rowGap: 6 };
  }

  function desktopShortcutBounds(metrics) {
    var desktop = document.getElementById("neo-desktop");
    var rect = desktop && desktop.getBoundingClientRect();
    var width = rect && rect.width ? rect.width : Math.max(320, window.innerWidth || 1280);
    var height = rect && rect.height ? rect.height : Math.max(320, window.innerHeight || 720);
    var bounds = { left: 10, top: 42, right: width - metrics.width - 10, bottom: height - metrics.height - 10 };
    var topbar = document.querySelector(".topbar");
    var taskbar = document.querySelector(".taskbar");
    var topbarRect = topbar && topbar.getBoundingClientRect();
    var taskbarRect = taskbar && taskbar.getBoundingClientRect();
    if (rect && topbarRect && topbarRect.height) bounds.top = Math.max(bounds.top, topbarRect.bottom - rect.top + 8);
    if (rect && taskbarRect && taskbarRect.width && taskbarRect.height) {
      var taskbarPosition = settings.taskbarStyle === "figure" ? "bottom" : settings.taskbarPosition;
      if (taskbarPosition === "left") bounds.left = Math.max(bounds.left, taskbarRect.right - rect.left + 8);
      if (taskbarPosition === "right") bounds.right = Math.min(bounds.right, taskbarRect.left - rect.left - metrics.width - 8);
      if (taskbarPosition === "top") bounds.top = Math.max(bounds.top, taskbarRect.bottom - rect.top + 8);
      if (taskbarPosition === "bottom") bounds.bottom = Math.min(bounds.bottom, taskbarRect.top - rect.top - metrics.height - 8);
    }
    bounds.right = Math.max(bounds.left, bounds.right);
    bounds.bottom = Math.max(bounds.top, bounds.bottom);
    return bounds;
  }

  function clampDesktopShortcutPosition(position, metrics, bounds) {
    var x = Number(position && position.x);
    var y = Number(position && position.y);
    if (!Number.isFinite(x)) x = bounds.left;
    if (!Number.isFinite(y)) y = bounds.top;
    return {
      x: Math.round(clamp(x, bounds.left, bounds.right)),
      y: Math.round(clamp(y, bounds.top, bounds.bottom))
    };
  }

  function defaultDesktopShortcutPosition(index, metrics, bounds) {
    var rowStep = metrics.height + metrics.rowGap;
    var columnStep = metrics.width + metrics.columnGap;
    var rowCount = Math.max(1, Math.floor((bounds.bottom - bounds.top + rowStep) / rowStep));
    var row = index % rowCount;
    var column = Math.floor(index / rowCount);
    return clampDesktopShortcutPosition({
      x: bounds.left + column * columnStep,
      y: bounds.top + row * rowStep
    }, metrics, bounds);
  }

  function snapDesktopShortcutPosition(position, metrics, bounds, ignoreId) {
    var columnStep = metrics.width + metrics.columnGap;
    var rowStep = metrics.height + metrics.rowGap;
    var columnCount = Math.max(1, Math.floor((bounds.right - bounds.left) / columnStep) + 1);
    var rowCount = Math.max(1, Math.floor((bounds.bottom - bounds.top) / rowStep) + 1);
    var targetColumn = Math.round((Number(position.x) - bounds.left) / columnStep);
    var targetRow = Math.round((Number(position.y) - bounds.top) / rowStep);
    targetColumn = clamp(targetColumn, 0, columnCount - 1);
    targetRow = clamp(targetRow, 0, rowCount - 1);
    var occupied = new Set();
    desktopShortcutLayer.querySelectorAll(".desktop-shortcut[data-desktop-shortcut]").forEach(function (button) {
      if (button.dataset.desktopShortcut === ignoreId) return;
      var column = Math.round((button.offsetLeft - bounds.left) / columnStep);
      var row = Math.round((button.offsetTop - bounds.top) / rowStep);
      occupied.add(column + ":" + row);
    });
    var best = null;
    for (var columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
      for (var rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
        if (occupied.has(columnIndex + ":" + rowIndex)) continue;
        var distance = Math.pow(columnIndex - targetColumn, 2) + Math.pow(rowIndex - targetRow, 2);
        if (!best || distance < best.distance) best = { column: columnIndex, row: rowIndex, distance: distance };
      }
    }
    if (!best) best = { column: targetColumn, row: targetRow };
    return clampDesktopShortcutPosition({
      x: bounds.left + best.column * columnStep,
      y: bounds.top + best.row * rowStep
    }, metrics, bounds);
  }

  function desktopShortcutTitle(app) {
    if (!app) return "Application";
    if (app.id === "browser") return "Browser";
    return String(app.title || appAccessibleName(app));
  }

  function createDesktopShortcut(app, index) {
    var button = document.createElement("button");
    button.className = "desktop-shortcut";
    button.type = "button";
    button.dataset.desktopShortcut = app.id;
    button.dataset.desktopShortcutIndex = String(index);
    button.dataset.title = desktopShortcutTitle(app);
    button.dataset.category = app.category || "Applications";
    button.setAttribute("aria-label", "Open " + appAccessibleName(app));
    button.draggable = false;
    var icon = createLauncherIcon(app, "desktop-shortcut-icon");
    icon.setAttribute("aria-hidden", "true");
    icon.querySelectorAll("img").forEach(function (image) { image.draggable = false; });
    var label = document.createElement("span");
    label.className = "desktop-shortcut-label";
    label.textContent = desktopShortcutTitle(app);
    button.append(icon, label);
    return button;
  }

  function layoutDesktopShortcuts() {
    if (!desktopShortcutLayer) return;
    var metrics = desktopShortcutMetrics();
    var bounds = desktopShortcutBounds(metrics);
    desktopShortcutLayer.querySelectorAll(".desktop-shortcut[data-desktop-shortcut]").forEach(function (button) {
      var id = button.dataset.desktopShortcut;
      var saved = desktopShortcutLayout[id];
      var index = Number(button.dataset.desktopShortcutIndex) || 0;
      var position = saved && Number.isFinite(Number(saved.x)) && Number.isFinite(Number(saved.y))
        ? clampDesktopShortcutPosition(saved, metrics, bounds)
        : defaultDesktopShortcutPosition(index, metrics, bounds);
      button.style.left = position.x + "px";
      button.style.top = position.y + "px";
    });
  }

  function renderDesktopShortcuts() {
    if (!desktopShortcutLayer) return;
    var focusedId = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.desktopShortcut;
    var fragment = document.createDocumentFragment();
    launcherApps().filter(function (app) { return !hiddenDesktopShortcutIds.has(app.id); }).forEach(function (app, index) {
      fragment.appendChild(createDesktopShortcut(app, index));
    });
    desktopShortcutLayer.textContent = "";
    desktopShortcutLayer.appendChild(fragment);
    layoutDesktopShortcuts();
    if (focusedId) {
      var focused = desktopShortcutLayer.querySelector('[data-desktop-shortcut="' + CSS.escape(focusedId) + '"]');
      if (focused) focused.focus({ preventScroll: true });
    }
    syncDesktopShortcutRestoreControl();
  }

  function syncDesktopShortcutVisibility() {
    if (!desktopShortcutLayer) return;
    var hidden = desktopShortcutsManuallyHidden;
    if (!hidden) {
      openWindows.forEach(function (win) {
        if (!win || !win.isConnected || win.classList.contains("is-minimized") || win.classList.contains("is-closing")) return;
        hidden = true;
      });
    }
    root.dataset.desktopShortcutsHidden = hidden ? "true" : "false";
    desktopShortcutLayer.toggleAttribute("inert", hidden);
    desktopShortcutLayer.setAttribute("aria-hidden", hidden ? "true" : "false");
    if (hidden) closeDesktopShortcutContextMenu();
  }

  function setDesktopShortcutsManuallyHidden(hidden) {
    hidden = Boolean(hidden);
    if (desktopShortcutsManuallyHidden === hidden) {
      syncDesktopShortcutVisibility();
      return;
    }
    desktopShortcutsManuallyHidden = hidden;
    writeJson(DESKTOP_SHORTCUTS_ALL_HIDDEN_KEY, hidden);
    syncDesktopShortcutVisibility();
    showToast(
      hidden ? "Desktop icons hidden" : "Desktop icons shown",
      hidden ? "Your app positions are saved. Right-click the desktop to show every icon again." : "All desktop app icons are visible again.",
      "apps"
    );
  }

  function syncDesktopShortcutRestoreControl() {
    var restore = document.querySelector("[data-restore-desktop-shortcuts]");
    if (restore) restore.hidden = hiddenDesktopShortcutIds.size === 0;
  }

  function restoreDesktopShortcuts() {
    if (!hiddenDesktopShortcutIds.size) return;
    hiddenDesktopShortcutIds.clear();
    writeJson(DESKTOP_SHORTCUT_HIDDEN_KEY, []);
    renderDesktopShortcuts();
    showToast("Desktop icons restored", "Removed app shortcuts are back on the desktop.", "apps");
  }

  function scheduleDesktopShortcutRender() {
    if (desktopShortcutRenderFrame) cancelAnimationFrame(desktopShortcutRenderFrame);
    desktopShortcutRenderFrame = requestAnimationFrame(function () {
      desktopShortcutRenderFrame = 0;
      renderDesktopShortcuts();
    });
  }

  function setDesktopShortcutView(value) {
    value = value === "large" || value === "small" ? value : "medium";
    try { localStorage.setItem(DESKTOP_VIEW_KEY, value); } catch (error) {}
    root.dataset.desktopIconSize = value;
    scheduleDesktopShortcutRender();
  }

  function closeDesktopShortcutContextMenu() {
    if (!desktopShortcutContextMenu) return;
    desktopShortcutContextMenu.hidden = true;
    desktopShortcutContextAppId = "";
  }

  function ensureDesktopShortcutContextMenu() {
    if (desktopShortcutContextMenu) return desktopShortcutContextMenu;
    var menu = document.createElement("div");
    menu.id = "desktop-shortcut-context-menu";
    menu.className = "desktop-context-menu desktop-shortcut-context-menu";
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", "Desktop application options");
    menu.hidden = true;
    menu.innerHTML =
      '<button type="button" role="menuitem" data-desktop-shortcut-menu-action="open"><span class="desktop-menu-app-icon" aria-hidden="true"></span><span data-desktop-shortcut-menu-open>Open app</span></button>' +
      '<span class="context-separator" role="separator"></span>' +
      '<button type="button" role="menuitemcheckbox" aria-checked="false" data-desktop-shortcut-menu-action="size"><span class="context-check" aria-hidden="true"></span><span>Large icons (hide names)</span></button>' +
      '<button type="button" role="menuitem" data-desktop-shortcut-menu-action="reset"><svg class="icon" aria-hidden="true"><use href="#i-refresh"></use></svg><span>Reset icon position</span></button>' +
      '<span class="context-separator" role="separator"></span>' +
      '<button type="button" role="menuitem" data-desktop-shortcut-menu-action="remove"><svg class="icon" aria-hidden="true"><use href="#i-trash"></use></svg><span>Remove from desktop</span></button>';
    menu.addEventListener("contextmenu", function (event) { event.preventDefault(); });
    menu.addEventListener("click", function (event) {
      var actionButton = event.target.closest("[data-desktop-shortcut-menu-action]");
      if (!actionButton) return;
      var action = actionButton.dataset.desktopShortcutMenuAction;
      var appId = desktopShortcutContextAppId;
      if (action === "open" && appId) openApp(appId);
      if (action === "size") {
        var large = desktopShortcutView() !== "large";
        setDesktopShortcutView(large ? "large" : "medium");
        showToast(large ? "Large desktop icons" : "Normal desktop icons", large ? "All desktop apps are larger and their names are hidden." : "Desktop app names are visible again.", "apps");
      }
      if (action === "reset" && appId) {
        delete desktopShortcutLayout[appId];
        writeJson(DESKTOP_SHORTCUT_LAYOUT_KEY, desktopShortcutLayout);
        renderDesktopShortcuts();
      }
      if (action === "remove" && appId) {
        var removedApp = apps[appId];
        hiddenDesktopShortcutIds.add(appId);
        delete desktopShortcutLayout[appId];
        writeJson(DESKTOP_SHORTCUT_HIDDEN_KEY, Array.from(hiddenDesktopShortcutIds));
        writeJson(DESKTOP_SHORTCUT_LAYOUT_KEY, desktopShortcutLayout);
        renderDesktopShortcuts();
        showToast("Removed from desktop", desktopShortcutTitle(removedApp) + " is still available in Applications.", "apps");
      }
      closeDesktopShortcutContextMenu();
    });
    document.body.appendChild(menu);
    desktopShortcutContextMenu = menu;
    return menu;
  }

  function syncDesktopShortcutContextMenu(menu, app) {
    var art = menu.querySelector(".desktop-menu-app-icon");
    var label = menu.querySelector("[data-desktop-shortcut-menu-open]");
    if (art && app) {
      art.className = "desktop-menu-app-icon app-icon-shape " + appIconClass(app.icon);
      art.innerHTML = iconMarkup(app.icon);
      art.querySelectorAll("img").forEach(function (image) { image.draggable = false; });
    }
    if (label && app) label.textContent = "Open " + desktopShortcutTitle(app);
    var size = menu.querySelector('[data-desktop-shortcut-menu-action="size"]');
    if (size) size.setAttribute("aria-checked", desktopShortcutView() === "large" ? "true" : "false");
  }

  function openDesktopShortcutContextMenu(button, x, y) {
    var app = button && apps[button.dataset.desktopShortcut];
    if (!app) return;
    if (window.NEO_FEATURES && typeof window.NEO_FEATURES.closeOverlays === "function") window.NEO_FEATURES.closeOverlays();
    setLauncherOpen(false);
    var menu = ensureDesktopShortcutContextMenu();
    desktopShortcutContextAppId = app.id;
    syncDesktopShortcutContextMenu(menu, app);
    menu.hidden = false;
    requestAnimationFrame(function () {
      var rect = menu.getBoundingClientRect();
      menu.style.left = Math.max(8, Math.min(x, window.innerWidth - rect.width - 8)) + "px";
      menu.style.top = Math.max(8, Math.min(y, window.innerHeight - rect.height - 8)) + "px";
      var first = menu.querySelector("button:not([disabled])");
      if (first) first.focus({ preventScroll: true });
    });
  }

  function openDesktopShortcut(button) {
    if (!button || Date.now() < desktopShortcutSuppressOpenUntil) return;
    button.dataset.openedAt = String(Date.now());
    openApp(button.dataset.desktopShortcut);
  }

  function bindDesktopShortcutInteractions() {
    if (!desktopShortcutLayer || desktopShortcutLayer.dataset.interactionsReady === "true") return;
    desktopShortcutLayer.dataset.interactionsReady = "true";

    desktopShortcutLayer.addEventListener("pointerdown", function (event) {
      if (event.button !== 0 || !event.isPrimary) return;
      var button = event.target.closest(".desktop-shortcut[data-desktop-shortcut]");
      if (!button) return;
      closeDesktopShortcutContextMenu();
      desktopShortcutLayer.querySelectorAll(".desktop-shortcut.is-selected").forEach(function (item) { item.classList.remove("is-selected"); });
      button.classList.add("is-selected");
      button.focus({ preventScroll: true });
      desktopShortcutDrag = {
        button: button,
        id: button.dataset.desktopShortcut,
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        startX: event.clientX,
        startY: event.clientY,
        originX: button.offsetLeft,
        originY: button.offsetTop,
        x: button.offsetLeft,
        y: button.offsetTop,
        moved: false
      };
      try { button.setPointerCapture(event.pointerId); } catch (error) {}
    });

    desktopShortcutLayer.addEventListener("pointermove", function (event) {
      var drag = desktopShortcutDrag;
      if (!drag || event.pointerId !== drag.pointerId) return;
      var dx = event.clientX - drag.startX;
      var dy = event.clientY - drag.startY;
      if (!drag.moved && Math.hypot(dx, dy) < 5) return;
      drag.moved = true;
      event.preventDefault();
      drag.button.classList.add("is-dragging");
      var metrics = desktopShortcutMetrics();
      var position = clampDesktopShortcutPosition({ x: drag.originX + dx, y: drag.originY + dy }, metrics, desktopShortcutBounds(metrics));
      drag.x = position.x;
      drag.y = position.y;
      drag.button.style.left = position.x + "px";
      drag.button.style.top = position.y + "px";
    }, { passive: false });

    function finishDesktopShortcutDrag(event) {
      var drag = desktopShortcutDrag;
      if (!drag || (event.pointerId != null && event.pointerId !== drag.pointerId)) return;
      desktopShortcutDrag = null;
      drag.button.classList.remove("is-dragging");
      if (drag.moved) {
        desktopShortcutSuppressOpenUntil = Date.now() + 500;
        var metrics = desktopShortcutMetrics();
        var snapped = snapDesktopShortcutPosition({ x: drag.x, y: drag.y }, metrics, desktopShortcutBounds(metrics), drag.id);
        drag.button.classList.add("is-snapping");
        drag.button.style.left = snapped.x + "px";
        drag.button.style.top = snapped.y + "px";
        window.setTimeout(function () { if (drag.button) drag.button.classList.remove("is-snapping"); }, 150);
        desktopShortcutLayout[drag.id] = snapped;
        writeJson(DESKTOP_SHORTCUT_LAYOUT_KEY, desktopShortcutLayout);
      } else if (drag.pointerType === "touch" || drag.pointerType === "pen") {
        openDesktopShortcut(drag.button);
      }
    }

    desktopShortcutLayer.addEventListener("pointerup", finishDesktopShortcutDrag);
    desktopShortcutLayer.addEventListener("pointercancel", finishDesktopShortcutDrag);
    desktopShortcutLayer.addEventListener("lostpointercapture", finishDesktopShortcutDrag);
    document.addEventListener("pointerup", finishDesktopShortcutDrag, true);
    document.addEventListener("pointercancel", finishDesktopShortcutDrag, true);
    desktopShortcutLayer.addEventListener("dblclick", function (event) {
      var button = event.target.closest(".desktop-shortcut[data-desktop-shortcut]");
      if (!button) return;
      event.preventDefault();
      openDesktopShortcut(button);
    });
    desktopShortcutLayer.addEventListener("keydown", function (event) {
      var button = event.target.closest(".desktop-shortcut[data-desktop-shortcut]");
      if (!button) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openDesktopShortcut(button);
      }
      if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
        event.preventDefault();
        var rect = button.getBoundingClientRect();
        openDesktopShortcutContextMenu(button, rect.left + rect.width / 2, rect.top + rect.height / 2);
      }
    });
    desktopShortcutLayer.addEventListener("contextmenu", function (event) {
      var button = event.target.closest(".desktop-shortcut[data-desktop-shortcut]");
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      openDesktopShortcutContextMenu(button, event.clientX, event.clientY);
    });
    document.addEventListener("pointerdown", function (event) {
      if (!event.target.closest(".desktop-shortcut")) {
        desktopShortcutLayer.querySelectorAll(".desktop-shortcut.is-selected").forEach(function (item) { item.classList.remove("is-selected"); });
      }
      if (!desktopShortcutContextMenu || desktopShortcutContextMenu.hidden || event.target.closest("#desktop-shortcut-context-menu")) return;
      closeDesktopShortcutContextMenu();
    }, true);
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && desktopShortcutContextMenu && !desktopShortcutContextMenu.hidden) closeDesktopShortcutContextMenu();
    });
  }

  function initializeDesktopShortcuts() {
    var view = "medium";
    try {
      var storedView = String(localStorage.getItem(DESKTOP_VIEW_KEY) || "").toLowerCase();
      if (storedView === "large" || storedView === "small" || storedView === "medium") view = storedView;
    } catch (error) {}
    root.dataset.desktopIconSize = view;
    bindDesktopShortcutInteractions();
    if (typeof MutationObserver === "function") {
      new MutationObserver(function () { scheduleDesktopShortcutRender(); }).observe(root, { attributes: true, attributeFilter: ["data-desktop-icon-size"] });
    }
    renderDesktopShortcuts();
    syncDesktopShortcutVisibility();
  }

  function normalizeSearchValue(value) {
    return String(value || "").toLocaleLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();
  }

  function subsequenceScore(query, candidate) {
    var queryIndex = 0;
    var gaps = 0;
    for (var index = 0; index < candidate.length && queryIndex < query.length; index += 1) {
      if (candidate[index] === query[queryIndex]) queryIndex += 1;
      else if (queryIndex > 0) gaps += 1;
    }
    return queryIndex === query.length ? Math.max(1, 35 - gaps) : 0;
  }

  function launcherMatchScore(app, rawQuery) {
    var query = normalizeSearchValue(rawQuery);
    if (!query) return app.pinned ? 20 : 10;
    var values = [app.title, app.subtitle, app.category].concat(app.aliases || []).map(normalizeSearchValue).filter(Boolean);
    var best = 0;
    values.forEach(function (value) {
      if (value === query) best = Math.max(best, 120);
      if (value.indexOf(query) === 0) best = Math.max(best, 95 - Math.min(20, value.length - query.length));
      if (value.split(" ").some(function (word) { return word.indexOf(query) === 0; })) best = Math.max(best, 75);
      if (value.indexOf(query) !== -1) best = Math.max(best, 60);
      best = Math.max(best, subsequenceScore(query, value));
    });
    return best ? best + (app.pinned ? 4 : 0) : 0;
  }

  function searchLauncherApps(query) {
    return launcherApps().map(function (app) {
      return { app: app, score: launcherMatchScore(app, query) };
    }).filter(function (item) {
      return item.score > 0;
    }).sort(function (left, right) {
      return right.score - left.score || left.app.title.localeCompare(right.app.title);
    }).map(function (item) {
      return item.app;
    });
  }

  function createLauncherIcon(app, className) {
    var icon = document.createElement("span");
    icon.className = (className || "launcher-app-icon") + " app-icon-shape " + appIconClass(app.icon);
    icon.innerHTML = iconMarkup(app.icon);
    return icon;
  }

  function appDisplayTitle(app) {
    return app && !app.hideName ? String(app.title || "") : "";
  }

  function appAccessibleName(app) {
    return String((app && (app.accessibleName || app.title)) || "Application");
  }

  function setWindowMotionOrigin(win, appId) {
    if (!win) return;
    var winRect = win.getBoundingClientRect();
    if (!winRect.width || !winRect.height) return;
    var dockButton = Array.from(document.querySelectorAll(".taskbar .dock-button[data-app]")).find(function (button) {
      return button.dataset.app === appId && button.getClientRects().length > 0;
    });
    var target = dockButton || document.querySelector(".taskbar");
    var targetRect = target && target.getBoundingClientRect();
    var targetX = targetRect && targetRect.width ? targetRect.left + targetRect.width / 2 : winRect.left + winRect.width / 2;
    var targetY = targetRect && targetRect.height ? targetRect.top + targetRect.height / 2 : winRect.top + winRect.height;
    var centerX = winRect.left + winRect.width / 2;
    var centerY = winRect.top + winRect.height / 2;
    var travelX = clamp((targetX - centerX) * 0.18, -56, 56);
    var travelY = clamp((targetY - centerY) * 0.18, -56, 56);
    var originX = clamp(((targetX - winRect.left) / winRect.width) * 100, 6, 94);
    var originY = clamp(((targetY - winRect.top) / winRect.height) * 100, 6, 94);
    win.style.setProperty("--neo-window-motion-origin-x", originX.toFixed(2) + "%");
    win.style.setProperty("--neo-window-motion-origin-y", originY.toFixed(2) + "%");
    win.style.setProperty("--neo-window-enter-x", (travelX * 0.42).toFixed(1) + "px");
    win.style.setProperty("--neo-window-enter-y", (travelY * 0.42).toFixed(1) + "px");
    win.style.setProperty("--neo-window-exit-x", travelX.toFixed(1) + "px");
    win.style.setProperty("--neo-window-exit-y", travelY.toFixed(1) + "px");
  }

  function cancelWindowMotion(win) {
    if (!win) return;
    if (typeof win._neoWindowMotionCancel === "function") win._neoWindowMotionCancel();
    win._neoWindowMotionCancel = null;
    win.classList.remove("is-opening", "is-restoring", "is-minimizing");
  }

  function playWindowMotion(win, phase, fallbackDuration, onComplete) {
    if (!win) return;
    cancelWindowMotion(win);
    var className = "is-" + phase;
    var animationName = "neo-window-" + (phase === "opening" ? "open" : phase === "restoring" ? "restore" : phase === "minimizing" ? "minimize" : "close");
    var complete = false;
    var timer = 0;
    function cleanup(runCallback) {
      if (complete) return;
      complete = true;
      window.clearTimeout(timer);
      win.removeEventListener("animationend", handleAnimationEnd);
      win.classList.remove(className);
      if (win._neoWindowMotionCancel === cancel) win._neoWindowMotionCancel = null;
      if (runCallback && typeof onComplete === "function") onComplete();
    }
    function cancel() { cleanup(false); }
    function handleAnimationEnd(event) {
      if (event.target === win && event.animationName === animationName) cleanup(true);
    }
    win._neoWindowMotionCancel = cancel;
    if (effectiveReducedMotion()) {
      cleanup(true);
      return;
    }
    win.classList.add(className);
    win.addEventListener("animationend", handleAnimationEnd);
    timer = window.setTimeout(function () {
      cleanup(true);
    }, Math.round(fallbackDuration * (100 / settings.animationSpeed)));
  }

  function createPinnedApp(app) {
    var button = document.createElement("button");
    button.className = "launcher-app";
    button.type = "button";
    button.dataset.app = app.id;
    button.title = app.subtitle;
    button.setAttribute("aria-label", "Open " + appAccessibleName(app));
    button.appendChild(createLauncherIcon(app));
    if (!app.hideName) {
      var label = document.createElement("span");
      label.textContent = app.title;
      button.appendChild(label);
    }
    return button;
  }

  function createDetailedApp(app, className, role) {
    var button = document.createElement("button");
    button.className = className;
    button.type = "button";
    button.dataset.app = app.id;
    button.setAttribute("aria-label", "Open " + appAccessibleName(app));
    if (role) button.setAttribute("role", role);
    button.appendChild(createLauncherIcon(app, "launcher-detail-icon"));
    var copy = document.createElement("span");
    var title = document.createElement("strong");
    var detail = document.createElement("small");
    title.textContent = appDisplayTitle(app);
    title.hidden = app.hideName === true;
    detail.textContent = app.category || app.subtitle;
    copy.append(title, detail);
    button.appendChild(copy);
    return button;
  }

  function renderLauncherRecent() {
    if (!launcherRecent || !launcherRecentEmpty) return;
    var recentIds = readJson(RECENT_APPS_KEY, []);
    if (!Array.isArray(recentIds)) recentIds = [];
    var recentApps = recentIds.map(function (id) { return apps[id]; }).filter(function (app) { return app && app.launcher; }).slice(0, 6);
    launcherRecent.textContent = "";
    recentApps.forEach(function (app) { launcherRecent.appendChild(createDetailedApp(app, "recent-app")); });
    launcherRecentEmpty.hidden = recentApps.length > 0;
    launcherRecent.hidden = recentApps.length === 0;
  }

  function renderLauncherCategories() {
    if (!launcherCategories) return;
    var groups = new Map();
    launcherApps().forEach(function (app) {
      var category = app.category || "Applications";
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category).push(app);
    });
    launcherCategories.textContent = "";
    groups.forEach(function (items, category) {
      var group = document.createElement("article");
      group.className = "category-group";
      group.dataset.launcherCategory = category;
      var icons = document.createElement("div");
      icons.className = "category-icons";
      items.slice(0, 4).forEach(function (app) {
        var button = document.createElement("button");
        button.type = "button";
        button.dataset.app = app.id;
        if (!app.hideName) button.title = app.title;
        button.setAttribute("aria-label", "Open " + appAccessibleName(app));
        button.appendChild(createLauncherIcon(app, "launcher-category-icon"));
        icons.appendChild(button);
      });
      var label = document.createElement("span");
      label.textContent = category;
      var browse = document.createElement("button");
      browse.type = "button";
      browse.className = "launcher-category-browse";
      var browseLabel = document.createElement("span");
      browseLabel.textContent = "View all";
      var browseIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      browseIcon.setAttribute("class", "icon launcher-category-browse-icon");
      browseIcon.setAttribute("aria-hidden", "true");
      var browseIconUse = document.createElementNS("http://www.w3.org/2000/svg", "use");
      browseIconUse.setAttribute("href", "#i-arrow-right");
      browseIcon.appendChild(browseIconUse);
      browse.append(browseLabel, browseIcon);
      browse.setAttribute("aria-label", "View all " + category + " applications");
      browse.addEventListener("click", function () {
        launcherSearch.value = category;
        launcherSelectedIndex = 0;
        filterLauncher(category);
        launcherSearch.focus({ preventScroll: true });
      });
      group.append(icons, label, browse);
      launcherCategories.appendChild(group);
    });
  }

  function renderLauncher() {
    if (!launcherGrid) return;
    var available = launcherApps();
    var ordered = available.filter(function (app) { return app.pinned; });
    if (!ordered.length) ordered = available.slice().sort(function (left, right) {
      return appAccessibleName(left).localeCompare(appAccessibleName(right));
    }).slice(0, 8);
    launcherGrid.textContent = "";
    ordered.forEach(function (app) { launcherGrid.appendChild(createPinnedApp(app)); });
    var toggle = launcher.querySelector("[data-launcher-toggle-all]");
    if (toggle) {
      toggle.hidden = true;
      toggle.setAttribute("aria-expanded", launcherShowAll ? "true" : "false");
      var label = toggle.querySelector("span");
      if (label) label.textContent = launcherShowAll ? "Show less" : "Show all";
      toggle.classList.toggle("is-expanded", launcherShowAll);
    }
    renderLauncherRecent();
    renderLauncherCategories();
    filterLauncher(launcherSearch ? launcherSearch.value : "");
  }

  function recordRecentApp(id) {
    var recentIds = readJson(RECENT_APPS_KEY, []);
    if (!Array.isArray(recentIds)) recentIds = [];
    recentIds = [id].concat(recentIds.filter(function (item) { return item !== id; })).slice(0, 6);
    writeJson(RECENT_APPS_KEY, recentIds);
    renderLauncherRecent();
  }

  function launcherIsOpen() {
    return Boolean(launcher && !launcher.hidden && !launcher.classList.contains("is-closing"));
  }

  function syncLauncherButtons(open) {
    document.querySelectorAll("[data-open-launcher]").forEach(function (button) {
      button.setAttribute("aria-expanded", String(Boolean(open)));
    });
  }

  function finishLauncherClose() {
    launcher.classList.remove("is-open", "is-opening", "is-closing");
    launcher.hidden = true;
    if (launcherDismissLayer) {
      launcherDismissLayer.classList.remove("is-open", "is-opening", "is-closing");
      launcherDismissLayer.hidden = true;
    }
    root.classList.remove("neo-launcher-open");
  }

  function setLauncherOpen(open, returnFocus) {
    if (!launcher) return;
    window.cancelAnimationFrame(launcherMotionFrame);
    window.clearTimeout(launcherMotionTimer);
    if (open) {
      setXenoCommandOpen(false);
      if (!launcherIsOpen()) launcherReturnFocus = returnFocus || document.activeElement;
      root.classList.add("neo-launcher-open");
      syncLauncherButtons(true);
      if (launcherDismissLayer) {
        launcherDismissLayer.hidden = false;
        launcherDismissLayer.classList.remove("is-open", "is-closing");
        launcherDismissLayer.classList.add("is-opening");
      }
      launcher.hidden = false;
      launcher.removeAttribute("inert");
      launcher.setAttribute("aria-hidden", "false");
      launcher.classList.remove("is-open", "is-closing");
      launcher.classList.add("is-opening");
      renderLauncher();
      launcherSearch.value = "";
      launcherSelectedIndex = 0;
      filterLauncher("");
      var launcherScroll = launcher.querySelector(".launcher-scroll-region");
      if (launcherScroll) launcherScroll.scrollTop = 0;
      void launcher.offsetWidth;
      launcherMotionFrame = requestAnimationFrame(function () {
        if (launcherScroll) launcherScroll.scrollTop = 0;
        launcher.classList.add("is-open");
        if (launcherDismissLayer) launcherDismissLayer.classList.add("is-open");
        if (isSmallScreen()) {
          launcher.tabIndex = -1;
          launcher.focus({ preventScroll: true });
        } else {
          launcherSearch.focus();
        }
      });
      launcherMotionTimer = window.setTimeout(function () {
        launcher.classList.remove("is-opening");
        if (launcherDismissLayer) launcherDismissLayer.classList.remove("is-opening");
      }, 320);
    } else {
      if (launcher.hidden || launcher.classList.contains("is-closing")) return;
      syncLauncherButtons(false);
      launcher.setAttribute("aria-hidden", "true");
      launcher.setAttribute("inert", "");
      launcher.classList.remove("is-open", "is-opening");
      launcher.classList.add("is-closing");
      if (launcherDismissLayer) {
        launcherDismissLayer.classList.remove("is-open", "is-opening");
        launcherDismissLayer.classList.add("is-closing");
      }
      if (launcherReturnFocus && document.contains(launcherReturnFocus)) launcherReturnFocus.focus();
      launcherReturnFocus = null;
      if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) finishLauncherClose();
      else launcherMotionTimer = window.setTimeout(finishLauncherClose, 260);
    }
  }

  function filterLauncher(value) {
    var query = normalizeSearchValue(value);
    launcher.querySelectorAll("[data-launcher-home]").forEach(function (section) { section.hidden = Boolean(query); });
    if (!launcherResults || !launcherResultList) return;
    launcherResults.hidden = !query;
    launcherResultList.textContent = "";
    if (!query) return;
    var results = searchLauncherApps(query).slice(0, 24);
    launcherSelectedIndex = Math.min(launcherSelectedIndex, Math.max(0, results.length - 1));
    results.forEach(function (app, index) {
      var button = createPinnedApp(app);
      button.classList.add("search-result");
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", index === launcherSelectedIndex ? "true" : "false");
      button.classList.toggle("is-selected", index === launcherSelectedIndex);
      button.dataset.launcherResultIndex = String(index);
      launcherResultList.appendChild(button);
    });
    if (launcherResultCount) launcherResultCount.textContent = results.length + (results.length === 1 ? " result" : " results");
    if (launcherSearchEmpty) launcherSearchEmpty.hidden = results.length > 0;
  }

  function moveLauncherSelection(direction) {
    var buttons = Array.from(launcherResultList.querySelectorAll(".search-result"));
    if (!buttons.length) return;
    launcherSelectedIndex = clamp(launcherSelectedIndex + direction, 0, buttons.length - 1);
    buttons.forEach(function (button, index) {
      var selected = index === launcherSelectedIndex;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-selected", selected ? "true" : "false");
    });
  }

  function xenoCommandIsOpen() {
    return Boolean(xenoCommand && !xenoCommand.hidden && !xenoCommand.classList.contains("is-closing"));
  }

  function createXenoCommandItem(app, index) {
    var button = document.createElement("button");
    button.className = "xeno-command-item";
    button.type = "button";
    button.dataset.app = app.id;
    button.dataset.xenoCommandItem = "";
    button.dataset.xenoCommandIndex = String(index);
    button.setAttribute("role", "option");
    button.setAttribute("aria-label", (openWindows.has(app.id) ? "Switch to " : "Open ") + appAccessibleName(app));
    button.appendChild(createLauncherIcon(app, "xeno-command-icon"));
    var copy = document.createElement("span");
    copy.className = "xeno-command-copy";
    var title = document.createElement("strong");
    title.textContent = app.title;
    var detail = document.createElement("small");
    detail.textContent = app.subtitle || app.category || "Application";
    copy.append(title, detail);
    var state = document.createElement("span");
    state.className = "xeno-command-state";
    var runningWindow = openWindows.get(app.id);
    if (runningWindow) {
      button.classList.add("is-running");
      if (runningWindow.classList.contains("is-minimized")) button.classList.add("is-minimized");
      if (runningWindow.classList.contains("is-active")) button.classList.add("is-active");
      state.textContent = runningWindow.classList.contains("is-minimized") ? "RESTORE" : "OPEN";
    } else {
      state.textContent = "↵";
      state.setAttribute("aria-hidden", "true");
    }
    button.append(copy, state);
    return button;
  }

  function xenoCommandApps(query) {
    var available = launcherApps();
    if (normalizeSearchValue(query)) return searchLauncherApps(query);
    return available.slice().sort(function (left, right) {
      return String(left.category || "Applications").localeCompare(String(right.category || "Applications"))
        || left.title.localeCompare(right.title);
    });
  }

  function syncXenoCommandSelection(scroll) {
    if (!xenoCommandResults) return;
    var buttons = Array.from(xenoCommandResults.querySelectorAll("[data-xeno-command-item]"));
    if (!buttons.length) {
      xenoCommandSelectedIndex = 0;
      return;
    }
    xenoCommandSelectedIndex = clamp(xenoCommandSelectedIndex, 0, buttons.length - 1);
    buttons.forEach(function (button, index) {
      var selected = index === xenoCommandSelectedIndex;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-selected", selected ? "true" : "false");
    });
    if (scroll) buttons[xenoCommandSelectedIndex].scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  function renderXenoCommand() {
    if (!xenoCommand || !xenoCommandResults) return;
    var mode = xenoCommand.dataset.mode === "apps" ? "apps" : "search";
    var query = xenoCommandSearch ? xenoCommandSearch.value : "";
    var matches = xenoCommandApps(query);
    xenoCommandResults.textContent = "";
    if (mode === "apps") {
      var groups = new Map();
      matches.forEach(function (app) {
        var category = app.category || "Applications";
        if (!groups.has(category)) groups.set(category, []);
        groups.get(category).push(app);
      });
      var index = 0;
      groups.forEach(function (items, category) {
        var group = document.createElement("section");
        group.className = "xeno-command-group";
        group.setAttribute("aria-label", category);
        var heading = document.createElement("h3");
        heading.textContent = category;
        var list = document.createElement("div");
        list.className = "xeno-command-grid";
        items.forEach(function (app) { list.appendChild(createXenoCommandItem(app, index++)); });
        group.append(heading, list);
        xenoCommandResults.appendChild(group);
      });
    } else {
      matches.slice(0, 28).forEach(function (app, index) {
        xenoCommandResults.appendChild(createXenoCommandItem(app, index));
      });
    }
    if (xenoCommandEmpty) xenoCommandEmpty.hidden = matches.length > 0;
    syncXenoCommandSelection(false);
  }

  function moveXenoCommandSelection(direction) {
    var buttons = xenoCommandResults ? Array.from(xenoCommandResults.querySelectorAll("[data-xeno-command-item]")) : [];
    if (!buttons.length) return;
    xenoCommandSelectedIndex = (xenoCommandSelectedIndex + direction + buttons.length) % buttons.length;
    syncXenoCommandSelection(true);
  }

  function finishXenoCommandClose() {
    if (!xenoCommand) return;
    xenoCommand.classList.remove("is-open", "is-opening", "is-closing");
    xenoCommand.hidden = true;
    if (xenoCommandDismiss) {
      xenoCommandDismiss.classList.remove("is-open", "is-opening", "is-closing");
      xenoCommandDismiss.hidden = true;
    }
    root.classList.remove("neo-xeno-command-open");
  }

  function setXenoCommandOpen(open, mode, returnFocus) {
    if (!xenoCommand) return;
    window.cancelAnimationFrame(xenoCommandMotionFrame);
    window.clearTimeout(xenoCommandMotionTimer);
    if (open) {
      if (settings.taskbarStyle !== "xeno") return;
      setLauncherOpen(false);
      if (!xenoCommandIsOpen()) xenoCommandReturnFocus = returnFocus || document.activeElement;
      xenoCommand.dataset.mode = mode === "apps" ? "apps" : "search";
      if (xenoCommandTitle) xenoCommandTitle.textContent = mode === "apps" ? "ALL APPLICATIONS" : "APPS";
      if (xenoCommandKey) xenoCommandKey.textContent = mode === "apps" ? "CTRL" : "SPACE";
      if (xenoCommandSearch) {
        xenoCommandSearch.value = "";
        xenoCommandSearch.placeholder = mode === "apps" ? "Filter applications" : "Search apps, media, tools…";
      }
      xenoCommandSelectedIndex = 0;
      renderXenoCommand();
      root.classList.add("neo-xeno-command-open");
      xenoCommand.hidden = false;
      xenoCommand.removeAttribute("inert");
      xenoCommand.setAttribute("aria-hidden", "false");
      xenoCommand.classList.remove("is-open", "is-closing");
      xenoCommand.classList.add("is-opening");
      if (xenoCommandDismiss) {
        xenoCommandDismiss.hidden = false;
        xenoCommandDismiss.classList.remove("is-open", "is-closing");
        xenoCommandDismiss.classList.add("is-opening");
      }
      void xenoCommand.offsetWidth;
      xenoCommandMotionFrame = requestAnimationFrame(function () {
        xenoCommand.classList.add("is-open");
        if (xenoCommandDismiss) xenoCommandDismiss.classList.add("is-open");
        if (xenoCommandSearch) xenoCommandSearch.focus({ preventScroll: true });
      });
      xenoCommandMotionTimer = window.setTimeout(function () {
        xenoCommand.classList.remove("is-opening");
        if (xenoCommandDismiss) xenoCommandDismiss.classList.remove("is-opening");
      }, Math.round(370 * (100 / settings.animationSpeed)));
      return;
    }
    if (xenoCommand.hidden || xenoCommand.classList.contains("is-closing")) {
      root.classList.remove("neo-xeno-command-open");
      return;
    }
    xenoCommand.setAttribute("aria-hidden", "true");
    xenoCommand.setAttribute("inert", "");
    xenoCommand.classList.remove("is-open", "is-opening");
    xenoCommand.classList.add("is-closing");
    if (xenoCommandDismiss) {
      xenoCommandDismiss.classList.remove("is-open", "is-opening");
      xenoCommandDismiss.classList.add("is-closing");
    }
    if (xenoCommandReturnFocus && document.contains(xenoCommandReturnFocus)) xenoCommandReturnFocus.focus({ preventScroll: true });
    xenoCommandReturnFocus = null;
    if (effectiveReducedMotion()) finishXenoCommandClose();
    else xenoCommandMotionTimer = window.setTimeout(finishXenoCommandClose, Math.round(235 * (100 / settings.animationSpeed)));
  }

  function xenoDesktopShortcutAllowed(target) {
    var element = target && target.nodeType === 1 ? target : document.activeElement;
    if (!element || !element.closest) return false;
    var blocked = "input, textarea, select, option, button, a, audio, video, iframe, [contenteditable]:not([contenteditable='false']), [role='textbox'], .neo-window, .app-launcher, .xeno-command-center, .desktop-context-menu, .context-submenu, .notification-center, .taskbar-quick-settings";
    if (element.closest(blocked)) return false;
    var active = document.activeElement;
    if (active && active !== document.body && active !== root && active.closest && active.closest(blocked)) return false;
    return true;
  }

  function trapXenoCommandFocus(event) {
    if (!xenoCommand) return;
    var focusable = Array.from(xenoCommand.querySelectorAll("button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex='-1'])"))
      .filter(function (node) { return node.offsetParent !== null; });
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function createWindow(app) {
    var win = document.createElement("section");
    win.className = "neo-window" + (isSmallScreen() ? "" : " is-maximized");
    win.dataset.appId = app.id;
    win.dataset.interfaceStyleScope = interfaceStyleScopeForApp(app);
    win.setAttribute("role", "region");
    win.setAttribute("aria-label", appAccessibleName(app));
    win.tabIndex = -1;
    var sequence = windowSequence++;
    var layerBounds = windowLayer.getBoundingClientRect();
    var availableWidth = Math.max(1, layerBounds.width);
    var availableHeight = Math.max(1, layerBounds.height);
    var savedWindow = windowStates[app.id] || {};
    var width = clamp(Number(savedWindow.width || app.width || DEFAULT_WINDOW_WIDTH), Math.min(420,availableWidth), availableWidth);
    var height = clamp(Number(savedWindow.height || app.height || DEFAULT_WINDOW_HEIGHT), Math.min(320,availableHeight), availableHeight);
    win.style.width = width + "px";
    win.style.height = height + "px";
    if (!isSmallScreen()) {
      var left = Number.isFinite(Number(savedWindow.left)) ? Number(savedWindow.left) : 36 + (sequence % 6) * 26;
      var top = Number.isFinite(Number(savedWindow.top)) ? Number(savedWindow.top) : 24 + (sequence % 5) * 22;
      // Older records used viewport coordinates. New records are layer-relative.
      if (savedWindow.coordinates !== "layer") { if (savedWindow.left != null) left -= layerBounds.left; if (savedWindow.top != null) top -= layerBounds.top; }
      win.style.left = clamp(left, 0, Math.max(0, availableWidth - width)) + "px";
      var maxTop = Math.max(0, availableHeight - height);
      var minTop = maxTop >= WINDOW_TOP_GAP ? WINDOW_TOP_GAP : 0;
      win.style.top = clamp(top, minTop, maxTop) + "px";
    }
    var gamePinControl = app.launchMode === "direct-game" && !app.pinned
      ? '<button class="window-control game-pin" type="button" data-window-action="pin" aria-label="Add game to taskbar" title="Add to taskbar">' + iconMarkup("pin") + "</button>"
      : "";
    win.innerHTML =
      '<header class="window-chrome">' +
        '<span class="window-app-icon app-icon-shape ' + appIconClass(app.icon) + '">' + iconMarkup(app.icon) + "</span>" +
        '<span class="window-title"><strong></strong><small></small></span>' +
        '<span class="window-controls">' +
          gamePinControl +
          '<button class="window-control minimize" type="button" data-window-action="minimize" aria-label="Minimize">' + iconMarkup("minimize") + "</button>" +
          '<button class="window-control maximize" type="button" data-window-action="maximize" aria-label="Maximize">' + iconMarkup("maximize") + "</button>" +
          '<button class="window-control close" type="button" data-window-action="close" aria-label="Close">' + iconMarkup("close") + "</button>" +
        "</span>" +
      "</header>" +
      '<button class="tab-fullscreen-exit" type="button" data-window-action="fullscreen" aria-label="Exit app fullscreen" title="Exit fullscreen (Esc)">' + iconMarkup("close") + "</button>" +
      '<div class="window-body"></div>';
    var windowTitle = win.querySelector(".window-title");
    windowTitle.hidden = app.hideName === true;
    windowTitle.querySelector("strong").textContent = appDisplayTitle(app);
    windowTitle.querySelector("small").textContent = app.subtitle || "NEO OS app";
    win.querySelectorAll('[data-window-action]:not([data-window-action="fullscreen"])').forEach(function (button) {
      button.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        handleWindowAction(button);
      });
    });
    var body = win.querySelector(".window-body");
    if (window.NEO_DESKTOP && window.NEO_DESKTOP.mount(app.id, body)) { /* Shared window lifecycle, local app implementation. */ }
    else if (app.id === "stream") mountUnifiedMusic(app, body);
    else if (app.lazy) mountLazyApp(app, body);
    else if (app.template) mountTemplate(app, body);
    else if (app.route) mountFrame(app, body);
    windowLayer.appendChild(win);
    if (window.NEO_DESKTOP) window.NEO_DESKTOP.enhance(app.id, body);
    syncMaximizeButton(win);
    openWindows.set(app.id, win);
    syncAutoPerformanceMode();
    renderDock();
    setWindowMotionOrigin(win, app.id);
    activateWindow(win);
    wireWindowDrag(win);
    wireWindowPersistence(win);
    requestAnimationFrame(function () {
      if (!win.isConnected || openWindows.get(app.id) !== win) return;
      win.classList.add("is-open");
      playWindowMotion(win, "opening", 380);
      win.focus({ preventScroll: true });
    });
    return win;
  }

  function loadFeatureRuntime() {
    if (window.NEO_FEATURES) return Promise.resolve(window.NEO_FEATURES);
    if (featureRuntimePromise) return featureRuntimePromise;
    featureRuntimePromise = new Promise(function (resolve, reject) {
      if (!document.querySelector('link[data-neo-features]')) {
        var style = document.createElement("link");
        style.rel = "stylesheet";
        style.href = "./neo-os-features.css?v=20260913-app-cleanup-v1&hover=bridge-v1";
        style.dataset.neoFeatures = "";
        document.head.appendChild(style);
      }
      var script = document.createElement("script");
      script.src = "./neo-os-features.js?v=20260913-app-cleanup-v1&hover=bridge-v1";
      script.async = true;
      script.onload = function () {
        if (!window.NEO_FEATURES) {
          reject(new Error("The NEO feature runtime did not start."));
          return;
        }
        if (typeof window.NEO_FEATURES.init === "function") window.NEO_FEATURES.init(shellApi);
        resolve(window.NEO_FEATURES);
      };
      script.onerror = function () { reject(new Error("The NEO feature runtime could not be loaded.")); };
      document.head.appendChild(script);
    });
    return featureRuntimePromise;
  }

  function loadFilesRuntime() {
    if (window.NEO_FILES) return Promise.resolve(window.NEO_FILES);
    if (filesRuntimePromise) return filesRuntimePromise;
    filesRuntimePromise = new Promise(function (resolve, reject) {
      if (!document.querySelector('link[data-neo-files]')) {
        var style = document.createElement("link");
        style.rel = "stylesheet";
        style.href = "./neo-files.css?v=20260907-drive-polish-v1";
        style.dataset.neoFiles = "";
        document.head.appendChild(style);
      }
      var script = document.createElement("script");
      script.src = "./neo-files.js?v=20260907-drive-polish-v1";
      script.async = true;
      script.onload = function () {
        if (!window.NEO_FILES) {
          reject(new Error("Drive did not start."));
          return;
        }
        resolve(window.NEO_FILES);
      };
      script.onerror = function () { reject(new Error("Drive could not be loaded.")); };
      document.head.appendChild(script);
    });
    return filesRuntimePromise;
  }

  function loadBrowseRuntime() {
    if (window.NEO_BROWSER_ENGINE) return Promise.resolve(window.NEO_BROWSER_ENGINE);
    if (browseRuntimePromise) return browseRuntimePromise;
    browseRuntimePromise = new Promise(function (resolve, reject) {
      var existing = document.getElementById("neo-browse-runtime-script");
      var script = existing || document.createElement("script");
      script.id = "neo-browse-runtime-script";
      script.src = "./neo-browser-runtime.js?v=20260921-cleanhost-v1";
      script.async = true;
      script.onload = function () {
        if (!window.NEO_BROWSER_ENGINE) {
          reject(new Error("The web session did not start."));
          return;
        }
        resolve(window.NEO_BROWSER_ENGINE);
      };
      script.onerror = function () { reject(new Error("The web session could not be loaded.")); };
      if (!existing) document.head.appendChild(script);
    }).catch(function (error) {
      var failed = document.getElementById("neo-browse-runtime-script");
      if (failed) failed.remove();
      browseRuntimePromise = null;
      throw error;
    });
    return browseRuntimePromise;
  }

  function scheduleBrowsePrewarm() {
    if (localConfig && localConfig.browser) {
      if (performanceActive() || browsePrewarmScheduled || navigator.onLine === false) return;
      var directConnection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (directConnection && (directConnection.saveData || /(^|-)2g$/.test(directConnection.effectiveType || ""))) return;
      browsePrewarmScheduled = true;
      var directIdleId = 0;
      var directTimeoutId = 0;
      function cleanupDirectTriggers() {
        document.removeEventListener("pointerover", prefetchDirectBrowser);
        document.removeEventListener("focusin", prefetchDirectBrowser);
        document.removeEventListener("touchstart", prefetchDirectBrowser);
        if (directIdleId && "cancelIdleCallback" in window) window.cancelIdleCallback(directIdleId);
        if (directTimeoutId) window.clearTimeout(directTimeoutId);
      }
      function prefetchDirectBrowser(event) {
        if (event && event.target && !event.target.closest('[data-app="browser"]')) return;
        cleanupDirectTriggers();
        if (document.querySelector("link[data-neo-browser-prefetch]")) return;
        var warmTargets = [apps.browser.route].concat(Array.isArray(localConfig.browserWarmAssets) ? localConfig.browserWarmAssets : []);
        warmTargets.forEach(function (target, index) {
          var hint = document.createElement("link");
          hint.rel = "prefetch";
          hint.href = target;
          hint.fetchPriority = index === 0 ? "auto" : "low";
          hint.dataset.neoBrowserPrefetch = "";
          document.head.appendChild(hint);
        });
      }
      document.addEventListener("pointerover", prefetchDirectBrowser, { passive: true });
      document.addEventListener("focusin", prefetchDirectBrowser);
      document.addEventListener("touchstart", prefetchDirectBrowser, { passive: true });
      if ("requestIdleCallback" in window) directIdleId = window.requestIdleCallback(prefetchDirectBrowser, { timeout: 1800 });
      else directTimeoutId = window.setTimeout(prefetchDirectBrowser, 1000);
      return;
    }
    if (localOnly) return;
    if (performanceActive() || browsePrewarmScheduled || window.NEO_BROWSER_ENGINE) return;
    if (!("serviceWorker" in navigator) || navigator.onLine === false) return;
    var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection && (connection.saveData || /(^|-)2g$/.test(connection.effectiveType || ""))) return;

    browsePrewarmScheduled = true;
    var warming = false;
    var idleId = 0;
    var timeoutId = 0;
    function prewarmOnPointer(event) {
      if (!event.target.closest('[data-app="browser"]')) return;
      warm();
    }
    function prewarmOnFocus(event) {
      if (!event.target.closest('[data-app="browser"]')) return;
      warm();
    }
    function cleanupTriggers() {
      document.removeEventListener("pointerover", prewarmOnPointer);
      document.removeEventListener("focusin", prewarmOnFocus);
      if (idleId && "cancelIdleCallback" in window) window.cancelIdleCallback(idleId);
      if (timeoutId) window.clearTimeout(timeoutId);
      idleId = 0;
      timeoutId = 0;
    }
    var warm = function () {
      if (warming) return;
      cleanupTriggers();
      if (performanceActive()) {
        browsePrewarmScheduled = false;
        return;
      }
      warming = true;
      loadBrowseRuntime().then(function (engine) {
        if (engine && typeof engine.warm === "function") return engine.warm();
      }).catch(function () {}).finally(function () {
        browsePrewarmScheduled = false;
      });
    };

    document.addEventListener("pointerover", prewarmOnPointer, { passive: true });
    document.addEventListener("focusin", prewarmOnFocus);
  }

  function mountLazyApp(app, body) {
    body.innerHTML = '<div class="feature-loader" role="status"><span class="library-spinner" aria-hidden="true"></span><strong>Opening ' + appAccessibleName(app) + '</strong><p>Loading the app workspace.</p></div>';
    var loader = app.runtime === "files" ? loadFilesRuntime() : loadFeatureRuntime();
    loader.then(function (runtime) {
      body.textContent = "";
      runtime.mount(app.id, body, shellApi);
    }).catch(function (error) {
      body.innerHTML = '<div class="feature-loader is-error" role="alert"><strong>Could not open ' + appAccessibleName(app) + '</strong><p></p><button class="button" type="button" data-feature-retry>Retry</button></div>';
      body.querySelector("p").textContent = error && error.message ? error.message : "The app is unavailable.";
      body.querySelector("[data-feature-retry]").addEventListener("click", function () { mountLazyApp(app, body); });
    });
  }

  function mountUnifiedMusic(app, body) {
    // NEO Music now owns the full listening experience in every build. Keeping
    // one local-first surface prevents the legacy remote source switcher from
    // reappearing when the desktop moves between preview and production modes.
    mountLocalMusic(app, body);
  }

  function mountLocalMusic(app, body) {
    if (location.protocol === "file:") {
      body.innerHTML = '<div class="feature-loader is-error" role="alert"><strong>Music needs the NEO web runtime</strong><p>Search and playback cannot run from a raw file. Open the local NEO address to enable app modules and media requests.</p><a class="button primary" data-music-runtime-link>Open working NEO OS</a></div>';
      var runtimeLink = body.querySelector("[data-music-runtime-link]");
      runtimeLink.href = localConfig.preview || "http://127.0.0.1:3092/neo-os/";
      return;
    }

    var loader = document.createElement("div");
    loader.className = "frame-loader";
    loader.innerHTML = "<span></span><p>Starting search and playback...</p>";
    var fallback = document.createElement("div");
    fallback.className = "frame-error";
    fallback.setAttribute("role", "alert");
    fallback.innerHTML = '<strong>NEO Music could not finish starting</strong><p>The music runtime did not become ready. Retry it without closing the window.</p><div class="upload-actions"><button class="button primary" type="button" data-music-retry>Retry</button><a class="button" target="_blank" rel="noopener" data-music-direct>Open Music directly</a></div>';
    var frame = document.createElement("iframe");
    frame.title = "NEO Music";
    frame.allow = "autoplay; fullscreen";
    frame.loading = "eager";
    frame.dataset.neoLocalMusic = "true";
    frame.dataset.neoMusicSource = localConfig.music;
    frame.style.cssText = "width:100%;height:100%;border:0;display:block;background:#080808";
    var hostWindow = body.closest(".neo-window");
    var source = "neo-music";
    var runtimeReady = false;
    var runtimeTimer = 0;
    var retry = fallback.querySelector("[data-music-retry]");
    var direct = fallback.querySelector("[data-music-direct]");
    direct.href = localConfig.music;
    function setRuntimeReady() {
      runtimeReady = true;
      window.clearTimeout(runtimeTimer);
      loader.classList.add("is-complete");
      fallback.classList.remove("is-visible");
    }
    function showRuntimeError() {
      if (runtimeReady) return;
      loader.classList.add("is-complete");
      fallback.classList.add("is-visible");
    }
    function armRuntimeTimeout() {
      window.clearTimeout(runtimeTimer);
      runtimeTimer = window.setTimeout(showRuntimeError, 10000);
    }
    function loadMusic() {
      runtimeReady = false;
      loader.classList.remove("is-complete");
      fallback.classList.remove("is-visible");
      armRuntimeTimeout();
      var target = new URL(localConfig.music);
      target.searchParams.set("runtime", "20260908-audio-performance-v1");
      if (window.NEOFrameLoader && window.NEOFrameLoader.isRunner()) {
        window.NEOFrameLoader.load(frame, target.href, { cache: "force-cache" }).catch(showRuntimeError);
      } else {
        frame.src = target.href;
      }
    }
    function command(action, value) {
      if (!frame.contentWindow) return;
      var targetOrigin = "*";
      if (!frame.hasAttribute("srcdoc")) {
        try { targetOrigin = new URL(frame.src, document.baseURI).origin; } catch (_) {}
      }
      frame.contentWindow.postMessage({ neoMusicControl: { action: action, value: value } }, targetOrigin);
    }
    function state(event) {
      // CDN runner frames use srcdoc and therefore have an opaque origin. The
      // window reference is the stable trust boundary here; checking origins
      // rejects a valid ready event when the outer and music frames are nested.
      if (event.source !== frame.contentWindow) return;
      if (!event.data) return;
      if (event.data.neoMusicUiReady === true) setRuntimeReady();
      if (event.data.neoMusicLevels && Array.isArray(event.data.neoMusicLevels.values)) {
        window.dispatchEvent(new CustomEvent("neo-media-levels", { detail: {
          source: source,
          active: true,
          levels: event.data.neoMusicLevels.values,
          measured: event.data.neoMusicLevels.measured === true,
          bands: Math.max(0, Number(event.data.neoMusicLevels.bands) || 0),
          interval: Math.max(0, Number(event.data.neoMusicLevels.interval) || 0)
        }}));
      }
      var detail = event.data.neoMusicState ||
        (event.data.type === "neo-local-music:state" ? event.data.state : null);
      if (!detail) return;
      setRuntimeReady();
      var cover = "";
      try {
        var coverUrl = new URL(detail.cover || "", localConfig.music);
        if (detail.cover && /^(https?:|blob:|data:)$/.test(coverUrl.protocol)) cover = coverUrl.href;
      } catch (_) {}
      window.dispatchEvent(new CustomEvent("neo-media-state", { detail: {
        source: source, appId: "stream", kind: "audio", active: detail.active === true,
        playing: detail.playing === true, title: String(detail.title || "Music").slice(0,160),
        subtitle: String(detail.subtitle || detail.artist || "").slice(0,180), cover: cover,
        position: Math.max(0, Number(detail.position) || 0), duration: Math.max(0, Number(detail.duration) || 0),
        volume: Math.max(0, Math.min(1, Number(detail.volume) || 0)), muted: detail.muted === true,
        volumeControl: true, transport: true, pauseWallpaper: false
      }}));
    }
    function volume(event) { if (event.detail && event.detail.source === source) command("volume", event.detail.volume); }
    function transport(event) { if (event.detail && event.detail.source === source) command(event.detail.action); }
    window.addEventListener("message", state);
    window.addEventListener("neo-media-volume-request", volume);
    window.addEventListener("neo-media-transport-request", transport);
    if (hostWindow) {
      hostWindow._neoLocalMusicCommand = command;
      hostWindow._neoExtraCleanup = function () {
        command("stop");
        window.removeEventListener("message", state);
        window.removeEventListener("neo-media-volume-request", volume);
        window.removeEventListener("neo-media-transport-request", transport);
        if (window.NEOFrameLoader) window.NEOFrameLoader.cancel(frame);
        window.clearTimeout(runtimeTimer);
        frame.src = "about:blank";
        window.dispatchEvent(new CustomEvent("neo-media-state", {detail:{source:source,appId:"stream",active:false,playing:false}}));
      };
    }
    frame.addEventListener("error", showRuntimeError);
    retry.addEventListener("click", loadMusic);
    body.append(loader, fallback, frame);
    loadMusic();
  }

  function mountTemplate(app, body) {
    var template = document.getElementById(app.template);
    if (!template) {
      body.textContent = "This app is unavailable.";
      return;
    }
    body.appendChild(template.content.cloneNode(true));
    syncSettingControls(body);
    if (app.id === "search") wireSearchApp(body);
    if (app.template === "browser-template") wireBrowserApp(body, app);
    if (app.id === "chat") wireMessagesApp(body);
    if (app.id === "wallpaper") wireWallpaperStudio(body);
    if (app.id === "calendar") updateClock();
  }

  function wireBrowserApp(scope, app) {
    var browser = scope.querySelector("[data-neo-browser]");
    if (!browser || browser.dataset.ready === "true") return;
    browser.dataset.ready = "true";

    var initialTarget = app.browserTarget;
    var initialLabel = appAccessibleName(app);
    var appMode = app.browserChrome === false;
    var appTheme = app.browserTheme || "";
    var directOrigin = app.browserDirect === true;
    browser.classList.toggle("is-dedicated-app", appMode);

    var form = browser.querySelector("[data-browser-search-form]");
    var input = browser.querySelector("[data-browser-search-input]");
    var sessionView = browser.querySelector("[data-browser-session]");
    var loading = browser.querySelector("[data-browser-loading]");
    var errorView = browser.querySelector("[data-browser-error]");
    var errorCopy = browser.querySelector("[data-browser-error-copy]");
    var retry = browser.querySelector("[data-browser-retry]");
    var startClose = browser.querySelector("[data-browser-start-close]");
    var startPlus = browser.querySelector("[data-browser-start-plus]");
    var content = browser.querySelector("[data-browser-content]");
    var hostWindow = scope.closest(".neo-window");
    var currentQuery = "";
    var currentTarget = "";
    var signInStop;
    var runtimeView = null;

    function stopRequest() {
      if (signInStop) signInStop();
      signInStop = null;
      if (runtimeView && typeof runtimeView._neoBrowserCleanup === "function") {
        runtimeView._neoBrowserCleanup();
      }
      runtimeView = null;
    }

    function setBrowserState(state, message) {
      browser.classList.toggle("has-query", state !== "home");
      browser.classList.toggle(
        "has-tabs",
        state === "content" && Boolean(runtimeView && runtimeView.classList.contains("neo-browser-runtime"))
      );
      sessionView.hidden = state === "home";
      loading.hidden = state !== "loading";
      errorView.hidden = state !== "error";
      content.hidden = state !== "content";
      if (message) errorCopy.textContent = message;
    }

    function prepareBrowserEngine() {
      return loadBrowseRuntime().then(function (engine) {
        if (typeof engine.openQuery !== "function" || typeof engine.warm !== "function") {
          throw new Error("The web session is unavailable.");
        }
        if (directOrigin) return engine;
        return engine.warm().then(function () { return engine; });
      });
    }

    function openTarget(targetHref, label) {
      var target;
      try { target = new URL(targetHref); } catch (error) { return; }
      if (target.protocol !== "https:" && target.protocol !== "http:") return;
      currentQuery = label || target.hostname;
      currentTarget = target.href;
      input.value = currentQuery;
      stopRequest();
      content.textContent = "";
      setBrowserState("loading");

      prepareBrowserEngine().then(function (engine) {
        return engine.openQuery({
          container: content,
          query: currentQuery,
          target: target.href,
          appId: app.id,
          appMode: appMode,
          appTheme: appTheme,
          directOrigin: directOrigin,
          label: initialLabel || currentQuery
        });
      }).then(function (view) {
        runtimeView = view || null;
        setBrowserState("content");
      }).catch(function (error) {
        setBrowserState("error", error && error.message ? error.message : "The web session could not start.");
      });
    }

    function openNewTabShell(addSecondTab) {
      currentQuery = "";
      currentTarget = "";
      input.value = "";
      stopRequest();
      content.textContent = "";
      setBrowserState("loading");
      prepareBrowserEngine().then(function (engine) {
        return engine.openQuery({
          container: content,
          query: "",
          target: "neo://newtab",
          appId: app.id,
          appMode: appMode,
          appTheme: appTheme,
          directOrigin: directOrigin,
          label: initialLabel || "New tab"
        });
      }).then(function (view) {
        runtimeView = view || null;
        setBrowserState("content");
        if (addSecondTab && runtimeView) {
          requestAnimationFrame(function () {
            runtimeView.querySelector("[data-browser-new-tab]")?.click();
          });
        }
      }).catch(function (error) {
        setBrowserState("error", error && error.message ? error.message : "The web session could not start.");
      });
    }

    function openSignInPage() {
      stopRequest();
      currentQuery = "NEO account";
      currentTarget = "";
      input.value = currentQuery;
      content.textContent = "";
      setBrowserState("loading");
      Promise.resolve(window.NEO_ACCOUNT_SIGNIN).then(function (runtime) {
        if (!runtime || typeof runtime.mountAccountSignIn !== "function") throw new Error("missing_account_runtime");
        if (currentQuery !== "NEO account") return;
        signInStop = runtime.mountAccountSignIn(content, function () { setBrowserState("content"); }, function (payload) {
          window.dispatchEvent(new CustomEvent("neo-auth-changed", { detail: { user: payload.user } }));
          showToast("Chat ready", "You are now " + payload.user.username + ".", "chat");
          window.setTimeout(function () { openApp("chat"); }, 350);
        }, {
          title: "Sign in to NEO",
          copy: "Use your username and password, or create a new account.",
          success: "Account ready. Opening NEO Chat..."
        });
      }).catch(function () {
        if (currentQuery === "NEO account") setBrowserState("error", "NEO account setup is unavailable.");
      });
    }

    function destinationFromEntry(value) {
      var entry = String(value || "").replace(/\s+/g, " ").trim();
      if (!entry) return null;

      try {
        var absolute = new URL(entry);
        if (absolute.protocol === "https:") return absolute;
      } catch (error) {}

      if (!entry.includes(" ") && entry.includes(".")) {
        try { return new URL("https://" + entry); } catch (error) {}
      }
      return null;
    }

    function search() {
      var query = input.value.replace(/\s+/g, " ").trim();
      if (!query) {
        input.focus();
        return;
      }
      var direct = destinationFromEntry(query);
      if (direct) {
        openTarget(direct.href, direct.hostname.replace(/^www\./, ""));
        return;
      }
      var target = new URL("https://html.duckduckgo.com/html/");
      target.searchParams.set("q", query);
      openTarget(target.href, query);
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      search();
    });
    input.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" || event.isComposing) return;
      event.preventDefault();
      form.requestSubmit();
    });
    retry.addEventListener("click", function () {
      if (currentTarget) openTarget(currentTarget, currentQuery);
    });
    if (startClose) startClose.addEventListener("click", function () {
      if (hostWindow) closeWindow(hostWindow);
    });
    if (startPlus) startPlus.addEventListener("click", function () {
      openNewTabShell(true);
    });
    browser.addEventListener("neo-browser-open", function (event) {
      var detail = event.detail || {};
      if (detail.page === "sign-in") {
        openSignInPage();
        return;
      }
      if (detail.target) openTarget(detail.target, detail.label || "Web page");
    });
    if (hostWindow) hostWindow._neoBrowserCleanup = stopRequest;
    var warmBrowse = function () { prepareBrowserEngine().catch(function () {}); };
    if ("requestIdleCallback" in window) window.requestIdleCallback(warmBrowse, { timeout: 900 });
    else window.setTimeout(warmBrowse, 120);
    requestAnimationFrame(function () {
      if (initialTarget) openTarget(initialTarget, initialLabel || "Web app");
      else openNewTabShell(false);
    });
  }

  function nativeChatKey(value) {
    return String(value || "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
  }

  function nativeChatSession() {
    if (window.NEO_ACCOUNT_STORE) {
      var active = window.NEO_ACCOUNT_STORE.active();
      if (active && active.token && active.user && active.user.id && active.user.username) {
        return {
          username: String(active.user.username),
          id: String(active.user.id),
          token: String(active.token),
          transport: String(active.transport || active.user.transport || "")
        };
      }
    }
    var token = "";
    try { token = localStorage.getItem("ugp_token") || ""; } catch (error) {}
    if (token.indexOf("static-firebase:") === 0) {
      try {
        localStorage.removeItem("ugp_token");
        localStorage.removeItem("ugp_session");
      } catch (error) {}
      token = "";
    }
    var session = readJson("ugp_session", {}) || {};
    var username = token ? String(session.username || "").trim() : "";
    var id = token ? String(session.id || "").trim() : "";
    return { username: username, id: token && username && id ? id : "", token: token && username && id ? token : "", transport: String(session.transport || "") };
  }

  function nativeChatStateRequest(session, parentSignal, compact) {
    if (!window.NEO_CHAT_TRANSPORT) return Promise.reject(new Error("NEO Chat transport is unavailable."));
    var controller = new AbortController();
    var timer = window.setTimeout(function () { controller.abort(); }, 6500);
    var abort = function () { controller.abort(); };
    if (parentSignal) parentSignal.addEventListener("abort", abort, { once: true });
    return window.NEO_CHAT_TRANSPORT.state(String(session && session.token || ""), Boolean(compact), controller.signal).finally(function () {
      window.clearTimeout(timer);
      if (parentSignal) parentSignal.removeEventListener("abort", abort);
    });
  }

  function nativeChatRows(raw) {
    var rows = Array.isArray(raw)
      ? raw.map(function (message, index) { return [message && (message.firebaseKey || message.id) || String(index), message]; })
      : (raw && typeof raw === "object" ? Object.entries(raw) : []);
    return rows.filter(function (entry) { return entry[1] && !entry[1].deleted; }).map(function (entry) {
      var message = entry[1];
      return Object.assign({}, message, {
        firebaseKey: String(message.firebaseKey || entry[0]),
        id: String(message.id || entry[0]),
        clientId: String(message.clientId || ""),
        room: String(message.room || "global"),
        userId: String(message.userId || ""),
        user: String(message.user || message.username || "Guest"),
        text: String(message.text || message.body || message.message || ""),
        time: Number(message.time || message.createdAt || message.updatedAt || 0)
      });
    }).filter(function (message) { return message.text || (message.attachment && message.attachment.url); }).sort(function (a, b) { return a.time - b.time; });
  }

  function nativeChatMembers(room) {
    var source = Array.isArray(room && room.members) ? room.members : (room && room.members && typeof room.members === "object" ? Object.keys(room.members) : []);
    return source.map(function (member) { return String(typeof member === "string" ? member : member && (member.id || member.username) || "").trim(); }).filter(Boolean);
  }

  function nativeChatAccount(accounts, id) {
    if (accounts[id]) return accounts[id];
    return Object.values(accounts).find(function (account) {
      return String(account && account.id || "") === String(id || "") || nativeChatKey(account && account.username) === nativeChatKey(id);
    }) || {};
  }

  function nativeChatAvatar(account) {
    var source = String(account && (account.avatar || (account.profile && account.profile.avatar) || account.profilePicture || account.profilePic || account.photoURL || account.pfp || ""));
    return /^(?:data:image\/(?:png|jpeg|webp|gif);base64,|https:\/\/)/i.test(source) ? source : "";
  }

  function applyNativeChatAvatar(element, account, name) {
    var label = String((account && account.username) || name || "?").trim();
    var hue = Array.from(label).reduce(function (sum, char) { return sum + char.charCodeAt(0); }, 0) % 360;
    element.textContent = (label[0] || "?").toUpperCase();
    element.style.setProperty("--avatar-hue", String(hue));
    var source = nativeChatAvatar(account);
    if (source) {
      var image = document.createElement("img");
      image.alt = "";
      image.src = source;
      element.replaceChildren(image);
    }
  }

  function nativeChatTime(stamp) {
    if (!stamp) return "";
    var date = new Date(stamp);
    var today = new Date();
    if (date.toDateString() === today.toDateString()) return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  function wireMessagesApp(scope) {
    var app = scope.querySelector("[data-messages-app]");
    if (!app || app.dataset.ready === "true") return;
    app.dataset.ready = "true";
    var hostWindow = scope.closest(".neo-window");
    var pinnedSection = app.querySelector("[data-chat-pinned-section]");
    var pinnedList = app.querySelector("[data-chat-pinned-list]");
    var roomList = app.querySelector("[data-chat-room-list]");
    var serverSection = app.querySelector("[data-chat-server-section]");
    var serverList = app.querySelector("[data-chat-server-list]");
    var searchInput = app.querySelector("[data-chat-search]");
    var composeButton = app.querySelector("[data-chat-compose]");
    var thread = app.querySelector("[data-chat-thread]");
    var input = app.querySelector("[data-chat-input]");
    var form = app.querySelector("[data-chat-form]");
    var sendButton = app.querySelector("[data-chat-send]");
    var attachButton = app.querySelector("[data-chat-attach]");
    var attachmentInput = app.querySelector("[data-chat-attachment-input]");
    var attachmentPreview = app.querySelector("[data-chat-attachment-preview]");
    var feedback = app.querySelector("[data-chat-feedback]");
    var accountTag = app.querySelector("[data-chat-account]");
    var signInButton = app.querySelector("[data-chat-sign-in]");
    var signOutButton = app.querySelector("[data-chat-sign-out]");
    var connection = app.querySelector("[data-chat-connection]");
    var connectionDot = app.querySelector("[data-chat-connection-dot]");
    var title = app.querySelector("[data-chat-title]");
    var subtitle = app.querySelector("[data-chat-subtitle]");
    var headingAvatar = app.querySelector("[data-chat-heading-avatar]");
    var profileDialog = app.querySelector("[data-chat-profile]");
    var profileAvatar = app.querySelector("[data-chat-profile-avatar]");
    var profileName = app.querySelector("[data-chat-profile-name]");
    var profileStatus = app.querySelector("[data-chat-profile-status]");
    var profileFeedback = app.querySelector("[data-chat-profile-feedback]");
    var profileDm = app.querySelector("[data-chat-profile-dm]");
    var authDialog = app.querySelector("[data-chat-auth-dialog]");
    var authMount = app.querySelector("[data-chat-auth-mount]");
    var authClose = app.querySelector("[data-chat-auth-close]");
    var authCleanup = null;
    var state = { session: null, accounts: {}, rooms: {}, recent: [], local: {}, people: [], selected: "global", profileUser: "", attachment: null, loading: true, error: "", search: "", searchTimer: 0, searchController: null, controller: null, refreshRequest: null, poll: 0, pollFailures: 0, loadVersion: 0, pendingCount: 0, sendRequests: {}, slowUntil: 0, slowTimer: 0, destroyed: false };
    var messagesResizeObserver = null;

    function isCompactChat() {
      var width = app.getBoundingClientRect().width || (hostWindow ? hostWindow.clientWidth : 0);
      return isSmallScreen() || (width > 0 && width <= 760);
    }

    function roomObjects() {
      if (!state.session || !state.session.id) return [];
      return Object.entries(state.rooms || {}).map(function (entry) {
        return entry[1] && typeof entry[1] === "object" ? Object.assign({}, entry[1], { id: entry[1].id || entry[0] }) : null;
      }).filter(function (room) {
        var kind = String(room && (room.kind || room.type) || "").toLowerCase();
        return room && (room.private === true || kind === "dm" || kind === "group") && nativeChatMembers(room).includes(state.session.id);
      }).sort(function (a, b) { return Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0); });
    }

    function serverObjects() {
      return Object.entries(state.rooms || {}).map(function (entry) {
        return entry[1] && typeof entry[1] === "object" ? Object.assign({}, entry[1], { id: entry[1].id || entry[0] }) : null;
      }).filter(function (room) {
        var kind = String(room && (room.kind || room.type) || "").toLowerCase();
        return room && room.private !== true && (kind === "server" || kind === "public" || kind === "channel");
      }).sort(function (a, b) { return String(a.name || a.title || a.id).localeCompare(String(b.name || b.title || b.id)); });
    }

    function roomById(id) { return roomObjects().concat(serverObjects()).find(function (room) { return String(room.id) === String(id); }); }
    function isServerRoom(room) {
      var kind = String(room && (room.kind || room.type) || "").toLowerCase();
      return kind === "server" || kind === "public" || kind === "channel";
    }
    function otherRoomAccount(room) {
      var other = nativeChatMembers(room).find(function (id) { return id !== state.session.id; });
      return nativeChatAccount(state.accounts, other || "");
    }
    function roomName(id) {
      if (id === "global") return "Global Chat";
      var room = roomById(id) || {};
      if (isServerRoom(room)) return String(room.name || room.title || "Server");
      var other = otherRoomAccount(room);
      return String(room.name || room.title || other.username || "Private Chat");
    }
    function messageIdentity(message) {
      if (!message) return "";
      return String(message.clientId ? "client:" + message.clientId : (message.firebaseKey ? "firebase:" + message.firebaseKey : "id:" + message.id));
    }
    function messagesFor(id) {
      var unique = new Map();
      (state.local[id] || []).forEach(function (message) { unique.set(messageIdentity(message), message); });
      state.recent.filter(function (message) { return message.room === id; }).forEach(function (message) {
        unique.set(messageIdentity(message), message);
        if (message.clientId) unique.delete("id:" + message.clientId);
      });
      return Array.from(unique.values()).sort(function (a, b) { return a.time - b.time; }).slice(-100);
    }
    function setConnection(text, online) {
      connection.textContent = text;
      connectionDot.classList.toggle("is-online", Boolean(online));
      connectionDot.classList.toggle("is-connecting", !online && text === "Reconnecting...");
      connectionDot.setAttribute("aria-label", online ? "Online" : text);
    }
    // Keep unsent content isolated by account and recipient.
    var draftsKey = 'neo_chat_drafts_v1', drafts = readJson('neo_chat_drafts_v1', {});
    function draftId() { return (state.session && state.session.id || 'guest') + ':' + state.selected; }
    function saveDraft() {
      if (!state.session || !state.session.id) return;
      drafts[draftId()] = {text:input.value, attachment:state.attachment || null};
      try { localStorage.setItem(draftsKey, JSON.stringify(drafts)); } catch (_) { feedback.textContent = 'Storage is full. Keep this window open or copy your draft.'; }
    }
    function restoreDraft() {
      var draft = drafts[draftId()] || {};
      input.value = String(draft.text || ''); state.attachment = draft.attachment || null;
      renderAttachmentDraft(); syncComposerState();
    }
    function canCompose() {
      return Boolean(state.session && state.session.id && state.session.token && !state.loading && !state.error && !state.pendingCount && state.accounts[state.session.id]);
    }
    function slowModeRemaining() {
      return Math.max(0, Number(state.slowUntil || 0) - Date.now());
    }
    function syncComposerState() {
      var enabled = canCompose();
      input.disabled = !enabled;
      if (attachButton) attachButton.disabled = !enabled;
      sendButton.disabled = !enabled || slowModeRemaining() > 0 || (!String(input.value || "").trim() && !state.attachment);
      form.setAttribute("aria-busy", state.pendingCount ? "true" : "false");
    }

    function formatAttachmentSize(bytes) {
      var value = Math.max(0, Number(bytes || 0));
      if (value < 1024) return value + " B";
      if (value < 1024 * 1024) return Math.round(value / 1024) + " KB";
      return (value / (1024 * 1024)).toFixed(1) + " MB";
    }

    function clearAttachment() {
      state.attachment = null;
      if (attachmentInput) attachmentInput.value = "";
      if (attachmentPreview) {
        attachmentPreview.textContent = "";
        attachmentPreview.hidden = true;
      }
      syncComposerState();
    }

    function renderAttachmentDraft() {
      if (!attachmentPreview) return;
      attachmentPreview.textContent = "";
      if (!state.attachment) { attachmentPreview.hidden = true; return; }
      var draft = state.attachment;
      var kind = String(draft.type || "").split("/")[0];
      if (kind === "image") {
        var image = document.createElement("img"); image.src = draft.dataUrl; image.alt = "Selected image"; attachmentPreview.appendChild(image);
      } else if (kind === "video") {
        var video = document.createElement("video"); video.src = draft.dataUrl; video.muted = true; video.playsInline = true; attachmentPreview.appendChild(video);
      } else if (kind === "audio") {
        var audio = document.createElement("audio"); audio.src = draft.dataUrl; audio.controls = true; attachmentPreview.appendChild(audio);
      }
      var copy = document.createElement("span");
      copy.className = "messages-attachment-copy";
      var strong = document.createElement("strong"); strong.textContent = draft.name;
      var small = document.createElement("small"); small.textContent = (draft.type || "File") + " · " + formatAttachmentSize(draft.size);
      copy.append(strong, small);
      var remove = document.createElement("button");
      remove.type = "button"; remove.className = "messages-attachment-remove"; remove.dataset.chatAttachmentRemove = ""; remove.setAttribute("aria-label", "Remove attachment");
      remove.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-close"></use></svg>';
      attachmentPreview.append(copy, remove);
      attachmentPreview.hidden = false;
    }

    function selectAttachment(file) {
      if (!file) return;
      var localOnly = window.NEO_CHAT_TRANSPORT && window.NEO_CHAT_TRANSPORT.mode() === "local";
      var maximum = localOnly ? 750 * 1024 : 6 * 1024 * 1024;
      if (file.size > maximum) { feedback.textContent = localOnly ? "On-device attachments can be up to 750 KB." : "Attachments can be up to 6 MB."; return; }
      var allowed = /^(image|video|audio)\//.test(file.type) || /^(application\/pdf|text\/plain|application\/(zip|x-zip-compressed))$/.test(file.type);
      if (!allowed) { feedback.textContent = "Choose a photo, video, audio, PDF, text, or ZIP file."; return; }
      var reader = new FileReader();
      var attachmentRoom = draftId();
      reader.onload = function () {
        if (state.destroyed || attachmentRoom !== draftId()) return;
        var dataUrl = String(reader.result || "");
        state.attachment = { name: String(file.name || "Attachment").slice(0, 120), type: file.type || "application/octet-stream", size: file.size, dataUrl: dataUrl, dataBase64: dataUrl.split(",")[1] || "" };
        saveDraft();
        feedback.textContent = "";
        renderAttachmentDraft();
        syncComposerState();
      };
      reader.onerror = function () { feedback.textContent = "That file could not be opened."; };
      reader.readAsDataURL(file);
    }
    function beginSlowMode(duration) {
      window.clearInterval(state.slowTimer);
      state.slowUntil = Date.now() + Math.max(250, Number(duration || NEO_CHAT_SLOW_MODE_MS));
      function renderSlowMode() {
        var remaining = slowModeRemaining();
        if (remaining <= 0) {
          window.clearInterval(state.slowTimer);
          state.slowTimer = 0;
          state.slowUntil = 0;
          if (feedback.dataset.slowMode === "true") {
            feedback.textContent = "";
            delete feedback.dataset.slowMode;
          }
          syncComposerState();
          return;
        }
        feedback.dataset.slowMode = "true";
        feedback.textContent = "Slow mode: send again in " + Math.max(1, Math.ceil(remaining / 1000)) + "s.";
        syncComposerState();
      }
      renderSlowMode();
      state.slowTimer = window.setInterval(renderSlowMode, 250);
    }

    function renderHeader() {
      if (!state.session || !state.session.id) {
        title.textContent = "NEO Chat";
        subtitle.textContent = "Create a profile to continue";
        thread.setAttribute("aria-label", "NEO Chat profile setup");
        headingAvatar.classList.remove("is-global");
        applyNativeChatAvatar(headingAvatar, {}, "N");
        return;
      }
      var name = roomName(state.selected);
      var room = roomById(state.selected);
      var account = state.selected === "global" || isServerRoom(room) ? {} : otherRoomAccount(room || {});
      title.textContent = name;
      var localOnly = window.NEO_CHAT_TRANSPORT && window.NEO_CHAT_TRANSPORT.mode() === "local";
      subtitle.textContent = state.error ? "Unavailable" : (state.selected === "global"
        ? (localOnly ? "On-device fallback · Slow mode 5s" : "Shared public conversation · Slow mode 5s")
        : (isServerRoom(room) ? "Shared space · Slow mode 5s" : "Private conversation · Slow mode 5s"));
      thread.setAttribute("aria-label", name + " messages");
      headingAvatar.classList.toggle("is-global", state.selected === "global");
      applyNativeChatAvatar(headingAvatar, account, state.selected === "global" ? "G" : name);
    }

    function createRoomButton(room, pinned) {
        var id = String(room.id);
        var rows = messagesFor(id);
        var latest = rows[rows.length - 1];
        var button = document.createElement("button");
        button.type = "button";
        button.className = (pinned ? "messages-pinned-room" : "messages-room") + (id === state.selected ? " is-active" : "") + (id === "global" ? " is-global" : "");
        button.dataset.chatRoom = id;
        button.setAttribute("aria-pressed", id === state.selected ? "true" : "false");
        var avatar = document.createElement("span");
        avatar.className = "messages-avatar";
        applyNativeChatAvatar(avatar, id === "global" || isServerRoom(room) ? {} : otherRoomAccount(room), id === "global" ? "G" : roomName(id));
        if (pinned) {
          var label = document.createElement("strong");
          label.textContent = roomName(id);
          button.append(avatar, label);
          return button;
        }
        var copy = document.createElement("span");
        copy.className = "messages-room-copy";
        var strong = document.createElement("strong");
        strong.textContent = roomName(id);
        var small = document.createElement("small");
        small.textContent = latest ? ((String(latest.userId || nativeChatKey(latest.user)) === (state.session && state.session.id) ? "You: " : "") + latest.text) : "No messages yet";
        copy.append(strong, small);
        var time = document.createElement("time");
        time.textContent = latest ? nativeChatTime(latest.time) : "";
        button.append(avatar, copy, time);
        return button;
    }

    function renderRooms() {
      pinnedList.textContent = "";
      roomList.textContent = "";
      if (serverList) serverList.textContent = "";
      if (!state.session || !state.session.id) {
        pinnedSection.hidden = true;
        if (serverSection) serverSection.hidden = true;
        var signedOutCopy = document.createElement("p");
        signedOutCopy.className = "messages-room-empty";
        signedOutCopy.textContent = "Create a profile to view your conversations.";
        roomList.appendChild(signedOutCopy);
        return;
      }
      if (state.loading) {
        pinnedSection.hidden = false;
        var pinnedLoading = document.createElement("div");
        pinnedLoading.className = "messages-pinned-loading";
        pinnedLoading.setAttribute("aria-hidden", "true");
        pinnedLoading.innerHTML = "<span></span>";
        pinnedList.appendChild(pinnedLoading);
        var roomLoading = document.createElement("div");
        roomLoading.className = "messages-room-loading";
        roomLoading.setAttribute("aria-hidden", "true");
        roomLoading.innerHTML = "<span></span><span></span><span></span>";
        roomList.appendChild(roomLoading);
        if (serverSection) serverSection.hidden = true;
        return;
      }
      var query = state.search.toLowerCase();
      var globalRoom = { id: "global", name: "Global Chat" };
      var showGlobal = roomName(globalRoom.id).toLowerCase().includes(query);
      pinnedSection.hidden = !showGlobal;
      if (showGlobal) pinnedList.appendChild(createRoomButton(globalRoom, true));

      var rooms = roomObjects().filter(function (room) { return roomName(room.id).toLowerCase().includes(query); });
      rooms.forEach(function (room) {
        roomList.appendChild(createRoomButton(room, false));
      });

      if (query) {
        state.people.filter(function (person) {
          var id = String(person && person.id || nativeChatKey(person && person.username));
          return id && id !== (state.session && state.session.id) && !rooms.some(function (room) { return nativeChatMembers(room).includes(id); });
        }).forEach(function (person) {
          var button = document.createElement("button");
          button.type = "button";
          button.className = "messages-room messages-person-result";
          button.dataset.chatUser = String(person.id || person.username || "");
          var avatar = document.createElement("span");
          avatar.className = "messages-avatar";
          applyNativeChatAvatar(avatar, person, person.username);
          var copy = document.createElement("span");
          copy.className = "messages-room-copy";
          var strong = document.createElement("strong");
          strong.textContent = String(person.username || "Member");
          var small = document.createElement("small");
          small.textContent = "Start a direct message";
          copy.append(strong, small);
          button.append(avatar, copy);
          roomList.appendChild(button);
        });
      }

      if (!roomList.children.length) {
        var empty = document.createElement("p");
        empty.className = "messages-room-empty";
        empty.textContent = query ? "No people or conversations found." : "No recent conversations.";
        roomList.appendChild(empty);
      }

      var servers = serverObjects().filter(function (room) { return roomName(room.id).toLowerCase().includes(query); });
      if (serverSection) serverSection.hidden = !servers.length;
      if (serverList) {
        servers.forEach(function (room) { serverList.appendChild(createRoomButton(room, false)); });
      }
    }

    function threadState(heading, copy, busy) {
      thread.textContent = "";
      var box = document.createElement("div");
      box.className = "messages-thread-state";
      if (busy) {
        var spinner = document.createElement("span");
        spinner.className = "library-spinner";
        spinner.setAttribute("aria-hidden", "true");
        box.appendChild(spinner);
      }
      var strong = document.createElement("strong");
      strong.textContent = heading;
      var paragraph = document.createElement("p");
      paragraph.textContent = copy;
      box.append(strong, paragraph);
      thread.appendChild(box);
    }

    function clearProfileMenu() {
      if (authCleanup) authCleanup();
      authCleanup = null;
      if (authMount) authMount.replaceChildren();
    }

    function closeProfileMenu() {
      clearProfileMenu();
      if (authDialog && authDialog.open) authDialog.close();
    }

    function openProfileMenu() {
      if (!authDialog || !authMount || !window.NEO_ACCOUNT_SIGNIN) {
        feedback.textContent = "Profile setup is still loading. Try again in a moment.";
        return;
      }
      clearProfileMenu();
      try {
        authCleanup = window.NEO_ACCOUNT_SIGNIN.mountAccountSignIn(authMount, function () {
          if (!authDialog.open) authDialog.showModal();
        }, function (payload) {
          closeProfileMenu();
          window.dispatchEvent(new CustomEvent("neo-auth-changed", { detail: { user: payload.user } }));
          showToast("Chat ready", "You are now " + payload.user.username + ".", "chat");
        }, { success: "Profile ready. Opening NEO Chat..." });
        var createTab = authMount.querySelector('[data-neo-auth-action="create"]');
        if (createTab) createTab.click();
      } catch (error) {
        closeProfileMenu();
        feedback.textContent = "Profile setup could not be opened. Try again.";
      }
    }

    function renderSignedOut() {
      thread.textContent = "";
      var box = document.createElement("div");
      box.className = "messages-thread-state messages-auth-state";
      var icon = document.createElement("span");
      icon.className = "messages-auth-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.innerHTML = '<svg class="icon"><use href="#i-chat"></use></svg>';
      var strong = document.createElement("strong");
      strong.textContent = "Create your NEO profile";
      var paragraph = document.createElement("p");
      paragraph.textContent = "Choose a public handle to join shared spaces and direct messages.";
      var action = document.createElement("button");
      action.type = "button";
      action.className = "messages-auth-action";
      action.textContent = "Create profile";
      action.addEventListener("click", openProfileMenu);
      box.append(icon, strong, paragraph, action);
      thread.appendChild(box);
    }

    function renderThread(forceBottom) {
      renderHeader();
      if (!state.session || !state.session.id || !state.session.token) { renderSignedOut(); return; }
      if (state.loading) { threadState("Opening NEO Chat", "Loading recent conversations.", true); return; }
      if (state.error) { threadState("NEO Chat unavailable", state.error, false); return; }
      var rows = messagesFor(state.selected);
      var messageQuery = String(app.querySelector('[data-chat-message-search]')?.value || '').trim().toLowerCase();
      if (messageQuery) rows = rows.filter(function (m) { return [m.text,m.user,m.attachment && m.attachment.name].join(' ').toLowerCase().includes(messageQuery); });
      if (messageQuery && !rows.length) { threadState('No matching messages','Try another word or clear the search.',false); return; }
      if (!rows.length) { threadState("No messages yet", "Start the conversation when you are ready.", false); return; }
      var atBottom = thread.scrollHeight - thread.scrollTop - thread.clientHeight < 70;
      thread.textContent = "";
      rows.forEach(function (message, index) {
        var messageUserId = String(message.userId || nativeChatKey(message.user));
        var own = messageUserId === state.session.id;
        var previous = rows[index - 1];
        var next = rows[index + 1];
        var messageDate = new Date(message.time || Date.now());
        var previousDate = previous ? new Date(previous.time || Date.now()) : null;
        if (!previousDate || previousDate.toDateString() !== messageDate.toDateString()) {
          var separator = document.createElement("time");
          separator.className = "native-message-date";
          separator.dateTime = messageDate.toISOString();
          separator.textContent = messageDate.toDateString() === new Date().toDateString()
            ? "Today " + messageDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
            : messageDate.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) + "  " + messageDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
          thread.appendChild(separator);
        }
        var groupedWithPrevious = Boolean(previous && String(previous.userId || nativeChatKey(previous.user)) === messageUserId && message.time - previous.time < 300000 && previousDate.toDateString() === messageDate.toDateString());
        var groupedWithNext = Boolean(next && String(next.userId || nativeChatKey(next.user)) === messageUserId && next.time - message.time < 300000 && new Date(next.time || Date.now()).toDateString() === messageDate.toDateString());
        var article = document.createElement("article");
        article.className = "native-message" + (own ? " is-own" : "") + (!groupedWithPrevious ? " is-group-start" : "") + (!groupedWithNext ? " is-group-end" : "") + (message.pending ? " is-pending" : "") + (message.failed ? " is-failed" : "");
        article.dataset.messageIdentity = messageIdentity(message);
        if (!own) {
          if (!groupedWithNext) {
            var avatar = document.createElement("span");
            avatar.className = "messages-avatar";
            applyNativeChatAvatar(avatar, nativeChatAccount(state.accounts, messageUserId), message.user);
            article.appendChild(avatar);
          } else {
            var avatarSpacer = document.createElement("span");
            avatarSpacer.className = "messages-avatar-spacer";
            avatarSpacer.setAttribute("aria-hidden", "true");
            article.appendChild(avatarSpacer);
          }
        }
        var body = document.createElement("div");
        body.className = "native-message-body";
        if (!own && !groupedWithPrevious) {
          var author = document.createElement("button");
          author.type = "button";
          author.className = "native-message-author";
          author.textContent = message.user;
          author.dataset.chatUser = messageUserId;
          author.setAttribute("aria-label", "Open " + message.user + " profile");
          body.appendChild(author);
        }
        var bubble = document.createElement("div");
        bubble.className = "native-message-bubble" + (message.attachment ? " has-attachment" : "");
        if (message.attachment && message.attachment.url) {
          var attachment = message.attachment;
          var attachmentKind = String(attachment.type || "").split("/")[0];
          var media;
          if (attachmentKind === "image") { media = document.createElement("img"); media.src = attachment.previewUrl || attachment.url; media.alt = attachment.name || "Image"; }
          else if (attachmentKind === "video") { media = document.createElement("video"); media.src = attachment.url; media.controls = true; media.playsInline = true; media.preload = "metadata"; }
          else if (attachmentKind === "audio") { media = document.createElement("audio"); media.src = attachment.url; media.controls = true; media.preload = "metadata"; }
          else {
            media = document.createElement("span"); media.className = "native-message-file"; media.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-file"></use></svg>';
            var fileCopy = document.createElement("span"); var fileName = document.createElement("strong"); var fileSize = document.createElement("small");
            fileName.textContent = attachment.name || "Attachment"; fileSize.textContent = formatAttachmentSize(attachment.size); fileCopy.append(fileName, fileSize); media.appendChild(fileCopy);
          }
          var attachmentLink = document.createElement("a"); attachmentLink.className = "native-message-attachment"; attachmentLink.href = attachment.url; attachmentLink.target = "_blank"; attachmentLink.rel = "noopener noreferrer"; attachmentLink.download = attachment.name || ""; attachmentLink.appendChild(media); bubble.appendChild(attachmentLink);
        }
        if (message.text) { var messageText = document.createElement("p"); messageText.className = "native-message-text"; messageText.textContent = message.text; bubble.appendChild(messageText); }
        bubble.title = messageDate.toLocaleString();
        var meta = document.createElement("time");
        meta.className = "native-message-meta";
        meta.textContent = message.failed ? "Not Delivered" : (message.pending ? "Sending..." : (index === rows.length - 1 ? nativeChatTime(message.time) : ""));
        meta.dateTime = messageDate.toISOString();
        body.append(bubble, meta);
        if (message.failed && message.clientId) {
          var retryButton = document.createElement("button");
          retryButton.type = "button";
          retryButton.className = "native-message-retry";
          retryButton.dataset.chatRetry = message.clientId;
          retryButton.textContent = "Retry";
          retryButton.setAttribute("aria-label", "Retry message");
          body.appendChild(retryButton);
        }
        article.appendChild(body);
        thread.appendChild(article);
      });
      if (forceBottom || atBottom) requestAnimationFrame(function () { thread.scrollTop = thread.scrollHeight; });
    }

    function syncMobilePanes() {
      var sidebar = app.querySelector(".messages-sidebar");
      var conversation = app.querySelector(".messages-conversation");
      if (!sidebar || !conversation) return;
      var compact = isCompactChat();
      app.classList.toggle("is-compact-layout", compact);
      if (!compact) {
        sidebar.inert = false;
        conversation.inert = false;
        sidebar.removeAttribute("aria-hidden");
        conversation.removeAttribute("aria-hidden");
        return;
      }
      var conversationOpen = app.classList.contains("is-conversation-open");
      sidebar.inert = conversationOpen;
      conversation.inert = !conversationOpen;
      sidebar.setAttribute("aria-hidden", conversationOpen ? "true" : "false");
      conversation.setAttribute("aria-hidden", conversationOpen ? "false" : "true");
    }

    function renderAll(forceBottom) { renderRooms(); renderThread(forceBottom); syncMobilePanes(); }

    function mergePeople(people) {
      (Array.isArray(people) ? people : []).forEach(function (person) {
        var id = String(person && person.id || nativeChatKey(person && person.username));
        if (id) state.accounts[id] = Object.assign({}, state.accounts[id] || {}, person);
      });
    }

    function searchPeople(query) {
      var clean = String(query || "").trim();
      if (clean.length < 2 || !state.session || !state.session.token) {
        state.people = [];
        renderRooms();
        return;
      }
      if (state.searchController) state.searchController.abort();
      state.searchController = new AbortController();
      var controller = state.searchController;
      window.NEO_CHAT_TRANSPORT.search(state.session.token, clean, false, controller.signal).then(function (payload) {
        return payload && payload.users || [];
      }).then(function (people) {
        if (state.destroyed || controller !== state.searchController || clean !== state.search) return;
        state.people = people;
        mergePeople(people);
        renderRooms();
      }).catch(function (error) {
        if (!error || error.name !== "AbortError") {
          state.people = [];
          renderRooms();
        }
      });
    }

    function showProfile(identity) {
      var clean = String(identity || "").trim();
      var account = nativeChatAccount(state.accounts, clean);
      var id = String(account.id || clean || "");
      if (!id || !profileDialog) return;
      state.profileUser = id;
      profileName.textContent = String(account.username || clean || "Member");
      profileStatus.textContent = String(account.bio || account.mood || "NEO member").slice(0, 120);
      profileFeedback.textContent = "";
      profileDm.disabled = id === (state.session && state.session.id) || id === "neo_system";
      profileDm.querySelector("span").textContent = id === "neo_system" ? "System profile" : (profileDm.disabled ? "This is you" : "Message");
      applyNativeChatAvatar(profileAvatar, account, account.username || clean);
      if (typeof profileDialog.showModal === "function" && !profileDialog.open) profileDialog.showModal();
      else profileDialog.setAttribute("open", "");

      if (state.session && state.session.token) {
        window.NEO_CHAT_TRANSPORT.search(state.session.token, account.username || clean, true).then(function (payload) {
          if (state.profileUser !== id || !payload.users || !payload.users[0]) return;
          var person = payload.users[0];
          mergePeople([person]);
          profileName.textContent = person.username;
          profileStatus.textContent = String(person.bio || person.mood || "NEO member").slice(0, 120);
          applyNativeChatAvatar(profileAvatar, person, person.username);
        }).catch(function () {});
      }
    }

    function startDirectMessage(identity) {
      var clean = String(identity || "").trim();
      if (!clean || !state.session || !state.session.token || profileDm.disabled) return;
      profileDm.disabled = true;
      profileFeedback.textContent = "Opening conversation...";
      window.NEO_CHAT_TRANSPORT.createRoom(state.session.token, clean).then(function (payload) {
        return payload && payload.room;
      }).then(function (room) {
        if (!room || !room.id) throw new Error("The conversation response was incomplete.");
        state.rooms[room.id] = room;
        if (typeof profileDialog.close === "function") profileDialog.close();
        else profileDialog.removeAttribute("open");
        selectRoom(room.id);
      }).catch(function (error) {
        profileFeedback.textContent = error && error.message ? error.message : "Could not start the conversation.";
        profileDm.disabled = false;
      });
    }

    function roomSignature(rooms) {
      return Object.entries(rooms || {}).map(function (entry) {
        var room = entry[1] || {};
        return [entry[0], room.id, room.kind, room.type, room.private, room.name, room.title, room.updatedAt, nativeChatMembers(room).join(",")].join(":");
      }).sort().join("|");
    }

    function profileSignature(profiles) {
      return Object.entries(profiles || {}).map(function (entry) {
        var profile = entry[1] || {};
        return [entry[0], profile.username, profile.avatar, profile.bio, profile.mood, profile.status].join(":");
      }).sort().join("|");
    }

    function applyRecent(raw) {
      var rows = nativeChatRows(raw);
      var before = state.recent.map(function (message) { return [messageIdentity(message), message.time, message.user, message.room, message.text].join(":"); }).join("|");
      var after = rows.map(function (message) { return [messageIdentity(message), message.time, message.user, message.room, message.text].join(":"); }).join("|");
      var deliveredClients = new Set(rows.map(function (message) { return message.clientId; }).filter(Boolean));
      Object.keys(state.local).forEach(function (roomId) {
        state.local[roomId] = (state.local[roomId] || []).filter(function (message) {
          return !message.clientId || !deliveredClients.has(message.clientId);
        });
      });
      state.recent = rows;
      return before !== after;
    }

    function loadRecent(quiet) {
      if (!state.session || !state.session.id || state.destroyed) return Promise.resolve();
      if (state.refreshRequest) return state.refreshRequest;
      var sessionToken = state.session.token;
      state.refreshRequest = nativeChatStateRequest(state.session, state.controller.signal, true).then(function (payload) {
        if (!state.session || state.session.token !== sessionToken) return;
        if (state.destroyed) return;
        var beforeRooms = roomSignature(state.rooms);
        var beforeProfiles = profileSignature(state.accounts);
        state.rooms = payload.rooms || {};
        state.accounts = Object.assign({}, state.accounts, payload.profiles || {});
        if (payload.account && payload.account.id) state.accounts[payload.account.id] = Object.assign({}, state.accounts[payload.account.id] || {}, payload.account);
        state.error = "";
        var messagesChanged = applyRecent(payload.messages || []);
        var roomsChanged = beforeRooms !== roomSignature(state.rooms);
        var profilesChanged = beforeProfiles !== profileSignature(state.accounts);
        if (!quiet || messagesChanged || roomsChanged || profilesChanged) renderAll(!quiet);
        state.pollFailures = 0;
        setConnection("Online", true);
      }).catch(function (error) {
        if (state.destroyed) return;
        if (error && (error.status === 401 || error.status === 403)) {
          if (window.NEO_ACCOUNT_STORE) window.NEO_ACCOUNT_STORE.forget(sessionToken);
          else {
            try { localStorage.removeItem("ugp_token"); localStorage.removeItem("ugp_session"); } catch (storageError) {}
          }
          window.dispatchEvent(new CustomEvent("neo-auth-changed", { detail: { user: null } }));
          window.dispatchEvent(new CustomEvent("neo-account-picker"));
          return;
        }
        state.pollFailures += 1;
        if (!quiet || state.pollFailures >= 2) setConnection(quiet ? "Reconnecting..." : "Offline", false);
        if (!quiet) {
          state.error = error && error.name === "AbortError" ? "The chat service took too long to respond." : (error && error.message ? error.message : "Could not load recent messages.");
          renderAll();
        }
      }).finally(function () {
        state.refreshRequest = null;
      });
      return state.refreshRequest;
    }

    function startPolling() {
      window.clearInterval(state.poll);
      state.poll = window.setInterval(function () {
        if (!document.hidden && !state.destroyed && (!hostWindow || !hostWindow.classList.contains("is-minimized"))) loadRecent(true);
      }, NEO_CHAT_POLL_MS);
    }

    function loadApp() {
      if (app.dataset.draftsLoaded === 'true') saveDraft();
      if (state.controller) state.controller.abort();
      Object.values(state.sendRequests).forEach(function (controller) { controller.abort(); });
      state.sendRequests = {};
      state.pendingCount = 0;
      window.clearInterval(state.slowTimer);
      state.slowTimer = 0;
      state.slowUntil = 0;
      state.refreshRequest = null;
      state.pollFailures = 0;
      window.clearInterval(state.poll);
      state.controller = new AbortController();
      var loadVersion = ++state.loadVersion;
      state.session = nativeChatSession();
      var signedIn = Boolean(state.session.id && state.session.token);
      state.loading = signedIn;
      state.error = "";
      state.accounts = {};
      state.rooms = {};
      state.recent = [];
      state.local = {};
      state.people = [];
      feedback.textContent = "";
      accountTag.textContent = signedIn
        ? state.session.username + " · " + (window.NEO_CHAT_TRANSPORT ? window.NEO_CHAT_TRANSPORT.modeLabel() : "NEO Chat")
        : "Guest mode";
      signInButton.hidden = signedIn;
      if (signOutButton) signOutButton.hidden = !signedIn;
      searchInput.disabled = !signedIn;
      composeButton.disabled = !signedIn;
      app.classList.toggle("is-signed-out", !signedIn);
      input.value = "";
      input.placeholder = signedIn ? "Message" : "Create a profile to message";
      restoreDraft(); app.dataset.draftsLoaded = 'true';
      syncComposerState();
      setConnection(signedIn ? "Connecting..." : "Profile not set", false);
      renderAll();
      if (!signedIn) {
        state.loading = false;
        state.error = "";
        renderAll();
        return;
      }
      nativeChatStateRequest(state.session, state.controller.signal, false).then(function (payload) {
        if (state.destroyed || loadVersion !== state.loadVersion) return;
        var linkedUsername = String(payload.account && payload.account.username || "").trim();
        state.recent = nativeChatRows(payload.messages || []);
        state.rooms = payload.rooms || {};
        state.accounts = Object.assign({}, payload.profiles || {});
        state.loading = false;
        if (!linkedUsername) {
          state.error = "This profile could not be resumed.";
          setConnection("Profile unavailable", false);
        } else {
          state.accounts[state.session.id] = Object.assign({}, state.accounts[state.session.id] || {}, payload.account || {}, { username: linkedUsername });
          searchInput.disabled = false;
          composeButton.disabled = false;
          input.placeholder = "Message";
          app.classList.remove("is-signed-out");
          setConnection("Online", true);
          startPolling();
        }
        syncComposerState();
        renderAll(true);
      }).catch(function (error) {
        if (state.destroyed || loadVersion !== state.loadVersion) return;
        state.loading = false;
        if (error && (error.status === 401 || error.status === 403)) {
          if (window.NEO_ACCOUNT_STORE) window.NEO_ACCOUNT_STORE.forget(state.session && state.session.token);
          else {
            try { localStorage.removeItem("ugp_token"); localStorage.removeItem("ugp_session"); } catch (storageError) {}
          }
          state.session = { username: "", id: "", token: "" };
          state.error = "";
          accountTag.textContent = "Guest mode";
          signInButton.hidden = false;
          if (signOutButton) signOutButton.hidden = true;
          searchInput.disabled = true;
          composeButton.disabled = true;
          input.placeholder = "Create a profile to message";
          app.classList.add("is-signed-out");
          setConnection("Profile not set", false);
          syncComposerState();
          renderAll();
          window.dispatchEvent(new CustomEvent("neo-auth-changed", { detail: { user: null } }));
          window.dispatchEvent(new CustomEvent("neo-account-picker"));
          return;
        }
        state.error = error && error.name === "AbortError" ? "The chat service took too long to respond." : (error && error.message ? error.message : "Could not connect to NEO Chat.");
        setConnection("Offline", false);
        startPolling();
        syncComposerState();
        renderAll();
      });
    }

    function selectRoom(id) {
      if (id !== "global" && !roomById(id)) return;
      saveDraft();
      state.selected = id;
      restoreDraft();
      app.classList.add("is-conversation-open");
      feedback.textContent = "";
      renderAll(true);
      if (isCompactChat()) {
        var backButton = app.querySelector("[data-chat-back]");
        if (backButton) backButton.focus({ preventScroll: true });
      } else {
        input.focus({ preventScroll: true });
      }
    }

    function createClientMessageId() {
      var random = "";
      if (window.crypto && typeof window.crypto.getRandomValues === "function") {
        var bytes = new Uint32Array(2);
        window.crypto.getRandomValues(bytes);
        random = Array.from(bytes).map(function (value) { return value.toString(36); }).join("");
      } else {
        random = Math.random().toString(36).slice(2, 14);
      }
      return "c" + Date.now().toString(36) + random.slice(0, 20);
    }

    function sendMessage(text, retryMessage) {
      var clean = String(retryMessage ? retryMessage.text : text || "").trim();
      var attachmentDraft = retryMessage ? retryMessage.attachment : state.attachment;
      if ((!clean && !attachmentDraft) || !canCompose()) return;
      if (slowModeRemaining() > 0) {
        beginSlowMode(slowModeRemaining());
        return;
      }
      var roomId = String(retryMessage ? retryMessage.room : state.selected || "global");
      if (roomId !== "global" && !roomById(roomId)) {
        feedback.textContent = "That conversation is no longer available.";
        return;
      }
      var clientId = String(retryMessage && retryMessage.clientId || createClientMessageId());
      if (state.sendRequests[clientId]) return;
      var optimistic = retryMessage || {
        id: clientId,
        clientId: clientId,
        room: roomId,
        userId: state.session.id,
        user: state.session.username,
        text: clean,
        attachment: attachmentDraft ? Object.assign({}, attachmentDraft, { url: attachmentDraft.url || attachmentDraft.dataUrl || "" }) : null,
        time: Date.now()
      };
      optimistic.pending = true;
      optimistic.failed = false;
      state.local[roomId] = state.local[roomId] || [];
      if (!state.local[roomId].some(function (item) { return item.clientId === clientId; })) state.local[roomId].push(optimistic);
      if (!retryMessage) {
        input.value = "";
        input.style.height = "38px";
        clearAttachment();
        saveDraft();
      }
      feedback.textContent = "";
      state.pendingCount += 1;
      syncComposerState();
      renderAll(true);

      var requestVersion = state.loadVersion;
      var controller = new AbortController();
      var timeout = window.setTimeout(function () { controller.abort(); }, attachmentDraft ? 30_000 : 8_000);
      state.sendRequests[clientId] = controller;
      var upload = attachmentDraft && attachmentDraft.dataBase64
        ? window.NEO_CHAT_TRANSPORT.upload(state.session.token, attachmentDraft, controller.signal)
        : Promise.resolve(attachmentDraft || null);
      upload.then(function (uploadedAttachment) {
        optimistic.attachment = uploadedAttachment || attachmentDraft || null;
        return window.NEO_CHAT_TRANSPORT.send(state.session.token, clean, roomId, clientId, uploadedAttachment, controller.signal);
      }).then(function (payload) {
        if (!payload || !payload.message) throw new Error("The message service returned an incomplete response.");
        return payload.message;
      }).then(function (message) {
        if (state.destroyed || requestVersion !== state.loadVersion) return;
        state.local[roomId] = (state.local[roomId] || []).filter(function (item) { return item.clientId !== clientId; });
        var delivered = nativeChatRows([message])[0];
        if (delivered && !state.recent.some(function (item) { return messageIdentity(item) === messageIdentity(delivered); })) state.recent.push(delivered);
        if (state.rooms[roomId]) state.rooms[roomId].updatedAt = Number(message.time || Date.now());
        beginSlowMode(NEO_CHAT_SLOW_MODE_MS);
        renderAll(true);
        window.setTimeout(function () { loadRecent(true); }, 250);
      }).catch(function (error) {
        if (state.destroyed || requestVersion !== state.loadVersion) return;
        if (error && error.code === "slow_mode") {
          state.local[roomId] = (state.local[roomId] || []).filter(function (item) { return item.clientId !== clientId; });
          if (!retryMessage && !input.value.trim()) {
            input.value = clean;
            input.style.height = "38px";
            input.style.height = Math.min(input.scrollHeight, 92) + "px";
          }
          if (!retryMessage && attachmentDraft && !state.attachment) { state.attachment = attachmentDraft; renderAttachmentDraft(); }
          feedback.textContent = "Slow mode is on. Your message is still ready to send.";
          beginSlowMode(error.retryAfterMs || NEO_CHAT_SLOW_MODE_MS);
          renderAll(true);
          return;
        }
        optimistic.pending = false;
        optimistic.failed = true;
        feedback.textContent = error && error.name === "AbortError"
          ? "Sending timed out. Retry when your connection is ready."
          : (error && error.message ? error.message : "Could not send message.");
        renderAll(true);
      }).finally(function () {
        window.clearTimeout(timeout);
        if (state.sendRequests[clientId] === controller) delete state.sendRequests[clientId];
        state.pendingCount = Math.max(0, state.pendingCount - 1);
        if (requestVersion === state.loadVersion) {
          syncComposerState();
          if (!state.destroyed) input.focus({ preventScroll: true });
        }
      });
    }

    app.addEventListener("click", function (event) {
      if (event.target.closest("[data-chat-attachment-remove]")) { event.preventDefault(); clearAttachment(); return; }
      var retry = event.target.closest("[data-chat-retry]");
      if (retry) {
        event.preventDefault();
        var clientId = String(retry.dataset.chatRetry || "");
        var retryMessage = Object.values(state.local).flat().find(function (message) { return message.clientId === clientId; });
        if (retryMessage) sendMessage(retryMessage.text, retryMessage);
        return;
      }
      var person = event.target.closest("[data-chat-user]");
      if (person) {
        event.preventDefault();
        showProfile(person.dataset.chatUser);
        return;
      }
      var button = event.target.closest("[data-chat-room]");
      if (button) selectRoom(button.dataset.chatRoom);
    });
    searchInput.addEventListener("input", function (event) {
      state.search = event.target.value.trim();
      state.people = [];
      window.clearTimeout(state.searchTimer);
      renderRooms();
      if (state.search.length >= 2) state.searchTimer = window.setTimeout(function () { searchPeople(state.search); }, 220);
    });
    composeButton.addEventListener("click", function () {
      app.classList.remove("is-conversation-open");
      searchInput.focus({ preventScroll: true });
      searchInput.select();
    });
    signInButton.addEventListener("click", openProfileMenu);
    if (authClose) authClose.addEventListener("click", closeProfileMenu);
    if (authDialog) {
      authDialog.addEventListener("cancel", function (event) {
        event.preventDefault();
        closeProfileMenu();
      });
      authDialog.addEventListener("click", function (event) {
        if (event.target === authDialog) closeProfileMenu();
      });
      authDialog.addEventListener("close", clearProfileMenu);
    }
    if (signOutButton) signOutButton.addEventListener("click", function () {
      if (window.NEO_ACCOUNT_STORE) window.NEO_ACCOUNT_STORE.clearActive();
      else {
        try { localStorage.removeItem("ugp_token"); localStorage.removeItem("ugp_session"); } catch (error) {}
      }
      try { sessionStorage.removeItem(GUEST_SESSION_KEY); } catch (error) {}
      window.dispatchEvent(new CustomEvent("neo-auth-changed", { detail: { user: null } }));
      window.dispatchEvent(new CustomEvent("neo-account-picker"));
    });
    app.querySelector("[data-chat-back]").addEventListener("click", function () {
      app.classList.remove("is-conversation-open");
      syncMobilePanes();
      var selectedRoom = app.querySelector('[data-chat-room="' + escapeSelector(state.selected) + '"]');
      if (selectedRoom) selectedRoom.focus({ preventScroll: true });
    });
    if (profileDm) profileDm.addEventListener("click", function () { startDirectMessage(state.profileUser); });
    if (hostWindow) hostWindow.addEventListener("neo-chat-open-section", function (event) {
      app.classList.remove("is-conversation-open");
      syncMobilePanes();
      if (event.detail && event.detail.section === "servers" && serverSection) serverSection.scrollIntoView({ block: "start" });
    });
    input.addEventListener("input", function () {
      input.style.height = "38px";
      input.style.height = Math.min(input.scrollHeight, 92) + "px";
      saveDraft();
      syncComposerState();
    });
    input.addEventListener("keydown", function (event) {
      if (event.isComposing) return;
      if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); form.requestSubmit(); }
    });
    if (attachButton && attachmentInput) {
      attachButton.addEventListener("click", function () { if (!attachButton.disabled) attachmentInput.click(); });
      attachmentInput.addEventListener("change", function () { selectAttachment(attachmentInput.files && attachmentInput.files[0]); });
    }
    form.addEventListener("submit", function (event) { event.preventDefault(); sendMessage(input.value); });
    function handleAuthChanged() { if (!state.destroyed) loadApp(); }
    function handleVisibilityChanged() {
      if (!document.hidden && !state.destroyed && state.session && state.session.id) loadRecent(true);
    }
    function handleMessagesResize() { if (!state.destroyed) syncMobilePanes(); }
    window.addEventListener("neo-auth-changed", handleAuthChanged);
    function refreshLocalChat(event) {
      if (event.type === 'storage' && event.key !== 'neo_chat_local_state_v2') return;
      if (!state.destroyed && !state.loading && state.session && state.session.token) loadRecent(true);
    }
    app.querySelector('[data-chat-message-search]')?.addEventListener('input', function () { renderThread(false); });
    window.addEventListener('neo-chat-local-changed', refreshLocalChat);
    window.addEventListener('storage', refreshLocalChat);
    window.addEventListener("resize", handleMessagesResize, { passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChanged);
    if (window.ResizeObserver) {
      messagesResizeObserver = new ResizeObserver(handleMessagesResize);
      messagesResizeObserver.observe(app);
    }
    var experienceCleanup = window.NEO_CHAT_EXPERIENCE ? window.NEO_CHAT_EXPERIENCE(app,{state:function(){return state;},refresh:function(){loadRecent(true);},notify:function(text){showToast('NEO Chat',text,'info');}}) : null;
    if (hostWindow) hostWindow._neoMessagesCleanup = function () {
      if (experienceCleanup) experienceCleanup();
      saveDraft();
      window.removeEventListener('neo-chat-local-changed', refreshLocalChat);
      window.removeEventListener('storage', refreshLocalChat);
      state.destroyed = true;
      window.clearInterval(state.poll);
      window.clearInterval(state.slowTimer);
      window.clearTimeout(state.searchTimer);
      if (state.controller) state.controller.abort();
      if (state.searchController) state.searchController.abort();
      Object.values(state.sendRequests).forEach(function (controller) { controller.abort(); });
      closeProfileMenu();
      window.removeEventListener("neo-auth-changed", handleAuthChanged);
      window.removeEventListener("resize", handleMessagesResize);
      document.removeEventListener("visibilitychange", handleVisibilityChanged);
      if (messagesResizeObserver) messagesResizeObserver.disconnect();
    };
    loadApp();
  }

  function mountGameTouchControls(body, frame) {
    var controls = document.createElement("section");
    controls.className = "mobile-game-controls";
    controls.setAttribute("aria-label", "Touch game controls");
    controls.innerHTML =
      '<div class="mobile-game-dpad" aria-label="Direction controls">' +
        '<button type="button" data-game-direction data-game-arrow="38" data-game-wasd="87" aria-label="Move up">&#8593;</button>' +
        '<button type="button" data-game-direction data-game-arrow="37" data-game-wasd="65" aria-label="Move left">&#8592;</button>' +
        '<button type="button" data-game-direction data-game-arrow="40" data-game-wasd="83" aria-label="Move down">&#8595;</button>' +
        '<button type="button" data-game-direction data-game-arrow="39" data-game-wasd="68" aria-label="Move right">&#8594;</button>' +
      '</div>' +
      '<div class="mobile-game-actions" aria-label="Action controls">' +
        '<button type="button" data-game-keys="32" aria-label="Primary action">A</button>' +
        '<button type="button" data-game-keys="13" aria-label="Start or confirm">START</button>' +
        '<button type="button" data-game-keys="27" aria-label="Pause or escape">ESC</button>' +
      '</div>' +
      '<button class="mobile-game-map-toggle" type="button" aria-label="Use WASD movement keys" aria-pressed="false">ARROWS</button>' +
      '<button class="mobile-game-controls-toggle" type="button" aria-label="Hide touch controls" aria-pressed="true">CONTROLS</button>';
    controls.dataset.moveMode = "arrow";

    var keyNames = {
      13: { key: "Enter", code: "Enter" },
      27: { key: "Escape", code: "Escape" },
      32: { key: " ", code: "Space" },
      37: { key: "ArrowLeft", code: "ArrowLeft" },
      38: { key: "ArrowUp", code: "ArrowUp" },
      39: { key: "ArrowRight", code: "ArrowRight" },
      40: { key: "ArrowDown", code: "ArrowDown" },
      65: { key: "a", code: "KeyA" },
      68: { key: "d", code: "KeyD" },
      83: { key: "s", code: "KeyS" },
      87: { key: "w", code: "KeyW" }
    };

    function dispatchGameKey(keyCode, pressed) {
      try {
        var frameWindow = frame.contentWindow;
        var frameDocument = frame.contentDocument;
        if (!frameWindow || !frameDocument) return;
        var identity = keyNames[keyCode] || { key: "", code: "" };
        var event = new frameWindow.KeyboardEvent(pressed ? "keydown" : "keyup", {
          key: identity.key,
          code: identity.code,
          bubbles: true,
          cancelable: true
        });
        try { Object.defineProperty(event, "keyCode", { configurable: true, value: keyCode }); } catch (error) {}
        try { Object.defineProperty(event, "which", { configurable: true, value: keyCode }); } catch (error) {}
        var target = frameDocument.activeElement && frameDocument.activeElement !== frameDocument.body
          ? frameDocument.activeElement
          : frameDocument;
        target.dispatchEvent(event);
      } catch (error) {
        // A game can replace its document while loading; the next press will use the new document.
      }
    }

    function buttonKeyCodes(button) {
      if (button.hasAttribute("data-game-direction")) {
        return [Number(controls.dataset.moveMode === "wasd" ? button.dataset.gameWasd : button.dataset.gameArrow)];
      }
      return String(button.dataset.gameKeys || "").split(",").map(Number).filter(Boolean);
    }

    function setPressed(button, pressed, keyCodes) {
      (keyCodes || buttonKeyCodes(button)).forEach(function (value) {
        var code = Number(value);
        if (code) dispatchGameKey(code, pressed);
      });
      button.classList.toggle("is-pressed", pressed);
    }

    controls.addEventListener("pointerdown", function (event) {
      var button = event.target.closest("[data-game-keys], [data-game-direction]");
      if (!button || button.dataset.activePointer) return;
      button.dataset.activePointer = String(event.pointerId);
      button.dataset.activeKeyCodes = buttonKeyCodes(button).join(",");
      try { button.setPointerCapture(event.pointerId); } catch (error) {}
      setPressed(button, true, button.dataset.activeKeyCodes.split(",").map(Number));
      event.preventDefault();
      event.stopPropagation();
    }, { passive: false });

    function releaseGameButton(event) {
      var button = event.target.closest && event.target.closest("[data-game-keys], [data-game-direction]");
      if (!button || button.dataset.activePointer !== String(event.pointerId)) return;
      var keyCodes = String(button.dataset.activeKeyCodes || "").split(",").map(Number).filter(Boolean);
      delete button.dataset.activePointer;
      delete button.dataset.activeKeyCodes;
      setPressed(button, false, keyCodes);
      event.preventDefault();
      event.stopPropagation();
    }
    controls.addEventListener("pointerup", releaseGameButton);
    controls.addEventListener("pointercancel", releaseGameButton);
    controls.addEventListener("lostpointercapture", releaseGameButton);
    controls.addEventListener("contextmenu", function (event) { event.preventDefault(); });
    controls.querySelector(".mobile-game-map-toggle").addEventListener("click", function (event) {
      var useWasd = controls.dataset.moveMode !== "wasd";
      controls.dataset.moveMode = useWasd ? "wasd" : "arrow";
      event.currentTarget.textContent = useWasd ? "WASD" : "ARROWS";
      event.currentTarget.setAttribute("aria-pressed", useWasd ? "true" : "false");
      event.currentTarget.setAttribute("aria-label", useWasd ? "Use arrow movement keys" : "Use WASD movement keys");
    });
    controls.querySelector(".mobile-game-controls-toggle").addEventListener("click", function (event) {
      var collapsed = controls.classList.toggle("is-collapsed");
      event.currentTarget.setAttribute("aria-pressed", collapsed ? "false" : "true");
      event.currentTarget.setAttribute("aria-label", collapsed ? "Show touch controls" : "Hide touch controls");
    });
    body.appendChild(controls);
  }

  function mountFrame(app, body) {
    var browserBacked = app.id === "browser" || Boolean(app.custom) || app.proxyApp === true;
    var directGame = app.launchMode === "direct-game";
    var fetchedDirectGame = directGame;
    function directGameDocumentRoute(route) {
      if (!directGame || !localConfig.gameDocumentRelay) return route;
      try {
        var source = new URL(route, document.baseURI);
        if (source.protocol !== "https:" || source.hostname.toLowerCase() !== "a.luminsdk.com" || !/^\/g\/[A-Za-z0-9_-]+\//.test(source.pathname)) return route;
        var relay = new URL(localConfig.gameDocumentRelay, document.baseURI);
        relay.searchParams.set("url", source.href);
        return relay.href;
      } catch (_error) {
        return route;
      }
    }
    if (browserBacked && location.protocol === "file:") {
      body.innerHTML = '<div class="feature-loader is-error" role="alert"><strong>Browser needs the NEO web runtime</strong><p>Tabs and website loading require the local secure context; they cannot run from a raw file.</p><a class="button primary" data-browser-runtime-link>Open working NEO OS</a></div>';
      var browserRuntimeLink = body.querySelector("[data-browser-runtime-link]");
      browserRuntimeLink.href = localConfig.preview || "http://127.0.0.1:3092/neo-os/";
      return;
    }
    var loader = document.createElement("div");
    loader.className = "frame-loader";
    loader.innerHTML = "<span></span><p>Opening " + app.title + "...</p>";
    var fallback = document.createElement("div");
    fallback.className = "frame-error";
    var fallbackTitle = document.createElement("strong");
    var fallbackCopy = document.createElement("p");
    var fallbackActions = document.createElement("div");
    var retry = document.createElement("button");
    var direct = document.createElement("button");
    fallbackTitle.textContent = "Unable to open " + app.title;
    fallbackCopy.textContent = directGame
      ? "Retry the protected game document. NEO will not fall back to an ad-enabled page."
      : "Retry this built-in app. Slow starts are retried automatically.";
    fallbackActions.className = "upload-actions";
    retry.className = "button primary";
    retry.type = "button";
    retry.setAttribute("data-frame-retry", "");
    retry.textContent = "Retry";
    direct.className = "button";
    direct.type = "button";
    direct.setAttribute("data-frame-direct", app.route);
    direct.innerHTML = iconMarkup("external") + "Open directly";
    fallbackActions.append(retry);
    if (!directGame) fallbackActions.append(direct);
    fallback.append(fallbackTitle, fallbackCopy, fallbackActions);
    var frame = document.createElement("iframe");
    frame.title = app.title;
    frame.loading = "eager";
    if (browserBacked) frame.setAttribute("fetchpriority", "high");
    frame.referrerPolicy = "same-origin";
    var frameSandbox = [
      "allow-same-origin",
      "allow-scripts",
      "allow-forms",
      "allow-downloads",
      "allow-pointer-lock",
      "allow-presentation"
    ];
    if (!directGame) frameSandbox.push("allow-popups");
    if (app.id !== "browser") frameSandbox.push("allow-modals");
    frame.sandbox = frameSandbox.join(" ");
    frame.allow = "fullscreen; autoplay; picture-in-picture; gamepad; clipboard-read; clipboard-write; display-capture";
    frame.setAttribute("allowfullscreen", "");
    frame.dataset.route = app.route;
    body.append(loader, fallback, frame);
    if (app.id.indexOf("zone-") === 0) mountGameTouchControls(body, frame);

    var timeout = 0;
    var loadAttempt = 0;
    var failureHandled = false;
    var hostWindow = body.closest(".neo-window");
    var youtubePopoutSnapshot = null;
    var youtubePopoutDrag = null;
    var supportsShellMediaPopout = app.id === "youtube-app" || app.id === "movies";

    function setShellYouTubePopout(data) {
      if (!supportsShellMediaPopout || !hostWindow) return;
      if (data.active === true) {
        if (!youtubePopoutSnapshot) {
          youtubePopoutSnapshot = {
            style: hostWindow.getAttribute("style"),
            maximized: hostWindow.classList.contains("is-maximized"),
            snapped: hostWindow.classList.contains("is-snapped"),
            tabFullscreen: hostWindow.classList.contains("is-tab-fullscreen")
          };
        }
        cancelWindowMotion(hostWindow);
        hostWindow.classList.remove("is-maximized", "is-snapped", "is-tab-fullscreen");
        hostWindow.classList.add("is-youtube-popout", "is-media-popout");
        hostWindow.dataset.youtubePopoutMode = data.mode === "shorts" ? "shorts" : "watch";
        var layerRect = windowLayer.getBoundingClientRect();
        var isShort = hostWindow.dataset.youtubePopoutMode === "shorts";
        var width = Math.min(isShort ? 270 : 440, Math.max(220, layerRect.width - 20));
        var height = isShort ? Math.min(480, Math.max(300, layerRect.height - 20)) : Math.round(width * 9 / 16);
        if (height > layerRect.height - 20) {
          height = Math.max(124, layerRect.height - 20);
          if (!isShort) width = Math.round(height * 16 / 9);
        }
        hostWindow.style.inset = "auto";
        hostWindow.style.width = Math.round(width) + "px";
        hostWindow.style.height = Math.round(height) + "px";
        hostWindow.style.left = Math.max(0, Math.round(layerRect.width - width - 14)) + "px";
        hostWindow.style.top = Math.max(0, Math.round(layerRect.height - height - 14)) + "px";
        activateWindow(hostWindow);
        return;
      }
      if (!youtubePopoutSnapshot) return;
      var snapshot = youtubePopoutSnapshot;
      youtubePopoutSnapshot = null;
      youtubePopoutDrag = null;
      hostWindow.classList.remove("is-youtube-popout", "is-media-popout");
      delete hostWindow.dataset.youtubePopoutMode;
      if (snapshot.style == null) hostWindow.removeAttribute("style");
      else hostWindow.setAttribute("style", snapshot.style);
      hostWindow.classList.toggle("is-maximized", snapshot.maximized);
      hostWindow.classList.toggle("is-snapped", snapshot.snapped);
      hostWindow.classList.toggle("is-tab-fullscreen", snapshot.tabFullscreen);
      syncMaximizeButton(hostWindow);
      activateWindow(hostWindow);
    }

    function dragShellYouTubePopout(data) {
      if (!supportsShellMediaPopout || !hostWindow || !youtubePopoutSnapshot || !hostWindow.classList.contains("is-media-popout")) return;
      var phase = String(data.phase || "");
      if (phase === "start") {
        var rect = hostWindow.getBoundingClientRect();
        var layerRect = windowLayer.getBoundingClientRect();
        youtubePopoutDrag = {
          screenX: Number(data.screenX) || 0,
          screenY: Number(data.screenY) || 0,
          left: rect.left - layerRect.left,
          top: rect.top - layerRect.top,
          maxLeft: Math.max(0, layerRect.width - rect.width),
          maxTop: Math.max(0, layerRect.height - rect.height)
        };
        hostWindow.classList.add("is-dragging");
        activateWindow(hostWindow);
        return;
      }
      if (!youtubePopoutDrag) return;
      if (phase === "move") {
        hostWindow.style.left = Math.round(clamp(youtubePopoutDrag.left + (Number(data.screenX) || 0) - youtubePopoutDrag.screenX, 0, youtubePopoutDrag.maxLeft)) + "px";
        hostWindow.style.top = Math.round(clamp(youtubePopoutDrag.top + (Number(data.screenY) || 0) - youtubePopoutDrag.screenY, 0, youtubePopoutDrag.maxTop)) + "px";
        return;
      }
      if (phase === "end" || phase === "cancel") {
        youtubePopoutDrag = null;
        hostWindow.classList.remove("is-dragging");
      }
    }

    function handleEmbeddedMediaState(event) {
      if (event.source !== frame.contentWindow) return;
      var data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "neo-shell:youtube-popout" || data.type === "neo-shell:media-popout") {
        setShellYouTubePopout(data);
        return;
      }
      if (data.type === "neo-shell:youtube-popout-drag" || data.type === "neo-shell:media-popout-drag") {
        dragShellYouTubePopout(data);
        return;
      }
      if (data.type === "neo-shell:video-route") {
        if (data.active === true) pauseMusicForVideoFocus();
        window.dispatchEvent(new CustomEvent("neo-media-priority", {
          detail: {
            source: "route-focus:" + app.id,
            active: data.active === true,
            kind: "video",
            pauseWallpaper: true
          }
        }));
        return;
      }
      if (data.type === "neo-shell:audio-levels") {
        window.dispatchEvent(new CustomEvent("neo-media-levels", {
          detail: {
            source: "route-audio:" + app.id,
            appId: app.id,
            levels: Array.isArray(data.levels) ? data.levels : [],
            measured: data.measured === true,
            active: data.active === true,
            bands: Number(data.bands) || 32,
            interval: Number(data.interval) || 100
          }
        }));
        return;
      }
      if (data.type !== "neo-shell:media-state") return;
      var videoRoute = app.id === "youtube-app" || browserBacked;
      window.dispatchEvent(new CustomEvent("neo-media-state", {
        detail: {
          source: "route-media:" + app.id,
          appId: app.id,
          active: data.active === true,
          playing: data.playing === true,
          muted: data.muted === true,
          kind: videoRoute ? "video" : "media",
          pauseWallpaper: videoRoute
        }
      }));
    }
    function clearEmbeddedMediaState() {
      window.dispatchEvent(new CustomEvent("neo-media-priority", {
        detail: {
          source: "route-focus:" + app.id,
          active: false,
          kind: "video",
          pauseWallpaper: true
        }
      }));
      window.dispatchEvent(new CustomEvent("neo-media-state", {
        detail: {
          source: "route-media:" + app.id,
          appId: app.id,
          active: false,
          playing: false,
          muted: false,
          kind: "video",
          pauseWallpaper: true
        }
      }));
      window.dispatchEvent(new CustomEvent("neo-media-levels", {
        detail: {
          source: "route-audio:" + app.id,
          appId: app.id,
          levels: [],
          measured: true,
          active: false,
          bands: 32,
          interval: 100
        }
      }));
    }
    function relayNeoBrowserMessage(event) {
      if (!browserBacked || event.source === frame.contentWindow) return;
      var data = event.data;
      if (!data || typeof data !== "object" || !Object.prototype.hasOwnProperty.call(data, "__neoBridge")) return;
      try {
        frame.contentWindow.postMessage(data, "*");
      } catch (_error) {
        // Ignore messages sent while the browser frame is being replaced.
      }
    }
    function relayHostWindowState(event) {
      var detail = event && event.detail;
      if (!detail || detail.id !== app.id) return;
      try {
        frame.contentWindow.postMessage({
          type: "neo-shell:visibility",
          visible: detail.closed !== true && detail.minimized !== true
        }, "*");
      } catch (_error) {
        // Ignore state changes while the embedded frame is being replaced.
      }
    }
    window.addEventListener("message", handleEmbeddedMediaState);
    window.addEventListener("neo-window-state-change", relayHostWindowState);
    if (browserBacked) window.addEventListener("message", relayNeoBrowserMessage);
    if (hostWindow) hostWindow._neoExtraCleanup = function () {
      window.removeEventListener("message", handleEmbeddedMediaState);
      window.removeEventListener("neo-window-state-change", relayHostWindowState);
      if (browserBacked) window.removeEventListener("message", relayNeoBrowserMessage);
      setShellYouTubePopout({ active: false });
      clearEmbeddedMediaState();
    };
    function applyHostIntegration() {
      if (!browserBacked) return;
      try {
        var frameDocument = frame.contentDocument;
        if (!frameDocument || !frameDocument.head || frameDocument.getElementById("neo-os-browser-host-fixes")) return;
        var style = frameDocument.createElement("style");
        style.id = "neo-os-browser-host-fixes";
        style.textContent = "#spotOverlay{pointer-events:none!important}";
        frameDocument.head.appendChild(style);
      } catch (_error) {
        // The supplied browser remains usable if a future build becomes cross-origin.
      }
    }
    function handleLoadFailure(attempt) {
      if (attempt !== loadAttempt || failureHandled) return;
      window.clearTimeout(timeout);
      loader.classList.add("is-complete");
      if (removeUnavailableApp(app, hostWindow)) {
        failureHandled = true;
        return;
      }
      fallback.classList.add("is-visible");
    }
    function beginLoad() {
      var attempt = ++loadAttempt;
      loader.classList.remove("is-complete");
      fallback.classList.remove("is-visible");
      window.clearTimeout(timeout);
      timeout = window.setTimeout(function () {
        if (attempt !== loadAttempt || failureHandled) return;
        if (attempt === 1) {
          beginLoad();
          return;
        }
        handleLoadFailure(attempt);
      }, attempt === 1 ? 12000 : 18000);
      var protectedRoute = fetchedDirectGame ? directGameDocumentRoute(app.route) : app.route;
      if (directGame) frame.referrerPolicy = "no-referrer";
      var frameLoad = window.NEOFrameLoader
        ? window.NEOFrameLoader.load(frame, protectedRoute, {
            forceFetch: directGame || !browserBacked,
            gameDocumentFallback: directGame ? function (gameUrl, signal) {
              if (signal && signal.aborted) throw new DOMException("The request was aborted.", "AbortError");
              return loadBrowseRuntime().then(function (engine) {
                if (!engine || typeof engine.fetchDocument !== "function") throw new Error("The protected game transport is unavailable.");
                return engine.fetchDocument(gameUrl);
              });
            } : null
          })
        : directGame
          ? Promise.reject(new Error("The protected game loader is unavailable."))
          : Promise.resolve().then(function () { frame.src = app.route; });
      frameLoad.catch(function (error) {
        if ((error && error.name === "AbortError") || attempt !== loadAttempt) return;
        handleLoadFailure(attempt);
      });
    }
    frame.addEventListener("load", function () {
      failureHandled = false;
      window.clearTimeout(timeout);
      applyHostIntegration();
      applyInterfaceStyleToFrame(frame);
      applyCursorThemeToFrame(frame);
      try {
        if (frame.contentDocument && frame.contentDocument.documentElement) {
          frame.contentDocument.documentElement.dataset.neoPerformanceMode = performanceMode();
        }
        frame.contentWindow.postMessage({ type: "neo-shell:performance-mode", mode: performanceMode() }, "*");
        frame.contentWindow.postMessage({ type: "neo-shell:visibility", visible: !(hostWindow && hostWindow.classList.contains("is-minimized")) }, "*");
      } catch (_error) {}
      loader.classList.add("is-complete");
      fallback.classList.remove("is-visible");
    });
    frame.addEventListener("error", function () {
      handleLoadFailure(loadAttempt);
    });
    retry.addEventListener("click", beginLoad);
    beginLoad();
  }

  function openApp(id) {
    if (id === "personalize") id = "control";
    var app = apps[id];
    if (!app) return null;
    if (app.launcher && !app.installed) {
      showToast("App not available", app.title + " is not available on this device.", "apps");
      return null;
    }
    if (id === "youtube-app") pauseMusicForVideoFocus();
    setXenoCommandOpen(false);
    setLauncherOpen(false);
    if (app.launcher) recordRecentApp(id);
    var existing = openWindows.get(id);
    if (existing) {
      var wasMinimized = existing.classList.contains("is-minimized") || existing.classList.contains("is-minimizing");
      if (wasMinimized) {
        setWindowMotionOrigin(existing, id);
        cancelWindowMotion(existing);
        setWindowMinimized(existing, false);
        existing.classList.add("is-open");
        playWindowMotion(existing, "restoring", 340);
      }
      renderDock();
      activateWindow(existing);
      return existing;
    }
    var cached = musicRuntime.restoreWindow(id, openWindows, renderDock, activateWindow);
    if (cached) return cached;
    return createWindow(app);
  }

  function openWallpaperSource(source) {
    var win = openApp("wallpaper");
    if (!win) return null;
    requestAnimationFrame(function () {
      var studio = win.querySelector("[data-wallpaper-studio]");
      if (!studio) return;
      studio.dataset.wallpaperSource = source === "workshop" ? "workshop" : (source === "discover" ? "discover" : "installed");
      studio.dataset.wallpaperView = "installed";
      refreshWallpaperStudio(studio);
      if (studio.dataset.wallpaperSource !== "installed") loadOnlineWallpapers(studio, studio.dataset.wallpaperSource);
    });
    return win;
  }

  function openBrowserTarget(target, label) {
    var win = openApp("browser");
    if (!win) return null;
    requestAnimationFrame(function () {
      var browser = win.querySelector("[data-neo-browser]");
      if (!browser) return;
      browser.dispatchEvent(new CustomEvent("neo-browser-open", { detail: { target: target, label: label || "Web page" } }));
    });
    return win;
  }

  function normalizedProxyTarget(value) {
    try {
      var url = new URL(String(value || ""), document.baseURI);
      if (url.protocol !== "http:" && url.protocol !== "https:") return "";
      url.username = "";
      url.password = "";
      var hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
      if (hostname === "localhost" || hostname === "0.0.0.0" || hostname === "::1" || hostname.endsWith(".local")) return "";
      if (/^127\./.test(hostname) || /^10\./.test(hostname) || /^192\.168\./.test(hostname) || /^169\.254\./.test(hostname)) return "";
      var private172 = hostname.match(/^172\.(\d{1,3})\./);
      if (private172 && Number(private172[1]) >= 16 && Number(private172[1]) <= 31) return "";
      if (/^(?:fc|fd|fe8|fe9|fea|feb)/i.test(hostname)) return "";
      return url.href;
    } catch (_error) {
      return "";
    }
  }

  function isShellOwnedUrl(value) {
    var target;
    try { target = new URL(value, document.baseURI); } catch (_error) { return false; }
    var candidates = [document.baseURI, location.href];
    if (localConfig) {
      ["assetBase", "music", "browser", "gamesCatalog", "gamesCovers", "support", "unavailable"].forEach(function (key) {
        if (localConfig[key]) candidates.push(localConfig[key]);
      });
    }
    return candidates.some(function (candidate) {
      try { return new URL(candidate, document.baseURI).origin === target.origin; } catch (_error) { return false; }
    });
  }

  function proxyableExternalTarget(value) {
    var target = normalizedProxyTarget(value);
    return target && !isShellOwnedUrl(target) ? target : "";
  }

  function ownsFrameWindow(source) {
    function ownsInDocument(frameDocument, depth) {
      if (!frameDocument || depth < 0) return false;
      return Array.prototype.some.call(frameDocument.querySelectorAll("iframe"), function (frame) {
        try {
          if (frame.contentWindow === source) return true;
          return depth > 0 && ownsInDocument(frame.contentDocument, depth - 1);
        } catch (_error) {
          return false;
        }
      });
    }
    return ownsInDocument(document, 5);
  }

  function handleProxyBridgeMessage(event) {
    var data = event.data;
    if (!data || typeof data !== "object") return;
    if (data.type === "neo-browser:settings-request") {
      if (!ownsFrameWindow(event.source)) return;
      try {
        event.source.postMessage({
          type: "neo:browser-settings-change",
          searchEngine: normalizeBrowserSearchEngine(settings.browserSearchEngine)
        }, "*");
      } catch (_error) {}
      return;
    }
    if (data.type === "neo-shell:open-game-window") {
      if (!ownsFrameWindow(event.source)) return;
      var gameWindowReply = function (payload) {
        try {
          event.source.postMessage(Object.assign({
            type: "neo-shell:open-game-window-result",
            id: String(data.id || "")
          }, payload), "*");
        } catch (_error) {}
      };
      try {
        var openedGame = openGameInWindow(data.game, event.source);
        gameWindowReply({ ok: true, app: openedGame });
      } catch (error) {
        gameWindowReply({ ok: false, error: error && error.message ? error.message : "This game could not be opened." });
      }
      return;
    }
    if (data.type === "neo-shell:add-game-shortcut") {
      if (!ownsFrameWindow(event.source)) return;
      var shortcutReply = function (payload) {
        try {
          event.source.postMessage(Object.assign({
            type: "neo-shell:add-game-shortcut-result",
            id: String(data.id || "")
          }, payload), "*");
        } catch (_error) {}
      };
      try {
        var installedApp = addCustomAppToTaskbarAndHomeScreen(data.game);
        showToast("Added to taskbar", installedApp.title + " was also added to the home screen.", "apps");
        shortcutReply({ ok: true, app: installedApp });
      } catch (error) {
        shortcutReply({ ok: false, error: error && error.message ? error.message : "This game could not be added." });
      }
      return;
    }
    if (data.type !== "neo-shell:proxy-open" && data.type !== "neo-shell:proxy-embed" && data.type !== "neo-shell:proxy-resource") return;
    if (!ownsFrameWindow(event.source)) return;
    var target = normalizedProxyTarget(data.href);
    if (!target) return;
    if (data.type === "neo-shell:proxy-open") {
      openBrowserTarget(target, data.label || "Web page");
      return;
    }
    var resultType = data.type === "neo-shell:proxy-resource" ? "neo-shell:proxy-resource-result" : "neo-shell:proxy-embed-result";
    var reply = function (payload) {
      try {
        event.source.postMessage(Object.assign({
          type: resultType,
          id: String(data.id || "")
        }, payload), "*");
      } catch (_error) {}
    };
    loadBrowseRuntime().then(function (engine) {
      if (!engine || typeof engine.proxyUrl !== "function") throw new Error("The web proxy is unavailable.");
      var resourceKind = String(data.kind || "").toLowerCase();
      if (
        data.type === "neo-shell:proxy-resource" &&
        typeof engine.fetchResource === "function" &&
        ["fetch", "image", "search"].indexOf(resourceKind) !== -1
      ) {
        var accept = resourceKind === "image" ? "image/avif,image/webp,image/*,*/*;q=0.8" : "*/*";
        return engine.fetchResource(target, accept).then(function (resource) {
          return URL.createObjectURL(new Blob([resource.bytes], { type: resource.type || "application/octet-stream" }));
        });
      }
      return engine.proxyUrl(target);
    }).then(function (route) {
      reply({ ok: true, route: route });
    }).catch(function () {
      reply({ ok: false, route: "" });
    });
  }

  function installProxyBridgeInFrame(frame) {
    if (!frame || frame.closest(".neo-browser-runtime")) return;
    var windowHost = frame.closest(".neo-window");
    var app = windowHost && apps[windowHost.dataset.appId];
    if (app && (app.id === "browser" || app.id === "games" || app.custom)) return;
    try {
      var frameDocument = frame.contentDocument;
      if (!frameDocument || !frameDocument.documentElement || !frameDocument.head) return;
      if (!frameDocument.querySelector('meta[name="neo-source-url"]')) {
        var sourceMeta = frameDocument.createElement("meta");
        sourceMeta.name = "neo-source-url";
        sourceMeta.content = frame.dataset.route || frame.src || frameDocument.baseURI;
        frameDocument.head.prepend(sourceMeta);
      }
      if (frameDocument.getElementById("neo-link-proxy-runtime")) return;
      var script = frameDocument.createElement("script");
      script.id = "neo-link-proxy-runtime";
      script.src = new URL("./neo-link-proxy.js?v=20260911-all-links-v1", document.baseURI).href;
      frameDocument.head.prepend(script);
    } catch (_error) {
      // Cross-origin frames are already handled by the NEO Browser proxy.
    }
  }

  function watchProxyFrames() {
    function wire(frame) {
      if (!frame || frame.dataset.neoProxyBridgeWired === "true") return;
      frame.dataset.neoProxyBridgeWired = "true";
      frame.addEventListener("load", function () { installProxyBridgeInFrame(frame); });
      installProxyBridgeInFrame(frame);
    }
    document.querySelectorAll("iframe").forEach(wire);
    new MutationObserver(function (records) {
      records.forEach(function (record) {
        record.addedNodes.forEach(function (node) {
          if (!node || node.nodeType !== 1) return;
          if (node.matches && node.matches("iframe")) wire(node);
          if (node.querySelectorAll) node.querySelectorAll("iframe").forEach(wire);
        });
      });
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  function openBrowserPage(page, label) {
    var win = openApp("browser");
    if (!win) return null;
    requestAnimationFrame(function () {
      var browser = win.querySelector("[data-neo-browser]");
      if (!browser) return;
      browser.dispatchEvent(new CustomEvent("neo-browser-open", { detail: { page: page, label: label || "Web app" } }));
    });
    return win;
  }

  function syncTaskbarAppVisibility() {
    var activeApp = windowLayer && windowLayer.querySelector(".neo-window.is-active:not(.is-minimized):not(.is-closing)");
    var fullscreenApp = activeApp && activeApp.matches(".is-maximized, .is-tab-fullscreen");
    var mode = normalizeTaskbarAppMode(settings.taskbarAppMode);
    var state = fullscreenApp ? "hidden" : "desktop";
    root.dataset.taskbarAppMode = mode;
    root.dataset.taskbarAppState = state;
    var taskbar = document.querySelector(".taskbar");
    if (taskbar) taskbar.setAttribute("aria-hidden", state === "hidden" ? "true" : "false");
    var topbar = document.querySelector(".topbar");
    if (topbar) topbar.setAttribute("aria-hidden", state === "hidden" ? "true" : "false");
  }

  function activateWindow(win) {
    if (!win) return;
    openWindows.forEach(function (item) { item.classList.remove("is-active"); });
    win.classList.add("is-active");
    win.style.zIndex = String(++zIndex);
    var id = win.dataset.appId;
    var app = apps[id];
    if (app) {
      activeAppLabel.textContent = appDisplayTitle(app);
      activeAppLabel.hidden = app.hideName === true;
      renderActiveWidget(app);
      if (id === "stream") showStreamNowPlaying();
    }
    if (settings.taskbarStyle === "xeno") renderDock();
    syncTaskbarAppVisibility();
  }

  function activateTopWindow() {
    var top = null;
    openWindows.forEach(function (win) {
      if (win.classList.contains("is-minimized")) return;
      if (!top || Number(win.style.zIndex || 0) > Number(top.style.zIndex || 0)) top = win;
    });
    if (top) activateWindow(top);
    else {
      activeAppLabel.textContent = "Desktop";
      renderActiveWidget(apps.browser);
      syncTaskbarAppVisibility();
    }
  }

  function stopMediaElement(media) {
    if (!media) return;
    try { media.pause(); } catch (_error) {}
    try {
      if (media.srcObject && typeof media.srcObject.getTracks === "function") {
        media.srcObject.getTracks().forEach(function (track) {
          try { track.stop(); } catch (_error) {}
        });
        media.srcObject = null;
      }
    } catch (_error) {}
    try { if (Number.isFinite(media.currentTime)) media.currentTime = 0; } catch (_error) {}
    try { media.removeAttribute("autoplay"); } catch (_error) {}
  }

  function stopFrameRuntime(frame, id, visited) {
    if (!frame || visited.has(frame)) return;
    visited.add(frame);
    try {
      frame.contentWindow.postMessage({
        type: "neo-shell:close",
        appId: String(id || ""),
        reason: "window-closed"
      }, "*");
    } catch (_error) {}
    try {
      var view = frame.contentWindow;
      var sessionId = String(view._sessionInstId || "");
      if (sessionId) view.localStorage.removeItem(sessionId + ":neo:tabs:v1");
      view.sessionStorage.removeItem("__neo_inst__");
    } catch (_error) {}
    try {
      var frameDocument = frame.contentDocument;
      if (!frameDocument) return;
      frameDocument.querySelectorAll("audio, video").forEach(stopMediaElement);
      frameDocument.querySelectorAll("iframe").forEach(function (nestedFrame) {
        stopFrameRuntime(nestedFrame, id, visited);
      });
      try { frameDocument.dispatchEvent(new Event("pagehide")); } catch (_error) {}
    } catch (_error) {}
  }

  function stopWindowMedia(win, id) {
    if (!win) return;
    win.querySelectorAll("audio, video").forEach(stopMediaElement);
    var visited = new WeakSet();
    win.querySelectorAll("iframe").forEach(function (frame) { stopFrameRuntime(frame, id, visited); });

    if (id === "stream") {
      if (win._neoLocalMusicCommand) win._neoLocalMusicCommand("stop");
      if (musicRuntime && typeof musicRuntime.stopWindow === "function") {
        try { musicRuntime.stopWindow(win, id); } catch (error) {}
      }
      if (window.NEO_FEATURES && typeof window.NEO_FEATURES.stopMusic === "function") {
        try { window.NEO_FEATURES.stopMusic(); } catch (error) {}
      } else if (featureRuntimePromise) {
        featureRuntimePromise.then(function (runtime) {
          if (runtime && typeof runtime.stopMusic === "function") {
            try { runtime.stopMusic(); } catch (error) {}
          }
        }).catch(function () {});
      }
    }
    if (nowPlayingState && nowPlayingState.appId === id) {
      try { renderNowPlaying({ source: nowPlayingState.source, active: false }); } catch (error) {}
    }
    try { renderNowPlaying({ source: "browse-media:" + id, active: false }); } catch (error) {}
  }

  function destroyWindowFrames(win) {
    if (!win) return;
    win.querySelectorAll("iframe").forEach(function (frame) {
      try { if (window.NEOFrameLoader) window.NEOFrameLoader.cancel(frame); } catch (_error) {}
      try { if (frame.contentWindow && typeof frame.contentWindow.stop === "function") frame.contentWindow.stop(); } catch (_error) {}
      try { frame.removeAttribute("srcdoc"); } catch (_error) {}
      try { frame.src = "about:blank"; } catch (_error) {}
      try { frame.remove(); } catch (_error) {}
    });
  }


  function pauseMusicForVideoFocus() {
    if (localOnly) {
      var localWindow = openWindows.get("stream");
      if (localWindow && localWindow._neoLocalMusicCommand) { localWindow._neoLocalMusicCommand("pause"); return true; }
      return false;
    }
    if (!musicRuntime || typeof musicRuntime.pauseWindow !== "function") return false;
    var musicWindow = musicRuntime.getWindow("stream", openWindows);
    if (!musicWindow) return false;
    try { return musicRuntime.pauseWindow(musicWindow, "stream"); } catch (error) { return false; }
  }

  function syncWallpaperMediaPriority() {
    if (window.NEOWallpaperEngine && window.NEOWallpaperEngine.setMediaPriority) {
      window.NEOWallpaperEngine.setMediaPriority(mediaPrioritySources.size > 0);
    }
  }

  function releaseWindowMediaPriority(id) {
    var appId = String(id || "");
    if (!appId) return;
    mediaPrioritySources.delete("intent:route-focus:" + appId);
    mediaPrioritySources.delete("play:route-media:" + appId);
    syncWallpaperMediaPriority();
  }

  function exitFullscreenForWindow(win) {
    var fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement;
    if (!fullscreenElement || !win || !win.contains(fullscreenElement)) return;
    var exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (typeof exit !== "function") return;
    try {
      var result = exit.call(document);
      if (result && typeof result.catch === "function") result.catch(function () {});
    } catch (_error) {}
  }

  function closeWindow(win, forceDestroy) {
    if (!win || win.classList.contains("is-closing")) return;
    var id = win.dataset.appId;
    var app = apps[id];
    exitFullscreenForWindow(win);
    if (app && app.launchMode === "direct-game" && app.gameOwner) {
      try {
        app.gameOwner.postMessage({ type: "neo-shell:game-window-closed", gameId: app.gameId || "", appId: id }, "*");
      } catch (_error) {}
      app.gameOwner = null;
    }
    setWindowMotionOrigin(win, id);
    try {
      window.dispatchEvent(new CustomEvent("neo-window-state-change", {
        detail: { id: id || "", minimized: false, closed: true }
      }));
    } catch (error) {}
    try { if (!win.hidden) saveWindowState(win); } catch (error) {}
    try { stopWindowMedia(win, id); } catch (error) {}
    releaseWindowMediaPriority(id);
    forceDestroy = true;
    try { musicRuntime.dropWindow(id); } catch (error) {}
    if (window.NEOFrameLoader) {
      win.querySelectorAll("iframe").forEach(function (frame) {
        try { window.NEOFrameLoader.cancel(frame); } catch (error) {}
      });
    }
    function finishClose() {
      try { if (win._neoResizeObserver) win._neoResizeObserver.disconnect(); } catch (error) {}
      try { if (typeof win._neoBrowserCleanup === "function") win._neoBrowserCleanup(); } catch (error) {}
      try { if (typeof win._neoMessagesCleanup === "function") win._neoMessagesCleanup(); } catch (error) {}
      try { if (typeof win._neoExtraCleanup === "function") win._neoExtraCleanup(); } catch (error) {}
      destroyWindowFrames(win);
      window.clearTimeout(win._neoResizeTimer);
      window.clearTimeout(win._neoCloseTimer);
      win.remove();
      syncTaskbarAppVisibility();
    }
    win.classList.remove("is-open", "is-active");
    win.setAttribute("aria-hidden", "true");
    win.setAttribute("inert", "");
    if (openWindows.get(id) === win) openWindows.delete(id);
    if (app && app.transient === true && !app.pinned) {
      delete apps[id];
      delete windowStates[id];
      writeJson(WINDOW_STATE_KEY, windowStates);
    }
    syncAutoPerformanceMode();
    try { renderDock(); } catch (error) {}
    try { activateTopWindow(); } catch (error) {}
    playWindowMotion(win, "closing", 290, finishClose);
  }

  function minimizeWindow(win) {
    if (!win || win.classList.contains("is-minimized") || win.classList.contains("is-minimizing") || win.classList.contains("is-closing")) return;
    if (document.activeElement && win.contains(document.activeElement)) document.activeElement.blur();
    setWindowMotionOrigin(win, win.dataset.appId);
    win.setAttribute("aria-hidden", "true");
    win.setAttribute("inert", "");
    playWindowMotion(win, "minimizing", 290, function () {
      if (win.isConnected && !win.classList.contains("is-closing")) setWindowMinimized(win, true);
    });
    win.classList.remove("is-active");
    renderDock();
    activateTopWindow();
  }

  function setWindowMinimized(win, minimized) {
    if (!win) return;
    win.classList.toggle("is-minimized", minimized);
    win.toggleAttribute("inert", minimized);
    if (minimized) win.setAttribute("aria-hidden", "true");
    else win.removeAttribute("aria-hidden");
    syncAutoPerformanceMode();
    renderDock();
    syncTaskbarAppVisibility();
    window.dispatchEvent(new CustomEvent("neo-window-state-change", {
      detail: { id: win.dataset.appId || "", minimized: Boolean(minimized), closed: false }
    }));
    syncDesktopShortcutVisibility();
  }

  function syncMaximizeButton(win) {
    if (!win) return;
    var button = win.querySelector('[data-window-action="maximize"]');
    if (!button) return;
    var maximized = win.classList.contains("is-maximized");
    button.setAttribute("aria-label", maximized ? "Restore window" : "Maximize");
    button.title = maximized ? "Restore window" : "Maximize";
  }

  function toggleMaximize(win) {
    if (!win || isSmallScreen()) return;
    if (!win.classList.contains("is-maximized")) saveWindowState(win);
    win.classList.toggle("is-maximized");
    syncMaximizeButton(win);
    var id = win.dataset.appId;
    windowStates[id] = Object.assign({}, windowStates[id] || {}, { maximized: win.classList.contains("is-maximized") });
    writeJson(WINDOW_STATE_KEY, windowStates);
    activateWindow(win);
  }

  function saveWindowState(win) {
    if (!win || isSmallScreen() || win.classList.contains("is-minimized") || win.classList.contains("is-snapped") || win.classList.contains("is-tab-fullscreen") || win.classList.contains("is-youtube-popout")) return;
    var id = win.dataset.appId;
    var current = Object.assign({}, windowStates[id] || {});
    current.maximized = win.classList.contains("is-maximized");
    if (!current.maximized) {
      var rect = win.getBoundingClientRect();
      var layerRect = windowLayer.getBoundingClientRect();
      current.left = Math.round(rect.left - layerRect.left);
      current.top = Math.round(rect.top - layerRect.top);
      current.coordinates = "layer";
      current.width = Math.round(rect.width);
      current.height = Math.round(rect.height);
    }
    windowStates[id] = current;
    writeJson(WINDOW_STATE_KEY, windowStates);
  }

  function wireWindowPersistence(win) {
    win.addEventListener("neo-window-resized", function () {
      saveWindowState(win);
    });
  }

  function wireWindowDrag(win) {
    var chrome = win.querySelector(".window-chrome");
    var drag = null;
    var dragFrame = 0;

    function paintDrag() {
      dragFrame = 0;
      if (!drag) return;
      var transform = "translate3d(" + (drag.nextLeft - drag.left) + "px," + (drag.nextTop - drag.top) + "px,0)";
      if (transform === drag.lastTransform) return;
      drag.lastTransform = transform;
      win.style.transform = transform;
    }

    chrome.addEventListener("pointerdown", function (event) {
      if (event.button !== 0 || event.target.closest("button, [data-window-resize]") || isSmallScreen() || win.classList.contains("is-maximized") || win.classList.contains("is-tab-fullscreen") || document.querySelector(".neo-window.is-resizing, .neo-window.is-dragging") || document.documentElement.classList.contains("is-resizing-window")) return;
      activateWindow(win);
      var rect = win.getBoundingClientRect();
      var layerRect = windowLayer.getBoundingClientRect();
      var left = rect.left - layerRect.left;
      var top = rect.top - layerRect.top;
      drag = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        left: left,
        top: top,
        nextLeft: left,
        nextTop: top,
        lastTransform: "",
        maxLeft: Math.max(0, layerRect.width - rect.width),
        maxTop: Math.max(0, layerRect.height - rect.height)
      };
      drag.minTop = drag.maxTop >= WINDOW_TOP_GAP ? WINDOW_TOP_GAP : 0;
      win.classList.add("is-dragging");
      root.classList.add("is-window-interacting");
      window.dispatchEvent(new CustomEvent("neo-window-interaction", { detail: { active: true, source: "window-drag" } }));
      window.dispatchEvent(new CustomEvent("neo-media-priority", { detail: { active: true, source: "window-drag", pauseWallpaper: true } }));
      chrome.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    chrome.addEventListener("pointermove", function (event) {
      if (!drag || event.pointerId !== drag.pointerId) return;
      var samples = typeof event.getCoalescedEvents === "function" ? event.getCoalescedEvents() : [];
      var pointer = samples.length ? samples[samples.length - 1] : event;
      drag.nextLeft = Math.round(clamp(drag.left + pointer.clientX - drag.x, 0, drag.maxLeft));
      drag.nextTop = Math.round(clamp(drag.top + pointer.clientY - drag.y, drag.minTop, drag.maxTop));
      if (!dragFrame) dragFrame = requestAnimationFrame(paintDrag);
    });
    function endDrag(event) {
      if (!drag || event.pointerId !== drag.pointerId) return;
      if (dragFrame) cancelAnimationFrame(dragFrame);
      dragFrame = 0;
      var nextLeft = drag.nextLeft;
      var nextTop = drag.nextTop;
      drag = null;
      win.style.left = Math.round(nextLeft) + "px";
      win.style.top = Math.round(nextTop) + "px";
      win.style.transform = "";
      win.classList.remove("is-dragging");
      root.classList.remove("is-window-interacting");
      window.dispatchEvent(new CustomEvent("neo-window-interaction", { detail: { active: false, source: "window-drag" } }));
      window.dispatchEvent(new CustomEvent("neo-media-priority", { detail: { active: false, source: "window-drag", pauseWallpaper: true } }));
      if (chrome.hasPointerCapture(event.pointerId)) chrome.releasePointerCapture(event.pointerId);
      saveWindowState(win);
    }
    chrome.addEventListener("pointerup", endDrag);
    chrome.addEventListener("pointercancel", endDrag);
    chrome.addEventListener("lostpointercapture", endDrag);
    chrome.addEventListener("dblclick", function (event) {
      if (!event.target.closest("button")) toggleMaximize(win);
    });
    win.addEventListener("pointerdown", function () { activateWindow(win); });
  }

  function containWindows() {
    if (isSmallScreen()) return;
    var bounds = windowLayer.getBoundingClientRect();
    openWindows.forEach(function (win) {
      if (win.matches('.is-maximized, .is-snapped, .is-tab-fullscreen, .is-dragging, .is-resizing, .is-minimized')) return;
      var rect = win.getBoundingClientRect();
      var width = Math.min(rect.width, bounds.width), height = Math.min(rect.height, bounds.height);
      win.style.width = width + 'px'; win.style.height = height + 'px';
      win.style.left = clamp(rect.left - bounds.left,0,Math.max(0,bounds.width-width)) + 'px';
      var maxTop = Math.max(0, bounds.height - height);
      var minTop = maxTop >= WINDOW_TOP_GAP ? WINDOW_TOP_GAP : 0;
      win.style.top = clamp(rect.top - bounds.top, minTop, maxTop) + 'px';
      saveWindowState(win);
    });
  }

  function wireWidgetDrag() {
    if (!widgetLayer) return;
    widgetLayer.querySelectorAll(".neo-widget").forEach(function (widget) {
      var drag = null;
      var id = widget.dataset.widget;
      widget.addEventListener("pointerdown", function (event) {
        if (settings.widgetLock || event.button !== 0 || event.target.closest("button, input, select, a") || isSmallScreen()) return;
        var saved = widgetLayout[id] || { x: 0, y: 0 };
        drag = { x: event.clientX, y: event.clientY, startX: saved.x || 0, startY: saved.y || 0 };
        widget.setPointerCapture(event.pointerId);
        event.preventDefault();
      });
      widget.addEventListener("pointermove", function (event) {
        if (!drag) return;
        var x = drag.startX + event.clientX - drag.x;
        var y = drag.startY + event.clientY - drag.y;
        widget.style.transform = "translate3d(" + x + "px," + y + "px,0)";
        widgetLayout[id] = { x: Math.round(x), y: Math.round(y) };
      });
      function finish(event) {
        if (!drag) return;
        drag = null;
        if (widget.hasPointerCapture(event.pointerId)) widget.releasePointerCapture(event.pointerId);
        writeJson(WIDGET_LAYOUT_KEY, widgetLayout);
      }
      widget.addEventListener("pointerup", finish);
      widget.addEventListener("pointercancel", finish);
    });
  }

  function applyWidgetLayout() {
    if (!widgetLayer) return;
    widgetLayer.querySelectorAll(".neo-widget").forEach(function (widget) {
      var saved = widgetLayout[widget.dataset.widget] || { x: 0, y: 0 };
      widget.style.transform = "translate3d(" + (saved.x || 0) + "px," + (saved.y || 0) + "px,0)";
    });
  }

  function resetLayout() {
    widgetLayout = {};
    windowStates = {};
    desktopShortcutLayout = {};
    hiddenDesktopShortcutIds.clear();
    desktopShortcutsManuallyHidden = true;
    writeJson(WIDGET_LAYOUT_KEY, widgetLayout);
    writeJson(WINDOW_STATE_KEY, windowStates);
    writeJson(DESKTOP_SHORTCUT_LAYOUT_KEY, desktopShortcutLayout);
    writeJson(DESKTOP_SHORTCUT_HIDDEN_KEY, []);
    writeJson(DESKTOP_SHORTCUTS_ALL_HIDDEN_KEY, true);
    applyWidgetLayout();
    renderDesktopShortcuts();
    syncDesktopShortcutVisibility();
    openWindows.forEach(function (win) {
      if (!isSmallScreen()) win.classList.add("is-maximized");
      syncMaximizeButton(win);
      win.style.left = "8%";
      win.style.top = "9%";
    });
    showToast("Layout reset", "Desktop icons, widgets, and windows returned to their defaults.", "check");
  }

  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function boundedDistance(a, b, limit) {
    if (Math.abs(a.length - b.length) > limit) return limit + 1;
    var previous = new Array(b.length + 1);
    var current = new Array(b.length + 1);
    for (var j = 0; j <= b.length; j++) previous[j] = j;
    for (var i = 1; i <= a.length; i++) {
      current[0] = i;
      var rowMin = current[0];
      for (j = 1; j <= b.length; j++) {
        var cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
        current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
        rowMin = Math.min(rowMin, current[j]);
      }
      if (rowMin > limit) return limit + 1;
      var swap = previous;
      previous = current;
      current = swap;
    }
    return previous[b.length];
  }

  function scoreEntry(entry, query) {
    var name = entry.searchName;
    if (name === query) return 0;
    if (name.indexOf(query) === 0) return 1 + name.length / 10000;
    var position = name.indexOf(query);
    if (position !== -1) return 2 + position / 100 + name.length / 10000;
    if (query.length < 3) return Infinity;
    var limit = query.length >= 8 ? 2 : 1;
    var words = name.split(" ");
    var best = Infinity;
    for (var i = 0; i < words.length; i++) {
      var word = words[i];
      if (Math.abs(word.length - query.length) > limit) continue;
      var distance = boundedDistance(word, query, limit);
      if (distance <= limit) best = Math.min(best, 4 + distance + word.length / 1000);
    }
    return best;
  }

  function loadCatalog() {
    if (catalog) return Promise.resolve(catalog);
    if (catalogPromise) return catalogPromise;
    catalogPromise = fetch(localConfig.gamesCatalog || projectAssetUrl("games/index.json"), { credentials: "omit", cache: "force-cache" })
      .then(function (response) {
        if (!response.ok) throw new Error("Catalog request failed");
        return response.json();
      })
      .then(function (entries) {
        catalog = Array.isArray(entries) ? entries.map(function (entry, index) {
          return {
            name: String(entry.name || entry.title || entry.slug || "Untitled game"),
            slug: String(entry.slug || ""),
            file: String(entry.file || ""),
            source: String(entry.source || "neo-local"),
            searchName: normalizeText(entry.name || entry.title || entry.slug),
            catalogIndex: index
          };
        }) : [];
        return catalog;
      })
      .catch(function (error) {
        catalogPromise = null;
        throw error;
      });
    return catalogPromise;
  }

  function loadCoverManifest() {
    if (coverManifestLoaded) return Promise.resolve(coverManifest);
    if (coverManifestPromise) return coverManifestPromise;
    var coverSource = localConfig.gamesCovers || projectAssetUrl("games/covers.json");
    coverManifestPromise = fetch(coverSource + (coverSource.indexOf("?") === -1 ? "?" : "&") + "v=20260802-neo-v3", { credentials: "omit", cache: "force-cache" })
      .then(function (response) {
        if (!response.ok) throw new Error("Cover manifest request failed");
        return response.json();
      })
      .then(function (entries) {
        coverManifest = entries && typeof entries === "object" && !Array.isArray(entries) ? entries : Object.create(null);
        coverManifestLoaded = true;
        return coverManifest;
      })
      .catch(function () {
        coverManifestPromise = null;
        return coverManifest;
      });
    return coverManifestPromise;
  }

  function wireSearchApp(body) {
    var input = body.querySelector("[data-zone-search]");
    var results = body.querySelector("[data-search-results]");
    var state = body.querySelector("[data-search-state]");
    var count = body.querySelector("[data-search-count]");
    var activeIndex = -1;
    if (!input || !results) return;

    function runSearch() {
      var query = normalizeText(input.value);
      activeIndex = -1;
      if (!query) {
        results.textContent = "";
        state.hidden = false;
        count.textContent = "Ready";
        return;
      }
      count.textContent = "Loading";
      Promise.all([loadCatalog(), loadCoverManifest()]).then(function (loaded) {
        var entries = loaded[0];
        var matches = [];
        for (var i = 0; i < entries.length; i++) {
          var score = scoreEntry(entries[i], query);
          if (Number.isFinite(score)) matches.push({ entry: entries[i], score: score });
        }
        matches.sort(function (a, b) { return a.score - b.score || a.entry.name.localeCompare(b.entry.name); });
        renderSearchResults(results, state, count, matches.slice(0, 24), query);
      }).catch(function () {
        results.textContent = "";
        state.hidden = false;
        state.querySelector("strong").textContent = "Catalog unavailable";
        state.querySelector("p").textContent = "Open the library directly or try again.";
        count.textContent = "Error";
      });
    }

    input.addEventListener("input", function () {
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(runSearch, 80);
    });
    input.addEventListener("keydown", function (event) {
      var items = Array.from(results.querySelectorAll(".search-result"));
      if (!items.length) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        activeIndex = (activeIndex + 1) % items.length;
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        activeIndex = (activeIndex - 1 + items.length) % items.length;
      } else if (event.key === "Enter" && activeIndex >= 0) {
        event.preventDefault();
        items[activeIndex].click();
        return;
      } else {
        return;
      }
      items.forEach(function (item, index) {
        item.setAttribute("aria-selected", index === activeIndex ? "true" : "false");
      });
      items[activeIndex].scrollIntoView({ block: "nearest" });
    });
    requestAnimationFrame(function () { input.focus(); });
  }

  function wireLibraryApp(body) {
    var home = body.querySelector("[data-library-home]");
    var catalogView = body.querySelector("[data-library-catalog]");
    var footer = body.querySelector("[data-library-footer]");
    var homeForm = body.querySelector("[data-library-home-form]");
    var homeInput = body.querySelector("[data-library-home-search]");
    var browse = body.querySelector("[data-library-browse]");
    var back = body.querySelector("[data-library-back]");
    var input = body.querySelector("[data-library-search]");
    var sourceFilter = body.querySelector("[data-library-source]");
    var sort = body.querySelector("[data-library-sort]");
    var grid = body.querySelector("[data-library-grid]");
    var state = body.querySelector("[data-library-state]");
    var count = body.querySelector("[data-library-count]");
    var visible = body.querySelector("[data-library-visible]");
    var more = body.querySelector("[data-library-more]");
    var heading = body.querySelector("[data-library-heading]");
    var gridTitle = body.querySelector("[data-library-grid-title]");
    var favoriteCount = body.querySelector("[data-library-favorite-count]");
    var spotlight = body.querySelector("[data-library-spotlight]");
    var spotlightName = body.querySelector("[data-library-spotlight-name]");
    var spotlightCover = body.querySelector("[data-library-spotlight-cover]");
    var spotlightPlay = body.querySelector("[data-library-spotlight-play]");
    var spotlightFavorite = body.querySelector("[data-library-spotlight-favorite]");
    var spotlightPosition = body.querySelector("[data-library-spotlight-position]");
    var spotlightPrevious = body.querySelector("[data-library-spotlight-prev]");
    var spotlightNext = body.querySelector("[data-library-spotlight-next]");
    var soundButton = body.querySelector("[data-library-sound]");
    var settingsButton = body.querySelector("[data-library-settings]");
    var settingsPanel = body.querySelector("[data-library-settings-panel]");
    var compactToggle = body.querySelector("[data-library-compact]");
    var reduceEffectsToggle = body.querySelector("[data-library-reduce-effects]");
    var favoriteStorageKey = "neo_os_game_favorites_v1";
    var settingsStorageKey = "neo_os_arcade_settings_v1";
    var pageSize = 48;
    var allEntries = [];
    var matches = [];
    var rendered = 0;
    var filterTimer = 0;
    var viewMode = "catalog";
    var spotlightEntries = [];
    var spotlightIndex = 0;
    var currentSpotlightEntry = null;
    var favorites = readStoredFavorites();
    var arcadeSettings = readArcadeSettings();
    var soundMuted = arcadeSettings.soundMuted !== false;
    if (!home || !catalogView || !input || !grid || !state || !count || !visible || !more) return;
    if (localOnly && sourceFilter) {
      var offlineOption = document.createElement("option");
      offlineOption.value = "offline";
      offlineOption.textContent = "Ready offline";
      sourceFilter.prepend(offlineOption);
      sourceFilter.value = "offline";
    }

    function readStoredFavorites() {
      try {
        var stored = JSON.parse(localStorage.getItem(favoriteStorageKey) || "[]");
        return new Set(Array.isArray(stored) ? stored.map(String).slice(0, 800) : []);
      } catch (error) {
        return new Set();
      }
    }

    function saveFavorites() {
      try { localStorage.setItem(favoriteStorageKey, JSON.stringify(Array.from(favorites))); } catch (error) {}
    }

    function readArcadeSettings() {
      try {
        var stored = JSON.parse(localStorage.getItem(settingsStorageKey) || "{}");
        return stored && typeof stored === "object" ? stored : {};
      } catch (error) {
        return {};
      }
    }

    function saveArcadeSettings() {
      try { localStorage.setItem(settingsStorageKey, JSON.stringify(arcadeSettings)); } catch (error) {}
    }

    function playLibraryFx(frequency) {
      if (soundMuted || performanceActive()) return;
      try {
        var AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        var context = new AudioContextClass();
        var oscillator = context.createOscillator();
        var gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency || 420;
        gain.gain.setValueAtTime(0.025, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.045);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.05);
        oscillator.addEventListener("ended", function () { context.close(); }, { once: true });
      } catch (error) {}
    }

    function syncSettings() {
      body.classList.toggle("is-compact", Boolean(arcadeSettings.compact));
      body.classList.toggle("is-reduced", Boolean(arcadeSettings.reduceEffects));
      if (compactToggle) compactToggle.checked = Boolean(arcadeSettings.compact);
      if (reduceEffectsToggle) reduceEffectsToggle.checked = Boolean(arcadeSettings.reduceEffects);
      if (soundButton) {
        soundButton.classList.toggle("is-muted", soundMuted);
        soundButton.setAttribute("aria-pressed", soundMuted ? "true" : "false");
        soundButton.setAttribute("aria-label", soundMuted ? "Enable interface sounds" : "Mute interface sounds");
        soundButton.title = soundMuted ? "Enable interface sounds" : "Mute interface sounds";
      }
    }

    function syncNavigation(active) {
      body.querySelectorAll("[data-library-nav]").forEach(function (button) {
        var selected = button.getAttribute("data-library-nav") === active;
        button.classList.toggle("is-active", selected);
        button.setAttribute("aria-pressed", selected ? "true" : "false");
      });
    }

    function syncFavoriteCount() {
      if (favoriteCount) favoriteCount.textContent = String(favorites.size);
    }

    function syncFavoriteButtons() {
      body.querySelectorAll("[data-game-favorite]").forEach(function (button) {
        var selected = favorites.has(button.getAttribute("data-game-favorite"));
        button.classList.toggle("is-favorite", selected);
        button.setAttribute("aria-pressed", selected ? "true" : "false");
        button.setAttribute("aria-label", selected ? "Remove from favorites" : "Add to favorites");
      });
      if (spotlightFavorite && currentSpotlightEntry) {
        var selected = favorites.has(currentSpotlightEntry.slug);
        spotlightFavorite.classList.toggle("is-favorite", selected);
        spotlightFavorite.setAttribute("aria-pressed", selected ? "true" : "false");
        spotlightFavorite.setAttribute("aria-label", selected ? "Remove spotlight game from favorites" : "Add spotlight game to favorites");
      }
      syncFavoriteCount();
    }

    function toggleFavorite(entry) {
      if (!entry || !entry.slug) return;
      var adding = !favorites.has(entry.slug);
      if (adding) favorites.add(entry.slug);
      else favorites.delete(entry.slug);
      saveFavorites();
      playLibraryFx(adding ? 560 : 310);
      syncFavoriteButtons();
      showToast(adding ? "Added to favorites" : "Removed from favorites", displayGameName(entry.name), "info");
      if (viewMode === "favorites") applyFilter(allEntries);
    }

    function closeSettings() {
      if (!settingsPanel || !settingsButton) return;
      settingsPanel.hidden = true;
      settingsButton.setAttribute("aria-expanded", "false");
    }

    function showHome() {
      if (homeInput) homeInput.value = "";
      if (input) input.value = "";
      if (sourceFilter) sourceFilter.value = localOnly ? "offline" : "all";
      showCatalog("catalog", "");
      requestAnimationFrame(function () {
        if (home) home.scrollIntoView({ block: "start" });
      });
    }

    function showCatalog(mode, initialQuery) {
      viewMode = mode === "favorites" ? "favorites" : "catalog";
      home.hidden = viewMode === "favorites";
      catalogView.hidden = false;
      if (footer) footer.hidden = false;
      if (heading) heading.textContent = viewMode === "favorites" ? "Favorite Games" : "Featured Games";
      if (gridTitle) gridTitle.textContent = viewMode === "favorites" ? "Your Favorites" : "All Games";
      if (spotlight) spotlight.hidden = viewMode === "favorites";
      syncNavigation(viewMode === "favorites" ? "favorites" : "home");
      if (typeof initialQuery === "string") input.value = initialQuery;
      closeSettings();
      if (allEntries.length) applyFilter(allEntries);
      else setState("Loading your library", "Reading the local catalog.", true);
      requestAnimationFrame(function () {
        if (viewMode !== "favorites" && input.value) input.focus();
      });
    }

    function setState(title, copy, loading) {
      state.hidden = false;
      state.classList.toggle("is-loading", Boolean(loading));
      state.querySelector("strong").textContent = title;
      state.querySelector("p").textContent = copy;
    }

    function renderNextPage() {
      var end = Math.min(rendered + pageSize, matches.length);
      var fragment = document.createDocumentFragment();
      for (var i = rendered; i < end; i++) {
        fragment.appendChild(createLibraryCard(matches[i], {
          isFavorite: function (entry) { return favorites.has(entry.slug); },
          toggleFavorite: toggleFavorite,
          playFx: playLibraryFx
        }));
      }
      grid.appendChild(fragment);
      rendered = end;
      visible.textContent = rendered.toLocaleString() + " SHOWN";
      more.hidden = rendered >= matches.length;
      state.hidden = matches.length > 0;
      syncFavoriteButtons();
    }

    function applyFilter(entries) {
      var query = normalizeText(input.value);
      grid.textContent = "";
      rendered = 0;
      var available = viewMode === "favorites" ? entries.filter(function (entry) {
        return favorites.has(entry.slug);
      }) : entries.slice();
      var source = sourceFilter ? sourceFilter.value : "all";
      if (localOnly && source === "offline") {
        available = available.filter(function (entry) { return localConfig.playableGames.indexOf(entry.slug) !== -1; });
      } else if (source && source !== "all") {
        available = available.filter(function (entry) { return entry.source === source; });
      }
      matches = query ? available.map(function (entry) {
        return { entry: entry, score: scoreEntry(entry, query) };
      }).filter(function (match) {
        return Number.isFinite(match.score);
      }).sort(function (a, b) {
        return a.score - b.score || a.entry.name.localeCompare(b.entry.name);
      }).map(function (match) {
        return match.entry;
      }) : available;
      if (!query) {
        if (sort && sort.value === "za") matches.sort(function (a, b) { return b.name.localeCompare(a.name); });
        else if (sort && sort.value === "az") matches.sort(function (a, b) { return a.name.localeCompare(b.name); });
        else matches.sort(function (a, b) { return a.catalogIndex - b.catalogIndex; });
      }
      count.textContent = matches.length.toLocaleString() + " TITLES LOADED";
      if (!matches.length) {
        visible.textContent = "0 SHOWN";
        more.hidden = true;
        setState(
          viewMode === "favorites" && !query ? "No favorites yet" : "No local games found",
          viewMode === "favorites" && !query ? "Use the heart on any game to save it here." : "Try a shorter title or clear the search.",
          false
        );
        return;
      }
      renderNextPage();
    }

    function buildSpotlight(entries) {
      var preferred = ["Minecraft", "Five Nights at Freddy's", "Doom 64", "Tetris", "All night nippon super mario bros"];
      if (localOnly) preferred = ["Grandmaster Chess", "Quantum Clicker", "Tetris"];
      spotlightEntries = preferred.map(function (name) {
        return entries.find(function (entry) { return entry.searchName === normalizeText(name); });
      }).filter(Boolean);
      if (!spotlightEntries.length) spotlightEntries = entries.slice(0, 6);
      spotlightIndex = 0;
      updateSpotlight();
    }

    function updateSpotlight() {
      if (!spotlightEntries.length || !spotlightName || !spotlightCover) return;
      currentSpotlightEntry = spotlightEntries[spotlightIndex];
      spotlightName.textContent = displayGameName(currentSpotlightEntry.name);
      if (spotlightPosition) spotlightPosition.textContent = (spotlightIndex + 1) + " / " + spotlightEntries.length;
      if (spotlightPlay) spotlightPlay.disabled = false;
      if (spotlightFavorite) spotlightFavorite.disabled = false;
      spotlightCover.textContent = "";
      var image = document.createElement("img");
      image.alt = "";
      image.decoding = "async";
      image.width = 360;
      image.height = 360;
      var candidates = coverCandidates(currentSpotlightEntry.slug);
      image.dataset.candidates = JSON.stringify(candidates);
      image.dataset.candidateIndex = "0";
      image.dataset.fallbackClass = "arcade-spotlight-fallback";
      image.src = candidates[0];
      image.addEventListener("error", advanceCoverCandidate);
      spotlightCover.appendChild(image);
      syncFavoriteButtons();
    }

    Promise.all([loadCatalog(), loadCoverManifest()]).then(function (results) {
      allEntries = results[0];
      buildSpotlight(allEntries);
      applyFilter(allEntries);
    }).catch(function () {
      count.textContent = "Unavailable";
      visible.textContent = "0 SHOWN";
      more.hidden = true;
      setState("Games unavailable", "The local game catalog could not be read. Try reopening Games.", false);
    });

    input.addEventListener("input", function () {
      window.clearTimeout(filterTimer);
      filterTimer = window.setTimeout(function () {
        if (allEntries.length) applyFilter(allEntries);
      }, 70);
    });
    if (sort) sort.addEventListener("change", function () {
      if (allEntries.length) applyFilter(allEntries);
    });
    if (sourceFilter) sourceFilter.addEventListener("change", function () {
      if (allEntries.length) applyFilter(allEntries);
    });
    more.addEventListener("click", function () { playLibraryFx(440); renderNextPage(); });
    if (browse) browse.addEventListener("click", function () { playLibraryFx(460); showCatalog("catalog", ""); });
    if (back) back.addEventListener("click", function () { playLibraryFx(330); showHome(); });
    if (homeForm) homeForm.addEventListener("submit", function (event) {
      event.preventDefault();
      showCatalog("catalog", homeInput ? homeInput.value : "");
      requestAnimationFrame(function () {
        if (input) input.scrollIntoView({ block: "center" });
      });
    });
    if (homeInput) homeInput.addEventListener("keydown", function (event) {
      if (event.key !== "Enter") return;
      event.preventDefault();
      showCatalog("catalog", homeInput.value);
    });
    body.querySelectorAll("[data-library-nav]").forEach(function (button) {
      button.addEventListener("click", function () {
        var destination = button.getAttribute("data-library-nav");
        playLibraryFx(420);
        if (destination === "favorites") showCatalog("favorites", "");
        else showHome();
      });
    });
    if (spotlightPlay) spotlightPlay.addEventListener("click", function () {
      if (!currentSpotlightEntry) return;
      playLibraryFx(520);
      openZone(currentSpotlightEntry);
    });
    if (spotlightFavorite) spotlightFavorite.addEventListener("click", function () {
      toggleFavorite(currentSpotlightEntry);
    });
    if (spotlightPrevious) spotlightPrevious.addEventListener("click", function () {
      if (!spotlightEntries.length) return;
      spotlightIndex = (spotlightIndex - 1 + spotlightEntries.length) % spotlightEntries.length;
      playLibraryFx(360);
      updateSpotlight();
    });
    if (spotlightNext) spotlightNext.addEventListener("click", function () {
      if (!spotlightEntries.length) return;
      spotlightIndex = (spotlightIndex + 1) % spotlightEntries.length;
      playLibraryFx(420);
      updateSpotlight();
    });
    if (soundButton) soundButton.addEventListener("click", function () {
      soundMuted = !soundMuted;
      arcadeSettings.soundMuted = soundMuted;
      saveArcadeSettings();
      syncSettings();
      if (!soundMuted) playLibraryFx(610);
      showToast(soundMuted ? "Game sounds muted" : "Game sounds on", "This only changes the Steam interface sounds.", "info");
    });
    if (settingsButton && settingsPanel) settingsButton.addEventListener("click", function (event) {
      event.stopPropagation();
      var opening = settingsPanel.hidden;
      settingsPanel.hidden = !opening;
      settingsButton.setAttribute("aria-expanded", opening ? "true" : "false");
    });
    if (compactToggle) compactToggle.addEventListener("change", function () {
      arcadeSettings.compact = compactToggle.checked;
      pageSize = compactToggle.checked ? 60 : 48;
      saveArcadeSettings();
      syncSettings();
      if (allEntries.length) applyFilter(allEntries);
    });
    if (reduceEffectsToggle) reduceEffectsToggle.addEventListener("change", function () {
      arcadeSettings.reduceEffects = reduceEffectsToggle.checked;
      saveArcadeSettings();
      syncSettings();
    });
    body.addEventListener("click", function (event) {
      if (settingsPanel && !settingsPanel.hidden && !event.target.closest("[data-library-settings-panel]") && !event.target.closest("[data-library-settings]")) closeSettings();
    });
    body.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && settingsPanel && !settingsPanel.hidden) closeSettings();
    });
    pageSize = arcadeSettings.compact ? 60 : 48;
    syncSettings();
    syncFavoriteCount();
    showCatalog("catalog", "");
  }

  function displayGameName(value) {
    return String(value || "");
  }

  function createLibraryCard(entry, options) {
    options = options || {};
    var displayName = displayGameName(entry.name);
    var card = document.createElement("article");
    card.className = "library-card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", "Open " + displayName);
    card.dataset.gameSlug = entry.slug;
    var cover = document.createElement("span");
    cover.className = "library-cover";
    var image = document.createElement("img");
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    image.width = 320;
    image.height = 180;
    var candidates = coverCandidates(entry.slug);
    image.dataset.candidates = JSON.stringify(candidates);
    image.dataset.candidateIndex = "0";
    image.dataset.fallbackClass = "library-cover-fallback";
    image.src = candidates[0];
    image.addEventListener("error", advanceCoverCandidate);
    cover.appendChild(image);
    var source = document.createElement("span");
    source.className = "library-source-badge";
    source.textContent = entry.source === "gn-math" ? "GN" : entry.source === "staticquasar" ? "QUASAR" : "NEO";
    var favorite = document.createElement("button");
    favorite.className = "library-favorite";
    favorite.type = "button";
    favorite.dataset.gameFavorite = entry.slug;
    favorite.setAttribute("aria-pressed", options.isFavorite && options.isFavorite(entry) ? "true" : "false");
    favorite.setAttribute("aria-label", options.isFavorite && options.isFavorite(entry) ? "Remove from favorites" : "Add to favorites");
    favorite.innerHTML = iconMarkup("heart");
    favorite.addEventListener("click", function (event) {
      event.stopPropagation();
      if (options.toggleFavorite) options.toggleFavorite(entry);
    });
    cover.append(source, favorite);
    var copy = document.createElement("span");
    copy.className = "library-card-copy";
    var title = document.createElement("strong");
    title.textContent = displayName;
    var meta = document.createElement("small");
    meta.textContent = entry.source === "gn-math" ? "GN COLLECTION" : entry.source === "staticquasar" ? "QUASAR COLLECTION" : "NEO CLASSICS";
    if (localOnly) meta.textContent = localConfig.playableGames.indexOf(entry.slug) !== -1 ? "READY OFFLINE" : "LOCAL GAME ASSETS REQUIRED";
    copy.append(title, meta);
    card.append(cover, copy);
    function openCard(event) {
      if (event && event.target.closest(".library-favorite")) return;
      if (options.playFx) options.playFx(510);
      openZone(entry);
    }
    card.addEventListener("click", openCard);
    card.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openCard(event);
    });
    return card;
  }

  function renderSearchResults(container, state, count, matches, query) {
    container.textContent = "";
    state.hidden = matches.length > 0;
    count.textContent = matches.length ? matches.length + "+" : "0";
    if (!matches.length) {
      state.querySelector("strong").textContent = "No HTML games found";
      state.querySelector("p").textContent = 'Try a shorter title than "' + query + '".';
      return;
    }
    var fragment = document.createDocumentFragment();
    matches.forEach(function (match) {
      var entry = match.entry;
      var displayName = displayGameName(entry.name);
      var button = document.createElement("button");
      button.className = "search-result";
      button.type = "button";
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", "false");
      var image = document.createElement("img");
      image.alt = "";
      image.loading = "lazy";
      image.decoding = "async";
      image.width = 52;
      image.height = 52;
      var candidates = coverCandidates(entry.slug);
      image.dataset.candidates = JSON.stringify(candidates);
      image.dataset.candidateIndex = "0";
      image.src = candidates[0];
      image.addEventListener("error", advanceCoverCandidate);
      var text = document.createElement("span");
      var title = document.createElement("strong");
      var meta = document.createElement("small");
      title.textContent = displayName;
      meta.textContent = "HTML game";
      text.append(title, meta);
      var arrow = document.createElement("span");
      arrow.innerHTML = iconMarkup("chevron");
      button.append(image, text, arrow);
      button.addEventListener("click", function () { openZone(entry); });
      fragment.appendChild(button);
    });
    container.appendChild(fragment);
  }

  function coverCandidates(slug) {
    var safe = encodeURIComponent(slug);
    var candidates = [];
    var mapped = String(coverManifest[slug] || "").trim();
    if (/^\/games\/captured-covers\//i.test(mapped)) candidates.push(projectAssetUrl(mapped));
    else if (!localOnly && /^https:\/\//i.test(mapped)) candidates.push(mapped);
    if (candidates.length) return candidates;
    [
      "games/captured-covers/" + safe + "-cover.webp",
      "games/captured-covers/" + safe + "-illustrated.webp",
      "games/captured-covers/" + safe + "-capture.webp",
      "games/captured-covers/" + safe + ".webp",
      "games/captured-covers/" + safe + ".jpg",
      "games/captured-covers/" + safe + ".jpeg",
      "games/captured-covers/" + safe + ".png"
    ].forEach(function (candidate) {
      candidate = projectAssetUrl(candidate);
      if (candidates.indexOf(candidate) === -1) candidates.push(candidate);
    });
    return candidates;
  }

  function advanceCoverCandidate(event) {
    var image = event.currentTarget;
    var candidates = [];
    try { candidates = JSON.parse(image.dataset.candidates || "[]"); } catch (error) {}
    var next = Number(image.dataset.candidateIndex || 0) + 1;
    if (next < candidates.length) {
      image.dataset.candidateIndex = String(next);
      image.src = candidates[next];
      return;
    }
    var fallback = document.createElement("span");
    fallback.className = image.dataset.fallbackClass || "search-result-fallback";
    fallback.innerHTML = iconMarkup("gamepad");
    image.replaceWith(fallback);
  }

  function openZone(entry) {
    if (localOnly && localConfig.playableGames.indexOf(entry.slug) === -1) {
      showToast("Game needs local assets", "This title uses online files. Try Grandmaster Chess, Quantum Clicker, or Tetris in local preview.", "info");
      return;
    }
    var route = localGameRoute(entry);
    if (!route) {
      showToast("Game unavailable", "This catalog entry does not point to a local HTML game file.", "info");
      return;
    }
    var id = "zone-" + entry.slug;
    if (!apps[id]) {
      apps[id] = {
        id: id,
        title: displayGameName(entry.name),
        subtitle: "HTML game",
        icon: "gamepad",
        route: route,
        width: 1240,
        height: 790,
        launcher: false,
        category: "Games"
      };
    }
    apps[id].category = "Games";
    openApp(id);
  }

  function localGameRoute(entry) {
    var file = String(entry && entry.file || "").replace(/\\/g, "/");
    if (!localOnly && /^https:\/\//i.test(file)) {
      try {
        var remote = new URL(file);
        if (
          /^(?:fastly|cdn|gcore|quantil)\.jsdelivr\.net$/i.test(remote.hostname) &&
          /^\/gh\/unblockedgames99x-code\/neo-os-games-\d+-cdn@[^/]+\/games\/[A-Za-z0-9%._()\[\] -]+\.html$/i.test(remote.pathname)
        ) return remote.href;
      } catch (error) {}
      return "";
    }
    if (!/^games\/[A-Za-z0-9._()\[\] -]+\.html$/.test(file)) return "";
    return projectAssetUrl(file.split("/").map(encodeURIComponent).join("/"));
  }

  function projectAssetUrl(path) {
    var clean = String(path || "").replace(/^\/+/, "");
    return new URL("../" + clean, document.baseURI).href;
  }

  function openWallpaperDatabase() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) {
        reject(new Error("IndexedDB unavailable"));
        return;
      }
      var request = indexedDB.open(WALLPAPER_DB, 1);
      request.onupgradeneeded = function () {
        if (!request.result.objectStoreNames.contains(WALLPAPER_STORE)) {
          request.result.createObjectStore(WALLPAPER_STORE);
        }
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error || new Error("Could not open wallpaper storage")); };
    });
  }

  function wallpaperStudios() {
    return Array.from(document.querySelectorAll("[data-wallpaper-studio]"));
  }

  function syncWallpaperCatalogControls(studio) {
    if (!studio) return;
    var source = studio.dataset.wallpaperSource || "installed";
    var remote = source === "discover" || source === "workshop";
    [studio.querySelector("[data-wallpaper-sort]"), studio.querySelector("[data-wallpaper-type-filter]")].forEach(function (select) {
      if (!select) return;
      Array.from(select.options).forEach(function (option) {
        var browserReadyTypeUnavailable = source === "discover"
          && select.hasAttribute("data-wallpaper-type-filter")
          && option.value !== ""
          && option.value !== "video";
        var unavailable = (remote && option.hasAttribute("data-installed-only"))
          || (!remote && option.hasAttribute("data-online-only"))
          || (source !== "workshop" && option.hasAttribute("data-workshop-only"))
          || browserReadyTypeUnavailable;
        option.hidden = unavailable;
        option.disabled = unavailable;
      });
      if (select.selectedOptions[0] && select.selectedOptions[0].disabled) {
        select.value = select.hasAttribute("data-wallpaper-sort") ? (source === "discover" ? "popular" : (remote ? "recent" : "featured")) : "";
      }
    });
    var recent = studio.querySelector("[data-recent-sort]");
    if (recent) recent.textContent = remote ? "Newest" : "Recently used";
    var search = studio.querySelector("[data-wallpaper-search]");
    if (search) {
      search.placeholder = source === "workshop"
        ? "Search all Workshop projects"
        : source === "discover" ? "Search downloadable wallpapers" : "Search installed";
    }
    var filterToggle = studio.querySelector("[data-we-filter-toggle]");
    var filterPanel = studio.querySelector("[data-we-filter-panel]");
    var filtersOpen = studio.dataset.onlineFilters !== "closed";
    if (filterToggle) {
      filterToggle.hidden = !remote;
      filterToggle.setAttribute("aria-expanded", remote && filtersOpen ? "true" : "false");
      filterToggle.classList.toggle("is-active", remote && filtersOpen);
    }
    if (filterPanel) filterPanel.hidden = !remote || !filtersOpen;
    var typeValue = studio.querySelector("[data-wallpaper-type-filter]");
    studio.querySelectorAll("[data-we-filter-type]").forEach(function (radio) {
      var browserReadyTypeUnavailable = source === "discover" && radio.value !== "" && radio.value !== "video";
      radio.disabled = browserReadyTypeUnavailable;
      var typeLabel = radio.closest("label");
      if (typeLabel) typeLabel.hidden = browserReadyTypeUnavailable;
      radio.checked = Boolean(typeValue) && radio.value === typeValue.value;
    });
    var ready = studio.querySelector("[data-we-filter-ready]");
    var readyRow = studio.querySelector("[data-we-filter-ready-row]");
    if (ready) {
      ready.checked = source === "discover";
      ready.disabled = source === "discover";
    }
    if (readyRow) readyRow.hidden = source !== "discover";
  }

  function loadOnlineWallpapers(studio, source, force, requestedPage) {
    if (localOnly) { showToast("Local wallpapers", "Import an image or video from your device. Online wallpaper services are disabled.", "info"); return Promise.resolve(); }
    if (!studio || source === "installed") return Promise.resolve({ items: [] });
    syncWallpaperCatalogControls(studio);
    var queryNode = studio.querySelector("[data-wallpaper-search]");
    var sortNode = studio.querySelector("[data-wallpaper-sort]");
    var typeNode = studio.querySelector("[data-wallpaper-type-filter]");
    var requestedQuery = queryNode ? queryNode.value.trim().replace(/\s+/g, " ") : "";
    var browserReadyOnly = source === "discover";
    var page = Math.min(1000, Math.max(1, Number.parseInt(requestedPage || studio.dataset.onlinePage, 10) || 1));
    var requestId = String(++onlineWallpaperRequestSerial);
    studio.dataset.onlineRequestId = requestId;
    studio.dataset.onlinePage = String(page);
    studio.dataset.onlineState = "loading";
    var grid = studio.querySelector("[data-wallpaper-grid]");
    if (grid) grid.setAttribute("aria-busy", "true");
    refreshWallpaperStudio(studio);
    if (!onlineWallpaperRuntimePromise) {
      onlineWallpaperRuntimePromise = new Promise(function (resolve, reject) {
        var script = document.createElement("script");
        script.src = "./neo-wallpaper-online.js?v=20260827-exact-install-v1";
        script.async = true;
        script.onload = function () {
          if (window.NEO_WALLPAPER_ONLINE) resolve(window.NEO_WALLPAPER_ONLINE);
          else reject(new Error("The online wallpaper catalog did not start."));
        };
        script.onerror = function () { reject(new Error("The online wallpaper catalog could not be loaded.")); };
        document.head.appendChild(script);
      }).catch(function (error) { onlineWallpaperRuntimePromise = null; throw error; });
    }
    return onlineWallpaperRuntimePromise.then(function (runtime) {
      return runtime.load(studio, {
        source: source,
        query: requestedQuery,
        sort: sortNode ? sortNode.value : "featured",
        type: typeNode ? typeNode.value : "",
        catalog: browserReadyOnly ? "browser-ready" : "",
        page: page,
        force: Boolean(force),
        requestId: requestId
      }, function (item) {
        openBrowserTarget(item.url, item.title);
      });
    }).then(function (payload) {
      if (studio.dataset.onlineRequestId !== requestId || studio.dataset.wallpaperSource !== source) return payload;
      if (sortNode && payload.sort && Array.from(sortNode.options).some(function (option) { return option.value === payload.sort; })) {
        sortNode.value = payload.sort;
      }
      studio.dataset.onlinePage = String(payload.page || page);
      studio.dataset.onlineTotalPages = String(payload.totalPages || 0);
      studio.dataset.onlineTotal = String(payload.total || 0);
      studio.dataset.onlineExactCount = String(payload.exactCount == null ? payload.total || 0 : payload.exactCount);
      studio.dataset.onlineRelatedCount = String(payload.relatedCount || 0);
      studio.dataset.onlineCount = String(payload.count || payload.items.length || 0);
      studio.dataset.onlinePlayableCount = String(payload.playableCount || 0);
      studio.dataset.onlinePageSize = String(payload.pageSize || 30);
      studio.dataset.onlineQuery = requestedQuery;
      studio.dataset.onlineCatalogMode = String(payload.catalogMode || "");
      studio.dataset.onlineFallback = payload.fallback ? "true" : "false";
      studio.dataset.onlineRecovered = payload.recovered ? "true" : "false";
      studio.dataset.onlineRecoveryQuery = String(payload.recoveryQuery || "");
      studio.dataset.onlineTotalEstimate = payload.totalIsEstimate ? "true" : "false";
      studio.dataset.onlineStale = payload.stale ? "true" : "false";
      delete studio.dataset.onlineError;
      studio.dataset.onlineState = "ready";
      if (grid) grid.setAttribute("aria-busy", "false");
      wireWallpaperStudioCards(studio);
      refreshWallpaperStudio(studio);
      return payload;
    }).catch(function (error) {
      if (studio.dataset.onlineRequestId !== requestId || studio.dataset.wallpaperSource !== source) throw error;
      studio.dataset.onlineState = "error";
      studio.dataset.onlineError = error && error.message ? error.message : "Discover could not connect.";
      if (grid) grid.setAttribute("aria-busy", "false");
      refreshWallpaperStudio(studio);
      throw error;
    });
  }

  function wireWallpaperStudioCards(studio) {
    if (!studio || studio.dataset.wallpaperCardEventsReady === "true") return;
    studio.dataset.wallpaperCardEventsReady = "true";
    studio.addEventListener("click", function (event) {
      var target = event.target instanceof Element ? event.target : event.target && event.target.parentElement;
      if (!target) return;
      var favorite = target.closest("[data-wallpaper-favorite]");
      if (favorite && studio.contains(favorite)) {
        if (favorite.disabled) return;
        event.preventDefault();
        var favoriteId = favorite.getAttribute("data-wallpaper-favorite");
        var favorites = settings.wallpaperFavorites.slice();
        var index = favorites.indexOf(favoriteId);
        if (index === -1) favorites.push(favoriteId);
        else favorites.splice(index, 1);
        settings.wallpaperFavorites = favorites;
        writeJson(SETTINGS_KEY, settings);
        wallpaperStudios().forEach(refreshWallpaperStudio);
        return;
      }
      var option = target.closest("[data-wallpaper-option]");
      if (!option || !studio.contains(option)) return;
      if (option.disabled) return;
      studio.dataset.selectedWallpaper = option.getAttribute("data-wallpaper-option");
      studio.dataset.wallpaperSelectionRevision = String((Number.parseInt(studio.dataset.wallpaperSelectionRevision, 10) || 0) + 1);
      refreshWallpaperStudio(studio);
    });
  }

  function wireWallpaperStudio(scope) {
    var studio = scope.querySelector("[data-wallpaper-studio]");
    if (!studio || studio.dataset.ready === "true") return;
    studio.dataset.ready = "true";
    studio.dataset.selectedWallpaper = settings.wallpaper;
    studio.dataset.wallpaperSelectionRevision = "0";
    studio.dataset.wallpaperSource = "installed";
    studio.dataset.onlinePage = "1";
    syncWallpaperCatalogControls(studio);

    studio.querySelectorAll("[data-wallpaper-upload-trigger]").forEach(function (trigger) {
      trigger.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        var input = document.getElementById(trigger.getAttribute("data-wallpaper-upload-trigger"));
        if (!input || input.disabled) return;
        input.value = "";
        if (typeof input.showPicker === "function") {
          try { input.showPicker(); return; } catch (_error) {}
        }
        input.click();
      });
    });

    studio.addEventListener("neo-wallpaper-library-change", function (event) {
      var result = event.detail;
      var record = result && result.record;
      var studios = wallpaperStudios();
      var hydration = record && wallpaperEngine
        ? Promise.all(studios.filter(function (item) {
          return item.dataset.wallpaperSource === "installed";
        }).map(function (item) {
          return wallpaperEngine.hydrateStudio(item).then(function () { wireWallpaperStudioCards(item); });
        }))
        : Promise.resolve();
      hydration.catch(function () {}).then(function () {
        if (record && result.applyAfterInstall) {
          settings.wallpaper = record.id;
          settings.wallpaperFit = "cover";
          settings.wallpaperPaused = false;
          settings.wallpaperRecent = [record.id].concat(settings.wallpaperRecent.filter(function (id) { return id !== record.id; })).slice(0, 6);
          applySettings();
          studios.forEach(refreshWallpaperStudio);
          showToast("Wallpaper applied", record.name + " is now active.", "image");
          return;
        }
        studios.forEach(refreshWallpaperStudio);
        if (record) showToast(result.added ? "Added to Installed" : "Already installed", record.name + " is ready in your wallpaper library.", "image");
      });
    });
    studio.addEventListener("neo-wallpaper-install-state", function () {
      refreshWallpaperStudio(studio);
    });
    studio.addEventListener("neo-wallpaper-selection-change", function () {
      refreshWallpaperStudio(studio);
    });
    studio.addEventListener("neo-wallpaper-library-error", function (event) {
      var detail = event.detail || {};
      refreshWallpaperStudio(studio);
      showToast("Wallpaper not added", detail.message || "The wallpaper could not be saved on this device.", "info");
    });

    wireWallpaperStudioCards(studio);

    var onlineSearchTimer = 0;
    function invalidateOnlineRequest() {
      clearTimeout(onlineSearchTimer);
      studio.dataset.onlineRequestId = String(++onlineWallpaperRequestSerial);
      studio.dataset.onlineState = "idle";
      var grid = studio.querySelector("[data-wallpaper-grid]");
      if (grid) grid.setAttribute("aria-busy", "false");
    }
    function requestOnlinePage(page, force) {
      clearTimeout(onlineSearchTimer);
      var source = studio.dataset.wallpaperSource || "installed";
      if (source === "installed") {
        studio.dataset.onlineState = "idle";
        var grid = studio.querySelector("[data-wallpaper-grid]");
        if (grid) grid.setAttribute("aria-busy", "false");
        refreshWallpaperStudio(studio);
        return;
      }
      loadOnlineWallpapers(studio, source, Boolean(force), page).catch(function () {});
    }

    studio.querySelectorAll("[data-wallpaper-view-button]").forEach(function (button) {
      button.addEventListener("click", function () {
        studio.dataset.wallpaperView = button.getAttribute("data-wallpaper-view-button");
        refreshWallpaperStudio(studio);
      });
    });

    studio.querySelectorAll("[data-we-source]").forEach(function (button) {
      button.addEventListener("click", function () {
        var nextSource = button.getAttribute("data-we-source") || "installed";
        invalidateOnlineRequest();
        studio.dataset.wallpaperSource = nextSource;
        studio.dataset.wallpaperView = "installed";
        studio.dataset.onlinePage = "1";
        studio.dataset.onlineState = "idle";
        delete studio.dataset.onlineError;
        delete studio.dataset.onlineStale;
        var searchControl = studio.querySelector("[data-wallpaper-search]");
        if (searchControl) searchControl.value = "";
        var sortControl = studio.querySelector("[data-wallpaper-sort]");
        if (sortControl) sortControl.value = nextSource === "discover" ? "popular" : (nextSource === "workshop" ? "recent" : "featured");
        syncWallpaperCatalogControls(studio);
        refreshWallpaperStudio(studio);
        if (nextSource === "workshop" || nextSource === "discover") {
          requestOnlinePage(1, false);
        } else if (wallpaperEngine) {
          wallpaperEngine.hydrateStudio(studio).then(function () {
            wireWallpaperStudioCards(studio);
            refreshWallpaperStudio(studio);
          }).catch(function () {
            refreshWallpaperStudio(studio);
          });
        }
      });
    });
    var showInstalled = studio.querySelector("[data-we-show-installed]");
    if (showInstalled) showInstalled.addEventListener("click", function () {
      var installedTab = studio.querySelector('[data-we-source="installed"]');
      if (installedTab) installedTab.click();
    });
    var onlineRetry = studio.querySelector("[data-we-online-retry]");
    if (onlineRetry) onlineRetry.addEventListener("click", function () {
      requestOnlinePage(Number.parseInt(studio.dataset.onlinePage, 10) || 1, true);
    });

    var search = studio.querySelector("[data-wallpaper-search]");
    var searchClear = studio.querySelector("[data-wallpaper-search-clear]");
    var searchForm = studio.querySelector("[data-wallpaper-search-form]");
    function primeOnlineSearchSort() {
      if (!search) return;
      var nextQuery = search.value.trim().replace(/\s+/g, " ");
      if (nextQuery && nextQuery !== studio.dataset.lastOnlineSearchQuery) {
        var sortControl = studio.querySelector("[data-wallpaper-sort]");
        if (sortControl) sortControl.value = "relevance";
      } else if (!nextQuery && (studio.dataset.wallpaperSource || "installed") === "discover") {
        var discoverSort = studio.querySelector("[data-wallpaper-sort]");
        if (discoverSort) discoverSort.value = "popular";
      }
      studio.dataset.lastOnlineSearchQuery = nextQuery;
    }
    function submitWallpaperSearch() {
      clearTimeout(onlineSearchTimer);
      primeOnlineSearchSort();
      studio.dataset.onlinePage = "1";
      if ((studio.dataset.wallpaperSource || "installed") !== "installed") requestOnlinePage(1, false);
      else refreshWallpaperStudio(studio);
    }
    if (search) {
      search.addEventListener("input", function () {
        primeOnlineSearchSort();
        studio.dataset.onlinePage = "1";
        refreshWallpaperStudio(studio);
        if ((studio.dataset.wallpaperSource || "installed") === "installed") {
          return;
        }
        clearTimeout(onlineSearchTimer);
        studio.dataset.onlineState = "pending";
        refreshWallpaperStudio(studio);
        onlineSearchTimer = setTimeout(function () { requestOnlinePage(1, false); }, 240);
      });
      search.addEventListener("search", function () {
        submitWallpaperSearch();
      });
      search.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && search.value) {
          event.preventDefault();
          search.value = "";
          submitWallpaperSearch();
        }
      });
    }
    if (searchForm) searchForm.addEventListener("submit", function (event) {
      event.preventDefault();
      submitWallpaperSearch();
    });
    if (searchClear) searchClear.addEventListener("click", function () {
      if (!search) return;
      search.value = "";
      search.focus();
      submitWallpaperSearch();
    });
    var filterToggle = studio.querySelector("[data-we-filter-toggle]");
    if (filterToggle) filterToggle.addEventListener("click", function () {
      studio.dataset.onlineFilters = studio.dataset.onlineFilters === "closed" ? "open" : "closed";
      syncWallpaperCatalogControls(studio);
    });
    function resetOnlineFilters() {
      var type = studio.querySelector("[data-wallpaper-type-filter]");
      if (type) type.value = "";
      studio.querySelectorAll("[data-we-filter-type]").forEach(function (input) { input.checked = input.value === ""; });
      studio.querySelectorAll("[data-we-filter-quality]").forEach(function (input) { input.checked = input.value === ""; });
      studio.querySelectorAll("[data-we-tag-filter]").forEach(function (input) { input.checked = false; });
      var ready = studio.querySelector("[data-we-filter-ready]");
      var installed = studio.querySelector("[data-we-filter-installed]");
      if (ready) ready.checked = (studio.dataset.wallpaperSource || "installed") === "discover";
      if (installed) installed.checked = false;
    }
    studio.addEventListener("change", function (event) {
      var target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      if (target.matches("[data-we-filter-type]")) {
        var type = studio.querySelector("[data-wallpaper-type-filter]");
        if (type) type.value = target.value;
        studio.dataset.onlinePage = "1";
        requestOnlinePage(1, false);
        return;
      }
      if (target.matches("[data-we-filter-quality], [data-we-filter-ready], [data-we-filter-installed], [data-we-tag-filter]")) {
        refreshWallpaperStudio(studio);
      }
    });
    var filterReset = studio.querySelector("[data-we-filter-reset]");
    if (filterReset) filterReset.addEventListener("click", function () {
      resetOnlineFilters();
      studio.dataset.onlinePage = "1";
      if ((studio.dataset.wallpaperSource || "installed") === "installed") refreshWallpaperStudio(studio);
      else requestOnlinePage(1, false);
    });
    var emptyReset = studio.querySelector("[data-wallpaper-empty-reset]");
    if (emptyReset) emptyReset.addEventListener("click", function () {
      if (search) search.value = "";
      resetOnlineFilters();
      submitWallpaperSearch();
    });
    studio.querySelectorAll("[data-wallpaper-topic]").forEach(function (button) {
      button.addEventListener("click", function () {
        if (!search) return;
        var topic = button.getAttribute("data-wallpaper-topic") || "";
        search.value = topic;
        if (!topic) {
          var sortControl = studio.querySelector("[data-wallpaper-sort]");
          if (sortControl) sortControl.value = "popular";
        }
        submitWallpaperSearch();
      });
    });
    var sort = studio.querySelector("[data-wallpaper-sort]");
    if (sort) sort.addEventListener("change", function () {
      if ((studio.dataset.wallpaperSource || "installed") !== "installed") requestOnlinePage(1, false);
      else refreshWallpaperStudio(studio);
    });
    var typeFilter = studio.querySelector("[data-wallpaper-type-filter]");
    if (typeFilter) typeFilter.addEventListener("change", function () {
      if ((studio.dataset.wallpaperSource || "installed") !== "installed") requestOnlinePage(1, false);
      else refreshWallpaperStudio(studio);
    });

    studio.querySelectorAll("[data-we-page-action]").forEach(function (button) {
      button.addEventListener("click", function () {
        var current = Number.parseInt(studio.dataset.onlinePage, 10) || 1;
        var total = Number.parseInt(studio.dataset.onlineTotalPages, 10) || 1;
        var next = button.getAttribute("data-we-page-action") === "next" ? current + 1 : current - 1;
        requestOnlinePage(Math.min(total, Math.max(1, next)), false);
      });
    });
    var pageInput = studio.querySelector("[data-we-page-input]");
    var pageGo = studio.querySelector("[data-we-page-go]");
    function goToEnteredPage() {
      if (!pageInput) return;
      var total = Number.parseInt(studio.dataset.onlineTotalPages, 10) || 1;
      requestOnlinePage(Math.min(total, Math.max(1, Number.parseInt(pageInput.value, 10) || 1)), false);
    }
    if (pageGo) pageGo.addEventListener("click", goToEnteredPage);
    if (pageInput) pageInput.addEventListener("keydown", function (event) {
      if (event.key !== "Enter") return;
      event.preventDefault();
      goToEnteredPage();
    });

    studio.querySelectorAll("[data-we-action]").forEach(function (button) {
      button.addEventListener("click", function () {
        var action = button.getAttribute("data-we-action");
        if (action === "apply") {
          var applyButton = studio.querySelector("[data-wallpaper-apply]");
          if (applyButton && !applyButton.disabled) applyButton.click();
        }
        if (action === "recent") {
          studio.dataset.wallpaperView = "recent";
          studio.dataset.wallpaperSource = "installed";
          refreshWallpaperStudio(studio);
        }
        if (action === "favorite") {
          var selected = studio.dataset.selectedWallpaper;
          var favorite = studio.querySelector('[data-wallpaper-favorite="' + escapeSelector(selected) + '"]');
          if (favorite) favorite.click();
        }
        if (action === "configure") {
          var inspector = studio.querySelector(".studio-inspector");
          if (inspector) {
            inspector.setAttribute("tabindex", "-1");
            inspector.focus({ preventScroll: true });
            inspector.scrollTo({ top: 0, behavior: settings.reduceMotion ? "auto" : "smooth" });
          }
        }
      });
    });

    var apply = studio.querySelector("[data-wallpaper-apply]");
    if (apply) {
      apply.addEventListener("click", function () {
        var selected = studio.dataset.selectedWallpaper || settings.wallpaper;
        var selectedCard = studio.querySelector('[data-wallpaper-card="' + escapeSelector(selected) + '"]');
        var onlineSelection = Boolean(selectedCard && selectedCard.getAttribute("data-wallpaper-online") === "true");
        var installControl = selectedCard && selectedCard.querySelector("[data-wallpaper-install]");
        var installState = installControl ? installControl.dataset.wallpaperInstallState : "unavailable";
        var installedRecord = wallpaperEngine ? wallpaperEngine.getRecord(selected) : null;
        if (onlineSelection && !installedRecord) {
          if (installState === "downloading") {
            showToast("Download in progress", "This wallpaper is still being saved. It will apply automatically when ready.", "info");
          } else if (installState === "details" && installControl) {
            installControl.click();
          } else if (installControl && !installControl.disabled) {
            installControl.dataset.applyAfterInstall = "true";
            installControl.click();
          } else {
            var provider = selectedCard.getAttribute("data-wallpaper-provider");
            showToast(provider === "commons" ? "Download needs a refresh" : "Project unavailable", provider === "commons"
              ? "Refresh Discover to retrieve a new verified download source."
              : "No project page is available for this item.", "info");
          }
          return;
        }
        if (selected === "custom" && !customWallpaperUrl) {
          showToast("No imported wallpaper", "Add an image from Create first.", "info");
          return;
        }
        settings.wallpaper = selected;
        settings.wallpaperPaused = false;
        settings.wallpaperRecent = [selected].concat(settings.wallpaperRecent.filter(function (id) { return id !== selected; })).slice(0, 6);
        applySettings();
        wallpaperStudios().forEach(refreshWallpaperStudio);
        var card = studio.querySelector('[data-wallpaper-card="' + escapeSelector(selected) + '"]');
        var name = card ? card.getAttribute("data-wallpaper-name") : "Wallpaper";
        showToast("Wallpaper applied", name + " is now active.", "image");
      });
    }

    studio.querySelectorAll("[data-wallpaper-command]").forEach(function (button) {
      button.addEventListener("click", function () {
        var command = button.getAttribute("data-wallpaper-command");
        if (command === "toggle") {
          var playback = wallpaperEngine ? wallpaperEngine.getState().playback : "";
          var shouldResume = settings.wallpaperPaused || playback === "paused" || playback === "blocked";
          settings.wallpaperPaused = !shouldResume;
          if (shouldResume) Object.assign(settings, { motion: true, reduceMotion: false, batterySaver: false });
          applySettings();
        }
        if (command === "mute") {
          if (settings.wallpaperMuted && wallpaperEngine) wallpaperEngine.unlockAudio();
          setSetting("wallpaperMuted", !settings.wallpaperMuted);
        }
      });
    });

    var remove = studio.querySelector("[data-wallpaper-remove]");
    if (remove && wallpaperEngine) {
      remove.addEventListener("click", function () {
        var selected = studio.dataset.selectedWallpaper || settings.wallpaper;
        if (!wallpaperEngine.isLocal(selected)) return;
        remove.disabled = true;
        remove.textContent = "Removing...";
        wallpaperEngine.remove(selected).then(function () {
          settings.wallpaperFavorites = settings.wallpaperFavorites.filter(function (id) { return id !== selected; });
          settings.wallpaperRecent = settings.wallpaperRecent.filter(function (id) { return id !== selected; });
          if (settings.wallpaper === selected) settings.wallpaper = localOnly ? "neo" : "we-steam-1403160205";
          studio.dataset.selectedWallpaper = settings.wallpaper;
          applySettings();
          return Promise.all(wallpaperStudios().map(function (item) { return wallpaperEngine.hydrateStudio(item); }));
        }).then(function () {
          wallpaperStudios().forEach(function (item) { wireWallpaperStudioCards(item); refreshWallpaperStudio(item); });
          showToast("Wallpaper removed", "The local media was deleted from this device.", "image");
        }).catch(function (error) {
          showToast("Could not remove wallpaper", error.message || "Local storage rejected the change.", "info");
        }).then(function () {
          remove.disabled = false;
          refreshWallpaperStudio(studio);
        });
      });
    }

    refreshWallpaperStudio(studio);
    if (wallpaperEngine) {
      wallpaperEngine.hydrateStudio(studio).then(function () {
        wireWallpaperStudioCards(studio);
        refreshWallpaperStudio(studio);
        if (studio.dataset.wallpaperSource !== "installed") loadOnlineWallpapers(studio, studio.dataset.wallpaperSource).catch(function () {});
      }).catch(function () {});
    }
  }

  function refreshWallpaperStudio(studio) {
    if (!studio) return;
    var selected = studio.dataset.selectedWallpaper || settings.wallpaper;
    var view = studio.dataset.wallpaperView || "installed";
    var source = studio.dataset.wallpaperSource || "installed";
    syncWallpaperCatalogControls(studio);
    var favorites = settings.wallpaperFavorites;
    var recent = settings.wallpaperRecent;
    var queryNode = studio.querySelector("[data-wallpaper-search]");
    var query = queryNode ? queryNode.value.trim().toLowerCase() : "";
    var searchClear = studio.querySelector("[data-wallpaper-search-clear]");
    if (searchClear) searchClear.hidden = !query;
    studio.querySelectorAll("[data-wallpaper-topic]").forEach(function (button) {
      var activeTopic = (button.getAttribute("data-wallpaper-topic") || "") === query;
      button.classList.toggle("is-active", activeTopic);
      button.setAttribute("aria-pressed", activeTopic ? "true" : "false");
    });
    var sortNode = studio.querySelector("[data-wallpaper-sort]");
    var sort = sortNode ? sortNode.value : "featured";
    var typeNode = studio.querySelector("[data-wallpaper-type-filter]");
    var typeFilter = typeNode ? typeNode.value : "";
    var readyOnly = source === "discover" || Boolean(studio.querySelector("[data-we-filter-ready]:checked"));
    var installedOnly = Boolean(studio.querySelector("[data-we-filter-installed]:checked"));
    var qualityNode = studio.querySelector("[data-we-filter-quality]:checked");
    var qualityFilter = qualityNode ? qualityNode.value : "";
    var tagFilters = Array.from(studio.querySelectorAll("[data-we-tag-filter]:checked")).map(function (input) {
      return input.value;
    });
    var onlineFilterActive = Boolean(typeFilter || qualityFilter || installedOnly || tagFilters.length || (source !== "discover" && readyOnly));
    var grid = studio.querySelector("[data-wallpaper-grid]");
    var create = studio.querySelector("[data-wallpaper-create]");
    var empty = studio.querySelector("[data-wallpaper-empty]");
    var online = studio.querySelector("[data-we-source-intro]");
    var visibleCount = 0;
    var cards = Array.from(studio.querySelectorAll("[data-wallpaper-card]"));
    var installedCount = studio.querySelector("[data-installed-count]");
    if (installedCount) {
      var engineState = wallpaperEngine ? wallpaperEngine.getState() : null;
      installedCount.textContent = String(engineState ? engineState.libraryCount : cards.filter(function (card) {
        var id = card.getAttribute("data-wallpaper-card");
        var available = id !== "custom" || Boolean(customWallpaperUrl);
        return available && card.getAttribute("data-wallpaper-online") !== "true";
      }).length);
    }

    studio.querySelectorAll("[data-wallpaper-view-button]").forEach(function (button) {
      var active = button.getAttribute("data-wallpaper-view-button") === view;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    studio.querySelectorAll("[data-we-source]").forEach(function (button) {
      var active = button.getAttribute("data-we-source") === source;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    var onlineTitle = studio.querySelector("[data-we-online-title]");
    if (onlineTitle) onlineTitle.textContent = source === "workshop" ? "Workshop" : "Discover";
    var onlineCopy = studio.querySelector("[data-we-source-copy]");
    var onlineState = studio.dataset.onlineState || "idle";
    var onlineCards = cards.filter(function (card) {
      return card.getAttribute("data-wallpaper-online-source") === source;
    });
    var onlinePage = Number.parseInt(studio.dataset.onlinePage, 10) || 1;
    var onlineTotalPages = Number.parseInt(studio.dataset.onlineTotalPages, 10) || 0;
    var onlineTotal = Number.parseInt(studio.dataset.onlineTotal, 10) || 0;
    var onlineExactCount = Number.parseInt(studio.dataset.onlineExactCount, 10) || 0;
    var onlineRelatedCount = Number.parseInt(studio.dataset.onlineRelatedCount, 10) || 0;
    var onlineCount = Number.parseInt(studio.dataset.onlineCount, 10) || onlineCards.length;
    var onlinePageSize = Number.parseInt(studio.dataset.onlinePageSize, 10) || 30;
    var onlineStart = onlineTotal && onlineCount ? ((onlinePage - 1) * onlinePageSize) + 1 : 0;
    var onlineEnd = onlineStart ? Math.min(onlineTotal, onlineStart + onlineCount - 1) : 0;
    if (onlineCopy) {
      if (onlineState === "loading") onlineCopy.textContent = source === "discover" ? "Finding web-compatible animated wallpapers..." : "Loading Workshop projects...";
      else if (onlineState === "pending") onlineCopy.textContent = "Filtering now; refreshing online results...";
      else if (onlineState === "error") onlineCopy.textContent = studio.dataset.onlineError || "Discover could not connect. Refresh to try again.";
      else if (onlineState === "ready" && studio.dataset.onlineFallback === "true") onlineCopy.textContent = studio.dataset.onlineCatalogMode === "browser-ready"
        ? "No exact browser-ready match for ‘" + query + "’. Showing downloadable 1080p+ alternatives."
        : "No exact matches for ‘" + query + "’. Showing popular Workshop alternatives instead.";
      else if (onlineState === "ready" && onlineTotal && onlineCount && source === "discover" && studio.dataset.onlineCatalogMode === "browser-ready") onlineCopy.textContent = onlineRelatedCount
        ? onlineCount.toLocaleString() + (onlineCount === 1 ? " playable animation" : " playable animations") + (onlinePage > 1 ? " on page " + onlinePage.toLocaleString() : "") + " · " + onlineExactCount.toLocaleString() + " matches + " + onlineRelatedCount.toLocaleString() + " related."
        : onlineCount.toLocaleString() + (onlineCount === 1 ? " playable animation" : " playable animations") + (onlinePage > 1 ? " on page " + onlinePage.toLocaleString() : "") + (onlineTotal > onlineCount ? " · " + onlineTotal.toLocaleString() + (query ? " title matches." : " source matches.") : ".") + (studio.dataset.onlineStale === "true" ? " Cached results." : "");
      else if (onlineState === "ready" && onlineTotal && onlineCount) onlineCopy.textContent = "Showing " + onlineStart.toLocaleString() + "-" + onlineEnd.toLocaleString() + " of " + onlineTotal.toLocaleString() + " Workshop projects." + (studio.dataset.onlineStale === "true" ? " Cached results." : "");
      else if (onlineState === "ready" && source === "discover") onlineCopy.textContent = "No results are available right now. Refresh to try the catalog again.";
      else if (onlineState === "ready") onlineCopy.textContent = "No Workshop projects are available right now. Refresh to try again.";
      else onlineCopy.textContent = source === "discover" ? "Every result downloads once and can be applied immediately." : "Browse the complete native Wallpaper Engine catalog.";
    }
    var onlineRetry = studio.querySelector("[data-we-online-retry]");
    if (onlineRetry) {
      onlineRetry.hidden = source === "installed";
      onlineRetry.disabled = onlineState === "loading";
      onlineRetry.textContent = onlineState === "loading" ? "Loading..." : "Refresh";
    }
    var onlinePager = studio.querySelector("[data-we-online-pager]");
    if (onlinePager) {
      onlinePager.hidden = source === "installed" || (onlineState !== "ready" && onlineTotalPages === 0);
      var pageInput = onlinePager.querySelector("[data-we-page-input]");
      var totalPagesNode = onlinePager.querySelector("[data-we-total-pages]");
      var resultCount = onlinePager.querySelector("[data-we-result-count]");
      if (pageInput) {
        pageInput.value = String(onlinePage);
        pageInput.max = String(Math.max(1, onlineTotalPages));
        pageInput.disabled = onlineState === "loading" || onlineTotalPages < 2;
      }
      if (totalPagesNode) totalPagesNode.textContent = Math.max(1, onlineTotalPages).toLocaleString();
      if (resultCount) resultCount.textContent = onlineTotal.toLocaleString() + (onlineTotal === 1 ? " result" : " results");
      onlinePager.querySelectorAll("[data-we-page-action], [data-we-page-go]").forEach(function (button) {
        var action = button.getAttribute("data-we-page-action");
        button.disabled = onlineState === "loading" || onlineTotalPages < 2 || (action === "previous" && onlinePage <= 1) || (action === "next" && onlinePage >= onlineTotalPages);
      });
    }
    var title = studio.querySelector("#wallpaper-library-title");
    if (title) title.textContent = source === "installed" ? view.charAt(0).toUpperCase() + view.slice(1) : (source === "workshop" ? "Workshop" : "Discover");
    var viewLabel = studio.querySelector("[data-wallpaper-view-label]");
    if (viewLabel) viewLabel.textContent = source === "installed" ? "LIBRARY" : "ONLINE LIBRARY";
    var favoriteCount = studio.querySelector("[data-favorite-count]");
    if (favoriteCount) favoriteCount.textContent = String(favorites.length);
    var recentCount = studio.querySelector("[data-recent-count]");
    if (recentCount) recentCount.textContent = String(recent.length);

    if (grid) grid.hidden = view === "create";
    if (create) create.hidden = source !== "installed" || view !== "create";
    if (online) online.hidden = source === "installed";

    if (source === "installed") {
      cards.sort(function (a, b) {
        var aId = a.getAttribute("data-wallpaper-card");
        var bId = b.getAttribute("data-wallpaper-card");
        if (sort === "name") return a.getAttribute("data-wallpaper-name").localeCompare(b.getAttribute("data-wallpaper-name"));
        if (sort === "recent") {
          var aIndex = recent.indexOf(aId);
          var bIndex = recent.indexOf(bId);
          return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
        }
        return 0;
      });
    }

    var visibleIds = [];
    cards.forEach(function (card) {
      var id = card.getAttribute("data-wallpaper-card");
      var name = card.getAttribute("data-wallpaper-name") || id;
      var sourceType = card.getAttribute("data-wallpaper-source-type") || card.getAttribute("data-wallpaper-type") || "";
      var onlineCard = card.getAttribute("data-wallpaper-online") === "true";
      var customUnavailable = id === "custom" && !customWallpaperUrl;
      var sourceMatch = source === "installed"
        ? !onlineCard
        : onlineCard && card.getAttribute("data-wallpaper-online-source") === source;
      var viewMatch = source !== "installed" || view === "installed" || (view === "favorites" && favorites.indexOf(id) !== -1) || (view === "recent" && recent.indexOf(id) !== -1);
      var searchable = card.getAttribute("data-wallpaper-search") || [name, card.getAttribute("data-wallpaper-copy"), card.getAttribute("data-wallpaper-author")].join(" ");
      var onlineMatcher = window.NEO_WALLPAPER_ONLINE && window.NEO_WALLPAPER_ONLINE.matchesSearch;
      var searchMatch = source !== "installed" || !query || (onlineMatcher ? onlineMatcher(searchable, query) : searchable.toLowerCase().indexOf(query) !== -1);
      var typeMatch = !typeFilter || sourceType === typeFilter || card.getAttribute("data-wallpaper-type") === typeFilter;
      var readyMatch = source === "installed" || !readyOnly || card.getAttribute("data-wallpaper-original-available") === "true";
      var installedMatch = source === "installed" || !installedOnly || Boolean(wallpaperEngine && wallpaperEngine.getRecord(id));
      var cardQuality = card.dataset.wallpaperQuality || "";
      var qualityMatch = source === "installed" || !qualityFilter
        || (qualityFilter === "4k" && cardQuality === "4k")
        || (qualityFilter === "1080p" && (cardQuality === "1080p" || cardQuality === "4k"))
        || (qualityFilter === "preview" && cardQuality === "preview");
      var cardTags = (card.dataset.wallpaperTags || "").split("|").filter(Boolean);
      var tagsMatch = source === "installed" || !tagFilters.length || tagFilters.some(function (tag) { return cardTags.indexOf(tag) !== -1; });
      var visible = view !== "create" && sourceMatch && !customUnavailable && viewMatch && searchMatch && typeMatch && readyMatch && installedMatch && qualityMatch && tagsMatch;
      card.hidden = !visible;
      if (visible) {
        visibleCount += 1;
        visibleIds.push(id);
      }
    });
    var searchStatus = studio.querySelector("[data-wallpaper-search-status]");
    if (searchStatus) searchStatus.textContent = visibleCount + (visibleCount === 1 ? " wallpaper shown" : " wallpapers shown");
    var usingShelves = Boolean(grid && source === "discover" && !query && grid.classList.contains("is-shelved"));
    if (grid && !usingShelves) {
      if (grid.classList.contains("is-shelved")) {
        cards.forEach(function (card) { grid.appendChild(card); });
        grid.querySelectorAll("[data-wallpaper-shelf]").forEach(function (shelf) { shelf.remove(); });
        grid.classList.remove("is-shelved");
      }
      var order = cards.map(function (card) { return card.dataset.wallpaperCard; }).join();
      if (studio.dataset.cardOrder !== order) {
        studio.dataset.cardOrder = order;
        cards.forEach(function (card) { grid.appendChild(card); });
      }
    } else if (usingShelves) {
      grid.querySelectorAll("[data-wallpaper-shelf]").forEach(function (shelf) {
        shelf.hidden = !shelf.querySelector("[data-wallpaper-card]:not([hidden])");
      });
    }
    var filterStatus = studio.querySelector("[data-we-filter-status]");
    if (filterStatus) {
      filterStatus.hidden = source === "installed";
      filterStatus.textContent = source === "installed" ? "" : visibleCount.toLocaleString() + " of " + onlineCards.length.toLocaleString() + " on this page";
    }

    if (visibleIds.length && visibleIds.indexOf(selected) === -1) {
      selected = visibleIds[0];
      studio.dataset.selectedWallpaper = selected;
      studio.dataset.wallpaperSelectionRevision = String((Number.parseInt(studio.dataset.wallpaperSelectionRevision, 10) || 0) + 1);
    }

    cards.forEach(function (card) {
      var id = card.getAttribute("data-wallpaper-card");
      card.classList.toggle("is-selected", id === selected);
      card.classList.toggle("is-active", id === settings.wallpaper);
      var select = card.querySelector("[data-wallpaper-option]");
      if (select) select.setAttribute("aria-pressed", id === selected ? "true" : "false");
      var favorite = card.querySelector("[data-wallpaper-favorite]");
      if (favorite) {
        var isFavorite = favorites.indexOf(id) !== -1;
        favorite.hidden = false;
        favorite.classList.toggle("is-active", isFavorite);
        favorite.setAttribute("aria-pressed", isFavorite ? "true" : "false");
        favorite.textContent = isFavorite ? "Saved" : "Save";
      }
    });
    if (window.NEO_WALLPAPER_ONLINE && typeof window.NEO_WALLPAPER_ONLINE.sync === "function") {
      window.NEO_WALLPAPER_ONLINE.sync(studio);
    }

    if (empty) {
      var emptyTitle = empty.querySelector("[data-wallpaper-empty-title]");
      var emptyCopy = empty.querySelector("[data-wallpaper-empty-copy]");
      var emptyReset = empty.querySelector("[data-wallpaper-empty-reset]");
      if (source === "installed") {
        if (emptyTitle) emptyTitle.textContent = "No wallpapers here yet";
        if (emptyCopy) emptyCopy.textContent = "Choose another section or add a local image.";
      } else {
        if (emptyTitle) emptyTitle.textContent = "No online wallpapers found";
        if (emptyCopy) emptyCopy.textContent = "Try another search, type, or sort option.";
      }
      if (emptyReset) emptyReset.hidden = !query && !onlineFilterActive;
      empty.hidden = view === "create" || visibleCount > 0 || onlineState === "loading" || onlineState === "pending";
    }
    var selectedCard = studio.querySelector('[data-wallpaper-card="' + escapeSelector(selected) + '"]:not([hidden])');
    var inspectorPreview = studio.querySelector("[data-inspector-preview]");
    var inspectorTitle = studio.querySelector("[data-inspector-title]");
    var inspectorCopy = studio.querySelector("[data-inspector-copy]");
    var inspectorAuthor = studio.querySelector("[data-inspector-author]");
    var inspectorType = studio.querySelector("[data-inspector-type]");
    var inspectorState = studio.querySelector("[data-inspector-state]");
    if (selectedCard) {
      if (inspectorPreview) {
        inspectorPreview.removeAttribute("style");
        inspectorPreview.removeAttribute("data-media-badge");
        var selectedOnlinePreview = selectedCard.getAttribute("data-wallpaper-preview");
        if (selectedOnlinePreview) {
          inspectorPreview.className = "inspector-preview local-wallpaper-preview";
          inspectorPreview.style.backgroundImage = 'url("' + selectedOnlinePreview.replace(/"/g, "%22") + '")';
          inspectorPreview.dataset.mediaBadge = "ONLINE";
        } else if (!wallpaperEngine || !wallpaperEngine.decoratePreview(inspectorPreview, selected)) {
          inspectorPreview.className = "inspector-preview " + selectedCard.getAttribute("data-wallpaper-card") + "-preview";
        }
      }
      if (inspectorTitle) inspectorTitle.textContent = selectedCard.getAttribute("data-wallpaper-name");
      if (inspectorCopy) inspectorCopy.textContent = selectedCard.getAttribute("data-wallpaper-copy");
      if (inspectorAuthor) inspectorAuthor.textContent = selectedCard.getAttribute("data-wallpaper-author") || "Local library";
      if (inspectorState) {
        var selectedRecord = wallpaperEngine ? wallpaperEngine.getRecord(selected) : null;
        var selectedOnline = selectedCard.getAttribute("data-wallpaper-online") === "true";
        var selectedInstallable = selectedCard.getAttribute("data-wallpaper-installable") === "true";
        var selectedOriginalAvailable = selectedCard.getAttribute("data-wallpaper-original-available") === "true";
        inspectorState.textContent = selectedOnline && !selectedRecord
          ? (selectedOriginalAvailable ? "Ready to download" : "Wallpaper Engine project")
          : selected === settings.wallpaper ? "Active" : "Installed";
      }
      if (inspectorType) {
        var selectedType = selectedCard.getAttribute("data-wallpaper-source-type") || selectedCard.getAttribute("data-wallpaper-type") || "image";
        inspectorType.textContent = selectedType.charAt(0).toUpperCase() + selectedType.slice(1);
      }
    }
    var apply = studio.querySelector("[data-wallpaper-apply]");
    if (apply) {
      var applied = selected === settings.wallpaper;
      var onlineSelection = Boolean(selectedCard && selectedCard.getAttribute("data-wallpaper-online") === "true");
      var selectedInstall = selectedCard && selectedCard.querySelector("[data-wallpaper-install]");
      var selectedInstallState = selectedInstall ? selectedInstall.dataset.wallpaperInstallState : "unavailable";
      var downloadingOnlineSelection = onlineSelection && selectedInstallState === "downloading";
      var installableOnlineSelection = Boolean(onlineSelection && selectedCard.getAttribute("data-wallpaper-installable") === "true" && selectedInstallState === "ready");
      var installedOnlineSelection = Boolean(onlineSelection && wallpaperEngine && wallpaperEngine.getRecord(selected));
      var projectDetailsSelection = Boolean(onlineSelection && !installedOnlineSelection && selectedInstallState === "details");
      apply.disabled = !selectedCard || downloadingOnlineSelection || (onlineSelection && !installedOnlineSelection && !installableOnlineSelection && !projectDetailsSelection) || ((!onlineSelection || installedOnlineSelection) && applied);
      apply.innerHTML = downloadingOnlineSelection
        ? iconMarkup("download") + " Downloading wallpaper..."
        : onlineSelection && !installedOnlineSelection && installableOnlineSelection
        ? iconMarkup("download") + " Download & use"
        : projectDetailsSelection
          ? iconMarkup("external") + " Get in Wallpaper Engine"
        : onlineSelection && !installedOnlineSelection
          ? iconMarkup("info") + " Project unavailable"
        : iconMarkup("check") + (applied ? " Applied" : " Apply wallpaper");
    }
    refreshWallpaperPlaybackControls(studio, selected);
  }

  function refreshWallpaperPlaybackControls(studio, selected) {
    var state = wallpaperEngine ? wallpaperEngine.getState() : null;
    var record = wallpaperEngine ? wallpaperEngine.getRecord(selected) : null;
    var isActive = Boolean(state && state.id === selected);
    var isBundled = Boolean(record && wallpaperEngine && wallpaperEngine.isBundled && wallpaperEngine.isBundled(selected));
    var isPreview = Boolean(record && record.previewFallback);
    var isCanvas = selected === "signal" || isPreview;
    var isVideo = Boolean(record && (record.type === "video" || record.type === "youtube"));
    var isWeb = Boolean(record && record.type === "web");
    var isAnimatedImage = Boolean(record && record.type === "animated-image");
    var selectedCard = studio.querySelector('[data-wallpaper-card="' + escapeSelector(selected) + '"]:not([hidden])');
    var isOnlineAnimation = Boolean(selectedCard
      && selectedCard.getAttribute("data-wallpaper-online") === "true"
      && selectedCard.getAttribute("data-wallpaper-installable") === "true");
    var isOnlinePreview = Boolean(isOnlineAnimation
      && selectedCard.getAttribute("data-wallpaper-original-available") !== "true"
      && selectedCard.getAttribute("data-wallpaper-preview-available") === "true");
    var optimized = performanceActive();
    var canPause = !optimized && isActive && (isCanvas || isVideo || isWeb || isAnimatedImage);
    var isPaused = Boolean(isActive && (state.playback === "paused" || state.playback === "blocked"));
    var kind = record && record.type === "youtube" ? "YouTube animation" : isVideo ? "Video" : isAnimatedImage ? "Animated image" : isPreview ? "High-DPI animation" : isCanvas ? "Canvas animation" : isWeb ? "Live animation" : record ? "Local image" : isOnlinePreview ? "Web animation" : isOnlineAnimation ? "1080p animation" : "Static wallpaper";
    var runtime = studio.querySelector("[data-wallpaper-runtime-state]");
    var toggle = studio.querySelector('[data-wallpaper-command="toggle"]');
    var mute = studio.querySelector('[data-wallpaper-command="mute"]');
    var playLabel = studio.querySelector("[data-wallpaper-play-label]");
    var muteLabel = studio.querySelector("[data-wallpaper-mute-label]");
    var remove = studio.querySelector("[data-wallpaper-remove]");
    if (runtime) {
      if (optimized && isActive) runtime.textContent = performanceMode() === "ultimate" ? "Hidden by Ultimate Performance" : "Still frame in Performance mode";
      else if (isActive && state.playback === "loading") runtime.textContent = "Loading " + kind.toLowerCase();
      else if (isActive && state.playback === "error") runtime.textContent = kind + " could not play";
      else runtime.textContent = kind + (canPause ? (isPaused ? " paused" : " playing") : " ready");
    }
    if (toggle) {
      toggle.disabled = !canPause;
      toggle.setAttribute("aria-label", isPaused ? "Resume wallpaper" : "Pause wallpaper");
      toggle.setAttribute("aria-pressed", isPaused ? "true" : "false");
      var playIcon = toggle.querySelector("use");
      if (playIcon) playIcon.setAttribute("href", isPaused ? "#i-play" : "#i-pause");
    }
    if (mute) mute.disabled = !isActive || !isVideo;
    if (playLabel) playLabel.textContent = optimized ? "Performance still" : isPaused ? "Resume" : "Pause";
    if (muteLabel) muteLabel.textContent = settings.wallpaperMuted ? "Muted" : "Sound on";
    studio.querySelectorAll('[data-setting="wallpaperVolume"], [data-setting="wallpaperSpeed"], [data-setting="wallpaperLoop"]').forEach(function (control) {
      control.disabled = !isActive || !isVideo;
    });
    if (remove) remove.hidden = !record || isBundled || (studio.dataset.wallpaperSource || "installed") !== "installed";
  }

  function storeCustomWallpaper(file) {
    return openWallpaperDatabase().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction = db.transaction(WALLPAPER_STORE, "readwrite");
        transaction.objectStore(WALLPAPER_STORE).put(file, "custom");
        transaction.oncomplete = function () { db.close(); resolve(); };
        transaction.onerror = function () { db.close(); reject(transaction.error); };
      });
    });
  }

  function deleteCustomWallpaper() {
    return openWallpaperDatabase().then(function (db) {
      return new Promise(function (resolve, reject) {
        var transaction = db.transaction(WALLPAPER_STORE, "readwrite");
        transaction.objectStore(WALLPAPER_STORE).delete("custom");
        transaction.oncomplete = function () { db.close(); resolve(); };
        transaction.onerror = function () { db.close(); reject(transaction.error); };
      });
    });
  }

  function applyCustomWallpaper(blob) {
    if (customWallpaperUrl) URL.revokeObjectURL(customWallpaperUrl);
    customWallpaperUrl = blob ? URL.createObjectURL(blob) : "";
    if (customWallpaperUrl) root.style.setProperty("--custom-wallpaper", 'url("' + customWallpaperUrl + '")');
    else root.style.removeProperty("--custom-wallpaper");
    applySettings({ persist: false });
  }

  function handleWallpaperUpload(input) {
    var files = Array.from(input.files || []);
    var file = files[0];
    if (!file) return;
    if (wallpaperEngine) {
      input.disabled = true;
      var note = input.closest("[data-wallpaper-create]") && input.closest("[data-wallpaper-create]").querySelector("[data-upload-note]");
      if (note) note.textContent = "Importing " + files.length + (files.length === 1 ? " wallpaper..." : " wallpapers...");
      var imported = [];
      files.reduce(function (chain, nextFile) {
        return chain.then(function () { return wallpaperEngine.importFile(nextFile); }).then(function (record) { imported.push(record); });
      }, Promise.resolve()).then(function () {
        var selected = imported[imported.length - 1];
        if (!selected) return;
        settings.wallpaper = selected.id;
        settings.wallpaperPaused = false;
        settings.wallpaperRecent = [selected.id].concat(settings.wallpaperRecent.filter(function (id) { return id !== selected.id; })).slice(0, 12);
        applySettings();
        return Promise.all(wallpaperStudios().map(function (studio) {
          studio.dataset.selectedWallpaper = selected.id;
          studio.dataset.wallpaperSource = "installed";
          studio.dataset.wallpaperView = "installed";
          var search = studio.querySelector("[data-wallpaper-search]");
          var typeFilter = studio.querySelector("[data-wallpaper-type-filter]");
          if (search) search.value = "";
          if (typeFilter) typeFilter.value = "";
          return wallpaperEngine.hydrateStudio(studio);
        })).then(function () {
          wallpaperStudios().forEach(function (studio) { wireWallpaperStudioCards(studio); refreshWallpaperStudio(studio); });
          showToast(imported.length === 1 ? "Wallpaper imported" : "Wallpapers imported", imported.length + (imported.length === 1 ? " item is" : " items are") + " stored only on this device.", "image");
        });
      }).catch(function (error) {
        showToast("Could not import wallpaper", error.message || "This device rejected the media file.", "info");
      }).then(function () {
        input.disabled = false;
        input.value = "";
        if (note) note.textContent = "Images, GIFs, MP4, or WebM up to 160 MB each";
      });
      return;
    }
    if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 12 * 1024 * 1024) {
      input.value = "";
      showToast("Image not accepted", "Choose a PNG, JPG, or WebP under 12 MB.", "info");
      return;
    }
    storeCustomWallpaper(file).then(function () {
      applyCustomWallpaper(file);
      settings.wallpaper = "custom";
      settings.wallpaperRecent = ["custom"].concat(settings.wallpaperRecent.filter(function (id) { return id !== "custom"; })).slice(0, 6);
      applySettings();
      wallpaperStudios().forEach(function (studio) {
        studio.dataset.selectedWallpaper = "custom";
        studio.dataset.wallpaperView = "installed";
        refreshWallpaperStudio(studio);
      });
      showToast("Wallpaper applied", "Stored only on this device.", "image");
      input.value = "";
    }).catch(function () {
      input.value = "";
      showToast("Could not store wallpaper", "Local asset storage may be blocked.", "info");
    });
  }

  function resetCustomWallpaper() {
    deleteCustomWallpaper().catch(function () {}).then(function () {
      applyCustomWallpaper(null);
      settings.wallpaper = "we-steam-1403160205";
      settings.wallpaperFavorites = settings.wallpaperFavorites.filter(function (id) { return id !== "custom"; });
      settings.wallpaperRecent = settings.wallpaperRecent.filter(function (id) { return id !== "custom"; });
      applySettings();
      wallpaperStudios().forEach(function (studio) {
        studio.dataset.selectedWallpaper = "we-steam-1403160205";
        refreshWallpaperStudio(studio);
      });
      showToast("Custom wallpaper removed", "Rainy Day is active again.", "image");
    });
  }

  function setupWeatherCanvas() {
    var canvas = document.getElementById("weather-canvas");
    if (!canvas) return;
    if (performanceMode() !== "normal") {
      if (weatherResizeObserver) weatherResizeObserver.disconnect();
      weatherResizeObserver = null;
      return;
    }
    if (weatherResizeObserver) return;
    if (window.ResizeObserver) {
      weatherResizeObserver = new ResizeObserver(function () { sizeWeatherCanvas(canvas); });
      weatherResizeObserver.observe(canvas);
    } else {
      window.addEventListener("resize", function () { sizeWeatherCanvas(canvas); }, { passive: true });
    }
    sizeWeatherCanvas(canvas);
  }

  function sizeWeatherCanvas(canvas) {
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var width = Math.max(1, canvas.clientWidth);
    var height = Math.max(1, canvas.clientHeight);
    var nextWidth = Math.round(width * dpr);
    var nextHeight = Math.round(height * dpr);
    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
      canvas.width = nextWidth;
      canvas.height = nextHeight;
      canvas.dataset.dpr = String(dpr);
    }
  }

  function updateWeatherEngine() {
    cancelAnimationFrame(weatherFrame);
    weatherFrame = 0;
    var canvas = document.getElementById("weather-canvas");
    if (!canvas || document.hidden || root.dataset.weather === "false" || root.dataset.performance === "low" || root.dataset.autoPerformanceActive === "true") return;
    if (root.dataset.wallpaper !== "moonfall") {
      var clear = canvas.getContext("2d");
      clear.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    startRain(canvas);
  }

  function startRain(canvas) {
    var context = canvas.getContext("2d", { alpha: true });
    var drops = [];
    var last = 0;
    var dpr = Number(canvas.dataset.dpr || 1);
    var count = Math.min(72, Math.max(28, Math.round(canvas.clientWidth / 24)));
    for (var i = 0; i < count; i++) {
      drops.push({
        x: Math.random() * canvas.clientWidth,
        y: Math.random() * canvas.clientHeight,
        length: 7 + Math.random() * 13,
        speed: 70 + Math.random() * 100,
        alpha: 0.08 + Math.random() * 0.13
      });
    }
    function frame(time) {
      if (document.hidden || root.dataset.weather === "false" || root.dataset.performance === "low" || root.dataset.wallpaper !== "moonfall") {
        context.clearRect(0, 0, canvas.width, canvas.height);
        weatherFrame = 0;
        return;
      }
      if (time - last < 34) {
        weatherFrame = requestAnimationFrame(frame);
        return;
      }
      var delta = Math.min(0.06, (time - last || 34) / 1000);
      last = time;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.save();
      context.scale(dpr, dpr);
      context.lineWidth = 0.7;
      drops.forEach(function (drop) {
        drop.y += drop.speed * delta;
        drop.x -= drop.speed * delta * 0.12;
        if (drop.y > canvas.clientHeight + 20 || drop.x < -20) {
          drop.y = -20;
          drop.x = Math.random() * (canvas.clientWidth + 80);
        }
        context.strokeStyle = "rgba(225,238,244," + drop.alpha + ")";
        context.beginPath();
        context.moveTo(drop.x, drop.y);
        context.lineTo(drop.x - 2, drop.y + drop.length);
        context.stroke();
      });
      context.restore();
      weatherFrame = requestAnimationFrame(frame);
    }
    weatherFrame = requestAnimationFrame(frame);
  }

  function playBootVideo(video, restart) {
    if (!video) return;
    if (video._neoPauseTimer) {
      window.clearTimeout(video._neoPauseTimer);
      video._neoPauseTimer = 0;
    }
    if (restart) {
      try { video.currentTime = 0; } catch (error) {}
    }
    var playback;
    try { playback = video.play(); } catch (error) { return; }
    if (playback && typeof playback.catch === "function") playback.catch(function () {});
  }

  function pauseBootVideo(video) {
    if (!video) return;
    if (video._neoPauseTimer) window.clearTimeout(video._neoPauseTimer);
    video._neoPauseTimer = window.setTimeout(function () {
      video._neoPauseTimer = 0;
      try { video.pause(); } catch (error) {}
    }, 240);
  }

  function waitForBootVideo() {
    // The animation is feedback, not a dependency of the desktop. Shell scripts
    // are deferred behind styles and initialization has finished at this point.
    // Yield a paint without holding an otherwise ready desktop for 1.4 seconds
    // (or waiting for a decorative video that may be offline).
    return new Promise(function (resolve) { requestAnimationFrame(resolve); });
  }

  function performBoot() {
    var video = document.querySelector("[data-universal-loading-video]");
    playBootVideo(video, true);
    waitForBootVideo().then(function () {
      requestAnimationFrame(function () {
        root.dataset.boot = "complete";
        try { sessionStorage.setItem(BOOT_SESSION_KEY, "1"); } catch (error) {}
        pauseBootVideo(video);
      });
    });
  }

  function initStartScreen(onComplete) {
    var screen = document.getElementById("neo-start-screen");
    var desktop = document.getElementById("neo-desktop");
    var universalLoader = document.getElementById("boot-screen");
    var universalLoaderVideo = universalLoader && universalLoader.querySelector("[data-universal-loading-video]");
    var startInProgress = false;
    if (!screen) {
      onComplete();
      return;
    }

    if (desktop) {
      desktop.inert = true;
      desktop.setAttribute("aria-hidden", "true");
    }

    function showUniversalLoader() {
      root.dataset.universalLoading = "true";
      if (universalLoader) universalLoader.setAttribute("aria-label", "Loading NEO OS");
      playBootVideo(universalLoaderVideo, true);
    }

    function hideUniversalLoader() {
      delete root.dataset.universalLoading;
      pauseBootVideo(universalLoaderVideo);
    }

    function waitForUniversalLoader() {
      return waitForBootVideo();
    }

    function finish(mode) {
      if (startInProgress) return;
      startInProgress = true;
      root.dataset.startMode = mode;
      try { localStorage.setItem("neo_start_mode_v1", mode); } catch (error) {}
      screen.setAttribute("aria-busy", "true");
      screen.querySelectorAll("button").forEach(function (button) { button.disabled = true; });
      showUniversalLoader();
      screen.hidden = true;
      screen.setAttribute("aria-hidden", "true");
      if (desktop) {
        desktop.inert = false;
        desktop.removeAttribute("aria-hidden");
      }
      onComplete();
      waitForUniversalLoader().then(function () {
        hideUniversalLoader();
      });
    }

    screen.querySelectorAll("[data-start-mode]").forEach(function (button) {
      button.addEventListener("click", function () {
        finish(button.getAttribute("data-start-mode") === "mobile" ? "mobile" : "laptop");
      });
    });

    var fullscreen = screen.querySelector("[data-start-fullscreen]");
    if (fullscreen) fullscreen.addEventListener("click", function () {
      var target = document.documentElement;
      var request = target.requestFullscreen || target.webkitRequestFullscreen;
      if (request) Promise.resolve(request.call(target)).catch(function () {});
    });

    var blank = screen.querySelector("[data-start-blank]");
    if (blank) blank.addEventListener("click", function () {
      var popup = window.open("about:blank", "_blank");
      if (!popup) {
        showToast("Pop-up blocked", "Allow pop-ups to launch NEO OS in a blank tab.", "info");
        return;
      }
      try {
        popup.document.open();
        popup.document.write('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Home - Classroom</title><style>html,body{width:100%;height:100%;margin:0;overflow:hidden;background:#050505;color:#fff;font:16px Arial,sans-serif}body{display:grid;place-items:center}iframe{position:fixed;inset:0;width:100%;height:100%;border:0;background:#050505}</style></head><body><p id="neo-blank-status">Loading NEO OS…</p></body></html>');
        popup.document.close();
        var frame = popup.document.createElement("iframe");
        frame.title = "NEO OS";
        frame.allow = "autoplay; picture-in-picture; fullscreen; clipboard-read; clipboard-write; gamepad";
        frame.allowFullscreen = true;
        frame.style.cssText = "position:fixed;inset:0;width:100%;height:100%;border:0;background:#050505";
        popup.addEventListener("message", function (messageEvent) {
          if (messageEvent.source !== frame.contentWindow) return;
          var message = messageEvent.data;
          if (!message || message.type !== "neo-shell:tab-appearance" || !message.detail) return;
          var appearance = message.detail;
          if (typeof appearance.title !== "string" || typeof appearance.icon !== "string" || typeof appearance.type !== "string") return;
          applyTabAppearanceToDocument(popup.document, {
            id: String(appearance.id || "neo"),
            title: appearance.title.slice(0, 80),
            icon: appearance.icon,
            type: appearance.type
          });
        });
        var initialAppearance = applyTabAppearance();
        applyTabAppearanceToDocument(popup.document, initialAppearance);
        popup.focus();

        var sourceRoot = new URL("./", document.baseURI).href;
        var sourceUrl = new URL("index.html", sourceRoot).href;
        var preferredMode = window.matchMedia("(max-width: 700px)").matches ? "mobile" : "laptop";
        try {
          var storedMode = localStorage.getItem("neo_start_mode_v1");
          if (storedMode === "mobile" || storedMode === "laptop") preferredMode = storedMode;
        } catch (error) {}
        fetch(sourceUrl, { cache: "no-store", credentials: "omit" })
          .then(function (response) {
            if (!response.ok) throw new Error("NEO source response " + response.status);
            return response.text();
          })
          .then(function (source) {
            if (popup.closed) return;
            var html = String(source || "").replace(/<meta\b[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, "");
            var safeRoot = sourceRoot.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
            var injection = '<base href="' + safeRoot + '">';
            if (document.querySelector('meta[name="neo-runner"]')) {
              injection += '<meta name="neo-runner" content="github-jsdelivr">';
            }
            html = /<head(?:\s[^>]*)?>/i.test(html)
              ? html.replace(/<head(?:\s[^>]*)?>/i, function (head) { return head + injection; })
              : injection + html;
            html = html.replace(/<body([^>]*)>/i, '<body$1 data-neo-autostart="' + preferredMode + '">');
            frame.srcdoc = html;
            popup.document.body.replaceChildren(frame);
          })
          .catch(function () {
            if (popup.closed) return;
            frame.src = sourceUrl;
            popup.document.body.replaceChildren(frame);
          });
      } catch (error) {
        popup.location.href = new URL("index.html", document.baseURI).href;
      }
    });

    var autoStartMode = document.body && document.body.getAttribute("data-neo-autostart");
    if (autoStartMode) {
      finish(autoStartMode === "mobile" ? "mobile" : "laptop");
      return;
    }

    requestAnimationFrame(function () {
      var preferred = screen.querySelector('[data-start-mode="' + (window.matchMedia("(max-width: 700px)").matches ? "mobile" : "laptop") + '"]');
      if (preferred) preferred.focus({ preventScroll: true });
    });
  }

  function initAccountGate() {
    var gate = document.getElementById("neo-login-gate");
    var mount = gate && gate.querySelector("[data-neo-login-auth]");
    var guest = gate && gate.querySelector("[data-neo-login-guest]");
    var clock = gate && gate.querySelector("[data-neo-login-clock]");
    var date = gate && gate.querySelector("[data-neo-login-date]");
    var desktop = document.getElementById("neo-desktop");
    if (!gate || !mount || !guest) return;

    var resumeController = null;
    var gateVersion = 0;

    function updateGateTime() {
      var now = new Date();
      if (clock) clock.textContent = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" }).format(now);
      if (date) date.textContent = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(now);
    }

    function dismissGate() {
      gateVersion += 1;
      if (resumeController) resumeController.abort();
      resumeController = null;
      if (typeof gate._neoAuthCleanup === "function") gate._neoAuthCleanup();
      gate._neoAuthCleanup = null;
      gate.hidden = true;
      gate.setAttribute("aria-hidden", "true");
      window.clearInterval(gate._neoClockTimer);
      document.removeEventListener("keydown", trapGateFocus);
      if (desktop) {
        desktop.inert = false;
        desktop.removeAttribute("aria-hidden");
        desktop.focus({ preventScroll: true });
      }
    }

    function trapGateFocus(event) {
      if (event.key !== "Tab" || gate.hidden) return;
      var focusable = Array.from(gate.querySelectorAll('button:not([hidden]):not([disabled]), input:not([hidden]):not([disabled]), [tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (!gate.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function showGateShell() {
      gate.hidden = false;
      gate.removeAttribute("aria-hidden");
      if (desktop) {
        desktop.inert = true;
        desktop.setAttribute("aria-hidden", "true");
      }
      updateGateTime();
      window.clearInterval(gate._neoClockTimer);
      gate._neoClockTimer = window.setInterval(updateGateTime, 1000);
      document.removeEventListener("keydown", trapGateFocus);
      document.addEventListener("keydown", trapGateFocus);
      requestAnimationFrame(function () { if (!gate.hidden) gate.focus({ preventScroll: true }); });
    }

    function mountPicker(message) {
      var version = ++gateVersion;
      if (resumeController) resumeController.abort();
      resumeController = null;
      if (typeof gate._neoAuthCleanup === "function") gate._neoAuthCleanup();
      gate._neoAuthCleanup = null;
      showGateShell();
      mount.innerHTML = '<div class="neo-login-load-error" role="status"><strong>Loading profiles</strong><p>Preparing your NEO account choices...</p></div>';
      Promise.resolve(window.NEO_ACCOUNT_SIGNIN).then(function (runtime) {
        if (!runtime || typeof runtime.mountAccountSignIn !== "function") throw new Error("missing_account_runtime");
        if (gate.hidden || version !== gateVersion) return;
        gate._neoAuthCleanup = runtime.mountAccountSignIn(mount, function () {}, function (payload) {
          try { sessionStorage.removeItem(GUEST_SESSION_KEY); } catch (error) {}
          window.dispatchEvent(new CustomEvent("neo-auth-changed", { detail: { user: payload.user } }));
          dismissGate();
          showToast("Profile ready", "Welcome, " + payload.user.username + ".", "check");
        }, {
          title: "Sign in to NEO",
          copy: "Continue with a saved account or sign in with your username and password.",
          success: "Account ready. Opening your workspace..."
        });
        if (message) {
          var feedback = mount.querySelector("[data-neo-sign-in-feedback]");
          if (feedback) {
            feedback.textContent = message;
            feedback.classList.add("is-error");
          }
        }
      }).catch(function () {
        if (version !== gateVersion) return;
        mount.innerHTML = '<div class="neo-login-load-error" role="alert"><strong>Account setup unavailable</strong><p>Continue as guest, then try again from NEO Chat.</p></div>';
        guest.focus({ preventScroll: true });
      });
    }

    function resumeProfile(entry, startup) {
      var token = String(entry && entry.token || "");
      if (!token || !window.NEO_CHAT_TRANSPORT) {
        mountPicker("Choose a profile to continue.");
        return;
      }
      var version = ++gateVersion;
      showGateShell();
      if (typeof gate._neoAuthCleanup === "function") gate._neoAuthCleanup();
      gate._neoAuthCleanup = null;
      mount.innerHTML = '<div class="neo-login-load-error" role="status"><strong>Opening your profile</strong><p>Connecting securely to NEO Chat...</p></div>';
      resumeController = new AbortController();
      var activeController = resumeController;
      var resumeTimer = window.setTimeout(function () { activeController.abort(); }, 12000);
      window.NEO_CHAT_TRANSPORT.resume(token, activeController.signal).then(function (payload) {
        if (gate.hidden || version !== gateVersion) return;
        var resumed = payload && payload.user;
        if (!resumed || !resumed.id || !resumed.username) throw new Error("Profile response incomplete.");
        var session = Object.assign({}, resumed, { transport: payload.transport || window.NEO_CHAT_TRANSPORT.mode() });
        if (window.NEO_ACCOUNT_STORE) window.NEO_ACCOUNT_STORE.save(token, session, session.transport);
        else {
          localStorage.setItem("ugp_token", token);
          localStorage.setItem("ugp_session", JSON.stringify(session));
        }
        try { sessionStorage.removeItem(GUEST_SESSION_KEY); } catch (error) {}
        window.dispatchEvent(new CustomEvent("neo-auth-changed", { detail: { user: session } }));
        dismissGate();
        if (!startup) showToast("Profile ready", "Welcome, " + session.username + ".", "check");
      }).catch(function (error) {
        if (version !== gateVersion) return;
        var expired = error && (error.status === 401 || error.status === 403);
        if (expired) {
          if (window.NEO_ACCOUNT_STORE) window.NEO_ACCOUNT_STORE.forget(token);
          else {
            try { localStorage.removeItem("ugp_token"); localStorage.removeItem("ugp_session"); } catch (storageError) {}
          }
        }
        var message = expired
          ? "That saved profile expired. Create another profile to continue."
          : "The relay is taking longer than usual. Your saved profile was kept—try it again.";
        mountPicker(message);
      }).finally(function () {
        window.clearTimeout(resumeTimer);
        if (resumeController === activeController) resumeController = null;
      });
    }

    guest.addEventListener("click", function () {
      try { sessionStorage.setItem(GUEST_SESSION_KEY, "1"); } catch (error) {}
      dismissGate();
      showToast("Guest mode", "Create a profile later from NEO Chat.", "check");
    });

    window.addEventListener("neo-account-picker", function () {
      if (window.NEO_ACCOUNT_STORE) window.NEO_ACCOUNT_STORE.clearActive();
      else {
        try { localStorage.removeItem("ugp_token"); localStorage.removeItem("ugp_session"); } catch (error) {}
      }
      try { sessionStorage.removeItem(GUEST_SESSION_KEY); } catch (error) {}
      mountPicker();
    });

    window.addEventListener("storage", function (event) {
      if (["ugp_token", "ugp_session", "neo_chat_saved_accounts_v1"].indexOf(String(event.key || "")) === -1) return;
      var session = nativeChatSession();
      window.dispatchEvent(new CustomEvent("neo-auth-changed", { detail: { user: session.id ? session : null } }));
      if (!session.id) mountPicker("Your active profile changed in another tab.");
    });

    var active = window.NEO_ACCOUNT_STORE ? window.NEO_ACCOUNT_STORE.active() : null;
    var legacyToken = "";
    if (!active) {
      try { legacyToken = localStorage.getItem("ugp_token") || ""; } catch (error) {}
      if (legacyToken) active = { token: legacyToken, user: null };
    }
    var guestActive = false;
    try { guestActive = !active && sessionStorage.getItem(GUEST_SESSION_KEY) === "1"; } catch (error) {}
    if (guestActive) return;
    if (active && active.token) {
      resumeProfile(active, true);
      return;
    }
    mountPicker();
  }

  function restartShell() {
    try { sessionStorage.removeItem(BOOT_SESSION_KEY); } catch (error) {}
    window.location.reload();
  }

  function createFileItem(kind) {
    var win = openApp("files");
    if (!win) return Promise.resolve(false);
    return loadFilesRuntime().then(function (runtime) {
      return typeof runtime.openCreate === "function" ? runtime.openCreate(kind) : false;
    });
  }

  function handleWindowAction(button) {
    var win = button.closest(".neo-window");
    var action = button.getAttribute("data-window-action");
    if (action === "close") closeWindow(win);
    if (action === "minimize") minimizeWindow(win);
    if (action === "maximize") toggleMaximize(win);
    if (action === "pin") {
      var app = win && apps[win.dataset.appId];
      if (!app || app.launchMode !== "direct-game") return;
      try {
        var pinned = addCustomAppToTaskbarAndHomeScreen({
          title: app.title,
          url: app.sourceUrl,
          icon: app.icon,
          mode: "direct-game"
        });
        button.remove();
        showToast("Added to taskbar", pinned.title + " was also added to the home screen.", "apps");
      } catch (error) {
        showToast("Could not add game", error && error.message ? error.message : "Try again.", "apps");
      }
    }
  }

  function bindGlobalEvents() {
    window.addEventListener("message", handleProxyBridgeMessage);
    watchProxyFrames();
    document.addEventListener("click", function (event) {
      if (event.defaultPrevented || event.button > 0) return;
      var link = event.target && event.target.closest ? event.target.closest("a[href], area[href]") : null;
      if (!link || link.hasAttribute("download") || link.closest(".neo-browser-runtime")) return;
      var target = proxyableExternalTarget(link.href || link.getAttribute("href"));
      if (!target) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      openBrowserTarget(target, link.textContent || link.getAttribute("aria-label") || "Web page");
    }, true);
    window.addEventListener("neo-media-state", function (event) {
      var detail = event.detail || {};
      var source = "play:" + String(detail.source || "media");
      var isPlayingVideo = detail.active !== false && detail.playing === true && detail.kind === "video";
      if (isPlayingVideo) pauseMusicForVideoFocus();
      var shouldPrioritize = detail.active !== false
        && detail.playing === true
        && (detail.kind === "video" || detail.pauseWallpaper === true);
      if (shouldPrioritize) mediaPrioritySources.add(source);
      else mediaPrioritySources.delete(source);
      syncWallpaperMediaPriority();
      if (detail.appId === "stream" && detail.playing === true && mediaPrioritySources.size > 0 && pauseMusicForVideoFocus()) return;
      renderNowPlaying(detail);
    });
    window.addEventListener("neo-media-priority", function (event) {
      var detail = event.detail || {};
      var source = "intent:" + String(detail.source || "media");
      var shouldPrioritize = detail.active === true
        && (detail.kind === "video" || detail.pauseWallpaper === true);
      if (shouldPrioritize) mediaPrioritySources.add(source);
      else mediaPrioritySources.delete(source);
      syncWallpaperMediaPriority();
    });
    window.addEventListener("neo-media-levels", function (event) {
      renderNowPlayingLevels(event.detail || {});
    });
    window.addEventListener("neo-tab-fullscreen-change", function () {
      syncGameNowPlayingOverlay();
      syncTaskbarAppVisibility();
    });

    if (launcherDismissLayer) launcherDismissLayer.addEventListener("click", function (event) {
      event.preventDefault();
      setLauncherOpen(false);
    });

    if (launcher) launcher.addEventListener("click", function (event) {
      if (event.target.closest("[data-app], input, button, a, label, select, textarea, [role='button'], [role='option']")) return;
      setLauncherOpen(false);
    });

    if (launcher && launcherScroll) launcher.addEventListener("wheel", function (event) {
      if (event.ctrlKey || event.target.closest(".launcher-scroll-region")) return;
      var scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? launcherScroll.clientHeight : 1;
      var before = launcherScroll.scrollTop;
      launcherScroll.scrollTop += event.deltaY * scale;
      if (launcherScroll.scrollTop !== before) event.preventDefault();
    }, { passive: false });

    document.addEventListener("click", function (event) {
      if (launcherIsOpen() && !event.target.closest("#app-launcher, [data-open-launcher]")) setLauncherOpen(false);
      var connectionToggle = event.target.closest("[data-connection-toggle]");
      if (connectionToggle) {
        event.preventDefault();
        var openingConnectionPanel = connectionPanel ? connectionPanel.hidden : false;
        setConnectionPanelOpen(openingConnectionPanel, connectionToggle);
        if (openingConnectionPanel && window.NEO_CONNECTION_MONITOR) window.NEO_CONNECTION_MONITOR.refresh();
        return;
      }
      var connectionRefresh = event.target.closest("[data-connection-refresh]");
      if (connectionRefresh) {
        event.preventDefault();
        if (window.NEO_CONNECTION_MONITOR) window.NEO_CONNECTION_MONITOR.refresh();
        return;
      }
      if (connectionPanel && !connectionPanel.hidden && !event.target.closest("#connection-panel")) setConnectionPanelOpen(false);
      var wallpaperUploadTrigger = event.target.closest("[data-wallpaper-upload-trigger]");
      if (wallpaperUploadTrigger) {
        event.preventDefault();
        var wallpaperUpload = document.getElementById(wallpaperUploadTrigger.getAttribute("data-wallpaper-upload-trigger"));
        if (!wallpaperUpload || wallpaperUpload.disabled) return;
        wallpaperUpload.value = "";
        if (typeof wallpaperUpload.showPicker === "function") {
          try { wallpaperUpload.showPicker(); return; } catch (error) {}
        }
        wallpaperUpload.click();
        return;
      }
      var volumeTrigger = event.target.closest("[data-now-playing-volume-trigger]");
      if (volumeTrigger) {
        event.preventDefault();
        var opening = !nowPlayingWidget.classList.contains("is-volume-open");
        nowPlayingWidget.classList.toggle("is-volume-open", opening);
        volumeTrigger.setAttribute("aria-expanded", String(opening));
        return;
      }
      if (nowPlayingWidget && nowPlayingWidget.classList.contains("is-volume-open") && !event.target.closest(".now-playing-widget")) closeNowPlayingVolume();
      var taskbarVolume = event.target.closest("[data-taskbar-now-playing-volume]");
      if (taskbarVolume) {
        event.preventDefault();
        event.stopPropagation();
        if (!nowPlayingState || !nowPlayingState.volumeControl) return;
        var taskbarMuted = nowPlayingState.muted === true || nowPlayingState.volume <= 0.001;
        if (!taskbarMuted && nowPlayingState.volume > 0.001) taskbarVolumeBeforeMute = nowPlayingState.volume;
        setNowPlayingVolume(taskbarMuted ? Math.max(0.05, taskbarVolumeBeforeMute || 1) : 0);
        return;
      }
      var notificationToggle = event.target.closest("[data-notification-toggle]");
      if (notificationToggle) {
        event.preventDefault();
        loadFeatureRuntime().then(function (runtime) { runtime.toggleNotifications(notificationToggle); });
        return;
      }
      var nowPlaying = event.target.closest("[data-now-playing-action]");
      if (nowPlaying) {
        event.preventDefault();
        if (!nowPlayingWidget || nowPlayingWidget.querySelector(".now-playing-controls").hidden) return;
        if (nowPlayingState && nowPlayingState.transport && nowPlayingState.source) {
          window.dispatchEvent(new CustomEvent("neo-media-transport-request", {
            detail: { source: nowPlayingState.source, action: nowPlaying.dataset.nowPlayingAction }
          }));
        } else {
          loadFeatureRuntime().then(function (runtime) { runtime.transport(nowPlaying.dataset.nowPlayingAction); });
        }
        return;
      }
      var accountButton = event.target.closest("[data-topbar-account]");
      if (accountButton) {
        event.preventDefault();
        if (nativeChatSession().id) openApp("chat");
        else window.dispatchEvent(new CustomEvent("neo-account-picker"));
        return;
      }
      var chatSection = event.target.closest("[data-open-chat-section]");
      if (chatSection) {
        event.preventDefault();
        var chatWindow = openApp("chat");
        if (chatWindow) requestAnimationFrame(function () {
          chatWindow.dispatchEvent(new CustomEvent("neo-chat-open-section", { detail: { section: chatSection.dataset.openChatSection } }));
        });
        return;
      }
      if (event.target.closest("[data-shell-refresh]")) {
        restartShell();
        return;
      }
      if (event.target.closest("[data-restore-desktop-shortcuts]")) {
        restoreDesktopShortcuts();
        if (window.NEO_FEATURES && typeof window.NEO_FEATURES.closeOverlays === "function") window.NEO_FEATURES.closeOverlays();
        return;
      }
      if (event.target.closest("#xeno-command-dismiss")) {
        setXenoCommandOpen(false);
        return;
      }
      var appButton = event.target.closest("[data-app]");
      if (appButton) {
        event.preventDefault();
        if (appButton.classList.contains("dock-button") && Date.now() < runningTaskbarSuppressOpenUntil) return;
        openApp(appButton.getAttribute("data-app"));
        return;
      }
      var launcherButton = event.target.closest("[data-open-launcher]");
      if (launcherButton) {
        if (settings.taskbarStyle === "xeno") {
          var toggleXenoApps = xenoCommandIsOpen() && xenoCommand.dataset.mode === "apps";
          setXenoCommandOpen(!toggleXenoApps, "apps", launcherButton);
        } else {
          setLauncherOpen(!launcherIsOpen(), launcherButton);
        }
        return;
      }
      var launcherToggle = event.target.closest("[data-launcher-toggle-all]");
      if (launcherToggle) {
        launcherShowAll = !launcherShowAll;
        renderLauncher();
        return;
      }
      if (event.target.closest("[data-close-launcher]")) {
        setLauncherOpen(false);
        return;
      }
      var windowAction = event.target.closest("[data-window-action]");
      if (windowAction) {
        handleWindowAction(windowAction);
        return;
      }
      var performanceButton = event.target.closest("[data-performance-mode-button]");
      if (performanceButton) {
        var nextMode = normalizePerformanceMode(performanceButton.getAttribute("data-performance-mode-button"));
        if (nextMode !== performanceMode()) {
          setSetting("performanceMode", nextMode);
          clearNowPlayingLevels();
          showToast(
            nextMode === "ultimate" ? "Ultimate Performance enabled" : nextMode === "performance" ? "Performance mode enabled" : "Normal mode restored",
            nextMode === "ultimate"
              ? "NEO OS is using its bare-bones desktop with background visuals stopped."
              : nextMode === "performance"
                ? "Wallpaper movement, blur, previews, and background preloading are off."
                : "Your saved wallpaper and full visual settings are active again.",
            nextMode === "normal" ? "refresh" : "battery"
          );
        }
        return;
      }
      var interfaceStyleButton = event.target.closest("[data-interface-style-option]");
      if (interfaceStyleButton) {
        var nextInterfaceStyle = normalizeInterfaceStyle(interfaceStyleButton.getAttribute("data-interface-style-option"));
        if (nextInterfaceStyle !== settings.interfaceStyle) {
          setSetting("interfaceStyle", nextInterfaceStyle);
          var interfaceStyleToast = nextInterfaceStyle === "retro"
            ? ["Retro style enabled", "Windows, apps, widgets, menus, and the taskbar now use the classic desktop style."]
            : nextInterfaceStyle === "windows11"
              ? ["Windows 11 style enabled", "The centered taskbar, Start menu, windows, controls, and flyouts now use the Windows 11 look."]
              : nextInterfaceStyle === "kali"
                ? ["Kali Linux style enabled", "Windows, menus, the taskbar, terminal, and local apps now use the Kali workstation look."]
              : ["Modern style restored", "The current NEO OS interface is active again."];
          showToast(interfaceStyleToast[0], interfaceStyleToast[1], "settings");
        }
        return;
      }
      var taskbarPosition = event.target.closest("[data-taskbar-position-option]");
      if (taskbarPosition) {
        var position = normalizeTaskbarPosition(taskbarPosition.getAttribute("data-taskbar-position-option"));
        if (position !== settings.taskbarPosition) {
          setSetting("taskbarPosition", position);
          showToast("Taskbar moved", "The taskbar is now on the " + position + " edge.", "apps");
        }
        return;
      }
      var taskbarStyle = event.target.closest("[data-taskbar-style-option]");
      if (taskbarStyle) {
        var style = normalizeTaskbarStyle(taskbarStyle.getAttribute("data-taskbar-style-option"));
        if (style !== settings.taskbarStyle) {
          setSetting("taskbarStyle", style);
          showToast("Taskbar style changed", style === "current" ? "The floating dock layout is active." : style === "transparent" ? "The vertical clear-glass rail is active on the left." : style === "xeno" ? "Running apps now use XENO pills. Press Space to search or Ctrl for all apps." : style === "figure" ? "The compact Figure rail is active at the bottom center." : "The taskbar now fills the selected edge.", "settings");
        }
        return;
      }
      var taskbarSurface = event.target.closest("[data-taskbar-surface-option]");
      if (taskbarSurface) {
        var surface = normalizeTaskbarSurface(taskbarSurface.getAttribute("data-taskbar-surface-option"));
        if (surface !== settings.taskbarSurface) {
          setSetting("taskbarSurface", surface);
          showToast("Taskbar surface changed", surface === "glass" ? "Liquid glass is active." : surface === "solid" ? "The taskbar now uses one solid color." : "The taskbar now blends both selected colors.", "settings");
        }
        return;
      }
      var windowBarStyle = event.target.closest("[data-window-bar-style-option]");
      if (windowBarStyle) {
        var nextWindowBarStyle = normalizeWindowBarStyle(windowBarStyle.getAttribute("data-window-bar-style-option"));
        if (nextWindowBarStyle !== settings.windowBarStyle) {
          setSetting("windowBarStyle", nextWindowBarStyle);
          showToast(
            "Application bar changed",
            nextWindowBarStyle === "pill"
              ? "App controls now use the centered liquid-glass bar."
              : nextWindowBarStyle === "ultra"
                ? "Apps now use the ultra-thin 32px top bar."
                : "App controls now use the standard full-width bar.",
            "settings"
          );
        }
        return;
      }
      var taskbarTint = event.target.closest("[data-taskbar-tint-preset]");
      if (taskbarTint) {
        setSetting("taskbarTint", taskbarTint.getAttribute("data-taskbar-tint-preset"));
        return;
      }
      var wallpaper = event.target.closest("[data-wallpaper-option]");
      if (wallpaper && !wallpaper.closest("[data-wallpaper-studio]")) {
        setSetting("wallpaper", wallpaper.getAttribute("data-wallpaper-option"));
        showToast("Wallpaper changed", wallpaper.querySelector("strong").textContent + " is active.", "image");
        return;
      }
      if (event.target.closest("[data-wallpaper-reset]")) {
        resetCustomWallpaper();
        return;
      }
      if (event.target.closest("[data-reset-layout]")) {
        resetLayout();
        return;
      }
      var direct = event.target.closest("[data-frame-direct]");
      if (direct) {
        var route = direct.getAttribute("data-frame-direct");
        if (window.NEOFrameLoader) {
          window.NEOFrameLoader.open(route).catch(function () {
            showToast("Could not open app", "Please try again.", "apps");
          });
        } else {
          window.open(route, "_blank", "noopener,noreferrer");
        }
        return;
      }
    });

    document.addEventListener("input", function (event) {
      var input = event.target;
      if (input.matches && input.matches("[data-now-playing-volume]")) {
        setNowPlayingVolume(Number(input.value) / 100);
        return;
      }
      if (input === launcherSearch) {
        launcherSelectedIndex = 0;
        filterLauncher(input.value);
        return;
      }
      if (input === xenoCommandSearch) {
        xenoCommandSelectedIndex = 0;
        renderXenoCommand();
        return;
      }
      var settingName = input.getAttribute && input.getAttribute("data-setting");
      if (!settingName || input.type === "checkbox" || input.tagName === "SELECT") return;
      var value = input.type === "range" ? Number(input.value) : input.value;
      setSetting(settingName, value);
    });

    document.addEventListener("change", function (event) {
      var input = event.target;
      if (input.matches("[data-wallpaper-upload]")) {
        handleWallpaperUpload(input);
        return;
      }
      var settingName = input.getAttribute && input.getAttribute("data-setting");
      if (!settingName) return;
      var value = input.type === "checkbox" ? input.checked : input.value;
      setSetting(settingName, value);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Control") {
        if (!event.repeat && !event.altKey && !event.metaKey && !event.shiftKey) {
          ctrlTapCandidate = settings.taskbarStyle !== "xeno" || xenoDesktopShortcutAllowed(event.target);
        }
        return;
      }
      if (ctrlTapCandidate) ctrlTapCandidate = false;
      if (event.key === "Escape" && xenoCommandIsOpen()) {
        event.preventDefault();
        setXenoCommandOpen(false);
        return;
      }
      if (event.key === "Escape" && connectionPanel && !connectionPanel.hidden) {
        event.preventDefault();
        setConnectionPanelOpen(false);
        return;
      }
      if (event.key === "Escape" && nowPlayingWidget && nowPlayingWidget.classList.contains("is-volume-open")) {
        closeNowPlayingVolume();
        return;
      }
      if (event.key === "Escape" && launcherIsOpen()) {
        event.preventDefault();
        setLauncherOpen(false);
        return;
      }
      if (event.key === "Escape" && window.NEO_FEATURES && !event.target.closest("#desktop-context-menu")) window.NEO_FEATURES.closeOverlays();
      if (!event.defaultPrevented && (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) && !event.target.closest("input, textarea, select, iframe")) {
        event.preventDefault();
        var anchor = document.activeElement && document.activeElement.getBoundingClientRect ? document.activeElement.getBoundingClientRect() : null;
        var menuX = anchor && anchor.width ? anchor.left + Math.min(anchor.width, 24) : window.innerWidth / 2;
        var menuY = anchor && anchor.height ? anchor.top + Math.min(anchor.height, 24) : window.innerHeight / 2;
        loadFeatureRuntime().then(function (runtime) { runtime.openDesktopMenu(menuX, menuY); });
        return;
      }
      if (launcherIsOpen() && event.target === launcherSearch && event.key === "ArrowDown") {
        event.preventDefault();
        moveLauncherSelection(1);
        return;
      }
      if (launcherIsOpen() && event.target === launcherSearch && event.key === "ArrowUp") {
        event.preventDefault();
        moveLauncherSelection(-1);
        return;
      }
      if (launcherIsOpen() && event.target === launcherSearch && event.key === "Enter") {
        var selectedResult = launcherResultList.querySelector('.search-result[aria-selected="true"]');
        if (selectedResult) {
          event.preventDefault();
          openApp(selectedResult.dataset.app);
        }
        return;
      }
      if (xenoCommandIsOpen() && xenoCommand.contains(event.target)) {
        if (event.key === "ArrowDown" || (event.target !== xenoCommandSearch && event.key === "ArrowRight")) {
          event.preventDefault();
          moveXenoCommandSelection(1);
          return;
        }
        if (event.key === "ArrowUp" || (event.target !== xenoCommandSearch && event.key === "ArrowLeft")) {
          event.preventDefault();
          moveXenoCommandSelection(-1);
          return;
        }
        if (event.target !== xenoCommandSearch && (event.key === "Home" || event.key === "End")) {
          event.preventDefault();
          var items = xenoCommandResults ? xenoCommandResults.querySelectorAll("[data-xeno-command-item]") : [];
          xenoCommandSelectedIndex = event.key === "Home" ? 0 : Math.max(0, items.length - 1);
          syncXenoCommandSelection(true);
          return;
        }
        if (event.key === "Enter") {
          var xenoSelected = xenoCommandResults && xenoCommandResults.querySelector('[data-xeno-command-item][aria-selected="true"]');
          if (xenoSelected) {
            event.preventDefault();
            openApp(xenoSelected.dataset.app);
          }
          return;
        }
        if (event.key === "Tab") trapXenoCommandFocus(event);
      }
      if (!event.defaultPrevented && settings.taskbarStyle === "xeno" && event.code === "Space" && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey && !event.repeat && !event.isComposing && xenoDesktopShortcutAllowed(event.target)) {
        event.preventDefault();
        setXenoCommandOpen(true, "search", document.activeElement);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.code === "Space" && !event.target.closest("iframe, input, textarea, select")) {
        event.preventDefault();
        if (settings.taskbarStyle === "xeno") {
          setXenoCommandOpen(true, "apps", document.activeElement);
        } else {
          setLauncherOpen(!launcherIsOpen(), document.activeElement);
        }
      }
      if (launcherIsOpen() && event.key === "Tab") trapLauncherFocus(event);
    });

    document.addEventListener("keyup", function (event) {
      if (event.key !== "Control") return;
      if (ctrlTapCandidate) {
        event.preventDefault();
        if (settings.taskbarStyle === "xeno") {
          var toggleXenoApps = xenoCommandIsOpen() && xenoCommand.dataset.mode === "apps";
          setXenoCommandOpen(!toggleXenoApps, "apps", document.activeElement);
        } else {
          setLauncherOpen(!launcherIsOpen(), document.activeElement);
        }
      }
      ctrlTapCandidate = false;
    });

    document.addEventListener("pointerdown", function () { ctrlTapCandidate = false; }, { passive: true });
    document.addEventListener("pointerover", function (event) {
      var xenoItem = event.target.closest("[data-xeno-command-index]");
      if (xenoItem) {
        xenoCommandSelectedIndex = Number(xenoItem.dataset.xenoCommandIndex) || 0;
        syncXenoCommandSelection(false);
        return;
      }
      var result = event.target.closest("[data-launcher-result-index]");
      if (!result) return;
      launcherSelectedIndex = Number(result.dataset.launcherResultIndex) || 0;
      moveLauncherSelection(0);
    }, { passive: true });
    window.addEventListener("blur", function () { ctrlTapCandidate = false; });

    document.addEventListener("contextmenu", function (event) {
      if (!event.target.closest("#neo-desktop") || event.target.closest(".neo-window, .taskbar, .app-launcher, .xeno-command-center, button, input, textarea, select")) return;
      event.preventDefault();
      loadFeatureRuntime().then(function (runtime) { runtime.openDesktopMenu(event.clientX, event.clientY); });
    });

    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    if (window.NEO_CONNECTION_MONITOR) window.NEO_CONNECTION_MONITOR.subscribe(updateConnection);
    window.addEventListener("neo-taskbar-layout-change", containWindows);
    window.addEventListener("resize", function () {
      containWindows();
      fitDockToViewport(document.getElementById("neo-dock"));
      layoutDesktopShortcuts();
      if (gameNowPlayingOverlay && gameNowPlayingOverlay.isConnected) positionGameNowPlayingOverlay();
      if (isSmallScreen()) {
        openWindows.forEach(function (win) {
          win.classList.remove("is-maximized");
          syncMaximizeButton(win);
        });
      }
    }, { passive: true });
    document.addEventListener("visibilitychange", updateWeatherEngine);
    document.addEventListener("fullscreenchange", updateFullscreenState);
    document.addEventListener("webkitfullscreenchange", updateFullscreenState);
  }

  function updateFullscreenState() {
    root.dataset.fullscreen = document.fullscreenElement || document.webkitFullscreenElement ? "true" : "false";
  }

  function trapLauncherFocus(event) {
    var focusable = Array.from(launcher.querySelectorAll('button:not([hidden]):not([disabled]), input:not([hidden]):not([disabled]), [tabindex]:not([tabindex="-1"])'))
      .filter(function (node) { return node.offsetParent !== null; });
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function initCustomWallpaper() {
    if (localOnly) { applySettings(); return; }
    deleteCustomWallpaper().catch(function () {}).then(function () {
      settings.wallpaperFavorites = settings.wallpaperFavorites.filter(function (id) { return id !== "custom"; });
      settings.wallpaperRecent = settings.wallpaperRecent.filter(function (id) { return id !== "custom"; });
      if (settings.wallpaper === "custom") settings.wallpaper = "we-steam-1403160205";
      applySettings();
    });
  }

  function init() {
    shellApi = {
      openApp: openApp,
      openWallpaperSource: openWallpaperSource,
      notify: showToast,
      icon: iconMarkup,
      getApps: function () {
        return launcherApps().map(publicAppRecord);
      },
      getStoreApps: function () {
        return storeApps().map(publicAppRecord);
      },
      getCustomApps: function () { return launcherApps().filter(function (app) { return app.custom; }).map(publicAppRecord); },
      installCustomApp: installCustomApp,
      removeCustomApp: removeCustomApp,
      setPinned: setAppPinned,
      setInstalled: setAppInstalled,
      isInstalled: function (id) { return Boolean(apps[id] && apps[id].installed); },
      getSetting: function (name) { return settings[name]; },
      setSetting: setSetting,
      getDesktopShortcutsHidden: function () { return desktopShortcutsManuallyHidden; },
      setDesktopShortcutsHidden: setDesktopShortcutsManuallyHidden,
      getTabAppearancePresets: function () {
        return tabAppearancePresets.map(function (preset) { return Object.assign({}, preset); });
      },
      setCustomTabAppearance: setCustomTabAppearance,
      setCustomCursor: setCustomCursor,
      clearCustomCursor: clearCustomCursor,
      resetLayout: resetLayout,
      refresh: restartShell,
      createFileItem: createFileItem,
      saveToFiles: function (name, blob, options) {
        return loadFilesRuntime().then(function (runtime) { return runtime.saveBlob(name, blob, options); });
      },
      isReducedMotion: effectiveReducedMotion
    };
    window.NEO_SHELL = shellApi;
    if (wallpaperEngine) {
      wallpaperEngine.init(document.querySelector(".wallpaper")).catch(function () {});
      wallpaperEngine.subscribe(function (state) {
        if (state && (state.reason === "fallback" || state.reason === "alias") && state.id && settings.wallpaper !== state.id) {
          settings.wallpaper = state.id;
          settings.wallpaperPaused = false;
          root.dataset.wallpaper = state.id;
          writeJson(SETTINGS_KEY, settings);
          syncSettingControls();
        }
        wallpaperStudios().forEach(refreshWallpaperStudio);
      });
    }
    renderDock();
    bindRunningTaskbarDrag();
    initializeDesktopShortcuts();
    if (window.NEO_TASKBAR_PREVIEW) window.NEO_TASKBAR_PREVIEW.start(document.getElementById("neo-dock"), openWindows, apps, openApp, closeWindow);
    renderLauncher();
    applySettings();
    updateClock();
    updateConnection();
    updateTopbarAccount();
    initBatteryStatus();
    updateFullscreenState();
    setupWeatherCanvas();
    wireWidgetDrag();
    bindGlobalEvents();
    window.addEventListener("neo-auth-changed", updateTopbarAccount);
    window.addEventListener("message", function (event) {
      if (event.origin !== location.origin || !event.data || event.data.type !== "neo-chat:account-sync") return;
      var chatFrame = Array.from(document.querySelectorAll("iframe")).find(function (frame) {
        if (frame.contentWindow !== event.source) return false;
        try { return /\/neo-chat\//i.test(new URL(frame.src, location.href).pathname); }
        catch (error) { return false; }
      });
      if (!chatFrame) return;
      window.dispatchEvent(new CustomEvent("neo-auth-changed", { detail: { user: event.data.user || null } }));
    });
    initCustomWallpaper();
    initStartScreen(initAccountGate);
    performBoot();
    scheduleBrowsePrewarm();
  }

  init();
})();
