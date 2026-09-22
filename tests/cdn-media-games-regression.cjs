const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
);

const liveUrl = process.env.NEO_CDN_LIVE_URL;
if (!liveUrl) throw new Error('Set NEO_CDN_LIVE_URL to the immutable launch.svg URL.');

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const failed = [];
  const badResponses = [];
  const pageErrors = [];

  page.on('requestfailed', (request) => failed.push({ url: request.url(), error: request.failure()?.errorText || '' }));
  page.on('pageerror', (error) => pageErrors.push(error.message || String(error)));
  page.on('response', (response) => {
    if (response.status() >= 400) badResponses.push({ status: response.status(), url: response.url() });
  });

  function rootAction(selector) {
    return page.evaluate((selector) => {
      const outer = document.getElementById('neo-os');
      const target = outer?.contentDocument?.querySelector(selector);
      if (!target) return false;
      target.click();
      return true;
    }, selector);
  }

  function openApp(appId) {
    return page.evaluate((appId) => {
      const shell = document.getElementById('neo-os')?.contentWindow?.NEO_SHELL;
      if (!shell) return false;
      if (!shell.isInstalled(appId)) shell.setInstalled(appId, true);
      return Boolean(shell.openApp(appId));
    }, appId);
  }

  async function enterDesktop() {
    await page.goto(liveUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => Boolean(document.getElementById('neo-os')?.contentWindow?.NEO_SHELL), null, { timeout: 60000 });
    assert.equal(await rootAction('[data-start-mode="laptop"]'), true);
    await page.waitForFunction(() => Boolean(document.getElementById('neo-os')?.contentDocument?.querySelector('[data-neo-login-guest]')), null, { timeout: 30000 });
    assert.equal(await rootAction('[data-neo-login-guest]'), true);
    await page.waitForFunction(() => {
      const root = document.getElementById('neo-os')?.contentDocument;
      return Boolean(root?.getElementById('neo-login-gate')?.hidden && !root?.getElementById('neo-desktop')?.inert);
    }, null, { timeout: 30000 });
  }

  async function snapshot(appId) {
    return page.evaluate((appId) => {
      const root = document.getElementById('neo-os')?.contentDocument;
      const win = root?.querySelector(`.neo-window[data-app-id="${appId}"]`);
      const frame = win?.querySelector('iframe');
      const wrapperDoc = frame?.contentDocument;
      const appFrame = wrapperDoc?.getElementById('neo-app');
      const doc = appFrame?.contentDocument || wrapperDoc;
      let appUrl = '';
      try {
        appUrl = appFrame?.contentWindow?.location?.href || frame?.contentWindow?.location?.href || '';
      } catch {}
      return {
        found: Boolean(win),
        text: win?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 500) || '',
        frameSrc: frame?.getAttribute('src') || '',
        srcdocLength: String(frame?.getAttribute('srcdoc') || '').length,
        frameReady: doc?.readyState || '',
        frameTitle: doc?.title || '',
        appUrl,
        appPath: doc?.defaultView?.__NEO_MUSIC_PATHNAME__ || '',
        wrapperText: wrapperDoc?.documentElement?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 300) || '',
        frameText: doc?.body?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 500) || '',
        rootChildren: doc?.getElementById('root')?.childElementCount ?? -1,
        musicReady: Boolean(doc?.documentElement?.dataset?.neoMusicReady === 'true' || doc?.querySelector('[data-neo-music-ready]')),
        searchValue: doc?.getElementById('searchInput')?.value || '',
        errorVisible: Boolean(win?.querySelector('.frame-error.is-visible')),
        gameCards: doc?.querySelectorAll('.game-card, .library-card, [data-game-card]').length || 0,
        musicCards: doc?.querySelectorAll('.music-card').length || 0,
        streamProfiles: doc?.querySelectorAll('.profile:not(.profile-add)').length || 0,
        streamHero: doc?.querySelector('[data-hero-title]')?.textContent?.trim() || '',
        streamVideo: doc?.querySelector('video')?.currentSrc || doc?.querySelector('video')?.getAttribute('src') || doc?.querySelector('[data-vidfast-player]')?.getAttribute('src') || '',
        streamReadyState: doc?.querySelector('video')?.readyState || 0,
        streamError: doc?.querySelector('video')?.error?.code || 0,
        links: Array.from(doc?.querySelectorAll('a[href]') || []).slice(0, 20).map((link) => ({
          text: link.textContent?.replace(/\s+/g, ' ').trim().slice(0, 80) || '',
          href: link.getAttribute('href') || '',
        })),
      };
    }, appId);
  }

  try {
    await enterDesktop();

    assert.equal(await openApp('games'), true);
    await page.waitForTimeout(5000);
    const games = await snapshot('games');

    assert.equal(await openApp('stream'), true);
    await page.waitForTimeout(15000);
    const music = await snapshot('stream');
    const musicSearchStarted = await page.evaluate(() => {
      const root = document.getElementById('neo-os')?.contentDocument;
      const frame = root?.querySelector('.neo-window[data-app-id="stream"] iframe');
      const wrapperDoc = frame?.contentDocument;
      const doc = wrapperDoc?.getElementById('neo-app')?.contentDocument || wrapperDoc;
      const input = doc?.getElementById('searchInput');
      if (!input) return false;
      input.value = 'Daft Punk';
      input.dispatchEvent(new doc.defaultView.Event('input', { bubbles: true }));
      return true;
    });
    await page.waitForTimeout(12000);
    const musicAfterSearch = await snapshot('stream');

    assert.equal(await openApp('movies'), true);
    await page.waitForTimeout(15000);
    const tv = await snapshot('movies');
    const tvProfileOpened = await page.evaluate(() => {
      const root = document.getElementById('neo-os')?.contentDocument;
      const frame = root?.querySelector('.neo-window[data-app-id="movies"] iframe');
      const wrapperDoc = frame?.contentDocument;
      const doc = wrapperDoc?.getElementById('neo-app')?.contentDocument || wrapperDoc;
      const profile = doc?.querySelector('.profile:not(.profile-add)');
      if (!profile) return false;
      profile.click();
      return true;
    });
    await page.waitForTimeout(2500);
    const tvAfterProfile = await snapshot('movies');
    const tvMovieOpened = await page.evaluate(() => {
      const root = document.getElementById('neo-os')?.contentDocument;
      const frame = root?.querySelector('.neo-window[data-app-id="movies"] iframe');
      const wrapperDoc = frame?.contentDocument;
      const doc = wrapperDoc?.getElementById('neo-app')?.contentDocument || wrapperDoc;
      const play = doc?.querySelector('[data-hero-play]');
      if (!play) return false;
      play.click();
      return true;
    });
    await page.waitForTimeout(2500);
    const tvAfterOpen = await snapshot('movies');

    console.log(JSON.stringify({ games, music, musicSearchStarted, musicAfterSearch, tv, tvProfileOpened, tvAfterProfile, tvMovieOpened, tvAfterOpen, pageErrors: pageErrors.slice(-20), failed: failed.slice(-30), badResponses: badResponses.slice(-50) }, null, 2));

    assert.ok(games.gameCards > 0, `Games catalog did not render: ${games.text}`);
    assert.equal(music.errorVisible, false, `NEO Music startup error: ${music.text}`);
    assert.ok(music.frameReady === 'interactive' || music.frameReady === 'complete', 'NEO Music frame did not load');
    assert.equal(music.musicReady, true, `NEO Music runtime did not become ready: ${music.frameText}`);
    assert.match(music.appUrl, /^https:\/\/fastly\.jsdelivr\.net\/(?:gh\/[^/]+\/[^/]+\/music-v2\/__neo_app__\/)?/, `NEO Music left its controlled CDN URL: ${music.appUrl}`);
    assert.equal(musicSearchStarted, true, 'NEO Music search form did not become interactive');
    assert.equal(musicAfterSearch.searchValue, 'Daft Punk', 'NEO Music search input did not retain the submitted query');
    assert.ok(musicAfterSearch.musicCards > 0, `NEO Music search returned no playable tracks: ${musicAfterSearch.frameText}`);
    assert.ok(!pageErrors.some((message) => /pushState|Invalid URL/i.test(message)), `Routing error remains: ${pageErrors.join(' | ')}`);
    assert.equal(tv.errorVisible, false, `NEO TV startup error: ${tv.text}`);
    assert.ok(tv.streamProfiles > 0, `NEO Stream profile picker is empty: ${tv.frameText}`);
    assert.equal(tvProfileOpened, true, 'NEO Stream profile could not be selected');
    assert.ok(tvAfterProfile.streamHero, `NEO Stream did not render its catalog: ${tvAfterProfile.frameText}`);
    assert.equal(tvMovieOpened, true, 'NEO Stream play control did not respond');
    assert.match(tvAfterOpen.streamVideo, /^https:\/\//, `NEO Stream video source is missing: ${tvAfterOpen.streamVideo}`);
    assert.ok(tvAfterOpen.streamReadyState >= 1, `NEO Stream video did not load metadata (error ${tvAfterOpen.streamError})`);
    assert.ok(tv.appUrl === 'about:srcdoc' || tv.appUrl.includes('/__neo_app__/'), `NEO Movies left its controlled app URL: ${tv.appUrl}`);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
