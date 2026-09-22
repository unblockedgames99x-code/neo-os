const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');

const html = read('neo-os', 'music-v2', 'index.html');
const integration = read('neo-os', 'music-v2', 'neo-meting-integration.js');
const player = read('neo-os', 'music-v2', 'neo-meting-player.js');
const ui = read('neo-os', 'music-v2', 'vendor', 'meting-ui.js');
const theme = read('neo-os', 'music-v2', 'neo-meting-theme.css');
const icons = read('neo-os', 'music-v2', 'neo-lucide.js');
const bridge = read('neo-os', 'music-v2', 'neo-os-bridge.js');
const launcher = read('neo-os', 'music-v2', 'launch.svg');
const launcherWorker = read('neo-os', 'music-v2', 'launcher-sw.js');
const desktop = read('neo-os', 'neo-os.js');
const service = read('stratus-api-service', 'api.js');

for (const asset of ['vendor/meting-ui.css', 'vendor/meting-ui.js', 'neo-lucide.js', 'neo-meting-player.js', 'neo-meting-theme.css', 'assets/cover-fallback.svg']) {
  assert.ok(html.includes(asset), 'Music entry point must load ' + asset);
}
assert.match(html, /\.\.\/neo-link-proxy\.js\?v=/);
assert.match(html, /\.\.\/neo-proxy-client\.js\?v=/);
assert.match(html, /\.\.\/neo-ad-shield\.js\?v=/);
assert.doesNotMatch(html, /fonts\.googleapis|fonts\.gstatic|<script[^>]+https?:\/\//i, 'Music startup assets must stay local');

assert.match(integration, /cirrusbk6l\.planet35\.com/);
assert.match(integration, /__NEO_MUSIC_SERVER_ORIGIN__/);
assert.match(integration, /\/_o\/m\/search/);
assert.match(integration, /\/_o\/m\/discover/);
assert.match(integration, /\/_o\/m\/stream\//);
assert.doesNotMatch(integration, /samidy|shaka-player|taco-chat-static-blend/);

assert.match(ui, /HOME_STARTER_SECTIONS/, 'Home must have an immediate playable catalogue while the live service wakes');
assert.match(ui, /saveHomeSnapshot\(liveSections\)/, 'successful live home results must be cached for the next launch');
assert.match(ui, /renderHomeSnapshot\(homeSnapshot\.length\?homeSnapshot:HOME_STARTER_SECTIONS\)/, 'Home must paint real cached tracks before opening the live stream');
assert.match(ui, /MUSIC_API\.searchUrl\?MUSIC_API\.searchUrl\(query\)/, 'search must use the ScholarNook adapter');
assert.match(ui, /MUSIC_API\.homeUrl\?MUSIC_API\.homeUrl\(\)/, 'discovery must use the ScholarNook adapter');
assert.match(ui, /Accept:'application\/json'/, 'ScholarNook catalogue responses must be read as JSON');
assert.match(ui, /function normalizeTrack\(track\)/, 'ScholarNook track metadata is not normalized');
assert.match(ui, /NEO_PROXY_CLIENT\.image\(cover\)/, 'cover art must resolve through the shell proxy');
assert.match(ui, /image\.src\s*=\s*FALLBACK_COVER_URL;[\s\S]*?NEO_PROXY_CLIENT\.image/, 'remote art must not race a direct request before proxy resolution');
assert.match(ui, /resolveMusicRoute\(url,\s*['"]media['"]\)[\s\S]*?audioEl\.src\s*=\s*route/, 'audio media must use the optimized relay resolver');
assert.match(integration, /isServerRelayUrl\(target\.href\)[\s\S]*?nativeFetch\(target\.href, options\)/, 'the first-party CORS and range-enabled Music relay must not be double-proxied');
assert.match(ui, /audioEl\.addEventListener\(['"]playing['"][\s\S]*?loadLyricsForTrack/, 'lyrics must wait until audio starts instead of competing with playback');
assert.match(ui, /NEO web proxy is unavailable/, 'third-party resource failures must remain visible');
assert.doesNotMatch(integration, /return nativeFetch\(input, options\);\s*\n\s*\};\s*\n\}\)\(\);/, 'external fetches must not silently bypass the shared proxy');
assert.doesNotMatch(html, /rel="preconnect" href="https:\/\//, 'Music must not preconnect directly to an external server');
assert.match(ui, /window\.NEO_MUSIC_COVERS\s*=\s*Object\.freeze/);

assert.match(launcher, /launcher-sw\.js\?v=20260919-scholarnook-v1/);
assert.doesNotMatch(launcherWorker, /fetchProxiedResource|x-neo-resource-proxy|PROXY_ROUTE_MARKER/,
  'the launcher worker must not emulate a proxy with a direct cross-origin fetch');

assert.match(player, /window\.__NEO_METING_PLAYER__/);
assert.match(player, /music-autoplay/);
assert.match(player, /music-volume/);
assert.match(player, /playNext/);
assert.match(player, /playPrevious/);
assert.match(player, /NEO_MUSIC_COVERS/);
assert.match(player, /covers\.set\(row\.querySelector\(['"]img['"]\),\s*track\.thumb\)/);

assert.match(theme, /data-neo-theme=['"]frost['"]/);
assert.match(theme, /var\(--desktop-accent/);
assert.match(theme, /prefers-reduced-motion/);
assert.match(theme, /image-rendering:\s*auto\s*!important/);
assert.match(icons, /['"]play['"]:\s*'<path[^']+fill=['"]currentColor['"] stroke=['"]none['"]/);

assert.match(bridge, /#npmTrackTitle/);
assert.match(bridge, /#npmTrackArtist/);
assert.match(bridge, /#npmCover/);
assert.match(bridge, /neoMusicState/);
assert.match(bridge, /neoMusicLevels/);
assert.match(bridge, /MediaMetadata/);
assert.match(desktop, /event\.data\.neoMusicLevels/);
assert.match(desktop, /new CustomEvent\(['"]neo-media-levels['"]/);

assert.match(service, /app\.get\(['"]\/music\/v1\/search['"]/);
assert.match(service, /app\.get\(['"]\/music\/v1\/home['"]/);
assert.match(service, /app\.get\(['"]\/music\/v1\/audio\/:id['"]/);
assert.match(service, /Content-Range/);
assert.match(service, /Readable\.fromWeb/);

new vm.Script(integration, { filename: 'neo-meting-integration.js' });
new vm.Script(player, { filename: 'neo-meting-player.js' });
new vm.Script(ui, { filename: 'vendor/meting-ui.js' });
new vm.Script(bridge, { filename: 'neo-os-bridge.js' });
new vm.Script(launcherWorker, { filename: 'launcher-sw.js' });
new vm.Script(service, { filename: 'stratus-api-service/api.js' });

console.log('NEO Music catalogue, art, and audio proxy integration checks passed.');
