const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const runtime = fs.readFileSync(path.join(root, "neo-os", "neo-rainmeter.js"), "utf8");
const desktop = fs.readFileSync(path.join(root, "neo-os", "neo-os.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "neo-os", "neo-rainmeter.css"), "utf8");
const index = fs.readFileSync(path.join(root, "neo-os", "index.html"), "utf8");

assert.match(runtime, /"wheel", "glyph"/);
assert.match(runtime, /data-rainmeter-style="glyph"[\s\S]*?山乇ᗪ[\s\S]*?>Glyph</);
for (const pair of ['A: "卂"', 'D: "ᗪ"', 'E: "乇"', 'N: "几"', 'S: "丂"', 'W: "山"', 'Y: "ㄚ"']) {
  assert.ok(desktop.includes(pair), `weekday glyph mapping should include ${pair}`);
}
assert.match(desktop, /dataset\.rainmeterGlyphDay/);
assert.match(styles, /data-rainmeter-style="glyph"[\s\S]*?background:\s*none[\s\S]*?border:\s*0/);
assert.match(styles, /\.rainmeter-weekday span \{\s*display:\s*none/);
assert.match(styles, /content:\s*attr\(data-rainmeter-glyph-day\)/);
assert.match(styles, /\.rainmeter-style-preview\.is-glyph/);
assert.match(index, /neo-rainmeter\.css\?v=20260909-glyph-skin-v1/);
assert.match(index, /neo-rainmeter\.js\?v=20260909-glyph-skin-v1/);
assert.match(index, /rainmeter=glyph-skin-v1/);

console.log("Rainmeter Glyph skin is selectable, transparent, dynamic, and cache-busted.");
