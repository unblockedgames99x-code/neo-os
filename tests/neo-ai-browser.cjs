const assert = require('node:assert/strict');
const path = require('node:path');

function playwrightRuntime() {
  try { return require('playwright'); } catch (_error) {}
  return require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || '', '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright'));
}

const { chromium } = playwrightRuntime();
const url = process.env.NEO_AI_TEST_URL || 'http://127.0.0.1:3092/neo-os/neo-ai/index.html?v=browser-test';

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 760 } });
  await context.addInitScript(() => {
    localStorage.removeItem('neo_ai_workspace_v1');
    localStorage.removeItem('neo_ai_default_model_20b_v1');
  });
  const page = await context.newPage();
  const pageErrors = [];
  const forbiddenRequests = [];

  page.on('pageerror', error => pageErrors.push(String(error && error.stack || error)));
  page.on('request', request => {
    if (/pollinations|nextnode9124|photon\.girlspreples/i.test(request.url())) forbiddenRequests.push(request.url());
  });
  await page.route(/^https:\/\/js\.puter\.com\/v2\/?/, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'text/javascript',
      headers: { 'access-control-allow-origin': '*' },
      body: `
        window.__puterCalls = [];
        window.puter = { ai: { chat: async function (messages, testMode, options) {
          window.__puterCalls.push({ messages, testMode, options });
          return (async function* () { yield { text: 'Hello ' }; yield { text: 'from NEO AI' }; })();
        } } };
      `
    });
  });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => Boolean(window.NEO_AI_APP), null, { timeout: 30000 });
    assert.equal(await page.locator('h1').innerText(), 'What can I help you with?');
    assert.deepEqual(
      await page.evaluate(() => window.NEO_AI_APP.models.map(model => model.id)),
      ['gpt-oss-120b', 'gpt-oss-20b', 'qwen3-32b']
    );
    assert.equal(await page.evaluate(() => window.NEO_AI_APP.getModel().id), 'gpt-oss-20b');
    assert.match(await page.getByLabel(/Choose AI model/).innerText(), /GPT-OSS 20B \(Fast\)\s+Puter/i);

    await page.getByLabel(/Choose AI model/).click();
    assert.equal(await page.locator('#model-list .model-row').count(), 3);
    assert.equal(await page.locator('#models-dialog').getAttribute('open'), '');
    await page.locator('#models-dialog .dialog-head').click();
    assert.equal(await page.locator('#models-dialog').getAttribute('open'), '', 'clicking inside a menu must keep it open');
    await page.mouse.click(20, 20);
    await page.locator('#models-dialog').waitFor({ state: 'hidden' });
    assert.equal(await page.locator('#models-dialog').getAttribute('open'), null, 'clicking outside a menu must close it');

    await page.getByLabel('Message NEO AI').fill('Hello primary');
    await page.getByRole('button', { name: 'Send message' }).click();
    await page.getByText('Hello from NEO AI').waitFor({ state: 'visible', timeout: 10000 });
    const puterCalls = await page.evaluate(() => window.__puterCalls);
    assert.equal(puterCalls.length, 1);
    assert.equal(puterCalls[0].testMode, false);
    assert.equal(puterCalls[0].options.model, 'openai/gpt-oss-20b');
    assert.equal(puterCalls[0].options.stream, true);
    assert.equal(puterCalls[0].options.normalize, true);
    assert.equal(puterCalls[0].messages.at(-1).content, 'Hello primary');
    assert.deepEqual(forbiddenRequests, []);
    assert.deepEqual(pageErrors, []);
    assert.equal(await page.getByLabel('Message NEO AI').isEnabled(), true);
  } finally {
    await context.close();
    await browser.close();
  }
  console.log('NEO AI browser uses exactly three live models and streams through the restored provider.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
