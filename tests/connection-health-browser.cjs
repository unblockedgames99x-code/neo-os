const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require(
  process.env.NEO_PLAYWRIGHT_PATH ||
    path.join(process.env.USERPROFILE, ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright")
);

const url = process.env.NEO_CONNECTION_TEST_URL || "http://127.0.0.1:3092/neo-os/";

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  try {
    await page.addInitScript(() => sessionStorage.setItem("neo_os_guest_session_v1", "1"));
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForFunction(() => {
      const frame = document.getElementById("neo-os");
      const doc = frame?.contentDocument || document;
      return Boolean(doc.defaultView?.NEO_SHELL && doc.defaultView?.NEO_CONNECTION_MONITOR);
    }, null, { timeout: 180000 });

    const result = await page.evaluate(async () => {
      const frame = document.getElementById("neo-os");
      const doc = frame?.contentDocument || document;
      const view = doc.defaultView;
      const delay = (ms) => new Promise((resolve) => view.setTimeout(resolve, ms));
      const start = doc.querySelector('[data-start-mode="laptop"]');
      if (start) start.click();

      const health = await view.NEO_CONNECTION_MONITOR.refresh();
      const networkButton = doc.querySelector("#taskbar-network");
      networkButton?.click();
      await delay(50);
      const networkPanel = doc.querySelector("#connection-panel");
      const panel = {
        open: Boolean(networkPanel && !networkPanel.hidden),
        rows: networkPanel ? networkPanel.querySelectorAll("[data-connection-services] li").length : 0,
      };
      view.NEO_SHELL.openApp("stream");
      let musicFrame = null;
      for (let attempt = 0; attempt < 120; attempt += 1) {
        musicFrame = doc.querySelector('.neo-window[data-app-id="stream"] iframe');
        if (musicFrame?.contentDocument?.defaultView?.__NEO_MUSIC__) break;
        await delay(100);
      }
      const musicView = musicFrame?.contentDocument?.defaultView;
      let musicFetch = { ready: false, status: 0, error: "" };
      try {
        const response = await musicView.fetch("https://lol.samidy.workers.dev/search?s=connection-test", {
          mode: "cors",
          cache: "no-store",
        });
        musicFetch = { ready: response.ok, status: response.status, error: "" };
      } catch (error) {
        musicFetch.error = String(error && error.message || error);
      }

      let relay = { ready: false, error: "" };
      try {
        relay = await new Promise((resolve) => {
          const socket = new view.WebSocket("wss://support.pired.org/lively/");
          const timer = view.setTimeout(() => {
            try { socket.close(); } catch (_error) {}
            resolve({ ready: false, error: "timeout" });
          }, 6000);
          socket.addEventListener("open", () => {
            view.clearTimeout(timer);
            socket.close();
            resolve({ ready: true, error: "" });
          }, { once: true });
          socket.addEventListener("error", () => {
            view.clearTimeout(timer);
            resolve({ ready: false, error: "websocket error" });
          }, { once: true });
        });
      } catch (error) {
        relay = { ready: false, error: String(error && error.message || error) };
      }

      let cloud = { ready: false, status: 0, error: "" };
      try {
        const response = await view.fetch("https://neo-stratus-api-w6nw.onrender.com/cloud/v1/getQueue?uuid=00000000-0000-4000-8000-000000000000", {
          method: "GET",
          mode: "cors",
          cache: "no-store",
          credentials: "omit",
          headers: { Accept: "application/json", "x-api-key": "sk_live_neo_21c3aa84317445fa850319adfa895999" },
        });
        const body = await response.json();
        cloud = { ready: response.status === 404 && /not found|expired/i.test(String(body && body.error || "")), status: response.status, error: "" };
      } catch (error) {
        cloud.error = String(error && error.message || error);
      }

      const chat = { ready: false, server: "https://lunchbreak.dyercountylawncare.workers.dev", code: "", error: "" };
      try {
        const response = await view.fetch(chat.server + "/api/auth/token", {
          method: "GET",
          mode: "cors",
          cache: "no-store",
          credentials: "omit",
          headers: { Accept: "application/json" },
        });
        const body = await response.json();
        chat.code = String(body && body.code || "");
        chat.ready = response.status === 401 && chat.code === "auth/requires-login";
      } catch (error) {
        chat.error = String(error && error.message || error);
      }

      view.NEO_SHELL.openApp("neo-cloud");
      let cloudFrame = null;
      for (let attempt = 0; attempt < 200; attempt += 1) {
        cloudFrame = doc.querySelector('.neo-window[data-app-id="neo-cloud"] iframe');
        if (cloudFrame?.contentDocument?.readyState === "complete" && cloudFrame.contentDocument.querySelector("[data-test-connection]")) break;
        await delay(100);
      }
      const cloudDocument = cloudFrame?.contentDocument;
      const cloudUi = { ready: false, message: "" };
      if (cloudDocument) {
        cloudDocument.querySelector("[data-open-settings]")?.click();
        await delay(100);
        cloudDocument.querySelector("[data-test-connection]")?.click();
        for (let attempt = 0; attempt < 750; attempt += 1) {
          cloudUi.message = String(cloudDocument.querySelector("[data-connection-result]")?.textContent || "").trim();
          if (/Connection accepted|rejected|could not|did not answer/i.test(cloudUi.message)) break;
          await delay(100);
        }
        cloudUi.ready = /Connection accepted/i.test(cloudUi.message);
      }

      return {
        location: view.location.href,
        origin: view.location.origin,
        base: doc.baseURI,
        health,
        panel,
        musicFetch,
        relay,
        cloud,
        cloudUi,
        chat,
      };
    });

    console.log(JSON.stringify({ result, consoleErrors: consoleErrors.slice(0, 20) }, null, 2));
    assert.equal(result.musicFetch.ready, true, "music API should accept requests");
    assert.equal(result.relay.ready, true, "browser relay should accept WebSockets");
    assert.equal(result.cloud.ready, true, "cloud API should accept cross-origin requests");
    assert.equal(result.cloudUi.ready, true, "NEO Cloud connection test should accept the hosted service");
    assert.equal(result.chat.ready, true, "chat API should be reachable");
    assert.equal(result.panel.open, true, "Wi-Fi control should open the network panel");
    assert.equal(result.panel.rows, 8, "network panel should list apps, relay, and live servers");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
