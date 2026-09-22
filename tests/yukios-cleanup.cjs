const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const shell = read("neo-os/index.html");
const apps = read("neo-os/neo-apps.js");
const optimizer = read("scripts/optimize-neo-shell.cjs");

assert.ok(!shell.includes("neo-yukios-parity"), "the shell still loads the YukiOS parity bundle");
assert.ok(!optimizer.includes("neo-yukios-parity.js"), "the optimized build still includes the YukiOS parity runtime");
assert.ok(!fs.existsSync(path.join(root, "neo-os/neo-yukios-parity.js")), "the YukiOS app injector still exists");
assert.ok(!fs.existsSync(path.join(root, "neo-os/neo-yukios-parity.css")), "the unused YukiOS settings stylesheet still exists");
assert.match(apps, /neo_os_remove_yukios_apps_v1/, "saved YukiOS app pins are not migrated away");
assert.match(apps, /localStorage\.removeItem\("neo_extended_settings_v1"\)/, "obsolete YukiOS settings are not removed");
["itch-io", "slack", "chatgpt-web", "developer-tools", "whats-new"].forEach(id => {
  assert.ok(!shell.includes(`id: "${id}"`), `${id} leaked into the shell HTML`);
});

console.log("YukiOS apps and parity settings are removed from NEO OS.");
