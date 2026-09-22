const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { optimizeNeoShell } = require('./optimize-neo-shell.cjs');

const workspace = path.resolve(__dirname, '..');
const source = path.join(workspace, 'neo-os');
const gamesSource = path.join(workspace, 'games');
const optimizedFull = path.join(workspace, '.codex-tmp', 'npm-package-1.0.2-optimized', 'package', 'assets', 'wallpaper-engine-full');
const optimizedCache = path.join(workspace, '.codex-tmp', 'github-cdn-optimized-cache');
const output = path.join(workspace, '.codex-tmp', 'github-cdn-shards');
const account = 'unblockedgames99x-code';
const pinnedRefs = (() => {
  if (!process.env.NEO_CDN_REFS_JSON) return {};
  const parsed = JSON.parse(process.env.NEO_CDN_REFS_JSON);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('NEO_CDN_REFS_JSON must be an object.');
  for (const [name, ref] of Object.entries(parsed)) {
    if (!/^[a-z0-9-]+$/.test(name) || !/^(?:main|[0-9a-f]{40})$/i.test(String(ref))) throw new Error(`Invalid CDN ref for ${name}.`);
  }
  return parsed;
})();
const MiB = 1024 * 1024;
const maxRepoBytes = 48 * MiB;
const maxFileBytes = 19 * MiB;
const repos = [];
const MUSIC_V2_PRODUCTION_FILES = new Set([
  '_redirects',
  'discord.html',
  'index.html',
  'launch.svg',
  'launcher-sw.js',
  'LICENSE',
  'THIRD_PARTY_NOTICES.md',
  'neo-lucide.js',
  'neo-meting-integration.js',
  'neo-meting-player.js',
  'neo-meting-theme.css',
  'neo-os-bridge.js',
  'spotify-shell.css',
  'assets/cover-fallback.svg',
  'vendor/am-lyrics.min.js',
  'vendor/meting-glass.css',
  'vendor/meting-ui.css',
  'vendor/meting-ui.js',
]);
const RETIRED_APP_ASSETS = new Set([
  'discord-official.png',
  'geometry-dash.png',
  'neo-cloud.svg',
  'youtube-official.webp',
]);

if (!source.startsWith(workspace + path.sep) || !output.startsWith(workspace + path.sep)) {
  throw new Error('Shard paths must stay inside the workspace.');
}

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

function mkdir(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

function copyFile(from, to) {
  mkdir(to);
  fs.copyFileSync(from, to);
}

function copyTree(from, to) {
  fs.cpSync(from, to, { recursive: true, force: true });
}

function repoPath(name) {
  const target = path.join(output, name);
  fs.mkdirSync(target, { recursive: true });
  if (!repos.some((item) => item.name === name)) repos.push({ name, path: target });
  return target;
}

function cdnRoot(name, host = 'fastly.jsdelivr.net') {
  return `https://${host}/gh/${account}/${name}@${pinnedRefs[name] || 'main'}/`;
}

function writeReadme(target, title, description) {
  fs.writeFileSync(path.join(target, 'README.md'), `# ${title}\n\n${description}\n\nThis public shard is loaded by the NEO OS jsDelivr launcher.\n`);
}

function rootFiles(target) {
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (entry.isFile()) copyFile(path.join(source, entry.name), path.join(target, entry.name));
  }
}

function commonAssets(target) {
  const assets = path.join(source, 'assets');
  for (const entry of fs.readdirSync(assets, { withFileTypes: true })) {
    if (entry.isFile() && !RETIRED_APP_ASSETS.has(entry.name)) copyFile(path.join(assets, entry.name), path.join(target, 'assets', entry.name));
  }
  for (const name of ['cursors', 'fonts', 'tab-appearance', 'wallpapers']) {
    copyTree(path.join(assets, name), path.join(target, 'assets', name));
  }
}

function sharedAppFiles(target) {
  rootFiles(target);
  commonAssets(target);
}

function replaceAll(file, replacements) {
  let sourceText = fs.readFileSync(file, 'utf8');
  for (const [before, after] of replacements) {
    if (!sourceText.includes(before)) throw new Error(`Expected text not found in ${file}: ${before}`);
    sourceText = sourceText.split(before).join(after);
  }
  fs.writeFileSync(file, sourceText);
}

