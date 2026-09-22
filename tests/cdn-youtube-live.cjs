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
  const errors = [];
  const requestFailures = [];
  const consoleErrors = [];
  const assetResponses = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => {
    if (/piped|ytimg|youtube/i.test(request.url())) requestFailures.push(`${request.url()} :: ${request.failure()?.errorText || 'failed'}`);
  });
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('response', response => {
    if (/neo-youtube\/(?:app|index)|neo-(?:ad-shield|link-proxy|proxy-client|app-theme)/i.test(response.url())) {
      assetResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  const rootClick = selector => page.evaluate(selector => {
    const root = document.getElementById('neo-os')?.contentDocument || document;
    const target = root.querySelector(selector);
    if (!target) return false;
    target.click();
    return true;
  }, selector);

  try {
    await page.goto(liveUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => Boolean((document.getElementById('neo-os')?.contentWindow || window).NEO_SHELL), null, { timeout: 60000 });
    assert.equal(await rootClick('[data-start-mode="laptop"]'), true);
    await page.waitForFunction(() => Boolean((document.getElementById('neo-os')?.contentDocument || document).querySelector('[data-neo-login-guest]')), null, { timeout: 30000 });
    assert.equal(await rootClick('[data-neo-login-guest]'), true);
    await page.waitForFunction(() => Boolean((document.getElementById('neo-os')?.contentDocument || document).getElementById('neo-login-gate')?.hidden), null, { timeout: 30000 });

    assert.equal(await page.evaluate(() => {
      const shell = (document.getElementById('neo-os')?.contentWindow || window).NEO_SHELL;
      if (!shell) return false;
      if (!shell.isInstalled('youtube-app')) shell.setInstalled('youtube-app', true);
      return Boolean(shell.openApp('youtube-app'));
    }), true);

    await page.waitForFunction(() => {
      const root = document.getElementById('neo-os')?.contentDocument || document;
      const wrapper = root?.querySelector('.neo-window[data-app-id="youtube-app"] iframe')?.contentDocument;
      const doc = wrapper?.getElementById('neo-app')?.contentDocument || wrapper;
      return Boolean(doc?.querySelector('[data-search-form]'));
    }, null, { timeout: 30000 });
    await page.waitForFunction(() => {
      const root = document.getElementById('neo-os')?.contentDocument || document;
      const wrapper = root?.querySelector('.neo-window[data-app-id="youtube-app"] iframe')?.contentDocument;
      const doc = wrapper?.getElementById('neo-app')?.contentDocument || wrapper;
      return doc?.readyState === 'complete';
    }, null, { timeout: 60000 });

    await page.evaluate(() => {
      const root = document.getElementById('neo-os')?.contentDocument || document;
      const wrapper = root.querySelector('.neo-window[data-app-id="youtube-app"] iframe').contentDocument;
      const doc = wrapper.getElementById('neo-app')?.contentDocument || wrapper;
      doc.querySelector('[data-search-input]').value = 'gaming';
      doc.querySelector('[data-search-form]').requestSubmit();
    });

    try {
      await page.waitForFunction(() => {
        const root = document.getElementById('neo-os')?.contentDocument || document;
        const wrapper = root?.querySelector('.neo-window[data-app-id="youtube-app"] iframe')?.contentDocument;
        const doc = wrapper?.getElementById('neo-app')?.contentDocument || wrapper;
        const status = doc?.querySelector('[data-result-status]')?.textContent || '';
        const first = doc?.querySelector('.video-result:not(.skeleton-result)');
        return Boolean(first && /Catalogue:/.test(status));
      }, null, { timeout: 30000 });
    } catch (error) {
      const diagnostics = await page.evaluate(() => {
        const root = document.getElementById('neo-os')?.contentDocument || document;
        const wrapper = root?.querySelector('.neo-window[data-app-id="youtube-app"] iframe')?.contentDocument;
        const appFrame = wrapper?.getElementById('neo-app');
        const doc = appFrame?.contentDocument || wrapper;
        return {
          wrapper: wrapper?.body?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 300) || '',
          appSource: appFrame?.getAttribute('src') || '',
          status: doc?.querySelector('[data-result-status]')?.textContent || '',
          cards: doc?.querySelectorAll('.video-result:not(.skeleton-result)').length || 0,
          empty: doc?.querySelector('.empty-state')?.textContent?.replace(/\s+/g, ' ').trim() || '',
          proxy: doc?.defaultView?.__NEOLinkProxyInstalled === true,
          sourceUrl: doc?.querySelector('meta[name="neo-source-url"]')?.content || ''
        };
      });
      diagnostics.requestFailures = requestFailures;
      diagnostics.consoleErrors = consoleErrors;
      diagnostics.assetResponses = assetResponses;
      diagnostics.pageErrors = errors;
      console.error(JSON.stringify(diagnostics, null, 2));
      throw error;
    }

    await page.waitForFunction(() => {
      const root = document.getElementById('neo-os')?.contentDocument || document;
      const wrapper = root?.querySelector('.neo-window[data-app-id="youtube-app"] iframe')?.contentDocument;
      const doc = wrapper?.getElementById('neo-app')?.contentDocument || wrapper;
      const image = doc?.querySelector('.video-result img[data-video-id]');
      return Boolean(image?.complete && image.naturalWidth > 1);
    }, null, { timeout: 30000 });

    const catalogue = await page.evaluate(() => {
      const root = document.getElementById('neo-os')?.contentDocument || document;
      const wrapper = root.querySelector('.neo-window[data-app-id="youtube-app"] iframe').contentDocument;
      const doc = wrapper.getElementById('neo-app')?.contentDocument || wrapper;
      return {
        status: doc.querySelector('[data-result-status]').textContent,
        count: doc.querySelectorAll('.video-result:not(.skeleton-result)').length,
        title: doc.querySelector('.result-title')?.textContent || '',
        imageWidth: doc.querySelector('.video-result img[data-video-id]')?.naturalWidth || 0
      };
    });
    assert.ok(catalogue.count >= 10, `Expected live search results, received ${catalogue.count}`);
    assert.ok(catalogue.imageWidth > 1, 'Expected a real thumbnail');
    assert.doesNotMatch(catalogue.title, /OpenView featured video|Big Buck Bunny|Creative Commons animation showcase/);

    await page.evaluate(() => {
      const root = document.getElementById('neo-os')?.contentDocument || document;
      const wrapper = root.querySelector('.neo-window[data-app-id="youtube-app"] iframe').contentDocument;
      const doc = wrapper.getElementById('neo-app')?.contentDocument || wrapper;
      doc.querySelector('.video-result:not(.skeleton-result)').click();
    });
    try {
      await page.waitForFunction(() => {
        const root = document.getElementById('neo-os')?.contentDocument || document;
        const wrapper = root?.querySelector('.neo-window[data-app-id="youtube-app"] iframe')?.contentDocument;
        const doc = wrapper?.getElementById('neo-app')?.contentDocument || wrapper;
        const frame = doc?.querySelector('[data-player-shell] iframe');
        const routed = frame?.dataset.neoProxyReady === 'true';
        const recovered = frame?.dataset.neoPlaybackRecovered === 'true';
        return Boolean((routed || recovered) && frame.getAttribute('src') && frame.getAttribute('src') !== 'about:blank');
      }, null, { timeout: 30000 });
    } catch (error) {
      const state = await page.evaluate(() => {
        const root = document.getElementById('neo-os')?.contentDocument || document;
        const wrapper = root?.querySelector('.neo-window[data-app-id="youtube-app"] iframe')?.contentDocument;
        const doc = wrapper?.getElementById('neo-app')?.contentDocument || wrapper;
        const frame = doc?.querySelector('[data-player-shell] iframe');
        return {
          ready: frame?.dataset.neoProxyReady || '',
          requestId: frame?.dataset.neoProxyRequestId || '',
          error: frame?.dataset.neoProxyError || '',
          recovered: frame?.dataset.neoPlaybackRecovered || '',
          source: frame?.dataset.neoProxySource || '',
          src: frame?.getAttribute('src') || ''
        };
      });
      state.requestFailures = requestFailures;
      state.consoleErrors = consoleErrors;
      state.pageErrors = errors;
      console.error(JSON.stringify(state, null, 2));
      throw error;
    }
    const playback = await page.evaluate(() => {
      const root = document.getElementById('neo-os')?.contentDocument || document;
      const wrapper = root.querySelector('.neo-window[data-app-id="youtube-app"] iframe').contentDocument;
      const doc = wrapper.getElementById('neo-app')?.contentDocument || wrapper;
      const frame = doc.querySelector('[data-player-shell] iframe');
      return { ready: frame?.dataset.neoProxyReady || '', recovered: frame?.dataset.neoPlaybackRecovered === 'true', trustedEmbed: frame?.dataset.neoTrustedEmbed || '', source: frame?.dataset.neoProxySource || '', src: frame?.getAttribute('src') || '', title: doc.querySelector('[data-watch-title]')?.textContent || '' };
    });
    assert.ok(playback.ready === 'true' || playback.recovered, 'Playback neither routed through the proxy nor entered trusted recovery');
    assert.notEqual(playback.src, 'about:blank');
    if (!playback.recovered) assert.doesNotMatch(playback.src, /^https:\/\/www\.youtube-nocookie\.com\//, 'Playback bypassed the NEO web proxy before recovery was needed');

    await page.waitForTimeout(6000);
    const renderedPlayback = await page.evaluate(() => {
      const root = document.getElementById('neo-os')?.contentDocument || document;
      const wrapper = root.querySelector('.neo-window[data-app-id="youtube-app"] iframe').contentDocument;
      const doc = wrapper.getElementById('neo-app')?.contentDocument || wrapper;
      const frame = doc.querySelector('[data-player-shell] iframe');
      let frameDocument = null;
      try { frameDocument = frame?.contentDocument || null; } catch (_error) {}
      const video = frameDocument?.querySelector('video');
      return {
        source: frame?.getAttribute('src') || '',
        recovered: frame?.dataset.neoPlaybackRecovered === 'true',
        trustedEmbed: frame?.dataset.neoTrustedEmbed || '',
        documentReady: frameDocument?.readyState || '',
        htmlLength: frameDocument?.documentElement?.outerHTML?.length || 0,
        text: frameDocument?.body?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 300) || '',
        playerCount: frameDocument?.querySelectorAll('.html5-video-player, #movie_player').length || 0,
        videoCount: frameDocument?.querySelectorAll('video').length || 0,
        videoReadyState: video?.readyState || 0,
        videoError: video?.error?.code || 0
      };
    });
    if (renderedPlayback.recovered) {
      const officialFrame = page.frames().find(frame => /youtube-nocookie\.com\/embed\//.test(frame.url()));
      assert.ok(officialFrame, 'Playback recovery did not reach the official privacy-enhanced player');
      await officialFrame.waitForSelector('#movie_player', { timeout: 20000 });
      renderedPlayback.playerCount = await officialFrame.locator('#movie_player').count();
      renderedPlayback.videoCount = await officialFrame.locator('video').count();
      if (renderedPlayback.videoCount) {
        Object.assign(renderedPlayback, await officialFrame.locator('video').first().evaluate(video => ({
          videoReadyState: video.readyState,
          videoError: video.error?.code || 0,
          videoCurrentTime: video.currentTime,
          videoPaused: video.paused
        })));
      }
    }
    console.log(JSON.stringify({ playback, renderedPlayback }, null, 2));
    assert.ok(renderedPlayback.playerCount > 0 || renderedPlayback.videoCount > 0, 'The proxied player route loaded but did not render a playable video surface');
    assert.equal(renderedPlayback.videoError, 0, 'The rendered video element reported a media error');
    if (renderedPlayback.videoCount) assert.ok(renderedPlayback.videoReadyState >= 2, 'The rendered video did not buffer playable media');
    assert.deepEqual(errors.filter(message => !/ResizeObserver loop/.test(message) && !(renderedPlayback.recovered && /writeEmbed is not defined/.test(message))), []);
    console.log(`Live YouTube search returned ${catalogue.count} real videos with thumbnails and working playback recovery.`);
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
