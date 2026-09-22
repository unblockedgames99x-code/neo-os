"use strict";

var FIREBASE_ROOT = "https://taco-chat-c1539-default-rtdb.firebaseio.com/rooms/_deluxeAppState/state";
var MAX_BODY_BYTES = 8_000;
var MAX_MESSAGE_LENGTH = 1_000;
var MAX_CLIENT_ID_LENGTH = 72;
var SLOW_MODE_MS = 5_000;

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
  try {
    return decodeURIComponent(token.slice("static-firebase:".length)).trim();
  } catch (error) {
    return "";
  }
}

function roomMembers(room) {
  var source = Array.isArray(room && room.members)
    ? room.members
    : (room && room.members && typeof room.members === "object" ? Object.keys(room.members) : []);
  return source.map(function (member) {
    return accountKey(typeof member === "string" ? member : (member && (member.id || member.username || member.userKey)));
  }).filter(Boolean);
}

function isPrivateRoom(room) {
  var kind = String((room && (room.kind || room.type)) || "").toLowerCase();
  return Boolean(room && (room.private === true || kind === "dm" || kind === "group"));
}

function isPublicRoom(room) {
  var kind = String((room && (room.kind || room.type)) || "").toLowerCase();
  return Boolean(room && (kind === "server" || kind === "public" || kind === "channel") && room.private !== true);
}

function isBanned(account) {
  if (!account || account.banned !== true) return false;
  var until = Number(account.bannedUntil || 0);
  return !until || until > Date.now();
}

function blockedFilter(text, filters) {
  var lowered = String(text || "").toLowerCase();
  return (Array.isArray(filters) ? filters : []).map(function (filter) {
    return String(filter || "").trim();
  }).find(function (filter) {
    return filter && lowered.includes(filter.toLowerCase());
  }) || "";
}

function cleanClientMessageId(value) {
  return String(value || "").trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, MAX_CLIENT_ID_LENGTH);
}

function publicMessage(firebaseKey, message) {
  return Object.assign({}, message, {
    firebaseKey: String((message && message.firebaseKey) || firebaseKey),
    id: String((message && message.id) || firebaseKey)
  });
}

async function readJson(path, signal) {
  var response = await fetch(FIREBASE_ROOT + "/" + path + ".json", {
    cache: "no-store",
    signal: signal
  });
  if (!response.ok) throw new Error("firebase_read_" + response.status);
  return response.json();
}

