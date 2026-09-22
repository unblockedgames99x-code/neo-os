const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');

const shellHtml = read('neo-os', 'index.html');
const localConfig = read('neo-os', 'neo-local-config.js');
const shell = read('neo-os', 'neo-os.js');
const musicPrelude = read('neo-os', 'music-v2', 'neo-os-prelude.js');
const musicUi = read('neo-os', 'music-v2', 'neo-ui.js');
const musicBundle = read('neo-os', 'music-v2', 'assets', 'index-DoF3sT5h.js');
const instances = JSON.parse(read('neo-os', 'music-v2', 'instances.json'));
const browserHtml = read('neo-os', 'NEO-BROWSER', 'index.html');

assert(shellHtml.includes('http://127.0.0.1:3092/neo-os/'),
  'raw file launches must probe the real local runtime');
assert(!shellHtml.includes('127.0.0.1:4195') && !shellHtml.includes('127.0.0.1:4188'),
  'obsolete preview ports must not keep file launches in a broken context');
assert(shellHtml.includes('http://127.0.0.1:3092 http://localhost:3092'),
  'the file-launch image probe must be permitted by the page policy');

assert(localConfig.includes('previewMusic') && localConfig.includes('previewBrowser'),
  'apps must expose a working local-runtime recovery destination');
assert(localConfig.includes('music-v2/index.html') && !localConfig.includes('music-local/index.html'),
  'NEO Music must remain the complete Monochrome application');
assert(!localConfig.includes('(?:browser-sw|sw|service-worker)'),
  'shell cleanup must not unregister the Browser Scramjet worker');

assert(shell.includes('Music needs the NEO web runtime') && shell.includes('Browser needs the NEO web runtime'),
  'raw file mode must explain why network apps cannot run');
assert(shell.includes('neoMusicUiReady') && shell.includes('NEO Music could not finish starting'),
  'Music must expose both runtime readiness and a visible recovery state');
assert(musicUi.includes('registration.scope.startsWith(musicScope)'),
  'Music cleanup must remain inside the Music service-worker scope');
assert(musicUi.includes("postMessage({ neoMusicUiReady: true }"),
  'the Music module must acknowledge successful startup to the shell');

assert.equal(instances.api[0], 'https://lol.samidy.workers.dev');
assert.equal(instances.streaming[0], 'https://lol.samidy.workers.dev');
assert(musicPrelude.includes('monochrome-api-instances-v9') &&
  musicPrelude.includes('streaming: [{ url: "https://lol.samidy.workers.dev", version: "2.10" }]'),
  'the self-hosted player must seed working search and playback instances');
assert(musicPrelude.includes('target === navigator && property === "userAgent"'),
  'the upstream user-agent spoof must not abort Music before search initializes');
assert(musicPrelude.includes('neo_music_playback_rate_repair_v1') &&
  musicPrelude.includes('localStorage.setItem("audio-effects-speed", "1")'),
  'existing slow playback sessions must reset to normal speed once');
assert(musicPrelude.includes('hostname === "api.music.apple.com"'),
  'search results must come from the provider that can also resolve playback');
assert(musicPrelude.includes('XMLHttpRequest.prototype.open'),
  'provider selection must cover the upstream XHR transport too');
assert(musicPrelude.includes('function isPreviewOnlyHiFiStream(input)') &&
  musicPrelude.includes('parsed.searchParams.has("quality")') &&
  musicPrelude.includes('function fullSongResponse(input, init)') &&
  musicPrelude.includes('/.netlify/functions/neo-music-search') &&
  musicPrelude.includes('/.netlify/functions/neo-music-stream') &&
  musicPrelude.includes('OriginalTrackUrl: stream'),
  'the player must replace the legacy 29-second response with a matched full song');
assert(musicPrelude.includes('function fallbackCombinedSearch(query, init)') &&
  musicPrelude.includes('audioUrl: stream') &&
  musicPrelude.includes('return fallbackCombinedSearch(query, init);'),
  'search must recover from the suspended catalog and return directly playable full-song tracks');
assert(musicBundle.includes('getUnifiedPlaybackStreamUrl') && musicBundle.includes('getDeezerStreamUrl'),
  'full-song playback must retain Monochrome\'s primary and fallback providers');
assert(musicBundle.includes('const a=!1;let o=null;if(a)try{return await se.instance.query(e)}'),
  'search must use IDs that the configured playback provider can resolve');
assert(musicBundle.includes('async search(e,s={}){const n=this.getAPI();return typeof n.search==="function"'),
  'the top-level search UI must use the playback-compatible provider');

assert(browserHtml.includes('assets/scramjet-runtime.js') &&
  browserHtml.includes('assets/neo-minimal-browser.js?v=20260907-runtime-recovery-v1'),
  'Browser must load the repaired transport and status UI');

console.log('NEO Music and Browser runtime recovery contract passed.');
