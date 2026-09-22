const fs = require('node:fs');
const path = require('node:path');
const { optimizeNeoShell } = require('./optimize-neo-shell.cjs');
const { optimizeDesktopAssets } = require('./optimize-desktop-assets.cjs');

const root = path.resolve(__dirname, '..');
const output = path.resolve(process.argv[2] || path.join(root, '.codex-tmp', 'sites-performance-dist'));
// This builder only creates a fresh output directory. It never deletes a checkout.
if (fs.existsSync(output)) throw new Error('Choose a new empty output directory: ' + output);
fs.mkdirSync(output, { recursive: true });
const cache = path.join(root, '.codex-tmp', 'github-cdn-optimized-cache');
const provenance = [];
const omittedLegacyAssets = [];
const MUSIC_V2_PRODUCTION_FILES = new Set([
  'music-v2/_redirects',
  'music-v2/discord.html',
  'music-v2/index.html',
  'music-v2/launch.svg',
  'music-v2/launcher-sw.js',
  'music-v2/LICENSE',
  'music-v2/THIRD_PARTY_NOTICES.md',
  'music-v2/neo-lucide.js',
  'music-v2/neo-meting-integration.js',
  'music-v2/neo-meting-player.js',
  'music-v2/neo-meting-theme.css',
  'music-v2/neo-os-bridge.js',
  'music-v2/spotify-shell.css',
  'music-v2/assets/cover-fallback.svg',
  'music-v2/vendor/am-lyrics.min.js',
  'music-v2/vendor/meting-glass.css',
  'music-v2/vendor/meting-ui.css',
  'music-v2/vendor/meting-ui.js',
]);
// The current NEO Movies entry is the small vanilla app.js/catalog.js/app.css
// build. Its local classic profile pictures and supplied app icon are intentional; the
// old hashed application bundle is no longer referenced by a live entry point.
const tvEntry = fs.readFileSync(path.join(root, 'neo-os/neo-tv/index.html'), 'utf8');
if (!/src=["']\.\/app\.js/.test(tvEntry) || /(?:src|href)=["']\.\/assets\/(?:index|vendor)-[^"']+\.js/.test(tvEntry)) {
  throw new Error('NEO Movies entry changed; review its legacy asset exclusions before building.');
}
const gamesEntry = fs.readFileSync(path.join(root, 'neo-os/neo-games/index.html'), 'utf8');
const gamesRuntime = fs.readFileSync(path.join(root, 'neo-os/neo-games/app.js'), 'utf8');
if (!/src=["']\.\/config\.js/.test(gamesEntry) || !/src=["']\.\/app\.js/.test(gamesEntry) ||
    !/greatestgreatest-revive@main\/scrapegames\.js/.test(gamesRuntime) ||
    !/function parseCatalogScript/.test(gamesRuntime) ||
    !/function directGameUrl/.test(gamesRuntime) ||
    !/rawcdn\.githack\.com/.test(gamesRuntime) ||
    /requestProxiedEmbed|NEO-BROWSER\/index\.html/.test(gamesRuntime)) {
  throw new Error('NEO Games must use the GGR master catalogue directly without the web proxy.');
}
const appRegistry = fs.readFileSync(path.join(root, 'neo-os/neo-apps.js'), 'utf8');
if (!/browserTarget:\s*window\.NEO_LOCAL_CONFIG \? window\.NEO_LOCAL_CONFIG\.music : ["']\.\/music-v2\/index\.html["']/.test(appRegistry) ||
    /browserTarget:[^\n]*(?:music-v3|music-local|\.\/music\/index\.html)/.test(appRegistry)) {
  throw new Error('NEO Music registry changed; only music-v2 may be packaged as a player.');
}
function isRetiredMusicPath(relative) {
  if (relative === 'music-v3' || relative.startsWith('music-v3/')) return true;
  if (relative === 'music-local' || relative.startsWith('music-local/')) return true;
  return relative === 'music' || relative.startsWith('music/');
}
function copyTree(source, destination, relative = '') {
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const rel = path.posix.join(relative, entry.name);
    const input = path.join(source, entry.name);
    const target = path.join(destination, entry.name);
    if (isRetiredMusicPath(rel)) {
      if (entry.isFile()) omittedLegacyAssets.push({ file: rel, bytes: fs.statSync(input).size });
      continue;
    }
    if (entry.isFile() && rel.startsWith('music-v2/') && !MUSIC_V2_PRODUCTION_FILES.has(rel)) {
      omittedLegacyAssets.push({ file: rel, bytes: fs.statSync(input).size });
      continue;
    }
    if (entry.isDirectory() && rel.startsWith('music-v2/') &&
        ![...MUSIC_V2_PRODUCTION_FILES].some((file) => file.startsWith(rel + '/'))) {
      continue;
    }
    const isClassicProfile = rel === 'neo-tv/assets/profile-classics' || rel.startsWith('neo-tv/assets/profile-classics/');
    if (rel.startsWith('neo-tv/assets/') && !isClassicProfile) {
      if (entry.isFile()) omittedLegacyAssets.push({ file: rel, bytes: fs.statSync(input).size });
      continue;
    }
    if (['neo-tv/config.js', 'neo-tv/neo-tv.css', 'neo-tv/neo-tv.js', 'neo-tv/UPSTREAM.md'].includes(rel)) {
      omittedLegacyAssets.push({ file: rel, bytes: fs.statSync(input).size });
      continue;
    }
    if (rel === 'neo-games/index.json' || rel === 'neo-games/covers.json') {
      omittedLegacyAssets.push({ file: rel, bytes: fs.statSync(input).size });
      continue;
    }
    if (entry.isDirectory()) { copyTree(input, target, rel); continue; }
    let preferred = input;
    const candidates = [
      ['assets/wallpaper-engine-full/', 'full'],
      ['assets/wallpaper-engine-web/1509243786/', 'web-1509243786'],
    ];
    for (const [prefix, folder] of candidates) {
      if (!rel.startsWith(prefix)) continue;
      const candidate = path.join(cache, folder, rel.slice(prefix.length));
      // Reuse only media encodes, never replace newer scene scripts or styles.
      if (/\.(mp4|webm|jpe?g|png|webp)$/i.test(rel) && fs.existsSync(candidate)) preferred = candidate;
    }
    fs.copyFileSync(preferred, target);
    if (preferred !== input) provenance.push({ file: rel, optimizedBytes: fs.statSync(preferred).size });
  }
}

(async () => {
  copyTree(path.join(root, 'neo-os'), path.join(output, 'neo-os'));
  fs.copyFileSync(path.join(root, 'index.html'), path.join(output, 'index.html'));
  for (const required of [
    'neo-os/neo-proxy-client.js',
    'neo-os/assets/movies-icon.webp',
    'neo-os/assets/xbox-games.svg',
    'neo-os/assets/steam.svg',
    'neo-os/neo-tv/assets/profile-classics/scarlett-chilleez.png',
    'neo-os/neo-tv/assets/profile-classics/red-superhero.png',
    'neo-os/neo-tv/assets/profile-classics/blue-classic-icon.png',
    'neo-os/music-v2/assets/cover-fallback.svg',
    'neo-os/music-v2/spotify-shell.css',
    'neo-os/music-v2/vendor/am-lyrics.min.js',
    'neo-os/neo-ai/app.js',
    'neo-os/neo-games/app.js',
    'neo-os/neo-tv/app.js',
  ]) {
    if (!fs.existsSync(path.join(output, required))) throw new Error('Required app asset was not packaged: ' + required);
  }
  for (const retired of ['neo-os/music/index.html', 'neo-os/music-v3', 'neo-os/music-local']) {
    if (fs.existsSync(path.join(output, retired))) throw new Error('Retired Music player was packaged: ' + retired);
  }
  for (const retired of ['neo-os/music-v2/assets/ffmpeg-core.wasm-BC-MpTu2.gz', 'neo-os/music-v2/fonts', 'neo-os/music-v2/sw.js']) {
    if (fs.existsSync(path.join(output, retired))) throw new Error('Unreferenced Music v2 payload was packaged: ' + retired);
  }
  fs.mkdirSync(path.join(output, 'games'));
  for (const name of ['2048.html', 'cookie-clicker.html', 'geometry-dash.html', 'retro-bowl.html',
    'snake.html', 'tetris.html', 'web-dashers.html', 'grandmaster-chess.html', 'quantum-clicker.html']) {
    fs.copyFileSync(path.join(root, 'games', name), path.join(output, 'games', name));
  }
  // Games retain the existing published, pinned catalogue rather than copying
  // hundreds of MB of on-demand game payloads into every desktop release.
  const catalog = path.join(root, '.codex-tmp', 'github-cdn-shards', 'neo-os-games-catalog-cdn');
  for (const name of ['index.json', 'covers.json']) {
    const file = path.join(catalog, name);
    if (!fs.existsSync(file)) throw new Error('Published game catalogue is required: ' + file);
    fs.copyFileSync(file, path.join(output, 'games', name));
  }
  const icons = await optimizeDesktopAssets(path.join(output, 'neo-os'));
  const shell = optimizeNeoShell(path.join(output, 'neo-os'));
  // Informational provenance only: these headers must be configured on a host
  // that supports them; this file does not pretend to configure Sites dispatch.
  fs.writeFileSync(path.join(output, 'build-manifest.json'), JSON.stringify({ shell, icons,
    reusedMedia: provenance, omittedLegacyAssets }, null, 2));
  function sizeOf(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).reduce((sum, item) => {
      const file = path.join(directory, item.name);
      return sum + (item.isDirectory() ? sizeOf(file) : fs.statSync(file).size + 1024);
    }, 0);
  }
  const expandedArchiveUpperBound = sizeOf(output) + 65536;
  if (expandedArchiveUpperBound > 256 * 1024 * 1024) throw new Error('Build exceeds the Sites 256 MiB expanded-archive limit.');
  console.log(JSON.stringify({ output, shell, icons, reusedMediaFiles: provenance.length,
    omittedLegacyBytes: omittedLegacyAssets.reduce((sum, item) => sum + item.bytes, 0), expandedArchiveUpperBound }));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
