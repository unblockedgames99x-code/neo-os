const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const index = read("neo-os", "index.html");
const shell = read("neo-os", "neo-os.js");
const wallpaper = read("neo-os", "neo-wallpaper-engine.js");
const quality = read("neo-os", "neo-wallpaper-quality.js");
const previews = read("neo-os", "neo-taskbar-preview.js");
const styles = read("neo-os", "neo-performance.css");
const musicBridge = read("neo-os", "music-v3", "neo-os-bridge.js");
const browserShell = read("neo-os", "browser-runtime", "client-shell.js");
const features = read("neo-os", "neo-os-features.js");

assert.match(index, /data-performance-mode="normal"/);
assert.match(index, /data-performance-mode-button="normal"/);
assert.match(index, /data-performance-mode-button="performance"/);
assert.match(index, /data-performance-mode-button="ultimate"/);
assert.match(index, /neo-performance\.css\?v=20260910-taskbar-previews-v2/);
assert.doesNotMatch(index, /rel="prefetch" href="\.\/NEO-BROWSER/);
assert.doesNotMatch(index, /rel="prefetch" href="\.\.\/games\/web-dashers/);

assert.match(shell, /performanceMode: "normal"/);
assert.match(shell, /savedSettings\.performance === "low" \? "performance" : "normal"/);
assert.match(shell, /root\.dataset\.performanceMode = mode/);
assert.match(shell, /wallpaperPaused: settings\.wallpaperPaused \|\| mode !== "normal"/);
assert.match(shell, /if \(performanceActive\(\) \|\| browsePrewarmScheduled \|\| window\.NEO_BROWSER_ENGINE\) return;\s+if \(!\("serviceWorker" in navigator\)/);
assert.match(shell, /if \(mode === "normal"\) scheduleBrowsePrewarm\(\)/);
assert.match(shell, /performanceActive\(\) \|\| browsePrewarmScheduled \|\| window\.NEO_BROWSER_ENGINE/);
assert.match(shell, /window\.dispatchEvent\(new CustomEvent\("neo-performance-mode-change"/);
assert.match(shell, /if \(performanceMode\(\) === "ultimate"\) \{\s+if \(apps\.control/);
assert.match(shell, /if \(performanceMode\(\) !== "normal"\) \{\s+if \(weatherResizeObserver\)/);

assert.match(wallpaper, /function mountPerformanceStill\(/);
assert.match(wallpaper, /performanceMode\(\) === "ultimate"/);
assert.match(wallpaper, /wallpaper-performance-still/);
assert.match(wallpaper, /canvasFrame = 0;\s+return;/);
assert.match(wallpaper, /webFallbackFrame = 0;\s+root\.dataset\.wallpaperPlayback = "paused"/);
assert.match(wallpaper, /canvasResume = function \(\)/);
assert.match(wallpaper, /if \(!canvasFrame && activeMedia === canvas/);
assert.match(wallpaper, /suspendedKey === nextSuspendedKey/);

assert.match(quality, /function enhancementEnabled\(/);
assert.match(quality, /WEBGL_lose_context/);
assert.match(quality, /data-performance-mode/);
assert.match(previews, /function previewsEnabled\(/);
assert.match(previews, /function previewSnapshotsEnabled\(/);
assert.match(previews, /fullscreenActive\(\) \|\| !previewsEnabled\(\)/);
assert.doesNotMatch(styles, /data-performance-mode="(?:performance|ultimate)"[^\n]*\.neo-taskbar-preview[^\{]*\{\s*display:\s*none/);

assert.match(styles, /html\[data-performance-mode="ultimate"\] \.wallpaper/);
assert.match(styles, /html\[data-performance-mode="ultimate"\] \.taskbar/);
assert.match(styles, /pointer-events: auto !important/);
assert.match(styles, /animation: none !important/);
assert.match(styles, /backdrop-filter: none !important/);

assert.match(musicBridge, /levelTimer = performanceMode === "normal"/);
assert.match(musicBridge, /performanceMode === "normal" && state\.playing/);
assert.match(musicBridge, /neo-shell:performance-mode/);
assert.match(browserShell, /function mediaVisualsEnabled\(/);
assert.match(browserShell, /media\.ended \|\| !mediaVisualsEnabled\(\)/);
assert.match(browserShell, /neo-shell:performance-mode/);
assert.doesNotMatch(features, /var watchTimer = window\.setInterval\(updateStopwatch, 40\)/);
assert.match(features, /watchTimer = window\.setInterval\(updateStopwatch, 40\)/);

console.log("Performance mode checks passed.");
