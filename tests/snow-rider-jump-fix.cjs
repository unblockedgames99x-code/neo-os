const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const games = fs.readFileSync(path.join(root, 'neo-os', 'neo-games', 'app.js'), 'utf8');
const wrapper = fs.readFileSync(path.join(root, 'neo-os', 'neo-games', 'snow-rider-stable.html'), 'utf8');
const shell = fs.readFileSync(path.join(root, 'neo-os', 'neo-os.js'), 'utf8');

assert.match(games, /selenite\/snowrider3d[\s\S]*?snow-rider-stable\.html/, 'Snow Rider does not use the compatibility player');
assert.match(wrapper, /minimumFrameTime\s*=\s*1000\s*\/\s*60/, 'Snow Rider is not capped at 60 FPS');
assert.match(wrapper, /lastDeliveredFrameTime\s*=\s*time/, 'Snow Rider does not keep a shared frame-delivery clock');
assert.match(wrapper, /event\.repeat[\s\S]*?stopImmediatePropagation/, 'Repeated jump keydown events are not blocked');
assert.match(wrapper, /Vrkids2009\/snowrider3d@6b7c2b9167b592528b221428414e63f06c4640b9/, 'The stable Snow Rider build is not immutable');
assert.match(shell, /neo-os-chat-tv-cdn@\(\[0-9a-f\]\{40\}\)[\s\S]*?snow-rider-stable/, 'The shell does not allow the immutable compatibility player');
assert.match(shell, /fetchedDirectGame[\s\S]*?NEOFrameLoader\.load/, 'The CDN compatibility page is not fetched into an executable game frame');

console.log('Snow Rider uses the immutable 60 FPS compatibility player and blocks repeated jump input.');
