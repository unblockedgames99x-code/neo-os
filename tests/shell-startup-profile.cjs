const path = require('node:path');
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
);

const urls = process.argv.slice(2);
if (!urls.length) throw new Error('Pass one or more URLs to profile.');

async function profile(browser, url) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const failures = [];
  page.on('requestfailed', (request) => failures.push(request.url()));
  await page.addInitScript(() => {
    window.__neoProfile = { longTasks: [] };
    try {
      new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => window.__neoProfile.longTasks.push(entry.duration));
      }).observe({ type: 'longtask', buffered: true });
    } catch {}
  });

  const started = Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  const domContentLoadedMs = Date.now() - started;
  let shellReadyMs = null;
  try {
    await page.waitForFunction(() => {
      const frame = document.getElementById('neo-os');
      return Boolean(frame?.contentWindow?.NEO_SHELL || window.NEO_SHELL);
    }, null, { timeout: 45000 });
    shellReadyMs = Date.now() - started;
  } catch {}
  await page.waitForTimeout(2500);

  const frames = [];
  for (const frame of page.frames()) {
    try {
      frames.push(await frame.evaluate(() => {
        const resources = performance.getEntriesByType('resource');
        const navigation = performance.getEntriesByType('navigation')[0];
        const paints = performance.getEntriesByType('paint');
        const longTasks = window.__neoProfile?.longTasks || [];
        return {
          url: location.href.slice(0, 160),
          resources: resources.length,
          transferBytes: resources.reduce((sum, item) => sum + (item.transferSize || 0), 0),
          decodedBytes: resources.reduce((sum, item) => sum + (item.decodedBodySize || 0), 0),
          loadEventMs: Math.round(navigation?.loadEventEnd || 0),
          firstPaintMs: Math.round(paints.find((item) => item.name === 'first-paint')?.startTime || 0),
          firstContentfulPaintMs: Math.round(paints.find((item) => item.name === 'first-contentful-paint')?.startTime || 0),
          longTaskCount: longTasks.length,
          longTaskTotalMs: Math.round(longTasks.reduce((sum, value) => sum + value, 0)),
          longestTaskMs: Math.round(Math.max(0, ...longTasks)),
          heapBytes: performance.memory?.usedJSHeapSize || null,
        };
      }));
    } catch {}
  }

  await context.close();
  return { url, domContentLoadedMs, shellReadyMs, failures: failures.length, frames };
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  try {
    const results = [];
    for (const url of urls) results.push(await profile(browser, url));
    console.log(JSON.stringify(results, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
