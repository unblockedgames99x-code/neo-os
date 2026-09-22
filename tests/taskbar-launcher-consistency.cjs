const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const shell = read('neo-os/neo-os.js');
const launcherCss = read('neo-os/neo-retro-theme.css');
const taskbarCss = read('neo-os/neo-vertical-taskbar.css');
const polishCss = read('neo-os/neo-production-polish.css');
const html = read('neo-os/index.html');

assert.match(shell, /function launcherIsOpen\(\)/);
assert.match(shell, /launcher\.classList\.add\("is-open"\)/);
assert.match(shell, /launcher\.classList\.add\("is-closing"\)/);
assert.match(shell, /window\.setTimeout\(finishLauncherClose, 260\)/);
assert.match(taskbarCss, /html\.neo-launcher-open\[data-taskbar-position\] \.taskbar\s*\{[^}]*z-index:\s*6100;/s);
assert.match(launcherCss, /\.app-launcher\s*\{[^}]*-webkit-backdrop-filter:\s*none\s*!important;[^}]*backdrop-filter:\s*none\s*!important;/s);
assert.match(launcherCss, /\.launcher-dismiss-layer\s*\{[^}]*var\(--desktop-bg,[^}]*backdrop-filter:\s*blur\(18px\)/s);
assert.match(html, /neo-retro-theme\.css\?v=20260907-taskbar-launcher-v1/);
assert.match(html, /neo-vertical-taskbar\.css\?v=20260907-taskbar-launcher-v1/);
assert.match(html, /neo-os\.js\?v=20260912-media-popout-v1[^\"']*taskbar=pinned-bottom-scroll-v1/);
assert.match(html, /neo-running-taskbar\.css\?v=20260912-pinned-bottom-scroll-v1/);
assert.match(html, /class="taskbar-start-button"[^>]*data-open-launcher[^>]*aria-expanded="false"/);
assert.match(html, /launcher=motion-v1/);
assert.match(polishCss, /\.app-launcher\.is-open\s*\{[^}]*opacity:\s*1\s*!important;[^}]*scale\(1\)/s);
assert.match(polishCss, /\.launcher-dismiss-layer\.is-open\s*\{[^}]*opacity:\s*1\s*!important;/s);
assert.match(polishCss, /prefers-reduced-motion:\s*reduce/);

for (const edge of ['top', 'right', 'bottom', 'left']) {
  assert.match(taskbarCss, new RegExp('data-taskbar-position="' + edge + '"'));
}

console.log('Taskbar and launcher consistency contract passed.');
