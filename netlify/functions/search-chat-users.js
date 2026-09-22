"use strict";

var FIREBASE_ROOT = "https://taco-chat-c1539-default-rtdb.firebaseio.com/rooms/_deluxeAppState/state";

function jsonResponse(statusCode, payload) {
  return {
    statusCode: statusCode,
    headers: {
      "Cache-Control": "private, max-age=15",
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

function publicAvatar(account, includeLargeAvatar) {
  var avatar = String((account && (account.avatar || account.profilePicture || account.profilePic || account.photoURL || account.pfp)) || "");
  var limit = includeLargeAvatar ? 350000 : 90000;
  return avatar.length <= limit && /^(?:data:image\/(?:png|jpeg|webp|gif);base64,|https:\/\/)/i.test(avatar) ? avatar : "";
}

function isBanned(account) {
  if (!account || account.banned !== true) return false;
  var until = Number(account.bannedUntil || 0);
  return !until || until > Date.now();
}

function publicProfile(id, account, includeLargeAvatar) {
  return {
    id: id,
    username: String((account && account.username) || id),
    avatar: publicAvatar(account, includeLargeAvatar),
    bio: String((account && account.bio) || "").slice(0, 120),
    mood: String((account && account.mood) || "").slice(0, 60),
    status: String((account && account.status) || "offline").slice(0, 20)
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
  var currentId = accountKey(readBearerUsername(event.headers));
  if (!currentId) return jsonResponse(401, { code: "login_required", detail: "Choose your name again" });
  var query = String((event.queryStringParameters && event.queryStringParameters.q) || "").trim().toLowerCase();
  var exact = String((event.queryStringParameters && event.queryStringParameters.exact) || "") === "1";
  if (query.length < 2 || query.length > 32) return jsonResponse(200, { users: [] });
  var queryKey = accountKey(query);
  if (queryKey.length < 2) return jsonResponse(200, { users: [] });

  var controller = new AbortController();
  var timer = setTimeout(function () { controller.abort(); }, 4_500);
  try {
    var searchParameters = exact
      ? { orderBy: JSON.stringify("$key"), equalTo: JSON.stringify(queryKey), limitToFirst: "1" }
      : { orderBy: JSON.stringify("$key"), startAt: JSON.stringify(queryKey), endAt: JSON.stringify(queryKey + "\uf8ff"), limitToFirst: "21" };
    var values = await Promise.all([
      readJson("accounts/" + encodeURIComponent(currentId), {}, controller.signal),
      readJson("accounts", searchParameters, controller.signal)
    ]);
    if (!values[0]) return jsonResponse(403, { code: "login_required", detail: "Chat name is not linked" });
    var accounts = values[1] || {};
    var users = Object.entries(accounts).filter(function (entry) {
      var account = entry[1];
      if (accountKey(entry[0]) === currentId || !account || account.ugpDeleted || isBanned(account)) return false;
      var username = String(account.username || entry[0]).toLowerCase();
      return exact ? username === query : username.startsWith(query);
    }).sort(function (a, b) {
      var first = String((a[1] && a[1].username) || a[0]);
      var second = String((b[1] && b[1].username) || b[0]);
      var firstStarts = first.toLowerCase().startsWith(query) ? 0 : 1;
      var secondStarts = second.toLowerCase().startsWith(query) ? 0 : 1;
      return firstStarts - secondStarts || first.localeCompare(second);
    }).slice(0, exact ? 1 : 20).map(function (entry) { return publicProfile(entry[0], entry[1], exact); });
    return jsonResponse(200, { users: users });
  } catch (error) {
    if (error && error.name === "AbortError") return jsonResponse(504, { code: "search_timeout", detail: "People search took too long" });
    return jsonResponse(502, { code: "search_failed", detail: "Could not search people" });
  } finally {
    clearTimeout(timer);
  }
}
