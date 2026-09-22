function doGet(event) {
  var launch = event && event.parameter ? String(event.parameter.launch || '').toLowerCase() : '';
  if (launch === 'cdn') return neoOsCdnLauncher_();

  var format = event && event.parameter ? String(event.parameter.format || '').toLowerCase() : '';
  if (format === 'js') return neoOsJavaScriptLoader_();

  var template = HtmlService.createTemplateFromFile('Index');
  var query = event && event.queryString ? String(event.queryString) : '';
  var startValue = event && event.parameter ? String(event.parameter.startNeo || '') : '';
  template.launchMode = startValue === '1' || /(?:^|&)startNeo=1(?:&|$)/.test(query);

  return template.evaluate()
    .setTitle('NEO OS')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function neoOsCdnLauncher_() {
  var loaderUrl = 'https://fastly.jsdelivr.net/npm/@c8rter_09/neo-os-desktop@1.0.3/cdn-loader.js';
  var html = [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">',
    '  <title>NEO OS</title>',
    '  <style>html,body{width:100%;height:100%;margin:0;overflow:hidden;background:#05070b}</style>',
    '</head>',
    '<body>',
    '  <script src="' + loaderUrl + '"></' + 'script>',
    '</body>',
    '</html>'
  ].join('\n');

  return HtmlService.createHtmlOutput(html)
    .setTitle('NEO OS')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function neoOsJavaScriptLoader_() {
  var target = 'https://neo-os-desktop-20260908.web.app/';
  var source = [
    '(function () {',
    "  'use strict';",
    '  var target = ' + JSON.stringify(target) + ';',
    '  if (window.location.href !== target) window.location.replace(target);',
    '}());'
  ].join('\n');

  return ContentService.createTextOutput(source)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function neoNetworkFetch(request) {
  request = request || {};
  var target = validateNeoNetworkUrl_(String(request.url || ''));
  var method = String(request.method || 'GET').toLowerCase();
  if (['get', 'post', 'put', 'patch', 'delete'].indexOf(method) === -1) {
    throw new Error('This request method is not supported.');
  }

  var headers = sanitizeNeoNetworkHeaders_(request.headers || {});
  var options = {
    method: method,
    headers: headers,
    muteHttpExceptions: true,
    followRedirects: false,
    validateHttpsCertificates: true
  };
  if (method !== 'get' && request.bodyBase64) {
    options.payload = Utilities.base64Decode(String(request.bodyBase64));
  }

  var response;
  for (var redirect = 0; redirect < 5; redirect += 1) {
    response = UrlFetchApp.fetch(target, options);
    var status = response.getResponseCode();
    var responseHeaders = response.getAllHeaders();
    var location = responseHeaders.Location || responseHeaders.location;
    if (status < 300 || status >= 400 || !location) break;
    target = validateNeoNetworkUrl_(resolveNeoNetworkUrl_(target, String(location)));
    if (status === 303 || ((status === 301 || status === 302) && method === 'post')) {
      method = 'get';
      options.method = 'get';
      delete options.payload;
    }
  }

  var blob = response.getBlob();
  var bytes = blob.getBytes();
  if (bytes.length > 6 * 1024 * 1024) {
    throw new Error('The network response is too large. Use a ranged request.');
  }

  return {
    status: response.getResponseCode(),
    statusText: '',
    headers: normalizeNeoNetworkHeaders_(response.getAllHeaders()),
    bodyBase64: Utilities.base64Encode(bytes),
    url: target
  };
}

function validateNeoNetworkUrl_(value) {
  var match = String(value || '').match(/^https:\/\/([^\/?#]+)(\/[^?#]*)?(?:[?#]|$)/i);
  if (!match) throw new Error('Only approved HTTPS requests are supported.');
  var host = match[1].toLowerCase().replace(/:\d+$/, '');
  var path = (match[2] || '/').replace(/\/+$/, '') || '/';

  var allowed = false;
  if (host === 'vcsa.huangqirui.xyz') {
    allowed = path === '/api/music/search' || /^\/api\/yt\/astream\/[A-Za-z0-9_-]+$/.test(path);
  } else if (host === 'gd-proxy.gmdc.workers.dev') {
    allowed = [
      '/getGJLevels21.php',
      '/downloadGJLevel22.php',
      '/getGJSongInfo.php',
      '/audio-proxy'
    ].indexOf(path) !== -1;
  } else if (host === 'fetchsongid.lasokar.workers.dev') {
    allowed = path === '/';
  } else if (host === 'api.stratus.lol') {
    allowed = [
      '/cloud/v1/createSession',
      '/cloud/v1/getQueue',
      '/cloud/v1/startGame',
      '/cloud/v1/pingSession',
      '/cloud/v1/quitSession'
    ].indexOf(path) !== -1;
  }

  if (!allowed) throw new Error('This network destination is not approved.');
  return value;
}

function sanitizeNeoNetworkHeaders_(input) {
  var allowed = ['accept', 'accept-language', 'authorization', 'content-type', 'range', 'x-api-key'];
  var output = {};
  Object.keys(input || {}).forEach(function (key) {
    var normalized = String(key || '').toLowerCase();
    if (allowed.indexOf(normalized) !== -1) output[normalized] = String(input[key]);
  });
  return output;
}

function normalizeNeoNetworkHeaders_(input) {
  var output = {};
  Object.keys(input || {}).forEach(function (key) {
    var value = input[key];
    output[String(key).toLowerCase()] = Array.isArray(value) ? value.join(', ') : String(value);
  });
  return output;
}

function resolveNeoNetworkUrl_(base, location) {
  if (/^https:\/\//i.test(location)) return location;
  var root = String(base).match(/^(https:\/\/[^/]+)/i);
  if (!root) throw new Error('The redirect target is invalid.');
  if (location.charAt(0) === '/') return root[1] + location;
  return String(base).replace(/[^/]*(?:[?#].*)?$/, '') + location;
}

/*
 * NEO Chat relay
 *
 * Accounts use unique public handles and salted, server-peppered password
 * verifiers. Sessions are opaque random tokens whose hashes are stored
 * server-side. Passwords and raw session tokens are never persisted.
 */
var NEO_CHAT_STORE_VERSION_ = 'v1';
var NEO_CHAT_SESSION_TTL_ = 30 * 24 * 60 * 60 * 1000;
var NEO_CHAT_PASSWORD_ITERATIONS_ = 3000;
var NEO_CHAT_MAX_LOGIN_ATTEMPTS_ = 5;
var NEO_CHAT_LOGIN_LOCK_MS_ = 10 * 60 * 1000;
var NEO_CHAT_SLOW_MODE_ = 5000;
var NEO_CHAT_MAX_MESSAGES_ = 240;
var NEO_CHAT_STORE_CHUNK_BYTES_ = 7000;
var NEO_CHAT_STORE_TOTAL_BYTES_ = 430000;
var NEO_CHAT_MESSAGE_STORE_BYTES_ = 220000;
var NEO_CHAT_PROPERTY_SNAPSHOT_ = null;

function neoChatCreateProfile(request) {
  return neoChatResult_(function () {
    var username = String(request && request.username || '').trim();
    var password = neoChatValidatePassword_(request && request.password);
    var requestId = String(request && request.requestId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 96);
    if (!/^[A-Za-z0-9_]{3,24}$/.test(username)) {
      throw neoChatError_('Use 3-24 letters, numbers, or underscores.', 'invalid_username', 400);
    }
    if (requestId && !/^create_[a-zA-Z0-9_-]{12,88}$/.test(requestId)) {
      throw neoChatError_('That profile request is invalid.', 'invalid_request', 400);
    }
    return neoChatWithLock_(function () {
      var accounts = neoChatReadStore_('accounts', {});
      var usernameKey = username.toLowerCase();
      var requestHash = requestId ? neoChatTokenHash_(requestId) : '';
      var prior = requestHash ? Object.keys(accounts).map(function (id) { return accounts[id]; }).filter(function (account) {
        return account && account.creationRequestHash === requestHash;
      })[0] : null;
      var now = Date.now();
      var sessions = neoChatReadStore_('sessions', {});
      neoChatPruneSessions_(sessions, now);
      if (prior) {
        if (String(prior.usernameKey || '') !== usernameKey) {
          throw neoChatError_('That profile request belongs to another handle.', 'request_conflict', 409);
        }
        if (!neoChatVerifyPassword_(password, prior)) {
          throw neoChatError_('That username or password is incorrect.', 'invalid_credentials', 401);
        }
        var replayToken = neoChatProfileToken_(requestId, prior.id);
        sessions[neoChatTokenHash_(replayToken)] = { userId: prior.id, createdAt: Number(prior.createdAt || now), expiresAt: now + NEO_CHAT_SESSION_TTL_ };
        neoChatWriteStore_('sessions', sessions);
        neoChatRemoveLegacyWelcome_();
        return { token: replayToken, user: neoChatPublicAccount_(prior), transport: 'cloud', resumedCreation: true };
      }
      var taken = Object.keys(accounts).some(function (id) {
        return accounts[id] && String(accounts[id].usernameKey || '').toLowerCase() === usernameKey;
      });
      if (taken) throw neoChatError_('That handle is already in use. Choose another.', 'username_taken', 409);
      var account = {
        id: neoChatId_('u_'),
        username: username,
        usernameKey: usernameKey,
        creationRequestHash: requestHash,
        bio: 'NEO member',
        mood: 'Online',
        status: 'online',
        createdAt: now,
        lastSentAt: 0
      };
      var passwordRecord = neoChatPasswordRecord_(password);
      account.passwordSalt = passwordRecord.salt;
      account.passwordHash = passwordRecord.hash;
      account.passwordIterations = passwordRecord.iterations;
      accounts[account.id] = account;
      var token = requestId ? neoChatProfileToken_(requestId, account.id) : neoChatToken_();
      sessions[neoChatTokenHash_(token)] = { userId: account.id, createdAt: now, expiresAt: now + NEO_CHAT_SESSION_TTL_ };
      neoChatWriteStore_('accounts', accounts);
      neoChatWriteStore_('sessions', sessions);
      neoChatRemoveLegacyWelcome_();
      return { token: token, user: neoChatPublicAccount_(account), transport: 'cloud' };
    });
  });
}

function neoChatLogin(request) {
  return neoChatResult_(function () {
    var username = String(request && request.username || '').trim();
    var password = neoChatValidatePassword_(request && request.password);
    if (!/^[A-Za-z0-9_]{3,24}$/.test(username)) {
      throw neoChatError_('That username or password is incorrect.', 'invalid_credentials', 401);
    }
    return neoChatWithLock_(function () {
      var usernameKey = username.toLowerCase();
      var attempts = neoChatReadStore_('login_attempts', {});
      var attempt = attempts[usernameKey] || { count: 0, blockedUntil: 0 };
      var now = Date.now();
      if (Number(attempt.blockedUntil || 0) > now) {
        throw neoChatError_('Too many sign-in attempts. Try again in a few minutes.', 'login_locked', 429, Number(attempt.blockedUntil) - now);
      }
      var accounts = neoChatReadStore_('accounts', {});
      var account = Object.keys(accounts).map(function (id) { return accounts[id]; }).filter(function (candidate) {
        return candidate && String(candidate.usernameKey || '').toLowerCase() === usernameKey;
      })[0];
      var valid = account && account.passwordHash && neoChatVerifyPassword_(password, account);
      if (!valid) {
        if (!account) neoChatPasswordHash_(password, 'missing-account-salt', NEO_CHAT_PASSWORD_ITERATIONS_);
        attempt.count = Number(attempt.count || 0) + 1;
        attempt.blockedUntil = attempt.count >= NEO_CHAT_MAX_LOGIN_ATTEMPTS_ ? now + NEO_CHAT_LOGIN_LOCK_MS_ : 0;
        attempts[usernameKey] = attempt;
        neoChatWriteStore_('login_attempts', attempts);
        if (account && !account.passwordHash) {
          throw neoChatError_('This older profile needs to be opened from a saved device before a password can be added.', 'password_upgrade_required', 409);
        }
        throw neoChatError_('That username or password is incorrect.', 'invalid_credentials', 401);
      }
      delete attempts[usernameKey];
      var sessions = neoChatReadStore_('sessions', {});
      neoChatPruneSessions_(sessions, now);
      var token = neoChatToken_();
      sessions[neoChatTokenHash_(token)] = { userId: account.id, createdAt: now, expiresAt: now + NEO_CHAT_SESSION_TTL_ };
      account.lastLoginAt = now;
      account.status = 'online';
      accounts[account.id] = account;
      neoChatWriteStore_('login_attempts', attempts);
      neoChatWriteStore_('sessions', sessions);
      neoChatWriteStore_('accounts', accounts);
      neoChatRemoveLegacyWelcome_();
      return { token: token, user: neoChatPublicAccount_(account), transport: 'cloud' };
    });
  });
}

function neoChatResume(request) {
  return neoChatResult_(function () {
    return neoChatWithLock_(function () {
      var auth = neoChatAuthenticate_(request && request.token);
      return { user: neoChatPublicAccount_(auth.account), transport: 'cloud' };
    });
  });
}

function neoChatState(request) {
  return neoChatResult_(function () {
    return neoChatWithLock_(function () {
    var auth = neoChatAuthenticate_(request && request.token);
    var accounts = auth.accounts;
    var rooms = neoChatReadStore_('rooms', {});
    var visibleRooms = {};
    var allowed = { global: true };
    Object.keys(rooms).forEach(function (roomId) {
      var room = rooms[roomId];
      if (!room) return;
      var members = Array.isArray(room.members) ? room.members : [];
      var kind = String(room.kind || room.type || '').toLowerCase();
      var isPublic = room.private !== true && (kind === 'public' || kind === 'server' || kind === 'channel');
      if (!isPublic && members.indexOf(auth.account.id) === -1) return;
      visibleRooms[roomId] = room;
      allowed[roomId] = true;
    });
    var messages = neoChatReadStore_('messages', []).filter(function (message) {
      return message && message.id !== 'neo_welcome' && allowed[String(message.room || 'global')];
    }).slice(-180);
    var profiles = {};
    Object.keys(accounts).forEach(function (id) {
      if (id !== 'neo_system') profiles[id] = neoChatPublicAccount_(accounts[id]);
    });
    return {
      account: neoChatPublicAccount_(auth.account),
      profiles: profiles,
      rooms: visibleRooms,
      messages: messages,
      compact: Boolean(request && request.compact),
      transport: 'cloud',
      updatedAt: Date.now()
    };
    });
  });
}

function neoChatSearchUsers(request) {
  return neoChatResult_(function () {
    var auth = neoChatAuthenticate_(request && request.token);
    var query = String(request && request.query || '').trim().toLowerCase();
    var exact = Boolean(request && request.exact);
    if (query.length < 2) return { users: [], transport: 'cloud' };
    var users = Object.keys(auth.accounts).map(function (id) { return auth.accounts[id]; }).filter(function (account) {
      if (!account || account.id === auth.account.id || account.id === 'neo_system') return false;
      var name = String(account.username || '').toLowerCase();
      return exact ? name === query : name.indexOf(query) === 0;
    }).slice(0, exact ? 1 : 20).map(neoChatPublicAccount_);
    return { users: users, transport: 'cloud' };
  });
}

function neoChatCreateRoom(request) {
  return neoChatResult_(function () {
    return neoChatWithLock_(function () {
      var auth = neoChatAuthenticate_(request && request.token);
      var identity = String(request && request.username || '').trim();
      var targetKey = identity.toLowerCase();
      var target = Object.keys(auth.accounts).map(function (id) { return auth.accounts[id]; }).filter(function (account) {
        return account && (account.id === identity || String(account.usernameKey || '').toLowerCase() === targetKey);
      })[0];
      if (!target || target.id === 'neo_system') throw neoChatError_('That profile could not be found.', 'user_not_found', 404);
      if (target.id === auth.account.id) throw neoChatError_('Choose another profile.', 'self_message', 400);
      var members = [auth.account.id, target.id].sort();
      var rooms = neoChatReadStore_('rooms', {});
      var existing = Object.keys(rooms).map(function (id) { return rooms[id]; }).filter(function (room) {
        return room && room.kind === 'dm' && Array.isArray(room.members) && room.members.slice().sort().join(':') === members.join(':');
      })[0];
      if (existing) return { room: existing, created: false, transport: 'cloud' };
      var now = Date.now();
      var room = { id: neoChatId_('dm_'), kind: 'dm', private: true, members: members, createdAt: now, updatedAt: now };
      rooms[room.id] = room;
      neoChatWriteStore_('rooms', rooms);
      return { room: room, created: true, transport: 'cloud' };
    });
  });
}

function neoChatUploadAttachment(request) {
  return neoChatResult_(function () {
    neoChatAuthenticate_(request && request.token);
    var name = String(request && request.name || 'Attachment').replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').slice(0, 120);
    var type = String(request && request.type || 'application/octet-stream').toLowerCase().slice(0, 100);
    var size = Math.max(0, Number(request && request.size || 0));
    var dataBase64 = String(request && request.dataBase64 || '');
    var allowed = /^(image|video|audio)\/[a-z0-9.+-]+$/.test(type) || /^(application\/pdf|text\/plain|application\/(zip|x-zip-compressed))$/.test(type);
    if (!allowed) throw neoChatError_('That file type is not supported.', 'attachment_type', 415);
    if (!dataBase64 || size < 1 || size > 6 * 1024 * 1024 || dataBase64.length > 8400000) throw neoChatError_('Attachments can be up to 6 MB.', 'attachment_too_large', 413);
    var bytes;
    try { bytes = Utilities.base64Decode(dataBase64); }
    catch (error) { throw neoChatError_('That attachment could not be read.', 'attachment_invalid', 400); }
    if (bytes.length !== size) size = bytes.length;
    if (size > 6 * 1024 * 1024) throw neoChatError_('Attachments can be up to 6 MB.', 'attachment_too_large', 413);
    var blob = Utilities.newBlob(bytes, type, name || 'Attachment');
    var file = DriveApp.createFile(blob);
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }
    catch (error) { try { file.setTrashed(true); } catch (cleanupError) {} throw neoChatError_('Sharing attachments is disabled for this Google account.', 'attachment_sharing_disabled', 403); }
    var id = file.getId();
    var url = 'https://drive.google.com/uc?export=download&id=' + encodeURIComponent(id);
    return { attachment: { name: name || 'Attachment', type: type, size: size, url: url, previewUrl: /^image\//.test(type) ? 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w1200' : url }, transport: 'cloud' };
  });
}

function neoChatSendMessage(request) {
  return neoChatResult_(function () {
    return neoChatWithLock_(function () {
      var auth = neoChatAuthenticate_(request && request.token);
      var text = String(request && request.text || '').trim();
      var attachment = neoChatAttachment_(request && request.attachment);
      var roomId = String(request && request.roomId || 'global');
      var clientId = String(request && request.clientId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 72);
      if (!text && !attachment) throw neoChatError_('Type a message or add an attachment first.', 'empty_message', 400);
      if (text.length > 1000) throw neoChatError_('Messages can be up to 1,000 characters.', 'message_too_large', 413);
      var rooms = neoChatReadStore_('rooms', {});
      if (roomId !== 'global') {
        var room = rooms[roomId];
        var members = room && Array.isArray(room.members) ? room.members : [];
        var kind = String(room && (room.kind || room.type) || '').toLowerCase();
        var publicRoom = room && room.private !== true && (kind === 'public' || kind === 'server' || kind === 'channel');
        if (!room || (!publicRoom && members.indexOf(auth.account.id) === -1)) {
          throw neoChatError_('That conversation is unavailable.', 'room_forbidden', 403);
        }
      }
      var messages = neoChatReadStore_('messages', []);
      var duplicate = clientId && messages.filter(function (message) {
        return message && message.clientId === clientId && message.userId === auth.account.id;
      })[0];
      if (duplicate) return { message: duplicate, duplicate: true, transport: 'cloud' };
      var now = Date.now();
      var elapsed = now - Number(auth.account.lastSentAt || 0);
      if (elapsed < NEO_CHAT_SLOW_MODE_) {
        throw neoChatError_('Slow mode is on.', 'slow_mode', 429, NEO_CHAT_SLOW_MODE_ - elapsed);
      }
      var message = {
        id: neoChatId_('m_'),
        clientId: clientId,
        room: roomId,
        userId: auth.account.id,
        user: auth.account.username,
        text: text,
        attachment: attachment,
        time: now
      };
      auth.account.lastSentAt = now;
      auth.accounts[auth.account.id] = auth.account;
      messages.push(message);
      messages = neoChatTrimMessages_(messages);
      if (rooms[roomId]) rooms[roomId].updatedAt = now;
      neoChatWriteStore_('accounts', auth.accounts);
      neoChatWriteStore_('messages', messages);
      neoChatWriteStore_('rooms', rooms);
      return { message: message, transport: 'cloud' };
    });
  });
}

function neoChatEditMessage(request) {
  return neoChatResult_(function () {
    return neoChatWithLock_(function () {
      var auth = neoChatAuthenticate_(request && request.token);
      var messageId = String(request && request.messageId || '');
      var text = String(request && request.text || '').trim();
      if (!/^[a-zA-Z0-9_-]{1,96}$/.test(messageId)) throw neoChatError_('That message could not be found.', 'message_not_found', 404);
      var messages = neoChatReadStore_('messages', []);
      var index = messages.findIndex(function (message) { return message && String(message.id || '') === messageId; });
      if (index < 0) throw neoChatError_('That message could not be found.', 'message_not_found', 404);
      var message = messages[index];
      if (String(message.userId || '') !== auth.account.id) throw neoChatError_('You can only edit your own messages.', 'message_forbidden', 403);
      if (!text && !message.attachment && !(Array.isArray(message.attachments) && message.attachments.length)) {
        throw neoChatError_('A message cannot be empty.', 'empty_message', 400);
      }
      if (text.length > 1000) throw neoChatError_('Messages can be up to 1,000 characters.', 'message_too_large', 413);
      message.text = text;
      message.editedAt = Date.now();
      messages[index] = message;
      neoChatWriteStore_('messages', messages);
      return { message: message, transport: 'cloud' };
    });
  });
}

function neoChatDeleteMessage(request) {
  return neoChatResult_(function () {
    return neoChatWithLock_(function () {
      var auth = neoChatAuthenticate_(request && request.token);
      var messageId = String(request && request.messageId || '');
      if (!/^[a-zA-Z0-9_-]{1,96}$/.test(messageId)) throw neoChatError_('That message could not be found.', 'message_not_found', 404);
      var messages = neoChatReadStore_('messages', []);
      var index = messages.findIndex(function (message) { return message && String(message.id || '') === messageId; });
      if (index < 0) throw neoChatError_('That message could not be found.', 'message_not_found', 404);
      var message = messages[index];
      if (String(message.userId || '') !== auth.account.id) throw neoChatError_('You can only delete your own messages.', 'message_forbidden', 403);
      messages.splice(index, 1);
      neoChatWriteStore_('messages', messages);
      return { id: messageId, roomId: String(message.room || 'global'), deleted: true, transport: 'cloud' };
    });
  });
}

function neoChatAttachment_(value) {
  if (!value || typeof value !== 'object') return null;
  var url = String(value.url || '');
  var previewUrl = String(value.previewUrl || url);
  if (!/^https:\/\/(?:drive\.google\.com|[a-z0-9.-]+\.googleusercontent\.com)\//i.test(url)) return null;
  if (!/^https:\/\/(?:drive\.google\.com|[a-z0-9.-]+\.googleusercontent\.com)\//i.test(previewUrl)) previewUrl = url;
  return {
    name: String(value.name || 'Attachment').slice(0, 120),
    type: String(value.type || 'application/octet-stream').slice(0, 100),
    size: Math.max(0, Number(value.size || 0)),
    url: url,
    previewUrl: previewUrl
  };
}

function neoChatSignOut(request) {
  return neoChatResult_(function () {
    return neoChatWithLock_(function () {
      var token = String(request && request.token || '');
      if (token) {
        var sessions = neoChatReadStore_('sessions', {});
        delete sessions[neoChatTokenHash_(token)];
        neoChatWriteStore_('sessions', sessions);
      }
      return { signedOut: true, transport: 'cloud' };
    });
  });
}

function neoChatAuthenticate_(token) {
  token = String(token || '');
  if (token.length < 30 || token.length > 240) throw neoChatError_('Your NEO session has expired.', 'session_expired', 401);
  var sessions = neoChatReadStore_('sessions', {});
  var session = sessions[neoChatTokenHash_(token)];
  var now = Date.now();
  if (!session || Number(session.expiresAt || 0) <= now) throw neoChatError_('Your NEO session has expired.', 'session_expired', 401);
  var accounts = neoChatReadStore_('accounts', {});
  var account = accounts[String(session.userId || '')];
  if (!account) throw neoChatError_('Your NEO profile is unavailable.', 'profile_missing', 403);
  return { account: account, accounts: accounts, session: session };
}

function neoChatRemoveLegacyWelcome_() {
  var accounts = neoChatReadStore_('accounts', {});
  if (accounts.neo_system) {
    delete accounts.neo_system;
    neoChatWriteStore_('accounts', accounts);
  }
  var messages = neoChatReadStore_('messages', []);
  var cleaned = messages.filter(function (message) { return message && message.id !== 'neo_welcome'; });
  if (cleaned.length !== messages.length) {
    neoChatWriteStore_('messages', neoChatTrimMessages_(cleaned));
  }
}

function neoChatValidatePassword_(value) {
  var password = String(value || '');
  if (password.length < 8 || password.length > 72) {
    throw neoChatError_('Use a password between 8 and 72 characters.', 'invalid_password', 400);
  }
  return password;
}

function neoChatPasswordRecord_(password) {
  var salt = neoChatToken_().slice(4);
  return {
    salt: salt,
    iterations: NEO_CHAT_PASSWORD_ITERATIONS_,
    hash: neoChatPasswordHash_(password, salt, NEO_CHAT_PASSWORD_ITERATIONS_)
  };
}

function neoChatPasswordHash_(password, salt, iterations) {
  var rounds = Math.max(1000, Math.min(12000, Number(iterations || NEO_CHAT_PASSWORD_ITERATIONS_)));
  var pepper = neoChatSecret_();
  var value = String(password) + ':' + String(salt);
  for (var index = 0; index < rounds; index += 1) {
    value = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(value, pepper + ':' + salt));
  }
  return value;
}

function neoChatVerifyPassword_(password, account) {
  var expected = String(account && account.passwordHash || '');
  var salt = String(account && account.passwordSalt || '');
  if (!expected || !salt) return false;
  var actual = neoChatPasswordHash_(password, salt, Number(account.passwordIterations || NEO_CHAT_PASSWORD_ITERATIONS_));
  return neoChatConstantTimeEqual_(actual, expected);
}

function neoChatConstantTimeEqual_(left, right) {
  left = String(left || '');
  right = String(right || '');
  var mismatch = left.length ^ right.length;
  var length = Math.max(left.length, right.length);
  for (var index = 0; index < length; index += 1) {
    mismatch |= (left.charCodeAt(index % Math.max(1, left.length)) || 0) ^ (right.charCodeAt(index % Math.max(1, right.length)) || 0);
  }
  return mismatch === 0;
}

function neoChatPublicAccount_(account) {
  return {
    id: String(account && account.id || ''),
    username: String(account && account.username || 'Member').slice(0, 40),
    avatar: '',
    bio: String(account && account.bio || '').slice(0, 120),
    mood: String(account && account.mood || 'NEO member').slice(0, 60),
    status: String(account && account.status || 'online').slice(0, 20)
  };
}

function neoChatReadStore_(name, fallback) {
  var prefix = 'NEO_CHAT_' + String(name || '').toUpperCase() + '_' + NEO_CHAT_STORE_VERSION_;
  var snapshot = neoChatProperties_();
  var count = Number(snapshot[prefix + '_COUNT'] || 0);
  if (!count) return fallback;
  var text = '';
  for (var index = 0; index < count; index += 1) text += snapshot[prefix + '_' + index] || '';
  try {
    var parsed = JSON.parse(text);
    return parsed === null || typeof parsed === 'undefined' ? fallback : parsed;
  } catch (error) {
    return fallback;
  }
}

function neoChatWriteStore_(name, value) {
  var properties = PropertiesService.getScriptProperties();
  var prefix = 'NEO_CHAT_' + String(name || '').toUpperCase() + '_' + NEO_CHAT_STORE_VERSION_;
  var text = JSON.stringify(value);
  var chunks = neoChatUtf8Chunks_(text, NEO_CHAT_STORE_CHUNK_BYTES_);
  if (!chunks.length) chunks.push('null');
  var snapshot = neoChatProperties_();
  var previous = Number(snapshot[prefix + '_COUNT'] || 0);
  var update = {};
  chunks.forEach(function (chunk, index) { update[prefix + '_' + index] = chunk; });
  update[prefix + '_COUNT'] = String(chunks.length);
  var existing = Object.assign({}, snapshot);
  Object.keys(existing).forEach(function (key) {
    if (key.indexOf(prefix + '_') === 0) delete existing[key];
  });
  Object.keys(update).forEach(function (key) { existing[key] = update[key]; });
  var totalBytes = Object.keys(existing).reduce(function (total, key) {
    return total + neoChatUtf8Bytes_(key) + neoChatUtf8Bytes_(existing[key]);
  }, 0);
  if (totalBytes > NEO_CHAT_STORE_TOTAL_BYTES_) {
    throw neoChatError_('NEO Chat storage is full. Try again after older content is cleared.', 'relay_capacity', 507);
  }
  properties.setProperties(update, false);
  for (var stale = chunks.length; stale < previous; stale += 1) properties.deleteProperty(prefix + '_' + stale);
  NEO_CHAT_PROPERTY_SNAPSHOT_ = existing;
}

function neoChatProperties_() {
  if (!NEO_CHAT_PROPERTY_SNAPSHOT_) {
    NEO_CHAT_PROPERTY_SNAPSHOT_ = PropertiesService.getScriptProperties().getProperties();
  }
  return NEO_CHAT_PROPERTY_SNAPSHOT_;
}

function neoChatUtf8Bytes_(value) {
  return Utilities.newBlob(String(value == null ? '' : value), 'text/plain').getBytes().length;
}

function neoChatUtf8Chunks_(text, limit) {
  text = String(text || '');
  var chunks = [];
  var offset = 0;
  while (offset < text.length) {
    var low = 1;
    var high = Math.min(text.length - offset, 6000);
    var best = 0;
    while (low <= high) {
      var middle = Math.floor((low + high) / 2);
      var candidate = text.slice(offset, offset + middle);
      if (neoChatUtf8Bytes_(candidate) <= limit) {
        best = middle;
        low = middle + 1;
      } else {
        high = middle - 1;
      }
    }
    if (!best) throw neoChatError_('A chat value is too large to store.', 'relay_capacity', 507);
    var end = offset + best;
    if (end < text.length && /[\uD800-\uDBFF]/.test(text.charAt(end - 1)) && /[\uDC00-\uDFFF]/.test(text.charAt(end))) end -= 1;
    chunks.push(text.slice(offset, end));
    offset = end;
  }
  return chunks;
}

function neoChatTrimMessages_(messages) {
  var trimmed = (Array.isArray(messages) ? messages : []).filter(function (message) {
    return message && message.id !== 'neo_welcome';
  }).slice(-NEO_CHAT_MAX_MESSAGES_);
  while (trimmed.length > 1 && neoChatUtf8Bytes_(JSON.stringify(trimmed)) > NEO_CHAT_MESSAGE_STORE_BYTES_) {
    trimmed.shift();
  }
  return trimmed;
}

function neoChatWithLock_(callback) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) throw neoChatError_('NEO Chat is busy. Try again.', 'relay_busy', 503);
  try { return callback(); }
  finally { lock.releaseLock(); }
}

function neoChatPruneSessions_(sessions, now) {
  Object.keys(sessions).forEach(function (hash) {
    if (!sessions[hash] || Number(sessions[hash].expiresAt || 0) <= now) delete sessions[hash];
  });
}

function neoChatToken_() {
  return 'neo_' + Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
}

function neoChatProfileToken_(requestId, userId) {
  var secret = neoChatSecret_();
  var bytes = Utilities.computeHmacSha256Signature(String(requestId) + ':' + String(userId), secret, Utilities.Charset.UTF_8);
  return 'neo_' + bytes.map(function (value) {
    var hex = (value & 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function neoChatSecret_() {
  var properties = PropertiesService.getScriptProperties();
  var key = 'NEO_CHAT_PROFILE_SECRET_' + NEO_CHAT_STORE_VERSION_;
  var snapshot = neoChatProperties_();
  var secret = snapshot[key];
  if (!secret) {
    secret = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    properties.setProperty(key, secret);
    snapshot[key] = secret;
  }
  return secret;
}

function neoChatTokenHash_(token) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(token || ''), Utilities.Charset.UTF_8);
  return Utilities.base64EncodeWebSafe(digest).replace(/=+$/, '');
}

function neoChatId_(prefix) {
  return String(prefix || '') + Utilities.getUuid().replace(/-/g, '').toLowerCase();
}

function neoChatError_(message, code, status, retryAfterMs) {
  var error = new Error(String(message || 'NEO Chat is unavailable.'));
  error.neoCode = String(code || 'chat_error');
  error.neoStatus = Number(status || 0);
  error.neoRetryAfterMs = Number(retryAfterMs || 0);
  return error;
}

function neoChatResult_(callback) {
  NEO_CHAT_PROPERTY_SNAPSHOT_ = null;
  try { return { ok: true, data: callback() }; }
  catch (error) {
    console.error('NEO Chat:', error && error.stack || error);
    return {
      ok: false,
      error: {
        message: String(error && error.message || 'NEO Chat is unavailable.'),
        code: String(error && error.neoCode || 'chat_error'),
        status: Number(error && error.neoStatus || 500),
        retryAfterMs: Number(error && error.neoRetryAfterMs || 0)
      }
    };
  }
}
