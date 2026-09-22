const assert = require("node:assert/strict");
const path = require("node:path");

function playwrightRuntime() {
  try { return require("playwright"); } catch (_error) {}
  return require(process.env.NEO_PLAYWRIGHT_PATH || path.join(
    process.env.USERPROFILE || "",
    ".cache",
    "codex-runtimes",
    "codex-primary-runtime",
    "dependencies",
    "node",
    "node_modules",
    "playwright"
  ));
}

const { chromium } = playwrightRuntime();
const url = process.env.NEO_WINDOWS11_LAUNCHER_URL || "http://127.0.0.1:3092/neo-os/?test=windows11-launcher-center-v1";

async function measure(viewport) {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const page = await browser.newPage({ viewport });
  try {
    await page.addInitScript(() => {
      sessionStorage.setItem("neo_os_guest_session_v1", "1");
      localStorage.setItem("neo_os_settings_v1", JSON.stringify({
        designVersion: 23,
        interfaceStyle: "windows11",
        taskbarPosition: "left",
        taskbarStyle: "current",
      }));
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
    await page.locator(".taskbar-start-button[data-open-launcher]").click();
    await page.locator("#app-launcher.is-open").waitFor({ state: "visible", timeout: 10000 });
    await page.waitForTimeout(360);
    return await page.locator("#app-launcher").evaluate((launcher) => {
      const rect = launcher.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2,
        viewportCenterX: innerWidth / 2,
        viewportCenterY: innerHeight / 2,
        transform: getComputedStyle(launcher).transform,
      };
    });
  } finally {
    await browser.close();
  }
}

(async () => {
  for (const viewport of [{ width: 1366, height: 768 }, { width: 712, height: 806 }]) {
    const result = await measure(viewport);
    assert.ok(
      Math.abs(result.centerX - result.viewportCenterX) <= 1,
      `Windows 11 launcher must be centered at ${viewport.width}px: ${JSON.stringify(result)}`
    );
    assert.ok(Math.abs(result.centerY - result.viewportCenterY) <= 1, `Windows 11 launcher vertical center is wrong: ${JSON.stringify(result)}`);
    assert.ok(result.left >= 0 && result.right <= viewport.width, `Launcher must remain visible: ${JSON.stringify(result)}`);
    assert.ok(result.top >= 0 && result.bottom <= viewport.height, `Launcher must remain vertically visible: ${JSON.stringify(result)}`);
  }
  console.log("Windows 11 launcher stays centered on desktop and compact screens.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
