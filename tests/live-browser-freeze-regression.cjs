const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
);

const liveUrl = process.env.NEO_CDN_LIVE_URL;
if (!liveUrl) throw new Error('NEO_CDN_LIVE_URL is required.');

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  const browserMessages = [];
  page.on('console', (message) => {
    const text = message.text();
    if (/NEO|scramjet|worker transport|libcurl|service worker/i.test(text)) {
      browserMessages.push(`${message.type()}: ${text}`);
    }
  });
  page.on('pageerror', (error) => browserMessages.push(`pageerror: ${error.message}`));
  await page.addInitScript(() => {
    window.__neoFreezeLongTasks = [];
    new PerformanceObserver((list) => {
      for (const item of list.getEntries()) window.__neoFreezeLongTasks.push(item.duration);
    }).observe({ type: 'longtask', buffered: true });
  });

  function desktopEvaluate(callback, argument) {
    return page.locator('#neo-os').evaluate((frame, payload) => callback(frame.contentWindow, payload), argument);
  }

  try {
    await page.goto(liveUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(() => document.getElementById('neo-os')?.contentWindow?.NEO_SHELL, null, { timeout: 120000 });
    await page.locator('#neo-os').evaluate((frame) => frame.contentDocument.querySelector('[data-start-mode="laptop"]')?.click());
    await page.waitForFunction(() => document.getElementById('neo-os')?.contentDocument?.querySelector('[data-neo-login-guest]'));
    await page.locator('#neo-os').evaluate((frame) => frame.contentDocument.querySelector('[data-neo-login-guest]').click());
    await page.waitForFunction(() => {
      const doc = document.getElementById('neo-os')?.contentDocument;
      return Boolean(doc?.getElementById('neo-login-gate')?.hidden && !doc?.getElementById('neo-desktop')?.inert);
    });

    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.NEO_CPU_RATE || 6) });

    await page.locator('#neo-os').evaluate((frame) => frame.contentWindow.NEO_SHELL.openApp('browser'));
    try {
      await page.waitForFunction(() => {
        const doc = document.getElementById('neo-os')?.contentDocument;
        const wrapper = doc?.querySelector('.neo-window[data-app-id="browser"] iframe');
        const app = wrapper?.contentDocument?.getElementById('neo-browser')?.contentDocument || wrapper?.contentDocument;
        return Boolean(app?.getElementById('url'));
      }, null, { timeout: 20000 });
    } catch (error) {
      const diagnostic = await page.locator('#neo-os').evaluate((frame) => {
        const appFrame = frame.contentDocument.querySelector('.neo-window[data-app-id="browser"] iframe');
        let content = null;
        try { content = appFrame?.contentDocument; } catch {}
        const nestedFrame = content?.getElementById('neo-browser');
        let nested = null;
        try { nested = nestedFrame?.contentDocument; } catch {}
        return {
          windowFound: Boolean(appFrame),
          src: appFrame?.getAttribute('src') || '',
          srcdocLength: String(appFrame?.getAttribute('srcdoc') || '').length,
          loadedDocument: Boolean(content),
          title: content?.title || '',
          text: String(content?.body?.textContent || '').slice(0, 240),
          nestedFrame: Boolean(nestedFrame),
          nestedTitle: nested?.title || '',
          nestedText: String(nested?.body?.textContent || '').slice(0, 240),
        };
      });
      throw new Error(`${error.message}\n${JSON.stringify(diagnostic, null, 2)}`);
    }
    await page.waitForTimeout(4000);
    const blankState = await page.locator('#neo-os').evaluate((frame) => {
      const wrapper = frame.contentDocument.querySelector('.neo-window[data-app-id="browser"] iframe');
      const app = wrapper.contentDocument?.getElementById('neo-browser')?.contentWindow || wrapper.contentWindow;
      const engineResources = app.performance.getEntriesByType('resource')
        .map((entry) => entry.name)
        .filter((url) => /curl\/index\.mjs|libcurl-0\.7\.4\.wasm/i.test(url));
      return {
        engineResources,
        longestTask: Math.max(0, ...(app.__neoFreezeLongTasks || [])),
        heap: app.performance.memory?.usedJSHeapSize || null,
      };
    });
    assert.deepEqual(blankState.engineResources, [], 'Blank browser eagerly loaded a heavy network engine.');
    assert.ok(blankState.longestTask < 1200, `Blank browser blocked for ${blankState.longestTask}ms.`);

    await page.locator('#neo-os').evaluate((frame) => {
      frame.contentDocument.querySelector('.neo-window[data-app-id="browser"] [data-window-action="close"]').click();
    });
    await page.waitForFunction(() => !document.getElementById('neo-os')?.contentDocument?.querySelector('.neo-window[data-app-id="browser"]'));

    await page.locator('#neo-os').evaluate((frame) => {
      const shell = frame.contentWindow.NEO_SHELL;
      if (!shell.isInstalled('youtube-app')) shell.setInstalled('youtube-app', true);
      shell.openApp('youtube-app');
    });
    await page.waitForFunction(() => {
      const doc = document.getElementById('neo-os')?.contentDocument;
      const wrapper = doc?.querySelector('.neo-window[data-app-id="youtube-app"] iframe');
      return Boolean(wrapper?.contentDocument?.querySelector('[data-neo-app="youtube"] [data-search-form]'));
    }, null, { timeout: Number(process.env.NEO_YOUTUBE_TIMEOUT_MS || 30000) });
    await page.waitForTimeout(1200);

    const youtubeState = await page.locator('#neo-os').evaluate((frame) => {
      const wrapper = frame.contentDocument.querySelector('.neo-window[data-app-id="youtube-app"] iframe');
      const app = wrapper.contentWindow;
      return {
        appType: app.document.documentElement.dataset.neoApp || '',
        route: wrapper.dataset.route || wrapper.getAttribute('src') || '',
        hasSearch: Boolean(app.document.querySelector('[data-search-form]')),
        hasShorts: Boolean(app.document.querySelector('[data-shorts-view]')),
        loadedHeavyProxyRuntime: app.performance.getEntriesByType('resource')
          .some((entry) => /scramjet|baremux|curl\/index\.mjs|wasm/i.test(entry.name)),
        longestTask: Math.max(0, ...(app.__neoFreezeLongTasks || [])),
        heap: app.performance.memory?.usedJSHeapSize || null,
      };
    });
    assert.equal(youtubeState.appType, 'youtube');
    assert.equal(youtubeState.hasSearch, true);
    assert.equal(youtubeState.hasShorts, true);
    assert.equal(youtubeState.loadedHeavyProxyRuntime, false, 'YouTube loaded the heavy proxy runtime.');
    assert.match(youtubeState.route, /neo-youtube\/index\.html/);
    assert.ok(youtubeState.longestTask < 1200, `YouTube blocked for ${youtubeState.longestTask}ms.`);

    await page.locator('#neo-os').evaluate((frame) => {
      frame.contentDocument.querySelector('.neo-window[data-app-id="youtube-app"] [data-window-action="close"]').click();
    });
    await page.waitForFunction(() => !document.getElementById('neo-os')?.contentDocument?.querySelector('.neo-window[data-app-id="youtube-app"]'));

    console.log(JSON.stringify({ blankState, youtubeState }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
