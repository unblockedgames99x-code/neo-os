const assert = require('node:assert/strict');
const path = require('node:path');

function playwrightRuntime() {
  try { return require('playwright'); } catch (_error) {}
  return require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || '', '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright'));
}

const { chromium } = playwrightRuntime();
const liveUrl = process.env.NEO_CDN_LIVE_URL;
if (!liveUrl) throw new Error('Set NEO_CDN_LIVE_URL to the immutable launch.svg URL.');

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  function rootAction(selector) {
    return page.evaluate(selector => {
      const target = document.getElementById('neo-os')?.contentDocument?.querySelector(selector);
      if (!target) return false;
      target.click();
      return true;
    }, selector);
  }

  function gamesDocument() {
    const root = document.getElementById('neo-os')?.contentDocument;
    const appWindow = root?.querySelector('.neo-window[data-app-id="games"]');
    const wrapperFrame = appWindow?.querySelector('iframe');
    const wrapperDocument = wrapperFrame?.contentDocument;
    return wrapperDocument?.getElementById('neo-app')?.contentDocument || wrapperDocument || null;
  }

  try {
    await page.goto(liveUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => Boolean(document.getElementById('neo-os')?.contentWindow?.NEO_SHELL), null, { timeout: 60000 });
    assert.equal(await rootAction('[data-start-mode="laptop"]'), true);
    await page.waitForFunction(() => Boolean(document.getElementById('neo-os')?.contentDocument?.querySelector('[data-neo-login-guest]')), null, { timeout: 30000 });
    assert.equal(await rootAction('[data-neo-login-guest]'), true);
    await page.waitForFunction(() => Boolean(document.getElementById('neo-os')?.contentDocument?.getElementById('neo-login-gate')?.hidden), null, { timeout: 30000 });

    assert.equal(await page.evaluate(() => {
      const shell = document.getElementById('neo-os')?.contentWindow?.NEO_SHELL;
      if (!shell) return false;
      if (!shell.isInstalled('games')) shell.setInstalled('games', true);
      return Boolean(shell.openApp('games'));
    }), true);

    try {
      await page.waitForFunction(() => {
        const root = document.getElementById('neo-os')?.contentDocument;
        const appWindow = root?.querySelector('.neo-window[data-app-id="games"]');
        const wrapperDocument = appWindow?.querySelector('iframe')?.contentDocument;
        const doc = wrapperDocument?.getElementById('neo-app')?.contentDocument || wrapperDocument;
        return Number.parseInt(doc?.querySelector('[data-count]')?.textContent?.replace(/,/g, ''), 10) > 3900;
      }, null, { timeout: 30000 });
    } catch (error) {
      const state = await page.evaluate(() => {
        const root = document.getElementById('neo-os')?.contentDocument;
        const appWindow = root?.querySelector('.neo-window[data-app-id="games"]');
        const wrapperFrame = appWindow?.querySelector('iframe');
        const wrapperDocument = wrapperFrame?.contentDocument;
        const appFrame = wrapperDocument?.getElementById('neo-app');
        const doc = appFrame?.contentDocument || wrapperDocument;
        return {
          windowFound: Boolean(appWindow),
          wrapperSource: wrapperFrame?.getAttribute('src') || '',
          wrapperText: wrapperDocument?.body?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 500) || '',
          appSource: appFrame?.getAttribute('src') || '',
          title: doc?.title || '',
          count: doc?.querySelector('[data-count]')?.textContent || '',
          results: doc?.querySelector('[data-results]')?.textContent || '',
          state: doc?.querySelector('[data-state]')?.textContent || '',
          proxyInstalled: doc?.defaultView?.__NEOLinkProxyInstalled === true
        };
      });
      console.error(JSON.stringify(state, null, 2));
      throw error;
    }

    const initial = await page.evaluate(() => {
      const root = document.getElementById('neo-os')?.contentDocument;
      const appWindow = root?.querySelector('.neo-window[data-app-id="games"]');
      const wrapperDocument = appWindow?.querySelector('iframe')?.contentDocument;
      const doc = wrapperDocument?.getElementById('neo-app')?.contentDocument || wrapperDocument;
      return {
        cards: doc?.querySelectorAll('.game-card').length || 0,
        results: doc?.querySelector('[data-results]')?.textContent || '',
        hasSort: Boolean(doc?.querySelector('[data-sort]')),
        icon: appWindow?.querySelector('img[src*="xbox-games.svg"]')?.getAttribute('src') || ''
      };
    });
    assert.equal(initial.cards, 48);
    assert.match(initial.results, /^\d[\d,]+ games$/);
    assert.equal(initial.hasSort, true);
    assert.match(initial.icon, /xbox-games\.svg/);

    try {
      await page.waitForFunction(() => {
        const root = document.getElementById('neo-os')?.contentDocument;
        const appWindow = root?.querySelector('.neo-window[data-app-id="games"]');
        const wrapperDocument = appWindow?.querySelector('iframe')?.contentDocument;
        const doc = wrapperDocument?.getElementById('neo-app')?.contentDocument || wrapperDocument;
        const images = Array.from(doc?.querySelectorAll('.game-card img') || []).slice(0, 8);
        return images.length === 8 && images.every(image => image.complete && image.naturalWidth > 0);
      }, null, { timeout: 30000 });
    } catch (error) {
      const covers = await page.evaluate(() => {
        const root = document.getElementById('neo-os')?.contentDocument;
        const appWindow = root?.querySelector('.neo-window[data-app-id="games"]');
        const wrapperDocument = appWindow?.querySelector('iframe')?.contentDocument;
        const doc = wrapperDocument?.getElementById('neo-app')?.contentDocument || wrapperDocument;
        return Array.from(doc?.querySelectorAll('.game-card') || []).slice(0, 12).map(card => {
          const image = card.querySelector('img');
          return {
            title: card.querySelector('.copy strong')?.textContent || '',
            hasImage: Boolean(image),
            src: image?.src || '',
            complete: Boolean(image?.complete),
            naturalWidth: image?.naturalWidth || 0
          };
        });
      });
      console.error(JSON.stringify({ covers }, null, 2));
      throw error;
    }

    assert.equal(await page.evaluate(() => {
      const root = document.getElementById('neo-os')?.contentDocument;
      const appWindow = root?.querySelector('.neo-window[data-app-id="games"]');
      const wrapperDocument = appWindow?.querySelector('iframe')?.contentDocument;
      const doc = wrapperDocument?.getElementById('neo-app')?.contentDocument || wrapperDocument;
      const category = Array.from(doc?.querySelectorAll('[data-category]') || []).find(button => button.textContent.trim() === 'gn-math');
      category?.click();
      return Boolean(category);
    }), true, 'The source catalogue did not include gn-math');
    await page.waitForFunction(() => {
      const root = document.getElementById('neo-os')?.contentDocument;
      const appWindow = root?.querySelector('.neo-window[data-app-id="games"]');
      const wrapperDocument = appWindow?.querySelector('iframe')?.contentDocument;
      const doc = wrapperDocument?.getElementById('neo-app')?.contentDocument || wrapperDocument;
      return doc?.querySelector('[data-results]')?.textContent === '349 games';
    });
    const gnMathCoverage = await page.evaluate(() => {
      const root = document.getElementById('neo-os')?.contentDocument;
      const appWindow = root?.querySelector('.neo-window[data-app-id="games"]');
      const wrapperDocument = appWindow?.querySelector('iframe')?.contentDocument;
      const doc = wrapperDocument?.getElementById('neo-app')?.contentDocument || wrapperDocument;
      const more = doc?.querySelector('[data-more]');
      while (more && !more.hidden) more.click();
      const cards = Array.from(doc?.querySelectorAll('.game-card') || []);
      return { cards: cards.length, cardsWithImages: cards.filter(card => card.querySelector('img')).length };
    });
    assert.deepEqual(gnMathCoverage, { cards: 349, cardsWithImages: 349 }, 'Not every gn-math game received its source cover');

    await page.evaluate(() => {
      const root = document.getElementById('neo-os')?.contentDocument;
      const appWindow = root?.querySelector('.neo-window[data-app-id="games"]');
      const wrapperDocument = appWindow?.querySelector('iframe')?.contentDocument;
      const doc = wrapperDocument?.getElementById('neo-app')?.contentDocument || wrapperDocument;
      Array.from(doc?.querySelectorAll('[data-category]') || []).find(button => button.dataset.category === 'all')?.click();
    });
    await page.waitForFunction(() => {
      const root = document.getElementById('neo-os')?.contentDocument;
      const appWindow = root?.querySelector('.neo-window[data-app-id="games"]');
      const wrapperDocument = appWindow?.querySelector('iframe')?.contentDocument;
      const doc = wrapperDocument?.getElementById('neo-app')?.contentDocument || wrapperDocument;
      return Number.parseInt(doc?.querySelector('[data-results]')?.textContent?.replace(/,/g, ''), 10) > 3900;
    });

    const launchState = await page.evaluate(() => {
      const root = document.getElementById('neo-os')?.contentDocument;
      const appWindow = root?.querySelector('.neo-window[data-app-id="games"]');
      const wrapperDocument = appWindow?.querySelector('iframe')?.contentDocument;
      const doc = wrapperDocument?.getElementById('neo-app')?.contentDocument || wrapperDocument;
      const search = doc?.querySelector('[data-search]');
      if (!search) return null;
      search.value = '1 on 1 Soccer';
      search.dispatchEvent(new doc.defaultView.Event('input', { bubbles: true }));
      return true;
    });
    assert.equal(launchState, true);
    await page.waitForFunction(() => {
      const root = document.getElementById('neo-os')?.contentDocument;
      const appWindow = root?.querySelector('.neo-window[data-app-id="games"]');
      const wrapperDocument = appWindow?.querySelector('iframe')?.contentDocument;
      const doc = wrapperDocument?.getElementById('neo-app')?.contentDocument || wrapperDocument;
      return doc?.querySelector('[data-results]')?.textContent === '1 game';
    });
    await page.evaluate(() => {
      const root = document.getElementById('neo-os')?.contentDocument;
      const appWindow = root?.querySelector('.neo-window[data-app-id="games"]');
      const wrapperDocument = appWindow?.querySelector('iframe')?.contentDocument;
      const doc = wrapperDocument?.getElementById('neo-app')?.contentDocument || wrapperDocument;
      doc?.querySelector('.game-card-open')?.click();
    });
    await page.waitForFunction(() => {
      const root = document.getElementById('neo-os')?.contentDocument;
      const appWindow = root?.querySelector('.neo-window[data-app-id="games"]');
      const wrapperDocument = appWindow?.querySelector('iframe')?.contentDocument;
      const doc = wrapperDocument?.getElementById('neo-app')?.contentDocument || wrapperDocument;
      const frame = doc?.querySelector('[data-game-frame]');
      return frame && !doc.querySelector('[data-player]').hidden && frame.dataset.neoGameSource?.startsWith('https://rawcdn.githack.com/');
    }, null, { timeout: 30000 });
    const frameState = await page.evaluate(() => {
      const root = document.getElementById('neo-os')?.contentDocument;
      const appWindow = root?.querySelector('.neo-window[data-app-id="games"]');
      const wrapperDocument = appWindow?.querySelector('iframe')?.contentDocument;
      const doc = wrapperDocument?.getElementById('neo-app')?.contentDocument || wrapperDocument;
      const frame = doc?.querySelector('[data-game-frame]');
      return {
        src: frame?.getAttribute('src') || '',
        source: frame?.dataset.neoGameSource || '',
        rootOverflow: doc ? getComputedStyle(doc.documentElement).overflow : '',
        bodyOverflow: doc ? getComputedStyle(doc.body).overflow : '',
        playerOverflow: doc?.querySelector('[data-player]') ? getComputedStyle(doc.querySelector('[data-player]')).overflow : '',
        documentScroll: doc ? doc.documentElement.scrollHeight - doc.documentElement.clientHeight : -1,
      };
    });
    console.log(JSON.stringify({ frameState }, null, 2));
    assert.match(frameState.src, /^https:\/\/rawcdn\.githack\.com\/unblockedgames99x-code\/neo-os-games-\d+-cdn\/[^/]+\/games\/[^/]+\.html$/, 'The game did not render directly from the CDN');
    assert.equal(frameState.source, frameState.src);
    assert.equal(frameState.rootOverflow, 'hidden');
    assert.equal(frameState.bodyOverflow, 'hidden');
    assert.equal(frameState.playerOverflow, 'hidden');
    assert.equal(frameState.documentScroll, 0);

    console.log('Immutable NEO CDN loads the direct Games catalogue and launches game HTML without the web proxy.');
    return;

    try {
      await page.waitForFunction(() => {
        const root = document.getElementById('neo-os')?.contentDocument;
        const appWindow = root?.querySelector('.neo-window[data-app-id="games"]');
        const gamesWrapper = appWindow?.querySelector('iframe')?.contentDocument;
        const games = gamesWrapper?.getElementById('neo-app')?.contentDocument || gamesWrapper;
        const launcher = games?.querySelector('[data-game-frame]')?.contentDocument;
        const browser = launcher?.getElementById('neo-browser')?.contentDocument;
        const gameFrame = browser?.getElementById('frame');
        const text = gameFrame?.contentDocument?.body?.innerText || '';
        return gameFrame?.dataset.neoScramjet === 'true' && text.trim().length > 10 &&
          !/Error processing your request|Invalid URL|Internal Server Error/i.test(text);
      }, null, { timeout: 60000 });
    } catch (error) {
      const diagnostics = await page.evaluate(() => {
        const root = document.getElementById('neo-os')?.contentDocument;
        const appWindow = root?.querySelector('.neo-window[data-app-id="games"]');
        const gamesWrapper = appWindow?.querySelector('iframe')?.contentDocument;
        const games = gamesWrapper?.getElementById('neo-app')?.contentDocument || gamesWrapper;
        const launcherFrame = games?.querySelector('[data-game-frame]');
        const launcher = launcherFrame?.contentDocument;
        const browserFrame = launcher?.getElementById('neo-browser');
        const browser = browserFrame?.contentDocument;
        const gameFrame = browser?.getElementById('frame');
        return {
          launcherSource: launcherFrame?.getAttribute('src') || '',
          launcherText: launcher?.documentElement?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 300) || '',
          browserPresent: Boolean(browserFrame),
          browserAddress: browser?.getElementById('url')?.value || '',
          browserOverlay: browser?.getElementById('overlay')?.className || '',
          browserLog: browser?.getElementById('logbox')?.textContent?.replace(/\s+/g, ' ').trim().slice(-600) || '',
          proxied: gameFrame?.dataset.neoScramjet || '',
          gameText: gameFrame?.contentDocument?.body?.innerText?.slice(0, 500) || '',
        };
      });
      console.error(JSON.stringify(diagnostics, null, 2));
      throw error;
    }
  } finally {
    await browser.close();
  }
  console.log('Immutable NEO CDN loads the full Games catalogue and keeps game launch inside the proxy.');
})().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
