(function () {
  "use strict";

  var root = document.documentElement;
  var layer = document.getElementById("wallpaper-media");
  var active = null;
  var waiting = new WeakSet();
  var UPSCALE_THRESHOLD = 1.2;

  if (!layer || !window.MutationObserver) return;

  function enhancementEnabled() {
    return (root.dataset.performanceMode || "normal") === "normal";
  }

  function shader(gl, type, source) {
    var value = gl.createShader(type);
    gl.shaderSource(value, source);
    gl.compileShader(value);
    if (!gl.getShaderParameter(value, gl.COMPILE_STATUS)) {
      gl.deleteShader(value);
      return null;
    }
    return value;
  }

  function program(gl) {
    var vertex = shader(gl, gl.VERTEX_SHADER,
      "attribute vec2 p;varying vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}");
    var fragment = shader(gl, gl.FRAGMENT_SHADER,
      "precision mediump float;uniform sampler2D image;uniform vec2 texel;uniform vec2 scale;uniform vec2 offset;varying vec2 uv;vec4 C(float v){vec4 n=vec4(1.,2.,3.,4.)-v;vec4 s=n*n*n;float x=s.x;float y=s.y-4.*s.x;float z=s.z-4.*s.y+6.*s.x;return vec4(x,y,z,6.-x-y-z)/6.;}vec4 B(vec2 q){vec2 p=q/texel-.5;vec2 f=fract(p);p-=f;vec4 x=C(f.x),y=C(f.y);vec4 c=vec4(p.x-.5,p.x+1.5,p.y-.5,p.y+1.5);vec4 s=vec4(x.x+x.y,x.z+x.w,y.x+y.y,y.z+y.w);vec4 o=(c+vec4(x.y,x.w,y.y,y.w)/s)*vec4(texel.x,texel.x,texel.y,texel.y);vec4 a=texture2D(image,o.xz),b=texture2D(image,o.yz),d=texture2D(image,o.xw),e=texture2D(image,o.yw);float sx=s.x/(s.x+s.y),sy=s.z/(s.z+s.w);return mix(mix(e,d,sx),mix(b,a,sx),sy);}void main(){vec2 q=uv*scale+offset;vec4 hi=B(q);vec3 c=texture2D(image,q).rgb;vec3 a=texture2D(image,q+vec2(texel.x,0.)).rgb+texture2D(image,q-vec2(texel.x,0.)).rgb+texture2D(image,q+vec2(0.,texel.y)).rgb+texture2D(image,q-vec2(0.,texel.y)).rgb;vec3 d=c-a*.25;float e=clamp(length(d)*3.,0.,1.);gl_FragColor=vec4(clamp(hi.rgb+d*(.08+e*.1),0.,1.),hi.a);}");
    if (!vertex || !fragment) return null;
    var value = gl.createProgram();
    gl.attachShader(value, vertex);
    gl.attachShader(value, fragment);
    gl.linkProgram(value);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(value, gl.LINK_STATUS)) {
      gl.deleteProgram(value);
      return null;
    }
    return value;
  }

  function fitFor(image) {
    return /^(cover|contain|fill|none|scale-down)$/.test(image.style.objectFit) ? image.style.objectFit : "cover";
  }

  function needsEnhancement(image) {
    if (image.classList.contains("wallpaper-animated-image-source") || image.classList.contains("wallpaper-preview-source")) return false;
    if (!image.naturalWidth || !image.naturalHeight) return false;
    var bounds = layer.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return false;
    var fit = fitFor(image);
    if (fit === "none" || fit === "scale-down") return false;
    var widthScale = bounds.width / image.naturalWidth;
    var heightScale = bounds.height / image.naturalHeight;
    var scale = fit === "contain" ? Math.min(widthScale, heightScale) : Math.max(widthScale, heightScale);
    return scale >= UPSCALE_THRESHOLD;
  }

  function restoreSource(item) {
    if (!item || !item.source) return;
    item.source.style.removeProperty("position");
    item.source.style.removeProperty("inset");
    item.source.style.removeProperty("opacity");
    item.source.style.removeProperty("pointer-events");
    delete item.source.dataset.qualitySource;
  }

  function dispose(removeCanvas) {
    var item = active;
    if (!item) return;
    active = null;
    if (item.frame) cancelAnimationFrame(item.frame);
    if (item.resizeObserver) item.resizeObserver.disconnect();
    if (item.contextLost) item.canvas.removeEventListener("webglcontextlost", item.contextLost);
    if (item.gl) {
      item.gl.deleteTexture(item.texture);
      item.gl.deleteBuffer(item.buffer);
      item.gl.deleteProgram(item.program);
      var loseContext = item.gl.getExtension("WEBGL_lose_context");
      if (loseContext) loseContext.loseContext();
    }
    restoreSource(item);
    if (removeCanvas !== false) item.canvas.remove();
    if (root.dataset.wallpaperQuality === "enhanced") delete root.dataset.wallpaperQuality;
  }

  function viewport(item) {
    var gl = item.gl;
    var width = item.canvas.width;
    var height = item.canvas.height;
    var sourceAspect = item.source.naturalWidth / item.source.naturalHeight;
    var targetAspect = width / height;
    var fit = fitFor(item.source);
    var scaleX = 1;
    var scaleY = 1;
    var offsetX = 0;
    var offsetY = 0;
    gl.viewport(0, 0, width, height);
    if (fit === "contain") {
      if (sourceAspect > targetAspect) {
        var fittedHeight = Math.max(1, Math.round(width / sourceAspect));
        gl.viewport(0, Math.round((height - fittedHeight) / 2), width, fittedHeight);
      } else {
        var fittedWidth = Math.max(1, Math.round(height * sourceAspect));
        gl.viewport(Math.round((width - fittedWidth) / 2), 0, fittedWidth, height);
      }
    } else if (fit === "cover") {
      if (sourceAspect > targetAspect) {
        scaleX = targetAspect / sourceAspect;
        offsetX = (1 - scaleX) / 2;
      } else {
        scaleY = sourceAspect / targetAspect;
        offsetY = (1 - scaleY) / 2;
      }
    }
    gl.uniform2f(item.scale, scaleX, scaleY);
    gl.uniform2f(item.offset, offsetX, offsetY);
  }

  function resize(item) {
    if (!item || item !== active) return false;
    var bounds = layer.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return false;
    var previewSource = item.source.classList.contains("wallpaper-preview-source");
    var animatedPreview = item.source.classList.contains("wallpaper-discover-animated-source");
    var highDpiSource = previewSource || animatedPreview;
    var animated = root.dataset.wallpaperPlayback === "playing" && !previewSource;
    var maxPixels = animated ? 3686400 : 8294400;
    var ratio = Math.min(window.devicePixelRatio || 1, 2);
    if (highDpiSource) {
      ratio = Math.max(ratio, Math.min(2, Math.max(1920 / bounds.width, 1080 / bounds.height)));
    }
    ratio = Math.min(ratio, Math.sqrt(maxPixels / (bounds.width * bounds.height)));
    ratio = Math.max(0.65, ratio);
    var width = Math.max(1, Math.round(bounds.width * ratio));
    var height = Math.max(1, Math.round(bounds.height * ratio));
    if (item.canvas.width === width && item.canvas.height === height) return false;
    item.canvas.width = width;
    item.canvas.height = height;
    item.dirty = true;
    return true;
  }

  function render(item) {
    if (!item || item !== active || !item.source.isConnected) return dispose();
    var gl = item.gl;
    try {
      resize(item);
      gl.clearColor(0, 0, 0, 0);
      gl.viewport(0, 0, item.canvas.width, item.canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      viewport(item);
      gl.bindTexture(gl.TEXTURE_2D, item.texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, item.source);
      if (gl.getError() !== gl.NO_ERROR) throw new Error("Wallpaper texture upload failed");
      gl.uniform2f(item.texel, 1 / item.source.naturalWidth, 1 / item.source.naturalHeight);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      item.dirty = false;
      if (!item.ready) {
        item.ready = true;
        item.canvas.style.visibility = "visible";
        item.source.style.opacity = "0";
        root.dataset.wallpaperQuality = "enhanced";
      }
    } catch (error) {
      dispose();
    }
  }

  function schedule(item) {
    if (!item || item !== active || item.frame) return;
    item.frame = requestAnimationFrame(function tick(time) {
      item.frame = 0;
      if (!enhancementEnabled()) return dispose();
      if (item !== active || !item.source.isConnected) return dispose();
      var playback = root.dataset.wallpaperPlayback || "loading";
      if (!document.hidden && playback !== "paused" && playback !== "error" && playback !== "idle") {
        if (item.dirty || playback !== "playing" || !item.lastFrame || time - item.lastFrame >= 33) {
          item.lastFrame = time;
          render(item);
        }
      }
      var staticPreview = item.source.classList.contains("wallpaper-preview-source");
      if ((playback === "playing" || playback === "loading") && (!staticPreview || item.dirty)) schedule(item);
    });
  }

  function enhance(image) {
    if (!needsEnhancement(image)) {
      if (active && active.source === image) dispose();
      return;
    }
    if (active && active.source === image) {
      resize(active);
      active.dirty = true;
      schedule(active);
      return;
    }
    dispose();
    var canvas = document.createElement("canvas");
    canvas.className = "wallpaper-media-asset wallpaper-quality-canvas";
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;visibility:hidden";
    var gl = canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: false });
    var linked = gl && program(gl);
    if (!gl || !linked) return;
    var buffer = gl.createBuffer();
    var texture = gl.createTexture();
    gl.useProgram(linked);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var position = gl.getAttribLocation(linked, "p");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    var item = {
      source: image,
      canvas: canvas,
      gl: gl,
      program: linked,
      buffer: buffer,
      texture: texture,
      texel: gl.getUniformLocation(linked, "texel"),
      scale: gl.getUniformLocation(linked, "scale"),
      offset: gl.getUniformLocation(linked, "offset"),
      frame: 0,
      lastFrame: 0,
      dirty: true,
      ready: false,
      resizeObserver: null,
      contextLost: null
    };
    image.dataset.qualitySource = "true";
    image.style.position = "absolute";
    image.style.inset = "0";
    image.style.pointerEvents = "none";
    layer.appendChild(canvas);
    active = item;
    item.contextLost = function (event) {
      event.preventDefault();
      dispose();
    };
    canvas.addEventListener("webglcontextlost", item.contextLost, false);
    if (window.ResizeObserver) {
      item.resizeObserver = new ResizeObserver(function () {
        resize(item);
        schedule(item);
      });
      item.resizeObserver.observe(layer);
    }
    resize(item);
    schedule(item);
  }

  function inspect() {
    if (!enhancementEnabled()) return dispose();
    var image = layer.querySelector("img.wallpaper-media-asset:not(.wallpaper-quality-canvas):not(.wallpaper-animated-image-source)");
    if (!image) return dispose();
    if (image.complete && image.naturalWidth) return enhance(image);
    if (waiting.has(image)) return;
    waiting.add(image);
    image.addEventListener("load", function () {
      waiting.delete(image);
      enhance(image);
    }, { once: true });
    image.addEventListener("error", function () { waiting.delete(image); }, { once: true });
  }

  var layerObserver = new MutationObserver(function (records) {
    if (records.some(function (record) { return record.type === "childList" || record.target.tagName === "IMG"; })) inspect();
  });
  layerObserver.observe(layer, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "src"] });

  var playbackObserver = new MutationObserver(function () {
    if (active) {
      resize(active);
      active.dirty = true;
      schedule(active);
    } else {
      inspect();
    }
  });
  playbackObserver.observe(root, { attributes: true, attributeFilter: ["data-wallpaper-media", "data-wallpaper-playback", "data-performance-mode"] });

  window.addEventListener("resize", function () { inspect(); }, { passive: true });
  document.addEventListener("visibilitychange", function () { if (active) schedule(active); });
  window.addEventListener("neo-performance-mode-change", inspect);
  window.NeoWallpaperQuality = {
    refresh: inspect,
    getState: function () {
      return active ? { enhanced: active.ready, sourceWidth: active.source.naturalWidth, sourceHeight: active.source.naturalHeight, outputWidth: active.canvas.width, outputHeight: active.canvas.height } : { enhanced: false };
    }
  };
  inspect();
})();
