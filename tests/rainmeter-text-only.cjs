const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const css = fs.readFileSync(path.resolve(__dirname, "..", "neo-os", "neo-rainmeter.css"), "utf8");

for (const style of ["retro", "botanical", "wheel"]) {
  const block = css.match(new RegExp(`\\.rainmeter-clock\\[data-rainmeter-ready="true"\\]\\[data-rainmeter-style="${style}"\\] \\{([\\s\\S]*?)\\n\\}`));
  assert.ok(block, `${style} Rainmeter block should exist`);
  assert.match(block[1], /background:\s*none/);
  assert.match(block[1], /border:\s*0/);
  assert.match(block[1], /box-shadow:\s*none/);
}

assert.match(css, /data-rainmeter-style="retro"[\s\S]*?\.rainmeter-kicker[\s\S]*?background:\s*none/);
assert.match(css, /data-rainmeter-style="retro"[\s\S]*?\.rainmeter-weekday[\s\S]*?background:\s*none/);
assert.match(css, /data-rainmeter-style="wheel"[\s\S]*?\.rainmeter-time[\s\S]*?background:\s*none/);
assert.match(css, /data-rainmeter-style="botanical"\]::after[\s\S]*?content:\s*none/);
assert.doesNotMatch(css, /url\("\.\/assets\/rainmeter-wheel-clock\.png"\)/);

for (const style of ["retro", "botanical", "wheel"]) {
  assert.match(css, new RegExp(`\\.rainmeter-style-preview\\.is-${style} \\{[\\s\\S]*?background:\\s*none`));
}

console.log("Rainmeter text-only skin checks passed.");
