const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  criticalScripts,
  deferredScripts,
  optimizeNeoShell,
  stylesheets,
} = require('../scripts/optimize-neo-shell.cjs');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'neo-os');
const target = fs.mkdtempSync(path.join(os.tmpdir(), 'neo-shell-fast-path-'));

try {
  const files = ['index.html', ...criticalScripts, ...stylesheets, ...deferredScripts];
  files.forEach((file) => fs.copyFileSync(path.join(source, file), path.join(target, file)));
  const result = optimizeNeoShell(target);
  const html = fs.readFileSync(path.join(target, 'index.html'), 'utf8');

  assert.equal(result.originalFiles, criticalScripts.length + deferredScripts.length + stylesheets.length);
  assert.equal(result.optimizedFiles, 6);
  assert.ok(result.reductionPercent >= 25, `Expected at least 25% fewer source bytes, got ${result.reductionPercent}%`);
  assert.match(html, /neo-boot\.[a-f0-9]{16}\.min\.js/);
  assert.match(html, /neo-shell\.[a-f0-9]{16}\.min\.css/);
  assert.match(html, /neo-interface-retro\.[a-f0-9]{16}\.min\.css/);
  assert.match(html, /neo-interface-windows11\.[a-f0-9]{16}\.min\.css/);
  assert.match(html, /neo-interface-kali\.[a-f0-9]{16}\.min\.css/);
  assert.match(html, /neo-shell\.[a-f0-9]{16}\.min\.js/);
  assert.match(html, /<html\s+data-shell-css="pending"/);
  assert.match(html, /<style data-neo-shell-critical>/);
  assert.match(html, /<link rel="preload" as="style" fetchpriority="high"[^>]+data-neo-shell-style/);
  assert.match(html, /link\.rel='stylesheet'/);
  assert.match(html, /dataset\.shellCss='ready'/);
  assert.match(html, /neo-shell-css-ready/);
  assert.equal((html.match(/rel="preload" as="style"/g) || []).length, 1);
  assert.equal((html.match(/<noscript><link rel="stylesheet"/g) || []).length, 1);
  assert.equal(result.renderBlockingStyleRequests, 0);
  assert.ok(result.blockingCssBytes < 5_000, `Critical CSS must stay tiny, got ${result.blockingCssBytes} bytes`);
  assert.ok(result.deferredCssBytes > 400_000, 'The complete visual system must remain available after first paint');
  assert.ok(result.optionalCssBytes > 100_000, 'Alternate interface skins should be isolated from the default payload');
  assert.ok(result.defaultCssBytes < 500_000, `The default visual payload must stay below 500 KB, got ${result.defaultCssBytes}`);
  assert.ok(
    result.blockingCssBytes / result.deferredCssBytes < 0.02,
    `Critical CSS should be under 2% of the complete shell CSS, got ${result.blockingCssBytes}/${result.deferredCssBytes}`,
  );
  assert.equal((html.match(/<script src=/g) || []).length, 2);
  assert.doesNotMatch(html, /<script src="\.\/neo-os\.js/);
  assert.doesNotMatch(html, /<link rel="stylesheet" href="\.\/neo-os\.css/);
  const shellScript = fs.readFileSync(path.join(target, result.assets.script), 'utf8');
  assert.match(shellScript, /neo-shell-css-ready/);
  assert.match(shellScript, /dataset\.shellCss/);
  const repeat = optimizeNeoShell(target);
  assert.deepEqual(repeat.assets, result.assets, 'Unchanged input has stable asset hashes');
  fs.appendFileSync(path.join(target, deferredScripts[0]), '\nwindow.__hashRegression = true;\n');
  const changed = optimizeNeoShell(target);
  assert.notEqual(changed.assets.script, result.assets.script, 'Changed source gets a new URL');
  assert.equal(changed.assets.style, result.assets.style, 'Unchanged CSS keeps its cache');
  assert.ok(fs.readFileSync(path.join(target, 'index.html'), 'utf8').includes(changed.assets.script));
} finally {
  fs.rmSync(target, { recursive: true, force: true });
}

console.log('Production shell fast path checks passed.');
