const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, "neo-os", file), "utf8");
const shell = read("neo-os.js");
const preview = read("neo-taskbar-preview.js");
const previewStyles = read("neo-taskbar-preview.css");
const interfaceStyles = read("neo-interface-styles.css");
const performanceStyles = read("neo-performance.css");
const renderStart = preview.indexOf("function renderWindow(");
const renderEnd = preview.indexOf("function renderMinimizedViewport(", renderStart);
const renderRuntime = preview.slice(renderStart, renderEnd);
const refreshStart = preview.indexOf("function refreshMinimizedTray()");
const refreshEnd = preview.indexOf("function createMinimizedTray()", refreshStart);
const refreshRuntime = preview.slice(refreshStart, refreshEnd);
const minimizedStart = shell.indexOf("function setWindowMinimized(win, minimized)");
const minimizedEnd = shell.indexOf("function syncMaximizeButton(win)", minimizedStart);
const minimizedRuntime = shell.slice(minimizedStart, minimizedEnd);

assert(minimizedStart >= 0 && minimizedEnd > minimizedStart, "minimized window state runtime must exist");
assert.match(minimizedRuntime, /win\.classList\.toggle\("is-minimized", minimized\)/, "the real window must retain minimized state");
assert.match(minimizedRuntime, /renderDock\(\)/, "the taskbar must immediately reflect restored and minimized apps");
assert.match(minimizedRuntime, /neo-window-state-change/, "the hover preview must be notified when window state changes");

assert.match(preview, /function previewsEnabled\(\)\s*\{[\s\S]*?return true;/, "hover previews must remain available in every performance mode");
assert.match(preview, /function previewSnapshotsEnabled\(\)\s*\{[\s\S]*?return true;/, "current-state snapshots must remain enabled");
assert.match(preview, /function staticPreview\(/, "a lightweight fallback must remain available when a snapshot cannot be captured");
assert.match(renderRuntime, /preview\.classList\.remove\("is-close-only"\)/, "hovering a taskbar app must restore the complete preview surface");
assert.match(renderRuntime, /liveWindowSnapshot\(win, viewport\)/, "taskbar hover must render the app current window state");
assert.match(renderRuntime, /snapshot \|\| staticPreview\(/, "taskbar hover must fall back safely if current state capture is unavailable");
assert.doesNotMatch(interfaceStyles, /\.neo-taskbar-preview\.is-close-only/, "legacy close-only sizing must not hide the current-state preview");

assert.match(preview, /function liveWindowSnapshot\(/, "the current-state snapshot renderer must exist");
assert.match(preview, /var clone = win\.cloneNode\(true\)/, "the current visual state must be captured without moving the real window");
assert.match(preview, /function syncLiveState\(/, "dynamic controls and media must be synchronized into the snapshot");
assert.match(preview, /source\.type !== "file"/, "file inputs must be skipped to avoid forbidden value assignment");
assert.match(preview, /tag === "canvas"/, "canvas content must be captured into the current-state snapshot");
assert.match(preview, /tag === "video"/, "the current video frame must be captured when the browser permits it");
assert.match(preview, /tag === "iframe"/, "same-origin framed apps must contribute their current state");
assert.match(preview, /frame\.setAttribute\("sandbox", ""\)/, "the preview snapshot must be isolated from the live shell");
assert.match(preview, /frame\.srcdoc = frameDocument/, "the isolated preview must receive the current serialized window state");
assert.match(previewStyles, /\.neo-taskbar-preview-snapshot\s*\{[\s\S]*?width:\s*100%;[\s\S]*?height:\s*100%;/, "the current-state snapshot must fill the preview viewport");

assert(refreshStart >= 0 && refreshEnd > refreshStart, "minimized tray refresh runtime must exist");
assert.match(refreshRuntime, /minimizedCardCache\.clear\(\)/, "legacy minimized cards must be cleared rather than rendered");
assert.match(refreshRuntime, /minimizedTray\.replaceChildren\(\)/, "no minimized preview content may remain mounted");
assert.match(refreshRuntime, /minimizedTray\.hidden = true/, "the persistent minimized preview tray must remain hidden");
assert.doesNotMatch(refreshRuntime, /createMinimizedCard\(/, "minimizing an app must not build a persistent preview card");
assert.match(interfaceStyles, /html\[data-interface-style\] \.neo-minimized-tray\s*\{[\s\S]*?display:\s*none !important;/, "interface themes must not re-enable minimized previews");
assert.doesNotMatch(performanceStyles, /\.neo-taskbar-preview[^\{]*\{\s*display:\s*none\s*!important/, "performance settings must not remove the taskbar hover preview");

assert.match(shell, /neo-now-playing-change/, "the shell must continue publishing sanitized now-playing state");
assert.match(previewStyles, /\.neo-minimized-card\.is-music-now-playing[\s\S]*?aspect-ratio:\s*1/, "legacy minimized music styling must remain coherent");

console.log("Taskbar hover shows the current isolated app state while minimized preview cards stay removed.");
