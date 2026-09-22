const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const runtime = read('neo-os', 'NEO-BROWSER', 'assets', 'scramjet-runtime.js');
const browser = read('neo-os', 'NEO-BROWSER', 'index.html');
const fallback = read('neo-os', 'NEO-BROWSER', 'compat', 'staticquasar-snow-rider.html');

new vm.Script(runtime, { filename: 'scramjet-runtime.js' });
assert.match(runtime, /sites\.google\.com/);
assert.match(runtime, /staticquasar\\\/gm3z\\\/snow-rider/);
assert.match(runtime, /images-opensocial\.googleusercontent\.com/);
assert.match(runtime, /function openLocalCompatibilityPage/);
assert.match(runtime, /staticquasar-snow-rider\.html\?v=20260911-google-sites-v1/);
assert.match(browser, /scramjet-runtime\.js\?v=20260911-google-sites-v1/);
assert.match(fallback, /UnityLoader\.instantiate/);
assert.match(fallback, /SnowRider3D-gd-1\.json/);
assert.doesNotMatch(fallback, /production-assetsbucket|\/scr\.js/);

console.log('Google Sites game compatibility route checks passed.');
