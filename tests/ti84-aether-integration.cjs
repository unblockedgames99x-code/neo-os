const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const config = read('neo-os/neo-games/config.js');
const games = read('neo-os/neo-games/app.js');
const html = read('neo-os/neo-games/index.html');
const wisp = read('neo-os/nextnode-browser/wisp-settings.js');
const shell = read('neo-os/index.html');

assert.match(config, /base:\s*"https:\/\/gn-local\.booksforschool\.online\/"/, 'Aether library host is not configured');
assert.match(config, /catalog:\s*"offline\/catalog\.json"/, 'Aether catalog path is not configured');
assert.match(config, /expectedCount:\s*825/, 'Aether catalog size is undocumented');
assert.match(games, /async function loadAetherCatalog\(\)/, 'Steam does not load the Aether catalog');
assert.match(games, /window\.NEO_PROXY_CLIENT\.fetch\.bind/, 'Aether catalog requests do not use the OS proxy');
assert.match(games, /window\.NEO_PROXY_CLIENT\.image\(game\.image\)/, 'Aether cover requests do not use the OS proxy');
assert.match(games, /window\.NEO_PROXY_CLIENT\.resolve\(game\.launchUrl, "game"\)/, 'Aether games do not launch through the OS proxy');
assert.match(games, /state\.fernTotal \+ aetherMatches\.length/, 'Fern and Aether totals are not merged');
assert.match(html, /FERN \+ AETHER/, 'Steam does not identify both live catalogs');

const relays = [
  'wss://w2.qwq.sh/ws/',
  'wss://api.personalloanonline.net/ws/',
  'wss://www.goldenbasketballacademy.space/ws/',
  'wss://www.atlantaclassical.info/ws/',
  'wss://www.booksforschool.online/ws/',
];
for (const relay of relays) {
  assert.ok(wisp.includes(relay), `${relay} is missing from the Browser server menu`);
  const origin = new URL(relay).origin.replace('https:', 'wss:');
  assert.ok(shell.includes(origin), `${origin} is missing from the shell CSP`);
}
assert.match(wisp, /<option value="custom">Custom\.\.\.<\/option>/, 'The custom relay option was removed');

console.log('TI-84 Aether relays and full live game catalog integration passed.');
