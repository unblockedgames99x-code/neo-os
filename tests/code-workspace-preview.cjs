const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "neo-os", "index.html"), "utf8");
const runtime = fs.readFileSync(path.join(root, "neo-os", "neo-desktop-platform.js"), "utf8");
const css = fs.readFileSync(path.join(root, "neo-os", "neo-desktop.css"), "utf8");

assert.match(html, /neo-desktop\.css\?[^"']*editor=network-preview-v1/);
assert.match(html, /neo-desktop-platform\.js\?[^"']*editor=network-preview-v1/);
assert.doesNotMatch(runtime, /Sandbox preview · no network or system access/);
assert.doesNotMatch(runtime, /connect-src \\'none\\'/);
assert.match(runtime, /connect-src https: http: wss: ws: data: blob:/);
assert.match(runtime, /sandbox','allow-scripts allow-forms allow-modals allow-popups/);
assert.match(runtime, /allow','autoplay; fullscreen; picture-in-picture;/);
assert.match(runtime, /setAttribute\('allowfullscreen',''\)/);
assert.match(runtime, /button\('Maximize'/);
assert.match(runtime, /button\('Full screen'/);
assert.match(runtime, /document\.documentElement\.requestFullscreen/);
assert.match(runtime, /button\('Close',closePreview,actions\)/);
assert.match(css, /\.editor-preview-dialog\{[^}]*resize:both/);
assert.match(css, /\.editor-preview-dialog\.is-maximized\{/);
assert.match(css, /\.editor-preview-dialog\.is-browser-fullscreen\{/);
assert.match(css, /\.editor-preview\{[^}]*width:100%;height:100%/);

console.log("Code Workspace preview allows network requests and has resize, maximize, and fullscreen controls.");
