const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE, ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright")
);

const base = process.env.NEO_PREVIEW_URL || "http://127.0.0.1:3092";
const mercury = "wss://wisp.mercurywork.shop/";

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, serviceWorkers: "block" });
  const page = await context.newPage();
  try {
    await page.goto(`${base}/neo-os/nextnode-browser/index.html`, { waitUntil: "domcontentloaded" });
    await page.locator("#b-wisp").click();
    await page.locator("#wisp-panel").waitFor({ state: "visible" });

    const labels = await page.locator("#wisp-select option").allTextContents();
    assert.deepEqual(labels, [
      "Automatic (recommended)",
      "NextNode Wisp",
      "Probuilding Wisp",
      "Mercury Wisp",
      "Reeyuki Wisp",
      "Reeyuki Wisp 2",
      "Aether Relay 1",
      "Aether Relay 2",
      "Aether Relay 3",
      "Aether Relay 4",
      "Aether Relay 5",
      "Custom...",
    ]);

    await page.locator("#wisp-select").selectOption("custom");
    await page.locator("#wisp-custom-row").waitFor({ state: "visible" });

    await page.evaluate((selected) => {
      localStorage.setItem("neo:browser:wisp:v1", selected);
      localStorage.setItem("neo:browser:wisp-mode:v2", "manual");
    }, mercury);
    await page.reload({ waitUntil: "domcontentloaded" });
    assert.equal(await page.evaluate(() => window.NEO_WISP), mercury);
    await page.locator("#b-wisp").click();
    assert.equal(await page.locator("#wisp-select").inputValue(), mercury);
    assert.match(await page.locator("#wisp-status").textContent(), /Active: Mercury Wisp/);

    console.log("Browser WISP selector UI and persisted Scramjet selection passed.");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
