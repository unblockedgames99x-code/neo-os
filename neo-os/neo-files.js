(function () {
  "use strict";

  var DB_NAME = "neo_os_files_v1";
  var DB_VERSION = 1;
  var STORE_NAME = "entries";
  var ROOT_ID = "root";
  var TRASH_ID = "trash";
  var VIEW_KEY = "neo_os_files_view_v1";
  var PAGE_SIZE = 180;
  var api = null;
  var dbPromise = null;
  var readyPromise = null;
  var persistent = true;
  var memoryEntries = new Map();
  var mounts = new Set();

  var defaultFolders = [
    { id: "folder-desktop", name: "Desktop", icon: "monitor", order: 1 },
    { id: "folder-documents", name: "Documents", icon: "file", order: 2 },
    { id: "folder-downloads", name: "Downloads", icon: "download", order: 3 },
    { id: "folder-pictures", name: "Pictures", icon: "image", order: 4 },
    { id: "folder-music", name: "Music", icon: "music", order: 5 },
    { id: "folder-videos", name: "Videos", icon: "film", order: 6 }
  ];
  var protectedFolderIds = new Set(defaultFolders.map(function (folder) { return folder.id; }));

  function makeId(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return prefix + "-" + window.crypto.randomUUID();
    return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function openDatabase() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve) {
      if (!window.indexedDB) {
        persistent = false;
        resolve(null);
        return;
      }
      var request;
      try {
        request = window.indexedDB.open(DB_NAME, DB_VERSION);
      } catch (error) {
        persistent = false;
        resolve(null);
        return;
      }
      request.onupgradeneeded = function () {
        var database = request.result;
        var store = database.objectStoreNames.contains(STORE_NAME)
          ? request.transaction.objectStore(STORE_NAME)
          : database.createObjectStore(STORE_NAME, { keyPath: "id" });
        if (!store.indexNames.contains("parentId")) store.createIndex("parentId", "parentId", { unique: false });
        if (!store.indexNames.contains("trashedAt")) store.createIndex("trashedAt", "trashedAt", { unique: false });
        if (!store.indexNames.contains("modifiedAt")) store.createIndex("modifiedAt", "modifiedAt", { unique: false });
      };
      request.onsuccess = function () {
        var database = request.result;
        database.onversionchange = function () { database.close(); };
        resolve(database);
      };
      request.onerror = function () {
        persistent = false;
        resolve(null);
      };
      request.onblocked = function () {
        persistent = false;
        resolve(null);
      };
    });
    return dbPromise;
  }

  function allEntries() {
    return openDatabase().then(function (database) {
      if (!database) return Array.from(memoryEntries.values());
      return new Promise(function (resolve, reject) {
        var transaction = database.transaction(STORE_NAME, "readonly");
        var request = transaction.objectStore(STORE_NAME).getAll();
        request.onsuccess = function () { resolve(request.result || []); };
        request.onerror = function () { reject(request.error || new Error("Could not read Drive.")); };
      });
    });
  }

  function putEntry(entry) {
    return openDatabase().then(function (database) {
      if (!database) {
        memoryEntries.set(entry.id, entry);
        return entry;
      }
      return new Promise(function (resolve, reject) {
        var transaction = database.transaction(STORE_NAME, "readwrite");
        transaction.oncomplete = function () { resolve(entry); };
        transaction.onerror = function () { reject(transaction.error || new Error("Could not save to Drive.")); };
        transaction.onabort = function () { reject(transaction.error || new Error("Could not save to Drive.")); };
        transaction.objectStore(STORE_NAME).put(entry);
      });
    });
  }

  function removeEntry(id) {
    return openDatabase().then(function (database) {
      if (!database) {
        memoryEntries.delete(id);
        return;
      }
      return new Promise(function (resolve, reject) {
        var transaction = database.transaction(STORE_NAME, "readwrite");
        transaction.oncomplete = resolve;
        transaction.onerror = function () { reject(transaction.error || new Error("Could not delete the item.")); };
        transaction.objectStore(STORE_NAME).delete(id);
      });
    });
  }

  function ensureReady() {
    if (readyPromise) return readyPromise;
    readyPromise = allEntries().then(function (entries) {
      var ids = new Set(entries.map(function (entry) { return entry.id; }));
      var createdAt = Date.now();
      return Promise.all(defaultFolders.filter(function (folder) { return !ids.has(folder.id); }).map(function (folder) {
        return putEntry({
          id: folder.id,
          parentId: ROOT_ID,
          kind: "folder",
          name: folder.name,
          nameLower: folder.name.toLocaleLowerCase(),
          type: "inode/directory",
          size: 0,
          createdAt: createdAt,
          modifiedAt: createdAt,
          order: folder.order,
          system: true,
          trashedAt: null
        });
      }));
    });
    return readyPromise;
  }

  function cleanName(value, fallback) {
    var name = String(value || "").replace(/[\u0000-\u001f\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim();
    name = name.replace(/^\.+|\.+$/g, "").trim();
    return (name || fallback || "Untitled").slice(0, 180);
  }

  function splitName(name) {
    var index = name.lastIndexOf(".");
    if (index <= 0 || index === name.length - 1) return { base: name, extension: "" };
    return { base: name.slice(0, index), extension: name.slice(index) };
  }

  function uniqueName(name, parentId, entries, ignoreId) {
    var normalized = cleanName(name, "Untitled");
    var used = new Set(entries.filter(function (entry) {
      return entry.parentId === parentId && !entry.trashedAt && entry.id !== ignoreId;
    }).map(function (entry) { return entry.name.toLocaleLowerCase(); }));
    if (!used.has(normalized.toLocaleLowerCase())) return normalized;
    var parts = splitName(normalized);
    var number = 2;
    var candidate = "";
    do {
      candidate = parts.base + " (" + number + ")" + parts.extension;
      number += 1;
    } while (used.has(candidate.toLocaleLowerCase()));
    return candidate;
  }

  function publicEntry(entry) {
    return {
      id: entry.id,
      parentId: entry.parentId,
      kind: entry.kind,
      name: entry.name,
      type: entry.type,
      size: Number(entry.size || 0),
      createdAt: Number(entry.createdAt || 0),
      modifiedAt: Number(entry.modifiedAt || 0),
      trashedAt: entry.trashedAt || null
    };
  }

  function resolveParentId(options, entries) {
    var requested = options && (options.parentId || options.folder);
    if (!requested) return "folder-downloads";
    if (requested === ROOT_ID) return ROOT_ID;
    var exact = entries.find(function (entry) { return entry.kind === "folder" && entry.id === requested && !entry.trashedAt; });
    if (exact) return exact.id;
    var name = String(requested).toLocaleLowerCase();
    var named = entries.find(function (entry) { return entry.kind === "folder" && entry.name.toLocaleLowerCase() === name && !entry.trashedAt; });
    return named ? named.id : "folder-downloads";
  }

  function emitSaved(entry) {
    window.dispatchEvent(new CustomEvent("neo-file-saved", { detail: publicEntry(entry) }));
  }

  function refreshAll() {
    mounts.forEach(function (mount) { refreshMount(mount, false); });
  }

  function saveBlob(name, blob, options) {
    if (!blob || typeof blob.arrayBuffer !== "function") return Promise.reject(new TypeError("A Blob or File is required."));
    return ensureReady().then(allEntries).then(function (entries) {
      var parentId = resolveParentId(options || {}, entries);
      var savedName = uniqueName(name || blob.name || "Download", parentId, entries);
      var time = Date.now();
      var entry = {
        id: makeId("file"),
        parentId: parentId,
        kind: "file",
        name: savedName,
        nameLower: savedName.toLocaleLowerCase(),
        type: blob.type || "application/octet-stream",
        size: Number(blob.size || 0),
        blob: blob,
        createdAt: time,
        modifiedAt: Number(blob.lastModified || time),
        trashedAt: null
      };
      return putEntry(entry).then(function () {
        emitSaved(entry);
        refreshAll();
        if (!(options && options.quiet) && api) api.notify("Saved to Drive", savedName + " is in My Drive.", "folder");
        return publicEntry(entry);
      });
    });
  }

  function list(options) {
    return ensureReady().then(allEntries).then(function (entries) {
      var includeTrash = Boolean(options && options.includeTrash);
      return entries.filter(function (entry) { return includeTrash || !entry.trashedAt; }).map(publicEntry);
    });
  }

  function formatBytes(bytes) {
    var value = Number(bytes || 0);
    if (value < 1024) return value + " B";
    var units = ["KB", "MB", "GB", "TB"];
    var unit = -1;
    do { value /= 1024; unit += 1; } while (value >= 1024 && unit < units.length - 1);
    return value.toFixed(value >= 10 ? 1 : 2).replace(/\.0$/, "") + " " + units[unit];
  }

  function formatDate(value) {
    if (!value) return "Unknown";
    try {
      return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
    } catch (error) {
      return new Date(value).toLocaleString();
    }
  }

  function iconFor(entry) {
    if (entry.kind === "folder") return "folder";
    var type = String(entry.type || "");
    if (type.indexOf("image/") === 0) return "image";
    if (type.indexOf("audio/") === 0) return "music";
    if (type.indexOf("video/") === 0) return "film";
    return "file";
  }

  function hiddenByTrashedFolder(entries) {
    var hidden = new Set(entries.filter(function (entry) { return entry.kind === "folder" && entry.trashedAt; }).map(function (entry) { return entry.id; }));
    var changed = true;
    while (changed) {
      changed = false;
      entries.forEach(function (entry) {
        if (!hidden.has(entry.id) && hidden.has(entry.parentId)) {
          hidden.add(entry.id);
          changed = true;
        }
      });
    }
    return hidden;
  }

  function activeEntries(entries) {
    var hidden = hiddenByTrashedFolder(entries);
    return entries.filter(function (entry) { return !entry.trashedAt && !hidden.has(entry.id); });
  }

  function folderChain(folderId, entries) {
    var chain = [];
    var current = folderId;
    var guard = 0;
    while (current && current !== ROOT_ID && guard < 32) {
      var folder = entries.find(function (entry) { return entry.id === current && entry.kind === "folder"; });
      if (!folder) break;
      chain.unshift(folder);
      current = folder.parentId;
      guard += 1;
    }
    return chain;
  }

  function sortEntries(entries, sort) {
    return entries.slice().sort(function (a, b) {
      if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
      if (a.kind === "folder" && Number(a.order || 0) !== Number(b.order || 0)) return Number(a.order || 999) - Number(b.order || 999);
      if (sort === "date") return Number(b.modifiedAt || 0) - Number(a.modifiedAt || 0) || a.name.localeCompare(b.name);
      if (sort === "size") return Number(b.size || 0) - Number(a.size || 0) || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
    });
  }

  function filesMarkup(shell) {
    return [
      '<section class="neo-files" data-files-app>',
      '  <header class="files-commandbar">',
      '    <div class="files-brand"><img src="./assets/google-drive.svg" width="32" height="28" alt="" /><strong>Drive</strong></div>',
      '    <label class="files-search">' + shell.icon("search") + '<span class="sr-only">Search Drive</span><input type="search" data-files-search placeholder="Search in Drive" autocomplete="off" /></label>',
      '    <div class="files-header-actions" aria-label="Drive actions"><span data-files-storage>Checking storage</span><button type="button" data-files-import>' + shell.icon("upload") + '<span>Upload</span></button><button type="button" data-files-new-folder>' + shell.icon("folder") + '<span>New folder</span></button></div>',
      '  </header>',
      '  <div class="files-layout">',
      '    <aside class="files-sidebar" aria-label="Locations">',
      '      <details class="files-new" data-files-new-menu><summary>' + shell.icon("plus") + '<span>New</span></summary><div class="files-new-popover"><button type="button" data-files-new-folder>' + shell.icon("folder") + '<span>New folder</span></button><i></i><button type="button" data-files-import>' + shell.icon("upload") + '<span>File upload</span></button></div></details>',
      '      <nav class="files-locations">',
      '        <button type="button" data-files-location="root">' + shell.icon("folder") + '<span>My Drive</span></button>',
      defaultFolders.map(function (folder) { return '<button class="is-child" type="button" data-files-location="' + folder.id + '">' + shell.icon(folder.icon) + '<span>' + folder.name + '</span></button>'; }).join(""),
      '        <button type="button" data-files-location="trash">' + shell.icon("trash") + '<span>Trash</span><em data-files-trash-count></em></button>',
      '      </nav>',
      '      <div class="files-storage-meter" aria-hidden="true"><span data-files-storage-meter></span></div>',
      '      <p class="files-storage-note" data-files-storage-note>Your Drive stays on this device.</p>',
      '    </aside>',
      '    <main class="files-main">',
      '      <div class="files-toolbar">',
      '        <div class="files-folder-heading"><div class="files-history" aria-label="Folder history"><button type="button" data-files-back aria-label="Back">' + shell.icon("arrow-left") + '</button><button type="button" data-files-forward aria-label="Forward">' + shell.icon("arrow-right") + '</button><button type="button" data-files-up aria-label="Up one folder">' + shell.icon("upload") + '</button></div><nav class="files-breadcrumbs" data-files-breadcrumbs aria-label="Current folder"></nav></div>',
      '        <div class="files-view-actions"><button type="button" data-files-empty-trash hidden>' + shell.icon("trash") + '<span>Empty trash</span></button><label><span class="sr-only">Sort files</span><select data-files-sort aria-label="Sort files"><option value="name">Name</option><option value="date">Last modified</option><option value="size">File size</option></select></label><span class="files-segmented" aria-label="File view"><button type="button" data-files-view="grid" aria-label="Grid view">' + shell.icon("grid") + '</button><button type="button" data-files-view="list" aria-label="List view">' + shell.icon("list") + '</button></span></div>',
      '      </div>',
      '      <input type="file" data-files-input multiple hidden />',
      '      <div class="files-dropzone" data-files-dropzone>',
      '        <div class="files-loading" data-files-loading role="status"><span></span><strong>Opening Drive</strong></div>',
      '        <div class="files-collection" data-files-collection role="grid" aria-label="Files and folders"></div>',
      '        <div class="files-empty" data-files-empty hidden><span>' + shell.icon("folder") + '</span><strong>This folder is empty</strong><p>Upload files or create a folder to get started.</p><button type="button" data-files-empty-add>Upload files</button></div>',
      '        <div class="files-drop-hint" aria-hidden="true"><span>' + shell.icon("upload") + '</span><strong>Drop files into Drive</strong></div>',
      '      </div>',
      '      <footer class="files-status"><span data-files-status role="status" aria-live="polite"></span><button type="button" data-files-more hidden>Show more</button></footer>',
      '    </main>',
      '    <aside class="files-inspector" data-files-inspector aria-label="File details"></aside>',
      '  </div>',
      '  <dialog class="files-dialog" data-files-name-dialog><form method="dialog"><header><strong data-files-name-title>New folder</strong><button type="button" data-files-dialog-close aria-label="Close">' + shell.icon("close") + '</button></header><label><span data-files-name-label>Name</span><input type="text" data-files-name-input maxlength="180" autocomplete="off" /></label><p data-files-name-error role="alert"></p><footer><button type="button" data-files-dialog-close>Cancel</button><button class="files-primary" type="submit" value="confirm">Create</button></footer></form></dialog>',
      '  <dialog class="files-dialog files-confirm" data-files-delete-dialog><form method="dialog"><header><strong>Delete permanently?</strong><button type="button" data-files-dialog-close aria-label="Close">' + shell.icon("close") + '</button></header><p data-files-delete-copy>This cannot be undone.</p><footer><button type="button" data-files-dialog-close>Cancel</button><button class="files-danger" type="submit" value="confirm">Delete</button></footer></form></dialog>',
      '  <dialog class="files-preview-dialog" data-files-preview-dialog><header><strong data-files-preview-title>Open file</strong><div><button type="button" data-files-preview-download>' + shell.icon("download") + '<span>Save to device</span></button><button type="button" data-files-dialog-close aria-label="Close file">' + shell.icon("close") + '</button></div></header><div class="files-preview-stage" data-files-preview-stage></div></dialog>',
      '  <div class="files-context-menu" data-files-context-menu role="menu" hidden><button type="button" role="menuitem" data-files-action="open">Open</button><button type="button" role="menuitem" data-files-action="rename">Rename</button><button type="button" role="menuitem" data-files-action="download">Save to device</button><span></span><button type="button" role="menuitem" data-files-action="trash">Move to trash</button><button type="button" role="menuitem" data-files-action="restore">Restore</button><button type="button" role="menuitem" class="is-danger" data-files-action="delete">Delete permanently</button></div>',
      '  <p class="sr-only" data-files-live aria-live="polite"></p>',
      '</section>'
    ].join("");
  }

  function openDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function closeDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  function clearObjectUrls(state) {
    state.objectUrls.forEach(function (url) { URL.revokeObjectURL(url); });
    state.objectUrls.clear();
  }

  function objectUrl(state, blob) {
    if (!window.URL || typeof window.URL.createObjectURL !== "function") return "";
    var url = window.URL.createObjectURL(blob);
    state.objectUrls.add(url);
    return url;
  }

  function announce(mount, message) {
    mount.root.querySelector("[data-files-live]").textContent = message;
  }

  function setBusy(mount, busy, message) {
    mount.state.busy = busy;
    mount.root.dataset.busy = busy ? "true" : "false";
    mount.root.querySelectorAll("[data-files-import], [data-files-new-folder], [data-files-empty-trash]").forEach(function (button) { button.disabled = busy; });
    if (message) announce(mount, message);
  }

  function selectedEntry(mount) {
    return mount.state.entries.find(function (entry) { return entry.id === mount.state.selectedId; }) || null;
  }

  function selectEntry(mount, id) {
    mount.state.selectedId = id || "";
    mount.root.querySelectorAll("[data-file-id]").forEach(function (item) {
      var selected = item.dataset.fileId === mount.state.selectedId;
      item.classList.toggle("is-selected", selected);
      item.setAttribute("aria-selected", selected ? "true" : "false");
    });
    renderInspector(mount);
  }

  function locationTitle(mount) {
    if (mount.state.query) return "Search results";
    if (mount.state.location === TRASH_ID) return "Trash";
    if (mount.state.location === ROOT_ID) return "My Drive";
    var folder = mount.state.entries.find(function (entry) { return entry.id === mount.state.location; });
    return folder ? folder.name : "My Drive";
  }

  function visibleEntries(mount) {
    var state = mount.state;
    var active = activeEntries(state.entries);
    var query = state.query.toLocaleLowerCase();
    var visible;
    if (query) {
      visible = active.filter(function (entry) {
        return (entry.name + " " + entry.type).toLocaleLowerCase().indexOf(query) !== -1;
      });
    } else if (state.location === TRASH_ID) {
      visible = state.entries.filter(function (entry) { return Boolean(entry.trashedAt); });
    } else {
      visible = active.filter(function (entry) { return entry.parentId === state.location; });
    }
    return sortEntries(visible, state.sort);
  }

  function renderBreadcrumbs(mount) {
    var state = mount.state;
    var breadcrumbs = mount.root.querySelector("[data-files-breadcrumbs]");
    breadcrumbs.textContent = "";
    function add(id, label, current) {
      var button = document.createElement("button");
      button.type = "button";
      button.dataset.filesCrumb = id;
      button.textContent = label;
      if (current) button.setAttribute("aria-current", "page");
      breadcrumbs.appendChild(button);
    }
    if (state.query) {
      add(state.location, "My Drive", false);
      var divider = document.createElement("span");
      divider.textContent = "/";
      breadcrumbs.appendChild(divider);
      add(state.location, "Search results", true);
      return;
    }
    if (state.location === TRASH_ID) {
      add(ROOT_ID, "My Drive", false);
      var trashDivider = document.createElement("span");
      trashDivider.textContent = "/";
      breadcrumbs.appendChild(trashDivider);
      add(TRASH_ID, "Trash", true);
      return;
    }
    var chain = folderChain(state.location, state.entries);
    add(ROOT_ID, "My Drive", chain.length === 0);
    chain.forEach(function (folder, index) {
      var divider = document.createElement("span");
      divider.textContent = "/";
      breadcrumbs.appendChild(divider);
      add(folder.id, folder.name, index === chain.length - 1);
    });
  }

  function renderLocations(mount) {
    var state = mount.state;
    var chainIds = new Set(folderChain(state.location, state.entries).map(function (folder) { return folder.id; }));
    mount.root.querySelectorAll("[data-files-location]").forEach(function (button) {
      var id = button.dataset.filesLocation;
      var active = !state.query && (state.location === id || chainIds.has(id));
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    var trashCount = state.entries.filter(function (entry) { return Boolean(entry.trashedAt); }).length;
    mount.root.querySelector("[data-files-trash-count]").textContent = trashCount ? String(trashCount) : "";
  }

  function renderStorage(mount) {
    var bytes = mount.state.entries.reduce(function (total, entry) { return total + (entry.kind === "file" ? Number(entry.size || 0) : 0); }, 0);
    var label = mount.root.querySelector("[data-files-storage]");
    var note = mount.root.querySelector("[data-files-storage-note]");
    var meter = mount.root.querySelector("[data-files-storage-meter]");
    label.textContent = formatBytes(bytes) + " used";
    note.textContent = persistent ? "Private to this NEO OS profile." : "Temporary until this tab closes.";
    if (navigator.storage && typeof navigator.storage.estimate === "function") {
      navigator.storage.estimate().then(function (estimate) {
        if (!mount.root.isConnected) return;
        var quota = Number(estimate.quota || 0);
        var usage = Number(estimate.usage || bytes);
        meter.style.width = Math.min(100, quota ? usage / quota * 100 : 0).toFixed(2) + "%";
        if (quota) label.textContent = formatBytes(bytes) + " used";
      }).catch(function () { meter.style.width = "0%"; });
    }
  }

  function makeFileItem(mount, entry) {
    var state = mount.state;
    var button = document.createElement("button");
    button.type = "button";
    button.className = "files-item is-" + entry.kind;
    button.dataset.fileId = entry.id;
    button.setAttribute("role", "gridcell");
    button.setAttribute("aria-selected", entry.id === state.selectedId ? "true" : "false");
    if (entry.id === state.selectedId) button.classList.add("is-selected");

    var art = document.createElement("span");
    art.className = "files-item-art is-" + iconFor(entry);
    if (entry.kind === "file" && String(entry.type).indexOf("image/") === 0 && entry.blob) {
      var url = objectUrl(state, entry.blob);
      if (url) {
        var image = document.createElement("img");
        image.src = url;
        image.alt = "";
        image.loading = "lazy";
        image.decoding = "async";
        art.appendChild(image);
      } else art.innerHTML = api.icon(iconFor(entry));
    } else {
      art.innerHTML = api.icon(iconFor(entry));
    }

    var copy = document.createElement("span");
    copy.className = "files-item-copy";
    var name = document.createElement("strong");
    name.textContent = entry.name;
    var meta = document.createElement("small");
    meta.textContent = entry.kind === "folder" ? "Folder" : (formatBytes(entry.size) + " - " + formatDate(entry.modifiedAt));
    copy.append(name, meta);

    var size = document.createElement("small");
    size.className = "files-item-size";
    size.textContent = entry.kind === "file" ? formatBytes(entry.size) : "";
    var date = document.createElement("small");
    date.className = "files-item-date";
    date.textContent = formatDate(entry.modifiedAt);
    button.append(art, copy, size, date);
    return button;
  }

  function renderCollection(mount) {
    var state = mount.state;
    clearObjectUrls(state);
    var allVisible = visibleEntries(mount);
    var visible = allVisible.slice(0, state.limit);
    var collection = mount.root.querySelector("[data-files-collection]");
    collection.textContent = "";
    collection.classList.toggle("is-list", state.view === "list");
    if (state.view === "grid" && !state.query) {
      var folders = visible.filter(function (entry) { return entry.kind === "folder"; });
      var files = visible.filter(function (entry) { return entry.kind !== "folder"; });
      function appendGroup(label, entries) {
        if (!entries.length) return;
        var heading = document.createElement("h2");
        heading.className = "files-group-heading";
        heading.textContent = label;
        collection.appendChild(heading);
        entries.forEach(function (entry) { collection.appendChild(makeFileItem(mount, entry)); });
      }
      appendGroup("Folders", folders);
      appendGroup("Files", files);
    } else {
      visible.forEach(function (entry) { collection.appendChild(makeFileItem(mount, entry)); });
    }
    var empty = mount.root.querySelector("[data-files-empty]");
    empty.hidden = state.loading || visible.length > 0;
    var emptyTitle = empty.querySelector("strong");
    var emptyCopy = empty.querySelector("p");
    if (state.query) {
      emptyTitle.textContent = "No matching files";
      emptyCopy.textContent = "Try a shorter search or another file name.";
    } else if (state.location === TRASH_ID) {
      emptyTitle.textContent = "Trash is empty";
      emptyCopy.textContent = "Deleted items will appear here until you remove them permanently.";
    } else {
      emptyTitle.textContent = "This folder is empty";
      emptyCopy.textContent = "Add files or create a folder to get started.";
    }
    empty.querySelector("[data-files-empty-add]").hidden = state.location === TRASH_ID;
    mount.root.querySelector("[data-files-loading]").hidden = !state.loading;
    var totalBytes = allVisible.reduce(function (total, entry) { return total + Number(entry.size || 0); }, 0);
    var status = allVisible.length + (allVisible.length === 1 ? " item" : " items");
    if (totalBytes) status += " - " + formatBytes(totalBytes);
    if (allVisible.length > visible.length) status += " - showing " + visible.length;
    mount.root.querySelector("[data-files-status]").textContent = status;
    var more = mount.root.querySelector("[data-files-more]");
    more.hidden = visible.length >= allVisible.length;
    mount.root.querySelector("[data-files-empty-trash]").hidden = state.location !== TRASH_ID || allVisible.length === 0;
  }

  function inspectorButton(action, label, icon, className) {
    var button = document.createElement("button");
    button.type = "button";
    button.dataset.filesAction = action;
    if (className) button.className = className;
    if (icon) button.innerHTML = api.icon(icon) + "<span></span>";
    else button.appendChild(document.createElement("span"));
    button.querySelector("span").textContent = label;
    return button;
  }

  function renderInspector(mount) {
    var state = mount.state;
    var inspector = mount.root.querySelector("[data-files-inspector]");
    var entry = selectedEntry(mount);
    inspector.textContent = "";
    inspector.classList.toggle("is-empty", !entry);
    if (!entry) {
      inspector.innerHTML = '<div class="files-inspector-empty"><span>' + api.icon("info") + '</span><strong>File details</strong><p>Select an item to view it and manage it.</p></div>';
      return;
    }
    var head = document.createElement("div");
    head.className = "files-inspector-head";
    var art = document.createElement("span");
    art.className = "files-inspector-art is-" + iconFor(entry);
    art.innerHTML = api.icon(iconFor(entry));
    var title = document.createElement("h2");
    title.textContent = entry.name;
    var type = document.createElement("p");
    type.textContent = entry.kind === "folder" ? "Folder" : (entry.type || "File");
    head.append(art, title, type);

    var facts = document.createElement("dl");
    facts.className = "files-facts";
    var factsData = [
      ["Size", entry.kind === "folder" ? "--" : formatBytes(entry.size)],
      ["Modified", formatDate(entry.modifiedAt)],
      ["Location", state.location === TRASH_ID ? "Trash" : locationTitle(mount)]
    ];
    factsData.forEach(function (fact) {
      var term = document.createElement("dt");
      term.textContent = fact[0];
      var description = document.createElement("dd");
      description.textContent = fact[1];
      facts.append(term, description);
    });

    var actions = document.createElement("div");
    actions.className = "files-inspector-actions";
    actions.appendChild(inspectorButton("open", entry.kind === "folder" ? "Open folder" : "Open", entry.kind === "folder" ? "folder" : "external", "files-primary"));
    if (entry.kind === "file") actions.appendChild(inspectorButton("download", "Save to device", "download"));
    if (!protectedFolderIds.has(entry.id) && !entry.trashedAt) actions.appendChild(inspectorButton("rename", "Rename", null));
    if (entry.trashedAt) {
      actions.appendChild(inspectorButton("restore", "Restore", "refresh"));
      actions.appendChild(inspectorButton("delete", "Delete permanently", "trash", "files-danger-quiet"));
    } else if (!protectedFolderIds.has(entry.id)) {
      actions.appendChild(inspectorButton("trash", "Move to trash", "trash", "files-danger-quiet"));
    }
    inspector.append(head, facts, actions);
  }

  function renderControls(mount) {
    var state = mount.state;
    mount.root.dataset.view = state.view;
    mount.root.querySelectorAll("[data-files-view]").forEach(function (button) {
      var active = button.dataset.filesView === state.view;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    mount.root.querySelector("[data-files-sort]").value = state.sort;
    mount.root.querySelector("[data-files-back]").disabled = state.historyIndex <= 0;
    mount.root.querySelector("[data-files-forward]").disabled = state.historyIndex >= state.history.length - 1;
    var canGoUp = state.location !== ROOT_ID && state.location !== TRASH_ID;
    mount.root.querySelector("[data-files-up]").disabled = !canGoUp;
    var readOnly = state.location === TRASH_ID;
    mount.root.querySelector("[data-files-import]").hidden = readOnly;
    mount.root.querySelector("[data-files-new-folder]").hidden = readOnly;
  }

  function renderMount(mount) {
    var state = mount.state;
    var active = activeEntries(state.entries);
    if (state.location !== ROOT_ID && state.location !== TRASH_ID && !active.some(function (entry) { return entry.id === state.location && entry.kind === "folder"; })) {
      state.location = ROOT_ID;
    }
    if (state.selectedId && !state.entries.some(function (entry) { return entry.id === state.selectedId; })) state.selectedId = "";
    renderBreadcrumbs(mount);
    renderLocations(mount);
    renderControls(mount);
    renderCollection(mount);
    renderInspector(mount);
    renderStorage(mount);
  }

  function refreshMount(mount, initial) {
    if (initial) {
      mount.state.loading = true;
      renderMount(mount);
    }
    return ensureReady().then(allEntries).then(function (entries) {
      if (!mount.root.isConnected) return;
      mount.state.entries = entries;
      mount.state.loading = false;
      mount.state.error = "";
      renderMount(mount);
    }).catch(function (error) {
      if (!mount.root.isConnected) return;
      mount.state.loading = false;
      mount.state.error = error && error.message ? error.message : "Drive is unavailable.";
      mount.root.querySelector("[data-files-status]").textContent = mount.state.error;
      announce(mount, mount.state.error);
    });
  }

  function navigate(mount, location, record) {
    var state = mount.state;
    state.location = location || ROOT_ID;
    state.query = "";
    state.selectedId = "";
    state.limit = PAGE_SIZE;
    mount.root.querySelector("[data-files-search]").value = "";
    if (record !== false) {
      state.history = state.history.slice(0, state.historyIndex + 1);
      if (state.history[state.history.length - 1] !== state.location) state.history.push(state.location);
      state.historyIndex = state.history.length - 1;
    }
    renderMount(mount);
  }

  function openNameDialog(mount, mode, entry) {
    var dialog = mount.root.querySelector("[data-files-name-dialog]");
    dialog.dataset.mode = mode;
    dialog.dataset.entryId = entry ? entry.id : "";
    dialog.querySelector("[data-files-name-title]").textContent = mode === "folder" ? "New folder" : (mode === "text" ? "New text document" : "Rename item");
    dialog.querySelector("[data-files-name-label]").textContent = mode === "folder" ? "Folder name" : (mode === "text" ? "File name" : "New name");
    var input = dialog.querySelector("[data-files-name-input]");
    input.value = entry ? entry.name : (mode === "text" ? "New Text Document.txt" : "New folder");
    dialog.querySelector("[data-files-name-error]").textContent = "";
    openDialog(dialog);
    window.setTimeout(function () { input.focus(); input.select(); }, 20);
  }

  function submitNameDialog(mount, dialog) {
    var state = mount.state;
    var input = dialog.querySelector("[data-files-name-input]");
    var name = cleanName(input.value, "");
    var error = dialog.querySelector("[data-files-name-error]");
    if (!name) {
      error.textContent = "Enter a name.";
      input.focus();
      return Promise.resolve(false);
    }
    if (dialog.dataset.mode === "folder") {
      var parentId = state.location === TRASH_ID ? ROOT_ID : state.location;
      var folderName = uniqueName(name, parentId, state.entries);
      var time = Date.now();
      return putEntry({ id: makeId("folder"), parentId: parentId, kind: "folder", name: folderName, nameLower: folderName.toLocaleLowerCase(), type: "inode/directory", size: 0, createdAt: time, modifiedAt: time, trashedAt: null }).then(function () {
        closeDialog(dialog);
        refreshAll();
        announce(mount, folderName + " created.");
        return true;
      });
    }
    if (dialog.dataset.mode === "text") {
      var textName = /\.txt$/i.test(name) ? name : name + ".txt";
      var textParentId = state.location === TRASH_ID ? ROOT_ID : state.location;
      return saveBlob(textName, new Blob([""], { type: "text/plain" }), { parentId: textParentId, quiet: true }).then(function (saved) {
        closeDialog(dialog);
        announce(mount, saved.name + " created.");
        return true;
      });
    }
    var entry = state.entries.find(function (item) { return item.id === dialog.dataset.entryId; });
    if (!entry || protectedFolderIds.has(entry.id)) return Promise.resolve(false);
    entry.name = uniqueName(name, entry.parentId, state.entries, entry.id);
    entry.nameLower = entry.name.toLocaleLowerCase();
    entry.modifiedAt = Date.now();
    return putEntry(entry).then(function () {
      closeDialog(dialog);
      refreshAll();
      announce(mount, "Renamed to " + entry.name + ".");
      return true;
    });
  }

  function importFiles(mount, fileList) {
    var files = Array.from(fileList || []).filter(function (file) { return file && typeof file.arrayBuffer === "function"; });
    if (!files.length) return Promise.resolve([]);
    var state = mount.state;
    var parentId = state.location === TRASH_ID ? "folder-downloads" : state.location;
    setBusy(mount, true, "Saving " + files.length + (files.length === 1 ? " file." : " files."));
    return ensureReady().then(allEntries).then(function (entries) {
      var saved = [];
      return files.reduce(function (chain, file) {
        return chain.then(function () {
          var name = uniqueName(file.name || "Imported file", parentId, entries);
          var time = Date.now();
          var entry = { id: makeId("file"), parentId: parentId, kind: "file", name: name, nameLower: name.toLocaleLowerCase(), type: file.type || "application/octet-stream", size: Number(file.size || 0), blob: file, createdAt: time, modifiedAt: Number(file.lastModified || time), trashedAt: null };
          entries.push(entry);
          return putEntry(entry).then(function () { saved.push(entry); emitSaved(entry); });
        });
      }, Promise.resolve()).then(function () { return saved; });
    }).then(function (saved) {
      setBusy(mount, false, saved.length + (saved.length === 1 ? " file saved." : " files saved."));
      if (api) api.notify("Saved to Drive", saved.length + (saved.length === 1 ? " item was" : " items were") + " added to My Drive.", "folder");
      refreshAll();
      return saved.map(publicEntry);
    }).catch(function (error) {
      setBusy(mount, false, "Could not save the files.");
      var message = error && error.name === "QuotaExceededError" ? "Drive is out of local storage space." : (error.message || "The device rejected the files.");
      if (api) api.notify("Items were not saved", message, "info");
      throw error;
    });
  }

  function trashEntry(mount, entry) {
    if (!entry || protectedFolderIds.has(entry.id)) return Promise.resolve();
    entry.originalParentId = entry.parentId;
    entry.trashedAt = Date.now();
    entry.modifiedAt = Date.now();
    return putEntry(entry).then(function () {
      mount.state.selectedId = "";
      refreshAll();
      announce(mount, entry.name + " moved to trash.");
    });
  }

  function restoreEntry(mount, entry) {
    if (!entry) return Promise.resolve();
    var active = activeEntries(mount.state.entries);
    var parentId = entry.originalParentId;
    if (parentId !== ROOT_ID && !active.some(function (item) { return item.id === parentId && item.kind === "folder"; })) parentId = ROOT_ID;
    entry.parentId = parentId || ROOT_ID;
    entry.trashedAt = null;
    entry.originalParentId = null;
    entry.name = uniqueName(entry.name, entry.parentId, mount.state.entries, entry.id);
    entry.nameLower = entry.name.toLocaleLowerCase();
    entry.modifiedAt = Date.now();
    return putEntry(entry).then(function () {
      mount.state.selectedId = "";
      refreshAll();
      announce(mount, entry.name + " restored.");
    });
  }

  function descendantIds(entryId, entries) {
    var ids = new Set([entryId]);
    var changed = true;
    while (changed) {
      changed = false;
      entries.forEach(function (entry) {
        if (!ids.has(entry.id) && ids.has(entry.parentId)) {
          ids.add(entry.id);
          changed = true;
        }
      });
    }
    return ids;
  }

  function deletePermanently(mount, entry) {
    if (!entry || protectedFolderIds.has(entry.id)) return Promise.resolve();
    var ids = descendantIds(entry.id, mount.state.entries);
    return Array.from(ids).reduce(function (chain, id) { return chain.then(function () { return removeEntry(id); }); }, Promise.resolve()).then(function () {
      mount.state.selectedId = "";
      refreshAll();
      announce(mount, entry.name + " deleted permanently.");
    });
  }

  function emptyTrash(mount) {
    var roots = mount.state.entries.filter(function (entry) { return Boolean(entry.trashedAt); });
    var ids = new Set();
    roots.forEach(function (entry) { descendantIds(entry.id, mount.state.entries).forEach(function (id) { ids.add(id); }); });
    return Array.from(ids).reduce(function (chain, id) { return chain.then(function () { return removeEntry(id); }); }, Promise.resolve()).then(function () {
      mount.state.selectedId = "";
      refreshAll();
      announce(mount, "Trash emptied.");
    });
  }

  function saveToDevice(entry) {
    if (!entry || entry.kind !== "file" || !entry.blob) return Promise.resolve(false);
    if (typeof window.showSaveFilePicker === "function" && window.isSecureContext) {
      return window.showSaveFilePicker({ suggestedName: entry.name }).then(function (handle) {
        return handle.createWritable().then(function (writable) {
          return writable.write(entry.blob).then(function () { return writable.close(); });
        });
      }).then(function () { return true; }).catch(function (error) {
        if (error && error.name === "AbortError") return false;
        throw error;
      });
    }
    var url = URL.createObjectURL(entry.blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = entry.name;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    return Promise.resolve(true);
  }

  function fillPreview(stage, entry, state) {
    stage.textContent = "";
    var type = String(entry.type || "");
    var url;
    if (type.indexOf("image/") === 0) {
      url = objectUrl(state, entry.blob);
      var image = document.createElement("img");
      image.src = url;
      image.alt = entry.name;
      stage.appendChild(image);
      return;
    }
    if (type.indexOf("video/") === 0) {
      url = objectUrl(state, entry.blob);
      var video = document.createElement("video");
      video.src = url;
      video.controls = true;
      video.autoplay = false;
      stage.appendChild(video);
      return;
    }
    if (type.indexOf("audio/") === 0) {
      url = objectUrl(state, entry.blob);
      var audio = document.createElement("audio");
      audio.src = url;
      audio.controls = true;
      stage.appendChild(audio);
      return;
    }
    if (type === "application/pdf") {
      url = objectUrl(state, entry.blob);
      var frame = document.createElement("iframe");
      frame.src = url;
      frame.title = entry.name;
      stage.appendChild(frame);
      return;
    }
    if (type.indexOf("text/") === 0 || /\.(txt|md|json|js|css|html|csv|log)$/i.test(entry.name)) {
      var pre = document.createElement("pre");
      pre.textContent = "Reading file...";
      stage.appendChild(pre);
      entry.blob.slice(0, 512 * 1024).text().then(function (value) {
        if (pre.isConnected) pre.textContent = value || "This file is empty.";
      }).catch(function () { if (pre.isConnected) pre.textContent = "This text file could not be read."; });
      return;
    }
    var fallback = document.createElement("div");
    fallback.className = "files-preview-fallback";
    fallback.innerHTML = api.icon(iconFor(entry)) + "<strong></strong><p></p>";
    fallback.querySelector("strong").textContent = entry.name;
    fallback.querySelector("p").textContent = formatBytes(entry.size) + " - this file type cannot be opened here.";
    stage.appendChild(fallback);
  }

  function previewEntry(mount, entry) {
    if (!entry) return;
    if (entry.kind === "folder") {
      navigate(mount, entry.id, true);
      return;
    }
    var dialog = mount.root.querySelector("[data-files-preview-dialog]");
    dialog.dataset.entryId = entry.id;
    dialog.querySelector("[data-files-preview-title]").textContent = entry.name;
    fillPreview(dialog.querySelector("[data-files-preview-stage]"), entry, mount.state);
    openDialog(dialog);
  }

  function openDeleteDialog(mount, entry, empty) {
    var dialog = mount.root.querySelector("[data-files-delete-dialog]");
    dialog.dataset.entryId = entry ? entry.id : "";
    dialog.dataset.emptyTrash = empty ? "true" : "false";
    dialog.querySelector("header strong").textContent = empty ? "Empty trash?" : "Delete permanently?";
    dialog.querySelector("[data-files-delete-copy]").textContent = empty
      ? "Every item in Trash will be removed from NEO OS. This cannot be undone."
      : (entry.name + " will be removed from NEO OS. This cannot be undone.");
    openDialog(dialog);
  }

  function runAction(mount, action) {
    var entry = selectedEntry(mount);
    if (!entry) return;
    if (action === "open") previewEntry(mount, entry);
    if (action === "rename") openNameDialog(mount, "rename", entry);
    if (action === "download") saveToDevice(entry).then(function (saved) { if (saved) announce(mount, entry.name + " saved to this device."); }).catch(function (error) { if (api) api.notify("Could not save file", error.message || "The download was blocked.", "info"); });
    if (action === "trash") trashEntry(mount, entry);
    if (action === "restore") restoreEntry(mount, entry);
    if (action === "delete") openDeleteDialog(mount, entry, false);
  }

  function showContextMenu(mount, entry, event) {
    selectEntry(mount, entry.id);
    var menu = mount.root.querySelector("[data-files-context-menu]");
    menu.hidden = false;
    menu.querySelector('[data-files-action="rename"]').hidden = protectedFolderIds.has(entry.id) || Boolean(entry.trashedAt);
    menu.querySelector('[data-files-action="download"]').hidden = entry.kind !== "file";
    menu.querySelector('[data-files-action="trash"]').hidden = protectedFolderIds.has(entry.id) || Boolean(entry.trashedAt);
    menu.querySelector('[data-files-action="restore"]').hidden = !entry.trashedAt;
    menu.querySelector('[data-files-action="delete"]').hidden = !entry.trashedAt;
    var x = Math.min(event.clientX, window.innerWidth - 190);
    var y = Math.min(event.clientY, window.innerHeight - 220);
    menu.style.left = Math.max(8, x) + "px";
    menu.style.top = Math.max(8, y) + "px";
    menu.querySelector("button:not([hidden])").focus();
  }

  function bindMount(mount) {
    var root = mount.root;
    var state = mount.state;
    var input = root.querySelector("[data-files-input]");
    var search = root.querySelector("[data-files-search]");
    var dropzone = root.querySelector("[data-files-dropzone]");
    var coarsePointer = window.matchMedia("(hover: none), (pointer: coarse)");
    var itemHoldTimer = 0;
    var itemHoldStart = null;
    var suppressItemClickUntil = 0;

    function cancelItemHold() {
      if (itemHoldTimer) window.clearTimeout(itemHoldTimer);
      itemHoldTimer = 0;
      itemHoldStart = null;
    }

    root.addEventListener("pointerdown", function (event) {
      var item = event.target.closest("[data-file-id]");
      if (!coarsePointer.matches || !item || event.pointerType === "mouse" || !event.isPrimary) return;
      cancelItemHold();
      itemHoldStart = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, item: item };
      itemHoldTimer = window.setTimeout(function () {
        if (!itemHoldStart) return;
        var entry = state.entries.find(function (candidate) { return candidate.id === item.dataset.fileId; });
        if (entry) {
          showContextMenu(mount, entry, { clientX: itemHoldStart.x, clientY: itemHoldStart.y });
          suppressItemClickUntil = Date.now() + 500;
          if (navigator.vibrate) {
            try { navigator.vibrate(16); } catch (error) {}
          }
        }
        cancelItemHold();
      }, 520);
    }, { passive: true });

    root.addEventListener("pointermove", function (event) {
      if (!itemHoldStart || event.pointerId !== itemHoldStart.pointerId) return;
      if (Math.hypot(event.clientX - itemHoldStart.x, event.clientY - itemHoldStart.y) > 12) cancelItemHold();
    }, { passive: true });

    ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (name) {
      root.addEventListener(name, cancelItemHold, { passive: true });
    });

    root.addEventListener("click", function (event) {
      if (Date.now() < suppressItemClickUntil && event.target.closest("[data-file-id]")) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      var menu = root.querySelector("[data-files-context-menu]");
      var newMenu = root.querySelector("[data-files-new-menu]");
      if (!event.target.closest("[data-files-context-menu]")) menu.hidden = true;
      if (newMenu && !event.target.closest("[data-files-new-menu]")) newMenu.open = false;
      var location = event.target.closest("[data-files-location], [data-files-crumb]");
      if (location) { navigate(mount, location.dataset.filesLocation || location.dataset.filesCrumb, true); return; }
      if (event.target.closest("[data-files-back]")) { if (state.historyIndex > 0) { state.historyIndex -= 1; navigate(mount, state.history[state.historyIndex], false); } return; }
      if (event.target.closest("[data-files-forward]")) { if (state.historyIndex < state.history.length - 1) { state.historyIndex += 1; navigate(mount, state.history[state.historyIndex], false); } return; }
      if (event.target.closest("[data-files-up]")) {
        var folder = state.entries.find(function (entry) { return entry.id === state.location; });
        navigate(mount, folder ? folder.parentId : ROOT_ID, true);
        return;
      }
      if (event.target.closest("[data-files-import], [data-files-empty-add]")) { if (newMenu) newMenu.open = false; input.click(); return; }
      if (event.target.closest("[data-files-new-folder]")) { if (newMenu) newMenu.open = false; openNameDialog(mount, "folder"); return; }
      if (event.target.closest("[data-files-empty-trash]")) { openDeleteDialog(mount, null, true); return; }
      var view = event.target.closest("[data-files-view]");
      if (view) {
        state.view = view.dataset.filesView;
        try { localStorage.setItem(VIEW_KEY, state.view); } catch (error) {}
        renderMount(mount);
        return;
      }
      if (event.target.closest("[data-files-more]")) { state.limit += PAGE_SIZE; renderMount(mount); return; }
      var item = event.target.closest("[data-file-id]");
      if (item) {
        selectEntry(mount, item.dataset.fileId);
        if (coarsePointer.matches) {
          var tappedEntry = state.entries.find(function (candidate) { return candidate.id === item.dataset.fileId; });
          if (tappedEntry) previewEntry(mount, tappedEntry);
        }
        return;
      }
      var action = event.target.closest("[data-files-action]");
      if (action) { runAction(mount, action.dataset.filesAction); menu.hidden = true; return; }
      if (event.target.closest("[data-files-preview-download]")) {
        var previewEntryItem = state.entries.find(function (entry) { return entry.id === root.querySelector("[data-files-preview-dialog]").dataset.entryId; });
        saveToDevice(previewEntryItem);
        return;
      }
      var close = event.target.closest("[data-files-dialog-close]");
      if (close) { closeDialog(close.closest("dialog")); return; }
    });

    root.addEventListener("dblclick", function (event) {
      var item = event.target.closest("[data-file-id]");
      if (!item) return;
      var entry = state.entries.find(function (candidate) { return candidate.id === item.dataset.fileId; });
      previewEntry(mount, entry);
    });

    root.addEventListener("contextmenu", function (event) {
      var item = event.target.closest("[data-file-id]");
      if (!item) return;
      event.preventDefault();
      var entry = state.entries.find(function (candidate) { return candidate.id === item.dataset.fileId; });
      if (entry) showContextMenu(mount, entry, event);
    });

    search.addEventListener("input", function () {
      state.query = search.value.trim();
      state.selectedId = "";
      state.limit = PAGE_SIZE;
      renderMount(mount);
    });
    root.querySelector("[data-files-sort]").addEventListener("change", function (event) { state.sort = event.target.value; renderMount(mount); });
    input.addEventListener("change", function () { importFiles(mount, input.files).catch(function () {}); input.value = ""; });

    ["dragenter", "dragover"].forEach(function (type) {
      dropzone.addEventListener(type, function (event) { event.preventDefault(); dropzone.classList.add("is-dragging"); });
    });
    ["dragleave", "drop"].forEach(function (type) {
      dropzone.addEventListener(type, function (event) {
        event.preventDefault();
        if (type === "drop") importFiles(mount, event.dataTransfer.files).catch(function () {});
        dropzone.classList.remove("is-dragging");
      });
    });

    root.querySelector("[data-files-name-dialog] form").addEventListener("submit", function (event) {
      event.preventDefault();
      submitNameDialog(mount, event.currentTarget.closest("dialog")).catch(function (error) {
        event.currentTarget.querySelector("[data-files-name-error]").textContent = error.message || "Could not save the name.";
      });
    });
    root.querySelector("[data-files-delete-dialog] form").addEventListener("submit", function (event) {
      event.preventDefault();
      var dialog = event.currentTarget.closest("dialog");
      var operation = dialog.dataset.emptyTrash === "true"
        ? emptyTrash(mount)
        : deletePermanently(mount, state.entries.find(function (entry) { return entry.id === dialog.dataset.entryId; }));
      operation.then(function () { closeDialog(dialog); }).catch(function (error) { if (api) api.notify("Could not delete item", error.message || "The device rejected the change.", "info"); });
    });

    root.addEventListener("keydown", function (event) {
      if (event.target.matches("input, textarea, select")) return;
      var focusedItem = event.target.closest("[data-file-id]");
      if (focusedItem) selectEntry(mount, focusedItem.dataset.fileId);
      if ((event.ctrlKey || event.metaKey) && event.key === "/") { event.preventDefault(); search.focus(); return; }
      if (event.key === "Delete" && selectedEntry(mount)) { event.preventDefault(); runAction(mount, selectedEntry(mount).trashedAt ? "delete" : "trash"); }
      if (event.key === "F2" && selectedEntry(mount) && !protectedFolderIds.has(selectedEntry(mount).id)) { event.preventDefault(); runAction(mount, "rename"); }
      if (event.key === "Enter" && selectedEntry(mount)) { event.preventDefault(); runAction(mount, "open"); }
      if (focusedItem && (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10"))) {
        event.preventDefault();
        event.stopPropagation();
        var focusedEntry = selectedEntry(mount);
        var rect = focusedItem.getBoundingClientRect();
        if (focusedEntry) showContextMenu(mount, focusedEntry, { clientX: rect.left + 12, clientY: rect.top + 12 });
        return;
      }
      if (event.key === "Escape") {
        root.querySelector("[data-files-context-menu]").hidden = true;
        var newMenu = root.querySelector("[data-files-new-menu]");
        if (newMenu) newMenu.open = false;
      }
    });
  }

  function mount(id, host, shellApi) {
    if (id !== "files" || !host || !shellApi) return;
    api = shellApi;
    host.innerHTML = filesMarkup(shellApi);
    var root = host.querySelector("[data-files-app]");
    var savedView = "grid";
    try { savedView = localStorage.getItem(VIEW_KEY) || "grid"; } catch (error) {}
    if (savedView !== "list") savedView = "grid";
    var mountState = {
      root: root,
      state: {
        entries: [],
        location: ROOT_ID,
        history: [ROOT_ID],
        historyIndex: 0,
        query: "",
        sort: "name",
        view: savedView,
        selectedId: "",
        loading: true,
        busy: false,
        limit: PAGE_SIZE,
        objectUrls: new Set()
      }
    };
    mounts.add(mountState);
    bindMount(mountState);
    refreshMount(mountState, true);
    var hostWindow = host.closest(".neo-window");
    if (hostWindow) hostWindow._neoExtraCleanup = function () {
      clearObjectUrls(mountState.state);
      mounts.delete(mountState);
    };
  }

  function openCreate(kind) {
    var available = Array.from(mounts).filter(function (mountState) { return mountState.root && mountState.root.isConnected; });
    var mountState = available[available.length - 1];
    if (!mountState) return false;
    openNameDialog(mountState, kind === "text" ? "text" : "folder");
    return true;
  }

  window.NEO_FILES = {
    mount: mount,
    saveBlob: saveBlob,
    saveFile: function (file, options) { return saveBlob(file && file.name, file, options); },
    list: list,
    openCreate: openCreate
  };

  window.addEventListener("neo-files-save", function (event) {
    var detail = event.detail || {};
    var blob = detail.blob;
    if (!blob && typeof detail.text === "string") blob = new Blob([detail.text], { type: detail.type || "text/plain" });
    if (!blob) return;
    saveBlob(detail.name || "Download", blob, detail.options || {}).catch(function (error) {
      if (api) api.notify("Could not save item", error.message || "Drive rejected the item.", "info");
    });
  });
})();
