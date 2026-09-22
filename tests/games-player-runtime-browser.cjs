const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || '', '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright'));
const base = process.env.NEO_GAMES_TEST_URL || 'http://127.0.0.1:3092/neo-os/neo-games/';

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1100, height: 720 } });
  try {
    await page.route(/cdn\.jsdelivr\.net\/gh\/luminsdk\/script@.*\/fonts\.min\.js/, route => route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `window.Lumin={init(o){o.onReady();return Promise.resolve()},getGames(){return Promise.resolve({games:[{id:'fern/runtime',name:'Runtime Test',image_token:'runtime',category:'test'}],total:1,page:1,pages:1})},getImageUrl(){return Promise.resolve('https://images.test/runtime.svg')},getGameUrl(){return Promise.resolve({url:'https://games.test/runtime/'})},endGame(){window.__ended=true}};`
    }));
    await page.route('https://images.test/**', route => route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"/>' }));
    await page.route('https://games.test/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><body>Runtime game</body>' }));
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-play]').waitFor();
    await page.locator('[data-play]').click();
    await page.waitForFunction(() => document.querySelector('[data-game-frame]')?.dataset.neoGameReady === 'true');
    const state = await page.evaluate(() => ({
      playing: document.documentElement.classList.contains('is-playing'),
      rootOverflow: getComputedStyle(document.documentElement).overflow,
      bodyOverflow: getComputedStyle(document.body).overflow,
      playerOverflow: getComputedStyle(document.querySelector('[data-player]')).overflow,
      source: document.querySelector('[data-game-frame]').dataset.neoGameSource,
      documentScroll: document.documentElement.scrollHeight - document.documentElement.clientHeight
    }));
    assert.deepEqual(state, { playing: true, rootOverflow: 'hidden', bodyOverflow: 'hidden', playerOverflow: 'hidden', source: 'https://games.test/runtime/', documentScroll: 0 });
    await page.locator('[data-player-refresh]').click();
    await page.waitForFunction(() => document.querySelector('[data-game-frame]')?.dataset.neoGameReady === 'true');
    await page.locator('[data-player-close]').first().click();
    assert.equal(await page.evaluate(() => window.__ended), true);
  } finally {
    await browser.close();
  }
  console.log('The Fern player launches directly, remains scroll-safe, refreshes, and ends cleanly.');
})().catch(error => { console.error(error); process.exitCode = 1; });
