const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "neo-os", "neo-chat", "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "neo-os", "neo-chat", "app.js"), "utf8");

assert.doesNotMatch(html, /All 58 from GitHub/);
assert.match(html, /rel="icon"[^>]+href="\.\.\/assets\/imessage-logo\.png\?v=20260908-imessage-logo-v2"/);
assert.match(html, /rel="apple-touch-icon"[^>]+href="\.\.\/assets\/imessage-logo\.png\?v=20260908-imessage-logo-v2"/);
assert.match(html, /class="brand-mark"><img src="\.\.\/assets\/messages\.png"/);
assert.match(app, /TAPBACK_AVATAR_COUNT = 58/);
assert.match(app, /raw\.githubusercontent\.com\/Wimell\/Tapback-Memojis/);
assert.match(app, /image\.addEventListener\("error"/);
assert.match(app, /function paintGlobalAvatar\(node\)/);
assert.match(app, /if \(isGlobal\) paintGlobalAvatar\(el\.detailsAvatar\)/);
assert.match(html, /id="detailsAvatar"><svg aria-hidden="true"><use href="#i-globe"><\/use><\/svg>/);
assert.match(html, /app\.js\?v=20260920-imessage-fidelity-v1/);
assert.doesNotMatch(html, /data:image[^"'<>\s]*\\\//, "inline image payloads must not contain JSON-escaped slashes");

for (const relative of [
  ["neo-os", "assets", "imessage-logo.png"],
  ["neo-os", "assets", "messages.png"]
]) {
  assert.ok(fs.existsSync(path.join(root, ...relative)), `${relative.at(-1)} should exist`);
}

console.log("NEO Chat icons, Messages branding, and 58-avatar contracts passed.");
