const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
);

const root = process.env.NEO_STATIC_ROOT
  ? path.resolve(process.env.NEO_STATIC_ROOT)
  : path.resolve(__dirname, '..');
const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};
const catalogue = { items: [{
  type: 'stream',
  url: '/watch?v=M7lc1UVf-VE',
  title: 'YouTube player demonstration',
  uploaderName: 'Google Developers',
  duration: 284,
  isShort: false
}] };

function serveFile(request, response) {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const relative = pathname === '/' ? 'neo-os/index.html' : pathname.replace(/^\//, '');
  const file = path.resolve(root, relative);
  if (file !== root && !file.startsWith(root + path.sep)) return response.writeHead(403).end();
  let target = file;
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) return response.writeHead(404).end();
  response.writeHead(200, { 'content-type': types[path.extname(target).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(target).pipe(response);
}

(async () => {
  const server = http.createServer(serveFile);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await context.route('https://pipedapi.ducks.party/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(catalogue) }));
  await context.route('https://api.piped.private.coffee/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(catalogue) }));
  await context.route('https://i.ytimg.com/**', route => route.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64') }));
  await context.route('https://www.youtube-nocookie.com/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><body style="margin:0;background:#000"></body>' }));
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  try {
    const port = server.address().port;
    await page.goto(`http://127.0.0.1:${port}/neo-os/`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.NEO_SHELL, null, { timeout: 30000 });
    await page.locator('[data-start-mode="laptop"]').click();
    await page.locator('[data-neo-login-guest]').waitFor({ state: 'visible' });
    await page.locator('[data-neo-login-guest]').click();
    await page.waitForFunction(() => document.getElementById('neo-login-gate')?.hidden && !document.getElementById('neo-desktop')?.inert);
    await page.evaluate(() => {
      if (!window.NEO_SHELL.isInstalled('youtube-app')) window.NEO_SHELL.setInstalled('youtube-app', true);
      window.NEO_SHELL.openApp('youtube-app');
    });
    await page.waitForFunction(() => {
      const frame = document.querySelector('.neo-window[data-app-id="youtube-app"] iframe');
      return Boolean(frame?.contentDocument?.querySelector('[data-search-form]'));
    }, null, { timeout: 30000 });
    await page.evaluate(() => {
      const frame = document.querySelector('.neo-window[data-app-id="youtube-app"] iframe');
      const app = frame.contentDocument;
      app.querySelector('[data-search-input]').value = 'https://www.youtube.com/watch?v=M7lc1UVf-VE';
      app.querySelector('[data-search-form]').requestSubmit();
    });
    await page.waitForFunction(() => document.querySelector('.neo-window[data-app-id="youtube-app"] iframe')?.contentDocument?.querySelector('[data-player-shell] iframe'));
    await page.waitForTimeout(400);
    const normalBounds = await page.locator('.neo-window[data-app-id="youtube-app"]').boundingBox();
    await page.evaluate(() => {
      const frame = document.querySelector('.neo-window[data-app-id="youtube-app"] iframe');
      const player = frame.contentDocument.querySelector('[data-player-shell] iframe');
      window.__youtubePlayerNode = player;
      window.__youtubePlayerWindow = player.contentWindow;
      frame.contentDocument.querySelector('[data-popout-video]').click();
    });
    await page.locator('.neo-window[data-app-id="youtube-app"].is-youtube-popout').waitFor({ state: 'visible' });
    const popoutBounds = await page.locator('.neo-window[data-app-id="youtube-app"]').boundingBox();
    assert.ok(popoutBounds.width < normalBounds.width && popoutBounds.height < normalBounds.height);
    assert.ok(Math.abs(popoutBounds.width / popoutBounds.height - 16 / 9) < 0.02,
      'watch pop-out must preserve the video aspect ratio');
    assert.equal(await page.locator('.neo-window[data-app-id="youtube-app"] .window-chrome').evaluate(element => getComputedStyle(element).display), 'none');
    assert.equal(await page.evaluate(() => {
      const frame = document.querySelector('.neo-window[data-app-id="youtube-app"] iframe');
      const player = frame.contentDocument.querySelector('[data-player-shell] iframe');
      return window.__youtubePlayerNode === player && window.__youtubePlayerWindow === player.contentWindow;
    }), true, 'shell pop-out must keep the same player browsing context');
    await page.evaluate(() => document.querySelector('.neo-window[data-app-id="youtube-app"] iframe').contentDocument.querySelector('[data-popout-restore]').click());
    await page.waitForFunction(() => !document.querySelector('.neo-window[data-app-id="youtube-app"]').classList.contains('is-youtube-popout'));
    const restoredBounds = await page.locator('.neo-window[data-app-id="youtube-app"]').boundingBox();
    assert.equal(Math.round(restoredBounds.width), Math.round(normalBounds.width));
    assert.equal(Math.round(restoredBounds.height), Math.round(normalBounds.height));
    assert.deepEqual(pageErrors.filter(message => !/History.*about:srcdoc/.test(message)), []);
    console.log('YouTube shell pop-out preserves playback, removes chrome, and restores correctly.');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
