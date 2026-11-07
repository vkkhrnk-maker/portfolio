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
})();
