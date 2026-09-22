const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const shell = read('neo-os/neo-os.js');
const platform = read('neo-os/neo-desktop-platform.js');
const styles = read('neo-os/neo-interface-styles.css');
const index = read('neo-os/index.html');

assert.match(shell, /control:\s*\{[\s\S]*?title: "System Settings"[\s\S]*?icon: "settings"/);
assert.match(shell, /function openApp\(id\) \{\s*if \(id === "personalize"\) id = "control";/);
assert.doesNotMatch(platform, /^\s*personalize:\s*\{/m);
assert.doesNotMatch(platform, /const handlers=\{[^}]*personalize:/);
assert.match(platform, /if\(id==='control'\)[\s\S]*?integrated-personalization-settings/);
assert.match(platform, /personalizationControls\(integrated,\{integrated:true\}\)/);
assert.match(platform, /section\(parent,'Styles'\)/);
assert.match(platform, /section\(parent,'Cursor'\)/);
assert.match(platform, /tabAppearanceEditor\(app\)/);

assert.match(styles, /\.neo-window\[data-app-id="control"\] \.integrated-personalization-settings/);
assert.doesNotMatch(styles, /data-app-id="personalize"/);
assert.match(index, /neo-interface-styles\.css\?[^"']*settings=combined-v1/);
assert.match(index, /neo-desktop-platform\.js\?[^"']*settings=combined-v1/);
assert.match(index, /neo-os\.js\?[^"']*settings=combined-v1/);

console.log('Personalization and System Settings are combined into one application contract.');
