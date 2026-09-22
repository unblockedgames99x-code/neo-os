const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const config = read('neo-os/neo-local-config.js');
const shell = read('neo-os/neo-os.js');
const server = read('local-preview.mjs');
const support = read('neo-os/local-browser/support.html');

for (const app of ['chat', 'cinehd', 'neo-cloud', 'discord', 'youtube-app', 'geometry-dash']) {
  assert.match(config, new RegExp('onlineApps:[\\s\\S]*?["\\\']' + app + '["\\\']'), `${app} is still blocked by the local app gate`);
}

assert.match(shell, /id === "report" && localConfig\.support[\s\S]*?apps\[id\]\.route = localConfig\.support/);
assert.doesNotMatch(server, /music-v3\\\/\|neo-cloud\\\/\|neo-tv\\\//, 'TV or Cloud is still in the preview deny-list');
assert.match(server, /safeGames = new Set\(\[[^\]]*'web-dashers\.html'/);
assert.match(server, /const isOnlineApp = [^;]*neo-chat\|neo-cloud\|neo-tv[^;]*web-dashers/);
assert.match(support, /<h1>Report a problem<\/h1>/);
assert.match(support, /id="support-download"/);
assert.ok(fs.existsSync(path.join(root, 'neo-os/local-browser/support.js')));
assert.ok(fs.existsSync(path.join(root, 'neo-os/local-browser/support.css')));

console.log('All launcher apps use working local or route-scoped online entry points.');
