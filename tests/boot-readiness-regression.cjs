'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const shellDir = process.argv[2] || path.resolve(__dirname, '..', 'neo-os');
const source = fs.readFileSync(path.join(shellDir, 'neo-os.js'), 'utf8');
const start = source.indexOf('  function playBootVideo('), end = source.indexOf('  function initAccountGate()', start);
assert(start > 0 && end > start, 'boot/start-screen helpers must exist');
function setup(mode) {
  const frames = new Map(), timers = new Map(), stored = new Map(); let sequence = 0, completeCalls = 0, plays = 0, pauses = 0;
  const element = attributes => ({ attributes: { ...attributes }, listeners: {}, hidden: false, setAttribute(key, value) { this.attributes[key] = value; }, removeAttribute(key) { delete this.attributes[key]; }, getAttribute(key) { return this.attributes[key] ?? null; }, addEventListener(type, callback) { this.listeners[type] = callback; }, focus() {} });
  const root = { dataset: { boot: 'pending' } }, desktop = element(), laptop = element({ 'data-start-mode': 'laptop' }), mobile = element({ 'data-start-mode': 'mobile' });
  const video = mode === 'missing' ? null : { readyState: mode === 'ready' ? 4 : 0, error: mode === 'error' ? { code: 4 } : null, currentTime: 12, play() { plays++; if (mode === 'throws') throw new Error('Playback unavailable'); if (mode === 'rejects') return Promise.reject(new Error('Autoplay blocked')); if (mode === 'stalled') return new Promise(() => {}); return Promise.resolve(); }, pause() { pauses++; }, addEventListener() { throw new Error('Boot must not wait on media events'); } };
  const loader = element(); loader.querySelector = () => video;
  const screen = element(); screen.querySelectorAll = selector => selector === 'button' || selector === '[data-start-mode]' ? [laptop, mobile] : [];
  screen.querySelector = selector => selector.includes('data-start-mode=') ? laptop : null;
  const document = { documentElement: root, body: element(), querySelector: () => video, getElementById: id => ({ 'neo-start-screen': screen, 'neo-desktop': desktop, 'boot-screen': loader }[id]) || null };
  const requestAnimationFrame = callback => { frames.set(++sequence, callback); return sequence; };
  const window = { setTimeout(callback, delay) { timers.set(++sequence, { callback, delay }); return sequence; }, clearTimeout: id => timers.delete(id), matchMedia: () => ({ matches: false }) };
  vm.runInNewContext(source.slice(start, end) + '\nwindow.__bootTest={performBoot,initStartScreen};', { window, document, root, requestAnimationFrame, sessionStorage: { setItem: (key, value) => stored.set(key, value) }, localStorage: { setItem: (key, value) => stored.set(key, value) }, BOOT_SESSION_KEY: 'boot-key', console });
  const tick = async () => { for (const id of [...frames.keys()]) { const callback = frames.get(id); frames.delete(id); callback(16); } await Promise.resolve(); await Promise.resolve(); };
  return { api: window.__bootTest, root, desktop, screen, video, laptop, mobile, frames, timers, tick, stored, get plays() { return plays; }, get pauses() { return pauses; }, onComplete() { completeCalls++; desktop.inert = true; desktop.setAttribute('aria-hidden', 'true'); }, get completeCalls() { return completeCalls; } };
}
(async () => {
  const checks = []; let failures = 0;
  async function check(name, run) { try { await run(); checks.push({ name, passed: true }); } catch (error) { failures++; checks.push({ name, passed: false, error: error.message }); } }
  for (const mode of ['missing', 'stalled', 'error', 'throws', 'rejects', 'ready']) await check(`Boot completes without awaiting ${mode} video`, async () => {
    const h = setup(mode); h.api.performBoot(); assert.equal(h.root.dataset.boot, 'pending');
    await h.tick(); assert.equal(h.root.dataset.boot, 'pending', 'boot keeps an intervening frame'); await h.tick();
    assert.equal(h.root.dataset.boot, 'complete'); assert.equal(h.stored.get('boot-key'), '1');
    assert([...h.timers.values()].every(timer => timer.delay === 240), 'only delayed playback cleanup may remain');
    for (const timer of h.timers.values()) timer.callback(); assert.equal(h.pauses, mode === 'missing' ? 0 : 1);
  });
  for (const mode of ['stalled', 'error', 'rejects', 'missing']) await check(`Start choice preserves account gate and dismisses loader with ${mode} video`, async () => {
    const h = setup(mode); h.api.initStartScreen(() => h.onComplete()); assert.equal(h.desktop.inert, true);
    h.mobile.listeners.click(); h.mobile.listeners.click(); assert.equal(h.completeCalls, 1, 'mode selection must be idempotent');
    assert.equal(h.root.dataset.startMode, 'mobile'); assert.equal(h.screen.hidden, true); assert.equal(h.root.dataset.universalLoading, 'true');
    assert.equal(h.desktop.inert, true, 'account callback retains control of the desktop gate'); await h.tick();
    assert.equal(h.root.dataset.universalLoading, undefined); assert.equal(h.desktop.inert, true); assert.equal(h.stored.get('neo_start_mode_v1'), 'mobile');
  });
  console.log(JSON.stringify({ suite: 'boot-readiness', checks, failures }, null, 2)); process.exitCode = failures ? 1 : 0;
})().catch(error => { console.error(error); process.exitCode = 1; });
