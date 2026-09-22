const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("neo-os/neo-chat/index.html", "utf8");
const app = fs.readFileSync("neo-os/neo-chat/app.js", "utf8");
const css = fs.readFileSync("neo-os/neo-chat/styles.css", "utf8");

assert.match(html, /app\.js\?v=20260920-imessage-fidelity-v1/);
assert.match(app, /function mentionNames\(value\)/);
assert.match(app, /names\.indexOf\("everyone"\) !== -1/);
assert.match(app, /String\(state\.me\.username \|\| ""\)\.toLowerCase\(\)/);
assert.match(app, /function appendMessageText\(container, value\)/);
assert.match(app, /mention\.textContent = "@" \+ match\[2\]/);
assert.match(app, /function scanMentionNotifications\(channel, messages, initial\)/);
assert.match(app, /new Notification\(title/);
assert.match(app, /neo-chat-mention-notices:/);
assert.match(css, /\.message-mention \{[\s\S]*?font-weight: 800/);
assert.match(css, /\.message-group\.is-mentioned:not\(\.mine\) \.message-bubble/);

console.log("NEO Chat username and everyone mention contracts passed.");
