(function () {
  "use strict";

  var databaseName = "neo-local-games-v1";
  var storeName = "files";
  var sourceMeta = document.querySelector('meta[name="neo-source-url"]');
  var sourceUrl = sourceMeta ? sourceMeta.content : location.href;
  var gameId = new URL(sourceUrl, document.baseURI).searchParams.get("id") || "";
  var gameName = new URL(sourceUrl, document.baseURI).searchParams.get("name") || "Local game";
  var status = document.querySelector("[data-local-status]");
  var frame = document.querySelector("[data-local-game-frame]");

  function fail(message) {
    status.querySelector(".ring").hidden = true;
    status.querySelector("strong").textContent = "Local game unavailable";
    status.querySelector("p").textContent = message;
  }

  function openDatabase() {
    return new Promise(function (resolve, reject) {
      var request = indexedDB.open(databaseName, 1);
      request.onupgradeneeded = function () {
        if (!request.result.objectStoreNames.contains(storeName)) request.result.createObjectStore(storeName);
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error || new Error("Local storage could not be opened.")); };
    });
  }

  async function readGame() {
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(gameId)) throw new Error("This local game link is invalid.");
    var database = await openDatabase();
    var file = await new Promise(function (resolve, reject) {
      var transaction = database.transaction(storeName, "readonly");
      var request = transaction.objectStore(storeName).get(gameId);
      request.onsuccess = function () { resolve(request.result || null); };
      request.onerror = function () { reject(request.error || new Error("The saved game could not be read.")); };
    });
    database.close();
    if (!file || typeof file.text !== "function") throw new Error("The saved HTML file is missing. Remove the entry and add it again.");
    return file.text();
  }

  readGame().then(function (html) {
    document.title = gameName;
    frame.title = gameName;
    frame.srcdoc = String(html || "");
    frame.hidden = false;
    status.hidden = true;
  }).catch(function (error) {
    fail(error && error.message ? error.message : "The local game could not be opened.");
  });
})();
