const assert = require("node:assert/strict");
const path = require("node:path");

function playwrightRuntime() {
  try { return require("playwright"); } catch (_error) {}
  return require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || "", ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules", "playwright"));
}

const { chromium } = playwrightRuntime();
const base = process.env.NEO_STREAM_SECTIONS_TEST_URL || "http://127.0.0.1:3092/neo-os/neo-tv/index.html";

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
    await page.route("**/web/catalog/**", route => {
      const url = new URL(route.request().url());
      const type = url.searchParams.get("type") === "all" ? "m" : (url.searchParams.get("type") || "m");
      const pageNumber = Number(url.searchParams.get("page") || 1);
      const limit = Number(url.searchParams.get("limit") || 36);
      const query = url.searchParams.get("q") || "Catalog";
      const results = Array.from({ length: limit }, (_, index) => ({
        type,
        id: pageNumber * 1000 + index,
        title: type === "tv" ? `Open Series ${pageNumber}-${index}` : `${query} Movie ${pageNumber}-${index}`,
        year: "2025",
        rating: "8.2 / 10",
        overview: "A public catalogue result.",
        posterUrl: "",
        backdropUrl: ""
      }));
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ page: pageNumber, limit, hasMore: pageNumber < 3, results }) });
    });
    await page.goto(base + "?view=movies&test=media-sections-v2", { waitUntil: "domcontentloaded", timeout: 60000 });
    let surface = await getSurface();
    await surface.waitForFunction(() => window.NEO_MOVIES, null, { timeout: 30000 });
    const profile = surface.locator(".profile:not(.profile-add)").first();
    if (await profile.isVisible()) await profile.click();
    await surface.locator('[data-view="movies"].is-active').waitFor();
    await surface.locator("[data-library-grid] .title-card").first().waitFor({ state: "visible" });
    assert.equal(await surface.locator("[data-library-grid] .title-card").count(), 36, "The first full-catalogue page did not render");
    await surface.locator("[data-library-more]").click();
    await surface.waitForFunction(() => document.querySelectorAll("[data-library-grid] .title-card").length >= 72);
    const movieCard = surface.locator(".title-card").first();
    await movieCard.waitFor({ state: "visible" });
    await movieCard.click();
    await surface.locator("[data-details-dialog][open]").waitFor();
    assert.equal(await surface.locator("[data-details-dialog] .primary").textContent(), "Play");
    assert.match(await surface.locator("[data-details-dialog] .details-meta").textContent(), /MOVIE/);

    await page.goto(base + "?view=series&test=media-sections-v2", { waitUntil: "domcontentloaded", timeout: 60000 });
    surface = await getSurface();
    await surface.waitForFunction(() => window.NEO_MOVIES, null, { timeout: 30000 });
    const seriesProfile = surface.locator(".profile:not(.profile-add)").first();
    if (await seriesProfile.isVisible()) await seriesProfile.click();
    await surface.locator('[data-view="series"].is-active').waitFor();
    const seriesCard = surface.locator(".title-card").first();
    await seriesCard.waitFor({ state: "visible" });
    await seriesCard.click();
    await surface.locator("[data-details-dialog][open]").waitFor();
    assert.equal(await surface.locator("[data-details-dialog] .primary").textContent(), "Open official page");
    assert.match(await surface.locator("[data-details-dialog] .details-meta").textContent(), /SERIES/);
  } finally {
    await browser.close();
  }
  console.log("NEO Movies movie and series deep-link browser checks passed.");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
