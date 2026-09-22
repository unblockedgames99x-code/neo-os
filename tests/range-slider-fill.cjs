const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const runtime = read("neo-os", "neo-desktop-platform.js");
const styles = read("neo-os", "neo-range.css");
const index = read("neo-os", "index.html");

assert.match(runtime, /function updateSliderFill\(input\)/);
assert.match(runtime, /\(\(value - min\) \/ \(max - min\)\) \* 100/);
assert.match(runtime, /setProperty\('--neo-range-progress', progress \+ '%'\)/);
assert.match(runtime, /n\.oninput = \(\) => \{[^}]*updateSliderFill\(n\)/);
assert.match(runtime, /updateSliderFill\(volume\); updateSliderFill\(bright\)/);

assert.match(styles, /--neo-range-progress: 0%/);
assert.match(styles, /::-webkit-slider-runnable-track[\s\S]*?var\(--neo-range-progress\)/);
assert.match(styles, /::-moz-range-progress[\s\S]*?var\(--desktop-accent\)/);
assert.match(index, /neo-range\.css\?v=20260906-range-fill-v1/);
assert.match(index, /neo-desktop-platform\.js\?v=20260907-widget-manager-v1/);

console.log("Desktop range slider fill checks passed.");
