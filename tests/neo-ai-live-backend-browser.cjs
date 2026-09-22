const assert = require('node:assert/strict');
const path = require('node:path');

function playwrightRuntime() {
  try { return require('playwright'); } catch (_error) {}
  return require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || '', '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright'));
}

const { chromium } = playwrightRuntime();
const url = process.env.NEO_AI_LIVE_TEST_URL;
if (!url) throw new Error('NEO_AI_LIVE_TEST_URL is required');

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
  page.on('pageerror', error => pageErrors.push(String(error && error.stack || error)));
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    try {
      await page.waitForFunction(() => Boolean(window.NEO_AI_APP), null, { timeout: 30000 });
    } catch (error) {
      console.log(JSON.stringify({ title: await page.title(), url: page.url(), body: (await page.locator('body').innerText()).slice(0, 800), pageErrors }, null, 2));
      throw error;
    }
    await page.waitForFunction(() => Boolean(window.puter?.ai?.chat && window.puter.ai.listModels), null, { timeout: 30000 });
    const models = await page.evaluate(async () => {
      const listed = await window.puter.ai.listModels();
      return listed.map(model => ({ id: model.id, puterId: model.puterId, aliases: model.aliases || [] }));
    });
    const searchable = JSON.stringify(models);
    assert.match(searchable, /gpt-oss-120b/i);
    assert.match(searchable, /gpt-oss-20b/i);
    assert.match(searchable, /qwen3-32b/i);
    assert.deepEqual(pageErrors, []);
    console.log(JSON.stringify({ providerReady: true, supportedModels: ['gpt-oss-120b', 'gpt-oss-20b', 'qwen3-32b'] }));
  } finally {
    await context.close();
    await browser.close();
  }
  console.log('NEO AI live provider and selected models are available.');
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
