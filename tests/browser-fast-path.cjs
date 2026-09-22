const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

const html = read("neo-os", "NEO-BROWSER", "index.html");
const runtime = read("neo-os", "NEO-BROWSER", "assets", "scramjet-runtime.js");
const worker = read("neo-os", "NEO-BROWSER", "scramjet", "transport-worker.js");
const serviceWorker = read("neo-os", "NEO-BROWSER", "sw.js");
const shield = read("neo-os", "NEO-BROWSER", "assets", "neo-ad-shield.js");

assert.match(html, /rel="preload"[^>]+fa-solid-900\.woff2/,
  "critical browser icons should begin loading with the shell");
assert.doesNotMatch(html, /<script[^>]+src="(?:scramjet\/baremux|jet\/jet\.(?:core|api))\.js/i,
  "the full proxy engine should not block an empty browser tab");
assert.match(runtime, /function ensureProxyRuntime\(\)/,
  "navigation must be able to load the proxy engine on demand");
assert.match(runtime, /warmRuntimeFromIntent/,
  "the engine should begin loading when the user starts a navigation");
assert.match(runtime, /function installImageRecovery\(frameWindow\)/,
  "failed page images should get a bounded automatic retry");
assert.match(runtime, /timeoutMs = 15000/);
assert.match(runtime, /\}, payload \? \[payload\] : \[\], 45000\)/,
  "slow page assets need a realistic background-worker timeout");
assert.match(worker, /response\.body instanceof ReadableStream/,
  "large responses should stream instead of being copied into one large buffer");
assert.match(worker, /requestControllers\.get\(message\.requestId\)\?\.abort\(\)/,
  "timed-out requests must release their network work");
assert.match(serviceWorker, /neo-proxy-assets-v2/);
assert.match(serviceWorker, /new Set\(\["font", "image", "script", "style"\]\)/,
  "static page assets should use the fast proxy cache");
assert.equal((shield.match(/new NativeMutationObserver/g) || []).length, 1,
  "ad cleanup should use one batched observer");
assert.match(shield, /requestIdleCallback\(flush, \{ timeout: 180 \}\)/,
  "ad cleanup should run outside page rendering work");

console.log("Browser fast-path and low-memory guards passed.");
