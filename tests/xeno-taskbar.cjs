const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('neo-os/index.html', 'utf8');
const shell = fs.readFileSync('neo-os/neo-os.js', 'utf8');
const styles = fs.readFileSync('neo-os/neo-xeno-taskbar.css', 'utf8');

assert.match(html, /data-taskbar-style-option="xeno"[\s\S]*?<strong>XENO<\/strong>/);
assert.match(html, /id="xeno-command-center"[\s\S]*?id="xeno-command-search"[\s\S]*?id="xeno-command-results"/);
assert.match(html, /neo-xeno-taskbar\.css\?v=20260919-command-motion-v2/);
assert.match(html, /neo-os\.js\?[^"']*xeno=command-motion-v2/);

assert.match(shell, /return value === "transparent" \|\| value === "typical" \|\| value === "xeno" \? value : "current"/);
assert.match(shell, /if \(settings\.taskbarStyle === "xeno"\) \{[\s\S]*?openWindows\.forEach/);
assert.match(shell, /settings\.taskbarStyle === "xeno" \|\| settings\.taskbarRunningApps \? taskbarAppIds\(\) : \[\]/);
assert.match(shell, /button\.classList\.toggle\("is-active", Boolean\(win && win\.classList\.contains\("is-active"\)/);
assert.match(shell, /var values = \[app\.title, app\.subtitle, app\.category\]\.concat\(app\.aliases \|\| \[\]\)/);
assert.match(shell, /function createXenoCommandItem\(app, index\)/);
assert.match(shell, /function renderXenoCommand\(\)[\s\S]*?launcherApps\(\)/);
assert.match(shell, /xenoCommand\.dataset\.mode = mode === "apps" \? "apps" : "search"/);
assert.match(shell, /event\.code === "Space"[\s\S]*?xenoDesktopShortcutAllowed\(event\.target\)[\s\S]*?setXenoCommandOpen\(true, "search"/);
assert.match(shell, /if \(event\.key === "Control"\)[\s\S]*?ctrlTapCandidate[\s\S]*?document\.addEventListener\("keyup"[\s\S]*?setXenoCommandOpen\(!toggleXenoApps, "apps"/);
assert.match(shell, /blocked = "[^"]*input[^"]*iframe[^"]*contenteditable[^"]*\.neo-window/);
assert.match(shell, /setWindowMotionOrigin\(win, appId\)[\s\S]*?\.taskbar \.dock-button\[data-app\]/);

assert.match(styles, /data-taskbar-style="xeno"[^\{]*\.window-layer\s*\{[\s\S]*?inset: var\(--topbar-height\) 0 0 !important/);
assert.match(styles, /data-taskbar-style="xeno"[^\{]*\.taskbar:has\(#neo-dock:empty\)[\s\S]*?display: none !important/);
assert.match(styles, /\.taskbar-start-button,[\s\S]*?\.taskbar-tray[\s\S]*?display: none !important/);
assert.match(styles, /data-taskbar-style="xeno"[^\{]*\.dock-app-name[\s\S]*?display: block !important/);
assert.match(styles, /\.dock-button\.is-active[\s\S]*?border-color:/);
assert.match(styles, /\.xeno-command-center\[data-mode="apps"\][\s\S]*?width: min\(880px/);
assert.match(styles, /@keyframes xeno-pill-in/);
assert.match(styles, /@keyframes xeno-pill-out/);
assert.match(styles, /@keyframes xeno-command-open/);
assert.match(styles, /@keyframes xeno-command-close/);
assert.match(styles, /@keyframes xeno-command-content-in/);
assert.match(shell, /--neo-command-open-duration/);
assert.match(shell, /Math\.round\(235 \* \(100 \/ settings\.animationSpeed\)\)/);
assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
assert.match(styles, /@media \(forced-colors: active\)/);

console.log('XENO taskbar, Space search, Ctrl menu, persistence, motion, and accessibility contracts passed.');
