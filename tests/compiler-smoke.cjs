const http = require("http");
const fs = require("fs");
const path = require("path");
function playwrightRuntime() {
  try { return require("playwright"); } catch (_error) {}
  return require(process.env.NEO_PLAYWRIGHT_PATH || path.join(process.env.USERPROFILE || "", ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules", "playwright"));
}
const { chromium } = playwrightRuntime();

const root = path.resolve(__dirname, "..");
const assetPort = 43110;
const hostPort = 43111;

const mime = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wasm": "application/wasm",
  ".webm": "video/webm",
  ".webp": "image/webp"
};

function staticServer() {
  return http.createServer((request, response) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url, "http://asset.test").pathname);
    } catch (_error) {
      response.writeHead(400).end("Bad request");
      return;
    }
    const file = path.resolve(root, pathname.replace(/^\/+/, ""));
    if (file !== root && !file.startsWith(root + path.sep)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    fs.stat(file, (error, stat) => {
      if (error || !stat.isFile()) {
        response.writeHead(404).end("Not found");
        return;
      }
      const extension = path.extname(file).toLowerCase();
      response.setHeader("Access-Control-Allow-Origin", "*");
      response.setHeader("Cache-Control", "no-store");
      response.setHeader("X-Content-Type-Options", "nosniff");
      // jsDelivr serves nested HTML this way, which is the compiler failure mode.
      response.setHeader("Content-Type", extension === ".html" ? "text/plain; charset=utf-8" : (mime[extension] || "application/octet-stream"));
      fs.createReadStream(file).pipe(response);
    });
  });
}

function harnessServer() {
  return http.createServer((_request, response) => {
    const sourceUrl = `http://127.0.0.1:${assetPort}/neo-os/index.html`;
    const baseUrl = `http://127.0.0.1:${assetPort}/neo-os/`;
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.end(`<!doctype html><html><body style="margin:0;background:#000">
      <iframe id="shell" allow="autoplay; clipboard-read; clipboard-write; fullscreen; gamepad" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>
      <script>
        fetch(${JSON.stringify(sourceUrl)}, { cache: "no-store" }).then(function (response) {
          if (!response.ok) throw new Error("OS request failed");
          return response.text();
        }).then(function (html) {
          var injection = '<base href="${baseUrl}" target="_self"><meta name="neo-runner" content="1">';
          // The compiler harness intentionally serves its wrapper from a different
          // local origin. Remove the document CSP only inside this test fixture so
          // its injected asset base can model the compiled/CDN deployment path.
          html = html.replace(/<meta\\b[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, "");
          html = html.replace(/<base\\b[^>]*>/gi, "");
          html = html.replace(/<head(?:\\s[^>]*)?>/i, function (head) { return head + injection; });
          document.getElementById("shell").srcdoc = html;
        }).catch(function (error) {
          document.body.textContent = error.message;
        });
      <\/script>
    </body></html>`);
  });
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
}

