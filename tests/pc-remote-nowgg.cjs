const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const apps = read('neo-os', 'neo-apps.js');
const shell = read('neo-os', 'neo-os.js');
const config = read('neo-os', 'neo-local-config.js');
const shardBuild = read('scripts', 'build-github-cdn-shards.cjs');

new vm.Script(apps, { filename: 'neo-apps.js' });
new vm.Script(shell, { filename: 'neo-os.js' });
assert.doesNotMatch(apps, /id:\s*"pc-remote"|title:\s*"PC Remote"|\.\/neo-remote\//);
assert.match(apps, /id:\s*"nowgg"[\s\S]*?neo-app-mode=1&neo-custom-app=1&neo-app-target=https%3A%2F%2Fnowgg\.fun%2F/);
assert.match(apps, /neo_os_remove_pc_remote_v1/);
assert.match(apps, /id !== "pc-remote"/);
assert.doesNotMatch(config, /"pc-remote"/);
assert.doesNotMatch(shell, /"pc-remote"/);
assert.doesNotMatch(shardBuild, /'neo-remote'|neo-remote\/index\.html/);
assert.ok(shardBuild.includes("['./NEO-BROWSER/index.html?neo-app-mode=1&neo-custom-app=1&neo-app-target=', `${cdnRoot(browserRepo)}NEO-BROWSER/index.html?neo-app-mode=1&neo-custom-app=1&neo-app-target=`]"));

console.log('PC Remote removal and proxied nowgg.fun launcher checks passed.');
