const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

const catalog = read("neo-os", "neo-tv", "catalog.js");
const app = read("neo-os", "neo-tv", "app.js");
const html = read("neo-os", "neo-tv", "index.html");
const removedNames = [
  "Open Horizons", "Signal at Dawn", "The Last Archive", "Between Worlds",
  "Deep Current", "Neon Harbor", "Northbound", "Ember City", "Parallel",
  "Silent Orbit", "Glasshouse", "The Long Winter", "Continuum", "Wildlight",
  "Afterimage", "Paper Moons", "Zero Hour", "Quiet Giants", "Redline",
  "The Shape of Small Things", "Skyline Runners", "Library of Stars",
  "Zero Gravity Club", "Echo Blade", "After School Orbit", "The Paper Dragon",
  "Midnight Platform", "Garden of Machines", "The Lantern Keeper", "Coffee Comet",
  "Wind at Noon", "Small Planet Club"
];

assert.match(catalog, /Big Buck Bunny/, "The real open-film catalog is missing");
assert.match(catalog, /Tears of Steel/, "The real open-film catalog is incomplete");
assert.doesNotMatch(catalog + html, /picsum\.photos|cc0-videos/, "Generated artwork or placeholder-video entries remain");
removedNames.forEach((title) => assert.ok(!(catalog + html).includes(title), `Invented title remains: ${title}`));
assert.doesNotMatch(app, /NEO movies|NEO series|Only on NEO/, "Invented NEO catalog rows remain");
assert.match(app, /vrcwat\.ch\/web\/catalog/, "The full public metadata catalogue is missing");
assert.match(app, /path: "discover"[\s\S]*type: "m"[\s\S]*sort: "popular"/, "Movie discovery is missing");
assert.match(app, /type: "tv"[\s\S]*sort: "popular"/, "Series discovery is missing");
assert.match(app, /type: "a"[\s\S]*sort: "popular"/, "Anime discovery is missing");
assert.match(app, /catalogPageSize = 36[\s\S]*loadNextLibraryPage/, "The catalogue is not incrementally paginated");
assert.match(app, /No verified manga titles are available yet/, "Manga does not have an honest empty state");
assert.match(app, /featured\.length[\s\S]{0,100}\[data-hero\]/, "The empty catalog can still expose the stale hero");

console.log("NEO Stream contains real open films and no bundled fake titles.");
