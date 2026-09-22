(function () {
  "use strict";

  var LOCAL_STATE_KEY = "neo_chat_local_state_v2";
  var SAVED_ACCOUNTS_KEY = "neo_chat_saved_accounts_v1";
  var MAX_MESSAGES = 240;
  var SLOW_MODE_MS = 5000;
  var BRIDGE_READY_TIMEOUT_MS = 2400;
  var BRIDGE_REQUEST_TIMEOUT_MS = 10000;
  var bridgeCandidate = false;
  var bridgeHostExpected = false;
  var bridgeReady = false;
  var bridgeUnavailable = false;
  var bridgeOrigin = "";
  var bridgeWaiters = [];
  var bridgeRequests = new Map();
  var memoryActiveAccount = null;
  var memoryActiveFallback = false;
  var memorySavedAccounts = [];
  var memorySavedFallback = false;

  try { bridgeCandidate = !(window.NEO_LOCAL_CONFIG && window.NEO_LOCAL_CONFIG.enabled) && Boolean(window.parent && window.parent !== window); }
  catch (error) { bridgeCandidate = false; }

  function chatError(message, code, status, retryAfterMs) {
    var error = new Error(String(message || "NEO Chat is unavailable."));
    error.code = String(code || "chat_error");
    error.status = Number(status || 0);
    error.retryAfterMs = Number(retryAfterMs || 0);
    return error;
  }

  function abortError() {
    try { return new DOMException("The request was cancelled.", "AbortError"); }
    catch (error) {
      var fallback = new Error("The request was cancelled.");
      fallback.name = "AbortError";
      return fallback;
    }
  }

  function key(value) {
    return String(value || "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
  }

  function validatePassword(value) {
    var password = String(value || "");
    if (password.length < 8 || password.length > 72) {
      throw chatError("Use a password between 8 and 72 characters.", "invalid_password", 400);
    }
    return password;
  }

  function localPasswordHash(password, salt) {
    var left = 2166136261;
    var right = 2246822519;
    var input = String(password) + ":" + String(salt);
    for (var round = 0; round < 2048; round += 1) {
      for (var index = 0; index < input.length; index += 1) {
        left = Math.imul(left ^ input.charCodeAt(index), 16777619) >>> 0;
        right = Math.imul(right ^ (input.charCodeAt(index) + round), 3266489917) >>> 0;
      }
      input = left.toString(36) + right.toString(36) + salt;
    }
    return left.toString(16).padStart(8, "0") + right.toString(16).padStart(8, "0");
  }

  function randomId(prefix) {
    // Local profiles are device storage, not server authorization. Password
    // migration below improves at-rest hashing without claiming public auth.
    var value = "";
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      value = window.crypto.randomUUID().replace(/-/g, "");
    } else if (window.crypto && typeof window.crypto.getRandomValues === "function") {
      var bytes = new Uint32Array(4);
      window.crypto.getRandomValues(bytes);
      value = Array.from(bytes).map(function (part) { return part.toString(36); }).join("");
    } else {
      value = Date.now().toString(36) + Math.random().toString(36).slice(2);
    }
    return String(prefix || "") + value;
  }

  function cleanSavedEntry(entry) {
    var token = String(entry && entry.token || "");
    var user = entry && entry.user;
    if (!token || !user || !user.id || !user.username) return null;
    return {
      token: token,
      user: {
        id: String(user.id),
        username: String(user.username).slice(0, 40),
        avatar: String(user.avatar || ""),
        bio: String(user.bio || "").slice(0, 120),
        mood: String(user.mood || "NEO member").slice(0, 60),
        status: String(user.status || "online").slice(0, 20),
        transport: String(user.transport || entry.transport || "")
      },
      transport: String(entry.transport || user.transport || ""),
      lastUsedAt: Number(entry.lastUsedAt || Date.now())
    };
  }

  function readSavedAccounts() {
    var saved = [];
    var storageReadable = false;
    try {
      storageReadable = true;
      var parsed = JSON.parse(localStorage.getItem(SAVED_ACCOUNTS_KEY) || "[]");
      if (Array.isArray(parsed)) saved = parsed.map(cleanSavedEntry).filter(Boolean);
    } catch (error) {}
    if ((!storageReadable || memorySavedFallback) && !saved.length && memorySavedAccounts.length) saved = memorySavedAccounts.slice();
    return saved.sort(function (a, b) { return b.lastUsedAt - a.lastUsedAt; }).slice(0, 8);
  }

  function writeSavedAccounts(entries) {
    memorySavedAccounts = entries.map(cleanSavedEntry).filter(Boolean).slice(0, 8);
    try {
      localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(memorySavedAccounts));
      memorySavedFallback = false;
      return true;
    } catch (error) {
      memorySavedFallback = true;
      return false;
    }
  }

  function activateSavedAccount(entry) {
    var clean = cleanSavedEntry(entry);
    if (!clean) throw chatError("That saved profile is unavailable.", "invalid_profile", 400);
    clean.lastUsedAt = Date.now();
    var entries = readSavedAccounts().filter(function (item) {
      return item.token !== clean.token && item.user.id !== clean.user.id;
    });
    entries.unshift(clean);
    var persisted = writeSavedAccounts(entries);
    memoryActiveAccount = clean;
    try {
      localStorage.setItem("ugp_token", clean.token);
      localStorage.setItem("ugp_session", JSON.stringify(clean.user));
    } catch (error) { persisted = false; }
    memoryActiveFallback = !persisted;
    return { entry: clean, persisted: persisted };
  }

  function readActiveAccount() {
    var token = "";
    var user = null;
    var storageReadable = false;
    try {
      storageReadable = true;
      token = localStorage.getItem("ugp_token") || "";
      user = JSON.parse(localStorage.getItem("ugp_session") || "null");
    } catch (error) {}
    if (token.indexOf("static-firebase:") === 0) {
      try { localStorage.removeItem("ugp_token"); localStorage.removeItem("ugp_session"); } catch (error) {}
      token = "";
      user = null;
    }
    if (token && (!user || !user.id || !user.username)) {
      var saved = readSavedAccounts().find(function (entry) { return entry.token === token; });
      if (saved) user = saved.user;
    }
    var active = cleanSavedEntry({ token: token, user: user, transport: user && user.transport });
    return active || ((!storageReadable || memoryActiveFallback) ? memoryActiveAccount : null);
  }

  function clearActiveAccount() {
    memoryActiveAccount = null;
    memoryActiveFallback = false;
    try { localStorage.removeItem("ugp_token"); localStorage.removeItem("ugp_session"); } catch (error) {}
  }

  function forgetSavedAccount(token) {
    token = String(token || "");
    var active = readActiveAccount();
    if (active && active.token === token) clearActiveAccount();
    writeSavedAccounts(readSavedAccounts().filter(function (entry) { return entry.token !== token; }));
  }

  window.NEO_ACCOUNT_STORE = Object.freeze({
    list: readSavedAccounts,
    active: readActiveAccount,
    save: function (token, user, transport) { return activateSavedAccount({ token: token, user: user, transport: transport }); },
    activate: activateSavedAccount,
    clearActive: clearActiveAccount,
    forget: forgetSavedAccount
  });

  function hasDirectCloud() {
    if (window.NEO_LOCAL_CONFIG && window.NEO_LOCAL_CONFIG.enabled) return false;
    return Boolean(window.google && window.google.script && window.google.script.run);
  }

  function isTrustedBridgeOrigin(origin) {
    try {
      var url = new URL(String(origin || ""));
      return url.protocol === "https:" && (
        url.hostname === "script.google.com" ||
        url.hostname === "script.googleusercontent.com" ||
        /\.googleusercontent\.com$/i.test(url.hostname)
      );
    } catch (error) {
      return false;
    }
  }

  function isCloudAvailable() {
    return hasDirectCloud() || bridgeReady;
  }

  try { bridgeHostExpected = isTrustedBridgeOrigin(document.referrer); }
  catch (error) { bridgeHostExpected = false; }

  function hasCloudRoute() {
    return isCloudAvailable() || (bridgeCandidate && (!bridgeUnavailable || bridgeHostExpected));
  }

  function mode() {
    return hasCloudRoute() ? "cloud" : "local";
  }

  function finishBridgeRequest(id, callback, value) {
    var pending = bridgeRequests.get(id);
    if (!pending) return;
    bridgeRequests.delete(id);
    window.clearTimeout(pending.timeout);
    if (pending.signal) pending.signal.removeEventListener("abort", pending.onAbort);
    callback(value);
  }

  function receiveBridgeMessage(event) {
    if (!bridgeCandidate || event.source !== window.parent || !isTrustedBridgeOrigin(event.origin)) return;
    var data = event.data;
    if (!data || typeof data !== "object") return;
    if (data.type === "neo-chat:bridge-ready") {
      bridgeOrigin = event.origin;
      bridgeReady = true;
      bridgeUnavailable = false;
      bridgeWaiters.splice(0).forEach(function (notify) { notify(true); });
      return;
    }
    if (data.type !== "neo-chat:response" || event.origin !== bridgeOrigin) return;
    var id = String(data.id || "");
    var pending = bridgeRequests.get(id);
    if (!pending) return;
    var result = data.result;
    if (!result || result.ok !== true) {
      var detail = result && result.error || {};
      finishBridgeRequest(id, pending.reject, chatError(
        detail.message || "NEO Chat could not complete that request.",
        detail.code,
        detail.status,
        detail.retryAfterMs
      ));
      return;
    }
    finishBridgeRequest(id, pending.resolve, result.data);
  }

  function announceBridge() {
    if (!bridgeCandidate || bridgeReady || bridgeUnavailable) return;
    try { window.parent.postMessage({ type: "neo-chat:bridge-hello" }, "*"); }
    catch (error) {}
  }

  function waitForBridge(signal) {
    if (bridgeReady) return Promise.resolve(true);
    if (!bridgeCandidate || bridgeUnavailable) return Promise.resolve(false);
    return new Promise(function (resolve, reject) {
      var settled = false;
      var timeout = window.setTimeout(function () {
        bridgeUnavailable = true;
        finish(false);
      }, BRIDGE_READY_TIMEOUT_MS);
      function onAbort() {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        bridgeWaiters = bridgeWaiters.filter(function (notify) { return notify !== onReady; });
        if (signal) signal.removeEventListener("abort", onAbort);
        reject(abortError());
      }
      function finish(value) {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        bridgeWaiters = bridgeWaiters.filter(function (notify) { return notify !== onReady; });
        if (signal) signal.removeEventListener("abort", onAbort);
        resolve(value);
      }
      function onReady() { finish(true); }
      if (signal && signal.aborted) { onAbort(); return; }
      if (signal) signal.addEventListener("abort", onAbort, { once: true });
      bridgeWaiters.push(onReady);
      announceBridge();
    });
  }

  if (bridgeCandidate) {
    window.addEventListener("message", receiveBridgeMessage);
    window.setTimeout(announceBridge, 0);
    window.setTimeout(announceBridge, 300);
    window.setTimeout(announceBridge, 1000);
  }

  function parseLocalState() {
    var state;
    try { state = JSON.parse(localStorage.getItem(LOCAL_STATE_KEY) || "null"); }
    catch (error) { state = null; }
    if (!state || typeof state !== "object" || Array.isArray(state)) state = {};
    if (!state.accounts || typeof state.accounts !== "object") state.accounts = {};
    if (!state.sessions || typeof state.sessions !== "object") state.sessions = {};
    if (!state.rooms || typeof state.rooms !== "object") state.rooms = {};
    if (!Array.isArray(state.messages)) state.messages = [];
    var hadLegacyWelcome = Boolean(state.accounts.neo_system) || state.messages.some(function (message) {
      return message && String(message.id || "") === "neo_welcome";
    });
    state.messages = state.messages.filter(function (message) {
      return message && String(message.id || "") !== "neo_welcome";
    });
    delete state.accounts.neo_system;
    if (hadLegacyWelcome) {
      try { localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(state)); }
      catch (error) {}
    }
    return state;
  }

  function writeLocalState(state) {
    state.messages = state.messages.slice(-MAX_MESSAGES);
    state.updatedAt = Date.now();
    localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(state));
    if (window.dispatchEvent && typeof CustomEvent === 'function') window.dispatchEvent(new CustomEvent('neo-chat-local-changed'));
  }

  function publicAccount(account) {
    return {
      id: String(account && account.id || ""),
      username: String(account && account.username || "Member").slice(0, 40),
      avatar: String(account && account.avatar || ""),
      bio: String(account && account.bio || "").slice(0, 120),
      mood: String(account && account.mood || "NEO member").slice(0, 60),
      status: String(account && account.status || "online").slice(0, 20)
    };
  }

  function localSession(state, token) {
    var userId = String(state.sessions[String(token || "")] || "");
    var account = state.accounts[userId];
    if (!userId || !account) throw chatError("This device session has expired. Create your profile again.", "session_expired", 401);
    return account;
  }

  async function devicePasswordHash(password, salt) {
    if (!window.crypto?.subtle) throw chatError('Device profiles require HTTPS or a loopback local server. Guest mode remains available.','secure_context_required',400);
    var encoder = new TextEncoder();
    var material = await window.crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
    var result = await window.crypto.subtle.deriveBits({name:'PBKDF2',salt:encoder.encode(salt),iterations:600000,hash:'SHA-256'},material,256);
    return Array.from(new Uint8Array(result)).map(function(b){return b.toString(16).padStart(2,'0');}).join('');
  }

  async function localCreateProfile(request) {
    var username = String(request && request.username || "").trim();
    var password = validatePassword(request && request.password);
    if (!/^[A-Za-z0-9_]{3,24}$/.test(username)) {
      throw chatError("Use 3-24 letters, numbers, or underscores.", "invalid_username", 400);
    }
    var state = parseLocalState();
    var usernameKey = key(username);
    var account = Object.values(state.accounts).find(function (candidate) {
      return candidate && candidate.usernameKey === usernameKey;
    });
    if (account) throw chatError("That handle already exists on this device. Choose it above or use another.", "username_taken", 409);
    account = {
      id: randomId("u_"),
      username: username,
      usernameKey: usernameKey,
      bio: "NEO member",
      mood: "On-device fallback",
      status: "online",
      createdAt: Date.now(),
      lastSentAt: 0
    };
    account.passwordSalt = randomId("salt_");
    account.passwordHash = await devicePasswordHash(password, account.passwordSalt);
    account.passwordAlgorithm = 'pbkdf2-sha256-600000';
    // Derivation is asynchronous; merge the latest state rather than overwriting
    // messages or another account created while the derivation was in progress.
    state = parseLocalState();
    if (Object.values(state.accounts).some(function(a){return a.usernameKey===usernameKey;})) throw chatError('That handle already exists on this device.','username_taken',409);
    state.accounts[account.id] = account;
    var token = randomId("local_");
    state.sessions[token] = account.id;
    writeLocalState(state);
    return { token: token, user: publicAccount(account), transport: "local" };
  }

  async function localLogin(request) {
    var username = String(request && request.username || "").trim();
    var password = validatePassword(request && request.password);
    var state = parseLocalState();
    var usernameKey = key(username);
    var account = Object.values(state.accounts).find(function (candidate) {
      return candidate && candidate.usernameKey === usernameKey;
    });
    var hash = account ? (account.passwordAlgorithm === 'pbkdf2-sha256-600000' ? await devicePasswordHash(password, account.passwordSalt) : localPasswordHash(password, account.passwordSalt)) : '';
    var valid = account && account.passwordHash && hash === account.passwordHash;
    if (!valid) throw chatError("That username or password is incorrect.", "invalid_credentials", 401);
    if (account.passwordAlgorithm !== 'pbkdf2-sha256-600000') {
      account.passwordHash = await devicePasswordHash(password, account.passwordSalt);
      account.passwordAlgorithm = 'pbkdf2-sha256-600000';
    }
    var latest = parseLocalState();
    if (!latest.accounts[account.id]) throw chatError('That device profile no longer exists.','invalid_credentials',401);
    latest.accounts[account.id].passwordHash = account.passwordHash;
    latest.accounts[account.id].passwordAlgorithm = account.passwordAlgorithm;
    state = latest;
    var token = randomId("local_");
    state.sessions[token] = account.id;
    writeLocalState(state);
    return { token: token, user: publicAccount(account), transport: "local" };
  }

  function localState(request) {
    var state = parseLocalState();
    var account = localSession(state, request && request.token);
    var allowedRooms = {};
    var allowedIds = new Set(["global"]);
    Object.keys(state.rooms).forEach(function (roomId) {
      var room = state.rooms[roomId];
      if (!room || !Array.isArray(room.members) || room.members.indexOf(account.id) === -1) return;
      allowedRooms[roomId] = room;
      allowedIds.add(roomId);
    });
    var profiles = {};
    Object.keys(state.accounts).forEach(function (id) { profiles[id] = publicAccount(state.accounts[id]); });
    return {
      account: publicAccount(account),
      rooms: allowedRooms,
      messages: state.messages.filter(function (message) { return allowedIds.has(String(message.room || "global")); }).slice(-180),
      profiles: profiles,
      compact: Boolean(request && request.compact),
      transport: "local",
      updatedAt: Date.now()
    };
  }

  function localUpdateProfile(request) {
    var state = parseLocalState(), account = localSession(state, request.token);
    var profile = request.profile || {};
    account.bio = String(profile.bio || '').slice(0,120);
    account.mood = String(profile.mood || '').slice(0,60);
    account.status = ['online','away','busy','offline'].includes(profile.status) ? profile.status : 'online';
    if (typeof profile.avatar === 'string' && /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(profile.avatar) && profile.avatar.length < 90000) account.avatar = profile.avatar;
    writeLocalState(state);
    return {user:publicAccount(account),transport:'local'};
  }

  function localSearch(request) {
    var state = parseLocalState();
    var account = localSession(state, request && request.token);
    var query = String(request && request.query || "").trim().toLowerCase();
    var exact = Boolean(request && request.exact);
    var users = Object.values(state.accounts).filter(function (candidate) {
      if (!candidate || candidate.id === account.id || candidate.id === "neo_system") return false;
      var name = String(candidate.username || "").toLowerCase();
      return exact ? name === query : name.indexOf(query) === 0;
    }).slice(0, exact ? 1 : 20).map(publicAccount);
    return { users: users, transport: "local" };
  }

  function localCreateRoom(request) {
    var state = parseLocalState();
    var account = localSession(state, request && request.token);
    var targetKey = key(request && request.username);
    var target = Object.values(state.accounts).find(function (candidate) {
      return candidate && (candidate.id === request.username || candidate.usernameKey === targetKey);
    });
    if (!target || target.id === "neo_system") throw chatError("That profile is unavailable on this device.", "user_not_found", 404);
    if (target.id === account.id) throw chatError("Choose another profile.", "self_message", 400);
    var members = [account.id, target.id].sort();
    var existing = Object.values(state.rooms).find(function (room) {
      return room && room.kind === "dm" && Array.isArray(room.members) && room.members.slice().sort().join(":") === members.join(":");
    });
    if (existing) return { room: existing, created: false, transport: "local" };
    var room = { id: randomId("dm_"), kind: "dm", private: true, members: members, createdAt: Date.now(), updatedAt: Date.now() };
    state.rooms[room.id] = room;
    writeLocalState(state);
    return { room: room, created: true, transport: "local" };
  }

  function localSend(request) {
    var state = parseLocalState();
    var account = localSession(state, request && request.token);
    var text = String(request && request.text || "").trim();
    var roomId = String(request && request.roomId || "global");
    var clientId = String(request && request.clientId || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 72);
    var attachment = request && request.attachment && typeof request.attachment === "object" ? request.attachment : null;
    if (!text && !attachment) throw chatError("Type a message or add an attachment first.", "empty_message", 400);
    if (text.length > 1000) throw chatError("Messages can be up to 1,000 characters.", "message_too_large", 413);
    if (roomId !== "global") {
      var room = state.rooms[roomId];
      if (!room || !Array.isArray(room.members) || room.members.indexOf(account.id) === -1) {
        throw chatError("That conversation is unavailable.", "room_forbidden", 403);
      }
    }
    var duplicate = clientId && state.messages.find(function (message) {
      return message.clientId === clientId && message.userId === account.id;
    });
    if (duplicate) return { message: duplicate, duplicate: true, transport: "local" };
    var elapsed = Date.now() - Number(account.lastSentAt || 0);
    if (elapsed < SLOW_MODE_MS) {
      throw chatError("Slow mode is on.", "slow_mode", 429, SLOW_MODE_MS - elapsed);
    }
    var message = {
      id: randomId("m_"),
      clientId: clientId,
      room: roomId,
      userId: account.id,
      user: account.username,
      text: text,
      attachment: attachment,
      time: Date.now()
    };
    account.lastSentAt = message.time;
    state.messages.push(message);
    if (state.rooms[roomId]) state.rooms[roomId].updatedAt = message.time;
    writeLocalState(state);
    return { message: message, transport: "local" };
  }

  function localEditMessage(request) {
    var state = parseLocalState();
    var account = localSession(state, request && request.token);
    var messageId = String(request && request.messageId || "");
    var text = String(request && request.text || "").trim();
    var message = state.messages.find(function (candidate) { return candidate && String(candidate.id || "") === messageId; });
    if (!message) throw chatError("That message could not be found.", "message_not_found", 404);
    if (String(message.userId || "") !== account.id) throw chatError("You can only edit your own messages.", "message_forbidden", 403);
    if (!text && !message.attachment) throw chatError("A message cannot be empty.", "empty_message", 400);
    if (text.length > 1000) throw chatError("Messages can be up to 1,000 characters.", "message_too_large", 413);
    message.text = text;
    message.editedAt = Date.now();
    writeLocalState(state);
    return { message: message, transport: "local" };
  }

  function localDeleteMessage(request) {
    var state = parseLocalState();
    var account = localSession(state, request && request.token);
    var messageId = String(request && request.messageId || "");
    var index = state.messages.findIndex(function (candidate) { return candidate && String(candidate.id || "") === messageId; });
    if (index < 0) throw chatError("That message could not be found.", "message_not_found", 404);
    var message = state.messages[index];
    if (String(message.userId || "") !== account.id) throw chatError("You can only delete your own messages.", "message_forbidden", 403);
    state.messages.splice(index, 1);
    writeLocalState(state);
    return { id: messageId, roomId: String(message.room || "global"), deleted: true, transport: "local" };
  }

  function localUpload(request) {
    localSession(parseLocalState(), request && request.token);
    var name = String(request && request.name || "Attachment").slice(0, 120);
    var type = String(request && request.type || "application/octet-stream").slice(0, 100);
    var size = Math.max(0, Number(request && request.size || 0));
    var dataBase64 = String(request && request.dataBase64 || "");
    if (!dataBase64 || size > 750 * 1024) throw chatError("On-device attachments can be up to 750 KB.", "attachment_too_large", 413);
    return { attachment: { name: name, type: type, size: size, url: "data:" + type + ";base64," + dataBase64 } };
  }

  function localSignOut(request) {
    var state = parseLocalState();
    if (request && request.token) delete state.sessions[String(request.token)];
    writeLocalState(state);
    return { signedOut: true, transport: "local" };
  }

  function localCall(name, payload) {
    if (name === "neoChatCreateProfile") return localCreateProfile(payload);
    if (name === "neoChatLogin") return localLogin(payload);
    if (name === "neoChatResume") return { user: publicAccount(localSession(parseLocalState(), payload && payload.token)), transport: "local" };
    if (name === "neoChatState") return localState(payload);
    if (name === "neoChatUpdateProfile") return localUpdateProfile(payload);
    if (name === "neoChatSearchUsers") return localSearch(payload);
    if (name === "neoChatCreateRoom") return localCreateRoom(payload);
    if (name === "neoChatUploadAttachment") return localUpload(payload);
    if (name === "neoChatSendMessage") return localSend(payload);
    if (name === "neoChatEditMessage") return localEditMessage(payload);
    if (name === "neoChatDeleteMessage") return localDeleteMessage(payload);
    if (name === "neoChatSignOut") return localSignOut(payload);
    throw chatError("That NEO Chat action is unavailable.", "unknown_action", 400);
  }

  function cloudCall(name, payload, signal) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      function finish(callback, value) {
        if (settled) return;
        settled = true;
        if (signal) signal.removeEventListener("abort", onAbort);
        callback(value);
      }
      function onAbort() { finish(reject, abortError()); }
      if (signal && signal.aborted) { onAbort(); return; }
      if (signal) signal.addEventListener("abort", onAbort, { once: true });
      var runner = window.google.script.run
        .withSuccessHandler(function (result) {
          if (!result || result.ok !== true) {
            var detail = result && result.error || {};
            finish(reject, chatError(detail.message || "NEO Chat could not complete that request.", detail.code, detail.status, detail.retryAfterMs));
            return;
          }
          finish(resolve, result.data);
        })
        .withFailureHandler(function (failure) {
          finish(reject, chatError(failure && failure.message || "The NEO relay could not be reached.", "relay_unavailable", 503));
        });
      try { runner[name](payload || {}); }
      catch (error) { finish(reject, chatError(error && error.message || "The NEO relay could not start.", "relay_unavailable", 503)); }
    });
  }

  function bridgeCall(name, payload, signal) {
    return new Promise(function (resolve, reject) {
      if (!bridgeReady || !bridgeOrigin) {
        reject(chatError("The NEO relay could not be reached.", "relay_unavailable", 503));
        return;
      }
      var id = randomId("neo_chat_rpc_");
      var timeout = window.setTimeout(function () {
        var pending = bridgeRequests.get(id);
        if (pending) finishBridgeRequest(id, pending.reject, chatError("The NEO relay timed out.", "relay_unavailable", 503));
      }, BRIDGE_REQUEST_TIMEOUT_MS);
      function onAbort() {
        var pending = bridgeRequests.get(id);
        if (pending) finishBridgeRequest(id, pending.reject, abortError());
      }
      if (signal && signal.aborted) {
        window.clearTimeout(timeout);
        reject(abortError());
        return;
      }
      bridgeRequests.set(id, { resolve: resolve, reject: reject, timeout: timeout, onAbort: onAbort, signal: signal });
      if (signal) signal.addEventListener("abort", onAbort, { once: true });
      try {
        window.parent.postMessage({ type: "neo-chat:request", id: id, method: name, payload: payload || {} }, bridgeOrigin);
      } catch (error) {
        finishBridgeRequest(id, reject, chatError("The NEO relay could not start.", "relay_unavailable", 503));
      }
    });
  }

  function call(name, payload, signal) {
    if (signal && signal.aborted) return Promise.reject(abortError());
    if (hasDirectCloud()) return cloudCall(name, payload, signal);
    if (bridgeReady) return bridgeCall(name, payload, signal);
    if (bridgeCandidate && (!bridgeUnavailable || bridgeHostExpected)) {
      if (bridgeHostExpected && bridgeUnavailable) bridgeUnavailable = false;
      return waitForBridge(signal).then(function (ready) {
        if (ready) return bridgeCall(name, payload, signal);
        if (bridgeHostExpected || /^neo_/.test(String(payload && payload.token || ""))) {
          throw chatError("The shared NEO relay could not be reached. Your saved profile was kept.", "relay_unavailable", 503);
        }
        return localCall(name, payload || {});
      });
    }
    return Promise.resolve().then(function () {
      if (signal && signal.aborted) throw abortError();
      return localCall(name, payload || {});
    });
  }

  function withoutLegacyWelcome(payload) {
    if (!payload || typeof payload !== "object") return payload;
    if (Array.isArray(payload.messages)) {
      payload.messages = payload.messages.filter(function (message) {
        return message && String(message.id || "") !== "neo_welcome";
      });
    }
    if (payload.profiles && typeof payload.profiles === "object") delete payload.profiles.neo_system;
    return payload;
  }

  window.NEO_CHAT_TRANSPORT = Object.freeze({
    mode: mode,
    modeLabel: function () {
      if (isCloudAvailable()) return "Shared NEO relay";
      if (bridgeCandidate && (!bridgeUnavailable || bridgeHostExpected)) return "Connecting to NEO relay";
      return "On-device fallback";
    },
    createProfile: function (username, password, signal, requestId) {
      return call("neoChatCreateProfile", { username: username, password: password, requestId: String(requestId || "") }, signal);
    },
    login: function (username, password, signal) { return call("neoChatLogin", { username: username, password: password }, signal); },
    resume: function (token, signal) { return call("neoChatResume", { token: token }, signal); },
    updateProfile: function (token, profile, signal) { return call('neoChatUpdateProfile',{token:token,profile:profile},signal); },
    state: function (token, compact, signal) {
      return call("neoChatState", { token: token, compact: Boolean(compact) }, signal).then(withoutLegacyWelcome);
    },
    search: function (token, query, exact, signal) { return call("neoChatSearchUsers", { token: token, query: query, exact: Boolean(exact) }, signal); },
    createRoom: function (token, username, signal) { return call("neoChatCreateRoom", { token: token, username: username }, signal); },
    upload: function (token, attachment, signal) { return call("neoChatUploadAttachment", { token: token, name: attachment.name, type: attachment.type, size: attachment.size, dataBase64: attachment.dataBase64 }, signal).then(function (payload) { return payload && payload.attachment || null; }); },
    send: function (token, text, roomId, clientId, attachment, signal) { return call("neoChatSendMessage", { token: token, text: text, roomId: roomId, clientId: clientId, attachment: attachment || null }, signal); },
    edit: function (token, messageId, text, signal) { return call("neoChatEditMessage", { token: token, messageId: messageId, text: text }, signal); },
    remove: function (token, messageId, signal) { return call("neoChatDeleteMessage", { token: token, messageId: messageId }, signal); },
    signOut: function (token, signal) { return call("neoChatSignOut", { token: token }, signal); }
  });
})();
