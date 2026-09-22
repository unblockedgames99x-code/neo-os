const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE, ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright")
);

const url = process.env.NEO_GLYPH_TEST_URL || "http://127.0.0.1:3092/neo-os/";

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  try {
    await page.addInitScript(() => {
      sessionStorage.setItem("neo_os_guest_session_v1", "1");
      localStorage.setItem("neo_os_rainmeter_v2", JSON.stringify({ style: "glyph", position: "middle-center" }));
    });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForFunction(() => {
      const frame = document.getElementById("neo-os");
      const doc = frame?.contentDocument || document;
      return Boolean(doc.querySelector('[data-start-mode="laptop"]'));
    }, null, { timeout: 180000 });
    await page.evaluate(() => {
      const frame = document.getElementById("neo-os");
      const doc = frame?.contentDocument || document;
      doc.querySelector('[data-start-mode="laptop"]')?.click();
    });
    await page.waitForFunction(() => {
      const frame = document.getElementById("neo-os");
      const doc = frame?.contentDocument || document;
      return Boolean(doc.querySelector('[data-neo-login-guest]')) || doc.getElementById("neo-start-screen")?.hidden;
    }, null, { timeout: 30000 });
    await page.evaluate(() => {
      const frame = document.getElementById("neo-os");
      const doc = frame?.contentDocument || document;
      doc.querySelector('[data-neo-login-guest]')?.click();
    });
    await page.waitForFunction(() => {
      const frame = document.getElementById("neo-os");
      const doc = frame?.contentDocument || document;
      return doc.querySelector('#rainmeter-clock[data-rainmeter-ready="true"][data-rainmeter-style="glyph"] #rainmeter-weekday')?.dataset.rainmeterGlyphDay;
    }, null, { timeout: 180000 });
    if (process.env.NEO_GLYPH_SCREENSHOT) {
      await page.waitForFunction(() => {
        const frame = document.getElementById("neo-os");
        const doc = frame?.contentDocument || document;
        return doc.documentElement.dataset.universalLoading !== "true" && doc.getElementById("neo-start-screen")?.hidden;
      }, null, { timeout: 30000 });
    }

    const state = await page.evaluate(() => {
      const frame = document.getElementById("neo-os");
      const doc = frame?.contentDocument || document;
      const view = doc.defaultView;
      const clock = doc.getElementById("rainmeter-clock");
      const weekday = doc.getElementById("rainmeter-weekday");
      const computed = view.getComputedStyle(clock);
      const word = view.getComputedStyle(weekday, "::after").content.replace(/^['"]|['"]$/g, "");
      return {
        style: clock.dataset.rainmeterStyle,
        word,
        label: weekday.getAttribute("aria-label"),
        background: computed.backgroundColor,
        image: computed.backgroundImage,
        border: computed.borderTopWidth,
        shadow: computed.boxShadow,
        hiddenLetters: Array.from(weekday.children).every((letter) => view.getComputedStyle(letter).display === "none"),
        choices: Array.from(doc.querySelectorAll('[data-rainmeter-style]')).map((item) => item.dataset.rainmeterStyle),
      };
    });

    assert.equal(state.style, "glyph");
    const glyphs = { A: "卂", B: "乃", C: "匚", D: "ᗪ", E: "乇", F: "千", G: "Ꮆ", H: "卄", I: "丨", J: "ﾌ", K: "Ҝ", L: "ㄥ", M: "爪", N: "几", O: "ㄖ", P: "卩", Q: "Ɋ", R: "尺", S: "丂", T: "ㄒ", U: "ㄩ", V: "ᐯ", W: "山", X: "乂", Y: "ㄚ", Z: "乙" };
    const expectedWord = Array.from(state.label.toUpperCase()).map((letter) => glyphs[letter] || letter).join("");
    assert.equal(state.word, expectedWord);
    assert.equal(state.background, "rgba(0, 0, 0, 0)");
    assert.equal(state.image, "none");
    assert.equal(state.border, "0px");
    assert.equal(state.shadow, "none");
    assert.equal(state.hiddenLetters, true);
    assert.ok(state.choices.includes("glyph"));

    if (process.env.NEO_GLYPH_SCREENSHOT) await page.screenshot({ path: process.env.NEO_GLYPH_SCREENSHOT });
    console.log(`Rainmeter Glyph rendered ${state.word} transparently with an accessible ${state.label} label.`);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
