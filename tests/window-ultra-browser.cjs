const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));

const configuredUrl = process.env.NEO_PREVIEW_URL || 'http://127.0.0.1:3092';

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    const isLauncher = /\/launch\.svg(?:[?#]|$)/i.test(configuredUrl);
    await page.goto(isLauncher ? configuredUrl : configuredUrl + '/neo-os/');
    let shell = page;
    if (isLauncher) {
      await page.waitForSelector('#neo-os', { timeout: 60000 });
      for (let attempt = 0; attempt < 600; attempt += 1) {
        shell = page.frames().find((candidate) => candidate !== page.mainFrame() && candidate.url() === 'about:srcdoc') || null;
        if (shell && await shell.locator('[data-start-mode="laptop"]').count()) break;
        shell = null;
        await page.waitForTimeout(100);
      }
      assert.ok(shell, 'CDN launcher did not attach the NEO OS frame');
    }
    await shell.locator('[data-start-mode="laptop"]').click();
    await shell.locator('[data-neo-login-guest]').click();
    await shell.waitForFunction(() => Boolean(window.NEO_SHELL));
    await shell.evaluate(() => window.NEO_SHELL.openApp('control'));

    const win = shell.locator('.neo-window[data-app-id="control"]');
    await win.waitFor({ state: 'visible' });
    await shell.waitForTimeout(420);
    const state = await win.evaluate((node) => {
      const chrome = node.querySelector(':scope > .window-chrome');
      return {
        maximized: node.classList.contains('is-maximized'),
        style: document.documentElement.dataset.windowBarStyle,
        chromeHeight: chrome.getBoundingClientRect().height,
        topLeftRadius: getComputedStyle(node).borderTopLeftRadius,
        topRightRadius: getComputedStyle(node).borderTopRightRadius,
        right: node.getBoundingClientRect().right,
        viewportRight: innerWidth,
        fullscreenButtons: chrome.querySelectorAll('.window-control.fullscreen').length,
        controls: Array.from(chrome.querySelectorAll('[data-window-action]')).map((button) => button.getAttribute('data-window-action'))
      };
    });

    assert.equal(state.maximized, true);
    assert.equal(state.style, 'ultra');
    assert.equal(state.chromeHeight, 32);
    assert.equal(state.topLeftRadius, '0px');
    assert.equal(state.topRightRadius, '0px');
    assert.ok(Math.abs(state.right - state.viewportRight) <= 1, `Maximized app must meet the right edge: ${JSON.stringify(state)}`);
    assert.equal(state.fullscreenButtons, 0);
    assert.deepEqual(state.controls, ['minimize', 'maximize', 'close']);
    assert.equal(await win.locator('[data-window-bar-style-option="ultra"]').getAttribute('aria-pressed'), 'true');

    await win.locator('[data-window-action="maximize"]').click();
    await shell.waitForFunction(() => !document.querySelector('.neo-window[data-app-id="control"]').classList.contains('is-maximized'));
    const restoredUltraRadius = await win.evaluate((node) => getComputedStyle(node).borderTopRightRadius);
    assert.equal(restoredUltraRadius, '12px');

    await shell.evaluate(() => window.NEO_SHELL.setSetting('windowBarStyle', 'current'));
    await shell.waitForFunction(() => document.documentElement.dataset.windowBarStyle === 'current');
    const standardRadius = await win.evaluate((node) => getComputedStyle(node).borderTopRightRadius);
    assert.equal(standardRadius, '12px');

    await shell.evaluate(() => window.NEO_SHELL.setSetting('windowBarStyle', 'pill'));
    await shell.waitForFunction(() => document.documentElement.dataset.windowBarStyle === 'pill');
    const pillRadius = await win.evaluate((node) => getComputedStyle(node).borderTopRightRadius);
    assert.equal(pillRadius, '12px');

    await win.locator('[data-window-action="maximize"]').click();
    await shell.waitForFunction(() => document.querySelector('.neo-window[data-app-id="control"]').classList.contains('is-maximized'));
    const maximizedPillRadius = await win.evaluate((node) => getComputedStyle(node).borderTopRightRadius);
    assert.equal(maximizedPillRadius, '0px');
    console.log('Ultra, Standard, and Floating Pill windows are rounded when restored and square when maximized.');
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
