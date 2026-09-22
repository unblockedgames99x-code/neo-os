(function () {
  "use strict";

  var APP_DETAILS = {
    browser: { description: "Search the web through the configured NEO service.", accent: "blue" },
    files: { description: "Keep downloads, documents, pictures, music, and video together in Drive.", accent: "blue" },
    zones: { description: "Open the zone library and launch saved zones.", accent: "violet" },
    chat: { description: "Messages, global chat, and direct conversations in one window.", accent: "green" },
    music: { description: "Import and play your local MP3 library with playlists and persistent controls.", accent: "red" },
    stream: { description: "Browse music, artists, playlists, favorites, and your listening queue.", accent: "green" },
    media: { description: "Play audio and video files stored on this device.", accent: "green" },
    wallpaper: { description: "Browse, organize, and apply web-safe wallpapers.", accent: "violet" },
    control: { description: "Adjust appearance, motion, sound, and desktop behavior.", accent: "gray" },
    calendar: { description: "A clean calendar for checking dates without leaving the desktop.", accent: "blue" },
    report: { description: "Send product feedback and report problems from NEO OS.", accent: "gray" },
    apps: { description: "See installed applications and manage taskbar pins.", accent: "green" },
    store: { description: "Install and manage web-native NEO applications.", accent: "blue" },
    notes: { description: "Write local notes with automatic saving and export to Drive.", accent: "yellow" },
    calculator: { description: "Run quick calculations locally with mouse or keyboard input.", accent: "gray" },
    paint: { description: "Draw on a responsive canvas and save artwork to Drive.", accent: "violet" },
    clock: { description: "Check local time and use a precise stopwatch.", accent: "blue" },
    photos: { description: "Open and inspect pictures from this device in a focused gallery.", accent: "green" }
  };

  function mount(id, host, api) {
    if (id !== "store" || !host || !api) return;

    var state = { tab: "discover", query: "", pending: "", confirmRemove: "" };
    var root = document.createElement("section");
    root.className = "neo-store";
    root.innerHTML = [
      '<header class="store-header">',
      '  <div class="store-heading"><span class="store-mark" aria-hidden="true">' + api.icon("store") + '</span><div><span>NEO OS</span><h1>App Store</h1></div></div>',
      '  <label class="store-search"><span class="sr-only">Search apps</span>' + api.icon("search") + '<input type="search" placeholder="Search" autocomplete="off" /></label>',
      '</header>',
      '<nav class="store-tabs" aria-label="Store sections">',
      '  <button type="button" data-store-tab="discover" aria-pressed="true">Today</button>',
      '  <button type="button" data-store-tab="apps" aria-pressed="false">Apps</button>',
      '  <button type="button" data-store-tab="installed" aria-pressed="false">Installed</button>',
      '  <button type="button" data-store-tab="wallpapers" aria-pressed="false">Wallpapers</button>',
      '</nav>',
      '<div class="store-scroll" data-store-scroll>',
      '  <section class="store-section" aria-label="App catalog">',
      '    <header data-store-section-header hidden><div><span class="store-kicker" data-store-kicker></span><h2 data-store-title></h2></div><span class="store-result-count" data-store-count aria-live="polite"></span></header>',
      '    <div class="store-grid" data-store-grid></div>',
      '    <div class="store-empty" data-store-empty hidden><strong>No matches</strong><p>Try another search or clear the current filter.</p><button type="button" data-store-clear>Clear search</button></div>',
      '  </section>',
      '</div>',
      '<p class="store-status sr-only" data-store-status role="status" aria-live="polite"></p>'
    ].join("");
    host.appendChild(root);

    var search = root.querySelector(".store-search input");
    search.addEventListener("input", function () {
      state.query = search.value.trim().toLowerCase();
      render();
    });
    root.querySelectorAll("[data-store-tab]").forEach(function (button) {
      button.addEventListener("click", function () {
        state.tab = button.dataset.storeTab;
        state.confirmRemove = "";
        render();
        root.querySelector("[data-store-scroll]").scrollTo({ top: 0, behavior: api.isReducedMotion() ? "auto" : "smooth" });
      });
    });
    root.querySelector("[data-store-clear]").addEventListener("click", function () {
      search.value = "";
      state.query = "";
      search.focus();
      render();
    });
    root.addEventListener("click", function (event) {
      var wallpaper = event.target.closest("[data-store-open-wallpapers]");
      if (wallpaper) {
        api.openWallpaperSource(wallpaper.dataset.storeOpenWallpapers || "discover");
        return;
      }
      var action = event.target.closest("[data-store-action]");
      if (!action) return;
      runAction(action.dataset.storeAction, action.dataset.storeApp, action);
    });

    function announce(message) {
      root.querySelector("[data-store-status]").textContent = message;
    }

    function appDescription(app) {
      var detail = APP_DETAILS[app.id];
      return detail && detail.description ? detail.description : (app.subtitle || "Native NEO application.");
    }

    function appAccessibleName(app) {
      return String((app && (app.accessibleName || app.title)) || "Application");
    }

    function matches(app) {
      if (!state.query) return true;
      return [app.title, app.subtitle, app.category, appDescription(app)].join(" ").toLowerCase().indexOf(state.query) !== -1;
    }

    function cardFor(app) {
      var detail = APP_DETAILS[app.id] || {};
      var card = document.createElement("article");
      card.className = "store-card";
      card.dataset.storeAppCard = app.id;
      card.dataset.accent = detail.accent || "blue";

      var icon = document.createElement("span");
      icon.className = "store-app-icon app-icon-shape app-icon-" + app.icon;
      icon.setAttribute("aria-hidden", "true");
      icon.innerHTML = api.icon(app.icon);

      var copy = document.createElement("div");
      copy.className = "store-card-copy";
      var heading = document.createElement("div");
      var title = document.createElement("h3");
      title.textContent = app.hideName ? "" : app.title;
      var badge = document.createElement("span");
      badge.className = "store-badge";
      badge.textContent = app.core ? "System" : (app.installed ? "Installed" : "Available");
      if (!app.hideName) heading.appendChild(title);
      heading.appendChild(badge);
      var category = document.createElement("small");
      category.textContent = app.category || "Application";
      var description = document.createElement("p");
      description.textContent = appDescription(app);
      copy.append(heading, category, description);

      var controls = document.createElement("div");
      controls.className = "store-card-controls";
      if (app.installed) {
        var open = document.createElement("button");
        open.type = "button";
        open.className = "store-primary";
        open.dataset.storeAction = "open";
        open.dataset.storeApp = app.id;
        open.setAttribute("aria-label", "Open " + appAccessibleName(app));
        open.textContent = "OPEN";
        controls.appendChild(open);
        if (!app.core) {
          var remove = document.createElement("button");
          remove.type = "button";
          remove.className = "store-secondary";
          remove.dataset.storeAction = "remove";
          remove.dataset.storeApp = app.id;
          remove.setAttribute("aria-label", "Remove " + appAccessibleName(app));
          remove.textContent = state.confirmRemove === app.id ? "CONFIRM" : "REMOVE";
          controls.appendChild(remove);
        }
      } else {
        var install = document.createElement("button");
        install.type = "button";
        install.className = "store-primary";
        install.dataset.storeAction = "install";
        install.dataset.storeApp = app.id;
        install.disabled = state.pending === app.id;
        install.setAttribute("aria-label", "Get " + appAccessibleName(app));
        install.textContent = state.pending === app.id ? "ADDING" : "GET";
        controls.appendChild(install);
      }
      card.append(icon, copy, controls);
      return card;
    }

    function wallpaperCard(source, title, description) {
      var card = document.createElement("article");
      card.className = "store-card store-wallpaper-card";
      card.innerHTML = '<span class="store-app-icon app-icon-shape app-icon-wallpaper" aria-hidden="true">' + api.icon("wallpaper") + '</span><div class="store-card-copy"><div><h3></h3><span class="store-badge">Wallpaper Engine</span></div><small>Online package catalog</small><p></p></div><div class="store-card-controls"><button class="store-primary" type="button" data-store-open-wallpapers="' + source + '">OPEN</button></div>';
      card.querySelector("h3").textContent = title;
      card.querySelector("p").textContent = description;
      return card;
    }

    function runAction(action, id, button) {
      if (action === "open") {
        api.openApp(id);
        return;
      }
      if (action === "remove") {
        if (state.confirmRemove !== id) {
          state.confirmRemove = id;
          render();
          return;
        }
        var removed = api.setInstalled(id, false);
        state.confirmRemove = "";
        announce(removed === false ? "The app could not be removed." : "App removed. Its local data was kept.");
        api.notify("App removed", "You can install it again from the App Store.", "store");
        render();
        return;
      }
      if (action === "install") {
        state.pending = id;
        render();
        window.setTimeout(function () {
          var installed = api.setInstalled(id, true);
          state.pending = "";
          if (installed) {
            var app = api.getStoreApps().find(function (item) { return item.id === id; });
            announce((app ? appAccessibleName(app) : "App") + " installed.");
            api.notify("App installed", (app ? appAccessibleName(app) : "The app") + " is ready to open.", "store");
          }
          render();
        }, api.isReducedMotion() ? 0 : 180);
      }
    }

    function render() {
      var all = api.getStoreApps().filter(function (app) { return app.id !== "store"; });
      var grid = root.querySelector("[data-store-grid]");
      var title = root.querySelector("[data-store-title]");
      var kicker = root.querySelector("[data-store-kicker]");
      var sectionHeader = root.querySelector("[data-store-section-header]");
      var empty = root.querySelector("[data-store-empty]");
      var count = root.querySelector("[data-store-count]");
      var cards = [];

      if (state.tab === "installed") all = all.filter(function (app) { return app.installed; });
      all = all.filter(matches);
      all.sort(function (a, b) {
        if (a.core !== b.core) return a.core ? -1 : 1;
        if (a.installed !== b.installed) return a.installed ? -1 : 1;
        return a.title.localeCompare(b.title);
      });

      if (state.tab === "wallpapers") {
        title.textContent = "Wallpaper packages";
        kicker.textContent = "WALLPAPER ENGINE";
        if (!state.query || "discover wallpaper packages curated compatible".indexOf(state.query) !== -1) {
          cards.push(wallpaperCard("discover", "Discover", "Browse the curated wallpaper packages shipped with NEO OS."));
        }
        if (!state.query || "workshop wallpaper community web projects".indexOf(state.query) !== -1) {
          cards.push(wallpaperCard("workshop", "Workshop", "Install web-safe projects from the local workshop catalog."));
        }
      } else {
        title.textContent = state.tab === "installed" ? "Installed apps" : "All apps";
        kicker.textContent = state.tab === "installed" ? "YOUR LIBRARY" : "NEO STORE";
        cards = all.map(cardFor);
      }

      sectionHeader.hidden = state.tab === "discover";
      grid.replaceChildren.apply(grid, cards);
      count.textContent = cards.length + (cards.length === 1 ? " item" : " items");
      empty.hidden = cards.length > 0;
      root.querySelectorAll("[data-store-tab]").forEach(function (button) {
        var active = button.dataset.storeTab === state.tab;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
      });
    }

    render();
  }

  window.NEO_STORE = { mount: mount };
})();
