(function () {
  "use strict";

  var shell = window.NEO_SHELL;
  var dock = document.getElementById("neo-dock");
  if (!shell || !dock) return;

  var activeButton = null;
  var menu = document.createElement("div");
  menu.className = "neo-taskbar-menu";
  menu.id = "neo-taskbar-menu";
  menu.hidden = true;
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", "App controls");
  menu.innerHTML = [
    '<div class="neo-taskbar-menu-app" aria-hidden="true">',
    '  <span class="neo-taskbar-menu-app-icon"></span>',
    '  <strong data-taskbar-menu-title>App</strong>',
    '</div>',
    '<div class="neo-taskbar-menu-separator" role="separator"></div>',
    '<button type="button" role="menuitem" data-taskbar-menu-action="pin">',
    '  <svg class="icon" aria-hidden="true"><use href="#i-pin"></use></svg>',
    '  <span data-taskbar-menu-pin-label>Unpin from taskbar</span>',
    '</button>',
    '<button type="button" role="menuitem" data-taskbar-menu-action="close">',
    '  <svg class="icon" aria-hidden="true"><use href="#i-close"></use></svg>',
    '  <span>Close all windows</span>',
    '</button>'
  ].join("");
  document.body.appendChild(menu);

  var titleNode = menu.querySelector("[data-taskbar-menu-title]");
  var iconHost = menu.querySelector(".neo-taskbar-menu-app-icon");
  var pinLabel = menu.querySelector("[data-taskbar-menu-pin-label]");
  var closeButton = menu.querySelector('[data-taskbar-menu-action="close"]');

  function appFor(id) {
    return shell.getApps().find(function (app) { return app.id === id; }) || null;
  }

  function appWindows(id) {
    return Array.from(document.querySelectorAll(".neo-window")).filter(function (win) {
      return win.dataset.appId === id;
    });
  }

  function menuItems() {
    return Array.from(menu.querySelectorAll('[role="menuitem"]')).filter(function (item) {
      return !item.disabled;
    });
  }

  function closeMenu(restoreFocus) {
    if (menu.hidden) return;
    var previous = activeButton;
    menu.classList.remove("is-open");
    if (previous) previous.setAttribute("aria-expanded", "false");
    activeButton = null;
    window.setTimeout(function () {
      if (!menu.classList.contains("is-open")) menu.hidden = true;
    }, 180);
    if (restoreFocus && previous && document.contains(previous)) previous.focus();
  }

  function placeMenu(button, clientX, clientY) {
    var rect = button.getBoundingClientRect();
    var taskbar = button.closest(".taskbar");
    var taskbarRect = taskbar ? taskbar.getBoundingClientRect() : rect;
    var position = document.documentElement.dataset.taskbarPosition || "left";
    var margin = 8;
    var gap = 10;
    var width = menu.offsetWidth;
    var height = menu.offsetHeight;
    var anchorX = clientX > 0 ? clientX : rect.left + rect.width / 2;
    var anchorY = clientY > 0 ? clientY : rect.top + rect.height / 2;
    var left = anchorX - 20;
    var top = anchorY - height / 2;

    if (position === "left") {
      left = taskbarRect.right + gap;
    } else if (position === "right") {
      left = taskbarRect.left - width - gap;
    } else if (position === "top") {
      left = anchorX - width / 2;
      top = taskbarRect.bottom + gap;
    } else {
      left = anchorX - width / 2;
      top = taskbarRect.top - height - gap;
    }

    left = Math.min(Math.max(margin, left), window.innerWidth - width - margin);
    top = Math.min(Math.max(margin, top), window.innerHeight - height - margin);
    menu.style.left = Math.round(left) + "px";
    menu.style.top = Math.round(top) + "px";
  }

  function openMenu(button, clientX, clientY, focusMenu) {
    var id = button.dataset.app;
    var app = appFor(id);
    if (!app) return;

    if (activeButton && activeButton !== button) activeButton.setAttribute("aria-expanded", "false");
    activeButton = button;
    button.setAttribute("aria-haspopup", "menu");
    button.setAttribute("aria-controls", menu.id);
    button.setAttribute("aria-expanded", "true");
    menu.dataset.taskbarApp = id;
    titleNode.textContent = app.title;
    pinLabel.textContent = app.pinned ? "Unpin from taskbar" : "Pin to taskbar";
    closeButton.disabled = appWindows(id).length === 0;
    closeButton.setAttribute("aria-disabled", String(closeButton.disabled));
    iconHost.replaceChildren();
    var sourceIcon = button.querySelector(".dock-app-art, .launcher-app-icon, .launcher-detail-icon, .launcher-category-icon");
    if (sourceIcon) iconHost.appendChild(sourceIcon.cloneNode(true));

    menu.hidden = false;
    menu.classList.remove("is-open");
    placeMenu(button, clientX, clientY);
    requestAnimationFrame(function () {
      menu.classList.add("is-open");
      if (focusMenu) {
        var items = menuItems();
        if (items.length) items[0].focus();
      }
    });
  }

  function handleAction(action) {
    var id = menu.dataset.taskbarApp;
    var app = appFor(id);
    if (!app) return;

    if (action === "pin") {
      var pinned = shell.setPinned(id, !app.pinned);
      shell.notify(pinned ? "Pinned to taskbar" : "Unpinned from taskbar", app.title, "apps");
      closeMenu(false);
      var startButton = document.querySelector("[data-open-launcher]");
      if (startButton) startButton.focus();
      return;
    }

    if (action === "close") {
      appWindows(id).forEach(function (win) {
        var close = win.querySelector('[data-window-action="close"]');
        if (close) close.click();
      });
      closeMenu(false);
    }
  }

  document.addEventListener("contextmenu", function (event) {
    var button = event.target.closest(".dock-button[data-app], #app-launcher [data-app]");
    if (!button) return;
    event.preventDefault();
    openMenu(button, event.clientX, event.clientY, false);
  }, true);

  dock.addEventListener("keydown", function (event) {
    var button = event.target.closest(".dock-button[data-app]");
    if (!button || (event.key !== "ContextMenu" && !(event.shiftKey && event.key === "F10"))) return;
    event.preventDefault();
    openMenu(button, 0, 0, true);
  });

  menu.addEventListener("click", function (event) {
    var action = event.target.closest("[data-taskbar-menu-action]");
    if (!action || action.disabled) return;
    event.preventDefault();
    event.stopPropagation();
    handleAction(action.dataset.taskbarMenuAction);
  });

  menu.addEventListener("contextmenu", function (event) { event.preventDefault(); });
  menu.addEventListener("keydown", function (event) {
    var items = menuItems();
    var index = items.indexOf(document.activeElement);
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu(true);
      return;
    }
    if (!items.length || !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Home") index = 0;
    else if (event.key === "End") index = items.length - 1;
    else if (event.key === "ArrowDown") index = (index + 1 + items.length) % items.length;
    else index = (index - 1 + items.length) % items.length;
    items[index].focus();
  });

  document.addEventListener("pointerdown", function (event) {
    if (!menu.hidden && !menu.contains(event.target)) closeMenu(false);
  }, true);
  window.addEventListener("resize", function () { closeMenu(false); }, { passive: true });
  window.addEventListener("neo-taskbar-layout-change", function () { closeMenu(false); });
  window.addEventListener("blur", function () { closeMenu(false); });
  document.addEventListener("scroll", function () { closeMenu(false); }, true);
})();
