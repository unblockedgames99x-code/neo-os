const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("neo-os/neo-chat/index.html", "utf8");
const app = fs.readFileSync("neo-os/neo-chat/app.js", "utf8");
const css = fs.readFileSync("neo-os/neo-chat/styles.css", "utf8");

assert.match(html, /styles\.css\?v=20260920-imessage-fidelity-v1/);
assert.match(html, /app\.js\?v=20260920-imessage-fidelity-v1/);
assert.match(css, /font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text"/);
assert.match(css, /\.message-bubble \{[\s\S]*?min-height: 30px;[\s\S]*?border-radius: 16px;[\s\S]*?font-size: 13px;/);
assert.match(css, /group-end\.mine \.message-bubble::before[\s\S]*?border-bottom-left-radius: 14px 12px/);
assert.match(css, /group-end:not\(\.mine\) \.message-bubble::before[\s\S]*?border-bottom-right-radius: 14px 12px/);
assert.match(css, /\.message-meta \{[\s\S]*?font-size: 8\.5px/);
assert.match(css, /#attachButton \{[\s\S]*?background: color-mix\(in srgb, var\(--muted\) 17%, transparent\)/);
assert.match(app, /formatDay\(message\.createdAt\) \+ " " \+ formatTime\(message\.createdAt\)/);

console.log("NEO Chat iOS 17 iMessage fidelity contracts passed.");
