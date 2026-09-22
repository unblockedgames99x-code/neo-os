const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "neo-os");
const shell = fs.readFileSync(path.join(root, "neo-os.js"), "utf8");
const engine = fs.readFileSync(path.join(root, "neo-wallpaper-engine.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

assert.match(shell, /designVersion:\s*24/);
assert.match(shell, /autoPerformanceMode:\s*false/);
assert.match(shell, /savedDesignVersion < 17[\s\S]*?savedSettings\.autoPerformanceMode = false/);
assert.match(html, /data-setting="autoPerformanceMode"\s*\/>/);
assert.doesNotMatch(html, /data-setting="autoPerformanceMode"\s+checked/);
assert.match(engine, /document\.addEventListener\("visibilitychange", resumePlayback\)/);
assert.match(engine, /window\.addEventListener\("focus", resumePlayback\)/);
assert.match(engine, /window\.addEventListener\("pageshow", resumePlayback\)/);
assert.match(engine, /recoveredFromStabilityPause = stabilityPaused/);
assert.match(html, /neo-wallpaper-engine\.js\?v=20260910-auto-resume-v2/);

console.log("Wallpaper automatic resume checks passed.");
