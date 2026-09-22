'use strict';
// Exposes private renderer functions only in an in-memory VM copy; product files are read-only.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const shellDir = process.argv[2] || path.resolve(__dirname, '..', 'neo-os');
let now = Date.parse('2026-09-12T10:05:00Z');
class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
const window = { NEO_DESKTOP_CONFIG: {}, addEventListener() {}, dispatchEvent() {}, NEO_SYSTEM_BRIDGE: { get: () => ({}) } };
const document = { activeElement: null, querySelectorAll: () => [], documentElement: { dataset: {}, classList: { contains: () => false } } };
const animationFrames = new Map();
let nextAnimationFrame = 0;
const context = { window, document, navigator: { hardwareConcurrency: 4 }, localStorage: { getItem: () => '[]' }, location: { href: 'https://neo.invalid/' }, URL, Date: Clock, performance: { memory: { usedJSHeapSize: 1048576 } }, requestAnimationFrame: callback => { const id = ++nextAnimationFrame; animationFrames.set(id, callback); return id; }, cancelAnimationFrame: id => animationFrames.delete(id), console };
const source = fs.readFileSync(path.join(shellDir, 'neo-skins.js'), 'utf8');
assert(/\}\)\(\);\s*$/.test(source), 'expected skin runtime IIFE');
const instrumented = source.replace(/\}\)\(\);\s*$/, "window.__skinTest={renderContent,body,nodes,setMedia:value=>media=value,setConnection:value=>connection=value,setSkins:value=>skins=value};})();");
vm.runInNewContext(instrumented, context);
const api = window.__skinTest;
function fixture(type) {
  const state = { id: `test-${type}-${Math.random()}`, type, hidden: false, text: '' };
  let writes = 0, markup = '', image = null;
  const content = { get innerHTML() { return markup; }, set innerHTML(value) {
    writes++; markup = value; const match = value.match(/data-cover="([^"]+)"/);
    image = match ? { dataset: { cover: match[1] }, handlers: {}, addEventListener(type, fn) { this.handlers[type] = fn; }, remove() { image = null; } } : null;
  } };
  const node = { contains: value => value === node, querySelector: selector => selector === '.skin-content' ? content : selector === '.skin-media-cover' ? image : null };
  api.nodes.set(state.id, node);
  return { state, node, content, get writes() { return writes; }, get image() { return image; }, render: () => api.renderContent(state) };
}
const checks = []; let failures = 0;
function check(name, run) { try { run(); checks.push({ name, passed: true }); } catch (error) { failures++; checks.push({ name, passed: false, error: error.message }); } }
check('Minute clock skips identical seconds and renders the next minute', () => {
  const f = fixture('clock'); f.render(); const initial = f.content.innerHTML;
  for (let index = 0; index < 10; index++) { now += 1000; f.render(); }
  assert.equal(f.writes, 1, 'unchanged clock must preserve its DOM'); assert.equal(f.content.innerHTML, initial);
  now += 60000; f.render(); assert.equal(f.writes, 2); assert.notEqual(f.content.innerHTML, initial);
});
check('Stable CPU, storage, and network widgets preserve their DOM', () => {
  for (const type of ['cpu', 'storage', 'network']) { const f = fixture(type); f.render(); f.render(); assert.equal(f.writes, 1, type); }
});
check('Identical content in separate widgets is rendered independently', () => {
  const first = fixture('cpu'), second = fixture('cpu'); first.render(); second.render();
  assert.equal(first.writes, 1); assert.equal(second.writes, 1); assert.equal(first.content.innerHTML, second.content.innerHTML);
});
check('Network state changes render the updated status', () => {
  const f = fixture('network'); f.render(); api.setConnection({ label: 'Online', summary: 'Ready', ready: 5, total: 5, latency: 10 }); f.render();
  assert.equal(f.writes, 2); assert.match(f.content.innerHTML, /Online/); f.render(); assert.equal(f.writes, 2);
});
check('Music progress-only changes preserve artwork and controls; song/play changes update them', () => {
  const f = fixture('music'); const base = { source: 'stream', active: true, playing: true, title: 'Track A', artist: 'Artist', cover: 'https://neo.invalid/cover.png' };
  api.setMedia(base); f.render(); const cover = f.image;
  api.setMedia({ ...base, currentTime: 12, duration: 120 }); f.render(); assert.equal(f.writes, 1); assert.equal(f.image, cover);
  api.setMedia({ ...base, title: 'Track B', playing: false }); f.render(); assert.equal(f.writes, 2); assert.match(f.content.innerHTML, /Track B/); assert.match(f.content.innerHTML, /aria-label="Play"/);
});
check('Broken artwork falls back and is not recreated on the next unchanged update', () => {
  const f = fixture('music'); api.setMedia({ title: 'Missing cover', cover: 'https://neo.invalid/missing.png' }); f.render();
  assert(f.image?.handlers.error, 'new artwork must keep its error handler'); f.image.handlers.error(); assert.equal(f.image, null);
  f.render(); assert.equal(f.image, null); assert.doesNotMatch(f.content.innerHTML, /<img/);
});
check('Hidden widgets defer changes and show current content when revealed', () => {
  const f = fixture('music'); f.state.hidden = true; api.setMedia({ title: 'Before' }); f.render(); assert.equal(f.writes, 0);
  api.setMedia({ title: 'After' }); f.state.hidden = false; f.render(); assert.equal(f.writes, 1); assert.match(f.content.innerHTML, /After/);
});
check('Focused notes are protected from renderer replacement', () => {
  const f = fixture('notes'); f.state.text = 'Draft'; document.activeElement = f.node; f.render(); assert.equal(f.writes, 0);
  document.activeElement = null; f.render(); assert.equal(f.writes, 1); assert.match(f.content.innerHTML, /Draft/);
});
check('Cached equalizer render restarts animation without replacing its DOM', () => {
  const f = fixture('equalizer'); api.setSkins([f.state]); f.render();
  assert.equal(f.writes, 1);
  assert.equal(animationFrames.size, 1);
  f.state.hidden = true;
  const [token, callback] = animationFrames.entries().next().value;
  animationFrames.delete(token);
  callback();
  assert.equal(animationFrames.size, 0, 'the hidden equalizer should stop its loop');
  f.render();
  assert.equal(animationFrames.size, 0, 'rendering while hidden must not restart it');
  f.state.hidden = false;
  f.render();
  assert.equal(f.writes, 1, 'revealing unchanged content must preserve its DOM');
  assert.equal(animationFrames.size, 1, 'cached render must restart the equalizer immediately');
  f.render();
  assert.equal(animationFrames.size, 1, 'another cache hit must not duplicate its loop');
});
console.log(JSON.stringify({ suite: 'skin-render', checks, failures }, null, 2));
process.exitCode = failures ? 1 : 0;
