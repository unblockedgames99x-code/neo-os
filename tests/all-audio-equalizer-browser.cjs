const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE, ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright")
);

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
    args: ["--autoplay-policy=user-gesture-required"]
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await page.setContent("<!doctype html><button id='start'>Start game audio</button>");
    await page.addScriptTag({ path: path.resolve(__dirname, "..", "neo-os", "neo-audio-spectrum-bridge.js") });
    await page.evaluate(() => {
      window.__allAudioEvents = [];
      window.addEventListener("neo-media-levels", (event) => window.__allAudioEvents.push(event.detail));
      document.getElementById("start").addEventListener("click", () => {
        const Context = window.AudioContext || window.webkitAudioContext;
        const context = new Context();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.value = 440;
        gain.gain.value = 0.12;
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        setTimeout(() => {
          oscillator.stop();
          context.close();
        }, 650);
      }, { once: true });
    });
    await page.click("#start");
    await page.waitForFunction(() => window.__allAudioEvents.some((detail) =>
      detail && detail.active === true && Array.isArray(detail.levels) &&
      detail.levels.length === 32 && Math.max(...detail.levels) > 0.02
    ), null, { timeout: 5000 });
    const snapshot = await page.evaluate(() => ({
      active: window.__allAudioEvents.some((detail) => detail.active === true),
      measured: window.__allAudioEvents.some((detail) => detail.measured === true),
      bands: Math.max(...window.__allAudioEvents.map((detail) => detail.levels.length)),
      peak: Math.max(...window.__allAudioEvents.flatMap((detail) => detail.levels))
    }));
    assert.equal(snapshot.active, true);
    assert.equal(snapshot.measured, true);
    assert.equal(snapshot.bands, 32);
    assert.ok(snapshot.peak > 0.02, "The game-style Web Audio signal was not measured");
    assert.deepEqual(errors, []);

    if (process.env.NEO_CDN_LIVE_URL) {
      const live = await browser.newPage();
      const liveErrors = [];
      live.on("pageerror", (error) => liveErrors.push(error.message));
      await live.goto(process.env.NEO_CDN_LIVE_URL, { waitUntil: "domcontentloaded", timeout: 120000 });
      const outer = await live.waitForSelector("#neo-os", { timeout: 120000 });
      let desktop = null;
      for (let attempt = 0; attempt < 100 && !desktop; attempt += 1) {
        desktop = await outer.contentFrame();
        if (!desktop) desktop = live.frames().find((frame) => frame.name() === "neo-os") || null;
        if (!desktop) await live.waitForTimeout(100);
      }
      assert.ok(desktop, "The CDN desktop frame did not load");
      await desktop.locator('[data-start-mode="laptop"]').click();
      await desktop.locator("[data-neo-login-guest]").click();
      await desktop.waitForFunction(() => {
        const gate = document.getElementById("neo-login-gate");
        return Boolean(gate && gate.hidden && window.NEO_SHELL && window.NEO_BOTTOM_VISUALIZER);
      });
      await desktop.evaluate(() => {
        window.__routeAudioEvents = [];
        window.addEventListener("neo-media-levels", (event) => window.__routeAudioEvents.push(event.detail));
        window.NEO_BOTTOM_VISUALIZER.setEnabled(true);
        window.__testEqualizerId = window.NEO_SKINS.add("equalizer", "minimalist");
        window.NEO_SHELL.openApp("geometry-dash");
      });
      const appHandle = await desktop.waitForSelector('.neo-window[data-app-id="geometry-dash"] iframe', { timeout: 30000 });
      const app = await appHandle.contentFrame();
      assert.ok(app, "The Geometry Dash frame did not load");
      await app.waitForFunction(() => window.__neoAudioSpectrumBridge === true, null, { timeout: 30000 });
      try {
        await app.waitForFunction(() => document.body && !document.getElementById("loader"), null, { timeout: 30000 });
      } catch (_error) {}
      await app.waitForFunction(() => Boolean(document.body), null, { timeout: 30000 });
      await app.evaluate(() => {
        const button = document.createElement("button");
        button.id = "neo-spectrum-integration-test";
        button.textContent = "Test audio";
        button.style.cssText = "position:fixed;left:8px;top:8px;z-index:2147483647";
        button.addEventListener("click", () => {
          const Context = window.AudioContext || window.webkitAudioContext;
          const context = new Context();
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.frequency.value = 523.25;
          gain.gain.value = 0.1;
          oscillator.connect(gain);
          gain.connect(context.destination);
          oscillator.start();
          setTimeout(() => { oscillator.stop(); context.close(); }, 900);
        }, { once: true });
        document.body.appendChild(button);
      });
      await app.locator("#neo-spectrum-integration-test").click();
      await desktop.waitForFunction(() => window.__routeAudioEvents.some((detail) =>
        detail && detail.source === "route-audio:geometry-dash" && detail.active === true &&
        Array.isArray(detail.levels) && detail.levels.length === 32 && Math.max(...detail.levels) > 0.02
      ), null, { timeout: 8000 });
      await desktop.waitForFunction(() => {
        const state = window.NEO_BOTTOM_VISUALIZER.getState();
        return state.playing && state.measured && state.peak > 0.02;
      }, null, { timeout: 8000 });
      await desktop.waitForFunction(() => {
        const node = document.querySelector('.neo-skin[data-skin-type="equalizer"]');
        const levels = node ? [...node.querySelectorAll(".skin-bars i")].map((bar) => parseFloat(bar.style.getPropertyValue("--level")) || 0) : [];
        return Boolean(node && node.classList.contains("is-equalizer-playing") && Math.max(...levels) > 2);
      }, null, { timeout: 8000 });
      assert.deepEqual(liveErrors, []);
      await live.close();
    }
    console.log("All-audio equalizer browser checks passed.");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
