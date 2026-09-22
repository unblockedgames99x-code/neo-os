const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const css = read('neo-os', 'neo-theme-system.css');
const wallpaperDiscoverCss = read('neo-os', 'neo-wallpaper-discover.css');
const musicFrameCss = read('neo-os', 'stream-music-frame.css');
const browserRuntime = read('neo-os', 'neo-browser-runtime.js');
const bridge = read('neo-os', 'neo-system-bridge.js');
const appTheme = read('neo-os', 'neo-app-theme.js');
const musicV2Css = read('neo-os', 'music-v2', 'neo-ui.css');

for (const selector of [
  '.neo-window', '.app-launcher', '.notification-center', '.desktop-context-menu',
  '.control-center', '.desktop-app', '.neo-messages', '.neo-files', '.neo-utility',
  '.neo-library', '.wallpaper-studio'
]) assert(css.includes(selector), `shared theme is missing ${selector}`);

for (const app of ['music','local-browser','browser-newtab','browser','cloud','tv']) {
  assert(css.includes(`html[data-neo-app="${app}"]`), `embedded app theme is missing ${app}`);
}

for (const token of [
  '--desktop-surface-2', '--neo-theme-control', '--neo-theme-control-hover',
  '--neo-theme-selected', '--neo-theme-glass', '--neo-theme-transition'
]) assert(css.includes(token), `theme token is missing ${token}`);

assert(css.includes('.messages-composer [data-chat-attach]'));
assert(css.includes('.messages-composer [data-chat-send]'));
assert(css.includes('.calculator-grid :is(.is-operator,.is-equals)'));
assert(css.includes('.neo-library .arcade-pulse-hero'));
assert(css.includes('.wallpaper-card.is-selected'));
for (const selector of [
  '.wallpaper-studio .studio-shell',
  '.studio-sidebar',
  '.studio-inspector',
  '.we-source-tabs',
  '.we-playlist-bar',
  '.we-source-tabs button.is-active',
  '.wallpaper-studio .wallpaper-favorite',
  '.wallpaper-studio .wallpaper-active-badge'
]) assert(css.includes(selector), `Wallpaper Studio theme is missing ${selector}`);
for (const selector of [
  '.wallpaper-studio[data-wallpaper-source] .we-filter-panel',
  '.wallpaper-studio[data-wallpaper-source] .wallpaper-online-card',
  '.wallpaper-studio[data-wallpaper-source] .wallpaper-card-skeleton',
  '.wallpaper-studio[data-wallpaper-source] .wallpaper-online-link'
]) assert(wallpaperDiscoverCss.includes(selector), `Wallpaper catalog theme is missing ${selector}`);
assert(wallpaperDiscoverCss.includes('background: var(--neo-theme-control) !important'));
assert(wallpaperDiscoverCss.includes('border-color: var(--desktop-accent) !important'));
assert(bridge.includes("messageTargetOrigin=location.origin==='null'?'*':location.origin"));
assert(appTheme.includes("messageTargetOrigin = location.origin === 'null' ? '*' : location.origin"));
assert(musicFrameCss.includes('--stream-black: var(--desktop-bg)'));
assert(musicFrameCss.includes('--stream-text: var(--desktop-text)'));
assert(musicFrameCss.includes('background: var(--desktop-surface) !important'));
assert(!musicFrameCss.includes('--stream-black: #000000'));
assert(browserRuntime.includes('"--desktop-bg", "--desktop-surface", "--desktop-surface-2"'));
assert(browserRuntime.includes('tabs.forEach((tab) => applyAppTheme(tab))'));
assert(musicV2Css.includes('--card: var(--desktop-surface) !important'));
assert(musicV2Css.includes('--foreground: var(--desktop-text) !important'));
assert(musicV2Css.includes('--highlight: var(--desktop-accent) !important'));
assert(musicV2Css.includes('var(--neo-theme-control-hover)'));

console.log('Cross-app theme coverage checks passed.');
