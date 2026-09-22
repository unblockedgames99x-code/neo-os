const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const html = read("neo-os", "index.html");
const engine = read("neo-os", "neo-wallpaper-engine.js");
const shell = read("neo-os", "neo-os.js");

assert.match(
  html,
  /<label class="we-add-wallpaper">[\s\S]*?\+ Add wallpaper[\s\S]*?<input id="wallpaper-upload-footer"[^>]*data-wallpaper-upload[^>]*>[\s\S]*?<\/label>/
);
assert.match(engine, /function getAvailableLibraries\(\)/);
assert.match(engine, /getBundledLibrary\(\)\.catch\(function \(\) \{ return \[\]; \}\)/);
assert.match(engine, /function hydrateStudio\(studio\)[\s\S]*?return getAvailableLibraries\(\)\.then/);
assert.match(engine, /function apply\(id, nextSettings\)[\s\S]*?return getAvailableLibraries\(\)\.then/);
assert.match(shell, /function handleWallpaperUpload\(input\)[\s\S]*?wallpaperEngine\.importFile\(nextFile\)/);
assert.match(shell, /studio\.dataset\.wallpaperSource = "installed"/);
assert.match(shell, /wallpaperEngine\.hydrateStudio\(studio\)/);

console.log("Wallpaper import checks passed.");