function listFiles(root) {
  const result = [];
  function visit(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else result.push(full);
    }
  }
  visit(root);
  return result;
}

function removeEmptyDirectories(root, preserveRoot = true) {
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const directory = path.join(root, entry.name);
    removeEmptyDirectories(directory, false);
  }
  if (!preserveRoot && fs.readdirSync(root).length === 0) fs.rmdirSync(root);
}

function bytes(root) {
  return listFiles(root).reduce((total, file) => total + fs.statSync(file).size, 0);
}

function runFfmpeg(args) {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`ffmpeg failed with exit code ${result.status}`);
}

function transcodeVideo(input, outputFile, crf, width) {
  mkdir(outputFile);
  const temp = outputFile + '.transcode' + path.extname(outputFile);
  const scale = `scale='min(${width},iw)':-2`;
  const extension = path.extname(outputFile).toLowerCase();
  if (extension === '.webm') {
    runFfmpeg(['-i', input, '-vf', scale, '-an', '-c:v', 'libvpx-vp9', '-crf', String(crf), '-b:v', '0', '-deadline', 'good', '-cpu-used', '5', '-row-mt', '1', temp]);
  } else {
    runFfmpeg(['-i', input, '-vf', scale, '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', String(crf), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', temp]);
  }
  fs.renameSync(temp, outputFile);
}

function transcodeUnderLimit(input, outputFile) {
  const attempts = [
    { crf: 30, width: 1920 },
    { crf: 34, width: 1920 },
    { crf: 38, width: 1600 },
    { crf: 42, width: 1280 },
  ];
  for (const attempt of attempts) {
    transcodeVideo(input, outputFile, attempt.crf, attempt.width);
    if (fs.statSync(outputFile).size < maxFileBytes) return;
  }
  throw new Error(`Could not reduce ${input} below the jsDelivr file limit.`);
}

function optimizeJpeg(input, outputFile, width = 1920, quality = 8) {
  mkdir(outputFile);
  const temp = outputFile + '.opt.jpg';
  runFfmpeg(['-i', input, '-vf', `scale='min(${width},iw)':-2`, '-q:v', String(quality), temp]);
  fs.renameSync(temp, outputFile);
}

function createAppRepo(name, title, folders) {
  const target = repoPath(name);
  sharedAppFiles(target);
  for (const folder of folders) {
    copyTree(path.join(source, folder), path.join(target, folder));
    if (folder === 'neo-tv') {
      for (const legacy of ['config.js', 'neo-tv.css', 'neo-tv.js', 'UPSTREAM.md']) {
        fs.rmSync(path.join(target, folder, legacy), { recursive: true, force: true });
      }
      const assets = path.resolve(target, folder, 'assets');
      for (const entry of fs.readdirSync(assets, { withFileTypes: true })) {
        if (entry.name === 'profile-classics') continue;
        const obsolete = path.resolve(assets, entry.name);
        if (!obsolete.startsWith(assets + path.sep)) throw new Error('NEO Movies asset escaped its generated shard.');
        fs.rmSync(obsolete, { recursive: true, force: true });
      }
    }
    if (folder === 'neo-games') {
      // The Games app reads the published playable catalogue directly. These
      // old nested copies are unreferenced and must not leak into its shard.
      for (const legacy of ['index.json', 'covers.json']) {
        fs.rmSync(path.join(target, folder, legacy), { force: true });
      }
    }
    if (folder === 'music-v2') {
      const musicRoot = path.resolve(target, folder);
      for (const file of listFiles(musicRoot)) {
        const relative = path.relative(musicRoot, file).replace(/\\/g, '/');
        if (MUSIC_V2_PRODUCTION_FILES.has(relative)) continue;
        if (!file.startsWith(musicRoot + path.sep)) throw new Error('NEO Music asset escaped its generated shard.');
        fs.rmSync(file, { force: true });
      }
      removeEmptyDirectories(musicRoot);
    }
  }
  writeReadme(target, title, `Application files for ${title}.`);
  return target;
}

const browserRepo = 'neo-os-browser-cdn';
const chatRepo = 'neo-os-chat-tv-cdn';
const musicTwoRepo = 'neo-os-music-two-cdn';
const coreRepo = 'neo-os-core-cdn';
const launcherRepo = 'neo-os-launch-cdn';
const gamesCatalogRepo = 'neo-os-games-catalog-cdn';
const launcherCoreRef = process.env.NEO_CDN_LAUNCHER_CORE_REF || pinnedRefs[coreRepo] || 'main';
if (!/^(?:main|[0-9a-f]{40})$/i.test(launcherCoreRef)) throw new Error('Invalid NEO_CDN_LAUNCHER_CORE_REF.');

const browserTarget = createAppRepo(browserRepo, 'NEO Browser', ['NEO-BROWSER', 'browser-runtime', 'local-browser', 'nextnode-browser']);
replaceAll(path.join(browserTarget, 'local-browser', 'local-browser.js'), [
  ['../music-v2/index.html', cdnRoot(musicTwoRepo) + 'music-v2/index.html'],
]);
replaceAll(path.join(browserTarget, 'local-browser', 'connection.html'), [
  ['../music-v2/', cdnRoot(musicTwoRepo) + 'music-v2/'],
]);

const chatTarget = createAppRepo(chatRepo, 'NEO Chat, Movies, and Games', ['neo-chat', 'neo-tv', 'neo-games', 'audiobooks']);
const musicTwoTarget = createAppRepo(musicTwoRepo, 'NEO Music player', ['music-v2']);
for (const sharedMusicFile of ['neo-app-theme.js', 'neo-interface-styles.css', 'neo-theme-system.css']) {
  copyFile(path.join(source, sharedMusicFile), path.join(musicTwoTarget, sharedMusicFile));
}

const webAssignments = [
  { name: 'neo-os-wallpaper-web-three-cdn', scenes: ['1403160205'] },
];
const webRepoByScene = new Map();
for (const assignment of webAssignments) {
  const target = repoPath(assignment.name);
  copyFile(path.join(source, 'neo-wallpaper-web-compat.js'), path.join(target, 'neo-wallpaper-web-compat.js'));
  for (const scene of assignment.scenes) {
    const destination = path.join(target, 'assets', 'wallpaper-engine-web', scene);
    copyTree(path.join(source, 'assets', 'wallpaper-engine-web', scene), destination);
    webRepoByScene.set(scene, assignment.name);
  }
  writeReadme(target, assignment.name, 'Wallpaper Engine web-scene files.');
}

const mediaRepoByFile = new Map();

function encodePathSegment(value) {
  return encodeURIComponent(value).replace(/%2F/gi, '/');
}

function packFiles(files, targetBytes) {
  const bins = [];
  files.slice().sort((a, b) => b.bytes - a.bytes || a.name.localeCompare(b.name)).forEach((file) => {
    let bin = bins.find((candidate) => candidate.bytes + file.bytes < targetBytes);
    if (!bin) {
      bin = { bytes: 0, files: [] };
      bins.push(bin);
    }
    bin.files.push(file);
    bin.bytes += file.bytes;
  });
  return bins;
}

const originalGameCatalog = JSON.parse(fs.readFileSync(path.join(gamesSource, 'index.json'), 'utf8').replace(/^\uFEFF/, ''));
const gameFiles = [];
const catalogByFile = new Map();
for (const entry of originalGameCatalog) {
  const match = String(entry && entry.file || '').replace(/\\/g, '/').match(/^games\/([^/]+\.html)$/i);
  if (!match || catalogByFile.has(match[1])) continue;
  const file = path.join(gamesSource, match[1]);
  if (!fs.existsSync(file)) continue;
  const size = fs.statSync(file).size;
  if (size >= maxFileBytes) continue;
  gameFiles.push({ name: match[1], file, bytes: size });
  catalogByFile.set(match[1], []);
}

const gameRepoByFile = new Map();
packFiles(gameFiles, 42 * MiB).forEach((bin, index) => {
  const name = `neo-os-games-${String(index + 1).padStart(2, '0')}-cdn`;
  const target = repoPath(name);
  for (const file of bin.files) {
    copyFile(file.file, path.join(target, 'games', file.name));
    gameRepoByFile.set(file.name, name);
  }
  writeReadme(target, name, 'Playable NEO OS HTML game files.');
});

const availableGameCatalog = originalGameCatalog.flatMap((entry) => {
  const match = String(entry && entry.file || '').replace(/\\/g, '/').match(/^games\/([^/]+\.html)$/i);
  if (!match) return [];
  const repo = gameRepoByFile.get(match[1]);
  if (!repo) return [];
  return [{ ...entry, file: cdnRoot(repo) + 'games/' + encodePathSegment(match[1]) }];
});

const originalCovers = JSON.parse(fs.readFileSync(path.join(gamesSource, 'covers.json'), 'utf8').replace(/^\uFEFF/, ''));
const referencedCoverFiles = new Map();
for (const entry of availableGameCatalog) {
  const mapped = String(originalCovers[entry.slug] || '');
  const match = mapped.match(/^\/games\/captured-covers\/([^/?#]+)$/i);
  if (!match || referencedCoverFiles.has(match[1])) continue;
  const file = path.join(gamesSource, 'captured-covers', match[1]);
  if (!fs.existsSync(file)) continue;
  const size = fs.statSync(file).size;
  if (size >= maxFileBytes) continue;
  referencedCoverFiles.set(match[1], { name: match[1], file, bytes: size });
}

const coverRepoByFile = new Map();
packFiles(Array.from(referencedCoverFiles.values()), 42 * MiB).forEach((bin, index) => {
  const name = `neo-os-game-covers-${String(index + 1).padStart(2, '0')}-cdn`;
  const target = repoPath(name);
  for (const file of bin.files) {
    copyFile(file.file, path.join(target, 'games', 'captured-covers', file.name));
    coverRepoByFile.set(file.name, name);
  }
  writeReadme(target, name, 'Optimized cover images for the NEO OS game library.');
});

const availableCovers = {};
for (const entry of availableGameCatalog) {
  const mapped = String(originalCovers[entry.slug] || '');
  const localMatch = mapped.match(/^\/games\/captured-covers\/([^/?#]+)$/i);
  if (localMatch && coverRepoByFile.has(localMatch[1])) {
    const repo = coverRepoByFile.get(localMatch[1]);
    availableCovers[entry.slug] = cdnRoot(repo) + 'games/captured-covers/' + encodePathSegment(localMatch[1]);
  } else if (/^https:\/\//i.test(mapped)) {
    availableCovers[entry.slug] = mapped;
  }
}

const gamesCatalogTarget = repoPath(gamesCatalogRepo);
fs.writeFileSync(path.join(gamesCatalogTarget, 'index.json'), JSON.stringify(availableGameCatalog, null, 2) + '\n');
fs.writeFileSync(path.join(gamesCatalogTarget, 'covers.json'), JSON.stringify(availableCovers, null, 2) + '\n');
writeReadme(gamesCatalogTarget, 'NEO OS game catalog', `Catalog metadata for ${availableGameCatalog.length} CDN-playable games.`);

const coreTarget = repoPath(coreRepo);
rootFiles(coreTarget);
commonAssets(coreTarget);
copyTree(path.join(source, 'neo-youtube'), path.join(coreTarget, 'neo-youtube'));
copyTree(path.join(source, 'neo-ai'), path.join(coreTarget, 'neo-ai'));
copyTree(path.join(source, 'neo-tools'), path.join(coreTarget, 'neo-tools'));
writeReadme(coreTarget, 'NEO OS core', 'The current NEO OS desktop core and shared interface assets.');
replaceAll(path.join(coreTarget, 'index.html'), [
  [
    'neo-local-config.js?v=20260922-worker-version-check-v13&amp;theme=system-v1&amp;widgets=live-v1&amp;music=scholarnook-v1',
    'neo-local-config.js?v=20260922-worker-version-check-v13&amp;theme=system-v1&amp;widgets=live-v1&amp;music=scholarnook-v1&amp;cdn=github-shards-v9',
  ],
]);

replaceAll(path.join(coreTarget, 'neo-apps.js'), [
  ['window.NEO_LOCAL_CONFIG ? window.NEO_LOCAL_CONFIG.music : "./music-v2/index.html"', `window.NEO_LOCAL_CONFIG ? window.NEO_LOCAL_CONFIG.music : "${cdnRoot(musicTwoRepo)}music-v2/launch.svg"`],
  ['./neo-games/index.html?build=20260921-fern-only-v1', `${cdnRoot(chatRepo)}neo-games/index.html?build=20260921-fern-only-v1`],
]);
replaceAll(path.join(coreTarget, 'neo-os.js'), [
  ['./NEO-BROWSER/index.html?v=20260912-proxy-ready-v2', `${cdnRoot(browserRepo)}NEO-BROWSER/index.html?v=20260912-proxy-ready-v2`],
  ['./neo-chat/index.html?v=20260921-no-call-buttons-v1', `${cdnRoot(chatRepo)}neo-chat/index.html?v=20260921-no-call-buttons-v1`],
]);
replaceAll(path.join(coreTarget, 'neo-local-config.js'), [
  [
    'var previewBase = new URL("http://127.0.0.1:3092/neo-os/");',
    "var previewBase = new URL(\"http://127.0.0.1:3092/neo-os/\");\n  var isCdnRunner = Boolean(document.querySelector('meta[name=\\\"neo-runner\\\"]'));",
  ],
  [
    'music: new URL("music-v2/index.html?v=20260919-scholarnook-v1&theme=system-v1&widgets=live-v1", base).href,',
    `music: isCdnRunner ? "${cdnRoot(musicTwoRepo)}music-v2/launch.svg?v=20260919-scholarnook-v1" : new URL("music-v2/index.html?v=20260919-scholarnook-v1&theme=system-v1&widgets=live-v1", base).href,`,
  ],
  [
    'browser: new URL("nextnode-browser/index.html?v=20260921-search-navigation-v2", base).href,',
    `browser: isCdnRunner ? "${cdnRoot(browserRepo)}nextnode-browser/launch.svg?v=20260921-search-navigation-v2" : new URL("nextnode-browser/index.html?v=20260921-search-navigation-v2", base).href,`,
  ],
  [
    '].map(function (asset) { return new URL("nextnode-browser/" + asset, base).href; }))',
    `].map(function (asset) { return isCdnRunner ? new URL("nextnode-browser/" + asset, "${cdnRoot(browserRepo)}").href : new URL("nextnode-browser/" + asset, base).href; }))`,
  ],
  [
    'appProxy: new URL("NEO-BROWSER/index.html?v=20260922-worker-version-check-v13", base).href,',
    `appProxy: isCdnRunner ? "${cdnRoot(browserRepo, 'cdn.jsdelivr.net')}NEO-BROWSER/launch.svg?v=20260922-worker-version-check-v13" : new URL("NEO-BROWSER/index.html?v=20260922-worker-version-check-v13", base).href,`,
  ],
  [
    'support: new URL("local-browser/support.html", base).href,',
    `support: isCdnRunner ? "${cdnRoot(browserRepo)}local-browser/support.html" : new URL("local-browser/support.html", base).href,`,
  ],
  [
    'unavailable: new URL("local-browser/unavailable.html", base).href,',
    `unavailable: isCdnRunner ? "${cdnRoot(browserRepo)}local-browser/unavailable.html" : new URL("local-browser/unavailable.html", base).href,`,
  ],
  [
    'gamesCatalog: new URL("../games/index.json", base).href,',
    `gamesCatalog: isCdnRunner ? "${cdnRoot(gamesCatalogRepo)}index.json" : new URL("../games/index.json", base).href,`,
  ],
  [
    'gamesCovers: new URL("../games/covers.json", base).href,',
    `gamesCovers: isCdnRunner ? "${cdnRoot(gamesCatalogRepo)}covers.json" : new URL("../games/covers.json", base).href,`,
  ],
  [
    'if (localRuntime) document.documentElement.dataset.localPreview = "true";\n  else document.documentElement.dataset.deployment = "production";',
    'if (localRuntime && !isCdnRunner) document.documentElement.dataset.localPreview = "true";\n  else document.documentElement.dataset.deployment = "production";',
  ],
]);
const frameLoader = path.join(coreTarget, 'neo-frame-loader.js');
let frameText = fs.readFileSync(frameLoader, 'utf8');
frameText = frameText.replace(
  '["fastly.jsdelivr.net", "gcore.jsdelivr.net"].forEach(function (hostname) {',
  '["fastly.jsdelivr.net", "cdn.jsdelivr.net", "gcore.jsdelivr.net", "quantil.jsdelivr.net"].forEach(function (hostname) {'
);
frameText = frameText.replace(/\n\s*var rawUrl = "https:\/\/raw\.githubusercontent\.com\/" \+ match\.slice\(1\)\.join\("\/"\);\n\s*candidates\.push\(rawUrl\);/, '');
fs.writeFileSync(frameLoader, frameText);

const wallpaperEngine = path.join(coreTarget, 'neo-wallpaper-engine.js');
let engineText = fs.readFileSync(wallpaperEngine, 'utf8');
engineText = engineText
  .replace('/^\\.\\/assets\\/wallpaper-engine-full\\/.+\\.(png|jpe?g|webp)$/i', '/\\.(png|jpe?g|webp)(?:[?#].*)?$/i')
  .replace('/^\\.\\/assets\\/wallpaper-engine-full\\/.+\\.(mp4|webm)$/i', '/\\.(mp4|webm)(?:[?#].*)?$/i')
  .replace('/^\\.\\/assets\\/wallpaper-engine-full\\/.+\\.gif$/i', '/\\.gif(?:[?#].*)?$/i')
  .replace('/^\\.\\/assets\\/wallpaper-engine-web\\/[A-Za-z0-9_-]+\\/.+\\.html?(?:\\?[^#]*)?$/i', '/\\.html?(?:[?#].*)?$/i');
fs.writeFileSync(wallpaperEngine, engineText);

const manifestFile = path.join(coreTarget, 'wallpaper-full-media.json');
const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8').replace(/^\uFEFF/, ''));
function shardWallpaperUrl(value) {
  const text = String(value || '');
  const suffixIndex = text.search(/[?#]/);
  const clean = suffixIndex === -1 ? text : text.slice(0, suffixIndex);
  const suffix = suffixIndex === -1 ? '' : text.slice(suffixIndex);
  const fullPrefix = './assets/wallpaper-engine-full/';
  const webPrefix = './assets/wallpaper-engine-web/';
  if (clean.startsWith(fullPrefix)) {
    const fileName = clean.slice(fullPrefix.length);
    const repo = mediaRepoByFile.get(fileName);
    if (!repo) throw new Error(`No media shard for ${fileName}`);
    return cdnRoot(repo) + `assets/wallpaper-engine-full/${fileName}${suffix}`;
  }
  if (clean.startsWith(webPrefix)) {
    const rest = clean.slice(webPrefix.length);
    const scene = rest.split('/')[0];
    const repo = webRepoByScene.get(scene);
    if (!repo) throw new Error(`No web-scene shard for ${scene}`);
    return cdnRoot(repo) + `assets/wallpaper-engine-web/${rest}${suffix}`;
  }
  return text;
}
for (const project of manifest.projects || []) {
  project.file = shardWallpaperUrl(project.file);
  project.preview = shardWallpaperUrl(project.preview);
}
fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');

const iconOptimization = spawnSync(process.execPath, [path.join(__dirname, 'optimize-desktop-assets.cjs'), coreTarget], { encoding: 'utf8' });
if (iconOptimization.status !== 0) throw new Error(iconOptimization.stderr || 'Desktop icon optimization failed.');
const shellOptimization = optimizeNeoShell(coreTarget);
console.log(`Optimized NEO shell: ${shellOptimization.originalFiles} requests -> ${shellOptimization.optimizedFiles}, ${shellOptimization.reductionPercent}% fewer source bytes.`);

const launcherTarget = repoPath(launcherRepo);
const launcherHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>NEO OS</title>
  <style>html,body{width:100%;height:100%;margin:0;background:#050505;color:#fff;font:16px Arial,sans-serif}body{display:grid;place-items:center}.status{text-align:center}</style>
</head>
<body>
  <main class="status" id="status">Loading NEO OS…</main>
  <script>
  (function () {
    "use strict";
    var hosts = [location.hostname, "fastly.jsdelivr.net", "cdn.jsdelivr.net", "gcore.jsdelivr.net", "quantil.jsdelivr.net"];
    var seen = Object.create(null);
    var roots = hosts.filter(function (host) {
      if (!/^(?:fastly|cdn|gcore|quantil)\\.jsdelivr\\.net$/i.test(host) || seen[host]) return false;
      seen[host] = true;
      return true;
    }).map(function (host) { return "https://" + host + "/gh/${account}/${coreRepo}@${launcherCoreRef}/"; });
    var status = document.getElementById("status");

    function install(source, root) {
      var html = String(source || "").replace(/<meta\\b[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, "");
      var injection = '<base href="' + root.replace(/&/g, "&amp;").replace(/"/g, "&quot;") + '">' +
        '<meta name="neo-runner" content="github-jsdelivr">';
      html = /<head(?:\\s[^>]*)?>/i.test(html)
        ? html.replace(/<head(?:\\s[^>]*)?>/i, function (head) { return head + injection; })
        : injection + html;
      document.open();
      document.write(html);
      document.close();
    }

    function tryRoot(index) {
      if (index >= roots.length) {
        status.textContent = "NEO OS could not load. Refresh to try again.";
        return;
      }
      fetch(roots[index] + "index.html", { cache: "no-store", credentials: "omit" })
        .then(function (response) {
          if (!response.ok) throw new Error("CDN response " + response.status);
          return response.text();
        })
        .then(function (html) { install(html, roots[index]); })
        .catch(function () { tryRoot(index + 1); });
    }
    tryRoot(0);
  })();
  <\/script>
</body>
</html>
`;
fs.writeFileSync(path.join(launcherTarget, 'index.html'), launcherHtml);
const launcherSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <title id="neo-launch-title">NEO OS</title>
  <script><![CDATA[
    var desktopFrame = null;

    function waitUntilActive(registration) {
      var worker = registration.active || registration.waiting || registration.installing;
      if (!worker || worker.state === 'activated') return Promise.resolve();
      return new Promise(function (resolve) {
        var timer = setTimeout(resolve, 8000);
        worker.addEventListener('statechange', function changed() {
          if (worker.state !== 'activated') return;
          clearTimeout(timer);
          worker.removeEventListener('statechange', changed);
          resolve();
        });
      });
    }

    function waitUntilControlled() {
      if (navigator.serviceWorker.controller) return Promise.resolve();
      return new Promise(function (resolve) {
        var timer = setTimeout(resolve, 2000);
        navigator.serviceWorker.addEventListener('controllerchange', function changed() {
          clearTimeout(timer);
          navigator.serviceWorker.removeEventListener('controllerchange', changed);
          resolve();
        });
      });
    }

    function applyTabAppearance(appearance) {
      if (!appearance || typeof appearance.title !== 'string' || typeof appearance.icon !== 'string') return;
      var title = appearance.title.trim().slice(0, 80) || 'NEO OS';
      var titleNode = document.getElementById('neo-launch-title');
      if (titleNode) titleNode.textContent = title;
      try { document.title = title; } catch (error) {}
      var icon = document.getElementById('neo-launch-icon');
      if (!icon) {
        icon = document.createElementNS('http://www.w3.org/1999/xhtml', 'link');
        icon.setAttribute('id', 'neo-launch-icon');
        icon.setAttribute('rel', 'icon');
        document.documentElement.appendChild(icon);
      }
      icon.setAttribute('type', typeof appearance.type === 'string' ? appearance.type : 'image/png');
      icon.setAttribute('href', appearance.icon);
    }

    window.addEventListener('message', function (event) {
      if (!desktopFrame || event.source !== desktopFrame.contentWindow) return;
      var message = event.data;
      if (!message || message.type !== 'neo-shell:tab-appearance') return;
      applyTabAppearance(message.detail);
    });

    window.addEventListener('load', function () {
      var host = document.getElementById('host');
      var hosts = [location.hostname, 'fastly.jsdelivr.net', 'cdn.jsdelivr.net', 'gcore.jsdelivr.net', 'quantil.jsdelivr.net'];
      var seen = Object.create(null);
      var roots = hosts.filter(function (hostname) {
        if (!/^(?:fastly|cdn|gcore|quantil)\\.jsdelivr\\.net$/i.test(hostname) || seen[hostname]) return false;
        seen[hostname] = true;
        return true;
      }).map(function (hostname) { return 'https://' + hostname + '/gh/${account}/${coreRepo}@${launcherCoreRef}/'; });
      var frame = document.createElementNS('http://www.w3.org/1999/xhtml', 'iframe');
      var loading = document.getElementById('neo-launch-status');
      desktopFrame = frame;
      frame.setAttribute('id', 'neo-os');
      frame.setAttribute('title', 'NEO OS');
      frame.setAttribute('allow', 'autoplay; picture-in-picture; clipboard-read; clipboard-write; fullscreen; gamepad; display-capture');
      frame.setAttribute('allowfullscreen', 'true');
      frame.setAttribute('style', 'position:fixed;inset:0;width:100%;height:100%;border:0;background:#050505;visibility:hidden');
      host.appendChild(frame);

      function prepare(source, root) {
        var html = String(source || '').replace(/<meta\\b[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '');
        var injection = '<base href="' + root.replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '">' +
          '<meta name="neo-runner" content="github-jsdelivr">';
        return /<head(?:\\s[^>]*)?>/i.test(html)
          ? html.replace(/<head(?:\\s[^>]*)?>/i, function (head) { return head + injection; })
          : injection + html;
      }

      function tryRoot(index) {
        if (index >= roots.length) {
          host.textContent = 'NEO OS could not load. Refresh to try again.';
          return;
        }
        fetch(roots[index] + 'index.html', { cache: 'no-store', credentials: 'omit' })
          .then(function (response) {
            if (!response.ok) throw new Error('Core response ' + response.status);
            return response.text();
          })
          .then(function (source) {
            frame.addEventListener('load', function () {
              frame.setAttribute('style', 'position:fixed;inset:0;width:100%;height:100%;border:0;background:#050505;visibility:visible');
              if (loading) loading.remove();
            }, { once: true });
            frame.setAttribute('srcdoc', prepare(source, roots[index]));
          })
          .catch(function () { tryRoot(index + 1); });
      }
      function startDesktop() { tryRoot(0); }
      if (!('serviceWorker' in navigator)) {
        startDesktop();
        return;
      }
      var workerUrl = new URL('launcher-sw.js?v=20260919-scholarnook-v1', location.href).href;
      var workerScope = new URL('./', location.href).pathname;
      navigator.serviceWorker.register(workerUrl, { scope: workerScope })
        .then(waitUntilActive)
        .then(waitUntilControlled)
        .then(startDesktop, startDesktop);
    });
  ]]></script>
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml" id="host" style="position:fixed;inset:0;display:grid;place-items:center;background:#050505;color:#fff;font:16px Arial,sans-serif"><span id="neo-launch-status" role="status">Loading NEO OS…</span></div>
  </foreignObject>
</svg>
`;
fs.writeFileSync(path.join(launcherTarget, 'launch.svg'), launcherSvg);
copyFile(path.join(workspace, 'scripts', 'cdn-launcher-sw.js'), path.join(launcherTarget, 'launcher-sw.js'));
writeReadme(launcherTarget, 'NEO OS jsDelivr launcher', 'A browser-safe jsDelivr entry point that loads the NEO OS core and application shards.');

for (const repo of repos) {
  const total = bytes(repo.path);
  const tooLarge = listFiles(repo.path).filter((file) => fs.statSync(file).size >= maxFileBytes);
  if (total >= maxRepoBytes) throw new Error(`${repo.name} is ${(total / MiB).toFixed(2)} MiB, above the 48 MiB target.`);
  if (tooLarge.length) throw new Error(`${repo.name} has files at or above 19 MiB: ${tooLarge.join(', ')}`);
  repo.bytes = total;
}

const deployment = {
  account,
  coreRepo,
  launcherRepo,
  repos: repos.map((repo) => ({ name: repo.name, bytes: repo.bytes })),
};
fs.writeFileSync(path.join(output, 'deployment.json'), JSON.stringify(deployment, null, 2) + '\n');

for (const repo of repos.slice().sort((a, b) => a.name.localeCompare(b.name))) {
  console.log(`${repo.name}\t${(repo.bytes / MiB).toFixed(2)} MiB`);
}
console.log(`Built ${repos.length} jsDelivr shards in ${output}`);
