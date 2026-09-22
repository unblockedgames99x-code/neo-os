const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE || '', '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright')
);

const base = process.env.NEO_SHELL_TEST_URL || 'http://127.0.0.1:3094/neo-os/';

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const report = {};
  try {
    for (const style of ['modern', 'retro', 'windows11', 'kali']) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      await context.addInitScript((selected) => {
        localStorage.setItem('neo_os_settings_v1', JSON.stringify({ interfaceStyle: selected }));
      }, style);
      const page = await context.newPage();
      const variantRequests = [];
      page.on('request', (request) => {
        if (/neo-interface-(?:retro|windows11|kali)\.[a-f0-9]+\.min\.css/.test(request.url())) variantRequests.push(request.url());
      });
      await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForFunction(() => document.documentElement.dataset.shellCss === 'ready', null, { timeout: 15000 });
      const state = await page.evaluate(() => ({
        style: document.documentElement.dataset.interfaceStyle,
        variants: Array.from(document.querySelectorAll('[data-neo-interface-style-css]')).map((link) => ({
          name: link.dataset.neoInterfaceStyleCss,
          active: link.dataset.neoActive,
          loaded: link.dataset.neoLoaded,
          href: link.getAttribute('href'),
        })),
      }));
      report[style] = { variantRequests: variantRequests.map((url) => path.basename(new URL(url).pathname)), state };
      assert.equal(state.style, style);
      if (style === 'modern') {
        assert.equal(variantRequests.length, 0, 'Modern must not download any optional skin.');
        assert.ok(state.variants.every((entry) => entry.href === null));
      } else {
        assert.equal(variantRequests.length, 1, `${style} should download only its selected skin.`);
        const selected = state.variants.find((entry) => entry.name === style);
        assert.equal(selected.active, 'true');
        assert.equal(selected.loaded, 'true');
      }
      await context.close();
    }
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
