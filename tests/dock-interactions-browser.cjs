const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE, ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright")
);

const url = process.env.NEO_DOCK_TEST_URL || "http://127.0.0.1:3092/neo-os/";

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await page.addInitScript(() => {
      sessionStorage.setItem("neo_os_guest_session_v1", "1");
      localStorage.setItem("neo_os_desktop_shortcuts_all_hidden_v1", "false");
    });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForFunction(() => {
      const frame = document.getElementById("neo-os");
      const doc = frame?.contentDocument || document;
      return Boolean(doc.defaultView?.NEO_SHELL && doc.getElementById("launcher-grid"));
    }, null, { timeout: 180000 });

    const state = await page.evaluate(() => {
      const frame = document.getElementById("neo-os");
      const doc = frame?.contentDocument || document;
      const view = doc.defaultView;
      const menu = doc.getElementById("desktop-context-menu");
      return {
        desktopLayer: Boolean(doc.getElementById("desktop-shortcuts")),
        desktopShortcutCount: doc.querySelectorAll(".desktop-shortcut,[data-desktop-shortcut]").length,
        hasToggle: Boolean(menu?.querySelector('[data-desktop-action="toggle-icons"], [data-desktop-icons-label]')),
        hasRestore: Boolean(menu?.querySelector("[data-restore-desktop-shortcuts]")),
        launcherAppCount: doc.querySelectorAll("#launcher-grid [data-app]").length,
        availableAppCount: view.NEO_SHELL.getApps().length,
        dockButtonCount: doc.querySelectorAll("#neo-dock .dock-button[data-app]").length,
      };
    });

    assert.equal(state.desktopLayer, false, "desktop shortcut layer should not exist");
    assert.equal(state.desktopShortcutCount, 0, "desktop shortcuts should not render even with the old preference enabled");
    assert.equal(state.hasToggle, false, "desktop menu should not offer a shortcut toggle");
    assert.equal(state.hasRestore, false, "desktop menu should not offer shortcut restoration");
    assert.ok(state.availableAppCount > 2, "apps should remain installed");
    assert.ok(state.launcherAppCount > 2, "apps should remain available in Applications");
    assert.equal(state.dockButtonCount, 0, "the taskbar app strip should be empty before an app opens");
    await page.evaluate(() => {
      const frame = document.getElementById("neo-os");
      (frame?.contentWindow || window).NEO_SHELL.openApp("control");
    });
    await page.waitForFunction(() => {
      const frame = document.getElementById("neo-os");
      const doc = frame?.contentDocument || document;
      return doc.querySelectorAll("#neo-dock .dock-button[data-app]:not(.is-leaving)").length === 1;
    });
    console.log("Desktop shortcuts stay off the home page; the first running app creates the first taskbar tile.");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
