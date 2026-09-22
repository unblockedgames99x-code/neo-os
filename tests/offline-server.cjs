const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = new URL(process.env.NEO_PREVIEW_URL || 'http://127.0.0.1:3092/');
const get = (file, options) => fetch(new URL(file, base), { signal: AbortSignal.timeout(5000), ...options });

async function run() {
  const music = await get('neo-os/music-local/');
  assert.equal(music.status, 200);
  const csp = music.headers.get('content-security-policy');
  for (const directive of ['script-src', 'connect-src', 'frame-src', 'media-src']) {
    const rule = csp.split(';').find(rule => rule.trim().startsWith(directive));
    assert(rule && rule.includes("'self'") && !/https?:|\*/.test(rule), 'External origin allowed by ' + directive);
  }
  const file = 'neo-os/music-local/media/after-hours.wav';
  const local = fs.readFileSync(path.resolve(__dirname, '..', file));
  const head = await get(file, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(head.headers.get('content-type'), 'audio/wav');
  assert.equal(Number(head.headers.get('content-length')), local.length);
  assert.equal((await head.arrayBuffer()).byteLength, 0);
  for (const [range, start, end] of [['bytes=0-43', 0, 43], ['bytes=1000000-1000031', 1000000, 1000031], ['bytes=-32', local.length - 32, local.length - 1]]) {
    const response = await get(file, { headers: { Range: range } });
    assert.equal(response.status, 206, 'Audio ranges required for seeking');
    assert.equal(response.headers.get('content-range'), `bytes ${start}-${end}/${local.length}`);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), local.subarray(start, end + 1));
  }
  assert.equal((await get(file, { headers: { Range: 'bytes=999999999-' } })).status, 416);
  assert.equal((await get('neo-os/music-local/media/missing.wav')).status, 404);
  for (const blocked of ['google-script-direct.html', 'neo-os/music-v3/index.html', 'neo-os/neo-tv/index.html']) {
    const response = await get(blocked, { redirect: 'manual' });
    assert.equal(response.status, 302, 'Network-dependent route must be held in local preview');
    assert.equal(new URL(response.headers.get('location'), base).origin, base.origin);
  }
  assert.equal((await get('.git/config')).status, 403);
  console.log(JSON.stringify({ passed: true, sameOriginCSP: true, fullAudioBytes: local.length, byteRanges: 3, remoteAppsHeldLocally: true }, null, 2));
}
run().catch(error => { console.error(error); process.exitCode = 1; });
