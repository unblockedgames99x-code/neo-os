const assert = require("node:assert/strict");
const path = require("node:path");

function playwrightRuntime() {
  try { return require("playwright"); } catch (_error) {}
  return require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || "", ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules", "playwright"));
}

const { chromium } = playwrightRuntime();
const url = process.env.NEO_CHAT_GIF_URL || "http://127.0.0.1:3097/neo-os/neo-chat/?test=gif-picker-v1";
const gif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", "base64");

async function run() {
  const browser = await chromium.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  const now = Date.now();

  await page.route("https://gifsnap.com/api/v1/gifs/search**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    headers: { "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify({ data: [{ id: "snap-1", title: "Happy dance", url: "https://blocked.test/happy.gif", preview_url: "https://cdn.test/happy-preview.gif", source: "GIPHY" }] })
  }));
  await page.route("https://commons.wikimedia.org/w/api.php**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    headers: { "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify({ query: { pages: { 7: { pageid: 7, title: "File:Commons reaction.gif", imageinfo: [{ url: "https://cdn.test/commons.gif", thumburl: "https://cdn.test/commons-preview.gif", mime: "image/gif" }] } } } })
  }));
  await page.route("https://cdn.test/**", (route) => route.fulfill({ status: 200, contentType: "image/gif", headers: { "Access-Control-Allow-Origin": "*" }, body: gif }));
  await page.route("https://blocked.test/happy.gif", (route) => route.abort("failed"));
  await page.route("https://images.weserv.nl/**", (route) => route.fulfill({ status: 200, contentType: "image/gif", headers: { "Access-Control-Allow-Origin": "*" }, body: gif }));

  await page.addInitScript(({ now }) => {
    const me = { id: "u1", username: "NEO_test", displayName: "NEO Test" };
    const sent = [];
    localStorage.setItem("neo_chat_app_settings_v1:u1", JSON.stringify({ neoChatProfile: { kind: "tapback", value: "0", displayName: "NEO Test" } }));
    const transport = {
      mode: "test",
      resume: async () => ({ user: me, transport: "test" }),
      state: async () => ({ account: me, profiles: { u1: me }, rooms: {}, messages: [], transport: "test" }),
      createRoom: async () => ({ room: {} }),
      updateProfile: async () => ({ user: me }),
      upload: async (_token, attachment) => ({ name: attachment.name, type: attachment.type, size: attachment.size, url: "data:" + attachment.type + ";base64," + attachment.dataBase64 }),
      send: async (_token, text, roomId, clientId, attachment) => {
        sent.push(attachment);
        return { message: { id: clientId || "gif-message", userId: "u1", text, room: roomId, time: now, attachment } };
      },
      signOut: async () => ({ signedOut: true })
    };
    Object.defineProperty(window, "__gifSent", { value: sent });
    Object.defineProperty(window, "NEO_CHAT_TRANSPORT", { value: transport, configurable: false, writable: false });
    Object.defineProperty(window, "NEO_ACCOUNT_STORE", { value: { active: () => ({ token: "test-token", user: me, transport: "test" }) }, configurable: false, writable: false });
  }, { now });

  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#chatView:not([hidden])");

    await page.locator("#attachButton").hover();
    await page.locator("#attachmentMenu").waitFor({ state: "visible" });
    assert.equal(await page.locator("#attachButton").getAttribute("aria-expanded"), "true");
    await page.locator("#attachGifButton").click();
    await page.locator("#gifPicker").waitFor({ state: "visible" });
    await page.locator("#gifSearchInput").fill("happy");
    await page.waitForTimeout(350);
    await page.waitForFunction(() => document.querySelectorAll(".gif-result").length === 2);

    const providers = await page.locator(".gif-result > span").allTextContents();
    assert.ok(providers.includes("GIPHY"), JSON.stringify(providers));
    assert.ok(providers.includes("Wikimedia Commons"), JSON.stringify(providers));

    await page.screenshot({ path: path.join(__dirname, "..", ".codex-tmp", "neo-chat-gif-picker.png") });

    await page.locator(".gif-result").first().click();
    await page.locator("#attachmentStrip").waitFor({ state: "visible" });
    const staged = await page.evaluate(() => ({
      name: document.getElementById("attachmentName").textContent,
      preview: document.querySelector("#attachmentPreview img")?.src || "",
      pickerHidden: document.getElementById("gifPicker").hidden,
      sendDisabled: document.getElementById("sendButton").disabled
    }));
    assert.match(staged.name, /Happy dance\.gif$/);
    assert.match(staged.preview, /^data:image\/gif;base64,/);
    assert.equal(staged.pickerHidden, true);
    assert.equal(staged.sendDisabled, false);

    await page.locator("#sendButton").click();
    await page.waitForFunction(() => window.__gifSent.length === 1);
    assert.equal(await page.locator(".message-group.mine .message-attachment img").count(), 1);

    await page.locator("#attachButton").click();
    await page.locator("#attachGifButton").click();
    await page.locator("#gifUrlInput").fill("https://cdn.test/any-provider.gif");
    await page.locator("#gifUrlForm button").click();
    await page.locator("#attachmentStrip").waitFor({ state: "visible" });
    assert.match(await page.locator("#attachmentName").textContent(), /Shared GIF\.gif$/);

  } finally {
    await browser.close();
  }
}

run().then(() => console.log("NEO Chat hover GIF picker browser checks passed.")).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
