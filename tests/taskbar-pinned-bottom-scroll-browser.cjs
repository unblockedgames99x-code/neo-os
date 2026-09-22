const assert = require('node:assert/strict');
const path = require('node:path');

function playwrightRuntime() {
  try { return require('playwright'); } catch (_error) {}
  return require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || '', '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright'));
}

const { chromium } = playwrightRuntime();
const target = process.env.NEO_TASKBAR_SCROLL_URL || 'http://127.0.0.1:3092/neo-os/?test=pinned-bottom-scroll-v1';

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  try {
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.setItem('neo_os_guest_session_v1', '1');
      sessionStorage.setItem('neo_os_booted_session', '1');
    });
    await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(() => window.NEO_SHELL && document.documentElement.dataset.boot === 'complete', null, { timeout: 30000 });
    const start = page.locator('#neo-start-screen');
    if (await start.isVisible()) await start.locator('[data-start-mode="laptop"]').click();
    const guest = page.locator('[data-neo-login-guest]');
    if (await guest.isVisible()) await guest.click();
    await page.waitForFunction(() => document.getElementById('neo-login-gate')?.hidden);

    const startup = await page.evaluate(() => {
      const apps = window.NEO_SHELL.getApps();
      return {
        installed: apps.filter((app) => app.installed).map((app) => app.id),
        pinned: apps.filter((app) => app.installed && app.pinned).map((app) => app.id),
        visible: Array.from(document.querySelectorAll('#neo-dock .dock-button:not(.is-leaving)'), (button) => button.dataset.app)
      };
    });
    assert.deepEqual(new Set(startup.visible), new Set(startup.pinned));
    assert.ok(startup.pinned.length > 0, 'the normal starter pins should remain');
    assert.ok(startup.pinned.length < startup.installed.length, 'the taskbar must not start with every app pinned');

    await page.evaluate(() => {
      window.NEO_SHELL.setSetting('taskbarPosition', 'bottom');
      window.NEO_SHELL.getApps().filter((app) => app.installed).forEach((app) => window.NEO_SHELL.setPinned(app.id, true));
    });
    await page.waitForFunction(() => {
      const dock = document.getElementById('neo-dock');
      return document.documentElement.dataset.taskbarPosition === 'bottom' && dock.scrollWidth > dock.clientWidth + 100;
    });

    const before = await page.locator('#neo-dock').evaluate((dock) => ({
      left: dock.scrollLeft,
      scrollWidth: dock.scrollWidth,
      clientWidth: dock.clientWidth,
      overflowX: getComputedStyle(dock).overflowX,
      touchAction: getComputedStyle(dock).touchAction
    }));
    assert.equal(before.left, 0);
    assert.equal(before.overflowX, 'auto');
    assert.equal(before.touchAction, 'pan-x');
    await page.locator('#neo-dock').evaluate((dock) => {
      dock.dispatchEvent(new WheelEvent('wheel', { deltaY: 480, bubbles: true, cancelable: true }));
    });
    await page.waitForFunction(() => document.getElementById('neo-dock').scrollLeft > 100);
    const after = await page.locator('#neo-dock').evaluate((dock) => dock.scrollLeft);
    assert.ok(after > before.left, 'a normal mouse wheel should scroll the bottom taskbar horizontally');

    console.log(JSON.stringify({ startupPins: startup.pinned, installedCount: startup.installed.length, scrollBefore: before.left, scrollAfter: Math.round(after) }));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
