"use strict";

import { pbkdf2 as pbkdf2Callback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

var FIREBASE_ROOT = "https://taco-chat-c1539-default-rtdb.firebaseio.com/rooms/_deluxeAppState/state";
var MAX_BODY_BYTES = 4_000;
var MAX_PASSWORD_LENGTH = 256;
var MIN_PASSWORD_HASH_ITERATIONS = 120_000;
var MAX_PASSWORD_HASH_ITERATIONS = 1_000_000;
var OWNER_KEYS = new Set(["carterb", "london", "ryanh"]);
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

function constantTimeTextEqual(first, second) {
  var left = Buffer.from(String(first || ""), "utf8");
  var right = Buffer.from(String(second || ""), "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function validPasswordHash(record) {
  var iterations = Number(record && record.iterations);
  return Boolean(
    record &&
    record.version === "pbkdf2-sha256-v1" &&
    Number.isInteger(iterations) &&
    iterations >= MIN_PASSWORD_HASH_ITERATIONS &&
    iterations <= MAX_PASSWORD_HASH_ITERATIONS &&
    /^[A-Za-z0-9+/=]+$/.test(String(record.salt || "")) &&
    /^[A-Za-z0-9+/=]+$/.test(String(record.hash || ""))
  );
}

async function verifyPassword(account, password) {
  var hashRecord = account && account.passwordHash;
  if (validPasswordHash(hashRecord)) {
    var expected = Buffer.from(String(hashRecord.hash), "base64");
    var actual = await pbkdf2(
      String(password || ""),
      Buffer.from(String(hashRecord.salt), "base64"),
      Number(hashRecord.iterations),
      expected.length,
      "sha256"
    );
    if (expected.length === actual.length && timingSafeEqual(expected, actual)) {
      return { ok: true, credentialMode: "hash" };
    }
  }

  var legacyPassword = typeof (account && account.password) === "string" ? account.password : "";
  if (legacyPassword && constantTimeTextEqual(legacyPassword, password)) {
    return { ok: true, credentialMode: "legacy" };
  }
  return { ok: false, credentialMode: "" };
}

function isOwnerAccount(userId, account) {
  var role = String((account && account.role) || "").toLowerCase();
  var badges = Array.isArray(account && account.badges) ? account.badges : [];
  return OWNER_KEYS.has(userId) || role === "owner" || badges.some(function (badge) {
    return String(badge || "").toLowerCase() === "owner";
  });
}

function publicUser(userId, account) {
  var owner = isOwnerAccount(userId, account);
  var banned = Boolean(account && account.banned);
  var status = owner
    ? "approved"
    : String((account && (account.ugpStatus || account.ugp_status)) || (banned ? "rejected" : "pending"));
  return {
    id: userId,
    username: String((account && account.username) || userId),
    role: owner ? "owner" : "user",
    status,
    created_at: new Date(Number((account && (account.createdAt || account.created_at)) || Date.now())).toISOString()
  };
}

function accountForChat(account, credentialMode) {
  var result = { ...(account || {}) };
  delete result.authSessions;
  if (credentialMode !== "legacy") delete result.password;
  if (credentialMode !== "hash") delete result.passwordHash;
  return result;
}

async function readAccount(userId, signal) {
  var response = await fetch(FIREBASE_ROOT + "/accounts/" + encodeURIComponent(userId) + ".json", {
    cache: "no-store",
    signal
  });
  if (!response.ok) throw new Error("firebase_account_read_" + response.status);
  return response.json();
}

function parseLoginBody(event) {
  var rawBody = event.isBase64Encoded
    ? Buffer.from(event.body || "", "base64").toString("utf8")
    : String(event.body || "");
  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    return { error: jsonResponse(413, { code: "login_too_large", detail: "Sign-in request is too large." }) };
  }
  try {
    return { value: JSON.parse(rawBody || "{}") };
  } catch (error) {
    return { error: jsonResponse(400, { code: "invalid_login", detail: "Invalid sign-in request." }) };
  }
}

export async function handler(event) {
  var method = String(event.httpMethod || "GET").toUpperCase();
  if (method !== "GET" && method !== "POST") {
    return jsonResponse(405, { code: "method_not_allowed", detail: "Method not allowed" });
  }
  var queryUsername = String((event.queryStringParameters && event.queryStringParameters.username) || "");
  var parsed = method === "POST" ? parseLoginBody(event) : { value: {} };
  if (parsed.error) return parsed.error;

  var payload = parsed.value || {};
  var username = method === "GET" ? queryUsername : String(payload.username || "");
  var userId = accountKey(username);
  if (!userId || !/^[a-z0-9_]{2,32}$/.test(userId)) {
    return jsonResponse(400, { code: "invalid_username", detail: "Enter a valid username." });
  }

  if (method === "GET") {
    var bearerUserId = accountKey(readBearerUsername(event.headers));
    if (!bearerUserId || bearerUserId !== userId) {
      return jsonResponse(401, { code: "login_required", detail: "Please sign in again." });
    }
  }

  var password = String(payload.password || "");
  if (method === "POST" && (!password || password.length > MAX_PASSWORD_LENGTH)) {
    return jsonResponse(401, { code: "wrong_password", detail: "Wrong password." });
  }

  var controller = new AbortController();
  var timer = setTimeout(function () { controller.abort(); }, 3_500);
  try {
    var account = await readAccount(userId, controller.signal);
    if (!account || account.ugpDeleted) {
      return jsonResponse(401, { code: "account_not_found", detail: "Account not found." });
    }

    if (method === "GET") {
      return jsonResponse(200, { account });
    }

    var verification = await verifyPassword(account, password);
    if (!verification.ok) {
      return jsonResponse(401, { code: "wrong_password", detail: "Wrong password." });
    }

    var response = {
      token: "static-firebase:" + encodeURIComponent(userId),
      user: publicUser(userId, account),
      credentialMode: verification.credentialMode
    };
    if (payload.includeAccount === true) {
      response.account = accountForChat(account, verification.credentialMode);
    }
    return jsonResponse(200, response);
  } catch (error) {
    if (error && error.name === "AbortError") {
      return jsonResponse(504, { code: "login_timeout", detail: "Sign in timed out. Try again." });
    }
    return jsonResponse(502, { code: "login_unavailable", detail: "Sign in could not connect. Try again." });
  } finally {
    clearTimeout(timer);
  }
}
