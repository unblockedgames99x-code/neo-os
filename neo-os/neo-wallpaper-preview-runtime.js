(function () {
  "use strict";

  function seedNumber(value) {
    var hash = 2166136261;
    String(value || "preview").split("").forEach(function (character) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    });
    return hash >>> 0;
  }

  function seededRandom(seed) {
    var value = seed || 1;
    return function () {
      value += 0x6D2B79F5;
      var result = value;
      result = Math.imul(result ^ result >>> 15, result | 1);
      result ^= result + Math.imul(result ^ result >>> 7, result | 61);
      return ((result ^ result >>> 14) >>> 0) / 4294967296;
    };
  }

  function themeFor(record) {
    var text = [record && record.name, record && record.description, record && record.sourceType].join(" ").toLowerCase();
    if (/matrix|digital rain|code rain/.test(text)) return "matrix";
    if (/snow|winter|frost|ice|white tree/.test(text)) return "snow";
    if (/rain|storm|water|ocean|river/.test(text)) return "rain";
    if (/space|star|galaxy|nebula|cosmic|planet/.test(text)) return "space";
    if (/neon|cyber|synth|vapor|retro/.test(text)) return "neon";
    return "ambient";
  }

  function fillLayer(element, fit) {
    element.style.position = "absolute";
    element.style.inset = "0";
    element.style.width = "100%";
    element.style.height = "100%";
    element.style.minWidth = "0";
    element.style.minHeight = "0";
    element.style.maxWidth = "none";
    element.style.maxHeight = "none";
    element.style.display = "block";
    element.style.margin = "0";
    element.style.pointerEvents = "none";
    if (element.tagName !== "CANVAS") {
      element.style.objectFit = /^(cover|contain|fill|none|scale-down)$/.test(fit) ? fit : "cover";
      element.style.objectPosition = "center";
    }
  }

  function mount(options) {
    options = options || {};
    var layer = options.layer;
    var record = options.record || {};
    var sourceUrl = String(options.sourceUrl || "");
    var shouldPause = typeof options.shouldPause === "function" ? options.shouldPause : function () { return false; };
    var onState = typeof options.onState === "function" ? options.onState : function () {};
    if (!layer) throw new Error("The wallpaper layer is unavailable.");

    var theme = themeFor(record);
    if (theme !== "matrix" && sourceUrl) {
      var source = document.createElement("img");
      source.className = "wallpaper-preview-source";
      source.alt = "";
      source.decoding = "async";
      source.draggable = false;
      fillLayer(source, options.fit);
      source.addEventListener("load", function () { onState(shouldPause() ? "paused" : "playing", "ready"); }, { once: true });
      source.src = sourceUrl;
      layer.appendChild(source);
    }

    var canvas = document.createElement("canvas");
    canvas.className = "wallpaper-media-asset wallpaper-preview-canvas";
    canvas.dataset.previewTheme = theme;
    canvas.setAttribute("aria-hidden", "true");
    fillLayer(canvas, "cover");
    layer.appendChild(canvas);
    var context = canvas.getContext("2d", { alpha: theme !== "matrix" });
    if (!context) throw new Error("The animated wallpaper canvas is unavailable.");

    var recordSeed = seedNumber(record.id + record.name);
    var random = seededRandom(recordSeed);
    var matrixColumns = Array.from({ length: 180 }, function () {
      return {
        offset: random(),
        speed: 0.014 + random() * 0.026,
        length: 7 + Math.floor(random() * 15),
        brightness: 0.58 + random() * 0.42
      };
    });
    var particles = Array.from({ length: 150 }, function () {
      return {
        x: random(),
        y: random(),
        size: 0.6 + random() * 2.2,
        speed: 0.015 + random() * 0.055,
        drift: random() * Math.PI * 2,
        alpha: 0.22 + random() * 0.58
      };
    });

    function resize() {
      var width = Math.max(1, canvas.clientWidth || window.innerWidth || 1);
      var height = Math.max(1, canvas.clientHeight || window.innerHeight || 1);
      var minimumScale = Math.min(1920 / width, 1080 / height);
      var scale = Math.min(2, Math.max(window.devicePixelRatio || 1, minimumScale));
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      canvas.dataset.renderScale = String(scale);
    }
    resize();
    var observer = window.ResizeObserver ? new ResizeObserver(resize) : null;
    if (observer) observer.observe(canvas);

    var glyphs = "01NEO<>[]{}+-=*/";
    var frame = 0;
    var lastFrame = 0;
    var motionTime = 0;
    var renderedOnce = false;
    var destroyed = false;

    function drawMatrix(width, height) {
      var background = context.createLinearGradient(0, 0, 0, height);
      background.addColorStop(0, "#020704");
      background.addColorStop(0.55, "#000d05");
      background.addColorStop(1, "#000201");
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);
      var fontSize = Math.max(18, Math.min(27, width / 78));
      var columns = Math.ceil(width / fontSize) + 1;
      var tick = Math.floor(motionTime / 220);
      context.font = "600 " + fontSize + "px ui-monospace, Consolas, monospace";
      context.textAlign = "center";
      context.textBaseline = "middle";
      for (var column = 0; column < columns; column += 1) {
        var spec = matrixColumns[column % matrixColumns.length];
        var trail = spec.length * fontSize;
        var cycle = height + trail + 140;
        var head = (spec.offset * cycle + motionTime * spec.speed) % cycle - trail;
        var x = column * fontSize + fontSize * 0.5;
        for (var row = 0; row < spec.length; row += 1) {
          var y = head - row * fontSize;
          if (y < -fontSize || y > height + fontSize) continue;
          var fade = Math.pow(1 - row / spec.length, 1.55) * spec.brightness;
          var glyph = glyphs.charAt((column * 19 + row * 29 + tick * 7 + recordSeed) % glyphs.length);
          if (row === 0) {
            context.fillStyle = "rgba(224,255,232," + Math.min(1, fade + 0.2) + ")";
            context.shadowColor = "rgba(93,255,132,0.9)";
            context.shadowBlur = 9;
          } else {
            context.fillStyle = "rgba(39,224,91," + Math.max(0.04, fade * 0.74) + ")";
            context.shadowBlur = 0;
          }
          context.fillText(glyph, x, y);
        }
      }
      context.shadowBlur = 0;
      var vignette = context.createRadialGradient(width * 0.5, height * 0.48, Math.min(width, height) * 0.15, width * 0.5, height * 0.5, Math.max(width, height) * 0.72);
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, "rgba(0,0,0,0.52)");
      context.fillStyle = vignette;
      context.fillRect(0, 0, width, height);
    }

    function drawAmbient(width, height) {
      context.clearRect(0, 0, width, height);
      if (!sourceUrl) {
        var fallback = context.createLinearGradient(0, 0, width, height);
        fallback.addColorStop(0, "#0b111b");
        fallback.addColorStop(1, "#101622");
        context.fillStyle = fallback;
        context.fillRect(0, 0, width, height);
      }
      particles.forEach(function (particle, index) {
        var progress = (particle.y + motionTime * particle.speed / 1000) % 1;
        var x = particle.x * width + Math.sin(motionTime * 0.00035 + particle.drift) * 22;
        var y = progress * height;
        if (theme === "rain") {
          context.strokeStyle = "rgba(190,221,255," + particle.alpha * 0.6 + ")";
          context.lineWidth = Math.max(0.7, particle.size * 0.65);
          context.beginPath();
          context.moveTo(x, y);
          context.lineTo(x - 9, y + 28 + particle.size * 8);
          context.stroke();
        } else if (theme === "snow") {
          context.fillStyle = "rgba(244,250,255," + particle.alpha + ")";
          context.beginPath();
          context.arc(x, y, particle.size * 1.25, 0, Math.PI * 2);
          context.fill();
        } else if (theme === "space") {
          var pulse = 0.42 + Math.sin(motionTime * 0.002 + particle.drift) * 0.3;
          context.fillStyle = "rgba(226,235,255," + Math.max(0.08, particle.alpha * pulse) + ")";
          context.fillRect(x, particle.y * height, particle.size, particle.size);
        } else if (theme === "neon") {
          context.fillStyle = index % 2 ? "rgba(64,220,255," + particle.alpha * 0.42 + ")" : "rgba(255,80,193," + particle.alpha * 0.35 + ")";
          context.beginPath();
          context.arc(x, y, particle.size, 0, Math.PI * 2);
          context.fill();
        } else {
          context.fillStyle = "rgba(238,243,255," + particle.alpha * 0.28 + ")";
          context.beginPath();
          context.arc(x, y, particle.size * 0.75, 0, Math.PI * 2);
          context.fill();
        }
      });
    }

    function draw(time) {
      if (destroyed) return;
      var paused = shouldPause();
      if (paused && renderedOnce) {
        lastFrame = time;
        onState("paused", "playback");
        frame = requestAnimationFrame(draw);
        return;
      }
      if (lastFrame && time - lastFrame < 33) {
        frame = requestAnimationFrame(draw);
        return;
      }
      var delta = lastFrame ? Math.min(50, time - lastFrame) : 16;
      lastFrame = time;
      if (!paused) motionTime += delta;
      var scale = Number(canvas.dataset.renderScale || 1);
      var width = canvas.width / scale;
      var height = canvas.height / scale;
      context.setTransform(scale, 0, 0, scale, 0, 0);
      if (theme === "matrix") drawMatrix(width, height); else drawAmbient(width, height);
      var stateReason = renderedOnce ? "playback" : "ready";
      renderedOnce = true;
      onState(paused ? "paused" : "playing", stateReason);
      frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);

    return {
      canvas: canvas,
      theme: theme,
      destroy: function () {
        destroyed = true;
        if (frame) cancelAnimationFrame(frame);
        if (observer) observer.disconnect();
      }
    };
  }

  window.NEOWallpaperPreviewRuntime = { mount: mount };
})();
