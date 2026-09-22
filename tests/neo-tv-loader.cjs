const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const runtime = read("neo-os/neo-tv/app.js");
const page = read("neo-os/neo-tv/index.html");
const apps = read("neo-os/neo-apps.js");

for (const dependency of ["app.css", "catalog.js", "offline-catalog.js", "offline-series.js", "app.js"]) {
  assert.ok(fs.existsSync(path.join(root, "neo-os/neo-tv", dependency)), `missing NEO Movies dependency: ${dependency}`);
}

assert.doesNotMatch(page, /assets\/(?:vendor|hls|index)-/i, "legacy TV bundles must not load eagerly");
assert.match(page, /catalog\.js\?v=20260912-open-movies-v2/);
assert.match(page, /offline-catalog\.js\?v=20260912-library-v1/);
assert.match(page, /offline-series\.js\?v=20260912-series-v1/);
assert.match(page, /app\.js\?v=20260912-media-fallback-v9/);
assert.match(runtime, /window\.NEO_PROXY_CLIENT/);
assert.match(runtime, /data-vidfast-player/);
assert.match(apps, /neo-tv\/index\.html\?build=20260912-media-fallback-v9/);

console.log("NEO Movies resolves its current catalogue, series, playback, and proxy runtime files.");
