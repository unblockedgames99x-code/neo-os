(function () {
  "use strict";

  var parentWindow = null;
  try { parentWindow = window.parent && window.parent !== window ? window.parent : null; } catch (error) {}
  var transport = null;
  var accountStore = null;
  try {
    transport = parentWindow && parentWindow.NEO_CHAT_TRANSPORT || window.NEO_CHAT_TRANSPORT;
    accountStore = parentWindow && parentWindow.NEO_ACCOUNT_STORE || window.NEO_ACCOUNT_STORE;
  } catch (error) {
    transport = window.NEO_CHAT_TRANSPORT;
    accountStore = window.NEO_ACCOUNT_STORE;
  }
  if (!transport) return;

  var SETTINGS_PREFIX = "neo_chat_app_settings_v1:";
  var READ_PREFIX = "neo_chat_app_read_v1:";
  var snapshotPromise = null;
  var snapshotTime = 0;

  function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || "null") || fallback; }
    catch (error) { return fallback; }
  }

  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) {}
  }

  function activeAccount() {
    var active = null;
    try { active = accountStore && accountStore.active ? accountStore.active() : null; } catch (error) {}
    if (active && active.token && active.user) return active;
    var token = "";
    var user = null;
    try {
      token = localStorage.getItem("ugp_token") || "";
      user = JSON.parse(localStorage.getItem("ugp_session") || "null");
    } catch (error) {}
    return token && user && user.id ? { token: token, user: user, transport: user.transport || "" } : null;
  }

  function saveAccount(payload) {
    if (!payload || !payload.token || !payload.user) return;
    if (accountStore && accountStore.save) accountStore.save(payload.token, payload.user, payload.transport);
    else {
      try {
        localStorage.setItem("ugp_token", payload.token);
        localStorage.setItem("ugp_session", JSON.stringify(payload.user));
      } catch (error) {}
    }
    announceAccount(payload.user);
  }

  function clearAccount() {
    if (accountStore && accountStore.clearActive) accountStore.clearActive();
    else {
      try { localStorage.removeItem("ugp_token"); localStorage.removeItem("ugp_session"); } catch (error) {}
    }
    announceAccount(null);
  }

  function announceAccount(user) {
    try {
      if (parentWindow) parentWindow.postMessage({ type: "neo-chat:account-sync", user: user || null }, location.origin === "null" ? "*" : location.origin);
    } catch (error) {}
  }

  function cleanUser(user) {
    user = user || {};
    return {
      id: String(user.id || ""),
      username: String(user.username || "Member"),
      displayName: String(user.displayName || user.username || "Member"),
      avatar: String(user.avatar || ""),
      bio: String(user.bio || ""),
      mood: String(user.mood || "NEO member"),
      status: String(user.status || "online")
    };
  }

  function roomMembers(room) {
    if (Array.isArray(room && room.members)) return room.members.map(String);
    if (room && room.members && typeof room.members === "object") return Object.keys(room.members);
    return [];
  }

  function snapshot(force) {
    var active = activeAccount();
    if (!active) return Promise.reject(Object.assign(new Error("Sign in to your NEO account to continue."), { status: 401 }));
    if (!force && snapshotPromise && Date.now() - snapshotTime < 900) return snapshotPromise;
    snapshotTime = Date.now();
    snapshotPromise = Promise.resolve(transport.state(active.token, false)).then(function (payload) {
      payload = payload || {};
      payload.account = cleanUser(payload.account || active.user);
      payload.profiles = payload.profiles || {};
      payload.profiles[payload.account.id] = Object.assign({}, payload.profiles[payload.account.id] || {}, payload.account);
      return payload;
    }).finally(function () {
      window.setTimeout(function () { snapshotPromise = null; }, 0);
    });
    return snapshotPromise;
  }

  function messageRows(payload, roomId) {
    var raw = payload && payload.messages;
    var rows = Array.isArray(raw) ? raw : Object.values(raw || {});
    return rows.filter(function (message) {
      return message && !message.deleted && String(message.room || "global") === String(roomId || "global");
    }).map(function (message, index) {
      var attachment = message.attachment || null;
      return {
        id: String(message.id || message.firebaseKey || index),
        authorId: String(message.userId || ""),
        text: String(message.text || message.body || message.message || ""),
        createdAt: Number(message.time || message.createdAt || message.updatedAt || Date.now()),
        editedAt: Number(message.editedAt || 0),
        replyTo: message.replyTo || null,
        attachments: attachment ? [attachment] : (Array.isArray(message.attachments) ? message.attachments : [])
      };
    }).sort(function (left, right) { return left.createdAt - right.createdAt; });
  }

  function channelsFrom(payload) {
    var me = payload.account;
    var profiles = payload.profiles || {};
    var channels = [{ id: "global", name: "general", kind: "server", createdAt: 0 }];
    Object.values(payload.rooms || {}).forEach(function (room) {
      if (!room || String(room.id || "") === "global") return;
      var members = roomMembers(room);
      var otherId = members.find(function (id) { return String(id) !== String(me.id); }) || "";
      var other = cleanUser(profiles[otherId] || { id: otherId, username: room.name || "Conversation" });
      channels.push({
        id: String(room.id),
        name: other.displayName,
        kind: "dm",
        recipientId: other.id,
        members: members,
        createdAt: Number(room.createdAt || room.updatedAt || 0),
        updatedAt: Number(room.updatedAt || 0),
        backend: "neo"
      });
    });
    return channels;
  }

  function settingsKey() {
    var active = activeAccount();
    return SETTINGS_PREFIX + String(active && active.user && active.user.id || "guest");
  }

  function readKey() {
    var active = activeAccount();
    return READ_PREFIX + String(active && active.user && active.user.id || "guest");
  }

  function bodyOf(options) {
    if (!options || options.body == null) return {};
    if (typeof options.body === "string") {
      try { return JSON.parse(options.body); } catch (error) { return {}; }
    }
    return options.body;
  }

  function clientId() {
    if (crypto && typeof crypto.randomUUID === "function") return "neo_" + crypto.randomUUID().replace(/-/g, "");
    return "neo_" + Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function dataBase64(value) {
    var source = String(value || "");
    var comma = source.indexOf(",");
    return comma >= 0 ? source.slice(comma + 1) : source;
  }

  async function sendMessage(roomId, body) {
    var active = activeAccount();
    if (!active) throw Object.assign(new Error("Sign in to send messages."), { status: 401 });
    var attachment = Array.isArray(body.attachments) ? body.attachments[0] : null;
    if (attachment && attachment.data && transport.upload) {
      attachment = await transport.upload(active.token, {
        name: attachment.name,
        type: attachment.type,
        size: attachment.size,
        dataBase64: dataBase64(attachment.data)
      });
    }
    var payload = await transport.send(active.token, String(body.text || ""), roomId, clientId(), attachment || null);
    snapshotPromise = null;
    var message = payload && payload.message || {};
    return { message: {
      id: String(message.id || message.firebaseKey || clientId()),
      authorId: String(message.userId || active.user.id),
      text: String(message.text || body.text || ""),
      createdAt: Number(message.time || message.createdAt || Date.now()),
      replyTo: body.replyTo || null,
      attachments: attachment ? [attachment] : []
    } };
  }

  async function editMessage(messageId, body) {
    var active = activeAccount();
    if (!active) throw Object.assign(new Error("Sign in to edit messages."), { status: 401 });
    if (!transport.edit) throw new Error("Message editing is unavailable in this NEO build.");
    var payload = await transport.edit(active.token, String(messageId || ""), String(body.text || ""));
    snapshotPromise = null;
    var message = payload && payload.message || {};
    var attachment = message.attachment || null;
    return { message: {
      id: String(message.id || messageId),
      authorId: String(message.userId || active.user.id),
      text: String(message.text || ""),
      createdAt: Number(message.time || message.createdAt || Date.now()),
      editedAt: Number(message.editedAt || Date.now()),
      replyTo: message.replyTo || null,
      attachments: attachment ? [attachment] : (Array.isArray(message.attachments) ? message.attachments : [])
    } };
  }

  async function deleteMessage(messageId) {
    var active = activeAccount();
    if (!active) throw Object.assign(new Error("Sign in to delete messages."), { status: 401 });
    if (!transport.remove) throw new Error("Message deletion is unavailable in this NEO build.");
    var payload = await transport.remove(active.token, String(messageId || ""));
    snapshotPromise = null;
    return { id: String(payload && payload.id || messageId), roomId: String(payload && payload.roomId || ""), deleted: true };
  }

  async function api(path, options) {
    options = options || {};
    var method = String(options.method || "GET").toUpperCase();
    var body = bodyOf(options);
    var active = activeAccount();
    var match;

    if (path === "/api/auth/me" && method === "GET") {
      if (!active) throw Object.assign(new Error("Not logged in"), { status: 401 });
      var resumed = await transport.resume(active.token);
      var user = cleanUser(resumed && resumed.user || active.user);
      announceAccount(user);
      return { user: user, transport: resumed && resumed.transport || active.transport };
    }
    if (/^\/api\/auth\/(login|register)$/.test(path) && method === "POST") {
      var register = path.endsWith("/register");
      var auth = register
        ? await transport.createProfile(body.username, body.password, undefined, clientId())
        : await transport.login(body.username, body.password);
      saveAccount(auth);
      return { user: cleanUser(auth.user), transport: auth.transport };
    }
    if (path === "/api/auth/logout" && method === "POST") {
      if (active) await Promise.resolve(transport.signOut(active.token)).catch(function () {});
      clearAccount();
      return { signedOut: true };
    }

    var payload = await snapshot(method !== "GET");
    var profiles = Object.values(payload.profiles || {}).map(cleanUser).filter(function (user) { return user.id; });

    if (path === "/api/members") return { members: profiles };
    if (path === "/api/dm" && method === "GET") return { channels: channelsFrom(payload) };
    if (path === "/api/dm" && method === "POST") {
      var created = await transport.createRoom(active.token, body.username || body.userId || body.recipientId);
      snapshotPromise = null;
      var room = created && created.room || {};
      var other = profiles.find(function (user) { return user.username.toLowerCase() === String(body.username || "").toLowerCase() || user.id === body.userId; });
      return { channel: {
        id: String(room.id || ""), name: other ? other.displayName : String(body.username || "Conversation"), kind: "dm",
        recipientId: other ? other.id : "", members: roomMembers(room), backend: "neo", createdAt: Number(room.createdAt || Date.now())
      } };
    }
    if (path === "/api/friends") {
      return { friends: profiles.filter(function (user) { return user.id !== payload.account.id && user.id !== "neo_system"; }).map(function (user) {
        return { id: "friend:" + user.id, state: "friends", user: user };
      }) };
    }
    if (path === "/api/me/settings" && method === "GET") return { settings: readJson(settingsKey(), {}) };
    if (path === "/api/me/settings" && method === "PATCH") {
      var settings = Object.assign({}, readJson(settingsKey(), {}), body);
      writeJson(settingsKey(), settings);
      return { settings: settings };
    }
    if (path === "/api/unread") return { unread: readJson(readKey(), {}) };
    if ((match = path.match(/^\/api\/channels\/([^/]+)\/read$/)) && method === "POST") {
      var read = readJson(readKey(), {});
      read[decodeURIComponent(match[1])] = Date.now();
      writeJson(readKey(), read);
      return { ok: true };
    }
    if ((match = path.match(/^\/api\/channels\/([^/]+)\/messages$/))) {
      var roomId = decodeURIComponent(match[1]);
      if (method === "POST") return sendMessage(roomId, body);
      return { messages: messageRows(payload, roomId) };
    }
    if ((match = path.match(/^\/api\/messages\/([^/]+)$/))) {
      var messageId = decodeURIComponent(match[1]);
      if (method === "PATCH") return editMessage(messageId, body);
      if (method === "DELETE") return deleteMessage(messageId);
    }
    if (path === "/api/users/me" && method === "PATCH") {
      var updated = Object.assign({}, payload.account, { displayName: String(body.displayName || payload.account.displayName) });
      return { user: updated };
    }
    if (/^\/api\/friends\/requests/.test(path)) return { ok: true };
    throw Object.assign(new Error("That NEO Chat action is unavailable."), { status: 404 });
  }

  function applyAccent() {
    var value = getComputedStyle(document.documentElement).getPropertyValue("--desktop-accent").trim();
    if (!value) return;
    var probe = document.createElement("span");
    probe.style.color = value;
    document.body.appendChild(probe);
    var rgb = getComputedStyle(probe).color.match(/[\d.]+/g);
    probe.remove();
    if (rgb && rgb.length >= 3) {
      var channels = rgb.slice(0, 3).map(Number);
      var maximum = Math.max.apply(Math, channels);
      var minimum = Math.min.apply(Math, channels);
      var saturation = maximum ? (maximum - minimum) / maximum : 0;
      var themeLuminance = (channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722) / 255;

      // A white, black, or nearly neutral desktop accent cannot identify selected
      // conversations reliably. Keep the theme surfaces, but use Messages blue for
      // interactive Chat states so avatars and labels always retain contrast.
      if (themeLuminance > 0.82 || themeLuminance < 0.14 || saturation < 0.16) {
        value = "#0a84ff";
        channels = [10, 132, 255];
      }

      document.documentElement.style.setProperty("--accent", value);
      document.documentElement.style.setProperty("--messages-blue", value);
      document.documentElement.style.setProperty("--accent-rgb", channels.join(", "));
      var luminance = (channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722) / 255;
      document.documentElement.style.setProperty("--accent-contrast", luminance > 0.62 ? "#08090b" : "#ffffff");
    }
  }

  window.addEventListener("neo-theme-change", applyAccent);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", applyAccent, { once: true });
  else applyAccent();

  window.addEventListener("storage", function (event) {
    if (event.key === "ugp_token" || event.key === "ugp_session") location.reload();
  });

  window.NEO_CHAT_BRIDGE = Object.freeze({ api: api, mode: "neo", active: activeAccount });
})();
