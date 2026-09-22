const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));

const root = path.resolve(__dirname, '..');
const shards = path.join(root, '.codex-tmp', 'github-cdn-shards');
const account = 'unblockedgames99x-code';
const liveUrl = process.env.NEO_CDN_LIVE_URL || '';

function type(file) {
  return ({ '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2' })[path.extname(file).toLowerCase()] || 'application/octet-stream';
}

function fileFor(repo, relative) {
  const base = path.resolve(shards, repo);
  const file = path.resolve(base, relative || 'index.html');
  return file === base || file.startsWith(base + path.sep) ? file : null;
}

(async () => {
  const server = http.createServer((request, response) => {
    const file = fileFor('neo-os-launch-cdn', request.url.split('?')[0].replace(/^\//, '') || 'launch.svg');
    if (!file || !fs.existsSync(file)) return response.writeHead(404).end('not found');
    response.writeHead(200, { 'content-type': type(file), 'access-control-allow-origin': '*' });
    response.end(fs.readFileSync(file));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const log = { errors: [], consoles: [], failed: [] };
  page.on('pageerror', (error) => log.errors.push(error.stack || error.message));
  page.on('console', (message) => { if (message.type() === 'error' || message.type() === 'warning') log.consoles.push(`${message.type()}: ${message.text()}`); });
  page.on('requestfailed', (request) => log.failed.push(`${request.url()} :: ${JSON.stringify(request.failure())}`));
  if (!liveUrl) await page.route('https://*.jsdelivr.net/**', async (route) => {
    const url = new URL(route.request().url());
    const match = url.pathname.match(new RegExp(`^/gh/${account}/([^/@]+)@[^/]+/(.*)$`));
    if (!match) return route.continue();
    const file = fileFor(match[1], decodeURIComponent(match[2]));
    if (!file || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return route.fulfill({ status: 404, body: 'not found' });
    return route.fulfill({ status: 200, body: fs.readFileSync(file), contentType: type(file), headers: { 'access-control-allow-origin': '*' } });
  });
  try {
    await page.goto(liveUrl || `http://127.0.0.1:${server.address().port}/launch.svg`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(() => document.getElementById('neo-os')?.contentWindow?.NEO_SHELL, null, { timeout: 60000 });
    await page.evaluate(() => document.getElementById('neo-os').contentDocument.querySelector('[data-start-mode="laptop"]').click());
    await page.waitForFunction(() => document.getElementById('neo-os')?.contentDocument?.querySelector('[data-neo-login-guest]'));
    await page.evaluate(() => document.getElementById('neo-os').contentDocument.querySelector('[data-neo-login-guest]').click());
    await page.waitForFunction(() => document.getElementById('neo-os')?.contentDocument?.getElementById('neo-login-gate')?.hidden);
    await page.evaluate(() => {
      const shell = document.getElementById('neo-os').contentWindow.NEO_SHELL;
      if (!shell.isInstalled('stream')) shell.setInstalled('stream', true);
      shell.openApp('stream');
    });
    let musicAppFrame = null;
    const musicDeadline = Date.now() + 30000;
    while (Date.now() < musicDeadline) {
      const candidate = page.frames().find((frame) => {
        try { return /\/music-v2\/__neo_app__\/?$/.test(new URL(frame.url()).pathname); } catch (_error) { return false; }
      });
      if (candidate && await candidate.evaluate(() => document.documentElement.dataset.neoMusicReady === 'true').catch(() => false)) {
        musicAppFrame = candidate;
        break;
      }
      await page.waitForTimeout(100);
    }
    assert.ok(musicAppFrame, `NEO Music did not become ready. Frames: ${JSON.stringify(page.frames().map((frame) => frame.url()))}`);
    const musicReport = await musicAppFrame.evaluate(() => ({
      ready: document.documentElement.dataset.neoMusicReady,
      app: document.documentElement.dataset.neoApp,
      title: document.title,
      text: document.body.innerText.slice(0, 500),
      audio: document.querySelectorAll('audio').length,
      search: Boolean(document.getElementById('searchInput')),
    }));
    await page.evaluate(() => {
      const view = document.getElementById('neo-os').contentWindow;
      view.NEO_BOTTOM_VISUALIZER.setEnabled(true);
      view.dispatchEvent(new view.CustomEvent('neo-media-state', { detail: { source: 'neo-music', active: true, playing: true, kind: 'audio' } }));
      view.dispatchEvent(new view.CustomEvent('neo-media-levels', { detail: { source: 'neo-music', levels: Array.from({ length: 32 }, (_, index) => .2 + (index % 7) / 10), measured: true } }));
    });
    await page.waitForFunction(() => {
      const state = document.getElementById('neo-os')?.contentWindow?.NEO_BOTTOM_VISUALIZER?.getState();
      return state?.enabled && state.framesDrawn > 0;
    });
    const report = await page.evaluate(() => {
      const root = document.getElementById('neo-os').contentDocument;
      const musicWindow = root.querySelector('.neo-window[data-app-id="stream"]');
      const visualizer = root.defaultView.NEO_BOTTOM_VISUALIZER.getState();
      const visualizerCanvas = root.getElementById('neo-bottom-visualizer');
      return {
        shellError: musicWindow?.querySelector('.frame-error')?.className || '',
        visualizer: { ...visualizer, hidden: visualizerCanvas.hidden, menuAction: Boolean(root.querySelector('[data-widget-action="bottom-visualizer"]')) }
      };
    });
    assert.equal(musicReport.ready, 'true', 'NEO Music did not announce readiness');
    assert.equal(musicReport.search, true, 'NEO Music search did not render');
    assert.doesNotMatch(report.shellError, /is-visible/, 'NEO Music showed a false startup timeout');
    assert.equal(report.visualizer.hidden, false, 'Bottom music visualizer did not render in the CDN runner');
    assert.equal(report.visualizer.menuAction, true, 'Bottom music visualizer is missing from the desktop menu');
    assert.ok(report.visualizer.framesDrawn > 0, 'Bottom music visualizer did not render a frame in the CDN runner');
    await page.evaluate(() => document.getElementById('neo-os').contentWindow.NEO_BOTTOM_VISUALIZER.setEnabled(false));
    console.log('CDN Music and bottom visualizer runtime checks passed.');
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
