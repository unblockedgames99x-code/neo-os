const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE || '', '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright')
);

const target = process.env.NEO_OS_TEST_URL || 'http://127.0.0.1:3092/neo-os/';

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required']
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  try {
    await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => Boolean(window.NEO_SHELL), null, { timeout: 30000 });
    await page.locator('[data-start-mode="laptop"]').click();
    await page.locator('[data-neo-login-guest]').waitFor({ state: 'visible' });
    await page.locator('[data-neo-login-guest]').click();
    await page.waitForFunction(() => document.getElementById('neo-login-gate')?.hidden);
    await page.evaluate(() => {
      if (!window.NEO_SHELL.isInstalled('youtube-app')) window.NEO_SHELL.setInstalled('youtube-app', true);
      window.NEO_SHELL.openApp('youtube-app');
    });
    await page.waitForFunction(() => document.querySelector('.neo-window[data-app-id="youtube-app"] iframe')?.contentDocument?.querySelector('[data-search-form]'));
    await page.evaluate(() => {
      const app = document.querySelector('.neo-window[data-app-id="youtube-app"] iframe').contentDocument;
      app.querySelector('[data-search-input]').value = 'https://www.youtube.com/watch?v=M7lc1UVf-VE';
      app.querySelector('[data-search-form]').requestSubmit();
    });
    await page.waitForFunction(() => document.querySelector('.neo-window[data-app-id="youtube-app"] iframe')?.contentDocument?.querySelector('[data-player-shell] iframe'));
    await page.waitForTimeout(6000);
    await page.evaluate(() => {
      document.querySelector('.neo-window[data-app-id="youtube-app"] iframe').contentDocument.querySelector('[data-popout-video]').click();
    });
    const popout = page.locator('.neo-window[data-app-id="youtube-app"].is-youtube-popout');
    await popout.waitFor({ state: 'visible' });
    await page.waitForTimeout(2500);

    const state = await page.evaluate(() => {
      const windowElement = document.querySelector('.neo-window[data-app-id="youtube-app"]');
      const app = windowElement.querySelector('iframe').contentDocument;
      const shell = app.querySelector('[data-player-shell]');
      const frame = shell.querySelector('iframe');
      const poster = shell.querySelector('[data-popout-poster]');
      const posterImage = poster?.querySelector('img');
      const shellRect = shell.getBoundingClientRect();
      const frameRect = frame.getBoundingClientRect();
      const windowRect = windowElement.getBoundingClientRect();
      const posterRect = poster?.getBoundingClientRect();
      const posterImageRect = posterImage?.getBoundingClientRect();
      return {
        src: frame.getAttribute('src') || '',
        resumed: frame.dataset.neoPopoutPlaying || '',
        topCrop: Math.round(frameRect.top - shellRect.top),
        extraHeight: Math.round(frameRect.height - shellRect.height),
        width: Math.round(windowRect.width),
        height: Math.round(windowRect.height),
        chrome: getComputedStyle(windowElement.querySelector('.window-chrome')).display,
        sourceClass: shell.className,
        posterDisplay: poster ? getComputedStyle(poster).display : '',
        posterOpacity: poster ? getComputedStyle(poster).opacity : '',
        posterSize: posterRect ? [Math.round(posterRect.width), Math.round(posterRect.height)] : [],
        posterImageSize: posterImageRect ? [Math.round(posterImageRect.width), Math.round(posterImageRect.height)] : [],
        posterImageNatural: posterImage ? [posterImage.naturalWidth, posterImage.naturalHeight] : [],
        posterImageSource: posterImage?.currentSrc || ''
      };
    });
    assert.match(state.src, /youtube-nocookie\.com\/embed\/M7lc1UVf-VE/);
    assert.equal(state.resumed, 'true');
    assert.equal(state.topCrop, 0);
    assert.equal(state.extraHeight, 0);
    assert.ok(Math.abs(state.width / state.height - 16 / 9) < 0.02);
    assert.equal(state.chrome, 'none');
    assert.equal(state.posterDisplay, 'grid');
    assert.equal(state.posterOpacity, '1');
    assert.ok(state.posterSize[0] >= state.width - 4);
    assert.ok(state.posterSize[1] >= state.height - 4);
    assert.deepEqual(state.posterImageSize, state.posterSize);
    assert.ok(state.posterImageNatural[0] > 1 && state.posterImageNatural[1] > 1);
    assert.match(state.posterImageSource, /ytimg\.com\/vi\/M7lc1UVf-VE\//);
    await popout.screenshot({
      path: path.resolve(__dirname, '..', '.codex-tmp', 'youtube-popout-video-only.png')
    });
    console.log(JSON.stringify(state));
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
