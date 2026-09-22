const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const config = read('neo-os/neo-games/config.js');
const app = read('neo-os/neo-games/app.js');
const html = read('neo-os/neo-games/index.html');
const sourceCatalog = JSON.parse(read('games/index.json'));
const sourceCovers = JSON.parse(read('games/covers.json'));
const staticGames = sourceCatalog.filter(game => game.source === 'staticquasar');

assert.equal(staticGames.length, 885, 'The complete StaticQuasar catalogue is not available locally.');
assert.equal(staticGames.filter(game => sourceCovers[game.slug]).length, 885, 'Every StaticQuasar title must have cover artwork.');
assert.match(config, /neo-os-games-catalog-cdn@main\/index\.json/, 'The published StaticQuasar catalogue is not configured.');
assert.match(config, /neo-os-games-catalog-cdn@main\/covers\.json/, 'The published StaticQuasar cover map is not configured.');
assert.match(config, /expectedCount:\s*885/, 'The imported StaticQuasar title count is undocumented.');
assert.match(app, /async function loadStaticQuasarCatalog\(\)/, 'Steam does not load the StaticQuasar catalogue.');
assert.match(app, /raw\.source[\s\S]{0,120}!== "staticquasar"/, 'Non-StaticQuasar entries are not filtered from the shared catalogue.');
assert.match(app, /id: "staticquasar\/" \+ sourceId/, 'StaticQuasar IDs are not namespaced.');
assert.match(app, /state\.fernTotal \+ aetherMatches\.length \+ gnMathMatches\.length \+ staticQuasarMatches\.length/, 'The StaticQuasar total is not merged into the library count.');
assert.match(app, /game\.isAether \|\| game\.isGnMath \|\| game\.isStaticQuasar \? game\.launchUrl : launchUrl/, 'StaticQuasar launches are not handed to the OS relay window.');
assert.match(html, /FERN \+ AETHER \+ GN MATH \+ STATICQUASAR/, 'The Steam UI does not identify the StaticQuasar catalogue.');

console.log('StaticQuasar contributes all 885 catalogued games with covers through the NEO relay.');
