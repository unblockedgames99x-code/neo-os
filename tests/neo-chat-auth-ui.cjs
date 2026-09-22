const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "neo-os", "neo-chat", "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "neo-os", "neo-chat", "styles.css"), "utf8");
const app = fs.readFileSync(path.join(root, "neo-os", "neo-chat", "app.js"), "utf8");
const bridge = fs.readFileSync(path.join(root, "neo-os", "neo-chat", "neo-os-bridge.js"), "utf8");

assert.match(html, /class="overlay auth-overlay" id="authOverlay"/);
assert.match(html, /data-auth-mode="login">Sign in/);
assert.match(html, /data-auth-mode="register">Create account/);
assert.match(html, /id="authUsername"[^>]+autocomplete="username"/);
assert.match(html, /id="authPassword"[^>]+minlength="8"[^>]+maxlength="72"/);
assert.match(html, /id="profileOverlay"[^>]+hidden/);
assert.match(html, /id="memojiOptionGrid"[^>]+radiogroup/);
assert.match(app, /async function authenticate\(event\)/);
assert.match(app, /api\("\/api\/auth\/" \+ state\.authMode/);
assert.match(app, /async function logout\(\)/);
assert.match(app, /state\.profileChoice\.kind === "photo"/);
assert.match(app, /currentPhoto\.alt = "Current custom profile picture"/);
assert.match(bridge, /transport\.resume\(active\.token\)/);
assert.match(bridge, /transport\.createProfile/);
assert.match(bridge, /transport\.login/);
assert.match(bridge, /accountStore\.save/);
assert.match(bridge, /themeLuminance > 0\.82 \|\| themeLuminance < 0\.14 \|\| saturation < 0\.16/);
assert.match(bridge, /value = "#0a84ff"/);
assert.match(css, /\.auth-tabs/);
assert.match(css, /\.memoji-preview\.has-photo img/);
assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
assert.match(css, /html\[data-neo-app="chat"\] \.conversation-row\.active \{/);
assert.match(css, /color: var\(--accent-contrast, #fff\);/);
assert.match(css, /background: var\(--messages-blue, #0a84ff\) !important;/);
assert.match(html, /styles\.css\?v=20260920-imessage-fidelity-v1/);
assert.match(html, /neo-os-bridge\.js\?v=20260920-shared-message-actions-v1/);

console.log("NEO Chat authentication and synchronized account contracts passed.");
