const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'neo-os', 'neo-desktop-platform.js'), 'utf8');
const terminalSource = source.slice(source.indexOf('function terminal(body)'), source.indexOf('\n  function init()', source.indexOf('function terminal(body)')));
const base = process.env.NEO_PREVIEW_URL || 'http://127.0.0.1:3092';

assert.ok(terminalSource.length > 1000, 'The focused terminal implementation should be present.');
assert.doesNotMatch(terminalSource, /\b(?:fetch|XMLHttpRequest|WebSocket|sendBeacon|eval)\s*\(/, 'Terminal commands must not call a network or code-execution primitive.');
assert.match(terminalSource, /case 'ls':case 'dir'/);
assert.match(terminalSource, /case 'cat':case 'type'/);
assert.match(terminalSource, /case 'rm':case 'del'/);
assert.match(terminalSource, /0 network packets sent/);
assert.match(terminalSource, /key==='t'/);
assert.match(terminalSource, /key==='w'/);
assert.match(terminalSource, /key==='l'/);

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 760 }, serviceWorkers: 'block' });
  context.setDefaultTimeout(8000);
  await context.addInitScript(() => {
    localStorage.removeItem('neo_terminal_sessions_v1');
    localStorage.removeItem('neo_terminal_directories_v1');
    localStorage.removeItem('neo_desktop_workspace_v1');
  });
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (/^https?:$/.test(url.protocol) && url.origin !== new URL(base).origin) return route.abort();
    return route.continue();
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  try {
    await page.goto(base + '/neo-os/');
    await page.locator('[data-start-mode=laptop]').click();
    await page.locator('[data-neo-login-guest]').click();
    await page.waitForFunction(() => Boolean(window.NEO_SHELL && window.NEO_DESKTOP));
    await page.evaluate(() => window.NEO_SHELL.openApp('terminal'));

    const win = page.locator('.neo-window[data-app-id="terminal"]');
    await win.waitFor();
    const input = win.getByRole('textbox', { name: 'Terminal command' });
    const log = win.locator('.terminal-log');
    const prompt = win.locator('.terminal-composer > span');
    const run = async command => {
      await input.fill(command);
      await input.press('Enter');
      return log.textContent();
    };

    await run('clear');
    assert.match(await run('mkdir terminal-test'), /Created \/neo\/workspace\/terminal-test/);
    await run('cd terminal-test');
    assert.equal((await run('pwd')).trim().split('\n').at(-1), '/neo/workspace/terminal-test');
    assert.match(await run('echo "hello neo" > "notes.txt"'), /Wrote \/neo\/workspace\/terminal-test\/notes.txt/);
    await run('echo second >> notes.txt');
    assert.match(await run('type notes.txt'), /hello neo\nsecond/);
    assert.match(await run('cat notes.txt'), /hello neo\nsecond/);
    await run('touch empty.txt');
    const listing = await run('dir');
    assert.match(listing, /empty\.txt/);
    assert.match(listing, /notes\.txt/);
    await run('mkdir empty-dir');
    assert.match(await run('del empty-dir'), /Removed \/neo\/workspace\/terminal-test\/empty-dir/);
    assert.match(await run('rm empty.txt'), /Removed \/neo\/workspace\/terminal-test\/empty.txt/);
    await run('clear');
    assert.doesNotMatch(await run('dir'), /empty\.txt/);
    await run('cd ..');
    assert.equal((await run('pwd')).trim().split('\n').at(-1), '/neo/workspace');
    assert.match(await run('dir terminal-test'), /notes\.txt/);
    await run('cd terminal-test');

    const guarded = await run('rm -rf /');
    assert.match(guarded, /No system command was executed/);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('neo_desktop_workspace_v1'))['terminal-test/notes.txt']), 'hello neo\nsecond');
    assert.match(await run('ping example.com'), /0 network packets sent/);
    assert.match(await run('neofetch'), /NEO Terminal \(safe simulation\)/);
    assert.match(await run('ver'), /NEO OS web edition/);
    assert.match(await run('time'), /\d{1,2}:\d{2}:\d{2}/);
    assert.match(await run('history'), /ping example\.com/);

    await input.fill('echo history-check');
    await input.press('Enter');
    await input.fill('unfinished command');
    await input.press('ArrowUp');
    assert.equal(await input.inputValue(), 'echo history-check');
    await input.press('ArrowDown');
    assert.equal(await input.inputValue(), 'unfinished command');

    await input.press('Control+l');
    assert.equal(await log.textContent(), '');
    assert.equal(await prompt.textContent(), 'neo:~/workspace/terminal-test $');
    await input.press('Control+t');
    assert.equal(await win.getByRole('button', { name: /^Session \d+$/ }).count(), 2);
    assert.equal(await prompt.textContent(), 'neo:~/workspace $');
    await input.press('Control+w');
    assert.equal(await win.getByRole('button', { name: /^Session \d+$/ }).count(), 1);
    assert.equal(await prompt.textContent(), 'neo:~/workspace/terminal-test $');

    await input.press('Control+t');
    await run('exit');
    assert.equal(await win.getByRole('button', { name: /^Session \d+$/ }).count(), 1);
    await input.press('Control+w');
    assert.equal(await win.getByRole('button', { name: /^Session \d+$/ }).count(), 1, 'Closing the last tab should leave a fresh usable session.');
    assert.match(await log.textContent(), /New local session/);
    assert.deepEqual(pageErrors, []);
    console.log('NEO Terminal safe virtual filesystem and independent tab checks passed.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
