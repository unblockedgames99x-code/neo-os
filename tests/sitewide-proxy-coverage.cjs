const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

const externalResourceApps = [
  "music-v2/index.html",
  "neo-ai/index.html",
  "neo-tv/index.html",
  "neo-youtube/index.html",
];

for (const entry of externalResourceApps) {
  const source = read("neo-os", entry);
  assert.match(source, /neo-ad-shield\.js\?v=20260912-sitewide-v2/, `${entry} must load the current ad shield`);
  assert.match(source, /neo-link-proxy\.js\?v=/, `${entry} must route external navigation through the link proxy bridge`);
  assert.match(source, /neo-proxy-client\.js\?v=/, `${entry} must route external resources through the proxy client`);
}

const gamesHtml = read("neo-os", "neo-games", "index.html");
const gamesApp = read("neo-os", "neo-games", "app.js");
assert.match(gamesHtml, /neo-ad-shield\.js\?v=20260912-sitewide-v2/, "Games must keep the ad shield");
assert.doesNotMatch(gamesHtml, /neo-link-proxy\.js/, "Games must not boot the legacy catch-all link proxy");
assert.match(gamesHtml, /neo-proxy-client\.js/, "Aether catalog resources must use the shared OS proxy");
assert.match(gamesApp, /window\.Lumin\.getGameUrl\(game\.id\)/, "Fern games must keep their direct provider URLs");
assert.match(gamesApp, /window\.NEO_PROXY_CLIENT\.resolve\(game\.launchUrl, "game"\)/, "Aether games must use the shared OS proxy");

const frameLoader = read("neo-os", "neo-frame-loader.js");
const shell = read("neo-os", "neo-os.js");
const linkProxy = read("neo-os", "neo-link-proxy.js");
const proxyClient = read("neo-os", "neo-proxy-client.js");
assert.match(frameLoader, /neo-link-proxy-runtime/);
assert.match(frameLoader, /neo-link-proxy\.js\?v=/);
assert.match(shell, /neo-link-proxy-runtime/);
assert.match(shell, /neo-shell:proxy-resource/);
assert.match(shell, /function ownsInDocument\(frameDocument, depth\)/, "Shell proxy bridge cannot recognize nested CDN app frames");
assert.match(proxyClient, /function shellWindow\(\)/, "Proxy client cannot find the shell through a CDN wrapper");
assert.match(proxyClient, /shellWindow\(\)\.postMessage/, "Nested apps do not send proxy requests to the shell");

const youtubeHtml = read("neo-os", "neo-youtube", "index.html");
const youtubeApp = read("neo-os", "neo-youtube", "app.js");
assert.match(linkProxy, /isTrustedDirectEmbed/, "the proxy bridge must explicitly validate trusted direct-player recovery");
assert.match(linkProxy, /url\.hostname === "www\.youtube-nocookie\.com"/, "only the privacy-enhanced YouTube player may bypass a failed proxy embed");
assert.match(youtubeHtml, /neo-ad-shield\.js\?v=20260912-sitewide-v2/);
assert.match(youtubeHtml, /neo-link-proxy\.js\?v=/, "YouTube links must use the shell proxy bridge");
assert.match(youtubeHtml, /neo-proxy-client\.js\?v=/, "YouTube metadata and artwork must use the resource proxy");
assert.match(youtubeApp, /NEO_PROXY_CLIENT/, "YouTube app must resolve metadata and artwork through the shared proxy client");
assert.match(youtubeApp, /youtube-nocookie\.com\/embed\//, "YouTube playback must use the official privacy-enhanced player host");

console.log(`Proxy bridge coverage verified for ${externalResourceApps.length} web apps; Fern stays direct, Aether is proxied, and YouTube playback remains privacy-enhanced.`);
