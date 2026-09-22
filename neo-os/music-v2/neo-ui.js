function syncNeoNavigation() {
    const path = window.__NEO_MUSIC_PATHNAME__;
    document.querySelectorAll('[data-neo-route]').forEach((link) => {
        const route = link.getAttribute('data-neo-route');
        const active = route === '/' ? path === '/' : path.startsWith(route);
        link.classList.toggle('active', active && !link.hasAttribute('data-neo-playlists'));
    });
}

function syncNeoThemeDetails() {
    const root = document.documentElement;
    /* A few visualizer paths use Monochrome's original light/dark attribute
       directly, so keep that compatibility signal aligned with NEO too. */
    root.dataset.theme = root.dataset.neoTheme === 'frost' ? 'white' : 'monochrome';
    const accent = getComputedStyle(root).getPropertyValue('--desktop-accent').trim();
    const channels = colorChannels(accent);
    if (channels) root.style.setProperty('--highlight-rgb', channels, 'important');
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
        'content',
        getComputedStyle(root).getPropertyValue('--desktop-bg').trim() || '#0a0c0f'
    );
}

function colorChannels(color) {
    const hex = color.match(/^#([\da-f]{3}|[\da-f]{6})$/i)?.[1];
    if (hex) {
        const value = hex.length === 3 ? [...hex].map((part) => part + part).join('') : hex;
        return [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16)).join(', ');
    }
    const rgb = color.match(/^rgba?\(\s*(\d+)\D+(\d+)\D+(\d+)/i);
    return rgb ? `${rgb[1]}, ${rgb[2]}, ${rgb[3]}` : '';
}

function watchNeoMusicNotifications() {
    const recent = new Map();
    const inspect = (task) => {
        if (!task?.matches?.('.download-task') || task.dataset.trackId) return;
        const message = task.querySelector('.notification-message')?.textContent?.trim().replace(/\s+/g, ' ');
        if (!message) return;
        const now = Date.now();
        const previous = recent.get(message);
        if (previous && now - previous.time < 1800 && previous.node.isConnected) {
            task.remove();
            return;
        }
        recent.set(message, { node: task, time: now });
        window.setTimeout(() => {
            if (recent.get(message)?.node === task) recent.delete(message);
        }, 2000);
    };
    new MutationObserver((records) => records.forEach((record) => record.addedNodes.forEach((node) => {
        inspect(node);
        node.querySelectorAll?.('.download-task').forEach(inspect);
    }))).observe(document.body, { childList: true, subtree: true });
}

if (/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) {
    const musicScope = new URL('./', document.baseURI).href;
    navigator.serviceWorker?.getRegistrations().then((registrations) => {
        registrations
            .filter((registration) => registration.scope.startsWith(musicScope))
            .forEach((registration) => registration.unregister());
    });
    window.caches?.keys().then((keys) => {
        keys
            .filter((key) => /(?:monochrome|neo[-_ ]?music|music-v2)/i.test(key))
            .forEach((key) => window.caches.delete(key));
    });
}

document.addEventListener('DOMContentLoaded', () => {
    syncNeoNavigation();
    syncNeoThemeDetails();
    watchNeoMusicNotifications();
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    let runtimeReady = false;
    let pendingSearch = '';
    let fastSearchTimer = 0;
    let fallbackSearchTimer = 0;

    /* The public CDN build cannot use Monochrome's server-only music proxy. In
       that environment the upstream bundle can occasionally finish its static
       UI setup without installing the search/player handlers. Keep a small,
       CORS-safe fallback dormant unless a submitted search produced no rows. */
    const cdnRunner = Boolean(document.querySelector('meta[name="neo-runner"]'));
    const searchEndpoint = 'https://lol.samidy.workers.dev/search?s=';
    const trackEndpoint = 'https://lol.samidy.workers.dev/track/?quality=HIGH&id=';
    const silentUnlockSource = 'data:audio/wav;base64,UklGRmQBAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YUABAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==';
    const fallback = {
        searchController: null,
        playController: null,
        query: '',
        tracks: [],
        index: -1,
        track: null,
        shaka: null,
        shakaModule: null,
        manifestUrl: '',
        primed: false,
        primeLoop: false,
        active: false,
        requestId: 0,
        progressFrame: 0
    };

    const playerElement = () => document.getElementById('audio-player');
    const formatTime = (seconds) => {
        const value = Number.isFinite(Number(seconds)) ? Math.max(0, Math.round(Number(seconds))) : 0;
        return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
    };
    const coverUrl = (cover, size = 160) => cover
        ? `https://resources.tidal.com/images/${String(cover).replaceAll('-', '/')}/${size}x${size}.jpg`
        : new URL('./assets/appicon.png', document.baseURI).href;

    const fetchJsonWithRetry = async (url, options, attempts = 4) => {
        let lastError;
        for (let attempt = 0; attempt < attempts; attempt += 1) {
            try {
                const retryUrl = new URL(url);
                if (attempt) retryUrl.searchParams.set('neo_retry', `${Date.now()}-${attempt}`);
                const response = await fetch(retryUrl.href, options);
                if (response.ok) return response.json();
                lastError = new Error(`Music service returned ${response.status}.`);
                if (response.status < 500 || attempt === attempts - 1) throw lastError;
            } catch (error) {
                if (error?.name === 'AbortError') throw error;
                lastError = error;
                if (attempt === attempts - 1) throw error;
            }
            await new Promise((resolve) => window.setTimeout(resolve, 250 * (attempt + 1)));
        }
        throw lastError || new Error('Music service did not respond.');
    };

    const fetchTrackStream = async (trackId, signal) => {
        let url = `${trackEndpoint}${encodeURIComponent(trackId)}`;
        for (let poll = 0; poll < 6; poll += 1) {
            const payload = await fetchJsonWithRetry(url, {
                mode: 'cors',
                cache: 'no-store',
                signal,
                headers: { Accept: 'application/json' }
            });
            const stream = payload?.data || payload;
            if (stream?.manifest && /dash\+xml/i.test(stream.manifestMimeType || '')) return stream;
            if (payload?.status === 'pending' && payload.statusUrl) {
                url = new URL(payload.statusUrl, 'https://lol.samidy.workers.dev/').href;
            } else {
                url = `${trackEndpoint}${encodeURIComponent(trackId)}&refresh=${Date.now()}-${poll}`;
            }
            await new Promise((resolve) => window.setTimeout(resolve, 300 * (poll + 1)));
        }
        throw new Error('No compatible audio stream is available for this track.');
    };

    const showSearchPage = (query) => {
        document.querySelectorAll('.page').forEach((page) => page.classList.remove('active'));
        const page = document.getElementById('page-search');
        page?.classList.add('active');
        if (page) page.hidden = false;
        const title = document.getElementById('search-results-title');
        if (title) title.textContent = `Search Results for "${query}"`;
        document.querySelectorAll('#page-search .search-tab').forEach((tab) => {
            tab.classList.toggle('active', tab.dataset.tab === 'tracks');
        });
        document.querySelectorAll('#page-search .search-tab-content').forEach((tab) => {
            tab.classList.toggle('active', tab.id === 'search-tab-tracks');
        });
    };

    const makeStatus = (message, kind = '') => {
        const status = document.createElement('div');
        status.className = `neo-fallback-status ${kind}`.trim();
        status.setAttribute('role', kind === 'error' ? 'alert' : 'status');
        status.textContent = message;
        return status;
    };

    const updateFallbackPlayerUi = () => {
        if (!fallback.track) return;
        const audio = playerElement();
        const row = document.querySelector(`.neo-fallback-track[data-track-id="${CSS.escape(String(fallback.track.id))}"]`);
        document.querySelectorAll('.neo-fallback-track.playing').forEach((item) => item.classList.remove('playing'));
        row?.classList.add('playing');
        const title = document.querySelector('.now-playing-bar .title');
        const album = document.querySelector('.now-playing-bar .album');
        const artist = document.querySelector('.now-playing-bar .artist');
        const image = document.querySelector('.now-playing-bar .cover');
        if (title) title.textContent = fallback.track.title || 'Unknown track';
        if (album) album.textContent = fallback.track.album?.title || '';
        if (artist) artist.textContent = fallback.track.artist?.name || 'Unknown artist';
        if (image) {
            image.src = coverUrl(fallback.track.album?.cover, 320);
            image.alt = `${fallback.track.title || 'Track'} cover`;
        }
        const button = document.querySelector('.now-playing-bar .play-pause-btn');
        if (button && audio) {
            button.title = audio.paused ? 'Play' : 'Pause';
            button.setAttribute('aria-label', button.title);
            button.classList.toggle('playing', !audio.paused);
        }
        if ('mediaSession' in navigator) {
            try {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: fallback.track.title || 'Unknown track',
                    artist: fallback.track.artist?.name || 'Unknown artist',
                    album: fallback.track.album?.title || '',
                    artwork: [{ src: coverUrl(fallback.track.album?.cover, 320), sizes: '320x320', type: 'image/jpeg' }]
                });
                navigator.mediaSession.playbackState = audio?.paused ? 'paused' : 'playing';
            } catch (error) {}
        }
    };

    const setFallbackError = (message) => {
        const container = document.getElementById('search-tracks-container');
        if (!container) return;
        container.querySelector('.neo-fallback-status')?.remove();
        container.prepend(makeStatus(message, 'error'));
    };

    const getShaka = async () => {
        if (fallback.shakaModule) return fallback.shakaModule;
        const moduleUrl = new URL('./assets/shaka-player.compiled-DU48pD6M.js', import.meta.url).href;
        const module = await import(moduleUrl);
        const shaka = module.s;
        shaka.polyfill.installAll();
        if (!shaka.Player.isBrowserSupported()) throw new Error('This browser cannot play the available audio format.');
        fallback.shakaModule = shaka;
        return shaka;
    };

    const primeAudio = (audio) => {
        if (fallback.primed || fallback.shaka || !audio.paused) return;
        fallback.primed = true;
        fallback.primeLoop = audio.loop;
        audio.src = silentUnlockSource;
        audio.loop = true;
        audio.play().catch((error) => {
            if (error?.name === 'NotAllowedError') window.__neoMusicAudioGate?.request?.(audio);
        });
    };

    const tryPlay = async (audio) => {
        try {
            await audio.play();
        } catch (error) {
            if (error?.name === 'NotAllowedError') {
                window.__neoMusicAudioGate?.request?.(audio);
                setFallbackError('Audio is ready. Press Play once to allow sound in this browser.');
                return;
            }
            throw error;
        }
    };

    const playFallbackTrack = async (track, index) => {
        const audio = playerElement();
        if (!audio || !track) return;
        const requestId = ++fallback.requestId;
        fallback.playController?.abort();
        fallback.playController = new AbortController();
        fallback.track = track;
        fallback.index = index;
        fallback.active = true;
        if (fallback.shaka) audio.pause();
        else primeAudio(audio);
        updateFallbackPlayerUi();
        setFallbackError(`Loading ${track.title || 'track'}…`);
        try {
            document.querySelectorAll('audio, video').forEach((media) => {
                if (media !== audio && !media.muted) media.pause();
            });
            const stream = await fetchTrackStream(track.id, fallback.playController.signal);
            if (requestId !== fallback.requestId) return;
            const shaka = await getShaka();
            audio.pause();
            audio.loop = fallback.primeLoop;
            if (!fallback.shaka) {
                fallback.shaka = new shaka.Player();
                fallback.shaka.configure({
                    streaming: { bufferingGoal: 12, rebufferingGoal: 2, bufferBehind: 10 },
                    abr: { enabled: true, defaultBandwidthEstimate: 250000 }
                });
                fallback.shaka.addEventListener('error', (event) => {
                    const detail = event?.detail;
                    setFallbackError(detail?.message || 'Audio playback failed. Choose the track again to retry.');
                });
                await fallback.shaka.attach(audio);
            } else {
                await fallback.shaka.unload().catch(() => {});
            }
            if (fallback.manifestUrl) URL.revokeObjectURL(fallback.manifestUrl);
            const binary = atob(stream.manifest);
            const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
            fallback.manifestUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/dash+xml' }));
            await fallback.shaka.load(fallback.manifestUrl);
            if (requestId !== fallback.requestId) return;
            audio.currentTime = 0;
            updateFallbackPlayerUi();
            document.getElementById('search-tracks-container')?.querySelector('.neo-fallback-status')?.remove();
            await tryPlay(audio);
        } catch (error) {
            if (error?.name === 'AbortError' || requestId !== fallback.requestId) return;
            console.warn('NEO Music fallback playback failed:', error);
            setFallbackError(error?.message || 'This track could not be played. Choose another track or retry.');
        }
    };

    const renderFallbackTracks = (query, tracks) => {
        const container = document.getElementById('search-tracks-container');
        if (!container) return;
        const fragment = document.createDocumentFragment();
        tracks.slice(0, 30).forEach((track, index) => {
            const row = document.createElement('div');
            row.className = 'track-item neo-fallback-track';
            row.dataset.trackId = String(track.id);
            row.tabIndex = 0;
            row.setAttribute('role', 'button');
            row.setAttribute('aria-label', `Play ${track.title || 'track'} by ${track.artist?.name || 'Unknown artist'}`);
            const cover = document.createElement('img');
            cover.className = 'track-item-cover';
            cover.loading = 'lazy';
            cover.decoding = 'async';
            cover.referrerPolicy = 'no-referrer';
            cover.alt = '';
            cover.src = coverUrl(track.album?.cover, 160);
            cover.addEventListener('error', () => {
                cover.src = new URL('./assets/appicon.png', document.baseURI).href;
            }, { once: true });
            const info = document.createElement('div');
            info.className = 'track-item-info';
            const details = document.createElement('div');
            details.className = 'track-item-details';
            const title = document.createElement('div');
            title.className = 'title';
            title.textContent = track.title || 'Unknown track';
            const artist = document.createElement('div');
            artist.className = 'artist';
            artist.textContent = `${track.artist?.name || 'Unknown artist'}${track.album?.title ? ` • ${track.album.title}` : ''}`;
            details.append(title, artist);
            info.append(details);
            const duration = document.createElement('div');
            duration.className = 'track-item-duration';
            duration.textContent = formatTime(track.duration);
            const play = document.createElement('button');
            play.className = 'neo-fallback-play';
            play.type = 'button';
            play.title = 'Play';
            play.setAttribute('aria-label', row.getAttribute('aria-label'));
            play.textContent = '▶';
            row.append(cover, info, duration, play);
            const activate = () => playFallbackTrack(track, index);
            row.addEventListener('click', activate);
            row.addEventListener('keydown', (event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                activate();
            });
            fragment.append(row);
        });
        container.replaceChildren(fragment);
        fallback.tracks = tracks.slice(0, 30);
        fallback.query = query;
    };

    const runFallbackSearch = async (query) => {
        if (!cdnRunner || !query) return;
        const container = document.getElementById('search-tracks-container');
        const title = document.getElementById('search-results-title')?.textContent || '';
        if (title.includes(query) && container?.querySelector('.track-item[data-track-id]:not(.neo-fallback-track)')) return;
        fallback.searchController?.abort();
        fallback.searchController = new AbortController();
        showSearchPage(query);
        container?.replaceChildren(makeStatus(`Searching for ${query}…`));
        try {
            const payload = await fetchJsonWithRetry(`${searchEndpoint}${encodeURIComponent(query)}`, {
                mode: 'cors',
                cache: 'force-cache',
                signal: fallback.searchController.signal,
                headers: { Accept: 'application/json' }
            });
            const data = payload?.data || payload;
            const tracks = Array.isArray(data?.items) ? data.items.filter((track) => track?.id && track.allowStreaming !== false) : [];
            if (query !== searchInput?.value.trim()) return;
            if (!tracks.length) {
                container?.replaceChildren(makeStatus(`No tracks found for ${query}.`));
                return;
            }
            renderFallbackTracks(query, tracks);
        } catch (error) {
            if (error?.name === 'AbortError') return;
            console.warn('NEO Music fallback search failed:', error);
            container?.replaceChildren(makeStatus('Music search is temporarily unavailable. Check your connection and try again.', 'error'));
        }
    };

    const scheduleFallbackSearch = (query) => {
        window.clearTimeout(fallbackSearchTimer);
        if (!cdnRunner || !query) return;
        fallbackSearchTimer = window.setTimeout(() => runFallbackSearch(query), 700);
    };

    /* Monochrome's bundled type-to-search delay is three seconds. Start a
       settled query quickly and keep that old listener from scheduling a
       second, late navigation for the same text. */
    searchInput?.addEventListener('input', (event) => {
        const query = searchInput.value.trim();
        window.clearTimeout(fastSearchTimer);
        fastSearchTimer = 0;
        if (!query || /(?:monochrome\.tf|monochrome\.samidy\.com|tidal\.com)\//i.test(query)) return;

        event.stopImmediatePropagation();
        fastSearchTimer = window.setTimeout(() => {
            fastSearchTimer = 0;
            if (query !== searchInput.value.trim()) return;
            searchForm?.requestSubmit();
        }, 220);
    }, true);

    /* The upstream app finishes several async setup steps after DOMContentLoaded.
       Queue an early search instead of silently dropping Enter before its own
       submit handler exists. */
    searchForm?.addEventListener('submit', (event) => {
        window.clearTimeout(fastSearchTimer);
        fastSearchTimer = 0;
        const query = searchInput?.value.trim() || '';
        scheduleFallbackSearch(query);
        if (cdnRunner) event.preventDefault();
        if (runtimeReady) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        pendingSearch = query;
    }, true);

    document.addEventListener('click', (event) => {
        if (!fallback.active) return;
        const audio = playerElement();
        if (!audio) return;
        if (event.target.closest('.now-playing-bar .play-pause-btn')) {
            event.preventDefault();
            event.stopImmediatePropagation();
            if (audio.paused) tryPlay(audio).catch((error) => setFallbackError(error.message));
            else audio.pause();
        } else if (event.target.closest('#next-btn')) {
            event.preventDefault();
            event.stopImmediatePropagation();
            const next = (fallback.index + 1) % fallback.tracks.length;
            playFallbackTrack(fallback.tracks[next], next);
        } else if (event.target.closest('#prev-btn')) {
            event.preventDefault();
            event.stopImmediatePropagation();
            if (audio.currentTime > 3) audio.currentTime = 0;
            else {
                const previous = (fallback.index - 1 + fallback.tracks.length) % fallback.tracks.length;
                playFallbackTrack(fallback.tracks[previous], previous);
            }
        } else if (event.target.closest('#repeat-btn')) {
            event.preventDefault();
            event.stopImmediatePropagation();
            audio.loop = !audio.loop;
            event.target.closest('#repeat-btn')?.classList.toggle('active', audio.loop);
        } else if (event.target.closest('#volume-btn')) {
            event.preventDefault();
            event.stopImmediatePropagation();
            audio.muted = !audio.muted;
            try { localStorage.setItem('muted', String(audio.muted)); } catch (error) {}
        }
    }, true);

    const audio = playerElement();
    if (audio) {
        const updateProgress = () => {
            if (!fallback.active || fallback.progressFrame) return;
            fallback.progressFrame = requestAnimationFrame(() => {
                fallback.progressFrame = 0;
                const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
                const progress = duration ? (audio.currentTime / duration) * 100 : 0;
                document.getElementById('progress-fill')?.style.setProperty('width', `${progress}%`);
                const current = document.getElementById('current-time');
                const total = document.getElementById('total-duration');
                if (current) current.textContent = formatTime(audio.currentTime);
                if (total) total.textContent = formatTime(duration);
            });
        };
        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('durationchange', updateProgress);
        audio.addEventListener('play', updateFallbackPlayerUi);
        audio.addEventListener('pause', updateFallbackPlayerUi);
        audio.addEventListener('ended', () => {
            if (!fallback.active || audio.loop || !fallback.tracks.length) return;
            const next = (fallback.index + 1) % fallback.tracks.length;
            playFallbackTrack(fallback.tracks[next], next);
        });
        document.getElementById('progress-bar')?.addEventListener('pointerdown', (event) => {
            if (!fallback.active || !Number.isFinite(audio.duration)) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            audio.currentTime = Math.max(0, Math.min(audio.duration, ((event.clientX - bounds.left) / bounds.width) * audio.duration));
        });
    }

    if ('mediaSession' in navigator) {
        for (const [action, handler] of [
            ['play', () => {
                const audio = playerElement();
                if (fallback.active && audio) tryPlay(audio).catch(() => {});
            }],
            ['pause', () => fallback.active && playerElement()?.pause()],
            ['nexttrack', () => fallback.active && document.getElementById('next-btn')?.click()],
            ['previoustrack', () => fallback.active && document.getElementById('prev-btn')?.click()]
        ]) {
            try { navigator.mediaSession.setActionHandler(action, handler); } catch (error) {}
        }
    }

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && fallback.progressFrame) {
            cancelAnimationFrame(fallback.progressFrame);
            fallback.progressFrame = 0;
        }
    });

    window.addEventListener('pagehide', () => {
        fallback.searchController?.abort();
        fallback.playController?.abort();
        fallback.shaka?.destroy().catch(() => {});
        if (fallback.manifestUrl) URL.revokeObjectURL(fallback.manifestUrl);
    }, { once: true });

    const announceReady = () => {
        if (runtimeReady) return;
        runtimeReady = true;
        document.documentElement.dataset.neoMusicReady = 'true';
        if (window.parent !== window) {
            const targetOrigin = window.location.origin === 'null' ? '*' : window.location.origin;
            window.parent.postMessage({ neoMusicUiReady: true }, targetOrigin);
        }
        if (pendingSearch && searchInput && searchForm) {
            searchInput.value = pendingSearch;
            pendingSearch = '';
            requestAnimationFrame(() => searchForm.requestSubmit());
        }
    };

    const waitForRuntime = window.setInterval(() => {
        /* The current player owns #audio-player. An older integration waited
           for the removed #audio-player-crossfade element, so the desktop
           reported a false startup failure after ten seconds. */
        const player = document.getElementById('audio-player') || document.getElementById('audio-player-crossfade');
        if (!player || !searchForm || !searchInput) return;
        window.clearInterval(waitForRuntime);
        requestAnimationFrame(announceReady);
    }, 120);
    window.setTimeout(() => window.clearInterval(waitForRuntime), 15000);
});
window.addEventListener('popstate', syncNeoNavigation);
window.addEventListener('neo-theme-change', syncNeoThemeDetails);
document.addEventListener('click', () => requestAnimationFrame(syncNeoNavigation));

document.addEventListener(
    'contextmenu',
    (event) => {
        if (
            event.target.closest(
                '.track-item, .queue-track-item, .card, .now-playing-bar .cover, .now-playing-bar .title, .now-playing-bar .album, .now-playing-bar .artist'
            )
        ) {
            event.preventDefault();
        }
    },
    true
);
