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
  /* Доска дизайн-системы. Один объект несёт одно действие: Save у вещи, Follow у источника.
     Всё пишет в одни Favourites, как в кабинете. Тексты внутри остаются английскими: это интерфейс. */
  const kit = document.querySelector('[data-syno-kit]');
  if (kit) {
    const all = selector => [...kit.querySelectorAll(selector)];
    const ITEMS = [
      {id:'limassol', kind:'events', title:'Limassol Art Walk 2026', sub:'17–18 Oct · Old Town', city:'Limassol'},
      {id:'shared', kind:'events', title:'Shared Rooms', sub:'16 Oct – 8 Nov · Linea Project Room', city:'Nicosia'},
      {id:'threshold', kind:'events', title:'Threshold — duo show', sub:'17 Oct – 6 Nov · Thkio Ppalies', city:'Nicosia', status:'Cancelled'},
      {id:'winter', kind:'events', title:'Winter Light', sub:'No longer on SYNO', gone:true},
      {id:'voices', kind:'events', title:'Voices in the Walls — performance', sub:'16 Oct · 20:00 · Old Powerhouse', city:'Nicosia'},
      {id:'work2', kind:'works', title:'Spring Landscape', plain:'Mira Soleni · 2024'},
      {id:'work3', kind:'works', title:'Lowland', plain:'Mira Soleni · 2025'},
      {id:'morning', kind:'works', title:'Morning by the Sea', plain:'Mira Soleni · 2026'},
      {id:'leon', kind:'artists', title:'Leon Arven', plain:'b. 1979, Nicosia · based in Limassol', city:'Painting · 1 work', follow:true},
      {id:'iris', kind:'artists', title:'Iris Varen', plain:'b. 1993, Larnaca · based in Nicosia', city:'Installation · 2 works', follow:true},
      {id:'mira', kind:'artists', title:'Mira Soleni', plain:'Painting · 6 works', follow:true},
      {id:'thkio', kind:'places', title:'Thkio Ppalies', sub:'Independent space', city:'Nicosia', follow:true},
      {id:'nimac', kind:'places', title:'NiMAC', sub:'Art centre', city:'Nicosia', follow:true}
    ];
    const item = id => ITEMS.find(entry => entry.id === id);
    const state = {on:['limassol','threshold','winter','shared','work2','work3','leon','iris','thkio'], tab:'events', fresh:''};
    const EMPTY = {events:'No events saved yet', works:'No works saved yet', artists:'Not following any artists yet', places:'Not following any places yet'};
    /* Пустой таб, как в кабинете: плитка с иконкой по действию и строка по центру. */
    const ICON_SAVE = '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 21.35-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';
    const ICON_FOLLOW = '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
    const base = kit.dataset.base;
    const shelf = kit.querySelector('[data-kit-shelf]');
    const railBar = kit.querySelector('[data-kit-rail]');
    const railThumb = railBar.firstElementChild;
    const empty = kit.querySelector('[data-kit-empty]');
    const toast = kit.querySelector('[data-kit-toast]');
    let toastTimer = 0, touched = false;
    function mini(entry) {
      const card = document.createElement('div');
      card.className = `syno-kit__mini${entry.id === state.fresh ? ' is-new' : ''}${/works|artists/.test(entry.kind) ? ' is-flat' : ''}${entry.gone ? ' is-gone' : ''}`;
      const action = entry.follow
        ? `<button class="syno-kit__chip" type="button" data-kit-toggle="${entry.id}" aria-label="Unfollow ${entry.title}">Following</button>`
        : `<button class="syno-kit__heart is-small" type="button" data-kit-toggle="${entry.id}" aria-pressed="true" aria-label="Remove ${entry.title} from Favourites"><svg class="is-on" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 21.35-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></button>`;
      const badge = entry.status ? `<span class="syno-kit__badge">${entry.status}</span>` : '';
      card.innerHTML = `<div class="syno-kit__mini-media"><img src="${base}${entry.gone ? 'gone' : entry.id}.jpg" alt="" width="300" height="200" loading="lazy">${badge}${action}</div><p class="syno-kit__mini-title">${entry.title}</p>${entry.sub ? `<p class="syno-kit__mini-sub">${entry.sub}</p>` : ''}${entry.plain ? `<p class="syno-kit__mini-plain">${entry.plain}</p>` : ''}${entry.city ? `<p class="syno-kit__mini-city">${entry.city}</p>` : ''}`;
      return card;
    }
    /* Полоса под рядом только там, где есть что листать. */
    function rail() {
      const max = shelf.scrollWidth - shelf.clientWidth;
      railBar.hidden = shelf.hidden || max <= 0;
      if (railBar.hidden) return;
      const width = shelf.clientWidth / shelf.scrollWidth;
      railThumb.style.width = `${width * 100}%`;
      railThumb.style.marginLeft = `${(shelf.scrollLeft / max) * (1 - width) * 100}%`;
    }
    function draw() {
      const saved = state.on.map(item);
      const shown = saved.filter(entry => entry.kind === state.tab);
      all('[data-kit-tab]').forEach(tab => {
        const on = tab.dataset.kitTab === state.tab;
        tab.textContent = `${tab.dataset.name} · ${saved.filter(entry => entry.kind === tab.dataset.kitTab).length}`;
        tab.classList.toggle('is-active', on);
        tab.setAttribute('aria-pressed', String(on));
      });
      shelf.replaceChildren(...shown.map(mini));
      shelf.hidden = !shown.length;
      empty.hidden = shown.length > 0;
      rail();
      empty.innerHTML = `<span class="syno-kit__empty-icon">${/events|works/.test(state.tab) ? ICON_SAVE : ICON_FOLLOW}</span><span>${EMPTY[state.tab]}</span>`;
      all('.syno-kit__cell--list [data-kit-toggle]').forEach(button => {
        const entry = item(button.dataset.kitToggle), on = state.on.includes(entry.id);
        button.setAttribute('aria-pressed', String(on));
        const word = button.querySelector('[data-kit-word]');
        if (word) word.textContent = on ? 'Following' : 'Follow';
      });
    }
    /* Подтверждение стоит рядом с нажатой кнопкой: связь с Favourites тихая, только счётчик. */
    function say(text, button) {
      const grid = toast.parentElement.getBoundingClientRect(), place = button.getBoundingClientRect();
      kit.querySelector('[data-kit-toast-text]').textContent = text;
      toast.style.top = `${place.bottom - grid.top + 8}px`;
      toast.style.right = `${grid.right - place.right}px`;
      toast.hidden = false;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { toast.hidden = true; }, 2800);
    }
    function toggle(id, button) {
      const entry = item(id), on = state.on.includes(id), here = entry.kind === state.tab;
      state.on = on ? state.on.filter(other => other !== id) : [id, ...state.on];
      state.fresh = !on && here ? id : '';
      if (on) toast.hidden = true;
      else say(entry.follow ? `Following ${entry.title} — in your Favourites` : 'Saved to your Favourites', button);
      draw();
      if (!on && here) { shelf.scrollLeft = 0; rail(); }
    }
    shelf.addEventListener('scroll', rail, {passive:true});
    new ResizeObserver(rail).observe(shelf);
    kit.addEventListener('pointerdown', () => { touched = true; });
    kit.addEventListener('keydown', () => { touched = true; });
    kit.addEventListener('click', e => {
      const button = e.target.closest('[data-kit-toggle]');
      if (button) toggle(button.dataset.kitToggle, button);
    });
    all('[data-kit-tab]').forEach(tab => tab.addEventListener('click', () => { state.tab = tab.dataset.kitTab; state.fresh = ''; draw(); }));
    /* Один аккаунт: контекст меняется в шапке, человек остаётся тем же. */
    function drawContext(context) {
      const place = context === 'place';
      kit.querySelector('[data-kit-chip-name]').textContent = place ? 'NiMAC' : 'Mira Soleni';
      kit.querySelector('[data-kit-chip-mark]').hidden = place;
      kit.querySelector('[data-kit-chip-place]').hidden = !place;
      all('[data-kit-context]').forEach(row => {
        const on = row.dataset.kitContext === context;
        row.classList.toggle('is-active', on);
        row.setAttribute('aria-pressed', String(on));
      });
    }
    all('[data-kit-context]').forEach(row => row.addEventListener('click', () => drawContext(row.dataset.kitContext)));
    drawContext('person');
    /* Чеклист публикации: кнопка оживает, когда закрыты все три пункта. После публикации полоса сворачивается. */
    const TASKS = {formats:['Add your medium','Medium added'], bio:['Add your statement','Statement added'], work:['Add at least one work','Work added']};
    const publish = {done:new Set(['formats']), live:false};
    const publishButton = kit.querySelector('[data-kit-pub]');
    function drawPublish() {
      const count = publish.done.size, ready = count === 3;
      kit.querySelector('[data-kit-pub-title]').textContent = publish.live ? 'You’re live' : 'Ready to publish?';
      const counter = kit.querySelector('[data-kit-pub-count]');
      counter.textContent = `${count} of 3 done`;
      counter.hidden = publish.live;
      all('[data-kit-pub-part]').forEach(part => { part.hidden = publish.live; });
      kit.querySelector('[data-kit-pub-fill]').style.width = `${count / 3 * 100}%`;
      publishButton.textContent = publish.live ? 'Unpublish' : 'Publish to the Artist Registry';
      publishButton.disabled = !publish.live && !ready;
      publishButton.classList.toggle('is-live', publish.live);
      all('[data-kit-task]').forEach(task => {
        const on = publish.done.has(task.dataset.kitTask);
        task.setAttribute('aria-pressed', String(on));
        task.querySelector('[data-kit-task-label]').textContent = TASKS[task.dataset.kitTask][on ? 1 : 0];
      });
    }
    all('[data-kit-task]').forEach(task => task.addEventListener('click', () => {
      const key = task.dataset.kitTask;
      if (publish.done.has(key)) publish.done.delete(key); else publish.done.add(key);
      drawPublish();
    }));
    publishButton.addEventListener('click', () => { publish.live = !publish.live; drawPublish(); });
    drawPublish();
    /* Блок один раз показывает себя сам: иначе при беглом просмотре он читается как снимок. */
    new IntersectionObserver((entries, observer) => {
      if (!entries[0].isIntersecting) return;
      observer.disconnect();
      if (reduced.matches) return;
      setTimeout(() => {
        if (touched) return;
        const heart = kit.querySelector('.syno-kit__cell--list [data-kit-toggle="voices"]');
        heart.classList.add('is-demo');
        setTimeout(() => { heart.classList.remove('is-demo'); if (!touched) toggle('voices', heart); }, 420);
      }, 800);
    }, {threshold:.5}).observe(kit.querySelector('.syno-kit__cell--list'));
    /* Первая попытка обрывается: так на плитке видны и ошибка, и повтор. */
    const tile = kit.querySelector('[data-kit-tile]');
    const bar = kit.querySelector('[data-kit-bar]');
    let progress = 0, tries = 0, uploadTimer = 0;
    function upload() {
      clearInterval(uploadTimer);
      const stop = tries++ ? 100 : 62;
      tile.dataset.state = 'loading';
      progress = 0;
      bar.style.width = '0';
      uploadTimer = setInterval(() => {
        progress = Math.min(stop, progress + (reduced.matches ? stop : 4));
        bar.style.width = `${progress}%`;
        if (progress < stop) return;
        clearInterval(uploadTimer);
        tile.dataset.state = stop === 100 ? 'done' : 'error';
      }, 40);
    }
    kit.querySelector('[data-kit-add]').addEventListener('click', upload);
    kit.querySelector('[data-kit-retry]').addEventListener('click', upload);
    kit.querySelector('[data-kit-remove]').addEventListener('click', () => {
      clearInterval(uploadTimer);
      tries = 0;
      tile.dataset.state = 'idle';
    });
    draw();
  }
})();
