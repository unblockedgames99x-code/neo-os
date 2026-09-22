const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const api = read("stratus-api-service/api.js");
const pkg = JSON.parse(read("stratus-api-service/package.json"));
const render = read("render.yaml");

new vm.Script(api, { filename: "stratus-api-service/api.js" });
assert.match(api, /Number\(process\.env\.PORT\) \|\| 3001/);
assert.match(api, /process\.env\.STRATUS_API_KEY/);
assert.match(api, /Access-Control-Allow-Origin/);
assert.match(api, /Access-Control-Allow-Headers[\s\S]*X-API-Key/);
assert.match(api, /req\.method === "OPTIONS"/);
assert.match(api, /app\.get\("\/health"/);
assert.match(api, /process\.env\.DISABLE_ACCOUNT_PREFILL !== "1"/);
assert.equal(pkg.scripts.start, "node api.js");
assert.match(render, /name: neo-stratus-api-w6nw/);
assert.match(render, /rootDir: stratus-api-service/);
assert.match(render, /healthCheckPath: \/health/);
assert.match(render, /DISABLE_ACCOUNT_PREFILL[\s\S]*value: "1"/);
assert.ok(fs.existsSync(path.join(root, "stratus-api-service/LICENSE")));

console.log("NEO's Stratus service has hosted-port, API-key, CORS, and health-check configuration.");
