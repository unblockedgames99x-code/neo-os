const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
);

const base = process.env.NEO_LOCAL_URL || 'http://127.0.0.1:3097';
const cirrus = 'https://cirrusbk6l.planet35.com';

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required'],
  });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  const requests = [];
  page.on('request', (request) => {
    if (request.url().startsWith(cirrus)) requests.push(request.url());
  });
  try {
    await page.goto(base + '/neo-os/music-v2/index.html?test=scholarnook-v1', { waitUntil: 'domcontentloaded', timeout: 60000 });
    const musicSearch = page.waitForResponse((response) => /\/_o\/m\/search\?q=Daft/.test(response.url()), { timeout: 30000 });
    await page.locator('#searchInput').fill('Daft Punk');
    await musicSearch;
    await page.locator('.music-card').first().waitFor({ state: 'visible', timeout: 30000 });
    const musicCard = await page.locator('.music-card').first().evaluate((card) => ({
      title: card.querySelector('.card-title')?.textContent?.trim(),
      image: card.querySelector('img')?.src,
    }));
    assert.ok(musicCard.title, 'ScholarNook music search produced no title');
    assert.match(musicCard.image, /^https:\/\/cirrusbk6l\.planet35\.com\/_o\/m\/cover\//);
    await page.locator('.music-card').first().click();
    await page.waitForFunction(() => /\/_o\/m\/stream\//.test(document.querySelector('audio')?.src || ''), null, { timeout: 10000 });
    assert.ok(requests.some((url) => /\/_o\/m\/search\?q=Daft/.test(url)), 'Music search did not reach Cirrus');

    await page.goto(base + '/neo-os/neo-tv/index.html?test=scholarnook-v1', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.locator('.profile').first().click();
    await page.locator('[data-search]').fill('Inception');
    await page.locator('[data-search-grid] .title-card').first().waitFor({ state: 'visible', timeout: 30000 });
    const movieState = await page.evaluate(() => ({
      title: document.querySelector('[data-search-grid] .title-card .card-copy strong')?.textContent?.trim(),
      logoText: document.querySelector('.wordmark')?.getAttribute('aria-label'),
      adScripts: Array.from(document.scripts).map((script) => script.src).filter((src) => /smartpop|core\/ads\.js/i.test(src)),
    }));
    assert.match(movieState.title || '', /Inception/i);
    assert.equal(movieState.logoText, 'NEO Movies');
    assert.deepEqual(movieState.adScripts, []);
    assert.ok(requests.some((url) => /\/_o\/v\/search\?q=Inception/.test(url)), 'Movie search did not reach Cirrus');
    console.log('ScholarNook Cirrus music and movie integrations passed in a real browser.');
  } finally {
    await context.close();
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
