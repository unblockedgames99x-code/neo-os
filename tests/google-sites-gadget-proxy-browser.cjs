const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
);

const browserUrl = process.env.NEO_BROWSER_URL || 'http://127.0.0.1:8767/neo-os/NEO-BROWSER/';
const targetUrl = 'https://sites.google.com/view/staticquasar/gm3z/snow-rider';

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 760 } });
  await context.route('https://cdn.jsdelivr.net/**/Build/UnityLoader.js', route => route.fulfill({
    status: 200,
    contentType: 'text/javascript',
    body: `window.UnityLoader={instantiate(id,url,options){
      const canvas=document.createElement('canvas');
      canvas.dataset.testGame='ready';
      document.getElementById(id).append(canvas);
      queueMicrotask(()=>{options.onProgress({},1);options.Module.onRuntimeInitialized();});
      return {url};
    }};`
  }));

  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  try {
    await page.goto(browserUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.NeoScramjet?.go));
    await page.locator('#url').fill(targetUrl);
    await page.locator('#go').click();
    await page.waitForFunction(() => document.getElementById('frame')?.src.includes('/compat/staticquasar-snow-rider.html'));
    const game = page.frameLocator('#frame').locator('#gameContainer canvas[data-test-game="ready"]');
    await game.waitFor({ state: 'visible' });
    assert.equal(await page.locator('#url').inputValue(), targetUrl);
    assert.equal(await page.frameLocator('#frame').locator('title').textContent(), 'Snow Rider 3D');
    assert.deepEqual(pageErrors, []);
    console.log('StaticQuasar Snow Rider opens through the NEO Browser compatibility route.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
