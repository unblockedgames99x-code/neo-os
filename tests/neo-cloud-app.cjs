const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");

const html = read("neo-os/neo-cloud/index.html");
const css = read("neo-os/neo-cloud/styles.css");
const app = read("neo-os/neo-cloud/app.js");
const apps = read("neo-os/neo-apps.js");
const shell = read("neo-os/neo-os.js");
const network = read("neo-os/neo-runner-network.js");
const server = read("google-script-Code.gs");
const icon = read("neo-os/assets/neo-cloud.svg");
const catalog = JSON.parse(read("neo-os/neo-cloud/games.json"));
const emoji = /\p{Extended_Pictographic}/u;

new vm.Script(app, { filename: "neo-os/neo-cloud/app.js" });

for (const [name, source] of [["HTML", html], ["CSS", css], ["JavaScript", app]]) {
  assert.equal(emoji.test(source), false, `${name} must use vector artwork instead of emoji`);
}

assert.match(css, /^\s*:root\s*{/);
assert.match(css, /\*\s*{\s*\n\s*box-sizing:\s*border-box/);
assert.doesNotMatch(css, /backdrop-filter|fonts\.googleapis/i);
assert.doesNotMatch(html, /<iframe\b|fonts\.googleapis|user-scalable\s*=\s*no/i);
assert.doesNotMatch(html, /data-api-key|data-remember-key|Paste your API key/);
assert.doesNotMatch(app, /\balert\s*\(/);
assert.match(app, /DEFAULT_ENDPOINT\s*=\s*"https:\/\/neo-stratus-api-w6nw\.onrender\.com"/);
assert.match(app, /SERVICE_WAKE_TIMEOUT\s*=\s*75000/);
assert.match(app, /The cloud server is waking up/);
assert.match(app, /setTimeout\(function \(\) \{ controller\.abort\(\); \}, SERVICE_WAKE_TIMEOUT\)/);
assert.match(app, /LEGACY_ENDPOINT\s*=\s*"https:\/\/api\.stratus\.lol"/);
assert.match(app, /DEFAULT_API_KEY\s*=\s*"sk_live_neo_[a-f0-9]{32}"/);
assert.match(app, /normalizeEndpoint\(savedEndpoint\) === LEGACY_ENDPOINT/);
assert.match(html, /data-game-grid/);
assert.match(html, /data-settings-dialog/);
assert.match(html, /This website uses Stratus API to provide some of its services/);
assert.match(html, /data-stream-stage/);
assert.match(html, /data-stream-stage[^>]+role="dialog"[^>]+aria-modal="true"/);
assert.match(html, /data-details-dialog[^>]+aria-labelledby="cloud-details-title"/);
assert.match(html, /data-settings-dialog[^>]+aria-labelledby="cloud-settings-title"/);
assert.match(app, /function loadCatalog\(/);
assert.match(app, /function startSession\(/);
assert.match(app, /function connectStream\(/);
assert.match(app, /function readArray\(/);
assert.match(app, /timeoutMs:\s*240000/);
assert.match(app, /Object\.assign\(\{ uuid: uuid \}, JSON\.parse\(result\.text\)\)/);
assert.match(app, /remoteCandidates:\s*\[\]/);
assert.match(app, /function releaseActiveInputs\(/);
assert.match(app, /function releaseStreamFocus\(/);
assert.match(app, /requestPointerLock\(\)/);
assert.match(app, /elements\.shell\.inert\s*=\s*Boolean\(visible\)/);
assert.match(app, /settings\s*=\s*settingsFromForm\(\)/);
assert.match(app, /state\.pendingLaunch\s*=\s*null;[\s\S]*?closeDialog\(elements\.settingsDialog\)/);
assert.match(app, /PAGE_SIZE\s*=\s*mode === "ultimate" \? 16 : 24;[\s\S]*?state\.visible\s*=\s*PAGE_SIZE;[\s\S]*?renderCatalog\(\)/);
assert.match(app, /\/cloud\/v1\/pingSession/);
assert.match(app, /window\.addEventListener\("pagehide"/);
assert.match(network, /\/cloud\\\/v1\\\/createSession\(\?:\\\?\|\$\)\/i\.test\(requestUrl\)[\s\S]*?240000/);

assert.match(apps, /id:\s*"neo-cloud"/);
assert.match(apps, /route:\s*"\.\/neo-cloud\/index\.html/);
assert.match(apps.match(/"neo-cloud":\s*\{[\s\S]*?\n\s*},/)?.[0] || "", /core:\s*true/);
assert.doesNotMatch(apps.match(/"neo-cloud":\s*{[\s\S]*?\n\s*},/)?.[0] || "", /keepAlive:\s*true/);
assert.match(shell, /"neo-cloud":\s*"\.\/assets\/neo-cloud\.svg/);
assert.match(icon, /viewBox="0 0 256 256"/);
assert.match(icon, /shape-rendering="geometricPrecision"/);
assert.doesNotMatch(icon, /<rect\b/);
assert.match(html, /neo-cloud\.svg\?v=20260901-cloud-logo-v2/);

const stored = new Map([["neo_os_installed_apps_v1", JSON.stringify(["browser"])]]);
const appSandbox = vm.createContext({
  window: { location: { hostname: "localhost" } },
  localStorage: {
    getItem: key => stored.has(key) ? stored.get(key) : null,
    setItem: (key, value) => stored.set(key, String(value))
  }
});
vm.runInContext(apps, appSandbox, { filename: "neo-os/neo-apps.js" });
assert.equal(appSandbox.window.NEO_EXTRA_APPS["neo-cloud"].title, "NEO Cloud");
assert.equal(appSandbox.window.NEO_EXTRA_APPS["neo-cloud"].keepAlive, undefined);
assert.ok(JSON.parse(stored.get("neo_os_installed_apps_v1")).includes("neo-cloud"));

assert.ok(Array.isArray(catalog));
assert.ok(catalog.length >= 200, "the complete cloud catalog must be included locally");
const keys = new Set();
for (const game of catalog) {
  assert.equal(typeof game.name, "string");
  assert.ok(game.name.trim());
  assert.match(game.game_key, /^[A-Za-z0-9_-]+$/);
  assert.equal(keys.has(game.game_key), false, `duplicate game key: ${game.game_key}`);
  keys.add(game.game_key);
  assert.ok(Array.isArray(game.tags));
  for (const image of [game.image, game.cover].filter(Boolean)) assert.match(image, /^https:\/\//);
}

for (const source of [network, server]) {
  assert.match(source, /api\.stratus\.lol/);
  assert.match(source, /\/cloud\/v1\/createSession/);
  assert.match(source, /\/cloud\/v1\/quitSession/);
}
assert.match(server, /'x-api-key'/);
assert.ok(fs.existsSync(path.join(root, "neo-os/assets/neo-cloud.svg")));
assert.ok(fs.existsSync(path.join(root, "neo-os/neo-cloud/LICENSE.stratus.txt")));
assert.ok(fs.existsSync(path.join(root, "neo-os/neo-cloud/THIRD_PARTY_NOTICES.md")));
assert.match(read("neo-os/neo-cloud/LICENSE.stratus.txt"), /^Stratus Public License/);
const notices = read("neo-os/neo-cloud/THIRD_PARTY_NOTICES.md");
assert.match(notices, /30bccaae33025f1874e8802f2923a34da974ab76/);
assert.match(notices, /stratus-api-service\//);

console.log(`NEO Cloud ships a clean ${catalog.length}-game local catalog, vector UI, and guarded streaming adapter.`);
