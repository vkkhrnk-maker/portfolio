/* The case embeds the actual prototype; scrolling never translates a screenshot
   of a sticky layout. All documents are served from the same local bundle. */
(() => {
  'use strict';
  /* Labels this script writes, in the page's language (the English case used to
     announce «Пауза» and «Остановить видео»). */
  const ru = (document.documentElement.lang || '').toLowerCase().startsWith('ru');
  const L = ru
    ? { play:'Воспроизвести видео', stop:'Остановить видео',
        pause:'Пауза', auto:'Автоскролл', stopAuto:'Остановить автоскролл: ', startAuto:'Включить автоскролл: ' }
    : { play:'Play the video', stop:'Pause the video',
        pause:'Pause', auto:'Auto-scroll', stopAuto:'Stop auto-scroll: ', startAuto:'Start auto-scroll: ' };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  /* Постеры ниже первого экрана ждут в data-poster: их около тридцати, и они
     тормозили открытие страницы. Когда ролик не играет, в кадре стоит результат
     сценария из data-still, а не его начало. */
  const paint = video => {
    const src = (reduced.matches && video.dataset.still) || video.dataset.poster;
    if (src) video.poster = src;
    video.removeAttribute('data-poster');
  };
  const reached = new Set();
  const fill = box => box.querySelectorAll('video[data-poster]').forEach(video => {
    if (video.getClientRects().length) paint(video);
  });
  const nearby = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    reached.add(entry.target);
    fill(entry.target);
    nearby.unobserve(entry.target);
  }), {rootMargin:'1600px 0px'});
  document.querySelectorAll('.case__figure').forEach(box => nearby.observe(box));
  /* Десктопная и телефонная копии ролика меняются на границе 640. */
  matchMedia('(max-width:640px)').addEventListener('change', () => reached.forEach(fill));
  document.querySelectorAll('[data-syno-video]').forEach(video => {
    let visible=false, userPaused=false;
    video.muted=true;
    function sync() {
      if (!visible || document.hidden || reduced.matches) video.pause();
      else if (!userPaused) video.play().catch(error=>{
        // Экономия заряда запрещает автозапуск, не включая уменьшение движения.
        if (error.name==='NotAllowedError' && video.dataset.still) video.poster=video.dataset.still;
      });
    }
    // The cover plays without native controls; one quiet toggle keeps it stoppable.
    const toggle=video.parentElement.querySelector('[data-syno-video-toggle]');
    if (toggle) {
      const label=()=>{
        toggle.setAttribute('aria-pressed',String(video.paused));
        toggle.setAttribute('aria-label',video.paused?L.play:L.stop);
      };
      toggle.addEventListener('click',()=>{
        userPaused=!video.paused;
        if (video.paused) video.play().catch(()=>{});
        else video.pause();
      });
      video.addEventListener('play',label);
      video.addEventListener('pause',label);
      label();
    }
    new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{threshold:.15}).observe(video);
    document.addEventListener('visibilitychange',sync);
    reduced.addEventListener('change',sync);
  });
  function motion(demo, viewport, title, getTarget, initialDelay = 1600) {
    const button = demo.querySelector('.syno-scroll-controls button');
    if (!button) return {refresh() {}};
    let playing = !reduced.matches, visible = false, frame = 0, last = 0;
    let direction = 1, hold = performance.now() + initialDelay;
    const label = () => {
      button.textContent = playing ? L.pause : L.auto;
      button.setAttribute('aria-label', (playing ? L.stopAuto : L.startAuto) + title);
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
