// A small portrait rig, not a generated video or a full 3D character.
// Only the raised arm enters WebGL. The face stays in the original <img>.
const WIDTH = 887;
const HEIGHT = 1774;
const DURATION = 2700;
const asset = name => new URL(`assets/${name}`, import.meta.url).href;
const maskURL = asset('viktoria-profile-mask-v13.svg');
const stillMaskURL = asset('viktoria-profile-wave-body-mask-v15.svg');

const vertexSource = `
  attribute vec2 position;
  uniform vec2 pose;
  uniform vec2 fit;
  varying vec2 uv;
  vec2 rotateAt(vec2 p, vec2 pivot, float angle) {
    float c = cos(angle), s = sin(angle);
    vec2 d = p - pivot;
    return pivot + vec2(c * d.x - s * d.y, s * d.x + c * d.y);
  }
  void main() {
    vec2 p = position;
    uv = p / vec2(887.0, 1774.0);
    float hand = (1.0 - smoothstep(398.0, 440.0, p.y)) *
                (1.0 - smoothstep(245.0, 285.0, p.x));
    float arm = max(hand, (1.0 - smoothstep(480.0, 635.0, p.y)) *
                         (1.0 - smoothstep(195.0, 265.0, p.x)));
    p = mix(p, rotateAt(p, vec2(153.0, 411.0), pose.y), hand);
    p = mix(p, rotateAt(p, vec2(147.0, 596.0), pose.x), arm);
    vec2 clip = p / vec2(887.0, 1774.0) * 2.0 - 1.0;
    gl_Position = vec4(clip.x * fit.x, -clip.y * fit.y, 0.0, 1.0);
  }
`;
const fragmentSource = `
  precision mediump float;
  uniform sampler2D portrait;
  uniform sampler2D silhouette;
  varying vec2 uv;
  void main() {
    // A one-pixel overlap prevents a seam at the stationary jacket join.
    if (uv.x > 286.0 / 887.0 || uv.y > 641.0 / 1774.0) discard;
    vec2 armUV = uv * vec2(887.0 / 512.0, 1774.0 / 1024.0);
    vec4 color = texture2D(portrait, armUV);
    float alpha = texture2D(silhouette, armUV).a;
    gl_FragColor = vec4(color.rgb, alpha);
  }
`;

function interpolate(ms, keys) {
  for (let i = 1; i < keys.length; i++) {
    const [end, to] = keys[i], [start, from] = keys[i - 1];
    if (ms <= end) {
      const t = Math.max(0, (ms - start) / (end - start));
      return from + (to - from) * (1 - Math.cos(Math.PI * t)) / 2;
    }
  }
  return keys[keys.length - 1][1];
}

export function wavePose(ms) {
  const arm = interpolate(ms, [[0,0],[180,0],[580,-3],[990,2.5],
    [1400,-2.6],[1810,1.8],[2180,-0.6],[2700,0]]);
  const hand = interpolate(ms, [[0,0],[250,0],[660,-8],[1070,9],
    [1480,-7.5],[1890,6],[2250,-2],[2700,0]]);
  return [arm * Math.PI / 180, hand * Math.PI / 180];
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

function createRenderer(canvas, image, mask) {
  const gl = canvas.getContext('webgl', {
    alpha: true, premultipliedAlpha: false, antialias: true,
    depth: false, stencil: false, powerPreference: 'low-power'
  });
  if (!gl) throw new Error('WebGL unavailable');
  const shaders = [];
  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader));
    }
    shaders.push(shader);
    return shader;
  };
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
  }
  gl.useProgram(program);

  // The grid covers only the arm region, with a stationary strip at its join.
  const columns = 48, rows = 107, positions = [], indices = [];
  for (let y = 0; y <= rows; y++) {
    for (let x = 0; x <= columns; x++) positions.push(x * 288 / columns, y * 642 / rows);
  }
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      const a = y * (columns + 1) + x, b = a + columns + 1;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const vertices = gl.createBuffer(), elements = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elements);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

  const textures = [image, mask].map((source, unit) => {
    // Keep native arm pixels in a power-of-two texture. Mipmaps prevent
    // shimmering leather/hair details when the hero is small on a phone.
    // Nothing from the face region is copied into the animation texture.
    const arm = document.createElement('canvas');
    arm.width = 512;
    arm.height = 1024;
    arm.getContext('2d').drawImage(source, 0, 0, 320, 672, 0, 0, 320, 672);
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, arm);
    gl.generateMipmap(gl.TEXTURE_2D);
    return texture;
  });
  gl.uniform1i(gl.getUniformLocation(program, 'portrait'), 0);
  gl.uniform1i(gl.getUniformLocation(program, 'silhouette'), 1);
  const pose = gl.getUniformLocation(program, 'pose');
  const fit = gl.getUniformLocation(program, 'fit');
  return {
    draw(ms, box) {
      const scale = Math.min(devicePixelRatio || 1, 3);
      const width = Math.max(1, Math.round(box.width * scale));
      const height = Math.max(1, Math.round(box.height * scale));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      const contain = Math.min(box.width / WIDTH, box.height / HEIGHT);
      gl.uniform2f(fit, WIDTH * contain / box.width, HEIGHT * contain / box.height);
      gl.uniform2fv(pose, wavePose(ms));
      gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    },
    dispose() {
      textures.forEach(texture => gl.deleteTexture(texture));
      gl.deleteBuffer(vertices);
      gl.deleteBuffer(elements);
      shaders.forEach(shader => gl.deleteShader(shader));
      gl.deleteProgram(program);
    }
  };
}

