const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const shieldSource = read('neo-os', 'neo-ad-shield.js');
const sandbox = { URL };
sandbox.globalThis = sandbox;
vm.runInNewContext(shieldSource, sandbox, { filename: 'neo-ad-shield.js' });

const shield = sandbox.NEOAdShield;
assert.ok(shield, 'the shared ad shield must expose its blocking API');
for (const blocked of [
  'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
  'https://cdn.adsterra.com/popunder.js',
  'https://dolesdao.com/ad.js',
  'https://www.googletagmanager.com/gtm.js',
  'https://profitableratecpmnetwork.com/banner',
  'https://videasy.to/embed/ad',
  'https://ads.example.com/banner.js',
]) {
  assert.equal(shield.shouldBlockUrl(blocked), true, blocked + ' should be blocked');
}
for (const allowed of [
  'https://example.com/adventure/game',
  'https://example.com/downloads/app.js',
  'https://cdn.jsdelivr.net/gh/lauraevan/greatestgreatest-revive@main/scrapegames.js',
]) {
  assert.equal(shield.shouldBlockUrl(allowed), false, allowed + ' should remain available');
}

const shieldScript = /<script\b[^>]*src=['"][^'"]*neo-ad-shield\.js(?:\?[^'"]*)?['"]/i;
const appEntries = [
  'index.html',
  'audiobooks/index.html',
  'local-browser/index.html',
  'music/index.html',
  'music-local/index.html',
  'music-v2/index.html',
  'music-v3/index.html',
  'neo-ai/index.html',
  'neo-chat/index.html',
  'neo-cloud/index.html',
  'neo-games/index.html',
  'neo-remote/index.html',
  'neo-tv/index.html',
];
for (const entry of appEntries) {
  const file = path.join(root, 'neo-os', entry);
  if (fs.existsSync(file)) assert.match(fs.readFileSync(file, 'utf8'), shieldScript, entry + ' must load the shared ad shield');
}

for (const helper of ['browser-newtab.html', 'cdn.html', 'local-browser/support.html', 'NEO-BROWSER/NEO-Packager.html']) {
  assert.match(read('neo-os', helper), shieldScript, helper + ' must load the shared ad shield');
}

for (const musicPage of ['music/discord.html', 'music-v2/discord.html', 'music-v3/discord.html']) {
  const source = read('neo-os', musicPage);
  assert.doesNotMatch(source, /discord\.gg/i, musicPage + ' must not contain an external promotional redirect');
  assert.match(source, /\.\/index\.html/);
}

const frameLoader = read('neo-os', 'neo-frame-loader.js');
assert.match(frameLoader, /adShieldRuntime/);
assert.match(frameLoader, /neo-ad-shield\.js(?:\?[^'"]*)?/);

const browserHtml = read('neo-os', 'NEO-BROWSER', 'index.html');
const browserShield = read('neo-os', 'NEO-BROWSER', 'assets', 'neo-ad-shield.js');
const browserWorker = read('neo-os', 'NEO-BROWSER', 'sw.js');
const browserRuntime = read('neo-os', 'NEO-BROWSER', 'assets', 'scramjet-runtime.js');
const nextNodeBrowser = read('neo-os', 'nextnode-browser', 'index.html');
assert.match(browserHtml, shieldScript);
assert.equal(browserShield, shieldSource, 'browser and desktop protection must use the same rules');
assert.match(browserWorker, /NEOAdShield\?\.shouldBlockUrl\(destination\)/);
const browserFetchHandler = browserWorker.slice(browserWorker.indexOf('self.addEventListener("fetch"'));
assert.ok(browserFetchHandler.indexOf('shouldBlockUrl(destination)') < browserFetchHandler.indexOf('event.respondWith('), 'Scramjet must reject ads before proxying them');
assert.match(browserRuntime, /NEOAdShield\?\.install\(frameElement\.contentWindow\)/);
assert.match(nextNodeBrowser, shieldScript);
assert.doesNotMatch(nextNodeBrowser, /<script\s+src=['"][^'"]*smartpop\.js/i);
assert.match(shieldSource, /installedDocuments\.get\(target\) === doc/);

console.log('Site-wide ad protection uses the current shared rules without relying on cache-key text.');
