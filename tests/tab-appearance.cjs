const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const shell = read('neo-os/neo-os.js');
const desktop = read('neo-os/neo-desktop-platform.js');
const styles = read('neo-os/neo-production-polish.css');
const index = read('neo-os/index.html');
const launcher = read('index.html');

const presets = [
  ['classroom', 'Classroom', 'classroom.png'],
  ['drive', 'Drive', 'drive.png'],
  ['docs', 'Docs', 'docs.ico'],
  ['gmail', 'Gmail', 'gmail.ico'],
  ['canvas', 'Canvas', 'canvas.ico'],
  ['clever', 'Clever', 'clever.png'],
  ['schoology', 'Schoology', 'schoology.ico'],
  ['powerschool', 'PowerSchool', 'powerschool.png'],
  ['infinite-campus', 'Infinite Campus', 'infinite-campus.svg'],
  ['wikipedia', 'Wikipedia', 'wikipedia.png'],
  ['khan-academy', 'Khan Academy', 'khan-academy.ico'],
  ['desmos', 'Desmos', 'desmos.png'],
  ['quizlet', 'Quizlet', 'quizlet.png'],
  ['dictionary', 'Dictionary', 'dictionary.png']
];

for (const [id, label, file] of presets) {
  assert.match(shell, new RegExp(`id: "${id}".*label: "${label}".*${file.replace('.', '\\.')}`));
  const asset = path.join(root, 'neo-os/assets/tab-appearance', file);
  assert(fs.existsSync(asset), `${file} is missing`);
  assert(fs.statSync(asset).size > 100, `${file} is empty`);
}
assert.match(shell, /id: "classroom", label: "Classroom", title: "Home - Classroom"/);
const customAsset = path.join(root, 'neo-os/assets/tab-appearance/custom.svg');
assert(fs.existsSync(customAsset) && fs.statSync(customAsset).size > 100, 'custom.svg is missing');

const presetSource = shell.slice(shell.indexOf('var tabAppearancePresets'), shell.indexOf('function normalizeTabAppearance'));
assert(!/https?:\/\//.test(presetSource), 'tab presets must not make runtime network requests');
assert.match(shell, /designVersion: 31/);
assert.match(shell, /tabAppearance: "classroom"/);
assert.match(shell, /savedDesignVersion < 31[\s\S]*savedSettings\.tabAppearance = "classroom"/);
assert.match(shell, /customTabTitle: "My tab"/);
assert.match(shell, /function isValidCustomTabIcon\(value\)/);
assert.match(shell, /\^https\?:\\\/\\\/\[\^\\s\]\+\$/);
assert.match(shell, /function applyTabAppearance\(\)/);
assert.match(shell, /function applyTabAppearanceToDocument\(targetDocument, appearance\)/);
assert.match(shell, /targetDocument\.title = appearance\.title/);
assert.match(shell, /iconLink\.href = appearance\.icon/);
assert.match(shell, /window\.top\.location\.href === "about:blank"/);
assert.match(shell, /type: "neo-shell:tab-appearance"/);
assert.match(shell, /messageEvent\.source !== frame\.contentWindow/);
assert.match(shell, /frame\.srcdoc = html/);
assert.match(shell, /data-neo-autostart=/);
assert.match(shell, /fetch\(sourceUrl, \{ cache: "no-store", credentials: "omit" \}\)/);
assert.match(shell, /setCustomTabAppearance: setCustomTabAppearance/);
assert.match(shell, /getTabAppearancePresets/);
assert.match(launcher, /event\.source !== frame\.contentWindow/);
assert.match(launcher, /message\.type !== "neo-shell:tab-appearance"/);
assert.match(launcher, /applyTabAppearance\(popup\.document, message\.detail\)/);
assert.match(launcher, /<title>Home - Classroom<\/title>/);
assert.match(launcher, /assets\/tab-appearance\/classroom\.png/);
assert.match(index, /<title>Home - Classroom<\/title>/);

assert.match(desktop, /tabAppearanceEditor\(app\)/);
assert.match(desktop, /personalizationControls\(integrated,\{integrated:true\}\)/);
assert.match(desktop, /integrated-personalization-settings/);
assert.match(desktop, /querySelectorAll\('\.desktop-settings-shortcuts'\)\.forEach\(shortcut=>shortcut\.remove\(\)\)/);
assert.match(desktop, /Choose a custom tab icon/);
assert.match(desktop, /Custom tab icon URL/);
assert.match(desktop, /iconUrl\.type='url'/);
assert.match(desktop, /tab-appearance-custom-fields/);
assert.match(desktop, /Use default icon/);
assert.match(desktop, /Save custom tab/);
assert.match(desktop, /neo-tab-appearance-change/);

assert.match(styles, /\.tab-appearance-grid/);
assert.match(styles, /grid-template-columns: repeat\(4/);
assert.match(styles, /\.tab-appearance-choice\.is-selected/);
assert.match(styles, /\.tab-appearance-custom-fields/);
assert.match(styles, /grid-template-columns: repeat\(2/);
assert.match(index, /neo-production-polish\.css\?v=20260919-browser-search-v1/);
assert.match(index, /neo-desktop-platform\.js\?[^"']*tab=custom-url-v1/);
assert.match(index, /neo-os\.js\?[^"']*tab=classroom-default-v1/);
assert.match(index, /<h2>Settings<\/h2>/);

console.log('Tab appearance preset checks passed.');
