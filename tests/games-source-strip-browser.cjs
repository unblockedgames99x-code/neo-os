const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'neo-os', 'neo-games', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'neo-os', 'neo-games', 'app.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'neo-os', 'neo-games', 'app.js'), 'utf8');

assert.doesNotMatch(html, /data-category-chips|data-sort/, 'The retired grid catalog controls remain in the Steam-style library');
assert.match(html, /data-library-scroll[\s\S]*data-favorites-list[\s\S]*data-game-list/, 'The focused library rail is incomplete');
assert.match(css, /\.library-scroll\s*\{[\s\S]*overflow:\s*auto/, 'The long game list cannot scroll');
assert.match(app, /host\.scrollTop \+ host\.clientHeight >= host\.scrollHeight - 160/, 'The library does not page near the scroll boundary');
assert.match(app, /fetchGames\(state\.page \+ 1, state\.query, true\)/, 'The Fern catalog cannot incrementally load');

console.log('The old source strip is replaced by a focused, incrementally loaded desktop library rail.');
