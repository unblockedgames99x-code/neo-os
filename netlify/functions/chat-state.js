"use strict";

var FIREBASE_ROOT = "https://taco-chat-c1539-default-rtdb.firebaseio.com/rooms/_deluxeAppState/state";
var MESSAGE_LIMIT = 180;

function jsonResponse(statusCode, payload) {
  return {
    statusCode: statusCode,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff"
    },
    body: JSON.stringify(payload)
  };
}

function accountKey(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
}

function readBearerUsername(headers) {
  var authorization = String((headers && (headers.authorization || headers.Authorization)) || "");
  var token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!token.startsWith("static-firebase:")) return "";
  try { return decodeURIComponent(token.slice("static-firebase:".length)).trim(); }
  catch (error) { return ""; }
}

function roomMembers(room) {
  var raw = room && room.members;
  var source = Array.isArray(raw)
    ? raw
    : (raw && typeof raw === "object" ? Object.keys(raw).filter(function (key) { return raw[key] !== false && raw[key] != null; }) : []);
  return source.map(function (member) {
    return accountKey(typeof member === "string" ? member : member && (member.id || member.username || member.userKey));
  }).filter(Boolean);
}

function roomKind(room) {
  return String((room && (room.kind || room.type)) || "").toLowerCase();
}

function isPrivateRoom(room) {
  var kind = roomKind(room);
  return Boolean(room && (room.private === true || kind === "dm" || kind === "group"));
}

function isPublicRoom(room) {
  var kind = roomKind(room);
  return Boolean(room && room.private !== true && (kind === "server" || kind === "public" || kind === "channel"));
}

function publicProfile(id, profile) {
  var avatar = String((profile && (profile.avatar || profile.profilePicture || profile.profilePic || profile.photoURL || profile.pfp)) || "");
  if (avatar.length > 90_000 || !/^(?:data:image\/(?:png|jpeg|webp|gif);base64,|https:\/\/)/i.test(avatar)) avatar = "";
  return {
    id: accountKey(id || (profile && profile.username)),
    username: String((profile && profile.username) || id || "Member").slice(0, 40),
    avatar: avatar,
    bio: String((profile && profile.bio) || "").slice(0, 120),
    mood: String((profile && profile.mood) || "").slice(0, 60),
    status: String((profile && profile.status) || "offline").slice(0, 20)
  };
}

function publicMessage(firebaseKey, message) {
  if (!message || message.deleted) return null;
  var text = String(message.text || message.body || message.message || "").trim();
  if (!text) return null;
  return {
    firebaseKey: String(message.firebaseKey || firebaseKey),
    id: String(message.id || firebaseKey),
    clientId: String(message.clientId || "").slice(0, 72),
    room: String(message.room || "global"),
    user: String(message.user || message.username || "Guest").slice(0, 40),
    text: text.slice(0, 1_000),
    time: Number(message.time || message.createdAt || message.updatedAt || 0)
  };
}

async function readJson(path, parameters, signal) {
  var url = new URL(FIREBASE_ROOT + "/" + path + ".json");
  Object.entries(parameters || {}).forEach(function (entry) { url.searchParams.set(entry[0], entry[1]); });
  var response = await fetch(url.toString(), { cache: "no-store", signal: signal });
  if (!response.ok) throw new Error("firebase_read_" + response.status);
  return response.json();
}

export async function handler(event) {
  if (String(event.httpMethod || "GET").toUpperCase() !== "GET") {
    return jsonResponse(405, { code: "method_not_allowed", detail: "Method not allowed" });
  }

  var userId = accountKey(readBearerUsername(event.headers));
  if (!userId) return jsonResponse(401, { code: "login_required", detail: "Choose your name again" });
  var compact = String((event.queryStringParameters && event.queryStringParameters.compact) || "") === "1";

  var controller = new AbortController();
  var timer = setTimeout(function () { controller.abort(); }, 5_500);
  try {
    var values = await Promise.all([
      readJson("accounts/" + encodeURIComponent(userId), {}, controller.signal),
      readJson("rooms", {}, controller.signal).catch(function () { return {}; }),
      readJson("messages", { orderBy: JSON.stringify("$key"), limitToLast: String(MESSAGE_LIMIT) }, controller.signal).catch(function () { return {}; }),
      compact
        ? Promise.resolve({})
        : readJson("ultimateGameStash/siteSync/chatProfiles", {}, controller.signal).catch(function () { return {}; })
    ]);
    var account = values[0];
    var allRooms = values[1] || {};
    var allMessages = values[2] || {};
    var rawProfiles = values[3] || {};
    if (!account || account.ugpDeleted || accountKey(account.username || userId) !== userId) {
      return jsonResponse(403, { code: "account_not_linked", detail: "This chat name is not linked to Messages." });
    }

    var rooms = {};
    var allowedRoomIds = new Set(["global"]);
    Object.entries(allRooms).forEach(function (entry) {
      var room = entry[1];
      if (!room || typeof room !== "object") return;
      var allowed = isPublicRoom(room) || (isPrivateRoom(room) && roomMembers(room).includes(userId));
      if (!allowed) return;
      var id = String(room.id || entry[0]);
      allowedRoomIds.add(id);
      rooms[id] = {
        id: id,
        kind: roomKind(room) || (isPrivateRoom(room) ? "dm" : "public"),
        private: isPrivateRoom(room),
        members: roomMembers(room),
        name: String(room.name || room.title || "").slice(0, 80),
        createdAt: Number(room.createdAt || 0),
        updatedAt: Number(room.updatedAt || room.createdAt || 0)
      };
    });

    var messages = Object.entries(allMessages).map(function (entry) {
      return publicMessage(entry[0], entry[1]);
    }).filter(function (message) {
      return message && allowedRoomIds.has(message.room);
    }).sort(function (first, second) { return first.time - second.time; });

    var profileIds = new Set([userId]);
    Object.values(rooms).forEach(function (room) { room.members.forEach(function (id) { profileIds.add(id); }); });
    messages.forEach(function (message) { profileIds.add(accountKey(message.user)); });
    var profiles = {};
    Object.entries(rawProfiles).forEach(function (entry) {
      var id = accountKey(entry[0] || (entry[1] && entry[1].username));
      if (id && profileIds.has(id)) profiles[id] = publicProfile(id, entry[1]);
    });
    profiles[userId] = Object.assign({}, publicProfile(userId, account), profiles[userId] || {});

    return jsonResponse(200, {
      account: publicProfile(userId, account),
      rooms: rooms,
      messages: messages,
      profiles: profiles,
      compact: compact,
      updatedAt: Date.now()
    });
  } catch (error) {
    if (error && error.name === "AbortError") {
      return jsonResponse(504, { code: "chat_timeout", detail: "Messages took too long to respond." });
    }
    return jsonResponse(502, { code: "chat_unavailable", detail: "Messages could not connect." });
  } finally {
    clearTimeout(timer);
  }
}
