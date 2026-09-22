const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE, ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright")
);

const url = process.env.NEO_AMBER_ARC_URL || "http://127.0.0.1:3097/neo-os/";

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  try {
    await page.addInitScript(() => {
      sessionStorage.setItem("neo_os_guest_session_v1", "1");
      localStorage.setItem("neo_os_rainmeter_v2", JSON.stringify({
        enabled: true,
        style: "amber-arc",
        position: "middle-center",
        scale: 100,
        opacity: 100,
        shadow: true,
      }));
    });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
    let shellFrame = page.mainFrame();
    if (/\/launch\.svg(?:[?#]|$)/i.test(url)) {
      await page.waitForSelector("#neo-os", { state: "attached", timeout: 60000 });
      shellFrame = null;
      for (let attempt = 0; attempt < 120; attempt += 1) {
        shellFrame = page.frames().find((frame) => frame !== page.mainFrame() && frame.url() === "about:srcdoc") || null;
        if (shellFrame) break;
        await page.waitForTimeout(250);
      }
      assert.ok(shellFrame, "published launcher should attach the NEO OS frame");
    }
    await shellFrame.waitForSelector('#rainmeter-clock[data-rainmeter-ready="true"][data-rainmeter-style="amber-arc"]', { timeout: 120000 });
    await shellFrame.evaluate(() => document.fonts?.ready);
    await shellFrame.evaluate(() => {
      ["boot-screen", "neo-start-screen", "neo-login-gate"].forEach((id) => {
        const overlay = document.getElementById(id);
        if (overlay) overlay.style.display = "none";
      });
    });

    const state = await shellFrame.evaluate(() => {
      const clock = document.getElementById("rainmeter-clock");
      const weekday = document.getElementById("rainmeter-weekday");
      const style = getComputedStyle(clock);
      const arc = getComputedStyle(clock, "::before");
      const needle = getComputedStyle(clock, "::after");
      const rect = clock.getBoundingClientRect();
      const weekdayStyle = getComputedStyle(weekday);
      const weekdayRect = weekday.getBoundingClientRect();
      return {
        style: clock.dataset.rainmeterStyle,
        label: weekday.getAttribute("aria-label"),
        word: Array.from(weekday.children, (letter) => letter.firstChild?.nodeValue || "").join(""),
        referenceWord: getComputedStyle(weekday, "::after").content.replace(/^['"]|['"]$/g, ""),
        referenceGlyphs: Array.from(weekday.children, (letter) => letter.dataset.rainmeterReferenceGlyph || "").join(""),
        normalizedGlyphs: weekday.querySelectorAll(":scope > span > svg.rainmeter-reference-glyph path[data-rainmeter-ink-top='4'][data-rainmeter-ink-bottom='40']").length,
        letterWidths: Array.from(weekday.children, (letter) => Math.round(letter.getBoundingClientRect().width)),
        expected: new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date()),
        background: style.backgroundImage,
        backgroundColor: style.backgroundColor,
        borderWidth: style.borderTopWidth,
        shadow: style.boxShadow,
        radius: style.borderTopLeftRadius,
        arcBackground: arc.backgroundImage,
        needleBackground: needle.backgroundImage,
        needleClip: needle.clipPath,
        width: rect.width,
        height: rect.height,
        weekdayDisplay: weekdayStyle.display,
        weekdayColor: weekdayStyle.color,
        weekdayOpacity: weekdayStyle.opacity,
        weekdayWidth: weekdayRect.width,
        weekdayHeight: weekdayRect.height,
        hiddenSecondary: [".rainmeter-kicker", ".rainmeter-time", ".rainmeter-date"]
          .every((selector) => getComputedStyle(clock.querySelector(selector)).display === "none"),
        choices: Array.from(document.querySelectorAll("[data-rainmeter-style]"), (item) => item.dataset.rainmeterStyle),
      };
    });

    if (process.env.NEO_AMBER_ARC_SCREENSHOT) {
      const clock = shellFrame.locator("#rainmeter-clock");
      await page.waitForTimeout(200);
      await clock.screenshot({ path: process.env.NEO_AMBER_ARC_SCREENSHOT });
    }

    assert.equal(state.style, "amber-arc");
    assert.equal(state.label, state.expected);
    assert.equal(state.word, state.expected.toUpperCase());
    const referenceGlyphs = { A: "卂", B: "乃", C: "匚", D: "ᗪ", E: "乇", F: "千", G: "Ꮆ", H: "卄", I: "丨", J: "ﾌ", K: "Ҝ", L: "ㄥ", M: "爪", N: "几", O: "ㄖ", P: "卩", Q: "Ɋ", R: "尺", S: "丂", T: "ㄒ", U: "ㄩ", V: "ᐯ", W: "山", X: "乂", Y: "ㄚ", Z: "乙" };
    const expectedReference = Array.from(state.expected.toUpperCase()).map((letter) => referenceGlyphs[letter] || letter).join("");
    assert.equal(state.referenceGlyphs, expectedReference);
    assert.equal(state.normalizedGlyphs, state.expected.length);
    assert.equal(state.referenceWord, "none");
    assert.ok(state.letterWidths.every((width) => width >= 15 && width <= 34));
    assert.equal(state.background, "none");
    assert.equal(state.backgroundColor, "rgba(0, 0, 0, 0)");
    assert.equal(state.borderWidth, "0px");
    assert.equal(state.shadow, "none");
    assert.equal(state.radius, "0px");
    assert.equal(state.arcBackground, "none");
    assert.equal(state.needleBackground, "none");
    assert.ok(state.width >= 350 && state.width <= 380);
    assert.ok(state.height >= 100 && state.height <= 120);
    assert.equal(state.weekdayDisplay, "flex");
    assert.notEqual(state.weekdayColor, "rgba(0, 0, 0, 0)");
    assert.equal(state.weekdayOpacity, "1");
    assert.ok(state.weekdayWidth > 150);
    assert.ok(state.weekdayHeight > 24);
    assert.equal(state.hiddenSecondary, true);
    assert.ok(state.choices.includes("amber-arc"));
    const otherPresetGlyphDisplay = await shellFrame.evaluate(() => {
      const clock = document.getElementById("rainmeter-clock");
      return ["poster", "classic", "retro", "botanical", "wheel", "glyph"].map((style) => {
        clock.dataset.rainmeterStyle = style;
        return {
          style,
          displays: Array.from(clock.querySelectorAll("svg.rainmeter-reference-glyph"), (glyph) => getComputedStyle(glyph).display),
        };
      });
    });
    assert.ok(otherPresetGlyphDisplay.length > 0);
    assert.ok(
      otherPresetGlyphDisplay.every((preset) => preset.displays.length > 0 && preset.displays.every((display) => display === "none")),
      "custom vectors must never appear in other presets",
    );
    console.log(`Rainmeter Amber Arc rendered the live weekday ${state.word} in ${state.weekdayColor}.`);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
