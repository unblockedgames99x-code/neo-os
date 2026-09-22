const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
);

const root = path.resolve(__dirname, '..', 'neo-os');

function contentType(file) {
  return ({
    '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
    '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
    '.ico': 'image/x-icon', '.otf': 'font/otf', '.woff2': 'font/woff2'
  })[path.extname(file).toLowerCase()] || 'application/octet-stream';
}

(async () => {
  const server = http.createServer((request, response) => {
    const relative = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replace(/^\/+/, '') || 'index.html';
    const file = path.resolve(root, relative);
    if ((file !== root && !file.startsWith(root + path.sep)) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      response.writeHead(404).end('not found');
      return;
    }
    response.writeHead(200, { 'content-type': contentType(file), 'cache-control': 'no-store' });
    response.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));

  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('neo_os_settings_v1', JSON.stringify({ designVersion: 30, tabAppearance: 'neo' }));
  });
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.NEO_SHELL), null, { timeout: 30000 });
    await page.waitForFunction(() => document.title === 'Home - Classroom');
    assert.match(
      await page.locator('link[data-neo-tab-icon]').getAttribute('href'),
      /assets\/tab-appearance\/classroom\.png$/
    );

    const popupPromise = context.waitForEvent('page');
    await page.locator('[data-start-blank]').click();
    const popup = await popupPromise;
    await popup.waitForFunction(() => {
      const frame = document.querySelector('iframe');
      return Boolean(frame && frame.contentWindow && frame.contentWindow.NEO_SHELL);
    }, null, { timeout: 30000 });

    assert.equal(popup.url(), 'about:blank');
    const startup = await popup.evaluate(() => {
      const frame = document.querySelector('iframe');
      const child = frame.contentDocument;
      return {
        hasFrame: Boolean(frame),
        autoStart: child.body.getAttribute('data-neo-autostart'),
        startHidden: child.getElementById('neo-start-screen').hidden,
        runnerReady: Boolean(frame.contentWindow.NEO_SHELL)
      };
    });
    assert.equal(startup.hasFrame, true);
    assert.match(startup.autoStart, /^(?:laptop|mobile)$/);
    assert.equal(startup.startHidden, true);
    assert.equal(startup.runnerReady, true);
    await popup.waitForFunction(() => document.title === 'Home - Classroom');
    assert.match(
      await popup.locator('link[data-neo-tab-icon]').getAttribute('href'),
      /assets\/tab-appearance\/classroom\.png$/
    );
    console.log('About:blank launch and live tab appearance checks passed.');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
