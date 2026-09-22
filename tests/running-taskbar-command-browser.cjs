const assert = require("node:assert/strict");
const path = require("node:path");

function playwrightRuntime() {
  try { return require("playwright"); } catch (_error) {}
  return require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || "", ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules", "playwright"));
}

const { chromium } = playwrightRuntime();
const url = process.env.NEO_RUNNING_TASKBAR_URL || "http://127.0.0.1:3092/neo-os/?test=running-taskbar-command-v1";

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  try {
    await page.addInitScript(() => {
      sessionStorage.setItem("neo_os_guest_session_v1", "1");
      sessionStorage.setItem("neo_os_booted_session", "1");
      localStorage.setItem("neo_os_pinned_apps_v1", "[]");
      localStorage.setItem("neo_os_geometry_dash_app_v1", "1");
      localStorage.removeItem("neo_os_running_taskbar_order_v1");
    });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForFunction(() => window.NEO_SHELL && document.documentElement.dataset.boot === "complete", null, { timeout: 30000 });
    const start = page.locator("#neo-start-screen");
    if (await start.isVisible()) {
      await start.locator('[data-start-mode="laptop"]').click();
      await start.waitFor({ state: "hidden" });
    }
    const guest = page.locator("[data-neo-login-guest]");
    if (await guest.isVisible()) await guest.click();

    assert.equal(await page.locator("#neo-dock .dock-button:not(.is-leaving)").count(), 0, "taskbar must begin with no app tiles");
    assert.ok((await page.locator(".taskbar").boundingBox()).width <= 80, "an empty vertical taskbar should stay compact");

    await page.keyboard.press("Control+K");
    await page.locator(".neo-command-layer.is-open").waitFor({ state: "visible" });
    assert.equal(await page.locator(".taskbar-start-button").getAttribute("aria-expanded"), "false", "Ctrl+K must not also open Applications");
    assert.ok(await page.locator(".neo-command-result").count() >= 8, "palette should list installed apps");
    await page.locator(".neo-command-search input").fill("games");
    await page.keyboard.press("Enter");
    await page.locator('.neo-window[data-app-id="games"]').waitFor({ state: "visible", timeout: 30000 });

    const gamesTile = page.locator('#neo-dock .dock-button[data-app="games"]');
    await gamesTile.waitFor({ state: "visible" });
    assert.equal(await page.locator("html").getAttribute("data-taskbar-app-names"), "false", "app names should be off by default");
    assert.ok((await page.locator(".taskbar").boundingBox()).width <= 80, "the default icon-only vertical taskbar should stay compact");
    assert.ok((await gamesTile.boundingBox()).width <= 50, "default taskbar buttons should be icon-only");
    assert.equal((await gamesTile.locator(".dock-app-name").textContent()).trim(), "Steam");
    assert.equal(await gamesTile.getAttribute("draggable"), "true");

    await page.evaluate(() => window.NEO_SHELL.openApp("control"));
    const settingsWindow = page.locator('.neo-window[data-app-id="control"]');
    await settingsWindow.waitFor({ state: "visible" });
    const appNamesToggle = settingsWindow.locator('[data-setting="taskbarAppNames"]');
    await appNamesToggle.waitFor({ state: "visible" });
    assert.equal(await appNamesToggle.isChecked(), false, "the Show app names setting should be off by default");
    const settingsGeometry = await settingsWindow.evaluate((win) => {
      const controlElement = win.querySelector('.control-center');
      const control = controlElement.getBoundingClientRect();
      const panel = win.querySelector('.taskbar-settings-only').getBoundingClientRect();
      return {
        control: { left: control.left, width: control.width },
        panel: { left: panel.left, width: panel.width }
      };
    });
    const settingsCenterDelta = Math.abs(
      (settingsGeometry.control.left + settingsGeometry.control.width / 2)
      - (settingsGeometry.panel.left + settingsGeometry.panel.width / 2)
    );
    assert.ok(settingsCenterDelta <= 5, `the Taskbar options panel should be centered in System Settings (delta ${settingsCenterDelta}px)`);
    await settingsWindow.locator('.taskbar-app-names-toggle').click();
    await page.waitForFunction(() => document.documentElement.dataset.taskbarAppNames === "true");
    assert.ok((await page.locator(".taskbar").boundingBox()).width >= 120, "enabling app names should expand the vertical taskbar");
    assert.ok((await gamesTile.boundingBox()).width > (await gamesTile.boundingBox()).height, "enabled names should restore the named tile layout");
    await settingsWindow.locator('[data-window-action="close"]').click();
    await settingsWindow.waitFor({ state: "detached" });

    await page.evaluate(() => window.NEO_SHELL.openApp("movies"));
    const moviesTile = page.locator('#neo-dock .dock-button[data-app="movies"]');
    await moviesTile.waitFor({ state: "visible" });
    assert.deepEqual(await page.locator("#neo-dock .dock-button:not(.is-leaving)").evaluateAll((buttons) => buttons.map((button) => button.dataset.app)), ["games", "movies"]);

    await page.waitForFunction(() => {
      const frame = document.querySelector('.neo-window[data-app-id="movies"] iframe');
      return frame?.contentDocument?.documentElement?.dataset.neoCommandShortcutBound === "true";
    });
    await page.evaluate(() => {
      const frame = document.querySelector('.neo-window[data-app-id="movies"] iframe');
      frame.contentDocument.dispatchEvent(new frame.contentWindow.KeyboardEvent("keydown", {
        key: "k", code: "KeyK", ctrlKey: true, bubbles: true, cancelable: true
      }));
    });
    await page.locator(".neo-command-layer.is-open").waitFor({ state: "visible" });
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector(".neo-command-layer")?.classList.contains("is-open"));
    await page.waitForTimeout(220);

    await gamesTile.hover();
    const hoverClose = page.locator(".neo-taskbar-preview.is-open.is-close-only");
    await hoverClose.waitFor({ state: "visible", timeout: 3000 });
    const hoverCloseGeometry = await hoverClose.boundingBox();
    assert.ok(hoverCloseGeometry.width <= 42 && hoverCloseGeometry.height <= 42, "taskbar hover must show only the compact close control");
    assert.equal(await hoverClose.locator(".neo-taskbar-preview-open").evaluate((node) => getComputedStyle(node).display), "none");
    assert.equal(await hoverClose.locator("[data-taskbar-preview-close]").getAttribute("aria-label"), "Close Games");
    if (process.env.NEO_RUNNING_PREVIEW_SCREENSHOT) {
      await page.waitForTimeout(260);
      await page.screenshot({ path: process.env.NEO_RUNNING_PREVIEW_SCREENSHOT, fullPage: true });
    }

    await page.evaluate(() => {
      const games = document.querySelector('#neo-dock .dock-button[data-app="games"]');
      const movies = document.querySelector('#neo-dock .dock-button[data-app="movies"]');
      const transfer = new DataTransfer();
      games.dispatchEvent(new DragEvent("dragstart", { bubbles: true, cancelable: true, dataTransfer: transfer }));
      const rect = movies.getBoundingClientRect();
      movies.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: transfer, clientX: rect.right - 2, clientY: rect.bottom - 2 }));
      movies.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: transfer, clientX: rect.right - 2, clientY: rect.bottom - 2 }));
      games.dispatchEvent(new DragEvent("dragend", { bubbles: true, dataTransfer: transfer }));
    });
    await page.waitForFunction(() => document.querySelector("#neo-dock .dock-button:not(.is-leaving)")?.dataset.app === "movies");
    assert.deepEqual(JSON.parse(await page.evaluate(() => localStorage.getItem("neo_os_running_taskbar_order_v1"))), ["movies", "games"]);

    await page.evaluate(() => window.NEO_SHELL.setSetting("taskbarAppDragging", false));
    assert.equal(await moviesTile.getAttribute("draggable"), "false");

    await page.evaluate(() => window.NEO_SHELL.setSetting("taskbarRunningApps", false));
    await page.waitForTimeout(260);
    assert.equal(await page.locator("#neo-dock .dock-button").count(), 0, "the separate setting must hide running-app buttons");
    assert.equal(await page.locator("html").getAttribute("data-taskbar-running-apps"), "false");
    assert.ok((await page.locator(".taskbar").boundingBox()).width <= 80, "disabling running-app buttons should restore the compact taskbar");
    await page.keyboard.press("Control+K");
    await page.locator(".neo-command-layer.is-open").waitFor({ state: "visible" });
    await page.locator(".neo-command-search input").fill("movies");
    assert.match((await page.locator(".neo-command-result").first().textContent()).trim(), /Switch to Movies/, "commands must still detect an open app when its taskbar button is hidden");
    await page.keyboard.press("Escape");
    await page.evaluate(() => window.NEO_SHELL.setSetting("taskbarRunningApps", true));
    await page.locator('#neo-dock .dock-button[data-app="movies"]').waitFor({ state: "visible" });
    assert.equal(await page.locator('#neo-dock .dock-button[data-app="movies"]').getAttribute("draggable"), "false", "dragging must remain a separate setting");

    await page.evaluate(() => document.querySelector('.neo-window[data-app-id="games"] [data-window-action="close"]')?.click());
    await page.waitForFunction(() => !document.querySelector('#neo-dock .dock-button[data-app="games"]'));
    assert.equal(await page.locator('#neo-dock .dock-button[data-app="games"]').count(), 0, "closing an app must remove its tile");
    assert.equal(await page.locator('#neo-dock .dock-button[data-app="movies"]').count(), 1, "other running apps must remain");

    for (const position of ["left", "right", "top", "bottom"]) {
      await page.evaluate((next) => window.NEO_SHELL.setSetting("taskbarPosition", next), position);
      await page.waitForFunction((next) => document.documentElement.dataset.taskbarPosition === next, position);
      const geometry = await page.evaluate(() => {
        const taskbar = document.querySelector(".taskbar").getBoundingClientRect();
        const tile = document.querySelector('#neo-dock .dock-button[data-app="movies"]').getBoundingClientRect();
        return { taskbar: { width: taskbar.width, height: taskbar.height }, tile: { width: tile.width, height: tile.height } };
      });
      assert.ok(geometry.tile.width > geometry.tile.height, `${position} running tile should retain its named rectangle`);
      if (position === "left" || position === "right") assert.ok(geometry.taskbar.width >= 120, `${position} taskbar should fit the named tile`);
    }
    await page.evaluate(() => {
      window.NEO_SHELL.setSetting("taskbarPosition", "left");
      window.NEO_SHELL.setSetting("taskbarStyle", "typical");
      window.NEO_SHELL.setSetting("taskbarSurface", "gradient");
    });
    await page.waitForTimeout(100);
    assert.ok((await page.locator(".taskbar").boundingBox()).width >= 120, "typical vertical taskbar should fit the named tile");
    assert.match(await moviesTile.evaluate((tile) => getComputedStyle(tile).backgroundImage), /linear-gradient/i, "running tiles should react to gradient taskbar themes");
    await page.evaluate(() => {
      window.NEO_SHELL.setSetting("taskbarStyle", "current");
      window.NEO_SHELL.setSetting("taskbarSurface", "glass");
    });
    await page.waitForTimeout(100);
    const glassTileAlpha = await moviesTile.evaluate((tile) => {
      const color = getComputedStyle(tile).backgroundColor;
      const match = color.match(/^rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)$/i);
      return match ? Number(match[1]) : color === "transparent" ? 0 : 1;
    });
    assert.ok(glassTileAlpha > 0 && glassTileAlpha <= 0.22, `glass running tiles should stay semi-transparent (alpha ${glassTileAlpha})`);

    await page.keyboard.press("Control+K");
    await page.locator(".neo-command-layer.is-open").waitFor({ state: "visible" });
    if (process.env.NEO_RUNNING_TASKBAR_SCREENSHOT) {
      await page.waitForTimeout(260);
      await page.screenshot({ path: process.env.NEO_RUNNING_TASKBAR_SCREENSHOT, fullPage: true });
    }
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector(".neo-command-layer")?.classList.contains("is-open"));
    assert.deepEqual(pageErrors, [], "taskbar and command flow should not throw page errors");
    console.log("Running-app taskbar, preview, drag setting, and Ctrl+K command palette browser flow passed.");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
