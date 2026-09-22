const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const config = read('neo-os/neo-desktop-config.js');
const bridge = read('neo-os/neo-system-bridge.js');
const appTheme = read('neo-os/neo-app-theme.js');
const css = read('neo-os/neo-theme-system.css');
const oldDesktopCss = read('neo-os/neo-desktop.css');
const platform = read('neo-os/neo-desktop-platform.js');

for (const theme of ['graphite','oled','midnight','frost','ember','contrast']) {
  assert.match(config, new RegExp('\\b' + theme.replace('-', '\\-') + '\\s*:'));
  assert(css.includes(`data-neo-theme="${theme}"`));
}

assert(bridge.includes("const defaults={theme:'oled'"));
assert(bridge.includes("state.theme='oled'"));
assert(bridge.includes("'high-contrast':'contrast'"));
assert(bridge.includes("type==='neo-system-preferences-request'"));
assert(bridge.includes("frame.addEventListener('load'"));
assert(bridge.includes('palette:palette()'));
assert(bridge.includes("location.origin==='null'?'*':location.origin"));
assert(bridge.includes("find(frame=>frame.contentWindow===e.source)"));
assert(appTheme.includes("root.dataset.neoApp"));
assert(appTheme.includes("parent.postMessage({type:'neo-system-preferences-request'}"));
assert(appTheme.includes("location.origin === 'null' ? '*' : location.origin"));
assert(appTheme.includes("document.querySelectorAll('iframe').forEach(sendFramePreferences)"));
assert.match(appTheme, /function sendFramePreferences\(frame\)\s*\{\s*if \(isProxyFrame\(frame\)\) return;\s*sendPreferences\(frame\.contentWindow\);/);
assert(appTheme.includes("new MutationObserver"));
assert(platform.includes("el('div','desktop-grid theme-grid')"));
assert(platform.includes("b.classList.add('theme-choice')"));
assert(!platform.includes('Wallpaper references'));
assert(!platform.includes('C.wallpapers'));
assert(!config.includes('wallpapers: ['));
assert(css.includes('html[data-neo-app="music"]'));
assert(css.includes('html[data-neo-app="browser"]'));
assert(css.includes('html[data-neo-app="cloud"]'));
assert(css.includes('html[data-neo-app="tv"]'));
assert(css.includes('html[data-neo-app="browser-newtab"]'));
assert(css.includes('--desktop-surface-2'));
assert(css.includes('.neo-messages.is-signed-out .messages-composer-shell'));
assert(css.includes('html[data-neo-theme] .neo-files'));
assert(!oldDesktopCss.includes(':is(.messages-app,.messages-sidebar,.messages-main,.native-app'));
assert(!/url\(\s*['"]?https?:/i.test(css));

for (const file of [
  'neo-os/music-local/index.html',
  'neo-os/music-v2/index.html',
  'neo-os/local-browser/index.html',
  'neo-os/NEO-BROWSER/index.html',
  'neo-os/neo-cloud/index.html',
  'neo-os/neo-tv/index.html',
  'neo-os/neo-chat/index.html'
]) {
  const html = read(file);
  assert.match(html, /<script\b[^>]*src=["']\.\.\/neo-app-theme\.js\?[^"']+["']/, `${file} is missing the app theme bridge`);
  assert.match(html, /<link\b(?=[^>]*rel=["']stylesheet["'])[^>]*href=["']\.\.\/neo-theme-system\.css\?[^"']+["']/, `${file} is missing shared theme styles`);
}

const musicV2Css = read('neo-os/music-v2/neo-ui.css');
assert(musicV2Css.includes('--background: var(--desktop-bg) !important'));
assert(musicV2Css.includes('--primary: var(--desktop-accent) !important'));
assert(musicV2Css.includes('background: var(--desktop-bg) !important'));
assert(!musicV2Css.includes('--background: #000'));
assert(!musicV2Css.includes('body { background: #000'));

const index = read('neo-os/index.html');
assert(index.includes('data-neo-app="shell"'));
assert(index.includes('neo-system-bridge.js?v=20260909-oled-default-v1'));
assert(/neo-theme-system\.css\?v=20260912-acrylic-theme-v1/.test(index));
assert.match(read('neo-os/neo-os.js'), /script\.src = "\.\/neo-browser-runtime\.js\?[^\"]+";/);
assert(index.indexOf('neo-theme-system.css') > index.indexOf('neo-skin-interactions.css'));
const newTab = read('neo-os/browser-newtab.html');
assert(newTab.includes('./neo-app-theme.js?v=20260907-theme-system-v2'));
assert(newTab.includes('./neo-theme-system.css?v=20260907-theme-system-v2'));
console.log('Theme system contract passed.');
