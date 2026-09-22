const path = require('node:path');
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
);

const url = process.env.NEO_STREAM_LIVE_URL;
if (!url) throw new Error('Set NEO_STREAM_LIVE_URL to the immutable Stream launch.svg URL.');

async function measure(context, label) {
  const page = await context.newPage();
  const started = performance.now();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => Boolean(
    document.getElementById('neo-app')?.contentDocument?.querySelector('[data-profiles] .profile')
  ), null, { timeout: 60000 });
  const readyMs = Math.round(performance.now() - started);
  const app = page.frames().find((frame) => /\/__neo_app__\//.test(frame.url()));
  const metrics = await app.evaluate(() => {
    const resources = performance.getEntriesByType('resource');
    const navigation = performance.getEntriesByType('navigation')[0];
    return {
      appDomContentLoadedMs: Math.round(navigation.domContentLoadedEventEnd),
      appLoadMs: Math.round(navigation.loadEventEnd),
      resourceCount: resources.length,
      transferBytes: resources.reduce((sum, item) => sum + (item.transferSize || 0), 0),
      decodedBytes: resources.reduce((sum, item) => sum + (item.decodedBodySize || 0), 0),
    };
  });
  await page.close();
  return { label, readyMs, ...metrics };
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  try {
    const cold = await measure(context, 'cold');
    const cached = await measure(context, 'cached');
    console.log(JSON.stringify({ cold, cached }, null, 2));
  } finally {
    await context.close();
    await browser.close();
  }
})().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
