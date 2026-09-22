const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("neo-os/neo-chat/index.html", "utf8");
const app = fs.readFileSync("neo-os/neo-chat/app.js", "utf8");
const css = fs.readFileSync("neo-os/neo-chat/styles.css", "utf8");

assert.match(html, /app\.js\?v=20260920-imessage-fidelity-v1/);
assert.match(html, /styles\.css\?v=20260920-imessage-fidelity-v1/);
assert.match(app, /neoChatPinnedChannels/);
assert.match(app, /state\.pinnedChannelIds[\s\S]*?\.slice\(0, 9\)/);
assert.match(app, /You can pin up to 9 conversations/);
assert.match(app, /function pinnedConversationShelf\(channels, query\)/);
assert.match(app, /function pinnedConversation\(channel\)/);
assert.match(app, /button\.addEventListener\("contextmenu"[\s\S]*?openConversationMenu/);
assert.match(app, /button\.addEventListener\("dragstart"[\s\S]*?beginChannelDrag/);
assert.match(app, /text\/x-neo-chat-channel/);
assert.match(app, /conversationMenuButton\(pinned \? "Unpin" : "Pin"/);
assert.match(app, /conversationMenuButton\("Mark as read"/);
assert.match(app, /Mute notifications/);
assert.match(css, /\.pinned-conversation-shelf \{[\s\S]*?grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
assert.match(css, /\.pinned-conversation-name \{[\s\S]*?text-align: center/);
assert.match(css, /\.pinned-conversation \.avatar \{[\s\S]*?width: 60px;[\s\S]*?height: 60px/);
assert.match(css, /\.pinned-conversation-badge \{[\s\S]*?box-sizing: border-box;[\s\S]*?transform: translate\(55%, -45%\)/);
assert.match(css, /\.conversation-action-menu \{ width: 196px; \}/);

console.log("NEO Chat pinned conversation shelf contracts passed.");
