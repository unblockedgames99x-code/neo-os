(function () {
  "use strict";

  var FORMAT = "neo-os-backup";
  var FORMAT_VERSION = 1;
  var KNOWN_DATABASES = [
    "neo_os_wallpapers",
    "neo_os_local_media",
    "neo_os_files_v1",
    "neo_os_wallpaper_engine_v1"
  ];
  var PRIVATE_STORAGE_KEYS = new Set([
    "neo_os_booted_session",
    "neo_os_guest_session_v1",
    "neo_chat_local_state_v2",
    "neo_chat_pending_profile_v1",
    "neo_chat_saved_accounts_v1",
    "ugp_session",
    "ugp_token"
  ]);

  var downloadButton = document.querySelector("[data-neo-backup-download]");
  var importButton = document.querySelector("[data-neo-backup-import]");
  var fileInput = document.querySelector("[data-neo-backup-file]");

  if (!downloadButton || !importButton || !fileInput) return;

  function notify(title, message, icon) {
    var shell = window.NEO_SHELL || window.NEOShell;
    if (shell && typeof shell.notify === "function") {
      shell.notify(title, message, icon || "info");
    }
  }

  function setBusy(busy) {
    downloadButton.disabled = busy;
    importButton.disabled = busy;
    downloadButton.setAttribute("aria-busy", busy ? "true" : "false");
    importButton.setAttribute("aria-busy", busy ? "true" : "false");
  }

  function isSafeStorageKey(key) {
    if (typeof key !== "string" || PRIVATE_STORAGE_KEYS.has(key)) return false;
    if (!/^neo(?:_|-)/i.test(key)) return false;
    return !/(?:^|[_-])(auth|credential|password|session|token)(?:[_-]|$)/i.test(key);
  }

  function isSafeDatabaseName(name) {
    return typeof name === "string" && /^neo(?:_|-)[a-z0-9_-]{1,96}$/i.test(name);
  }

  function readLocalStorage() {
    var values = {};
    for (var index = 0; index < localStorage.length; index += 1) {
      var key = localStorage.key(index);
      if (!isSafeStorageKey(key)) continue;
      values[key] = localStorage.getItem(key);
    }
    return values;
  }

  function bytesToBase64(bytes) {
    var binary = "";
    var chunkSize = 32768;
    for (var offset = 0; offset < bytes.length; offset += chunkSize) {
      binary += String.fromCharCode.apply(null, bytes.subarray(offset, offset + chunkSize));
    }
    return btoa(binary);
  }

  function base64ToBytes(value) {
    var binary = atob(value);
    var bytes = new Uint8Array(binary.length);
    for (var index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }

  async function encodeValue(value, ancestors) {
    if (value === undefined) return { __neoType: "Undefined" };
    if (typeof value === "bigint") return { __neoType: "BigInt", value: String(value) };
    if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;

    if (value instanceof Date) return { __neoType: "Date", value: value.toISOString() };
    if (typeof File !== "undefined" && value instanceof File) {
      return {
        __neoType: "File",
        value: bytesToBase64(new Uint8Array(await value.arrayBuffer())),
        mimeType: value.type || "application/octet-stream",
        name: value.name || "file",
        lastModified: Number(value.lastModified) || 0
      };
    }
    if (value instanceof Blob) {
      return {
        __neoType: "Blob",
        value: bytesToBase64(new Uint8Array(await value.arrayBuffer())),
        mimeType: value.type || "application/octet-stream"
      };
    }
    if (value instanceof ArrayBuffer) {
      return { __neoType: "ArrayBuffer", value: bytesToBase64(new Uint8Array(value)) };
    }
    if (ArrayBuffer.isView(value)) {
      return {
        __neoType: "TypedArray",
        constructor: value.constructor && value.constructor.name ? value.constructor.name : "Uint8Array",
        value: bytesToBase64(new Uint8Array(value.buffer, value.byteOffset, value.byteLength))
      };
    }
    if (value instanceof RegExp) {
      return { __neoType: "RegExp", source: value.source, flags: value.flags };
    }

    var stack = ancestors || new WeakSet();
    if (stack.has(value)) throw new Error("A saved item contains a circular reference.");
    stack.add(value);

    if (value instanceof Map) {
      var entries = [];
      for (var mapEntry of value.entries()) {
        entries.push([await encodeValue(mapEntry[0], stack), await encodeValue(mapEntry[1], stack)]);
      }
      stack.delete(value);
      return { __neoType: "Map", value: entries };
    }
    if (value instanceof Set) {
      var setValues = [];
      for (var setValue of value.values()) setValues.push(await encodeValue(setValue, stack));
      stack.delete(value);
      return { __neoType: "Set", value: setValues };
    }
    if (Array.isArray(value)) {
      var array = [];
      for (var item of value) array.push(await encodeValue(item, stack));
      stack.delete(value);
      return array;
    }

    var object = {};
    for (var key of Object.keys(value)) object[key] = await encodeValue(value[key], stack);
    stack.delete(value);
    return object;
  }

  async function decodeValue(value) {
    if (value === null || typeof value !== "object") return value;
    if (Array.isArray(value)) return Promise.all(value.map(decodeValue));

    if (value.__neoType === "Undefined") return undefined;
    if (value.__neoType === "BigInt") return BigInt(value.value);
    if (value.__neoType === "Date") return new Date(value.value);
    if (value.__neoType === "Blob") return new Blob([base64ToBytes(value.value)], { type: value.mimeType || "application/octet-stream" });
    if (value.__neoType === "File") {
      var fileBytes = base64ToBytes(value.value);
      if (typeof File !== "undefined") {
        return new File([fileBytes], value.name || "file", {
          type: value.mimeType || "application/octet-stream",
          lastModified: Number(value.lastModified) || 0
        });
      }
      return new Blob([fileBytes], { type: value.mimeType || "application/octet-stream" });
    }
    if (value.__neoType === "ArrayBuffer") {
      var bufferBytes = base64ToBytes(value.value);
      return bufferBytes.buffer.slice(bufferBytes.byteOffset, bufferBytes.byteOffset + bufferBytes.byteLength);
    }
    if (value.__neoType === "TypedArray") {
      var typedBytes = base64ToBytes(value.value);
      var typedBuffer = typedBytes.buffer.slice(typedBytes.byteOffset, typedBytes.byteOffset + typedBytes.byteLength);
      var constructors = {
        Int8Array: Int8Array,
        Uint8Array: Uint8Array,
        Uint8ClampedArray: Uint8ClampedArray,
        Int16Array: Int16Array,
        Uint16Array: Uint16Array,
        Int32Array: Int32Array,
        Uint32Array: Uint32Array,
        Float32Array: Float32Array,
        Float64Array: Float64Array,
        DataView: DataView
      };
      var TypedArrayConstructor = constructors[value.constructor] || Uint8Array;
      return new TypedArrayConstructor(typedBuffer);
    }
    if (value.__neoType === "RegExp") return new RegExp(value.source || "", value.flags || "");
    if (value.__neoType === "Map") {
      var map = new Map();
      for (var mapItem of value.value || []) map.set(await decodeValue(mapItem[0]), await decodeValue(mapItem[1]));
      return map;
    }
    if (value.__neoType === "Set") {
      var set = new Set();
      for (var setItem of value.value || []) set.add(await decodeValue(setItem));
      return set;
    }

    var object = {};
    for (var key of Object.keys(value)) object[key] = await decodeValue(value[key]);
    return object;
  }

  function openExistingDatabase(name) {
    return new Promise(function (resolve) {
      var created = false;
      var request = indexedDB.open(name);
      request.onupgradeneeded = function (event) {
        if (event.oldVersion === 0) {
          created = true;
          request.transaction.abort();
        }
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () {
        if (created) indexedDB.deleteDatabase(name);
        resolve(null);
      };
      request.onblocked = function () { resolve(null); };
    });
  }

  async function existingDatabaseNames() {
    if (!window.indexedDB) return [];
    if (typeof indexedDB.databases === "function") {
      try {
        var databases = await indexedDB.databases();
        return Array.from(new Set(databases.map(function (database) { return database.name; }).filter(isSafeDatabaseName)));
      } catch (_) {}
    }
    return KNOWN_DATABASES.slice();
  }

  function readStore(db, storeName) {
    return new Promise(function (resolve, reject) {
      var transaction;
      try {
        transaction = db.transaction(storeName, "readonly");
      } catch (error) {
        reject(error);
        return;
      }
      var store = transaction.objectStore(storeName);
      var keyPath = store.keyPath;
      var autoIncrement = store.autoIncrement;
      var records = [];
      var indexes = Array.from(store.indexNames).map(function (indexName) {
        var index = store.index(indexName);
        return { name: index.name, keyPath: index.keyPath, unique: index.unique, multiEntry: index.multiEntry };
      });
      var request = store.openCursor();
      request.onsuccess = function () {
        var cursor = request.result;
        if (!cursor) return;
        records.push({ key: cursor.key, value: cursor.value });
        cursor.continue();
      };
      request.onerror = function () { reject(request.error || new Error("Could not read saved data.")); };
      transaction.onabort = function () { reject(transaction.error || new Error("Could not read saved data.")); };
      transaction.oncomplete = async function () {
        try {
          var encoded = [];
          for (var record of records) {
            encoded.push({ key: await encodeValue(record.key), value: await encodeValue(record.value) });
          }
          resolve({
            name: storeName,
            keyPath: keyPath,
            autoIncrement: autoIncrement,
            indexes: indexes,
            records: encoded
          });
        } catch (error) {
          reject(error);
        }
      };
    });
  }

  async function exportDatabase(name) {
    var db = await openExistingDatabase(name);
    if (!db) return null;
    try {
      var stores = [];
      for (var storeName of Array.from(db.objectStoreNames)) stores.push(await readStore(db, storeName));
      return { name: name, version: db.version, stores: stores };
    } finally {
      db.close();
    }
  }

  function createStoreSchema(db, storeDefinition) {
    if (db.objectStoreNames.contains(storeDefinition.name)) return;
    var options = { autoIncrement: Boolean(storeDefinition.autoIncrement) };
    if (storeDefinition.keyPath !== null && storeDefinition.keyPath !== undefined) options.keyPath = storeDefinition.keyPath;
    var store = db.createObjectStore(storeDefinition.name, options);
    for (var index of storeDefinition.indexes || []) {
      store.createIndex(index.name, index.keyPath, { unique: Boolean(index.unique), multiEntry: Boolean(index.multiEntry) });
    }
  }

  function openDatabaseForRestore(definition) {
    return new Promise(function (resolve, reject) {
      var request = indexedDB.open(definition.name);
      request.onupgradeneeded = function () {
        for (var storeDefinition of definition.stores) createStoreSchema(request.result, storeDefinition);
      };
      request.onerror = function () { reject(request.error || new Error("Could not open saved app data.")); };
      request.onblocked = function () { reject(new Error("Close open NEO apps and try importing again.")); };
      request.onsuccess = function () {
        var db = request.result;
        var missingStore = definition.stores.some(function (storeDefinition) { return !db.objectStoreNames.contains(storeDefinition.name); });
        if (!missingStore) {
          resolve(db);
          return;
        }
        var nextVersion = db.version + 1;
        db.close();
        var upgrade = indexedDB.open(definition.name, nextVersion);
        upgrade.onupgradeneeded = function () {
          for (var storeDefinition of definition.stores) createStoreSchema(upgrade.result, storeDefinition);
        };
        upgrade.onerror = function () { reject(upgrade.error || new Error("Could not restore saved app data.")); };
        upgrade.onblocked = function () { reject(new Error("Close open NEO apps and try importing again.")); };
        upgrade.onsuccess = function () { resolve(upgrade.result); };
      };
    });
  }

  async function restoreStore(db, definition) {
    var decodedRecords = [];
    for (var record of definition.records) {
      decodedRecords.push({ key: await decodeValue(record.key), value: await decodeValue(record.value) });
    }
    return new Promise(function (resolve, reject) {
      var transaction;
      try {
        transaction = db.transaction(definition.name, "readwrite");
      } catch (error) {
        reject(error);
        return;
      }
      var store = transaction.objectStore(definition.name);
      store.clear();
      for (var record of decodedRecords) {
        if (store.keyPath === null) store.put(record.value, record.key);
        else store.put(record.value);
      }
      transaction.oncomplete = function () { resolve(); };
      transaction.onerror = function () { reject(transaction.error || new Error("Could not restore saved data.")); };
      transaction.onabort = function () { reject(transaction.error || new Error("Could not restore saved data.")); };
    });
  }

  async function restoreDatabase(definition) {
    var db = await openDatabaseForRestore(definition);
    try {
      for (var storeDefinition of definition.stores) await restoreStore(db, storeDefinition);
    } finally {
      db.close();
    }
  }

  function validateBackup(payload) {
    if (!payload || payload.format !== FORMAT || payload.version !== FORMAT_VERSION) {
      throw new Error("Choose a NEO OS backup file created by this version.");
    }
    if (!payload.storage || typeof payload.storage.localStorage !== "object" || !Array.isArray(payload.storage.indexedDB)) {
      throw new Error("This backup file is incomplete.");
    }
    for (var database of payload.storage.indexedDB) {
      if (!database || !isSafeDatabaseName(database.name) || !Array.isArray(database.stores)) {
        throw new Error("This backup contains an invalid saved-data section.");
      }
      for (var store of database.stores) {
        if (!store || typeof store.name !== "string" || !Array.isArray(store.records)) {
          throw new Error("This backup contains an invalid app-data section.");
        }
      }
    }
    return payload;
  }

  function restoreLocalStorage(values) {
    var currentKeys = [];
    for (var index = 0; index < localStorage.length; index += 1) currentKeys.push(localStorage.key(index));
    for (var currentKey of currentKeys) {
      if (isSafeStorageKey(currentKey)) localStorage.removeItem(currentKey);
    }
    for (var key of Object.keys(values)) {
      if (isSafeStorageKey(key) && typeof values[key] === "string") localStorage.setItem(key, values[key]);
    }
  }

  function readFileText(file) {
    if (typeof file.text === "function") return file.text();
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || "")); };
      reader.onerror = function () { reject(reader.error || new Error("Could not read the selected file.")); };
      reader.readAsText(file);
    });
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  async function downloadBackup() {
    setBusy(true);
    notify("Preparing backup", "Collecting your NEO OS settings and saved files.", "download");
    try {
      var databaseNames = await existingDatabaseNames();
      var databases = [];
      for (var name of databaseNames) {
        var exported = await exportDatabase(name);
        if (exported) databases.push(exported);
      }
      var payload = {
        format: FORMAT,
        version: FORMAT_VERSION,
        createdAt: new Date().toISOString(),
        app: "NEO OS",
        storage: {
          localStorage: readLocalStorage(),
          indexedDB: databases
        }
      };
      var json = JSON.stringify(payload);
      var date = new Date().toISOString().slice(0, 10);
      downloadBlob(new Blob([json], { type: "application/json" }), "neo-os-backup-" + date + ".neo-backup");
      notify("Backup downloaded", "Your settings and saved local content are in one file.", "check");
    } catch (error) {
      notify("Backup failed", error && error.message ? error.message : "NEO OS could not create the backup.", "info");
    } finally {
      setBusy(false);
    }
  }

  async function importBackup(file) {
    setBusy(true);
    notify("Importing backup", "Restoring your NEO OS settings and saved files.", "upload");
    try {
      var text = await readFileText(file);
      var payload = validateBackup(JSON.parse(text));
      for (var database of payload.storage.indexedDB) await restoreDatabase(database);
      restoreLocalStorage(payload.storage.localStorage);
      notify("Backup restored", "Reloading NEO OS with your saved data.", "check");
      window.setTimeout(function () { window.location.reload(); }, 650);
    } catch (error) {
      notify("Import failed", error && error.message ? error.message : "That backup could not be restored.", "info");
      setBusy(false);
    }
  }

  downloadButton.addEventListener("click", downloadBackup);
  importButton.addEventListener("click", function () {
    fileInput.value = "";
    fileInput.click();
  });
  fileInput.addEventListener("change", function () {
    var file = fileInput.files && fileInput.files[0];
    if (file) importBackup(file);
  });
})();
