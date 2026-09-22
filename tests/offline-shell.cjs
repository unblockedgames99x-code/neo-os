const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
let runtime;
try { runtime = require('playwright'); } catch (_) { runtime = require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
const base = new URL(process.env.NEO_PREVIEW_URL || 'http://127.0.0.1:3092/');
const root = path.resolve(__dirname, '..');
const output = path.join(root, '.codex-tmp/offline-verification');
fs.mkdirSync(output, { recursive: true });
const report = { checks: [], errors: [], externalRequests: [], pageErrors: [], failedResponses: [], consoleErrors: [] };
async function check(name, action) {
  try { await action(); report.checks.push(name); console.log('PASS ' + name); }
  catch(error) { report.errors.push({ name, message: error.message }); console.error('FAIL ' + name + ': ' + error.message); }
}
async function run() {
  const browser = await runtime.chromium.launch({ executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--disable-background-networking'] });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, serviceWorkers: 'block' });
  context.setDefaultTimeout(8000);
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (/^https?:$/.test(url.protocol) && url.origin !== base.origin) { report.externalRequests.push(url.href); return route.abort('blockedbyclient'); }
    return route.continue();
  });
  if(context.routeWebSocket) await context.routeWebSocket('**/*', socket => { report.externalRequests.push(socket.url()); socket.close(); });
  context.on('page', page => {
    page.on('pageerror', error => report.pageErrors.push(error.stack || error.message));
    page.on('console', message => { if(message.type() === 'error') report.consoleErrors.push(message.text()); });
    page.on('response', response => { if(response.status() >= 400) report.failedResponses.push({ status: response.status(), url: response.url() }); });
  });
  try {
    const page = await context.newPage();
    await check('OS starts as a local guest with network requests blocked', async () => {
      await page.goto(new URL('neo-os/', base).href, { waitUntil: 'networkidle' });
      const laptop = page.locator('[data-start-mode="laptop"]');
      if(await laptop.isVisible()) await laptop.click();
      const guest = page.locator('[data-neo-login-guest]');
      if(await guest.isVisible()) await guest.click();
      await page.locator('html[data-boot="complete"]').waitFor();
      await page.locator('#neo-dock').waitFor({ state: 'visible' });
      await page.screenshot({ path: path.join(output, 'shell-1366.png') });
    });
    await check('Original Browser UI opens local games', async () => {
      await page.locator('.dock-button[data-app="browser"]').click();
      const frame = page.frameLocator('.neo-window[data-app-id="browser"] iframe');
      await frame.locator('#url').waitFor();
      assert.equal(await frame.locator('#tutorialOverlay,[data-section="tutorial"]').count(), 0);
      await frame.locator('#url').fill('/games/tetris.html');
      await frame.locator('#url').press('Enter');
      await frame.frameLocator('#frame').locator('canvas').first().waitFor();
    });
    await check('Games catalog opens and preserves game covers', async () => {
      await page.locator('.dock-button[data-app="zones"]').click();
      const gameWindow = page.locator('.neo-window[data-app-id="zones"]');
      await gameWindow.locator('[data-library-search]').fill('tetris');
      const card = gameWindow.getByRole('button', { name: 'Open Tetris', exact: true });
      await card.waitFor();
      await card.locator('img').evaluate(i => i.complete && i.naturalWidth > 0 ? true : new Promise((resolve, reject) => { i.addEventListener('load', () => resolve(true), { once: true }); i.addEventListener('error', () => reject(Error('Broken game cover: ' + i.src)), { once: true }); }));
      await card.click();
      const frame = page.frameLocator('.neo-window[data-app-id^="zone-"] iframe');
      await frame.locator('canvas').first().waitFor();
    });
    await check('OS music integration, taskbar mute, and close stop playback', async () => {
      // Expose desktop preview cards before testing their controls.
      for (const id of await page.locator('.neo-window').evaluateAll(ns => ns.map(n => n.dataset.appId))) {
        await page.evaluate(id => window.NEO_SHELL.openApp(id), id);
        const win = page.locator('.neo-window[data-app-id="'+id+'"]');
        const rect = await win.boundingBox();
        await page.mouse.move(rect.x+rect.width/2, rect.y+3);
        await page.waitForTimeout(230);
        await win.locator('[data-window-action="close"]').click();
        await win.waitFor({state:'hidden'});
      }
      await page.keyboard.press('Control');
      await page.locator('.launcher-app[data-app="stream"]').click();
      const musicWindow = page.locator('.neo-window[data-app-id="stream"]').first();
      const frame = musicWindow.frameLocator('iframe');
      await frame.getByRole('button', { name: 'Play all', exact: true }).click();
      await frame.locator('#audio').evaluate(a => !a.paused && a.currentTime > 0 ? true : new Promise(resolve => a.addEventListener('playing', resolve, { once: true })));
      await page.waitForFunction(() => document.querySelector('[data-topbar-media]').textContent.includes('After Hours'));
      await page.evaluate(() => { window.__testMusicAudio = document.querySelector('.neo-window[data-app-id="stream"] iframe').contentWindow.document.querySelector('#audio'); });
      // The shell deliberately hides titlebars until the pointer reaches a window's top edge.
      const windowRect = await musicWindow.boundingBox();
      await page.mouse.move(windowRect.x + windowRect.width / 2, windowRect.y + 3);
      await page.waitForFunction(() => document.querySelector('.neo-window[data-app-id="stream"]').classList.contains('is-chrome-revealed'));
      await musicWindow.getByRole('button', { name: 'Minimize', exact: true }).click();
      const minimized = page.locator('[data-minimized-app="stream"]');
      await minimized.locator('.neo-minimized-card-mute').click();
      await page.waitForFunction(() => window.__testMusicAudio.muted === true);
      await minimized.locator('.neo-minimized-card-mute').click();
      await page.waitForFunction(() => window.__testMusicAudio.muted === false);
      await minimized.locator('.neo-minimized-card-close').click();
      await page.waitForFunction(() => window.__testMusicAudio.paused && !document.querySelector('.neo-window[data-app-id="stream"]'));
    });
    const localBrowser = await context.newPage();
    await check('Local browser search and no external navigation', async () => {
      await localBrowser.goto(new URL('neo-os/local-browser/', base).href, { waitUntil: 'networkidle' });
      assert.equal(await localBrowser.locator('.card').count(), 4);
      await localBrowser.getByRole('searchbox', { name: 'Search local pages and games' }).fill('https://example.com');
      await localBrowser.getByRole('button', { name: 'Search', exact: true }).click();
      assert.match(await localBrowser.locator('#status').innerText(), /External websites are unavailable/);
      assert.equal(new URL(localBrowser.url()).origin, base.origin);
    });
    await check('Local browser text file preview', async () => {
      const chooser = localBrowser.waitForEvent('filechooser');
      await localBrowser.getByRole('button', { name: 'Open file', exact: true }).click();
      await (await chooser).setFiles({ name: 'offline-note.txt', mimeType: 'text/plain', buffer: Buffer.from('A local preview, without Wi-Fi. <script>plain text only</script>') });
      assert.equal(await localBrowser.locator('#viewer-title').innerText(), 'offline-note.txt');
      assert.equal(await localBrowser.locator('#viewer-content pre').innerText(), 'A local preview, without Wi-Fi. <script>plain text only</script>');
      await localBrowser.getByRole('button', { name: 'Close preview' }).click();
      await localBrowser.locator('#query').fill('');
      assert.equal(await localBrowser.locator('.card').count(), 4);
    });
    await check('Network-only app has a local explanation', async () => {
      await localBrowser.goto(new URL('neo-os/neo-tv/index.html', base).href, { waitUntil: 'networkidle' });
      assert.match(localBrowser.url(), /local-browser\/unavailable/);
      assert.match(await localBrowser.locator('body').innerText(), /local|offline/i);
    });
    for(const viewport of [{ width: 1024, height: 600 }, { width: 390, height: 844 }]) {
      await check('Local Browser layout ' + viewport.width, async () => {
        await localBrowser.setViewportSize(viewport);
        await localBrowser.goto(new URL('neo-os/local-browser/', base).href, { waitUntil: 'networkidle' });
        const size = await localBrowser.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
        assert(size.scroll <= size.width + 1, JSON.stringify(size));
        await localBrowser.screenshot({ path: path.join(output, 'browser-' + viewport.width + '.png') });
      });
    }
    await check('Bundled Tetris starts and a drop changes score', async () => {
      await localBrowser.setViewportSize({ width: 1024, height: 768 });
      await localBrowser.goto(new URL('games/tetris.html', base).href, { waitUntil: 'networkidle' });
      await localBrowser.getByRole('button', { name: 'START GAME', exact: true }).click();
      await localBrowser.keyboard.press('ArrowLeft');
      await localBrowser.keyboard.press('Space');
      await localBrowser.waitForFunction(() => Number(document.querySelector('#score-el').textContent) > 0);
    });
    await check('Bundled Quantum Clicker responds and saves progress', async () => {
      await localBrowser.goto(new URL('games/quantum-clicker.html', base).href, { waitUntil: 'networkidle' });
      await localBrowser.getByRole('button', { name: 'CLICK', exact: true }).click();
      await localBrowser.waitForFunction(() => Number(document.querySelector('#money').textContent.replace(/[^0-9.]/g, '')) > 0);
      const money = await localBrowser.locator('#money').innerText();
      await localBrowser.locator('#saveBtn').click();
      await localBrowser.reload({ waitUntil: 'networkidle' });
      assert.equal(await localBrowser.locator('#money').innerText(), money);
    });
    await check('Bundled Chess accepts a legal move', async () => {
      await localBrowser.goto(new URL('games/grandmaster-chess.html', base).href, { waitUntil: 'networkidle' });
      assert.equal(await localBrowser.locator('#board .square').count(), 64);
      await localBrowser.locator('#board [aria-label="e2"]').click();
      await localBrowser.locator('#board [aria-label="e4"]').click();
      await localBrowser.waitForFunction(() => document.querySelector('#board [aria-label="e4"] .piece') && !document.querySelector('#board [aria-label="e2"] .piece'));
    });
    await check('No external requests or uncaught errors in shell/browser/games', async () => {
      assert.deepEqual(report.externalRequests, []);
      assert.deepEqual(report.pageErrors, []);
    });
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(output, 'shell-report.json'), JSON.stringify(report, null, 2));
  }
  console.log(JSON.stringify(report, null, 2));
  if(report.errors.length) process.exitCode = 1;
}
run().catch(error => { console.error(error); process.exitCode = 1; });
