(() => {
    const appsScriptHost = 'script.google.com';
    const searchOrigin = 'https://vcsa.huangqirui.xyz';
    const nativeAppendChild = HTMLHeadElement.prototype.appendChild;

    HTMLHeadElement.prototype.appendChild = function appendNeoMusicSearch(node) {
        if (!(node instanceof HTMLScriptElement) || !node.src) {
            return nativeAppendChild.call(this, node);
        }

        let request;
        try {
            request = new URL(node.src, window.location.href);
        } catch (_) {
            return nativeAppendChild.call(this, node);
        }

        if (
            request.hostname !== appsScriptHost ||
            request.searchParams.get('mode') !== 'music-search'
        ) {
            return nativeAppendChild.call(this, node);
        }

        const query = String(request.searchParams.get('q') || '').trim();
        const callback = String(request.searchParams.get('callback') || '');
        const target = `${searchOrigin}/api/music/search?q=${encodeURIComponent(query)}`;
        const encodedTarget = encodeURIComponent(target);
        const proxies = [
            {
                url: `https://api.allorigins.win/raw?url=${encodedTarget}`,
                read: (response) => response.json()
            },
            {
                url: `https://api.allorigins.win/get?url=${encodedTarget}`,
                read: (response) => response.json().then((result) => JSON.parse(result.contents || '{}'))
            }
        ];

        const fetchSearch = (index = 0) => {
            if (index >= proxies.length) return Promise.reject(new Error('Search is unavailable'));
            const current = proxies[index];
            return fetch(current.url, { cache: 'no-store' })
                .then((response) => {
                    if (!response.ok) throw new Error(`Search failed: ${response.status}`);
                    return current.read(response);
                })
                .catch(() => fetchSearch(index + 1));
        };

        fetchSearch()
            .then((payload) => {
                if (typeof window[callback] === 'function') window[callback](payload);
            })
            .catch(() => {
                if (typeof node.onerror === 'function') node.onerror(new Event('error'));
            });

        return node;
    };
})();
