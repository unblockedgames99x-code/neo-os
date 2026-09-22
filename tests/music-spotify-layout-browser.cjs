const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE || "", ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules", "playwright")
);

const url = process.env.NEO_MUSIC_TEST_URL || "http://127.0.0.1:3092/neo-os/music-v2/";

async function musicFrame(page) {
  if (!new URL(url).pathname.endsWith(".svg")) return page.mainFrame();
  const handle = await page.waitForSelector("#neo-app", { timeout: 60000 });
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const frame = await handle.contentFrame() ||
      page.frames().find((candidate) => candidate.parentFrame() === page.mainFrame());
    if (frame) return frame;
    await page.waitForTimeout(100);
  }
  throw new Error("Music launcher frame did not become ready.");
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1180, height: 760 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    const music = await musicFrame(page);
    await music.locator(".music-card").first().waitFor({ timeout: 30000 });
    await music.waitForFunction(() => Array.from(document.querySelectorAll(".music-card img")).some((image) => image.naturalWidth > 1), null, { timeout: 30000 });
    const state = await music.evaluate(() => {
      const body = document.body;
      const player = document.getElementById("npBar");
      const sidebar = document.querySelector(".sidebar");
      const main = document.querySelector(".main-panel");
      const brandLogo = document.querySelector(".music-brand-mark img");
      return {
        bodyOverflow: getComputedStyle(body).overflow,
        bodyWidth: body.scrollWidth,
        viewportWidth: body.clientWidth,
        bodyHeight: body.scrollHeight,
        viewportHeight: body.clientHeight,
        sidebarWidth: sidebar.getBoundingClientRect().width,
        mainWidth: main.getBoundingClientRect().width,
        playerHeight: player.getBoundingClientRect().height,
        playerBottom: Math.round(player.getBoundingClientRect().bottom),
        searchPlaceholder: document.getElementById("searchInput").placeholder,
        cards: document.querySelectorAll(".music-card").length,
        hasAlbumArt: Array.from(document.querySelectorAll(".music-card img")).some((image) => image.currentSrc && image.naturalWidth > 1),
        brandLogoLoaded: Boolean(brandLogo && brandLogo.currentSrc && brandLogo.naturalWidth > 1),
        brandLogoSize: brandLogo ? [brandLogo.getBoundingClientRect().width, brandLogo.getBoundingClientRect().height] : [],
        accent: getComputedStyle(document.documentElement).getPropertyValue("--spotify-green").trim(),
      };
    });
    assert.deepEqual(errors, []);
    assert.equal(state.bodyOverflow, "hidden");
    assert.equal(state.bodyWidth, state.viewportWidth);
    assert.equal(state.bodyHeight, state.viewportHeight);
    assert.ok(state.sidebarWidth >= 260);
    assert.ok(state.mainWidth >= 800);
    assert.equal(state.playerHeight, 88);
    assert.equal(state.playerBottom, 752);
    assert.equal(state.searchPlaceholder, "What do you want to play?");
    assert.ok(state.cards >= 6);
    assert.equal(state.hasAlbumArt, true);
    assert.equal(state.brandLogoLoaded, true);
    assert.deepEqual(state.brandLogoSize, [34, 34]);
    assert.equal(state.accent, "#1ed760");
    console.log(JSON.stringify(state, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
