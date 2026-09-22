const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || '', '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright'));

const url = process.env.NEO_TASKBAR_CONTEXT_TEST_URL || 'http://127.0.0.1:3092/neo-os/?test=taskbar-context-logo-v1';

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1100, height: 720 } });
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    let scope = page;
    if (/\/launch\.svg(?:[?#]|$)/i.test(url)) {
      await page.waitForFunction(() => Array.from(document.querySelectorAll('iframe')).some(frame => {
        try { return Boolean(frame.contentDocument && frame.contentDocument.querySelector('#neo-desktop')); } catch (_error) { return false; }
      }));
      scope = page.frames().find(frame => frame !== page.mainFrame() && frame.url() === 'about:srcdoc');
      assert.ok(scope, 'The CDN launcher did not create its desktop frame');
    }
    await scope.waitForFunction(() => window.NEO_SHELL && document.documentElement.dataset.boot === 'complete');
    const start = scope.locator('#neo-start-screen');
    if (await start.isVisible()) await start.locator('[data-start-mode="laptop"]').click();
    const guest = scope.locator('[data-neo-login-guest]');
    if (await guest.isVisible()) await guest.click();

    await scope.evaluate(() => window.NEO_SHELL.setPinned('games', true));
    const button = scope.locator('.dock-button[data-app="games"]');
    await button.waitFor();
    await button.click({ button: 'right' });
    const menu = scope.locator('#neo-taskbar-menu');
    await menu.waitFor({ state: 'visible' });
    await scope.waitForTimeout(220);

    const geometry = await menu.evaluate(node => {
      const host = node.querySelector('.neo-taskbar-menu-app-icon');
      const art = host.querySelector('.dock-app-art');
      const image = host.querySelector('.app-image-icon');
      const box = element => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
      };
      return {
        host: box(host),
        art: box(art),
        image: box(image),
        fit: getComputedStyle(image).objectFit,
        position: getComputedStyle(image).objectPosition,
        overflow: getComputedStyle(art).overflow
      };
    });

    assert.equal(geometry.host.width, 30);
    assert.equal(geometry.host.height, 30);
    assert.equal(geometry.art.width, 24);
    assert.equal(geometry.art.height, 24);
    assert.equal(geometry.image.width, 24);
    assert.equal(geometry.image.height, 24);
    assert.equal(geometry.fit, 'contain');
    assert.equal(geometry.position, '50% 50%');
    assert.equal(geometry.overflow, 'hidden');
    assert.ok(Math.abs((geometry.host.left + 15) - (geometry.image.left + 12)) < 0.1, 'The right-click logo is not horizontally centered');
    assert.ok(Math.abs((geometry.host.top + 15) - (geometry.image.top + 12)) < 0.1, 'The right-click logo is not vertically centered');
  } finally {
    await browser.close();
  }
  console.log('Right-click app logos are contained, consistently sized, and centered.');
})().catch(error => { console.error(error); process.exitCode = 1; });
