const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const visualizer = fs.readFileSync(path.join(root, "neo-os", "neo-bottom-visualizer.js"), "utf8");
const skins = fs.readFileSync(path.join(root, "neo-os", "neo-skins.js"), "utf8");
const spectrum = fs.readFileSync(path.join(root, "neo-os", "neo-audio-spectrum-bridge.js"), "utf8");
const musicBridge = fs.readFileSync(path.join(root, "neo-os", "music-v2", "neo-os-bridge.js"), "utf8");

let clock = 0;
let nextFrame = 1;
const frames = new Map();
const windowListeners = new Map();
const documentListeners = new Map();
const system = { volume: 100, muted: false };
const context2d = {
  setTransform() {}, clearRect() {}, beginPath() {}, roundRect() {}, fill() {},
  createLinearGradient() { return { addColorStop() {} }; },
  set fillStyle(_value) {}, set globalAlpha(_value) {}
};
const canvas = {
  width: 0, height: 0, hidden: true,
  getContext() { return context2d; },
  getBoundingClientRect() { return { width: 960, height: 150 }; },
  setAttribute() {}
};
const rootElement = { dataset: {}, style: { getPropertyValue() { return ""; } } };
const addListener = (map) => (type, listener) => {
  const list = map.get(type) || [];
  list.push(listener);
  map.set(type, list);
};
const dispatch = (map, type, detail) => (map.get(type) || []).forEach((listener) => listener({ type, detail }));

const windowMock = {
  devicePixelRatio: 1,
  NEO_SYSTEM_BRIDGE: { get: () => ({ ...system }) },
  addEventListener: addListener(windowListeners),
  dispatchEvent(event) { dispatch(windowListeners, event.type, event.detail); },
  setInterval() { return 1; },
  clearInterval() {}
};

const sandbox = {
  window: windowMock,
  document: {
    hidden: false,
    documentElement: rootElement,
    getElementById(id) { return id === "neo-bottom-visualizer" ? canvas : null; },
    querySelectorAll() { return []; },
    addEventListener: addListener(documentListeners)
  },
  localStorage: { getItem() { return null; }, setItem() {} },
  getComputedStyle() { return { getPropertyValue() { return ""; } }; },
  matchMedia() { return { matches: false }; },
  performance: { now: () => clock },
  requestAnimationFrame(callback) { const id = nextFrame++; frames.set(id, callback); return id; },
  cancelAnimationFrame(id) { frames.delete(id); },
  CustomEvent: class CustomEvent { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } },
  Float32Array, Array, Math, Map, Date
};

vm.runInNewContext(visualizer, sandbox, { filename: "neo-bottom-visualizer.js" });
const pump = (count) => {
  for (let index = 0; index < count; index += 1) {
    const entry = frames.entries().next().value;
    if (!entry) break;
    frames.delete(entry[0]);
    clock += 34;
    entry[1](clock);
  }
};

windowMock.NEO_BOTTOM_VISUALIZER.setEnabled(true);
dispatch(windowListeners, "neo-media-state", { source: "music", active: true, playing: true, volume: 1, muted: false });
dispatch(windowListeners, "neo-media-levels", { source: "music", active: true, measured: true, levels: Array(32).fill(1) });
pump(12);
const fullVolume = windowMock.NEO_BOTTOM_VISUALIZER.getState().peak;
assert.ok(fullVolume > 0.7 && fullVolume < 0.95, "Full volume should be tall while retaining headroom");

system.volume = 25;
dispatch(windowListeners, "neo-system-state", system);
pump(30);
const quarterVolume = windowMock.NEO_BOTTOM_VISUALIZER.getState().peak;
assert.ok(quarterVolume < fullVolume * 0.4, "Lower master volume should lower the visualizer");

system.volume = 100;
dispatch(windowListeners, "neo-system-state", system);
pump(12);
const restoredVolume = windowMock.NEO_BOTTOM_VISUALIZER.getState().peak;
assert.ok(restoredVolume > quarterVolume * 3, "Raising master volume should raise the visualizer");

system.muted = true;
dispatch(windowListeners, "neo-system-state", system);
pump(40);
assert.ok(windowMock.NEO_BOTTOM_VISUALIZER.getState().peak < 0.01, "Muting should settle the visualizer to zero");

assert.match(skins, /masterOutputGain/);
assert.match(skins, /window\.addEventListener\('neo-system-state',refreshEqualizerSources\)/);
assert.match(spectrum, /Math\.min\(\.92,/);
assert.match(musicBridge, /0\.88\) \* 0\.92, 0, 0\.94/);

console.log("Visualizer height follows volume, mute, and headroom rules.");
