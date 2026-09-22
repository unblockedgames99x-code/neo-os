const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
);

const root = path.resolve(process.env.NEO_BROWSER_ROOT || path.join(__dirname, '..', 'neo-os'));
const cpuRate = Math.max(1, Number(process.env.NEO_CPU_RATE || 6));
const settleMs = Math.max(1000, Number(process.env.NEO_SETTLE_MS || 5000));
const youtubeUrl = process.env.NEO_YOUTUBE_URL || 'https://www.youtube.com/';

const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
  '.woff2': 'font/woff2',
};

function serveStatic(request, response) {
  const requestPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const relative = requestPath === '/' ? '/NEO-BROWSER/index.html' : requestPath;
  const file = path.resolve(root, `.${relative}`);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    response.writeHead(404).end('Not found');
    return;
  }
  response.writeHead(200, {
    'content-type': types[path.extname(file).toLowerCase()] || 'application/octet-stream',
    'cache-control': 'no-store',
  });
  fs.createReadStream(file).pipe(response);
}

async function measure(browser, baseUrl, label, suffix) {
  const context = await browser.newContext({ viewport: { width: 1180, height: 760 } });
  const page = await context.newPage();
  const consoleErrors = [];
  const requestFailures = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('requestfailed', (request) => {
    requestFailures.push(`${request.url()}: ${request.failure()?.errorText || 'failed'}`);
  });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuRate });
  await page.addInitScript(() => {
    window.__neoLongTasks = [];
    new PerformanceObserver((list) => {
      for (const item of list.getEntries()) {
        window.__neoLongTasks.push({ start: item.startTime, duration: item.duration });
      }
    }).observe({ type: 'longtask', buffered: true });
  });

  const started = Date.now();
  await page.goto(`${baseUrl}/NEO-BROWSER/index.html${suffix}`, {
    waitUntil: 'domcontentloaded',
    timeout: 120000,
  });
  const domContentLoadedMs = Date.now() - started;
  await page.locator('#url').waitFor({ state: 'attached', timeout: 30000 });
  const shellReadyMs = Date.now() - started;
  await page.waitForTimeout(settleMs);

  const metrics = await page.evaluate(() => {
    const resources = performance.getEntriesByType('resource').map((entry) => ({
      name: entry.name,
      transferSize: entry.transferSize || 0,
      decodedBodySize: entry.decodedBodySize || 0,
      duration: entry.duration || 0,
    }));
    const enginePattern = /(?:curl\/index\.mjs|libcurl-0\.7\.4|\.wasm(?:$|\?))/i;
    const engines = resources.filter((entry) => enginePattern.test(entry.name));
    const longTasks = window.__neoLongTasks || [];
    return {
      resourceCount: resources.length,
      transferBytes: resources.reduce((sum, entry) => sum + entry.transferSize, 0),
      decodedBytes: resources.reduce((sum, entry) => sum + entry.decodedBodySize, 0),
      engineRequests: engines.map((entry) => entry.name.split('/NEO-BROWSER/').pop()),
      engineTransferBytes: engines.reduce((sum, entry) => sum + entry.transferSize, 0),
      longTaskCount: longTasks.length,
      longTaskTotalMs: Math.round(longTasks.reduce((sum, entry) => sum + entry.duration, 0)),
      longestTaskMs: Math.round(Math.max(0, ...longTasks.map((entry) => entry.duration))),
      heapBytes: performance.memory?.usedJSHeapSize || null,
      transportActive: Boolean(globalThis.NeoScramjet?.active),
      proxyOrigin: globalThis.NeoScramjet?.proxyOrigin || '',
      configuredRelay: globalThis.NeoScramjet?.configuredRelay?.() || '',
      workerTransportError: globalThis.__neoWorkerTransportError || '',
      proxiedFrame: Boolean(document.getElementById('frame')?.dataset.neoScramjet),
      loadingOverlayHidden: document.getElementById('overlay')?.classList.contains('hidden') || false,
      frameTitle: document.getElementById('frame')?.contentDocument?.title || '',
      frameText: (document.getElementById('frame')?.contentDocument?.body?.innerText || '').trim().slice(0, 180),
      visibleUrl: document.getElementById('url')?.value || '',
    };
  });

  await context.close();
  return {
    label,
    cpuRate,
    domContentLoadedMs,
    shellReadyMs,
    settleMs,
    ...metrics,
    consoleErrors: consoleErrors.slice(0, 5),
    requestFailures: requestFailures.slice(0, 5),
  };
}

(async () => {
  const server = http.createServer(serveStatic);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const blank = await measure(browser, baseUrl, 'blank-browser', '');
    const youtube = await measure(
      browser,
      baseUrl,
      'youtube-app',
      `?neo-app-mode=1&neo-app-target=${encodeURIComponent(youtubeUrl)}&neo-youtube-mode=1`
    );
    console.log(JSON.stringify({ blank, youtube }, null, 2));
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
