const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
);

const liveUrl = process.env.NEO_BROWSER_CDN_URL;
if (!liveUrl) throw new Error('NEO_BROWSER_CDN_URL is required.');

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1180, height: 760 } });
  const messages = [];
  page.on('console', (message) => {
    const text = message.text();
    if (/NEO|scramjet|worker|libcurl|service|error/i.test(text)) messages.push(`${message.type()}: ${text}`);
  });
  page.on('pageerror', (error) => messages.push(`pageerror: ${error.message}`));

  try {
    await page.goto(liveUrl, { waitUntil: 'commit', timeout: 30000 });
    console.log('Browser CDN navigation committed.');
    await page.waitForFunction(() => document.getElementById('neo-browser')?.contentDocument?.getElementById('url'), null, { timeout: 30000 });
    console.log('Browser UI loaded.');
    let active = false;
    try {
      await page.waitForFunction(() => {
        const app = document.getElementById('neo-browser')?.contentWindow;
        return Boolean(app?.NeoScramjet?.active && app.document.getElementById('frame')?.dataset.neoScramjet);
      }, null, { timeout: Number(process.env.NEO_YOUTUBE_TIMEOUT_MS || 45000) });
      active = true;
    } catch {}
    console.log(`Worker browser active: ${active}`);

    const state = await page.evaluate(({ messages, active }) => {
      const wrapperController = navigator.serviceWorker?.controller?.scriptURL || '';
      const frame = document.getElementById('neo-browser');
      const app = frame?.contentWindow;
      return {
        active,
        wrapperController,
        appController: app?.navigator?.serviceWorker?.controller?.scriptURL || '',
        visibleUrl: app?.document?.getElementById('url')?.value || '',
        proxied: app?.document?.getElementById('frame')?.dataset.neoScramjet || '',
        resources: app?.performance?.getEntriesByType('resource').map((entry) => entry.name)
          .filter((url) => /scramjet|baremux|curl|wasm/i.test(url)),
        log: app?.document?.getElementById('logbox')?.textContent?.slice(-2000) || '',
        messages: messages.slice(-60),
      };
    }, { messages, active });
    console.log(JSON.stringify(state, null, 2));
    assert.ok(state.wrapperController, 'The CDN wrapper is not worker-controlled.');
    assert.equal(active, true, 'The worker-backed browser engine did not activate.');
    assert.equal(state.proxied, 'true');
    assert.equal(state.resources.some((url) => /curl\/index\.mjs/i.test(url)), false, 'The foreground curl bundle loaded.');
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
