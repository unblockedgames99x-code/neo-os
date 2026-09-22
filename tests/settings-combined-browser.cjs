const assert = require('node:assert/strict');
const path = require('node:path');

function playwrightRuntime() {
  try { return require('playwright'); } catch (_error) {}
  return require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || '', '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright'));
}
const { chromium } = playwrightRuntime();
const url = process.env.NEO_SETTINGS_TEST_URL || 'http://127.0.0.1:3092/neo-os/?test=settings-combined-v1';

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  try {
    await page.addInitScript(() => {
      if (window.top !== window) return;
      localStorage.removeItem('neo_os_desktop_shortcut_hidden_v1');
      localStorage.removeItem('neo_os_desktop_shortcuts_all_hidden_v1');
      sessionStorage.setItem('neo_os_guest_session_v1', '1');
    });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(() => window.NEO_SHELL || document.getElementById('neo-os')?.contentWindow?.NEO_SHELL, null, { timeout: 60000 });
    const outerFrame = await page.$('#neo-os');
    const desktop = outerFrame
      ? (await outerFrame.contentFrame()) || page.frames().find(frame => frame.parentFrame() === page.mainFrame())
      : page;
    assert.ok(desktop, 'NEO desktop frame did not initialize');
    await desktop.waitForFunction(() => window.NEO_SHELL && document.documentElement.dataset.boot === 'complete', null, { timeout: 30000 });
    const start = desktop.locator('#neo-start-screen');
    if (await start.isVisible()) {
      await start.locator('[data-start-mode="laptop"]').click();
      await start.waitFor({ state: 'hidden' });
    }
    const guest = desktop.locator('[data-neo-login-guest]');
    if (await guest.isVisible()) await guest.click();

    const state = await desktop.evaluate(() => ({
      ids: window.NEO_SHELL.getApps().map(app => app.id),
      controlShortcuts: document.querySelectorAll('[data-desktop-shortcut="control"]').length,
      personalizeShortcuts: document.querySelectorAll('[data-desktop-shortcut="personalize"]').length,
      controlLabel: document.querySelector('[data-desktop-shortcut="control"] .desktop-shortcut-label')?.textContent || ''
    }));
    assert.equal(state.ids.filter(id => id === 'control').length, 1);
    assert.equal(state.ids.includes('personalize'), false);
    assert.ok(state.controlShortcuts <= 1, 'System Settings desktop shortcut must not be duplicated');
    assert.equal(state.personalizeShortcuts, 0);
    if (state.controlShortcuts) assert.equal(state.controlLabel, 'System Settings');

    await desktop.evaluate(() => window.NEO_SHELL.openApp('personalize'));
    const settings = desktop.locator('.neo-window[data-app-id="control"]');
    await settings.waitFor({ state: 'visible' });
    assert.equal(await desktop.locator('.neo-window[data-app-id="personalize"]').count(), 0);
    await settings.getByRole('heading', { name: 'Styles', exact: true }).waitFor();
    await settings.getByRole('heading', { name: 'Cursor', exact: true }).waitFor();
    await settings.getByRole('heading', { name: 'Tab appearance', exact: true }).waitFor();
    await settings.getByRole('heading', { name: 'Performance mode', exact: true }).waitFor();
    assert.equal(await settings.locator('.integrated-personalization-settings').count(), 1);
    assert.equal(await settings.locator('.parity-settings-section').count(), 0);
  } finally {
    await browser.close();
  }
  console.log('One System Settings desktop icon opens the combined settings and personalization controls.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
