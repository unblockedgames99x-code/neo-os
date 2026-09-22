const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "neo-os", "neo-tv", "index.html"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "..", "neo-os", "neo-tv", "app.css"), "utf8");
const nav = html.slice(html.indexOf('<aside class="side-nav"'), html.indexOf("</aside>") + 8);

assert.doesNotMatch(nav, /data-view="anime"/, "Anime still appears in the Stream sidebar");
assert.doesNotMatch(nav, /data-view="manga"/, "Manga still appears in the Stream sidebar");
assert.doesNotMatch(nav, /neo-games|aria-label="Games"/, "Games still appears in the Stream sidebar");
assert.doesNotMatch(nav, /class="neo-mark"|NEO Stream home/, "The NEO badge still appears in the Stream sidebar");
assert.match(nav, /data-view="home"/, "Home was removed from the Stream sidebar");
assert.match(nav, /data-view="movies"/, "Movies was removed from the Stream sidebar");
assert.match(nav, /data-view="series"/, "Series was removed from the Stream sidebar");
assert.match(nav, /data-view="list"/, "My List was removed from the Stream sidebar");
assert.match(nav, /data-open-settings/, "Settings was removed from the Stream sidebar");
assert.match(css, /\.side-nav nav\{[^}]*margin-top:0/, "Removing the badge left an empty gap above the navigation");

console.log("NEO Stream sidebar cleanup checks passed.");
