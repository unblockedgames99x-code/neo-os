const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || '', '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright'));

const url = process.env.NEO_FOCUSED_APPS_TEST_URL || 'http://127.0.0.1:3092/neo-os/?test=focused-app-catalog-v1';
const retired = ['discord', 'youtube-app', 'geometry-dash', 'neo-cloud', 'nowgg', 'neo-ai'];
const kept = ['browser', 'files', 'chat', 'stream', 'games', 'movies', 'notes', 'app-installer', 'calculator', 'paint', 'media', 'wallpaper', 'control', 'terminal'];

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  try {
    await page.addInitScript(({ retiredIds, keptIds }) => {
      if (window.top !== window) return;
      localStorage.setItem('neo_os_pinned_apps_v1', JSON.stringify(['browser', ...retiredIds, 'games']));
      localStorage.setItem('neo_os_installed_apps_v1', JSON.stringify([...keptIds, ...retiredIds]));
      localStorage.removeItem('neo_os_focused_app_catalog_v1');
    }, { retiredIds: retired, keptIds: kept });
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    let scope = page;
    if (/\/launch\.svg(?:[?#]|$)/i.test(url)) {
      await page.waitForFunction(() => Array.from(document.querySelectorAll('iframe')).some(frame => {
        try { return Boolean(frame.contentDocument && frame.contentDocument.querySelector('#neo-desktop')); } catch (_error) { return false; }
      }));
      scope = page.frames().find(frame => frame !== page.mainFrame() && frame.url() === 'about:srcdoc');
      assert.ok(scope, 'The CDN launcher did not create its desktop frame');
    }
    await scope.waitForFunction(() => window.NEO_SHELL && document.documentElement.dataset.boot === 'complete');
    const state = await scope.evaluate(() => ({
      apps: window.NEO_SHELL.getApps().map(app => app.id),
      pinned: JSON.parse(localStorage.getItem('neo_os_pinned_apps_v1') || '[]'),
      installed: JSON.parse(localStorage.getItem('neo_os_installed_apps_v1') || '[]'),
    }));
    for (const id of retired) {
      assert.ok(!state.apps.includes(id), `Retired app remains registered: ${id}`);
      assert.ok(!state.pinned.includes(id), `Retired app remains pinned: ${id}`);
      assert.ok(!state.installed.includes(id), `Retired app remains installed: ${id}`);
    }
    for (const id of kept) {
      assert.ok(state.apps.includes(id), `Useful app is missing: ${id}`);
    }
  } finally {
    await browser.close();
  }
  console.log('Live app catalog contains only the focused app set and cleans retired saved entries.');
})().catch(error => { console.error(error); process.exitCode = 1; });
