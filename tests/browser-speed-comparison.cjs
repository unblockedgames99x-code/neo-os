const path = require('node:path');
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE || '', '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright')
);

const neoUrl = process.env.NEO_SHELL_TEST_URL || 'http://127.0.0.1:3094/neo-os/';
const upstreamUrl = process.env.NEXTNODE_TEST_URL || 'https://nextnode9124.b-cdn.net/modules/browser/index.html';
const runs = Math.max(1, Number(process.env.NEO_BENCHMARK_RUNS || 3));

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

async function waitForExample(frame) {
  await frame.waitForFunction(() => {
    const page = document.querySelector('#frames iframe');
    try { return /Example Domain/i.test(page?.contentDocument?.body?.innerText || ''); } catch { return false; }
  }, null, { timeout: 90000 });
}

async function measureNeo(browser) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  try {
    await page.goto(neoUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => window.NEO_SHELL && document.documentElement.dataset.boot === 'complete', null, { timeout: 60000 });
    const launchStarted = performance.now();
    await page.evaluate(() => window.NEO_SHELL.openApp('browser'));
    const handle = await page.waitForSelector('.neo-window[data-app-id="browser"] iframe', { timeout: 30000 });
    const app = await handle.contentFrame();
    if (!app) throw new Error('NEO Browser frame did not attach.');
    await app.locator('#url').waitFor({ state: 'visible', timeout: 60000 });
    const interactiveMs = Math.round(performance.now() - launchStarted);
    const navigationStarted = performance.now();
    await app.locator('#url').fill('https://example.com/');
    await app.locator('#url').press('Enter');
    await waitForExample(app);
    return { interactiveMs, navigationMs: Math.round(performance.now() - navigationStarted) };
  } finally {
    await context.close();
  }
}

async function measureUpstream(browser) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  try {
    const launchStarted = performance.now();
    await page.goto(upstreamUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.locator('#url').waitFor({ state: 'visible', timeout: 60000 });
    const interactiveMs = Math.round(performance.now() - launchStarted);
    const navigationStarted = performance.now();
    await page.locator('#url').fill('https://example.com/');
    await page.locator('#url').press('Enter');
    await waitForExample(page.mainFrame());
    return { interactiveMs, navigationMs: Math.round(performance.now() - navigationStarted) };
  } finally {
    await context.close();
  }
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  try {
    const neo = [];
    const nextnode = [];
    for (let index = 0; index < runs; index += 1) {
      neo.push(await measureNeo(browser));
      nextnode.push(await measureUpstream(browser));
    }
    const summary = {
      runs,
      neoUrl,
      upstreamUrl,
      neo,
      nextnode,
      median: {
        neoInteractiveMs: median(neo.map((item) => item.interactiveMs)),
        nextnodeInteractiveMs: median(nextnode.map((item) => item.interactiveMs)),
        neoNavigationMs: median(neo.map((item) => item.navigationMs)),
        nextnodeNavigationMs: median(nextnode.map((item) => item.navigationMs)),
      },
    };
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
