const assert = require('node:assert/strict');
const fs = require('node:fs');

const interfaceStyles = fs.readFileSync('neo-os/neo-interface-styles.css', 'utf8');
const shell = fs.readFileSync('neo-os/neo-os.css', 'utf8');
const desktop = fs.readFileSync('neo-os/neo-desktop.css', 'utf8');
const index = fs.readFileSync('neo-os/index.html', 'utf8');

assert.match(interfaceStyles, /#widget-layer,[\s\S]*?\.neo-skin,[\s\S]*?\.neo-window\[data-app-id="skins"\] > \.window-body[\s\S]*?scrollbar-width:\s*none\s*!important/);
assert.match(interfaceStyles, /#widget-layer::?-webkit-scrollbar[\s\S]*?\.neo-skin::?-webkit-scrollbar[\s\S]*?\.widget-manager \*::-webkit-scrollbar[\s\S]*?display:\s*none\s*!important[\s\S]*?width:\s*0\s*!important[\s\S]*?height:\s*0\s*!important/);

// Hiding the chrome must not disable actual wheel, touch, or keyboard scrolling.
assert.match(shell, /\.widget-layer\s*\{[\s\S]*?overflow-y:\s*auto/);
assert.match(desktop, /\.skin-content\{[^}]*overflow:auto/);
assert.match(index, /neo-interface-styles\.css\?[^"']*widgets=no-scrollbars-v1/);

console.log('Widget surfaces hide scrollbar chrome while preserving scrolling.');
