const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
);

const root = path.resolve(__dirname, '..');
const shards = path.join(root, '.codex-tmp', 'github-cdn-shards');
const account = 'unblockedgames99x-code';
const liveUrl = process.env.NEO_CDN_LIVE_URL || '';

function contentType(file) {
  return ({
    '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
    '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
    '.ico': 'image/x-icon', '.otf': 'font/otf', '.woff2': 'font/woff2'
  })[path.extname(file).toLowerCase()] || 'application/octet-stream';
}

function fileFor(repo, relative) {
  const base = path.resolve(shards, repo);
  const file = path.resolve(base, relative || 'index.html');
  return file === base || file.startsWith(base + path.sep) ? file : null;
}

(async () => {
  const server = http.createServer((request, response) => {
    const file = fileFor('neo-os-launch-cdn', request.url.split('?')[0].replace(/^\//, '') || 'launch.svg');
    if (!file || !fs.existsSync(file)) return response.writeHead(404).end('not found');
    response.writeHead(200, { 'content-type': contentType(file), 'access-control-allow-origin': '*' });
    response.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));

  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  if (!liveUrl) {
    await page.route('https://*.jsdelivr.net/**', async route => {
      const url = new URL(route.request().url());
      const match = url.pathname.match(new RegExp(`^/gh/${account}/([^/@]+)@[^/]+/(.*)$`));
      if (!match) return route.continue();
      const file = fileFor(match[1], decodeURIComponent(match[2]));
      if (!file || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return route.fulfill({ status: 404, body: 'not found' });
      return route.fulfill({
        status: 200,
        body: fs.readFileSync(file),
        contentType: contentType(file),
        headers: { 'access-control-allow-origin': '*' }
      });
    });
  }

  try {
    await page.goto(liveUrl || `http://127.0.0.1:${server.address().port}/launch.svg`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    try {
      await page.waitForFunction(() => document.getElementById('neo-os')?.contentWindow?.NEO_SHELL, null, { timeout: 60000 });
    } catch (error) {
      const diagnostic = await page.evaluate(() => {
        const frame = document.getElementById('neo-os');
        return {
          title: document.title,
          status: document.getElementById('neo-launch-status')?.textContent || '',
          host: document.getElementById('host')?.textContent || '',
          hasFrame: Boolean(frame),
          frameVisible: frame?.style?.visibility || '',
          frameTitle: frame?.contentDocument?.title || '',
          frameText: frame?.contentDocument?.body?.innerText?.slice(0, 500) || '',
          frameUrl: frame?.contentWindow?.location?.href || ''
        };
      });
      throw new Error(`${error.message}\n${JSON.stringify(diagnostic, null, 2)}`);
    }
    await page.waitForFunction(() => document.title === 'Home - Classroom');
    assert.match(await page.locator('#neo-launch-icon').getAttribute('href'), /tab-appearance\/classroom\.png$/);
    assert.equal(
      await page.locator('#neo-os').evaluate(frame => frame.contentDocument.getElementById('desktop-shortcuts')),
      null,
      'the removed desktop app grid should not return in the CDN build'
    );
    const baseTheme = await page.locator('#neo-os').evaluate(frame => {
      const view = frame.contentWindow;
      const root = frame.contentDocument.documentElement;
      return {
        stored: view.localStorage.getItem('neo_desktop_preferences_v1'),
        state: view.NEO_SYSTEM_BRIDGE.get().theme,
        dataset: root.dataset.neoTheme,
        background: view.getComputedStyle(root).getPropertyValue('--desktop-bg').trim()
      };
    });
    assert.equal(baseTheme.stored, null, 'fresh theme test unexpectedly had saved preferences');
    assert.equal(baseTheme.state, 'oled');
    assert.equal(baseTheme.dataset, 'oled');
    assert.equal(baseTheme.background, '#000000');

    await page.evaluate(() => document.getElementById('neo-os').contentWindow.NEO_SHELL.openApp('control'));
    await page.waitForFunction(() => document.getElementById('neo-os')?.contentDocument?.querySelector('[data-tab-appearance-choice="drive"]'));
    await page.locator('#neo-os').evaluate(frame => frame.contentDocument.querySelector('[data-tab-appearance-choice="drive"]').click());
    await page.waitForFunction(() => document.getElementById('neo-launch-title')?.textContent === 'Drive');
    assert.equal(await page.title(), 'Drive');
    assert.match(await page.locator('#neo-launch-icon').getAttribute('href'), /tab-appearance\/drive\.png$/);

    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      page.locator('#neo-os').evaluate(frame => frame.contentDocument.querySelector('[data-start-blank]').click())
    ]);
    await popup.waitForFunction(() => document.querySelector('iframe')?.contentWindow?.NEO_SHELL, null, { timeout: 60000 });
    assert.equal(popup.url(), 'about:blank');
    const state = await popup.evaluate(() => {
      const frame = document.querySelector('iframe');
      return {
        runner: frame.contentDocument.querySelector('meta[name="neo-runner"]')?.content,
        mode: frame.contentDocument.body.getAttribute('data-neo-autostart')
      };
    });
    assert.equal(state.runner, 'github-jsdelivr');
    assert.match(state.mode, /^(?:mobile|laptop)$/);

    await popup.evaluate(() => document.querySelector('iframe').contentWindow.NEO_SHELL.setSetting('tabAppearance', 'classroom'));
    await popup.waitForFunction(() => document.title === 'Home - Classroom');
    assert.match(await popup.locator('link[data-neo-tab-icon]').getAttribute('href'), /tab-appearance\/classroom\.png$/);
    console.log('CDN tab appearance and about:blank launch checks passed.');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
