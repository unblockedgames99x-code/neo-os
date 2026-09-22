const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const css = read('neo-os/neo-liquid-scrollbars.css');

assert.match(css, /--neo-scrollbar-thumb-hover:/);
assert.match(css, /::-webkit-scrollbar-track/);
assert.match(css, /::-webkit-scrollbar-thumb:hover/);
assert.match(css, /::-webkit-scrollbar-thumb:active/);
assert.match(css, /::-webkit-scrollbar-corner/);
assert.match(css, /scrollbar-color: var\(--neo-scrollbar-thumb\) transparent/);
assert.match(css, /\.window-body:has\(> \.desktop-app\)/);
assert.match(css, /\.native-app:not\(\.neo-messages, \.wallpaper-studio, \.neo-library\)/);
assert.match(css, /overflow-y: auto/);
assert.match(css, /\.neo-utility/);
assert.match(css, /\.desktop-palette, \.feature-dialog/);
assert.match(css, /scrollbar-gutter: stable/);

const pages = [
  'neo-os/index.html',
  'neo-os/browser-newtab.html',
  'neo-os/music-local/index.html',
  'neo-os/music-v2/index.html',
  'neo-os/local-browser/index.html',
  'neo-os/neo-tv/index.html',
  'neo-os/neo-cloud/index.html',
  'neo-os/NEO-BROWSER/index.html'
];

for (const page of pages) {
  const html = read(page);
  assert.match(html, /neo-liquid-scrollbars\.css\?v=20260907-scroll-containers-v2/, `${page} does not load the shared scrollbar finish`);
}

console.log('Liquid-glass scrollbar checks passed.');
