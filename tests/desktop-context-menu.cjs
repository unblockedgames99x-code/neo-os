const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const index = fs.readFileSync(path.join(root, "neo-os", "index.html"), "utf8");
const features = fs.readFileSync(path.join(root, "neo-os", "neo-os-features.js"), "utf8");
const featureStyles = fs.readFileSync(path.join(root, "neo-os", "neo-os-features.css"), "utf8");
const shell = fs.readFileSync(path.join(root, "neo-os", "neo-os.js"), "utf8");
const platform = fs.readFileSync(path.join(root, "neo-os", "neo-desktop-platform.js"), "utf8");
const contextMenu = index.match(/<div id="desktop-context-menu"[\s\S]*?<input type="file" data-desktop-import-input[^>]*>/);

assert.ok(contextMenu, "The desktop context menu should still be present.");
assert.doesNotMatch(contextMenu[0], /data-context-submenu="view"|>View</);
assert.doesNotMatch(contextMenu[0], /data-context-submenu="sort"|>Sort icons</);
assert.match(contextMenu[0], /data-context-submenu="new"/);
assert.match(contextMenu[0], /data-context-submenu="widgets"/);
assert.match(contextMenu[0], /data-widget-action="manage"[^>]*>[\s\S]*?Add or customize widgets/);
assert.match(contextMenu[0], /data-widget-action="show"/);
assert.match(contextMenu[0], /data-widget-action="lock"/);
assert.match(contextMenu[0], /data-widget-action="reset"/);
assert.doesNotMatch(contextMenu[0], /data-desktop-action="toggle-icons"|data-desktop-icons-label/);
assert.doesNotMatch(contextMenu[0], /data-restore-desktop-shortcuts|Restore desktop app icons/);
assert.match(contextMenu[0], /data-desktop-action="refresh"/);
assert.match(features, /action === "manage"\) api\.openApp\("skins"\)/);
assert.match(features, /desktopSubmenuCloseTimer/);
assert.match(features, /menu\.addEventListener\("pointerleave"[\s\S]*?scheduleDesktopSubmenuClose\(menu\)/);
assert.match(features, /button && button\.parentElement === menu\) closeDesktopSubmenus\(menu\)/);
assert.match(featureStyles, /\.context-menu-branch\.is-open::after/);
assert.match(featureStyles, /left: calc\(100% \+ 6px\)/);
assert.match(shell, /neo-os-features\.css\?v=20260910-app-installer-v2&hover=bridge-v1/);
assert.match(shell, /neo-os-features\.js\?v=20260912-status-widget-toggles-v1&hover=bridge-v1/);
assert.match(index, /context=hover-v1/);
assert.doesNotMatch(platform, /Add and customize desktop skins/);

console.log("Desktop context-menu cleanup checks passed.");
