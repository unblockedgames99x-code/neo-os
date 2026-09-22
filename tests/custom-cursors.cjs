const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const shell = read('neo-os/neo-os.js');
const desktop = read('neo-os/neo-desktop-platform.js');
const styles = read('neo-os/neo-custom-cursors.css');
const index = read('neo-os/index.html');

for (const theme of ['neo', 'neon', 'pixel', 'contrast']) {
  for (const shape of ['arrow', 'pointer']) {
    const file = path.join(root, 'neo-os/assets/cursors', `${theme}-${shape}.svg`);
    assert.ok(fs.existsSync(file), `${theme}-${shape}.svg is missing`);
    assert.ok(fs.statSync(file).size > 200, `${theme}-${shape}.svg is empty`);
  }
  assert.match(styles, new RegExp(`data-cursor-theme="${theme}"`));
  assert.match(desktop, new RegExp(`id:'${theme}'`));
}

assert.match(shell, /cursorTheme: "system"/);
assert.match(shell, /function normalizeCursorTheme\(value\)/);
assert.match(shell, /root\.dataset\.cursorTheme = settings\.cursorTheme/);
assert.match(shell, /function applyCursorThemeToFrame\(frame\)/);
assert.match(shell, /neo-custom-cursors/);
assert.match(shell, /type: "neo-shell:cursor-theme"/);
assert.match(shell, /neo-cursor-theme-change/);
assert.match(shell, /applyCursorThemeToFrame\(frame\)/);

assert.match(desktop, /function cursorThemeEditor\(parent\)/);
assert.match(desktop, /cursorThemeEditor\(app\)/);
assert.match(desktop, /data-cursor-theme-change|neo-cursor-theme-change/);
assert.match(desktop, /Use '\+theme\.label\+' cursor/);

assert.match(styles, /var\(--neo-cursor-arrow\)/);
assert.match(styles, /var\(--neo-cursor-pointer\)/);
assert.match(styles, /\[contenteditable="true"\]/);
assert.match(styles, /cursor: text !important/);
assert.match(styles, /@media \(hover: none\), \(pointer: coarse\)/);
assert.match(styles, /\.cursor-theme-choice/);

assert.match(index, /neo-custom-cursors\.css\?v=20260909-custom-cursors-v1/);
assert.match(index, /neo-desktop-platform\.js\?[^"']*cursor=custom-v1/);
assert.match(index, /neo-os\.js\?[^"']*cursor=custom-v1/);

console.log('Custom cursor assets, controls, persistence, and app propagation checks passed.');
