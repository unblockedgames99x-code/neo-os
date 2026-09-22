(function () {
  "use strict";

  if (window.__neoAudioSpectrumBridge) return;
  window.__neoAudioSpectrumBridge = true;

  var BAND_COUNT = 32;
  var SAMPLE_INTERVAL = 100;
  var meters = new Set();
  var meterByContext = new WeakMap();
  var installedDocuments = new WeakSet();
  var lastActive = false;
  var lastLevels = new Array(BAND_COUNT).fill(0);
  var timer = 0;

  function levelBands(bytes) {
    var result = new Array(BAND_COUNT).fill(0);
    if (!bytes || !bytes.length) return result;
    for (var band = 0; band < BAND_COUNT; band += 1) {
      var low = Math.pow(band / BAND_COUNT, 1.72);
      var high = Math.pow((band + 1) / BAND_COUNT, 1.72);
      var start = Math.min(bytes.length - 1, Math.floor(low * bytes.length));
      var end = Math.max(start + 1, Math.min(bytes.length, Math.ceil(high * bytes.length)));
      var total = 0;
      var peak = 0;
      for (var index = start; index < end; index += 1) {
        var value = bytes[index] / 255;
        total += value * value;
        if (value > peak) peak = value;
      }
      var rms = Math.sqrt(total / Math.max(1, end - start));
      result[band] = Math.min(.92, Math.pow(Math.max(rms, peak * .58), .92) * .88);
    }
    return result;
  }

  function emit(levels, active) {
    var detail = {
      source: "all-audio",
      levels: levels,
      measured: true,
      active: active,
      bands: BAND_COUNT,
      interval: SAMPLE_INTERVAL
    };
    if (window.parent && window.parent !== window) {
      try {
        window.parent.postMessage({
          type: "neo-shell:audio-levels",
          source: detail.source,
          levels: detail.levels,
          measured: detail.measured,
          active: detail.active,
          bands: detail.bands,
          interval: detail.interval
        }, "*");
      } catch (_error) {}
      return;
    }
    try { window.dispatchEvent(new CustomEvent("neo-media-levels", { detail: detail })); } catch (_error) {}
  }

  function sample() {
    if (document.hidden) {
      if (lastActive) emit(new Array(BAND_COUNT).fill(0), false);
      lastActive = false;
      return;
    }
    var now = performance.now();
    var combined = new Array(BAND_COUNT).fill(0);
    var active = false;
    meters.forEach(function (meter) {
      if (!meter.context || meter.context.state === "closed") {
        meters.delete(meter);
        return;
      }
      if (meter.media && (meter.media.paused || meter.media.ended || meter.media.muted || meter.media.volume === 0)) return;
      try {
        meter.analyser.getByteFrequencyData(meter.bytes);
        var levels = levelBands(meter.bytes);
        var peak = 0;
        for (var band = 0; band < BAND_COUNT; band += 1) {
          if (levels[band] > combined[band]) combined[band] = levels[band];
          if (levels[band] > peak) peak = levels[band];
        }
        if (peak > .008 || (meter.media && !meter.media.paused && !meter.media.ended)) {
          meter.activeUntil = now + 420;
        }
        if (meter.activeUntil > now) active = true;
      } catch (_error) {}
    });
    var changed = active !== lastActive;
    if (!changed) {
      for (var index = 0; index < BAND_COUNT; index += 1) {
        if (Math.abs(combined[index] - lastLevels[index]) > .003) { changed = true; break; }
      }
    }
    if (changed || active || lastActive) emit(combined, active);
    lastActive = active;
    lastLevels = combined;
    if (!meters.size && timer) {
      window.clearInterval(timer);
      timer = 0;
    }
  }

  function ensureTimer() {
    if (timer) return;
    timer = window.setInterval(sample, SAMPLE_INTERVAL);
    sample();
  }

  function addMeter(context, realm, kind, media, originalConnect) {
    if (!context || meterByContext.has(context)) return meterByContext.get(context);
    try {
      var analyser = context.createAnalyser();
      var silence = context.createGain();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = .16;
      silence.gain.value = 0;
      originalConnect.call(analyser, silence);
      originalConnect.call(silence, context.destination);
      var meter = {
        context: context,
        analyser: analyser,
        bytes: new Uint8Array(analyser.frequencyBinCount),
        activeUntil: 0,
        kind: kind,
        media: media || null,
        tapped: new WeakSet()
      };
      meterByContext.set(context, meter);
      meters.add(meter);
      ensureTimer();
      return meter;
    } catch (_error) {
      return null;
    }
  }

  function patchAudioGraph(realm) {
    var AudioNodeClass = realm.AudioNode;
    var nodePrototype = AudioNodeClass && AudioNodeClass.prototype;
    var originalConnect = nodePrototype && nodePrototype.connect;
    if (!originalConnect) return;
    if (!nodePrototype.__neoSpectrumConnect) {
      var patchedConnect = function () {
        var result = originalConnect.apply(this, arguments);
        try {
          var destination = arguments[0];
          var context = this.context;
          if (context && destination === context.destination) {
            var meter = addMeter(context, realm, "webaudio", null, originalConnect);
            if (meter && !meter.tapped.has(this)) {
              meter.tapped.add(this);
              if (typeof arguments[1] === "number") originalConnect.call(this, meter.analyser, arguments[1]);
              else originalConnect.call(this, meter.analyser);
              ensureTimer();
            }
          }
        } catch (_error) {}
        return result;
      };
      try {
        Object.defineProperty(nodePrototype, "__neoSpectrumConnect", { value: originalConnect });
        nodePrototype.connect = patchedConnect;
      } catch (_error) {}
    } else {
      originalConnect = nodePrototype.__neoSpectrumConnect;
    }

    ["AudioContext", "webkitAudioContext"].forEach(function (name) {
      var NativeContext = realm[name];
      if (!NativeContext || NativeContext.__neoSpectrumWrapped) return;
      function WrappedAudioContext() {
        var context = Reflect.construct(NativeContext, arguments, NativeContext);
        addMeter(context, realm, "webaudio", null, originalConnect);
        return context;
      }
      try {
        Object.setPrototypeOf(WrappedAudioContext, NativeContext);
        WrappedAudioContext.prototype = NativeContext.prototype;
        Object.defineProperty(WrappedAudioContext, "__neoSpectrumWrapped", { value: true });
        realm[name] = WrappedAudioContext;
      } catch (_error) {}
    });
  }

  function watchMedia(realm, media) {
    if (!media || media.__neoSpectrumMedia) return;
    try { Object.defineProperty(media, "__neoSpectrumMedia", { value: true }); } catch (_error) { return; }
    var attach = function () {
      if (media.__neoSpectrumMeter || media.paused || media.ended) return;
      try {
        var capture = media.captureStream || media.mozCaptureStream;
        var NativeContext = realm.AudioContext && (realm.AudioContext.__neoSpectrumWrapped ? Object.getPrototypeOf(realm.AudioContext) : realm.AudioContext);
        var nodePrototype = realm.AudioNode && realm.AudioNode.prototype;
        var originalConnect = nodePrototype && (nodePrototype.__neoSpectrumConnect || nodePrototype.connect);
        if (!capture || !NativeContext || !originalConnect) return;
        var stream = capture.call(media);
        if (!stream || !stream.getAudioTracks || !stream.getAudioTracks().length) return;
        var context = new NativeContext({ latencyHint: "playback" });
        var meter = addMeter(context, realm, "media", media, originalConnect);
        if (!meter) return;
        var source = context.createMediaStreamSource(stream);
        originalConnect.call(source, meter.analyser);
        media.__neoSpectrumMeter = meter;
        if (context.state === "suspended") context.resume().catch(function () {});
        ensureTimer();
      } catch (_error) {}
    };
    ["play", "playing", "loadeddata"].forEach(function (type) { media.addEventListener(type, attach, { passive: true }); });
    ["pause", "ended", "emptied", "volumechange"].forEach(function (type) { media.addEventListener(type, ensureTimer, { passive: true }); });
    if (!media.paused) attach();
  }

  function scanRealm(realm) {
    var doc;
    try { doc = realm.document; } catch (_error) { return; }
    if (!doc) return;
    try { doc.querySelectorAll("audio,video").forEach(function (media) { watchMedia(realm, media); }); } catch (_error) {}
    try {
      doc.querySelectorAll("iframe").forEach(function (frame) {
        installFrame(frame);
      });
    } catch (_error) {}
  }

  function installFrame(frame) {
    try {
      var child = frame && frame.contentWindow;
      if (!child || child.__neoAudioSpectrumBridge) return;
      installRealm(child);
    } catch (_error) {}
  }

  function installRealm(realm) {
    if (!realm) return;
    try {
      var doc = realm.document;
      if (!doc || installedDocuments.has(doc)) return;
      installedDocuments.add(doc);
      patchAudioGraph(realm);
      var rescan = function () { scanRealm(realm); };
      if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", rescan, { once: true });
      else rescan();
      doc.addEventListener("play", function (event) {
        var MediaClass = realm.HTMLMediaElement;
        if (MediaClass && event.target instanceof MediaClass) watchMedia(realm, event.target);
      }, true);
      doc.addEventListener("load", function (event) {
        if (event.target && event.target.tagName === "IFRAME") {
          installFrame(event.target);
        }
      }, true);
      if (realm.MutationObserver && doc.documentElement) {
        new realm.MutationObserver(function (records) {
          records.forEach(function (record) {
            record.addedNodes.forEach(function (node) {
              if (!node || node.nodeType !== 1) return;
              if (node.matches && node.matches("audio,video")) watchMedia(realm, node);
              if (node.matches && node.matches("iframe")) {
                node.addEventListener("load", function () { installFrame(node); });
              }
              if (node.querySelectorAll) node.querySelectorAll("audio,video").forEach(function (media) { watchMedia(realm, media); });
              if (node.querySelectorAll) node.querySelectorAll("iframe").forEach(function (frame) {
                frame.addEventListener("load", function () { installFrame(frame); });
              });
            });
          });
        }).observe(doc.documentElement, { childList: true, subtree: true });
      }
    } catch (_error) {}
  }

  installRealm(window);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (timer) window.clearInterval(timer);
      timer = 0;
      sample();
      return;
    }
    if (meters.size) ensureTimer();
    else sample();
  });
})();
