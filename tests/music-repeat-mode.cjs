const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'neo-os', 'music-v2', 'neo-meting-player.js'), 'utf8');

const listeners = new Map();
const classes = new Set();
const repeatButton = {
  dataset: {},
  title: '',
  classList: {
    toggle(name, on) { if (on) classes.add(name); else classes.delete(name); }
  },
  setAttribute(name, value) { this[name] = String(value); },
  addEventListener(name, handler) { listeners.set(`button:${name}`, handler); }
};
const audioListeners = new Map();
const audio = {
  paused: true,
  ended: false,
  currentTime: 0,
  volume: 1,
  muted: false,
  loop: false,
  addEventListener(name, handler) { audioListeners.set(name, handler); },
  play() { this.paused = false; return Promise.resolve(); },
  pause() { this.paused = true; }
};
const storage = new Map();
const document = {
  addEventListener() {},
  getElementById(id) { return id === 'autoplayBtn' ? repeatButton : null; },
  querySelectorAll() { return []; }
};
const window = {
  dispatchEvent() {},
  addEventListener() {}
};

vm.runInNewContext(source, {
  window,
  document,
  localStorage: {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); }
  },
  audioEl: audio,
  currentTrack: null,
  renderCard() {},
  playTrack() {},
  hideNPView() {},
  searchVinyl() {},
  debounceTimer: 0,
  clearTimeout() {},
  CustomEvent: class CustomEvent {},
  HTMLImageElement: class HTMLImageElement {},
  lucide: { createIcons() {} },
  Map,
  Array,
  Math,
  Number,
  String,
  Promise
});

window.__NEO_METING_PLAYER__.media();
assert.equal(window.__NEO_METING_PLAYER__.repeatMode(), 'off');
assert.equal(repeatButton.dataset.repeatMode, 'off');
assert.equal(audio.loop, false);

listeners.get('button:click')();
assert.equal(window.__NEO_METING_PLAYER__.repeatMode(), 'all');
assert.equal(repeatButton.dataset.repeatMode, 'all');
assert.equal(audio.loop, false);
assert.equal(classes.has('active'), true);

listeners.get('button:click')();
assert.equal(window.__NEO_METING_PLAYER__.repeatMode(), 'one');
assert.equal(repeatButton.dataset.repeatMode, 'one');
assert.equal(repeatButton['aria-label'], 'Repeat one');
assert.equal(audio.loop, true);

listeners.get('button:click')();
assert.equal(window.__NEO_METING_PLAYER__.repeatMode(), 'off');
assert.equal(audio.loop, false);
assert.equal(classes.has('active'), false);
assert.equal(storage.get('music-repeat-mode'), 'off');

const html = fs.readFileSync(path.join(__dirname, '..', 'neo-os', 'music-v2', 'index.html'), 'utf8');
assert.match(html, /data-repeat-mode="one"\]\:\:after\{content:"1"/);
assert.match(html, /#autoplayBtn\[data-repeat-mode="all"\]\{color:#f4f4f5;background:transparent/);
assert.match(html, /#autoplayBtn\[data-repeat-mode="one"\]\{color:#f4f4f5;border-color:#f4f4f5;background:#111214/);
assert.match(html, /width:13px;height:13px;border-radius:999px;background:#173553/);

console.log('Music repeat cycles off -> all -> one and matches the compact repeat/repeat-one visuals.');
