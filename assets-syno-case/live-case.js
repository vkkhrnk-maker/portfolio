/* The case embeds the actual prototype; scrolling never translates a screenshot
   of a sticky layout. All documents are served from the same local bundle. */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function motion(demo, viewport, title, getTarget, initialDelay = 1600) {
    const button = demo.querySelector('.syno-scroll-controls button');
    if (!button) return {refresh() {}};
    let playing = !reduced.matches, visible = false, frame = 0, last = 0;
    let direction = 1, hold = performance.now() + initialDelay;
    const label = () => {
      button.textContent = playing ? 'Пауза' : 'Автоскролл';
      button.setAttribute('aria-label', (playing ? 'Остановить автоскролл: ' : 'Включить автоскролл: ') + title);
      button.setAttribute('aria-pressed', String(playing));
    };
    function tick(now) {
      if (!playing || !visible || document.hidden) { frame = 0; last = 0; return; }
      const target = getTarget();
      const dt = last ? Math.min(now - last, 80) : 0;
      last = now;
      if (target && now > hold) {
        const end = Math.max(0, target.scrollHeight - target.clientHeight);
        if (end > 0) {
          const next = Math.max(0, Math.min(end, target.scrollTop + direction * 52 * dt / 1000));
          target.scrollTop = next;
          if (next === end || next === 0) { direction *= -1; hold = now + 2400; }
        }
      }
      frame = requestAnimationFrame(tick);
    }
    function refresh() {
      cancelAnimationFrame(frame); frame = 0; last = 0;
      if (playing && visible && !document.hidden) frame = requestAnimationFrame(tick);
    }
    function pause() { playing = false; label(); refresh(); }
    function bindInput(doc) {
      doc.addEventListener('wheel', pause, {passive:true});
      doc.addEventListener('touchstart', pause, {passive:true});
      doc.addEventListener('pointerdown', pause, {passive:true});
      doc.addEventListener('keydown', e => {
        if (['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(e.key)) pause();
      });
    }
    button.addEventListener('click', () => {
      playing = !playing; hold = performance.now() + 700; label(); refresh();
    });
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (visible) hold = performance.now() + initialDelay;
      refresh();
    }, {threshold:.15}).observe(viewport);
    document.addEventListener('visibilitychange', refresh);
    reduced.addEventListener('change', e => {if (e.matches) pause();});
    label();
    return {refresh, bindInput};
  }
  // Historical Figma-only states still use a manually scrollable image.
  document.querySelectorAll('[data-scroll-demo]').forEach(demo => {
    const viewport = demo.querySelector('.syno-scroll-viewport');
    const image = viewport?.querySelector('img');
    if (!image) return;
    const player = motion(demo, viewport, image.alt, () => viewport);
    player.bindInput(viewport);
  });
  document.querySelectorAll('[data-native-prototype]').forEach(demo => {
    const viewport = demo.querySelector('.syno-native-window');
    const frame = viewport.querySelector('iframe');
    const initialWidth = Number(demo.dataset.frameWidth || 1280);
    const initialHeight = Number(demo.dataset.frameHeight || 800);
    let target = null, loaded = false;
    const player = motion(demo, viewport, frame.title, () => target, demo.dataset.home === 'true' ? 8500 : 1600);
    function resize() {
      const isHeroPhone = demo.dataset.responsive === 'true' && matchMedia('(max-width:640px)').matches;
      const w = isHeroPhone ? 375 : initialWidth;
      const h = isHeroPhone ? 600 : initialHeight;
      const scale = viewport.clientWidth / w;
      frame.style.width = w + 'px'; frame.style.height = h + 'px';
      frame.style.transform = `scale(${scale})`;
    }
    new ResizeObserver(resize).observe(viewport);
    frame.addEventListener('load', () => {
      try {
        const doc = frame.contentDocument;
        target = doc.scrollingElement;
        player.bindInput?.(doc);
        resize(); player.refresh();
      } catch (_) { target = null; }
    });
    const observer = new IntersectionObserver(entries => {
      if (!loaded && entries[0].isIntersecting) {
        loaded = true; frame.src = frame.dataset.src; observer.disconnect();
      }
    }, {rootMargin:'100px 0px'});
    observer.observe(viewport); resize();
  });
})();
