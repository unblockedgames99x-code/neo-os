const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const html = read('neo-os', 'neo-youtube', 'index.html');
const client = read('neo-os', 'neo-youtube', 'app.js');
const shell = read('neo-os', 'neo-os.js');
const shellStyles = read('neo-os', 'neo-os.css');
const shardBuilder = read('scripts', 'build-github-cdn-shards.cjs');

const frameSources = html.match(/\bframe-src\s+([^;\"]+)/)[1].trim().split(/\s+/);
for (const origin of ["'self'", 'https://www.youtube-nocookie.com', 'https://www.youtube.com']) {
  assert.ok(frameSources.includes(origin), `Missing frame permission: ${origin}`);
}
assert.match(client, /picture-in-picture; web-share/,
  'the official player must receive Picture-in-Picture permission');
assert.match(client, /allowFullscreen = true/);
assert.match(client, /enablejsapi/);
assert.match(html, /data-popout-video/,
  'the watch page must expose a pop-out control');
assert.match(html, /data-popout-short/,
  'Shorts must expose a pop-out control');
assert.match(html, /data-video-popout/,
  'the app must provide a persistent floating player surface');
assert.match(client, /function openPopout/);
assert.match(client, /function restorePopout/);
assert.match(client, /setPopoutPresentation\(true, state\.popoutMode\)/);
assert.match(client, /setPopoutPresentation\(false, mode\)/);
assert.match(client, /func: 'pauseVideo'/,
  'the player must pause when its desktop window is hidden');
assert.match(client, /func: 'playVideo'/,
  'the visible pop-out must explicitly resume the active video');
assert.match(client, /dataset\.neoPopoutPlaying = 'true'/,
  'the pop-out resume command must be observable');
assert.match(client, /neo-shell:visibility/);
assert.match(client, /neo-shell:media-state/);
assert.match(shell, /frame\.allow = "fullscreen; autoplay; picture-in-picture;/,
  'the desktop frame must delegate Picture-in-Picture');
assert.match(shell, /type: "neo-shell:visibility"/,
  'the shell must tell embedded media apps when they are minimized');
assert.match(shellStyles, /\.neo-window\.is-youtube-popout \[data-window-resize\]\s*\{\s*display:\s*block;/,
  'the pop-out must keep the desktop resize handles available');
assert.match(read('neo-os', 'neo-youtube', 'app.css'), /--yt-popout-chrome-crop:\s*0px/,
  'the pop-out must keep the embedded video flush with its 16:9 frame');
assert.doesNotMatch(shellStyles, /\.neo-window\.is-youtube-popout \[data-window-resize\][^{]*\{[^}]*display:\s*none/,
  'the pop-out must not hide its resize handles');
assert.match(shardBuilder, /source, 'neo-youtube'/,
  'the CDN core build must include the YouTube client');

console.log('YouTube official-player and desktop visibility contract passed.');
