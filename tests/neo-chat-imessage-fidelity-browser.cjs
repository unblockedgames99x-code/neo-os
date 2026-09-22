const assert = require("node:assert/strict");
const path = require("node:path");

function playwrightRuntime() {
  try { return require("playwright"); } catch (_error) {}
  return require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || "", ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules", "playwright"));
}

const { chromium } = playwrightRuntime();
const url = process.env.NEO_CHAT_IMESSAGE_URL || "http://127.0.0.1:3097/neo-os/neo-chat/?test=imessage-fidelity-v1";

async function run() {
  const browser = await chromium.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const now = Date.now();
  const messages = [
    { id: "incoming", userId: "u2", text: "Sounds good", time: now - 3000 },
    { id: "outgoing", userId: "u1", text: "yo wsq", time: now }
  ];
  await page.addInitScript(({ messages }) => {
    const me = { id: "u1", username: "NEO_test", displayName: "NEO Test" };
    const sender = { id: "u2", username: "sender", displayName: "Sender" };
    localStorage.setItem("neo_chat_app_settings_v1:u1", JSON.stringify({ neoChatProfile: { kind: "tapback", value: "0", displayName: "NEO Test" } }));
    const transport = {
      mode: "test",
      resume: async () => ({ user: me, transport: "test" }),
      state: async () => ({ account: me, profiles: { u1: me, u2: sender }, rooms: {}, messages, transport: "test" }),
      createRoom: async () => ({ room: {} }), updateProfile: async () => ({ user: me }),
      upload: async (_token, attachment) => attachment, send: async () => ({ message: messages[1] }),
      signOut: async () => ({ signedOut: true })
    };
    Object.defineProperty(window, "NEO_CHAT_TRANSPORT", { value: transport, configurable: false, writable: false });
    Object.defineProperty(window, "NEO_ACCOUNT_STORE", { value: { active: () => ({ token: "test-token", user: me, transport: "test" }) }, configurable: false, writable: false });
  }, { messages });

  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".message-group.mine .message-bubble");
    await page.waitForTimeout(250);
    const state = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const outgoing = document.querySelector(".message-group.mine .message-bubble");
      const incoming = document.querySelector(".message-group:not(.mine) .message-bubble");
      const outgoingStyle = getComputedStyle(outgoing);
      const incomingStyle = getComputedStyle(incoming);
      const tail = getComputedStyle(outgoing, "::before");
      const cutout = getComputedStyle(outgoing, "::after");
      const attach = getComputedStyle(document.getElementById("attachButton"));
      const blueProbe = document.createElement("i");
      blueProbe.style.backgroundColor = "var(--messages-blue)";
      document.body.appendChild(blueProbe);
      const resolvedMessageBlue = getComputedStyle(blueProbe).backgroundColor;
      blueProbe.remove();
      return {
        outgoingText: outgoing.childNodes[0].textContent,
        outgoingHeight: outgoing.getBoundingClientRect().height,
        outgoingRadius: outgoingStyle.borderTopLeftRadius,
        outgoingFontSize: outgoingStyle.fontSize,
        outgoingColor: outgoingStyle.backgroundColor,
        incomingColor: incomingStyle.backgroundColor,
        messageBlue: root.getPropertyValue("--messages-blue").trim(),
        outgoingMessageBlue: outgoingStyle.getPropertyValue("--messages-blue").trim(),
        resolvedMessageBlue,
        tailContent: tail.content,
        tailWidth: tail.width,
        cutoutContent: cutout.content,
        meta: document.querySelector(".message-group.mine .message-meta").textContent,
        date: document.querySelector(".day-divider").textContent,
        attachBackground: attach.backgroundColor,
        callButtons: document.querySelectorAll("#audioCallButton, #videoCallButton").length,
        headerColumns: getComputedStyle(document.querySelector(".chat-header")).gridTemplateColumns.split(" ")
      };
    });
    assert.equal(state.outgoingText, "yo wsq");
    assert.ok(state.outgoingHeight >= 29 && state.outgoingHeight <= 31, JSON.stringify(state));
    assert.equal(state.outgoingRadius, "16px");
    assert.equal(state.outgoingFontSize, "13px");
    assert.equal(state.outgoingColor, state.resolvedMessageBlue, JSON.stringify(state));
    assert.notEqual(state.outgoingColor, state.incomingColor);
    assert.equal(state.tailContent, '""');
    assert.equal(state.tailWidth, "16px");
    assert.equal(state.cutoutContent, '""');
    assert.match(state.meta, /^Delivered · /);
    assert.match(state.date, /^(Today|Yesterday|\w{3},?)/);
    assert.notEqual(state.attachBackground, state.outgoingColor);
    assert.equal(state.callButtons, 0);
    assert.equal(state.headerColumns[0], state.headerColumns[state.headerColumns.length - 1]);
    await page.screenshot({ path: path.join(__dirname, "..", ".codex-tmp", "neo-chat-imessage-fidelity.png") });
  } finally {
    await browser.close();
  }
}

run().then(() => console.log("NEO Chat iOS 17 iMessage visual checks passed.")).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
