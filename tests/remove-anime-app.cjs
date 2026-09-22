const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const apps = read("neo-os", "neo-apps.js");
const shell = read("neo-os", "neo-os.js");
const shardBuild = read("scripts", "build-github-cdn-shards.cjs");

new vm.Script(apps, { filename: "neo-apps.js" });
new vm.Script(shell, { filename: "neo-os.js" });
new vm.Script(shardBuild, { filename: "build-github-cdn-shards.cjs" });

assert.doesNotMatch(apps, /id:\s*"anime"|title:\s*"Anime"|view=anime/);
assert.match(apps, /neo_os_remove_anime_app_v1/);
assert.match(apps, /id !== "anime"/);
assert.doesNotMatch(shell, /appId === "anime"|"cinehd", "anime"/);
assert.doesNotMatch(shardBuild, /neo-tv\/launch\.svg\?view=anime/);
assert.match(apps, /id:\s*"cinehd"/);

console.log("Anime app and saved desktop icon removal checks passed.");
