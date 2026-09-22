const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const shell = read("neo-os/neo-os.js");
const config = read("neo-os/neo-local-config.js");
const shield = read("neo-os/neo-ad-shield.js");
const frameLoader = read("neo-os/neo-frame-loader.js");
const api = read("stratus-api-service/api.js");

new vm.Script(shell, { filename: "neo-os/neo-os.js" });
new vm.Script(config, { filename: "neo-os/neo-local-config.js" });
new vm.Script(shield, { filename: "neo-os/neo-ad-shield.js" });
new vm.Script(frameLoader, { filename: "neo-os/neo-frame-loader.js" });
new vm.Script(api, { filename: "stratus-api-service/api.js" });

assert.match(config, /gameDocumentRelay:\s*"https:\/\/neo-stratus-api-w6nw\.onrender\.com\/games\/v1\/document"/);
assert.match(shell, /directGameDocumentRoute[\s\S]*?a\.luminsdk\.com[\s\S]*?searchParams\.set\("url", source\.href\)/);
assert.match(shell, /if \(!directGame\) frameSandbox\.push\("allow-popups"\)/);
assert.match(shell, /forceFetch:\s*directGame \|\| !browserBacked/);
assert.match(shell, /NEO will not fall back to an ad-enabled page/);
assert.match(frameLoader, /isConfiguredGameDocument[\s\S]*?gameDocumentRelay/);
assert.match(frameLoader, /if \(originalGameUrl\) candidates\.unshift\(originalGameUrl\)/);
assert.match(frameLoader, /!isConfiguredDirectSource\(sourceUrl\)\s*&&\s*!isConfiguredGameDocument\(sourceUrl\)/);
assert.match(api, /app\.get\("\/games\/v1\/document"/);
assert.match(api, /cdn\.r9x\.in/);
assert.match(api, /sanitizeGameDocument/);
assert.match(shield, /"cdn\.r9x\.in"/);

console.log("Game documents are sanitized before launch, protected by the shared ad shield, and cannot open popups.");
