const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const shards = read('scripts', 'build-github-cdn-shards.cjs');
const sites = read('scripts', 'build-sites-static.cjs');
const publish = read('scripts', 'publish-performance-cdn.cjs');
const assetCheck = read('scripts', 'check-static-assets.cjs');
const youtubeLogo = read('neo-os', 'assets', 'youtube.svg');

assert.match(youtubeLogo, /viewBox="0 0 68 48"/, 'YouTube must use the wide official play-button proportions');
assert.doesNotMatch(youtubeLogo, /<rect[^>]+width="512"[^>]+height="512"/, 'YouTube must not regress to a red square icon');

assert.match(shards, /createAppRepo\(browserRepo,[\s\S]*?\['NEO-BROWSER', 'browser-runtime', 'local-browser', 'nextnode-browser'\]\)/);
assert.match(shards, /appProxy: isCdnRunner \?[\s\S]*?NEO-BROWSER\/launch\.svg/, 'CDN Movies does not use the browser-safe SVG launcher');
assert.match(shards, /createAppRepo\(chatRepo,[\s\S]*?\['neo-chat', 'neo-tv', 'neo-games', 'audiobooks'\]\)/);
assert.match(shards, /entry\.name === 'profile-classics'/);
assert.match(shards, /folder === 'neo-games'[\s\S]*?\['index\.json', 'covers\.json'\]/);
assert.match(shards, /createAppRepo\(musicTwoRepo, 'NEO Music player', \['music-v2'\]\)/);
assert.match(shards, /MUSIC_V2_PRODUCTION_FILES[\s\S]*?assets\/cover-fallback\.svg[\s\S]*?vendor\/am-lyrics\.min\.js/);
assert.match(shards, /folder === 'music-v2'[\s\S]*?fs\.rmSync\(file/);
assert.match(shards, /webAssignments[\s\S]*?neo-os-wallpaper-web-three-cdn[\s\S]*?scenes: \['1403160205'\]/);
assert.doesNotMatch(shards, /neo-os-wallpaper-media-|wallpaper-engine-projects'\), path\.join\(coreTarget/);
assert.doesNotMatch(shards, /musicOneRepo|musicThreeRepo|createAppRepo\([^\n]*\['music'\]\)|\['music-v2', 'music-local'\]/);
assert.doesNotMatch(shards, /source, 'music', 'fonts'/);
for (const route of [
  'neo-games/index.html?build=20260921-fern-only-v1',
]) assert.ok(shards.includes(route), 'Missing CDN route rewrite for ' + route);
for (const retiredPayload of ['neo-cloud', 'web-dashers.html']) {
  assert.ok(!shards.includes(`'${retiredPayload}'`) && !shards.includes(`/${retiredPayload}`), 'Retired app is still packaged: ' + retiredPayload);
}
assert.match(shards, /copyTree\(path\.join\(source, 'neo-ai'\), path\.join\(coreTarget, 'neo-ai'\)\)/,
  'NEO AI must be packaged with the production core');

assert.match(sites, /neo-tv\/assets\/profile-classics/);
assert.match(sites, /rel === 'neo-games\/index\.json' \|\| rel === 'neo-games\/covers\.json'/);
assert.match(sites, /relative === 'music-v3'[\s\S]*?relative === 'music-local'[\s\S]*?relative === 'music' \|\| relative\.startsWith\('music\/'\)/);
assert.match(sites, /only music-v2 may be packaged as a player/);
assert.doesNotMatch(assetCheck, /'music-local'/);
for (const required of [
  'neo-os/neo-proxy-client.js',
  'neo-os/assets/movies-icon.webp',
  'neo-os/assets/xbox-games.svg',
  'neo-os/assets/steam.svg',
  'neo-os/neo-tv/assets/profile-classics/scarlett-chilleez.png',
  'neo-os/neo-tv/assets/profile-classics/red-superhero.png',
  'neo-os/neo-tv/assets/profile-classics/blue-classic-icon.png',
  'neo-os/music-v2/assets/cover-fallback.svg',
  'neo-os/music-v2/vendor/am-lyrics.min.js',
  'neo-os/neo-ai/app.js',
  'neo-os/neo-games/app.js',
  'neo-os/neo-tv/app.js',
]) assert.ok(sites.includes(required), 'Sites required-asset guard is missing ' + required);
assert.match(sites, /Unreferenced Music v2 payload was packaged/);

assert.match(publish, /process\.argv\[2\] !== '--publish'/);
assert.match(publish, /delete refs\['neo-os-music-one-cdn'\][\s\S]*?delete refs\['neo-os-music-three-cdn'\]/);
assert.match(publish, /\['neo-os-chat-tv-cdn', 'neo-os-music-two-cdn', 'neo-os-wallpaper-web-three-cdn'\]/);
assert.doesNotMatch(publish, /for \(const name of \[[^\]]*(?:neo-os-music-one-cdn|neo-os-music-three-cdn)/);
assert.match(publish, /rewritePins\(path\.join\(output, 'neo-os-core-cdn'\)\)[\s\S]*?publish\('neo-os-core-cdn'\)/);
assert.match(publish, /rewritePins\(path\.join\(output, 'neo-os-launch-cdn'\)\)[\s\S]*?publish\('neo-os-launch-cdn'\)/);
assert.match(publish, /neo-os-launch-cdn@\$\{refs\['neo-os-launch-cdn'\]\}\/launch\.svg/);

console.log('Sites/CDN app allowlists, route rewrites, pinning order, and release-link checks passed.');
