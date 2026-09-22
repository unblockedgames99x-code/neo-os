const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.resolve(__dirname, "../google-script-Code.gs"), "utf8");
const properties = new Map();
let uuidCounter = 0;
let propertySnapshots = 0;

const propertyStore = {
  getProperty: key => properties.has(key) ? properties.get(key) : null,
  getProperties() { propertySnapshots += 1; return Object.fromEntries(properties); },
  setProperty(key, value) { this.setProperties({ [key]: value }); },
  setProperties(values) {
    const next = new Map(properties);
    Object.entries(values).forEach(([key, value]) => {
      const text = String(value);
      assert.ok(Buffer.byteLength(text, "utf8") <= 9 * 1024, `property ${key} exceeds the Apps Script 9 KB value limit`);
      next.set(key, text);
    });
    const total = [...next].reduce((bytes, [key, value]) => bytes + Buffer.byteLength(key + value, "utf8"), 0);
    assert.ok(total <= 500 * 1024, "properties exceed the Apps Script 500 KB store limit");
    properties.clear();
    next.forEach((value, key) => properties.set(key, value));
  },
  deleteProperty: key => properties.delete(key)
};

const lock = { tryLock: () => true, releaseLock() {} };
const context = vm.createContext({
  console: { error() {}, log() {} },
  HtmlService: {},
  PropertiesService: { getScriptProperties: () => propertyStore },
  LockService: { getScriptLock: () => lock },
  DriveApp: {
    Access: { ANYONE_WITH_LINK: "ANYONE_WITH_LINK" },
    Permission: { VIEW: "VIEW" },
    createFile(blob) {
      return { getId: () => "drive_attachment_1", setSharing() { return this; }, setTrashed() {}, blob };
    }
  },
  Utilities: {
    Charset: { UTF_8: "UTF-8" },
    DigestAlgorithm: { SHA_256: "SHA-256" },
    getUuid() {
      uuidCounter += 1;
      return `00000000-0000-4000-8000-${String(uuidCounter).padStart(12, "0")}`;
    },
    computeDigest(_algorithm, value) {
      return [...crypto.createHash("sha256").update(String(value), "utf8").digest()];
    },
    computeHmacSha256Signature(value, key) {
      return [...crypto.createHmac("sha256", String(key)).update(String(value), "utf8").digest()];
    },
    newBlob(value, type, name) {
      return { getBytes: () => Array.isArray(value) ? value : [...Buffer.from(String(value), "utf8")], type, name };
    },
    base64EncodeWebSafe(value) {
      return Buffer.from(value).toString("base64url");
    },
    base64Decode: value => [...Buffer.from(value, "base64")],
    base64Encode: value => Buffer.from(value).toString("base64")
  }
});

vm.runInContext(source, context, { filename: "google-script-Code.gs" });

const aliceRequest = { username: "Alice_1", password: "correct horse battery", requestId: "create_alice_request_0001" };
const alice = context.neoChatCreateProfile(aliceRequest);
const bob = context.neoChatCreateProfile({ username: "Bob_2", password: "bob secure password", requestId: "create_bob_request_000002" });
const charlie = context.neoChatCreateProfile({ username: "Charlie_3", password: "charlie secure password", requestId: "create_charlie_request_03" });
assert.equal(alice.ok, true);
assert.equal(bob.ok, true);
assert.equal(charlie.ok, true);
assert.match(alice.data.token, /^neo_[a-f0-9]+$/);
assert.notEqual(alice.data.user.id, "alice_1");
assert.equal(alice.data.user.username, "Alice_1");
assert.equal(JSON.stringify(Object.fromEntries(properties)).includes(alice.data.token), false, "raw session tokens must never be stored in keys or values");
assert.equal(JSON.stringify(Object.fromEntries(properties)).includes(aliceRequest.password), false, "raw passwords must never be stored");

const replayedCreation = context.neoChatCreateProfile(aliceRequest);
assert.equal(replayedCreation.ok, true);
assert.equal(replayedCreation.data.token, alice.data.token);
assert.equal(replayedCreation.data.user.id, alice.data.user.id);
assert.equal(replayedCreation.data.resumedCreation, true);

const duplicate = context.neoChatCreateProfile({ username: "alice_1", password: "another secure password", requestId: "create_different_request_04" });
assert.equal(duplicate.ok, false);
assert.equal(duplicate.error.code, "username_taken");

const badLogin = context.neoChatLogin({ username: "Alice_1", password: "wrong password" });
assert.equal(badLogin.ok, false);
assert.equal(badLogin.error.code, "invalid_credentials");
const login = context.neoChatLogin({ username: "alice_1", password: aliceRequest.password });
assert.equal(login.ok, true);
assert.equal(login.data.user.id, alice.data.user.id);

