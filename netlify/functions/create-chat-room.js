"use strict";

var FIREBASE_ROOT = "https://taco-chat-c1539-default-rtdb.firebaseio.com/rooms/_deluxeAppState/state";
var MAX_BODY_BYTES = 2_000;

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
  var source = Array.isArray(raw) ? raw : (raw && typeof raw === "object" ? Object.keys(raw).filter(function (key) { return raw[key] !== false && raw[key] != null; }) : []);
  return source.map(function (member) {
    return accountKey(typeof member === "string" ? member : member && (member.id || member.username || member.userKey));
  }).filter(Boolean).sort();
}

function isBanned(account) {
  if (!account || account.banned !== true) return false;
  var until = Number(account.bannedUntil || 0);
  return !until || until > Date.now();
}

async function readJson(path, signal) {
  var response = await fetch(FIREBASE_ROOT + "/" + path + ".json", { cache: "no-store", signal: signal });
  if (!response.ok) throw new Error("firebase_read_" + response.status);
  return response.json();
}

export async function handler(event) {
  if (String(event.httpMethod || "GET").toUpperCase() !== "POST") {
    return jsonResponse(405, { code: "method_not_allowed", detail: "Method not allowed" });
  }

  var currentId = accountKey(readBearerUsername(event.headers));
  if (!currentId) return jsonResponse(401, { code: "login_required", detail: "Choose your name again" });
  var rawBody = event.isBase64Encoded ? Buffer.from(event.body || "", "base64").toString("utf8") : String(event.body || "");
  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    return jsonResponse(413, { code: "request_too_large", detail: "Request is too large" });
  }

  var payload;
  try { payload = JSON.parse(rawBody || "{}"); }
  catch (error) { return jsonResponse(400, { code: "invalid_request", detail: "Invalid request" }); }
  var targetId = accountKey(payload.username);
  if (!targetId || !/^[a-z0-9_]{2,32}$/.test(targetId)) {
    return jsonResponse(400, { code: "invalid_username", detail: "Choose a valid username" });
  }
  if (targetId === currentId) {
    return jsonResponse(400, { code: "self_message", detail: "Choose another person" });
  }

  var controller = new AbortController();
  var timer = setTimeout(function () { controller.abort(); }, 6_000);
  try {
    var values = await Promise.all([
      readJson("accounts/" + encodeURIComponent(currentId), controller.signal),
      readJson("accounts/" + encodeURIComponent(targetId), controller.signal),
      readJson("rooms", controller.signal).catch(function () { return {}; })
    ]);
    var current = values[0];
    var target = values[1];
    var rooms = values[2] || {};
    if (!current || current.ugpDeleted || accountKey(current.username || currentId) !== currentId) {
      return jsonResponse(403, { code: "login_required", detail: "Chat name is not linked" });
    }
    if (isBanned(current)) {
      return jsonResponse(403, { code: "banned", detail: "This name is blocked from chat" });
    }
    if (!target || target.ugpDeleted || isBanned(target)) {
      return jsonResponse(404, { code: "user_not_found", detail: "That username is unavailable" });
    }

    var expectedMembers = [currentId, targetId].sort();
    var existingEntry = Object.entries(rooms).find(function (entry) {
      var room = entry[1];
      var kind = String((room && (room.kind || room.type)) || "").toLowerCase();
      var members = roomMembers(room);
      return (room && (room.private === true || kind === "dm")) && members.length === 2 && members[0] === expectedMembers[0] && members[1] === expectedMembers[1];
    });
    if (existingEntry) {
      return jsonResponse(200, {
        room: Object.assign({}, existingEntry[1], {
          id: existingEntry[1].id || existingEntry[0],
          kind: "dm",
          private: true,
          members: expectedMembers
        }),
        created: false
      });
    }

    var roomId = "dm_" + expectedMembers.join("_");
    var stamp = Date.now();
    var room = {
      id: roomId,
      kind: "dm",
      private: true,
      members: expectedMembers,
      createdAt: stamp,
      updatedAt: stamp
    };
    var writeResponse = await fetch(FIREBASE_ROOT + "/rooms/" + encodeURIComponent(roomId) + ".json", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(room),
      signal: controller.signal
    });
    if (!writeResponse.ok) throw new Error("firebase_write_" + writeResponse.status);
    return jsonResponse(201, { room: room, created: true });
  } catch (error) {
    if (error && error.name === "AbortError") return jsonResponse(504, { code: "room_timeout", detail: "Starting the conversation took too long" });
    return jsonResponse(502, { code: "room_failed", detail: "Could not start the conversation" });
  } finally {
    clearTimeout(timer);
  }
}
