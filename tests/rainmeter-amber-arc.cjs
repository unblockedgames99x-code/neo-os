const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "neo-os");
const css = fs.readFileSync(path.join(root, "neo-rainmeter.css"), "utf8");
const runtime = fs.readFileSync(path.join(root, "neo-rainmeter.js"), "utf8");
const desktop = fs.readFileSync(path.join(root, "neo-os.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

assert.match(runtime, /styles = \[[^\]]*"amber-arc"/);
assert.match(runtime, /data-rainmeter-style="amber-arc"[^>]*>[\s\S]*?is-amber-arc[^>]*>[\s\S]*?千[\s\S]*?尺[\s\S]*?丨[\s\S]*?ᗪ[\s\S]*?卂[\s\S]*?ㄚ[\s\S]*?<span>Mond<\/span>/);

assert.match(css, /data-rainmeter-style="amber-arc"[^\{]*\{[\s\S]*?--rainmeter-arc-white:\s*#f5f7ff/);
assert.match(css, /data-rainmeter-style="amber-arc"\]::before,[\s\S]*?::after[\s\S]*?content:\s*none;[\s\S]*?display:\s*none/);
assert.match(css, /data-rainmeter-style="amber-arc"\] :is\(\.rainmeter-kicker, \.rainmeter-time, \.rainmeter-date\)[^\{]*\{\s*display:\s*none/);
assert.match(css, /data-rainmeter-style="amber-arc"\] \.rainmeter-weekday[^\{]*\{[\s\S]*?display:\s*flex;[\s\S]*?justify-content:\s*center/);
assert.match(css, /data-rainmeter-style="amber-arc"\] \.rainmeter-weekday::after[^\{]*\{[\s\S]*?content:\s*none/);
assert.match(css, /data-rainmeter-style="amber-arc"\] \.rainmeter-reference-glyph[^\{]*\{[\s\S]*?display:\s*block[\s\S]*?overflow:\s*visible/);
assert.match(css, /data-rainmeter-style="amber-arc"[^\{]*\{[\s\S]*?background:\s*transparent;[\s\S]*?border:\s*0;[\s\S]*?box-shadow:\s*none/);
assert.match(css, /\.rainmeter-style-preview\.is-amber-arc/);
assert.match(desktop, /rainmeterReferenceGlyphs\s*=\s*\{/);
assert.match(desktop, /dataset\.rainmeterReferenceDay\s*=\s*Array\.from\(dayName\.toUpperCase\(\)\)/);
assert.match(desktop, /dataset\.rainmeterReferenceGlyph\s*=\s*rainmeterReferenceGlyphs\[letter\]/);
assert.match(desktop, /function createRainmeterReferenceGlyph\(letter, symbol\)/);
assert.match(desktop, /rainmeterWordmarkPaths\s*=\s*\{/);
assert.match(desktop, /stroke-linecap", "square"/);
assert.match(desktop, /rainmeterInkTop/);

assert.match(html, /neo-rainmeter\.css\?v=20260920-angular-weekday-v8/);
assert.match(html, /neo-rainmeter\.js\?v=20260920-angular-weekday-v8/);
assert.match(html, /rainmeter=angular-weekday-v8/);
assert.match(html, /id="rainmeter-weekday"/);

console.log("Rainmeter Amber Arc skin checks passed.");
