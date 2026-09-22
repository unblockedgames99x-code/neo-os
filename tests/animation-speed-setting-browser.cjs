const assert = require('node:assert/strict');
const path = require('node:path');

function playwrightRuntime() {
  try { return require('playwright'); } catch (_error) {}
  return require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || '', '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright'));
}

const { chromium } = playwrightRuntime();
const url = process.env.NEO_ANIMATION_SPEED_URL || 'http://127.0.0.1:3092/neo-os/?test=animation-speed-v1';

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    await page.addInitScript(() => {
      sessionStorage.setItem('neo_os_guest_session_v1', '1');
      localStorage.setItem('neo_os_start_mode_v1', 'laptop');
      if (!sessionStorage.getItem('neo_animation_speed_test_initialized')) {
        localStorage.removeItem('neo_os_settings_v1');
        sessionStorage.setItem('neo_animation_speed_test_initialized', '1');
      }
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
    const slider = settings.getByRole('slider', { name: 'Animation Speed' });
    await slider.waitFor({ state: 'visible' });

    assert.deepEqual(await slider.evaluate(input => ({ min: input.min, max: input.max, step: input.step, value: input.value })), {
      min: '0', max: '4', step: '1', value: '2'
    });
    assert.equal(await settings.getByText('How fast windows animate', { exact: true }).isVisible(), true);
    assert.equal(await settings.getByText('Slow', { exact: true }).isVisible(), true);
    assert.equal(await settings.getByText('Very Fast', { exact: true }).isVisible(), true);
    await slider.scrollIntoViewIfNeeded();
    await settings.screenshot({ path: path.resolve(__dirname, '../.codex-tmp/animation-speed-setting.png') });

    await slider.evaluate(input => {
      input.value = '4';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForFunction(() => window.NEO_SHELL.getSetting('animationSpeed') === 200);
    assert.deepEqual(await page.evaluate(() => ({
      speed: document.documentElement.dataset.animationSpeed,
      open: document.documentElement.style.getPropertyValue('--neo-window-open-duration'),
      restore: document.documentElement.style.getPropertyValue('--neo-window-restore-duration'),
      close: document.documentElement.style.getPropertyValue('--neo-window-close-duration'),
      persisted: JSON.parse(localStorage.getItem('neo_os_settings_v1')).animationSpeed
    })), { speed: '200', open: '150ms', restore: '130ms', close: '105ms', persisted: 200 });

    await slider.evaluate(input => {
      input.value = '0';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForFunction(() => document.documentElement.style.getPropertyValue('--neo-window-open-duration') === '600ms');
    assert.equal(await slider.getAttribute('aria-valuetext'), 'Slow');

    await page.evaluate(() => window.NEO_SHELL.setSetting('reduceMotion', true));
    assert.equal(await page.evaluate(() => document.documentElement.dataset.reduceMotion), 'true');
    await page.evaluate(() => window.NEO_SHELL.setSetting('reduceMotion', false));

    await slider.evaluate(input => {
      input.value = '1';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(() => window.NEO_SHELL && document.documentElement.dataset.boot === 'complete', null, { timeout: 30000 });
    assert.deepEqual(await page.evaluate(() => ({
      speed: window.NEO_SHELL.getSetting('animationSpeed'),
      data: document.documentElement.dataset.animationSpeed,
      open: document.documentElement.style.getPropertyValue('--neo-window-open-duration')
    })), { speed: 75, data: '75', open: '400ms' });
  } finally {
    await browser.close();
  }

  console.log('Animation speed setting changes and persists shared window timings.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
