const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const shell = fs.readFileSync(path.join(root, "neo-os", "neo-os.js"), "utf8");
const index = fs.readFileSync(path.join(root, "neo-os", "index.html"), "utf8");

assert.match(shell, /var WINDOW_TOP_GAP = 8;/);
assert.match(shell, /var minTop = maxTop >= WINDOW_TOP_GAP \? WINDOW_TOP_GAP : 0;[\s\S]*?win\.style\.top = clamp\(top, minTop, maxTop\)/);
assert.match(shell, /drag\.minTop = drag\.maxTop >= WINDOW_TOP_GAP \? WINDOW_TOP_GAP : 0;/);
assert.match(shell, /drag\.nextTop = Math\.round\(clamp\(drag\.top \+ pointer\.clientY - drag\.y, drag\.minTop, drag\.maxTop\)\)/);
assert.match(shell, /win\.style\.top = clamp\(rect\.top - bounds\.top, minTop, maxTop\)/);
assert.match(index, /windows=top-gap-v1/);

console.log("Window top spacing stays clear of the desktop bar.");
