const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "neo-os", "neo-chat", "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "neo-os", "neo-chat", "app.js"), "utf8");
const bridge = fs.readFileSync(path.join(root, "neo-os", "neo-chat", "neo-os-bridge.js"), "utf8");

assert.match(html, /id="composeButton"[^>]+aria-label="New message"/);
assert.match(html, /id="newChatOverlay"[^>]+hidden/);
assert.match(html, /id="peopleSearch"[^>]+placeholder="Search members"/);
assert.match(app, /async function startDm\(user\)/);
assert.match(app, /api\("\/api\/dm", \{ method: "POST"/);
assert.match(app, /hideOverlay\(el\.newChatOverlay\); openChannel\(neoChannel\.id\)/);
assert.match(bridge, /transport\.createRoom\(active\.token/);
assert.match(bridge, /kind: "dm"/);

console.log("NEO Chat synchronized direct-message flow contracts passed.");
