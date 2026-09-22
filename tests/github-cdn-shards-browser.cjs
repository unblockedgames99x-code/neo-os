const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
);

const workspace = path.resolve(__dirname, '..');
const shards = path.join(workspace, '.codex-tmp', 'github-cdn-shards');
const launcher = path.join(shards, 'neo-os-launch-cdn');
const account = 'unblockedgames99x-code';
const liveUrl = process.env.NEO_CDN_LIVE_URL || '';

function contentType(file) {
  const extension = path.extname(file).toLowerCase();
  return ({
    '.css': 'text/css',
    '.gif': 'image/gif',
    '.html': 'text/plain; charset=utf-8',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.mp4': 'video/mp4',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webm': 'video/webm',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
  })[extension] || 'application/octet-stream';
}

function safeFile(repo, relative) {
  const root = path.resolve(shards, repo);
  const file = path.resolve(root, relative || 'index.html');
  if (file !== root && !file.startsWith(root + path.sep)) return null;
  return file;
}

(async () => {
  const server = http.createServer((request, response) => {
    const relative = request.url.split('?')[0].replace(/^\//, '') || 'launch.svg';
    const file = safeFile('neo-os-launch-cdn', relative);
    if (!file || !fs.existsSync(file)) {
      response.writeHead(404).end('Not found');
      return;
    }
    response.writeHead(200, { 'content-type': contentType(file), 'access-control-allow-origin': '*' });
    response.end(fs.readFileSync(file));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const missing = [];
  if (liveUrl) {
    page.on('pageerror', (error) => console.error('LIVE_PAGE_ERROR', error.stack || error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') console.error('LIVE_CONSOLE_ERROR', message.text());
    });
    page.on('requestfailed', (request) => console.error('LIVE_REQUEST_FAILED', request.url(), request.failure()));
    page.on('response', async (response) => {
      if (!/neo-local-config\.js/i.test(response.url())) return;
      const source = await response.text();
      let syntax = 'ok';
      try { new Function(source); } catch (error) { syntax = error.message; }
      console.error('LIVE_CONFIG_RESPONSE', response.url(), response.status(), syntax, source.slice(0, 500));
    });
  }

  if (!liveUrl) await page.route('https://*.jsdelivr.net/**', async (route) => {
    const url = new URL(route.request().url());
    const match = url.pathname.match(new RegExp(`^/gh/${account}/([^/@]+)@[^/]+/(.*)$`));
    if (!match) {
      await route.continue();
      return;
    }
    const file = safeFile(match[1], decodeURIComponent(match[2]));
    if (!file || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      if (!url.searchParams.has('neo_health')) missing.push(`${match[1]}/${match[2]}`);
      await route.fulfill({ status: 404, body: 'Not found', headers: { 'access-control-allow-origin': '*' } });
      return;
    }
    await route.fulfill({
      status: 200,
      body: fs.readFileSync(file),
      contentType: contentType(file),
      headers: { 'access-control-allow-origin': '*' },
    });
  });

  function rootAction(selector, action = 'click') {
    return page.evaluate(({ selector, action }) => {
      const outer = document.getElementById('neo-os');
      const target = outer && outer.contentDocument && outer.contentDocument.querySelector(selector);
      if (!target) return false;
      if (action === 'click') target.click();
      return true;
    }, { selector, action });
  }

  function openShellApp(appId) {
    return page.evaluate((appId) => {
      const outer = document.getElementById('neo-os');
      const shell = outer && outer.contentWindow && outer.contentWindow.NEO_SHELL;
      if (!shell) return false;
      if (!shell.isInstalled(appId)) shell.setInstalled(appId, true);
      shell.openApp(appId);
      return true;
    }, appId);
  }

  async function waitRoot(selector, timeout = 60000) {
    await page.waitForFunction((selector) => {
      const outer = document.getElementById('neo-os');
      return Boolean(outer && outer.contentDocument && outer.contentDocument.querySelector(selector));
    }, selector, { timeout });
  }

  async function waitApp(appId, htmlMarker) {
    try {
      await page.waitForFunction(({ appId, htmlMarker }) => {
        const outer = document.getElementById('neo-os');
        const root = outer && outer.contentDocument;
        const frame = root && root.querySelector(`.neo-window[data-app-id="${appId}"] iframe`);
        const wrapper = frame && frame.contentDocument;
        const app = wrapper?.getElementById('neo-browser')?.contentDocument || wrapper;
        return Boolean(app && app.documentElement && app.documentElement.matches(htmlMarker));
      }, { appId, htmlMarker }, { timeout: 30000 });
    } catch (error) {
      console.error('APP_DIAGNOSTIC', await page.evaluate((appId) => {
        const outer = document.getElementById('neo-os');
        const root = outer && outer.contentDocument;
        const frame = root && root.querySelector(`.neo-window[data-app-id="${appId}"] iframe`);
        return {
          runner: root && Boolean(root.querySelector('meta[name="neo-runner"]')),
          localConfig: root && root.defaultView.NEO_LOCAL_CONFIG,
          hasLoader: root && Boolean(root.defaultView.NEOFrameLoader),
          windowFound: Boolean(root && root.querySelector(`.neo-window[data-app-id="${appId}"]`)),
          frameFound: Boolean(frame),
          frameSrc: frame && frame.getAttribute('src'),
          srcdocLength: frame && String(frame.getAttribute('srcdoc') || '').length,
          frameDocument: Boolean(frame && frame.contentDocument),
          frameText: frame && frame.contentDocument && frame.contentDocument.body
            ? frame.contentDocument.body.textContent.slice(0, 300)
            : '',
          nestedFrame: Boolean(frame?.contentDocument?.getElementById('neo-browser')),
          nestedText: frame?.contentDocument?.getElementById('neo-browser')?.contentDocument?.body
            ? frame.contentDocument.getElementById('neo-browser').contentDocument.body.textContent.slice(0, 300)
            : '',
        };
      }, appId));
      throw error;
    }
  }

  async function dragShellWindow(appId, deltaX, deltaY) {
    const geometry = await page.evaluate((appId) => {
      const outer = document.getElementById('neo-os');
      const root = outer && outer.contentDocument;
      const win = root && root.querySelector(`.neo-window[data-app-id="${appId}"]`);
      const handle = win && win.querySelector('.window-title');
      if (!outer || !win || !handle) return null;
      const outerRect = outer.getBoundingClientRect();
      const windowRect = win.getBoundingClientRect();
      const handleRect = handle.getBoundingClientRect();
      const handleStyle = root.defaultView.getComputedStyle(handle);
      const windowStyle = root.defaultView.getComputedStyle(win);
      root.defaultView.__neoDragProbe = [];
      ['pointerdown', 'pointermove', 'pointerup'].forEach((type) => {
        root.addEventListener(type, (event) => {
          if (root.defaultView.__neoDragProbe.length > 30) return;
          root.defaultView.__neoDragProbe.push({
            type,
            x: event.clientX,
            y: event.clientY,
            target: event.target.className || event.target.tagName,
          });
        }, true);
      });
      return {
        startX: outerRect.left + handleRect.left + Math.min(40, handleRect.width / 2),
        startY: outerRect.top + handleRect.top + handleRect.height / 2,
        beforeLeft: windowRect.left,
        beforeTop: windowRect.top,
        outer: { left: outerRect.left, top: outerRect.top, width: outerRect.width, height: outerRect.height },
        frameViewport: { width: root.defaultView.innerWidth, height: root.defaultView.innerHeight },
        handle: { left: handleRect.left, top: handleRect.top, width: handleRect.width, height: handleRect.height },
        rootClass: root.documentElement.className,
        windowBarStyle: root.documentElement.dataset.windowBarStyle,
        windowClass: win.className,
        windowGridRows: windowStyle.gridTemplateRows,
        handleStyle: { position: handleStyle.position, top: handleStyle.top, left: handleStyle.left, margin: handleStyle.margin, transform: handleStyle.transform },
      };
    }, appId);
    assert.ok(geometry, `Could not find the ${appId} window drag handle`);
    await page.mouse.move(geometry.startX, geometry.startY);
    await page.mouse.down();
    await page.mouse.move(geometry.startX + deltaX, geometry.startY + deltaY, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(120);
    return page.evaluate(({ appId, geometry }) => {
      const outer = document.getElementById('neo-os');
      const root = outer && outer.contentDocument;
      const win = root && root.querySelector(`.neo-window[data-app-id="${appId}"]`);
      const rect = win && win.getBoundingClientRect();
      return rect && {
        beforeLeft: geometry.beforeLeft,
        beforeTop: geometry.beforeTop,
        afterLeft: rect.left,
        afterTop: rect.top,
        isDragging: win.classList.contains('is-dragging'),
        inlineLeft: win.style.left,
        inlineTop: win.style.top,
        geometry,
        pointerEvents: root.defaultView.__neoDragProbe,
      };
    }, { appId, geometry });
  }

  try {
    const port = server.address().port;
    await page.goto(liveUrl || `http://127.0.0.1:${port}/launch.svg`, { waitUntil: 'domcontentloaded' });
    await waitRoot('#neo-start-title');
    await page.waitForFunction(() => {
      const outer = document.getElementById('neo-os');
      return Boolean(outer && outer.contentWindow && outer.contentWindow.NEO_SHELL);
    });
    assert.equal(await rootAction('[data-start-mode="laptop"]'), true);
    await waitRoot('[data-neo-login-guest]');
    await page.waitForFunction(() => {
      const outer = document.getElementById('neo-os');
      const gate = outer && outer.contentDocument && outer.contentDocument.getElementById('neo-login-gate');
      return Boolean(gate && gate._neoClockTimer);
    });
    assert.equal(await rootAction('[data-neo-login-guest]'), true);
    await page.waitForFunction(() => {
      const outer = document.getElementById('neo-os');
      const root = outer && outer.contentDocument;
      const gate = root && root.getElementById('neo-login-gate');
      const desktop = root && root.getElementById('neo-desktop');
      return Boolean(gate && gate.hidden && desktop && !desktop.inert);
    });
    await page.waitForFunction(() => {
      const outer = document.getElementById('neo-os');
      const root = outer && outer.contentDocument;
      return Boolean(root && root.documentElement.dataset.universalLoading !== 'true');
    });

    const launcherAlignment = await page.evaluate((forcedStyle) => {
      const outer = document.getElementById('neo-os');
      const root = outer && outer.contentDocument;
      const view = root && root.defaultView;
      if (!root || !view) return null;
      if (forcedStyle) root.documentElement.dataset.interfaceStyle = forcedStyle;
      root.body.dispatchEvent(new view.KeyboardEvent('keydown', { key: 'Control', code: 'ControlLeft', bubbles: true }));
      root.body.dispatchEvent(new view.KeyboardEvent('keyup', { key: 'Control', code: 'ControlLeft', bubbles: true }));
      const launcher = root.querySelector('.app-launcher');
      const items = Array.from(root.querySelectorAll('.launcher-app')).slice(0, 12).map((button) => {
        const icon = button.querySelector('.launcher-app-icon');
        const image = icon && icon.querySelector('img,svg,.icon,.spotify-vector');
        const label = button.querySelector(':scope > span:last-child:not(.launcher-app-icon)');
        const buttonRect = button.getBoundingClientRect();
        const iconRect = icon && icon.getBoundingClientRect();
        const imageRect = image && image.getBoundingClientRect();
        const labelRect = label && label.getBoundingClientRect();
        return {
          app: button.dataset.app,
          button: { top: buttonRect.top, height: buttonRect.height },
          icon: iconRect && { top: iconRect.top, height: iconRect.height, center: iconRect.top + iconRect.height / 2 },
          image: imageRect && { top: imageRect.top, height: imageRect.height, center: imageRect.top + imageRect.height / 2 },
          label: labelRect && { top: labelRect.top, height: labelRect.height, center: labelRect.top + labelRect.height / 2 },
        };
      });
      return {
        open: Boolean(launcher && !launcher.hidden),
        interfaceStyle: root.documentElement.dataset.interfaceStyle,
        items,
      };
    }, process.env.NEO_DIAG_INTERFACE_STYLE || '');
    assert.ok(launcherAlignment && launcherAlignment.open, 'Ctrl did not open the app launcher');
    launcherAlignment.items.forEach((item) => {
      assert.ok(item.icon, `${item.app} is missing its launcher icon`);
      const buttonCenter = item.button.top + item.button.height / 2;
      assert.ok(item.icon.center < buttonCenter - 1, `${item.app} launcher icon is pushed down`);
    });
    await page.evaluate(() => {
      const outer = document.getElementById('neo-os');
      const root = outer && outer.contentDocument;
      const view = root && root.defaultView;
      root.body.dispatchEvent(new view.KeyboardEvent('keydown', { key: 'Control', code: 'ControlLeft', bubbles: true }));
      root.body.dispatchEvent(new view.KeyboardEvent('keyup', { key: 'Control', code: 'ControlLeft', bubbles: true }));
    });
    await page.waitForFunction(() => {
      const outer = document.getElementById('neo-os');
      const root = outer && outer.contentDocument;
      return Boolean(root && !root.documentElement.classList.contains('neo-launcher-open'));
    });

    assert.equal(await rootAction('[data-app="chat"]'), true);
    await waitApp('chat', 'html[data-neo-app="chat"]');
    await page.waitForFunction(() => {
      const outer = document.getElementById('neo-os');
      const root = outer && outer.contentDocument;
      const win = root && root.querySelector('.neo-window[data-app-id="chat"]');
      return Boolean(win && !win.classList.contains('is-opening'));
    });

    const draggedChat = await dragShellWindow('chat', 120, 70);
    assert.ok(draggedChat, 'Chat window disappeared during drag');
    assert.ok(
      Math.abs(draggedChat.afterLeft - draggedChat.beforeLeft) >= 80 &&
        Math.abs(draggedChat.afterTop - draggedChat.beforeTop) >= 40,
      `Chat window did not follow the pointer: ${JSON.stringify(draggedChat)}`
    );
    assert.equal(draggedChat.isDragging, false, 'Chat window remained in its dragging state');

    assert.equal(await rootAction('[data-app="browser"]'), true);
    await waitApp('browser', 'html');

    for (const appId of ['stream', 'neo-cloud', 'discord', 'youtube-app', 'geometry-dash']) {
      assert.equal(await openShellApp(appId), true);
      await waitApp(appId, 'html');
    }

    assert.deepEqual(missing, []);
    console.log('Launcher rendered every packaged HTML app from the jsDelivr shards.');
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
