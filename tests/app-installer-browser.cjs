const assert = require("node:assert/strict");
const path = require("node:path");

function playwrightRuntime() {
  try { return require("playwright"); } catch (_error) {}
  return require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || "", ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules", "playwright"));
}

const { chromium } = playwrightRuntime();
const url = process.env.NEO_APP_INSTALLER_TEST_URL || "http://127.0.0.1:3092/neo-os/?test=app-installer-v1";

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });

  async function getDesktop() {
    await page.waitForFunction(() => window.NEO_SHELL || document.getElementById("neo-os")?.contentWindow?.NEO_SHELL, null, { timeout: 60000 });
    const outerFrame = await page.$("#neo-os");
    const desktop = outerFrame
      ? (await outerFrame.contentFrame()) || page.frames().find(frame => frame.parentFrame() === page.mainFrame())
      : page;
    assert.ok(desktop, "NEO desktop frame did not initialize");
    await desktop.waitForFunction(() => window.NEO_SHELL && document.documentElement.dataset.boot === "complete", null, { timeout: 30000 });
    const start = desktop.locator("#neo-start-screen");
    if (await start.isVisible()) {
      await start.locator('[data-start-mode="laptop"]').click();
      await start.waitFor({ state: "hidden" });
    }
    const guest = desktop.locator("[data-neo-login-guest]");
    if (await guest.isVisible()) await guest.click();
    return desktop;
  }

  try {
    await page.addInitScript(() => {
      if (sessionStorage.getItem("neo_app_installer_test_setup") !== "1") {
        localStorage.removeItem("neo_os_custom_apps_v1");
        localStorage.removeItem("neo_os_desktop_shortcut_hidden_v1");
        localStorage.setItem("neo_os_desktop_shortcuts_all_hidden_v1", "false");
        sessionStorage.setItem("neo_app_installer_test_setup", "1");
      }
      sessionStorage.setItem("neo_os_guest_session_v1", "1");
    });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
    let desktop = await getDesktop();

    const builtIns = await desktop.evaluate(() => window.NEO_SHELL.getApps().map(app => app.id));
    assert.ok(builtIns.includes("app-installer"), "App Installer is not installed");
    assert.ok(builtIns.includes("notes"), "Notes/Notepad is missing");
    assert.ok(!builtIns.includes("anime"), "Retired Anime app is still registered");
    assert.ok(!builtIns.includes("manga"), "Retired Manga app is still registered");

    await desktop.evaluate(() => window.NEO_SHELL.openApp("app-installer"));
    let installer = desktop.locator('.neo-window[data-app-id="app-installer"]');
    await installer.locator("[data-installer-form]").waitFor({ state: "visible" });
    assert.equal(await installer.locator("[data-installer-mode]").count(), 0, "Direct iframe mode is still visible");
    const forcedRelay = await desktop.evaluate(() => {
      const app = window.NEO_SHELL.installCustomApp({ title: "Forced relay", url: "https://example.net/", mode: "direct" });
      window.NEO_SHELL.removeCustomApp(app.id);
      return app;
    });
    assert.equal(forcedRelay.launchMode, "relay", "A caller could still force a direct installed website");
    await installer.locator("[data-installer-name]").fill("Example Portal");
    await installer.locator("[data-installer-url]").fill("example.com/dashboard");
    await installer.locator("[data-installer-icon]").fill("https://example.com/favicon.ico");
    await installer.locator("[data-installer-form]").evaluate(form => form.requestSubmit());
    await installer.locator("[data-installer-status]").filter({ hasText: "installed" }).waitFor();

    const installed = await desktop.evaluate(() => {
      const app = window.NEO_SHELL.getCustomApps()[0];
      return {
        app,
        saved: JSON.parse(localStorage.getItem("neo_os_custom_apps_v1") || "[]"),
        shortcut: app ? document.querySelectorAll('[data-desktop-shortcut="' + app.id + '"]').length : 0
      };
    });
    assert.equal(installed.app.title, "Example Portal");
    assert.equal(installed.app.sourceUrl, "https://example.com/dashboard");
    assert.equal(installed.app.launchMode, "relay");
    assert.equal(installed.saved.length, 1);
    assert.equal(installed.shortcut, 0, "Installed websites should stay out of the home-page shortcut grid");

    const customWindow = desktop.locator('.neo-window[data-app-id="' + installed.app.id + '"]');
    await customWindow.waitFor({ state: "visible" });
    const frameUrl = await customWindow.locator("iframe").evaluate(frame => frame.getAttribute("src") || frame.dataset.route || "");
    assert.match(frameUrl || "", /neo-app-mode=1/);
    assert.match(frameUrl || "", /neo-app-target=https%3A%2F%2Fexample\.com%2Fdashboard/);

    await page.reload({ waitUntil: "domcontentloaded", timeout: 120000 });
    desktop = await getDesktop();
    const restored = await desktop.evaluate(id => window.NEO_SHELL.getCustomApps().some(app => app.id === id), installed.app.id);
    assert.equal(restored, true, "Installed app did not survive reload");

    await desktop.evaluate(() => window.NEO_SHELL.openApp("app-installer"));
    installer = desktop.locator('.neo-window[data-app-id="app-installer"]');
    await installer.locator('[data-custom-app-id="' + installed.app.id + '"]').waitFor({ state: "visible" });
    await installer.locator('[data-custom-app-id="' + installed.app.id + '"] [data-custom-app-remove]').click();
    const removed = await desktop.evaluate(id => ({
      present: window.NEO_SHELL.getApps().some(app => app.id === id),
      saved: JSON.parse(localStorage.getItem("neo_os_custom_apps_v1") || "[]")
    }), installed.app.id);
    assert.equal(removed.present, false);
    assert.equal(removed.saved.length, 0);
  } finally {
    await browser.close();
  }

  console.log("App Installer installs, opens, restores, and removes a relay-backed web app.");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
