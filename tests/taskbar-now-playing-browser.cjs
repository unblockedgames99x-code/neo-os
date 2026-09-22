const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE || '', '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright')
);

const url = process.env.NEO_TASKBAR_PLAYER_URL || 'http://127.0.0.1:3097/neo-os/?test=taskbar-now-playing-v1';

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
      designVersion: 29,
      taskbarPosition: 'bottom',
      taskbarStyle: 'current',
      taskbarAppMode: 'adaptive',
      reduceMotion: false,
    }));
  });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.NEO_SHELL && document.documentElement.dataset.boot === 'complete', null, { timeout: 30000 });
    const start = page.locator('#neo-start-screen');
    if (await start.isVisible()) {
      await start.locator('[data-start-mode="laptop"]').click();
      await start.waitFor({ state: 'hidden' });
    }
    const guest = page.locator('[data-neo-login-guest]');
    if (await guest.isVisible()) await guest.click();
    await page.evaluate(() => {
      window.__taskbarTransport = null;
      window.__taskbarVolume = null;
      window.addEventListener('neo-media-transport-request', (event) => { window.__taskbarTransport = event.detail; });
      window.addEventListener('neo-media-volume-request', (event) => { window.__taskbarVolume = event.detail; });
      window.dispatchEvent(new CustomEvent('neo-media-state', { detail: {
        source: 'test-taskbar-player',
        appId: 'stream',
        kind: 'audio',
        active: true,
        playing: true,
        title: 'MONTGEM DASH',
        subtitle: 'Itz Dash Music',
        volume: 0.65,
        volumeControl: true,
        transport: true,
      }}));
    });

    const player = page.locator('[data-taskbar-now-playing]');
    await page.waitForFunction(() => document.querySelector('[data-taskbar-now-playing]')?.classList.contains('is-visible'));
    const state = await player.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return {
        hidden: node.hidden,
        title: node.querySelector('[data-taskbar-now-playing-title]')?.textContent,
        subtitle: node.querySelector('[data-taskbar-now-playing-subtitle]')?.textContent,
        width: rect.width,
        height: rect.height,
        opacity: getComputedStyle(node).opacity,
        controlsHidden: node.querySelector('.taskbar-now-playing-controls')?.hidden,
        toggleLabel: node.querySelector('[data-taskbar-now-playing-toggle]')?.getAttribute('aria-label'),
      };
    });
    assert.equal(state.hidden, false);
    assert.equal(state.title, 'MONTGEM DASH');
    assert.equal(state.subtitle, 'Itz Dash Music');
    assert.ok(state.width >= 250 && state.width <= 265, JSON.stringify(state));
    assert.ok(state.height >= 44 && state.height <= 48, JSON.stringify(state));
    assert.equal(state.opacity, '1');
    assert.equal(state.controlsHidden, false);
    assert.equal(state.toggleLabel, 'Pause');
    await page.screenshot({ path: path.join(__dirname, '..', '.codex-tmp', 'taskbar-now-playing.png') });

    await player.locator('[data-taskbar-now-playing-toggle]').click();
    await page.waitForFunction(() => window.__taskbarTransport?.action === 'toggle');
    await player.locator('[data-taskbar-now-playing-volume]').click();
    await page.waitForFunction(() => window.__taskbarVolume?.volume === 0);
    assert.equal(await player.locator('[data-taskbar-now-playing-volume]').getAttribute('aria-label'), 'Unmute');

    await page.evaluate(() => window.dispatchEvent(new CustomEvent('neo-media-state', { detail: {
      source: 'test-taskbar-player', appId: 'stream', kind: 'audio', active: false, playing: false,
    }})));
    await player.waitFor({ state: 'hidden', timeout: 2000 });

    console.log('Taskbar now-playing card renders and controls the active media source.');
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
