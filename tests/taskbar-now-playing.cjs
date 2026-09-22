const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'neo-os', 'index.html'), 'utf8');
const shell = fs.readFileSync(path.join(root, 'neo-os', 'neo-os.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'neo-os', 'neo-taskbar-now-playing.css'), 'utf8');

assert.match(html, /neo-taskbar-now-playing\.css\?v=20260919-compact-player-v1/);
assert.match(html, /class="taskbar-now-playing" data-taskbar-now-playing/);
assert.match(html, /data-taskbar-now-playing-cover/);
assert.match(html, /data-now-playing-action="previous"/);
assert.match(html, /data-taskbar-now-playing-toggle/);
assert.match(html, /data-now-playing-action="next"/);
assert.match(html, /data-taskbar-now-playing-volume/);
assert.match(shell, /function renderTaskbarNowPlaying\(\)/);
assert.match(shell, /function setTaskbarNowPlayingVisible\(visible\)/);
assert.match(shell, /renderTaskbarNowPlaying\(\);[\s\S]*?syncGameNowPlayingOverlay\(\)/);
assert.match(shell, /taskbarVolumeBeforeMute/);
assert.match(css, /\.taskbar-now-playing\.is-visible/);
assert.match(css, /data-taskbar-position="left"\] \.taskbar-now-playing/);
assert.match(css, /data-taskbar-style="figure"\] \.taskbar-now-playing/);
assert.match(css, /prefers-reduced-motion: reduce/);

new Function(shell);
console.log('Taskbar now-playing card contract passed.');
