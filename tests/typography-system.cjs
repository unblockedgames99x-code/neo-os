const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const typography = read("neo-os", "neo-fonts.css");
const main = read("neo-os", "index.html");
const apps = read("neo-os", "neo-apps.css");
const browserRuntime = read("neo-os", "neo-browser-runtime.css");

assert.match(typography, /font-family: "NEO Accent"/);
assert.match(typography, /--neo-font-ui:/);
assert.match(typography, /--neo-font-display:/);
assert.match(typography, /--neo-font-mono:/);
assert.match(typography, /\.rainmeter-weekday[\s\S]*?"NEO Weekday"/);
assert.match(typography, /\.rainmeter-clock[\s\S]*?"NEO Clock"/);
assert.match(typography, /select option,[\s\S]*?color: #111318 !important/);
assert.match(typography, /select optgroup[\s\S]*?background-color: #f5f7fa !important/);
assert.match(typography, /select option:disabled[\s\S]*?color: #606773 !important/);
assert.doesNotMatch(typography, /https?:\/\//);

const mainFontLink = "./neo-fonts.css?v=20260912-native-fast-v1";
assert.ok(main.includes(mainFontLink));
assert.ok(main.indexOf(mainFontLink) > main.indexOf("./neo-desktop.css"));
assert.match(typography, /--neo-font-ui: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif/);
assert.doesNotMatch(typography, /SFPRODISPLAY|\.\/music\/fonts/);
assert.doesNotMatch(apps, /font:\s*[^;}]*system-ui/);
assert.doesNotMatch(browserRuntime, /font:\s*[^;}]*system-ui/);

for (const file of [
  ["music-local", "index.html"],
  ["local-browser", "index.html"],
  ["NEO-BROWSER", "index.html"],
  ["neo-cloud", "index.html"],
  ["neo-tv", "index.html"],
]) {
  assert.match(read("neo-os", ...file), /\.\.\/neo-fonts\.css\?v=20260912-native-fast-v1/);
}

for (const asset of [
  ["neo-os", "assets", "fonts", "quicksand.woff2"],
]) {
  assert.ok(fs.statSync(path.join(root, ...asset)).size > 0, `${asset.join("/")} is missing`);
}

console.log("NEO typography system checks passed.");
