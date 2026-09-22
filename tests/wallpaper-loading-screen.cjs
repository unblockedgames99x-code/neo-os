const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const index = fs.readFileSync(path.join(root, "neo-os", "index.html"), "utf8");
const engine = fs.readFileSync(path.join(root, "neo-os", "neo-wallpaper-engine.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "neo-os", "neo-wallpaper-engine.css"), "utf8");

assert.match(index, /id="wallpaper-loading"[^>]+data-wallpaper-loading/);
assert.match(index, /Loading wallpaper/);
assert.match(index, /Preparing video/);
assert.match(index, /neo-wallpaper-engine\.css\?v=20260912-wallpaper-loading-outline-v2/);
assert.match(index, /<script\b[^>]*src="\.\/neo-wallpaper-engine\.js\?[^\"]+"[^>]*\bdefer\b/);
assert.match(index, /loading=failsafe-v1/);

assert.match(styles, /\.wallpaper-loading\.is-visible/);
assert.match(styles, /\.wallpaper-loading-logo\s*\{[\s\S]*?border:\s*0\s*;/);
assert.match(styles, /\.wallpaper-loading-spinner/);
assert.match(styles, /@keyframes wallpaperLoadingSpin/);
assert.match(styles, /data-performance-mode="ultimate"[^\n]+\.wallpaper-loading/);

assert.match(engine, /function setLoadingScreen\(visible\)/);
assert.match(engine, /WALLPAPER_LOADING_LIMIT = 5000/);
assert.match(engine, /emit\("loading-timeout"\)/);
assert.match(engine, /youtubeData\.event === "onStateChange"/);
assert.match(engine, /youtubeState === 1/);
assert.match(engine, /event: "listening", id: "neo-wallpaper"/);
assert.match(engine, /media\.addEventListener\("waiting"/);
assert.match(engine, /media\.addEventListener\("playing", playing\)/);
assert.match(engine, /prepareAssetMedia only resolves after a displayable frame exists[\s\S]*?setLoadingScreen\(false\)/);
assert.match(engine, /media\.addEventListener\("pause"[\s\S]*?setLoadingScreen\(false\)/);
assert.match(engine, /setLoadingScreen\(false\)/);

console.log("Wallpaper loading-screen checks passed.");
