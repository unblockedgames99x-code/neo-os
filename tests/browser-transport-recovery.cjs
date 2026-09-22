const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const recovery = fs.readFileSync(
  path.join(__dirname, '..', 'neo-os', 'nextnode-browser', 'auto-server-switch.js'),
  'utf8'
);

assert.match(recovery, /var recoveryByFrame = new WeakMap\(\)/);
assert.match(recovery, /manager\.isAutomatic\(\)/);
assert.match(recovery, /manager\.next\(phase \|\| "page-failure"\)/);
assert.match(recovery, /sjController\.setTransport\(transport\)/);
assert.match(recovery, /if \(!proxyReady\)/);
assert.match(recovery, /Promise\.resolve\(proxyBoot\)/);
assert.match(recovery, /recover\(frame, target, "startup"\)/);
assert.match(recovery, /args\[0\] === "\[browser\] navigation failed:"/);
assert.match(recovery, /replace: true, automaticRecovery: true/);
assert.doesNotMatch(recovery, /location\.reload/);

console.log('Browser rotates the WISP transport and replays only the failed tab without reloading the app.');
