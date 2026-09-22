const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.NEO_PLAYWRIGHT_PATH || path.join(
  process.env.USERPROFILE || '', '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright'
));

const url = process.env.NEO_HARD_CLOSE_TEST_URL || 'http://127.0.0.1:3092/neo-os/?test=app-hard-close-v1';

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  try {
    await page.addInitScript(() => sessionStorage.setItem('neo_os_guest_session_v1', '1'));
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    let shell = page;
    if (/\/launch\.svg(?:[?#]|$)/i.test(url)) {
      await page.waitForFunction(() => Array.from(document.querySelectorAll('iframe')).some((frame) => {
        try { return Boolean(frame.contentWindow?.NEO_SHELL); } catch (_error) { return false; }
      }), null, { timeout: 60000 });
      shell = page.frames().find((frame) => frame !== page.mainFrame() && frame.url() === 'about:srcdoc');
      assert.ok(shell, 'published launcher should contain the NEO OS srcdoc frame');
    }
    await shell.waitForFunction(() => window.NEO_SHELL && document.documentElement.dataset.boot === 'complete', null, { timeout: 30000 });
    const start = shell.locator('#neo-start-screen');
    if (await start.isVisible()) {
      await start.locator('[data-start-mode="laptop"]').click();
      await start.waitFor({ state: 'hidden' });
    }
    const guest = shell.locator('[data-neo-login-guest]');
    if (await guest.isVisible()) await guest.click();

    await shell.evaluate(() => window.NEO_SHELL.openApp('browser'));
    const firstWindow = shell.locator('.neo-window[data-app-id="browser"]');
    await firstWindow.waitFor({ state: 'visible' });
    await shell.waitForFunction(() => Boolean(document.querySelector('.neo-window[data-app-id="browser"] iframe')));

    const setup = await shell.evaluate(() => {
      const win = document.querySelector('.neo-window[data-app-id="browser"]');
      const frame = win.querySelector('iframe');
      const view = frame.contentWindow;
      let sameOrigin = false;
      try { sameOrigin = Boolean(frame.contentDocument?.body); } catch (_error) {}
      const mediaDocument = sameOrigin ? view.document : document;
      const media = mediaDocument.createElement('audio');
      Object.defineProperty(media, 'pause', {
        configurable: true,
        value() {
          if (sameOrigin) parent.__neoHardClosePauseObserved = true;
          else window.__neoHardClosePauseObserved = true;
        }
      });
      if (sameOrigin) {
        view.document.body.appendChild(media);
        view._sessionInstId = 'neo_close_test';
        view.localStorage.setItem('neo_close_test:neo:tabs:v1', JSON.stringify({ tabs: [{ url: 'https://example.com/' }] }));
        view.addEventListener('message', (event) => {
          if (event.data?.type === 'neo-shell:close') parent.__neoHardCloseMessageObserved = event.data.appId;
        });
      } else {
        win.appendChild(media);
      }
      window.__neoFirstBrowserWindow = win;
      window.__neoFirstBrowserFrame = frame;
      return { appId: win.dataset.appId, frameConnected: frame.isConnected, sameOrigin };
    });
    assert.equal(setup.appId, 'browser');
    assert.equal(setup.frameConnected, true);

    await firstWindow.locator('[data-window-action="close"]').click();
    await shell.waitForFunction(() => !document.querySelector('.neo-window[data-app-id="browser"]'));
    const closed = await shell.evaluate(() => ({
      pauseObserved: window.__neoHardClosePauseObserved === true,
      messageObserved: window.__neoHardCloseMessageObserved,
      oldWindowConnected: window.__neoFirstBrowserWindow.isConnected,
      oldFrameConnected: window.__neoFirstBrowserFrame.isConnected,
      tabState: localStorage.getItem('neo_close_test:neo:tabs:v1'),
      openWindow: Boolean(document.querySelector('.neo-window[data-app-id="browser"]')),
    }));
    assert.equal(closed.pauseObserved, true);
    if (setup.sameOrigin) assert.equal(closed.messageObserved, 'browser');
    assert.equal(closed.oldWindowConnected, false);
    assert.equal(closed.oldFrameConnected, false);
    assert.equal(closed.tabState, null);
    assert.equal(closed.openWindow, false);

    await shell.evaluate(() => window.NEO_SHELL.openApp('browser'));
    await shell.waitForFunction(() => document.querySelector('.neo-window[data-app-id="browser"] iframe'));
    const reopened = await shell.evaluate(() => {
      const win = document.querySelector('.neo-window[data-app-id="browser"]');
      return {
        newWindow: win !== window.__neoFirstBrowserWindow,
        newFrame: win.querySelector('iframe') !== window.__neoFirstBrowserFrame,
        tabState: localStorage.getItem('neo_close_test:neo:tabs:v1'),
      };
    });
    assert.deepEqual(reopened, { newWindow: true, newFrame: true, tabState: null });
  } finally {
    await browser.close();
  }
  console.log('Closing an app stops media, clears its tab history, removes its frame, and reopens a fresh runtime.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
