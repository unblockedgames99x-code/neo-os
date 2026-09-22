const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE || '', '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright')
);

const root = path.join(__dirname, '..');
const indexSource = fs.readFileSync(path.join(root, 'neo-os', 'nextnode-browser', 'index.html'), 'utf8');
const settingsSource = fs.readFileSync(path.join(root, 'neo-os', 'nextnode-browser', 'wisp-settings.js'), 'utf8');
const recoverySource = fs.readFileSync(path.join(root, 'neo-os', 'nextnode-browser', 'auto-server-switch.js'), 'utf8');

assert.match(indexSource, /auto-server-switch\.js\?v=20260919-auto-wisp-v1/);
assert.match(indexSource, /retries only the affected tab/i);
assert.match(settingsSource, /Automatic \(recommended\)/);
assert.match(settingsSource, /=== "manual" \? "manual" : "auto"/);
assert.match(settingsSource, /NEO_WISP_MANAGER/);
assert.match(recoverySource, /new WeakMap\(\)/);
assert.match(recoverySource, /Couldn't find the requested file\\s\+\\\/nextnode-browser/);
assert.match(recoverySource, /sjController\.setTransport/);
assert.match(recoverySource, /replace: true, automaticRecovery: true/);
assert.doesNotMatch(recoverySource, /location\.reload/);

const url = process.env.NEO_BROWSER_INDEX_URL || 'http://127.0.0.1:3092/neo-os/nextnode-browser/index.html';

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const context = await browser.newContext({ viewport: { width: 1100, height: 700 } });
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    let app = page;
    if (/\/launch\.svg(?:[?#]|$)/i.test(url)) {
      await page.waitForSelector('#neo-browser', { timeout: 60000 });
      app = null;
      for (let attempt = 0; attempt < 600 && !app; attempt += 1) {
        for (const candidate of page.frames()) {
          if (await candidate.locator('#url').count()) {
            app = candidate;
            break;
          }
        }
        if (!app) await page.waitForTimeout(100);
      }
      assert.ok(app, 'Browser launcher did not attach its app frame');
    }
    await app.waitForFunction(() => window.NEO_WISP_MANAGER && typeof window.NEO_SWITCH_WISP_TRANSPORT === 'function');

    const defaults = await app.evaluate(() => ({
      mode: window.NEO_WISP_MANAGER.mode(),
      automatic: window.NEO_WISP_MANAGER.isAutomatic(),
      server: window.NEO_WISP_MANAGER.current(),
      selected: document.getElementById('wisp-select').value,
      status: document.getElementById('wisp-status').textContent,
    }));
    assert.equal(defaults.mode, 'auto');
    assert.equal(defaults.automatic, true);
    assert.equal(defaults.selected, 'auto');
    assert.match(defaults.status, /Automatic · Active:/);

    await app.waitForFunction(() => typeof proxyReady !== 'undefined' && proxyReady === true, null, { timeout: 60000 });
    const liveTransportSwitch = await app.evaluate(async () => {
      await window.NEO_SWITCH_WISP_TRANSPORT(window.NEO_WISP_MANAGER.current(), 'test');
      return typeof sjController.setTransport === 'function';
    });
    assert.equal(liveTransportSwitch, true);

    await app.evaluate(() => {
      window.__neoSwitches = [];
      window.__neoRetries = [];
      window.NEO_SWITCH_WISP_TRANSPORT = async url => { window.__neoSwitches.push(url); };
      navigate = async (target, options) => { window.__neoRetries.push({ target, options }); };
      document.getElementById('url').value = 'https\\:/sites.google.com/view/staticquasar/static-gmes/Statics-Gvme-Finder';
      const frame = document.createElement('iframe');
      frame.id = 'auto-switch-regression-frame';
      document.getElementById('frames').append(frame);
      setTimeout(() => {
        frame.srcdoc = "Couldn't find the requested file /nextnode-browser/study/uv/0rmnbfpu/fgzeuhvg/https\\:/sites.google.com/view/staticquasar/static-gmes/Statics-Gvme-Finder in unblockedgames99x-code/neo-os-browser-cdn.";
      }, 0);
    });

    await app.waitForFunction(() => window.__neoSwitches.length === 1 && window.__neoRetries.length === 1, null, { timeout: 10000 });
    const result = await app.evaluate(() => ({
      switches: window.__neoSwitches,
      retries: window.__neoRetries,
      active: window.NEO_WISP_MANAGER.current(),
      status: document.getElementById('wisp-status').textContent,
    }));
    assert.equal(result.switches[0], 'wss://wisp.mercurywork.shop/');
    assert.equal(result.retries[0].target, 'https://sites.google.com/view/staticquasar/static-gmes/Statics-Gvme-Finder');
    assert.deepEqual(result.retries[0].options, { replace: true, automaticRecovery: true });
    assert.equal(result.active, 'wss://wisp.mercurywork.shop/');
    assert.match(result.status, /Automatic · Active: Mercury Wisp/);
    console.log('Automatic WISP mode rotated the transport and retried only the failed tab without reloading the browser.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
