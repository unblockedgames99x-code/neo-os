const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "neo-os", "neo-leave-guard.js"), "utf8");
const html = fs.readFileSync(path.join(root, "neo-os", "index.html"), "utf8");
const listeners = new Map();

vm.runInNewContext(source, {
  window: {
    addEventListener(type, listener) {
      listeners.set(type, listener);
    }
  }
});

if (!listeners.has("beforeunload")) throw new Error("The leave confirmation is not registered.");

let prevented = false;
const event = {
  returnValue: undefined,
  preventDefault() { prevented = true; }
};
listeners.get("beforeunload")(event);

if (!prevented) throw new Error("The leave confirmation does not cancel the unload by default.");
if (event.returnValue !== "") throw new Error("The browser confirmation return value is missing.");
if (!/neo-leave-guard\.js\?v=20260907-anti-close-v1/.test(html)) throw new Error("The leave guard is not loaded by NEO OS.");

console.log("leave guard checks passed");
