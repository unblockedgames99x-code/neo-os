const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE, ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright")
);

(async () => {
  const browser = await chromium.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true
  });
  const page = await browser.newPage();
  await page.route("https://neo.test/", (route) => route.fulfill({
    contentType: "text/html",
    body: `<input id="url"><button id="go">Go</button>
      <input id="ntSearch"><button id="ntSearchBtn">Search</button>
      <iframe id="frame"></iframe>`
  }));
  await page.goto("https://neo.test/");
  await page.addScriptTag({
    path: path.resolve(__dirname, "../neo-os/NEO-BROWSER/assets/search-reliability.js")
  });

  await page.locator("#url").fill("neo os games");
  await page.locator("#url").press("Enter");
  assert.equal(
    await page.locator("#url").inputValue(),
    "https://www.bing.com/search?q=neo%20os%20games"
  );

  await page.locator("#ntSearch").fill("chromebook browser");
  await page.locator("#ntSearchBtn").click();
  assert.equal(
    await page.locator("#ntSearch").inputValue(),
    "https://www.bing.com/search?q=chromebook%20browser"
  );

  await page.locator("#url").fill("example.com");
  await page.locator("#url").press("Enter");
  assert.equal(await page.locator("#url").inputValue(), "example.com");

  await page.evaluate(() => {
    window._sessionInstId = "search-test";
    localStorage.setItem("search-test:neo:engine:v1", "custom");
  });
  await page.locator("#url").fill("keep custom provider");
  await page.locator("#url").press("Enter");
  assert.equal(await page.locator("#url").inputValue(), "keep custom provider");

  const liveUrl = process.env.NEO_CDN_LIVE_URL || "";
  if (liveUrl) {
    const livePage = await browser.newPage();
    await livePage.goto(liveUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
    await livePage.waitForFunction(
      () => document.getElementById("neo-os")?.contentWindow?.NEO_SHELL,
      null,
      { timeout: 60000 }
    );
    const production = await livePage.locator("#neo-os").evaluate(async (frame) => {
      const view = frame.contentWindow;
      const browserUrl = view.NEO_LOCAL_CONFIG?.browser || "";
      const coreScript = Array.from(frame.contentDocument.scripts).find((script) =>
        script.src.includes("/neo-os-core-cdn@") && script.src.includes("/neo-os.js")
      );
      const runtimeUrl = coreScript ? new URL("neo-browser-runtime.js", coreScript.src).href : "";
      const runtimeSource = runtimeUrl ? await view.fetch(runtimeUrl).then((response) => response.text()) : "";
      const browserIndexUrl = browserUrl ? new URL("index.html", browserUrl).href : "";
      const browserSource = browserIndexUrl ? await view.fetch(browserIndexUrl).then((response) => response.text()) : "";
      const searchSource = browserIndexUrl ? await view.fetch(new URL("assets/search-reliability.js", browserIndexUrl)).then((response) => response.text()) : "";
      return {
        browserUrl,
        browserUsesReliableSearch: searchSource.includes("https://www.bing.com/search?q="),
        browserLoadsRecovery: browserSource.includes("assets/search-reliability.js")
      };
    });
    assert.match(production.browserUrl, /neo-os-browser-cdn@[^/]+\/NEO-BROWSER\/launch\.svg/);
    assert.equal(production.browserUsesReliableSearch, true);
    assert.equal(production.browserLoadsRecovery, true);
    await livePage.close();
  }

  await browser.close();
  console.log("Search reliability browser checks passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
