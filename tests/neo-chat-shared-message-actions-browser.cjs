const assert = require("node:assert/strict");
const path = require("node:path");

function playwrightRuntime() {
  try { return require("playwright"); } catch (_error) {}
  return require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || "", ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules", "playwright"));
}

const { chromium } = playwrightRuntime();
const url = process.env.NEO_CHAT_MESSAGE_ACTIONS_URL || "http://127.0.0.1:3097/neo-os/neo-chat/?test=shared-message-actions-v1";

async function run() {
  const browser = await chromium.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  const createdAt = Date.now() - 60000;

  await page.addInitScript(({ createdAt }) => {
    const me = { id: "u1", username: "NEO_test", displayName: "NEO Test" };
    const calls = { edit: [], remove: [] };
    localStorage.setItem("neo_chat_app_settings_v1:u1", JSON.stringify({ neoChatProfile: { kind: "tapback", value: "0", displayName: "NEO Test" } }));
    window.prompt = () => "Updated shared message";
    window.confirm = () => true;
    const transport = {
      mode: "test",
      resume: async () => ({ user: me, transport: "test" }),
      state: async () => ({
        account: me,
        profiles: { u1: me },
        rooms: {},
        messages: [{ id: "m1", userId: "u1", user: "NEO_test", room: "global", text: "Original shared message", time: createdAt }],
        transport: "test"
      }),
      createRoom: async () => ({ room: {} }),
      updateProfile: async () => ({ user: me }),
      edit: async (_token, messageId, text) => {
        calls.edit.push({ messageId, text });
        return { message: { id: messageId, userId: "u1", room: "global", text, time: createdAt, editedAt: Date.now() } };
      },
      remove: async (_token, messageId) => {
        calls.remove.push({ messageId });
        return { id: messageId, roomId: "global", deleted: true };
      },
      send: async () => ({ message: {} }),
      signOut: async () => ({ signedOut: true })
    };
    Object.defineProperty(window, "__messageActionCalls", { value: calls });
    Object.defineProperty(window, "NEO_CHAT_TRANSPORT", { value: transport, configurable: false, writable: false });
    Object.defineProperty(window, "NEO_ACCOUNT_STORE", { value: { active: () => ({ token: "test-token", user: me, transport: "test" }) }, configurable: false, writable: false });
  }, { createdAt });

  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    const row = page.locator('[data-message="m1"]');
    await row.waitFor();

    await row.hover();
    await row.locator('[data-action="more"]').click();
    await page.locator(".message-action-menu button", { hasText: "Edit" }).click();
    await page.waitForFunction(() => document.querySelector('[data-message="m1"] .message-bubble')?.textContent.includes("Updated shared message"));
    assert.deepEqual(await page.evaluate(() => window.__messageActionCalls.edit), [{ messageId: "m1", text: "Updated shared message" }]);
    assert.match(await row.locator(".message-meta").textContent(), /Edited/);

    await row.hover();
    await row.locator('[data-action="more"]').click();
    await page.locator(".message-action-menu button", { hasText: "Delete" }).click();
    await page.waitForFunction(() => !document.querySelector('[data-message="m1"]'));
    assert.deepEqual(await page.evaluate(() => window.__messageActionCalls.remove), [{ messageId: "m1" }]);
    assert.equal(await page.getByText("Message deleted", { exact: true }).count(), 1);
  } finally {
    await browser.close();
  }
}

run().then(() => console.log("NEO Chat shared message edit and delete browser checks passed.")).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
