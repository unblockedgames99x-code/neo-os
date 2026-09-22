const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "neo-os", "index.html"), "utf8");
const script = fs.readFileSync(path.join(root, "neo-os", "neo-os.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "neo-os", "neo-os.css"), "utf8");
const catalog = JSON.parse(fs.readFileSync(path.join(root, "games", "index.json"), "utf8"));
const covers = JSON.parse(fs.readFileSync(path.join(root, "games", "covers.json"), "utf8"));
const template = html.match(/<template id="library-template">([\s\S]*?)<\/template>/i);

assert(template, "NEO Games template is missing");
assert(/UNBLOCKED GAMES/.test(template[1]), "Portal-style games title is missing");
assert(/data-library-catalog(?![^>]*hidden)/.test(template[1]), "Games catalog must open immediately");
assert(/data-library-nav="favorites"/.test(template[1]), "Favorites navigation is missing");
assert(/data-library-spotlight/.test(template[1]), "Spotlight layout is missing");
assert(/data-library-search/.test(template[1]), "Local search control is missing");
assert(/data-library-source/.test(template[1]), "Game library selector is missing");
assert(!/<iframe\b/i.test(template[1]), "Games library must not contain an iframe");
assert(!/(?:helium-on\.top|staticdelivr\.com\/gh\/1sunw|pulse\.helium)/i.test(template[1] + script + styles), "Games replacement must not depend on Helium, Zenith, or Pulse URLs");
assert(/\^games\\\/\[A-Za-z0-9\._\(\)\\\[\\\] -\]\+\\\.html\$/.test(script), "Local game route allowlist changed or is missing");
assert(/projectAssetUrl\("games\/index\.json"\)/.test(script), "NEO Games must use the local catalog");
assert(/projectAssetUrl\("games\/covers\.json/.test(script), "NEO Games must use the cover manifest");
assert(/category:\s*"Games"/.test(script), "Dynamic games should retain the Games category");
assert(catalog.length >= 3900, "The complete local game catalog is missing titles");
assert(Object.keys(covers).length === catalog.length, "Every catalog title must have a cover mapping");
assert(Object.values(covers).filter(value => /^\/games\/captured-covers\//.test(value)).length >= 3000, "Most game covers must remain local and fast");

console.log("NEO Games local-only checks passed.");
