const assert = require('node:assert/strict');
const path = require('node:path');

function playwrightRuntime() {
  try { return require('playwright'); } catch (_error) {}
  return require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || '', '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright'));
}

const { chromium } = playwrightRuntime();
const url = process.env.NEO_BROWSER_LANGUAGE_URL || 'http://127.0.0.1:3092/neo-os/NEO-BROWSER/?test=local-language-data-v1';

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  const jsDelivrRequests = [];
  page.on('request', request => {
    if (/\.jsdelivr\.net/i.test(request.url())) jsDelivrRequests.push(request.url());
  });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => typeof window.ISO6391?.getAllCodes === 'function');
    await page.evaluate(() => document.getElementById('settingsBtn')?.click());
    await page.evaluate(() => document.querySelector('.settings-nav-item[data-section="language"]')?.click());
    await page.evaluate(() => document.getElementById('settingsLanguageTrigger')?.click());
    await page.waitForFunction(() => document.querySelectorAll('#settingsLanguageList .locale-dropdown-option').length > 100);

    const state = await page.evaluate(() => ({
      apiCodes: window.ISO6391?.getAllCodes?.().length || 0,
      listItems: document.querySelectorAll('#settingsLanguageList .locale-dropdown-option').length,
      panelDisplay: getComputedStyle(document.getElementById('settingsLanguagePanel')).display
    }));
    assert.ok(state.apiCodes > 100, 'The local ISO language data did not initialize');
    assert.ok(state.listItems > 100, 'The language dropdown did not render the local language list');
    assert.notEqual(state.panelDisplay, 'none', 'The language dropdown did not open');
    assert.deepEqual(jsDelivrRequests, [], 'Opening Browser language settings contacted jsDelivr');
  } finally {
    await browser.close();
  }

  console.log('Browser language settings use local data and make no jsDelivr request.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
