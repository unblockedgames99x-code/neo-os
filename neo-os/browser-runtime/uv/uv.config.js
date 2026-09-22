/* global Ultraviolet */
(() => {
  const engineVersion = "neo-browse-v71";
  const runsInDocument = typeof document !== "undefined";
  const configSource = runsInDocument && document.currentScript?.src
    ? document.currentScript.src
    : self.location.href;
  const assetBase = new URL(runsInDocument ? "../../" : "./", configSource);
  const runtimeRoot = new URL("browser-runtime", assetBase).href.replace(/\/$/, "");
  const routePrefix = new URL("browse-v71/", assetBase).pathname;
  const emptyCssUrlMarker =
    "data:application/x-neo-browser-empty-url;base64,AA==";

  function encodeUrl(url) {
    return encodeURIComponent(String(url));
  }

  function decodeUrl(route) {
    return decodeURIComponent(String(route));
  }

  self.__uv$config = {
    prefix: routePrefix,
    encodeUrl,
    decodeUrl,
    handler: `${runtimeRoot}/uv/uv.handler.js?engine=${engineVersion}`,
    client: `${runtimeRoot}/uv/uv.client.js?engine=${engineVersion}`,
    bundle: `${runtimeRoot}/uv/uv.bundle.js?engine=${engineVersion}`,
    config: `${runtimeRoot}/uv/uv.config.js?engine=${engineVersion}`,
    sw: `${runtimeRoot}/uv/uv.sw.js`,
    construct(ultraviolet, environment) {
      if (environment !== "service" || ultraviolet.__neoBrowserShell) return;

      const createHtmlInject = ultraviolet.createHtmlInject;
      ultraviolet.createHtmlInject = function createNeoBrowserInject(...args) {
        return [
          ...createHtmlInject.apply(this, args),
          {
            tagName: "script",
            nodeName: "script",
            childNodes: [],
            attrs: [
              {
                name: "src",
                value: `${runtimeRoot}/client-shell.js?ui=${engineVersion}-shell-v11`,
                skip: true,
              },
              {
                name: "data-neo-browser-shell",
                value: "1",
                skip: true,
              },
            ],
            skip: true,
          },
        ];
      };
      Object.defineProperty(ultraviolet, "__neoBrowserShell", {
        value: true,
      });
    },
  };

  // Protect empty CSS url() fallbacks from an upstream rewrite edge case.
  if (typeof Ultraviolet === "function") {
    const ultravioletPrototype = Ultraviolet.prototype;
    if (!ultravioletPrototype.__neoBrowserDynamicImportFix) {
      Object.defineProperty(ultravioletPrototype, "__neoBrowserDynamicImportFix", {
        value: true,
      });
      ultravioletPrototype.rewriteImport = function rewriteDynamicImport(
        baseUrl,
        source,
        meta = this.meta,
      ) {
        return this.rewriteUrl(source, { ...meta, base: baseUrl });
      };
    }

    const cssPrototype = Object.getPrototypeOf(
      new Ultraviolet(self.__uv$config).css,
    );

    if (!cssPrototype.__neoBrowserEmptyUrlFix) {
      const originalRecast = cssPrototype.recast;
      Object.defineProperty(cssPrototype, "__neoBrowserEmptyUrlFix", {
        value: true,
      });
      cssPrototype.recast = function recastWithEmptyUrlFix(css, options, type) {
        const protectedCss = String(css).replace(
          /url\(\s*(?:""|'')?\s*\)/gi,
          `url("${emptyCssUrlMarker}")`,
        );
        return originalRecast
          .call(this, protectedCss, options, type)
          .replaceAll(`url("${emptyCssUrlMarker}")`, "url()");
      };
    }
  }
})();
