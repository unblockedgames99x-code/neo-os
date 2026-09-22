const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE || '', '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright')
);

const launcherUrl = process.env.NEO_BROWSER_TEST_URL || 'http://127.0.0.1:3092/neo-os/nextnode-browser/launch.svg';
const destination = 'https://www.staticquasar931.com/gm3z/sl0pe';

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const failures = [];
  page.on('requestfailed', request => failures.push({ url: request.url(), error: request.failure()?.errorText || '' }));
  page.on('response', response => {
    if (response.status() >= 400) failures.push({ url: response.url(), error: `HTTP ${response.status()}` });
  });

  try {
    await page.goto(launcherUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    let app = null;
    await page.waitForFunction(() => {
      const shell = document.getElementById('neo-os')?.contentWindow || window;
      return Boolean(document.getElementById('neo-browser')) || Boolean(shell.NEO_SHELL);
    }, null, { timeout: 60000 });
    let launcherFrame = await page.$('#neo-browser');
    if (!launcherFrame) {
      await page.waitForFunction(() => {
        const shell = document.getElementById('neo-os')?.contentWindow || window;
        return shell.NEO_SHELL && shell.document.documentElement.dataset.boot === 'complete';
      }, null, { timeout: 60000 });
      const outer = await page.$('#neo-os');
      if (outer) {
        await page.evaluate(() => document.getElementById('neo-os').contentWindow.NEO_SHELL.openApp('browser'));
        await page.waitForFunction(() => Boolean(document.getElementById('neo-os')?.contentDocument?.querySelector('.neo-window[data-app-id="browser"] iframe')), null, { timeout: 30000 });
        const handle = (await page.evaluateHandle(() => document.getElementById('neo-os').contentDocument.querySelector('.neo-window[data-app-id="browser"] iframe'))).asElement();
        app = await handle.contentFrame();
      } else {
        await page.evaluate(() => window.NEO_SHELL.openApp('browser'));
        const handle = await page.waitForSelector('.neo-window[data-app-id="browser"] iframe', { timeout: 30000 });
        app = await handle.contentFrame();
      }
      if (app && (/\/launch\.svg(?:[?#]|$)/i.test(app.url()) || await app.locator('#neo-browser').count())) {
        launcherFrame = await app.waitForSelector('#neo-browser', { timeout: 60000 });
      }
    }
    if (launcherFrame) {
      for (let attempt = 0; attempt < 600 && (!app || !await app.locator('#url').count()); attempt += 1) {
        const direct = await launcherFrame.contentFrame();
        if (direct && await direct.locator('#url').count()) app = direct;
        if (!app || !await app.locator('#url').count()) {
          for (const candidate of page.frames()) {
            if (await candidate.locator('#url').count()) {
              app = candidate;
              break;
            }
          }
        }
        if (!app || !await app.locator('#url').count()) await page.waitForTimeout(100);
      }
    }
    assert.ok(app, 'Browser app did not attach');
    await app.locator('#url').waitFor({ state: 'visible', timeout: 60000 });
    await app.waitForFunction(() => typeof proxyReady !== 'undefined' && proxyReady === true, null, { timeout: 60000 });
    await app.locator('#url').fill(destination);
    await app.locator('#url').press('Enter');
    await app.waitForFunction(() => {
      const outer = document.querySelector('#frames iframe');
      try {
        const game = outer?.contentDocument?.querySelector('iframe[data-neo-google-sites-game="ready"]');
        const gameDoc = game?.contentDocument;
        return /staticquasar931\.github\.io%2Fslope/i.test(game?.src || '')
          && /Slope/i.test(gameDoc?.title || '')
          && Boolean(gameDoc?.querySelector('canvas, #gameContainer, #unity-container, [id*="unity" i]'));
      } catch {
        return false;
      }
    }, null, { timeout: 60000 });

    const state = await app.evaluate(() => {
      const site = document.querySelector('#frames iframe');
      const game = site?.contentDocument?.querySelector('iframe[data-neo-google-sites-game="ready"]');
      return {
        siteTitle: site?.contentDocument?.title || '',
        gameTitle: game?.contentDocument?.title || '',
        gameUrl: game?.src || '',
        canvasCount: game?.contentDocument?.querySelectorAll('canvas').length || 0,
        gameContainer: Boolean(game?.contentDocument?.querySelector('#gameContainer, #unity-container, [id*="unity" i]')),
        gameText: game?.contentDocument?.body?.innerText?.slice(0, 500) || '',
        ids: Array.from(game?.contentDocument?.querySelectorAll('[id]') || [], element => element.id).slice(0, 30),
      };
    });
    assert.match(state.siteTitle, /StaticQuasar931.*SL0PE/i);
    assert.match(state.gameTitle, /Slope/i);
    assert.match(state.gameUrl, /\/study\/uv\/[^/]+\/[^/]+\/https%3A%2F%2Fstaticquasar931\.github\.io%2Fslope%2F/i);
    assert.ok(state.canvasCount > 0 || state.gameContainer, `The proxied Slope game shell did not render: ${JSON.stringify(state)}`);
    assert.equal(failures.some(entry => entry.error === 'HTTP 500' && /staticquasar931\.github\.io/i.test(entry.url)), false, JSON.stringify(failures));

    const leakedOriginLink = await app.evaluate(() => {
      const site = document.querySelector('#frames iframe');
      const link = site.contentDocument.createElement('a');
      link.id = 'neo-same-origin-google-sites-link-test';
      link.href = `${site.contentWindow.location.origin}/gm3z/escape-road-3`;
      link.textContent = 'Escape Road 3 through leaked proxy origin';
      site.contentDocument.body.append(link);
      const result = { attribute: link.getAttribute('href'), href: link.href };
      link.click();
      return result;
    });
    await page.waitForTimeout(1000);
    const leakedOriginState = await app.evaluate(() => {
      const site = document.querySelector('#frames iframe');
      return {
        title: site?.contentDocument?.title || '',
        text: site?.contentDocument?.body?.innerText?.slice(0, 500) || '',
        href: site?.contentWindow?.location?.href || '',
      };
    });
    assert.doesNotMatch(leakedOriginState.text, /attempted to fetch from same origin/i);
    assert.equal(failures.some(entry => entry.error === 'HTTP 500' && /gm3z%2Fescape-road-3|gm3z\/escape-road-3/i.test(entry.url)), false, JSON.stringify(failures));

    const malformedLink = await app.evaluate(() => {
      const site = document.querySelector('#frames iframe');
      const link = site.contentDocument.createElement('a');
      link.id = 'neo-malformed-google-sites-link-test';
      link.setAttribute('href', 'https\\:/www.staticquasar931.com/gm3z/escape-road-3');
      link.textContent = 'Escape Road 3';
      site.contentDocument.body.append(link);
      const result = { attribute: link.getAttribute('href'), href: link.href };
      link.click();
      return result;
    });
    try {
      await app.waitForFunction(() => {
        const site = document.querySelector('#frames iframe');
        return /Escape Road 3/i.test(site?.contentDocument?.title || '');
      }, null, { timeout: 15000 });
    } catch (error) {
      console.error(JSON.stringify({ malformedLink, failures: failures.slice(-20), current: await app.evaluate(() => {
        const site = document.querySelector('#frames iframe');
        return { title: site?.contentDocument?.title || '', address: document.getElementById('url')?.value || '', src: site?.src || '', href: site?.contentWindow?.location?.href || '' };
      }) }, null, 2));
      throw error;
    }
    const clickedState = await app.evaluate(() => {
      const site = document.querySelector('#frames iframe');
      return {
        title: site?.contentDocument?.title || '',
        address: document.getElementById('url')?.value || '',
        frameUrl: site?.src || '',
        href: site?.contentWindow?.location?.href || '',
      };
    });
    assert.equal(failures.some(entry => /Couldn't find the requested file|HTTP 404/.test(entry.error) && /escape-road-3/i.test(entry.url)), false, JSON.stringify(failures));
    assert.match(clickedState.title, /Escape Road 3/i);
    assert.match(clickedState.href, /https%3A%2F%2Fwww\.staticquasar931\.com%2Fgm3z%2Fescape-road-3/i);
    console.log(JSON.stringify({ state, leakedOriginLink, leakedOriginState, clickedState }));
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
