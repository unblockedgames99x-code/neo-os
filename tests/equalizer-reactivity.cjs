const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const index = read("neo-os", "index.html");
const config = read("neo-os", "neo-local-config.js");
const skins = read("neo-os", "neo-skins.js");
const styles = read("neo-os", "neo-desktop.css");
const runtime = read("neo-os", "neo-music-runtime.js");
const musicIndex = read("neo-os", "music-v2", "index.html");
const bridge = read("neo-os", "music-v2", "neo-os-bridge.js");

assert.match(skins, /EQUALIZER_BANDS=32/);
assert.match(skins, /window\.addEventListener\('neo-media-levels'/);
assert.match(skins, /requestAnimationFrame\(updateEqualizers\)/);
assert.match(skins, /speed=target>current\?0\.78:0\.26/);
assert.match(skins, /equalizerPeaks/);
assert.match(skins, /Playback reactive/);
assert.doesNotMatch(skins, /not measured audio spectrum/);
assert.match(skins, /'quote','equalizer'/);

assert.match(styles, /grid-template-columns:\s*repeat\(32,/);
assert.match(styles, /--level/);
assert.match(styles, /--peak/);
assert.match(styles, /skin-equalizer-status/);

assert.match(bridge, /LEVEL_BANDS = 32/);
assert.match(bridge, /media\.captureStream \|\| media\.mozCaptureStream/);
assert.match(bridge, /analysisAnalyser\.fftSize = 512/);
assert.match(bridge, /analysisAnalyser\.smoothingTimeConstant = 0\.12/);
assert.match(bridge, /setInterval\(postLevels, 100\)/);
assert.match(bridge, /if \(document\.hidden\)/);
assert.match(bridge, /measured: Boolean\(measuredLevels\)/);

assert.match(runtime, /measured: event\.data\.neoMusicLevels\.measured === true/);
assert.match(index, /neo-desktop\.css\?v=20260907-equalizer-live-v2/);
assert.match(index, /neo-skins\.js[^"']*(?:equalizer=live-v2|all-audio-v1)/);
assert.match(index, /neo-music-runtime\.js[^"']*equalizer=live-v2/);
assert.match(config, /widgets=live-v1/);
assert.match(musicIndex, /neo-os-bridge\.js[^"']*20260910-meting-v1/);

console.log("Reactive equalizer checks passed.");
