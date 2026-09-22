const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const music = path.resolve(__dirname, '../neo-os/music-local');
const html = fs.readFileSync(path.join(music, 'index.html'), 'utf8');
const references = [...html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)].map(match => match[1]).filter(value => !value.startsWith('#'));
for(const reference of references) {
  assert(!/^(?:[a-z]+:|\/\/)/i.test(reference), 'Music page must reference local resources: ' + reference);
  assert(fs.statSync(path.resolve(music, reference.split(/[?#]/)[0])).isFile(), 'Missing page resource ' + reference);
}
assert(!/\b(?:https?:)?\/\//i.test(fs.readFileSync(path.join(music, 'styles.css'), 'utf8')), 'Music styles must not import remote resources');
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(music, 'catalog.js'), 'utf8'), sandbox, { filename: 'catalog.js' });
const catalog = sandbox.window.NEO_MUSIC_CATALOG;
assert(Array.isArray(catalog) && catalog.length >= 3);
const ids = new Set();
const report = [];
for (const track of catalog) {
  assert(track.id && !ids.has(track.id), 'Catalog IDs must be unique');
  ids.add(track.id);
  assert(track.title && track.artist, 'Tracks need display metadata');
  for (const key of ['src', 'cover']) {
    assert(!/^(?:[a-z]+:|\/\/)/i.test(track[key]), 'Default media must use relative local paths');
    const file = path.resolve(music, track[key]);
    assert(file.startsWith(music + path.sep), 'Asset must stay inside local music folder');
    assert(fs.statSync(file).isFile(), 'Missing local asset ' + file);
  }
  const audio = fs.readFileSync(path.join(music, track.src));
  assert.equal(audio.toString('ascii', 0, 4), 'RIFF');
  assert.equal(audio.toString('ascii', 8, 12), 'WAVE');
  let byteRate = 0;
  let dataBytes = 0;
  for (let offset = 12; offset + 8 <= audio.length;) {
    const tag = audio.toString('ascii', offset, offset + 4);
    const bytes = audio.readUInt32LE(offset + 4);
    if (tag === 'fmt ') {
      assert.equal(audio.readUInt16LE(offset + 8), 1, 'Bundled audio should use universally supported PCM');
      byteRate = audio.readUInt32LE(offset + 16);
    }
    if (tag === 'data') dataBytes = bytes;
    offset += 8 + bytes + (bytes % 2);
  }
  const seconds = dataBytes / byteRate;
  assert(Number.isFinite(seconds) && seconds > 30, 'Bundled tracks must not be 30-second previews');
  assert(Math.abs(seconds - track.duration) < 0.1, 'Catalog duration does not match the complete audio');
  const cover = fs.readFileSync(path.join(music, track.cover), 'utf8');
  assert(cover.startsWith('<svg'), 'Bundled covers should be scalable vectors');
  assert(!/<script|<foreignObject|(?:href|src)=["']https?:/i.test(cover), 'Covers must not load remote content');
  report.push({ id: track.id, seconds, audioBytes: audio.length, cover: track.cover });
}
console.log(JSON.stringify({ passed: true, pageResources: [...new Set(references)], tracks: report }, null, 2));
