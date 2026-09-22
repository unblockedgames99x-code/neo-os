const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "neo-os");
const css = fs.readFileSync(path.join(root, "neo-rainmeter.css"), "utf8");
const shell = fs.readFileSync(path.join(root, "neo-os.js"), "utf8");
const editor = fs.readFileSync(path.join(root, "neo-rainmeter.js"), "utf8");

const weekday = css.match(/\.rainmeter-clock\[data-rainmeter-style="glyph"\] \.rainmeter-weekday \{([\s\S]*?)\n\}/);
assert.ok(weekday, "glyph weekday style should exist");
assert.match(weekday[1], /font-family:\s*"NEO Weekday"/);
assert.match(weekday[1], /font-weight:\s*400/);
assert.match(weekday[1], /font-size:\s*clamp\(42px, 5\.2vw, 74px\)/);
assert.match(weekday[1], /-webkit-text-stroke:\s*0 transparent/);
assert.match(css, /data-rainmeter-style="glyph"\] \.rainmeter-weekday span \{[\s\S]*?display:\s*block/);
assert.match(css, /data-rainmeter-style="glyph"\] \.rainmeter-weekday::after \{\s*content:\s*none/);
assert.doesNotMatch(shell, /data\.rainmeterGlyphDay\s*=/);
assert.match(shell, /rainmeterReferenceGlyphs/);
assert.match(shell, /dataset\.rainmeterReferenceDay/);
assert.match(editor, /is-glyph" aria-hidden="true">SAT</);

console.log("Rainmeter thin weekday styling checks passed.");
