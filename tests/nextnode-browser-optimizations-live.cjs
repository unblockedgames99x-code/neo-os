const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE || '', '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright')
);

const browserUrl = process.env.NEO_BROWSER_TEST_URL || 'http://127.0.0.1:3092/neo-os/nextnode-browser/index.html?v=20260913-yukios-wisp-v1';

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const requests = [];
  page.on('request', (request) => requests.push(request.url()));
  try {
    await page.goto(browserUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.locator('#url').waitFor({ state: 'visible', timeout: 30000 });
    const normalized = await page.evaluate(() => ({
      engine: window.NEO_PROXY_ENGINE,
      adShield: Boolean(window.NEOAdShield),
      branding: document.querySelector('.nt-logo')?.textContent?.trim(),
      engineLabel: document.querySelector('.nt-engine')?.textContent?.trim(),
      provider: window.NEO_SEARCH_PROVIDER,
      search: window.normalizeInput('openai'),
      address: window.normalizeInput('https://example.com/'),
    }));
    assert.equal(normalized.engine, 'Scramjet');
    assert.equal(normalized.adShield, true);
    assert.equal(normalized.branding, 'Browser');
    assert.equal(normalized.engineLabel, undefined);
    assert.equal(normalized.provider, 'duckduckgo');
    assert.equal(normalized.search, 'https://html.duckduckgo.com/html/?q=openai');
    assert.equal(normalized.address, 'https://example.com/');
    assert.equal(await page.locator('#b-pop').isVisible(), false, 'The external-open button is visible.');
    assert.equal(await page.locator('#nt-grid .nt-tile:not(.add)').count(), 0, 'Preset bookmarks are visible.');
    assert.equal(requests.some((url) => /browser-vendor\/eruda\.min\.js(?:\?|$)/.test(url)), false, 'Developer tools loaded during startup.');

    const erudaRequest = page.waitForEvent('request', {
      predicate: (request) => /browser-vendor\/eruda\.min\.js(?:\?|$)/.test(request.url()),
      timeout: 30000,
    });
    await page.locator('#b-devtools').click();
    await erudaRequest;
    console.log(JSON.stringify({ normalized, developerToolsDeferred: true }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
