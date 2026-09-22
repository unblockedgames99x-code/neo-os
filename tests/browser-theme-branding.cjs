const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const browserPath = path.join(root, 'neo-os', 'nextnode-browser', 'index.html');
const logoPath = path.join(root, 'neo-os', 'nextnode-browser', 'assets', 'neo-os-logo.png');
const browser = fs.readFileSync(browserPath, 'utf8');
const bridge = fs.readFileSync(path.join(root, 'neo-os', 'neo-system-bridge.js'), 'utf8');
const authoredHead = browser.slice(0, browser.indexOf('<script>(function(_0x'));

assert.ok(fs.existsSync(logoPath), 'The supplied NEO OS logo must be packaged with Browser.');
assert.ok(fs.statSync(logoPath).size > 100_000, 'The full supplied NEO OS logo asset must be preserved.');
assert.match(browser, /class="nt-brand-mark" src="\.\/assets\/neo-os-logo\.png" alt="NEO OS"/);
assert.match(browser, /class="nt-logo">Browser<\/div>/);
assert.match(authoredHead, /--theme-bg:/);
assert.match(authoredHead, /--accent:\s+var\(--theme-accent\)/);
assert.match(authoredHead, /event\.data\?\.type !== 'neo-browser-theme'/);
assert.match(authoredHead, /neo-browser-theme-request/);
assert.match(authoredHead, /CSS\.supports\('color', value\)/);
assert.match(bridge, /type:'neo-browser-theme',theme:state\.theme,palette:palette\(\)/);
assert.match(bridge, /type==='neo-browser-theme-request'/);
assert.match(bridge, /isFullProxyFrame\(frame\)\)sendBrowserTheme/);
assert.doesNotMatch(authoredHead, /#ff8453|rgba\(255\s*,\s*132\s*,\s*83/i);

console.log('Browser branding uses the supplied NEO OS logo and follows the active desktop palette without a fixed orange accent.');
