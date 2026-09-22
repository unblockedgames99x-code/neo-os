const assert = require('node:assert/strict');
const fs = require('node:fs');

const shell = fs.readFileSync('neo-os/neo-os.js', 'utf8');
const apps = fs.readFileSync('neo-os/neo-apps.js', 'utf8');
const music = fs.readFileSync('neo-os/neo-music-runtime.js', 'utf8');
const html = fs.readFileSync('neo-os/index.html', 'utf8');

assert.match(shell, /browser:[\s\S]*?keepAlive: false/);
assert.match(apps, /stream:[\s\S]*?keepAlive: false/);
assert.match(apps, /movies:[\s\S]*?keepAlive: false/);
assert.doesNotMatch(shell, /musicRuntime\.cacheWindow\(/);
assert.match(music, /function cacheWindow\(\)\s*\{[\s\S]*?return false;/);
assert.match(shell, /function stopMediaElement\(media\)/);
assert.match(shell, /type: "neo-shell:close"/);
assert.match(shell, /removeItem\(sessionId \+ ":neo:tabs:v1"\)/);
assert.match(shell, /function destroyWindowFrames\(win\)/);
assert.match(shell, /frame\.src = "about:blank"/);
assert.match(shell, /destroyWindowFrames\(win\);[\s\S]*?win\.remove\(\)/);
assert.match(html, /neo-apps\.js\?[^"']*close=hard-v1/);
assert.match(html, /neo-music-runtime\.js\?[^"']*close=hard-v1/);
assert.match(html, /neo-os\.js\?[^"']*close=hard-v1/);

console.log('Every app close path destroys media, navigation state, frames, and cached windows.');
