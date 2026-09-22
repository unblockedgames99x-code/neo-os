const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || '', '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright'));

const url = process.env.NEO_WALLPAPER_ESSENTIAL_TEST_URL || 'http://127.0.0.1:3092/neo-os/?test=wallpaper-essential-library-v1';

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  let remotePreviewRequests = 0;
  page.on('request', request => {
    if (/yukios\.pages\.dev\/static\/wallpapers/i.test(request.url())) remotePreviewRequests += 1;
  });
  try {
    await page.addInitScript(() => {
      if (window.top !== window) return;
      localStorage.setItem('neo_os_settings_v1', JSON.stringify({
        designVersion: 26,
        wallpaper: 'neo-reactive',
        wallpaperFavorites: ['neo-reactive'],
        wallpaperRecent: ['neo-reactive']
      }));
    });
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    let scope = page;
    if (/\/launch\.svg(?:[?#]|$)/i.test(url)) {
      await page.waitForFunction(() => Array.from(document.querySelectorAll('iframe')).some(frame => {
        try { return Boolean(frame.contentDocument && frame.contentDocument.querySelector('#neo-desktop')); } catch (_error) { return false; }
      }));
      scope = page.frames().find(frame => frame !== page.mainFrame() && frame.url() === 'about:srcdoc');
      assert.ok(scope, 'The CDN launcher did not create its desktop frame');
    }
    await scope.waitForFunction(() => window.NEO_SHELL && document.documentElement.dataset.boot === 'complete');
    const migrated = await scope.evaluate(() => ({
      wallpaper: window.NEO_SHELL.getSetting('wallpaper'),
      favorites: window.NEO_SHELL.getSetting('wallpaperFavorites'),
      recent: window.NEO_SHELL.getSetting('wallpaperRecent')
    }));
    assert.equal(migrated.wallpaper, 'we-steam-1403160205');
    assert.ok(!migrated.favorites.includes('neo-reactive'));
    assert.ok(!migrated.recent.includes('neo-reactive'));
    const start = scope.locator('#neo-start-screen');
    if (await start.isVisible()) await start.locator('[data-start-mode="laptop"]').click();
    const guest = scope.locator('[data-neo-login-guest]');
    if (await guest.isVisible()) await guest.click();

    const openedAt = Date.now();
    await scope.evaluate(() => window.NEO_SHELL.openApp('wallpaper'));
    const studio = scope.locator('.neo-window[data-app-id="wallpaper"] [data-wallpaper-studio]');
    await studio.waitFor();
    await scope.waitForFunction(() => document.querySelectorAll('.neo-window[data-app-id="wallpaper"] [data-wallpaper-card]').length === 1);
    const elapsed = Date.now() - openedAt;
    const ids = await studio.locator('[data-wallpaper-card]').evaluateAll(cards => cards.map(card => card.dataset.wallpaperCard));
    assert.deepEqual(ids, ['we-steam-1403160205']);
    assert.equal(remotePreviewRequests, 0, 'Wallpaper Engine still eagerly requests removed wallpaper packs');
    assert.ok(elapsed < 1500, `The essential Wallpaper Engine library took too long to open: ${elapsed} ms`);
  } finally {
    await browser.close();
  }
  console.log('Wallpaper Engine opens the single essential wallpaper without remote preview requests.');
})().catch(error => { console.error(error); process.exitCode = 1; });
