const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const runtime = read('neo-os', 'neo-skins.js');
const styles = read('neo-os', 'neo-skin-interactions.css');
const interfaceStyles = read('neo-os', 'neo-interface-styles.css');
const index = read('neo-os', 'index.html');

assert.match(runtime, /\['transparent','color','liquid-glass'\]\.includes\(s\.backgroundMode\)/);
assert.match(runtime, /backgroundMode:'transparent'/);
assert.match(runtime, /BACKGROUND_DEFAULT_KEY='neo_widget_background_default_v2'/);
assert.match(runtime, /s\.backgroundMode==='liquid-glass'[\s\S]*?backgroundMode:'transparent'/);
assert.match(runtime, /backgroundColor:\/\^#\[0-9a-f\]\{6\}\$\/i/);
assert.match(runtime, /n\.style\.setProperty\('--skin-background',s\.backgroundColor\)/);
assert.match(runtime, /n\.dataset\.backgroundMode=s\.backgroundMode/);
assert.match(runtime, /<option value="transparent">Transparent<\/option>/);
assert.match(runtime, /<option value="color">Custom color<\/option>/);
assert.match(runtime, /<option value="liquid-glass">Liquid glass<\/option>/);
assert.match(runtime, /backgroundColorRow\.hidden=s\.backgroundMode!=='color'/);

assert.match(styles, /data-background-mode="transparent"[\s\S]*?background: transparent !important/);
assert.match(styles, /data-background-mode="transparent"\] \.skin-handle[\s\S]*?background: transparent !important/);
assert.match(styles, /data-background-mode="color"[\s\S]*?var\(--skin-background/);
assert.match(styles, /data-background-mode="liquid-glass"[\s\S]*?backdrop-filter: blur\(24px\) saturate\(165%\)/);
assert.match(styles, /data-background-mode="liquid-glass"[\s\S]*?inset 0 1px 0/);
assert.match(interfaceStyles, /html \.neo-skin\[data-background-mode="transparent"\][\s\S]*?background: transparent !important/);
assert.match(index, /neo-skin-interactions\.css[^"']*background=transparent-v1/);
assert.match(index, /neo-skins\.js[^"']*background=transparent-v1/);
assert.match(index, /neo-interface-styles\.css[^"']*widget-background=transparent-v1/);
assert(!/url\(\s*['"]?https?:/i.test(styles));

console.log('Widget background mode checks passed.');