export function attachPortraitWave(host, {autoplay = true} = {}) {
  const image = host.querySelector('.profile-character__figure');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = document.createElement('canvas');
  canvas.className = 'profile-character__wave';
  canvas.setAttribute('aria-hidden', 'true');
  host.append(canvas);
  const originalMask = image.style.maskImage;
  let renderer, rendererSource, preparing, frame, played = false, visible = false;
  let disposed = false, generation = 0, progress = 0;
  let box = host.getBoundingClientRect();

  function stop() {
    generation++;
    cancelAnimationFrame(frame);
    frame = null;
    host.classList.remove('is-waving');
    image.style.maskImage = originalMask;
    image.style.webkitMaskImage = originalMask;
  }
  async function prepare() {
    if (renderer && rendererSource === image.currentSrc) return;
    if (!preparing) preparing = (async () => {
      if (!image.complete || !image.naturalWidth) await image.decode();
      const source = image.currentSrc;
      const [texture, mask] = await Promise.all([
        loadImage(source), loadImage(maskURL), loadImage(stillMaskURL)
      ]);
      if (disposed || source !== image.currentSrc) return;
      if (renderer) renderer.dispose();
      renderer = createRenderer(canvas, texture, mask);
      rendererSource = source;
    })().finally(() => { preparing = null; });
    await preparing;
  }
  function draw(ms) {
    if (!renderer || !box.width || !box.height) return;
    progress = ms;
    renderer.draw(ms, box);
    if (!host.classList.contains('is-waving')) {
      image.style.maskImage = `url("${stillMaskURL}")`;
      image.style.webkitMaskImage = `url("${stillMaskURL}")`;
      host.classList.add('is-waving');
    }
  }
  async function play() {
    if (disposed || reduce.matches || document.hidden || frame) return false;
    const request = ++generation;
    try {
      await prepare();
      if (!renderer || request !== generation || disposed || reduce.matches || document.hidden) return false;
      box = host.getBoundingClientRect();
      if (!box.width || !box.height || getComputedStyle(host).visibility === 'hidden') return false;
      played = true;
      const start = performance.now();
      const tick = now => {
        if (now - start >= DURATION) { stop(); return; }
        draw(now - start);
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      return true;
    } catch (_) {
      stop(); // The approved static portrait is the complete fallback.
      return false;
    }
  }
  async function seek(ms) {
    stop();
    if (disposed || reduce.matches) return;
    const request = generation;
    await prepare();
    if (disposed || request !== generation || reduce.matches) return;
    box = host.getBoundingClientRect();
    draw(Math.max(0, Math.min(DURATION, ms)));
  }
  const maybePlay = () => {
    if (autoplay && visible && !played && !navigator.connection?.saveData) play();
  };
  const intersection = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) maybePlay(); else stop();
  }, {threshold: 0.6});
  intersection.observe(host);
  const resize = new ResizeObserver(() => {
    box = host.getBoundingClientRect();
    if (host.classList.contains('is-waving')) draw(progress);
    maybePlay();
  });
  resize.observe(host);
  const onVisibility = () => { if (document.hidden) stop(); else maybePlay(); };
  const onReduce = () => { if (reduce.matches) stop(); else maybePlay(); };
  const onImageLoad = () => { if (rendererSource !== image.currentSrc) stop(); maybePlay(); };
  const onContextLost = event => { event.preventDefault(); stop(); renderer = null; };
  document.addEventListener('visibilitychange', onVisibility);
  reduce.addEventListener('change', onReduce);
  image.addEventListener('load', onImageLoad);
  canvas.addEventListener('webglcontextlost', onContextLost);
  return {
    play, seek, stop,
    dispose() {
      disposed = true;
      stop();
      intersection.disconnect();
      resize.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      reduce.removeEventListener('change', onReduce);
      image.removeEventListener('load', onImageLoad);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      if (renderer) renderer.dispose();
      canvas.remove();
    }
  };
}

if (typeof document !== 'undefined') {
  document.querySelectorAll('[data-portrait-wave]').forEach(host => attachPortraitWave(host));
}
