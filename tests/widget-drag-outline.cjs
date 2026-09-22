const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const runtime = read("neo-os", "neo-skins.js");
const desktop = read("neo-os", "neo-desktop-platform.js");
const config = read("neo-os", "neo-desktop-config.js");
const styles = read("neo-os", "neo-skin-interactions.css");
const index = read("neo-os", "index.html");

assert.match(config, /skinStyles:\s*\[[^\]]*'outline'/);
assert.match(runtime, /outline:s\.outline===true/);
assert.match(runtime, /n\.dataset\.outline=s\.outline/);
assert.match(runtime, /Clean outline<input name="outline" type="checkbox">/);
assert.match(runtime, /interactive=e\.target\.closest\('button,input,textarea,select,a,\[contenteditable="true"\]'\)/);
assert.match(runtime, /drag=!interactive\?n:null/);
assert.match(runtime, /n\.classList\.add\(handle\?'is-resizing':'is-dragging'\)/);
assert.match(runtime, /n\.setPointerCapture\(e\.pointerId\)/);
assert.match(runtime, /a\.n\.classList\.remove\('is-dragging','is-resizing'\)/);
assert.match(desktop, /drag widgets from any empty area and resize them from the edges/i);

assert.match(styles, /\.neo-skin:not\(\[data-locked="true"\]\) \.skin-content[\s\S]*?touch-action: none/);
assert.match(styles, /\.neo-skin\[data-outline="true"\][\s\S]*?outline:/);
assert.match(styles, /\.neo-skin\[data-style="outline"\]/);
assert.match(styles, /\.neo-skin:is\(\.is-dragging, \.is-resizing\)[\s\S]*?outline: 2px solid var\(--desktop-accent\)/);
assert.match(styles, /@media \(hover: hover\) and \(pointer: fine\)[\s\S]*?\.skin-handle > \[data-skin-action\][\s\S]*?visibility: hidden/);
assert.match(styles, /\.neo-skin:is\(:hover, :focus-within\) \.skin-handle > \[data-skin-action\][\s\S]*?visibility: visible/);
assert.match(index, /neo-skin-interactions\.css\?v=20260907-live-weather-v1/);
assert.match(index, /neo-skins\.js\?v=20260907-live-weather-v1/);
assert.match(index, /neo-desktop-platform\.js\?v=20260907-widget-logo-v3/);

console.log("Widget drag surface and outline checks passed.");
