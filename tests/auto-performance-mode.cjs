const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const index = read("neo-os", "index.html");
const shell = read("neo-os", "neo-os.js");
const wallpaper = read("neo-os", "neo-wallpaper-engine.js");
const styles = read("neo-os", "neo-performance.css");

assert.match(index, /data-auto-performance-active="false"/);
assert.match(index, /data-setting="autoPerformanceMode"\s*\/>/);
assert.doesNotMatch(index, /data-setting="autoPerformanceMode"\s+checked/);
assert.match(index, /Pause and hide wallpaper effects while an app or game is open/);
assert.match(shell, /autoPerformanceMode: false/);
assert.match(shell, /savedDesignVersion < 17[\s\S]*?savedSettings\.autoPerformanceMode = false/);
assert.match(shell, /function foregroundAppOpen\(\)[\s\S]*?is-minimized[\s\S]*?is-minimizing[\s\S]*?is-closing/);
assert.match(shell, /function syncAutoPerformanceMode\(\)[\s\S]*?settings\.autoPerformanceMode && foregroundAppOpen\(\)[\s\S]*?setAutoPerformance\(next\)/);
assert.match(shell, /openWindows\.set\(app\.id, win\);\s+syncAutoPerformanceMode\(\)/);
assert.match(shell, /openWindows\.delete\(id\);\s+syncAutoPerformanceMode\(\)/);
assert.match(shell, /function setWindowMinimized[\s\S]*?syncAutoPerformanceMode\(\)/);
assert.match(wallpaper, /function setAutoPerformance\(active\)[\s\S]*?syncPlayback\(\)/);
assert.match(wallpaper, /mediaPriorityPaused \|\| autoPerformancePaused \|\| runtimeSettings\.wallpaperPaused/);
assert.match(styles, /html\[data-auto-performance-active="true"\] \.wallpaper/);
assert.match(styles, /html\[data-auto-performance-active="true"\] \.widget-layer/);
assert.match(styles, /html\[data-auto-performance-active="true"\] \.neo-taskbar-preview/);

console.log("Auto performance mode checks passed.");
