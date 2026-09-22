const assert = require("node:assert/strict");
const path = require("node:path");

function playwrightRuntime() {
  try { return require("playwright"); } catch (_error) {}
  return require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || "", ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules", "playwright"));
}

const { chromium } = playwrightRuntime();
const url = process.env.NEO_GAMES_SHORTCUT_TEST_URL || "http://127.0.0.1:3092/neo-os/?test=games-taskbar-shortcut-v1";

async function run() {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true
  });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.NEO_SHELL && document.documentElement.dataset.boot === "complete", null, { timeout: 20000 });

    const start = page.locator("#neo-start-screen");
    if (await start.isVisible()) {
      await start.locator('[data-start-mode="laptop"]').click();
      await start.waitFor({ state: "hidden" });
    }
    const guest = page.locator("[data-neo-login-guest]");
    if (await guest.isVisible()) await guest.click();

    await page.evaluate(() => window.NEO_SHELL.openApp("games"));
    const gamesWindow = page.locator('.neo-window[data-app-id="games"]');
    await gamesWindow.waitFor({ state: "visible" });
    const gamesFrame = gamesWindow.locator("iframe").contentFrame();
    await gamesFrame.locator("[data-player-pin]").waitFor({ state: "attached", timeout: 20000 });
    assert.equal(await gamesFrame.getByRole("button", { name: "Open in Browser" }).count(), 0);
    assert.equal(await gamesFrame.locator("[data-player-pin]").textContent(), "Add to taskbar");
    assert.equal(await gamesFrame.locator("body").evaluate(() => window.__NEOLinkProxyInstalled === true), false, "The shell injected its proxy interceptor into Games");
    await gamesFrame.locator("body").evaluate(() => {
      window.__shortcutTestResult = null;
      window.addEventListener("message", (event) => {
        if (event.source === window.parent && event.data?.type === "neo-shell:add-game-shortcut-result" && event.data.id === "fixture-shortcut") {
          window.__shortcutTestResult = event.data;
        }
      });
      window.parent.postMessage({
        type: "neo-shell:add-game-shortcut",
        id: "fixture-shortcut",
        game: { title: "Test Pin Game", url: "https://rawcdn.githack.com/unblockedgames99x-code/neo-os-games-04-cdn/97936a4eb6afc11240953f4bf43b6a74e08f6a8f/games/3.html", icon: "https://example.com/cover.png", mode: "direct-game" }
      }, "*");
    });

    await page.waitForFunction(() => window.NEO_SHELL.getCustomApps().some((app) => app.title === "Test Pin Game" && app.installed && app.pinned));
    await gamesFrame.locator("body").evaluate(() => new Promise((resolve, reject) => {
      const started = Date.now();
      const poll = () => {
        if (window.__shortcutTestResult?.ok) return resolve();
        if (Date.now() - started > 5000) return reject(new Error("The shell did not confirm the shortcut"));
        setTimeout(poll, 25);
      };
      poll();
    }));
    const installed = await page.evaluate(() => window.NEO_SHELL.getCustomApps().find((app) => app.title === "Test Pin Game"));
    assert.ok(installed && installed.id, "The selected game was not installed");
    assert.equal(installed.sourceUrl, "https://rawcdn.githack.com/unblockedgames99x-code/neo-os-games-04-cdn/97936a4eb6afc11240953f4bf43b6a74e08f6a8f/games/3.html");
    assert.equal(installed.launchMode, "direct-game");
    assert.equal(await page.locator(`.dock-button[data-app="${installed.id}"]`).count(), 1, "The game is missing from the taskbar");
    assert.equal(await page.locator(`#launcher-grid .launcher-app[data-app="${installed.id}"]`).count(), 1, "The game is missing from the home screen");

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.NEO_SHELL && document.documentElement.dataset.boot === "complete", null, { timeout: 20000 });
    const persisted = await page.evaluate(() => window.NEO_SHELL.getCustomApps().filter((app) => app.title === "Test Pin Game"));
    assert.equal(persisted.length, 1, "Reload created a duplicate game shortcut");
    assert.equal(persisted[0].pinned, true, "The taskbar pin did not persist");
    assert.equal(await page.locator(`.dock-button[data-app="${persisted[0].id}"]`).count(), 1, "The persisted taskbar shortcut is missing");
    assert.equal(await page.locator(`#launcher-grid .launcher-app[data-app="${persisted[0].id}"]`).count(), 1, "The persisted home-screen shortcut is missing");
  } finally {
    await browser.close();
  }
}

run().then(() => {
  console.log("Games add-to-taskbar flow passed with home-screen placement and persistence.");
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
