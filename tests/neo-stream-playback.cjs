const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const catalogSource = read("neo-os", "neo-tv", "catalog.js");
const app = read("neo-os", "neo-tv", "app.js");
const html = read("neo-os", "neo-tv", "index.html");

const context = { window: {} };
vm.runInNewContext(catalogSource, context);
const catalog = Array.from(context.window.NEO_STREAM_CATALOG || []);

assert.ok(catalog.length >= 4, "The playable open-film catalog is too small");
catalog.forEach((title) => {
  assert.equal(title.type, "movie", `${title.title} is not classified as a movie`);
  assert.match(title.media, /^https:\/\//, `${title.title} has no HTTPS stream`);
  assert.ok(Array.isArray(title.mediaFallbacks) && title.mediaFallbacks.length, `${title.title} has no fallback stream`);
  assert.match(title.officialUrl, /^https:\/\/studio\.blender\.org\//, `${title.title} has no official Blender page`);
});

assert.doesNotMatch(catalogSource, /zstream|p-stream|vidsrc|2embed|upcloud|megacloud/i, "An unlicensed streaming backend was bundled");
assert.match(app, /function streamSources/, "The player does not normalize primary and backup streams");
assert.match(app, /function handlePlaybackError/, "The player cannot fail over after a source error");
assert.match(app, /startPlayerSource\(activeMediaIndex \+ 1, resumeAt\)/, "Playback errors do not switch to the backup source");
assert.match(app, /activeDirectMediaIndex !== activeMediaIndex[\s\S]*?video\.src = activeMediaSources\[activeMediaIndex\]/,
  "A host that blocks service-worker media streaming must retry its trusted open-film URL directly");
assert.match(app, /title: "Open films"/, "Playable films are not surfaced in the new UI");
assert.match(app, /requestFullscreen/, "The player has no fullscreen support");
assert.match(html, /data-retry-player/, "The player has no visible retry action");
assert.match(html, /data-fullscreen-player/, "The player has no fullscreen button");
assert.match(html, /data-pip/, "The player has no picture-in-picture button");

console.log("NEO Stream playback, failover, and player controls checks passed.");
