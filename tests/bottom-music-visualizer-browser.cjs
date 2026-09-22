const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
);

const url = process.env.NEO_VISUALIZER_TEST_URL || 'http://127.0.0.1:3092/neo-os/?test=bottom-music-visualizer-v1';

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.NEO_SHELL && window.NEO_BOTTOM_VISUALIZER && document.documentElement.dataset.boot === 'complete', null, { timeout: 20000 });
    const start = page.locator('#neo-start-screen');
    if (await start.isVisible()) await start.locator('[data-start-mode="laptop"]').click();
    const guest = page.locator('[data-neo-login-guest]');
    if (await guest.isVisible()) await guest.click();
    await page.waitForFunction(() => document.getElementById('neo-login-gate')?.hidden && !document.getElementById('neo-desktop')?.inert);
    await page.evaluate(() => window.NEO_SHELL.setSetting('taskbarPosition', 'bottom'));
    await page.evaluate(() => window.NEO_BOTTOM_VISUALIZER.setEnabled(false));

    await page.evaluate(() => document.querySelector('.wallpaper').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 620, clientY: 380 })));
    const menu = page.locator('#desktop-context-menu');
    await menu.waitFor({ state: 'visible' });
    await menu.locator('[data-context-submenu="widgets"]').evaluate((button) => button.click());
    const toggle = menu.locator('[data-widget-action="bottom-visualizer"]');
    await toggle.waitFor({ state: 'visible' });
    assert.equal(await toggle.getAttribute('aria-checked'), 'false');
    assert.match(await toggle.innerText(), /Add bottom music visualizer/);
    await toggle.click();

    await page.waitForFunction(() => window.NEO_BOTTOM_VISUALIZER.isEnabled() && !document.getElementById('neo-bottom-visualizer').hidden);
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('neo-media-state', { detail: { source: 'neo-music', active: true, playing: true, kind: 'audio' } }));
      window.dispatchEvent(new CustomEvent('neo-media-levels', { detail: { source: 'neo-music', levels: Array.from({ length: 32 }, (_, index) => .18 + (index % 8) / 10), measured: true } }));
    });
    await page.waitForFunction(() => window.NEO_BOTTOM_VISUALIZER.getState().peak > .2);

    const active = await page.evaluate(() => {
      const canvas = document.getElementById('neo-bottom-visualizer');
      const rect = canvas.getBoundingClientRect();
      const taskbar = document.querySelector('.taskbar').getBoundingClientRect();
      const state = window.NEO_BOTTOM_VISUALIZER.getState();
      return {
        state,
        hidden: canvas.hidden,
        ariaHidden: canvas.getAttribute('aria-hidden'),
        bottomGap: innerHeight - rect.bottom,
        taskbarGap: taskbar.top - rect.bottom,
        width: rect.width,
        taskbarWidth: taskbar.width,
        centeredDelta: Math.abs((rect.left + rect.width / 2) - (taskbar.left + taskbar.width / 2)),
        storage: localStorage.getItem('neo_bottom_visualizer_v1')
      };
    });
    assert.equal(active.hidden, false);
    assert.equal(active.ariaHidden, 'false');
    assert.equal(active.storage, 'true');
    assert.equal(active.state.measured, true);
    assert.ok(active.state.framesDrawn > 0);
    assert.ok(Math.abs(active.taskbarGap) <= 12, `Visualizer should sit directly above the taskbar: ${JSON.stringify(active)}`);
    assert.ok(active.width > active.taskbarWidth, `Visualizer should be slightly wider than the taskbar: ${JSON.stringify(active)}`);
    assert.ok(active.width <= active.taskbarWidth + 70, `Visualizer should not stretch across the screen: ${JSON.stringify(active)}`);
    assert.ok(active.centeredDelta <= 2, `Visualizer should stay centered with the taskbar: ${JSON.stringify(active)}`);
    if (process.env.NEO_VISUALIZER_SCREENSHOT) await page.screenshot({ path: process.env.NEO_VISUALIZER_SCREENSHOT, fullPage: true });

    await page.evaluate(() => document.querySelector('.wallpaper').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 620, clientY: 380 })));
    await menu.locator('[data-context-submenu="widgets"]').evaluate((button) => button.click());
    await toggle.waitFor({ state: 'visible' });
    assert.equal(await toggle.getAttribute('aria-checked'), 'true');
    assert.match(await toggle.innerText(), /Remove bottom music visualizer/);
    await toggle.click();
    await page.waitForFunction(() => !window.NEO_BOTTOM_VISUALIZER.isEnabled() && document.getElementById('neo-bottom-visualizer').hidden);
    assert.equal(await page.evaluate(() => localStorage.getItem('neo_bottom_visualizer_v1')), 'false');
    console.log('Bottom music visualizer browser checks passed.');
  } finally {
    await context.close();
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
