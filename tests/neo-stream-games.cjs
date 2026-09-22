const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

const streamHtml = read("neo-os", "neo-tv", "index.html");
const streamJs = read("neo-os", "neo-tv", "app.js");
const streamCatalog = read("neo-os", "neo-tv", "catalog.js");
const gamesHtml = read("neo-os", "neo-games", "index.html");
const gamesJs = read("neo-os", "neo-games", "app.js");
const apps = read("neo-os", "neo-apps.js");

assert.match(streamHtml, /Who(?:&apos;|')s watching\?/i, "Stream profile picker is missing");
assert.match(streamHtml, /data-video[\s\S]*playsinline/i, "Stream does not use the native inline video player");
assert.doesNotMatch(streamHtml, /assets\/(?:vendor|hls|index)-/i, "Legacy multi-megabyte TV bundles still start eagerly");
assert.match(streamJs, /requestPictureInPicture/, "Picture-in-picture is missing");
assert.match(streamJs, /IntersectionObserver/, "Stream discovery rails are not lazy loaded");
assert.match(streamJs, /neo_stream_profiles_v1/, "Local profile persistence is missing");
assert.match(streamJs, /registerTool/, "Stream WebMCP surface is missing");
assert.doesNotMatch(streamHtml + streamJs + streamCatalog, /api_key=|vidking|vidsrc/i, "A private movie credential or unapproved embed provider was copied");

assert.match(gamesHtml, /data-player-fullscreen/, "Games fullscreen control is missing");
assert.match(gamesHtml, /data-search/, "Steam library search is missing");
assert.match(gamesJs, /fetchGames\(state\.page \+ 1, state\.query, true\)/, "Fern catalog is not incrementally rendered");
assert.match(gamesJs, /window\.Lumin\.getGameUrl\(game\.id\)/, "Fern game paths are not resolved directly");
assert.match(gamesJs, /image\.loading = "lazy"/, "Game covers are not lazy loaded");
assert.doesNotMatch(gamesJs, /<button class="favorite"/, "Game cards contain nested buttons");

assert.match(apps, /movies:\s*\{[\s\S]*?title: "Movies"[\s\S]*?route: "\.\/neo-tv\/index\.html\?build=20260912-media-fallback-v9"/, "The Movies app is not registered with its current route");
assert.match(apps, /games:\s*\{[\s\S]*?title: "Steam"[\s\S]*?icon: "steam"[\s\S]*?route: "\.\/neo-games\/index\.html\?build=20260918-steam-brand-v1"/, "Desktop does not route to the branded Steam library app");

console.log("NEO Movies and Games static regression checks passed.");
