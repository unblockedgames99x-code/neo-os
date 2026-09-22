const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

const shell = read("neo-os", "neo-os.js");
const apps = read("neo-os", "neo-apps.js");
const features = read("neo-os", "neo-os-features.js");
const streamHtml = read("neo-os", "neo-tv", "index.html");
const streamApp = read("neo-os", "neo-tv", "app.js");
const streamCatalog = read("neo-os", "neo-tv", "catalog.js");
const shardBuild = read("scripts", "build-github-cdn-shards.cjs");

for (const [name, source] of [
  ["neo-os.js", shell],
  ["neo-apps.js", apps],
  ["neo-os-features.js", features],
  ["neo-tv/app.js", streamApp],
  ["neo-tv/catalog.js", streamCatalog],
]) {
  new vm.Script(source, { filename: name });
}

assert.match(apps, /id:\s*"app-installer"[\s\S]*?lazy:\s*true/, "Native App Installer entry is missing");
assert.doesNotMatch(apps, /id:\s*"anime"|title:\s*"Anime"|view=anime/, "Anime launcher is still registered");
assert.doesNotMatch(apps, /id:\s*"manga"|title:\s*"Manga"|view=manga/, "Manga launcher is still registered");
assert.match(apps, /id:\s*"notes"[\s\S]*?notepad/, "Existing Notes app is not discoverable as Notepad");

assert.match(shell, /CUSTOM_APPS_KEY\s*=\s*"neo_os_custom_apps_v1"/, "Custom app persistence key is missing");
assert.match(shell, /url\.protocol !== "http:" && url\.protocol !== "https:"/, "Custom apps do not reject unsafe URL schemes");
assert.match(shell, /neo-app-mode=1&neo-custom-app=1&neo-app-target=/, "Relay-mode route is missing");
assert.match(shell, /browserBacked = app\.id === "browser" \|\| Boolean\(app\.custom\)/, "Installed websites do not always receive full browser integration");
assert.match(shell, /if \(browserBacked\) window\.addEventListener\("message", relayNeoBrowserMessage\)/, "Relay-installed apps do not receive the browser message bridge");
assert.match(shell, /installCustomApp:\s*installCustomApp/, "Installer API is not exposed to the feature runtime");
assert.match(shell, /removeCustomApp:\s*removeCustomApp/, "Custom app removal API is missing");
assert.match(features, /function mountAppInstaller/, "Installer UI is missing");
assert.doesNotMatch(features, /Direct iframe|data-installer-mode/, "The installer still exposes a direct, non-proxied mode");
assert.match(features, /every link they open use the NEO web proxy/, "The installer does not explain its proxy-only behavior");
assert.match(features, /Install &amp; open/, "Installer does not make the successful launch action clear");
assert.match(features, /api\.openApp\(app\.id\)/, "Installed apps do not open after installation");
assert.match(features, /data-custom-app-remove/, "Installed web apps cannot be removed");

assert.doesNotMatch(streamHtml, /data-view="anime"/, "Anime navigation is still visible");
assert.doesNotMatch(streamHtml, /data-view="manga"/, "Manga navigation is still visible in the Stream sidebar");
assert.match(streamHtml, /data-reader-pages/, "Manga reader surface is missing");
assert.doesNotMatch(streamCatalog, /type:\s*"anime"/, "Anime catalog entries are still bundled");
assert.doesNotMatch(streamCatalog, /type:\s*"manga"|chapters:/, "Unverified Manga catalog entries are still bundled");
assert.match(streamApp, /function openReader/, "Manga reader behavior is missing");
assert.match(streamApp, /\["movies", "series", "anime", "manga"\]\.indexOf\(currentView\)/, "Section search does not stay inside media views");
assert.doesNotMatch(shardBuild, /neo-tv\/launch\.svg\?view=anime/, "Anime CDN route is still preserved by the shard build");
assert.doesNotMatch(shardBuild, /neo-tv\/launch\.svg\?view=manga/, "Manga CDN launcher route is still preserved by the shard build");

console.log("App installer and NEO media section regression checks passed.");
