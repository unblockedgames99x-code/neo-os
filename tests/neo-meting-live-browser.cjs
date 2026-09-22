const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
);

const target = process.env.NEO_MUSIC_LIVE_URL;
if (!target) throw new Error('Set NEO_MUSIC_LIVE_URL to an immutable music launch URL.');
const serverOrigin = process.env.NEO_MUSIC_SERVER_ORIGIN || 'https://neo-stratus-api-w6nw.onrender.com';

async function musicDocument(page) {
  if (!new URL(target).pathname.endsWith('.svg')) return page.mainFrame();
  const handle = await page.waitForSelector('#neo-app', { timeout: 120000 });
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const frame = await handle.contentFrame() ||
      page.frames().find((candidate) => candidate.parentFrame() === page.mainFrame());
    if (frame) return frame;
    await page.waitForTimeout(100);
  }
  throw new Error('The production music launcher iframe did not become ready.');
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--autoplay-policy=user-gesture-required'],
  });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await context.addInitScript((origin) => {
    window.__NEO_MUSIC_SERVER_ORIGIN__ = origin;
    const routed = [];
    window.__NEO_TEST_PROXY_REQUESTS__ = routed;
    const resolve = async (value, kind) => {
      routed.push({ value: String(value), kind: String(kind || 'fetch') });
      if (String(kind) === 'fetch' && !String(value).startsWith(origin)) {
        return 'data:application/json,%7B%22results%22%3A%5B%5D%7D';
      }
      return String(value);
    };
    window.NEO_PROXY_CLIENT = Object.freeze({
      resolve,
      fetch: async (value, options) => fetch(await resolve(value, 'fetch'), options),
      image: (value) => resolve(value, 'image'),
      media: (value) => resolve(value, 'media'),
    });
  }, serverOrigin);
  const page = await context.newPage();
  const failures = [];
  const musicRequests = [];
  page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`));
  page.on('request', (request) => {
    if (/music\/v1|neo-stratus-api|drfrost/i.test(request.url())) musicRequests.push(`request ${request.url()}`);
  });
  page.on('response', (response) => {
    if (/music\/v1|neo-stratus-api|drfrost/i.test(response.url())) musicRequests.push(`response ${response.status()} ${response.url()}`);
  });
  page.on('requestfailed', (request) => {
    if (/music\/v1|neo-stratus-api|drfrost/i.test(request.url())) musicRequests.push(`failed ${request.failure()?.errorText} ${request.url()}`);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(`console: ${message.text()}`);
  });

  try {
    await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 120000 });
    const music = await musicDocument(page);
    try {
      await music.waitForFunction(() => Boolean(window.__NEO_METING_PLAYER__ && window.__NEO_MUSIC_API__), null, { timeout: 30000 });
    } catch (error) {
      console.error('Music boot diagnostics:', await music.evaluate(() => ({
        url: location.href,
        title: document.title,
        body: document.body?.innerText?.slice(0, 500),
        player: Boolean(window.__NEO_METING_PLAYER__),
        api: window.__NEO_MUSIC_API__ || null,
        scripts: Array.from(document.scripts).map((script) => script.src).filter(Boolean),
      })));
      console.error(failures.join('\n'));
      console.error(musicRequests.join('\n'));
      throw error;
    }
    await music.locator('#searchInput').fill('MONTAGEM');
    try {
      await music.waitForFunction(() => (
        (window.__NEO_TEST_PROXY_REQUESTS__ || []).some((request) => (
          request.kind === 'music-catalog' && /\/music\/v1\/search/.test(request.value)
        ))
      ), null, { timeout: 15000 });
      await music.locator('.music-card').first().waitFor({ state: 'visible', timeout: 15000 });
    } catch (error) {
      console.error('Music search diagnostics:', await music.evaluate(() => ({
        status: document.querySelector('.catalog-status')?.textContent?.trim(),
        api: window.__NEO_MUSIC_API__,
        integration: Boolean(window.__NEO_METING_INTEGRATION__),
        cards: document.querySelectorAll('.music-card').length,
      })));
      console.error(failures.join('\n'));
      console.error(musicRequests.join('\n'));
      throw error;
    }

    const cardCount = await music.locator('.music-card').count();
    assert.ok(cardCount > 0, 'The production search returned no music cards.');
    await music.locator('.music-card').first().click();
    try {
      await music.waitForFunction(() => {
        const audio = document.querySelector('audio');
        return Boolean(audio && /\/music\/v1\/audio\//.test(audio.currentSrc || audio.src) && audio.readyState >= HTMLMediaElement.HAVE_METADATA);
      }, null, { timeout: 30000 });
    } catch (error) {
      console.error('Music playback diagnostics:', await music.evaluate(() => {
        const audio = document.querySelector('audio');
        return {
          source: audio && (audio.currentSrc || audio.src),
          readyState: audio?.readyState,
          networkState: audio?.networkState,
          paused: audio?.paused,
          title: document.getElementById('npmTrackTitle')?.textContent,
          artist: document.getElementById('npmTrackArtist')?.textContent,
        };
      }));
      console.error(failures.join('\n'));
      console.error(musicRequests.join('\n'));
      throw error;
    }

    const state = await music.evaluate(() => {
      const audio = document.querySelector('audio');
      return {
        api: window.__NEO_MUSIC_API__.base,
        audioCount: document.querySelectorAll('audio').length,
        source: audio && (audio.currentSrc || audio.src),
        title: document.getElementById('npmTrackTitle').textContent.trim(),
        artist: document.getElementById('npmTrackArtist').textContent.trim(),
        paused: audio ? audio.paused : true,
        proxyRequests: window.__NEO_TEST_PROXY_REQUESTS__ || [],
      };
    });
    assert.equal(state.api, serverOrigin);
    assert.equal(state.audioCount, 1, 'The player created duplicate audio elements.');
    assert.ok(state.title && state.title !== '-', 'Track metadata did not reach the player UI.');
    assert.ok(state.artist && state.artist !== '-', 'Artist metadata did not reach the player UI.');
    assert.match(state.source, /\/music\/v1\/audio\//);
    assert.equal(state.paused, false, 'Playback did not start after the user click.');
    assert.ok(state.proxyRequests.some((request) => request.kind === 'music-catalog' && /\/music\/v1\/search/.test(request.value)),
      `Music search did not ask the shared proxy to route the catalogue request: ${JSON.stringify(state.proxyRequests)}`);
    assert.ok(state.proxyRequests.some((request) => request.kind === 'image' && /^https?:/.test(request.value)),
      'Music cover art did not ask the shared proxy for an image route.');
    assert.ok(state.proxyRequests.some((request) => request.kind === 'media' && /\/music\/v1\/audio\//.test(request.value)),
      'Music playback did not ask the shared proxy for a media route.');
    assert.equal(failures.filter((item) => !/favicon|font|Failed to load resource/i.test(item)).length, 0, failures.join('\n'));
    console.log('Production Meting search and playback checks passed.');
  } finally {
    await context.close();
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
