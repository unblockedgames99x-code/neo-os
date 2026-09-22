const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', 'neo-os');
const loader = fs.readFileSync(path.join(root, 'cdn-loader.js'), 'utf8');
const launcher = fs.readFileSync(path.join(root, 'cdn.html'), 'utf8');

assert.match(loader, /fastly\.jsdelivr\.net\/npm\/@c8rter_09\/neo-os-desktop@1\.0\.3\//);
assert.match(loader, /cdn\.jsdelivr\.net\/npm\//);
assert.match(loader, /gcore\.jsdelivr\.net\/npm\//);
assert.match(loader, /quantil\.jsdelivr\.net\/npm\//);
assert.match(loader, /fetch\(roots\[index\] \+ 'index\.html'/);
assert.match(loader, /<base href=/);
assert.match(loader, /<meta name="neo-runner" content="cdn">/);
assert.match(loader, /Content-Security-Policy/);
assert.doesNotMatch(loader, /github|\/gh\//i);
assert.match(launcher, /<script src="\.\/cdn-loader\.js"><\/script>/);

console.log('CDN loader contract passed.');
