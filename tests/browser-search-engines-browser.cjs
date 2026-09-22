const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || '', '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright'));

const url = process.env.NEO_SEARCH_ENGINE_TEST_URL || 'http://127.0.0.1:3092/neo-os/?test=browser-search-engines-v1';

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'allow' });
  const page = await context.newPage();
  try {
    await page.addInitScript(() => {
      sessionStorage.setItem('neo_os_guest_session_v1', '1');
      const settings = JSON.parse(localStorage.getItem('neo_os_settings_v1') || '{}');
      settings.browserSearchEngine = 'duckduckgo';
      localStorage.setItem('neo_os_settings_v1', JSON.stringify(settings));
    });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
    let scope = page;
    if (/\/launch\.svg(?:[?#]|$)/i.test(url)) {
      await page.waitForFunction(() => Boolean(document.getElementById('neo-os')?.contentWindow?.NEO_SHELL), null, { timeout: 60000 });
      scope = page.frames().find(frame => frame !== page.mainFrame() && frame.url() === 'about:srcdoc');
      assert.ok(scope, 'CDN launcher did not create the NEO OS frame');
    }
    await scope.waitForFunction(() => window.NEO_SHELL && document.documentElement.dataset.boot === 'complete', null, { timeout: 60000 });
    const start = scope.locator('#neo-start-screen');
    if (await start.isVisible()) await start.locator('[data-start-mode="laptop"]').click();
    const guest = scope.locator('[data-neo-login-guest]');
    if (await guest.isVisible()) await guest.click();

    await scope.evaluate(() => window.NEO_SHELL.openApp('browser'));
    const browserFrameElement = scope.locator('.neo-window[data-app-id="browser"] iframe').first();
    await browserFrameElement.waitFor({ state: 'attached' });
    let browserFrame = await (await browserFrameElement.elementHandle()).contentFrame();
    assert.ok(browserFrame, 'Browser frame did not initialize');
    if (/\/launch\.svg(?:[?#]|$)/i.test(browserFrame.url()) || await browserFrame.locator('#neo-browser').count()) {
      await browserFrame.locator('#neo-browser').waitFor({ state: 'attached', timeout: 60000 });
      browserFrame = page.frames().find(frame => frame.parentFrame() === browserFrame) || null;
      assert.ok(browserFrame, 'CDN Browser launcher did not create its inner frame');
    }
    await browserFrame.locator('#url').waitFor({ state: 'visible', timeout: 60000 });
    await browserFrame.waitForFunction(() => window.NEO_SEARCH_PROVIDER === 'duckduckgo');

    await scope.evaluate(() => window.NEO_SHELL.openApp('control'));
    const settingsWindow = scope.locator('.neo-window[data-app-id="control"]');
    const select = settingsWindow.locator('.browser-search-engine-field select');
    await select.waitFor({ state: 'visible' });
    assert.deepEqual(await select.locator('option').allTextContents(), ['Google', 'Bing', 'DuckDuckGo', 'Brave', 'SearXNG']);
    await select.selectOption('brave');
    await browserFrame.waitForFunction(() => window.NEO_SEARCH_PROVIDER === 'brave');
    assert.equal(await scope.evaluate(() => window.NEO_SHELL.getSetting('browserSearchEngine')), 'brave');

    const route = await browserFrame.evaluate(() => window.normalizeInput('static quasar'));
    assert.equal(route, 'https://search.brave.com/search?q=static%20quasar');
  } finally {
    await browser.close();
  }
  console.log('Browser search-engine selection updates the live Browser and persists.');
})().catch(error => { console.error(error); process.exitCode = 1; });
