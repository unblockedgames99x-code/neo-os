const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const runtime = read("neo-os/neo-desktop-platform.js");
const desktop = read("neo-os/neo-desktop.css");
const interfaces = read("neo-os/neo-interface-styles.css");

assert.match(runtime, /divider=el\('div','editor-divider'\)/);
assert.match(runtime, /main\.append\(explorer,divider,right\)/);
assert.match(runtime, /divider\.setAttribute\('role','separator'\)/);
assert.match(runtime, /divider\.setAttribute\('aria-orientation','vertical'\)/);
assert.match(desktop, /\.editor-main \{ grid-template-columns: 180px 2px minmax\(0, 1fr\); \}/);
assert.match(desktop, /\.editor-divider \{/);
assert.match(interfaces, /data-interface-style="retro"[^\n]*\.editor-divider/);

console.log("Code Workspace has a visible, theme-aware vertical divider.");
