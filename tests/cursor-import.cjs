const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');

const platform = read('neo-os', 'neo-desktop-platform.js');
const shell = read('neo-os', 'neo-os.js');
const styles = read('neo-os', 'neo-custom-cursors.css');
const index = read('neo-os', 'index.html');

assert.match(platform, /picker\.accept='\.png,\.cur,\.ico,image\/png,image\/x-icon,image\/vnd\.microsoft\.icon'/);
assert.match(platform, /file\.size>2\*1024\*1024/);
assert.match(platform, /meta\.width>128\|\|meta\.height>128/);
assert.match(platform, /function cursorMetadata\(file,bytes\)/);
assert.match(platform, /shell\.setCustomCursor\(data,file\.name\)/);
assert.match(platform, /shell\.clearCustomCursor\(\)/);
assert.match(shell, /var CUSTOM_CURSOR_MAX_BYTES = 2 \* 1024 \* 1024/);
assert.match(shell, /function isValidCustomCursorData\(value\)/);
assert.match(shell, /cursorTheme: "system",\s+customCursorData: "",\s+customCursorName: ""/);
assert.match(shell, /setCustomCursor: setCustomCursor/);
assert.match(shell, /clearCustomCursor: clearCustomCursor/);
assert.match(styles, /html\[data-cursor-theme="custom"\]/);
assert.match(styles, /--neo-cursor-arrow: var\(--neo-custom-cursor-arrow, auto\)/);
assert.match(index, /neo-custom-cursors\.css\?v=20260912-import-cursor-v1/);

console.log('Cursor import checks passed.');
