const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('neo-os/index.html');
const script = read('neo-os/neo-taskbar-quick-settings.js');
const css = read('neo-os/neo-taskbar-quick-settings.css');

new vm.Script(script, { filename: 'neo-taskbar-quick-settings.js' });
assert.match(html, /id="taskbar-quick-settings"/);
assert.match(html, /data-taskbar-quick-toggle/);
assert.match(html, /data-taskbar-quick-volume/);
assert.match(html, /data-taskbar-quick-brightness/);
assert.match(html, /data-taskbar-quick-battery/);
assert.match(script, /NEO_SYSTEM_BRIDGE\.set\(\{ volume: value, muted: false \}\)/);
assert.match(script, /NEO_SYSTEM_BRIDGE\.set\(\{ brightness: value \}\)/);
assert.match(script, /NEO_SHELL\.setSetting\("batterySaver", saver\)/);
assert.match(css, /data-taskbar-position="left"/);
assert.match(css, /data-taskbar-position="right"/);
assert.match(css, /data-taskbar-position="top"/);
assert.match(css, /var\(--desktop-accent/);
assert.match(css, /\.taskbar-quick-settings\s*\{[\s\S]*?display:\s*grid;[\s\S]*?gap:\s*12px;/, 'Quick settings sections do not share one spacing grid');
assert.match(css, /\.taskbar-quick-grid > button\s*\{[\s\S]*?grid-template-columns:\s*24px minmax\(0, 1fr\);/, 'Quick setting tiles do not share aligned icon and copy columns');
assert.match(css, /\.taskbar-quick-sliders label\s*\{[\s\S]*?grid-template-columns:\s*20px minmax\(0, 1fr\) 38px;[\s\S]*?gap:\s*10px;/, 'Quick setting sliders do not share aligned columns');

console.log('Taskbar quick settings checks passed.');
