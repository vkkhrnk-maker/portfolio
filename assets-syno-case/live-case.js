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

/* Оглавление в левой колонке: подсвечивает главу, которая сейчас на экране. */
(() => {
  const links = [...document.querySelectorAll('.syno-toc a')];
  if (!links.length || !('IntersectionObserver' in window)) return;
  const byId = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
  const mark = id => links.forEach(a => {
    if (a === byId.get(id)) a.setAttribute('aria-current', 'true');
    else a.removeAttribute('aria-current');
  });
  const seen = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) mark(entry.target.id); });
  }, { rootMargin: '-25% 0px -70% 0px' });
  byId.forEach((a, id) => { const el = document.getElementById(id); if (el) seen.observe(el); });
})();

/* Десктопный кадр на телефоне открывается повёрнутым: метка ставится до того, как общий скрипт покажет увеличение. */
document.addEventListener('click', event => {
  const film = event.target.closest && event.target.closest('.syno-walkthrough-video, .syno-phone-still');
  if (!film) return;
  document.documentElement.classList.toggle('syno-zoom-wide', !!film.closest('.syno-flow-film'));
}, true);
