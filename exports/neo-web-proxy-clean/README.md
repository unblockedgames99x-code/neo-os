# NEO Web Proxy — clean standalone files

This folder is the standalone NEO Browser proxy package.

## Start

Serve this directory from an HTTPS website and open `launch.svg` (NEO app launcher) or `index.html` (browser directly). Service workers do not run from a normal `file://` URL.

Keep the directory structure intact. The proxy engine, WebAssembly file, local icons, browser UI, automatic WISP switching, and ad shield are included.

## Privacy cleanup

- No public package-CDN URL or hostname is present.
- No project GitHub owner string is present.
- No project CDN repository name is present.
- The optional developer-tool plugin downloader was disabled instead of contacting a public CDN.

The WISP entries in `wisp-settings.js` are the external relay servers the web proxy needs to reach sites. You can replace them with your own WISP server if desired.
