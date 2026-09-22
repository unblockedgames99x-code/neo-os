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
const url = process.env.NEO_TRANSPARENT_RAIL_URL || 'http://127.0.0.1:3092/neo-os/?test=transparent-rail-v1';

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
        designVersion: 28,
        interfaceStyle: 'windows11',
        taskbarPosition: 'bottom',
        taskbarStyle: 'transparent',
        taskbarSurface: 'glass',
        taskbarRunningApps: true,
        taskbarAppNames: true,
      }));
    });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const shellDeadline = Date.now() + 60000;
    let surface = null;
    while (!surface && Date.now() < shellDeadline) {
      for (const candidate of page.frames()) {
        const ready = await candidate.evaluate(() => Boolean(window.NEO_SHELL && document.documentElement.dataset.boot === 'complete')).catch(() => false);
        if (ready) {
          surface = candidate;
          break;
        }
      }
      if (!surface) await page.waitForTimeout(250);
    }
    assert.ok(surface, `NEO shell did not boot at ${url}`);
    const start = surface.locator('#neo-start-screen');
    if (await start.isVisible()) {
      await start.locator('[data-start-mode="laptop"]').click();
      await start.waitFor({ state: 'hidden' });
    }
    const guest = surface.locator('[data-neo-login-guest]');
    if (await guest.isVisible()) await guest.click();
    await surface.evaluate(() => {
      window.NEO_SHELL.openApp('browser');
      window.NEO_SHELL.openApp('control');
      window.NEO_SHELL.openApp('games');
    });
    await surface.locator('#neo-dock .dock-button').first().waitFor({ state: 'visible' });
    await surface.locator('#neo-dock .dock-button img').first().evaluate(image => image.decode());
    await page.waitForTimeout(500);

    const state = await surface.evaluate(() => {
      const taskbar = document.querySelector('.taskbar');
      const center = document.querySelector('.taskbar-center');
      const dock = document.querySelector('#neo-dock');
      const startButton = document.querySelector('.taskbar-start-button');
      const firstApp = document.querySelector('#neo-dock .dock-button');
      const rail = taskbar.getBoundingClientRect();
      const launcher = startButton.getBoundingClientRect();
      const app = firstApp.getBoundingClientRect();
      const railStyle = getComputedStyle(taskbar);
      const railGlassStyle = getComputedStyle(taskbar, '::before');
      const launcherStyle = getComputedStyle(startButton);
      const appStyle = getComputedStyle(firstApp);
      const art = firstApp.querySelector('.dock-app-art');
      const artRect = art?.getBoundingClientRect();
      const artStyle = art ? getComputedStyle(art) : null;
      const image = art?.querySelector('img');
      const imageStyle = image ? getComputedStyle(image) : null;
      const imageRect = image?.getBoundingClientRect();
      return {
        settingPosition: window.NEO_SHELL.getSetting('taskbarPosition'),
        settingNames: window.NEO_SHELL.getSetting('taskbarAppNames'),
        dataPosition: document.documentElement.dataset.taskbarPosition,
        direction: getComputedStyle(document.querySelector('#neo-dock')).flexDirection,
        rail: { left: rail.left, top: rail.top, width: rail.width, height: rail.height, centerY: rail.top + rail.height / 2 },
        launcherTop: launcher.top,
        appTop: app.top,
        railBackground: railGlassStyle.backgroundImage + ' ' + railGlassStyle.backgroundColor,
        railBorder: railGlassStyle.borderTopWidth,
        railRadius: parseFloat(railStyle.borderRadius),
        railBlur: railGlassStyle.backdropFilter || railGlassStyle.webkitBackdropFilter,
        launcherBackground: launcherStyle.backgroundColor,
        appBackground: appStyle.backgroundColor,
        launcherBorder: launcherStyle.borderTopColor,
        appBorder: appStyle.borderTopColor,
        appOpacity: appStyle.opacity,
        appVisibility: appStyle.visibility,
        appZIndex: appStyle.zIndex,
        art: artRect ? { left: artRect.left, top: artRect.top, width: artRect.width, height: artRect.height } : null,
        artOpacity: artStyle?.opacity || '',
        artVisibility: artStyle?.visibility || '',
        artDisplay: artStyle?.display || '',
        artColor: artStyle?.color || '',
        image: image ? {
          src: image.currentSrc || image.src,
          complete: image.complete,
          naturalWidth: image.naturalWidth,
          rect: imageRect ? { left: imageRect.left, top: imageRect.top, width: imageRect.width, height: imageRect.height } : null,
          opacity: imageStyle.opacity,
          visibility: imageStyle.visibility,
          display: imageStyle.display,
          transform: imageStyle.transform,
          filter: imageStyle.filter,
          clipPath: imageStyle.clipPath,
          maskImage: imageStyle.maskImage,
          mixBlendMode: imageStyle.mixBlendMode,
          objectFit: imageStyle.objectFit,
        } : null,
        center: Object.assign({ rect: center.getBoundingClientRect().toJSON() }, ['display', 'visibility', 'opacity', 'transform', 'filter', 'clipPath', 'overflow', 'zIndex'].reduce((result, key) => (result[key] = getComputedStyle(center)[key], result), {})),
        dock: Object.assign({ rect: dock.getBoundingClientRect().toJSON() }, ['display', 'visibility', 'opacity', 'transform', 'filter', 'clipPath', 'overflow'].reduce((result, key) => (result[key] = getComputedStyle(dock)[key], result), {})),
        visibleNames: [...document.querySelectorAll('#neo-dock .dock-app-name')].filter(node => getComputedStyle(node).display !== 'none').length,
      };
    });

    assert.equal(state.settingPosition, 'left');
    assert.equal(state.dataPosition, 'left');
    assert.equal(state.settingNames, false);
    assert.equal(state.direction, 'column');
    assert.ok(state.rail.width >= 62 && state.rail.width <= 70, JSON.stringify(state));
    assert.ok(state.rail.height > state.rail.width * 2, JSON.stringify(state));
    assert.ok(state.center.rect.width >= 50, JSON.stringify(state));
    assert.ok(state.dock.rect.width >= 48, JSON.stringify(state));
    assert.ok(state.rail.left >= 10 && state.rail.left <= 22, JSON.stringify(state));
    assert.ok(Math.abs(state.rail.centerY - 384) <= 1, JSON.stringify(state));
    assert.ok(state.launcherTop > state.appTop, 'Launcher must sit at the bottom of the vertical rail');
    assert.match(state.railBackground, /gradient|rgba?\(/i);
    assert.equal(state.railBorder, '1px');
    assert.ok(state.railRadius >= 16);
    assert.match(state.railBlur, /blur\(/);
    assert.equal(state.launcherBackground, 'rgba(0, 0, 0, 0)');
    assert.equal(state.appBackground, 'rgba(0, 0, 0, 0)');
    assert.equal(state.launcherBorder, 'rgba(0, 0, 0, 0)');
    assert.equal(state.appBorder, 'rgba(0, 0, 0, 0)');
    assert.equal(state.visibleNames, 0);
    assert.equal(state.appOpacity, '1');
    assert.equal(state.appVisibility, 'visible');
    assert.ok(state.art && state.art.width >= 24 && state.art.height >= 24, JSON.stringify(state));
    await surface.locator('.taskbar').screenshot({ path: '.codex-tmp/taskbar-transparent-clear-rail.png' });
    await surface.locator('#neo-dock .dock-button').first().screenshot({ path: '.codex-tmp/taskbar-transparent-first-icon.png' });
    await page.screenshot({ path: '.codex-tmp/taskbar-transparent-clear-rail-desktop.png' });
    console.log('Transparent taskbar renders as one left-side clear glass rail with uncaged icons.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
