const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
);

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const context = await browser.newContext({ viewport: { width: 1180, height: 760 } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  try {
    const base = process.env.NEO_BASE_URL || 'http://127.0.0.1:3092/neo-os';
    const firstMetadata = page.waitForResponse(response => (
      response.url().startsWith('https://www.youtube.com/oembed?') && response.status() === 200
    ), { timeout: 20000 });
    await page.goto(`${base}/neo-youtube/?shorts=feed`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => /^1 of \d+$/.test(document.querySelector('[data-short-status]')?.textContent || ''));
    await firstMetadata;
    assert.notEqual(await page.locator('[data-short-title]').textContent(), 'Shorts');

    const embedResponse = page.waitForResponse(response => (
      response.url().startsWith('https://www.youtube-nocookie.com/embed/') && response.status() === 200
    ), { timeout: 20000 });
    await page.locator('[data-short-play]').click();
    const frame = page.locator('[data-short-player] iframe');
    await frame.waitFor({ state: 'attached' });
    assert.match(await frame.getAttribute('src'), /youtube-nocookie\.com\/embed\/zxSSPFgBTLQ/);
    await embedResponse;
    assert.doesNotMatch(await page.locator('[data-short-status]').textContent(), /could not load/i);
    assert.deepEqual(pageErrors, []);
    console.log('Live YouTube Shorts metadata and official player responded successfully.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
