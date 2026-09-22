const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
);

const workspace = path.resolve(__dirname, '..');
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.woff2': 'font/woff2',
};

function serveFile(request, response) {
  const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
  const relative = pathname === '/neo-os/' ? 'neo-os/index.html' : pathname.replace(/^\/+/, '');
  const file = path.resolve(workspace, relative);

  if (!file.startsWith(workspace + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    response.writeHead(404).end('Not found');
    return;
  }

  response.writeHead(200, { 'content-type': mimeTypes[path.extname(file).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(response);
}

(async () => {
  const server = http.createServer(serveFile);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 900, height: 650 } });

  try {
    const address = server.address();
    await page.goto(`http://127.0.0.1:${address.port}/neo-os/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      document.documentElement.dataset.interfaceStyle = 'modern';
      document.documentElement.dataset.neoTheme = 'frost';
      document.getElementById('desktop-context-menu').hidden = false;
    });
    await page.waitForFunction(() => getComputedStyle(document.querySelector('#desktop-context-menu button')).color === 'rgb(243, 247, 248)');

    const palette = await page.locator('#desktop-context-menu').evaluate((menu) => {
      const button = menu.querySelector('button');
      const icon = button.querySelector('.icon');
      return {
        text: getComputedStyle(button).color,
        icon: getComputedStyle(icon).color,
        panel: getComputedStyle(menu).backgroundColor,
      };
    });

    assert.equal(palette.text, 'rgb(243, 247, 248)');
    assert.equal(palette.icon, 'rgb(199, 210, 213)');
    assert.match(palette.panel, /^rgba?\(/);
    console.log('Modern context-menu text stays readable in the Frost theme.');
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
