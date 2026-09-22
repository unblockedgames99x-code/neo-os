const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const localConfig = read('neo-os/neo-local-config.js');
const apps = read('neo-os/neo-apps.js');
const shell = read('neo-os/neo-os.js');
const html = read('neo-os/index.html');

new vm.Script(localConfig, { filename: 'neo-os/neo-local-config.js' });
new vm.Script(apps, { filename: 'neo-os/neo-apps.js' });
new vm.Script(shell, { filename: 'neo-os/neo-os.js' });

assert.match(localConfig, /onlineApps:\s*Object\.freeze\(\["chat", "youtube-app", "games", "movies", "neo-ai"\]\)/);
assert.match(localConfig, /support:\s*new URL\("local-browser\/support\.html", base\)\.href/);
assert.match(shell, /var localOnlineApps = new Set\(/);
assert.match(shell, /if \(localOnlineApps\.has\(id\)\) return;/);
assert.doesNotMatch(apps, /\bcinehd:\s*\{/);
assert.match(apps, /nowgg:\s*\{[\s\S]*?route:\s*"\.\/NEO-BROWSER\/index\.html\?neo-app-mode=1&neo-custom-app=1&neo-app-target=https%3A%2F%2Fnowgg\.fun%2F"/);
assert.match(apps, /"neo-ai":\s*\{[\s\S]*?route:\s*"\.\/neo-ai\/index\.html\?[^\"]+"/);
assert.match(apps, /"neo-cloud":\s*\{[\s\S]*?route:\s*"\.\/neo-cloud\/index\.html\?v=20260907-online-runtime-v1"/);
assert.match(apps, /games:\s*\{[\s\S]*?title:\s*"Steam"[\s\S]*?icon:\s*"steam"[\s\S]*?route:\s*"\.\/neo-games\/index\.html\?build=20260918-steam-brand-v1"/);
assert.match(apps, /movies:\s*\{[\s\S]*?route:\s*"\.\/neo-tv\/index\.html\?build=20260912-media-fallback-v9"/);
for (const file of ['neo-local-config', 'neo-apps', 'neo-os']) {
  assert.match(html, new RegExp(`<script\\b[^>]*src="\\./${file}\\.js\\?[^\"]+"`));
}
assert.ok(fs.existsSync(path.join(root, 'neo-os/neo-tv/app.js')));
assert.ok(fs.existsSync(path.join(root, 'neo-os/neo-games/app.js')));
assert.ok(fs.existsSync(path.join(root, 'neo-os/neo-cloud/games.json')));

console.log('NEO online apps include the dedicated Games, Movies, AI, YouTube, and Cloud runtimes.');
