const assert = require('node:assert/strict');
const path = require('node:path');

function playwrightRuntime() {
  try { return require('playwright'); } catch (_error) {}
  return require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || '', '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright'));
}

const { chromium } = playwrightRuntime();
const url = process.env.NEO_SETTINGS_FLOW_URL || 'http://127.0.0.1:3092/neo-os/?test=settings-flow-v1';

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1924, height: 1216 } });

  try {
    await page.addInitScript(() => {
      sessionStorage.setItem('neo_os_guest_session_v1', '1');
      localStorage.setItem('neo_os_start_mode_v1', 'laptop');
    });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(() => window.NEO_SHELL && document.documentElement.dataset.boot === 'complete', null, { timeout: 30000 });
    const start = page.locator('#neo-start-screen');
    if (await start.isVisible()) {
      await start.locator('[data-start-mode="laptop"]').click();
      await start.waitFor({ state: 'hidden' });
    }
    const guest = page.locator('[data-neo-login-guest]');
    if (await guest.isVisible()) await guest.click();

    await page.evaluate(() => window.NEO_SHELL.openApp('control'));
    const settings = page.locator('.neo-window[data-app-id="control"]');
    await settings.waitFor({ state: 'visible' });
    await settings.getByRole('heading', { name: 'Sound and display', exact: true }).waitFor();
    await settings.getByRole('heading', { name: 'Performance mode', exact: true }).waitFor();

    const search = settings.getByRole('searchbox', { name: 'Search settings' });
    await search.waitFor({ state: 'visible' });
    await search.fill('cursor');
    assert.equal(await settings.getByRole('heading', { name: 'Cursor', exact: true }).isVisible(), true);
    assert.equal(await settings.getByRole('heading', { name: 'Styles', exact: true }).isHidden(), true);
    assert.equal(await settings.locator('.taskbar-settings-only').isHidden(), true);
    await search.fill('a setting that does not exist');
    assert.equal(await settings.getByText('No settings found', { exact: true }).isVisible(), true);
    await search.press('Escape');
    assert.equal(await search.inputValue(), '');
    assert.equal(await settings.getByRole('heading', { name: 'Styles', exact: true }).isVisible(), true);
    await search.press('Control+f');
    assert.equal(await search.evaluate(input => document.activeElement === input), true);

    const geometry = await settings.evaluate(windowElement => {
      const center = windowElement.querySelector('.control-center');
      const heading = center.querySelector(':scope > .native-app-heading');
      const search = center.querySelector(':scope > .control-settings-search');
      const personalization = center.querySelector(':scope > .integrated-personalization-settings');
      const taskbar = center.querySelector(':scope > .taskbar-settings-only');
      const rect = element => {
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          left: box.left,
          right: box.right,
          top: box.top,
          bottom: box.bottom,
          width: box.width,
          display: style.display,
          float: style.float,
          marginLeft: style.marginLeft,
          marginRight: style.marginRight,
          position: style.position
        };
      };
      return {
        center: rect(center),
        heading: rect(heading),
        search: rect(search),
        personalization: rect(personalization),
        taskbar: rect(taskbar)
      };
    });

    const contentCenter = (geometry.heading.left + geometry.heading.right) / 2;
    const searchCenter = (geometry.search.left + geometry.search.right) / 2;
    const personalizationCenter = (geometry.personalization.left + geometry.personalization.right) / 2;
    const taskbarCenter = (geometry.taskbar.left + geometry.taskbar.right) / 2;
    assert.ok(Math.abs(searchCenter - contentCenter) <= 2, `Settings search must be centered: ${JSON.stringify(geometry)}`);
    assert.ok(Math.abs(personalizationCenter - contentCenter) <= 2, `Personalization settings must be centered: ${JSON.stringify(geometry)}`);
    assert.ok(Math.abs(taskbarCenter - contentCenter) <= 2, `Taskbar settings must be centered: ${JSON.stringify(geometry)}`);
    assert.ok(Math.abs(personalizationCenter - taskbarCenter) <= 1, `Settings panels must share one horizontal center: ${JSON.stringify(geometry)}`);
    assert.ok(geometry.taskbar.top >= geometry.personalization.bottom, `Settings panels must continue vertically in source order: ${JSON.stringify(geometry)}`);
    await settings.screenshot({ path: path.resolve(__dirname, '../.codex-tmp/settings-search.png') });
  } finally {
    await browser.close();
  }

  console.log('System Settings panels stay centered in one vertical flow.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
