const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "neo-os", "index.html"), "utf8");
const shell = fs.readFileSync(path.join(root, "neo-os", "neo-os.js"), "utf8");
const css = fs.readFileSync(path.join(root, "neo-os", "neo-dock-interactions.css"), "utf8");
const runningCss = fs.readFileSync(path.join(root, "neo-os", "neo-running-taskbar.css"), "utf8");
const mobile = fs.readFileSync(path.join(root, "neo-os", "neo-mobile.js"), "utf8");

assert.ok(html.includes('neo-dock-interactions.css?v=20260909-desktop-shortcuts-v2'));
assert.ok(!html.includes('id="desktop-shortcuts" class="desktop-shortcuts"'));
assert.ok(!html.includes('data-restore-desktop-shortcuts'));
assert.ok(!html.includes('data-desktop-action="toggle-icons"'));
assert.ok(!html.includes('data-desktop-icons-label'));

assert.ok(shell.includes('var DESKTOP_SHORTCUT_LAYOUT_KEY = "neo_os_desktop_shortcut_layout_v1"'));
assert.ok(shell.includes('var DESKTOP_VIEW_KEY = "neo_os_desktop_view_v1"'));
assert.ok(shell.includes('var DESKTOP_SHORTCUT_HIDDEN_KEY = "neo_os_desktop_shortcut_hidden_v1"'));
assert.ok(shell.includes('var DESKTOP_SHORTCUTS_ALL_HIDDEN_KEY = "neo_os_desktop_shortcuts_all_hidden_v1"'));
assert.ok(shell.includes('readJson(DESKTOP_SHORTCUTS_ALL_HIDDEN_KEY, true) === true'));
assert.ok(shell.includes('writeJson(DESKTOP_SHORTCUTS_ALL_HIDDEN_KEY, true)'));
assert.ok(shell.includes('dockMagnify: false'));
assert.ok(shell.includes('dockIconSize: "normal"'));
assert.ok(shell.includes('root.dataset.dockMagnify = "false"'));
assert.ok(shell.includes('root.dataset.dockIconSize = "normal"'));
assert.ok(shell.includes('taskbarAppDragging: true'));
assert.ok(shell.includes('function bindRunningTaskbarDrag()'));
assert.ok(shell.includes('function bindTaskbarScrolling(dock)'));
assert.ok(shell.includes('settings.taskbarPosition !== "bottom"'));
assert.ok(shell.includes('dock.scrollLeft += delta * multiplier'));
assert.ok(shell.includes('dock.addEventListener("dragstart"'));
assert.ok(shell.includes('normalizePinnedAppOrder().forEach(function (id)'));
assert.ok(shell.includes('openWindows.forEach(function (_, id)'));
assert.ok(mobile.includes('item.draggable = false'));

assert.ok(shell.includes('if (!desktopShortcutLayer) return'));
assert.ok(shell.includes('function renderLauncher()'));

assert.ok(css.includes('.taskbar .dock-button'));
assert.ok(css.includes('width: min(32px, var(--vertical-dock-art, 32px)) !important'));
assert.ok(!css.includes('data-dock-icon-size="large"'));
assert.ok(!css.includes('data-dock-magnify="true"'));
assert.ok(css.includes('.desktop-shortcut {'));
assert.ok(css.includes('position: absolute'));
assert.ok(css.includes('touch-action: none'));
assert.ok(css.includes('html[data-desktop-icon-size="large"] .desktop-shortcut-label'));
assert.ok(css.includes('html[data-desktop-shortcuts-hidden="true"] .desktop-shortcuts'));
assert.ok(css.includes('.desktop-shortcut.is-snapping'));
assert.ok(css.includes('display: none'));
assert.ok(css.includes('width: 72px !important'));
assert.ok(runningCss.includes('.taskbar .dock:empty'));
assert.ok(runningCss.includes('.taskbar .dock-app-name'));
assert.ok(runningCss.includes('html[data-taskbar-position="bottom"] .taskbar .dock'));
assert.ok(runningCss.includes('overscroll-behavior-inline: contain'));

console.log("The taskbar starts with pinned apps, adds running apps, and scrolls along the bottom edge.");
