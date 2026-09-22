'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const shellDir = process.argv[2] || path.resolve(__dirname, '..', 'neo-os');
class Target {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, callback) { const list = this.listeners.get(type) || []; list.push(callback); this.listeners.set(type, list); }
  dispatchEvent(event) { (this.listeners.get(event.type) || []).forEach(callback => callback(event)); }
}
function setup() {
  const window = new Target(), document = new Target(), motion = new Target(), classes = new Set();
  const root = { dataset: {}, classList: { contains: name => classes.has(name) } };
  let clock = 100, id = 0, accent = '#123456', styleReads = 0, rectReads = 0;
  const frames = new Map(), mutations = [], resizers = [], gradients = [], transforms = [], clears = [];
  const context = { beginPath() {}, roundRect(...values) { assert(values.every(Number.isFinite), 'canvas bar geometry must stay finite'); }, fill() {}, clearRect(...values) { clears.push(values); }, setTransform(...values) { transforms.push(values); }, createLinearGradient(...coordinates) { const gradient = { coordinates, stops: [], addColorStop(...values) { this.stops.push(values); } }; gradients.push(gradient); return gradient; } };
  const canvas = { width: 300, height: 150, hidden: true, rect: { width: 1000, height: 150 }, getContext: () => context, getBoundingClientRect() { rectReads++; return this.rect; }, setAttribute() {} };
  document.documentElement = root; document.hidden = false; document.getElementById = () => canvas; document.querySelectorAll = () => [];
  motion.matches = false;
  const requestAnimationFrame = callback => { frames.set(++id, callback); return id; };
  const cancelAnimationFrame = token => frames.delete(token);
  Object.assign(window, { devicePixelRatio: 2, NEO_SYSTEM_BRIDGE: { get: () => ({ volume: 100, muted: false }) }, setInterval: () => 1, requestAnimationFrame, cancelAnimationFrame });
  class MutationObserver { constructor(callback) { this.callback = callback; mutations.push(this); } observe(target, options) { this.target = target; this.options = options; } }
  class ResizeObserver { constructor(callback) { this.callback = callback; resizers.push(this); } observe(target) { this.target = target; } }
  vm.runInNewContext(fs.readFileSync(path.join(shellDir, 'neo-bottom-visualizer.js'), 'utf8'), {
    window, document, MutationObserver, ResizeObserver, requestAnimationFrame, cancelAnimationFrame,
    matchMedia: () => motion, localStorage: { getItem: () => 'false', setItem() {} }, performance: { now: () => clock },
    getComputedStyle: () => { styleReads++; return { getPropertyValue: name => name === '--desktop-accent' ? accent : '' }; },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } }, console,
  });
  const tick = () => { clock += 40; for (const token of [...frames.keys()]) { const callback = frames.get(token); if (!callback) continue; frames.delete(token); callback(clock); } };
  const mutate = attributeName => mutations.filter(item => item.target === root && (!item.options.attributeFilter || item.options.attributeFilter.includes(attributeName))).forEach(item => item.callback([{ type: 'attributes', target: root, attributeName }]));
  const signal = () => window.dispatchEvent({ type: 'neo-media-levels', detail: { source: 'test', active: true, measured: true, levels: Array(64).fill(.5) } });
  return { window, document, root, canvas, motion, classes, frames, gradients, transforms, clears, tick, mutate, signal, resizers,
    api: window.NEO_BOTTOM_VISUALIZER, setAccent: value => { accent = value; }, get styleReads() { return styleReads; }, get rectReads() { return rectReads; } };
}
const checks = []; let failures = 0;
function check(name, run) { try { run(); checks.push({ name, passed: true }); } catch (error) { failures++; checks.push({ name, passed: false, error: error.message }); } }
check('Playing frames reuse dimensions, computed colors, and gradient', () => {
  const h = setup(); h.api.setEnabled(true); h.tick(); h.signal();
  const before = [h.rectReads, h.styleReads, h.gradients.length];
  for (let index = 0; index < 10; index++) { h.tick(); assert.equal(h.frames.size, 1); }
  assert.deepEqual([h.rectReads, h.styleReads, h.gradients.length], before);
});
check('Root theme/style changes refresh colors once after a burst', () => {
  const h = setup(); h.api.setEnabled(true); h.tick(); const count = h.gradients.length;
  h.setAccent('#abcdef'); h.mutate('data-neo-theme'); h.mutate('style'); h.mutate('style'); h.tick();
  assert.equal(h.gradients.length, count + 1); assert.equal(h.gradients.at(-1).stops[0][1], 'rgba(171,205,239,.48)');
});
check('Canvas resize and DPR changes refresh backing size and transform', () => {
  const h = setup(); h.api.setEnabled(true); h.tick(); h.canvas.rect = { width: 640, height: 88 }; h.window.devicePixelRatio = 1;
  h.resizers.forEach(item => item.callback([])); h.tick();
  assert.equal(h.canvas.width, 640); assert.equal(h.canvas.height, 88); assert.deepEqual(h.transforms.at(-1), [1, 0, 0, 1, 0, 0]);
  assert.deepEqual(h.gradients.at(-1).coordinates, [0, 80, 0, 0]);
});
check('Resize while playing retains exactly one animation loop', () => {
  const h = setup(); h.api.setEnabled(true); h.signal(); h.tick(); h.window.dispatchEvent({ type: 'resize' }); h.mutate('style'); h.tick();
  assert.equal(h.frames.size, 1); for (let index = 0; index < 5; index++) { h.tick(); assert.equal(h.frames.size, 1); }
});
check('Reduced motion and ultimate mode stop continuous animation and can resume it', () => {
  const h = setup(); h.api.setEnabled(true); h.signal(); h.tick(); h.motion.matches = true; h.motion.dispatchEvent({ type: 'change' }); h.tick(); assert.equal(h.frames.size, 0);
  h.motion.matches = false; h.motion.dispatchEvent({ type: 'change' }); h.tick(); assert.equal(h.frames.size, 1);
  h.root.dataset.performanceMode = 'ultimate'; h.mutate('data-performance-mode'); h.tick(); assert.equal(h.frames.size, 0);
  h.root.dataset.performanceMode = 'normal'; h.root.dataset.desktopMotion = 'reduced'; h.mutate('data-desktop-motion'); h.tick(); assert.equal(h.frames.size, 0);
  h.root.dataset.desktopMotion = 'normal'; h.mutate('data-desktop-motion'); h.tick(); assert.equal(h.frames.size, 1);
});
check('Visibility and window interactions pause and resume animation', () => {
  const h = setup(); h.api.setEnabled(true); h.signal(); h.tick(); h.document.hidden = true; h.document.dispatchEvent({ type: 'visibilitychange' }); assert.equal(h.frames.size, 0);
  h.signal(); assert.equal(h.frames.size, 0); h.document.hidden = false; h.document.dispatchEvent({ type: 'visibilitychange' }); assert.equal(h.frames.size, 1);
  h.classes.add('is-window-interacting'); h.window.dispatchEvent({ type: 'neo-window-interaction', detail: { active: true } }); assert.equal(h.frames.size, 0);
  h.classes.delete('is-window-interacting'); h.window.dispatchEvent({ type: 'neo-window-interaction', detail: { active: false } }); h.tick(); assert.equal(h.frames.size, 1);
});
check('Disable during queued resize does not redraw or restart; re-enable recovers', () => {
  const h = setup(); h.api.setEnabled(true); h.signal(); h.tick(); h.window.dispatchEvent({ type: 'resize' }); h.api.setEnabled(false);
  const drawn = h.api.getState().framesDrawn; h.tick(); assert.equal(h.api.getState().framesDrawn, drawn); assert.equal(h.frames.size, 0);
  h.api.setEnabled(true); h.tick(); assert(h.api.getState().framesDrawn > drawn); assert.equal(h.frames.size, 1);
});
console.log(JSON.stringify({ suite: 'visualizer-cache', checks, failures }, null, 2)); process.exitCode = failures ? 1 : 0;
