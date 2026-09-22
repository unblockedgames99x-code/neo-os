const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const desktop = read('neo-os', 'neo-desktop-platform.js');
const runtime = read('neo-os', 'neo-skins.js');
const styles = read('neo-os', 'neo-production-polish.css');
const index = read('neo-os', 'index.html');

assert.match(desktop, /widget-manager/);
assert.match(desktop, /skins: \{id:'skins',title:'Widgets'[\s\S]*?icon:'widgets'/);
assert.match(desktop, /Widget library/);
assert.match(desktop, /On your desktop/);
assert.match(desktop, /Essentials','System','Media','Tools/);
assert.match(desktop, /widget-library-card/);
assert.match(desktop, /widget-installed-card/);
assert.match(desktop, /Your desktop is ready/);
assert.match(desktop, /aria-label','Add '\+item\.label\+' widget'/);
assert.match(desktop, /window\.NEO_SKINS\.show\(widget\.id,widget\.hidden\)/);
assert.match(runtime, /widget-customizer/);
assert.match(runtime, /Delete widget/);
assert.match(runtime, /aria-label="Customize widget"/);
assert.match(runtime, /scale:clamp\(s\.scale\|\|100,70,300\)/);
assert.match(runtime, /name="scale" type="range" min="70" max="300" step="5"/);
assert.match(runtime, /e\.target===d[\s\S]*?getBoundingClientRect\(\)[\s\S]*?outside[\s\S]*?d\.close\(\)/);
assert.doesNotMatch(runtime, /Text \/ conditions<textarea/);

assert.match(styles, /\.widget-library-grid/);
assert.match(styles, /repeat\(auto-fill, minmax\(170px, 1fr\)\)/);
assert.match(styles, /\.widget-library-card:hover/);
assert.match(styles, /\.widget-installed-list/);
assert.match(styles, /\.widget-empty-state/);
assert.match(styles, /\.widget-customizer-actions/);
assert.match(styles, /@media \(max-width: 560px\)[\s\S]*?\.widget-library-grid \{ grid-template-columns: 1fr; \}/);
assert.match(index, /neo-production-polish\.css\?v=20260919-browser-search-v1/);
assert.match(index, /neo-skins\.js\?v=20260909-all-audio-v1&amp;scale=300-v1/);
assert.match(index, /neo-desktop-platform\.js\?v=20260919-browser-search-v1/);
assert.match(index, /neo-os\.js\?[^"']*widgets=logo-v1/);
assert.ok(fs.existsSync(path.join(root, 'neo-os', 'assets', 'widgets.svg')));
assert.match(index, /<symbol id="i-grid"/);

console.log('Widget manager UI checks passed.');
