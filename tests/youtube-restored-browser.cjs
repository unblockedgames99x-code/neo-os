const assert = require('node:assert/strict');
const path = require('node:path');

function playwrightRuntime() {
  try { return require('playwright'); } catch (_error) {}
  return require(process.env.NEO_PLAYWRIGHT_PATH || path.join(
    process.env.USERPROFILE || '',
    '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright'
  ));
}

const { chromium } = playwrightRuntime();
const url = process.env.NEO_YOUTUBE_RESTORED_URL || 'http://127.0.0.1:3098/neo-os/?test=youtube-restored-v1';

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1180, height: 760 } });
  try {
    await page.addInitScript(() => {
      sessionStorage.setItem('neo_os_guest_session_v1', '1');
      localStorage.setItem('neo_os_installed_apps_v1', JSON.stringify(['browser', 'chat', 'games']));
      localStorage.setItem('neo_os_remove_youtube_app_v1', '1');
      localStorage.setItem('neo_os_focused_app_catalog_v1', '1');
      localStorage.setItem('neo_os_restore_youtube_app_v3', '1');
      localStorage.removeItem('neo_os_restore_youtube_app_v4');
    });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => window.NEO_SHELL && document.documentElement.dataset.boot === 'complete', null, { timeout: 30000 });
    const start = page.locator('#neo-start-screen');
    if (await start.isVisible()) {
      await start.locator('[data-start-mode="laptop"]').click();
      await start.waitFor({ state: 'hidden' });
    }
    const guest = page.locator('[data-neo-login-guest]');
    if (await guest.isVisible()) await guest.click();
    await page.waitForFunction(() => document.getElementById('neo-login-gate')?.hidden);

    assert.equal(await page.evaluate(() => window.NEO_SHELL.isInstalled('youtube-app')), true);
    await page.locator('.taskbar-start-button[data-open-launcher]').click();
    const launcher = page.locator('#app-launcher.is-open');
    await launcher.waitFor({ state: 'visible' });
    await launcher.locator('.launcher-search input').fill('youtube');
    const tile = launcher.locator('.launcher-app[data-app="youtube-app"]');
    await tile.waitFor({ state: 'visible' });
    assert.equal(await tile.locator(':scope > span:last-child').textContent(), 'YouTube');
    assert.equal(await tile.locator('.app-icon-youtube img').count(), 1);
    await tile.click();

    const appFrame = page.locator('.neo-window[data-app-id="youtube-app"] iframe');
    await appFrame.waitFor({ state: 'visible' });
    await page.waitForFunction(() => {
      const frame = document.querySelector('.neo-window[data-app-id="youtube-app"] iframe');
      return Boolean(frame?.contentDocument?.querySelector('[data-search-form]'));
    });
    const surface = await appFrame.evaluate(frame => {
      const doc = frame.contentDocument;
      return {
        shorts: Boolean(doc.querySelector('[data-view="shorts"]')),
        popout: Boolean(doc.querySelector('[data-popout-video]')),
        accountUi: /sign in|create account|manage account/i.test(doc.body.textContent || '')
      };
    });
    assert.equal(surface.shorts, true);
    assert.equal(surface.popout, true);
    assert.equal(surface.accountUi, false);
    console.log('YouTube is restored to search with account-free UI, Shorts, and pop-out controls.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
