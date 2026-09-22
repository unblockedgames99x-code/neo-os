const assert = require('node:assert/strict');
const path = require('node:path');

function playwrightRuntime() {
  try { return require('playwright'); } catch (_error) {}
  return require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || '', '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright'));
}
const { chromium } = playwrightRuntime();

const url = process.env.NEO_CURSOR_TEST_URL || 'http://127.0.0.1:3092/neo-os/?test=custom-cursors-v1';

async function run() {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  try {
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('neo_cursor_test_cleaned_v1')) {
        localStorage.removeItem('neo_os_settings_v1');
        sessionStorage.setItem('neo_cursor_test_cleaned_v1', '1');
      }
      sessionStorage.setItem('neo_os_guest_session_v1', '1');
    });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(() => window.NEO_SHELL || document.getElementById('neo-os')?.contentWindow?.NEO_SHELL, null, { timeout: 60000 });
    const outerFrame = await page.$('#neo-os');
    let desktop = outerFrame
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
    const choices = settingsWindow.locator('[data-cursor-theme-choice]');
    assert.equal(await choices.count(), 5);
    await settingsWindow.locator('[data-cursor-theme-choice="neo"]').click();
    await desktop.waitForFunction(() => document.documentElement.dataset.cursorTheme === 'neo');

    const mainState = await desktop.evaluate(() => {
      const input = document.createElement('input');
      const button = document.createElement('button');
      input.id = 'cursor-test-input';
      button.id = 'cursor-test-button';
      document.body.append(input, button);
      const state = {
        theme: window.NEO_SHELL.getSetting('cursorTheme'),
        saved: JSON.parse(localStorage.getItem('neo_os_settings_v1') || '{}').cursorTheme,
        bodyCursor: getComputedStyle(document.body).cursor,
        textCursor: getComputedStyle(input).cursor,
        buttonCursor: getComputedStyle(button).cursor
      };
      input.remove();
      button.remove();
      return state;
    });
    assert.equal(mainState.theme, 'neo');
    assert.equal(mainState.saved, 'neo');
    assert.match(mainState.bodyCursor, /neo-arrow\.svg/);
    assert.equal(mainState.textCursor, 'text');
    assert.match(mainState.buttonCursor, /neo-pointer\.svg/);

    await desktop.evaluate(() => {
      const host = document.createElement('div');
      host.className = 'neo-window';
      host.id = 'cursor-frame-test';
      const frame = document.createElement('iframe');
      frame.srcdoc = '<!doctype html><html><body><button id="action">Action</button><input id="copy"></body></html>';
      host.append(frame);
      document.body.append(host);
      return new Promise(resolve => frame.addEventListener('load', resolve, { once: true }));
    });
    await desktop.evaluate(() => window.NEO_SHELL.setSetting('cursorTheme', 'neon'));
    await desktop.waitForFunction(() => {
      const frame = document.querySelector('#cursor-frame-test iframe');
      return frame?.contentDocument?.documentElement?.dataset.cursorTheme === 'neon'
        && frame.contentDocument.getElementById('neo-custom-cursors');
    });
    const frameState = await desktop.evaluate(() => {
      const frame = document.querySelector('#cursor-frame-test iframe');
      const doc = frame.contentDocument;
      const view = frame.contentWindow;
      return {
        theme: doc.documentElement.dataset.cursorTheme,
        stylesheet: doc.getElementById('neo-custom-cursors').href,
        bodyCursor: view.getComputedStyle(doc.body).cursor,
        buttonCursor: view.getComputedStyle(doc.getElementById('action')).cursor,
        textCursor: view.getComputedStyle(doc.getElementById('copy')).cursor
      };
    });
    assert.equal(frameState.theme, 'neon');
    assert.match(frameState.stylesheet, /neo-custom-cursors\.css/);
    assert.match(frameState.bodyCursor, /neon-arrow\.svg/);
    assert.match(frameState.buttonCursor, /neon-pointer\.svg/);
    assert.equal(frameState.textCursor, 'text');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.NEO_SHELL || document.getElementById('neo-os')?.contentWindow?.NEO_SHELL, null, { timeout: 60000 });
    const reloadedOuter = await page.$('#neo-os');
    desktop = reloadedOuter
      ? (await reloadedOuter.contentFrame()) || page.frames().find(frame => frame.parentFrame() === page.mainFrame())
      : page;
    assert.ok(desktop, 'NEO desktop frame did not return after reload');
    await desktop.waitForFunction(() => window.NEO_SHELL && document.documentElement.dataset.boot === 'complete', null, { timeout: 30000 });
    const persisted = await desktop.evaluate(() => ({
      setting: window.NEO_SHELL.getSetting('cursorTheme'),
      dataset: document.documentElement.dataset.cursorTheme,
      cursor: getComputedStyle(document.body).cursor
    }));
    assert.equal(persisted.setting, 'neon');
    assert.equal(persisted.dataset, 'neon');
    assert.match(persisted.cursor, /neon-arrow\.svg/);
  } finally {
    await browser.close();
  }
}

run().then(() => {
  console.log('Custom cursor browser interaction, app-frame propagation, and persistence checks passed.');
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
