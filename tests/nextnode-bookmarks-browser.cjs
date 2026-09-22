const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE || '', '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright')
);

const url = process.env.NEO_BROWSER_BOOKMARK_URL || 'http://127.0.0.1:3097/neo-os/nextnode-browser/index.html?test=working-bookmarks-v1';

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const context = await browser.newContext({ viewport: { width: 900, height: 650 } });
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    let app = page;
    if (/\/launch\.svg(?:[?#]|$)/i.test(url) || await page.locator('#neo-browser').count()) {
      const shell = await page.waitForSelector('#neo-browser', { timeout: 30000 });
      app = null;
      for (let attempt = 0; attempt < 100 && !app; attempt += 1) {
        app = await shell.contentFrame() || page.frames().find((candidate) => candidate.parentFrame() === page.mainFrame()) || null;
        if (!app) await page.waitForTimeout(100);
      }
      if (!app) throw new Error('The Browser launcher frame did not attach.');
    }
    await app.locator('#url').waitFor({ state: 'visible', timeout: 30000 });
    await app.evaluate(() => newTab());
    await app.locator('#add-bmk').waitFor({ state: 'visible', timeout: 30000 });
    await app.locator('#add-bmk').click();
    await app.locator('#neoBookmarkDialog').waitFor({ state: 'visible' });
    await app.locator('#neoBookmarkUrl').fill('https://example.com/docs');
    await app.locator('#neoBookmarkName').fill('Example Docs');
    await app.locator('[data-bookmark-save]').click();
    await app.locator('#neoBookmarkDialog').waitFor({ state: 'hidden' });
    await app.waitForFunction(() => bookmarks.some((entry) => entry.url === 'https://example.com/docs' && entry.name === 'Example Docs'));
    assert.equal(await app.locator('.nt-tile[data-url="https://example.com/docs"]').count(), 1);

    await app.locator('#add-bmk').click();
    await app.locator('#neoBookmarkDialog').waitFor({ state: 'visible' });
    await page.keyboard.press('Escape');
    await app.locator('#neoBookmarkDialog').waitFor({ state: 'hidden' });
    console.log('NextNode Browser add-bookmark dialog saves and renders bookmarks.');
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
