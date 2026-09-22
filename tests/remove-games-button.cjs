const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const shell = read('neo-os', 'neo-os.js');
const html = read('neo-os', 'index.html');

new vm.Script(shell, { filename: 'neo-os.js' });

assert.doesNotMatch(shell, /\bzones:\s*\{|id:\s*"zones"|app\.id === "zones"/);
assert.doesNotMatch(html, /data-app="zones"/);
assert.match(shell, /writeJson\(PINNED_APPS_KEY, pinnedAppOrder\)/);
assert.match(html, /neo-os\.js\?v=[^"']+/);

console.log('Games button removal checks passed.');
