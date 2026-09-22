const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const css = fs.readFileSync(path.join(root, "neo-os", "neo-taskbar-preview.css"), "utf8");
const index = fs.readFileSync(path.join(root, "neo-os", "index.html"), "utf8");
const preview = fs.readFileSync(path.join(root, "neo-os", "neo-taskbar-preview.js"), "utf8");
const interfaceStyles = fs.readFileSync(path.join(root, "neo-os", "neo-interface-styles.css"), "utf8");

const tray = css.match(/\.neo-minimized-tray\s*\{([\s\S]*?)\}/)?.[1] || "";

assert.match(tray, /overflow-x:\s*auto/);
assert.match(tray, /overflow-y:\s*hidden/);
assert.match(tray, /scrollbar-width:\s*thin/);
assert.match(css, /\.neo-minimized-tray::\-webkit-scrollbar\s*\{[\s\S]*?height:\s*7px/);
assert.match(css, /\.neo-minimized-tray::\-webkit-scrollbar-thumb\s*\{/);
assert.doesNotMatch(css, /\.neo-minimized-tray::\-webkit-scrollbar\s*\{\s*display:\s*none/);
assert.match(index, /neo-taskbar-preview\.css\?v=20260913-current-state-v1/);
assert.match(index, /neo-taskbar-preview\.js\?v=20260913-current-state-v1/);
assert.match(preview, /tray\.tabIndex = 0/);
assert.match(preview, /tray\.addEventListener\("wheel"/);
assert.match(preview, /tray\.scrollLeft = nextScroll/);
assert.match(preview, /passive: false/);
assert.match(preview, /function refreshMinimizedTray\(\)[\s\S]*?minimizedTray\.replaceChildren\(\);[\s\S]*?minimizedTray\.hidden = true;/);
assert.match(interfaceStyles, /html\[data-interface-style\] \.neo-minimized-tray\s*\{[\s\S]*?display:\s*none !important;/);

console.log("Legacy tray remains inert while current-state hover previews stay enabled.");
