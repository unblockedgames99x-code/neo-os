const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE || '', '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright')
);

const url = process.env.NEO_TASKBAR_OVERLAY_URL || 'http://127.0.0.1:3097/neo-os/?test=taskbar-desktop-only-v2';

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 760 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('neo_device_mode_v1', 'laptop');
    localStorage.setItem('neo_os_settings_v1', JSON.stringify({
      designVersion: 30,
      taskbarPosition: 'bottom',
      taskbarStyle: 'current',
      taskbarAppMode: 'always',
      reduceMotion: false,
    }));
  });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    let shell = page;
    if (/\/launch\.svg(?:[?#]|$)/i.test(url)) {
      await page.waitForSelector('#neo-os', { state: 'attached', timeout: 60000 });
      shell = null;
      for (let attempt = 0; attempt < 120; attempt += 1) {
        shell = page.frames().find((frame) => frame !== page.mainFrame() && frame.url() === 'about:srcdoc') || null;
        if (shell) break;
        await page.waitForTimeout(250);
      }
      assert.ok(shell, 'published launcher should attach the NEO OS frame');
    }
    await shell.waitForFunction(() => window.NEO_SHELL && document.documentElement.dataset.boot === 'complete', null, { timeout: 60000 });
    const start = shell.locator('#neo-start-screen');
    if (await start.isVisible()) await start.locator('[data-start-mode="laptop"]').click();
    const guest = shell.locator('[data-neo-login-guest]');
    if (await guest.isVisible()) await guest.click();

    assert.equal(await shell.locator('[data-setting="taskbarAppMode"]').count(), 0, 'The removed setting is still rendered');
    assert.equal(await shell.evaluate(() => window.NEO_SHELL.getSetting('taskbarAppMode')), 'desktop');
    assert.equal(await shell.evaluate(() => document.documentElement.dataset.taskbarAppState), 'desktop');

    await shell.evaluate(() => window.NEO_SHELL.openApp('stream'));
    await shell.waitForFunction(() => document.documentElement.dataset.taskbarAppState === 'hidden');
    await shell.waitForFunction(() => getComputedStyle(document.querySelector('.taskbar')).opacity === '0');
    await shell.waitForFunction(() => !document.querySelector('.neo-window[data-app-id="stream"]')?.classList.contains('is-opening'));
    const open = await shell.evaluate(() => {
      const bar = document.querySelector('.taskbar');
      return {
        opacity: getComputedStyle(bar).opacity,
        pointerEvents: getComputedStyle(bar).pointerEvents,
        ariaHidden: bar.getAttribute('aria-hidden'),
      };
    });
    assert.equal(open.opacity, '0');
    assert.equal(open.pointerEvents, 'none');
    assert.equal(open.ariaHidden, 'true');
    const topbar = await shell.evaluate(() => {
      const bar = document.querySelector('.topbar');
      return {
        opacity: getComputedStyle(bar).opacity,
        pointerEvents: getComputedStyle(bar).pointerEvents,
        ariaHidden: bar.getAttribute('aria-hidden'),
      };
    });
    assert.equal(topbar.opacity, '0');
    assert.equal(topbar.pointerEvents, 'none');
    assert.equal(topbar.ariaHidden, 'true');
    const maximized = await shell.evaluate(() => {
      const win = document.querySelector('.neo-window[data-app-id="stream"]');
      const rect = win.getBoundingClientRect();
      return {
        isMaximized: win.classList.contains('is-maximized'),
        top: Math.round(rect.top),
        right: Math.round(rect.right),
        bottom: Math.round(rect.bottom),
        left: Math.round(rect.left),
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      };
    });
    assert.equal(maximized.isMaximized, true);
    assert.deepEqual(
      [maximized.top, maximized.right, maximized.bottom, maximized.left],
      [0, maximized.viewportWidth, maximized.viewportHeight, 0],
      'A maximized app still leaves a wallpaper seam around the viewport'
    );

    await shell.locator('.neo-window[data-app-id="stream"] [data-window-action="maximize"]').click();
    await shell.waitForFunction(() => document.documentElement.dataset.taskbarAppState === 'desktop');
    await shell.waitForFunction(() => getComputedStyle(document.querySelector('.taskbar')).opacity === '1');
    const restored = await shell.evaluate(() => {
      const win = document.querySelector('.neo-window[data-app-id="stream"]');
      const bar = document.querySelector('.taskbar');
      return {
        maximized: win.classList.contains('is-maximized'),
        opacity: getComputedStyle(bar).opacity,
        pointerEvents: getComputedStyle(bar).pointerEvents,
        ariaHidden: bar.getAttribute('aria-hidden'),
      };
    });
    assert.equal(restored.maximized, false);
    assert.equal(restored.opacity, '1');
    assert.notEqual(restored.pointerEvents, 'none');
    assert.equal(restored.ariaHidden, 'false');

    await shell.locator('.neo-window[data-app-id="stream"] [data-window-action="minimize"]').click();
    await shell.waitForFunction(() => document.documentElement.dataset.taskbarAppState === 'desktop');
    assert.equal(await shell.locator('.taskbar').getAttribute('aria-hidden'), 'false');

    await shell.evaluate(() => window.NEO_SHELL.openApp('stream'));
    await shell.waitForFunction(() => document.documentElement.dataset.taskbarAppState === 'desktop');
    assert.equal(await shell.locator('.taskbar').getAttribute('aria-hidden'), 'false');

    await shell.locator('.neo-window[data-app-id="stream"] [data-window-action="maximize"]').click();
    await shell.waitForFunction(() => document.documentElement.dataset.taskbarAppState === 'hidden');
    assert.equal(await shell.evaluate(() => document.documentElement.dataset.taskbarAppState), 'hidden');

    await shell.locator('.neo-window[data-app-id="stream"] [data-window-action="close"]').click();
    await shell.waitForFunction(() => !document.querySelector('.neo-window[data-app-id="stream"]'));
    await shell.waitForFunction(() => document.documentElement.dataset.taskbarAppState === 'desktop');
    assert.equal(await shell.locator('.taskbar').getAttribute('aria-hidden'), 'false');

    console.log('Taskbar stays visible for normal/minimized apps and hides only for fullscreen apps.');
  } finally {
    await context.close();
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
