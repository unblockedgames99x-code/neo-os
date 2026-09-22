const assert = require("node:assert/strict");
const path = require("node:path");

function playwrightRuntime() {
  try { return require("playwright"); } catch (_error) {}
  return require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || "", ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules", "playwright"));
}

const { chromium } = playwrightRuntime();
const url = process.env.NEO_MINIMIZED_CARD_TEST_URL || "http://127.0.0.1:3092/neo-os/?test=minimized-card-fill-v1";
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
      window.NEO_SHELL.openApp("control");
      window.NEO_SHELL.openApp("stream");
      window.dispatchEvent(new CustomEvent("neo-media-state", {
        detail: {
          source: "test-minimized-fill",
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

    for (const id of ["stream", "control"]) {
      const appWindow = page.locator(`.neo-window[data-app-id="${id}"]`);
      await appWindow.waitFor({ state: "visible" });
      await appWindow.locator('[data-window-action="minimize"]').click();
    }

    await page.locator('.neo-minimized-card[data-minimized-app="control"]').waitFor({ state: "visible" });
    await page.waitForFunction(() => document.querySelector('.neo-minimized-card[data-minimized-app="stream"]')?.classList.contains("is-music-now-playing"));

    for (const style of ["modern", "retro", "windows11", "kali"]) {
      await page.evaluate((value) => { document.documentElement.dataset.interfaceStyle = value; }, style);
      const geometry = await page.locator('.neo-minimized-card[data-minimized-app="control"]').evaluate((card) => {
        const header = card.querySelector(".neo-minimized-card-header");
        const open = card.querySelector(".neo-minimized-card-open");
        const viewport = card.querySelector(".neo-minimized-card-viewport");
        const fallback = card.querySelector(".neo-taskbar-preview-fallback");
        const cardRect = card.getBoundingClientRect();
        const openRect = open.getBoundingClientRect();
        const viewportRect = viewport.getBoundingClientRect();
        const fallbackRect = fallback.getBoundingClientRect();
        const cardStyle = getComputedStyle(card);
        const openStyle = getComputedStyle(open);
        const fallbackSurface = getComputedStyle(fallback, "::before");
        return {
          card: { width: cardRect.width, height: cardRect.height },
          open: { left: openRect.left, right: openRect.right, bottom: openRect.bottom, width: openRect.width, height: openRect.height },
          viewport: { left: viewportRect.left, right: viewportRect.right, top: viewportRect.top, bottom: viewportRect.bottom },
          fallback: { left: fallbackRect.left, right: fallbackRect.right, top: fallbackRect.top, bottom: fallbackRect.bottom },
          cardEdges: {
            left: cardRect.left + parseFloat(cardStyle.borderLeftWidth),
            right: cardRect.right - parseFloat(cardStyle.borderRightWidth),
            bottom: cardRect.bottom - parseFloat(cardStyle.borderBottomWidth)
          },
          headerBottom: header.getBoundingClientRect().bottom,
          overflow: cardStyle.overflow,
          openRadii: [openStyle.borderTopLeftRadius, openStyle.borderTopRightRadius, openStyle.borderBottomRightRadius, openStyle.borderBottomLeftRadius],
          fallbackSurface: {
            inset: [fallbackSurface.top, fallbackSurface.right, fallbackSurface.bottom, fallbackSurface.left],
            radius: fallbackSurface.borderTopLeftRadius,
            border: fallbackSurface.borderTopWidth
          }
        };
      });

      const close = (left, right) => Math.abs(left - right) <= 0.6;
      assert.equal(geometry.overflow, "hidden", `${style}: outer card must clip its complete surface`);
      assert.ok(close(geometry.open.left, geometry.cardEdges.left) && close(geometry.open.right, geometry.cardEdges.right), `${style}: preview must fill the card width: ${JSON.stringify(geometry)}`);
      assert.ok(close(geometry.open.bottom, geometry.cardEdges.bottom), `${style}: preview must fill the card height: ${JSON.stringify(geometry)}`);
      assert.ok(close(geometry.open.left, geometry.viewport.left) && close(geometry.open.right, geometry.viewport.right), `${style}: viewport must fill the preview width`);
      assert.ok(close(geometry.headerBottom, geometry.viewport.top) && close(geometry.open.bottom, geometry.viewport.bottom), `${style}: header and viewport must meet without a gap`);
      assert.ok(close(geometry.viewport.left, geometry.fallback.left) && close(geometry.viewport.right, geometry.fallback.right) && close(geometry.viewport.top, geometry.fallback.top) && close(geometry.viewport.bottom, geometry.fallback.bottom), `${style}: app content must fill the viewport`);
      assert.deepEqual(geometry.openRadii, ["0px", "0px", "0px", "0px"], `${style}: nested preview corners must stay square`);
      assert.deepEqual(geometry.fallbackSurface.inset, ["0px", "0px", "0px", "0px"], `${style}: app surface must reach every viewport edge`);
      assert.equal(geometry.fallbackSurface.radius, "0px", `${style}: app surface must not add cut corners`);
      assert.equal(geometry.fallbackSurface.border, "0px", `${style}: app surface must not add an inset border`);
      assert.ok(geometry.open.height > 120, `${style}: regular preview should expand beside a square media card`);
    }

    if (process.env.NEO_MINIMIZED_CARD_SCREENSHOT) await page.screenshot({ path: process.env.NEO_MINIMIZED_CARD_SCREENSHOT, fullPage: true });
    console.log("Minimized app content fills its card in every interface style.");
  } finally {
    await context.close();
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