async function run() {
  const assets = staticServer();
  const harness = harnessServer();
  await Promise.all([listen(assets, assetPort), listen(harness, hostPort)]);

  const failures = [];
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--autoplay-policy=no-user-gesture-required"]
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("pageerror", error => failures.push("pageerror: " + (error.stack || error.message)));
  page.on("requestfailed", request => failures.push("requestfailed: " + request.url() + " :: " + (request.failure() && request.failure().errorText)));

  const results = {};
  try {
    await page.goto(`http://127.0.0.1:${hostPort}/`, { waitUntil: "domcontentloaded" });
    const shell = page.frameLocator("#shell");
    await shell.locator("#neo-desktop").waitFor({ state: "attached", timeout: 20000 });
    await shell.locator('html[data-boot="complete"]').waitFor({ state: "attached", timeout: 20000 });
    const start = shell.locator("#neo-start-screen");
    if (await start.isVisible()) {
      await start.locator('[data-start-mode="laptop"]').click();
      await start.waitFor({ state: "hidden" });
    }
    const guest = shell.locator("[data-neo-login-guest]");
    if (await guest.isVisible()) await guest.click();
    results.desktop = await shell.locator("#neo-desktop").isVisible();
    results.rawSourceOnDesktop = (await shell.locator("body").innerText()).includes("<!doctype html>");

    const wallpaperProbe = await shell.locator("body").evaluate(async body => {
      const frame = document.createElement("iframe");
      frame.id = "compiler-wallpaper-probe";
      frame.style.cssText = "position:fixed;left:-9999px;width:320px;height:180px";
      body.appendChild(frame);
      await window.NEOFrameLoader.load(frame, "./assets/wallpaper-engine-web/1403160205/index.html");
      await new Promise(resolve => frame.addEventListener("load", resolve, { once: true }));
      const doc = frame.contentDocument;
      return {
        title: doc && doc.title,
        hasCanvas: Boolean(doc && doc.querySelector("canvas")),
        rawSource: Boolean(doc && doc.body && /<!doctype html>|<html[\\s>]/i.test(doc.body.innerText))
      };
    });
    results.wallpaper = wallpaperProbe;

    await shell.locator('.dock-button[data-app="zones"]').click();
    const library = shell.locator('.neo-window[data-app-id="zones"]');
    await library.locator("[data-library-home]").waitFor({ state: "visible", timeout: 10000 });
    results.gamesGateway = {
      title: await library.locator("[data-library-home] h2").innerText(),
      remoteFrames: await library.locator('iframe[src^="http"]').count()
    };
    await library.locator("[data-library-home-search]").fill("tetris");
    await library.locator("[data-library-home-search]").press("Enter");
    await library.locator(".library-card").first().waitFor({ timeout: 20000 });
    results.catalogText = await library.locator("[data-library-count]").innerText();
    results.firstPageCards = await library.locator(".library-card").count();
    await library.locator("[data-library-search]").fill("tetris");
    await page.waitForTimeout(400);
    await library.locator(".library-card").first().waitFor({ timeout: 10000 });
    results.filteredCatalogText = await library.locator("[data-library-count]").innerText();
    await library.locator(".library-card").first().click();
    const gameWindow = shell.locator('.neo-window[data-app-id^="zone-"]').last();
    await gameWindow.locator("iframe").waitFor({ timeout: 15000 });
    const game = shell.frameLocator('.neo-window[data-app-id^="zone-"]:not(.is-minimized) iframe');
    await game.locator("body").waitFor({ state: "attached", timeout: 20000 });
    await game.locator("#app").waitFor({ state: "visible", timeout: 20000 });
    await game.locator("#board").waitFor({ state: "visible", timeout: 20000 });
    results.game = {
      title: await game.locator("title").textContent().catch(() => ""),
      rawSource: /<!doctype html>|<html[\s>]/i.test(await game.locator("body").innerText()),
      baseUri: await game.locator("html").evaluate(() => document.baseURI),
      stylesheets: await game.locator("html").evaluate(() => document.styleSheets.length),
      scriptsReady: await game.locator("html").evaluate(() => Boolean(document.querySelector("#board") && document.querySelector("#start-btn")))
    };

    results.gameMatrix = await shell.locator("body").evaluate(async body => {
      const games = [
        { name: "Grandmaster Chess", route: "../games/grandmaster-chess.html" },
        { name: "Quantum Clicker", route: "../games/quantum-clicker.html" },
        { name: "Tetris", route: "../games/tetris.html" }
      ];
      const probes = [];
      for (const game of games) {
        const frame = document.createElement("iframe");
        frame.style.cssText = "position:fixed;left:-99999px;top:0;width:960px;height:600px";
        body.appendChild(frame);
        const loaded = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error("Timed out waiting for the game document.")), 45000);
          frame.addEventListener("load", () => {
            clearTimeout(timeout);
            resolve();
          }, { once: true });
        });
        try {
          const load = await window.NEOFrameLoader.load(frame, game.route);
          await loaded;
          await new Promise(resolve => setTimeout(resolve, 800));
          const doc = frame.contentDocument;
          const bodyText = doc && doc.body ? doc.body.innerText : "";
          probes.push({
            name: game.name,
            mode: load.mode,
            title: doc ? doc.title : "",
            elements: doc && doc.body ? doc.body.querySelectorAll("*").length : 0,
            surfaces: doc ? doc.querySelectorAll("canvas, iframe, object, embed, #content, #game_frame").length : 0,
            rawSource: /<!doctype html>|<html[\s>]/i.test(bodyText),
            passed: Boolean(doc && doc.body && doc.body.querySelector("*")) && !/<!doctype html>|<html[\s>]/i.test(bodyText)
          });
        } catch (error) {
          probes.push({ name: game.name, passed: false, error: error.message });
        } finally {
          window.NEOFrameLoader.cancel(frame);
          frame.remove();
        }
      }
      return probes;
    });

    await shell.locator('.dock-button[data-app="stream"]').click();
    const musicWindow = shell.locator('.neo-window[data-app-id="stream"]');
    const musicFrame = musicWindow.locator('iframe[data-neo-local-music="true"]');
    await musicFrame.waitFor({ state: "visible", timeout: 20000 });
    await musicWindow.frameLocator('iframe[data-neo-local-music="true"]').locator("#search-input").waitFor({ state: "visible", timeout: 20000 });
    await musicFrame.evaluate(frame => { frame.dataset.smokeSession = "preserved"; });
    results.music = {
      local: /\/music-v2\/index\.html(?:[?#]|$)/.test(await musicFrame.getAttribute("data-neo-music-source")),
      ready: true,
      recreatedOnReopen: false
    };
    await musicWindow.locator('[data-window-action="close"]').evaluate(button => button.click());
    await musicWindow.waitFor({ state: "detached", timeout: 5000 });
    await shell.locator('.dock-button[data-app="stream"]').click();
    await musicWindow.waitFor({ state: "visible", timeout: 10000 });
    await musicWindow.locator('iframe[data-neo-local-music="true"]').waitFor({ state: "visible", timeout: 10000 });
    results.music.recreatedOnReopen = await musicWindow.locator('iframe[data-neo-local-music="true"][data-smoke-session="preserved"]').count() === 0;

    results.localApps = [];
    for (const appId of ["files", "media", "wallpaper", "control"]) {
      const launcher = shell.locator(`.dock-button[data-app="${appId}"]`);
      await launcher.click();
      const appWindow = shell.locator(`.neo-window[data-app-id="${appId}"]`);
      await appWindow.waitFor({ state: "visible", timeout: 15000 });
      const copy = await appWindow.locator(".window-body").innerText();
      results.localApps.push({
        id: appId,
        visible: true,
        hasContent: copy.trim().length > 0,
        unavailable: /this app is unavailable|could not be loaded|did not start/i.test(copy)
      });
    }

    await shell.locator('.dock-button[data-app="browser"]').click();
    const browserFrame = shell.frameLocator('.neo-window[data-app-id="browser"] iframe');
    await browserFrame.locator("#url").waitFor({ timeout: 20000 });
    results.browserUi = true;
    results.browserStatusBefore = await browserFrame.locator("#statusText").innerText();
    results.browserNavigation = false;
    results.browserStatusAfter = await browserFrame.locator("#statusText").innerText();

    await page.screenshot({ path: path.join(process.env.TEMP || root, "neo-compiler-full-smoke.png"), fullPage: true });
  } finally {
    await browser.close();
    await Promise.all([
      new Promise(resolve => assets.close(resolve)),
      new Promise(resolve => harness.close(resolve))
    ]);
  }

  console.log(JSON.stringify({ results, failures: [...new Set(failures)].slice(0, 80) }, null, 2));
  if (!results.desktop || results.rawSourceOnDesktop || !results.wallpaper || results.wallpaper.rawSource || !results.wallpaper.hasCanvas || !results.gamesGateway || results.gamesGateway.title !== "UNBLOCKED GAMES" || results.gamesGateway.remoteFrames !== 0 || !/^1 TITLES LOADED$/i.test(results.catalogText || "") || !results.firstPageCards || !results.game || results.game.rawSource || !results.game.stylesheets || !results.game.scriptsReady || !results.gameMatrix || results.gameMatrix.some(game => !game.passed) || !results.music || !results.music.local || !results.music.ready || !results.music.recreatedOnReopen || !results.localApps || results.localApps.some(app => !app.visible || !app.hasContent || app.unavailable) || !results.browserUi || results.browserNavigation) {
    process.exitCode = 1;
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
