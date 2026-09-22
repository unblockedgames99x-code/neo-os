const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'neo-os', 'music-v2', 'neo-os-prelude.js'), 'utf8');
const previewServer = fs.readFileSync(path.join(root, 'local-preview.mjs'), 'utf8');
const deployedStream = fs.readFileSync(path.join(root, 'netlify', 'functions', 'neo-music-stream.js'), 'utf8');
const fullSongPayload = {
  tracks: [{
    id: 'ytSMTWfzEOXC4',
    title: 'Sem Tempo (Super Slowed)',
    artist: 'SCARIONIX',
    duration: 121,
    artwork: 'https://example.com/cover.jpg',
    src: '/api/yt/astream/SMTWfzEOXC4'
  }]
};

const textNode = value => ({
  cloneNode: () => ({
    textContent: value,
    querySelectorAll: () => []
  })
});
const trackRow = {
  querySelector(selector) {
    if (selector.includes('.title')) return textNode('Sem Tempo (Super Slowed)');
    if (selector.includes('.artist')) return textNode('SCARIONIX • 2025');
    return null;
  }
};

const requests = [];
const originalFetch = async input => {
  const url = new URL(input instanceof Request ? input.url : input);
  requests.push(url.href);
  if (url.pathname === '/.netlify/functions/neo-music-search') {
    return new Response(JSON.stringify(fullSongPayload), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }
  return new Response('provider unavailable', { status: 523 });
};

const context = {
  URL,
  URLSearchParams,
  Response,
  Request,
  Headers,
  Map,
  Set,
  Promise,
  console,
  navigator: { mediaSession: { metadata: null } },
  localStorage: { setItem() {} },
  document: {
    currentScript: { src: 'http://127.0.0.1:3092/neo-os/music-v2/neo-os-prelude.js' },
    querySelector(selector) {
      if (selector === 'base') return null;
      if (selector.startsWith('[data-track-id=')) return trackRow;
      return null;
    }
  }
};
context.window = {
  fetch: originalFetch,
  location: {
    href: 'http://127.0.0.1:3092/neo-os/music-v2/',
    origin: 'http://127.0.0.1:3092',
    pathname: '/neo-os/music-v2/'
  },
  history: { replaceState() {} },
  addEventListener() {},
  CSS: { escape: value => String(value) }
};
context.window.window = context.window;
context.window.navigator = context.navigator;
context.window.document = context.document;
context.window.URL = URL;
context.window.Response = Response;
context.window.Request = Request;
context.window.Headers = Headers;
context.window.localStorage = context.localStorage;
context.globalThis = context;

vm.runInNewContext(source, context, { filename: 'neo-os/music-v2/neo-os-prelude.js' });

assert.match(previewServer, /pathname === '\/\.netlify\/functions\/neo-music-stream'/);
assert.match(previewServer, /Readable\.fromWeb\(upstream\.body\)/,
  'the local proxy must stream media instead of buffering the whole song');
assert.match(deployedStream, /DEFAULT_RANGE = "bytes=0-1048575"/);
assert.match(deployedStream, /isBase64Encoded: true/);

(async () => {
  const playback = await context.window.fetch('https://lol.samidy.workers.dev/track/?id=123&quality=LOSSLESS');
  assert.equal(playback.status, 200);
  const playbackJson = await playback.json();
  assert.equal(
    playbackJson.data.OriginalTrackUrl,
    'http://127.0.0.1:3092/.netlify/functions/neo-music-stream?id=SMTWfzEOXC4'
  );
  assert.equal(playbackJson.data.duration, 121, 'the resolver must retain the complete track duration');

  const search = await context.window.fetch('https://lol.samidy.workers.dev/search/?q=Sem%20Tempo');
  assert.equal(search.status, 200);
  const searchJson = await search.json();
  assert.equal(searchJson.tracks.items.length, 1);
  assert.equal(searchJson.tracks.items[0].duration, 121);
  assert.equal(
    searchJson.tracks.items[0].audioUrl,
    'http://127.0.0.1:3092/.netlify/functions/neo-music-stream?id=SMTWfzEOXC4'
  );
  assert(requests.some(url => url.includes('/.netlify/functions/neo-music-search?q=')));
  console.log('NEO Music replaces the failed preview provider with matched full-song playback.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
