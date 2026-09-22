const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const index = fs.readFileSync(path.join(root, "neo-os", "index.html"), "utf8");
const shell = fs.readFileSync(path.join(root, "neo-os", "neo-os.js"), "utf8");
assert.doesNotMatch(index, /data-taskbar-style-option="figure"/);
assert.doesNotMatch(index, /class="taskbar-figure-logo"/);
assert.doesNotMatch(index, /neo-figure-taskbar\.css/);
assert.match(shell, /return value === "transparent" \|\| value === "typical" \|\| value === "xeno" \? value : "current"/);

console.log("Figure taskbar removal checks passed.");
