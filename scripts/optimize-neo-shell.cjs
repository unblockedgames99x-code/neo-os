const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { transformSync: minifyJavaScript } = require('esbuild');
const { transform: minifyCss } = require('lightningcss');

const criticalScripts = [
  'neo-local-config.js',
  'neo-desktop-config.js',
  'neo-system-bridge.js',
  'neo-ad-shield.js',
];

const stylesheets = [
  'neo-os.css',
  'neo-taskbar-menu.css',
  'neo-taskbar-preview.css',
  'neo-apps.css',
  'neo-window-resize.css',
  'neo-wallpaper-engine.css',
  'neo-rainmeter.css',
  'neo-launcher-glass.css',
  'neo-browser-ui.css',
  'neo-flat-ui.css',
  'neo-retro-theme.css',
  'neo-topbar-autohide.css',
  'neo-performance.css',
  'neo-mobile.css',
  'neo-vertical-taskbar.css',
  'neo-chat.css',
  'neo-desktop.css',
  'neo-bottom-visualizer.css',
  'neo-custom-cursors.css',
  'neo-fonts.css',
  'neo-range.css',
  'neo-skin-interactions.css',
  'neo-theme-system.css',
  'neo-production-polish.css',
  'neo-liquid-scrollbars.css',
  'neo-interface-styles.css',
  'neo-dock-interactions.css',
  'neo-running-taskbar.css',
  'neo-command-palette.css',
  'neo-taskbar-quick-settings.css',
];

const interfaceStylesheet = 'neo-interface-styles.css';
const retroThemeStylesheet = 'neo-retro-theme.css';

const deferredScripts = [
  'neo-audio-spectrum-bridge.js',
  'neo-frame-loader.js',
  'neo-apps.js',
  'neo-music-runtime.js',
  'neo-bottom-visualizer.js',
  'neo-wallpaper-engine.js',
  'neo-wallpaper-quality.js',
  'neo-taskbar-preview.js',
  'neo-chat-transport.js',
  'neo-account-signin.js',
  'neo-connection-monitor.js',
  'neo-skins.js',
  'neo-chat-experience.js',
  'neo-desktop-platform.js',
  'neo-leave-guard.js',
  'neo-os.js',
  'neo-command-palette.js',
  'neo-taskbar-quick-settings.js',
  'neo-backup.js',
  'neo-window-resize.js',
  'neo-taskbar-menu.js',
  'neo-rainmeter.js',
  'neo-topbar-autohide.js',
  'neo-mobile.js',
];

function readJoined(directory, files, separator) {
  return files.map((file) => fs.readFileSync(path.join(directory, file), 'utf8')).join(separator);
}

function replaceRequired(source, pattern, replacement, label) {
  if (!pattern.test(source)) throw new Error(`Could not find the ${label} block in index.html.`);
  return source.replace(pattern, replacement);
}

function buildCriticalCss(shellDirectory) {
  const baseCss = fs.readFileSync(path.join(shellDirectory, 'neo-os.css'), 'utf8');
  const bootEnd = baseCss.indexOf('\n.neo-start-screen {');
  if (bootEnd === -1) throw new Error('Could not isolate the NEO boot-screen CSS.');

  // Keep the exact authored loading screen available for the first paint while the
  // complete, override-heavy desktop stylesheet downloads without blocking render.
  // The shell stays covered until the full stylesheet is applied, so login, desktop,
  // window, theme, and responsive rules never flash in a partially styled state.
  return `${baseCss.slice(0, bootEnd)}
html[data-shell-css="pending"] .boot-screen {
  opacity: 1 !important;
  visibility: visible !important;
  pointer-events: auto !important;
}
html[data-shell-css="pending"] body > :not(.boot-screen):not(.icon-sprite) {
  visibility: hidden !important;
}
`;
}

function splitInterfaceStyles(source) {
  const retroStart = source.indexOf('/* Retro design tokens');
  const modernContextStart = source.indexOf('/* Modern context menus');
  const windowsStart = source.indexOf('/* Windows 11');
  const kaliStart = source.indexOf('/* Kali Linux workstation');
  if (retroStart === -1 || modernContextStart === -1 || windowsStart === -1 || kaliStart === -1 || !(retroStart < modernContextStart && modernContextStart < windowsStart && windowsStart < kaliStart)) {
    throw new Error('Could not split the interface stylesheet into modern, Retro, Windows 11, and Kali variants.');
  }
  return {
    modern: source.slice(0, retroStart) + `
@media (max-width: 700px) {
  .interface-style-grid { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  .interface-style-choice { transition: none !important; }
}
` + source.slice(modernContextStart, windowsStart),
    retro: source.slice(retroStart, modernContextStart),
    windows11: source.slice(windowsStart, kaliStart),
    kali: source.slice(kaliStart),
  };
}

