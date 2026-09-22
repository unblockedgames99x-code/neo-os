const assert = require("node:assert/strict");
const path = require("node:path");

function playwrightRuntime() {
  try { return require("playwright"); } catch (_error) {}
  return require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || "", ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules", "playwright"));
}

const { chromium } = playwrightRuntime();
const url = process.env.NEO_TASKBAR_TEST_URL || "http://127.0.0.1:3092/neo-os/?test=taskbar-transparency-v1";

function alphaFromColor(color) {
  const match = String(color).match(/rgba?\([^)]*?([\d.]+)\s*\)$/);
  return match ? Number(match[1]) : 1;
}

async function run() {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });

  try {
    await page.addInitScript(() => {
      if (sessionStorage.getItem("neo_transparency_test_seeded") === "true") return;
      sessionStorage.setItem("neo_transparency_test_seeded", "true");
      localStorage.setItem("neo_os_settings_v1", JSON.stringify({
        designVersion: 21,
        taskbarTintStrength: 86,
        taskbarStyle: "current",
        taskbarSurface: "glass",
        taskbarTint: "#767c84"
      }));
    });
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.NEO_SHELL && document.documentElement.dataset.boot === "complete", null, { timeout: 20000 });

    const migrated = await page.evaluate(() => ({
      transparency: window.NEO_SHELL.getSetting("taskbarTransparency"),
      opacity: getComputedStyle(document.documentElement).getPropertyValue("--neo-taskbar-opacity").trim(),
      saved: JSON.parse(localStorage.getItem("neo_os_settings_v1") || "{}")
    }));
    assert.equal(migrated.transparency, 14);
    assert.equal(migrated.opacity, "0.86");
    assert.equal(migrated.saved.taskbarTransparency, 14);
    assert.equal("taskbarTintStrength" in migrated.saved, false);

    await page.evaluate(() => window.NEO_SHELL.openApp("control"));
    const settingsWindow = page.locator('.neo-window[data-app-id="control"]');
    const slider = settingsWindow.locator('[data-setting="taskbarTransparency"]');
    await slider.waitFor({ state: "visible" });
    assert.equal(await slider.getAttribute("aria-label"), "Taskbar glass transparency");

    const readVisualState = () => page.locator(".taskbar").evaluate((taskbar) => ({
      color: getComputedStyle(taskbar).backgroundColor,
      opacity: getComputedStyle(document.documentElement).getPropertyValue("--neo-taskbar-opacity").trim(),
      setting: window.NEO_SHELL.getSetting("taskbarTransparency"),
      mode: document.documentElement.dataset.performanceMode
    }));
    await page.evaluate(() => window.NEO_SHELL.setSetting("taskbarTransparency", 20));
    await page.waitForTimeout(260);
    const lowTransparency = await readVisualState();
    await page.evaluate(() => window.NEO_SHELL.setSetting("taskbarTransparency", 86));
    await page.waitForTimeout(260);
    const highTransparency = await readVisualState();
    assert.equal(lowTransparency.opacity, "0.8");
    assert.equal(highTransparency.opacity, "0.14");
    assert.ok(
      alphaFromColor(highTransparency.color) < alphaFromColor(lowTransparency.color),
      `Increasing transparency must reduce taskbar alpha: ${JSON.stringify(lowTransparency)} -> ${JSON.stringify(highTransparency)}`
    );

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.NEO_SHELL && document.documentElement.dataset.boot === "complete", null, { timeout: 20000 });
    assert.equal(await page.evaluate(() => window.NEO_SHELL.getSetting("taskbarTransparency")), 86);
  } finally {
    await browser.close();
  }
}

run().then(() => {
  console.log("Taskbar transparency behavior and migration passed.");
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
