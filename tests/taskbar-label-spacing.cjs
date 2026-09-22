const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'neo-os', 'neo-running-taskbar.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'neo-os', 'index.html'), 'utf8');

assert.match(html, /neo-running-taskbar\.css\?v=20260913-running-line-center-v4/);
assert.match(css, /html\[data-taskbar-position\] \.taskbar \.dock-button\s*\{[\s\S]*?column-gap:\s*10px !important/);
assert.match(css, /\.taskbar \.dock-app-name\s*\{[\s\S]*?align-self:\s*center;[\s\S]*?padding:\s*0 0 0 2px;/);
assert.match(css, /data-taskbar-app-names="false"[\s\S]*?column-gap:\s*0 !important/);
assert.match(css, /data-interface-style="retro"[\s\S]*?column-gap:\s*6px !important/);

console.log('Taskbar labels keep a visible, vertically centered gap from their icons.');