function renderStyleLoader(styleAssets, criticalCss) {
  const styleRuntime = `(function(){var state={core:false};function finish(){var root=document.documentElement;var name=root.dataset.interfaceStyle||'modern';var selected=name==='modern'?null:document.querySelector('[data-neo-interface-style-css="'+name+'"]');if(!state.core||(selected&&selected.dataset.neoLoaded!=='true')||root.dataset.shellCss==='ready')return;requestAnimationFrame(function(){root.dataset.shellCss='ready';window.dispatchEvent(new Event('neo-shell-css-ready'))})}window.__neoMarkShellCss=function(link){link.onload=null;link.rel='stylesheet';state.core=true;finish()};window.__neoMarkInterfaceCss=function(link){link.dataset.neoLoaded='true';finish()};window.__neoSyncInterfaceCss=function(){var name=document.documentElement.dataset.interfaceStyle||'modern';document.querySelectorAll('[data-neo-interface-style-css]').forEach(function(link){var active=link.dataset.neoInterfaceStyleCss===name;if(active&&!link.href)link.href=link.dataset.href;link.media=active?'all':'not all';link.dataset.neoActive=active?'true':'false'});finish()}})();`;
  return `
    <!-- neo-shell-styles:start -->
    <style data-neo-shell-critical>${criticalCss}</style>
    <script data-neo-shell-style-runtime>${styleRuntime}</script>
    <link rel="preload" as="style" fetchpriority="high" href="./${styleAssets.style}" data-neo-shell-style onload="window.__neoMarkShellCss(this)" />
    <link rel="stylesheet" data-href="./${styleAssets.retroStyle}" media="not all" data-neo-interface-style-css="retro" onload="window.__neoMarkInterfaceCss(this)" />
    <link rel="stylesheet" data-href="./${styleAssets.windowsStyle}" media="not all" data-neo-interface-style-css="windows11" onload="window.__neoMarkInterfaceCss(this)" />
    <link rel="stylesheet" data-href="./${styleAssets.kaliStyle}" media="not all" data-neo-interface-style-css="kali" onload="window.__neoMarkInterfaceCss(this)" />
    <script>window.__neoSyncInterfaceCss()</script>
    <noscript><link rel="stylesheet" href="./${styleAssets.style}" /><link rel="stylesheet" href="./${styleAssets.retroStyle}" /><link rel="stylesheet" href="./${styleAssets.windowsStyle}" /><link rel="stylesheet" href="./${styleAssets.kaliStyle}" /></noscript>
    <!-- neo-shell-styles:end -->`;
}

function gateDeferredSource(source) {
  return `(() => {
    let started = false;
    function startNeoShell() {
      if (started) return;
      started = true;
      ${source}
    }
    if (document.documentElement.dataset.shellCss === 'ready') startNeoShell();
    else window.addEventListener('neo-shell-css-ready', startNeoShell, { once: true });
  })();`;
}

