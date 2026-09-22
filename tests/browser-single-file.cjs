const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE, ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright")
);

const file = path.resolve(__dirname, "..", "exports", "NEO-Browser-Single.html");

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
    args: ["--allow-file-access-from-files"],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.addInitScript(() => {
    try { localStorage.setItem("neo_desktop_preferences_v1", JSON.stringify({ theme: "frost" })); }
    catch (_error) {}
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.stack || error.message));
  try {
    await page.goto(pathToFileURL(file).href, { waitUntil: "commit", timeout: 120000 });
    await page.waitForSelector("#url", { timeout: 120000 });
    await page.waitForSelector("#new-tab", { state: "visible", timeout: 120000 });
    await page.waitForTimeout(1500);

    const state = await page.evaluate(() => ({
      title: document.title,
      tabTitle: document.querySelector('.tab.active .ttl')?.textContent || '',
      tabClassroomIcon: document.querySelector('.tab.active .tfav')?.dataset.neoStartupClassroom || '',
      favicon: document.querySelector('link[rel~="icon"]')?.href || '',
      newestUi: Boolean(document.querySelector(".tabbar") && document.querySelector(".chrome") && document.getElementById("new-tab")),
      bundledScripts: document.querySelectorAll("[data-bundled-from]").length,
      rendererShim: Boolean(document.getElementById("neo-single-renderer-shim")),
    }));
    assert.equal(state.title, 'Home - Classroom');
    assert.equal(state.tabTitle, 'Google Classroom');
    assert.equal(state.tabClassroomIcon, 'true');
    assert.match(state.favicon, /^data:image\/png;base64,/);
    assert.equal(state.newestUi, true);
    assert.equal(state.rendererShim, true);
    assert.ok(state.bundledScripts >= 4);
    assert.equal(errors.length, 0, errors.join("\n"));

    const serverManager = await page.evaluate(() => ({
      count: window.NEO_WISP_MANAGER?.servers?.length || 0,
      current: window.NEO_WISP_MANAGER?.current?.() || "",
      mode: window.NEO_WISP_MANAGER?.mode?.() || "",
      switchInstalled: typeof window.NEO_SWITCH_WISP_TRANSPORT === "function",
    }));
    assert.equal(serverManager.count, 10);
    assert.equal(serverManager.current, "wss://probuildingsupplies.com/w/");
    assert.equal(serverManager.mode, "auto");
    assert.equal(serverManager.switchInstalled, true);

    const oled = await page.evaluate(() => ({
      theme: document.documentElement.dataset.neoTheme,
      themeBg: getComputedStyle(document.documentElement).getPropertyValue("--theme-bg").trim(),
      accent: getComputedStyle(document.documentElement).getPropertyValue("--theme-accent").trim(),
      body: getComputedStyle(document.body).backgroundColor,
      tabbar: getComputedStyle(document.querySelector(".tabbar")).backgroundColor,
      chrome: getComputedStyle(document.querySelector(".chrome")).backgroundColor,
      newtab: getComputedStyle(document.querySelector(".new-tab")).backgroundColor,
      search: getComputedStyle(document.querySelector(".nt-search")).backgroundColor,
      activeTab: getComputedStyle(document.querySelector(".tab.active")).backgroundColor,
      override: Boolean(document.getElementById("neo-single-oled-ui")),
      lock: Boolean(document.getElementById("neo-single-oled-lock")),
    }));
    assert.equal(oled.theme, "oled");
    assert.equal(oled.themeBg, "#000000");
    assert.equal(oled.accent, "#ffffff");
    assert.equal(oled.body, "rgb(0, 0, 0)");
    assert.equal(oled.tabbar, "rgb(0, 0, 0)");
    assert.equal(oled.chrome, "rgb(0, 0, 0)");
    assert.equal(oled.newtab, "rgb(0, 0, 0)");
    assert.equal(oled.search, "rgb(13, 13, 13)");
    assert.equal(oled.activeTab, "rgb(23, 23, 23)");
    assert.equal(oled.override, true);
    assert.equal(oled.lock, true);
    if (process.env.NEO_SINGLE_BROWSER_NEWTAB_SCREENSHOT) {
      await page.screenshot({ path: process.env.NEO_SINGLE_BROWSER_NEWTAB_SCREENSHOT, fullPage: true });
    }

    await page.locator("#url").fill("https://example.com/");
    await page.locator("#url").press("Enter");
    await page.waitForSelector(".frames iframe.page", { state: "attached", timeout: 30000 });
    try {
      await page.waitForFunction(() => {
        try {
          const shell = document.querySelector(".frames iframe.page");
          const frame = shell?.contentDocument?.getElementById("frame");
          return /Example Domain/i.test(frame?.contentDocument?.body?.innerText || "");
        } catch (_error) { return false; }
      }, null, { timeout: Number(process.env.NEO_PROXY_TIMEOUT || 120000) });
    } catch (error) {
      const diagnostics = await page.evaluate(() => {
        const shell = document.querySelector(".frames iframe.page");
        const documentInside = shell?.contentDocument;
        const frame = documentInside?.getElementById("frame");
        return {
          address: document.getElementById("url")?.value || "",
          frameCount: document.querySelectorAll(".frames iframe.page").length,
          rendererReady: Boolean(documentInside?.getElementById("neo-embedded-renderer-bridge")),
          innerAddress: documentInside?.getElementById("url")?.value || "",
          innerStatus: documentInside?.getElementById("statusText")?.textContent || "",
          frameText: frame?.contentDocument?.body?.innerText || "",
          scriptIds: [...(documentInside?.scripts || [])].map(script => script.id).filter(Boolean),
          htmlEnd: documentInside?.documentElement?.outerHTML?.slice(-1200) || "",
        };
      });
      throw new Error(`${error.message}\n${JSON.stringify(diagnostics, null, 2)}\n${errors.join("\n")}`);
    }

    const proxied = await page.evaluate(() => ({
      address: document.getElementById("url")?.value || "",
      text: document.querySelector(".frames iframe.page")?.contentDocument?.getElementById("frame")?.contentDocument?.body?.innerText || "",
    }));
    assert.match(proxied.address, /example\.com/i);
    assert.match(proxied.text, /Example Domain/i);
    assert.equal(errors.length, 0, errors.join("\n"));

    const initialRelay = await page.evaluate(() => {
      const renderer = document.querySelector(".frames iframe.page")?.contentWindow;
      return {
        selected: window.NEO_WISP_MANAGER?.current?.() || "",
        renderer: renderer?.__neoStandaloneRelay || "",
        configured: renderer?.NeoScramjet?.configuredRelay?.() || "",
      };
    });
    assert.equal(initialRelay.renderer, initialRelay.selected);
    assert.equal(initialRelay.configured, initialRelay.selected);

    const switchedRelay = "wss://wisp.mercurywork.shop/";
    await page.evaluate(async (url) => { await window.NEO_WISP_MANAGER.activate(url, "automated-test"); }, switchedRelay);
    await page.waitForFunction((url) => {
      try {
        const shell = document.querySelector(".frames iframe.page");
        const renderer = shell?.contentWindow;
        const frame = shell?.contentDocument?.getElementById("frame");
        return renderer?.__neoStandaloneRelay === url && /Example Domain/i.test(frame?.contentDocument?.body?.innerText || "");
      } catch (_error) { return false; }
    }, switchedRelay, { timeout: Number(process.env.NEO_PROXY_TIMEOUT || 120000) });
    const switched = await page.evaluate(() => ({
      selected: window.NEO_WISP_MANAGER?.current?.() || "",
      renderer: document.querySelector(".frames iframe.page")?.contentWindow?.__neoStandaloneRelay || "",
      status: document.getElementById("wisp-status")?.textContent || "",
    }));
    assert.equal(switched.selected, switchedRelay);
    assert.equal(switched.renderer, switchedRelay);
    assert.match(switched.status, /Mercury Wisp/i);
    assert.equal(errors.length, 0, errors.join("\n"));
    if (process.env.NEO_SINGLE_BROWSER_SCREENSHOT) {
      await page.screenshot({ path: process.env.NEO_SINGLE_BROWSER_SCREENSHOT, fullPage: true });
    }
    console.log(`Newest single-file NEO Browser opened directly with ${state.bundledScripts} outer resources and loaded Example Domain through its embedded proxy.`);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
