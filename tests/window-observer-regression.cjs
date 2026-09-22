'use strict';
// Browser-free behavioral regression checks. Reads the product file only.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const shellDir = process.argv[2] || path.resolve(__dirname, '..', 'neo-os');

class Target {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, fn) { const list = this.listeners.get(type) || []; list.push(fn); this.listeners.set(type, list); }
  removeEventListener(type, fn) { this.listeners.set(type, (this.listeners.get(type) || []).filter(item => item !== fn)); }
  dispatchEvent(event) { for (const fn of this.listeners.get(event.type) || []) fn(event); return true; }
}
class Element extends Target {
  constructor(name = 'div') {
    super(); this.nodeType = 1; this.tagName = name.toUpperCase(); this.className = ''; this.dataset = {};
    this.children = []; this.parentElement = null; this.isConnected = true; this.attributes = {};
    this.style = { setProperty() {}, removeProperty() {} }; this.offsetWidth = 600; this.offsetHeight = 450;
    this.rect = { left: 0, top: 0, right: 600, bottom: 450, width: 600, height: 450 }; this.rectReads = 0;
    const values = () => new Set(this.className.split(/\s+/).filter(Boolean));
    this.classList = {
      contains: item => values().has(item),
      add: (...items) => { const next = values(); items.forEach(item => next.add(item)); this.className = [...next].join(' '); },
      remove: (...items) => { const next = values(); items.forEach(item => next.delete(item)); this.className = [...next].join(' '); },
      toggle: (item, force) => { const next = values(); const active = force === undefined ? !next.has(item) : force; active ? next.add(item) : next.delete(item); this.className = [...next].join(' '); return active; },
    };
  }
  matches(selector) {
    return selector.split(',').some(part => {
      let positive = part.trim();
      const exclusions = [...positive.matchAll(/:not\(([^)]+)\)/g)].map(match => match[1]);
      if (exclusions.some(item => this.matches(item))) return false;
      positive = positive.replace(/:not\([^)]+\)/g, '');
      const classes = [...positive.matchAll(/\.([\w-]+)/g)].map(match => match[1]);
      const ids = [...positive.matchAll(/#([\w-]+)/g)].map(match => match[1]);
      if (!classes.every(item => this.classList.contains(item)) || !ids.every(item => this.id === item)) return false;
      for (const match of positive.matchAll(/\[([\w-]+)(?:=["']?([^\]"']+)["']?)?\]/g)) {
        const value = this.getAttribute(match[1]); if (value == null || match[2] !== undefined && value !== match[2]) return false;
      }
      return true;
    });
  }
  closest(selector) { for (let item = this; item; item = item.parentElement) if (item.matches(selector)) return item; return null; }
  querySelectorAll(selector) { return this.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  contains(node) { return node === this || this.children.some(child => child.contains(node)); }
  appendChild(node) { node.parentElement = this; node.parentNode = this; this.children.push(node); return node; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { if (name.startsWith('data-')) return this.dataset[name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] ?? this.attributes[name] ?? null; return this.attributes[name] ?? null; }
  removeAttribute(name) { delete this.attributes[name]; if (name.startsWith('data-')) delete this.dataset[name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())]; }
  getBoundingClientRect() { this.rectReads++; return this.rect; }
  focus() {}
}

function setup() {
  const root = new Element('html'), layer = new Element(), taskbar = new Element(), document = new Target(), window = new Target();
  layer.id = 'window-layer'; layer.clientWidth = 1440; layer.clientHeight = 900;
  taskbar.className = 'taskbar'; taskbar.rect = { left: 0, top: 0, right: 60, bottom: 900, width: 60, height: 900 };
  root.appendChild(layer); root.appendChild(taskbar);
  document.documentElement = root; document.getElementById = id => id === layer.id ? layer : null;
  document.querySelector = selector => root.querySelector(selector); document.querySelectorAll = selector => root.querySelectorAll(selector);
  document.createElement = name => new Element(name);
  const frames = new Map(), observers = []; let sequence = 0;
  const requestAnimationFrame = fn => { frames.set(++sequence, fn); return sequence; };
  const cancelAnimationFrame = id => frames.delete(id);
  Object.assign(window, { matchMedia: () => ({ matches: false }), setTimeout: () => 1, clearTimeout() {}, requestAnimationFrame, cancelAnimationFrame });
  class Observer { constructor(callback) { this.callback = callback; observers.push(this); } observe(target, options) { this.target = target; this.options = options; } disconnect() {} }
  const context = { window, document, MutationObserver: Observer, requestAnimationFrame, cancelAnimationFrame, CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options?.detail; } }, getComputedStyle: () => ({ minWidth: '320', minHeight: '220' }), console };
  vm.runInNewContext(fs.readFileSync(path.join(shellDir, 'neo-window-resize.js'), 'utf8'), context);
  const observer = observers.find(item => item.target === layer); assert(observer, 'window-layer observer must be installed');
  const flush = () => { let guard = 0; while (frames.size) { assert(++guard < 10, 'observer must settle'); const batch = [...frames.values()]; frames.clear(); batch.forEach(fn => fn(16 * guard)); } };
  const mutate = records => observer.callback(records);
  const attribute = target => ({ type: 'attributes', target, attributeName: 'class', oldValue: '', addedNodes: [], removedNodes: [] });
  const childList = (target, addedNodes = [], removedNodes = []) => ({ type: 'childList', target, addedNodes, removedNodes });
  const addWindow = () => { const win = new Element('section'); win.className = 'neo-window is-open is-active is-snapped'; win.dataset.appId = 'control'; layer.appendChild(win); mutate([childList(layer, [win])]); flush(); return win; };
  const keyboard = code => document.dispatchEvent({ type: 'keydown', target: root, code, key: code === 'KeyB' ? 'b' : code, ctrlKey: code === 'KeyB', preventDefault() {} });
  return { root, layer, taskbar, document, window, frames, flush, mutate, attribute, childList, addWindow, keyboard };
}

