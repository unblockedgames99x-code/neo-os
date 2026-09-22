const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');

const index = read('neo-os', 'index.html');
const shell = read('neo-os', 'neo-os.js');
const bridge = read('neo-os', 'neo-app-theme.js');
const settings = read('neo-os', 'neo-desktop-platform.js');
const styles = read('neo-os', 'neo-interface-styles.css');

assert.match(settings, /\{id:'windows11',label:'Windows 11',description:'Centered taskbar and Fluent acrylic'\}/);
assert.match(index, /saved\.interfaceStyle === "windows11"/);
assert.match(shell, /value === "retro" \|\| value === "windows11" \|\| value === "kali" \? value : "modern"/);
assert.match(bridge, /value === 'retro' \|\| value === 'windows11' \|\| value === 'kali' \? value : 'modern'/);
assert.match(styles, /\.interface-style-preview\.is-windows11/);
assert.match(styles, /html\[data-interface-style="windows11"\]\[data-taskbar-position\] \.taskbar/);
assert.match(styles, /html\[data-interface-style="windows11"\] \.app-launcher/);
assert.match(styles, /html\[data-interface-style="windows11"\]\[data-taskbar-position\] \.app-launcher\.is-open \{[\s\S]*?translateX\(-50%\)/);
assert.match(styles, /html\[data-interface-style="windows11"\]\[data-taskbar-position\] \.app-launcher:not\(\.is-open\) \{[\s\S]*?translateX\(-50%\)/);
assert.match(styles, /"Segoe UI Variable Text"/);
assert.match(styles, /--win11-acrylic/);
assert.ok(
  index.indexOf('neo-interface-styles.css?v=20260919-rounded-restored-windows-v1') > index.indexOf('neo-taskbar-quick-settings.css'),
  'The interface style sheet must load last so Windows 11 chrome wins over taskbar and flyout defaults.'
);

console.log('Windows 11 interface style checks passed.');
