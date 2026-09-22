const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE, ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright")
);

const url = process.env.NEO_WEEKDAYS_URL || "http://127.0.0.1:3097/neo-os/";
const expectedDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });

  try {
    for (let index = 0; index < expectedDays.length; index += 1) {
      const timestamp = Date.UTC(2026, 8, 20 + index, 12, 0, 0);
      const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
      await context.addInitScript(({ fixedTimestamp }) => {
        const NativeDate = Date;
        class FixedDate extends NativeDate {
          constructor(...args) {
            super(...(args.length ? args : [fixedTimestamp]));
          }
          static now() {
            return fixedTimestamp;
          }
        }
        Object.setPrototypeOf(FixedDate, NativeDate);
        window.Date = FixedDate;
        sessionStorage.setItem("neo_os_guest_session_v1", "1");
        localStorage.setItem("neo_os_rainmeter_v2", JSON.stringify({
          enabled: true,
          style: "amber-arc",
          position: "middle-center",
          scale: 100,
          opacity: 100,
          shadow: true,
        }));
      }, { fixedTimestamp: timestamp });

      const page = await context.newPage();
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
      await page.waitForSelector('#rainmeter-clock[data-rainmeter-ready="true"][data-rainmeter-style="amber-arc"]', { timeout: 120000 });
      await page.evaluate(() => {
        ["boot-screen", "neo-start-screen", "neo-login-gate"].forEach((id) => {
          const overlay = document.getElementById(id);
          if (overlay) overlay.style.display = "none";
        });
      });

      const state = await page.evaluate(() => {
        const clock = document.getElementById("rainmeter-clock");
        const weekday = document.getElementById("rainmeter-weekday");
        const glyphs = Array.from(weekday.querySelectorAll(":scope > span > svg.rainmeter-reference-glyph"));
        return {
          label: weekday.getAttribute("aria-label"),
          word: Array.from(weekday.children, (letter) => letter.firstChild?.nodeValue || "").join(""),
          glyphCount: glyphs.length,
          targets: glyphs.map((glyph) => {
            const path = glyph.querySelector("path");
            return [path?.dataset.rainmeterInkTop, path?.dataset.rainmeterInkBottom];
          }),
          heights: glyphs.map((glyph) => Math.round(glyph.getBoundingClientRect().height)),
          color: getComputedStyle(weekday).color,
          arc: getComputedStyle(clock, "::before").display,
          beam: getComputedStyle(clock, "::after").display,
        };
      });

      const expected = expectedDays[index];
      assert.equal(state.label, expected);
      assert.equal(state.word, expected.toUpperCase());
      assert.equal(state.glyphCount, expected.length);
      assert.ok(state.targets.every(([top, bottom]) => top === "4" && bottom === "40"));
      assert.ok(
        Math.max(...state.heights) - Math.min(...state.heights) <= 1,
        `${expected} glyph boxes differ: ${state.heights.join(", ")}`,
      );
      assert.equal(state.color, "rgb(245, 247, 255)");
      assert.equal(state.arc, "none");
      assert.equal(state.beam, "none");

      if (process.env.NEO_WEEKDAYS_SCREENSHOT_DIR) {
        fs.mkdirSync(process.env.NEO_WEEKDAYS_SCREENSHOT_DIR, { recursive: true });
        await page.locator("#rainmeter-clock").screenshot({
          path: path.join(process.env.NEO_WEEKDAYS_SCREENSHOT_DIR, `${index + 1}-${expected.toLowerCase()}.png`),
        });
      }
      await context.close();
    }

    console.log("All seven normalized Rainmeter weekdays rendered on the shared 4–40 glyph line.");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
