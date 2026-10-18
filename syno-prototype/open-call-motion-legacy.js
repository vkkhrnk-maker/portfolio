/* Preserved 11 September 2026: previous local pigment hover for comparison. */
window.createLegacyOpenCallMotion = function (stage) {
  const slide = stage.querySelector('.hero-slide.is-call');
  const canvas = slide && slide.querySelector('.open-call-motion-canvas');
  const fallback = slide && slide.querySelector('.call-art-img');
  if (!slide || !canvas || !fallback) return { sync() {}, stop() {} };

  const ctx = canvas.getContext('2d');
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const image = new Image();
  const sourceCanvas = document.createElement('canvas');
  const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  const BG = '#1c1c1c';
  const ASSEMBLE_MS = 3000;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  let particles = [];
  let raf = 0;
  let hoverRaf = 0;
  let startedAt = 0;
  let prepared = false;
  let active = false;
  let running = false;
  let hasPlayed = false;
  let inViewport = true;
  let hoverAmount = 0;
  let hoverTarget = 0;
  let hoverLastAt = 0;
  let pointerX = -1;
  let pointerY = -1;

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const easeInOut = value => value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
  const easeOut = value => 1 - Math.pow(1 - value, 3);
  const smoothstep = value => value * value * (3 - 2 * value);

  function seededNoise(index, salt) {
    const x = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  function motionProgress(elapsed) {
    if (elapsed < ASSEMBLE_MS) {
      const time = clamp(elapsed / ASSEMBLE_MS);
      // Линейная примесь убирает ощущение паузы у cubic ease: частицы
      // начинают заметно двигаться уже в первом кадре, но мягко тормозят.
      return 1 - (time * 0.35 + easeInOut(time) * 0.65);
    }
    return 0;
  }

  function resizeCanvas() {
    const rect = slide.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    if (prepared) draw(running ? motionProgress(performance.now() - startedAt) : 0);
  }

  function buildParticles(pixels) {
    const { width, height, data } = pixels;
    const candidates = [];
    const step = 5;
    for (let y = 0; y < height; y += step) {
      for (let x = Math.floor(width * 0.07); x < width; x += step) {
        const i = (y * width + x) * 4;
        if (data[i + 3] < 76) continue;
        const luma = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        if (luma < 48 && data[i + 2] - data[i] < 18) continue;
        const leftAlpha = data[(y * width + Math.max(0, x - step)) * 4 + 3];
        const rightAlpha = data[(y * width + Math.min(width - 1, x + step)) * 4 + 3];
        const topAlpha = data[(Math.max(0, y - step) * width + x) * 4 + 3];
        const bottomAlpha = data[(Math.min(height - 1, y + step) * width + x) * 4 + 3];
        const gradientX = rightAlpha - leftAlpha;
        const gradientY = bottomAlpha - topAlpha;
        const edgeStrength = Math.hypot(gradientX, gradientY);
        const flowAngle = edgeStrength > 18
          ? Math.atan2(gradientY, gradientX) + Math.PI / 2
          : Math.PI / 2
            + Math.sin(x * 0.018 + y * 0.012) * 0.58
            + (seededNoise(candidates.length, 18) - 0.5) * 0.24;
        candidates.push({ x, y, r: data[i], g: data[i + 1], b: data[i + 2], flowAngle });
      }
    }
    const limit = window.innerWidth < 700 ? 4200 : 7200;
    const stride = Math.max(1, Math.ceil(candidates.length / limit));
    particles = candidates.filter((_, index) => index % stride === 0).map((p, index) => {
      const horizontal = clamp((p.x / width - 0.07) / 0.93);
      const material = seededNoise(index, 17);
      let startNX = 0.03 + seededNoise(index, 7) * 0.94;
      let startNY = 0.04 + seededNoise(index, 8) * 0.92;
      // Верхний левый сектор остаётся спокойнее под живым title и CTA,
      // но небольшая часть пигмента всё равно проходит за ними.
      if (startNX < 0.72 && startNY < 0.44 && seededNoise(index, 9) < 0.72) {
        if (seededNoise(index, 10) > 0.5) startNX = 0.74 + seededNoise(index, 11) * 0.23;
        else startNY = 0.48 + seededNoise(index, 12) * 0.48;
      }
      return {
        ...p,
        size: 2.8 + seededNoise(index, 1) * 5.2,
        aspect: 0.68 + seededNoise(index, 13) * 0.5,
        alpha: 0.58 + seededNoise(index, 14) * 0.3,
        delay: horizontal * 0.18 + seededNoise(index, 2) * 0.08,
        startNX,
        startNY,
        curveNX: (seededNoise(index, 3) - 0.5) * 0.13,
        curveNY: (seededNoise(index, 4) - 0.5) * 0.18,
        hoverAngle: seededNoise(index, 15) * Math.PI * 2,
        stroke: material < 0.42,
        fragment: material >= 0.9,
        strokeLength: 1.25 + seededNoise(index, 19) * 0.8,
        strokeWidth: 0.92 + seededNoise(index, 20) * 0.34,
        startAngle: seededNoise(index, 21) * Math.PI * 2,
        targetAngle: p.flowAngle + (seededNoise(index, 22) - 0.5) * 0.32,
        spin: (seededNoise(index, 23) - 0.5) * 0.9,
        bend: (seededNoise(index, 24) - 0.5) * 0.24,
        hoverSpin: (seededNoise(index, 25) - 0.5) * 0.7
      };
    });
  }

  function paintMark(p, x, y, size, angle, color, alpha) {
    ctx.globalAlpha = alpha;
    if (p.stroke) {
      const length = Math.max(1.5, size * p.strokeLength);
      const halfX = Math.cos(angle) * length * 0.5;
      const halfY = Math.sin(angle) * length * 0.5;
      const normalX = -Math.sin(angle) * size * p.bend;
      const normalY = Math.cos(angle) * size * p.bend;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.25, size * p.strokeWidth);
      ctx.beginPath();
      ctx.moveTo(x - halfX, y - halfY);
      ctx.quadraticCurveTo(x + normalX, y + normalY, x + halfX, y + halfY);
      ctx.stroke();
    } else if (p.fragment) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x - size, y + size * 0.22);
      ctx.lineTo(x - size * 0.14, y - size);
      ctx.lineTo(x + size, y - size * 0.16);
      ctx.lineTo(x + size * 0.26, y + size * 0.72);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.72, size * 0.52), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* The approved raster remains the pristine resting artwork. Canvas is a
     transparent, local paint-displacement layer: it only covers and redraws
     marks inside the cursor field, so the full composition never becomes a
     pointillist reconstruction after load. */
  function draw(_progress = 0, dispersion = hoverAmount) {
    if (!prepared || !canvas.width) return;
    const cw = canvas.width;
    const ch = canvas.height;
    const sw = sourceCanvas.width;
    const sh = sourceCanvas.height;
    const scale = Math.min(cw / sw, ch / sh);
    const offsetX = (cw - sw * scale) / 2;
    const offsetY = (ch - sh * scale) / 2;

    ctx.clearRect(0, 0, cw, ch);
    if (dispersion <= 0.002 || pointerX < 0 || pointerY < 0) return;

    const radius = Math.min(cw, ch) * 0.1;
    const affected = [];
    for (let index = 0; index < particles.length; index++) {
      const p = particles[index];
      const targetX = offsetX + p.x * scale;
      const targetY = offsetY + p.y * scale;
      const dx = targetX - pointerX;
      const dy = targetY - pointerY;
      const distance = Math.hypot(dx, dy);
      if (distance >= radius) continue;

      const influence = Math.pow(1 - distance / radius, 1.65) * dispersion;
      if (influence <= 0.01) continue;
      const fallbackX = Math.cos(p.hoverAngle);
      const fallbackY = Math.sin(p.hoverAngle);
      const directionX = distance > 0.5 ? dx / distance : fallbackX;
      const directionY = distance > 0.5 ? dy / distance : fallbackY;
      const push = radius * 0.16 * influence;
      const size = Math.max(0.8, p.size * scale * 0.92);
      affected.push({
        p,
        targetX,
        targetY,
        x: targetX + directionX * push + fallbackX * radius * 0.018 * influence,
        y: targetY + directionY * push + fallbackY * radius * 0.018 * influence,
        size,
        influence,
        angle: p.targetAngle + p.hoverSpin * influence * 0.42
      });
    }
    if (!affected.length) return;

    ctx.save();
    ctx.lineCap = 'round';
    for (const mark of affected) {
      paintMark(
        mark.p,
        mark.targetX,
        mark.targetY,
        mark.size * 1.28,
        mark.p.targetAngle,
        BG,
        clamp(mark.influence * 1.14)
      );
    }
    for (const mark of affected) {
      paintMark(
        mark.p,
        mark.x,
        mark.y,
        mark.size * (1 - mark.influence * 0.04),
        mark.angle,
        `rgb(${mark.p.r},${mark.p.g},${mark.p.b})`,
        clamp(mark.influence * 0.96)
      );
    }
    ctx.restore();
  }

  function tick(now) {
    if (!running) return;
    const elapsed = now - startedAt;
    draw(motionProgress(elapsed));
    if (elapsed < ASSEMBLE_MS) raf = requestAnimationFrame(tick);
    else {
      running = false;
      draw(0, hoverAmount);
      if (Math.abs(hoverTarget - hoverAmount) > 0.002) startHover();
    }
  }

  function hoverTick(now) {
    if (running || !prepared || !active || motionPreference.matches || !finePointer.matches) {
      hoverRaf = 0;
      return;
    }
    if (!hoverLastAt) hoverLastAt = now;
    const delta = Math.min(48, now - hoverLastAt);
    hoverLastAt = now;
    const response = hoverTarget > hoverAmount ? 190 : 270;
    hoverAmount += (hoverTarget - hoverAmount) * (1 - Math.exp(-delta / response));
    if (Math.abs(hoverTarget - hoverAmount) < 0.002) hoverAmount = hoverTarget;
    draw(0, hoverAmount);
    if (hoverAmount !== hoverTarget) hoverRaf = requestAnimationFrame(hoverTick);
    else hoverRaf = 0;
  }

  function startHover() {
    if (running || hoverRaf || !prepared || !active || motionPreference.matches || !finePointer.matches) return;
    hoverLastAt = 0;
    hoverRaf = requestAnimationFrame(hoverTick);
  }

  function play() {
    cancelAnimationFrame(raf);
    if (!prepared) return;
    resizeCanvas();
    if (motionPreference.matches) {
      running = false;
      hoverTarget = 0;
      hoverAmount = 0;
      canvas.classList.remove('is-ready');
      return;
    }
    // Входной сборки больше нет: читаемый финальный кадр доступен сразу,
    // а движение возникает только как прерываемая реакция на курсор.
    hasPlayed = true;
    running = false;
    draw(0, hoverAmount);
    canvas.classList.add('is-ready');
    if (hoverAmount !== hoverTarget) startHover();
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    cancelAnimationFrame(hoverRaf);
    hoverRaf = 0;
    hoverTarget = 0;
    hoverAmount = 0;
    hoverLastAt = 0;
    pointerX = -1;
    pointerY = -1;
    if (prepared) draw(0, 0);
  }

  function sync() {
    const shouldBeActive = inViewport && !document.hidden
      && document.body.classList.contains('call-open')
      && document.body.classList.contains('callart-motion')
      && slide.classList.contains('is-active');
    if (shouldBeActive === active) {
      if (shouldBeActive && motionPreference.matches && prepared) draw(0);
      return;
    }
    active = shouldBeActive;
    if (active) play(); else stop();
  }

  function prepareArtwork() {
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    sourceCanvas.width = width;
    sourceCanvas.height = height;
    sourceCtx.drawImage(image, 0, 0);
    const pixels = sourceCtx.getImageData(0, 0, width, height);
    const data = pixels.data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const cobalt = b - (r + g) * 0.5;
      const lightSignal = clamp((luma - 31) / 72);
      const blueSignal = clamp((cobalt - 5) / 46);
      data[i + 3] = Math.round(data[i + 3] * smoothstep(Math.max(lightSignal, blueSignal)));
    }
    buildParticles(pixels);
    prepared = true;
    resizeCanvas();
    if (active) play();
    else {
      draw(0);
      canvas.classList.add('is-ready');
    }
  }

  window.addEventListener('resize', resizeCanvas, { passive: true });
  new ResizeObserver(resizeCanvas).observe(slide);
  function updateHoverPosition(event) {
    if (!finePointer.matches || motionPreference.matches) return;
    const rect = canvas.getBoundingClientRect();
    pointerX = (event.clientX - rect.left) / rect.width * canvas.width;
    pointerY = (event.clientY - rect.top) / rect.height * canvas.height;
    hoverTarget = 1;
    if (hasPlayed && !running) startHover();
  }
  function clearHoverPosition() {
    hoverTarget = 0;
    if (hasPlayed && !running) startHover();
  }
  slide.addEventListener('pointermove', updateHoverPosition);
  slide.addEventListener('pointerleave', clearHoverPosition);
  motionPreference.addEventListener('change', () => active ? play() : stop());
  new IntersectionObserver(entries => {
    inViewport = entries[0].isIntersecting;
    sync();
  }, { threshold: 0.2 }).observe(slide);
  image.addEventListener('load', prepareArtwork);
  image.addEventListener('error', () => canvas.classList.remove('is-ready'));
  function syncArtworkSource() {
    const nextSource = fallback.currentSrc || fallback.src;
    if (!nextSource || image.src === nextSource) return;
    cancelAnimationFrame(raf);
    cancelAnimationFrame(hoverRaf);
    running = false;
    prepared = false;
    canvas.classList.remove('is-ready');
    image.src = nextSource;
  }
  fallback.addEventListener('load', syncArtworkSource);
  syncArtworkSource();

  return { sync, stop };
};
