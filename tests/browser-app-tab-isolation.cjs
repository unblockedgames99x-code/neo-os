const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const sessionScript = fs.readFileSync(path.join(root, "neo-os", "NEO-BROWSER", "assets", "app-session.js"), "utf8");
const browserHtml = fs.readFileSync(path.join(root, "neo-os", "NEO-BROWSER", "index.html"), "utf8");

function run(search) {
  const storage = new Map();
  const listeners = new Map();
  const location = { search };
  const localStorage = {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); }
  };
  const window = {
    location,
    localStorage,
    addEventListener(type, listener) { listeners.set(type, listener); }
  };
  const context = {
    URL,
    URLSearchParams,
    Math,
    window,
    localStorage,
    document: {
      baseURI: "https://neo.test/NEO-BROWSER/index.html",
      querySelector() { return null; }
    }
  };
  vm.runInNewContext(sessionScript, context, { filename: "app-session.js" });
  return { window, storage, listeners };
}

const main = run("");
assert.equal(main.window._sessionInstId, undefined, "The normal browser must keep its existing persistent tab session");

const app = run("?neo-app-mode=1&neo-app-target=https%3A%2F%2Fwww.youtube.com%2F");
assert.match(app.window._sessionInstId, /^neo_app_/, "A browser-backed app needs a separate browser session");
assert.equal(app.window._sessionInstId === "legacy-main-browser", false);
const appTabKey = `${app.window._sessionInstId}:neo:tabs:v1`;
app.storage.set(appTabKey, "temporary app tab");
app.listeners.get("pagehide")();
assert.equal(app.storage.has(appTabKey), false, "Closing the app must discard its temporary tab state");

assert.match(browserHtml, /app-session\.js\?v=20260910-tab-isolation-v1/);
assert.ok(browserHtml.indexOf("app-session.js") < browserHtml.indexOf("assets/app.js"), "Tab isolation must run before the browser restores tabs");

console.log("Browser-backed apps use disposable tab sessions without changing normal browser tabs.");
