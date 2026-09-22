const assert = require("node:assert/strict");
const path = require("node:path");

function playwrightRuntime() {
  try { return require("playwright"); } catch (_error) {}
  return require(process.env.NEO_PLAYWRIGHT_PATH || path.join(
    process.env.USERPROFILE || "",
    ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules", "playwright"
  ));
}

const { chromium } = playwrightRuntime();
const url = process.env.NEO_MOVIES_PROXY_TEST_URL || "http://127.0.0.1:3092/neo-os/?test=movies-cinecat-v1";

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  try {
    await page.addInitScript(() => {
      if (window.top !== window) return;
      sessionStorage.setItem("neo_os_guest_session_v1", "1");
      localStorage.removeItem("neo:browser:wisp:v1");
    });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForFunction(() => window.NEO_SHELL || document.getElementById("neo-os")?.contentWindow?.NEO_SHELL, null, { timeout: 60000 });
    const launcher = await page.$("#neo-os");
    const desktop = launcher
      ? (await launcher.contentFrame()) || page.frames().find((frame) => frame.parentFrame() === page.mainFrame())
      : page;
    assert.ok(desktop, "NEO desktop frame did not initialize");
    await desktop.waitForFunction(() => window.NEO_SHELL && document.documentElement.dataset.boot === "complete", null, { timeout: 60000 });

    const start = desktop.locator("#neo-start-screen");
    if (await start.isVisible()) {
      await start.locator('[data-start-mode="laptop"]').click();
      await start.waitFor({ state: "hidden" });
    }
    const guest = desktop.locator("[data-neo-login-guest]");
    if (await guest.isVisible()) await guest.click();

    await desktop.evaluate(() => window.NEO_SHELL.openApp("movies"));
    const movieWindow = desktop.locator('.neo-window[data-app-id="movies"]');
    await movieWindow.waitFor({ state: "visible", timeout: 30000 });
    try {
      await movieWindow.locator(".neo-browser-runtime.is-app-mode").waitFor({ timeout: 45000 });
    } catch (error) {
      console.error(await movieWindow.evaluate((windowElement) => ({
        text: windowElement.innerText.slice(0, 1200),
        html: windowElement.querySelector(".neo-browser-content")?.innerHTML.slice(0, 1200) || "",
        loadingHidden: windowElement.querySelector("[data-browser-loading]")?.hidden,
        errorHidden: windowElement.querySelector("[data-browser-error]")?.hidden,
      })));
      throw error;
    }
    await desktop.waitForFunction(() => {
      const frame = document.querySelector('.neo-window[data-app-id="movies"] .neo-browser-pages iframe');
      const text = frame?.contentDocument?.body?.innerText?.trim() || "";
      return text.length > 80 && !/connection unavailable|internal service worker error/i.test(text);
    }, null, { timeout: 60000 });

    const state = await movieWindow.evaluate((windowElement) => {
      const runtime = windowElement.querySelector(".neo-browser-runtime");
      const frame = runtime?.querySelector(".neo-browser-pages iframe");
      return {
        dedicated: runtime?.classList.contains("is-app-mode") || false,
        tabbarDisplay: getComputedStyle(runtime.querySelector(".neo-browser-tabbar")).display,
        toolbarDisplay: getComputedStyle(runtime.querySelector(".neo-browser-toolbar")).display,
        intendedTarget: frame?.dataset.neoIntendedUrl || frame?.dataset.destination || "",
        frameUrl: frame?.getAttribute("src") || "",
        pageTitle: frame?.contentDocument?.title || "",
        pageText: frame?.contentDocument?.body?.innerText?.slice(0, 300) || "",
        relay: window.NEO_LOCAL_CONFIG?.browserWisp || "",
      };
    });

    assert.equal(state.dedicated, true, "Movies did not open in dedicated app mode");
    assert.equal(state.tabbarDisplay, "none", "Movies still shows the browser tab bar");
    assert.equal(state.toolbarDisplay, "none", "Movies still shows the browser address bar");
    assert.match(`${state.intendedTarget} ${state.frameUrl}`, /cinecat\.eu|browse-v71/i, "Movies did not route Cinecat through the proxy runtime");
    assert.ok(state.pageText.length > 80, "Cinecat did not render inside the Movies window");
    assert.equal(state.relay, "wss://cleanhost5896.b-cdn.net/w/");
    assert.equal(errors.some((message) => /SyntaxError|ReferenceError/.test(message)), false, errors.join("\n"));
  } finally {
    await browser.close();
  }

  console.log("Movies opens Cinecat through the Cleanhost transport without browser chrome.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
