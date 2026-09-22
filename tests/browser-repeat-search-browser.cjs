const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.NEO_PLAYWRIGHT_PATH || path.join(
  process.env.USERPROFILE || '', '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright'
));

const base = process.env.NEO_BROWSER_TEST_URL || 'http://127.0.0.1:3092/neo-os/nextnode-browser/index.html';

async function browserFrame(page) {
  if (!new URL(base).pathname.endsWith('.svg')) return page.mainFrame();
  const handle = await page.waitForSelector('#neo-browser', { timeout: 60000 });
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const frame = await handle.contentFrame() ||
      page.frames().find((candidate) => candidate.parentFrame() === page.mainFrame());
    if (frame) return frame;
    await page.waitForTimeout(100);
  }
  assert.fail('browser launcher should create its srcdoc frame');
}

async function snapshot(app) {
  return app.evaluate(() => ({
    address: document.getElementById('url')?.value || '',
    frames: Array.from(document.querySelectorAll('iframe')).map((frame) => {
      let text = '';
      let location = '';
      try {
        text = frame.contentDocument?.body?.innerText?.slice(0, 300) || '';
        location = frame.contentWindow?.location?.href || '';
      } catch (_error) {}
      return {
        className: frame.className,
        src: frame.getAttribute('src') || '',
        location,
        text,
        bridge: frame.dataset.neoSearchBridge || '',
        documentBridge: Boolean(frame.contentDocument?.__neoSearchBridge),
      };
    }),
  }));
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1200, height: 760 } });
  const requests = [];
  const failedResponses = [];
  const messages = [];
  page.on('request', (request) => {
    const url = request.url();
    if (/duckduckgo|\/study\/uv\//i.test(url)) requests.push(url);
  });
  page.on('console', (message) => messages.push(`${message.type()}: ${message.text()}`));
  page.on('response', (response) => {
    if (response.status() >= 400) failedResponses.push({ status: response.status(), url: response.url() });
  });
  try {
    await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const app = await browserFrame(page);
    await app.waitForFunction(() => typeof navigate === 'function' && typeof proxyBoot !== 'undefined', null, { timeout: 60000 });

    // Reproduce a user searching the instant the cold browser shell appears.
    // navigate() must hold the request until the proxy worker and transport are ready.
    await app.locator('#nt-input').fill('cold start search');
    await app.locator('#nt-input').press('Enter');
    try {
      await app.waitForFunction(() => {
        const frame = document.querySelector('iframe.page');
        try {
          const text = frame?.contentDocument?.body?.innerText || '';
          const address = document.getElementById('url')?.value || '';
          return /duckduckgo\.com\/?\?q=cold(?:%20|\+)start(?:%20|\+)search/i.test(address) &&
            Boolean(frame?.contentDocument?.body) && !/Local file not found/i.test(text);
        } catch (_error) { return false; }
      }, null, { timeout: 60000 });
    } catch (error) {
      console.error('Cold search diagnostics:', JSON.stringify({
        ...(await snapshot(app)),
        proxy: await app.evaluate(() => ({
          ready: typeof proxyReady === 'undefined' ? null : proxyReady,
          boot: typeof proxyBoot === 'undefined' ? null : Boolean(proxyBoot),
          controller: typeof sjController === 'undefined' ? null : Boolean(sjController),
        })),
        failedResponses: failedResponses.slice(-12),
        messages: messages.slice(-12),
      }, null, 2));
      throw error;
    }

    await app.locator('#url').fill('static quasar');
    await app.locator('#url').press('Enter');
    await app.waitForTimeout(8000);

    const resultFrame = await app.locator('iframe.page').first().contentFrame();
    assert.ok(resultFrame, 'first search should create a proxied results frame');
    const resultSearch = resultFrame.locator('input[name="q"]').first();
    await resultSearch.waitFor({ state: 'visible', timeout: 30000 });
    await resultSearch.fill('second search');
    await resultSearch.press('Enter');
    await app.waitForTimeout(8000);

    await app.evaluate(() => {
      const documentInside = document.querySelector('iframe.page')?.contentDocument;
      if (!documentInside?.body) throw new Error('second search should keep a proxied results frame');
      const result = documentInside.createElement('a');
      result.id = 'neo-search-result-navigation-test';
      result.href = 'https://example.com/';
      result.textContent = 'Open test result';
      documentInside.body.appendChild(result);
      result.click();
    });
    await app.waitForFunction(() => {
      const frame = document.querySelector('iframe.page');
      try {
        return /example\.com/i.test(document.getElementById('url')?.value || '') &&
          /Example Domain/i.test(frame?.contentDocument?.body?.innerText || '');
      } catch (_error) { return false; }
    }, null, { timeout: 60000 });

    const state = await snapshot(app);
    const output = { state, requests: requests.slice(-5), failedResponses: failedResponses.slice(-12), messages: messages.slice(-12) };
    console.log(JSON.stringify(output, null, 2));
    assert.match(state.address, /^https:\/\/example\.com\/?$/);
    assert.doesNotMatch(state.address, /undefined/i);
    assert.doesNotMatch(JSON.stringify(output), /Local file not found|Couldn't find the requested file|https\\:\//i);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
