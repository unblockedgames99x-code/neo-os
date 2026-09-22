const assert = require('node:assert/strict');
const path = require('node:path');

function playwrightRuntime() {
  try { return require('playwright'); } catch (_error) {}
  return require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || '', '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright'));
}

const { chromium } = playwrightRuntime();
const url = process.env.NEO_CALCULATOR_TEST_URL || 'http://127.0.0.1:3092/neo-os/';

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => Boolean(window.NEO_SHELL), null, { timeout: 30000 });
    await page.evaluate(() => window.NEO_SHELL.openApp('calculator'));
    const calculator = page.locator('.neo-window[data-app-id="calculator"]');
    await calculator.waitFor({ state: 'visible' });

    async function metrics() {
      return calculator.evaluate(windowElement => {
        const body = windowElement.querySelector(':scope > .window-body');
        const app = body.querySelector('.neo-calculator');
        const keypad = app.querySelector('.calculator-grid');
        const bodyRect = body.getBoundingClientRect();
        const keypadRect = keypad.getBoundingClientRect();
        return {
          bodyOverflow: getComputedStyle(body).overflowY,
          bodyFits: body.scrollHeight <= body.clientHeight,
          appFits: app.scrollHeight <= app.clientHeight,
          keypadFits: keypadRect.bottom <= bodyRect.bottom + 0.5
        };
      });
    }

    assert.deepEqual(await metrics(), {
      bodyOverflow: 'hidden', bodyFits: true, appFits: true, keypadFits: true
    });

    await calculator.evaluate(windowElement => { windowElement.style.height = '430px'; });
    await page.waitForTimeout(50);
    assert.deepEqual(await metrics(), {
      bodyOverflow: 'hidden', bodyFits: true, appFits: true, keypadFits: true
    });
  } finally {
    await browser.close();
  }
  console.log('Calculator fits its window without internal scrolling at default and compact heights.');
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
