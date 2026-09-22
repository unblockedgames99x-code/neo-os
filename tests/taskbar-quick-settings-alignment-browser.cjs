const assert = require("node:assert/strict");
const path = require("node:path");

function playwrightRuntime() {
  try { return require("playwright"); } catch (_error) {}
  return require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || "", ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules", "playwright"));
}

const { chromium } = playwrightRuntime();
const url = process.env.NEO_QUICK_SETTINGS_TEST_URL || "http://127.0.0.1:3092/neo-os/?test=quick-settings-alignment-v2";

function near(left, right, tolerance = 1.5) {
  return Math.abs(left - right) <= tolerance;
}

async function run() {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 940, height: 640 } });
  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.NEO_SHELL && document.documentElement.dataset.boot === "complete", null, { timeout: 20000 });
    const start = page.locator("#neo-start-screen");
    if (await start.isVisible()) {
      await start.locator('[data-start-mode="laptop"]').click();
      await start.waitFor({ state: "hidden" });
    }
    const guest = page.locator("[data-neo-login-guest]");
    if (await guest.isVisible()) await guest.click();
    await page.evaluate(() => {
      window.NEO_SHELL.setSetting("taskbarPosition", "bottom");
      window.NEO_SHELL.setSetting("taskbarStyle", "typical");
    });
    await page.locator("[data-taskbar-quick-toggle]").click();
    const panel = page.locator("#taskbar-quick-settings");
    await panel.waitFor({ state: "visible" });

    const geometry = await panel.evaluate((element) => {
      const rect = (node) => {
        const value = node.getBoundingClientRect();
        return { left: value.left, right: value.right, top: value.top, bottom: value.bottom, width: value.width, height: value.height, centerY: value.top + value.height / 2 };
      };
      const cards = Array.from(element.querySelectorAll(".taskbar-quick-grid > button"));
      const icons = cards.map((card) => rect(card.querySelector(".icon")));
      const copies = cards.map((card) => rect(card.querySelector("span")));
      const sliders = Array.from(element.querySelectorAll(".taskbar-quick-sliders label"));
      return {
        panel: rect(element),
        grid: rect(element.querySelector(".taskbar-quick-grid")),
        sliderBox: rect(element.querySelector(".taskbar-quick-sliders")),
        cards: cards.map(rect),
        icons,
        copies,
        tracks: sliders.map((label) => rect(label.querySelector('input[type="range"]'))),
        outputs: sliders.map((label) => rect(label.querySelector("output")))
      };
    });

    assert.ok(near(geometry.grid.left, geometry.sliderBox.left) && near(geometry.grid.right, geometry.sliderBox.right), "Cards and sliders must share the same outer edges");
    assert.ok(near(geometry.cards[0].left, geometry.cards[2].left) && near(geometry.cards[0].left, geometry.cards[4].left), "Left-column cards are not aligned");
    assert.ok(near(geometry.cards[1].left, geometry.cards[3].left) && near(geometry.cards[1].left, geometry.cards[5].left), "Right-column cards are not aligned");
    assert.ok(geometry.icons.every((icon, index) => near(icon.centerY, geometry.copies[index].centerY, 2)), "Tile icons and text are not vertically centered together");
    assert.ok(near(geometry.tracks[0].left, geometry.tracks[1].left) && near(geometry.tracks[0].right, geometry.tracks[1].right), "Slider tracks are not aligned");
    assert.ok(near(geometry.outputs[0].right, geometry.outputs[1].right), "Slider values are not right-aligned");
  } finally {
    await browser.close();
  }
}

run().then(() => console.log("Quick settings alignment passed for tiles, icons, sliders, and values."))
  .catch((error) => { console.error(error); process.exitCode = 1; });
