const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("neo-os/neo-chat/index.html", "utf8");
const app = fs.readFileSync("neo-os/neo-chat/app.js", "utf8");
const css = fs.readFileSync("neo-os/neo-chat/styles.css", "utf8");

assert.match(html, /id="attachButton"[\s\S]*?aria-haspopup="menu"[\s\S]*?aria-controls="attachmentMenu"/);
assert.match(html, /id="attachmentMenu"[\s\S]*?id="attachFileButton"[\s\S]*?id="attachGifButton"/);
assert.match(html, /id="gifPicker"[\s\S]*?id="gifSearchInput"[\s\S]*?data-gif-provider="all"[\s\S]*?data-gif-provider="gifsnap"[\s\S]*?data-gif-provider="commons"/);
assert.match(html, /id="gifUrlInput"[\s\S]*?Paste a GIF link from any provider/);
assert.match(html, /gifs=unlimited-v1/);

assert.match(app, /addEventListener\("pointerenter", showAttachmentMenu\)/);
assert.match(app, /https:\/\/gifsnap\.com\/api\/v1\/gifs\/search/);
assert.match(app, /https:\/\/commons\.wikimedia\.org\/w\/api\.php/);
assert.match(app, /Promise\.allSettled\(searches\)/);
assert.match(app, /async function remoteGifAttachment\(result\)/);
assert.match(app, /https:\/\/images\.weserv\.nl\/\?url=/);
assert.match(app, /async function fetchGifBlob\(value\)/);
assert.match(app, /That GIF could not be downloaded\. Try another result\./);
assert.match(app, /type !== "image\/gif" && type !== "image\/webp"/);
assert.match(app, /file\.type !== "image\/gif" && file\.size > 2\.2 \* 1024 \* 1024/);
assert.doesNotMatch(app, /Choose a GIF under 2 MB/);
assert.match(app, /state\.attachment = await remoteGifAttachment\(result\)/);
assert.match(app, /attachment\.previewUrl \|\| data/);

assert.match(css, /\.attachment-menu,[\s\S]*?\.gif-picker \{/);
assert.match(css, /\.gif-results \{[\s\S]*?grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
assert.match(css, /\.gif-provider-tabs button\.active/);
assert.match(css, /\.gif-url-form/);
assert.match(css, /max-width:\s*calc\(100vw - 16px\)/);

new Function(app);
console.log("NEO Chat hover attachment menu and multi-provider GIF picker contracts passed.");
