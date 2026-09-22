const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
);

const loaderUrl = 'https://fastly.jsdelivr.net/npm/@c8rter_09/neo-os-desktop@1.0.3/cdn-loader.js';

(async () => {
  const server = http.createServer((request, response) => {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(`<!doctype html><html><body><script src="${loaderUrl}"></script></body></html>`);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const githubRequests = [];
  page.on('request', (request) => {
    if (/github(?:usercontent)?\.com/i.test(request.url())) githubRequests.push(request.url());
  });

  try {
    const address = server.address();
    await page.goto(`http://127.0.0.1:${address.port}/`, { waitUntil: 'domcontentloaded' });
    await page.locator('#neo-start-title').waitFor({ timeout: 60000 });
    assert.equal(await page.locator('#neo-start-title').textContent(), 'How do you want to start?');
    const startScreenStyle = await page.locator('#neo-start-screen').evaluate((element) => {
      const style = getComputedStyle(element);
      return { position: style.position, display: style.display, backgroundColor: style.backgroundColor };
    });
    assert.deepEqual(startScreenStyle, {
      position: 'fixed',
      display: 'grid',
      backgroundColor: 'rgb(5, 5, 5)',
    });
    assert.deepEqual(githubRequests, []);
    console.log('Fastly jsDelivr loader starts NEO OS without GitHub.');
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
