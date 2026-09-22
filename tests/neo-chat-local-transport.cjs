const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.resolve(__dirname, "../neo-os/neo-chat-transport.js"), "utf8");
const values = new Map();
values.set("neo_chat_local_state_v2", JSON.stringify({
  accounts: {
    neo_system: { id: "neo_system", username: "NEO System", bio: "Local preview guide", mood: "System", status: "online" }
  },
  sessions: {},
  rooms: {},
  messages: [{
    id: "neo_welcome",
    room: "global",
    userId: "neo_system",
    user: "NEO System",
    text: "Welcome to NEO Chat. In this preview, messages stay on this device.",
    time: 1
  }]
}));
const localStorage = {
  getItem: key => values.has(key) ? values.get(key) : null,
  setItem: (key, value) => values.set(String(key), String(value)),
  removeItem: key => values.delete(String(key))
};
const window = {
  crypto: crypto.webcrypto,
  localStorage,
  addEventListener() {},
  setTimeout,
  clearTimeout
};
window.parent = window;

const context = vm.createContext({
  window,
  localStorage,
  URL,
  DOMException,
  Map,
  Set,
  Uint32Array,
  Uint8Array,
  TextEncoder,
  console
});
vm.runInContext(source, context, { filename: "neo-chat-transport.js" });

(async () => {
  const transport = window.NEO_CHAT_TRANSPORT;
  const accounts = window.NEO_ACCOUNT_STORE;
  assert.equal(transport.mode(), "local");

  const alice = await transport.createProfile("Alice_local", "alice local password");
  accounts.save(alice.token, alice.user, alice.transport);
  const bob = await transport.createProfile("Bob_local", "bob local password");
  accounts.save(bob.token, bob.user, bob.transport);
  assert.equal(Array.from(accounts.list(), entry => entry.user.username).join(","), "Bob_local,Alice_local");

  accounts.clearActive();
  assert.equal(accounts.active(), null);
  const savedAlice = accounts.list().find(entry => entry.user.id === alice.user.id);
  accounts.activate(savedAlice);
  assert.equal(accounts.active().user.username, "Alice_local");
  assert.equal((await transport.resume(savedAlice.token)).user.id, alice.user.id);
  assert.equal((await transport.login("Alice_local", "alice local password")).user.id, alice.user.id);
  await assert.rejects(() => transport.login("Alice_local", "wrong password"), error => error && error.code === "invalid_credentials");

  await assert.rejects(() => transport.createProfile("Alice_local", "another local password"), error => error && error.code === "username_taken");
  const room = await transport.createRoom(alice.token, bob.user.id);
  const sent = await transport.send(alice.token, "Private hello", room.room.id, "local-client-one");
  assert.equal(sent.message.userId, alice.user.id);
  const edited = await transport.edit(alice.token, sent.message.id, "Private hello edited");
  assert.equal(edited.message.text, "Private hello edited");
  assert.ok(edited.message.editedAt > 0);
  await assert.rejects(() => transport.edit(bob.token, sent.message.id, "Tampered"), error => error && error.code === "message_forbidden");
  await assert.rejects(() => transport.remove(bob.token, sent.message.id), error => error && error.code === "message_forbidden");
  const bobState = await transport.state(bob.token, false);
  assert.ok(bobState.messages.some(message => message.text === "Private hello edited" && message.editedAt));
  assert.equal(bobState.messages.some(message => message.id === "neo_welcome"), false);
  assert.equal(bobState.profiles.neo_system, undefined);
  const profile = await transport.updateProfile(alice.token,{bio:'Saved biography',mood:'Building',status:'busy'});
  assert.equal(profile.user.bio,'Saved biography');
  assert.equal((await transport.resume(alice.token)).user.status,'busy');
  await assert.rejects(()=>transport.updateProfile('invalid',{bio:'tampered'}),e=>e.status===401);
  assert.equal(JSON.parse(values.get('neo_chat_local_state_v2')).accounts[alice.user.id].passwordAlgorithm,'pbkdf2-sha256-600000');
  const concurrent = await Promise.all([transport.createProfile('ParallelA','parallel password A'),transport.createProfile('ParallelB','parallel password B')]);
  assert.equal((await transport.resume(concurrent[0].token)).user.username,'ParallelA');
  assert.equal((await transport.resume(concurrent[1].token)).user.username,'ParallelB');
  assert.ok((await transport.state(bob.token,false)).messages.some(m=>m.text==='Private hello edited'),'account hashing must not overwrite messages');
  const attachment=await transport.upload(bob.token,{name:'hello.txt',type:'text/plain',size:5,dataBase64:'aGVsbG8='});
  const attachmentMessage=await transport.send(bob.token,'',room.room.id,'attachment-only',attachment);
  assert.equal(attachmentMessage.message.text,'');
  assert.ok((await transport.state(alice.token,false)).messages.some(m=>m.attachment&&m.attachment.name==='hello.txt'));
  const removed = await transport.remove(alice.token, sent.message.id);
  assert.equal(removed.deleted, true);
  assert.equal((await transport.state(bob.token, false)).messages.some(message => message.id === sent.message.id), false);
  const migrated = JSON.parse(values.get("neo_chat_local_state_v2"));
  assert.equal(migrated.messages.some(message => message.id === "neo_welcome"), false);
  assert.equal(migrated.accounts.neo_system, undefined);

  console.log("NEO Chat local fallback preserves selectable profiles and private conversations on one device.");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
