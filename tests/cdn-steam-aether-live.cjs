const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || '', '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright'));

const liveUrl = process.env.NEO_CDN_LIVE_URL;
if (!liveUrl) throw new Error('NEO_CDN_LIVE_URL is required');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const trace = [];
  page.on('request', request => {
    if (/gn-local|\/study\/|neo-proxy-client/i.test(request.url())) trace.push('REQ ' + request.url());
  });
  page.on('response', response => {
    if (/gn-local|\/study\/|neo-proxy-client/i.test(response.url())) trace.push('RES ' + response.status() + ' ' + response.url());
  });
  page.on('console', message => {
    if (message.type() === 'error') trace.push('CONSOLE ' + message.text());
  });
  try {
    await page.goto(liveUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(() => Boolean(document.getElementById('neo-os')?.contentWindow?.NEO_SHELL), null, { timeout: 60000 });
    await page.evaluate(() => document.getElementById('neo-os')?.contentDocument?.querySelector('[data-start-mode="laptop"]')?.click());
    await page.waitForFunction(() => Boolean(document.getElementById('neo-os')?.contentDocument?.querySelector('[data-neo-login-guest]')), null, { timeout: 30000 });
    await page.evaluate(() => document.getElementById('neo-os')?.contentDocument?.querySelector('[data-neo-login-guest]')?.click());
    await page.evaluate(() => {
      const shell = document.getElementById('neo-os')?.contentWindow?.NEO_SHELL;
      if (!shell.isInstalled('games')) shell.setInstalled('games', true);
      shell.openApp('games');
    });

    await page.waitForFunction(() => {
      const root = document.getElementById('neo-os')?.contentDocument;
      const wrapper = root?.querySelector('.neo-window[data-app-id="games"] iframe')?.contentDocument;
      const doc = wrapper?.getElementById('neo-app')?.contentDocument || wrapper;
      return doc?.title === 'Steam' && doc?.querySelector('.catalog-summary small')?.textContent === 'FERN + AETHER + GN MATH + STATICQUASAR';
    }, null, { timeout: 60000 });

    try {
      await page.waitForFunction(() => {
        const root = document.getElementById('neo-os')?.contentDocument;
        const wrapper = root?.querySelector('.neo-window[data-app-id="games"] iframe')?.contentDocument;
        const doc = wrapper?.getElementById('neo-app')?.contentDocument || wrapper;
        const status = doc?.querySelector('[data-provider-status]')?.textContent || '';
        return /\bAether\b/.test(status) && /\bGN Math\b/.test(status) && /\bStaticQuasar\b/.test(status);
      }, null, { timeout: 60000 });
    } catch (error) {
      const diagnostic = await page.evaluate(async () => {
        const root = document.getElementById('neo-os')?.contentDocument;
        const shellWindow = document.getElementById('neo-os')?.contentWindow;
        const wrapper = root?.querySelector('.neo-window[data-app-id="games"] iframe')?.contentDocument;
        const doc = wrapper?.getElementById('neo-app')?.contentDocument || wrapper;
        const registrations = await shellWindow?.navigator?.serviceWorker?.getRegistrations?.().catch(() => []) || [];
        let directResource = null;
        try {
          const result = await Promise.race([
            shellWindow.NEO_BROWSER_ENGINE.fetchResource('https://gn-local.booksforschool.online/offline/catalog.json', 'application/json'),
            new Promise((_, reject) => setTimeout(() => reject(new Error('diagnostic timeout')), 15000)),
          ]);
          directResource = { ok: true, bytes: result?.bytes?.byteLength || 0, type: result?.type || '' };
        } catch (resourceError) {
          directResource = { ok: false, error: String(resourceError?.message || resourceError) };
        }
        return {
          count: doc?.querySelector('[data-count]')?.textContent || '',
          status: doc?.querySelector('[data-provider-status]')?.textContent?.replace(/\s+/g, ' ').trim() || '',
          list: doc?.querySelector('[data-list-state]')?.textContent || '',
          ready: doc?.defaultView?.NEO_GAMES_CONFIG || null,
          proxy: Boolean(doc?.defaultView?.NEO_PROXY_CLIENT),
          parentShell: Boolean(doc?.defaultView?.parent?.NEO_SHELL),
          grandparentShell: Boolean(doc?.defaultView?.parent?.parent?.NEO_SHELL),
          proxyResolve: String(doc?.defaultView?.NEO_PROXY_CLIENT?.resolve || '').slice(0, 300),
          engineKeys: Object.keys(shellWindow?.NEO_BROWSER_ENGINE || {}),
          registrations: registrations.map(registration => ({ scope: registration.scope, active: registration.active?.scriptURL || '' })),
          directResource,
        };
      });
      diagnostic.trace = trace.slice(-30);
      console.error('LIVE AETHER DIAGNOSTIC', diagnostic);
      throw error;
    }

    const state = await page.evaluate(() => {
      const root = document.getElementById('neo-os')?.contentDocument;
      const wrapper = root?.querySelector('.neo-window[data-app-id="games"] iframe')?.contentDocument;
      const doc = wrapper?.getElementById('neo-app')?.contentDocument || wrapper;
      return {
        count: doc?.querySelector('[data-count]')?.textContent || '',
        status: doc?.querySelector('[data-provider-status]')?.textContent?.replace(/\s+/g, ' ').trim() || '',
        aetherEntries: Array.from(doc?.querySelectorAll('[data-open-game]') || []).filter(node => node.dataset.openGame?.startsWith('aether/')).length,
        gnMathEntries: Array.from(doc?.querySelectorAll('[data-open-game]') || []).filter(node => node.dataset.openGame?.startsWith('gn-math/')).length,
        staticQuasarEntries: Array.from(doc?.querySelectorAll('[data-open-game]') || []).filter(node => node.dataset.openGame?.startsWith('staticquasar/')).length,
      };
    });
    assert.match(state.status, /825 Aether/);
    assert.match(state.status, /836 GN Math/);
    assert.match(state.status, /885 StaticQuasar/);
    assert.ok(state.aetherEntries > 0, 'No Aether games were rendered in the first library page');
    assert.ok(state.gnMathEntries > 0, 'No GN Math games were rendered in the first library page');
    assert.ok(state.staticQuasarEntries > 0, 'No StaticQuasar games were rendered in the first library page');
    assert.ok(Number.parseInt(state.count.replace(/,/g, ''), 10) >= 2546, 'Combined catalog total is missing Aether, GN Math, or StaticQuasar games');
    console.log(`Immutable Steam library loaded: ${state.status}.`);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
