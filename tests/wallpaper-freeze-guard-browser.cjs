const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
);

const baseUrl = process.env.NEO_BASE_URL || 'http://127.0.0.1:3094/neo-os/';
const desktopUrl = process.env.NEO_DESKTOP_URL || baseUrl;
const wallpaperUrl = process.env.NEO_WALLPAPER_URL || new URL('assets/wallpaper-engine-web/1403160205/index.html', baseUrl).href;
const wallpaperInsideDesktop = process.env.NEO_WALLPAPER_IN_DESKTOP === '1';

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  try {
    await page.goto(wallpaperInsideDesktop ? desktopUrl : wallpaperUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction((insideDesktop) => {
      if (!insideDesktop) return Boolean(window.__neoWallpaperCompat);
      const outer = document.getElementById('neo-os');
      const root = outer && outer.contentDocument;
      const frame = root && root.querySelector('#wallpaper-media iframe');
      return Boolean(frame && frame.contentWindow && frame.contentWindow.__neoWallpaperCompat);
    }, wallpaperInsideDesktop, { timeout: 120000 });
    await page.evaluate(() => {
      window.__neoFreezeWallpaperView = function () {
        const outer = document.getElementById('neo-os');
        const root = outer && outer.contentDocument;
        const frame = root && root.querySelector('#wallpaper-media iframe');
        return frame && frame.contentWindow ? frame.contentWindow : window;
      };
    });

    const initial = await page.evaluate(() => {
      const view = window.__neoFreezeWallpaperView();
      view.__neoFreezeFrameTicks = 0;
      view.__neoFreezeIntervalTicks = 0;
      (function loop() {
        view.__neoFreezeFrameTicks += 1;
        view.requestAnimationFrame(loop);
      })();
      view.__neoFreezeProbeInterval = view.setInterval(() => {
        view.__neoFreezeIntervalTicks += 1;
      }, 20);
      return view.__neoWallpaperCompat.getState();
    });
    assert.equal(initial.frameRateLimit, 30, 'wallpaper frames should be capped at 30 FPS');

    await page.waitForTimeout(400);
    const running = await page.evaluate(() => {
      const view = window.__neoFreezeWallpaperView();
      return { frames: view.__neoFreezeFrameTicks, intervals: view.__neoFreezeIntervalTicks };
    });
    assert.ok(running.frames >= 5 && running.frames <= 16, `expected capped frame progress, got ${running.frames}`);
    assert.ok(running.intervals >= 5, 'wallpaper intervals should run before pause');

    await page.evaluate(() => {
      window.__neoFreezeWallpaperView().__neoWallpaperCompat.pause();
    });
    await page.waitForTimeout(80);
    const pausedStart = await page.evaluate(() => {
      const view = window.__neoFreezeWallpaperView();
      return { frames: view.__neoFreezeFrameTicks, intervals: view.__neoFreezeIntervalTicks };
    });
    await page.waitForTimeout(350);
    const pausedEnd = await page.evaluate(() => {
      const view = window.__neoFreezeWallpaperView();
      return { frames: view.__neoFreezeFrameTicks, intervals: view.__neoFreezeIntervalTicks, state: view.__neoWallpaperCompat.getState() };
    });
    assert.equal(pausedEnd.frames, pausedStart.frames, 'animation frames must stop while the wallpaper is paused');
    assert.equal(pausedEnd.intervals, pausedStart.intervals, 'wallpaper intervals must stop while paused');
    assert.equal(pausedEnd.state.paused, true, 'compatibility runtime should report paused state');

    await page.evaluate(() => {
      window.__neoFreezeWallpaperView().__neoWallpaperCompat.resume();
    });
    await page.waitForTimeout(300);
    const resumed = await page.evaluate(() => {
      const view = window.__neoFreezeWallpaperView();
      view.clearInterval(view.__neoFreezeProbeInterval);
      return { frames: view.__neoFreezeFrameTicks, intervals: view.__neoFreezeIntervalTicks };
    });
    assert.ok(resumed.frames > pausedEnd.frames, 'animation frames should resume after playback resumes');
    assert.ok(resumed.intervals > pausedEnd.intervals, 'wallpaper intervals should resume after playback resumes');

    await page.goto(desktopUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => {
      const outer = document.getElementById('neo-os');
      const view = outer ? outer.contentWindow : window;
      return Boolean(view && view.NEOWallpaperEngine);
    }, null, { timeout: 60000 });
    await page.evaluate(() => {
      const outer = document.getElementById('neo-os');
      const view = outer ? outer.contentWindow : window;
      return view.NEOWallpaperEngine.apply('we-steam-1403160205');
    });
    await page.waitForFunction(() => {
      const outer = document.getElementById('neo-os');
      const view = outer ? outer.contentWindow : window;
      return view.NEOWallpaperEngine.getState().id === 'we-steam-1403160205';
    });
    await page.evaluate(() => {
      const outer = document.getElementById('neo-os');
      const view = outer ? outer.contentWindow : window;
      view.__neoFreezeBackoff = null;
      view.__neoFreezeResumption = null;
      view.__neoFreezeUnsubscribe = view.NEOWallpaperEngine.subscribe(state => {
        if (state.reason !== 'stability-backoff' && state.reason !== 'stability-resume') return;
        const snapshot = {
          state: { ...state },
          marker: view.document.documentElement.dataset.wallpaperStability,
          responsive: Boolean(view.document.querySelector('.desktop')),
        };
        if (state.reason === 'stability-backoff' && !view.__neoFreezeBackoff) view.__neoFreezeBackoff = snapshot;
        else if (state.reason === 'stability-resume' && view.__neoFreezeBackoff && !view.__neoFreezeResumption) view.__neoFreezeResumption = snapshot;
      });
      // Exceeds the one-second drift threshold at any normal timer phase.
      const until = performance.now() + 2100;
      while (performance.now() < until) {}
    });
    const recoveryHandle = await page.waitForFunction(() => {
      const outer = document.getElementById('neo-os');
      return (outer ? outer.contentWindow : window).__neoFreezeBackoff;
    }, null, { timeout: 5000 });
    const recovery = await recoveryHandle.jsonValue();
    await recoveryHandle.dispose();
    assert.equal(recovery.state.stabilityPaused, true, 'a large stall should temporarily pause wallpaper rendering');
    assert.equal(recovery.state.playback, 'paused', 'backoff should actually pause wallpaper playback');
    assert.equal(recovery.marker, 'recovering', 'the recovery state should be visible to diagnostics');
    assert.equal(recovery.responsive, true, 'the desktop should remain available during recovery');

    const resumptionHandle = await page.waitForFunction(() => {
      const outer = document.getElementById('neo-os');
      return (outer ? outer.contentWindow : window).__neoFreezeResumption;
    }, null, { timeout: 6000 });
    const resumption = await resumptionHandle.jsonValue();
    await resumptionHandle.dispose();
    assert.equal(resumption.state.stabilityPaused, false, 'the temporary backoff should recover automatically');
    assert.equal(resumption.marker, 'stable', 'recovery should clear its diagnostic marker');
    assert.equal(resumption.state.playing, true, 'wallpaper animation should resume after recovery');
    await page.evaluate(() => {
      const outer = document.getElementById('neo-os');
      (outer ? outer.contentWindow : window).__neoFreezeUnsubscribe();
    });

    console.log('Wallpaper freeze guard browser test passed', { running, pausedEnd, resumed, recovery });
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