async function reserveSlowMode(userId, signal) {
  var url = FIREBASE_ROOT + "/slowMode/" + encodeURIComponent(userId) + ".json";
  var response = await fetch(url, {
    cache: "no-store",
    headers: { "X-Firebase-ETag": "true" },
    signal
  });
  if (!response.ok) throw new Error("firebase_slow_mode_read_" + response.status);
  var previous = Number(await response.json() || 0);
  var now = Date.now();
  if (previous && now - previous < SLOW_MODE_MS) {
    return { ok: false, retryAfterMs: SLOW_MODE_MS - (now - previous) };
  }
  var etag = response.headers.get("etag");
  if (!etag) throw new Error("firebase_slow_mode_etag_missing");
  var writeResponse = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "If-Match": etag },
    body: JSON.stringify(now),
    signal
  });
  if (writeResponse.status === 412) return { ok: false, retryAfterMs: SLOW_MODE_MS };
  if (!writeResponse.ok) throw new Error("firebase_slow_mode_write_" + writeResponse.status);
  return { ok: true, retryAfterMs: 0 };
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { code: "method_not_allowed", detail: "Method not allowed" });
  }

  var username = readBearerUsername(event.headers);
  var userId = accountKey(username);
  if (!username || !userId) {
    return jsonResponse(401, { code: "login_required", detail: "Choose your name again" });
  }

  var rawBody = event.isBase64Encoded
    ? Buffer.from(event.body || "", "base64").toString("utf8")
    : String(event.body || "");
  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    return jsonResponse(413, { code: "message_too_large", detail: "Message is too large" });
  }

  var payload;
  try {
    payload = JSON.parse(rawBody || "{}");
  } catch (error) {
    return jsonResponse(400, { code: "invalid_message", detail: "Invalid message payload" });
  }

  var text = String((payload && payload.text) || "").trim();
  var roomId = String((payload && payload.roomId) || "global").trim() || "global";
  var clientId = cleanClientMessageId(payload && payload.clientId);
  if (!text) {
    return jsonResponse(400, { code: "empty_message", detail: "Type a message first" });
  }
  if (text.length > MAX_MESSAGE_LENGTH) {
    return jsonResponse(413, { code: "message_too_large", detail: "Message is too long" });
  }
  if (!/^[a-zA-Z0-9_-]{1,160}$/.test(roomId)) {
    return jsonResponse(400, { code: "room_unavailable", detail: "Invalid room" });
  }

  var controller = new AbortController();
  var timer = setTimeout(function () { controller.abort(); }, 7_500);
  try {
    var firebaseKey = clientId
      ? "neo_" + userId.slice(0, 32) + "_" + clientId
      : "neo_" + userId.slice(0, 32) + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    var values = await Promise.all([
      readJson("accounts/" + encodeURIComponent(userId), controller.signal),
      readJson("globalEnabled", controller.signal).catch(function () { return true; }),
      readJson("filters", controller.signal).catch(function () { return []; }),
      roomId === "global"
        ? Promise.resolve(null)
        : readJson("rooms/" + encodeURIComponent(roomId), controller.signal),
      clientId
        ? readJson("messages/" + encodeURIComponent(firebaseKey), controller.signal).catch(function () { return null; })
        : Promise.resolve(null)
    ]);
    var account = values[0];
    var globalEnabled = values[1];
    var filters = values[2];
    var room = values[3];
    var existingMessage = values[4];
    if (!account || account.ugpDeleted || accountKey(account.username || userId) !== userId) {
      return jsonResponse(403, { code: "login_required", detail: "Chat name is not linked" });
    }
    if (isBanned(account)) {
      return jsonResponse(403, { code: "banned", detail: "This name is blocked from chat" });
    }

    var role = String(account.role || "").toLowerCase();
    var canModerate = role === "owner" || role === "admin" || role === "mod";
    if (roomId === "global") {
      if (globalEnabled === false && !canModerate) {
        return jsonResponse(403, { code: "global_disabled", detail: "Global Chat is disabled" });
      }
    } else {
      if (isPrivateRoom(room)) {
        if (!roomMembers(room).includes(userId)) {
          return jsonResponse(403, { code: "room_forbidden", detail: "You are not in that private chat" });
        }
      } else if (isPublicRoom(room)) {
        if (room.membersOnly === true && !roomMembers(room).includes(userId) && !canModerate) {
          return jsonResponse(403, { code: "room_forbidden", detail: "Join this server before posting" });
        }
      } else {
        return jsonResponse(404, { code: "room_unavailable", detail: "Chat room is unavailable" });
      }
    }

    var blocked = blockedFilter(text, filters);
    if (blocked) {
      return jsonResponse(400, { code: "filtered:" + blocked, detail: "Message blocked by moderation filter" });
    }

    if (existingMessage && !existingMessage.deleted) {
      var sameAuthor = accountKey(existingMessage.user || existingMessage.username) === userId;
      var sameRoom = String(existingMessage.room || "global") === roomId;
      var sameText = String(existingMessage.text || existingMessage.body || "").trim() === text;
      if (!sameAuthor || !sameRoom || !sameText) {
        return jsonResponse(409, { code: "message_conflict", detail: "That message could not be retried safely" });
      }
      return jsonResponse(200, { message: publicMessage(firebaseKey, existingMessage), duplicate: true });
    }

    var slowMode = await reserveSlowMode(userId, controller.signal);
    if (!slowMode.ok) {
      return jsonResponse(429, {
        code: "slow_mode",
        detail: "Slow mode is on. Try again in " + Math.max(1, Math.ceil(slowMode.retryAfterMs / 1000)) + " seconds.",
        retryAfterMs: slowMode.retryAfterMs
      });
    }

    var stamp = Date.now();
    var message = {
      id: clientId || "m" + stamp.toString(36) + Math.random().toString(36).slice(2, 8),
      clientId: clientId,
      room: roomId,
      user: String(account.username || username),
      text: text,
      time: stamp,
      createdAt: stamp,
      updatedAt: stamp,
      reactions: {},
      replies: [],
      replyTo: null,
      attachment: null
    };
    var updates = {
      updatedAt: stamp
    };
    updates["messages/" + firebaseKey] = message;
    if (roomId !== "global") updates["rooms/" + roomId + "/updatedAt"] = stamp;
    var writeResponse = await fetch(FIREBASE_ROOT + ".json", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
      signal: controller.signal
    });
    if (!writeResponse.ok) throw new Error("firebase_write_" + writeResponse.status);
    message.firebaseKey = firebaseKey;
    return jsonResponse(201, { message: message });
  } catch (error) {
    if (error && error.name === "AbortError") {
      return jsonResponse(504, { code: "send_timeout", detail: "Message send timed out" });
    }
    return jsonResponse(502, { code: "send_failed_write", detail: "Could not send message" });
  } finally {
    clearTimeout(timer);
  }
}
