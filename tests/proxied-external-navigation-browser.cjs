const assert = require("node:assert/strict");
const path = require("node:path");

function playwrightRuntime() {
  try { return require("playwright"); } catch (_error) {}
  return require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || "", ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules", "playwright"));
}

const { chromium } = playwrightRuntime();
const base = process.env.NEO_PREVIEW_URL || "http://127.0.0.1:3092";

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true
  });
  const context = await browser.newContext({ viewport: { width: 1100, height: 720 } });
  const directRequests = [];
  await context.route("https://outside.example/**", route => {
    directRequests.push(route.request().url());
    route.abort();
  });
  const page = await context.newPage();
  try {
    await page.goto(base + "/neo-os/browser-newtab.html", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      window.__proxyMessages = [];
      window.addEventListener("message", event => {
        const data = event.data;
        if (!data || !/^neo-shell:proxy-/.test(String(data.type || ""))) return;
        window.__proxyMessages.push(data);
        if (data.type === "neo-shell:proxy-embed") {
          event.source.postMessage({
            type: "neo-shell:proxy-embed-result",
            id: data.id,
            ok: true,
            route: location.origin + "/neo-os/browser-newtab.html#proxied"
          }, "*");
        }
      });
      const frame = document.createElement("iframe");
      frame.id = "bridge-test";
      frame.srcdoc = '<!doctype html><html><head><meta name="neo-source-url" content="' + location.origin + '/neo-os/test-app/index.html"><script src="/neo-os/neo-link-proxy.js"></script></head><body><a id="external-link" href="https://outside.example/page">Outside</a></body></html>';
      document.body.appendChild(frame);
    });
    const child = page.frameLocator("#bridge-test");
    await page.waitForFunction(() => document.getElementById("bridge-test")?.contentWindow?.__NEOLinkProxyInstalled === true);
    await child.locator("#external-link").click();
    await page.waitForFunction(() => window.__proxyMessages.some(message => message.type === "neo-shell:proxy-open"));
    const opened = await page.evaluate(() => window.__proxyMessages.find(message => message.type === "neo-shell:proxy-open"));
    assert.equal(opened.href, "https://outside.example/page");

    await child.locator("body").evaluate(body => {
      const embed = document.createElement("iframe");
      embed.id = "external-embed";
      embed.src = "https://outside.example/embed";
      body.appendChild(embed);
    });
    await child.locator("#external-embed").waitFor();
    await page.waitForFunction(() => {
      const frame = document.getElementById("bridge-test")?.contentDocument?.getElementById("external-embed");
      return frame?.getAttribute("src")?.includes("browser-newtab.html#proxied");
    });
    assert.deepEqual(directRequests, [], "An external embed started a direct request before proxying");
  } finally {
    await browser.close();
  }
  console.log("External link and embed navigation stays inside the proxy bridge.");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
