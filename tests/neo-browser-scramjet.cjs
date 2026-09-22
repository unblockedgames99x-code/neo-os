const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');

const html = read('neo-os', 'NEO-BROWSER', 'index.html');
const browserApp = read('neo-os', 'NEO-BROWSER', 'assets', 'app.js');
const runtime = read('neo-os', 'NEO-BROWSER', 'assets', 'scramjet-runtime.js');
const ui = read('neo-os', 'NEO-BROWSER', 'assets', 'neo-minimal-browser.js');
const styles = read('neo-os', 'NEO-BROWSER', 'assets', 'neo-minimal-browser.css');
const shell = read('neo-os', 'neo-os.js');
const shellRuntime = read('neo-os', 'neo-browser-runtime.js');
const shellStyles = read('neo-os', 'neo-browser-runtime.css');
const preview = read('local-preview.mjs');

const transport = html.indexOf('assets/scramjet-runtime.js');
const app = html.indexOf('assets/app.js');

assert(transport > 0 && app > transport,
  'The lightweight Scramjet bootstrap must load before the GUST application runtime');
assert(!/<script[^>]+src="(?:scramjet\/baremux|jet\/jet\.(?:core|api))\.js/i.test(html),
  'Heavy proxy engine scripts must not block the browser shell');
assert(!html.includes('assets/local-navigation.js'), 'the local-only network lockout must not load');
assert(runtime.includes('function ensureProxyRuntime()') && runtime.includes('Promise.all(['),
  'the proxy engine must load on demand after the shell is interactive');
assert(runtime.includes('document.hidden ? 5000 : 750'),
  'inactive browser windows must use a low-frequency URL poll');
assert(html.includes('id="neoAudioButton"') && html.includes('id="neoBrowserMenu"'),
  'the minimal chrome controls must exist');
assert(!html.includes('id="tutorialOverlay"') && !html.includes('data-section="tutorial"'),
  'the Browser tour and its settings entry must stay removed');
assert(ui.includes("querySelector('.tab-mute-icon')"), 'Audio must control the active tab');

assert(runtime.includes('wss://nextnode9124.b-cdn.net/w/'), 'the NextNode WISP endpoint must be a candidate');
assert(runtime.indexOf('NEXTNODE_WISP_RELAY })') < runtime.indexOf('wss://probuildingsupplies.com/w/'),
  'the NextNode endpoint should be tried first on a cold start');
assert(runtime.includes('probeRelay(preferred, 1800)') && runtime.includes('firstResponsiveRelay(candidates, 3800)'),
  'the selected relay must be tried first, followed by the published fallbacks');
assert(runtime.includes('probeRelay') && runtime.includes('firstResponsiveRelay'),
  'relay choice must be based on a real WISP handshake');
assert(runtime.includes('neo:scramjet:transportready'), 'the UI must receive transport readiness');
assert(runtime.includes('initialize() is intentionally started by go()'),
  'the proxy transport must stay lazy until the user navigates');

assert(html.includes('assets/app.js?v=20260909-lazy-network-v1'),
  'the Browser must load the cache-busted tour-free runtime');
assert(browserApp.includes('function Ws(e=!1){return}function Hs(e=!1){'),
  'the retired tour runtime must remain inert even when old local preferences exist');
assert(ui.includes("target?.click()"), 'overflow actions must retain the original browser functions');
assert(styles.includes('--browser-accent: var(--desktop-accent, #ffffff)'),
  'browser accent controls must inherit the active NEO theme');
assert(styles.includes('--browser-accent-ink: var(--desktop-accent-text, #050505)'),
  'browser accent text must inherit the active NEO theme contrast color');
assert(!styles.includes('--browser-amber'), 'the Browser must not keep a separate amber accent');
assert(styles.includes('var(--desktop-surface)'), 'browser chrome must follow the active NEO theme');
assert(styles.includes('@media (max-width: 760px)'), 'the browser chrome must adapt to small windows');
assert(shellRuntime.includes('const PREFERRED_WISP_RELAY = "wss://nextnode9124.b-cdn.net/w/"'),
  'the desktop browser must use the NextNode endpoint first');
assert(shellRuntime.includes('element.draggable = true') && shellRuntime.includes('tabList.addEventListener("dragover"'),
  'desktop browser tabs must support reordering');
assert(shellRuntime.includes('createTab(target, { focusAddress: target === NEW_TAB_DESTINATION })'),
  'the desktop browser must mount a real interactive tab immediately');
assert(shell.includes('else openNewTabShell(false);'),
  'opening Browser must reveal the real tab system instead of a static placeholder tab');
assert(shellStyles.includes('.neo-browser-tab-shell.is-dragging'),
  'tab dragging must have a clear visual state');
assert(shell.includes('./NEO-BROWSER/index.html?v=20260912-proxy-ready-v2'),
  'the desktop must open the cache-busted browser build');
assert(preview.includes("isBrowserCompatibility ? onlineAppCsp : /^\\/neo-os\\/(?:NEO-BROWSER|nextnode-browser)\\//i.test(requestPath) ? browserCsp"),
  'the permissive proxy CSP must be isolated to both Browser routes');
assert(preview.includes("connect-src 'self' data: blob: wss:"),
  'the Browser route must allow WISP WebSockets');
assert(preview.includes("'wasm-unsafe-eval'"),
  'the Browser route must allow its bundled WebAssembly transport');

console.log('NEO Browser Scramjet transport and minimal UI contract passed.');
