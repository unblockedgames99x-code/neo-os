"use strict";

var FIREBASE_ROOT = "https://taco-chat-c1539-default-rtdb.firebaseio.com/rooms/_deluxeAppState/state";
var MAX_BODY_BYTES = 2_000;
var RESERVED_KEYS = new Set(["carterb", "london", "ryanh"]);
var RATE_WINDOW_MS = 60 * 1000;
var RATE_LIMIT = 12;
var attempts = globalThis.__neoNameAttempts || new Map();
globalThis.__neoNameAttempts = attempts;

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
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

function requestAddress(event) {
  var headers = (event && event.headers) || {};
  return String(headers["x-nf-client-connection-ip"] || headers["x-forwarded-for"] || headers["client-ip"] || "local")
    .split(",")[0].trim().slice(0, 80);
}

function rateLimited(event) {
  var now = Date.now();
  var key = requestAddress(event);
  var recent = (attempts.get(key) || []).filter(function (stamp) { return now - stamp < RATE_WINDOW_MS; });
  if (recent.length >= RATE_LIMIT) return true;
  recent.push(now);
  attempts.set(key, recent);
  if (attempts.size > 500) {
    attempts.forEach(function (stamps, address) {
      if (!stamps.some(function (stamp) { return now - stamp < RATE_WINDOW_MS; })) attempts.delete(address);
    });
  }
  return false;
}

function parseBody(event) {
  var rawBody = event.isBase64Encoded
    ? Buffer.from(event.body || "", "base64").toString("utf8")
    : String(event.body || "");
  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    return { error: jsonResponse(413, { code: "name_too_large", detail: "That request is too large." }) };
  }
  try {
    return { value: JSON.parse(rawBody || "{}") };
  } catch (error) {
    return { error: jsonResponse(400, { code: "invalid_name", detail: "That name could not be read." }) };
  }
}

function hasPassword(account) {
  return Boolean(account && (
    (account.passwordHash && typeof account.passwordHash === "object") ||
    (typeof account.password === "string" && account.password.length)
  ));
}

function nameAccount(username) {
  var stamp = Date.now();
  return {
    username,
    accountMode: "display-name",
    password: "",
    avatar: "taco",
    status: "online",
    theme: "mono",
    mood: "Social",
    xp: 0,
    role: "member",
    banned: false,
    badges: ["New"],
    chatPlus: false,
    bio: "",
    favoriteGame: "",
    nameColor: "#ffffff",
    profileBanner: "taco",
    profileBannerColor: "#000000",
    profileBannerImage: "",
    profileTheme: "mono",
    profileEffect: "none",
    ugpStatus: "approved",
    createdAt: stamp,
    lastActive: stamp,
    lastSeen: stamp,
    updatedAt: stamp
  };
}

function publicUser(userId, account) {
  return {
    id: userId,
    username: String((account && account.username) || userId),
    role: String((account && account.role) || "member").toLowerCase() === "owner" ? "owner" : "user",
    status: "approved",
    created_at: new Date(Number((account && account.createdAt) || Date.now())).toISOString()
  };
}

async function claimName(userId, username, signal) {
  var url = FIREBASE_ROOT + "/accounts/" + encodeURIComponent(userId) + ".json";
  var readResponse = await fetch(url, {
    cache: "no-store",
    headers: { "X-Firebase-ETag": "true" },
    signal
  });
  if (!readResponse.ok) throw new Error("firebase_account_read_" + readResponse.status);
  var account = await readResponse.json();
  var etag = readResponse.headers.get("etag");
  if (!etag) throw new Error("firebase_account_etag_missing");

  if (account) {
    if (account.ugpDeleted || account.banned === true || hasPassword(account) || account.accountMode !== "display-name") {
      return { conflict: true };
    }
    var stamp = Date.now();
    var updateResponse = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "online", lastActive: stamp, lastSeen: stamp, updatedAt: stamp }),
      signal
    });
    if (!updateResponse.ok) throw new Error("firebase_account_update_" + updateResponse.status);
    return { account: Object.assign({}, account, { status: "online", lastActive: stamp, lastSeen: stamp, updatedAt: stamp }) };
  }

  account = nameAccount(username);
  var writeResponse = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "If-Match": etag },
    body: JSON.stringify(account),
    signal
  });
  if (writeResponse.status === 412) return { retry: true };
  if (!writeResponse.ok) throw new Error("firebase_account_write_" + writeResponse.status);
  return { account };
}

export async function handler(event) {
  if (String(event.httpMethod || "GET").toUpperCase() !== "POST") {
    return jsonResponse(405, { code: "method_not_allowed", detail: "Method not allowed" });
  }
  if (rateLimited(event)) {
    return jsonResponse(429, { code: "name_rate_limited", detail: "Too many attempts. Wait a moment and try again." });
  }

  var parsed = parseBody(event);
  if (parsed.error) return parsed.error;
  var username = String((parsed.value && parsed.value.username) || "").trim();
  var userId = accountKey(username);
  if (!/^[A-Za-z0-9_]{3,24}$/.test(username) || userId !== username.toLowerCase()) {
    return jsonResponse(400, { code: "invalid_username", detail: "Use 3-24 letters, numbers, or underscores." });
  }
  if (RESERVED_KEYS.has(userId)) {
    return jsonResponse(409, { code: "reserved_username", detail: "That name is reserved." });
  }

  var controller = new AbortController();
  var timer = setTimeout(function () { controller.abort(); }, 6_500);
  try {
    var result = await claimName(userId, username, controller.signal);
    if (result.retry) result = await claimName(userId, username, controller.signal);
    if (result.conflict || !result.account) {
      return jsonResponse(409, { code: "username_taken", detail: "That name is already in use." });
    }
    return jsonResponse(200, {
      token: "static-firebase:" + encodeURIComponent(userId),
      user: publicUser(userId, result.account)
    });
  } catch (error) {
    if (error && error.name === "AbortError") {
      return jsonResponse(504, { code: "name_timeout", detail: "Saving your name took too long. Try again." });
    }
    return jsonResponse(502, { code: "name_unavailable", detail: "Your name could not be saved. Try again." });
  } finally {
    clearTimeout(timer);
  }
}
