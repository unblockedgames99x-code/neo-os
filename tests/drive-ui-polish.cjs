const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const files = read('neo-os', 'neo-files.js');
const styles = read('neo-os', 'neo-files.css');
const shell = read('neo-os', 'neo-os.js');

assert.match(files, /files-brand"><img src="\.\/assets\/google-drive\.svg"[\s\S]*?<strong>Drive<\/strong>/);
assert.match(files, /placeholder="Search in Drive"/);
assert.match(files, /data-files-location="root"[\s\S]*?<span>My Drive<\/span>/);
assert.match(files, /data-files-import>[\s\S]*?<span>Upload<\/span>/);
assert.match(files, /data-files-new-folder>[\s\S]*?<span>New folder<\/span>/);
assert.doesNotMatch(files, /File Explorer/);
assert.doesNotMatch(files, /<span>Home<\/span>/);
assert.match(files, /formatBytes\(bytes\) \+ " used"/);

assert.match(styles, /--drive-bg: var\(--desktop-bg/);
assert.match(styles, /--drive-control: var\(--neo-theme-control/);
assert.match(styles, /--drive-text: var\(--desktop-text/);
assert.match(styles, /\.files-new > summary[\s\S]*?background: var\(--drive-control\)[\s\S]*?border: 1px solid var\(--desktop-line/);
assert.match(styles, /\.files-search[\s\S]*?background: var\(--drive-control\)[\s\S]*?border-radius: 14px/);
assert.match(styles, /\.files-main[\s\S]*?border: 1px solid var\(--desktop-line[\s\S]*?border-radius: 16px/);
assert.match(styles, /\.files-item-copy strong \{[\s\S]*?font-size: 13px/);
assert.match(styles, /\.files-locations button \{[\s\S]*?font-size: 13px/);
assert.match(styles, /\.files-main:has\(\+ \.files-inspector:not\(\.is-empty\)\)/);
assert.match(styles, /@container neo-files \(max-width: 900px\)[\s\S]*?\.files-main:has/);

assert.match(shell, /neo-files\.css\?v=20260907-drive-polish-v1/);
assert.match(shell, /neo-files\.js\?v=20260907-drive-polish-v1/);

console.log('Drive UI consistency and polish checks passed.');