function optimizeNeoShell(directory) {
  const shellDirectory = path.resolve(directory);
  const indexPath = path.join(shellDirectory, 'index.html');
  if (!fs.existsSync(indexPath)) throw new Error(`Missing NEO shell at ${indexPath}`);

  const criticalSource = readJoined(shellDirectory, criticalScripts, ';\n');
  const deferredSource = readJoined(shellDirectory, deferredScripts, ';\n');
  const originalCssSource = readJoined(shellDirectory, stylesheets, '\n');
  const interfaceVariants = splitInterfaceStyles(fs.readFileSync(path.join(shellDirectory, interfaceStylesheet), 'utf8'));
  const coreStylesheets = stylesheets.filter((file) => file !== interfaceStylesheet && file !== retroThemeStylesheet);
  const cssSource = readJoined(shellDirectory, coreStylesheets, '\n') + '\n' + interfaceVariants.modern;
  const retroCssSource = fs.readFileSync(path.join(shellDirectory, retroThemeStylesheet), 'utf8') + '\n' + interfaceVariants.retro;
  const windowsCssSource = interfaceVariants.windows11;
  const kaliCssSource = interfaceVariants.kali;
  const criticalCssSource = buildCriticalCss(shellDirectory);

  const critical = minifyJavaScript(criticalSource, {
    loader: 'js',
    minify: true,
    target: 'es2020',
    legalComments: 'none',
  }).code;
  const deferred = minifyJavaScript(gateDeferredSource(deferredSource), {
    loader: 'js',
    minify: true,
    target: 'es2020',
    legalComments: 'none',
  }).code;
  const css = minifyCss({
    filename: 'neo-shell.css',
    code: Buffer.from(cssSource),
    minify: true,
  }).code;
  const retroCss = minifyCss({
    filename: 'neo-interface-retro.css',
    code: Buffer.from(retroCssSource),
    minify: true,
  }).code;
  const windowsCss = minifyCss({
    filename: 'neo-interface-windows11.css',
    code: Buffer.from(windowsCssSource),
    minify: true,
  }).code;
  const kaliCss = minifyCss({
    filename: 'neo-interface-kali.css',
    code: Buffer.from(kaliCssSource),
    minify: true,
  }).code;
  const criticalCss = minifyCss({
    filename: 'neo-shell-critical.css',
    code: Buffer.from(criticalCssSource),
    minify: true,
  }).code.toString();

  function emit(name, extension, content) {
    const hash = createHash('sha256').update(content).digest('hex').slice(0, 16);
    const filename = `${name}.${hash}.min.${extension}`;
    fs.writeFileSync(path.join(shellDirectory, filename), content);
    return filename;
  }
  const assets = {
    boot: emit('neo-boot', 'js', critical),
    script: emit('neo-shell', 'js', deferred),
    style: emit('neo-shell', 'css', css),
    retroStyle: emit('neo-interface-retro', 'css', retroCss),
    windowsStyle: emit('neo-interface-windows11', 'css', windowsCss),
    kaliStyle: emit('neo-interface-kali', 'css', kaliCss),
  };

  let html = fs.readFileSync(indexPath, 'utf8');
  html = html.replace(/<html\b(?![^>]*\bdata-shell-css=)/, '<html data-shell-css="pending"');
  if (!/neo-shell(?:\.[a-f0-9]+)?\.min\.js/.test(html)) {
    html = replaceRequired(
      html,
      /\s*<script src="\.\/neo-local-config\.js[^\"]*"><\/script>\s*<script src="\.\/neo-desktop-config\.js[^\"]*"><\/script>\s*<script src="\.\/neo-system-bridge\.js[^\"]*"><\/script>\s*<script src="\.\/neo-ad-shield\.js[^\"]*"><\/script>/,
      `\n    <script src="./${assets.boot}" defer></script>`,
      'critical script',
    );
    html = replaceRequired(
      html,
      /\s*<link rel="stylesheet" href="\.\/neo-os\.css[^\"]*" \/>[\s\S]*?<link rel="stylesheet" href="\.\/neo-taskbar-quick-settings\.css[^\"]*" \/>/,
      `\n    <title>NEO OS</title>${renderStyleLoader(assets, criticalCss)}`,
      'stylesheet',
    );
    html = replaceRequired(
      html,
      /\s*<script src="\.\/neo-audio-spectrum-bridge\.js[^\"]*" defer><\/script>[\s\S]*?<script src="\.\/neo-mobile\.js[^\"]*" defer><\/script>/,
      `\n    <script src="./${assets.script}" defer></script>`,
      'deferred script',
    );
  } else {
    // Rebuilding an already bundled artifact must update its references too.
    html = html.replace(/neo-boot(?:\.[a-f0-9]+)?\.min\.js(?:\?[^"\s]*)?/g, assets.boot)
      .replace(/neo-shell(?:\.[a-f0-9]+)?\.min\.js(?:\?[^"\s]*)?/g, assets.script);
    html = replaceRequired(
      html,
      /\s*<!-- neo-shell-styles:start -->[\s\S]*?<!-- neo-shell-styles:end -->/,
      renderStyleLoader(assets, criticalCss),
      'optimized stylesheet',
    );
  }
  fs.writeFileSync(indexPath, html);

  const originalBytes = Buffer.byteLength(criticalSource) + Buffer.byteLength(deferredSource) + Buffer.byteLength(originalCssSource);
  const optimizedBytes = Buffer.byteLength(critical) + Buffer.byteLength(deferred) + css.length + retroCss.length + windowsCss.length + kaliCss.length + Buffer.byteLength(criticalCss);
  return {
    originalFiles: criticalScripts.length + deferredScripts.length + stylesheets.length,
    optimizedFiles: 6,
    assets,
    originalBytes,
    optimizedBytes,
    blockingCssBytes: Buffer.byteLength(criticalCss),
    deferredCssBytes: css.length,
    optionalCssBytes: retroCss.length + windowsCss.length + kaliCss.length,
    defaultCssBytes: Buffer.byteLength(criticalCss) + css.length,
    renderBlockingStyleRequests: 0,
    reductionPercent: Math.round((1 - optimizedBytes / originalBytes) * 100),
  };
}

if (require.main === module) {
  const directory = process.argv[2] || path.resolve(__dirname, '..', 'neo-os');
  console.log(JSON.stringify(optimizeNeoShell(directory)));
}

module.exports = { buildCriticalCss, criticalScripts, deferredScripts, gateDeferredSource, optimizeNeoShell, renderStyleLoader, splitInterfaceStyles, stylesheets };
