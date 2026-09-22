const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE || '', '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright')
);

const launcherUrl = process.env.NEO_BROWSER_TEST_URL || 'http://127.0.0.1:3092/neo-os/nextnode-browser/launch.svg';
const destination = process.env.NEO_BROWSER_DESTINATION || 'https://example.com/';
const expected = new RegExp(process.env.NEO_BROWSER_EXPECTED || 'Example Domain', 'i');

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  try {
    await page.goto(launcherUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const shell = await page.waitForSelector('#neo-browser', { timeout: 60000 });
    let app = null;
    for (let attempt = 0; attempt < 100 && !app; attempt += 1) {
      app = await shell.contentFrame() || page.frames().find((candidate) => candidate.parentFrame() === page.mainFrame()) || null;
      if (!app) await page.waitForTimeout(100);
    }
    if (!app) {
      console.error('Launcher diagnostics:', await page.evaluate(() => ({
        text: document.documentElement.textContent?.slice(-1000) || '',
        iframe: document.getElementById('neo-browser')?.outerHTML || '',
      })));
      console.error(errors.join('\n'));
      throw new Error('The Browser launcher frame did not attach.');
    }
    await app.locator('#url').waitFor({ state: 'visible', timeout: 60000 });
    await app.waitForFunction(() => typeof proxyReady !== 'undefined' && proxyReady === true && typeof navigate === 'function', null, { timeout: 60000 });
    assert.equal(await app.locator('.nt-logo').textContent(), 'Browser');
    assert.equal(await app.locator('.nt-engine').count(), 0);
    assert.equal(await app.locator('#b-pop').isVisible(), false);
    assert.equal(await app.locator('#nt-grid .nt-tile:not(.add)').count(), 0);

    await app.locator('#url').fill(destination);
    await app.locator('#url').press('Enter');
    try {
      await app.waitForFunction((pattern) => {
        const frame = document.querySelector('#frames iframe');
        try { return new RegExp(pattern, 'i').test(frame?.contentDocument?.body?.innerText || ''); }
        catch { return false; }
      }, expected.source, { timeout: 90000 });
    } catch (error) {
      console.error('Navigation diagnostics:', await app.evaluate(async () => {
        const frame = document.querySelector('#frames iframe');
        let text = '';
        let href = '';
        try {
          text = frame?.contentDocument?.body?.innerText?.slice(0, 1000) || '';
          href = frame?.contentWindow?.location?.href || '';
        } catch {}
        return {
          address: document.getElementById('url')?.value || '',
          baseURI: document.baseURI,
          locationHref: location.href,
          transportPrefix: typeof TP === 'undefined' ? null : TP,
          proxyReady: typeof proxyReady === 'undefined' ? null : proxyReady,
          controllerReady: typeof sjController !== 'undefined' && Boolean(sjController),
          frameCount: document.querySelectorAll('#frames iframe').length,
          text,
          href,
          workers: 'serviceWorker' in navigator
            ? (await navigator.serviceWorker.getRegistrations()).map((entry) => ({ scope: entry.scope, state: entry.active?.state || '' }))
            : [],
        };
      }));
      console.error(errors.slice(-40).join('\n'));
      throw error;
    }

    const state = await app.evaluate(async () => {
      const frame = document.querySelector('#frames iframe');
      let text = '';
      try { text = frame?.contentDocument?.body?.innerText?.slice(0, 500) || ''; } catch {}
      return {
        engine: window.NEO_PROXY_ENGINE,
        text,
        workerScopes: (await navigator.serviceWorker.getRegistrations()).map((entry) => entry.scope),
      };
    });
    assert.equal(state.engine, 'Scramjet');
    assert.match(state.text, expected);
    assert.ok(state.workerScopes.some((scope) => scope.includes('/nextnode-browser/study/')));
    assert.equal(errors.some((message) => /proxy boot failed|proxy not ready/i.test(message)), false, errors.join('\n'));
    console.log(JSON.stringify({ launcherUrl, state, errors: errors.slice(-8) }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
