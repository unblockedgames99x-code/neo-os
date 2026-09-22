const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const engine = fs.readFileSync(path.join(root, "neo-os", "neo-wallpaper-engine.js"), "utf8");
const index = fs.readFileSync(path.join(root, "neo-os", "index.html"), "utf8");

assert.match(engine, /var YOUTUBE_CHROME_CROP = 96;/);
assert.match(engine, /var YOUTUBE_CLEAN_REVEAL_DELAY = 4200;/);
assert.match(engine, /media\.classList\.contains\("wallpaper-youtube-asset"\)/);
assert.match(engine, /cleanYouTubeFrame \? "-" \+ YOUTUBE_CHROME_CROP \+ "px 0" : "0"/);
assert.match(engine, /"calc\(100% \+ " \+ \(YOUTUBE_CHROME_CROP \* 2\) \+ "px\)"/);

assert.match(engine, /youtube-nocookie\.com\/embed\//);
assert.match(engine, /controls=0/);
assert.match(engine, /disablekb=1/);
assert.match(engine, /fs=0/);
assert.match(engine, /iv_load_policy=3/);
assert.match(engine, /rel=0/);
assert.doesNotMatch(engine, /modestbranding=/);

assert.match(engine, /activeMedia\.dataset\.youtubeCleanReveal !== "ready"/);
assert.match(engine, /var showPreview = paused \|\| document\.hidden \|\| waitingForCleanReveal;/);
assert.match(engine, /activeMedia\.style\.visibility = showPreview \? "hidden" : "visible";/);
assert.match(engine, /media\.setAttribute\("aria-hidden", "true"\)/);
assert.match(engine, /media\.setAttribute\("inert", ""\)/);
assert.match(engine, /media\.setAttribute\("scrolling", "no"\)/);
assert.match(engine, /media\.dataset\.youtubeCleanReveal = "waiting";/);
assert.match(engine, /media\.dataset\.youtubeCleanReveal = "ready";/);
assert.doesNotMatch(engine, /media\.setAttribute\("allowfullscreen"/);

assert.match(index, /neo-wallpaper-engine\.js\?v=[^"']+/);

console.log("YouTube wallpaper clean-frame checks passed.");