const resumed = context.neoChatResume({ token: alice.data.token });
assert.equal(resumed.ok, true);
assert.equal(resumed.data.user.id, alice.data.user.id);

const search = context.neoChatSearchUsers({ token: alice.data.token, query: "bo", exact: false });
assert.equal(search.ok, true);
assert.equal(search.data.users[0].id, bob.data.user.id);

const dm = context.neoChatCreateRoom({ token: alice.data.token, username: bob.data.user.id });
assert.equal(dm.ok, true);
assert.deepEqual([...dm.data.room.members].sort(), [alice.data.user.id, bob.data.user.id].sort());

const sent = context.neoChatSendMessage({ token: alice.data.token, roomId: dm.data.room.id, clientId: "client-one", text: "Hello from NEO" });
assert.equal(sent.ok, true);
assert.equal(sent.data.message.userId, alice.data.user.id);
const edited = context.neoChatEditMessage({ token: alice.data.token, messageId: sent.data.message.id, text: "Hello from edited NEO" });
assert.equal(edited.ok, true);
assert.equal(edited.data.message.text, "Hello from edited NEO");
assert.ok(edited.data.message.editedAt > 0);
const forbiddenEdit = context.neoChatEditMessage({ token: bob.data.token, messageId: sent.data.message.id, text: "Tampered" });
assert.equal(forbiddenEdit.ok, false);
assert.equal(forbiddenEdit.error.code, "message_forbidden");
const forbiddenDelete = context.neoChatDeleteMessage({ token: bob.data.token, messageId: sent.data.message.id });
assert.equal(forbiddenDelete.ok, false);
assert.equal(forbiddenDelete.error.code, "message_forbidden");

const uploaded = context.neoChatUploadAttachment({ token: bob.data.token, name: "photo.png", type: "image/png", size: 4, dataBase64: Buffer.from([1, 2, 3, 4]).toString("base64") });
assert.equal(uploaded.ok, true);
assert.match(uploaded.data.attachment.url, /drive\.google\.com\/uc\?export=download/);

const readsBeforeState = propertySnapshots;
const bobState = context.neoChatState({ token: bob.data.token });
assert.equal(bobState.ok, true);
assert.equal(propertySnapshots - readsBeforeState, 1, "one state poll should take one Script Properties snapshot");
assert.equal(bobState.data.rooms[dm.data.room.id].private, true);
assert.ok(bobState.data.messages.some(message => message.text === "Hello from edited NEO" && message.editedAt));
assert.equal(bobState.data.messages.some(message => message.id === "neo_welcome"), false);

const charlieState = context.neoChatState({ token: charlie.data.token });
assert.equal(charlieState.ok, true);
assert.equal(charlieState.data.rooms[dm.data.room.id], undefined);
assert.equal(charlieState.data.messages.some(message => message.room === dm.data.room.id), false);
const forbidden = context.neoChatSendMessage({ token: charlie.data.token, roomId: dm.data.room.id, clientId: "charlie-forbidden", text: "No access" });
assert.equal(forbidden.ok, false);
assert.equal(forbidden.error.code, "room_forbidden");

const retry = context.neoChatSendMessage({ token: alice.data.token, roomId: dm.data.room.id, clientId: "client-one", text: "Hello from NEO" });
assert.equal(retry.ok, true);
assert.equal(retry.data.duplicate, true);

const slow = context.neoChatSendMessage({ token: alice.data.token, roomId: "global", clientId: "client-two", text: "Too soon" });
assert.equal(slow.ok, false);
assert.equal(slow.error.code, "slow_mode");
assert.ok(slow.error.retryAfterMs > 0);

const removed = context.neoChatDeleteMessage({ token: alice.data.token, messageId: sent.data.message.id });
assert.equal(removed.ok, true);
assert.equal(removed.data.deleted, true);
assert.equal(context.neoChatState({ token: bob.data.token }).data.messages.some(message => message.id === sent.data.message.id), false);

const emojiPayload = JSON.stringify({ text: "😀".repeat(12000) });
const emojiChunks = context.neoChatUtf8Chunks_(emojiPayload, 7000);
assert.equal(emojiChunks.join(""), emojiPayload);
emojiChunks.forEach(chunk => assert.ok(Buffer.byteLength(chunk, "utf8") <= 7000));
assert.throws(() => context.neoChatWriteStore_("overflow", "😀".repeat(120000)), error => error && error.neoCode === "relay_capacity");

assert.equal(context.neoChatSignOut({ token: alice.data.token }).ok, true);
assert.equal(context.neoChatResume({ token: alice.data.token }).error.code, "session_expired");

console.log("Google Apps Script NEO Chat hashes passwords and enforces private-room access, ownership-safe message edits/deletes, idempotency, and slow mode.");
