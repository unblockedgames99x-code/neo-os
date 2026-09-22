const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE || '', '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright')
);

const shellUrl = process.env.NEO_SHELL_TEST_URL || 'http://127.0.0.1:3092/neo-os/';
const destination = process.env.NEO_BROWSER_DESTINATION || 'https://example.com/';
const expected = new RegExp(process.env.NEO_BROWSER_EXPECTED || 'Example Domain', 'i');

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
  });
  const page = await context.newPage();
  if (process.env.NEO_SITE_BYPASS_TOKEN) {
    const siteOrigin = new URL(shellUrl).origin;
    await page.route(`${siteOrigin}/**`, (route) => route.continue({
      headers: {
        ...route.request().headers(),
        'OAI-Sites-Authorization': `Bearer ${process.env.NEO_SITE_BYPASS_TOKEN}`,
      },
    }));
  }
  const messages = [];
  const failures = [];
  page.on('console', (message) => {
    if (message.type() === 'error') messages.push(message.text());
  });
  page.on('pageerror', (error) => messages.push(`pageerror: ${error.stack || error.message}`));
  page.on('requestfailed', (request) => failures.push(`${request.url()}: ${request.failure()?.errorText || 'failed'}`));

  try {
    await page.goto(shellUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => {
      const shell = document.getElementById('neo-os')?.contentWindow || window;
      return shell.NEO_SHELL && shell.document.documentElement.dataset.boot === 'complete';
    }, null, { timeout: 60000 });
    const outerHandle = await page.$('#neo-os');
    const started = Date.now();
    let handle;
    if (outerHandle) {
      await page.evaluate(() => document.getElementById('neo-os').contentWindow.NEO_SHELL.openApp('browser'));
      await page.waitForFunction(() => Boolean(document.getElementById('neo-os')?.contentDocument?.querySelector('.neo-window[data-app-id="browser"] iframe')), null, { timeout: 30000 });
      handle = (await page.evaluateHandle(() => document.getElementById('neo-os').contentDocument.querySelector('.neo-window[data-app-id="browser"] iframe'))).asElement();
    } else {
      await page.evaluate(() => window.NEO_SHELL.openApp('browser'));
      handle = await page.waitForSelector('.neo-window[data-app-id="browser"] iframe', { timeout: 30000 });
    }
    let app = await handle.contentFrame();
    if (!app) throw new Error('The NEO Browser frame did not attach.');
    if (/\/launch\.svg(?:[?#]|$)/i.test(app.url()) || await app.locator('#neo-browser').count()) {
      const launcherFrame = await app.waitForSelector('#neo-browser', { timeout: 60000 });
      let launchedApp = null;
      for (let attempt = 0; attempt < 600 && !launchedApp; attempt += 1) {
        const direct = await launcherFrame.contentFrame();
        const candidates = direct ? [direct, ...page.frames()] : page.frames();
        for (const candidate of candidates) {
          if (await candidate.locator('#url').count()) {
            launchedApp = candidate;
            break;
          }
        }
        if (!launchedApp) await page.waitForTimeout(100);
      }
      if (!launchedApp) {
        const srcdocFrame = page.frames().find((frame) => frame.url() === 'about:srcdoc');
        console.error('Hosted Browser launcher diagnostics:', {
          parentUrl: app.url(),
          launcher: await launcherFrame.evaluate((element) => element.outerHTML),
          frames: page.frames().map((frame) => frame.url()),
          srcdoc: srcdocFrame ? await srcdocFrame.evaluate(() => ({
            contentType: document.contentType,
            root: document.documentElement?.outerHTML?.slice(0, 1200) || '',
            bodyText: document.body?.innerText?.slice(0, 500) || '',
          })).catch((error) => ({ error: error.message })) : null,
          consoleErrors: messages.slice(-30),
        });
        throw new Error('The hosted Browser launcher frame did not attach.');
      }
      app = launchedApp;
    }
    try {
      await app.locator('#url').waitFor({ state: 'visible', timeout: Number(process.env.NEO_BROWSER_READY_TIMEOUT || 60000) });
    } catch (error) {
      console.error('Hosted Browser visibility diagnostics:', {
        frameUrl: app.url(),
        launcherRect: await handle.boundingBox(),
        browserRect: await app.frameElement().then((element) => element.boundingBox()).catch(() => null),
        layout: await app.evaluate(() => ({
          viewport: [innerWidth, innerHeight],
          body: document.body ? getComputedStyle(document.body).cssText : null,
          app: document.querySelector('.app')?.getBoundingClientRect().toJSON() || null,
          chrome: document.querySelector('.chrome')?.getBoundingClientRect().toJSON() || null,
          url: document.getElementById('url')?.getBoundingClientRect().toJSON() || null,
        })).catch((layoutError) => ({ error: layoutError.message })),
        consoleErrors: messages.slice(-30),
      });
      throw error;
    }
    await app.waitForFunction(() => typeof proxyBoot !== 'undefined' && typeof navigate === 'function', null, { timeout: 60000 });
    const shellReadyMs = Date.now() - started;
    await app.locator('#url').fill(destination);
    await app.locator('#url').press('Enter');
    try {
      await app.waitForFunction((pattern) => {
        const frame = document.querySelector('#frames iframe');
        let text = '';
        try { text = frame?.contentDocument?.body?.innerText || ''; } catch {}
        return new RegExp(pattern, 'i').test(text);
      }, expected.source, { timeout: 90000 });
    } catch (error) {
      console.error('NextNode diagnostics:', await app.evaluate(async () => {
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
          bodyText: document.body.innerText.slice(-1000),
          workers: (await navigator.serviceWorker.getRegistrations()).map((entry) => ({ scope: entry.scope, active: entry.active?.state || '' })),
        };
      }));
      console.error('Console:', messages.slice(-30));
      console.error('Failed requests:', failures.slice(-30));
      throw error;
    }

    const state = await app.evaluate((pattern) => {
      const frame = document.querySelector('#frames iframe');
      let text = '';
      let title = '';
      try {
        text = frame?.contentDocument?.body?.innerText?.slice(0, 500) || '';
        title = frame?.contentDocument?.title || '';
      } catch {}
      return {
        address: document.getElementById('url')?.value || '',
        frameCount: document.querySelectorAll('#frames iframe').length,
        text,
        title,
        matched: new RegExp(pattern, 'i').test(frame?.contentDocument?.body?.innerText || ''),
        workerScopes: [],
      };
    }, expected.source);
    state.workerScopes = await app.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).map((entry) => entry.scope));
    assert.equal(state.matched, true, `Expected ${expected} in the proxied page.`);
    assert.ok(state.frameCount >= 1, 'The upstream browser did not create its proxied page frame.');
    assert.ok(state.workerScopes.some((scope) => /\/(?:nextnode-browser\/)?study\//.test(scope)), 'The full proxy service worker was not active.');
    assert.equal(messages.some((message) => /SERUM_WISP|cross-origin frame/i.test(message)), false, messages.join('\n'));
    console.log(JSON.stringify({ shellReadyMs, state, consoleErrors: messages.slice(-8), requestFailures: failures.slice(-8) }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
