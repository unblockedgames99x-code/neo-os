(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const config = window.NEO_MUSIC_CONFIG;
  const asset = window.neoMusicAsset;
  const audio = $('audio');
  const fallback = asset('media/fallback.svg');
  const library = new Map();
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(config.storageKey) || '{}') || {}; } catch (_) {}
  const state = {
    view: 'browse', query: '', playlist: '', current: '', queue: [], index: -1,
    favourites: new Set(Array.isArray(saved.favourites) ? saved.favourites : []),
    recent: Array.isArray(saved.recent) ? saved.recent : [],
    playlists: Array.isArray(saved.playlists) ? saved.playlists.filter(p => p && typeof p.id === 'string' && typeof p.name === 'string' && Array.isArray(p.tracks)) : [],
    shuffle: saved.shuffle === true, repeat: ['all', 'one'].includes(saved.repeat) ? saved.repeat : 'off',
    loading: false, error: '', ready: false
  };
  let database, dbPromise, playlistTrack = '', menuTrack = '', menuReturn = null, coverTrack = '';
  let previewEnd = 0, loadSequence = 0, slowTimer = 0, toastTimer = 0, lastBroadcast = 0;
  let saveWarning = false, importing = false;
  const icon = (name) => '<svg aria-hidden="true"><use href="#i-' + name + '"></use></svg>';
  const escapeHTML = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const time = (seconds) => { const n = Math.max(0, Math.floor(Number(seconds) || 0)); return Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0'); };
  const current = () => library.get(state.current);
  const uniqueId = () => 'local-' + (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  const allTracks = () => Array.from(library.values());
  function notify(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, 3600); }
  function notice(message) { $('notice').textContent = message; $('notice').hidden = !message; }
  function persist() {
    try {
      localStorage.setItem(config.storageKey, JSON.stringify({
        favourites: Array.from(state.favourites), recent: state.recent.slice(0, 100), playlists: state.playlists,
        queue: state.queue, index: state.index, volume: audio.volume, muted: audio.muted, shuffle: state.shuffle, repeat: state.repeat
      }));
    } catch (_) { if (!saveWarning) { saveWarning = true; notice('Browser storage is unavailable. Changes will last for this session only. Keep your original music files.'); } }
  }
  function openDatabase() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error('Device storage is unavailable.'));
      const request = indexedDB.open(config.database, 1);
      request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('tracks')) request.result.createObjectStore('tracks', {keyPath:'id'}); };
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Close other NEO Music tabs and retry.'));
      request.onsuccess = () => { database = request.result; database.onversionchange = () => database.close(); resolve(database); };
    });
    return dbPromise;
  }
  async function databaseOperation(mode, operation) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('tracks', mode);
      const request = operation(tx.objectStore('tracks'));
      let result;
      request.onsuccess = () => { result = request.result; };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error || request.error);
      tx.onabort = () => reject(tx.error || new Error('The file could not be saved.'));
    });
  }
  function hydrate(record) {
    const track = Object.assign({}, record);
    track.src = track.file instanceof Blob ? URL.createObjectURL(track.file) : asset(track.src);
    track.cover = track.coverFile instanceof Blob ? URL.createObjectURL(track.coverFile) : asset(track.cover || 'media/fallback.svg');
    library.set(track.id, track);
    return track;
  }
  async function storeTrack(track) {
    if (!track.imported) return;
    await databaseOperation('readwrite', store => store.put({
      id:track.id, title:track.title, artist:track.artist, album:track.album, duration:track.duration,
      file:track.file, coverFile:track.coverFile || null, cover:'media/fallback.svg', color:track.color,
      imported:true, genre:'Imported', fileName:track.fileName, size:track.size
    }));
  }
  function coverImage(track, className, size) {
    return '<img class="' + className + '" src="' + escapeHTML(track.cover || fallback) + '" alt="" width="' + size + '" height="' + size + '" loading="lazy" decoding="async">';
  }
  function visibleTracks() {
    let tracks = allTracks();
    if (state.view === 'favourites') tracks = tracks.filter(t => state.favourites.has(t.id));
    if (state.view === 'recent') tracks = state.recent.map(id => library.get(id)).filter(Boolean);
    if (state.view === 'playlists') {
      const selected = state.playlists.find(p => p.id === state.playlist);
      tracks = selected ? selected.tracks.map(id => library.get(id)).filter(Boolean) : [];
    }
    const query = state.query.trim().toLocaleLowerCase();
    return query ? tracks.filter(t => [t.title,t.artist,t.album,t.genre].join(' ').toLocaleLowerCase().includes(query)) : tracks;
  }
  function renderFeatured() {
    const tracks = allTracks().filter(t => !t.imported).slice(0, 3);
    $('featured').innerHTML = tracks.map(track => '<article class="featured-card" data-track-id="' + escapeHTML(track.id) + '" tabindex="0" aria-label="' + escapeHTML(track.title) + '"><div class="featured-cover">' + coverImage(track, '', 320) + '<button class="featured-play" data-play="' + escapeHTML(track.id) + '" aria-label="Play ' + escapeHTML(track.title) + '">' + icon('play') + '</button></div><div class="featured-meta"><div><h3>' + escapeHTML(track.title) + '</h3><p>' + escapeHTML(track.genre) + ' · ' + time(track.duration) + '</p></div><span class="tag">LOCAL</span></div></article>').join('');
  }
  function renderPlaylists() {
    const matching = state.playlists.filter(p => p.name.toLowerCase().includes(state.query.toLowerCase()));
    $('playlists').innerHTML = matching.map(p => '<button class="playlist-card" data-playlist="' + escapeHTML(p.id) + '">' + icon('list') + '<span><strong>' + escapeHTML(p.name) + '</strong><small>' + p.tracks.filter(id => library.has(id)).length + ' tracks</small></span></button>').join('') || '<p class="muted">Create a playlist, then add songs using their options menu.</p>';
  }
  function render() {
    const searching = Boolean(state.query.trim());
    const selected = state.playlists.find(p => p.id === state.playlist);
    const titles = {browse:'Your listening room.',favourites:'Always worth a replay.',recent:'Back in rotation.',playlists:selected ? selected.name : 'Made by you.'};
    const subtitles = {browse:'Music at your pace. Ready whenever you are.',favourites:'All the tracks you have saved with a heart.',recent:'Your recently played tracks, right where you left them.',playlists:'Your collections, saved on this device.'};
    $('view-title').textContent = searching ? 'Find your next listen.' : titles[state.view];
    $('view-description').textContent = searching ? 'Searching your ' + (state.view === 'browse' ? 'local library' : state.view) + ' for “' + state.query + '”' : subtitles[state.view];
    $('featured-section').hidden = state.view !== 'browse' || searching;
    $('playlist-section').hidden = state.view !== 'playlists';
    document.querySelectorAll('[data-view]').forEach(button => { if (button.dataset.view === state.view) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current'); });
    $('tracks-heading').textContent = searching ? 'Search results' : state.view === 'playlists' ? (selected ? selected.name : 'Playlist tracks') : state.view === 'favourites' ? 'Favourite tracks' : state.view === 'recent' ? 'Recently played' : 'All tracks';
    const tracks = visibleTracks();
    const total = tracks.reduce((sum,t) => sum + (Number(t.duration) || 0), 0);
    $('track-count').textContent = state.ready ? tracks.length + (tracks.length === 1 ? ' track' : ' tracks') + (total ? ' · ' + Math.ceil(total / 60) + ' min' : '') : 'Loading your library…';
    $('play-all').disabled = !tracks.length;
    $('tracks').innerHTML = tracks.map((track,index) => '<div class="track-row' + (track.id === state.current ? ' is-current' : '') + '" role="listitem" data-track-id="' + escapeHTML(track.id) + '" tabindex="0" aria-label="' + escapeHTML(track.title + ' by ' + track.artist) + '"><button class="track-index" data-play="' + escapeHTML(track.id) + '" aria-label="Play ' + escapeHTML(track.title) + '">' + (track.id === state.current && !audio.paused ? icon('pause') : index + 1) + '</button><div class="track-details">' + coverImage(track,'track-art',44) + '<div class="track-copy"><button class="track-title" data-play="' + escapeHTML(track.id) + '">' + escapeHTML(track.title) + '</button><span class="track-artist">' + escapeHTML(track.artist) + '</span></div></div><span class="track-album">' + escapeHTML(track.album) + '</span><div class="track-actions"><button class="icon-button' + (state.favourites.has(track.id) ? ' is-favourite' : '') + '" data-favourite="' + escapeHTML(track.id) + '" aria-pressed="' + state.favourites.has(track.id) + '" aria-label="' + (state.favourites.has(track.id) ? 'Unfavourite ' : 'Favourite ') + escapeHTML(track.title) + '">' + icon('heart') + '</button><button class="icon-button" data-menu="' + escapeHTML(track.id) + '" aria-label="More options for ' + escapeHTML(track.title) + '">' + icon('more') + '</button><span class="track-time">' + time(track.duration) + '</span></div></div>').join('');
    $('empty').hidden = tracks.length > 0 || !state.ready;
    $('empty-title').textContent = searching ? 'No matching tracks.' : state.view === 'recent' ? 'Your first listen starts here.' : state.view === 'favourites' ? 'Keep the songs you love.' : state.view === 'playlists' ? 'A little space for your music.' : 'Your library is empty.';
    $('empty-copy').textContent = searching ? 'Try a title, artist, album, or import more music.' : state.view === 'favourites' ? 'Use the heart beside a track to save it here.' : state.view === 'recent' ? 'Play a track from Browse to see it here.' : state.view === 'playlists' ? 'Choose or create a playlist. Add tracks from any song’s options menu.' : 'Choose Add your music to import audio files.';
    if (state.view === 'playlists') renderPlaylists();
    renderQueue();
    updatePlayer();
  }
  function renderQueue() {
    $('queue-count').textContent = state.queue.length;
    $('queue-list').innerHTML = state.queue.map((id,index) => {
      const t = library.get(id); if (!t) return '';
      return '<div class="queue-item' + (index === state.index ? ' is-current' : '') + '">' + coverImage(t,'',38) + '<button class="queue-track" data-queue-play="' + index + '" aria-label="Play queued ' + escapeHTML(t.title) + '"><strong>' + escapeHTML(t.title) + '</strong><span>' + (index === state.index ? 'Now selected · ' : '') + escapeHTML(t.artist) + '</span></button><button class="icon-button" data-queue-remove="' + index + '" aria-label="Remove ' + escapeHTML(t.title) + ' from queue">' + icon('close') + '</button></div>';
    }).join('') || '<p class="empty-state">Add a track to queue or press Play all.</p>';
    $('queue-clear').disabled = state.queue.length <= state.index + 1;
  }
  function openQueue(open) { const visible = open === undefined ? $('queue-panel').hidden : open; $('queue-panel').hidden = !visible; $('queue-toggle').setAttribute('aria-expanded',visible); $('player-queue').setAttribute('aria-expanded',visible); }
  function setView(view, playlist) {
    state.view = ['browse','favourites','recent','playlists'].includes(view) ? view : 'browse'; state.playlist = playlist || '';
    state.query = ''; $('search').value = ''; render();
    const hash = state.view + (state.playlist ? '/' + encodeURIComponent(state.playlist) : '');
    if (location.hash.slice(1) !== hash) location.hash = hash;
    // Scrolling the main element flush with the viewport hides its heading
    // underneath the sticky navigation, especially inside small OS windows.
    window.scrollTo({top:0,left:0,behavior:'auto'});
  }
  function paintRange(input, pct) { input.style.setProperty('--fill', Math.min(100, Math.max(0,pct || 0)) + '%'); }
  function updatePlayer() {
    const track = current();
    document.body.classList.toggle('is-playing', Boolean(track && !audio.paused && !audio.ended && !state.error));
    document.body.classList.toggle('is-loading', Boolean(state.loading));
    $('play').setAttribute('aria-label',audio.paused ? 'Play' : 'Pause'); $('play').innerHTML = icon(audio.paused ? 'play' : 'pause');
    $('now-favourite').disabled = !track;
    const favourite = track && state.favourites.has(track.id);
    $('now-favourite').setAttribute('aria-pressed',Boolean(favourite)); $('now-favourite').classList.toggle('is-favourite',Boolean(favourite));
    $('now-title').textContent = track ? track.title : 'Pick your next listen';
    $('now-artist').textContent = track ? track.artist : 'Your library is ready';
    if ($('now-cover').getAttribute('src') !== (track ? track.cover : fallback)) $('now-cover').src = track ? track.cover : fallback;
    const duration = Number.isFinite(audio.duration) ? audio.duration : (track ? track.duration : 0);
    $('elapsed').textContent = time(audio.currentTime); $('duration').textContent = time(duration);
    $('seek').disabled = !Number.isFinite(audio.duration) || !audio.duration;
    $('seek').max = duration || 100; $('seek').value = audio.currentTime || 0;
    $('seek').setAttribute('aria-valuetext', time(audio.currentTime) + ' of ' + time(duration)); paintRange($('seek'), duration ? audio.currentTime/duration*100 : 0);
    $('volume').value = audio.volume; paintRange($('volume'),audio.volume*100);
    $('mute').setAttribute('aria-pressed',audio.muted); $('mute').setAttribute('aria-label',audio.muted ? 'Unmute' : 'Mute'); $('mute').innerHTML = icon(audio.muted || audio.volume === 0 ? 'mute' : 'volume');
    $('shuffle').setAttribute('aria-pressed',state.shuffle);
    $('repeat').setAttribute('aria-pressed',state.repeat !== 'off'); $('repeat').title = 'Repeat ' + state.repeat; $('repeat-one').hidden = state.repeat !== 'one';
    $('playback-status').textContent = state.error ? 'Playback unavailable' : state.loading ? 'Loading audio…' : previewEnd ? '10-second preview' : '';
    $('previous').disabled = !state.queue.length; $('next').disabled = !state.queue.length;
    document.querySelectorAll('.track-row').forEach((row,index) => {
      const selected = row.dataset.trackId === state.current;
      row.classList.toggle('is-current',selected);
      const button = row.querySelector('.track-index');
      const playing = selected && !audio.paused;
      const content = playing ? icon('pause') : String(index + 1);
      if (button.innerHTML !== content) button.innerHTML = content;
      button.setAttribute('aria-label',(playing ? 'Pause ' : 'Play ') + library.get(row.dataset.trackId).title);
    });
  }
  function clearPlaybackError() { state.error = ''; $('playback-error').hidden = true; }
  function playbackError(message) { clearTimeout(slowTimer); state.loading = false; state.error = message; $('error-text').textContent = message; $('playback-error').hidden = false; updatePlayer(); broadcast(true); }
  function publicState() {
    const t = current();
    return {active:Boolean(t),playing:!audio.paused && !audio.ended && !state.error,title:t ? t.title : '',artist:t ? t.artist : '',cover:t ? t.cover : '',position:audio.currentTime || 0,duration:Number.isFinite(audio.duration) ? audio.duration : t ? t.duration : 0,volume:audio.volume,muted:audio.muted,trackId:state.current,queue:state.queue.slice(),index:state.index,loading:state.loading,error:state.error,shuffle:state.shuffle,repeat:state.repeat};
  }
  function broadcast(force) {
    const now = Date.now(); if (!force && now - lastBroadcast < 300) return; lastBroadcast = now;
    const payload = publicState();
    if (parent !== window) { try { parent.postMessage({type:'neo-local-music:state',state:payload},location.origin); } catch (_) {} }
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = payload.playing ? 'playing' : payload.active ? 'paused' : 'none';
        if (Number.isFinite(audio.duration) && audio.duration > 0) navigator.mediaSession.setPositionState({duration:audio.duration,playbackRate:audio.playbackRate,position:Math.min(audio.currentTime,audio.duration)});
      } catch (_) {}
    }
  }
  function updateMediaMetadata(track) {
    if (!('mediaSession' in navigator) || !window.MediaMetadata) return;
    try { navigator.mediaSession.metadata = new MediaMetadata({title:track.title,artist:track.artist,album:track.album,artwork:[{src:track.cover}]}); } catch (_) {}
  }
  async function start(index, autoplay = true, preview = false) {
    const track = library.get(state.queue[index]); if (!track) return;
    const sequence = ++loadSequence;
    clearTimeout(slowTimer); audio.pause(); clearPlaybackError();
    state.index = index; state.current = track.id; state.loading = autoplay; previewEnd = preview ? 10 : 0;
    audio.src = track.src; audio.load();
    document.documentElement.style.setProperty('--accent',track.color || '#fff');
    state.recent = [track.id,...state.recent.filter(id => id !== track.id)].slice(0,100);
    updateMediaMetadata(track); persist(); render(); broadcast(true);
    if (!autoplay) return;
    slowTimer = setTimeout(() => { if (sequence === loadSequence && state.loading) playbackError('This local file is taking too long to open. Retry or choose another track.'); },12000);
    try { await audio.play(); if (sequence !== loadSequence) return; state.loading = false; clearTimeout(slowTimer); updatePlayer(); broadcast(true); }
    catch (error) {
      if (sequence !== loadSequence || error.name === 'AbortError') return;
      playbackError(error.name === 'NotAllowedError' ? 'Press Play to allow audio in this browser.' : 'This audio file could not play. Check that it is available and supported, then retry.');
    }
  }
  function playTrack(id, preview = false) {
    if (!library.has(id)) return;
    state.queue = preview ? [id] : visibleTracks().map(t=>t.id);
    if (!state.queue.includes(id)) state.queue = [id];
    return start(state.queue.indexOf(id),true,preview);
  }
  function stop() { ++loadSequence; clearTimeout(slowTimer); audio.pause(); if (audio.readyState) audio.currentTime = 0; previewEnd=0; state.loading=false; updatePlayer(); broadcast(true); }
  async function toggle() {
    if (!current()) {
      // Honour tracks explicitly queued before the first play (and restored
      // queues), instead of silently replacing them with the Browse list.
      if (!state.queue.length) state.queue = visibleTracks().map(t=>t.id);
      if (!state.queue.length) state.queue = allTracks().map(t=>t.id);
      return start(state.index >= 0 ? state.index : 0);
    }
    if (state.error) return start(state.index);
    if (!audio.paused) { audio.pause(); return; }
    previewEnd = 0;
    try { await audio.play(); } catch (_) { playbackError('Press Play again, or retry this local audio file.'); }
  }
  function next(fromEnded = false) {
    if (!state.queue.length) return;
    if (fromEnded && state.repeat === 'one') return start(state.index);
    let index = state.index + 1;
    if (state.shuffle && state.queue.length > 1) { do { index = Math.floor(Math.random()*state.queue.length); } while(index === state.index); }
    if (index >= state.queue.length) { if (fromEnded && state.repeat !== 'all') { audio.pause(); updatePlayer(); broadcast(true); return; } index=0; }
    return start(index);
  }
  function previous() { if (audio.currentTime > 3) { audio.currentTime = 0; updatePlayer(); return; } return start((state.index - 1 + state.queue.length) % state.queue.length); }
  function setVolume(value) { audio.volume = Math.min(1,Math.max(0,Number(value)||0)); persist(); }
  function setMuted(value) { audio.muted = Boolean(value); persist(); }
  function seek(value) { if (Number.isFinite(audio.duration)) { audio.currentTime = Math.min(audio.duration,Math.max(0,Number(value)||0)); updatePlayer(); broadcast(true); } }
  function favourite(id) { if (state.favourites.has(id)) state.favourites.delete(id); else state.favourites.add(id); persist(); render(); }
  function addQueue(id, playNext) { if (!library.has(id)) return; if (playNext) state.queue.splice(Math.max(0,state.index+1),0,id); else state.queue.push(id); persist(); renderQueue(); notify(playNext ? 'Added to play next.' : 'Added to queue.'); }
  function closeMenu() { $('track-menu').hidden=true; if (menuReturn && document.contains(menuReturn)) menuReturn.focus({preventScroll:true}); menuReturn=null; }
  function showMenu(id,x,y,origin) {
    const t=library.get(id); if(!t) return;
    menuTrack=id; menuReturn=origin;
    const actions=[['play','play','Play'],['preview','play','Preview 10 seconds'],['favourite','heart',state.favourites.has(id)?'Remove from favourites':'Add to favourites'],['next','next','Play next'],['queue','queue','Add to queue'],['playlist','list','Add to playlist']];
    if(t.imported) actions.push(['cover','upload','Change cover']);
    if(state.view==='playlists' && state.playlist) actions.push(['remove-playlist','close','Remove from playlist']);
    $('track-menu').innerHTML=actions.map(a=>'<button role="menuitem" data-menu-action="'+a[0]+'">'+icon(a[1])+a[2]+'</button>').join('');
    $('track-menu').hidden=false;
    const rect=$('track-menu').getBoundingClientRect();
    $('track-menu').style.left=Math.max(8,Math.min(x,innerWidth-rect.width-8))+'px';
    $('track-menu').style.top=Math.max(8,Math.min(y,innerHeight-rect.height-8))+'px';
    $('track-menu').querySelector('button').focus();
  }
  function showPlaylistDialog(trackId) {
    playlistTrack=trackId || '';
    $('playlist-dialog-title').textContent=playlistTrack?'Add to playlist':'New playlist';
    $('playlist-select-wrap').hidden=!playlistTrack || !state.playlists.length;
    $('playlist-select').innerHTML='<option value="">Create a new playlist</option>'+state.playlists.map(p=>'<option value="'+escapeHTML(p.id)+'">'+escapeHTML(p.name)+'</option>').join('');
    $('playlist-select').value=''; $('playlist-name').value=''; $('playlist-name').required=true; $('playlist-name-wrap').hidden=false;
    $('playlist-save').textContent=playlistTrack?'Add track':'Create playlist'; $('playlist-hint').textContent='Saved on this device.';
    $('playlist-dialog').showModal(); $('playlist-name').focus();
  }
  async function readMetadata(file) {
    const src=URL.createObjectURL(file), probe=new Audio();
    probe.preload='metadata';
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>finish(new Error('The audio format could not be read.')),6000);
      function finish(error,duration) { clearTimeout(timer); probe.onloadedmetadata=null; probe.onerror=null; probe.removeAttribute('src'); probe.load(); URL.revokeObjectURL(src); error?reject(error):resolve(duration); }
      probe.onloadedmetadata=()=>finish(null,Number.isFinite(probe.duration)?probe.duration:0);
      probe.onerror=()=>finish(new Error('Unsupported or damaged audio file.'));
      probe.src=src;
    });
  }
  async function coverColor(file) {
    const url=URL.createObjectURL(file), image=new Image();
    try {
      await new Promise((resolve,reject)=>{ image.onload=resolve; image.onerror=()=>reject(new Error('This image could not be read.')); image.src=url; });
      const canvas=document.createElement('canvas'); canvas.width=16; canvas.height=16;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,16,16);
      const pixels=ctx.getImageData(0,0,16,16).data; let r=0,g=0,b=0,count=0;
      for(let i=0;i<pixels.length;i+=4){if(pixels[i+3]<128)continue;r+=pixels[i];g+=pixels[i+1];b+=pixels[i+2];count++;}
      if(!count)return '#ddd'; const channels=[r,g,b].map(n=>Math.round(n/count)); const max=Math.max(...channels);
      return 'rgb('+channels.map(n=>Math.min(235,Math.round(n+(max<155?155-max:0)))).join(',')+')';
    } finally { URL.revokeObjectURL(url); }
  }
  const baseName=(name)=>String(name||'').replace(/\.[^.]+$/,'').toLowerCase().trim();
  async function importFiles(files) {
    if(importing)return; importing=true;
    const candidates=Array.from(files||[]); const images=candidates.filter(f=>/^image\//.test(f.type));
    const sounds=candidates.filter(f=>/^audio\//.test(f.type)||/\.(mp3|wav|ogg|m4a|aac|flac|webm|opus)$/i.test(f.name));
    if(!sounds.length){notice('Choose audio files to import. You can include a matching JPG, PNG or WebP cover with the same file name.'); importing=false; return;}
    let added=0,failed=0,sessionOnly=false;
    for(const file of sounds){
      notice('Importing '+(added+failed+1)+' of '+sounds.length+': '+file.name);
      if(file.size>config.maxImportBytes){failed++;continue;}
      if(allTracks().some(t=>t.imported && t.fileName===file.name && t.size===file.size && t.file && t.file.lastModified===file.lastModified)){failed++;continue;}
      try {
        const duration=await readMetadata(file);
        const cover=images.find(img=>baseName(img.name)===baseName(file.name)) || (sounds.length===1 && images.length===1?images[0]:null);
        let coverFile=null,color='#ddd';
        if(cover && cover.size<=config.maxCoverBytes){try{color=await coverColor(cover);coverFile=cover;}catch(_){}}
        const stem=file.name.replace(/\.[^.]+$/,''); const split=stem.indexOf(' - ');
        const track=hydrate({id:uniqueId(),title:(split>=0?stem.slice(split+3):stem).slice(0,180),artist:split>=0?stem.slice(0,split).slice(0,120):'Your device',album:'Imported music',duration,file,coverFile,cover:'media/fallback.svg',color,genre:'Imported',fileName:file.name,size:file.size,imported:true});
        try{await storeTrack(track);}catch(_){sessionOnly=true;}
        added++;
      }catch(_){failed++;}
    }
    importing=false; $('file-input').value=''; state.ready=true; setView('browse'); renderFeatured();
    notice(added+' '+(added===1?'track':'tracks')+' imported.'+(failed?' '+failed+' unsupported, duplicate or oversized file(s) skipped.':'')+(sessionOnly?' Browser storage is unavailable or full; some files will need to be imported again after refresh.':''));
  }
  $('file-input').addEventListener('change',()=>importFiles($('file-input').files));
  document.querySelectorAll('[data-import]').forEach(button=>button.addEventListener('click',()=>$('file-input').click()));
  $('cover-input').addEventListener('change',async()=>{
    const file=$('cover-input').files[0],track=library.get(coverTrack); if(!file||!track)return;
    try {if(file.size>config.maxCoverBytes)throw new Error('Choose a cover smaller than 12 MB.');const color=await coverColor(file);if(track.cover.startsWith('blob:'))URL.revokeObjectURL(track.cover);track.coverFile=file;track.cover=URL.createObjectURL(file);track.color=color;await storeTrack(track);if(state.current===track.id){document.documentElement.style.setProperty('--accent',color);updateMediaMetadata(track);broadcast(true);}render();notify('Cover updated.');}catch(error){notice(error.message||'This cover could not be saved.');} finally{$('cover-input').value='';}
  });
  $('search').addEventListener('input',event=>{state.query=event.target.value;render();});
  document.querySelector('.wordmark').addEventListener('click',event=>{event.preventDefault();setView('browse');});
  document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>setView(button.dataset.view)));
  $('play-all').addEventListener('click',()=>{state.queue=visibleTracks().map(t=>t.id);start(0);});
  $('play').addEventListener('click',toggle); $('next').addEventListener('click',()=>next()); $('previous').addEventListener('click',previous);
  $('shuffle').addEventListener('click',()=>{state.shuffle=!state.shuffle;persist();updatePlayer();});
  $('repeat').addEventListener('click',()=>{state.repeat=state.repeat==='off'?'all':state.repeat==='all'?'one':'off';persist();updatePlayer();notify('Repeat '+state.repeat+'.');});
  $('mute').addEventListener('click',()=>setMuted(!audio.muted)); $('volume').addEventListener('input',event=>setVolume(event.target.value));
  $('seek').addEventListener('input',event=>seek(event.target.value)); $('now-favourite').addEventListener('click',()=>{if(current())favourite(state.current);});
  $('queue-toggle').addEventListener('click',()=>openQueue()); $('player-queue').addEventListener('click',()=>openQueue()); $('queue-close').addEventListener('click',()=>openQueue(false));
  $('queue-clear').addEventListener('click',()=>{state.queue=state.index>=0?state.queue.slice(0,state.index+1):[];persist();renderQueue();});
  $('retry').addEventListener('click',()=>start(state.index)); $('dismiss-error').addEventListener('click',()=>{clearPlaybackError();updatePlayer();});
  $('new-playlist').addEventListener('click',()=>showPlaylistDialog());
  document.querySelector('[data-close-dialog]').addEventListener('click',()=>$('playlist-dialog').close());
  $('playlist-select').addEventListener('change',()=>{const existing=Boolean($('playlist-select').value);$('playlist-name-wrap').hidden=existing;$('playlist-name').required=!existing;});
  $('playlist-form').addEventListener('submit',event=>{
    event.preventDefault();let playlist=state.playlists.find(p=>p.id===$('playlist-select').value);
    if(!playlist){const name=$('playlist-name').value.trim();if(!name){$('playlist-hint').textContent='Enter a playlist name.';return;}playlist={id:uniqueId(),name,tracks:[]};state.playlists.push(playlist);}
    if(playlistTrack&&!playlist.tracks.includes(playlistTrack))playlist.tracks.push(playlistTrack);
    persist();$('playlist-dialog').close();render();notify(playlistTrack?'Added to '+playlist.name+'.':'Playlist created.');
  });
  $('settings-button').addEventListener('click',()=>$('settings-dialog').showModal()); document.querySelector('[data-close-settings]').addEventListener('click',()=>$('settings-dialog').close());
  $('export-library').addEventListener('click',()=>{const blob=new Blob([JSON.stringify({format:'neo-music-playlists-v1',playlists:state.playlists,favourites:Array.from(state.favourites),tracks:allTracks().map(t=>({id:t.id,title:t.title,artist:t.artist,album:t.album,fileName:t.fileName||null}))},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='neo-music-playlists.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  document.addEventListener('click',event=>{
    const el=event.target.closest('button');
    if(!$('track-menu').hidden&&!event.target.closest('#track-menu')&&!event.target.closest('[data-menu]'))closeMenu();
    if(!el)return;
    if(el.dataset.play){if(el.dataset.play===state.current)toggle();else playTrack(el.dataset.play);return;}
    if(el.dataset.favourite){favourite(el.dataset.favourite);return;}
    if(el.dataset.playlist){setView('playlists',el.dataset.playlist);return;}
    if(el.dataset.menu){const rect=el.getBoundingClientRect();showMenu(el.dataset.menu,rect.right-205,rect.bottom,el);return;}
    if(el.dataset.queuePlay!==undefined){start(Number(el.dataset.queuePlay));return;}
    if(el.dataset.queueRemove!==undefined){const index=Number(el.dataset.queueRemove),wasPlaying=!audio.paused;state.queue.splice(index,1);if(index<state.index)state.index--;else if(index===state.index){if(state.queue.length)start(Math.min(index,state.queue.length-1),wasPlaying);else{stop();state.current='';state.index=-1;audio.removeAttribute('src');audio.load();}}persist();render();broadcast(true);return;}
    const action=el.dataset.menuAction;if(!action)return;const id=menuTrack;closeMenu();
    if(action==='play')playTrack(id);else if(action==='preview')playTrack(id,true);else if(action==='favourite')favourite(id);else if(action==='next')addQueue(id,true);else if(action==='queue')addQueue(id,false);else if(action==='playlist')showPlaylistDialog(id);else if(action==='cover'){coverTrack=id;$('cover-input').click();}else if(action==='remove-playlist'){const p=state.playlists.find(p=>p.id===state.playlist);if(p){p.tracks=p.tracks.filter(trackId=>trackId!==id);persist();render();}}
  });
  document.addEventListener('contextmenu',event=>{const row=event.target.closest('[data-track-id]');if(row){event.preventDefault();showMenu(row.dataset.trackId,event.clientX,event.clientY,row);}});
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'){closeMenu();openQueue(false);return;}
    if(!$('track-menu').hidden){const buttons=Array.from($('track-menu').querySelectorAll('button'));const index=buttons.indexOf(document.activeElement);if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();buttons[event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowDown'?1:buttons.length-1))%buttons.length].focus();}return;}
    if(event.target.closest('input,textarea,select,dialog,[contenteditable=true]'))return;
    const row=event.target.closest('[data-track-id]');
    if(row&&((event.shiftKey&&event.key==='F10')||event.key==='ContextMenu')){event.preventDefault();const rect=row.getBoundingClientRect();showMenu(row.dataset.trackId,rect.left+40,rect.top+20,row);return;}
    if(row&&event.key==='Enter'&&event.target===row){event.preventDefault();playTrack(row.dataset.trackId);return;}
    if(event.key==='/'){event.preventDefault();$('search').focus();}
    else if(event.code==='Space'&&!event.target.closest('button,a')){event.preventDefault();toggle();}
  });
  function routeFromHash() {
    const [route,id] = location.hash.slice(1).split('/');
    return {view:['browse','favourites','recent','playlists'].includes(route)?route:'browse',playlist:route==='playlists'?(id||''):''};
  }
  window.addEventListener('hashchange',()=>{const route=routeFromHash();if(route.view!==state.view||route.playlist!==state.playlist){state.view=route.view;state.playlist=route.playlist;state.query='';$('search').value='';render();}});
  // Parent-window commands are accepted only from the local OS which owns this frame.
  window.addEventListener('message',event=>{if(event.source!==parent||event.origin!==location.origin||!event.data||event.data.type!=='neo-local-music:command')return;const {action,value}=event.data;if(action==='stop')stop();else if(action==='pause')audio.pause();else if(action==='toggle')toggle();else if(action==='next')next();else if(action==='previous')previous();else if(action==='volume')setVolume(value);else if(action==='mute')setMuted(value);else if(action==='seek')seek(value);});
  audio.addEventListener('timeupdate',()=>{if(previewEnd&&audio.currentTime>=previewEnd){audio.pause();previewEnd=0;notify('Preview finished. Press Play to continue the full track.');}updatePlayer();broadcast(false);});
  // Imported files can be large. Do not rewrite their IndexedDB Blob on every
  // play: metadata is saved during import and only updated if it changed.
  audio.addEventListener('loadedmetadata',()=>{const t=current();if(t&&Number.isFinite(audio.duration)&&Math.abs((t.duration||0)-audio.duration)>.01){t.duration=audio.duration;if(t.imported)storeTrack(t).catch(()=>{});}updatePlayer();broadcast(true);});
  audio.addEventListener('playing',()=>{state.loading=false;clearTimeout(slowTimer);clearPlaybackError();updatePlayer();broadcast(true);});
  audio.addEventListener('pause',()=>{if(audio.paused)state.loading=false;updatePlayer();broadcast(true);});
  audio.addEventListener('waiting',()=>{if(!audio.paused){state.loading=true;updatePlayer();}});
  audio.addEventListener('volumechange',()=>{updatePlayer();broadcast(true);});
  audio.addEventListener('ended',()=>{previewEnd=0;next(true);});
  audio.addEventListener('error',()=>{if(!audio.getAttribute('src'))return;playbackError('This local audio file is missing, damaged or unsupported. Choose another track, or check its file path and retry.');});
  document.addEventListener('error',event=>{if(event.target instanceof HTMLImageElement&&event.target.src!==fallback){event.target.src=fallback;}},true);
  // Back/forward cache restores the same document; keep its imported Blob URLs
  // and database alive, but never allow a departed page to keep playing audio.
  window.addEventListener('pagehide',event=>{stop();if(event.persisted)return;allTracks().forEach(t=>{if(t.src.startsWith('blob:'))URL.revokeObjectURL(t.src);if(t.cover.startsWith('blob:'))URL.revokeObjectURL(t.cover);});if(database)database.close();});
  window.addEventListener('pageshow',event=>{if(event.persisted){render();broadcast(true);}});
  if('mediaSession' in navigator){for(const [name,handler]of Object.entries({play:()=>{if(audio.paused)toggle();},pause:()=>audio.pause(),nexttrack:()=>next(),previoustrack:previous,seekto:e=>seek(e.seekTime),seekbackward:e=>seek(audio.currentTime-(e.seekOffset||10)),seekforward:e=>seek(audio.currentTime+(e.seekOffset||10))})){try{navigator.mediaSession.setActionHandler(name,handler);}catch(_){}}}
  // Small integration surface for the OS and tests. The UI has no remote API calls.
  window.NEO_LOCAL_MUSIC=Object.freeze({getState:publicState,pause:()=>audio.pause(),stop,toggle,next,previous,setVolume,setMuted,seek,playTrack,importFiles,getTracks:()=>allTracks().map(t=>({id:t.id,title:t.title,artist:t.artist,duration:t.duration,src:t.src,cover:t.cover,imported:Boolean(t.imported)}))});
  async function init(){
    audio.volume=Number.isFinite(saved.volume)?Math.min(1,Math.max(0,saved.volume)):.7;audio.muted=saved.muted===true;
    try{(window.NEO_MUSIC_CATALOG||[]).forEach(record=>{try{hydrate(record);}catch(_){notice('One catalog entry has an invalid local asset path.');}});}catch(_){notice('The local catalog could not be loaded. You can still import your own music.');}
    renderFeatured();render();
    try{const records=await databaseOperation('readonly',store=>store.getAll());records.forEach(record=>{try{hydrate(record);}catch(_){}});}catch(_){notice('Browser storage is unavailable. Imported music will work for this session only.');}
    state.queue=Array.isArray(saved.queue)?saved.queue.filter(id=>library.has(id)):[];state.index=state.queue.length?Math.max(0,Math.min(state.queue.length-1,Number(saved.index)||0)):-1;
    state.ready=true;const route=routeFromHash();state.view=route.view;state.playlist=route.playlist;render();
    broadcast(true);
  }
  init().catch(()=>{state.ready=true;notice('The library could not be restored. Import music to start a new local session.');render();});
})();
