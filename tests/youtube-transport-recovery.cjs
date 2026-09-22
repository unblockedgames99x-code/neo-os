const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const runtime = fs.readFileSync(path.join(root, "neo-os", "neo-browser-runtime.js"), "utf8");
const worker = fs.readFileSync(path.join(root, "neo-os", "browser-sw.js"), "utf8");
const config = fs.readFileSync(path.join(root, "neo-os", "browser-runtime", "uv", "uv.config.js"), "utf8");
const index = fs.readFileSync(path.join(root, "neo-os", "index.html"), "utf8");

assert.match(runtime, /ENGINE_VERSION = "neo-browse-v71"/);
assert.match(worker, /ENGINE_VERSION = "neo-browse-v71"/);
assert.match(config, /engineVersion = "neo-browse-v71"/);
assert.doesNotMatch(index, /expectedEngine\s*=/, 'The desktop must not scan and unregister workers during startup');
assert.match(runtime, /function isYouTubeDestination\(destination\)/);
assert.match(runtime, /isYouTubeDestination\(destination\) && currentTransport !== PRIMARY_TRANSPORT_URL/);
assert.match(runtime, /Hyper client\|hyper_util::client::legacy::Error\|MuxTaskEnded\|Multiplexor task ended/);
assert.match(worker, /Hyper client\|hyper_util::client::legacy::Error\|MuxTaskEnded\|Multiplexor task ended/);
assert.match(runtime, /window\.NEO_LOCAL_CONFIG\?\.browser/);
assert.match(runtime, /browserAsset\("browser-sw\.js"\)/);
assert.match(worker, /import "\.\/browser-runtime\/uv\/uv\.bundle\.js/);
assert.match(worker, /new URL\("\.\/browse-v71\/", self\.location\.href\)\.pathname/);
assert.match(config, /new URL\(runsInDocument \? "\.\.\/\.\.\/" : "\.\/", configSource\)/);
assert.match(config, /prefix: routePrefix/);
assert.doesNotMatch(runtime, /["'`]\/neo-os\/browser-runtime/);
assert.doesNotMatch(worker, /["'`]\/neo-os\/browser-runtime/);
assert.doesNotMatch(config, /["'`]\/neo-os\/browser-runtime/);

console.log("YouTube transport recovery checks passed.");
