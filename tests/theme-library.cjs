const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const source = read('neo-os/neo-desktop-config.js');
const css = read('neo-os/neo-theme-system.css');
const polish = read('neo-os/neo-production-polish.css');
const platform = read('neo-os/neo-desktop-platform.js');
const appTheme = read('neo-os/neo-app-theme.js');
const index = read('neo-os/index.html');
const sandbox = { window: {}, document: { currentScript: { src: 'http://local/neo-os/neo-desktop-config.js' } }, URL };
vm.runInNewContext(source, sandbox);

const config = sandbox.window.NEO_DESKTOP_CONFIG;
const expected = [
  'crimson','ember-dusk','terracotta','tangerine','amber-haze','marigold',
  'citron','olive-grove','clover','fern-hollow','emerald','eucalyptus',
  'aqua','glacier','azure','indigo-veil','violet','amethyst-smoke',
  'plum-velvet','fuchsia','orchid-smoke','rosewood','default','glass','acrylic',
  'coral','copper','moss','teal','ocean','cobalt','lavender-night','sakura','slate','obsidian'
];

assert.ok(Object.keys(config.themes).length >= 82, 'Expected the complete expanded theme library.');
for (const name of expected) {
  assert(Object.hasOwn(config.themes, name), `${name} is missing from the theme library`);
  assert(config.themeLabels[name], `${name} is missing its display name`);
  assert(css.includes(`data-neo-theme="${name}"`), `${name} is missing shared app tokens`);
}

for (const [name, palette] of Object.entries(config.themes)) {
  assert.equal(palette.length, 6, `${name} must contain six semantic colors`);
  palette.forEach(color => assert.match(color, /^#[0-9a-f]{6}$/i, `${name} contains an invalid color`));
  assert(appTheme.includes(`'${name}'`), `${name} is missing from the embedded app theme bridge`);
}

assert(platform.includes('theme-palette-preview'));
assert(platform.includes('theme-accent-preview'));
assert(polish.includes('html[data-neo-theme="glass"]'));
assert(!read('neo-os/neo-system-bridge.js').includes("glass:'graphite'"));
assert.match(css, /html\[data-neo-theme="acrylic"\][\s\S]*?--neo-acrylic-backdrop:\s*blur\(26px\) saturate\(145%\)/);
assert.match(css, /html\[data-neo-theme="acrylic"\]\.is-window-interacting[\s\S]*?backdrop-filter:\s*none !important/);
assert.match(css, /data-performance-mode="performance"[\s\S]*?data-performance-mode="ultimate"[\s\S]*?backdrop-filter:\s*none !important/);
assert.match(css, /@media \(prefers-reduced-transparency: reduce\)[\s\S]*?--neo-acrylic-canvas:\s*var\(--neo-acrylic-solid-bg\)/);
assert.match(appTheme, /'acrylic'/, 'Acrylic must cross the embedded-app theme bridge unchanged.');
assert.doesNotMatch(appTheme, /acrylic\s*:\s*['"]/i, 'Acrylic must not be aliased to a legacy theme.');
const acrylicRules = css.slice(css.indexOf('/* Acrylic is an opt-in'), css.indexOf('@media (max-width: 700px)'));
assert(acrylicRules.length > 0, 'Acrylic structural rules are missing.');
assert.doesNotMatch(acrylicRules, /^\s*filter\s*:/m, 'Acrylic must not filter app content or artwork.');
assert.doesNotMatch(acrylicRules, /^\s*opacity\s*:/m, 'Acrylic must not fade app content or artwork.');
assert.doesNotMatch(acrylicRules, /html\[data-neo-theme="acrylic"\]\s+(?:img|picture|video|canvas)\b/, 'Acrylic must not target media or artwork.');
assert(/neo-desktop-config\.js\?v=20260912-acrylic-theme-v1/.test(index));
assert(index.includes('neo-theme-system.css?v=20260912-acrylic-theme-v1'));

console.log('Expanded theme library checks passed.');
