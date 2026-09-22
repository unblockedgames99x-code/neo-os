const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.resolve(__dirname, "../neo-os/neo-chat-transport.js"), "utf8");
const scriptOrigin = "https://script.googleusercontent.com";
const values = new Map();
const localStorage = {
  getItem: key => values.has(key) ? values.get(key) : null,
  setItem: (key, value) => values.set(String(key), String(value)),
  removeItem: key => values.delete(String(key))
};
let receiveMessage = null;
const requests = [];
const parent = {
  postMessage(message, targetOrigin) {
    requests.push({ message, targetOrigin });
    if (message && message.type === "neo-chat:request") {
      queueMicrotask(() => receiveMessage({
        source: parent,
        origin: scriptOrigin,
        data: {
          type: "neo-chat:response",
          id: message.id,
          result: { ok: true, data: { token: "neo_bridge_token", user: { id: "u_bridge", username: "BridgeUser" }, transport: "cloud" } }
        }
      }));
    }
  }
};
const window = {
  parent,
  crypto: crypto.webcrypto,
  localStorage,
  addEventListener(type, handler) { if (type === "message") receiveMessage = handler; },
  setTimeout(fn, delay) { return setTimeout(fn, delay <= 1000 ? 0 : delay); },
  clearTimeout
};

vm.runInContext(source, vm.createContext({
  window,
  localStorage,
  URL,
  DOMException,
  Map,
  Set,
  Uint32Array,
  queueMicrotask,
  console
}), { filename: "neo-chat-transport.js" });

(async () => {
  assert.equal(window.NEO_CHAT_TRANSPORT.modeLabel(), "Connecting to NEO relay");
  receiveMessage({ source: parent, origin: "https://attacker.example", data: { type: "neo-chat:bridge-ready" } });
  assert.equal(window.NEO_CHAT_TRANSPORT.modeLabel(), "Connecting to NEO relay");
  receiveMessage({ source: parent, origin: scriptOrigin, data: { type: "neo-chat:bridge-ready" } });
  assert.equal(window.NEO_CHAT_TRANSPORT.modeLabel(), "Shared NEO relay");

  const profile = await window.NEO_CHAT_TRANSPORT.createProfile("BridgeUser", "bridge password", null, "create_bridge_request_01");
  assert.equal(profile.user.id, "u_bridge");
  const rpc = requests.find(entry => entry.message && entry.message.type === "neo-chat:request");
  assert.ok(rpc);
  assert.equal(rpc.targetOrigin, scriptOrigin);
  assert.equal(rpc.message.method, "neoChatCreateProfile");
  assert.equal(rpc.message.payload.requestId, "create_bridge_request_01");
  assert.equal(rpc.message.payload.password, "bridge password");
  assert.equal(requests.filter(entry => entry.message && entry.message.type === "neo-chat:bridge-hello").every(entry => Object.keys(entry.message).length === 1), true);

  console.log("NEO Chat accepts only its Google Script parent bridge and keeps RPC replies origin-bound.");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
