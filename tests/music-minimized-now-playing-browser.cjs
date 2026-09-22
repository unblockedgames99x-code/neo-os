const assert = require("node:assert/strict");
const path = require("node:path");

function playwrightRuntime() {
  try { return require("playwright"); } catch (_error) {}
  return require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || "", ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules", "playwright"));
}

const { chromium } = playwrightRuntime();
const url = process.env.NEO_MUSIC_MINIMIZED_TEST_URL || "http://127.0.0.1:3092/neo-os/?test=music-minimized-now-playing-v1";
const cover = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true
  });
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.NEO_SHELL && document.documentElement.dataset.boot === "complete", null, { timeout: 20000 });
    const start = page.locator("#neo-start-screen");
    if (await start.isVisible()) await start.locator('[data-start-mode="laptop"]').click();
    const guest = page.locator("[data-neo-login-guest]");
    if (await guest.isVisible()) await guest.click();
    await page.waitForFunction(() => document.getElementById("neo-login-gate")?.hidden && !document.getElementById("neo-desktop")?.inert);

    await page.evaluate(({ cover }) => {
      window.__minimizedMusicActions = [];
      window.addEventListener("neo-media-transport-request", (event) => {
        window.__minimizedMusicActions.push(event.detail && event.detail.action);
      });
      window.NEO_SHELL.openApp("stream");
      window.dispatchEvent(new CustomEvent("neo-media-state", {
        detail: {
          source: "test-minimized-music",
          appId: "stream",
          active: true,
          playing: true,
          kind: "audio",
          title: "Test Song",
          subtitle: "Test Artist",
          cover,
          transport: true
        }
      }));
    }, { cover });

    const musicWindow = page.locator('.neo-window[data-app-id="stream"]');
    await musicWindow.waitFor({ state: "visible" });
    await musicWindow.locator('[data-window-action="minimize"]').click();

    const card = page.locator('.neo-minimized-card[data-minimized-app="stream"]');
    await card.waitFor({ state: "visible" });
    await page.waitForFunction(() => {
      const image = document.querySelector('.neo-minimized-card[data-minimized-app="stream"] .neo-minimized-now-playing-cover');
      return image && !image.hidden && image.complete;
    });

    const state = await card.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      const header = node.querySelector(".neo-minimized-card-header");
      const controls = node.querySelector(".neo-minimized-media-controls");
      const image = node.querySelector(".neo-minimized-now-playing-cover");
      return {
        nowPlaying: node.classList.contains("is-music-now-playing"),
        width: rect.width,
        height: rect.height,
        headerDisplay: getComputedStyle(header).display,
        controlsDisplay: getComputedStyle(controls).display,
        controlCount: controls.querySelectorAll("button").length,
        imageVisible: !image.hidden,
        coverSource: image.src,
        text: node.innerText
      };
    });
    assert.equal(state.nowPlaying, true);
    assert.ok(Math.abs(state.width - state.height) <= 1, `Music cover card must be square: ${JSON.stringify(state)}`);
    assert.equal(state.headerDisplay, "none");
    assert.notEqual(state.controlsDisplay, "none");
    assert.equal(state.controlCount, 3);
    assert.equal(state.imageVisible, true);
    assert.equal(state.coverSource, cover);
    assert.equal(state.text.trim(), "", "The compact card should show only artwork and icon controls");

    await page.evaluate(() => { document.documentElement.dataset.fullscreen = "true"; });
    await page.waitForFunction(() => {
      const tray = document.querySelector(".neo-minimized-tray");
      const card = document.querySelector('.neo-minimized-card[data-minimized-app="stream"]');
      return tray && card && !tray.hidden && getComputedStyle(tray).display !== "none" && getComputedStyle(card).display !== "none";
    });
    const fullscreenState = await page.locator(".neo-minimized-tray").evaluate((tray) => ({
      display: getComputedStyle(tray).display,
      pointerEvents: getComputedStyle(tray).pointerEvents,
      zIndex: Number(getComputedStyle(tray).zIndex)
    }));
    assert.notEqual(fullscreenState.display, "none");
    assert.notEqual(fullscreenState.pointerEvents, "none");
    assert.ok(fullscreenState.zIndex >= 9100, `Minimized cards must stay above fullscreen apps: ${JSON.stringify(fullscreenState)}`);
    await page.evaluate(() => { delete document.documentElement.dataset.fullscreen; });

    if (process.env.NEO_MUSIC_MINIMIZED_SCREENSHOT) {
      await page.screenshot({ path: process.env.NEO_MUSIC_MINIMIZED_SCREENSHOT, fullPage: true });
    }

    const toggle = card.locator('[data-minimized-media-action="toggle"]');
    assert.equal(await toggle.getAttribute("aria-label"), "Pause");
    await toggle.click();
    assert.deepEqual(await page.evaluate(() => window.__minimizedMusicActions), ["toggle"]);

    await page.evaluate(({ cover }) => {
      window.dispatchEvent(new CustomEvent("neo-media-state", {
        detail: {
          source: "test-minimized-music",
          appId: "stream",
          active: true,
          playing: false,
          kind: "audio",
          title: "Test Song",
          subtitle: "Test Artist",
          cover,
          transport: true
        }
      }));
    }, { cover });
    await page.waitForFunction(() => document.querySelector('[data-minimized-media-action="toggle"]')?.getAttribute("aria-label") === "Play");

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("neo-media-state", {
        detail: { source: "test-minimized-music", appId: "stream", active: false, playing: false }
      }));
    });
    await page.waitForFunction(() => !document.querySelector('.neo-minimized-card[data-minimized-app="stream"]')?.classList.contains("is-music-now-playing"));
    assert.notEqual(await card.locator(".neo-minimized-card-header").evaluate((node) => getComputedStyle(node).display), "none");

    console.log("Minimized NEO Music renders cover-only artwork with working media controls.");
  } finally {
    await context.close();
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
