const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
);

const url = process.argv[2];
if (!url) throw new Error('Pass the NEO OS URL to test.');

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(() => Boolean(window.NEO_SHELL || document.getElementById('neo-os')?.contentWindow?.NEO_SHELL));

    await page.evaluate(() => {
      const doc = document.getElementById('neo-os')?.contentDocument || document;
      doc.querySelector('[data-start-mode="laptop"]')?.click();
    });
    await page.waitForFunction(() => {
      const doc = document.getElementById('neo-os')?.contentDocument || document;
      return Boolean(doc.querySelector('[data-neo-login-guest]'));
    });
    await page.evaluate(() => {
      const doc = document.getElementById('neo-os')?.contentDocument || document;
      doc.querySelector('[data-neo-login-guest]').click();
    });
    await page.waitForFunction(() => {
      const doc = document.getElementById('neo-os')?.contentDocument || document;
      return doc.getElementById('neo-login-gate')?.hidden === true &&
        doc.documentElement.dataset.universalLoading !== 'true' &&
        doc.documentElement.dataset.boot === 'complete';
    });

    await page.evaluate(() => {
      const outer = document.getElementById('neo-os');
      const view = outer?.contentWindow || window;
      view.__neoInteractionProbe = [];
      view.addEventListener('neo-window-interaction', (event) => view.__neoInteractionProbe.push(event.detail?.active));
      view.NEO_SHELL.openApp('control');
    });
    await page.waitForFunction(() => {
      const doc = document.getElementById('neo-os')?.contentDocument || document;
      const win = doc.querySelector('.neo-window[data-app-id="control"]');
      return Boolean(win && !win.classList.contains('is-opening'));
    });
    const geometry = await page.evaluate(() => {
      const outer = document.getElementById('neo-os');
      const doc = outer?.contentDocument || document;
      const win = doc.querySelector('.neo-window[data-app-id="control"]');
      const chrome = win.querySelector('.window-title');
      const outerRect = outer?.getBoundingClientRect() || { left: 0, top: 0 };
      const chromeRect = chrome.getBoundingClientRect();
      const winRect = win.getBoundingClientRect();
      return {
        x: outerRect.left + chromeRect.left + Math.min(40, chromeRect.width / 2),
        y: outerRect.top + chromeRect.top + chromeRect.height / 2,
        left: winRect.left,
        top: winRect.top,
      };
    });

    await page.mouse.move(geometry.x, geometry.y);
    await page.mouse.down();
    const active = await page.evaluate((point) => {
      const outer = document.getElementById('neo-os');
      const doc = outer?.contentDocument || document;
      const view = outer?.contentWindow || window;
      const outerRect = outer?.getBoundingClientRect() || { left: 0, top: 0 };
      const target = doc.elementFromPoint(point.x - outerRect.left, point.y - outerRect.top);
      return {
        root: doc.documentElement.classList.contains('is-window-interacting'),
        wallpaper: view.NEOWallpaperEngine?.getState().mediaPriorityPaused,
        target: target?.className || target?.tagName || '',
      };
    }, geometry);
    assert.equal(active.root, true, JSON.stringify(active));
    assert.equal(active.wallpaper, true, JSON.stringify(active));

    await page.mouse.move(geometry.x + 180, geometry.y + 110, { steps: 18 });
    await page.mouse.up();
    await page.waitForTimeout(100);

    const finished = await page.evaluate(() => {
      const outer = document.getElementById('neo-os');
      const doc = outer?.contentDocument || document;
      const view = outer?.contentWindow || window;
      const win = doc.querySelector('.neo-window[data-app-id="control"]');
      const rect = win.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        root: doc.documentElement.classList.contains('is-window-interacting'),
        wallpaper: view.NEOWallpaperEngine?.getState().mediaPriorityPaused,
        events: view.__neoInteractionProbe,
      };
    });
    assert.ok(finished.left - geometry.left >= 120 && finished.top - geometry.top >= 70);
    assert.equal(finished.root, false);
    assert.equal(finished.wallpaper, false);
    assert.deepEqual(finished.events, [true, false]);
    console.log('Window interaction browser checks passed.');
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
