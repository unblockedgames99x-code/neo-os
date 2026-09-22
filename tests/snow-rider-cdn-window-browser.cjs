const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || '', '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright'));

const url = process.env.NEO_SNOW_RIDER_CDN_URL || 'https://fastly.jsdelivr.net/gh/unblockedgames99x-code/neo-os-launch-cdn@dc812680f9cb86c889b0524fee2ea4b4fcc42467/launch.svg';

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.route(/(?:cdn|fastly)\.jsdelivr\.net\/gh\/luminsdk\/script@.*\/fonts\.min\.js/, route => route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `window.Lumin={init(o){o.onReady();return Promise.resolve()},getGames(){return Promise.resolve({games:[{id:'selenite/snowrider3d',name:'Snow Rider 3D',image_token:'snow',category:'sports'}],total:1,page:1,pages:1})},getImageUrl(){return Promise.resolve('https://images.test/snow.svg')},getGameUrl(){throw new Error('Snow Rider should use the NEO compatibility player')},endGame(){}};`
    }));
    await page.route('https://images.test/**', route => route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"/>' }));
    await page.route('**/Build/UnityLoader.js', route => route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: 'window.UnityLoader={instantiate:function(id,url){window.__unityLaunch={id:id,url:url};document.documentElement.classList.add("is-ready");}};'
    }));

    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('#neo-os'));
    await page.waitForFunction(() => Array.from(document.querySelectorAll('iframe')).some(frame => {
      try { return Boolean(frame.contentDocument && frame.contentDocument.querySelector('#neo-desktop')); } catch (_error) { return false; }
    }));
    const desktop = page.frames().find(frame => frame !== page.mainFrame() && frame.url() === 'about:srcdoc');
    assert.ok(desktop, 'The published launcher did not create its desktop frame');
    await desktop.locator('#neo-desktop').waitFor();
    await desktop.waitForFunction(() => window.NEO_SHELL && document.documentElement.dataset.boot === 'complete');
    const start = desktop.locator('#neo-start-screen');
    if (await start.isVisible()) await start.locator('[data-start-mode="laptop"]').click();
    const guest = desktop.locator('[data-neo-login-guest]');
    if (await guest.isVisible()) await guest.click();
    await desktop.evaluate(() => window.NEO_SHELL.openApp('games'));

    const steamHandle = await desktop.locator('.neo-window[data-app-id="games"] iframe').elementHandle();
    const steam = await steamHandle.contentFrame();
    assert.ok(steam, 'Steam did not create its app frame');
    await steam.locator('.game-list-item').waitFor();
    await steam.locator('[data-play]').click();

    const gameWindow = desktop.locator('.neo-window[data-app-id^="custom-app-game-"]');
    await gameWindow.waitFor({ state: 'visible' });
    const gameHandle = await gameWindow.locator('iframe').elementHandle();
    const game = await gameHandle.contentFrame();
    assert.ok(game, 'Snow Rider did not create its game frame');
    await game.locator('#gameContainer').waitFor();
    const state = await game.locator('body').evaluate(() => ({
      compatibility: window.__neoSnowRiderCompatibility,
      unityLaunch: window.__unityLaunch
    }));
    assert.deepEqual(state.compatibility, { frameRate: 60, repeatedJumpInputBlocked: true });
    assert.equal(state.unityLaunch.id, 'gameContainer');
    assert.match(state.unityLaunch.url, /SnowRider3D-gd-1\.json$/);
    assert.equal(errors.length, 0, errors.join('\n'));
  } finally {
    await browser.close();
  }
  console.log('The published Steam app opens Snow Rider in the executable jump-fix player.');
})().catch(error => { console.error(error); process.exitCode = 1; });
