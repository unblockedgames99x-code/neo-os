const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'neo-os', 'neo-apps.js'), 'utf8');
const retired = ['discord', 'geometry-dash', 'neo-cloud', 'nowgg'];
const kept = ['stream', 'games', 'movies', 'youtube-app', 'neo-ai', 'notes', 'app-installer', 'calculator', 'paint'];
const store = new Map([
  ['neo_os_pinned_apps_v1', JSON.stringify(['browser', ...retired, 'games'])],
  ['neo_os_installed_apps_v1', JSON.stringify(['browser', ...retired, ...kept])],
]);
const localStorage = {
  getItem(key) { return store.has(key) ? store.get(key) : null; },
  setItem(key, value) { store.set(key, String(value)); },
};
const sandbox = { window: {}, localStorage };
vm.createContext(sandbox);
new vm.Script(source, { filename: 'neo-apps.js' }).runInContext(sandbox);

const ids = Object.keys(sandbox.window.NEO_EXTRA_APPS);
for (const id of kept) assert.ok(ids.includes(id), `Useful app was removed: ${id}`);
for (const id of retired) assert.ok(!ids.includes(id), `Retired app remains in the catalog: ${id}`);
for (const key of ['neo_os_pinned_apps_v1', 'neo_os_installed_apps_v1']) {
  const saved = JSON.parse(store.get(key));
  for (const id of retired) assert.ok(!saved.includes(id), `Dead ${id} entry remains in ${key}`);
}

console.log('Focused app catalog keeps core tools and removes obsolete shortcuts and duplicate game launchers.');
