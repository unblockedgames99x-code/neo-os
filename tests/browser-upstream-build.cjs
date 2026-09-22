const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const config = read('neo-os', 'neo-local-config.js');
const shell = read('neo-os', 'neo-os.js');
const frameLoader = read('neo-os', 'neo-frame-loader.js');
const index = read('neo-os', 'index.html');
const preview = read('local-preview.mjs');
const shardBuilder = read('scripts', 'build-github-cdn-shards.cjs');
const upstreamManifest = JSON.parse(read('neo-os', 'nextnode-browser', 'upstream-manifest.json'));
const embeddedBrowser = read('neo-os', 'nextnode-browser', 'index.html');
const wispSettings = read('neo-os', 'nextnode-browser', 'wisp-settings.js');
const embeddedController = read('neo-os', 'nextnode-browser', 'study', 'sf-ctl.js');
const browserLauncher = read('neo-os', 'nextnode-browser', 'launch.svg');

assert.match(config, /upstreamBrowserRoot = new URL\("https:\/\/nextnode9124\.b-cdn\.net\/"\)/);
assert.match(config, /browser: new URL\("nextnode-browser\/index\.html\?v=20260914-official-wisp-v2", base\)\.href/);
assert.match(config, /browserWarmAssets: Object\.freeze/);
for (const file of ['sf-engine.js', 'sf-ctl.js', 'sf-utils.js', 'libcurl.js', 'sf-engine.wasm']) {
  assert.ok(config.includes(`"study/${file}"`), `Missing Browser warm-up asset: ${file}`);
}
assert.equal(upstreamManifest.upstream, 'https://nextnode9124.b-cdn.net/');
assert.ok(upstreamManifest.files.length >= 12);
assert.match(embeddedBrowser, /wisp-settings\.js\?v=20260914-official-wisp-v2/);
assert.match(wispSettings, /window\.NEO_PROXY_ENGINE = "Scramjet"/);
assert.match(wispSettings, /window\.NEO_WISP = configuredWisp\(\)/);
assert.match(embeddedBrowser, /<script src="\.\.\/neo-ad-shield\.js"><\/script>/);
assert.match(embeddedBrowser, /<img class="nt-brand-mark" src="\.\/assets\/neo-os-logo\.png" alt="NEO OS">/);
assert.match(embeddedBrowser, /<div class="nt-logo">Browser<\/div>/);
assert.doesNotMatch(embeddedBrowser, /<div class="nt-logo">[^<]*(?:NEO|·|<span)/i);
assert.doesNotMatch(embeddedBrowser, /class="nt-engine"/);
assert.match(embeddedBrowser, /id="b-pop"[^>]*hidden[^>]*aria-hidden="true"/);
assert.match(embeddedBrowser, /\.menu-btns #b-pop \{ display: none !important; \}/);
assert.match(embeddedBrowser, /builtInBookmarks=new Set/);
assert.match(browserLauncher, /fetch\(new URL\('index\.html\?build=browser-cdn-launch-v2'/);
assert.match(browserLauncher, /navigator\.serviceWorker\.register\(workerUrl, \{ scope: workerScope \}\)/);
assert.match(browserLauncher, /frame\.setAttribute\('srcdoc', prepareBrowser\(source\)\)/);
assert.doesNotMatch(embeddedBrowser, /<script\s+src=["'][^"']*smartpop\.js/i);
assert.doesNotMatch(embeddedBrowser, /Serum/i);
assert.match(embeddedBrowser, /rel="preconnect" href="https:\/\/nextnode9124\.b-cdn\.net"/);
assert.match(embeddedBrowser, /rel="preload" href="\.\/study\/sf-engine\.wasm"/);
assert.match(embeddedBrowser, /window\.NEO_SEARCH_PROVIDER='duckduckgo'/);
assert.match(embeddedBrowser, /https:\/\/duckduckgo\.com\/\?q=/);
assert.doesNotMatch(embeddedBrowser, /https:\/\/www\.qwant\.com\/\?q=/);
assert.doesNotMatch(embeddedBrowser, /<script src="\.\/browser-vendor\/eruda\.min\.js"><\/script>/i);
assert.match(embeddedBrowser, /the lazy developer tools loader|script\.src=new URL\('\.\/browser-vendor\/eruda\.min\.js'/);
assert.match(embeddedBrowser, /var TP=new URL\('\.\/',document\.baseURI\|\|location\.href\)\.pathname/);
assert.equal((embeddedController.match(/new URL\(this\.prefix,document\.baseURI\|\|location\.href\)/g) || []).length, 2);
assert.equal((embeddedController.match(/new URL\(document\.baseURI\|\|location\.href\)/g) || []).length, 2);
assert.doesNotMatch(embeddedBrowser, /window\['parent'\].*?\['NEO_WISP'\]/);
assert.match(config, /appProxy: new URL\("NEO-BROWSER\/index\.html\?v=20260913-yukios-wisp-v1", base\)\.href/);
assert.match(shell, /apps\.browser\.route = localConfig\.browser/);
assert.ok(
  shell.indexOf('if (localConfig && localConfig.browser)') < shell.indexOf('if (localOnly)'),
  'The CDN runner must apply the full Browser route even when local-only mode is disabled.'
);
assert.match(shell, /browser:[\s\S]*?keepAlive: false/);
assert.match(shell, /data-neo-browser-prefetch/);
assert.match(shell, /localConfig && localConfig\.appProxy \? localConfig\.appProxy/);
assert.match(frameLoader, /isConfiguredDirectSource\(sourceUrl\)/);
assert.match(frameLoader, /if \(\(isConfiguredDirectSource\(sourceUrl\) \|\| !isRunner\(\)/);
assert.match(index, /frame-src[^;]*https:\/\/nextnode9124\.b-cdn\.net/);
assert.match(index, /rel="preconnect" href="https:\/\/nextnode9124\.b-cdn\.net"/);
assert.match(preview, /frame-src[^;]*https:\/\/nextnode9124\.b-cdn\.net/);
assert.match(shardBuilder, /'local-browser', 'nextnode-browser'/);
assert.doesNotMatch(shardBuilder, /createAppRepo\(browserRepo,[^\n]*'neo-ai'/);
assert.match(shardBuilder, /github-shards-v4/);
assert.match(shardBuilder, /browser: isCdnRunner \? .*nextnode-browser\/launch\.svg/);
assert.match(shardBuilder, /isCdnRunner \? new URL\("nextnode-browser\/" \+ asset/);
assert.match(shardBuilder, /appProxy: isCdnRunner \?/);

console.log('Browser uses the full ad-free Scramjet build with no preset bookmarks, direct WISP, DuckDuckGo search, and critical warm-up assets.');
