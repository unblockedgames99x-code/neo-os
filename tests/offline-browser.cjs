/* Real, isolated Chrome checks. All non-local HTTP/WebSocket traffic is blocked.
 * No downloads or npm install are needed with the bundled Codex runtime.
 * NEO_PREVIEW_URL and NEO_CHROME_PATH can override the local preview/browser.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function playwrightRuntime() {
  try { return require('playwright'); } catch (_) {}
  const runtime = process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || '', '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright');
  return require(runtime);
}
const { chromium } = playwrightRuntime();
const base = new URL(process.env.NEO_PREVIEW_URL || 'http://127.0.0.1:3092/');
const root = path.resolve(__dirname, '..');
const output = path.join(root, '.codex-tmp', 'offline-verification');
fs.mkdirSync(output, { recursive: true });
const report = { preview: base.href, checks: [], failures: [], externalRequests: [], consoleErrors: [], pageErrors: [] };

async function check(name, run) {
  try {
    const detail = await run();
    report.checks.push({ name, detail: detail === undefined ? true : detail });
    console.log('PASS ' + name);
  } catch (error) {
    report.failures.push({ name, message: error.message });
    console.error('FAIL ' + name + ': ' + error.message);
  }
}

async function isolatedContext(browser, viewport = { width: 1366, height: 768 }) {
  const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
  context.setDefaultTimeout(6000);
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (/^https?:$/.test(url.protocol) && url.origin !== base.origin) {
      report.externalRequests.push({ url: url.href, type: request.resourceType() });
      return route.abort('blockedbyclient');
    }
    return route.continue();
  });
  if (context.routeWebSocket) {
    await context.routeWebSocket('**/*', socket => {
      report.externalRequests.push({ url: socket.url(), type: 'websocket' });
      socket.close();
    });
  }
  context.on('page', page => {
    page.on('pageerror', error => report.pageErrors.push(error.message));
    page.on('console', msg => { if (msg.type() === 'error') report.consoleErrors.push(msg.text()); });
  });
  return context;
}

async function musicPage(context) {
  const page = await context.newPage();
  await page.goto(new URL('neo-os/music-local/index.html', base).href, { waitUntil: 'networkidle' });
  await page.getByRole('searchbox', { name: 'Search music' }).waitFor();
  return page;
}

async function rangeClick(page, locator, fraction) {
  const rect = await locator.boundingBox();
  assert(rect, 'Range input is not visible');
  await page.mouse.click(rect.x + 8 + (rect.width - 16) * fraction, rect.y + rect.height / 2);
}

async function trackMenu(page, title) {
  await page.getByRole('button', { name: 'More options for ' + title, exact: true }).click();
  await page.getByRole('menu', { name: 'Track options' }).waitFor();
}

