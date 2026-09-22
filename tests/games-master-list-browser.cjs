const assert = require('node:assert/strict');
const path = require('node:path');

function playwrightRuntime() {
  try { return require('playwright'); } catch (_error) {}
  return require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || '', '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright'));
}

const { chromium } = playwrightRuntime();
const base = process.env.NEO_GAMES_TEST_URL || 'http://127.0.0.1:3092/neo-os/neo-games/';

const sdkFixture = `
(() => {
  const games = Array.from({ length: 1169 }, (_, index) => {
    const number = index + 1;
    return { id: 'fern/game-' + number, name: 'Game ' + String(number).padStart(4, '0'), image_token: 'cover-' + number, category: number % 2 ? 'arcade' : 'puzzle' };
  });
  window.Lumin = {
    init(options) { queueMicrotask(() => options.onReady?.()); return Promise.resolve(); },
    async getGames({ page = 1, limit = 48, q = '' } = {}) {
      const filtered = q ? games.filter(game => game.name.toLowerCase().includes(q.toLowerCase())) : games;
      const start = (page - 1) * limit;
      return { games: filtered.slice(start, start + limit), total: filtered.length, page, pages: Math.max(1, Math.ceil(filtered.length / limit)) };
    },
    async getCategories() { return { categories: ['arcade', 'puzzle'] }; },
    async getImageUrl(token) { return 'https://images.test/' + token + '.svg'; },
    async getGameUrl(id) { return { url: 'https://games.test/' + encodeURIComponent(id) + '/', meta: { id } }; },
    endGame() { window.__fernEnded = true; }
  };
})();`;

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await page.route(/cdn\.jsdelivr\.net\/gh\/luminsdk\/script@.*\/fonts\.min\.js/, route => route.fulfill({ status: 200, contentType: 'application/javascript', body: sdkFixture }));
    await page.route('https://images.test/**', route => route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#1a9fff"/></svg>' }));
    await page.route('https://games.test/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Direct Fern fixture</title><body>Direct Fern game</body>' }));

    await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => document.querySelector('[data-count]')?.textContent === '1,169 GAMES');
    assert.equal(await page.locator('[data-game-list] .game-list-item').count(), 48, 'The first Fern page did not render');
    assert.equal(await page.locator('[data-game-title]').textContent(), 'Game 0001');
    assert.equal(await page.locator('[data-detail-pin]').textContent(), 'Add to taskbar');
    assert.ok((await page.locator('[data-detail-pin]').boundingBox()).width >= 100, 'The taskbar action collapsed back to an icon button');
    assert.equal(await page.locator('[data-loaded-count]').textContent(), '48 / 1,169');
    assert.equal(await page.getByText(/Friends|Community|Workshop/, { exact: false }).count(), 0, 'Social filler remains in the library');

    await page.locator('[data-load-more]').click();
    await page.waitForFunction(() => document.querySelectorAll('[data-game-list] .game-list-item').length >= 96);
    assert.match(await page.locator('[data-loaded-count]').textContent(), /^(?:9[6-9]|[1-9]\d{2,}) \/ 1,169$/);

    await page.locator('[data-search]').fill('Game 1169');
    await page.waitForFunction(() => document.querySelector('[data-loaded-count]')?.textContent === '1');
    assert.equal(await page.locator('[data-game-list] .game-list-item').count(), 1);
    await page.locator('[data-game-list] .game-list-item').click();
    assert.equal(await page.locator('[data-game-title]').textContent(), 'Game 1169');

    await page.locator('[data-favorite]').click();
    assert.equal(await page.locator('[data-favorites-list] .game-list-item').count(), 1);
    assert.equal(await page.locator('[data-favorite]').getAttribute('aria-label'), 'Remove from favorites');

    await page.locator('[data-play]').click();
    await page.waitForFunction(() => document.querySelector('[data-game-frame]')?.dataset.neoGameSource?.startsWith('https://games.test/'));
    const launch = await page.locator('[data-game-frame]').getAttribute('src');
    assert.equal(launch, 'https://games.test/fern%2Fgame-1169/');
    assert.equal(await page.locator('[data-player]').isVisible(), true);
    await page.locator('[data-player-close]').first().click();
    assert.equal(await page.locator('[data-player]').isHidden(), true);
    assert.equal(await page.evaluate(() => window.__fernEnded), true);
  } finally {
    await browser.close();
  }
  console.log('NEO Games paginates, searches, favorites, and directly launches the Fern catalog inside the focused desktop library.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
