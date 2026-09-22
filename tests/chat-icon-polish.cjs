const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const icon = fs.readFileSync(path.join(root, "neo-os", "assets", "imessage-logo.png"));
const html = fs.readFileSync(path.join(root, "neo-os", "index.html"), "utf8");
const script = fs.readFileSync(path.join(root, "neo-os", "neo-os.js"), "utf8");
const chatCss = fs.readFileSync(path.join(root, "neo-os", "neo-chat.css"), "utf8");
const interfaceCss = fs.readFileSync(path.join(root, "neo-os", "neo-interface-styles.css"), "utf8");

assert.equal(icon.subarray(1, 4).toString("ascii"), "PNG");
assert.equal(icon.readUInt32BE(16), 1278);
assert.equal(icon.readUInt32BE(20), 1230);
assert.equal(crypto.createHash("sha256").update(icon).digest("hex"), "a2f85cc492885ef82388ca5340c1ebf4e66ce0918ed3762a0ab2355d8864838f");

const revision = "imessage-logo.png?v=20260908-imessage-logo-v2";
assert.ok(html.includes(revision), "HTML should load the supplied iMessage-style icon exactly");
assert.ok(script.includes(revision), "Dynamic app icons should load the supplied iMessage-style icon exactly");
assert.doesNotMatch(chatCss, /neo-browser-sign-in-icon img[^}]*filter:\s*invert/);
assert.match(interfaceCss, /app-icon-chat \.app-image-icon[\s\S]*?object-fit:\s*contain\s*!important[\s\S]*?filter:\s*none\s*!important/);
assert.match(html, /chat=exact-imessage-logo-v2/);

console.log("Exact supplied iMessage-style Chat icon contract passed.");
