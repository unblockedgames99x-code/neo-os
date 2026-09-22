const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE || "", ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules", "playwright")
);

const base = process.env.NEO_BROWSER_TEST_URL || "http://127.0.0.1:3092/neo-os/NEO-BROWSER/";
const destination = process.env.NEO_BROWSER_DESTINATION || "https://example.com/";
const expected = new RegExp(process.env.NEO_BROWSER_EXPECTED || "Example Domain", "i");

async function browserFrame(page) {
  if (!new URL(base).pathname.endsWith(".svg")) return page.mainFrame();
  const handle = await page.waitForSelector("#neo-browser", { timeout: 60000 });
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const frame = await handle.contentFrame() ||
      page.frames().find((candidate) => candidate.parentFrame() === page.mainFrame());
    if (frame) return frame;
    await page.waitForTimeout(100);
  }
  throw new Error("Browser launcher frame did not become ready.");
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const context = await browser.newContext({ viewport: { width: 1180, height: 760 } });
  const page = await context.newPage();
  const messages = [];
  page.on("console", (message) => messages.push(`${message.type()}: ${message.text()}`));
  page.on("pageerror", (error) => messages.push(`pageerror: ${error.message}`));

  try {
    await page.goto(base, { waitUntil: "domcontentloaded", timeout: 30000 });
    const app = await browserFrame(page);
    await app.locator("#url").fill(destination);
    await app.locator("#url").press("Enter");
    try {
      await app.waitForFunction(() => {
        const frame = document.getElementById("frame");
        if (!frame || frame.dataset.neoScramjet !== "true") return false;
        try {
          return Boolean(frame.contentDocument?.body?.innerText?.trim());
        } catch {
          return false;
        }
      }, null, { timeout: 60000 });
    } catch (error) {
      console.error("Browser navigation diagnostics:", await app.evaluate(() => ({
        address: document.getElementById("url")?.value || "",
        proxied: document.getElementById("frame")?.dataset.neoScramjet || "",
        overlay: document.getElementById("overlay")?.className || "",
        frameSrc: document.getElementById("frame")?.getAttribute("src") || "",
        frameText: document.getElementById("frame")?.contentDocument?.body?.innerText?.slice(0, 500) || "",
        log: document.getElementById("logbox")?.textContent?.slice(-1500) || "",
        runtime: Boolean(window.NeoScramjet),
      })));
      console.error(messages.slice(-60).join("\n"));
      throw error;
    }

    const state = await app.evaluate(() => {
      const frame = document.getElementById("frame");
      return {
        address: document.getElementById("url")?.value || "",
        proxied: frame?.dataset.neoScramjet || "",
        overlayHidden: document.getElementById("overlay")?.classList.contains("hidden") || false,
        text: frame?.contentDocument?.body?.innerText?.slice(0, 500) || "",
        frameUrl: frame?.contentWindow?.location?.href || "",
        relay: window.NeoScramjet?.configuredRelay?.() || "",
      };
    });
    console.log(JSON.stringify({ state, messages: messages.slice(-50) }, null, 2));
    assert.equal(state.proxied, "true");
    assert.equal(state.overlayHidden, true, "The browser stayed behind its loading overlay.");
    assert.match(state.text, expected);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
