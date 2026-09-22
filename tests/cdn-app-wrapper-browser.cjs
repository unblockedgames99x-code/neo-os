const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
);

const root = path.resolve(__dirname, '..');
const shards = path.join(root, '.codex-tmp', 'github-cdn-shards');
const appRoots = {
  'music-v2': path.join(shards, 'neo-os-music-two-cdn', 'music-v2'),
  'neo-tv': path.join(shards, 'neo-os-chat-tv-cdn', 'neo-tv'),
};

function contentType(file) {
  const extension = path.extname(file).toLowerCase();
  return ({
    '.css': 'text/css',
    '.html': 'text/plain; charset=utf-8',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.woff2': 'font/woff2',
  })[extension] || 'application/octet-stream';
}

(async () => {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    const parts = url.pathname.split('/').filter(Boolean);
    const appRoot = appRoots[parts.shift()];
    const file = appRoot && path.resolve(appRoot, parts.join('/') || 'launch.svg');
    if (!appRoot || !file.startsWith(appRoot + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      response.writeHead(404).end('Not found');
      return;
    }
    response.writeHead(200, { 'content-type': contentType(file), 'service-worker-allowed': '/' });
    response.end(fs.readFileSync(file));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message || String(error)));

  async function open(app) {
    await page.goto(`http://127.0.0.1:${server.address().port}/${app}/launch.svg`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => {
      const frame = document.getElementById('neo-app');
      return Boolean(
        frame?.contentDocument?.body &&
        frame.contentDocument.readyState === 'complete' &&
        /^https?:/.test(frame.contentWindow.location.href)
      );
    }, null, { timeout: 30000 });
    return page.evaluate(() => {
      const frame = document.getElementById('neo-app');
      return {
        url: frame.contentWindow.location.href,
        title: frame.contentDocument.title,
        text: frame.contentDocument.body.textContent.replace(/\s+/g, ' ').trim().slice(0, 300),
        rootChildren: frame.contentDocument.getElementById('root')?.childElementCount ?? -1,
        ready: frame.contentDocument.documentElement.dataset.neoMusicReady || '',
        search: Boolean(frame.contentDocument.getElementById('searchInput')),
      };
    });
  }

  try {
    const music = await open('music-v2');
    assert.notEqual(music.url, 'about:srcdoc');
    assert.match(music.url, /^http:\/\/127\.0\.0\.1:/);
    assert.match(music.title, /Monochrome|NEO Music/i);
    assert.equal(music.ready, 'true', 'NEO Music did not finish its controlled CDN launch.');
    assert.equal(music.search, true, 'NEO Music search did not render.');

    const tv = await open('neo-tv');
    assert.notEqual(tv.url, 'about:srcdoc');
    assert.match(tv.url, /^http:\/\/127\.0\.0\.1:/);
    assert.match(tv.text, /NEO\s*STREAM|Who's watching/i, `NEO TV root did not render: ${tv.text}`);
    assert.equal(errors.some((message) => /pushState.*about:srcdoc|invalid url/i.test(message)), false, errors.join('\n'));
    console.log('Music and NEO TV launch under real controlled URLs.');
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
