const assert = require("node:assert/strict");
const path = require("node:path");

function playwrightRuntime() {
  try { return require("playwright"); } catch (_error) {}
  return require(process.env.NEO_PLAYWRIGHT_PATH || path.join(
    process.env.USERPROFILE || "",
    ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules", "playwright"
  ));
}

const { chromium } = playwrightRuntime();
const url = process.env.NEO_TASKBAR_CLOSE_URL || "http://127.0.0.1:3092/neo-os/?test=taskbar-current-state-v1";

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await page.addInitScript(() => {
      sessionStorage.setItem("neo_os_guest_session_v1", "1");
      sessionStorage.setItem("neo_os_booted_session", "1");
      localStorage.setItem("neo_os_pinned_apps_v1", "[]");
    });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForFunction(() => window.NEO_SHELL && document.documentElement.dataset.boot === "complete", null, { timeout: 30000 });
    const start = page.locator("#neo-start-screen");
    if (await start.isVisible()) {
      await start.locator('[data-start-mode="laptop"]').click();
      await start.waitFor({ state: "hidden" });
    }
    const guest = page.locator("[data-neo-login-guest]");
    if (await guest.isVisible()) await guest.click();

    await page.evaluate(() => window.NEO_SHELL.openApp("control"));
    const win = page.locator('.neo-window[data-app-id="control"]');
    await win.waitFor({ state: "visible" });
    const search = win.locator("[data-settings-search] input");
    await search.fill("animation speed");

    const tile = page.locator('#neo-dock .dock-button[data-app="control"]');
    await tile.hover();
    const preview = page.locator(".neo-taskbar-preview.is-open");
    await preview.waitFor({ state: "visible", timeout: 3000 });
    const geometry = await preview.boundingBox();
    assert.ok(geometry.width >= 250 && geometry.height >= 150, `current-state preview should be a readable thumbnail: ${JSON.stringify(geometry)}`);
    assert.equal(await preview.evaluate((node) => node.classList.contains("is-close-only")), false);
    assert.equal(await preview.locator("[data-taskbar-preview-title]").textContent(), "System Settings");
    assert.equal(await preview.locator("[data-taskbar-preview-status]").textContent(), "Running");
    const snapshot = preview.locator(".neo-taskbar-preview-snapshot");
    await snapshot.waitFor({ state: "attached" });
    assert.equal(await snapshot.getAttribute("title"), "Current window preview");
    assert.equal(await preview.locator("[data-taskbar-preview-viewport]").getAttribute("data-preview-type"), "current-state");
    const snapshotText = await snapshot.contentFrame().locator("body").innerText();
    assert.match(snapshotText, /Settings/);
    assert.match(snapshotText, /animation speed/i);
    const close = preview.locator("[data-taskbar-preview-close]");
    assert.equal(await close.getAttribute("aria-label"), "Close System Settings");
    if (process.env.NEO_TASKBAR_CLOSE_SCREENSHOT) {
      await page.screenshot({ path: process.env.NEO_TASKBAR_CLOSE_SCREENSHOT, fullPage: true });
    }
    await close.click();
    await win.waitFor({ state: "detached" });
    console.log("Taskbar hover shows the app's current searchable Settings state and keeps its close control working.");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
