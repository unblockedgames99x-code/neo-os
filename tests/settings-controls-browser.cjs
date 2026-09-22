const assert = require('node:assert/strict');
const path = require('node:path');

function playwrightRuntime() {
  try { return require('playwright'); } catch (_error) {}
  return require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || '', '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright'));
}

const { chromium } = playwrightRuntime();
const url = process.env.NEO_SETTINGS_TEST_URL || 'http://127.0.0.1:3092/neo-os/?test=settings-controls-v1';

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });

  try {
    await page.addInitScript(() => {
      if (window.top !== window) return;
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

    await desktop.evaluate(() => window.NEO_SHELL.openApp('control'));
    const settingsWindow = desktop.locator('.neo-window[data-app-id="control"]');
    await settingsWindow.waitFor({ state: 'visible' });

    const original = await desktop.evaluate(() => {
      const names = [
        'performanceMode', 'windowBarStyle', 'taskbarPosition', 'taskbarStyle',
        'taskbarSurface', 'taskbarTint', 'taskbarGradientEnd', 'taskbarTransparency',
        'taskbarOutline', 'taskbarAppNames', 'autoPerformanceMode',
        'desktopSystemWidget', 'desktopActiveAppWidget', 'desktopNowPlayingWidget'
      ];
      return Object.fromEntries(names.map(name => [name, window.NEO_SHELL.getSetting(name)]));
    });

    const buttonGroups = [
      ['data-performance-mode-button', 'performanceMode', ['normal', 'performance', 'ultimate']],
      ['data-window-bar-style-option', 'windowBarStyle', ['ultra', 'current', 'pill']],
      ['data-taskbar-position-option', 'taskbarPosition', ['top', 'right', 'bottom', 'left']],
      ['data-taskbar-style-option', 'taskbarStyle', ['current', 'transparent', 'typical', 'xeno']],
      ['data-taskbar-surface-option', 'taskbarSurface', ['glass', 'solid', 'gradient']]
    ];

    for (const [attribute, settingName, values] of buttonGroups) {
      for (const value of values) {
        const result = await desktop.evaluate(({ attribute, settingName, value }) => {
          const button = document.querySelector(`.neo-window[data-app-id="control"] [${attribute}="${value}"]`);
          if (!button) return { missing: true };
          button.click();
          return {
            setting: window.NEO_SHELL.getSetting(settingName),
            pressed: button.getAttribute('aria-pressed')
          };
        }, { attribute, settingName, value });
        assert.equal(result.missing, undefined, `${attribute}=${value} is missing`);
        assert.equal(result.setting, value, `${settingName} did not update to ${value}`);
        assert.equal(result.pressed, 'true', `${attribute}=${value} did not become selected`);
      }
    }

    for (const tint of ['#000000', '#315f9b', '#8d4a4a']) {
      const result = await desktop.evaluate(tintValue => {
        const button = document.querySelector(`.neo-window[data-app-id="control"] [data-taskbar-tint-preset="${tintValue}"]`);
        button?.click();
        return {
          setting: window.NEO_SHELL.getSetting('taskbarTint'),
          pressed: button?.getAttribute('aria-pressed')
        };
      }, tint);
      assert.equal(String(result.setting).toLowerCase(), tint);
      assert.equal(result.pressed, 'true');
    }

    const fieldCases = [
      ['autoPerformanceMode', 'checkbox', true],
      ['desktopSystemWidget', 'checkbox', true],
      ['desktopActiveAppWidget', 'checkbox', true],
      ['desktopNowPlayingWidget', 'checkbox', true],
      ['taskbarTint', 'color', '#654f91'],
      ['taskbarGradientEnd', 'color', '#42735b'],
      ['taskbarTransparency', 'range', 37],
      ['taskbarOutline', 'checkbox', false],
      ['taskbarAppNames', 'checkbox', true]
    ];

    for (const [name, type, nextValue] of fieldCases) {
      const result = await desktop.evaluate(({ name, type, nextValue }) => {
        const control = document.querySelector(`.neo-window[data-app-id="control"] [data-setting="${name}"]`);
        if (!control) return { missing: true };
        if (type === 'checkbox') control.checked = nextValue;
        else control.value = String(nextValue);
        control.dispatchEvent(new Event(type === 'range' ? 'input' : 'change', { bubbles: true }));
        return window.NEO_SHELL.getSetting(name);
      }, { name, type, nextValue });
      assert.notEqual(result?.missing, true, `data-setting=${name} is missing`);
      assert.equal(result, nextValue, `${name} did not persist its changed value`);
    }

    const layout = await settingsWindow.evaluate(element => {
      const body = element.querySelector('.window-content, .neo-window-content, [data-window-content]') || element;
      const controls = Array.from(element.querySelectorAll('button, input, select')).filter(control => {
        const style = getComputedStyle(control);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
      return {
        bodyCanScroll: body.scrollHeight <= body.clientHeight || ['auto', 'scroll'].includes(getComputedStyle(body).overflowY),
        clippedControls: controls.filter(control => {
          const box = control.getBoundingClientRect();
          return box.width < 1 || box.height < 1;
        }).length
      };
    });
    assert.equal(layout.bodyCanScroll, true, 'Settings content overflows without a usable scroll area');
    assert.equal(layout.clippedControls, 0, 'Settings contains collapsed interactive controls');

    await desktop.evaluate(saved => {
      for (const [name, value] of Object.entries(saved)) window.NEO_SHELL.setSetting(name, value);
    }, original);
  } finally {
    await browser.close();
  }

  console.log('Every System Settings button group and field updates, selects, and persists correctly.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
