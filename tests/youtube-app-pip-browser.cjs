const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
);

const root = process.env.NEO_STATIC_ROOT
  ? path.resolve(process.env.NEO_STATIC_ROOT)
  : path.resolve(__dirname, '..');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
};
const catalogue = {
  items: [
    {
      type: 'stream',
      url: '/watch?v=M7lc1UVf-VE',
      title: 'YouTube player demonstration',
      uploaderName: 'Google Developers',
      views: 1250000,
      uploadedDate: '2 years ago',
      duration: 284,
      shortDescription: 'A reliable player test from the catalogue.',
      isShort: false
    },
    {
      type: 'stream',
      url: '/watch?v=jNQXAC9IVRw',
      title: 'Me at the zoo',
      uploaderName: 'jawed',
      views: 355000000,
      uploadedDate: '19 years ago',
      duration: 19,
      shortDescription: 'A short-form video.',
      isShort: true
    }
  ]
};

function serveFile(request, response) {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  if (pathname === '/__srcdoc-test.html') {
    response.writeHead(200, { 'content-type': 'text/html' }).end('<!doctype html><title>Embedded history regression</title>');
    return;
  }
  const relative = pathname === '/' ? 'neo-os/neo-youtube/index.html' : pathname.replace(/^\//, '');
  const file = path.resolve(root, relative);
  if (file !== root && !file.startsWith(root + path.sep)) {
    response.writeHead(403).end();
    return;
  }
  let target = file;
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, { 'content-type': types[path.extname(target).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(target).pipe(response);
}

(async () => {
  const server = http.createServer(serveFile);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const context = await browser.newContext({ viewport: { width: 1180, height: 760 } });
  await context.route('https://pipedapi.ducks.party/**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(catalogue)
  }));
  await context.route('https://api.piped.private.coffee/**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(catalogue)
  }));
  await context.route('https://i.ytimg.com/**', route => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
  }));
  await context.route('https://www.youtube-nocookie.com/**', route => route.fulfill({
    status: 200,
    contentType: 'text/html',
    body: '<!doctype html><title>Embedded YouTube player</title><body style="margin:0;background:#000"></body>'
  }));

  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  try {
    const port = server.address().port;
    await page.goto(`http://127.0.0.1:${port}/neo-os/neo-youtube/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      window.__neoShellMessages = [];
      window.addEventListener('message', event => {
        if (String(event.data?.type || '').startsWith('neo-shell:youtube-popout')) window.__neoShellMessages.push(event.data);
      });
    });

    await page.locator('.masthead').waitFor({ state: 'visible' });
    assert.equal(await page.locator('[data-home-view]').isVisible(), true);
    assert.equal(await page.locator('.sidebar').isVisible(), true);

    await page.locator('[data-search-input]').fill('gaming');
    await page.locator('[data-search-form]').evaluate(form => form.requestSubmit());
    await page.locator('.video-result').first().waitFor({ state: 'visible' });
    assert.equal(await page.locator('.video-result').count(), 2);
    await page.setViewportSize({ width: 1000, height: 720 });
    assert.equal(await page.locator('.brand').isVisible(), true);
    assert.equal(await page.locator('.search-leading-icon').isVisible(), true);
    fs.mkdirSync(path.join(root, '.codex-tmp'), { recursive: true });
    await page.screenshot({ path: path.join(root, '.codex-tmp', 'youtube-lite-results.png'), fullPage: false });
    await page.setViewportSize({ width: 1180, height: 760 });

    await page.locator('.video-result').first().click();
    const player = page.locator('[data-player-shell] iframe');
    await player.waitFor({ state: 'attached' });
    assert.match(await player.getAttribute('src'), /youtube-nocookie\.com\/embed\/M7lc1UVf-VE/);
    assert.equal(await page.locator('[data-watch-title]').textContent(), 'YouTube player demonstration');
    await page.evaluate(() => {
      window.__playerNodeBeforePopout = document.querySelector('[data-player-shell] iframe');
      window.__playerWindowBeforePopout = window.__playerNodeBeforePopout.contentWindow;
    });

    await page.locator('[data-popout-video]').click();
    assert.equal(await page.locator('[data-video-popout]').isVisible(), true);
    assert.equal(await page.locator('[data-video-popout] iframe').count(), 0);
    assert.equal(await page.locator('[data-player-shell] iframe').count(), 1);
    assert.equal(await page.locator('body').getAttribute('data-popout-mode'), 'watch');
    assert.equal(await page.evaluate(() => (
      window.__playerNodeBeforePopout === document.querySelector('[data-player-shell] iframe')
      && window.__playerWindowBeforePopout === document.querySelector('[data-player-shell] iframe').contentWindow
    )), true, 'pop-out must preserve the active iframe and its playback context');
    await page.waitForFunction(() => window.__neoShellMessages.some(message => message.type === 'neo-shell:youtube-popout' && message.active === true));
    assert.equal(await page.locator('[data-popout-drag]').evaluate(element => getComputedStyle(element).pointerEvents), 'auto');
    const cleanPopout = await page.locator('[data-player-shell]').evaluate(shell => {
      const frame = shell.querySelector('iframe');
      const shellRect = shell.getBoundingClientRect();
      const frameRect = frame.getBoundingClientRect();
      return {
        resumed: frame.dataset.neoPopoutPlaying,
        topCrop: Math.round(frameRect.top - shellRect.top),
        extraHeight: Math.round(frameRect.height - shellRect.height),
        bodyOverflow: getComputedStyle(document.body).overflow
      };
    });
    assert.deepEqual(cleanPopout, { resumed: 'true', topCrop: 0, extraHeight: 0, bodyOverflow: 'hidden' });
    await page.locator('[data-popout-restore]').click();
    assert.equal(await page.locator('[data-watch-view]').isVisible(), true);
    assert.equal(await page.locator('[data-player-shell] iframe').count(), 1);
    assert.equal(await page.locator('[data-video-popout]').isHidden(), true);
    assert.equal(await page.locator('body').getAttribute('data-popout-mode'), null);
    assert.equal(await page.evaluate(() => window.__playerNodeBeforePopout === document.querySelector('[data-player-shell] iframe')), true);

    await context.unroute('https://pipedapi.ducks.party/**');
    await context.unroute('https://api.piped.private.coffee/**');
    await context.route('https://pipedapi.ducks.party/**', route => route.abort());
    await context.route('https://api.piped.private.coffee/**', route => route.abort());
    await page.locator('[data-search-input]').fill('catalogue outage check');
    await page.locator('[data-search-form]').evaluate(form => form.requestSubmit());
    await page.waitForFunction(() => document.querySelector('[data-result-status]')?.textContent.includes('could not connect'));
    assert.equal(await page.locator('.video-result').count(), 0);
    assert.equal(await page.locator('.empty-state h2').textContent(), 'Videos could not load');
    assert.equal(await page.locator('.skeleton-result').count(), 0);
    await page.locator('[data-search-input]').fill('gaming');
    await page.locator('[data-search-form]').evaluate(form => form.requestSubmit());
    await page.waitForFunction(() => document.querySelectorAll('.video-result').length === 2);

    await page.locator('[data-view="shorts"]').first().click();
    await page.locator('[data-short-title]').waitFor({ state: 'visible' });
    await page.waitForFunction(() => document.querySelector('[data-short-title]')?.textContent === 'Me at the zoo');
    assert.equal(await page.locator('[data-short-title]').textContent(), 'Me at the zoo');
    await page.locator('[data-short-play]').click();
    const shortPlayer = page.locator('[data-short-player] iframe');
    await shortPlayer.waitFor({ state: 'attached' });
    assert.match(await shortPlayer.getAttribute('src'), /youtube-nocookie\.com\/embed\/jNQXAC9IVRw/);
    assert.match(await shortPlayer.getAttribute('src'), /loop=1/);
    await page.evaluate(() => {
      window.__shortPlayerBeforePopout = document.querySelector('[data-short-player] iframe');
      window.__shortPlayerWindowBeforePopout = window.__shortPlayerBeforePopout.contentWindow;
    });
    await page.locator('[data-popout-short]').click();
    assert.equal(await page.locator('[data-video-popout]').getAttribute('data-mode'), 'shorts');
    assert.equal(await page.locator('[data-video-popout] iframe').count(), 0);
    assert.equal(await page.locator('[data-short-player] iframe').count(), 1);
    assert.equal(await page.evaluate(() => (
      window.__shortPlayerBeforePopout === document.querySelector('[data-short-player] iframe')
      && window.__shortPlayerWindowBeforePopout === document.querySelector('[data-short-player] iframe').contentWindow
    )), true, 'Shorts pop-out must preserve the active iframe and its playback context');
    await page.locator('[data-popout-close]').click();
    assert.equal(await page.locator('[data-video-popout]').isHidden(), true);
    assert.equal(await page.locator('[data-video-popout] iframe').count(), 0);

    await page.evaluate(() => window.postMessage({
      type: 'neo-system-preferences',
      state: { theme: 'frost' },
      palette: { bg: '#f9f9f9', surface: '#ffffff', text: '#161616', muted: '#666666', line: '#dddddd', accent: '#065fd4' }
    }, location.origin));
    await page.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue('--desktop-bg').trim() === '#f9f9f9');
    assert.equal(await page.locator('html').getAttribute('data-neo-theme'), 'frost');

    await page.setViewportSize({ width: 680, height: 720 });
    assert.equal(await page.locator('.sidebar').isVisible(), false);
    await page.screenshot({ path: path.join(root, '.codex-tmp', 'youtube-lite-client.png'), fullPage: false });
    assert.deepEqual(pageErrors, []);
    await context.unroute('https://pipedapi.ducks.party/**');
    await context.unroute('https://api.piped.private.coffee/**');
    await context.route('https://pipedapi.ducks.party/**', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(catalogue)
    }));
    await context.route('https://api.piped.private.coffee/**', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(catalogue)
    }));
    const embeddedPage = await context.newPage();
    embeddedPage.on('pageerror', error => pageErrors.push(error.message));
    await embeddedPage.goto(`http://127.0.0.1:${port}/__srcdoc-test.html`);
    const embeddedSource = fs.readFileSync(path.join(root, 'neo-os/neo-youtube/index.html'), 'utf8');
    await embeddedPage.evaluate(({ source, base }) => {
      const frame = document.createElement('iframe');
      frame.style.cssText = 'width:100vw;height:100vh;border:0';
      frame.srcdoc = source.replace('<head>', `<head><base href="${base}">`);
      document.body.append(frame);
    }, { source: embeddedSource, base: `http://127.0.0.1:${port}/neo-os/neo-youtube/` });
    const embedded = embeddedPage.frames().find(frame => frame !== embeddedPage.mainFrame());
    await embedded.locator('[data-home-view]').waitFor({ state: 'visible' });
    await embedded.locator('[data-search-input]').fill('embedded history regression');
    await embedded.locator('[data-search-form]').evaluate(form => form.requestSubmit());
    await embedded.locator('.video-result').first().waitFor({ state: 'visible' });
    assert.equal(await embedded.evaluate(() => history.state.neoYouTubeRoute.q), 'embedded history regression');
    assert.equal(await embedded.evaluate(() => location.href), 'about:srcdoc');
    await embedded.locator('.video-result').first().click();
    await embedded.locator('[data-watch-view]').waitFor({ state: 'visible' });
    await embedded.evaluate(() => history.back());
    await embedded.locator('[data-results-view]').waitFor({ state: 'visible' });
    assert.equal(await embedded.evaluate(() => history.state.neoYouTubeRoute.q), 'embedded history regression');
    await embedded.evaluate(() => history.forward());
    await embedded.locator('[data-watch-view]').waitFor({ state: 'visible' });
    assert.deepEqual(pageErrors, [], 'srcdoc startup, search and Back must not throw security errors');
    await embeddedPage.close();
    console.log('YouTube client browser, playback, Shorts, theme, and responsive checks passed.');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