async function run() {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required', '--disable-background-networking', '--disable-component-update', '--no-default-browser-check']
  });
  try {
    const context = await isolatedContext(browser);
    const page = await musicPage(context);
    await check('Local catalog renders', async () => {
      const count = await page.locator('#tracks [data-track-id]').count();
      assert(count >= 3, 'Expected at least three bundled tracks');
      return { renderedRows: count };
    });
    await check('Playback starts and contains full-length local audio', async () => {
      await page.getByRole('button', { name: 'Play all', exact: true }).click();
      await page.waitForFunction(() => {
        const a = document.querySelector('#audio');
        return a && !a.paused && a.currentTime > 0.15 && a.duration > 30;
      }, null, { timeout: 10000 });
      return page.locator('#audio').evaluate(a => ({ duration: a.duration, currentTime: a.currentTime, source: a.currentSrc }));
    });
    await check('Seek passes the 30-second mark and keeps playing', async () => {
      const duration = await page.locator('#audio').evaluate(a => a.duration);
      await rangeClick(page, page.getByRole('slider', { name: 'Seek', exact: true }), Math.min(0.6, 35 / duration));
      await page.waitForFunction(() => document.querySelector('#audio').currentTime > 30, null, { timeout: 5000 });
      const before = await page.locator('#audio').evaluate(a => a.currentTime);
      await page.waitForFunction(t => document.querySelector('#audio').currentTime > t + 0.3, before);
      return { playedBeyondSeconds: before };
    });
    await check('Pause and resume', async () => {
      await page.getByRole('button', { name: 'Pause', exact: true }).click();
      assert.equal(await page.locator('#audio').evaluate(a => a.paused), true);
      await page.getByRole('button', { name: 'Play', exact: true }).click();
      await page.waitForFunction(() => !document.querySelector('#audio').paused);
    });
    await check('Mute and volume control the actual audio element', async () => {
      await page.getByRole('button', { name: 'Mute', exact: true }).click();
      assert.equal(await page.locator('#audio').evaluate(a => a.muted), true);
      await page.getByRole('button', { name: 'Unmute', exact: true }).click();
      assert.equal(await page.locator('#audio').evaluate(a => a.muted), false);
      await rangeClick(page, page.getByRole('slider', { name: 'Volume', exact: true }), 0.4);
      const volume = await page.locator('#audio').evaluate(a => a.volume);
      assert(volume > 0.2 && volume < 0.6, 'Volume did not change: ' + volume);
      return { volume };
    });
    await check('Next and previous track', async () => {
      const before = await page.locator('#audio').evaluate(a => a.currentSrc);
      await page.getByRole('button', { name: 'Next track', exact: true }).click();
      await page.waitForFunction(src => document.querySelector('#audio').currentSrc !== src, before);
      await page.getByRole('button', { name: 'Previous track', exact: true }).click();
      await page.waitForFunction(src => document.querySelector('#audio').currentSrc === src, before);
    });
    await check('Search and empty search state', async () => {
      const input = page.getByRole('searchbox', { name: 'Search music' });
      await input.fill('orbit');
      assert.equal(await page.locator('#tracks [data-track-id]').count(), 1);
      assert.match(await page.locator('#tracks').innerText(), /Quiet Orbit/);
      await input.fill('not-an-actual-track-9283');
      await page.waitForTimeout(250);
      assert.equal(await page.locator('#tracks [data-track-id]').count(), 0, 'Search did not filter tracks');
      assert.match(await page.locator('main').innerText(), /no.*(track|match|result)|nothing.*found/i);
      await input.fill('');
      await page.waitForTimeout(250);
      assert((await page.locator('#tracks [data-track-id]').count()) >= 3);
    });
    await check('Right-click favourites and Recent navigation', async () => {
      await page.locator('#tracks [data-track-id="after-hours"]').click({ button: 'right' });
      await page.getByRole('menuitem', { name: 'Add to favourites', exact: true }).click();
      await page.getByRole('button', { name: 'Favourites', exact: true }).click();
      assert.equal(await page.locator('#tracks [data-track-id]').count(), 1);
      assert.match(await page.locator('#tracks').innerText(), /After Hours/);
      await page.getByRole('button', { name: 'Recent', exact: true }).click();
      assert((await page.locator('#tracks [data-track-id]').count()) >= 1);
      await page.getByRole('button', { name: 'Browse', exact: true }).click();
    });
    await check('Queue add, play next, remove, and clear', async () => {
      await trackMenu(page, 'Morning Lines');
      await page.getByRole('menuitem', { name: 'Play next', exact: true }).click();
      const queued = await page.evaluate(() => window.NEO_LOCAL_MUSIC.getState());
      assert.equal(queued.queue[queued.index + 1], 'morning-lines');
      await trackMenu(page, 'Quiet Orbit');
      await page.getByRole('menuitem', { name: 'Add to queue', exact: true }).click();
      await page.getByRole('button', { name: 'Show queue', exact: true }).click();
      assert((await page.locator('#queue-list .queue-item').count()) >= 4);
      const before = await page.locator('#queue-list .queue-item').count();
      await page.getByRole('button', { name: 'Remove Quiet Orbit from queue', exact: true }).last().click();
      assert.equal(await page.locator('#queue-list .queue-item').count(), before - 1);
      await page.getByRole('button', { name: 'Clear upcoming tracks', exact: true }).click();
      const cleared = await page.evaluate(() => window.NEO_LOCAL_MUSIC.getState());
      assert.equal(cleared.queue.length, cleared.index + 1);
      await page.getByRole('button', { name: 'Close queue', exact: true }).click();
    });
    await check('Create playlist, add a song, and remove a song', async () => {
      await page.getByRole('button', { name: 'Playlists', exact: true }).click();
      await page.getByRole('button', { name: 'New playlist', exact: true }).click();
      await page.getByRole('textbox', { name: 'Playlist name', exact: true }).fill('Chromebook Mix');
      await page.getByRole('button', { name: 'Create playlist', exact: true }).click();
      await page.getByRole('button', { name: 'Browse', exact: true }).click();
      await trackMenu(page, 'After Hours');
      await page.getByRole('menuitem', { name: 'Add to playlist', exact: true }).click();
      await page.getByRole('combobox', { name: 'Add to existing playlist', exact: true }).selectOption({ label: 'Chromebook Mix' });
      await page.getByRole('button', { name: 'Add track', exact: true }).click();
      await page.getByRole('button', { name: 'Playlists', exact: true }).click();
      await page.getByRole('button', { name: 'Chromebook Mix 1 tracks', exact: true }).click();
      assert.equal(await page.locator('#tracks [data-track-id]').count(), 1);
      await trackMenu(page, 'After Hours');
      await page.getByRole('menuitem', { name: 'Remove from playlist', exact: true }).click();
      assert.equal(await page.locator('#tracks [data-track-id]').count(), 0);
      await page.getByRole('button', { name: 'Browse', exact: true }).click();
      await trackMenu(page, 'After Hours');
      await page.getByRole('menuitem', { name: 'Add to playlist', exact: true }).click();
      await page.getByRole('combobox', { name: 'Add to existing playlist', exact: true }).selectOption({ label: 'Chromebook Mix' });
      await page.getByRole('button', { name: 'Add track', exact: true }).click();
    });
    await check('Shuffle and repeat modes', async () => {
      const shuffle = page.getByRole('button', { name: 'Shuffle', exact: true });
      await shuffle.click();
      assert.equal(await shuffle.getAttribute('aria-pressed'), 'true');
      await shuffle.click();
      assert.equal(await shuffle.getAttribute('aria-pressed'), 'false');
      const repeat = page.getByRole('button', { name: 'Repeat', exact: true });
      for(const mode of ['all', 'one', 'off']) {
        await repeat.click();
        assert.equal(await page.evaluate(() => window.NEO_LOCAL_MUSIC.getState().repeat), mode);
      }
    });
    await check('Preview stops at 10 seconds and resumes the complete song', async () => {
      await trackMenu(page, 'After Hours');
      await page.getByRole('menuitem', { name: 'Preview 10 seconds', exact: true }).click();
      await page.waitForFunction(() => !document.querySelector('#audio').paused);
      await rangeClick(page, page.getByRole('slider', { name: 'Seek', exact: true }), 9.5 / 72);
      await page.waitForFunction(() => document.querySelector('#audio').paused && document.querySelector('#audio').currentTime >= 10, null, { timeout: 4000 });
      assert.equal(await page.locator('#audio').evaluate(a => a.duration), 72);
      await page.getByRole('button', { name: 'Play', exact: true }).click();
      await page.waitForFunction(() => !document.querySelector('#audio').paused && document.querySelector('#audio').currentTime > 10.2);
    });
    await check('Import audio with matching cover through the file picker', async () => {
      const chooser = page.waitForEvent('filechooser');
      await page.getByRole('button', { name: 'Import music', exact: true }).click();
      await (await chooser).setFiles([
        { name: 'Test Artist - Local Import.wav', mimeType: 'audio/wav', buffer: fs.readFileSync(path.join(root, 'neo-os/music-local/media/quiet-orbit.wav')) },
        { name: 'Test Artist - Local Import.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWZ8AAAAASUVORK5CYII=', 'base64') }
      ]);
      await page.getByRole('button', { name: 'More options for Local Import', exact: true }).waitFor();
      const imported = page.locator('#tracks .track-row').filter({ hasText: 'Local Import' });
      assert.match(await imported.innerText(), /Test Artist/);
      const cover = await imported.locator('img').getAttribute('src');
      assert(cover.startsWith('blob:'), 'Matching imported artwork was not used');
      await imported.getByRole('button', { name: 'Play Local Import', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('#audio').currentSrc.startsWith('blob:') && !document.querySelector('#audio').paused && document.querySelector('#audio').duration === 80);
      await trackMenu(page, 'Local Import');
      const coverPicker = page.waitForEvent('filechooser');
      await page.getByRole('menuitem', { name: 'Change cover', exact: true }).click();
      await (await coverPicker).setFiles({ name: 'new-art.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWZ8AAAAASUVORK5CYII=', 'base64') });
      await page.waitForFunction(() => document.querySelector('#toast').textContent === 'Cover updated.');
    });
    await check('Playlists, favourites, imported music and art survive reload', async () => {
      await page.reload({ waitUntil: 'networkidle' });
      await page.getByRole('button', { name: 'More options for Local Import', exact: true }).waitFor();
      const imported = page.locator('#tracks .track-row').filter({ hasText: 'Local Import' });
      assert((await imported.locator('img').getAttribute('src')).startsWith('blob:'));
      await imported.getByRole('button', { name: 'Play Local Import', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('#audio').duration === 80 && !document.querySelector('#audio').paused);
      await page.getByRole('button', { name: 'Favourites', exact: true }).click();
      assert.match(await page.locator('#tracks').innerText(), /After Hours/);
      await page.getByRole('button', { name: 'Playlists', exact: true }).click();
      await page.getByRole('button', { name: 'Chromebook Mix 1 tracks', exact: true }).click();
      assert.equal(await page.locator('#tracks [data-track-id]').count(), 1);
      await page.getByRole('button', { name: 'Browse', exact: true }).click();
    });
    await check('Invalid audio import shows a usable error', async () => {
      const chooser = page.waitForEvent('filechooser');
      await page.getByRole('button', { name: 'Import music', exact: true }).click();
      await (await chooser).setFiles({ name: 'damaged.wav', mimeType: 'audio/wav', buffer: Buffer.from('This is not audio data.') });
      await page.waitForFunction(() => document.querySelector('#notice').textContent.includes('unsupported'));
      assert.equal(await page.locator('#tracks [data-track-id]').count(), 4);
    });
    await check('Every displayed local image decodes', async () => {
      await page.waitForFunction(() => Array.from(document.images).every(i => i.complete));
      const images = await page.locator('img').evaluateAll(items => items.map(i => ({ src: i.currentSrc, width: i.naturalWidth })));
      assert(images.length > 0);
      assert(images.every(i => i.width > 0), 'Broken images: ' + JSON.stringify(images.filter(i => !i.width)));
      return { imageCount: images.length };
    });
    const layoutContext = await isolatedContext(browser);
    const layoutPage = await musicPage(layoutContext);
    await check('Back navigation returns to Browse and headings clear the header', async () => {
      await layoutPage.getByRole('button', { name: 'Favourites', exact: true }).click();
      await layoutPage.goBack();
      await layoutPage.getByRole('heading', { name: 'Your listening room.', exact: true }).waitFor();
      const heading = await layoutPage.locator('h1').boundingBox();
      const header = await layoutPage.locator('.topbar').boundingBox();
      assert(heading.y >= header.y + header.height, 'Heading is covered by the sticky navigation');
    });
    for (const viewport of [{ width: 1366, height: 768 }, { width: 1024, height: 600 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
      await check('Responsive layout ' + viewport.width + 'x' + viewport.height, async () => {
        await layoutPage.setViewportSize(viewport);
        await layoutPage.waitForTimeout(100);
        const bounds = await layoutPage.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, height: innerHeight, bodyScroll: document.body.scrollWidth }));
        assert(bounds.scroll <= bounds.width + 1 && bounds.bodyScroll <= bounds.width + 1, 'Page overflows horizontally: ' + JSON.stringify(bounds));
        for (const name of ['Search music', 'Volume', 'Seek']) {
          const locator = name === 'Search music' ? layoutPage.getByRole('searchbox', { name }) : layoutPage.getByRole('slider', { name, exact: true });
          const r = await locator.boundingBox();
          assert(r && r.x >= -1 && r.x + r.width <= viewport.width + 1 && r.y >= 0 && r.y + r.height <= viewport.height + 1, name + ' outside viewport: ' + JSON.stringify(r));
        }
        const heading = await layoutPage.locator('h1').boundingBox();
        const header = await layoutPage.locator('.topbar').boundingBox();
        assert(heading.y >= header.y + header.height, 'Heading is covered by the sticky navigation');
        await layoutPage.screenshot({ path: path.join(output, 'music-' + viewport.width + '.png') });
        return bounds;
      });
    }
    await layoutContext.close();
    await check('No external requests while using local music', async () => {
      assert.deepEqual(report.externalRequests, [], 'External request attempts: ' + JSON.stringify(report.externalRequests));
      assert.deepEqual(report.pageErrors, [], 'Uncaught JS errors: ' + JSON.stringify(report.pageErrors));
    });
    await context.close();
    const firstQueueContext = await isolatedContext(browser);
    await check('A queued song is honored by first Play and after reload', async () => {
      const queued = await musicPage(firstQueueContext);
      await trackMenu(queued, 'Quiet Orbit');
      await queued.getByRole('menuitem', { name: 'Add to queue', exact: true }).click();
      await queued.reload({ waitUntil: 'networkidle' });
      await queued.getByRole('button', { name: 'Play', exact: true }).click();
      await queued.waitForFunction(() => window.NEO_LOCAL_MUSIC.getState().trackId === 'quiet-orbit' && !document.querySelector('#audio').paused);
    });
    await firstQueueContext.close();
    const errorsContext = await isolatedContext(browser);
    await check('Delayed local audio shows loading then plays', async () => {
      const loading = await errorsContext.newPage();
      await loading.route('**/media/after-hours.wav', async route => {
        await new Promise(resolve => setTimeout(resolve, 1100));
        return route.continue();
      });
      await loading.goto(new URL('neo-os/music-local/', base).href, { waitUntil: 'networkidle' });
      await loading.getByRole('button', { name: 'Play all', exact: true }).click();
      assert.match(await loading.locator('#playback-status').innerText(), /Loading audio/);
      await loading.waitForFunction(() => document.querySelector('#audio').currentTime > 0 && !document.querySelector('#audio').paused);
      await loading.close();
    });
    await check('Missing local audio gives an error and Retry recovers', async () => {
      const broken = await errorsContext.newPage();
      await broken.route('**/media/after-hours.wav', route => route.fulfill({ status: 404, body: 'Missing test audio' }));
      await broken.goto(new URL('neo-os/music-local/', base).href, { waitUntil: 'networkidle' });
      await broken.getByRole('button', { name: 'Play all', exact: true }).click();
      await broken.locator('#playback-error').waitFor({ state: 'visible' });
      assert.match(await broken.locator('#error-text').innerText(), /could not|unavailable|retry|supported/i);
      await broken.unroute('**/media/after-hours.wav');
      await broken.getByRole('button', { name: 'Retry', exact: true }).click();
      await broken.waitForFunction(() => document.querySelector('#audio').currentTime > 0 && !document.querySelector('#audio').paused);
      assert.equal(await broken.locator('#playback-error').isVisible(), false);
      await broken.close();
    });
    await check('Missing cover uses the local artwork fallback', async () => {
      const broken = await errorsContext.newPage();
      await broken.route('**/media/after-hours.svg', route => route.fulfill({ status: 404, body: 'Missing test art' }));
      await broken.goto(new URL('neo-os/music-local/', base).href, { waitUntil: 'networkidle' });
      const cover = broken.locator('#tracks [data-track-id="after-hours"] img');
      assert.match(await cover.getAttribute('src'), /fallback\.svg/);
      assert.equal(await cover.evaluate(i => i.complete && i.naturalWidth > 0), true);
      await broken.close();
    });
    await check('No critical errors or external requests during error recovery', async () => {
      assert.deepEqual(report.externalRequests, []);
      assert.deepEqual(report.pageErrors, []);
    });
    await errorsContext.close();
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  }
  console.log(JSON.stringify(report, null, 2));
  if (report.failures.length) process.exitCode = 1;
}

run().catch(error => { console.error(error); process.exitCode = 1; });
