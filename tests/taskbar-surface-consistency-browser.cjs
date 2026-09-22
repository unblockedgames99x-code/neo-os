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
const url = process.env.NEO_TASKBAR_CONSISTENCY_URL || 'http://127.0.0.1:3092/neo-os/?test=taskbar-surface-consistency-v1';

async function materialState(page) {
  return page.evaluate(() => {
    function read(node) {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return {
        width: rect.width,
        height: rect.height,
        backgroundColor: style.backgroundColor,
        backgroundImage: style.backgroundImage,
        borderColor: style.borderColor,
        borderRadius: style.borderRadius,
        borderWidth: style.borderWidth,
        boxShadow: style.boxShadow,
      };
    }
    return {
      launcher: read(document.querySelector('.taskbar-start-button')),
      app: read(document.querySelector('#neo-dock .dock-button')),
    };
  });
}

async function browserIconState(page) {
  return page.evaluate(() => {
    const button = document.querySelector('#neo-dock .dock-button[data-app="browser"]');
    const art = button && button.querySelector('.dock-app-art');
    const image = art && art.querySelector('.app-image-icon');
    function size(node) {
      const rect = node.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }
    return { art: size(art), image: size(image) };
  });
}

async function runningIndicatorAlignment(page) {
  return page.evaluate(() => Array.from(document.querySelectorAll('#neo-dock .dock-button.is-running')).map((button) => {
    const art = button.querySelector('.dock-app-art');
    const buttonRect = button.getBoundingClientRect();
    const artRect = art.getBoundingClientRect();
    const buttonStyle = getComputedStyle(button);
    const marker = getComputedStyle(button, '::after');
    const matrix = marker.transform === 'none' ? null : new DOMMatrixReadOnly(marker.transform);
    const markerCenter = buttonRect.left + parseFloat(buttonStyle.borderLeftWidth) + parseFloat(marker.left) + (matrix ? matrix.m41 : 0) + parseFloat(marker.width) / 2;
    const artCenter = artRect.left + artRect.width / 2;
    return { app: button.dataset.app, markerCenter, artCenter, delta: Math.abs(markerCenter - artCenter) };
  }));
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  try {
    await page.addInitScript(() => {
      sessionStorage.setItem('neo_os_guest_session_v1', '1');
      localStorage.setItem('neo_os_settings_v1', JSON.stringify({
        designVersion: 23,
        interfaceStyle: 'modern',
        taskbarPosition: 'bottom',
        taskbarStyle: 'current',
        taskbarSurface: 'glass',
        taskbarRunningApps: true,
        taskbarAppNames: false,
      }));
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
    await page.evaluate(() => window.NEO_SHELL.openApp('browser'));
    await page.locator('#neo-dock .dock-button').first().waitFor({ state: 'visible' });
    await page.evaluate(() => window.NEO_SHELL.openApp('control'));
    await page.locator('#neo-dock .dock-button[data-app="control"]').waitFor({ state: 'visible' });

    const browserIcon = await browserIconState(page);
    assert.deepEqual(browserIcon.art, { width: 24, height: 24 }, 'Browser artwork uses the optically balanced dock size');
    assert.deepEqual(browserIcon.image, { width: 24, height: 24 }, 'Browser image stays inside the balanced artwork bounds');
    for (const alignment of await runningIndicatorAlignment(page)) {
      assert.ok(alignment.delta <= 0.5, `Unnamed ${alignment.app} marker must be centered under its artwork: ${JSON.stringify(alignment)}`);
    }

    for (const surface of ['glass', 'solid', 'gradient']) {
      await page.evaluate((value) => window.NEO_SHELL.setSetting('taskbarSurface', value), surface);
      await page.waitForFunction((value) => document.documentElement.dataset.taskbarSurface === value, surface);
      const state = await materialState(page);
      assert.equal(state.launcher.width, state.app.width, `${surface}: launcher and app widths must match`);
      assert.equal(state.launcher.height, state.app.height, `${surface}: launcher and app heights must match`);
      assert.equal(state.launcher.backgroundColor, state.app.backgroundColor, `${surface}: background colors must match`);
      assert.equal(state.launcher.backgroundImage, state.app.backgroundImage, `${surface}: background layers must match`);
      assert.equal(state.launcher.borderColor, state.app.borderColor, `${surface}: borders must match`);
      assert.equal(state.launcher.borderRadius, state.app.borderRadius, `${surface}: corner radii must match`);
      assert.equal(state.launcher.borderWidth, state.app.borderWidth, `${surface}: border widths must match`);
      assert.equal(state.launcher.boxShadow, state.app.boxShadow, `${surface}: depth must match`);
      assert.equal(state.launcher.backgroundImage, 'none', `${surface}: Floating launcher must be uncaged`);
      assert.equal(state.app.backgroundImage, 'none', `${surface}: unnamed Floating app must be uncaged`);
    }

    for (const interfaceStyle of ['modern', 'retro', 'windows11', 'kali']) {
      await page.evaluate((value) => window.NEO_SHELL.setSetting('interfaceStyle', value), interfaceStyle);
      await page.waitForFunction((value) => document.documentElement.dataset.interfaceStyle === value, interfaceStyle);
      const state = await materialState(page);
      assert.equal(state.launcher.backgroundImage, 'none', `${interfaceStyle}: Floating launcher must be uncaged`);
      assert.equal(state.app.backgroundImage, 'none', `${interfaceStyle}: unnamed Floating app must be uncaged`);
    }
    await page.evaluate(() => window.NEO_SHELL.setSetting('interfaceStyle', 'modern'));
    await page.waitForFunction(() => document.documentElement.dataset.interfaceStyle === 'modern');

    await page.evaluate(() => window.NEO_SHELL.setSetting('taskbarAppNames', true));
    await page.waitForFunction(() => document.documentElement.dataset.taskbarAppNames === 'true');
    const named = await materialState(page);
    assert.equal(named.launcher.backgroundImage, 'none', 'Floating launcher stays uncaged when names are enabled');
    assert.notEqual(named.app.backgroundColor, 'rgba(0, 0, 0, 0)', 'Named Floating apps use a subtle grouping pill');
    assert.ok(named.app.width > named.launcher.width, 'Named Floating apps make room for their label');
    for (const alignment of await runningIndicatorAlignment(page)) {
      assert.ok(alignment.delta <= 0.5, `Named ${alignment.app} marker must be centered under its artwork: ${JSON.stringify(alignment)}`);
    }
    await page.locator('#neo-dock .dock-button[data-app="browser"]').screenshot({ path: '.codex-tmp/taskbar-browser-icon-balanced.png' });

    await page.evaluate(() => window.NEO_SHELL.setSetting('taskbarAppNames', false));
    await page.waitForFunction(() => document.documentElement.dataset.taskbarAppNames === 'false');

    await page.evaluate(() => window.NEO_SHELL.setSetting('taskbarStyle', 'transparent'));
    await page.waitForFunction(() => document.documentElement.dataset.taskbarStyle === 'transparent');
    const transparent = await materialState(page);
    assert.equal(transparent.launcher.backgroundImage, transparent.app.backgroundImage);
    assert.equal(transparent.launcher.borderRadius, transparent.app.borderRadius);

    await page.evaluate(() => window.NEO_SHELL.setSetting('taskbarStyle', 'current'));
    await page.waitForFunction(() => document.documentElement.dataset.taskbarStyle === 'current');
    await page.screenshot({ path: '.codex-tmp/taskbar-floating-uncaged.png' });
    await page.locator('.taskbar').screenshot({ path: '.codex-tmp/taskbar-floating-uncaged-crop.png' });
    console.log('Floating taskbar icons are uncaged; named apps keep a subtle grouping pill.');
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
