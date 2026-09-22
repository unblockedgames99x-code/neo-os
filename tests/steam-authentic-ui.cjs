const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('neo-os/neo-games/index.html');
const css = read('neo-os/neo-games/app.css');
const app = read('neo-os/neo-games/app.js');
const logo = read('neo-os/assets/steam.svg');
const apps = read('neo-os/neo-apps.js');
const shell = read('neo-os/neo-os.js');

assert.match(logo, /fill="#1b5a86"/, 'The current dark-blue Steam mark is missing.');
assert.doesNotMatch(logo, /linearGradient/, 'The retired gradient Steam mark remains.');
assert.match(html, /class="steam-boot"[\s\S]*data-steam-boot-status[\s\S]*steam-boot-progress/, 'Steam has no branded startup sequence.');
assert.match(css, /\.steam-boot\s*\{[\s\S]*z-index:\s*4000/, 'The startup sequence cannot cover the loading library.');
assert.match(css, /@keyframes steam-boot-mark[\s\S]*@keyframes steam-boot-progress/, 'The startup logo animation is incomplete.');
assert.match(app, /minimumDuration = reduceMotion \? 0 : 1450/, 'The startup animation is not given time to play.');
assert.match(app, /steamBootFallbackTimer = window\.setTimeout\(finishSteamBoot, 5000\)/, 'The startup screen has no failure-safe exit.');
assert.match(html, /primary-destinations[\s\S]*>STORE<[\s\S]*>LIBRARY</, 'Steam is missing its desktop primary navigation.');
assert.match(html, /library-kind-row[\s\S]*Games and Software/, 'Steam is missing its library type control.');
assert.match(html, /downloads-state[\s\S]*Downloads/, 'Steam is missing its download status footer.');
assert.doesNotMatch(html, /Friends|Community|Workshop|Friends & Chat/i, 'Social filler returned to the focused Steam client.');
assert.match(apps, /index\.html\?build=20260921-fern-only-v1/, 'The shell does not request the Fern-only Steam client.');
assert.match(shell, /steam\.svg\?v=20260919-current-steam-logo-v2/, 'The taskbar does not request the updated Steam logo.');

console.log('Steam uses the current logo, branded startup animation, and authentic focused desktop-client chrome.');
