const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const bridge = read("neo-os", "neo-audio-spectrum-bridge.js");
const loader = read("neo-os", "neo-frame-loader.js");
const shell = read("neo-os", "neo-os.js");
const skins = read("neo-os", "neo-skins.js");
const bottom = read("neo-os", "neo-bottom-visualizer.js");
const index = read("neo-os", "index.html");

assert.match(bridge, /BAND_COUNT = 32/);
assert.match(bridge, /AudioContext/);
assert.match(bridge, /captureStream \|\| media\.mozCaptureStream/);
assert.match(bridge, /neo-shell:audio-levels/);
assert.match(bridge, /new CustomEvent\("neo-media-levels"/);
assert.match(bridge, /getByteFrequencyData/);
assert.match(bridge, /document\.hidden/);

assert.match(loader, /neo-audio-spectrum-bridge\.js/);
assert.match(index, /neo-audio-spectrum-bridge\.js\?v=20260909-all-audio-v1/);
assert.match(shell, /data\.type === "neo-shell:audio-levels"/);
assert.match(shell, /source: "route-audio:" \+ app\.id/);

assert.match(skins, /equalizerSources=new Map\(\)/);
assert.match(skins, /Waiting for audio/);
assert.doesNotMatch(skins, /media\.source&&detail\.source&&media\.source!==detail\.source/);
assert.match(bottom, /spectrumSources = new Map\(\)/);
assert.match(bottom, /bottom sound visualizer/);
assert.doesNotMatch(bottom, /detail\.kind !== "audio"/);

console.log("All-audio equalizer integration checks passed.");
