const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const html = read('neo-os/index.html');
const shell = read('neo-os/neo-os.js');
const desktop = read('neo-os/neo-desktop-platform.js');
const features = read('neo-os/neo-os-features.js');
const css = read('neo-os/neo-os.css');

for (const setting of ['desktopSystemWidget', 'desktopActiveAppWidget', 'desktopNowPlayingWidget']) {
  assert.match(shell, new RegExp(`${setting}: false`), `${setting} should be off by default`);
  assert.match(html, new RegExp(`data-setting="${setting}"`), `${setting} should have a Settings toggle`);
  assert.match(desktop, new RegExp(`setting:'${setting}'`), `${setting} should have a Widgets app toggle`);
  assert.match(features, new RegExp(`"${setting}"`), `${setting} should be available from the desktop Widgets menu`);
}

assert.match(html, /data-desktop-system-widget="false"/);
assert.match(html, /data-desktop-active-app-widget="false"/);
assert.match(html, /data-desktop-now-playing-widget="false"/);
assert.match(css, /data-desktop-system-widget="false"[^}]*data-widget="system"/s);
assert.match(css, /data-desktop-active-app-widget="false"[^}]*data-widget="activity"/s);
assert.match(css, /data-desktop-now-playing-widget="false"[^}]*data-widget="now-playing"/s);
assert.match(desktop, /role','switch'/);
assert.match(shell, /neo-status-widgets-change/);

console.log('Desktop status widgets are independently toggleable and off by default.');
