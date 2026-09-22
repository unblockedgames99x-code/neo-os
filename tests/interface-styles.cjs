const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const html = read('neo-os', 'index.html');
const shell = read('neo-os', 'neo-os.js');
const platform = read('neo-os', 'neo-desktop-platform.js');
const appTheme = read('neo-os', 'neo-app-theme.js');
const styles = read('neo-os', 'neo-interface-styles.css');
const musicUi = read('neo-os', 'music-v2', 'neo-ui.js');

assert.match(html, /data-neo-app="shell" data-interface-style="modern"/);
assert.match(html, /neo-interface-styles\.css\?v=20260919-rounded-restored-windows-v1/);
assert.match(html, /saved\.interfaceStyle === "retro" \|\| saved\.interfaceStyle === "windows11" \|\| saved\.interfaceStyle === "kali"/);

assert.match(shell, /interfaceStyle: "modern"/);
assert.match(shell, /function normalizeInterfaceStyle\(value\)/);
assert.match(shell, /root\.dataset\.interfaceStyle = settings\.interfaceStyle/);
assert.match(shell, /data-interface-style-option/);
assert.match(shell, /aliases: \["settings", "preferences", "appearance", "styles", "modern", "retro"/);
assert.match(shell, /neo-shell:interface-style/);
assert.match(shell, /neo-interface-style-change/);
assert.match(shell, /applyInterfaceStyleToFrame\(frame\)/);
assert.match(shell, /function interfaceStyleScopeForApp\(app\)/);
assert.match(shell, /win\.dataset\.interfaceStyleScope = interfaceStyleScopeForApp\(app\)/);
assert.match(shell, /scope === "bridge" && !frameRoot\.dataset\.neoApp/);

assert.match(platform, /section\(parent,'Styles'\)/);
assert.match(platform, /\{id:'modern',label:'Modern'/);
assert.match(platform, /\{id:'retro',label:'Retro'/);
assert.match(platform, /Themes remain separate and continue to control the colors/);
assert.match(platform, /shell\.setSetting\('interfaceStyle',style\.id\)/);

assert.match(appTheme, /neo-interface-styles\.css\?v=20260919-rounded-restored-windows-v1/);
assert.match(appTheme, /const isMusicApp = window\.__NEO_MUSIC__ === true \|\| \/\\\/music-/);
assert.match(appTheme, /root\.dataset\.neoApp = isMusicApp && activeInterfaceStyle === 'retro' \? 'music' : routedApp/);
assert.match(appTheme, /root\.dataset\.neoInterfaceStyle = activeInterfaceStyle/);
assert.match(appTheme, /event\.data\?\.type === 'neo-shell:interface-style'/);

for (const appPage of [
  ['neo-os', 'NEO-BROWSER', 'index.html'],
  ['neo-os', 'browser-newtab.html'],
  ['neo-os', 'local-browser', 'index.html'],
  ['neo-os', 'local-browser', 'connection.html'],
  ['neo-os', 'local-browser', 'unavailable.html'],
  ['neo-os', 'local-browser', 'support.html'],
  ['neo-os', 'music-local', 'index.html'],
  ['neo-os', 'music-v2', 'index.html'],
  ['neo-os', 'neo-cloud', 'index.html'],
  ['neo-os', 'neo-tv', 'index.html']
]) {
  assert.match(read(...appPage), /neo-app-theme\.js\?v=[^"']*styles=launcher-picture-alignment-v12/, `${appPage.join('/')} does not load the shared style bridge`);
}

for (const selector of [
  'html[data-interface-style="retro"] .neo-window',
  'html[data-interface-style="retro"][data-taskbar-position] .taskbar',
  'html[data-interface-style="retro"] #widget-layer > .neo-widget',
  'html[data-interface-style="retro"] :is(.neo-taskbar-preview,.neo-minimized-card)',
  'html[data-interface-style="retro"] :is(.neo-taskbar-preview-titlebar,.neo-minimized-card-header)',
  'html[data-interface-style="retro"] .neo-minimized-card-icon',
  'html[data-interface-style="retro"] .app-launcher',
  'html[data-interface-style="retro"] :is(.native-app,.desktop-app,.feature-dialog)',
  'html[data-interface-style="retro"] .wallpaper-studio .studio-sidebar',
  'html[data-interface-style="retro"] .wallpaper-studio .studio-library',
  'html[data-interface-style="retro"] .wallpaper-studio .studio-inspector',
  'html[data-interface-style="retro"] .wallpaper-studio .wallpaper-card',
  'html[data-interface-style="retro"] .wallpaper-studio .we-playlist-bar',
  'html[data-interface-style="retro"] .neo-window[data-app-id="calculator"] .neo-calculator',
  'html[data-interface-style="retro"] .neo-window[data-app-id="calculator"] .calculator-display',
  'html[data-interface-style="retro"] .neo-window[data-app-id="calculator"] .calculator-grid button',
  'html[data-interface-style="retro"] .neo-window[data-app-id="files"] .neo-files',
  'html[data-interface-style="retro"] .neo-window[data-app-id="files"] .files-search',
  'html[data-interface-style="retro"] .neo-window[data-app-id="files"] .files-main',
  'html[data-interface-style="retro"] .neo-window[data-app-id="files"] .files-item',
  'html[data-interface-style="retro"] .neo-window[data-app-id="chat"] .neo-messages',
  'html[data-interface-style="retro"] .neo-window[data-app-id="chat"] .messages-conversation',
  'html[data-interface-style="retro"] .neo-window[data-app-id="chat"] .native-message-bubble',
  'html[data-interface-style="retro"] .neo-window[data-app-id="chat"] .messages-composer-shell',
  'html[data-interface-style="retro"] .neo-window[data-interface-style-scope="native"] > .window-body',
  'html[data-interface-style="retro"] .neo-window[data-app-id="media"] .media-app',
  'html[data-interface-style="retro"] .neo-window[data-app-id="music"] :is(.music-app,.feature-sidebar,.feature-content,.music-player)',
  'html[data-interface-style="retro"] .neo-window[data-app-id="terminal"] .desktop-terminal',
  'html[data-interface-style="retro"] .neo-window[data-app-id="control"] .integrated-personalization-settings :is(.desktop-section,.interface-style-choice,.tab-appearance-choice,.theme-choice,.cursor-theme-choice,.tab-appearance-custom-preview)',
  'html[data-interface-style="retro"] .neo-window[data-app-id="skins"] .widget-manager',
  'html[data-interface-style="retro"] .neo-window[data-app-id="vscode"] .desktop-editor',
  'html[data-interface-style="retro"] .neo-window[data-app-id="notes"] .neo-utility',
  'html[data-interface-style="retro"] .neo-window[data-app-id="paint"] .neo-utility',
  'html[data-interface-style="retro"] .neo-window[data-app-id="clock"] .neo-utility',
  'html[data-interface-style="retro"] .neo-window[data-app-id="calendar"] .calendar-app',
  'html[data-interface-style="retro"] .neo-window[data-app-id="control"] .control-center',
  'html[data-interface-style="retro"] .neo-window[data-app-id="zones"] .neo-library',
  'html[data-interface-style="retro"] .neo-window.is-tab-fullscreen > .tab-fullscreen-exit',
  'html[data-interface-style="retro"][data-neo-app="music"] .main-header',
  'html[data-interface-style="retro"][data-neo-app="browser"] .neo-browser-minimal .browser-chrome-inner',
  'html[data-interface-style="retro"][data-neo-app="browser"] .neo-browser-minimal .newtab',
  'html[data-interface-style="retro"][data-neo-app="browser"] .neo-browser-minimal .nt-search',
  'html[data-interface-style="retro"][data-neo-app="browser"] .neo-browser-minimal :is(.bookmarks-bar-wrap,.bookmarks-bar)',
  'html[data-interface-style="retro"][data-neo-app="cloud"] :is(.topbar,.primary-nav,.footer,.details-dialog,.settings-dialog,.service-notice,.catalog-state)'
]) {
  assert(styles.includes(selector), `Retro style is missing ${selector}`);
}

assert.match(styles, /--retro-accent:\s*color-mix\([^;]*var\(--desktop-accent/);
assert.match(styles, /html\[data-interface-style="retro"\] \.app-launcher \{[\s\S]*?color-scheme:\s*light !important;/);
assert.match(styles, /html\[data-interface-style="retro"\] \.app-launcher \.launcher-search input \{[\s\S]*?background:\s*transparent !important;/);
assert.match(styles, /html\[data-interface-style="retro"\] \.app-launcher \.launcher-app \.launcher-app-icon,[\s\S]*?background:\s*var\(--retro-deep-edge\) !important;/);
assert.match(styles, /html\[data-interface-style="retro"\] \.app-launcher \.launcher-app \.launcher-app-icon > :is\(svg,\.icon,img,\.app-image-icon,\.spotify-vector\),[\s\S]*?width:\s*24px !important;[\s\S]*?object-position:\s*center !important;/);
assert.match(styles, /html\[data-interface-style="retro"\]\[data-taskbar-position\] \.taskbar \.dock \{[\s\S]*?align-items:\s*center !important;[\s\S]*?gap:\s*4px !important;/);
assert.match(styles, /html\[data-interface-style="retro"\]\[data-taskbar-position\] \.taskbar \.dock-button \{[\s\S]*?width:\s*32px !important;[\s\S]*?place-items:\s*center !important;[\s\S]*?overflow:\s*hidden !important;/);
assert.match(styles, /html\[data-interface-style="retro"\] \.taskbar \.dock-button \.dock-app-art > :is\(img,svg\) \{[\s\S]*?object-fit:\s*contain !important;[\s\S]*?transform:\s*none !important;/);
assert.match(styles, /html\[data-interface-style="retro"\] \.neo-window\[data-app-id="chat"\] \.messages-conversation \{[\s\S]*?grid-template-rows:\s*66px 42px minmax\(0, 1fr\) auto !important;/);
assert.match(styles, /html\[data-interface-style="retro"\] \.neo-window\[data-app-id="chat"\] \.chat-local-tools > button \{[\s\S]*?width:\s*auto !important;[\s\S]*?white-space:\s*nowrap !important;/);
assert.match(styles, /html\[data-interface-style="retro"\] \.neo-window\[data-app-id="chat"\] \.messages-composer-shell \{[\s\S]*?grid-template-columns:\s*36px minmax\(0, 1fr\) 36px !important;/);
assert.match(styles, /html\[data-interface-style="retro"\] \.window-control,[\s\S]*?width:\s*28px !important;[\s\S]*?height:\s*26px !important;/);
assert.match(styles, /html\[data-interface-style="retro"\] \.window-control \.icon \{[\s\S]*?width:\s*14px !important;/);
assert.match(styles, /html\[data-interface-style="retro"\] :is\(\.neo-taskbar-preview,\.neo-minimized-card\),[\s\S]*?border-radius:\s*0 !important;[\s\S]*?backdrop-filter:\s*none !important;/);
assert.match(styles, /html\[data-interface-style="retro"\] :is\(\.neo-taskbar-preview-titlebar,\.neo-minimized-card-header\) \{[\s\S]*?background:\s*linear-gradient\(90deg, var\(--retro-accent\)/);
assert.match(styles, /html\[data-interface-style="retro"\] \.neo-minimized-card-controls > button \{[\s\S]*?border-color:\s*var\(--retro-light-edge\)/);
assert.match(styles, /html\[data-interface-style="retro"\] :is\(\.neo-taskbar-preview-open,\.neo-minimized-card-open\) \{[\s\S]*?border-radius:\s*0 !important;/);
assert.match(styles, /html\[data-interface-style="retro"\] \.desktop-context-menu button :is\(\.icon,\.context-arrow\) \{[\s\S]*?color:\s*var\(--retro-ink\) !important;[\s\S]*?opacity:\s*1 !important;/);
assert.match(styles, /html\[data-interface-style="retro"\] \.desktop-context-menu button:is\(:hover,:focus-visible,\[aria-expanded="true"\]\) :is\(\.icon,\.context-arrow\) \{[\s\S]*?color:\s*#fff !important;/);
assert.match(styles, /html\[data-interface-style="retro"\] \.desktop-context-menu \.context-separator \{[\s\S]*?background:\s*var\(--retro-dark-edge\) !important;/);
assert.match(styles, /html\[data-interface-style="retro"\] \.desktop-context-menu \[aria-checked="true"\] \.context-check::after \{[\s\S]*?border-color:\s*var\(--retro-ink\) !important;/);
assert.match(styles, /html\[data-interface-style="retro"\]\[data-neo-app="browser"\] \{[\s\S]*?--browser-canvas:\s*var\(--retro-panel-light\) !important;/);
assert.match(styles, /html\[data-interface-style="retro"\]\[data-neo-app="music"\] \.track-item-details \.title,[\s\S]*?color:\s*var\(--retro-ink\) !important;/);
assert.match(styles, /html\[data-interface-style="retro"\]\[data-neo-app="music"\] #download-notifications \{[\s\S]*?player-bar-height-desktop/);
assert.match(styles, /html\[data-interface-style="modern"\] \.app-launcher \.launcher-app\[data-app="browser"\] > \.launcher-app-icon\.app-icon-duckduckgo \{[\s\S]*?width:\s*58px !important;[\s\S]*?place-self:\s*center !important;/);
assert.match(styles, /html\[data-interface-style="modern"\] \.app-launcher \.launcher-app\[data-app="browser"\] > span:last-child \{[\s\S]*?justify-self:\s*stretch !important;[\s\S]*?text-align:\s*center !important;/);
assert.match(html, /launcher-icon=centered-v1/);
assert.match(musicUi, /function watchNeoMusicNotifications\(\)/);
assert.match(musicUi, /now - previous\.time < 1800[\s\S]*?task\.remove\(\)/);
assert(!styles.includes('html[data-interface-style="modern"] .neo-window'), 'Modern window styling must remain inherited and unchanged');

console.log('Interface style contract passed.');
