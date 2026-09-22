const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || "", ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules", "playwright"));

const url = process.env.NEO_LOCAL_GAME_TEST_URL || "http://127.0.0.1:3092/neo-os/?test=games-local-library-v1";

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.NEO_CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, serviceWorkers: process.env.NEO_ALLOW_SERVICE_WORKERS ? "allow" : "block" });
  const page = await context.newPage();
  try {
    await page.route(/(?:cdn|fastly)\.jsdelivr\.net\/gh\/luminsdk\/script@.*\/fonts\.min\.js/, route => route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: "window.Lumin={init(o){o.onReady();return Promise.resolve()},getGames(){return Promise.resolve({games:[],total:0,page:1,pages:1})},endGame(){}};"
    }));
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.NEO_SHELL && document.documentElement.dataset.boot === "complete");
    const start = page.locator("#neo-start-screen");
    if (await start.isVisible()) await start.locator('[data-start-mode="laptop"]').click();
    const guest = page.locator("[data-neo-login-guest]");
    if (await guest.isVisible()) await guest.click();

    await page.evaluate(() => window.NEO_SHELL.openApp("games"));
    const steamWindow = page.locator('.neo-window[data-app-id="games"]');
    const steam = steamWindow.locator("iframe").contentFrame();
    await steam.locator("[data-add-local]").click();
    await steam.locator("[data-local-dialog]").waitFor({ state: "visible" });
    await steam.locator("[data-local-name]").fill("My Local Test");
    await steam.locator("[data-local-category]").fill("Arcade");
    await steam.locator("[data-local-file]").setInputFiles({
      name: "my-local-test.html",
      mimeType: "text/html",
      buffer: Buffer.from("<!doctype html><title>Local fixture</title><main id='local-game-ready'>Local game works</main>")
    });
    await steam.locator("[data-local-cover]").setInputFiles({
      name: "cover.png",
      mimeType: "image/png",
      buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64")
    });
    await steam.locator("[data-local-submit]").click();

    await steam.locator("[data-local-list] .game-list-item", { hasText: "My Local Test" }).waitFor();
    assert.equal(await steam.locator("[data-game-source]").textContent(), "Local");
    assert.equal(await steam.locator("[data-meta-provider]").textContent(), "Local");
    assert.equal(await steam.locator("[data-remove-local]").isVisible(), true);
    assert.match(await steam.locator("[data-hero-backdrop]").getAttribute("style"), /data:image\/webp/);

    await steam.locator("[data-play]").click();
    const gameWindow = page.locator('.neo-window[data-app-id^="custom-app-game-"]');
    await gameWindow.waitFor({ state: "visible" });
    assert.equal(await gameWindow.locator(".window-title strong").textContent(), "My Local Test");
    const localPlayer = gameWindow.locator("iframe").contentFrame();
    const localGame = localPlayer.locator("[data-local-game-frame]").contentFrame();
    try {
    await localGame.locator("#local-game-ready").waitFor({ timeout: 10000 });
    } catch (error) {
      console.error("LOCAL PLAYER:", await localPlayer.locator("body").innerText().catch(() => "unavailable"));
      throw error;
    }
    assert.equal(await localGame.locator("#local-game-ready").textContent(), "Local game works");

    const appId = await gameWindow.getAttribute("data-app-id");
    await gameWindow.locator('[data-window-action="pin"]').click();
    await page.waitForFunction(id => window.NEO_SHELL.getCustomApps().some(app => app.id === id && app.installed && app.pinned), appId);
    assert.equal(await page.locator(`.dock-button[data-app="${appId}"]`).count(), 1, "The local game was not added to the taskbar");

    await gameWindow.locator('[data-window-action="close"]').click();
    await gameWindow.waitFor({ state: "detached" });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.NEO_SHELL && document.documentElement.dataset.boot === "complete");
    const restoredStart = page.locator("#neo-start-screen");
    if (await restoredStart.isVisible()) await restoredStart.locator('[data-start-mode="laptop"]').click();
    const restoredGuest = page.locator("[data-neo-login-guest]");
    if (await restoredGuest.isVisible()) await restoredGuest.click();
    await page.evaluate(() => window.NEO_SHELL.openApp("games"));
    const restored = page.locator('.neo-window[data-app-id="games"] iframe').contentFrame();
    await restored.locator("[data-local-list] .game-list-item", { hasText: "My Local Test" }).waitFor();
  } finally {
    await browser.close();
  }
  console.log("Local HTML games persist with artwork and launch in separate OS windows.");
})().catch(error => { console.error(error); process.exitCode = 1; });
