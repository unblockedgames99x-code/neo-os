const assert = require("node:assert/strict");
const path = require("node:path");

function playwrightRuntime() {
  try { return require("playwright"); } catch (_error) {}
  return require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || "", ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules", "playwright"));
}

const { chromium } = playwrightRuntime();
const url = process.env.NEO_CHAT_COMPOSER_URL || "http://127.0.0.1:3097/neo-os/neo-chat/?test=composer-glow-v2";

async function run() {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1600, height: 720 }, deviceScaleFactor: 1 });
  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      document.querySelectorAll(".overlay").forEach((element) => { element.hidden = true; });
      document.getElementById("emptyState").hidden = true;
      document.getElementById("chatView").hidden = false;
    });
    const state = await page.evaluate(() => {
      const rect = (selector) => {
        const value = document.querySelector(selector).getBoundingClientRect();
        return { left: value.left, right: value.right, top: value.top, bottom: value.bottom, width: value.width, height: value.height, center: value.top + value.height / 2 };
      };
      const attach = getComputedStyle(document.getElementById("attachButton"));
      const emoji = getComputedStyle(document.getElementById("emojiButton"));
      const send = getComputedStyle(document.getElementById("sendButton"));
      const field = getComputedStyle(document.querySelector(".composer-field"));
      return {
        composer: rect(".composer"),
        attach: rect("#attachButton"),
        field: rect(".composer-field"),
        emoji: rect("#emojiButton"),
        send: rect("#sendButton"),
        attachColor: attach.backgroundColor,
        emojiColor: emoji.color,
        sendColor: send.backgroundColor,
        idleShadow: field.boxShadow,
        accent: getComputedStyle(document.documentElement).getPropertyValue("--accent").trim()
      };
    });

    const centers = [state.attach.center, state.field.center, state.send.center];
    assert.ok(Math.max(...centers) - Math.min(...centers) <= 1, JSON.stringify(state));
    assert.equal(state.attach.height, state.send.height);
    assert.ok(state.field.height >= state.attach.height);
    assert.ok(state.emoji.left >= state.field.left && state.emoji.right <= state.field.right, JSON.stringify(state));
    assert.ok(state.field.right - state.emoji.right <= 4, JSON.stringify(state));
    assert.notEqual(state.attachColor, "rgb(167, 167, 173)");
    assert.notEqual(state.sendColor, "rgb(199, 199, 204)");
    assert.notEqual(state.emojiColor, "rgb(142, 142, 147)");
    assert.ok(state.accent, JSON.stringify(state));
    assert.equal(state.idleShadow, "none");
    await page.locator("#messageInput").focus();
    await page.waitForTimeout(250);
    const focusState = await page.evaluate(() => {
      const input = getComputedStyle(document.getElementById("messageInput"));
      return {
        fieldShadow: getComputedStyle(document.querySelector(".composer-field")).boxShadow,
        fieldFocused: document.querySelector(".composer-field").matches(":focus-within"),
        activeElement: document.activeElement?.id || "",
        emojiShadow: getComputedStyle(document.getElementById("emojiButton")).boxShadow,
        inputOutlineStyle: input.outlineStyle,
        inputOutlineWidth: input.outlineWidth,
        inputBoxShadow: input.boxShadow,
        inputBorderWidth: input.borderTopWidth
      };
    });
    assert.notEqual(focusState.fieldShadow, "none");
    assert.equal(focusState.fieldFocused, true);
    assert.equal(focusState.activeElement, "messageInput");
    assert.doesNotMatch(focusState.fieldShadow, /rgba\(0, 0, 0, 0\)/);
    assert.equal(focusState.emojiShadow, "none");
    assert.equal(focusState.inputOutlineStyle, "none");
    assert.equal(focusState.inputOutlineWidth, "0px");
    assert.equal(focusState.inputBoxShadow, "none");
    assert.equal(focusState.inputBorderWidth, "0px");
    await page.screenshot({ path: path.join(__dirname, "..", ".codex-tmp", "neo-chat-composer-aligned.png") });
  } finally {
    await browser.close();
  }
}

run().then(() => {
  console.log("NEO Chat composer browser alignment checks passed.");
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
