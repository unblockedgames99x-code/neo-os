const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const shell = fs.readFileSync(path.join(root, "neo-os", "neo-os.js"), "utf8");
const index = fs.readFileSync(path.join(root, "neo-os", "index.html"), "utf8");

assert.match(shell, /function syncWallpaperMediaPriority\(\)[\s\S]*?setMediaPriority\(mediaPrioritySources\.size > 0\)/);
assert.match(shell, /function releaseWindowMediaPriority\(id\)[\s\S]*?mediaPrioritySources\.delete\("intent:route-focus:" \+ appId\)[\s\S]*?mediaPrioritySources\.delete\("play:route-media:" \+ appId\)[\s\S]*?syncWallpaperMediaPriority\(\)/);
assert.match(shell, /function closeWindow\(win, forceDestroy\)[\s\S]*?stopWindowMedia\(win, id\)[\s\S]*?releaseWindowMediaPriority\(id\)[\s\S]*?playWindowMotion\(win, "closing"/);
assert.match(index, /neo-os\.js[^"\n]*wallpaper=resume-v2/);

console.log("YouTube wallpaper resume checks passed.");
