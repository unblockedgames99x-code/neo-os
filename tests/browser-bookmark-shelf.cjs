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
const url = process.env.NEO_BROWSER_TEST_URL || "http://127.0.0.1:3092/neo-os/NEO-BROWSER/?test=bookmark-shelf-v1";

async function run() {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector("#bookmarksWrap", { state: "attached" });
    const shelf = await page.locator("#bookmarksWrap").evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { display: getComputedStyle(element).display, width: rect.width, height: rect.height };
    });
    assert.equal(shelf.display, "none", `Bookmark shelf must be removed: ${JSON.stringify(shelf)}`);
    assert.equal(shelf.height, 0, `Bookmark shelf must not reserve vertical space: ${JSON.stringify(shelf)}`);
    console.log("Browser bookmark shelf is removed and reserves no space.");
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
