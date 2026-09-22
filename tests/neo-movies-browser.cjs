const assert = require("node:assert/strict");
const path = require("node:path");

function playwrightRuntime() {
  try { return require("playwright"); } catch (_error) {}
  return require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || "", ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules", "playwright"));
}

const { chromium } = playwrightRuntime();
const base = process.env.NEO_MOVIES_TEST_URL || "http://127.0.0.1:3092/neo-os/neo-tv/index.html";

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEO_CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await page.goto(base, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForFunction(() => window.NEO_MOVIES, null, { timeout: 30000 });
    await page.locator(".profile:not(.profile-add)").first().waitFor({ state: "visible" });
    assert.match(await page.locator(".profile-avatar img").first().getAttribute("src"), /profile-classics\/scarlett-chilleez\.png/, "The local classic profile picture did not render");
    await page.locator(".profile-add").click();
    await page.locator("[data-profile-dialog][open]").waitFor();
    assert.equal(await page.locator(".profile-picture-choice").count(), 23, "The complete classic avatar collection is not visible");
    assert.equal(await page.locator("[data-avatar-upload]").count(), 1, "The profile upload control is missing");
    await page.locator("[data-profile-dialog] .close").click();
    await page.locator("[data-profile-dialog]").waitFor({ state: "hidden" });
    await page.locator(".profile:not(.profile-add)").first().click();
    await page.waitForFunction(() => !document.querySelector("[data-app-shell]").hidden);
    assert.equal(await page.locator("[data-video-upload]").count(), 1, "The user video upload action is missing");
    assert.ok(await page.locator("[data-hero]").isVisible(), "The open-film hero did not render");

    const embedded = await browser.newPage({ viewport: { width: 1000, height: 680 } });
    await embedded.goto(new URL("./catalog.js", base).href, { waitUntil: "domcontentloaded" });
    await embedded.setContent('<!doctype html><script>window.moviesMessages=[];addEventListener("message",event=>{if(event.data&&/^neo-shell:/.test(String(event.data.type||"")))moviesMessages.push(event.data)});<\/script><iframe id="movies" style="width:900px;height:600px" src="' + base + '?embedded-popout=1"></iframe>');
    await embedded.locator("#movies").waitFor();
    const frame = await (await embedded.$("#movies")).contentFrame();
    assert.ok(frame, "The embedded Movies frame did not attach");
    await frame.waitForFunction(() => window.NEO_MOVIES, null, { timeout: 30000 });
    await frame.locator(".profile:not(.profile-add)").first().click();
    await frame.locator("[data-video-file]").setInputFiles({ name: "my-film.mp4", mimeType: "video/mp4", buffer: Buffer.from([0, 0, 0, 0]) });
    await frame.locator("[data-details-dialog][open] .primary").click();
    await frame.locator("[data-player]").waitFor({ state: "visible" });
    await frame.locator("[data-video]").evaluate(video => { video.__neoIdentity = "same-video-node"; });
    await frame.locator("[data-pip]").click();
    assert.equal(await frame.locator("[data-video]").evaluate(video => video.__neoIdentity), "same-video-node", "Pop-out recreated the video element");
    assert.equal(await frame.locator("body").evaluate(body => body.classList.contains("media-popout")), true, "Embedded pop-out presentation was not enabled");
    assert.equal(await frame.locator("[data-popout-controls]").isVisible(), true, "The compact Restore control is not visible in pop-out mode");
    await embedded.waitForFunction(() => moviesMessages.some(message => message.type === "neo-shell:media-popout" && message.active === true));
    assert.equal(await embedded.evaluate(() => moviesMessages.some(message => message.type === "neo-shell:media-popout" && message.active === true)), true, "The shell did not receive the media pop-out message");
    await frame.locator("[data-popout-drag]").evaluate(node => { node.setPointerCapture = () => {}; });
    await frame.locator("[data-popout-drag]").dispatchEvent("pointerdown", { button: 0, pointerId: 7, screenX: 100, screenY: 100 });
    await frame.locator("body").dispatchEvent("pointermove", { pointerId: 7, screenX: 120, screenY: 125 });
    await frame.locator("body").dispatchEvent("pointerup", { pointerId: 7, screenX: 120, screenY: 125 });
    await embedded.waitForFunction(() => moviesMessages.some(message => message.type === "neo-shell:media-popout-drag" && message.phase === "start"));
    assert.equal(await embedded.evaluate(() => moviesMessages.some(message => message.type === "neo-shell:media-popout-drag" && message.phase === "start")), true, "The shell did not receive pop-out drag messages");
    await frame.locator("[data-restore-popout]").click();
    assert.equal(await frame.locator("[data-video]").evaluate(video => video.__neoIdentity), "same-video-node", "Restore recreated the video element");
    assert.equal(await frame.locator("body").evaluate(body => body.classList.contains("media-popout")), false, "Restore did not exit pop-out presentation");
    await embedded.close();
  } finally {
    await browser.close();
  }
  console.log("NEO Movies browser profile and catalogue checks passed.");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
