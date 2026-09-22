const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const standalone = read('neo-os/NEO-BROWSER/assets/scramjet-runtime.js');
const standaloneHtml = read('neo-os/NEO-BROWSER/index.html');
const core = read('neo-os/neo-browser-runtime.js');
const os = read('neo-os/neo-os.js');

new vm.Script(standalone, { filename: 'scramjet-runtime.js' });
new vm.Script(core, { filename: 'neo-browser-runtime.js' });
new vm.Script(os, { filename: 'neo-os.js' });

assert(
  standaloneHtml.indexOf('scramjet/baremux.js') < standaloneHtml.indexOf('assets/scramjet-runtime.js'),
  'BareMux must load before the browser runtime',
);
assert.match(standalone, /new globalThis\.BareMux\.BareMuxConnection\(bareMuxWorkerUrl\)/);
assert.match(standalone, /new globalThis\.BareMux\.BareClient\(bareMuxWorkerUrl\)/);
assert.match(standalone, /connection\.setTransport\(bareMuxTransportUrl, \[\{ wisp: relay \}\]\)/);
assert.match(standalone, /NEXTNODE_PROXY_ORIGIN = "https:\/\/nextnode9124\.b-cdn\.net\/"/);
assert.match(standalone, /NEXTNODE_WISP_RELAY = "wss:\/\/nextnode9124\.b-cdn\.net\/w\/"/);
assert(
  standalone.indexOf('NEXTNODE_WISP_RELAY })') < standalone.indexOf('"wss://probuildingsupplies.com/w/"'),
  'The NextNode relay must be the first browser connection on a cold start',
);
assert.match(standalone, /probeRelay\(preferred, 1800\)/);
assert.match(standalone, /firstResponsiveRelay\(candidates, 3800\)/);
assert(
  standalone.indexOf('createBareMuxTransport(selected.url)') < standalone.indexOf('createOffMainThreadTransport(selected.url)'),
  'The shared Chromebook transport must be attempted before the compatibility worker',
);
assert.match(core, /packetType === 5 && packetStream === 0/);
assert.match(core, /packetType !== 3 \|\| packetStream !== 0/);
assert.match(core, /request\.setUint8\(0, 1\)/);
assert.doesNotMatch(core, /addEventListener\("open", \(\) => finish\(\)/);
assert.match(core, /const candidates = \[FALLBACK_TRANSPORT_URL, PRIMARY_TRANSPORT_URL\]/);
assert.match(core, /probeWispRelay\(priority, 1800\)/);
assert.match(core, /firstResponsiveWispRelay\(remaining, 3800\)/);
assert.match(core, /PREFERRED_WISP_RELAY = "wss:\/\/nextnode9124\.b-cdn\.net\/w\/"/);
assert.match(core, /rotateWispRelay\(\)/);
assert.match(core, /recoverTransport\(\)\.then/);
assert.match(os, /neo-browser-runtime\.js\?v=20260918-chromebook-failover-v1/);

console.log('Chromebook proxy stack checks passed.');
