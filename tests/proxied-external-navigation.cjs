const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const bridge = read("neo-os", "neo-link-proxy.js");
const shell = read("neo-os", "neo-os.js");
const browser = read("neo-os", "neo-browser-runtime.js");
const preview = read("neo-os", "neo-desktop-platform.js");

for (const [name, source] of [["neo-link-proxy.js", bridge], ["neo-os.js", shell], ["neo-browser-runtime.js", browser], ["neo-desktop-platform.js", preview]]) {
  new vm.Script(source, { filename: name });
}

assert.match(bridge, /neo-shell:proxy-open/, "External links are not sent to the shell proxy");
assert.match(bridge, /neo-shell:proxy-embed/, "External embeds are not sent to the shell proxy");
assert.match(bridge, /window\.open = function/, "Script-created popups can bypass the proxy");
assert.match(bridge, /document\.addEventListener\("submit"/, "External forms can bypass the proxy");
assert.match(shell, /handleProxyBridgeMessage/, "The desktop does not receive proxied navigation requests");
assert.match(shell, /engine\.proxyUrl\(target\)/, "Embedded pages do not use the browser transport");
assert.match(shell, /openBrowserTarget\(target/, "External links do not open in NEO Browser");
assert.match(browser, /async proxyUrl\(value\)/, "The browser engine does not expose a safe embed route");
assert.match(preview, /neo-link-proxy\.js/, "Code Workspace previews can bypass the proxy");

console.log("External links, popups, forms, and embedded pages are bound to the NEO web proxy.");
