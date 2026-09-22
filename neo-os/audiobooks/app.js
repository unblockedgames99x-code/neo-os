(function () {
  "use strict";

  var books = [
    { id: "253", title: "Pride and Prejudice", author: "Jane Austen", reader: "LibriVox volunteers", genre: "Romance", duration: "13:06:44", initials: "PP", description: "The Bennet family navigates reputation, marriage, and mistaken first impressions in Jane Austen's enduring comedy of manners.", source: "https://librivox.org/pride-and-prejudice-by-jane-austen/", tracks: [] },
    { id: "7976", title: "Frankenstein", author: "Mary Shelley", reader: "Thomas A. Copeland", genre: "Gothic fiction", duration: "08:44:47", initials: "FR", description: "Victor Frankenstein discovers the cost of creating life and abandoning the being that depends on him.", source: "https://librivox.org/frankenstein-edition-1831-by-mary-shelley-wollstonecraft/", tracks: [] },
    { id: "13800", title: "The Adventures of Sherlock Holmes", author: "Arthur Conan Doyle", reader: "StudioMike", genre: "Mystery", duration: "09:35:41", initials: "SH", description: "Twelve cases from Baker Street, told by Dr. Watson and solved by the world's best-known consulting detective.", source: "https://librivox.org/the-adventures-of-sherlock-holmes-version-5-by-sir-arthur-conan-doyle/", tracks: [] },
    { id: "817", title: "The Time Machine", author: "H. G. Wells", reader: "LibriVox volunteers", genre: "Science fiction", duration: "04:09:29", initials: "TM", description: "A Victorian inventor travels to the year 802,701 and discovers a future divided between the Eloi and the Morlocks.", source: "https://librivox.org/the-time-machine-by-hg-wells/", tracks: [] },
    { id: "628", title: "Little Women", author: "Louisa May Alcott", reader: "LibriVox volunteers", genre: "Literature", duration: "18:59:39", initials: "LW", description: "Meg, Jo, Beth, and Amy March grow up together through hardship, work, love, and loss.", source: "https://librivox.org/little-women-by-louisa-may-alcott/", tracks: [] },
    { id: "365", title: "The Picture of Dorian Gray", author: "Oscar Wilde", reader: "John Gonzalez", genre: "Gothic fiction", duration: "06:11:32", initials: "DG", description: "A young man remains outwardly untouched while a hidden portrait records the consequences of his choices.", source: "https://librivox.org/the-picture-of-dorian-gray-by-oscar-wilde/", tracks: [] }
  ];

  var audio = document.querySelector("[data-audio]");
  var grid = document.querySelector("[data-book-grid]");
  var notice = document.querySelector("[data-notice]");
  var details = document.getElementById("chapters");
  var state = { query: "", genre: "All", savedOnly: false, saved: [], selectedId: books[0].id, trackIndex: 0, speed: 1, volume: 1, autoplay: true };

  try { state.saved = JSON.parse(localStorage.getItem("neo_audiobook_library_v1") || "[]"); } catch (_error) { state.saved = []; }
  if (!Array.isArray(state.saved)) state.saved = [];

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
    });
  }

  function formatTime(value) {
    var seconds = Math.max(0, Math.floor(Number(value) || 0));
    var hours = Math.floor(seconds / 3600);
    var minutes = Math.floor((seconds % 3600) / 60);
    var remainder = String(seconds % 60).padStart(2, "0");
    return hours ? hours + ":" + String(minutes).padStart(2, "0") + ":" + remainder : minutes + ":" + remainder;
  }

  function selectedBook() { return books.find(function (book) { return book.id === state.selectedId; }) || books[0]; }
  function selectedTrack() { return selectedBook().tracks[state.trackIndex] || null; }
  function storeSaved() { localStorage.setItem("neo_audiobook_library_v1", JSON.stringify(state.saved)); }

  function emitMedia(active) {
    var book = selectedBook();
    var track = selectedTrack();
    if (!track) return;
    parent.dispatchEvent(new CustomEvent("neo-media-state", { detail: {
      source: "audiobooks",
      appId: "audiobooks",
      icon: "audiobooks",
      title: book.title,
      copy: (state.trackIndex + 1) + ". " + track.title,
      state: audio.paused ? "PAUSED" : "PLAYING",
      playing: !audio.paused,
      position: audio.currentTime || 0,
      duration: Number.isFinite(audio.duration) ? audio.duration : Number(track.duration) || 0,
      volume: audio.volume,
      volumeControl: true,
      transport: true,
      active: active !== false,
      kind: "audio",
      pauseWallpaper: false
    } }));
  }

  function renderGenres() {
    var genres = ["All"].concat(Array.from(new Set(books.map(function (book) { return book.genre; }))));
    document.querySelector("[data-genres]").innerHTML = genres.map(function (genre) {
      return '<button type="button" data-genre="' + escapeHtml(genre) + '" aria-pressed="' + String(state.genre === genre) + '">' + escapeHtml(genre) + '</button>';
    }).join("");
  }

  function renderBooks() {
    var query = state.query.trim().toLowerCase();
    var visible = books.filter(function (book) {
      var haystack = (book.title + " " + book.author + " " + book.genre).toLowerCase();
      return (!query || haystack.indexOf(query) !== -1) && (state.genre === "All" || book.genre === state.genre) && (!state.savedOnly || state.saved.indexOf(book.id) !== -1);
    });
    document.querySelector("[data-book-count]").textContent = visible.length + (visible.length === 1 ? " book" : " books");
    document.querySelector("[data-saved-count]").textContent = String(state.saved.length);
    document.querySelector("[data-saved-filter]").setAttribute("aria-pressed", String(state.savedOnly));
    if (!visible.length) {
      grid.innerHTML = '<div class="empty"><h2>No matching books</h2><button type="button" data-clear-filters>Clear filters</button></div>';
      return;
    }
    grid.innerHTML = visible.map(function (book) {
      var saved = state.saved.indexOf(book.id) !== -1;
      return '<article class="book-card">' +
        '<button class="cover" type="button" data-select-book="' + book.id + '"><small>' + escapeHtml(book.author) + '</small><strong>' + escapeHtml(book.initials) + '</strong><span>' + escapeHtml(book.title) + '</span></button>' +
        '<div class="card-title"><div><h2>' + escapeHtml(book.title) + '</h2><p>' + escapeHtml(book.author) + '</p></div><button class="save" type="button" data-save-book="' + book.id + '" aria-label="' + (saved ? "Remove from" : "Add to") + ' saved books">' + (saved ? "&#9829;" : "&#9825;") + '</button></div>' +
        '<div class="meta"><span>' + escapeHtml(book.genre) + '</span><span>' + escapeHtml(book.duration) + '</span><span>' + book.tracks.length + ' tracks</span></div>' +
        '<button class="listen" type="button" data-play-book="' + book.id + '"' + (book.tracks.length ? "" : " disabled") + '>Listen from the beginning</button>' +
      '</article>';
    }).join("");
  }

  function renderDetails() {
    var book = selectedBook();
    details.hidden = false;
    document.querySelector("[data-summary]").innerHTML = '<div class="small-cover">' + escapeHtml(book.initials) + '</div><p class="genre">' + escapeHtml(book.genre) + '</p><h2>' + escapeHtml(book.title) + '</h2><h3>' + escapeHtml(book.author) + '</h3><p class="description">' + escapeHtml(book.description) + '</p><dl><div><dt>Reader</dt><dd>' + escapeHtml(book.reader) + '</dd></div><div><dt>Length</dt><dd>' + escapeHtml(book.duration) + '</dd></div><div><dt>Source</dt><dd><a href="' + escapeHtml(book.source) + '" target="_blank" rel="noreferrer">LibriVox</a></dd></div></dl>';
    document.querySelector("[data-chapter-count]").textContent = book.tracks.length + " tracks";
    document.querySelector("[data-chapter-list]").innerHTML = book.tracks.map(function (track, index) {
      var current = book.id === state.selectedId && index === state.trackIndex;
      return '<button class="chapter-row' + (current ? " current" : "") + '" type="button" data-play-track="' + index + '"><span>' + String(index + 1).padStart(2, "0") + '</span><strong>' + escapeHtml(track.title) + '</strong><small>' + formatTime(track.duration) + '</small><b>' + (current && !audio.paused ? "II" : "&#9654;") + '</b></button>';
    }).join("");
  }

  function renderPlayer() {
    var book = selectedBook();
    var track = selectedTrack();
    var player = document.querySelector("[data-player]");
    player.hidden = !track;
    if (!track) return;
    document.querySelector("[data-now-art]").textContent = book.initials;
    document.querySelector("[data-now-book]").textContent = book.title;
    document.querySelector("[data-now-track]").textContent = (state.trackIndex + 1) + ". " + track.title;
    document.querySelector("[data-play]").textContent = audio.paused ? "\u25b6" : "II";
    document.querySelector("[data-play]").setAttribute("aria-label", audio.paused ? "Play" : "Pause");
    document.querySelector("[data-previous]").disabled = state.trackIndex === 0;
    document.querySelector("[data-next]").disabled = state.trackIndex >= book.tracks.length - 1;
    var duration = Number.isFinite(audio.duration) ? audio.duration : Number(track.duration) || 0;
    document.querySelector("[data-elapsed]").textContent = formatTime(audio.currentTime);
    document.querySelector("[data-duration]").textContent = formatTime(duration);
    document.querySelector("[data-seek]").max = String(duration || 1);
    document.querySelector("[data-seek]").value = String(Math.min(audio.currentTime || 0, duration || 1));
  }

  function chooseBook(id, scroll) {
    var book = books.find(function (item) { return item.id === id; });
    if (!book) return;
    state.selectedId = id;
    state.trackIndex = 0;
    renderDetails();
    if (scroll) details.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function playTrack(index, forcePlay) {
    var track = selectedBook().tracks[index];
    if (!track) return;
    var changed = state.trackIndex !== index || audio.src !== new URL(track.src, location.href).href;
    state.trackIndex = index;
    if (changed) {
      audio.pause();
      audio.src = track.src;
      audio.currentTime = 0;
      audio.load();
    }
    audio.playbackRate = state.speed;
    audio.volume = state.volume;
    renderDetails();
    renderPlayer();
    if (forcePlay !== false) audio.play().catch(function () { renderPlayer(); emitMedia(true); });
  }

  function nextTrack() {
    if (state.trackIndex < selectedBook().tracks.length - 1) playTrack(state.trackIndex + 1, true);
    else { audio.pause(); audio.currentTime = 0; renderPlayer(); emitMedia(true); }
  }

  function previousTrack() {
    if (audio.currentTime > 5) { audio.currentTime = 0; return; }
    if (state.trackIndex > 0) playTrack(state.trackIndex - 1, true);
  }

  document.addEventListener("click", function (event) {
    var target = event.target.closest("button");
    if (!target) return;
    if (target.matches("[data-genre]")) { state.genre = target.dataset.genre; renderGenres(); renderBooks(); }
    if (target.matches("[data-saved-filter]")) { state.savedOnly = !state.savedOnly; renderBooks(); }
    if (target.matches("[data-save-book]")) {
      var id = target.dataset.saveBook;
      state.saved = state.saved.indexOf(id) === -1 ? state.saved.concat(id) : state.saved.filter(function (savedId) { return savedId !== id; });
      storeSaved(); renderBooks();
    }
    if (target.matches("[data-select-book]")) chooseBook(target.dataset.selectBook, true);
    if (target.matches("[data-play-book]")) { chooseBook(target.dataset.playBook, false); playTrack(0, true); }
    if (target.matches("[data-play-track]")) playTrack(Number(target.dataset.playTrack), true);
    if (target.matches("[data-clear-filters]")) { state.query = ""; state.genre = "All"; state.savedOnly = false; document.querySelector("[data-search]").value = ""; renderGenres(); renderBooks(); }
    if (target.matches("[data-play]")) { if (audio.paused) audio.play().catch(function () {}); else audio.pause(); }
    if (target.matches("[data-next]")) nextTrack();
    if (target.matches("[data-previous]")) previousTrack();
    if (target.matches("[data-autoplay]")) { state.autoplay = !state.autoplay; target.setAttribute("aria-pressed", String(state.autoplay)); }
  });

  document.querySelector("[data-search]").addEventListener("input", function (event) { state.query = event.target.value; renderBooks(); });
  document.querySelector("[data-seek]").addEventListener("input", function (event) { audio.currentTime = Number(event.target.value) || 0; renderPlayer(); });
  document.querySelector("[data-volume]").addEventListener("input", function (event) { state.volume = Number(event.target.value); audio.volume = state.volume; emitMedia(true); });
  document.querySelector("[data-speed]").addEventListener("change", function (event) { state.speed = Number(event.target.value) || 1; audio.playbackRate = state.speed; });

  ["play", "pause", "loadedmetadata", "timeupdate", "volumechange"].forEach(function (name) {
    audio.addEventListener(name, function () { renderPlayer(); renderDetails(); emitMedia(true); });
  });
  audio.addEventListener("ended", function () { if (state.autoplay) nextTrack(); else { renderPlayer(); emitMedia(true); } });
  audio.addEventListener("error", function () { notice.hidden = false; notice.className = "notice error"; notice.textContent = "This chapter could not load. Choose another chapter or try again."; });

  function handleParentTransport(event) {
    var detail = event.detail || {};
    if (detail.source !== "audiobooks") return;
    if (detail.action === "toggle") { if (audio.paused) audio.play().catch(function () {}); else audio.pause(); }
    if (detail.action === "next") nextTrack();
    if (detail.action === "previous") previousTrack();
  }
  parent.addEventListener("neo-media-transport-request", handleParentTransport);
  parent.addEventListener("neo-media-volume-request", function (event) {
    var detail = event.detail || {};
    if (detail.source !== "audiobooks") return;
    state.volume = Math.max(0, Math.min(1, Number(detail.volume) || 0));
    audio.volume = state.volume;
    document.querySelector("[data-volume]").value = String(state.volume);
  });
  window.addEventListener("beforeunload", function () { emitMedia(false); });

  renderGenres();
  renderBooks();
  fetch("./catalog.json", { cache: "force-cache" }).then(function (response) {
    if (!response.ok) throw new Error("Catalog unavailable");
    return response.json();
  }).then(function (feeds) {
    books.forEach(function (book) {
      var feed = feeds.find(function (item) { return String(item.id) === book.id; });
      book.tracks = feed && Array.isArray(feed.tracks) ? feed.tracks : [];
    });
    notice.hidden = true;
    renderBooks();
    chooseBook(state.selectedId, false);
  }).catch(function () {
    notice.className = "notice error";
    notice.textContent = "The local chapter catalog could not be read. Reopen Audiobooks to try again.";
  });
})();
