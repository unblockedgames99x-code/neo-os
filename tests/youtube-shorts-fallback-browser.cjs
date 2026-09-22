const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
);

const root = path.resolve(__dirname, '..');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml'
};

function serveFile(request, response) {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const relative = pathname === '/' ? 'neo-os/neo-youtube/index.html' : pathname.replace(/^\//, '');
  const file = path.resolve(root, relative);
  if (file !== root && !file.startsWith(root + path.sep)) {
    response.writeHead(403).end();
    return;
  }
  const target = fs.existsSync(file) && fs.statSync(file).isDirectory() ? path.join(file, 'index.html') : file;
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    response.writeHead(404).end();
    return;
  }
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
  const context = await browser.newContext({ viewport: { width: 1180, height: 760 } });
  await context.route('https://pipedapi.ducks.party/**', route => route.abort());
  await context.route('https://api.piped.private.coffee/**', route => route.abort());
  await context.route('https://www.youtube.com/oembed**', route => route.abort());
  await context.route('https://i.ytimg.com/**', route => route.fulfill({ status: 204, body: '' }));
  await context.route('https://www.youtube-nocookie.com/**', route => route.fulfill({
    status: 200,
    contentType: 'text/html',
    body: '<!doctype html><body style="margin:0;background:#000"></body>'
  }));
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  try {
    const port = server.address().port;
    await page.goto(`http://127.0.0.1:${port}/neo-os/neo-youtube/`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-view="shorts"]').click();
    await page.waitForFunction(() => /^1 of \d+$/.test(document.querySelector('[data-short-status]')?.textContent || ''));
    assert.equal(await page.locator('[data-short-title]').textContent(), '#shorts #crazy #funny');
    assert.doesNotMatch(await page.locator('[data-short-status]').textContent(), /could not load/i);

    await page.locator('[data-short-play]').click();
    const firstFrame = page.locator('[data-short-player] iframe');
    await firstFrame.waitFor({ state: 'attached' });
    assert.match(await firstFrame.getAttribute('src'), /youtube-nocookie\.com\/embed\/zxSSPFgBTLQ/);
    assert.match(await firstFrame.getAttribute('src'), /loop=1/);

    await page.locator('[data-short-next]').click();
    const nextFrame = page.locator('[data-short-player] iframe');
    await nextFrame.waitFor({ state: 'attached' });
    assert.match(await nextFrame.getAttribute('src'), /youtube-nocookie\.com\/embed\/2CVzaiZiKA0/);
    assert.equal(await page.locator('[data-short-status]').textContent(), '2 of 4');
    assert.deepEqual(pageErrors, []);
    console.log('YouTube Shorts feed and playback survive catalogue and metadata outages.');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
