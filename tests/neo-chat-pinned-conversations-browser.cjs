const assert = require("node:assert/strict");
const path = require("node:path");

function playwrightRuntime() {
  try { return require("playwright"); } catch (_error) {}
  return require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || "", ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules", "playwright"));
}

const { chromium } = playwrightRuntime();
const url = process.env.NEO_CHAT_PINNED_URL || "http://127.0.0.1:3097/neo-os/neo-chat/?test=pinned-chats-v1";

async function run() {
  const browser = await chromium.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true });
  const page = await browser.newPage({ viewport: { width: 1180, height: 760 }, deviceScaleFactor: 1 });
  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.NEO_CHAT_TRANSPORT && window.NEO_ACCOUNT_STORE);
    const seeded = await page.evaluate(async () => {
      const suffix = Math.random().toString(36).slice(2, 9);
      const me = await window.NEO_CHAT_TRANSPORT.createProfile("pin_owner_" + suffix, "strong-password");
      const first = await window.NEO_CHAT_TRANSPORT.createProfile("pin_peer_" + suffix, "strong-password");
      const second = await window.NEO_CHAT_TRANSPORT.createProfile("drag_peer_" + suffix, "strong-password");
      await window.NEO_CHAT_TRANSPORT.createRoom(me.token, first.user.username);
      await window.NEO_CHAT_TRANSPORT.createRoom(me.token, second.user.username);
      window.NEO_ACCOUNT_STORE.save(me.token, me.user, me.transport);
      localStorage.setItem("ugp_token", me.token);
      localStorage.setItem("ugp_session", JSON.stringify(me.user));
      return { first: first.user.displayName || first.user.username, second: second.user.displayName || second.user.username };
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator("#authOverlay").waitFor({ state: "hidden", timeout: 15000 });
    const profileOverlay = page.locator("#profileOverlay");
    if (await profileOverlay.isVisible()) await page.locator("#profileCancel").click();
    await page.locator(".pinned-conversation-shelf").waitFor({ state: "visible" });

    assert.equal(await page.locator(".pinned-conversation").count(), 1, "Global Chat should start pinned");
    const firstRow = page.locator(".conversation-row").filter({ hasText: seeded.first }).first();
    await firstRow.click({ button: "right" });
    const menu = page.locator(".conversation-action-menu");
    await menu.waitFor({ state: "visible" });
    await menu.getByRole("menuitem", { name: "Pin", exact: true }).click();
    await page.locator(".pinned-conversation-name", { hasText: seeded.first }).waitFor({ state: "visible" });
    assert.equal(await page.locator(".pinned-conversation").count(), 2);

    const secondRow = page.locator(".conversation-row").filter({ hasText: seeded.second }).first();
    await secondRow.dragTo(page.locator(".pinned-conversation-shelf"));
    await page.locator(".pinned-conversation-name", { hasText: seeded.second }).waitFor({ state: "visible" });
    assert.equal(await page.locator(".pinned-conversation").count(), 3);

    const geometry = await page.locator(".pinned-conversation").nth(1).evaluate((tile) => {
      const avatar = tile.querySelector(".avatar").getBoundingClientRect();
      const name = tile.querySelector(".pinned-conversation-name").getBoundingClientRect();
      return { avatarBottom: avatar.bottom, nameTop: name.top, avatarWidth: avatar.width, avatarHeight: avatar.height };
    });
    assert.ok(geometry.nameTop >= geometry.avatarBottom, JSON.stringify(geometry));
    assert.ok(geometry.avatarWidth >= 58 && geometry.avatarWidth <= 63, JSON.stringify(geometry));
    assert.ok(geometry.avatarHeight >= 58 && geometry.avatarHeight <= 63, JSON.stringify(geometry));

    const badgeGeometry = await page.locator(".pinned-conversation").first().evaluate((tile) => {
      const artwork = tile.querySelector(".pinned-conversation-artwork");
      const badge = document.createElement("b");
      badge.className = "pinned-conversation-badge";
      badge.textContent = "1";
      artwork.appendChild(badge);
      const avatar = tile.querySelector(".avatar").getBoundingClientRect();
      const marker = badge.getBoundingClientRect();
      return {
        avatarRight: avatar.right,
        avatarTop: avatar.top,
        badgeCenterX: marker.left + marker.width / 2,
        badgeCenterY: marker.top + marker.height / 2,
        badgeWidth: marker.width,
        badgeHeight: marker.height
      };
    });
    assert.ok(badgeGeometry.badgeWidth <= 21 && badgeGeometry.badgeHeight <= 21, JSON.stringify(badgeGeometry));
    assert.ok(badgeGeometry.badgeCenterX > badgeGeometry.avatarRight, JSON.stringify(badgeGeometry));
    assert.ok(badgeGeometry.badgeCenterY < badgeGeometry.avatarTop, JSON.stringify(badgeGeometry));

    await page.locator(".pinned-conversation").filter({ hasText: seeded.first }).click({ button: "right" });
    await page.locator(".conversation-action-menu").getByRole("menuitem", { name: "Unpin", exact: true }).waitFor({ state: "visible" });
    await page.waitForTimeout(220);
    await page.screenshot({ path: path.join(__dirname, "..", ".codex-tmp", "neo-chat-pinned-conversations.png") });
    await page.mouse.click(700, 300);
    await page.locator("#composeButton").click();
    await page.locator("#newChatOverlay").waitFor({ state: "visible" });
    await page.mouse.click(15, 15);
    await page.locator("#newChatOverlay").waitFor({ state: "hidden" });
    await page.waitForFunction(() => document.activeElement === document.getElementById("composeButton"));
  } finally {
    await browser.close();
  }
}

run().then(() => {
  console.log("NEO Chat pinned conversation browser checks passed.");
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
