const assert = require('node:assert/strict');
const path = require('node:path');

function playwrightRuntime() {
  try { return require('playwright'); } catch (_error) {}
  return require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || '', '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright'));
}

const { chromium } = playwrightRuntime();
const url = process.env.NEO_PC_REMOTE_TEST_URL || 'http://127.0.0.1:3092/neo-os/?test=pc-remote-nowgg-v1';

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });

  async function desktopSurface() {
    await page.waitForFunction(() => window.NEO_SHELL || document.getElementById('neo-os')?.contentWindow?.NEO_SHELL, null, { timeout: 60000 });
    const outer = await page.$('#neo-os');
    const desktop = outer ? (await outer.contentFrame()) || page.frames().find(frame => frame.parentFrame() === page.mainFrame()) : page;
    assert.ok(desktop, 'NEO desktop frame did not initialize');
    await desktop.waitForFunction(() => window.NEO_SHELL && document.documentElement.dataset.boot === 'complete', null, { timeout: 30000 });
    const start = desktop.locator('#neo-start-screen');
    if (await start.isVisible()) {
      await start.locator('[data-start-mode="laptop"]').click();
      await start.waitFor({ state: 'hidden' });
    }
    const guest = desktop.locator('[data-neo-login-guest]');
    if (await guest.isVisible()) await guest.click();
    return desktop;
  }

  try {
    await page.addInitScript(() => {
      sessionStorage.setItem('neo_os_guest_session_v1', '1');
      localStorage.setItem('neo_os_installed_apps_v1', JSON.stringify(['browser', 'zones']));
      localStorage.removeItem('neo_os_nowgg_app_v2');
      localStorage.removeItem('neo_os_remove_pc_remote_v1');
    });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
    const desktop = await desktopSurface();
    const records = await desktop.evaluate(() => window.NEO_SHELL.getApps().filter(app => app.id === 'pc-remote' || app.id === 'nowgg'));
    assert.deepEqual(records.map(app => app.id), ['nowgg']);
    assert.ok(records[0].installed, 'nowgg was not installed for an existing desktop');
    assert.equal(await desktop.evaluate(() => JSON.parse(localStorage.getItem('neo_os_installed_apps_v1') || '[]').includes('pc-remote')), false);

    const nowgg = records.find(app => app.id === 'nowgg');
    assert.match(nowgg.subtitle, /NEO relay/);
    await desktop.evaluate(() => window.NEO_SHELL.openApp('nowgg'));
    const nowggWindow = desktop.locator('.neo-window[data-app-id="nowgg"]');
    await nowggWindow.waitFor({ state: 'visible' });
    const nowggRoute = await nowggWindow.locator('iframe').evaluate(frame => frame.dataset.route || frame.getAttribute('src') || '');
    assert.match(nowggRoute, /neo-app-mode=1/);
    assert.match(nowggRoute, /neo-app-target=https%3A%2F%2Fnowgg\.fun%2F/);

  } finally {
    await browser.close();
  }

  console.log('PC Remote removal and nowgg.fun relay route browser checks passed.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
