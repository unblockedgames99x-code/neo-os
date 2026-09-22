const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const index = read("neo-os", "index.html");
const shell = read("neo-os", "neo-os.js");
const config = read("neo-os", "neo-local-config.js");
const musicIndex = read("neo-os", "music-v2", "index.html");
const bridge = read("neo-os", "music-v2", "neo-os-bridge.js");

assert.match(index, /img-src[^;]*https:/);
assert.match(index, /neo-os\.js[^"']*artwork=stable-cover-v2/);
assert.match(config, /music-v2\/index\.html\?v=20260912-proxy-music-v3/);
assert.match(musicIndex, /neo-os-bridge\.js\?v=20260910-repeat-v1/);

assert.match(bridge, /function currentCover\(\)/);
assert.match(bridge, /\.now-playing-bar \.track-info img\.cover/);
assert.match(bridge, /#fullscreen-cover-image/);
assert.match(bridge, /navigator\.mediaSession && navigator\.mediaSession\.metadata/);
assert.match(bridge, /appicon\|spotify-official\|neo-logo/);
assert.match(bridge, /var cover = currentCover\(\)/);
assert.match(bridge, /candidates = \[element\.currentSrc, element\.getAttribute\("src"\), element\.src\]/);
assert.match(bridge, /coverKey === rememberedCoverKey/);

assert.match(shell, /function syncMediaCover\(image, fallback, container, cover\)/);
assert.match(shell, /if \(cover === current\) \{\s+showCover\(\);\s+return;/);
assert.match(shell, /image\.dataset\.neoCoverPending = cover;[\s\S]*?var preload = new Image\(\);/);
assert.match(shell, /previousState\.source === source && previousState\.title === title/);
assert.match(shell, /syncMediaCover\(image, fallback, nowPlayingWidget, cover\)/);
assert.match(shell, /syncMediaCover\(topbarCover, topbarFallback, topbarMedia, cover\)/);

console.log("NEO Music artwork checks passed.");
