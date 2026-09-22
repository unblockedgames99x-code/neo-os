const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const sourcePath = path.resolve(__dirname, "../neo-os/neo-frame-loader.js");
const source = fs.readFileSync(sourcePath, "utf8");
const sandbox = {
  AbortController,
  Blob,
  DOMException,
  URL,
  WeakMap,
  document: {
    baseURI: "https://script.googleusercontent.com/neo-os/",
    querySelector(selector) {
      return selector === 'meta[name="neo-runner"]' ? {} : null;
    }
  },
  fetch: async () => {
    throw new Error("not used");
  }
};
sandbox.window = sandbox;
vm.runInContext(source, vm.createContext(sandbox), { filename: sourcePath });

const basicHtml = "<!doctype html><html><head></head><body></body></html>";
const music = sandbox.NEOFrameLoader.prepare(
  basicHtml,
  "https://cdn.jsdelivr.net/gh/example/repo@commit/neo-os/music-v3/index.html"
);
assert.match(music, /neo-runner-network\.js/);
assert.match(music, /neo-link-proxy\.js/);

const externalEmbed = sandbox.NEOFrameLoader.prepare(
  '<!doctype html><html><head></head><body><iframe src="https://outside.example/embed"></iframe></body></html>',
  "https://cdn.jsdelivr.net/gh/example/repo@commit/neo-os/neo-youtube/index.html"
);
assert.match(externalEmbed, /src="about:blank" data-neo-proxy-src="https:\/\/outside\.example\/embed"/);
assert.match(externalEmbed, /neo-link-proxy\.js/);

const wrapper = sandbox.NEOFrameLoader.prepare(
  basicHtml,
  "https://cdn.jsdelivr.net/gh/example/repo@commit/games/web-dashers.html"
);
assert.match(wrapper, /meta name="neo-runner"/);
assert.doesNotMatch(wrapper, /neo-runner-network\.js/);

const browser = sandbox.NEOFrameLoader.prepare(
  basicHtml,
  "https://cdn.jsdelivr.net/gh/example/repo@commit/neo-os/NEO-BROWSER/index.html"
);
assert.doesNotMatch(browser, /neo-runner-network\.js/);
assert.doesNotMatch(browser, /neo-link-proxy\.js/);
const games = sandbox.NEOFrameLoader.prepare(
  basicHtml,
  "https://cdn.jsdelivr.net/gh/example/repo@commit/neo-os/neo-games/index.html"
);
assert.doesNotMatch(games, /neo-runner-network\.js/);
assert.doesNotMatch(games, /neo-link-proxy\.js/);
const localMusic = sandbox.NEOFrameLoader.prepare(
  basicHtml,
  "https://cdn.jsdelivr.net/gh/example/repo@commit/neo-os/music-local/index.html"
);
assert.doesNotMatch(localMusic, /neo-runner-network\.js/);
assert.match(source, /prepareDocument\(html, sourceUrl\)/);
assert.match(source, /Content-Security-Policy/);
assert.match(source, /NEO_LOCAL_CONFIG\.assetBase/);
assert.match(source, /isAllowedLocalSource\(sourceUrl\)/);
assert.match(source, /fastly\.jsdelivr\.net/);
assert.match(source, /gcore\.jsdelivr\.net/);

console.log("Frame loader installs each nested network runtime exactly once.");
