const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const workspace = path.resolve(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(workspace, ...parts), 'utf8');
const compat = read('neo-os', 'neo-wallpaper-web-compat.js');
const engine = read('neo-os', 'neo-wallpaper-engine.js');

assert.match(compat, /var pendingFrames = new Map\(\)/, 'web wallpaper animation frames should share one scheduler');
assert.match(compat, /var projectFrameInterval = 1000 \/ 30/, 'web wallpapers should be capped at 30 FPS');
assert.match(compat, /if \(playbackPaused\(\)\) return;\s+projectIntervals \+= 1/, 'wallpaper intervals should not run while paused');
assert.match(compat, /function suspendProjectFrames\(\)/, 'scheduled frames should be cancelled when playback pauses');
assert.match(compat, /pendingFrames: pendingFrames\.size/, 'the scheduler should expose compact diagnostics');

assert.match(engine, /var stabilityPaused = false/, 'wallpaper runtime should track adaptive recovery');
assert.match(engine, /drift >= 5000\) stabilityStallScore = 0/, 'tab suspension should not be mistaken for a wallpaper stall');
assert.match(engine, /drift >= 1000\) stabilityStallScore \+= 2/, 'large main-thread stalls should trigger an immediate backoff');
assert.match(engine, /drift >= 450\) stabilityStallScore \+= 1/, 'one ordinary app-startup hitch should not pause the wallpaper');
assert.match(engine, /stabilityRecovery = window\.setTimeout\(releaseStabilityPause, 2500\)/, 'wallpaper playback should recover quickly');
assert.match(engine, /function resumePlayback\(\)[\s\S]*?stabilityPaused = false[\s\S]*?stabilityExpected = performance\.now\(\) \+ 1000[\s\S]*?window\.setTimeout\(syncPlayback, 2000\)/, 'focus and visibility recovery should clear transient pauses and retry playback');
assert.match(engine, /stabilityPaused: stabilityPaused/, 'recovery state should be observable for diagnostics');
assert.match(engine, /stopStabilityWatch\(\);\s+clearMedia\("destroy"\)/, 'watchdog timers should be cleaned up');

console.log('Wallpaper freeze guard contract passed');
