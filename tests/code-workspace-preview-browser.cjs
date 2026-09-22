const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE, ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright")
);

const url = process.env.NEO_PREVIEW_TEST_URL || "http://127.0.0.1:3092/neo-os/";
const previewHtml = `<!doctype html><html><body><output id="network-result">checking</output><script>
fetch("https://neo-stratus-api-w6nw.onrender.com/health", { cache: "no-store" })
  .then(function (response) { document.getElementById("network-result").textContent = "network:" + response.status; })
  .catch(function (error) { document.getElementById("network-result").textContent = "error:" + error.message; });
<\/script></body></html>`;

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await page.addInitScript((html) => {
      sessionStorage.setItem("neo_os_guest_session_v1", "1");
      localStorage.setItem("neo_desktop_workspace_v1", JSON.stringify({ "network-preview.html": html }));
    }, previewHtml);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForFunction(() => {
      const frame = document.getElementById("neo-os");
      const doc = frame?.contentDocument || document;
      return Boolean(doc.defaultView?.NEO_SHELL);
    }, null, { timeout: 180000 });
    await page.evaluate(() => {
      const frame = document.getElementById("neo-os");
      const view = frame?.contentDocument?.defaultView || window;
      view.NEO_SHELL.openApp("vscode");
    });
    await page.waitForFunction(() => {
      const frame = document.getElementById("neo-os");
      const doc = frame?.contentDocument || document;
      return Array.from(doc.querySelectorAll(".editor-toolbar button")).some((button) => button.textContent.trim() === "Preview HTML");
    }, null, { timeout: 30000 });
    await page.evaluate(() => {
      const frame = document.getElementById("neo-os");
      const doc = frame?.contentDocument || document;
      Array.from(doc.querySelectorAll(".editor-toolbar button")).find((button) => button.textContent.trim() === "Preview HTML").click();
    });
    await page.waitForFunction(() => {
      const frame = document.getElementById("neo-os");
      const doc = frame?.contentDocument || document;
      return Boolean(doc.querySelector(".editor-preview-dialog[open] .editor-preview"));
    }, null, { timeout: 30000 });

    let previewFrame = null;
    for (let attempt = 0; attempt < 100 && !previewFrame; attempt += 1) {
      for (const candidate of page.frames()) {
        if (candidate === page.mainFrame()) continue;
        try {
          const element = await candidate.frameElement();
          if ((await element.getAttribute("class") || "").split(/\s+/).includes("editor-preview")) {
            previewFrame = candidate;
            break;
          }
        } catch (_) {}
      }
      if (!previewFrame) await page.waitForTimeout(50);
    }
    assert.ok(previewFrame, "preview iframe should be available");
    const networkResult = previewFrame.locator("#network-result");
    await networkResult.waitFor({ state: "visible", timeout: 30000 });
    for (let attempt = 0; attempt < 900; attempt += 1) {
      const value = String(await networkResult.textContent() || "").trim();
      if (value !== "checking") break;
      await page.waitForTimeout(100);
    }
    const networkText = String(await networkResult.textContent() || "").trim();
    assert.equal(networkText, "network:200", `preview network request failed: ${networkText}`);

    const state = await page.evaluate(() => {
      const frame = document.getElementById("neo-os");
      const doc = frame?.contentDocument || document;
      const view = doc.defaultView;
      const dialog = doc.querySelector(".editor-preview-dialog");
      const preview = dialog.querySelector(".editor-preview");
      const labels = Array.from(dialog.querySelectorAll(".editor-preview-actions button")).map((button) => button.textContent.trim());
      const before = dialog.getBoundingClientRect();
      const resize = view.getComputedStyle(dialog).resize;
      const maximize = Array.from(dialog.querySelectorAll("button")).find((button) => button.textContent.trim() === "Maximize");
      maximize.click();
      const after = dialog.getBoundingClientRect();
      return {
        title: dialog.querySelector("h2").textContent.trim(),
        networkLabel: dialog.querySelector(".editor-preview-network").textContent.trim(),
        labels,
        resize,
        maximized: dialog.classList.contains("is-maximized"),
        grew: after.width >= before.width && after.height >= before.height,
        sandbox: preview.getAttribute("sandbox"),
        allow: preview.getAttribute("allow"),
        allowFullscreen: preview.hasAttribute("allowfullscreen"),
      };
    });

    assert.equal(state.title, "network-preview.html preview");
    assert.equal(state.networkLabel, "Network enabled");
    assert.deepEqual(state.labels, ["Reload", "Maximize", "Full screen", "Close"]);
    assert.equal(state.resize, "both");
    assert.equal(state.maximized, true);
    assert.equal(state.grew, true);
    assert.match(state.sandbox, /allow-popups-to-escape-sandbox/);
    assert.match(state.allow, /fullscreen/);
    assert.equal(state.allowFullscreen, true);

    const coreFrame = previewFrame.parentFrame();
    const previewDialog = coreFrame.locator(".editor-preview-dialog");
    await previewDialog.getByRole("button", { name: "Restore", exact: true }).click();
    await previewDialog.getByRole("button", { name: "Full screen", exact: true }).click();
    await coreFrame.waitForFunction(() => Boolean(document.fullscreenElement === document.documentElement && document.querySelector(".editor-preview-dialog.is-browser-fullscreen")), null, { timeout: 10000 });
    await previewDialog.getByRole("button", { name: "Exit full screen", exact: true }).click();
    await coreFrame.waitForFunction(() => !document.fullscreenElement, null, { timeout: 10000 });

    console.log("Code Workspace preview reached the live Cloud health endpoint and exposed working resize/maximize/fullscreen controls.");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