const checks = []; let failures = 0;
function check(name, run) { try { run(); checks.push({ name, passed: true }); } catch (error) { failures++; checks.push({ name, passed: false, error: error.message }); } }
check('Unrelated app DOM and class changes do not measure snap layout', () => {
  const h = setup(), win = h.addWindow(), child = win.appendChild(new Element()); child.className = 'app-status';
  h.taskbar.rectReads = 0;
  h.mutate([h.attribute(child), h.childList(child, [new Element('span')])]); h.flush();
  assert.equal(h.taskbar.rectReads, 0, 'inner app changes must not remeasure taskbar overlap');
});
check('Relevant observer notifications coalesce into one layout pass per frame', () => {
  const h = setup(), win = h.addWindow(); h.taskbar.rectReads = 0;
  for (let index = 0; index < 12; index++) h.mutate([h.attribute(win)]);
  assert.equal(h.taskbar.rectReads, 0, 'observer should defer layout to a frame'); h.flush();
  assert.equal(h.taskbar.rectReads, 1, 'one frame should perform one overlap check');
});
check('Minimize, restore, and removal keep the taskbar overlap state correct', () => {
  const h = setup(), win = h.addWindow(); assert(h.root.classList.contains('has-window-snap-mode'));
  win.classList.add('is-minimized'); h.mutate([h.attribute(win)]); h.flush(); assert(!h.root.classList.contains('has-window-snap-mode'));
  win.classList.remove('is-minimized'); h.mutate([h.attribute(win)]); h.flush(); assert(h.root.classList.contains('has-window-snap-mode'));
  h.layer.children = []; win.isConnected = false; h.mutate([h.childList(h.layer, [], [win])]); h.flush(); assert(!h.root.classList.contains('has-window-snap-mode'));
});
check('A newly added window still receives all resize handles', () => {
  const h = setup(), win = h.addWindow();
  assert.equal(win.dataset.resizeReady, 'true');
  assert.equal(win.querySelectorAll('[data-window-resize]').length, 8);
  h.mutate([h.attribute(win)]); h.flush();
  assert.equal(win.querySelectorAll('[data-window-resize]').length, 8, 'repeated sync must not duplicate handles');
});
for (const operation of ['minimize', 'close', 'remove']) check(`App fullscreen exits on ${operation}`, () => {
  const h = setup(), win = h.addWindow(); h.keyboard('KeyB'); assert(h.root.classList.contains('has-tab-fullscreen'));
  if (operation === 'minimize') win.classList.add('is-minimized');
  if (operation === 'close') win.classList.remove('is-open');
  if (operation === 'remove') { h.layer.children = []; win.isConnected = false; }
  h.mutate([operation === 'remove' ? h.childList(h.layer, [], [win]) : h.attribute(win)]); h.flush();
  assert(!h.root.classList.contains('has-tab-fullscreen')); assert.equal(h.root.dataset.tabFullscreen, undefined);
});
check('Taskbar layout and viewport resize remain active synchronization triggers', () => {
  const h = setup(); h.addWindow(); h.taskbar.rect = { left: 1200, top: 0, right: 1260, bottom: 900 };
  h.window.dispatchEvent({ type: 'neo-taskbar-layout-change' }); h.flush(); assert(!h.root.classList.contains('has-window-snap-mode'));
  h.taskbar.rect = { left: 0, top: 0, right: 60, bottom: 900 }; h.window.dispatchEvent({ type: 'resize' }); h.flush(); assert(h.root.classList.contains('has-window-snap-mode'));
});
console.log(JSON.stringify({ suite: 'window-observer', checks, failures }, null, 2));
process.exitCode = failures ? 1 : 0;
