const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("neo-os/neo-chat/index.html", "utf8");
const app = fs.readFileSync("neo-os/neo-chat/app.js", "utf8");

assert.match(html, /app\.js\?v=20260920-imessage-fidelity-v1/);
assert.match(app, /el\.newChatOverlay\.addEventListener\("pointerdown"/);
assert.match(app, /event\.target !== el\.newChatOverlay/);
assert.match(app, /hideOverlay\(el\.newChatOverlay\)/);
assert.match(app, /window\.setTimeout\(function \(\) \{ el\.composeButton\.focus\(\); \}, 0\)/);
assert.match(app, /event\.key !== "Escape"[\s\S]*?!el\.newChatOverlay\.hidden/);

console.log("NEO Chat New Message backdrop dismissal checks passed.");
