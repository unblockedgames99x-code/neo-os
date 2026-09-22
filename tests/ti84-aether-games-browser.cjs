const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || '', '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright'));

const url = process.env.NEO_AETHER_GAMES_TEST_URL || 'http://127.0.0.1:3092/neo-os/neo-games/?test=aether-catalog-v1';

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await page.addInitScript(() => {
      const aetherCatalog = [
        { id: 0, name: 'Bowmasters', cover: '{COVER_URL}/0.png', url: '{HTML_URL}/0.html', author: 'Azur Games' },
        { id: 1, name: 'Aether Test Game', cover: '{COVER_URL}/1.png', url: '{HTML_URL}/1.html', author: 'Aether' },
      ];
      const gnMathCatalog = [
        { id: -1, name: '[!] SUGGEST GAMES', cover: '{COVER_URL}/dc.png', url: 'https://discord.example/' },
        { id: 858, name: '60 Seconds! Reatomized', cover: '{COVER_URL}/858.png', url: '{HTML_URL}/858.html', author: 'Robot Gentleman' },
        { id: 900, name: 'GN Math Test Game', cover: '{COVER_URL}/900.png', url: '{HTML_URL}/900.html', author: 'GN Math', special: ['port'] },
      ];
      const staticQuasarCatalog = [
        { slug: 'static-test', name: 'StaticQuasar Test Game', file: 'https://games.test/static-test.html', source: 'staticquasar', source_path: 'static-gmes/static-test' },
        { slug: 'static-second', name: 'StaticQuasar Second Game', file: 'https://games.test/static-second.html', source: 'staticquasar', source_path: 'gm3z/static-second' },
        { slug: 'other-provider', name: 'Other Provider Game', file: 'https://games.test/other.html', source: 'other' },
      ];
      const staticQuasarCovers = {
        'static-test': 'https://images.test/static-test.webp',
        'static-second': 'https://images.test/static-second.webp',
      };
      window.NEO_PROXY_CLIENT = Object.freeze({
        fetch: async value => {
          const url = String(value);
          const payload = url.includes('zones.json') ? gnMathCatalog
            : url.includes('neo-os-games-catalog-cdn') && url.includes('covers.json') ? staticQuasarCovers
              : url.includes('neo-os-games-catalog-cdn') ? staticQuasarCatalog
                : aetherCatalog;
          return new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' } });
        },
        image: async value => value,
        resolve: async value => value,
      });
    });
    await page.route(/(?:cdn|fastly)\.jsdelivr\.net\/gh\/luminsdk\/script@.*\/fonts\.min\.js/, route => route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `window.Lumin={
        init(o){o.onReady();return Promise.resolve()},
        getGames(){return Promise.resolve({games:[{id:'fern/test',name:'Fern Test Game',category:'Arcade',image_token:''}],total:1,page:1,pages:1})},
        getGameUrl(){return Promise.resolve({url:'https://a.luminsdk.com/g/test/index.html'})},
        endGame(){}
      };`
    }));
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
    assert.equal(await page.locator('[data-steam-boot]').isVisible(), true, 'Steam startup animation was not visible during launch');
    try {
      await page.locator('[data-game-list] .game-list-item', { hasText: 'Aether Test Game' }).waitFor({ timeout: 30000 });
    } catch (error) {
      console.error('AETHER DIAGNOSTIC', await page.evaluate(() => ({
        config: window.NEO_GAMES_CONFIG,
        proxy: Boolean(window.NEO_PROXY_CLIENT),
        lumin: Boolean(window.Lumin),
        status: document.querySelector('[data-provider-status]')?.textContent,
        list: document.querySelector('[data-list-state]')?.textContent,
        body: document.body?.innerText?.slice(0, 1000),
      })).catch(() => ({ unavailable: true })));
      throw error;
    }
    await page.locator('[data-game-list] .game-list-item', { hasText: 'Fern Test Game' }).waitFor();
    await page.locator('[data-game-list] .game-list-item', { hasText: 'GN Math Test Game' }).waitFor();
    await page.locator('[data-game-list] .game-list-item', { hasText: 'StaticQuasar Test Game' }).waitFor();
    assert.equal(await page.locator('[data-count]').textContent(), '7 GAMES');
    assert.match(await page.locator('[data-provider-status]').textContent(), /1 Fern/);
    assert.match(await page.locator('[data-provider-status]').textContent(), /2 Aether/);
    assert.match(await page.locator('[data-provider-status]').textContent(), /2 GN Math/);
    assert.match(await page.locator('[data-provider-status]').textContent(), /2 StaticQuasar/);
    await page.locator('[data-game-list] .game-list-item', { hasText: 'Aether Test Game' }).click();
    assert.equal(await page.locator('[data-game-source]').textContent(), 'Aether');
    assert.equal(await page.locator('[data-meta-provider]').textContent(), 'Aether');
    assert.match(await page.locator('[data-about-copy]').textContent(), /NEO web transport/);
    await page.locator('[data-game-list] .game-list-item', { hasText: 'GN Math Test Game' }).click();
    assert.equal(await page.locator('[data-game-source]').textContent(), 'GN Math');
    assert.equal(await page.locator('[data-meta-provider]').textContent(), 'GN Math');
    assert.equal(await page.locator('[data-meta-category]').textContent(), 'Port');
    assert.match(await page.locator('[data-about-copy]').textContent(), /GN Math title through the NEO web transport/);
    await page.locator('[data-game-list] .game-list-item', { hasText: 'StaticQuasar Test Game' }).click();
    assert.equal(await page.locator('[data-game-source]').textContent(), 'StaticQuasar');
    assert.equal(await page.locator('[data-meta-provider]').textContent(), 'StaticQuasar');
    assert.equal(await page.locator('[data-meta-category]').textContent(), 'Static Game');
    assert.match(await page.locator('[data-about-copy]').textContent(), /StaticQuasar title through the NEO web transport/);
    await page.locator('[data-steam-boot]').waitFor({ state: 'hidden', timeout: 7000 });
  } finally {
    await browser.close();
  }
  console.log('Fern, Aether, GN Math, and StaticQuasar games merge into the Steam library with correct provider metadata.');
})().catch(error => { console.error(error); process.exitCode = 1; });
