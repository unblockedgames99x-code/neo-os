const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE, ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright")
);

const launchUrl = process.env.NEO_BROWSER_CDN_URL;
if (!launchUrl) throw new Error("NEO_BROWSER_CDN_URL is required");

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  try {
    await page.goto(launchUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForFunction(() => (
      document.querySelector("#neo-browser")?.contentDocument?.querySelectorAll("#wisp-select option").length === 11
    ), null, { timeout: 60000 });
    const state = await page.evaluate(() => {
      const frame = document.querySelector("#neo-browser");
      const view = frame.contentWindow;
      const doc = frame.contentDocument;
      doc.querySelector("#b-wisp").click();
      return {
        engine: view.NEO_PROXY_ENGINE,
        active: view.NEO_WISP,
        labels: [...doc.querySelectorAll("#wisp-select option")].map((option) => option.textContent),
        visible: !doc.querySelector("#wisp-panel").hidden,
      };
    });
    assert.equal(state.engine, "Scramjet");
    assert.equal(state.active, "wss://probuildingsupplies.com/w/");
    assert.equal(state.visible, true);
    assert.deepEqual(state.labels, [
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
    console.log("Live CDN Browser exposes every NextNode, Yukios, and Aether WISP server.");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
