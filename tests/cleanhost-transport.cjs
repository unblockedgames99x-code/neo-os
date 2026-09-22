const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const core = read("neo-os/neo-browser-runtime.js");
const standalone = read("neo-os/NEO-BROWSER/assets/scramjet-runtime.js");
const config = read("neo-os/neo-local-config.js");
const apps = read("neo-os/neo-apps.js");
const shell = read("neo-os/neo-os.js");
const policy = read("neo-os/index.html");

for (const [name, source] of [["core", core], ["standalone", standalone], ["config", config]]) {
  assert.match(source, /wss:\/\/athollcottage\.com\/connection\//, `${name} does not use the live public reference relay`);
}
assert.match(core, /wss:\/\/cleanhost5896\.b-cdn\.net\/wisp\//, "Desktop Browser does not retain Cleanhost's exact fallback route");
assert.match(standalone, /wss:\/\/cleanhost5896\.b-cdn\.net\/wisp\//, "Standalone Browser does not preserve Cleanhost's exact same-origin route");
assert.match(standalone, /DEFAULT_WISP_RELAY = REFERENCE_BACKUP_RELAY/, "CDN-hosted Browser does not default to the live public reference relay");
assert.match(standalone, /new ReferenceTransport\(\{ wisp: selected\.url \}\)/, "CDN-hosted Browser does not use the reference connection method");
assert.doesNotMatch(core, /firstResponsiveWispRelay\(remaining/, "The desktop still races every relay during startup");
assert.doesNotMatch(standalone, /firstResponsiveRelay\(candidates/, "The standalone browser still races every relay during startup");
assert.match(policy, /connect-src[^;]*wss:\/\/cleanhost5896\.b-cdn\.net/, "The desktop policy blocks the Cleanhost relay");
assert.match(policy, /connect-src[^;]*wss:\/\/cdn\.northstreetumc\.org/, "The desktop policy blocks the public reference relay");
assert.match(apps, /function proxiedAppRoute\(target\)[\s\S]*?NEO_LOCAL_CONFIG\.appProxy[\s\S]*?neo-app-mode=1&neo-custom-app=1&neo-app-target=/);
assert.match(apps, /movies:\s*\{[\s\S]*?route:\s*proxiedAppRoute\("https:\/\/cinecat\.eu\/"\)[\s\S]*?proxyApp:\s*true/);
assert.match(shell, /app\.proxyApp === true/, "The desktop does not treat proxied app windows as direct browser frames");
assert.match(read("neo-os/neo-frame-loader.js"), /\[config\.browser, config\.appProxy\]/, "The dedicated app proxy is still fetched as a document instead of loaded directly");

console.log("Cleanhost transport and chromeless Cinecat Movies contracts are installed.");
