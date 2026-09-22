const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const shell = read('neo-os', 'neo-os.js');
const extraApps = read('neo-os', 'neo-apps.js');
const platform = read('neo-os', 'neo-desktop-platform.js');
const styles = read('neo-os', 'neo-interface-styles.css');
const theme = read('neo-os', 'neo-theme-system.css');
const desktop = read('neo-os', 'neo-desktop.css');
const bridge = read('neo-os', 'neo-app-theme.js');
const chatStandalone = read('neo-os', 'neo-chat-standalone.css');

function registryIds(source, startPattern, endPattern) {
  const start = source.search(startPattern);
  assert.notEqual(start, -1, `Could not find registry start ${startPattern}`);
  const tail = source.slice(start);
  const end = tail.search(endPattern);
  assert.notEqual(end, -1, `Could not find registry end ${endPattern}`);
  return [...tail.slice(0, end).matchAll(/^\s{4}(?:"([^"]+)"|([a-z][\w-]*)):\s*\{\s*\r?\n\s{6}id:\s*"([^"]+)"/gm)]
    .map(match => match[3]);
}

const registered = [
  ...registryIds(shell, /var apps = \{/, /Object\.assign\(apps,/),
  ...registryIds(extraApps, /window\.NEO_EXTRA_APPS = Object\.assign/, /window\.NEORenderActiveApp/),
  ...[...platform.matchAll(/^\s{4}([a-z][\w-]*):\s*\{id:'([^']+)'/gm)].map(match => match[2])
].filter((id, index, ids) => ids.indexOf(id) === index).sort();

const nativeApps = [
  'files', 'zones', 'music', 'media', 'wallpaper', 'control', 'terminal',
  'calendar', 'notes', 'calculator', 'paint', 'clock', 'skins', 'vscode', 'app-installer'
];
const bridgedApps = ['browser', 'stream', 'chat', 'cinehd', 'discord', 'youtube-app', 'neo-cloud', 'nowgg', 'neo-ai'];
const contentPreservingApps = ['report', 'geometry-dash'];
const classified = [...nativeApps, ...bridgedApps, ...contentPreservingApps].sort();

assert.deepEqual(registered, classified, 'Every registered app must have one interface-style strategy');

assert.match(shell, /function interfaceStyleScopeForApp\(app\)/);
assert.match(shell, /\["browser", "stream", "chat", "cinehd", "discord", "youtube-app", "neo-cloud", "nowgg", "neo-ai"\]/);
assert.match(shell, /\["skins", "vscode", "terminal"\][\s\S]*?return "native"/);
assert.match(shell, /if \(app\.template \|\| app\.lazy \|\| app\.runtime\) return "native"/);
assert.match(shell, /return "shell"/);
assert.match(shell, /win\.dataset\.interfaceStyleScope = interfaceStyleScopeForApp\(app\)/);
assert.match(shell, /frameRoot\.dataset\.neoInterfaceStyleScope = scope/);
assert.match(shell, /scope === "bridge" && frameDocument\.head/);
assert.match(shell, /frame\.contentWindow\.postMessage\(\{ type: "neo-shell:interface-style", style: style \}/);

const nativeSelectors = new Map([
  ['files', '.neo-window[data-app-id="files"] .neo-files'],
  ['zones', '.neo-window[data-app-id="zones"] .neo-library'],
  ['music', '.neo-window[data-app-id="music"] :is(.music-app,.feature-sidebar,.feature-content,.music-player)'],
  ['media', '.neo-window[data-app-id="media"] .media-app'],
  ['wallpaper', '.wallpaper-studio .studio-shell'],
  ['control', '.neo-window[data-app-id="control"] .control-center'],
  ['terminal', '.neo-window[data-app-id="terminal"] .desktop-terminal'],
  ['calendar', '.neo-window[data-app-id="calendar"] .calendar-app'],
  ['notes', '.neo-window[data-app-id="notes"] .neo-utility'],
  ['calculator', '.neo-window[data-app-id="calculator"] .neo-calculator'],
  ['paint', '.neo-window[data-app-id="paint"] .neo-utility'],
  ['clock', '.neo-window[data-app-id="clock"] .neo-utility'],
  ['skins', '.neo-window[data-app-id="skins"] .widget-manager'],
  ['vscode', '.neo-window[data-app-id="vscode"] .desktop-editor'],
  ['app-installer', '.neo-window[data-app-id="app-installer"] .app-installer']
]);

for (const id of nativeApps) {
  const selector = nativeSelectors.get(id);
  assert(selector, `No Retro selector contract was declared for ${id}`);
  assert(styles.includes(selector), `Retro styling does not cover ${id}: ${selector}`);
}

assert(styles.includes('.neo-window[data-app-id="control"] .integrated-personalization-settings'),
  'Merged personalization controls must retain explicit Retro coverage inside System Settings');

for (const selector of [
  'html[data-interface-style="retro"][data-neo-app="music"]',
  'html[data-interface-style="retro"][data-neo-app="browser"]',
  'html[data-interface-style="retro"][data-neo-app="cloud"]',
  'html[data-interface-style="retro"][data-neo-app="tv"]'
]) assert(styles.includes(selector), `Embedded Retro coverage is missing ${selector}`);

assert(chatStandalone.includes('html[data-interface-style="retro"][data-neo-app="chat"]'), 'Embedded Retro coverage is missing NEO Chat');
assert(chatStandalone.includes('html[data-interface-style="modern"][data-neo-app="chat"]'), 'Embedded Modern coverage is missing NEO Chat');
assert(chatStandalone.includes('var(--desktop-accent'), 'NEO Chat must inherit the selected system theme');

for (const appPage of [
  ['neo-os', 'NEO-BROWSER', 'index.html'],
  ['neo-os', 'music-v2', 'index.html'],
  ['neo-os', 'neo-cloud', 'index.html'],
  ['neo-os', 'neo-tv', 'index.html'],
  ['neo-os', 'neo-chat', 'index.html'],
  ['neo-os', 'local-browser', 'index.html'],
  ['neo-os', 'local-browser', 'connection.html'],
  ['neo-os', 'local-browser', 'unavailable.html'],
  ['neo-os', 'local-browser', 'support.html']
]) {
  const page = read(...appPage);
  assert.match(page, /neo-theme-system\.css/, `${appPage.join('/')} is missing theme tokens`);
  assert.match(page, /neo-app-theme\.js/, `${appPage.join('/')} is missing the style bridge`);
}

for (const embedded of ['music', 'local-browser', 'browser-newtab', 'browser', 'cloud', 'tv']) {
  assert(theme.includes(`html[data-neo-app="${embedded}"]`), `Theme coverage is missing ${embedded}`);
}

assert.match(bridge, /root\.dataset\.interfaceStyle = activeInterfaceStyle/);
assert.match(bridge, /root\.dataset\.neoTheme = next\.theme/);
assert.match(bridge, /document\.querySelectorAll\('iframe'\)\.forEach\(sendFrameInterface\)/);
assert.match(styles, /--retro-accent:\s*color-mix\([^;]*var\(--desktop-accent/,
  'Retro must continue to use the selected system theme accent');
assert.match(theme, /html\[data-neo-theme\] :is\(\.desktop-app/,
  'Desktop-platform apps must continue to inherit every system theme');
assert.match(desktop, /\.editor-work,\.editor-right\{display:grid/,
  'The registered Code Workspace markup must use the editor layout');
assert.match(desktop, /\.terminal-session-output,\.terminal-log\{/,
  'The registered Terminal markup must use the terminal output layout');
assert(styles.includes('html[data-interface-style="retro"] .neo-window'), 'Shell-only apps still need Retro window chrome');
assert(!styles.includes('html[data-interface-style="modern"] .neo-window'), 'Modern must remain the unchanged default');

console.log(`App style passthrough covers all ${registered.length} registered apps.`);
