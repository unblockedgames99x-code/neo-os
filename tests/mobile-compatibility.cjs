const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");

const shellHtml = read("neo-os/index.html");
const shellCss = read("neo-os/neo-mobile.css");
const shellMobile = read("neo-os/neo-mobile.js");
const shell = read("neo-os/neo-os.js");
const resize = read("neo-os/neo-window-resize.js");
const filesJs = read("neo-os/neo-files.js");
const filesCss = read("neo-os/neo-files.css");
const browserHtml = read("neo-os/NEO-BROWSER/index.html");
const browserCss = read("neo-os/NEO-BROWSER/assets/mobile.css");
const musicHtml = read("neo-os/music-v3/index.html");
const musicCss = read("neo-os/music-v3/neo-mobile.css");
const tvHtml = read("neo-os/neo-tv/index.html");
const tvCss = read("neo-os/neo-tv/app.css");
const tvJs = read("neo-os/neo-tv/app.js");
const cloudHtml = read("neo-os/neo-cloud/index.html");
const cloudCss = read("neo-os/neo-cloud/styles.css");
const cloudJs = read("neo-os/neo-cloud/app.js");
const wallpaperCss = read("neo-os/neo-wallpaper-engine.css");

for (const [name, source] of [
  ["neo-mobile.js", shellMobile],
  ["neo-os.js", shell],
  ["neo-window-resize.js", resize],
  ["neo-files.js", filesJs],
  ["neo-tv.js", tvJs],
  ["neo-cloud/app.js", cloudJs]
]) new vm.Script(source, { filename: name });

for (const [name, html] of [
  ["shell", shellHtml],
  ["browser", browserHtml],
  ["music", musicHtml],
  ["TV", tvHtml],
  ["cloud", cloudHtml]
]) assert.match(html, /interactive-widget=resizes-content/, `${name} must follow the mobile visual viewport`);

assert.match(shellHtml, /neo-mobile\.css\?v=20260901-mobile-compat-v4/);
assert.match(shellHtml, /<script\b[^>]*src="\.\/neo-mobile\.js\?[^\"]+"[^>]*\bdefer\b/);
assert.match(shellHtml, /neo-wallpaper-engine\.css\?v=20260912-wallpaper-loading-outline-v2/);
assert.match(shellHtml, /<script\b[^>]*src="\.\/neo-os\.js\?[^\"]+"[^>]*\bdefer\b/);
assert.match(shellHtml, /neo-window-resize\.js\?v=20260901-mobile-compat-v1/);
assert.match(shellHtml, /data-mobile-desktop-menu/);
assert.match(shellHtml, /mobile-notification-toggle[^>]+data-notification-toggle/);
assert.match(shellMobile, /window\.visualViewport\.addEventListener\("resize"/);
assert.match(shellMobile, /MouseEvent\("contextmenu"/);
assert.match(shellMobile, /item\.draggable\s*=\s*false/);
assert.match(shell, /button\.setPointerCapture\(event\.pointerId\)/);
assert.match(shellCss, /\(pointer:\s*coarse\)\s*and\s*\(max-width:\s*1366px\)/);
assert.match(shellCss, /env\(safe-area-inset-bottom\)/);
assert.match(shellCss, /data-mobile-keyboard="true"[\s\S]*?\.taskbar/);
assert.match(shellCss, /\.window-resize-handle[\s\S]*?display:\s*none\s*!important/);

assert.match(shell, /drag\.pointerType === "touch" \|\| drag\.pointerType === "pen"[\s\S]*?openDesktopShortcut\(drag\.button\)/);
assert.match(shell, /desktopShortcutSuppressOpenUntil = Date\.now\(\) \+ 500/);
assert.match(shell, /Date\.now\(\) < desktopShortcutSuppressOpenUntil/);
assert.match(shell, /scrollLeft[\s\S]*?requestAnimationFrame/);
assert.match(shell, /function mountGameTouchControls\(/);
assert.match(shell, /data-game-arrow="38"\s+data-game-wasd="87"/);
assert.match(shell, /controls\.dataset\.moveMode\s*=\s*"arrow"/);
assert.match(shell, /new frameWindow\.KeyboardEvent/);
assert.match(shell, /neo-files\.css\?v=20260907-drive-polish-v1/);
assert.match(shell, /neo-files\.js\?v=20260907-drive-polish-v1/);
assert.match(shellCss, /\.mobile-game-controls\s*\{/);
assert.match(shellCss, /\.mobile-game-controls button[\s\S]*?touch-action:\s*none/);
assert.match(resize, /\(pointer:\s*coarse\)\s*and\s*\(max-width:\s*1366px\)/);

assert.match(filesJs, /itemHoldTimer\s*=\s*window\.setTimeout/);
assert.match(filesJs, /coarsePointer\.matches[\s\S]*?previewEntry\(mount, tappedEntry\)/);
assert.match(filesJs, /event\.key\s*===\s*"ContextMenu"/);
assert.match(filesCss, /Tap to open/);
assert.match(filesCss, /min-height:\s*44px/);
assert.ok(filesCss.lastIndexOf("@media (hover: none), (pointer: coarse)") > filesCss.lastIndexOf("@container neo-files"));

assert.match(browserHtml, /assets\/mobile\.css\?v=20260901-mobile-compat-v4/);
assert.match(browserCss, /\(pointer:\s*coarse\)\s*and\s*\(max-width:\s*1366px\)/);
assert.match(browserCss, /#back[\s\S]*?display:\s*(?:inline-)?(?:flex|grid)\s*!important/);
assert.match(browserCss, /font-size:\s*16px\s*!important/);
assert.match(browserCss, /#tutorialDots button[\s\S]*?min-width:\s*8px\s*!important/);

assert.match(musicHtml, /neo-mobile\.css\?v=20260901-mobile-compat-v4/);
assert.match(musicCss, /\.main-header\s*\{[\s\S]*?display:\s*grid\s*!important/);
assert.match(musicCss, /min-height:\s*44px/);
assert.match(musicCss, /max-height:\s*500px\)\s*and\s*\(max-width:\s*960px\)/);

assert.match(tvHtml, /<link\b[^>]*href="\.\/app\.css\?[^\"]+"/);
assert.match(tvCss, /\(pointer:\s*coarse\)\s*and\s*\(max-width:\s*1366px\)/);
assert.match(tvJs, /webkitSetPresentationMode/);
assert.match(tvJs, /webkitpresentationmodechanged/);
assert.match(tvCss, /env\(safe-area-inset-top\)/);

assert.match(cloudHtml, /data-stream-touch-controls/);
for (const code of [27, 32, 65, 68, 83, 87]) assert.match(cloudHtml, new RegExp(`data-touch-key="${code}"`));
assert.match(cloudJs, /elements\.touchControls\.addEventListener\("pointerdown"/);
assert.match(cloudJs, /elements\.video\.addEventListener\("pointerdown"/);
assert.match(cloudCss, /\.stream-stage video\s*\{\s*touch-action:\s*none/);
assert.doesNotMatch(cloudCss, /backdrop-filter/i);

assert.match(wallpaperCss, /@media\s*\(hover:\s*none\),\s*\(pointer:\s*coarse\)/);
assert.doesNotMatch(wallpaperCss, /\.studio-sort:last-child\s*\{\s*display:\s*none/);

console.log("NEO OS mobile compatibility checks passed across shell, Files, Browser, Music, TV, Cloud, and Wallpaper.");
