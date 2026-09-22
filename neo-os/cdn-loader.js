(function () {
  'use strict';

  var roots = [
    'https://fastly.jsdelivr.net/npm/@c8rter_09/neo-os-desktop@1.0.3/',
    'https://cdn.jsdelivr.net/npm/@c8rter_09/neo-os-desktop@1.0.3/',
    'https://gcore.jsdelivr.net/npm/@c8rter_09/neo-os-desktop@1.0.3/',
    'https://quantil.jsdelivr.net/npm/@c8rter_09/neo-os-desktop@1.0.3/'
  ];

  function showFailure() {
    document.body.innerHTML = '<main style="min-height:100vh;display:grid;place-items:center;background:#05070b;color:#fff;font:16px Arial,sans-serif">NEO OS could not load. Refresh to try again.</main>';
  }

  function installHtml(html, root) {
    html = html.replace(/<meta\b[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '');
    var base = '<base href="' + root.replace(/"/g, '&quot;') + '">';
    var runner = /<meta\b[^>]*name=["']neo-runner["'][^>]*>/i.test(html)
      ? ''
      : '<meta name="neo-runner" content="cdn">';
    var injection = base + runner;
    var page = /<head(?:\s[^>]*)?>/i.test(html)
      ? html.replace(/<head(\s[^>]*)?>/i, function (match) { return match + injection; })
      : injection + html;
    document.open();
    document.write(page);
    document.close();
  }

  function tryRoot(index) {
    if (index >= roots.length) {
      showFailure();
      return;
    }
    fetch(roots[index] + 'index.html', { cache: 'no-store', mode: 'cors' })
      .then(function (response) {
        if (!response.ok) throw new Error('CDN response ' + response.status);
        return response.text();
      })
      .then(function (html) { installHtml(html, roots[index]); })
      .catch(function () { tryRoot(index + 1); });
  }

  tryRoot(0);
}());
