const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const integration = fs.readFileSync(path.join(root, 'neo-os', 'music-v2', 'neo-meting-integration.js'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'neo-os', 'music-v2', 'vendor', 'meting-ui.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'neo-os', 'music-v2', 'index.html'), 'utf8');
const shell = fs.readFileSync(path.join(root, 'neo-os', 'index.html'), 'utf8');
const localConfig = fs.readFileSync(path.join(root, 'neo-os', 'neo-local-config.js'), 'utf8');

assert.match(integration, /DEFAULT_SERVER_ORIGIN = "https:\/\/cirrusbk6l\.planet35\.com"/,
  'NEO Music must use the current catalogue and playback backend');
assert.match(integration, /NEO_PROXY_CLIENT[\s\S]*?resolve\(target\.href, "fetch"/,
  'external Music requests must use the shared proxy');
assert.match(integration, /if \(isServerRelayUrl\(target\.href\)\) return nativeFetch\(target\.href, options\)/,
  'the first-party Music relay must not be double-proxied');
assert.match(ui, /MUSIC_API\.searchUrl\?MUSIC_API\.searchUrl\(query\)/,
  'search results must use the ScholarNook Cirrus adapter');
assert.match(ui, /new AbortController\(\)/,
  'cancelled and superseded Music requests must be abortable');
assert.match(ui, /setTimeout\(\(\)=>searchVinyl\(q\),350\)/,
  'typing must launch one settled search');
assert.match(ui, /if \(isMusicRelayUrl\(url\)\) return Promise\.resolve\(url\)/,
  'the first-party Music relay must start without the browser-engine cold path');
assert.doesNotMatch(html, /preconnect" href="https:\/\/cirrusbk6l\.planet35\.com"/,
  'Music must not bypass the shared web proxy with a direct preconnect');
assert.match(localConfig, /music-v2\/index\.html\?v=20260919-scholarnook-v1&theme=system-v1&widgets=live-v1/,
  'opening Music must request the optimized proxied document');
assert.match(shell, /neo-local-config\.js\?v=20260920-shared-message-actions-v1&amp;theme=system-v1&amp;widgets=live-v1&amp;music=scholarnook-v1/,
  'the shell must request the current Music route configuration');

console.log('NEO Music fast-search and proxy safeguards are present.');
