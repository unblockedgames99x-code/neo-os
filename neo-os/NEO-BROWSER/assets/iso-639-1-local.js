(function () {
  "use strict";

  var codes = (
    "aa ab ae af ak am an ar as av ay az ba be bg bh bi bm bn bo br bs ca ce ch co cr cs cu cv cy da de dv dz " +
    "ee el en eo es et eu fa ff fi fj fo fr fy ga gd gl gn gu gv ha he hi ho hr ht hu hy hz ia id ie ig ii ik io " +
    "is it iu ja jv ka kg ki kj kk kl km kn ko kr ks ku kv kw ky la lb lg li ln lo lt lu lv mg mh mi mk ml mn mr " +
    "ms mt my na nb nd ne ng nl nn no nr nv ny oc oj om or os pa pi pl ps pt qu rm rn ro ru rw sa sc sd se sg si " +
    "sk sl sm sn so sq sr ss st su sv sw ta te tg th ti tk tl tn to tr ts tt tw ty ug uk ur uz ve vi vo wa wo xh " +
    "yi yo za zh zu"
  ).split(/\s+/);

  function displayName(code, locale) {
    try {
      if (typeof Intl.DisplayNames === "function") {
        return new Intl.DisplayNames([locale || code || "en"], { type: "language" }).of(code) || code.toUpperCase();
      }
    } catch (error) {}
    return String(code || "").toUpperCase();
  }

  window.ISO6391 = Object.freeze({
    getAllCodes: function () { return codes.slice(); },
    getName: function (code) { return displayName(code, "en"); },
    getNativeName: function (code) { return displayName(code, code); }
  });

  // The upstream UI used to create a jsDelivr script tag when Language was
  // opened. Satisfy that exact optional dependency locally and fire its load
  // callback without inserting the remote tag, so no page/referrer data leaves
  // NEO Browser just for a settings list.
  var appendChild = Node.prototype.appendChild;
  Node.prototype.appendChild = function (child) {
    if (
      child instanceof HTMLScriptElement &&
      /cdn\.jsdelivr\.net\/npm\/iso-639-1(?:@|\/)/i.test(String(child.src || ""))
    ) {
      queueMicrotask(function () {
        if (typeof child.onload === "function") child.onload.call(child, new Event("load"));
        else child.dispatchEvent(new Event("load"));
      });
      return child;
    }
    return appendChild.call(this, child);
  };
})();
