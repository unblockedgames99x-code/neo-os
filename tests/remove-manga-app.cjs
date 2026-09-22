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

assert.doesNotMatch(apps, /id:\s*"manga"|title:\s*"Manga"|view=manga/);
assert.match(apps, /neo_os_remove_manga_app_v1/);
assert.match(apps, /id !== "manga"/);
assert.doesNotMatch(shell, /appId === "manga"|"cinehd", "manga"/);
assert.doesNotMatch(shardBuild, /neo-tv\/launch\.svg\?view=manga/);
assert.match(apps, /id:\s*"cinehd"/);
assert.match(apps, /aliases:\s*\[[^\]]*"manga"/);

const stored = new Map([
  ["neo_os_pinned_apps_v1", JSON.stringify(["browser", "manga", "cinehd"])],
  ["neo_os_installed_apps_v1", JSON.stringify(["manga", "cinehd", "notes"])],
  ["neo_os_remove_anime_app_v1", "1"],
]);
const localStorage = {
  getItem(key) { return stored.has(key) ? stored.get(key) : null; },
  setItem(key, value) { stored.set(key, String(value)); },
};
vm.runInNewContext(apps, { window: {}, localStorage });
const pinnedAfterMigration = JSON.parse(stored.get("neo_os_pinned_apps_v1"));
const installedAfterMigration = JSON.parse(stored.get("neo_os_installed_apps_v1"));
assert.ok(!pinnedAfterMigration.includes("manga"));
assert.ok(!installedAfterMigration.includes("manga"));
assert.ok(pinnedAfterMigration.includes("browser") && pinnedAfterMigration.includes("cinehd"));
assert.ok(installedAfterMigration.includes("cinehd") && installedAfterMigration.includes("notes"));
assert.equal(stored.get("neo_os_remove_manga_app_v1"), "1");

console.log("Manga app and saved desktop icon removal checks passed.");
