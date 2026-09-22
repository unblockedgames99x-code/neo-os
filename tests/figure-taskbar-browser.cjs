const assert = require("node:assert/strict");
const path = require("node:path");

function playwrightRuntime() {
  try { return require("playwright"); } catch (_error) {}
  return require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || "", ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules", "playwright"));
}

const { chromium } = playwrightRuntime();
const url = process.env.NEO_FIGURE_TEST_URL || "http://127.0.0.1:3097/neo-os/?test=figure-taskbar-removed-v1";

async function run() {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 884, height: 768 }, deviceScaleFactor: 1 });

  try {
    await page.addInitScript(() => {
      localStorage.setItem("neo_os_settings_v1", JSON.stringify({
        designVersion: 29,
        taskbarStyle: "figure",
        taskbarPosition: "left",
        taskbarRunningApps: true,
        taskbarAppNames: true
      }));
      localStorage.setItem("neo_device_mode_v1", "laptop");
    });
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.NEO_SHELL && document.documentElement.dataset.boot === "complete", null, { timeout: 20000 });
    const start = page.locator("#neo-start-screen");
    if (await start.isVisible()) {
      await start.locator('[data-start-mode="laptop"]').click();
      await start.waitFor({ state: "hidden" });
    }
    const guest = page.locator("[data-neo-login-guest]");
    if (await guest.isVisible()) await guest.click();
    await page.evaluate(() => window.NEO_SHELL.openApp("control"));
    await page.locator('.neo-window[data-app-id="control"] [data-taskbar-options-summary]').waitFor({ state: "attached" });

    const state = await page.evaluate(() => ({
      rootStyle: document.documentElement.dataset.taskbarStyle,
      optionValues: Array.from(document.querySelectorAll("[data-taskbar-style-option]"), (button) => button.getAttribute("data-taskbar-style-option")),
      figureLogoCount: document.querySelectorAll(".taskbar-figure-logo").length,
      figureStylesheetCount: Array.from(document.styleSheets, (sheet) => sheet.href || "").filter((href) => href.includes("neo-figure-taskbar.css")).length
    }));

    assert.equal(state.rootStyle, "current", "Legacy Figure selections should migrate to Floating");
    assert.deepEqual(state.optionValues, ["current", "transparent", "typical", "xeno"]);
    assert.equal(state.figureLogoCount, 0);
    assert.equal(state.figureStylesheetCount, 0);
  } finally {
    await browser.close();
  }
}

run().then(() => {
  console.log("Figure taskbar removal browser checks passed.");
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
