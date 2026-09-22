const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const html = read('neo-os', 'index.html');
const shell = read('neo-os', 'neo-os.js');
const css = read('neo-os', 'neo-taskbar-app-visibility.css');

assert.match(html, /data-taskbar-app-mode="desktop"/);
assert.doesNotMatch(html, /Taskbar in apps|data-setting="taskbarAppMode"|Hide in fullscreen|Always show/);
assert.match(html, /neo-taskbar-app-visibility\.css\?v=20260920-fullscreen-only-v4/);
assert.match(html, /taskbar-visibility=fullscreen-only-v4/);
assert.match(shell, /taskbarAppMode: "desktop"/);
assert.match(shell, /function normalizeTaskbarAppMode\(value\) \{\s*return "desktop";/);
assert.match(shell, /function syncTaskbarAppVisibility\(\)/);
assert.match(shell, /\.neo-window\.is-active:not\(\.is-minimized\):not\(\.is-closing\)/);
assert.match(shell, /activeApp\.matches\("\.is-maximized, \.is-tab-fullscreen"\)/);
assert.match(shell, /var state = fullscreenApp \? "hidden" : "desktop"/);
assert.doesNotMatch(shell, /function appWindowFullscreen|mode === "fullscreen"|state = "overlay"/);
assert.match(shell, /root\.dataset\.taskbarAppState = state/);
assert.match(css, /data-taskbar-app-state="hidden"[^}]*\.window-layer[\s\S]*?inset: var\(--topbar-height\) 0 0 !important/);
assert.match(css, /data-taskbar-app-state="hidden"[^}]*\.taskbar[\s\S]*?opacity: 0 !important[\s\S]*?pointer-events: none !important/);
assert.match(css, /data-taskbar-app-state="hidden"[^}]*\.topbar[\s\S]*?opacity: 0 !important[\s\S]*?pointer-events: none !important/);
assert.match(css, /data-taskbar-app-state="hidden"[^}]*\.neo-window:is\(\.is-maximized, \.is-tab-fullscreen\)[\s\S]*?position: fixed !important[\s\S]*?inset: 0 !important[\s\S]*?height: 100dvh !important[\s\S]*?max-width: none !important[\s\S]*?max-height: none !important/);
assert.match(css, /data-taskbar-style="xeno"[\s\S]*?translate3d\(-50%, calc\(100% \+ 48px\), 0\)/);
assert.match(css, /prefers-reduced-motion: reduce/);

new vm.Script(shell, { filename: 'neo-os.js' });
console.log('Fullscreen-only taskbar visibility contract passed.');
