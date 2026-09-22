const assert = require("node:assert/strict");
const path = require("node:path");
function playwrightRuntime() {
  try { return require("playwright"); } catch (_error) {}
  return require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || "", ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules", "playwright"));
}
const { chromium } = playwrightRuntime();

const url = process.env.NEO_TASKBAR_TEST_URL || "http://127.0.0.1:3092/neo-os/?test=taskbar-options-browser-v1";
const positions = ["top", "right", "bottom", "left"];
const styles = ["current", "transparent", "typical"];

async function run() {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });

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

    await page.evaluate(() => window.NEO_SHELL.openApp("control"));
    const settingsWindow = page.locator('.neo-window[data-app-id="control"]');
    await settingsWindow.locator('[data-taskbar-position-option="top"]').click();
    await settingsWindow.locator('[data-taskbar-style-option="transparent"]').click();
    await settingsWindow.locator('[data-taskbar-tint-preset="#000000"]').click();
    await settingsWindow.locator('[data-setting="taskbarOutline"]').evaluate((input) => {
      input.checked = false;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await settingsWindow.locator('[data-setting="taskbarTransparency"]').evaluate((input) => {
      input.value = "76";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await page.waitForFunction(() => (
      window.NEO_SHELL.getSetting("taskbarPosition") === "top"
      && window.NEO_SHELL.getSetting("taskbarStyle") === "transparent"
      && window.NEO_SHELL.getSetting("taskbarTint") === "#000000"
      && window.NEO_SHELL.getSetting("taskbarTransparency") === 76
      && window.NEO_SHELL.getSetting("taskbarOutline") === false
    ));

    const topEdgeLayout = await page.evaluate(() => {
      const taskbar = document.querySelector(".taskbar").getBoundingClientRect();
      const workspace = document.querySelector(".window-layer").getBoundingClientRect();
      return {
        taskbarTop: taskbar.top,
        taskbarBottom: taskbar.bottom,
        workspaceTop: workspace.top,
        autoHide: document.documentElement.classList.contains("neo-auto-hide-bars")
      };
    });
    assert.equal(topEdgeLayout.autoHide, true);
    assert.ok(topEdgeLayout.taskbarTop <= 16, `Top taskbar must not retain the hidden status-strip gap: ${JSON.stringify(topEdgeLayout)}`);
    assert.ok(Math.abs(topEdgeLayout.workspaceTop - topEdgeLayout.taskbarBottom) <= 2, `Workspace must begin directly below the top taskbar: ${JSON.stringify(topEdgeLayout)}`);

    await page.evaluate(() => window.NEO_SHELL.setSetting("windowBarStyle", "pill"));
    await page.waitForFunction(() => document.documentElement.dataset.windowBarStyle === "pill");
    await page.waitForTimeout(260);
    const pillPlacement = await settingsWindow.evaluate((windowElement) => {
      const windowRect = windowElement.getBoundingClientRect();
      const bar = windowElement.querySelector(".window-chrome");
      const barRect = bar.getBoundingClientRect();
      const style = getComputedStyle(bar);
      return { windowTop: windowRect.top, barCenter: barRect.top + barRect.height / 2, position: style.position, top: style.top, transform: style.transform, rootClass: document.documentElement.className };
    });
    assert.ok(Math.abs(pillPlacement.windowTop - pillPlacement.barCenter) <= 2, `Floating app bar must stay centered on the top window edge: ${JSON.stringify(pillPlacement)}`);
    await page.evaluate(() => window.NEO_SHELL.setSetting("windowBarStyle", "current"));

    for (const position of positions) {
      for (const style of styles) {
        await page.evaluate(({ position, style }) => {
          window.NEO_SHELL.setSetting("taskbarPosition", position);
          window.NEO_SHELL.setSetting("taskbarStyle", style);
        }, { position, style });
        await page.waitForFunction(({ position, style }) => {
          const root = document.documentElement;
          return root.dataset.taskbarPosition === position && root.dataset.taskbarStyle === style;
        }, { position, style });
        await page.waitForTimeout(220);

        const state = await page.locator(".taskbar").evaluate((taskbar) => {
          const rect = taskbar.getBoundingClientRect();
          const dock = taskbar.querySelector(".dock");
          return {
            rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
            direction: dock ? getComputedStyle(dock).flexDirection : "",
            background: getComputedStyle(taskbar).backgroundColor,
            radius: getComputedStyle(taskbar).borderRadius,
            viewport: { width: innerWidth, height: innerHeight }
          };
        });

        const { rect, viewport } = state;
        assert.ok(rect.left >= -1 && rect.top >= -1 && rect.right <= viewport.width + 1 && rect.bottom <= viewport.height + 1, `${position}/${style} must stay on screen`);
        if (position === "left" || position === "right") {
          assert.equal(state.direction, "column", `${position}/${style} must use a vertical dock`);
          assert.ok(rect.height > rect.width, `${position}/${style} must remain a vertical rail`);
        } else {
          assert.equal(state.direction, "row", `${position}/${style} must use a horizontal dock`);
          assert.ok(rect.width > rect.height, `${position}/${style} must remain a horizontal bar`);
        }
        if (style === "transparent") assert.match(state.background, /rgba\([^)]*,\s*0\)/);
        if (style === "typical") assert.equal(state.radius, "0px");
      }
    }

    await page.evaluate(() => {
      window.NEO_SHELL.setSetting("taskbarStyle", "current");
      window.NEO_SHELL.setSetting("taskbarSurface", "glass");
      window.NEO_SHELL.setSetting("taskbarTransparency", 20);
    });
    const lowTransparencyAlpha = await page.locator(".taskbar").evaluate((taskbar) => Number(getComputedStyle(taskbar).backgroundColor.match(/[\d.]+(?=\))/)?.[0] || 0));
    await page.evaluate(() => window.NEO_SHELL.setSetting("taskbarTransparency", 86));
    const highTransparencyAlpha = await page.locator(".taskbar").evaluate((taskbar) => Number(getComputedStyle(taskbar).backgroundColor.match(/[\d.]+(?=\))/)?.[0] || 0));
    assert.ok(highTransparencyAlpha < lowTransparencyAlpha, `Increasing transparency must reduce taskbar alpha: ${lowTransparencyAlpha} -> ${highTransparencyAlpha}`);

    await page.evaluate(() => {
      window.NEO_SHELL.setSetting("taskbarPosition", "right");
      window.NEO_SHELL.setSetting("taskbarStyle", "typical");
      window.NEO_SHELL.setSetting("taskbarTint", "#e8e8e8");
      window.NEO_SHELL.setSetting("taskbarTransparency", 28);
      window.NEO_SHELL.setSetting("taskbarOutline", false);
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.NEO_SHELL && document.documentElement.dataset.boot === "complete", null, { timeout: 20000 });
    const persisted = await page.evaluate(() => ({
      position: window.NEO_SHELL.getSetting("taskbarPosition"),
      style: window.NEO_SHELL.getSetting("taskbarStyle"),
      tint: window.NEO_SHELL.getSetting("taskbarTint"),
      transparency: window.NEO_SHELL.getSetting("taskbarTransparency"),
      outline: window.NEO_SHELL.getSetting("taskbarOutline"),
      tone: document.documentElement.dataset.taskbarTone
    }));
    assert.deepEqual(persisted, { position: "right", style: "typical", tint: "#e8e8e8", transparency: 28, outline: false, tone: "light" });
  } finally {
    await browser.close();
  }
}

run().then(() => {
  console.log("Taskbar browser matrix passed (12 combinations plus persistence).");
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
