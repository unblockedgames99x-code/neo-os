const assert = require("node:assert/strict");
const path = require("node:path");

function playwrightRuntime() {
  try { return require("playwright"); } catch (_error) {}
  return require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || "", ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules", "playwright"));
}

const { chromium } = playwrightRuntime();
const url = process.env.NEO_CHAT_MENTIONS_URL || "http://127.0.0.1:3097/neo-os/neo-chat/?test=mentions-v1";

async function run() {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push(String(error && error.stack || error)));
  const now = Date.now();
  const messages = [
    { id: "mention-user", userId: "u2", text: "Hello @NEO_test", time: now - 1000 },
    { id: "mention-everyone", userId: "u2", text: "Update for @everyone", time: now }
  ];
  await page.addInitScript(({ messages }) => {
    const me = { id: "u1", username: "NEO_test", displayName: "NEO Test" };
    const sender = { id: "u2", username: "sender", displayName: "Sender" };
    localStorage.setItem("neo_chat_app_settings_v1:u1", JSON.stringify({ neoChatProfile: { kind: "tapback", value: "0", displayName: "NEO Test" } }));
    const transport = {
      mode: "test",
      resume: async () => ({ user: me, transport: "test" }),
      state: async () => ({ account: me, profiles: { u1: me, u2: sender }, rooms: {}, messages, transport: "test" }),
      createRoom: async () => ({ room: {} }),
      updateProfile: async () => ({ user: me }),
      upload: async (_token, attachment) => attachment,
      send: async () => ({ message: messages[0] }),
      signOut: async () => ({ signedOut: true })
    };
    Object.defineProperty(window, "NEO_CHAT_TRANSPORT", { value: transport, configurable: false, writable: false });
    Object.defineProperty(window, "NEO_ACCOUNT_STORE", { value: { active: () => ({ token: "test-token", user: me, transport: "test" }) }, configurable: false, writable: false });
  }, { messages });

  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".message-mention", { timeout: 15000 }).catch(async (error) => {
      const diagnostic = await page.evaluate(() => ({
        busy: document.getElementById("app")?.getAttribute("aria-busy"),
        authHidden: document.getElementById("authOverlay")?.hidden,
        chatHidden: document.getElementById("chatView")?.hidden,
        connection: document.getElementById("connectionLabel")?.textContent,
        messageText: document.getElementById("messageScroll")?.textContent
      }));
      throw new Error(error.message + "\n" + JSON.stringify({ diagnostic, browserErrors }, null, 2));
    });
    await page.waitForFunction(() => document.querySelectorAll(".message-mention").length === 2);
    const state = await page.evaluate(() => ({
      mentions: Array.from(document.querySelectorAll(".message-mention")).map((node) => ({ text: node.textContent, weight: getComputedStyle(node).fontWeight })),
      highlighted: document.querySelectorAll(".message-group.is-mentioned").length,
      toasts: Array.from(document.querySelectorAll(".toast")).map((node) => node.textContent)
    }));
    assert.deepEqual(state.mentions.map((item) => item.text), ["@NEO_test", "@everyone"]);
    assert.ok(state.mentions.every((item) => Number(item.weight) >= 700), JSON.stringify(state));
    assert.equal(state.highlighted, 2);
    assert.ok(state.toasts.some((text) => /mentioned you/.test(text)), JSON.stringify(state));
    assert.ok(state.toasts.some((text) => /mentioned everyone/.test(text)), JSON.stringify(state));
    await page.screenshot({ path: path.join(__dirname, "..", ".codex-tmp", "neo-chat-mentions.png") });
  } finally {
    await browser.close();
  }
}

run().then(() => console.log("NEO Chat mention rendering and notification browser checks passed.")).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
