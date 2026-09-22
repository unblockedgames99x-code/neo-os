const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const shell = read('neo-os/neo-os.js');
const platform = read('neo-os/neo-desktop-platform.js');
const styles = read('neo-os/neo-production-polish.css');
const index = read('neo-os/index.html');

assert.match(shell, /designVersion:\s*28/);
assert.match(shell, /animationSpeed:\s*100/);
assert.match(shell, /clamp\(Math\.round\(Number\(settings\.animationSpeed\) \/ 25\) \* 25, 50, 200\)/);
assert.match(shell, /--neo-window-open-duration", Math\.round\(300 \* animationDurationScale\) \+ "ms"/);
assert.match(shell, /--neo-window-restore-duration", Math\.round\(260 \* animationDurationScale\) \+ "ms"/);
assert.match(shell, /--neo-window-close-duration", Math\.round\(210 \* animationDurationScale\) \+ "ms"/);
assert.match(shell, /fallbackDuration \* \(100 \/ settings\.animationSpeed\)/);

assert.match(platform, /function animationSpeedControl\(parent\)/);
assert.match(platform, /'Animation Speed'/);
assert.match(platform, /'How fast windows animate'/);
assert.match(platform, /speeds=\[50,75,100,150,200\]/);
assert.match(platform, /input\.min='0';input\.max=String\(speeds\.length-1\);input\.step='1'/);
assert.match(platform, /shell\.setSetting\('animationSpeed',speeds\[Number\(input\.value\)\]\|\|100\)/);
assert.match(platform, /'Slow'/);
assert.match(platform, /'Very Fast'/);

assert.match(styles, /\.animation-speed-setting/);
assert.match(styles, /\.animation-speed-value/);
assert.match(index, /data-animation-speed="100"/);
assert.match(index, /motion=window-drag-v3-animation-speed-v1/);
assert.match(index, /motion=animation-speed-v1/);

console.log('Animation speed setting contract passed.');
