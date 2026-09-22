(function () {
  "use strict";

  var layer = null;
  var palette = null;
  var input = null;
  var results = null;
  var empty = null;
  var selectedIndex = 0;
  var visibleApps = [];
  var returnFocus = null;
  var closeTimer = 0;
  var preferredOrder = ["games", "movies", "stream", "browser", "files", "neo-ai", "notes", "calculator", "control"];
  var detailLabels = {
    games: "Library",
    movies: "Streaming",
    stream: "Player",
    browser: "Proxy + tabs",
    files: "File explorer",
    "neo-ai": "Assistant",
    notes: "Notes",
    calculator: "Math",
    control: "NEO OS"
  };

  function shell() { return window.NEO_SHELL || null; }

  function createLayer() {
    var node = document.createElement("div");
    node.className = "neo-command-layer";
    node.hidden = true;
    node.innerHTML =
      '<section class="neo-command-palette" role="dialog" aria-modal="true" aria-label="Command palette">' +
        '<label class="neo-command-search">' +
          '<svg class="icon" aria-hidden="true"><use href="#i-search"></use></svg>' +
          '<input type="search" autocomplete="off" spellcheck="false" placeholder="Search apps and commands…" aria-label="Search apps and commands" aria-controls="neo-command-results" aria-expanded="true" />' +
          '<span class="neo-command-shortcut" aria-hidden="true">Ctrl K</span>' +
        '</label>' +
        '<div class="neo-command-content">' +
          '<p class="neo-command-section-label">Apps</p>' +
          '<div class="neo-command-results" id="neo-command-results" role="listbox" aria-label="Installed applications"></div>' +
          '<p class="neo-command-empty" hidden>No app matches that search.</p>' +
        '</div>' +
        '<footer class="neo-command-footer" aria-hidden="true">' +
          '<span><kbd>↑↓</kbd> Navigate <kbd>Enter</kbd> Open</span>' +
          '<span><kbd>Esc</kbd> Close</span>' +
        '</footer>' +
      '</section>';
    document.body.appendChild(node);
    layer = node;
    palette = node.firstElementChild;
    input = node.querySelector("input");
    results = node.querySelector(".neo-command-results");
    empty = node.querySelector(".neo-command-empty");

    input.addEventListener("input", render);
    results.addEventListener("pointermove", function (event) {
      var button = event.target.closest(".neo-command-result[data-command-index]");
      if (!button) return;
      selectedIndex = Number(button.dataset.commandIndex) || 0;
      syncSelection(false);
    }, { passive: true });
    results.addEventListener("click", function (event) {
      var button = event.target.closest(".neo-command-result[data-app]");
      if (!button) return;
      event.preventDefault();
      launch(button.dataset.app);
    });
    node.addEventListener("pointerdown", function (event) {
      if (event.target === node) close();
    });
    return node;
  }

  function appText(app) {
    return [app.title, app.subtitle, app.category, detailLabels[app.id]].filter(Boolean).join(" ").toLowerCase();
  }

  function scoreApp(app, query) {
    if (!query) {
      var preferred = preferredOrder.indexOf(app.id);
      return preferred === -1 ? 1000 : preferred;
    }
    var title = String(app.title || "").toLowerCase();
    var haystack = appText(app);
    var tokens = query.split(/\s+/).filter(Boolean);
    if (!tokens.every(function (token) { return haystack.indexOf(token) !== -1; })) return Infinity;
    var score = 300;
    if (title === query) score = 0;
    else if (title.indexOf(query) === 0) score = 20;
    else if (title.indexOf(query) !== -1) score = 80;
    else if (haystack.indexOf(query) !== -1) score = 140;
    score += Math.min(title.length, 80) / 100;
    return score;
  }

  function installedApps() {
    var api = shell();
    if (!api || typeof api.getApps !== "function") return [];
    var query = String(input && input.value || "").trim().toLowerCase();
    return api.getApps().map(function (app) {
      return { app: app, score: scoreApp(app, query) };
    }).filter(function (entry) {
      return Number.isFinite(entry.score);
    }).sort(function (left, right) {
      if (left.score !== right.score) return left.score - right.score;
      return String(left.app.title || "").localeCompare(String(right.app.title || ""));
    }).map(function (entry) { return entry.app; }).slice(0, 14);
  }

  function runningIds() {
    var ids = Array.from(document.querySelectorAll('.neo-window[data-app-id]:not(.is-closing)')).map(function (win) {
      return String(win.dataset.appId || "");
    });
    document.querySelectorAll("#neo-dock .dock-button[data-app]:not(.is-leaving)").forEach(function (button) {
      var id = String(button.dataset.app || "");
      if (id && ids.indexOf(id) === -1) ids.push(id);
    });
    return new Set(ids);
  }

  function resultIcon(app) {
    var span = document.createElement("span");
    span.className = "neo-command-result-icon app-icon-shape";
    var api = shell();
    if (api && typeof api.icon === "function") span.innerHTML = api.icon(app.icon);
    return span;
  }

  function createResult(app, index, running) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "neo-command-result";
    button.id = "neo-command-option-" + index;
    button.dataset.app = app.id;
    button.dataset.commandIndex = String(index);
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", index === selectedIndex ? "true" : "false");
    button.setAttribute("aria-label", (running ? "Switch to " : "Open ") + app.title);

    var copy = document.createElement("span");
    copy.className = "neo-command-result-copy";
    var title = document.createElement("strong");
    title.textContent = (running ? "Switch to " : "Open ") + app.title;
    var subtitle = document.createElement("small");
    subtitle.textContent = detailLabels[app.id] || app.category || app.subtitle || "Application";
    copy.append(title, subtitle);

    var action = document.createElement("span");
    action.className = "neo-command-result-action";
    if (running) {
      var dot = document.createElement("span");
      dot.className = "neo-command-running-dot";
      dot.title = "Running";
      action.appendChild(dot);
    }
    var enter = document.createElement("span");
    enter.textContent = "↵";
    action.appendChild(enter);
    button.append(resultIcon(app), copy, action);
    return button;
  }

  function render() {
    if (!results) return;
    visibleApps = installedApps();
    selectedIndex = Math.max(0, Math.min(selectedIndex, visibleApps.length - 1));
    var running = runningIds();
    var fragment = document.createDocumentFragment();
    visibleApps.forEach(function (app, index) {
      fragment.appendChild(createResult(app, index, running.has(app.id)));
    });
    results.replaceChildren(fragment);
    empty.hidden = visibleApps.length !== 0;
    syncSelection(false);
  }

  function syncSelection(scroll) {
    var buttons = Array.from(results.querySelectorAll(".neo-command-result"));
    buttons.forEach(function (button, index) {
      button.setAttribute("aria-selected", index === selectedIndex ? "true" : "false");
    });
    var selected = buttons[selectedIndex];
    if (input) input.setAttribute("aria-activedescendant", selected ? selected.id : "");
    if (selected && scroll) selected.scrollIntoView({ block: "nearest" });
  }

  function moveSelection(delta) {
    if (!visibleApps.length) return;
    selectedIndex = (selectedIndex + delta + visibleApps.length) % visibleApps.length;
    syncSelection(true);
  }

  function launch(id) {
    var api = shell();
    close();
    if (api && typeof api.openApp === "function") api.openApp(id);
  }

  function open(trigger) {
    if (!layer) createLayer();
    window.clearTimeout(closeTimer);
    returnFocus = trigger && typeof trigger.focus === "function" ? trigger : document.activeElement;
    var launcherToggle = document.querySelector('[data-open-launcher][aria-expanded="true"]');
    if (launcherToggle) launcherToggle.click();
    if (window.NEO_FEATURES && typeof window.NEO_FEATURES.closeOverlays === "function") window.NEO_FEATURES.closeOverlays();
    layer.hidden = false;
    input.value = "";
    selectedIndex = 0;
    render();
    requestAnimationFrame(function () {
      layer.classList.add("is-open");
      input.focus({ preventScroll: true });
    });
  }

  function close() {
    if (!layer || layer.hidden) return;
    layer.classList.remove("is-open");
    window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(function () {
      layer.hidden = true;
      if (returnFocus && returnFocus.isConnected && typeof returnFocus.focus === "function") returnFocus.focus({ preventScroll: true });
      returnFocus = null;
    }, 180);
  }

  function isOpen() { return Boolean(layer && !layer.hidden && layer.classList.contains("is-open")); }

  function toggle(trigger) {
    if (isOpen()) close();
    else open(trigger);
  }

  function bindFrameShortcut(frame) {
    if (!frame) return;
    function bind() {
      try {
        var frameDocument = frame.contentDocument;
        if (!frameDocument || frameDocument.documentElement.dataset.neoCommandShortcutBound === "true") return;
        frameDocument.documentElement.dataset.neoCommandShortcutBound = "true";
        frameDocument.addEventListener("keydown", function (event) {
          if (!(event.ctrlKey || event.metaKey) || event.altKey || String(event.key).toLowerCase() !== "k") return;
          event.preventDefault();
          event.stopImmediatePropagation();
          toggle(frame);
        }, true);
      } catch (_error) {}
    }
    if (frame.dataset.neoCommandLoadBound !== "true") {
      frame.dataset.neoCommandLoadBound = "true";
      frame.addEventListener("load", bind);
    }
    bind();
  }

  function bindFrameShortcuts() {
    document.querySelectorAll("iframe").forEach(bindFrameShortcut);
    new MutationObserver(function (records) {
      records.forEach(function (record) {
        record.addedNodes.forEach(function (node) {
          if (!(node instanceof Element)) return;
          if (node.matches("iframe")) bindFrameShortcut(node);
          node.querySelectorAll("iframe").forEach(bindFrameShortcut);
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  document.addEventListener("keydown", function (event) {
    if ((event.ctrlKey || event.metaKey) && !event.altKey && String(event.key).toLowerCase() === "k") {
      event.preventDefault();
      toggle(document.activeElement);
      return;
    }
    if (!isOpen()) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      close();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      event.stopImmediatePropagation();
      moveSelection(1);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      event.stopImmediatePropagation();
      moveSelection(-1);
      return;
    }
    if (event.key === "Enter" && visibleApps[selectedIndex]) {
      event.preventDefault();
      event.stopImmediatePropagation();
      launch(visibleApps[selectedIndex].id);
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      input.focus({ preventScroll: true });
    }
  }, true);

  window.addEventListener("neo-taskbar-order-change", function () { if (isOpen()) render(); });
  window.addEventListener("neo-window-state-change", function () { if (isOpen()) render(); });
  bindFrameShortcuts();
  window.NEO_COMMANDS = { open: open, close: close, toggle: toggle, isOpen: isOpen };
})();
