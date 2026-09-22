const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const index = read('neo-os/index.html');
const polish = read('neo-os/neo-production-polish.css');
const themes = read('neo-os/neo-theme-system.css');

const polishLink = './neo-production-polish.css?v=20260907-window-island-v3';
assert(index.includes(polishLink), 'main shell is missing the production polish layer');
assert(index.indexOf(polishLink) > index.indexOf('neo-theme-system.css'), 'production polish must load after the theme contract');

for (const selector of [
  '.neo-window',
  '.native-app',
  '.app-launcher',
  '.notification-center',
  '.desktop-context-menu',
  'html[data-taskbar-position] .taskbar',
  'html[data-performance-mode="performance"]',
  'html[data-taskbar-outline="false"] .taskbar'
]) {
  assert(polish.includes(selector), `production polish is missing ${selector}`);
}

for (const token of [
  '--neo-radius-control',
  '--neo-control-height',
  '--neo-glass-strong',
  '--neo-polish-ease'
]) {
  assert(polish.includes(token), `production polish is missing ${token}`);
}

assert(polish.includes('@media (max-width: 760px)'));
assert(polish.includes('@media (prefers-reduced-motion: reduce)'));
assert(polish.includes('@media (forced-colors: active)'));
assert(themes.includes('html[data-neo-app] :where(button, a, input, select, textarea):focus-visible'));
assert(!/url\(\s*['"]?https?:/i.test(polish), 'polish layer must remain local/offline-safe');

console.log('Production polish contract passed.');
