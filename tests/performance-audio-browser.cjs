const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
);

const target = process.env.NEO_CDN_LIVE_URL || 'http://127.0.0.1:3092/neo-os/';

async function run(browser, label) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await context.addInitScript(() => {
    window.__neoAudit = { longTasks: [] };
    try {
      new PerformanceObserver((items) => {
        items.getEntries().forEach((entry) => window.__neoAudit.longTasks.push({
          start: Math.round(entry.startTime),
          duration: Math.round(entry.duration),
        }));
      }).observe({ type: 'longtask', buffered: true });
    } catch (_error) {}
  });
  const page = await context.newPage();
  const session = await context.newCDPSession(page);
  await session.send('Network.enable');
  const requests = new Map();
  session.on('Network.responseReceived', ({ requestId, response, type }) => {
    requests.set(requestId, { url: response.url, status: response.status, type, encoded: 0 });
  });
  session.on('Network.loadingFinished', ({ requestId, encodedDataLength }) => {
    const request = requests.get(requestId);
    if (request) request.encoded = encodedDataLength;
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  const startedAt = Date.now();
  await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => {
    const outer = document.getElementById('neo-os');
    const root = outer ? outer.contentDocument : document;
    return Boolean(root && root.querySelector('#neo-start-title'));
  }, null, { timeout: 120000 });
  const startReadyMs = Date.now() - startedAt;
  await page.waitForFunction(() => {
    const outer = document.getElementById('neo-os');
    const root = outer ? outer.contentDocument : document;
    return Boolean(root && root.defaultView.NEO_SHELL);
  });

  const rootClick = (selector) => page.evaluate((selector) => {
    const outer = document.getElementById('neo-os');
    const root = outer ? outer.contentDocument : document;
    const target = root && root.querySelector(selector);
    if (!target) return false;
    target.click();
    return true;
  }, selector);
  assert.equal(await rootClick('[data-start-mode="laptop"]'), true);
  await page.waitForFunction(() => {
    const outer = document.getElementById('neo-os');
    const root = outer ? outer.contentDocument : document;
    const gate = root && root.getElementById('neo-login-gate');
    return Boolean(gate && gate._neoClockTimer && root.querySelector('[data-neo-login-guest]'));
  });
  assert.equal(await rootClick('[data-neo-login-guest]'), true);
  await page.waitForFunction(() => {
    const outer = document.getElementById('neo-os');
    const root = outer ? outer.contentDocument : document;
    const gate = root && root.getElementById('neo-login-gate');
    const desktop = root && root.getElementById('neo-desktop');
    return Boolean(gate && gate.hidden && desktop && !desktop.inert);
  });
  await page.waitForFunction(() => {
    const outer = document.getElementById('neo-os');
    const root = outer ? outer.contentDocument : document;
    return Boolean(root && root.defaultView.NEO_SHELL && root.documentElement.dataset.universalLoading !== 'true');
  });
  const desktopReadyMs = Date.now() - startedAt;
  await page.evaluate(() => {
    const outer = document.getElementById('neo-os');
    const root = outer ? outer.contentDocument : document;
    root.defaultView.__neoMusicMessages = [];
    root.defaultView.addEventListener('message', (event) => {
      if (event.data && (event.data.neoMusicUiReady || event.data.neoMusicState)) {
        root.defaultView.__neoMusicMessages.push({
          ready: event.data.neoMusicUiReady === true,
          state: Boolean(event.data.neoMusicState),
          origin: event.origin,
          at: performance.now(),
        });
      }
    });
    const shell = root.defaultView.NEO_SHELL;
    if (!shell.isInstalled('stream')) shell.setInstalled('stream', true);
    shell.openApp('stream');
  });
  const musicOpenedAt = Date.now();
  let musicReady = false;
  try {
    await page.waitForFunction(() => {
      const outer = document.getElementById('neo-os');
      const root = outer ? outer.contentDocument : document;
      const frame = root && root.querySelector('.neo-window[data-app-id="stream"] iframe');
      const appRoot = frame && frame.contentDocument && frame.contentDocument.documentElement;
      return Boolean(appRoot && appRoot.dataset.neoMusicReady === 'true');
    }, null, { timeout: 16000 });
    musicReady = true;
  } catch (_error) {}
  const musicReadyMs = Date.now() - musicOpenedAt;
  const snapshot = await page.evaluate(() => {
    const outer = document.getElementById('neo-os');
    const root = outer ? outer.contentDocument : document;
    const win = root && root.querySelector('.neo-window[data-app-id="stream"]');
    const frame = win && win.querySelector('iframe');
    const app = frame && frame.contentDocument;
    const rootView = root && root.defaultView;
    const audit = window.__neoAudit || { longTasks: [] };
    const entries = performance.getEntriesByType('resource');
    return {
      fallbackVisible: Boolean(win && win.querySelector('.frame-error.is-visible')),
      appReadyState: app && app.readyState,
      appTitle: app && app.title,
      appText: app && app.body ? app.body.innerText.slice(0, 180) : '',
      musicMessages: rootView && rootView.__neoMusicMessages,
      resources: entries.length,
      longTasks: audit.longTasks,
      domNodes: document.getElementsByTagName('*').length + (root ? root.getElementsByTagName('*').length : 0) + (app ? app.getElementsByTagName('*').length : 0),
      heap: performance.memory ? performance.memory.usedJSHeapSize : null,
    };
  });
  const completed = [...requests.values()];
  const totalBytes = completed.reduce((sum, request) => sum + request.encoded, 0);
  const largest = completed.slice().sort((a, b) => b.encoded - a.encoded).slice(0, 12).map((item) => ({
    bytes: item.encoded,
    status: item.status,
    type: item.type,
    url: item.url,
  }));
  await context.close();
  return {
    label,
    target,
    startReadyMs,
    desktopReadyMs,
    musicReady,
    musicReadyMs,
    requestCount: completed.length,
    totalBytes,
    largest,
    errors: [...new Set(errors)].slice(0, 30),
    ...snapshot,
  };
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--autoplay-policy=user-gesture-required'],
  });
  try {
    const cold = await run(browser, 'cold');
    const repeat = await run(browser, 'repeat');
    console.log(JSON.stringify({ cold, repeat }, null, 2));
    if (process.env.NEO_REQUIRE_MUSIC_READY === '1') {
      assert.equal(cold.musicReady, true, 'Music did not become ready on a cold load');
      assert.equal(cold.fallbackVisible, false, 'Music displayed its startup failure on a cold load');
      assert.equal(repeat.musicReady, true, 'Music did not become ready on a repeat load');
      assert.equal(repeat.fallbackVisible, false, 'Music displayed its startup failure on a repeat load');
    }
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
