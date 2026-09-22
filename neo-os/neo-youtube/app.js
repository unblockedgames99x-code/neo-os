(() => {
  'use strict';

  const API_BASES = [
    'https://pipedapi.ducks.party',
    'https://api.piped.private.coffee'
  ];
  const CATALOGUE_TIMEOUT_MS = 12000;
  const SEARCH_CACHE_MS = 10 * 60 * 1000;
  const HISTORY_KEY = 'neo_youtube_history_v2';
  const CACHE_PREFIX = 'neo_youtube_search_v3:';
  const OFFICIAL_SHORTS = Object.freeze([
    { id: 'zxSSPFgBTLQ', title: '#shorts #crazy #funny', uploaderName: 'Teach', duration: 30, isShort: true },
    { id: '2CVzaiZiKA0', title: '#shorts #comedy', uploaderName: 'Aman Sharma', duration: 30, isShort: true },
    { id: 'DlEIu42PxiU', title: 'I rescued these animals 😁 #shorts #animals #nature', uploaderName: 'Melerus', duration: 30, isShort: true },
    { id: '0Jq4XaCOnAc', title: 'I like this story #animals #shorts', uploaderName: 'Sweetheart Zoo', duration: 30, isShort: true }
  ]);

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const dom = {
    body: document.body,
    content: $('[data-content]'),
    home: $('[data-home-view]'),
    results: $('[data-results-view]'),
    resultsList: $('[data-results-list]'),
    resultStatus: $('[data-result-status]'),
    watch: $('[data-watch-view]'),
    player: $('[data-player-shell]'),
    watchTitle: $('[data-watch-title]'),
    watchChannel: $('[data-watch-channel]'),
    watchMeta: $('[data-watch-meta]'),
    watchAvatar: $('[data-watch-avatar]'),
    watchDescription: $('[data-watch-description]'),
    upNext: $('[data-up-next]'),
    openYouTube: $('[data-open-youtube]'),
    shorts: $('[data-shorts-view]'),
    shortCard: $('[data-short-card]'),
    shortPlayer: $('[data-short-player]'),
    shortPlay: $('[data-short-play]'),
    shortTitle: $('[data-short-title]'),
    shortChannel: $('[data-short-channel]'),
    shortStatus: $('[data-short-status]'),
    popout: $('[data-video-popout]'),
    popoutRestore: $('[data-popout-restore]'),
    popoutClose: $('[data-popout-close]'),
    searchForm: $('[data-search-form]'),
    searchInput: $('[data-search-input]'),
    searchClear: $('[data-search-clear]'),
    toast: $('[data-toast-region]'),
    sidebar: $('[data-sidebar]')
  };

  const state = {
    view: 'home',
    query: '',
    filter: 'all',
    items: [],
    provider: '',
    request: null,
    current: null,
    playerFrame: null,
    shortsItems: [],
    shortIndex: 0,
    shortPlaying: false,
    shortsRefresh: null,
    popoutActive: false,
    popoutMode: '',
    popoutOrigin: null,
    toastTimer: 0
  };

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>'"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[char]);
  }

  function icon(name) {
    return `<svg aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  }

  function thumbnailUrl(id, quality = 'hq720') {
    return `https://i.ytimg.com/vi/${encodeURIComponent(id)}/${quality}.jpg`;
  }

  function videoIdFrom(raw = '') {
    const value = String(raw).trim();
    if (/^[\w-]{11}$/.test(value)) return value;
    const relativeMatch = value.match(/(?:[?&]v=|\/(?:embed|shorts|live)\/)([\w-]{11})/);
    if (relativeMatch) return relativeMatch[1];
    try {
      const url = new URL(value);
      if (/youtu\.be$/i.test(url.hostname)) return (url.pathname.split('/')[1] || '').slice(0, 11);
      const queryId = url.searchParams.get('v');
      if (/^[\w-]{11}$/.test(queryId || '')) return queryId;
      const match = url.pathname.match(/\/(?:embed|shorts|live)\/([\w-]{11})/);
      return match?.[1] || '';
    } catch {
      return '';
    }
  }

  function normalize(item = {}) {
    if (!item || typeof item !== 'object') return null;
    const id = videoIdFrom(item.id || item.url || item.videoId || '');
    if (!id) return null;
    const duration = Number(item.duration || 0);
    return {
      id,
      title: String(item.title || 'YouTube video'),
      uploaderName: String(item.uploaderName || item.author || item.uploader || 'YouTube'),
      uploaderAvatar: /^https:\/\//i.test(item.uploaderAvatar || '') ? item.uploaderAvatar : '',
      views: item.views ?? item.viewCount ?? '',
      uploadedDate: String(item.uploadedDate || item.publishedText || item.uploaded || ''),
      duration,
      description: String(item.shortDescription || item.description || ''),
      thumbnail: /^https:\/\//i.test(item.thumbnail || '') ? String(item.thumbnail) : thumbnailUrl(id),
      isShort: Boolean(item.isShort) || (duration > 0 && duration <= 60)
    };
  }

  function compactViews(value) {
    if (value === '' || value == null) return '';
    if (typeof value === 'string' && !/^\d+$/.test(value)) return value;
    const count = Number(value);
    if (!Number.isFinite(count)) return '';
    return `${new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(count)} views`;
  }

  function formatDuration(value) {
    const seconds = Math.max(0, Math.floor(Number(value) || 0));
    if (!seconds) return '';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainder = seconds % 60;
    return hours
      ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
      : `${minutes}:${String(remainder).padStart(2, '0')}`;
  }

  function metaLine(item) {
    return [compactViews(item.views), item.uploadedDate].filter(Boolean).join(' • ');
  }

  function readStorage(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }

  function postShell(message) {
    try { window.parent.postMessage(message, '*'); } catch {}
  }

  function announceMedia(active, playing = false, item = state.current) {
    postShell({
      type: 'neo-shell:media-state',
      active: Boolean(active),
      playing: Boolean(playing),
      title: item?.title || 'YouTube',
      artist: item?.uploaderName || 'YouTube',
      cover: item?.thumbnail || ''
    });
  }

  function showToast(message) {
    clearTimeout(state.toastTimer);
    dom.toast.textContent = message;
    dom.toast.hidden = false;
    state.toastTimer = window.setTimeout(() => { dom.toast.hidden = true; }, 2200);
  }

  function setActiveNav(view) {
    $$('[data-view]').forEach(button => {
      button.classList.toggle('is-active', button.dataset.view === view);
    });
  }

  function pauseFrame(frame = state.playerFrame) {
    if (!frame?.contentWindow) return;
    try {
      frame.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
    } catch {}
    announceMedia(Boolean(frame), false);
  }

  function resumeFrame(frame = state.playerFrame) {
    if (!frame?.contentWindow) return;
    frame.dataset.neoPopoutPlaying = 'true';
    try {
      frame.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 'neo-youtube-popout' }), '*');
      frame.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
    } catch {}
    announceMedia(true, true);
  }

  function mountPopoutPoster(source) {
    source?.querySelector('[data-popout-poster]')?.remove();
    source?.classList.remove('is-popout-started');
    if (!source) return;
    const poster = document.createElement('button');
    poster.type = 'button';
    poster.className = 'popout-video-poster';
    poster.dataset.popoutPoster = 'true';
    poster.setAttribute('aria-label', 'Play video');
    const image = document.createElement('img');
    image.alt = '';
    image.decoding = 'async';
    image.referrerPolicy = 'no-referrer';
    image.src = state.current?.thumbnail || thumbnailUrl(state.current?.id || '');
    image.addEventListener('error', () => { image.hidden = true; }, { once: true });
    const mark = document.createElement('span');
    mark.innerHTML = icon('play');
    poster.append(image, mark);
    poster.addEventListener('click', () => {
      poster.dataset.userActivated = 'true';
      resumeFrame();
      window.setTimeout(() => source.classList.add('is-popout-started'), 700);
    });
    source.appendChild(poster);
  }

  function handlePlayerMessage(event) {
    if (!state.popoutActive || event.source !== state.playerFrame?.contentWindow) return;
    let data = event.data;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch { return; }
    }
    const poster = state.popoutOrigin?.querySelector('[data-popout-poster]');
    if (poster?.dataset.userActivated === 'true' && data?.event === 'infoDelivery' && Number(data.info?.playerState) === 1) {
      state.popoutOrigin?.classList.add('is-popout-started');
    }
  }

  function setPopoutPresentation(active, mode = state.popoutMode) {
    const source = state.popoutOrigin;
    dom.body.classList.toggle('has-video-popout', active);
    document.documentElement.classList.toggle('has-video-popout', active);
    if (active) {
      dom.body.dataset.popoutMode = mode;
      document.documentElement.dataset.popoutMode = mode;
      source?.classList.add('is-popout-source');
      mountPopoutPoster(source);
    } else {
      delete dom.body.dataset.popoutMode;
      delete document.documentElement.dataset.popoutMode;
      source?.classList.remove('is-popout-source');
      source?.classList.remove('is-popout-started');
      source?.querySelector('[data-popout-poster]')?.remove();
    }
    dom.popout.hidden = !active;
    if (active) dom.popout.dataset.mode = mode;
    else dom.popout.removeAttribute('data-mode');
    postShell({
      type: 'neo-shell:youtube-popout',
      active,
      mode: active ? mode : '',
      title: state.current?.title || 'YouTube video'
    });
  }

  function destroyPlayer() {
    const popoutOrigin = state.popoutOrigin;
    const popoutMode = state.popoutMode;
    if (state.playerFrame) pauseFrame(state.playerFrame);
    if (state.popoutActive) setPopoutPresentation(false, popoutMode);
    state.popoutActive = false;
    state.popoutMode = '';
    state.popoutOrigin = null;
    $$('[data-popout-video], [data-popout-short]').forEach(button => button.setAttribute('aria-pressed', 'false'));
    if (state.playerFrame) {
      state.playerFrame.remove();
      state.playerFrame = null;
    }
    if (popoutMode === 'watch' && popoutOrigin === dom.player) {
      dom.player.innerHTML = `<div class="player-placeholder"><svg><use href="#i-play"></use></svg></div>`;
    } else if (popoutMode === 'shorts' && popoutOrigin === dom.shortPlayer) {
      dom.shortPlayer.replaceChildren(dom.shortPlay);
      dom.shortPlay.hidden = false;
    }
    state.shortPlaying = false;
    dom.shortCard?.classList.remove('is-playing');
    announceMedia(false, false);
  }

  function showView(view) {
    if (state.view !== view && (state.view === 'watch' || state.view === 'shorts') && !state.popoutActive) destroyPlayer();
    state.view = view;
    dom.home.hidden = view !== 'home';
    dom.results.hidden = view !== 'results';
    dom.watch.hidden = view !== 'watch';
    dom.shorts.hidden = view !== 'shorts';
    dom.content.classList.toggle('shorts-mode', view === 'shorts');
    setActiveNav(view === 'results' || view === 'watch' ? '' : view);
    dom.content.scrollTop = 0;
  }

  function historyUrl(params = {}) {
    const url = new URL(location.href);
    url.search = '';
    url.hash = '';
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });
    return `${url.pathname}${url.search}`;
  }

  function navigate(params, replace = false) {
    const method = replace ? 'replaceState' : 'pushState';
    if (/^https?:$/.test(location.protocol)) {
      history[method](params, '', historyUrl(params));
    } else {
      // srcdoc/blob frames cannot rewrite their URL to the injected CDN base.
      // State-only history preserves Back/Forward without navigating the frame.
      history[method]({ neoYouTubeRoute: params }, '');
    }
  }

  function remember(item) {
    const historyItems = readStorage(HISTORY_KEY, []).map(normalize).filter(Boolean);
    const next = [item, ...historyItems.filter(entry => entry.id !== item.id)].slice(0, 60);
    writeStorage(HISTORY_KEY, next);
  }

  function cacheGet(query) {
    try {
      const entry = JSON.parse(sessionStorage.getItem(CACHE_PREFIX + query.toLowerCase()));
      if (!entry || Date.now() - entry.time > SEARCH_CACHE_MS) return null;
      return entry.items.map(normalize).filter(Boolean);
    } catch {
      return null;
    }
  }

  function cacheSet(query, items) {
    try {
      sessionStorage.setItem(CACHE_PREFIX + query.toLowerCase(), JSON.stringify({ time: Date.now(), items }));
    } catch {}
  }

  async function fetchJson(base, path, parentSignal) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    parentSignal?.addEventListener('abort', abort, { once: true });
    const timer = window.setTimeout(() => controller.abort(), CATALOGUE_TIMEOUT_MS);
    try {
      const response = await fetch(base + path, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        credentials: 'omit',
        mode: 'cors'
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } finally {
      clearTimeout(timer);
      parentSignal?.removeEventListener('abort', abort);
    }
  }

  async function firstWorking(path, signal) {
    const raceController = new AbortController();
    const abortRace = () => raceController.abort();
    if (signal?.aborted) abortRace();
    else signal?.addEventListener('abort', abortRace, { once: true });

    try {
      const winner = await Promise.any(API_BASES.map(base => (
        fetchJson(base, path, raceController.signal).then(data => ({ base, data }))
      )));
      state.provider = new URL(winner.base).hostname;
      raceController.abort();
      return winner.data;
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new Error('Catalogue unavailable', { cause: error });
    } finally {
      raceController.abort();
      signal?.removeEventListener('abort', abortRace);
    }
  }

  function uniqueVideos(items = []) {
    return items.filter((item, index) => item && items.findIndex(other => other?.id === item.id) === index);
  }

  function refreshOfficialShorts() {
    if (state.shortsRefresh) return state.shortsRefresh;
    const officialIds = new Set(OFFICIAL_SHORTS.map(item => item.id));
    state.shortsRefresh = Promise.allSettled(OFFICIAL_SHORTS.map(async seed => {
      const path = `/oembed?url=${encodeURIComponent(`https://www.youtube.com/shorts/${seed.id}`)}&format=json`;
      const data = await fetchJson('https://www.youtube.com', path);
      if (!(Number(data.height) > Number(data.width))) throw new Error('Not a vertical Short');
      return normalize({
        ...seed,
        title: data.title || seed.title,
        uploaderName: data.author_name || seed.uploaderName,
        thumbnail: data.thumbnail_url || thumbnailUrl(seed.id),
        isShort: true
      });
    })).then(results => {
      const verified = results
        .filter(result => result.status === 'fulfilled' && result.value)
        .map(result => result.value);
      if (!verified.length) return;

      const currentId = state.current?.id || '';
      const external = state.shortsItems.filter(item => !officialIds.has(item.id));
      state.shortsItems = uniqueVideos([...external, ...verified]);
      state.shortIndex = Math.max(0, state.shortsItems.findIndex(item => item.id === currentId));
      const current = state.shortsItems[state.shortIndex];
      if (state.view !== 'shorts' || !current) return;
      state.current = current;
      dom.shortTitle.textContent = current.title;
      dom.shortChannel.textContent = current.uploaderName;
      dom.shortStatus.textContent = `${state.shortIndex + 1} of ${state.shortsItems.length}`;
      if (!state.shortPlaying) {
        const source = current.thumbnail || thumbnailUrl(current.id);
        dom.shortPlayer.style.backgroundImage = `url("${source.replace(/"/g, '%22')}")`;
      }
    }).finally(() => {
      state.shortsRefresh = null;
    });
    return state.shortsRefresh;
  }

  function attachImageFallbacks(root = document) {
    $$('img[data-video-id]', root).forEach(image => {
      const setSource = (source, useProxy = true) => {
        if (!source) return;
        image.hidden = false;
        image.src = source;
        if (useProxy && window.NEO_PROXY_CLIENT?.image) {
          window.NEO_PROXY_CLIENT.image(source).then(route => {
            if (route && image.isConnected) image.src = route;
          }).catch(() => {});
        }
      };
      image.addEventListener('error', () => {
        if (image.dataset.fallbackApplied) {
          image.hidden = true;
          return;
        }
        image.dataset.fallbackApplied = '1';
        setSource(thumbnailUrl(image.dataset.videoId, 'mqdefault'), false);
      }, { once: false });
      setSource(image.dataset.neoSrc || thumbnailUrl(image.dataset.videoId));
    });
    $$('img[data-avatar]', root).forEach(image => {
      image.addEventListener('error', () => { image.hidden = true; }, { once: true });
      const source = image.dataset.neoSrc;
      if (!source) return;
      image.src = source;
      if (window.NEO_PROXY_CLIENT?.image) {
        window.NEO_PROXY_CLIENT.image(source).then(route => {
          if (route && image.isConnected) image.src = route;
        }).catch(() => {});
      }
    });
  }

  function skeletons() {
    return Array.from({ length: 5 }, () => `
      <article class="video-result skeleton-result" aria-hidden="true">
        <div class="result-thumb"></div>
        <div class="result-info">
          <div class="skeleton-line"></div>
          <div class="skeleton-line short"></div>
          <div class="skeleton-circle"></div>
        </div>
      </article>`).join('');
  }

  function resultCard(item) {
    const duration = formatDuration(item.duration);
    const avatar = item.uploaderAvatar
      ? `<img data-avatar data-neo-src="${escapeHtml(item.uploaderAvatar)}" alt="">`
      : escapeHtml(item.uploaderName.slice(0, 1).toUpperCase());
    return `
      <article class="video-result" tabindex="0" data-video-id="${item.id}">
        <div class="result-thumb">
          <img data-video-id="${item.id}" data-neo-src="${escapeHtml(item.thumbnail)}" alt="" loading="lazy" decoding="async">
          ${duration ? `<span class="duration-badge">${duration}</span>` : ''}
        </div>
        <div class="result-info">
          <h2 class="result-title">${escapeHtml(item.title)}</h2>
          <div class="result-meta">${escapeHtml(metaLine(item))}</div>
          <div class="result-channel"><span class="result-avatar">${avatar}</span><span>${escapeHtml(item.uploaderName)}</span></div>
          <div class="result-description">${escapeHtml(item.description)}</div>
        </div>
        <button class="result-more" type="button" aria-label="More actions" data-toast="More actions are available on YouTube.">${icon('more')}</button>
      </article>`;
  }

  function bindResultCards(root = dom.resultsList) {
    attachImageFallbacks(root);
    $$('.video-result[data-video-id]', root).forEach(card => {
      const open = event => {
        if (event?.target?.closest('[data-toast]')) return;
        const item = state.items.find(entry => entry.id === card.dataset.videoId)
          || state.shortsItems.find(entry => entry.id === card.dataset.videoId)
          || readStorage(HISTORY_KEY, []).map(normalize).find(entry => entry?.id === card.dataset.videoId);
        if (!item) return;
        if (state.filter === 'shorts' || item.isShort && state.view === 'shorts') openShorts(item.id);
        else openVideo(item);
      };
      card.addEventListener('click', open);
      card.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          open(event);
        }
      });
    });
  }

  function filteredItems() {
    switch (state.filter) {
      case 'shorts': return state.items.filter(item => item.isShort || (item.duration > 0 && item.duration <= 90));
      case 'videos': return state.items.filter(item => !item.isShort);
      case 'recent': return state.items.filter(item => /minute|hour|day|week|today|yesterday/i.test(item.uploadedDate));
      case 'live': return state.items.filter(item => item.duration === 0 || /live/i.test(item.uploadedDate));
      default: return state.items;
    }
  }

  function renderResults(status) {
    const items = filteredItems().slice(0, 36);
    dom.resultStatus.textContent = status || `${items.length} results${state.provider ? ` • Catalogue: ${state.provider}` : ''}`;
    if (!items.length) {
      dom.resultsList.innerHTML = `
        <div class="empty-state"><div><h2>No matching videos</h2><p>Try another filter or a different search.</p></div></div>`;
      return;
    }
    dom.resultsList.innerHTML = items.map(resultCard).join('');
    bindResultCards();
  }

  async function search(query, options = {}) {
    const q = String(query || '').trim();
    if (!q) return;
    const directId = videoIdFrom(q);
    if (directId) {
      const existing = state.items.find(item => item.id === directId)
        || normalize({ id: directId, title: 'YouTube video', uploaderName: 'YouTube' });
      openVideo(existing, options.replace);
      return;
    }

    state.request?.abort();
    state.request = new AbortController();
    state.query = q;
    state.filter = options.filter || 'all';
    dom.searchInput.value = q;
    dom.searchClear.hidden = false;
    showView('results');
    updateFilterButtons();
    dom.resultStatus.textContent = `Searching for “${q}”…`;
    dom.resultsList.innerHTML = skeletons();
    if (!options.fromRoute) navigate({ q }, options.replace);

    const cached = cacheGet(q);
    if (cached?.length) {
      state.items = cached;
      renderResults(`${cached.length} results • Cached catalogue`);
      return;
    }

    try {
      const data = await firstWorking(`/search?q=${encodeURIComponent(q)}&filter=videos`, state.request.signal);
      const items = (Array.isArray(data) ? data : data.items || [])
        .filter(item => !item.type || item.type === 'stream')
        .map(normalize)
        .filter(Boolean);
      if (!items.length) throw new Error('No results');
      state.items = items;
      cacheSet(q, items);
      renderResults();
    } catch (error) {
      if (state.request.signal.aborted) return;
      state.provider = '';
      state.items = [];
      dom.resultStatus.textContent = 'Live video search could not connect';
      dom.resultsList.innerHTML = `
        <div class="empty-state"><div><h2>Videos could not load</h2><p>Check the connection, then search again.</p></div></div>`;
    }
  }

  function updateFilterButtons() {
    $$('[data-filter]').forEach(button => {
      const active = button.dataset.filter === state.filter;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });
  }

  function createPlayer(item, autoplay = true, shorts = false) {
    destroyPlayer();
    const iframe = document.createElement('iframe');
    const params = new URLSearchParams({
      autoplay: autoplay ? '1' : '0',
      playsinline: '1',
      rel: '0',
      enablejsapi: '1'
    });
    if (shorts) {
      params.set('loop', '1');
      params.set('playlist', item.id);
    }
    if (location.origin && location.origin !== 'null') params.set('origin', location.origin);
    const officialSource = `https://www.youtube-nocookie.com/embed/${item.id}?${params}`;
    iframe.dataset.officialSource = officialSource;
    iframe.src = officialSource;
    iframe.title = item.title;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.loading = 'eager';
    state.playerFrame = iframe;
    window.setTimeout(() => {
      if (state.playerFrame !== iframe || iframe.dataset.neoTrustedEmbed === 'youtube') return;
      let rendered = false;
      try {
        const frameDocument = iframe.contentDocument;
        rendered = Boolean(frameDocument?.querySelector('.html5-video-player, #movie_player, video'));
      } catch {
        rendered = true;
      }
      if (rendered) return;
      iframe.dataset.neoTrustedEmbed = 'youtube';
      iframe.dataset.neoPlaybackRecovered = 'true';
      delete iframe.dataset.neoProxyReady;
      delete iframe.dataset.neoProxyError;
      delete iframe.dataset.neoProxyRequestId;
      delete iframe.dataset.neoProxySource;
      iframe.addEventListener('load', () => {
        if (state.popoutActive && state.playerFrame === iframe) resumeFrame(iframe);
      }, { once: true });
      iframe.src = officialSource;
      announceMedia(true, autoplay, item);
    }, 4500);
    announceMedia(true, autoplay, item);
    return iframe;
  }

  function openPopout(mode = state.view) {
    if (!state.playerFrame && mode === 'shorts') playCurrentShort();
    const frame = state.playerFrame;
    if (!frame) {
      showToast('Start a video first.');
      return;
    }
    if (state.popoutActive) {
      restorePopout();
      return;
    }
    state.popoutActive = true;
    state.popoutMode = mode === 'shorts' ? 'shorts' : 'watch';
    state.popoutOrigin = frame.parentElement;
    setPopoutPresentation(true, state.popoutMode);
    resumeFrame(frame);
    window.setTimeout(() => {
      if (state.popoutActive && state.playerFrame === frame) resumeFrame(frame);
    }, 350);
    const selector = state.popoutMode === 'shorts' ? '[data-popout-short]' : '[data-popout-video]';
    $(selector)?.setAttribute('aria-pressed', 'true');
    showToast('Video popped out');
  }

  function restorePopout() {
    if (!state.popoutActive || !state.playerFrame) return;
    const mode = state.popoutMode;
    const origin = state.popoutOrigin;
    if (state.view !== mode) {
      showView(mode);
      if (mode === 'shorts') navigate({ shorts: state.current?.id || 'feed' }, true);
      else navigate({ v: state.current?.id || '' }, true);
    }
    state.popoutActive = false;
    state.popoutMode = '';
    setPopoutPresentation(false, mode);
    state.popoutOrigin = null;
    $$('[data-popout-video], [data-popout-short]').forEach(button => button.setAttribute('aria-pressed', 'false'));
    if (mode === 'shorts') {
      dom.shortCard.classList.add('is-playing');
      state.shortPlaying = true;
    }
  }

  function closePopout() {
    if (!state.popoutActive) return;
    destroyPlayer();
    showToast('Video closed');
  }

  function beginPopoutDrag(event) {
    if (!state.popoutActive || event.button !== 0 || event.target.closest('button')) return;
    const pointerId = event.pointerId;
    event.currentTarget.setPointerCapture?.(pointerId);
    event.preventDefault();
    const send = (phase, pointerEvent) => postShell({
      type: 'neo-shell:youtube-popout-drag',
      phase,
      pointerId,
      screenX: Number(pointerEvent.screenX) || 0,
      screenY: Number(pointerEvent.screenY) || 0
    });
    send('start', event);
    const move = moveEvent => {
      if (moveEvent.pointerId !== pointerId) return;
      send('move', moveEvent);
    };
    const end = endEvent => {
      if (endEvent.pointerId !== pointerId) return;
      send('end', endEvent);
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', end);
      document.removeEventListener('pointercancel', end);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', end);
    document.addEventListener('pointercancel', end);
  }

  function avatarMarkup(item) {
    return item.uploaderAvatar
      ? `<img data-avatar data-neo-src="${escapeHtml(item.uploaderAvatar)}" alt="">`
      : escapeHtml(item.uploaderName.slice(0, 1).toUpperCase());
  }

  function renderUpNext(current) {
    const items = state.items
      .filter(item => item.id !== current.id)
      .slice(0, 12);
    dom.upNext.innerHTML = items.map(item => `
      <article class="next-item" tabindex="0" data-video-id="${item.id}">
        <div class="result-thumb">
          <img data-video-id="${item.id}" data-neo-src="${escapeHtml(item.thumbnail)}" alt="" loading="lazy" decoding="async">
          ${formatDuration(item.duration) ? `<span class="duration-badge">${formatDuration(item.duration)}</span>` : ''}
        </div>
        <div class="next-copy"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.uploaderName)}</p><p>${escapeHtml(metaLine(item))}</p></div>
      </article>`).join('');
    attachImageFallbacks(dom.upNext);
    $$('.next-item', dom.upNext).forEach(card => {
      const open = () => {
        const item = state.items.find(entry => entry.id === card.dataset.videoId);
        if (item) openVideo(item);
      };
      card.addEventListener('click', open);
      card.addEventListener('keydown', event => {
        if (event.key === 'Enter') open();
      });
    });
  }

  function openVideo(rawItem, replace = false) {
    const item = normalize(rawItem);
    if (!item) return;
    showView('watch');
    state.current = item;
    remember(item);
    dom.watchTitle.textContent = item.title;
    dom.watchChannel.textContent = item.uploaderName;
    dom.watchMeta.textContent = metaLine(item);
    dom.watchAvatar.innerHTML = avatarMarkup(item);
    dom.watchDescription.textContent = item.description || 'Playback uses YouTube’s privacy-enhanced official player. Video availability is controlled by the uploader and YouTube.';
    dom.openYouTube.href = `https://www.youtube.com/watch?v=${item.id}`;
    dom.player.replaceChildren(createPlayer(item, true, false));
    attachImageFallbacks(dom.watchAvatar);
    renderUpNext(item);
    navigate({ v: item.id }, replace);
    postShell({ type: 'neo-shell:video-route', active: true });
  }

  function renderShort(autoplay = false) {
    const item = state.shortsItems[state.shortIndex];
    if (!item) return;
    state.current = item;
    remember(item);
    destroyPlayer();
    const shortThumbnail = item.thumbnail || thumbnailUrl(item.id);
    dom.shortPlayer.style.backgroundImage = `url("${shortThumbnail.replace(/"/g, '%22')}")`;
    if (window.NEO_PROXY_CLIENT?.image) {
      window.NEO_PROXY_CLIENT.image(shortThumbnail).then(route => {
        if (state.current?.id === item.id) dom.shortPlayer.style.backgroundImage = `url("${String(route).replace(/"/g, '%22')}")`;
      }).catch(() => {});
    }
    dom.shortPlayer.replaceChildren(dom.shortPlay);
    dom.shortPlay.hidden = false;
    dom.shortTitle.textContent = item.title;
    dom.shortChannel.textContent = item.uploaderName;
    dom.shortStatus.textContent = `${state.shortIndex + 1} of ${state.shortsItems.length}`;
    state.shortPlaying = false;
    if (autoplay) playCurrentShort();
    navigate({ shorts: item.id }, true);
  }

  function playCurrentShort() {
    const item = state.shortsItems[state.shortIndex];
    if (!item) return;
    dom.shortPlayer.replaceChildren(createPlayer(item, true, true));
    dom.shortCard.classList.add('is-playing');
    state.shortPlaying = true;
    postShell({ type: 'neo-shell:video-route', active: true });
  }

  async function openShorts(startId = '', options = {}) {
    showView('shorts');
    setActiveNav('shorts');
    dom.shortStatus.textContent = 'Loading Shorts…';
    if (!options.fromRoute) navigate({ shorts: startId || 'feed' }, options.replace);

    const existing = state.items.filter(item => item.isShort || (item.duration > 0 && item.duration <= 90));
    const official = OFFICIAL_SHORTS.map(normalize).filter(Boolean);
    state.shortsItems = uniqueVideos([...existing, ...state.shortsItems, ...official]);
    if (startId && !state.shortsItems.some(item => item.id === startId)) {
      const start = state.items.find(item => item.id === startId)
        || normalize({ id: startId, title: 'YouTube Short', uploaderName: 'YouTube', isShort: true });
      if (start) state.shortsItems.unshift(start);
    }

    if (!state.shortsItems.length) {
      dom.shortStatus.textContent = 'Shorts could not load. Check the connection and try again.';
      return;
    }
    state.shortIndex = Math.max(0, state.shortsItems.findIndex(item => item.id === startId));
    renderShort(Boolean(options.autoplay));
    refreshOfficialShorts().catch(() => {});
  }

  function moveShort(direction) {
    if (!state.shortsItems.length) return;
    state.shortIndex = (state.shortIndex + direction + state.shortsItems.length) % state.shortsItems.length;
    renderShort(true);
  }

  function showHistory(options = {}) {
    const historyItems = readStorage(HISTORY_KEY, []).map(normalize).filter(Boolean);
    state.items = historyItems;
    state.query = '';
    state.filter = 'all';
    showView('results');
    setActiveNav('history');
    updateFilterButtons();
    dom.resultStatus.textContent = 'Watch history on this device';
    if (historyItems.length) {
      dom.resultsList.innerHTML = historyItems.map(resultCard).join('');
      bindResultCards();
    } else {
      dom.resultsList.innerHTML = '<div class="empty-state"><div><h2>No watch history</h2><p>Videos you play here will appear on this device.</p></div></div>';
    }
    if (!options.fromRoute) navigate({ view: 'history' }, false);
  }

  function goHome(replace = false) {
    showView('home');
    state.query = '';
    dom.searchInput.value = '';
    dom.searchClear.hidden = true;
    setActiveNav('home');
    navigate({}, replace);
  }

  async function share(item) {
    if (!item) return;
    const url = `https://youtu.be/${item.id}`;
    try {
      if (navigator.share) await navigator.share({ title: item.title, url });
      else {
        await navigator.clipboard.writeText(url);
        showToast('Video link copied');
      }
    } catch (error) {
      if (error?.name !== 'AbortError') showToast(url);
    }
  }

  function routeFromLocation() {
    const embedded = !/^https?:$/.test(location.protocol);
    const source = new URL(embedded
      ? document.querySelector('meta[name="neo-source-url"]')?.content || location.href
      : location.href);
    const embeddedRoute = embedded && history.state?.neoYouTubeRoute;
    const params = new URLSearchParams(embeddedRoute || source.search);
    const hashMatch = !embeddedRoute && source.hash.match(/^#watch=([\w-]{11})$/);
    // The shell used `?v=` as an old asset cache key. Only treat it as a
    // playback route when it is an actual 11-character YouTube id.
    const videoId = videoIdFrom(params.get('v') || '') || videoIdFrom(hashMatch?.[1] || '');
    const shortId = params.get('shorts');
    const query = params.get('q');
    const view = params.get('view');
    if (videoId) {
      const item = state.items.find(entry => entry.id === videoId)
        || normalize({ id: videoId, title: 'YouTube video', uploaderName: 'YouTube' });
      openVideo(item, true);
    } else if (shortId) {
      openShorts(shortId === 'feed' ? '' : shortId, { replace: true, fromRoute: true });
    } else if (query) {
      search(query, { replace: true, fromRoute: true });
    } else if (view === 'history') {
      showHistory({ fromRoute: true });
    } else {
      goHome(true);
    }
  }

  dom.searchForm.addEventListener('submit', event => {
    event.preventDefault();
    search(dom.searchInput.value);
  });
  dom.searchInput.addEventListener('input', () => {
    dom.searchClear.hidden = !dom.searchInput.value;
  });
  dom.searchClear.addEventListener('click', () => {
    dom.searchInput.value = '';
    dom.searchClear.hidden = true;
    dom.searchInput.focus();
  });

  $$('[data-view]').forEach(button => button.addEventListener('click', () => {
    const view = button.dataset.view;
    if (view === 'home') goHome();
    else if (view === 'shorts') openShorts();
    else if (view === 'history') showHistory();
  }));

  $$('[data-search-preset]').forEach(button => button.addEventListener('click', () => {
    search(button.dataset.searchPreset);
  }));

  $$('[data-filter]').forEach(button => button.addEventListener('click', () => {
    state.filter = button.dataset.filter;
    updateFilterButtons();
    if (state.filter === 'shorts') {
      const first = state.items.find(item => item.isShort || (item.duration > 0 && item.duration <= 90));
      if (first) openShorts(first.id);
      else renderResults();
    } else {
      renderResults();
    }
  }));

  $('[data-watch-back]').addEventListener('click', () => {
    if (state.query) search(state.query, { replace: true });
    else goHome(true);
  });
  $('[data-share-video]').addEventListener('click', () => share(state.current));
  $('[data-share-short]').addEventListener('click', () => share(state.current));
  $('[data-popout-video]').addEventListener('click', () => openPopout('watch'));
  $('[data-popout-short]').addEventListener('click', () => openPopout('shorts'));
  dom.popoutRestore.addEventListener('click', restorePopout);
  dom.popoutClose.addEventListener('click', closePopout);
  $('[data-popout-drag]').addEventListener('pointerdown', beginPopoutDrag);
  window.addEventListener('message', handlePlayerMessage);
  dom.shortPlay.addEventListener('click', playCurrentShort);
  $('[data-short-prev]').addEventListener('click', () => moveShort(-1));
  $('[data-short-next]').addEventListener('click', () => moveShort(1));

  $('[data-guide-toggle]').addEventListener('click', () => {
    dom.sidebar.classList.toggle('is-open');
  });

  $('[data-voice-search]').addEventListener('click', () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      showToast('Voice search is not available in this browser.');
      return;
    }
    const recognition = new Recognition();
    recognition.lang = navigator.language || 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = event => {
      const query = event.results?.[0]?.[0]?.transcript || '';
      dom.searchInput.value = query;
      search(query);
    };
    recognition.onerror = () => showToast('Voice search could not start.');
    recognition.start();
  });

  document.addEventListener('click', event => {
    const target = event.target.closest('[data-toast]');
    if (target) {
      event.stopPropagation();
      showToast(target.dataset.toast);
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === '/' && !/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || '')) {
      event.preventDefault();
      dom.searchInput.focus();
    }
    if (event.key === 'Escape' && state.popoutActive) {
      restorePopout();
      return;
    }
    if (event.key === 'Escape' && (state.view === 'watch' || state.view === 'shorts')) {
      if (state.query) search(state.query, { replace: true });
      else goHome(true);
    }
    if (state.view === 'shorts' && !/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || '')) {
      if (event.key === 'ArrowDown') { event.preventDefault(); moveShort(1); }
      if (event.key === 'ArrowUp') { event.preventDefault(); moveShort(-1); }
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseFrame();
  });

  window.addEventListener('message', event => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'neo-shell:visibility' && data.visible === false) pauseFrame();
  });

  window.addEventListener('popstate', routeFromLocation);

  function keepPageStylesLast() {
    const stylesheet = $('#neo-youtube-styles');
    if (stylesheet && stylesheet !== document.head.lastElementChild) document.head.append(stylesheet);
  }
  window.setTimeout(keepPageStylesLast, 0);
  window.addEventListener('neo-interface-style-change', keepPageStylesLast);

  routeFromLocation();
})();
