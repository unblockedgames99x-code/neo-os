const assert = require('node:assert/strict');
const path = require('node:path');

function playwrightRuntime() {
  try { return require('playwright'); } catch (_error) {}
  return require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || '', '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright'));
}

const { chromium } = playwrightRuntime();
const liveUrl = process.env.NEO_YOUTUBE_LIVE_URL || 'http://127.0.0.1:3098/neo-os/neo-youtube/?q=gaming';

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1180, height: 760 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(liveUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => {
      const status = document.querySelector('[data-result-status]')?.textContent || '';
      return /Catalogue:/.test(status) && document.querySelectorAll('.video-result:not(.skeleton-result)').length >= 10;
    }, null, { timeout: 30000 });
    await page.waitForFunction(() => {
      const image = document.querySelector('.video-result img[data-video-id]');
      return Boolean(image?.complete && image.naturalWidth > 1);
    }, null, { timeout: 30000 });
    const result = await page.evaluate(() => ({
      status: document.querySelector('[data-result-status]').textContent,
      count: document.querySelectorAll('.video-result:not(.skeleton-result)').length,
      title: document.querySelector('.result-title')?.textContent || '',
      thumbnailWidth: document.querySelector('.video-result img[data-video-id]')?.naturalWidth || 0
    }));
    assert.ok(result.count >= 10);
    assert.ok(result.thumbnailWidth > 1);
    assert.doesNotMatch(result.title, /OpenView featured video|Big Buck Bunny|Creative Commons animation showcase/);
    await page.locator('.video-result:not(.skeleton-result)').first().click();
    const player = page.locator('[data-player-shell] iframe');
    await player.waitFor({ state: 'attached', timeout: 10000 });
    assert.match(await player.getAttribute('src'), /youtube-nocookie\.com\/embed\//);
    assert.deepEqual(errors.filter(message => !/ResizeObserver loop/.test(message)), []);
    console.log(`Live YouTube catalogue loaded ${result.count} real results with thumbnails and an official player.`);
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
