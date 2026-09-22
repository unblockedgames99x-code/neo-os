const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
);
const {
  criticalScripts,
  deferredScripts,
  optimizeNeoShell,
  stylesheets,
} = require('../scripts/optimize-neo-shell.cjs');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'neo-os');
const target = fs.mkdtempSync(path.join(os.tmpdir(), 'neo-shell-css-defer-'));
const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

for (const file of ['index.html', ...criticalScripts, ...stylesheets, ...deferredScripts]) {
  fs.copyFileSync(path.join(source, file), path.join(target, file));
}
const result = optimizeNeoShell(target);

function localFile(pathname) {
  const relative = pathname.replace(/^\/neo-os\/?/, '') || 'index.html';
  const generated = path.resolve(target, relative);
  if (generated === target || generated.startsWith(`${target}${path.sep}`)) {
    if (fs.existsSync(generated) && fs.statSync(generated).isFile()) return generated;
  }
  const authored = path.resolve(source, relative);
  if (authored !== source && !authored.startsWith(`${source}${path.sep}`)) return null;
  return fs.existsSync(authored) && fs.statSync(authored).isFile() ? authored : null;
}

let styleRequested = false;
let styleResponded = false;
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const file = localFile(pathname);
  if (!file) {
    response.writeHead(404).end();
    return;
  }
  const send = () => {
    response.writeHead(200, {
      'cache-control': 'no-store',
      'content-type': types[path.extname(file).toLowerCase()] || 'application/octet-stream',
    });
    if (path.extname(file).toLowerCase() === '.mp4') {
      response.end();
      return;
    }
    fs.createReadStream(file).pipe(response);
  };
  if (path.basename(file) === result.assets.style) {
    styleRequested = true;
    setTimeout(() => {
      styleResponded = true;
      send();
    }, 1_500);
    return;
  }
  send();
});

(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  try {
    await page.goto(`http://127.0.0.1:${server.address().port}/neo-os/`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await page.waitForFunction(
      () => performance.getEntriesByType('paint').some((entry) => entry.name === 'first-contentful-paint'),
      null,
      { timeout: 1_000 },
    );

    assert.equal(styleRequested, true, 'The complete shell stylesheet should start downloading immediately');
    assert.equal(styleResponded, false, 'The test must observe first paint before the delayed stylesheet responds');
    const firstPaint = await page.evaluate(() => ({
      bootDisplay: getComputedStyle(document.querySelector('.boot-screen')).display,
      bootOpacity: getComputedStyle(document.querySelector('.boot-screen')).opacity,
      desktopVisibility: getComputedStyle(document.querySelector('.desktop')).visibility,
      fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
      shellCss: document.documentElement.dataset.shellCss,
      shellStarted: Boolean(window.NEO_SHELL),
    }));
    assert.ok(firstPaint.fcp > 0, 'The authored loading screen should produce an early first contentful paint');
    assert.equal(firstPaint.shellCss, 'pending');
    assert.equal(firstPaint.bootDisplay, 'block');
    assert.equal(firstPaint.bootOpacity, '1');
    assert.equal(firstPaint.desktopVisibility, 'hidden');
    assert.equal(firstPaint.shellStarted, false, 'Layout-sensitive shell code must wait for complete CSS');

    await page.waitForFunction(() => document.documentElement.dataset.shellCss === 'ready', null, { timeout: 10_000 });
    await page.waitForFunction(() => Boolean(window.NEO_SHELL), null, { timeout: 10_000 });
    const ready = await page.evaluate(() => ({
      desktopPosition: getComputedStyle(document.querySelector('.desktop')).position,
      linkRel: document.querySelector('[data-neo-shell-style]')?.rel,
      shellCss: document.documentElement.dataset.shellCss,
    }));
    assert.equal(ready.shellCss, 'ready');
    assert.equal(ready.linkRel, 'stylesheet');
    assert.equal(ready.desktopPosition, 'relative');

    await page.locator('html[data-boot="complete"]').waitFor({ timeout: 15_000 });
    const start = page.locator('[data-start-mode="laptop"]');
    if (await start.isVisible()) await start.click();
    const guest = page.locator('[data-neo-login-guest]');
    if (await guest.isVisible()) await guest.click();
    await page.waitForFunction(() => document.getElementById('neo-login-gate')?.hidden && !document.getElementById('neo-desktop')?.inert);
    await page.evaluate(() => window.NEO_SHELL.openApp('control'));
    const control = page.locator('.neo-window[data-app-id="control"]');
    await control.waitFor({ state: 'visible' });
    const windowVisual = await control.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        display: style.display,
        position: style.position,
        width: element.getBoundingClientRect().width,
      };
    });
    assert.equal(windowVisual.display, 'grid');
    assert.equal(windowVisual.position, 'absolute');
    assert.ok(windowVisual.width > 500, `Expected a laid-out control window, got ${windowVisual.width}px`);
    assert.deepEqual(pageErrors, []);
  } finally {
    await context.close();
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(target, { recursive: true, force: true });
  }

  console.log('Production shell deferred CSS browser checks passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
