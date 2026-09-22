const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("neo-os/neo-chat/index.html", "utf8");
const css = fs.readFileSync("neo-os/neo-chat/styles.css", "utf8");

assert.match(html, /styles\.css\?v=20260920-imessage-fidelity-v1/);
assert.match(css, /\.composer \{[\s\S]*?align-items: center;/);
assert.match(css, /html\[data-neo-app="chat"\] #attachButton \{[\s\S]*?color: var\(--messages-blue\);[\s\S]*?background: color-mix\(in srgb, var\(--muted\) 17%, transparent\)/);
assert.match(css, /\.emoji-button \{[\s\S]*?color: var\(--messages-blue\)/);
assert.match(css, /\.composer-field \{[\s\S]*?border: 1px solid rgba\(var\(--accent-rgb\), \.72\)/);
assert.match(css, /\.emoji-button \{[\s\S]*?position: absolute;[\s\S]*?right: 3px;[\s\S]*?transform: translateY\(-50%\)/);
assert.match(css, /\.send-button:disabled \{[\s\S]*?rgba\(var\(--accent-rgb\), \.16\)/);
assert.match(css, /\.composer-field \{[\s\S]*?box-shadow: none;/);
assert.match(css, /\.composer-field:focus-within \{[\s\S]*?box-shadow: 0 0 0 1px color-mix\(in srgb, var\(--messages-blue\) 20%, transparent\), 0 0 8px color-mix\(in srgb, var\(--messages-blue\) 8%, transparent\)/);
assert.match(css, /\.emoji-button:focus-visible \{[\s\S]*?box-shadow: inset 0 0 0 1px rgba\(var\(--accent-rgb\), \.42\)/);
assert.match(css, /html\[data-neo-app="chat"\] \.composer textarea:focus-visible[\s\S]*?outline: 0 !important;[\s\S]*?box-shadow: none !important;/);

console.log("NEO Chat composer alignment and accent checks passed.");
