const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

const worker = read("neo-os", "NEO-BROWSER", "sw.js");
const bridge = read("neo-os", "NEO-BROWSER", "assets", "cinecat-source-bridge.js");
const launcher = read("neo-os", "NEO-BROWSER", "launch.svg");
const runtime = read("neo-os", "NEO-BROWSER", "assets", "scramjet-runtime.js");

assert.match(worker, /cinecat-source-bridge\.js/);
assert.match(worker, /isCinecatDocument/);
assert.match(worker, /x-neo-cinecat-bridge/);
assert.match(worker, /html\.replace\(\/<\\\/body>/);
assert.match(bridge, /hello:[\s\S]*?version: BRIDGE_VERSION[\s\S]*?hasPermission: true/);
assert.match(bridge, /makeRequest/);
assert.match(bridge, /prepareStream/);
assert.match(bridge, /targetDomains/);
assert.match(bridge, /window\.XMLHttpRequest = ProxyXHR/);
assert.match(bridge, /neo:cinecat:transport-request/);
assert.match(runtime, /activeTransport\.request/);
assert.match(runtime, /responseBodyBuffer/);
assert.match(bridge, /targetOrigin/);
assert.match(launcher, /20260922-cinecat-source-recovery-v\d+/);
assert.match(runtime, /20260922-cinecat-source-recovery-v\d+/);

console.log("Cinecat receives the NEO source bridge before its player boots.");
