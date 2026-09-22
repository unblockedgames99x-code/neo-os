const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require(process.env.NEO_PLAYWRIGHT_PATH || path.join(
  process.env.USERPROFILE || "", ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules", "playwright"
));
const launchUrl = process.env.NEO_CDN_LAUNCH_URL;
if (!launchUrl) throw new Error("NEO_CDN_LAUNCH_URL is required");

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await page.addInitScript(() => {
      sessionStorage.setItem("neo_os_guest_session_v1", "1");
      sessionStorage.setItem("neo_os_booted_session", "1");
      localStorage.setItem("neo_os_pinned_apps_v1", "[]");
    });
    await page.goto(launchUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForFunction(() => {
      const frame = document.querySelector("#neo-os");
      return frame?.contentWindow?.NEO_SHELL && frame.contentDocument?.documentElement.dataset.boot === "complete";
    }, null, { timeout: 60000 });
    await page.evaluate(() => document.querySelector("#neo-os").contentWindow.NEO_SHELL.openApp("control"));
    await page.waitForFunction(() => document.querySelector("#neo-os")?.contentDocument?.querySelector('.neo-window[data-app-id="control"]'));
    await page.evaluate(() => {
      const frame = document.querySelector("#neo-os");
      const doc = frame.contentDocument;
      const input = doc.querySelector('.neo-window[data-app-id="control"] [data-settings-search] input');
      input.value = "animation speed";
      input.dispatchEvent(new frame.contentWindow.Event("input", { bubbles: true }));
      const button = doc.querySelector('#neo-dock .dock-button[data-app="control"]');
      button.dispatchEvent(new frame.contentWindow.FocusEvent("focusin", { bubbles: true }));
    });
    await page.waitForFunction(() => document.querySelector("#neo-os")?.contentDocument?.querySelector(".neo-taskbar-preview.is-open .neo-taskbar-preview-snapshot"), null, { timeout: 5000 });
    const state = await page.evaluate(() => {
      const doc = document.querySelector("#neo-os").contentDocument;
      const preview = doc.querySelector(".neo-taskbar-preview.is-open");
      const snapshot = preview.querySelector(".neo-taskbar-preview-snapshot");
      const rect = preview.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
        type: preview.querySelector("[data-taskbar-preview-viewport]").dataset.previewType,
        text: snapshot.contentDocument?.body?.innerText || snapshot.srcdoc,
      };
    });
    assert.ok(state.width >= 250 && state.height >= 150, JSON.stringify(state));
    assert.equal(state.type, "current-state");
    assert.match(state.text, /Settings/);
    assert.match(state.text, /animation speed/i);
    console.log("Published CDN launcher shows the current app state in taskbar hover previews.");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
