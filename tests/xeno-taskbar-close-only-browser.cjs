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
const url = process.env.NEO_XENO_CLOSE_URL || "http://127.0.0.1:3092/neo-os/?test=xeno-close-only-v1";

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
      localStorage.setItem("neo_os_settings_v1", JSON.stringify({
        designVersion: 25,
        taskbarStyle: "xeno",
        taskbarPosition: "bottom",
        taskbarRunningApps: true,
        taskbarAppNames: true,
      }));
    });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    let shell = page.mainFrame();
    if (await page.locator("#neo-os").count()) {
      const handle = await page.waitForSelector("#neo-os", { timeout: 60000 });
      for (let attempt = 0; attempt < 200; attempt += 1) {
        shell = await handle.contentFrame() || page.frames().find((frame) => frame.parentFrame() === page.mainFrame()) || null;
        if (shell) break;
        await page.waitForTimeout(100);
      }
      if (!shell) throw new Error("The CDN desktop frame did not attach.");
    }
    await shell.waitForFunction(() => window.NEO_SHELL && document.documentElement.dataset.boot === "complete", null, { timeout: 60000 });
    const start = shell.locator("#neo-start-screen");
    if (await start.isVisible()) {
      await start.locator('[data-start-mode="laptop"]').click();
      await start.waitFor({ state: "hidden" });
    }
    const guest = shell.locator("[data-neo-login-guest]");
    if (await guest.isVisible()) await guest.click();

    await shell.evaluate(() => window.NEO_SHELL.openApp("control"));
    const win = shell.locator('.neo-window[data-app-id="control"]');
    await win.waitFor({ state: "visible" });
    const task = shell.locator('#neo-dock .dock-button[data-app="control"]');
    await task.hover();

    const close = shell.locator('.neo-xeno-taskbar-close[data-app="control"]');
    await close.waitFor({ state: "visible", timeout: 3000 });
    assert.equal(await shell.locator(".neo-taskbar-preview.is-open").count(), 0, "XENO must not open the window preview card");
    assert.equal(await close.getAttribute("aria-label"), "Close System Settings");

    const taskBox = await task.boundingBox();
    const closeBox = await close.boundingBox();
    assert.ok(taskBox && closeBox, "the taskbar item and close control must be measurable");
    assert.ok(closeBox.x >= taskBox.x && closeBox.x + closeBox.width <= taskBox.x + taskBox.width + 1, "the X should sit inside the taskbar pill");
    assert.ok(closeBox.y >= taskBox.y && closeBox.y + closeBox.height <= taskBox.y + taskBox.height + 1, "the X should be vertically centered inside the taskbar pill");

    if (process.env.NEO_XENO_CLOSE_SCREENSHOT) {
      await page.screenshot({ path: process.env.NEO_XENO_CLOSE_SCREENSHOT, fullPage: true });
    }
    await close.click();
    await win.waitFor({ state: "detached" });
    console.log("XENO taskbar hover shows only an inline close X and closes the app without a preview card.");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
