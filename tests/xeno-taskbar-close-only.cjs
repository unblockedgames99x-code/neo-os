const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "neo-os");
const runtime = fs.readFileSync(path.join(root, "neo-taskbar-preview.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "neo-xeno-taskbar.css"), "utf8");

assert.match(runtime, /function xenoCloseMode\(\)/);
assert.match(runtime, /dataset\.taskbarStyle === "xeno"/);
assert.match(runtime, /if \(xenoCloseMode\(\)\) \{\s*showXenoClose\(button\);\s*return;/);
assert.match(runtime, /preview\.hidden = true/);
assert.match(runtime, /className = "neo-xeno-taskbar-close"/);
assert.match(runtime, /api\.close\(win\)/);
assert.match(styles, /html\[data-taskbar-style="xeno"\] \.neo-xeno-taskbar-close:not\(\[hidden\]\)/);
assert.match(styles, /\.dock-button\.has-xeno-close \.dock-app-name/);

console.log("XENO taskbar hover uses an inline close X without opening a window preview.");
