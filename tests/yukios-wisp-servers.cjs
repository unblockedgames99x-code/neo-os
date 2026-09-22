const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const servers = [
  ["NextNode Wisp", "wss://nextnode9124.b-cdn.net/w/"],
  ["Probuilding Wisp", "wss://probuildingsupplies.com/w/"],
  ["Mercury Wisp", "wss://wisp.mercurywork.shop/"],
  ["Reeyuki Wisp", "wss://hurt-agata-liventcord-api-7072e9a6.koyeb.app/"],
  ["Reeyuki Wisp 2", "wss://reeyukiwisp.onrender.com/"],
  ["Aether Relay 1", "wss://w2.qwq.sh/ws/"],
  ["Aether Relay 2", "wss://api.personalloanonline.net/ws/"],
  ["Aether Relay 3", "wss://www.goldenbasketballacademy.space/ws/"],
  ["Aether Relay 4", "wss://www.atlantaclassical.info/ws/"],
  ["Aether Relay 5", "wss://www.booksforschool.online/ws/"],
];

const selector = read("neo-os/nextnode-browser/wisp-settings.js");
const browser = read("neo-os/nextnode-browser/index.html");
const scramjet = read("neo-os/NEO-BROWSER/assets/scramjet-runtime.js");
const desktopRuntime = read("neo-os/neo-browser-runtime.js");
const config = read("neo-os/neo-local-config.js");
const shell = read("neo-os/index.html");

for (const [name, url] of servers) {
  assert.match(selector, new RegExp(name.replace(/ /g, "\\s+")), `${name} is missing from the Browser selector`);
  for (const [label, source] of [
    ["selector", selector],
    ["full Scramjet runtime", scramjet],
    ["desktop browser runtime", desktopRuntime],
    ["local configuration", config],
  ]) {
    assert.ok(source.includes(url), `${url} is missing from ${label}`);
  }
  const origin = new URL(url).origin.replace("https:", "wss:");
  assert.ok(shell.includes(origin), `${origin} is missing from the production CSP`);
}

assert.ok(browser.includes('id="b-wisp"'), "Browser proxy-server button is missing");
assert.ok(browser.includes('id="wisp-select"'), "Browser proxy-server selector is missing");
assert.ok(browser.includes('wisp-settings.js?v=20260919-auto-wisp-v1'), "Browser selector script is not cache-busted");
assert.ok(config.includes('nextnode-browser/index.html?v=20260919-auto-wisp-v1'), "Browser route is not cache-busted");
assert.ok(selector.includes('Automatic (recommended)'), "Automatic WISP mode is missing");
assert.ok(selector.includes('=== "manual" ? "manual" : "auto"'), "Automatic WISP mode is not the default");
assert.ok(scramjet.includes('preferredRelayKey = "neo:browser:wisp:v1"'), "Scramjet does not use the shared WISP preference");
assert.ok(selector.includes('event.data.type !== "neo:wisp-server-change"'), "Browser does not listen for server changes");
assert.ok(scramjet.includes("relayOptions:"), "Scramjet does not expose its named relay choices");
assert.ok(desktopRuntime.includes('WISP_PREFERENCE_KEY = "neo:browser:wisp:v1"'), "Desktop fallback does not use the shared WISP preference");
assert.ok(desktopRuntime.includes('if (selected) return selected;'), "Desktop Browser does not prioritize the saved relay");
assert.ok(!desktopRuntime.includes('wss://cdn.northstreetumc.org/adblock/'), "Desktop Browser still includes an unrelated fallback relay");
assert.ok(!scramjet.includes('wss://support.pired.org/lively/'), "Scramjet still includes an unrelated fallback relay");

console.log(`Yukios WISP server coverage passed (${servers.length} servers).`);
