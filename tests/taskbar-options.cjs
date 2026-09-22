const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const index = read("neo-os", "index.html");
const shell = read("neo-os", "neo-os.js");
const styles = read("neo-os", "neo-vertical-taskbar.css");
const previews = read("neo-os", "neo-taskbar-preview.js");
const menu = read("neo-os", "neo-taskbar-menu.js");
const resize = read("neo-os", "neo-window-resize.js");

const positions = Array.from(index.matchAll(/data-taskbar-position-option="([^"]+)"/g), (match) => match[1]);
const taskbarStyles = Array.from(index.matchAll(/data-taskbar-style-option="([^"]+)"/g), (match) => match[1]);
const taskbarSurfaces = Array.from(index.matchAll(/data-taskbar-surface-option="([^"]+)"/g), (match) => match[1]);

assert.deepEqual(positions, ["top", "right", "bottom", "left"]);
assert.deepEqual(taskbarStyles, ["current", "transparent", "typical", "xeno"]);
assert.doesNotMatch(index, /data-taskbar-style-option="figure"/);
assert.doesNotMatch(index, /neo-figure-taskbar\.css/);
assert.doesNotMatch(index, /taskbar-figure-logo/);
assert.deepEqual(taskbarSurfaces, ["glass", "solid", "gradient"]);
assert.match(index, /data-taskbar-position="left" data-taskbar-style="current" data-taskbar-surface="glass"/);
assert.match(index, /data-taskbar-outline="true"/);
assert.match(index, /data-taskbar-app-names="false"/);
assert.match(index, /data-setting="taskbarTint"/);
assert.match(index, /data-setting="taskbarTransparency"/);
assert.match(index, /data-setting="taskbarGradientEnd"/);
assert.match(index, /data-setting="taskbarOutline" checked/);
assert.match(index, /data-setting="taskbarAppNames"/);
assert.match(index, /data-taskbar-tint-preset="#767c84"/);
assert.doesNotMatch(index, /data-taskbar-material=/);
assert.doesNotMatch(index, /data-setting="taskbar(?:Opacity|Blur)"/);

assert.match(shell, /designVersion: 30/);
assert.match(shell, /taskbarPosition: "left"/);
assert.match(shell, /taskbarStyle: "current"/);
assert.match(shell, /taskbarSurface: "glass"/);
assert.match(shell, /taskbarOutline: true/);
assert.match(shell, /taskbarAppNames: false/);
assert.match(shell, /taskbarTint: "#767c84"/);
assert.match(shell, /taskbarGradientEnd: "#315f9b"/);
assert.match(shell, /taskbarTransparency: 62/);
assert.match(shell, /100 - clamp\(legacyTaskbarTintStrength, 0, 100\)/);
assert.match(shell, /delete savedSettings\.taskbarMaterial/);
assert.match(shell, /delete savedSettings\.taskbarOpacity/);
assert.match(shell, /delete savedSettings\.taskbarBlur/);
assert.match(shell, /root\.dataset\.taskbarPosition = settings\.taskbarPosition/);
assert.match(shell, /root\.dataset\.taskbarStyle = settings\.taskbarStyle/);
assert.match(shell, /root\.dataset\.taskbarSurface = settings\.taskbarSurface/);
assert.match(shell, /root\.dataset\.taskbarOutline = settings\.taskbarOutline \? "true" : "false"/);
assert.match(shell, /root\.dataset\.taskbarAppNames = settings\.taskbarAppNames \? "true" : "false"/);
assert.match(shell, /--neo-taskbar-opacity/);
assert.match(shell, /--neo-taskbar-gradient-end/);
assert.match(shell, /new CustomEvent\("neo-taskbar-layout-change"/);

["top", "right", "bottom", "left"].forEach((position) => {
  assert.match(styles, new RegExp(`data-taskbar-position="${position}"`));
});
["current", "transparent", "typical"].forEach((style) => {
  assert.match(styles, new RegExp(`data-taskbar-style="${style}"`));
});
["solid", "gradient"].forEach((surface) => {
  assert.match(styles, new RegExp(`data-taskbar-surface="${surface}"`));
});
assert.match(styles, /--dock-hit: var\(--vertical-dock-hit\)/);
assert.match(styles, /backdrop-filter: blur\(34px\) saturate\(1\.65\) brightness\(1\.08\)/);
assert.match(styles, /data-taskbar-style="current"\] \.taskbar::after/);
assert.match(styles, /data-taskbar-outline="false"\]\[data-taskbar-style="current"\] \.taskbar/);
assert.match(styles, /data-taskbar-outline="false"\][\s\S]*?\.taskbar::after[\s\S]*?display: none !important/);
assert.match(styles, /mask-composite: exclude/);
assert.match(styles, /data-performance-mode="performance"\]\[data-taskbar-style="current"\]/);
assert.match(styles, /html\.has-window-snap-mode\[data-taskbar-position="right"\]/);
assert.match(styles, /html\[data-mobile-keyboard="true"\]\[data-taskbar-position="top"\]/);
assert.match(styles, /data-taskbar-position="left"\] \.app-launcher \{[\s\S]*?inset: var\(--topbar-height\) 0 0 var\(--neo-taskbar-vertical-avoid\) !important;/);
assert.match(styles, /data-taskbar-position="right"\] \.app-launcher \{[\s\S]*?inset: var\(--topbar-height\) var\(--neo-taskbar-vertical-avoid\) 0 0 !important;/);
assert.match(styles, /data-taskbar-position="top"\] \.app-launcher \{[\s\S]*?inset: calc\(var\(--topbar-height\) \+ var\(--neo-taskbar-horizontal-avoid\)\) 0 0 0 !important;/);
assert.match(styles, /data-taskbar-position="bottom"\] \.app-launcher \{[\s\S]*?inset: var\(--topbar-height\) 0 var\(--neo-taskbar-horizontal-avoid\) 0 !important;/);
assert.match(styles, /html\.neo-auto-hide-bars\[data-taskbar-position="top"\] \.taskbar \{[\s\S]*?top: calc\(var\(--neo-taskbar-edge-gap\) \+ env\(safe-area-inset-top\)\) !important;/);
assert.match(styles, /html\.neo-auto-hide-bars\[data-taskbar-position="top"\] \.window-layer,[\s\S]*?inset: calc\(var\(--neo-taskbar-horizontal-avoid\) \+ env\(safe-area-inset-top\)\) 0 0 !important;/);
assert.match(styles, /html\.neo-auto-hide-bars\[data-taskbar-style="typical"\]\[data-taskbar-position="top"\] \.window-layer,[\s\S]*?inset: calc\(58px \+ env\(safe-area-inset-top\)\) 0 0 !important;/);
assert.match(index, /neo-vertical-taskbar\.css\?v=20260919-clear-rail-v1/);
assert.match(shell, /launcher\.setAttribute\("aria-hidden", "false"\);[\s\S]*?launcher\.classList\.add\("is-opening"\);[\s\S]*?renderLauncher\(\);/);

assert.match(previews, /position === "left"/);
assert.match(previews, /position === "right"/);
assert.match(previews, /position === "top"/);
assert.match(previews, /neo-taskbar-layout-change/);
assert.match(menu, /position === "left"/);
assert.match(menu, /position === "right"/);
assert.match(menu, /position === "top"/);
assert.match(menu, /neo-taskbar-layout-change/);
assert.match(resize, /neo-taskbar-layout-change/);

console.log("Taskbar option checks passed.");
