const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const html = read("neo-os", "index.html");
const monitor = read("neo-os", "neo-connection-monitor.js");
const shell = read("neo-os", "neo-os.js");
const skins = read("neo-os", "neo-skins.js");

assert.match(html, /class="taskbar-start-button"[^>]*data-open-launcher[^>]*aria-controls="app-launcher"/);
assert.match(html, /class="topbar-action"[^>]*data-open-launcher/);
assert.match(html, /neo-connection-monitor\.js\?v=20260909-server-fallback-v2/);
assert.match(html, /connect-src[^";]*neo-stratus-api-w6nw\.onrender\.com[^";]*wss:\/\/support\.pired\.org[^";]*wss:\/\/girlspreples\.com/);
assert.match(html, /id="connection-state"[^>]*data-connection-toggle[^>]*aria-controls="connection-panel"/);
assert.match(html, /id="taskbar-network"[^>]*data-taskbar-quick-toggle[^>]*aria-controls="taskbar-quick-settings"/);
assert.match(html, /id="taskbar-quick-settings"/);
assert.match(html, /id="connection-panel"/);
assert.match(html, /data-connection-panel-label/);

["Desktop", "Browser", "Music", "Wallpapers", "Browser relay", "Music server", "Chat server", "Cloud server"].forEach((service) => {
  assert.match(monitor, new RegExp('"' + service + '"'));
});
assert.match(monitor, /fetch\(url\.href, options\)/);
assert.match(monitor, /RELAY_URLS/);
assert.match(monitor, /new WebSocket\(url\)/);
assert.match(monitor, /preferredRelay = result\.url/);
assert.match(monitor, /status: "checking"/);
assert.match(monitor, /next\.status = "connected"/);
assert.match(monitor, /next\.status = "local"/);
assert.match(monitor, /next\.status = "offline"/);
assert.match(monitor, /neo-connection-change/);

assert.match(shell, /NEO_CONNECTION_MONITOR\.subscribe\(updateConnection\)/);
assert.match(shell, /connectionState\.classList\.toggle\("is-limited", limited\)/);
assert.match(shell, /function setConnectionPanelOpen\(/);
assert.match(shell, /data-connection-refresh/);
assert.doesNotMatch(skins, /Browser connection flag, not a live internet test/);
assert.match(skins, /data-connection-test/);
assert.match(skins, /NEO_CONNECTION_MONITOR\?\.subscribe/);

console.log("Site connection health checks passed.");
