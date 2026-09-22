const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const index = read('neo-os', 'index.html');
const shell = read('neo-os', 'neo-os.js');
const bridge = read('neo-os', 'neo-app-theme.js');
const settings = read('neo-os', 'neo-desktop-platform.js');
const interfaceStyles = read('neo-os', 'neo-interface-styles.css');
const optimizer = read('scripts', 'optimize-neo-shell.cjs');

assert.match(settings, /\{id:'kali',label:'Kali Linux',description:'Dark security workstation interface'\}/);
assert.match(index, /saved\.interfaceStyle === "kali"/);
assert.match(shell, /value === "retro" \|\| value === "windows11" \|\| value === "kali"/);
assert.match(bridge, /value === 'retro' \|\| value === 'windows11' \|\| value === 'kali'/);
assert.match(interfaceStyles, /\.interface-style-preview\.is-kali/);
assert.match(interfaceStyles, /html\[data-interface-style="kali"\] \.neo-window/);
assert.match(interfaceStyles, /html\[data-interface-style="kali"\]\[data-taskbar-position\] \.taskbar/);
assert.match(interfaceStyles, /html\[data-interface-style="kali"\] \.app-launcher/);
assert.match(interfaceStyles, /html\[data-interface-style="kali"\] \.neo-window\[data-app-id="terminal"\]/);
assert.match(interfaceStyles, /--kali-cyan:\s*#00d5ff/);
assert.match(optimizer, /data-neo-interface-style-css="kali"/);
assert.match(optimizer, /emit\('neo-interface-kali'/);

assert.match(shell, /var CUSTOM_CURSOR_MAX_BYTES = 2 \* 1024 \* 1024/);
assert.match(settings, /file\.size>2\*1024\*1024/);

console.log('Kali style and larger cursor import checks passed.');
