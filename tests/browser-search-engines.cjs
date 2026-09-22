const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const shell = read('neo-os/neo-os.js');
const settings = read('neo-os/neo-desktop-platform.js');
const browser = read('neo-os/nextnode-browser/index.html');
const sync = read('scripts/sync-nextnode-browser.cjs');

assert.match(shell, /browserSearchEngine:\s*"duckduckgo"/, 'DuckDuckGo is not the default search engine');
assert.match(shell, /neo-browser:settings-request/, 'Browser cannot request its saved search setting');
assert.match(settings, /function browserSettings\(parent\)/, 'Settings has no Browser search-engine section');

for (const [id, label, host] of [
  ['google', 'Google', 'www.google.com/search'],
  ['bing', 'Bing', 'www.bing.com/search'],
  ['duckduckgo', 'DuckDuckGo', 'duckduckgo.com/?q='],
  ['brave', 'Brave', 'search.brave.com/search'],
  ['searxng', 'SearXNG', 'search.yuri.llc/search'],
]) {
  assert.ok(settings.includes(`['${id}','${label}']`), `${label} is missing from Settings`);
  assert.ok(browser.includes(host), `${label} is missing from Browser routing`);
  assert.ok(sync.includes(host), `${label} is missing from the reproducible Browser build`);
}

assert.match(browser, /event\.data\.type!=='neo:browser-settings-change'/, 'Browser does not accept live search changes');
assert.match(browser, /return looksLikeAddress\?upstreamNormalize\(value\):searchUrl\(value\)/, 'Address-bar text does not use the selected search engine');
assert.doesNotMatch(browser, /html\.duckduckgo\.com\/html\/\?q=/, 'Browser still uses the retired DuckDuckGo HTML endpoint');

console.log('Browser search-engine setting contract passed.');
