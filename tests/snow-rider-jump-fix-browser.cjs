const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || '', '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright'));

const url = process.env.NEO_SNOW_RIDER_TEST_URL || 'http://127.0.0.1:3092/neo-os/neo-games/snow-rider-stable.html';

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage();
  try {
    await page.route('**/Build/UnityLoader.js', route => route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: 'window.UnityLoader={instantiate:function(id,url){window.__unityLaunch={id:id,url:url};document.documentElement.classList.add("is-ready");}};'
    }));
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    const state = await page.evaluate(() => {
      let leaked = false;
      window.addEventListener('keydown', () => { leaked = true; });
      const event = new KeyboardEvent('keydown', { code: 'Space', key: ' ', repeat: true, bubbles: true, cancelable: true });
      window.dispatchEvent(event);
      return {
        compatibility: window.__neoSnowRiderCompatibility,
        blocked: event.defaultPrevented,
        leaked,
        unityLaunch: window.__unityLaunch
      };
    });
    assert.deepEqual(state.compatibility, { frameRate: 60, repeatedJumpInputBlocked: true });
    assert.equal(state.blocked, true);
    assert.equal(state.leaked, false);
    assert.equal(state.unityLaunch.id, 'gameContainer');
    assert.match(state.unityLaunch.url, /SnowRider3D-gd-1\.json$/);
  } finally {
    await browser.close();
  }
  console.log('Snow Rider blocks repeated jump input before Unity receives it.');
})().catch(error => { console.error(error); process.exitCode = 1; });
