(function () {
  'use strict';
  // Future CDN migration: change assetBase to your HTTPS asset directory and
  // allowRemoteAssets to true. Keep catalog.js paths relative to that directory.
  // Also allow that exact origin in BOTH index.html's CSP and the preview
  // server's media-src/img-src CSP. Do not enable remote script execution.
  // UI scripts stay local. No search API or hosted player is needed.
  const config = Object.freeze({
    assetBase: './',
    allowRemoteAssets: false,
    database: 'neo-music-local-v1',
    storageKey: 'neo-music-library-v1',
    maxImportBytes: 150 * 1024 * 1024,
    maxCoverBytes: 12 * 1024 * 1024
  });
  window.NEO_MUSIC_CONFIG = config;
  window.neoMusicAsset = function (path) {
    const base = new URL(config.assetBase, document.baseURI);
    const url = new URL(path, base);
    if (!['http:', 'https:', 'file:', 'blob:'].includes(url.protocol)) throw new Error('Unsupported asset path.');
    if (!config.allowRemoteAssets && url.protocol !== 'blob:' && url.origin !== base.origin) throw new Error('Remote assets are disabled in local mode.');
    return url.href;
  };
})();
