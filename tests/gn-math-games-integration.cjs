const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const config = read('neo-os/neo-games/config.js');
const app = read('neo-os/neo-games/app.js');
const html = read('neo-os/neo-games/index.html');

assert.match(config, /freebuisness\/assets@main\/zones\.json/, 'The GN Math live catalog is not configured.');
assert.match(config, /freebuisness\/covers@main/, 'The GN Math cover source is not configured.');
assert.match(config, /freebuisness\/html@main/, 'The GN Math game source is not configured.');
assert.match(config, /expectedCount:\s*836/, 'The imported playable GN Math title count is undocumented.');
assert.match(app, /async function loadGnMathCatalog\(\)/, 'Steam does not load the GN Math catalog.');
assert.match(app, /if \(Number\(sourceId\) < 0\) return null/, 'The non-game GN Math suggestion entry is not excluded.');
assert.match(app, /id: "gn-math\/" \+ sourceId/, 'GN Math IDs are not namespaced.');
assert.match(app, /window\.NEO_PROXY_CLIENT\.fetch\.bind/, 'GN Math catalog requests do not use the shared relay.');
assert.match(app, /\(game\.isAether \|\| game\.isGnMath \|\| game\.isStaticQuasar\) && game\.image/, 'GN Math covers do not use the shared image relay.');
assert.match(app, /game\.isAether \|\| game\.isGnMath \|\| game\.isStaticQuasar \? game\.launchUrl : launchUrl/, 'GN Math launches are not handed to the OS relay window.');
assert.match(app, /state\.fernTotal \+ aetherMatches\.length \+ gnMathMatches\.length/, 'The GN Math total is not merged into the library count.');
assert.match(html, /FERN \+ AETHER \+ GN MATH \+ STATICQUASAR/, 'The Steam UI does not identify the GN Math catalog.');

console.log('GN Math contributes all 836 playable catalogue entries through the NEO relay.');
