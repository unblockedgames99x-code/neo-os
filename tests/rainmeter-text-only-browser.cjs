const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE, ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright")
);

const base = process.env.NEO_PREVIEW_URL || "http://127.0.0.1:3092";
const appPath = process.env.NEO_PREVIEW_APP_PATH || "/neo-os/";

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const forbiddenHostingRequests = [];
  page.on("request", (request) => {
    if (/(?:github\.com|githubusercontent\.com|jsdelivr\.net)/i.test(request.url())) {
      forbiddenHostingRequests.push(request.url());
    }
  });

  try {
    await page.goto(`${base}${appPath}`);
    await page.locator('[data-start-mode="laptop"]').click();
    await page.locator("[data-neo-login-guest]").click();
    await page.locator('#rainmeter-clock[data-rainmeter-ready="true"]').waitFor();

    for (const style of ["retro", "botanical", "wheel"]) {
      const result = await page.locator("#rainmeter-clock").evaluate((clock, nextStyle) => {
        clock.dataset.rainmeterStyle = nextStyle;
        const own = getComputedStyle(clock);
        const children = Array.from(clock.children).map((child) => {
          const computed = getComputedStyle(child);
          return {
            backgroundColor: computed.backgroundColor,
            backgroundImage: computed.backgroundImage,
          };
        });
        return {
          backgroundColor: own.backgroundColor,
          backgroundImage: own.backgroundImage,
          borderTopWidth: own.borderTopWidth,
          boxShadow: own.boxShadow,
          children,
        };
      }, style);

      assert.equal(result.backgroundColor, "rgba(0, 0, 0, 0)", `${style} background color`);
      assert.equal(result.backgroundImage, "none", `${style} background image`);
      assert.equal(result.borderTopWidth, "0px", `${style} border`);
      assert.equal(result.boxShadow, "none", `${style} shadow`);
      for (const child of result.children) {
        assert.equal(child.backgroundColor, "rgba(0, 0, 0, 0)", `${style} child background color`);
        assert.equal(child.backgroundImage, "none", `${style} child background image`);
      }
    }

    assert.deepEqual(forbiddenHostingRequests, [], "desktop boot should not load NEO OS files from GitHub or jsDelivr");

    console.log("Rainmeter text-only styles render transparently in the browser.");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
