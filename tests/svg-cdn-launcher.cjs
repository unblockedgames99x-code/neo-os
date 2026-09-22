const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
);

const root = path.resolve(__dirname, '..');
const launcher = fs.readFileSync(
  process.env.NEO_LAUNCHER_FILE || path.join(root, '.codex-tmp/github-cdn-shards/neo-os-launch-cdn/launch.svg'),
  'utf8'
);
const launcherWorker = fs.readFileSync(
  path.join(root, '.codex-tmp/github-cdn-shards/neo-os-launch-cdn/launcher-sw.js'),
  'utf8'
);
assert.match(launcher, /launcher-sw\.js\?v=20260919-scholarnook-v1/);
assert.doesNotMatch(launcherWorker, /PROXY_ROUTE_MARKER|fetchProxiedResource|x-neo-resource-proxy/,
  'the CDN launcher worker must never emulate a proxy with a direct cross-origin fetch');
const html = '<!doctype html><html><head><title>CDN desktop</title></head><body><h1 id="ready">NEO OS ready</h1><script>window.top.postMessage({type:"neo-shell:tab-appearance",detail:{title:"Home - Classroom",icon:"https://example.com/classroom.png",type:"image/png"}},"*")<\/script></body></html>';

(async () => {
  let port = 0;
  const server = http.createServer((request, response) => {
    if (request.url.startsWith('/index.html')) {
      setTimeout(() => {
        response.writeHead(200, {
          'content-type': 'text/plain; charset=utf-8',
          'access-control-allow-origin': '*',
        });
        response.end(html);
      }, 300);
      return;
    }
    response.writeHead(200, { 'content-type': 'image/svg+xml' });
    response.end(launcher);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  port = server.address().port;

  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const page = await browser.newPage();
  await page.route('https://*.jsdelivr.net/**/index.html', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    await route.fulfill({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: html,
      headers: { 'access-control-allow-origin': '*' },
    });
  });
  try {
    await page.goto(`http://127.0.0.1:${port}/launch.svg`, { waitUntil: 'domcontentloaded' });
    assert.equal(await page.locator('#neo-launch-status').isVisible(), true, 'loading status should remain visible while the launcher HTML is pending');
    await page.locator('#neo-os').waitFor({ timeout: 15000 });
    await page.waitForFunction(() => {
      const frame = document.getElementById('neo-os');
      return frame && frame.contentDocument && frame.contentDocument.getElementById('ready');
    });
    assert.equal(
      await page.locator('#neo-os').evaluate((frame) => frame.contentDocument.getElementById('ready').textContent),
      'NEO OS ready'
    );
    await page.locator('#neo-launch-status').waitFor({ state: 'detached', timeout: 15000 });
    assert.equal(await page.locator('#neo-os').getAttribute('style').then((style) => /visibility:visible/.test(style)), true);
    await page.waitForFunction(() => document.getElementById('neo-launch-title')?.textContent === 'Home - Classroom');
    assert.equal(await page.title(), 'Home - Classroom');
    assert.equal(await page.locator('#neo-launch-icon').getAttribute('href'), 'https://example.com/classroom.png');
    console.log('Standalone SVG launcher renders fetched HTML and relays tab appearance.');
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
