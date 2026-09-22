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
const url = process.env.NEO_XENO_TEST_URL || 'http://127.0.0.1:3092/neo-os/?test=xeno-taskbar-v1';

async function focusDesktop(page) {
  await page.evaluate(() => {
    const active = document.activeElement;
    if (active && typeof active.blur === 'function') active.blur();
    document.body.focus();
  });
}

async function openCtrlMenu(page) {
  await focusDesktop(page);
  await page.keyboard.down('Control');
  await page.keyboard.up('Control');
  await page.locator('#xeno-command-center[data-mode="apps"].is-open').waitFor({ state: 'visible', timeout: 5000 });
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await page.addInitScript(() => {
      sessionStorage.setItem('neo_os_guest_session_v1', '1');
      if (!sessionStorage.getItem('neo_xeno_test_seeded_v1')) {
        sessionStorage.setItem('neo_xeno_test_seeded_v1', '1');
        localStorage.setItem('neo_os_settings_v1', JSON.stringify({
          designVersion: 23,
          interfaceStyle: 'modern',
          taskbarPosition: 'left',
          taskbarStyle: 'xeno',
          taskbarRunningApps: false,
          taskbarAppNames: false,
          reduceMotion: false,
        }));
      }
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
    await page.waitForTimeout(260);

    const emptyState = await page.evaluate(() => {
      const taskbar = document.querySelector('.taskbar');
      const workspace = document.querySelector('.window-layer').getBoundingClientRect();
      return {
        style: document.documentElement.dataset.taskbarStyle,
        dockItems: document.querySelectorAll('#neo-dock .dock-button').length,
        taskbarDisplay: getComputedStyle(taskbar).display,
        workspace: { left: workspace.left, right: workspace.right, width: workspace.width },
        viewportWidth: innerWidth,
      };
    });
    assert.equal(emptyState.style, 'xeno');
    assert.equal(emptyState.dockItems, 0);
    assert.equal(emptyState.taskbarDisplay, 'none');
    assert.ok(Math.abs(emptyState.workspace.left) <= 1 && Math.abs(emptyState.workspace.right - emptyState.viewportWidth) <= 1, JSON.stringify(emptyState));

    await page.evaluate(() => {
      window.NEO_SHELL.openApp('browser');
      window.NEO_SHELL.openApp('control');
    });
    await page.waitForFunction(() => document.querySelectorAll('#neo-dock .dock-button:not(.is-leaving)').length === 2);
    await page.waitForTimeout(240);

    const runningState = await page.evaluate(() => {
      const taskbar = document.querySelector('.taskbar');
      const dock = document.querySelector('#neo-dock');
      const taskbarRect = taskbar.getBoundingClientRect();
      return {
        labels: [...dock.querySelectorAll('.dock-app-name')].map((node) => node.textContent.trim()),
        labelWidths: [...dock.querySelectorAll('.dock-app-name')].map((node) => node.getBoundingClientRect().width),
        active: dock.querySelector('.dock-button.is-active')?.dataset.app || '',
        icons: [...dock.querySelectorAll('.dock-button')].every((button) => Boolean(button.querySelector('img, svg'))),
        direction: getComputedStyle(dock).flexDirection,
        center: taskbarRect.left + taskbarRect.width / 2,
        bottomGap: innerHeight - taskbarRect.bottom,
        taskbarStart: getComputedStyle(document.querySelector('.taskbar-start-button')).display,
        taskbarTray: getComputedStyle(document.querySelector('.taskbar-tray')).display,
        viewportCenter: innerWidth / 2,
      };
    });
    assert.deepEqual(new Set(runningState.labels), new Set(['Browser', 'System Settings']));
    assert.ok(runningState.labelWidths.every((width) => width > 20), JSON.stringify(runningState));
    assert.equal(runningState.active, 'control');
    assert.equal(runningState.icons, true);
    assert.equal(runningState.direction, 'row');
    assert.ok(Math.abs(runningState.center - runningState.viewportCenter) <= 1, JSON.stringify(runningState));
    assert.ok(runningState.bottomGap >= 10 && runningState.bottomGap <= 24, JSON.stringify(runningState));
    assert.equal(runningState.taskbarStart, 'none');
    assert.equal(runningState.taskbarTray, 'none');

    const settingsWindow = page.locator('.neo-window[data-app-id="control"]');
    await settingsWindow.locator('[data-window-action="minimize"]').click();
    await settingsWindow.waitFor({ state: 'hidden' });
    assert.equal(await page.locator('#neo-dock [data-app="control"]').count(), 1);
    assert.equal(await page.locator('#neo-dock [data-app="control"]').evaluate((node) => node.classList.contains('is-minimized')), true);
    await page.locator('#neo-dock [data-app="control"]').click();
    await settingsWindow.waitFor({ state: 'visible' });
    assert.equal(await page.locator('#neo-dock [data-app="control"]').evaluate((node) => node.classList.contains('is-active')), true);

    await page.locator('#neo-dock [data-app="browser"]').click();
    await page.waitForFunction(() => document.querySelector('.neo-window[data-app-id="browser"]')?.classList.contains('is-active'));
    await page.locator('.neo-window[data-app-id="browser"] [data-window-action="close"]').click();
    await page.waitForFunction(() => !document.querySelector('#neo-dock [data-app="browser"]:not(.is-leaving)'));
    await page.waitForTimeout(220);
    assert.equal(await page.locator('#neo-dock .dock-button').count(), 1);

    await settingsWindow.locator('[data-window-action="minimize"]').click();
    await settingsWindow.waitFor({ state: 'hidden' });
    await focusDesktop(page);
    await page.keyboard.press('Space');
    const searchPanel = page.locator('#xeno-command-center[data-mode="search"].is-open');
    await searchPanel.waitFor({ state: 'visible' });
    await page.locator('#xeno-command-search').fill('taskbar');
    const settingsResult = page.locator('#xeno-command-results [data-app="control"]');
    await settingsResult.waitFor({ state: 'visible' });
    assert.match(await settingsResult.innerText(), /System Settings[\s\S]*Styles, themes, sound, performance and taskbar/);
    await page.locator('#xeno-command-search').press('Enter');
    await searchPanel.waitFor({ state: 'hidden' });
    await settingsWindow.waitFor({ state: 'visible' });

    await openCtrlMenu(page);
    const openMotion = await page.locator('#xeno-command-center').evaluate((node) => ({
      panel: getComputedStyle(node).animationName,
      search: getComputedStyle(node.querySelector('.xeno-command-searchbar')).animationName,
      results: getComputedStyle(node.querySelector('.xeno-command-results')).animationName,
    }));
    assert.match(openMotion.panel, /xeno-command-open/);
    assert.match(openMotion.search, /xeno-command-content-in/);
    assert.match(openMotion.results, /xeno-command-content-in/);
    await page.waitForFunction(() => !document.querySelector('#xeno-command-center')?.classList.contains('is-opening'));
    const searchChrome = await page.locator('.xeno-command-searchbar').evaluate((node) => {
      const input = node.querySelector('input');
      const icon = node.querySelector('.icon');
      const key = node.querySelector('kbd');
      const barRect = node.getBoundingClientRect();
      const inputRect = input.getBoundingClientRect();
      const iconRect = icon.getBoundingClientRect();
      const keyRect = key.getBoundingClientRect();
      const style = getComputedStyle(node);
      const inputStyle = getComputedStyle(input);
      return {
        height: barRect.height,
        radius: parseFloat(style.borderRadius),
        inputBackground: inputStyle.backgroundColor,
        inputBorderWidth: inputStyle.borderTopWidth,
        inputShadow: inputStyle.boxShadow,
        centers: [barRect.top + barRect.height / 2, inputRect.top + inputRect.height / 2, iconRect.top + iconRect.height / 2, keyRect.top + keyRect.height / 2],
      };
    });
    assert.ok(searchChrome.height >= 50 && searchChrome.height <= 54, JSON.stringify(searchChrome));
    assert.ok(searchChrome.radius >= 10, JSON.stringify(searchChrome));
    assert.equal(searchChrome.inputBackground, 'rgba(0, 0, 0, 0)', 'XENO search input must not draw a second rectangular surface');
    assert.equal(searchChrome.inputBorderWidth, '0px');
    assert.equal(searchChrome.inputShadow, 'none');
    searchChrome.centers.slice(1).forEach((center) => assert.ok(Math.abs(center - searchChrome.centers[0]) <= 1, JSON.stringify(searchChrome)));
    await page.locator('.xeno-command-searchbar').screenshot({ path: '.codex-tmp/xeno-search-clean.png' });
    const menuStats = await page.evaluate(() => ({
      groups: document.querySelectorAll('#xeno-command-results .xeno-command-group').length,
      items: document.querySelectorAll('#xeno-command-results [data-xeno-command-item]').length,
      registry: window.NEO_SHELL.getApps().length,
    }));
    assert.ok(menuStats.groups >= 3, JSON.stringify(menuStats));
    assert.equal(menuStats.items, menuStats.registry, JSON.stringify(menuStats));
    await page.keyboard.press('Escape');
    const closeMotion = await page.locator('#xeno-command-center').evaluate((node) => ({
      closing: node.classList.contains('is-closing'),
      animation: getComputedStyle(node).animationName,
    }));
    assert.equal(closeMotion.closing, true);
    assert.match(closeMotion.animation, /xeno-command-close/);
    await page.locator('#xeno-command-center').waitFor({ state: 'hidden' });

    await focusDesktop(page);
    await page.keyboard.down('Control');
    await page.keyboard.press('c');
    await page.keyboard.up('Control');
    await page.waitForTimeout(80);
    assert.equal(await page.locator('#xeno-command-center.is-open').count(), 0, 'Ctrl+C must not open the XENO app menu');

    await settingsWindow.focus();
    await page.keyboard.press('Space');
    await page.waitForTimeout(80);
    assert.equal(await page.locator('#xeno-command-center.is-open').count(), 0, 'Space inside an application must not open search');

    for (const style of ['modern', 'retro', 'windows11', 'kali']) {
      await page.evaluate((value) => window.NEO_SHELL.setSetting('interfaceStyle', value), style);
      await openCtrlMenu(page);
      const panel = await page.locator('#xeno-command-center').evaluate((node) => {
        const rect = node.getBoundingClientRect();
        const computed = getComputedStyle(node);
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, background: computed.backgroundColor, border: computed.borderTopColor };
      });
      assert.ok(panel.left >= 0 && panel.right <= 1440 && panel.top >= 0 && panel.bottom <= 900, `${style}: ${JSON.stringify(panel)}`);
      assert.notEqual(panel.background, 'rgba(0, 0, 0, 0)', `${style} panel must have a themed surface`);
      await page.keyboard.press('Escape');
    }

    await page.evaluate(() => {
      window.NEO_SHELL.setSetting('taskbarRunningApps', true);
      window.NEO_SHELL.setSetting('taskbarStyle', 'current');
    });
    await page.waitForFunction(() => document.documentElement.dataset.taskbarStyle === 'current' && document.querySelectorAll('#neo-dock .dock-button:not(.is-leaving)').length > 1);
    assert.notEqual(await page.locator('.taskbar-start-button').evaluate((node) => getComputedStyle(node).display), 'none');

    await page.evaluate(() => window.NEO_SHELL.setSetting('taskbarStyle', 'xeno'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.NEO_SHELL && document.documentElement.dataset.boot === 'complete' && document.documentElement.dataset.taskbarStyle === 'xeno', null, { timeout: 30000 });
    assert.equal(await page.evaluate(() => window.NEO_SHELL.getSetting('taskbarStyle')), 'xeno');

    await page.evaluate(() => {
      window.NEO_SHELL.openApp('browser');
      window.NEO_SHELL.openApp('control');
      window.NEO_SHELL.setSetting('reduceMotion', true);
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(240);
    await openCtrlMenu(page);
    const compact = await page.evaluate(() => {
      const panel = document.querySelector('#xeno-command-center').getBoundingClientRect();
      const taskbar = document.querySelector('.taskbar').getBoundingClientRect();
      const panelStyle = getComputedStyle(document.querySelector('#xeno-command-center'));
      return {
        panel: { left: panel.left, right: panel.right, top: panel.top, bottom: panel.bottom },
        taskbar: { left: taskbar.left, right: taskbar.right },
        transition: panelStyle.transitionDuration,
      };
    });
    assert.ok(compact.panel.left >= 0 && compact.panel.right <= 390 && compact.panel.top >= 0 && compact.panel.bottom <= 844, JSON.stringify(compact));
    assert.ok(compact.taskbar.left >= 0 && compact.taskbar.right <= 390, JSON.stringify(compact));
    assert.match(compact.transition, /(^|,\s*)0s/);

    console.log('XENO taskbar browser checks passed across lifecycle, shortcuts, themes, persistence, and narrow screens.');
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
