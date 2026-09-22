const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const apps = fs.readFileSync(path.join(root, "neo-os", "neo-apps.js"), "utf8");

new vm.Script(apps, { filename: "neo-apps.js" });

assert.doesNotMatch(apps, /id:\s*"clock"|title:\s*"Clock"|aliases:\s*\[[^\]]*"stopwatch"/);
assert.match(apps, /neo_os_remove_clock_app_v1/);
assert.match(apps, /id !== "clock"/);

const stored = new Map([
  ["neo_os_pinned_apps_v1", JSON.stringify(["browser", "clock", "calculator"])],
  ["neo_os_installed_apps_v1", JSON.stringify(["clock", "notes"])],
]);
const localStorage = {
  getItem(key) { return stored.has(key) ? stored.get(key) : null; },
  setItem(key, value) { stored.set(key, String(value)); },
};

vm.runInNewContext(apps, { window: {}, localStorage });

const pinnedAfterMigration = JSON.parse(stored.get("neo_os_pinned_apps_v1"));
const installedAfterMigration = JSON.parse(stored.get("neo_os_installed_apps_v1"));
assert.ok(!pinnedAfterMigration.includes("clock"));
assert.ok(!installedAfterMigration.includes("clock"));
assert.ok(pinnedAfterMigration.includes("browser") && pinnedAfterMigration.includes("calculator"));
assert.ok(installedAfterMigration.includes("notes"));
assert.equal(stored.get("neo_os_remove_clock_app_v1"), "1");

console.log("Clock app registration and saved desktop icon removal checks passed.");
