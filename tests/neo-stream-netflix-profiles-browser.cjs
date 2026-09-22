const assert = require("node:assert/strict");
const path = require("node:path");

function playwrightRuntime() {
  try { return require("playwright"); } catch (_error) {}
  return require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || "", ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules", "playwright"));
}

const { chromium } = playwrightRuntime();
const base = process.env.NEO_STREAM_PROFILE_TEST_URL || "http://127.0.0.1:3092/neo-os/neo-tv/index.html";

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  async function getSurface() {
    await page.waitForFunction(() => document.querySelector("#neo-app") || document.querySelector("[data-profile-gate]"), null, { timeout: 30000 });
    const wrapper = await page.$("#neo-app");
    if (!wrapper) return page;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const frame = (await wrapper.contentFrame()) || page.frames().find(item => item.url().includes("/__neo_app__/"));
      if (frame) return frame;
      await page.waitForTimeout(100);
    }
    throw new Error("NEO Movies wrapper frame did not attach");
  }
  try {
    await page.goto(base + "?test=movies-classics-v2", { waitUntil: "domcontentloaded", timeout: 60000 });
    const surface = await getSurface();
    await surface.waitForFunction(() => window.NEO_MOVIES, null, { timeout: 30000 });
    await surface.locator(".profile:not(.profile-add)").first().waitFor({ state: "visible" });
    assert.match(await surface.locator(".profile:not(.profile-add) .profile-avatar img").first().getAttribute("src"), /profile-classics\/scarlett-chilleez\.png/, "The local classic profile picture did not render");

    await surface.locator(".profile-add").click();
    await surface.locator("[data-profile-dialog][open]").waitFor();
    const choices = surface.locator(".profile-picture-choice");
    assert.equal(await choices.count(), 23, "The picker did not render all 23 classic profile characters");
    assert.equal(await surface.locator("[data-avatar-upload]").count(), 1, "Custom profile uploads are missing");
    if (process.env.NEO_SCREENSHOT_PATH) await surface.locator("[data-profile-dialog] form").screenshot({ path: process.env.NEO_SCREENSHOT_PATH, animations: "disabled", timeout: 10000 });

    await choices.nth(2).click();
    await surface.locator('[data-profile-form] input[name="name"]').fill("Classic");
    await surface.locator("[data-profile-save]").click();
    const created = surface.locator(".profile", { hasText: "Classic" });
    await created.waitFor({ state: "visible" });
    assert.match(await created.locator(".profile-avatar img").getAttribute("src"), /profile-classics\/dusty-chilleez\.png/, "The chosen classic character was not saved");
  } finally {
    await browser.close();
  }
  console.log("NEO Movies classic profile browser checks passed.");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
