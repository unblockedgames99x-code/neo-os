const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
);

const url = process.env.NEO_MUSIC_FAST_RELAY_URL || 'http://127.0.0.1:3092/neo-os/music-v2/?test=fast-relay-v1';

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.locator('.music-card').first().waitFor({ state: 'visible' });

    const started = Date.now();
    await page.locator('.music-card').first().click();
    await page.waitForFunction(() => {
      const audio = document.querySelector('audio');
      return audio && /cirrusbk6l\.planet35\.com\/_o\/m\/stream\//.test(audio.currentSrc || audio.src);
    }, null, { timeout: 5000 });
    const routeMs = Date.now() - started;
    const state = await page.evaluate(() => ({
      src: document.querySelector('audio')?.currentSrc || document.querySelector('audio')?.src || '',
      status: document.getElementById('npmTrackArtist')?.textContent || '',
      query: document.getElementById('amLyricsEl')?.query || '',
    }));

    assert.ok(routeMs < 2500, `first-party relay routing took ${routeMs}ms`);
    assert.match(state.src, /^https:\/\/cirrusbk6l\.planet35\.com\/_o\/m\/stream\//);
    assert.doesNotMatch(state.status, /Connecting through NEO proxy/i);
    console.log(`NEO Music selected its range-enabled relay in ${routeMs}ms without starting the browser proxy.`);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
