"use strict";

import { pbkdf2 as pbkdf2Callback, randomBytes } from "node:crypto";
import { promisify } from "node:util";

var FIREBASE_ROOT = "https://taco-chat-c1539-default-rtdb.firebaseio.com/rooms/_deluxeAppState/state";
var MAX_BODY_BYTES = 4_000;
var PASSWORD_ITERATIONS = 210_000;
var RESERVED_KEYS = new Set(["carterb", "london", "ryanh"]);
var RATE_WINDOW_MS = 10 * 60 * 1000;
var RATE_LIMIT = 5;
var attempts = globalThis.__neoRegistrationAttempts || new Map();
globalThis.__neoRegistrationAttempts = attempts;
var pbkdf2 = promisify(pbkdf2Callback);

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
    return { error: jsonResponse(413, { code: "register_too_large", detail: "Registration request is too large." }) };
  }
  try {
    return { value: JSON.parse(rawBody || "{}") };
  } catch (error) {
    return { error: jsonResponse(400, { code: "invalid_registration", detail: "Invalid registration request." }) };
  }
}

async function passwordHash(password) {
  var salt = randomBytes(16);
  var hash = await pbkdf2(String(password), salt, PASSWORD_ITERATIONS, 32, "sha256");
  return {
    version: "pbkdf2-sha256-v1",
    iterations: PASSWORD_ITERATIONS,
    salt: salt.toString("base64"),
    hash: hash.toString("base64")
  };
}

function accountRecord(username, hashRecord) {
  var stamp = Date.now();
  return {
    username,
    password: "",
    passwordHash: hashRecord,
    passwordUpdatedAt: stamp,
    avatar: "taco",
    status: "online",
    theme: "ember",
    mood: "Social",
    xp: 0,
    role: "member",
    banned: false,
    badges: ["New"],
    chatPlus: false,
    bio: "",
    favoriteGame: "",
    nameColor: "#0a84ff",
    profileBanner: "taco",
    profileBannerColor: "#2d3039",
    profileBannerImage: "",
    profileTheme: "taco",
    profileEffect: "none",
    ugpStatus: "pending",
    createdAt: stamp,
    lastActive: stamp,
    lastSeen: stamp,
    updatedAt: stamp
  };
}

function publicUser(userId, account) {
  return {
    id: userId,
    username: account.username,
    role: "user",
    status: "pending",
    created_at: new Date(account.createdAt).toISOString()
  };
}

async function writeNewAccount(userId, account, signal) {
  var url = FIREBASE_ROOT + "/accounts/" + encodeURIComponent(userId) + ".json";
  var existingResponse = await fetch(url, {
    cache: "no-store",
    headers: { "X-Firebase-ETag": "true" },
    signal
  });
  if (!existingResponse.ok) throw new Error("firebase_account_read_" + existingResponse.status);
  var existing = await existingResponse.json();
  if (existing) return false;
  var etag = existingResponse.headers.get("etag");
  if (!etag) throw new Error("firebase_account_etag_missing");
  var writeResponse = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "If-Match": etag },
    body: JSON.stringify(account),
    signal
  });
  if (writeResponse.status === 412) return false;
  if (!writeResponse.ok) throw new Error("firebase_account_write_" + writeResponse.status);
  return true;
}

export async function handler(event) {
  if (String(event.httpMethod || "GET").toUpperCase() !== "POST") {
    return jsonResponse(405, { code: "method_not_allowed", detail: "Method not allowed" });
  }
  if (rateLimited(event)) {
    return jsonResponse(429, { code: "register_rate_limited", detail: "Too many registration attempts. Wait a few minutes and try again." });
  }
  var parsed = parseBody(event);
  if (parsed.error) return parsed.error;
  var username = String((parsed.value && parsed.value.username) || "").trim();
  var password = String((parsed.value && parsed.value.password) || "");
  var userId = accountKey(username);
  if (!/^[A-Za-z0-9_]{3,24}$/.test(username) || userId !== username.toLowerCase()) {
    return jsonResponse(400, { code: "invalid_username", detail: "Use 3-24 letters, numbers, or underscores." });
  }
  if (RESERVED_KEYS.has(userId)) {
    return jsonResponse(409, { code: "reserved_username", detail: "That username is reserved." });
  }
  if (password.length < 8 || password.length > 128) {
    return jsonResponse(400, { code: "invalid_password", detail: "Password must be 8-128 characters." });
  }

  var controller = new AbortController();
  var timer = setTimeout(function () { controller.abort(); }, 6_500);
  try {
    var account = accountRecord(username, await passwordHash(password));
    var created = await writeNewAccount(userId, account, controller.signal);
    if (!created) return jsonResponse(409, { code: "username_taken", detail: "That username is already taken." });
    return jsonResponse(201, {
      token: "static-firebase:" + encodeURIComponent(userId),
      user: publicUser(userId, account)
    });
  } catch (error) {
    if (error && error.name === "AbortError") {
      return jsonResponse(504, { code: "register_timeout", detail: "Registration timed out. Try again." });
    }
    return jsonResponse(502, { code: "register_unavailable", detail: "Registration could not connect. Try again." });
  } finally {
    clearTimeout(timer);
  }
}
