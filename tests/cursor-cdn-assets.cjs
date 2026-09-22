const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "scripts", "build-github-cdn-shards.cjs"), "utf8");
const cursorDirectory = path.join(root, "neo-os", "assets", "cursors");

assert.match(source, /\['cursors', 'fonts', 'tab-appearance', 'wallpapers'\]/, "CDN shards must include cursor assets");

for (const theme of ["neo", "neon", "pixel", "contrast"]) {
  for (const shape of ["arrow", "pointer"]) {
    const file = path.join(cursorDirectory, `${theme}-${shape}.svg`);
    assert.equal(fs.existsSync(file), true, `Missing ${theme} ${shape} cursor`);
    assert.match(fs.readFileSync(file, "utf8"), /<svg\b/, `${theme} ${shape} cursor must be valid SVG`);
  }
}

console.log("All custom cursor assets are included in generated CDN shards.");
