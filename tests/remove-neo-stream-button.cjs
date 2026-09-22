const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const apps = read('neo-os', 'neo-apps.js');
const shell = read('neo-os', 'neo-os.js');
const config = read('neo-os', 'neo-local-config.js');
const games = read('neo-os', 'neo-games', 'index.html');
const html = read('neo-os', 'index.html');

new vm.Script(apps, { filename: 'neo-apps.js' });
new vm.Script(shell, { filename: 'neo-os.js' });
new vm.Script(config, { filename: 'neo-local-config.js' });

assert.doesNotMatch(apps, /id:\s*"cinehd"|title:\s*"NEO Stream"|neo_os_cinehd_app_v1/);
assert.doesNotMatch(shell, /"cinehd"|appId === "cinehd"/);
assert.doesNotMatch(config, /"cinehd"/);
assert.doesNotMatch(games, />NEO Stream</);
assert.match(html, /neo-apps\.js\?v=[^"']+/);

console.log('NEO Stream button removal checks passed.');
