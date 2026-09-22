const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const index = read('neo-os/index.html');
const features = read('neo-os/neo-os-features.js');
const runtime = read('neo-os/neo-bottom-visualizer.js');
const styles = read('neo-os/neo-bottom-visualizer.css');

assert.match(index, /id="neo-bottom-visualizer"[^>]*aria-label="Music spectrum visualizer"/);
assert.match(index, /data-widget-action="bottom-visualizer"[\s\S]*?Add bottom music visualizer/);
assert.match(index, /neo-bottom-visualizer\.css\?v=20260920-taskbar-width-v1/);
assert.match(index, /neo-bottom-visualizer\.js\?v=20260920-taskbar-width-v1/);
assert.match(features, /NEO_BOTTOM_VISUALIZER\.toggle\(\)/);
assert.match(features, /Remove bottom music visualizer/);
assert.match(runtime, /addEventListener\("neo-media-levels"/);
assert.match(runtime, /addEventListener\("neo-media-state"/);
assert.match(runtime, /neo_bottom_visualizer_v1/);
assert.match(runtime, /devicePixelRatio \|\| 1, 1\.5/);
assert.match(runtime, /document\.hidden/);
assert.match(runtime, /taskbarBounds\.width \+ 64/);
assert.match(runtime, /--neo-visualizer-width/);
assert.match(styles, /z-index: 18/);
assert.match(styles, /data-taskbar-position="bottom"/);
assert.match(styles, /width: min\(var\(--neo-visualizer-width, 420px\), calc\(100% - 16px\)\)/);

console.log('Bottom music visualizer wiring checks passed.');
