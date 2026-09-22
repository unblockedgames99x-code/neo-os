const assert = require('node:assert/strict');
const path = require('node:path');

function playwrightRuntime() {
  try { return require('playwright'); } catch (_error) {}
  return require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || '', '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules', 'playwright'));
}

const { chromium } = playwrightRuntime();
const url = process.env.NEO_OS_LIVE_TEST_URL;
if (!url) throw new Error('NEO_OS_LIVE_TEST_URL is required');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(String(error && error.stack || error)));
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    let shell = await page.evaluate(() => Boolean(window.NEO_SHELL)) ? page : null;
    if (!shell) {
      const shellElement = await page.waitForSelector('#neo-os', { state: 'attached', timeout: 60000 });
      for (let attempt = 0; attempt < 60 && !shell; attempt += 1) {
        shell = (await shellElement.contentFrame()) || page.frames().find(frame => frame !== page.mainFrame() && frame.url() === 'about:srcdoc');
        if (!shell) await page.waitForTimeout(100);
      }
      assert.ok(shell, 'The NEO OS launcher frame did not attach');
    }
    await shell.waitForFunction(() => window.NEO_SHELL, null, { timeout: 60000 });
    await shell.evaluate(() => window.NEO_SHELL.openApp('neo-ai'));

    const aiElement = await shell.waitForSelector('.neo-window[data-app-id="neo-ai"] iframe', { timeout: 30000 });
    const ai = await aiElement.contentFrame();
    assert.ok(ai, 'The NEO AI app frame did not attach');
    await ai.waitForFunction(() => window.NEO_AI_APP, null, { timeout: 60000 });
    assert.equal(await ai.evaluate(() => window.NEO_AI_APP.getModel().id), 'gpt-oss-20b', 'NEO AI should start on the fast 20B model');
    await ai.locator('#model-badge').evaluate(button => button.click());
    await ai.locator('#models-dialog').waitFor({ state: 'visible' });
    assert.equal((await ai.locator('#models-dialog .dialog-head small').textContent()).trim(), '3 AVAILABLE MODELS');
    assert.equal(await ai.locator('#model-list .model-row').count(), 3);
    assert.match(await ai.locator('#model-list').innerText(), /GPT-OSS 120B[\s\S]*GPT-OSS 20B \(Fast\)[\s\S]*Qwen3 32B/);
    await ai.locator('#models-dialog [data-action="close-dialog"]').click();
    if (process.env.NEO_AI_VERIFY_PROVIDER === '1') {
      await ai.waitForFunction(() => Boolean(window.puter?.ai?.chat && window.puter.ai.listModels), null, { timeout: 30000 });
      const availableModels = await ai.evaluate(async () => JSON.stringify(await window.puter.ai.listModels()));
      assert.match(availableModels, /gpt-oss-120b/i);
      assert.match(availableModels, /gpt-oss-20b/i);
      assert.match(availableModels, /qwen3-32b/i);
    }
    await ai.evaluate(() => { window.NEO_AI_APP.newChat(); window.NEO_AI_APP.newChat(); });

    const rows = ai.locator('.chat-row');
    assert.equal(await rows.count(), 2);
    const more = rows.first().locator('.chat-more');
    assert.equal(await more.evaluate(button => {
      const rowRect = button.closest('.chat-row').getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      return Math.abs((rowRect.top + rowRect.height / 2) - (buttonRect.top + buttonRect.height / 2)) < 1;
    }), true, 'The live three-dot button is not centered');

    await more.evaluate(button => button.click());
    const menu = ai.locator('#chat-context-menu');
    await menu.waitFor({ state: 'visible' });
    assert.equal(await ai.evaluate(() => {
      const buttonRect = document.querySelector('.chat-more[aria-expanded="true"]').getBoundingClientRect();
      const menuRect = document.querySelector('#chat-context-menu').getBoundingClientRect();
      return Math.abs(buttonRect.right - menuRect.right) <= 1;
    }), true, 'The live chat menu is not aligned');

    page.once('dialog', dialog => dialog.accept());
    await menu.getByRole('menuitem', { name: 'Delete' }).evaluate(button => button.click());
    await ai.waitForFunction(() => document.querySelectorAll('.chat-row').length === 1, null, { timeout: 10000 });
    assert.equal(await rows.count(), 1);
    assert.equal(await ai.locator('#chat-count').textContent(), '1');
    if (process.env.NEO_AI_VERIFY_BACKEND === '1') {
      await ai.getByLabel('Message NEO AI').evaluate(input => {
        input.value = 'Reply only with OK';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await ai.getByRole('button', { name: 'Send message' }).click();
      await ai.waitForFunction(() => {
        const replies = Array.from(document.querySelectorAll('.message.assistant .message-content'));
        const reply = replies[replies.length - 1];
        return reply && !reply.querySelector('.typing') && (reply.textContent || '').trim();
      }, null, { timeout: 90000 });
      const answer = await ai.locator('.message.assistant .message-content').last().innerText();
      assert.doesNotMatch(answer, /could(?: not|n't) connect/i);
      console.log(JSON.stringify({ backendAnswer: answer }));
    }
    const aiErrors = pageErrors.filter(message => /neo-ai\/|chat-context-menu|deleteChat|toggleChatContextMenu/i.test(message));
    assert.equal(aiErrors.length, 0, aiErrors.join('\n'));
  } finally {
    await browser.close();
  }
  console.log('Live NEO OS chat menu alignment and deletion checks passed.');
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
