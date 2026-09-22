const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const html = read("neo-os/index.html");
const shell = read("neo-os/neo-os.js");
const css = read("neo-os/neo-os.css");
const menu = read("neo-os/neo-taskbar-menu.js");

new vm.Script(shell, { filename: "neo-os.js" });
new vm.Script(menu, { filename: "neo-taskbar-menu.js" });

assert.match(html, /neo-os\.css\?v=20260901-clean-desktop-v1/);
assert.match(html, /neo-os\.js\?v=20260907-tab-appearance-v1/);
assert.match(html, /neo-taskbar-menu\.js\?v=20260901-clean-desktop-v1/);
assert.doesNotMatch(html, /id="desktop-apps"|aria-label="Unpinned applications"/);
assert.doesNotMatch(shell, /renderDesktopApps|createDesktopAppShortcut|desktop-app-shortcut/);
assert.doesNotMatch(menu, /desktop-app-shortcut|desktop-app-icon/);
assert.doesNotMatch(css, /\.desktop-apps|\.desktop-app-shortcut|\.desktop-app-icon/);

console.log("Clean desktop app-placement contract passed.");
