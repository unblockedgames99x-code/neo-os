const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || '', '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright'));

const url = process.env.NEO_GAMES_WINDOW_TEST_URL || 'http://127.0.0.1:3092/neo-os/?test=games-separate-window-v1';
const launchUrl = 'https://a.luminsdk.com/g/test-token/runtime/';

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  const diagnostics = [];
  page.on('console', message => { if (message.type() === 'error') diagnostics.push(message.text()); });
  page.on('requestfailed', request => diagnostics.push(`${request.url()} — ${request.failure()?.errorText || 'failed'}`));
  try {
    await page.route(/(?:cdn|fastly)\.jsdelivr\.net\/gh\/luminsdk\/script@.*\/fonts\.min\.js/, route => route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `window.Lumin={init(o){o.onReady();return Promise.resolve()},getGames(){return Promise.resolve({games:[{id:'fern/runtime',name:'Runtime Test',image_token:'runtime',category:'test'}],total:1,page:1,pages:1})},getImageUrl(){return Promise.resolve('https://images.test/runtime.svg')},getGameUrl(){return Promise.resolve({url:${JSON.stringify(launchUrl)}})},endGame(){window.__ended=true}};`
    }));
    await page.route('https://images.test/**', route => route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#1a9fff"/></svg>' }));
    await page.route(`${launchUrl}**`, route => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Runtime game</title><body>Runtime game</body>' }));
    await page.route('https://neo-stratus-api-w6nw.onrender.com/games/v1/document**', route => route.fulfill({
      status: 200,
      contentType: 'text/html',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: `<!doctype html><html><head><base href="${launchUrl}"></head><body>Runtime game</body></html>`
    }));

    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.NEO_SHELL && document.documentElement.dataset.boot === 'complete');
    const start = page.locator('#neo-start-screen');
    if (await start.isVisible()) await start.locator('[data-start-mode="laptop"]').click();
    const guest = page.locator('[data-neo-login-guest]');
    if (await guest.isVisible()) await guest.click();

    await page.evaluate(() => window.NEO_SHELL.openApp('games'));
    const steamWindow = page.locator('.neo-window[data-app-id="games"]');
    const steam = steamWindow.locator('iframe').contentFrame();
    try {
      await steam.locator('.game-list-item').waitFor();
    } catch (error) {
      diagnostics.push(await steam.locator('body').innerText().catch(() => 'Games frame unavailable'));
      console.error(JSON.stringify({ diagnostics }, null, 2));
      throw error;
    }
    await steam.locator('[data-play]').click();

    const gameWindow = page.locator('.neo-window[data-app-id^="custom-app-game-"]');
    await gameWindow.waitFor({ state: 'visible' });
    const appId = await gameWindow.getAttribute('data-app-id');
    assert.ok(appId && appId.startsWith('custom-app-game-'));
    assert.equal(await gameWindow.locator('.window-title strong').textContent(), 'Runtime Test');
    assert.equal(await gameWindow.locator('iframe').getAttribute('src'), null);
    assert.match(await gameWindow.locator('iframe').getAttribute('srcdoc'), /neo-ad-shield\.js[\s\S]*Runtime game/);
    assert.equal(await page.locator(`.dock-button[data-app="${appId}"]`).count(), 1, 'The running game is missing from the taskbar');
    assert.equal(await steam.locator('[data-player]').isHidden(), true, 'Steam kept using the old in-app player overlay');

    await page.evaluate(id => {
      const win = document.querySelector(`.neo-window[data-app-id="${id}"]`);
      const frame = win.querySelector('iframe');
      window.__gameExitFullscreenCalls = 0;
      Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => frame });
      Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: () => {
        window.__gameExitFullscreenCalls += 1;
        Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => null });
        return Promise.resolve();
      }});
    }, appId);

    await gameWindow.locator('[data-window-action="pin"]').click();
    await page.waitForFunction(id => window.NEO_SHELL.getCustomApps().some(app => app.id === id && app.installed && app.pinned), appId);
    await gameWindow.locator('[data-window-action="close"]').click();
    await gameWindow.waitFor({ state: 'detached' });

    assert.equal(await page.evaluate(() => window.__gameExitFullscreenCalls), 1, 'Closing the game did not exit fullscreen');
    assert.equal(await page.locator(`.dock-button[data-app="${appId}"]`).count(), 1, 'Pinned game disappeared from the taskbar after close');
    assert.equal(await steam.locator('body').evaluate(() => window.__ended === true), true, 'Closing the game window did not end the Fern session');

    await page.evaluate(id => window.NEO_SHELL.removeCustomApp(id), appId);
  } finally {
    await browser.close();
  }
  console.log('Fern games open in their own OS windows, can be pinned, and exit fullscreen when closed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
