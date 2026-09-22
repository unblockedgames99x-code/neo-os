const assert = require("assert");
const path = require("path");
const os = require("os");
function playwrightRuntime() {
  try { return require("playwright"); } catch (_error) {}
  return require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || "", ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules", "playwright"));
}
const { chromium } = playwrightRuntime();

const preview = process.env.NEO_PREVIEW_URL || "http://127.0.0.1:3092/neo-os/index.html?test=neo-arcade-browser-v1";

async function enterAsGuest(page) {
  await page.goto(preview, { waitUntil: "domcontentloaded" });
  await page.locator('html[data-boot="complete"]').waitFor({ timeout: 20000 });
  const start = page.locator("#neo-start-screen");
  if (await start.isVisible()) {
    const mode = page.viewportSize().width <= 700 ? "mobile" : "laptop";
    await start.locator(`[data-start-mode="${mode}"]`).click();
    await start.waitFor({ state: "hidden" });
  }
  const guest = page.locator("[data-neo-login-guest]");
  if (await guest.isVisible()) await guest.click();
}

async function openArcade(page) {
  await page.keyboard.press("Control");
  await page.locator('.launcher-app[data-app="zones"]').click();
  const window = page.locator('.neo-window[data-app-id="zones"]');
  await window.locator("[data-library-home]").waitFor({ state: "visible", timeout: 10000 });
  return window;
}

async function run() {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true
  });
  const results = {};
  try {
    const desktop = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    await enterAsGuest(desktop);
    const arcade = await openArcade(desktop);

    results.gatewayTitle = await arcade.locator("[data-library-home] h2").innerText();
    await arcade.locator(".library-card").first().waitFor({ timeout: 15000 });
    await arcade.locator("[data-library-home-search]").fill("tetris");
    await arcade.locator("[data-library-home-search]").press("Enter");
    await arcade.locator(".library-card").first().waitFor({ timeout: 15000 });
    results.homeSearchTitles = (await arcade.locator(".library-card strong").allTextContents()).slice(0, 8);
    results.remoteFrames = await arcade.locator('iframe[src^="http"]').count();
    results.catalogOverflow = await arcade.locator(".neo-library").evaluate(element => element.scrollWidth > element.clientWidth);

    await arcade.locator("[data-library-search]").fill("tetris");
    await desktop.waitForTimeout(250);
    const favorite = arcade.locator(".library-favorite").first();
    await favorite.click();
    await arcade.locator('[data-library-nav="favorites"]').click();
    results.favoriteCount = await arcade.locator(".library-card").count();
    results.favoriteBadge = await arcade.locator("[data-library-favorite-count]").innerText();

    await arcade.locator(".library-card").first().click();
    const game = desktop.locator('.neo-window[data-app-id^="zone-"]').last();
    const gameFrame = game.locator("iframe");
    await gameFrame.waitFor({ timeout: 15000 });
    const gameSrc = await gameFrame.getAttribute("src");
    const gameUrl = new URL(gameSrc);
    results.game = { origin: gameUrl.origin, path: gameUrl.pathname };

    await desktop.screenshot({ path: path.join(os.tmpdir(), "neo-arcade-1366.png"), fullPage: false });

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await enterAsGuest(mobile);
    const mobileArcade = await openArcade(mobile);
    await mobileArcade.locator(".library-card").first().waitFor({ timeout: 15000 });
    results.mobileOverflow = await mobileArcade.locator(".neo-library").evaluate(element => element.scrollWidth > element.clientWidth);
    results.mobileColumns = await mobileArcade.locator(".library-grid").evaluate(element => getComputedStyle(element).gridTemplateColumns.split(" ").length);
    await mobile.screenshot({ path: path.join(os.tmpdir(), "neo-arcade-390.png"), fullPage: false });
  } finally {
    await browser.close();
  }

  assert.strictEqual(results.gatewayTitle, "UNBLOCKED GAMES");
  assert(results.homeSearchTitles.some(title => /^Tetris$/i.test(title)), "Home search did not return Tetris");
  assert.strictEqual(results.remoteFrames, 0, "The Games app contains a remote iframe");
  assert.strictEqual(results.catalogOverflow, false, "Desktop Games layout overflows horizontally");
  assert.strictEqual(results.favoriteCount, 1, "Favorites view did not retain the selected game");
  assert.strictEqual(results.favoriteBadge, "1", "Favorites badge did not update");
  assert.strictEqual(results.game.origin, new URL(preview).origin, "Game launch left the local origin");
  assert(/^\/games\/[A-Za-z0-9._%()\[\] -]+\.html$/.test(results.game.path), "Game launch did not use a local HTML game path");
  assert.strictEqual(results.mobileOverflow, false, "Mobile Games layout overflows horizontally");
  assert.strictEqual(results.mobileColumns, 2, "Mobile Games grid should use two columns");
  console.log(JSON.stringify(results, null, 2));
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
