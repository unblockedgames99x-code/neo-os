const assert = require("node:assert/strict");
const path = require("node:path");

function playwrightRuntime() {
  try { return require("playwright"); } catch (_error) {}
  return require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || "", ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules", "playwright"));
}

const { chromium } = playwrightRuntime();
const url = process.env.NEO_CHAT_PROFILE_PHOTO_URL || "http://127.0.0.1:3097/neo-os/neo-chat/?test=profile-photo-editor-v1";
const customPhoto = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL7WQAAAABJRU5ErkJggg==";

async function run() {
  const browser = await chromium.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await page.addInitScript(({ customPhoto }) => {
    const me = { id: "u1", username: "NEO_test", displayName: "NEO Test" };
    localStorage.setItem("neo_chat_app_settings_v1:u1", JSON.stringify({
      neoChatProfile: { kind: "photo", value: customPhoto, displayName: "NEO Test" }
    }));
    const transport = {
      mode: "test",
      resume: async () => ({ user: me, transport: "test" }),
      state: async () => ({ account: me, profiles: { u1: me }, rooms: {}, messages: [], transport: "test" }),
      createRoom: async () => ({ room: {} }),
      updateProfile: async () => ({ user: me }),
      send: async () => ({ message: {} }),
      signOut: async () => ({ signedOut: true })
    };
    Object.defineProperty(window, "NEO_CHAT_TRANSPORT", { value: transport, configurable: false, writable: false });
    Object.defineProperty(window, "NEO_ACCOUNT_STORE", { value: { active: () => ({ token: "test-token", user: me, transport: "test" }) }, configurable: false, writable: false });
  }, { customPhoto });

  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#chatView:not([hidden])");
    await page.locator("#profileButton").click();
    await page.locator("#profileOverlay:not([hidden])").waitFor();

    const preview = page.locator("#memojiPreview");
    assert.equal(await page.locator("#memojiPersonalizer").isVisible(), true);
    assert.equal(await preview.getAttribute("class"), "memoji-preview has-photo");
    assert.equal(await preview.locator("img").getAttribute("src"), customPhoto);
    assert.equal(await preview.locator("img").getAttribute("alt"), "Current custom profile picture");
    assert.equal(await page.locator("#memojiOptionGrid").isVisible(), true);

    await page.screenshot({ path: path.join(__dirname, "..", ".codex-tmp", "neo-chat-profile-photo-editor.png") });

    await page.locator(".memoji-option").first().click();
    assert.equal(await preview.locator("img").getAttribute("src") === customPhoto, false);
    assert.equal((await preview.getAttribute("class")).includes("has-tapback"), true);
  } finally {
    await browser.close();
  }
}

run().then(() => console.log("NEO Chat custom profile photo editor checks passed.")).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
