/* Hand-off between cases. The page ends on a copy
   of the next case's first screen, and reaching the very end of it opens the
   real page, which paints the same picture. The scroll stops there anyway, so
   the reader sees no change of page and just carries on.

   Both cases stay real pages: their own address, title and analytics, and
   none of the page scripts have to cope with two articles at once. Without JS,
   or if the next page cannot be fetched, nothing is added and the "Next case"
   button stays the way forward. */
(() => {
  'use strict';

  /* Reading order. The last case hands off to nothing, so the chain ends on
     Book a call instead of circling; its button still closes the loop. */
  const ORDER = ['hooh-fill', 'hooh', 'itab', 'itab-specialists'];

  const slug = location.pathname.split('/').pop().replace(/\.html$/, '');
  const index = ORDER.indexOf(slug);
  const next = index >= 0 ? ORDER[index + 1] : null;
  const previous = index > 0 ? ORDER[index - 1] : null;
  const content = document.querySelector('.content--case');
  const current = document.querySelector('.content__main > .case');
  const pager = document.querySelector('.case__pager');
  const footer = document.querySelector('.footer');
  const root = document.documentElement;

  /* Going back is a plain page change, not a hand-off: a copy above the top of
     a case would mean it no longer opens at its own top, which breaks reload,
     anchors and Safari's scroll restoring. It leads to the end of the previous
     case, where the reader left it. */
  const openPrevious = () => {
    try { sessionStorage.setItem('chain-return', '1'); } catch (e) {}
    location.href = previous + '.html';
  };

  if (previous && current) {
    const ru = (root.lang || '').toLowerCase().startsWith('ru');
    const back = document.createElement('a');
    back.className = 'case-prev';
    back.href = previous + '.html';
    back.innerHTML = '<svg class="icon-arrow" viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true"><path d="M8 14V2M3 7l5-5 5 5" stroke="currentColor" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg><span></span>';
    back.lastChild.textContent = ru ? '\u041f\u0440\u0435\u0434\u044b\u0434\u0443\u0449\u0438\u0439 \u043a\u0435\u0439\u0441' : 'Previous case';
    back.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey) return;
      event.preventDefault();
      openPrevious();
    });
    current.prepend(back);

    /* Scrolling on past the top opens it, on a mouse or trackpad only: on a
       phone that pull reloads the page. What must not count is the inertia of
       the scroll that got here, and inertia is the one input that only ever
       fades: the wheel events shrink one after another. A new push grows again,
       so it counts at once, with no pause on the top to wait out. */
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      const SETTLE = 120;   // ms after the page stops moving
      const NEW_GESTURE = 120;   // ms between wheel events that start a new one
      const NOTCH = 100;    // a mouse wheel repeats one size, it does not fade
      const PULL = 60;      // px of wheel travel past the top
      let lastMove = performance.now();
      let lastWheel = 0;
      let lastSize = 0;
      let pulled = 0;
      let onTop = window.scrollY <= 0;
      window.addEventListener('scroll', () => {
        /* Safari reports the rubber band as scrolling, above zero only counts. */
        onTop = window.scrollY <= 0;
        if (!onTop) { lastMove = performance.now(); pulled = 0; }
      }, { passive: true });
      window.addEventListener('wheel', (event) => {
        const now = performance.now();
        const size = Math.abs(event.deltaY);
        const fading = now - lastWheel < NEW_GESTURE && size <= lastSize && size < NOTCH;
        lastWheel = now;
        lastSize = size;
        /* The browser scrolls before this handler runs, so the wheel event that
           reaches the top already reads zero. onTop is what was true before it. */
        const started = onTop;
        onTop = window.scrollY <= 0;
        if (event.deltaY >= 0) { pulled = 0; return; }
        if (!started || !onTop || fading || now - lastMove < SETTLE) return;
        pulled += size;
        if (pulled >= PULL) { pulled = 0; openPrevious(); }
      }, { passive: true });
    }
  }

  /* Arrived from the case after this one: open on the end of this case. */
  const settleReturn = () => {
    if (!root.classList.contains('chain-return')) return;
    const toEnd = () => window.scrollTo({ top: root.scrollHeight, behavior: 'instant' });
    toEnd();
    root.classList.add('chain-placed');
    const cancel = () => window.removeEventListener('load', toEnd);
    window.addEventListener('load', toEnd, { once: true });
    ['wheel', 'touchstart', 'keydown'].forEach((type) => {
      window.addEventListener(type, cancel, { once: true, passive: true });
    });
  };

  if (!next || !content || !current || !pager || !footer) {
    settleReturn();
    return;
  }

  let frame = null;
  let leaving = false;
  let armedUntil = 0;

  /* The end of the case stops being a list of exits: the next case takes over
     from Next and the pinned name from Home. The buttons and Book a call stay
     in the page and come back if the next one cannot be fetched. */
  root.classList.add('chain-on');
  settleReturn();

  const ARROW = '<svg class="icon-arrow" viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true"><path d="M8 2v12M3 9l5 5 5-5" stroke="currentColor" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>';

  /* --chain-top is measured, not fixed: the article starts at a different
     height on every breakpoint. */
  const place = () => {
    const top = current.getBoundingClientRect().top + window.scrollY;
    frame.style.setProperty('--chain-top', top + 'px');
    root.style.setProperty('--chain-bar-top', getComputedStyle(content).paddingTop);
  };

  const build = (doc) => {
    const source = doc.querySelector('.content__main > .case');
    const nextLabel = pager.querySelector('.case__pager-btn--next span');
    if (!source || !nextLabel) throw new Error('no case to hand off to');

    frame = document.createElement('div');
    /* The next page's body classes: some of its hero rules are scoped to them. */
    frame.className = 'case-chain ' + doc.body.className;

    /* The one control left at the end of the case, so keyboards, readers and
       anyone who would rather click have a way forward. */
    const label = document.createElement('a');
    label.className = 'case-chain__label';
    label.href = next + '.html';
    label.innerHTML = '<span></span>' + ARROW;
    label.firstChild.textContent = nextLabel.textContent;

    /* A picture of what comes next, not part of this page. */
    const article = document.createElement('article');
    article.className = 'case';
    article.setAttribute('aria-hidden', 'true');
    article.inert = true;

    frame.append(label, article);
    content.append(frame);
    place();

    /* Blocks are copied until the screen is full: the hero covers a laptop,
       a tall monitor shows more of the page. */
    for (const block of Array.from(source.children)) {
      const copy = document.importNode(block, true);
      copy.querySelectorAll('img').forEach((img) => { img.loading = 'eager'; });
      article.append(copy);
      if (article.getBoundingClientRect().bottom >= frame.getBoundingClientRect().bottom) break;
    }

    /* A cover built by a script has to be built here too, or the copy shows its
       static fallback and the real page swaps it at the moment of the hand-off. */
    const live = doc.querySelector('script[src*="itab-live"]');
    if (live && article.querySelector('[data-itab-live]')) {
      const script = document.createElement('script');
      script.src = live.getAttribute('src');
      document.body.append(script);
    }

    const meta = document.querySelector('.sidebar--case .case-meta');
    const nextMeta = doc.querySelector('.sidebar--case .case-meta');
    if (meta && nextMeta) {
      const copy = document.importNode(nextMeta, true);
      copy.classList.add('case-chain__meta');
      copy.setAttribute('aria-hidden', 'true');
      meta.after(copy);
    }

    /* The sidebar changes hands as the next title comes up the screen. It
       never scrolls out at the top: the page ends with it in place. */
    new IntersectionObserver(([entry]) => {
      root.classList.toggle('chain-next', entry.isIntersecting);
    }, { rootMargin: '0px 0px -35% 0px' }).observe(article.querySelector('.case__title'));
  };

  /* Fetched on the approach, so a reader who leaves earlier costs nothing and
     the next page's HTML is in the HTTP cache by the time it is opened. */
  const approach = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    approach.disconnect();
    fetch(next + '.html')
      .then((response) => (response.ok ? response.text() : Promise.reject()))
      .then((html) => build(new DOMParser().parseFromString(html, 'text/html')))
      .catch(() => root.classList.remove('chain-on'));
  }, { rootMargin: '200% 0px' });
  approach.observe(footer);

  const atEnd = () =>
    frame && !frame.hidden &&
    window.scrollY + window.innerHeight >= root.scrollHeight - 2;

  const go = () => {
    if (leaving) return;
    leaving = true;
    try { sessionStorage.setItem('chain-arrival', '1'); } catch (e) {}
    location.href = next + '.html';
  };

  /* Only a reader's own scrolling moves on. A jump with End or the scrollbar
     stops on the copy, and the next gesture down carries on from there.
     Trackpad inertia keeps sending wheel events; a phone's momentum runs on
     silently after the finger lifts, so touch gets the longer window. */
  const WHEEL_WINDOW = 900;
  const TOUCH_WINDOW = 2500;

  const gesture = (ms) => {
    armedUntil = performance.now() + ms;
    if (atEnd()) go();
  };

  window.addEventListener('wheel', (event) => {
    if (event.deltaY > 0) gesture(WHEEL_WINDOW);
    else if (event.deltaY < 0) armedUntil = 0;
  }, { passive: true });

  let touchY = 0;
  window.addEventListener('touchstart', (event) => {
    touchY = event.touches[0].clientY;
  }, { passive: true });
  window.addEventListener('touchmove', (event) => {
    const y = event.touches[0].clientY;
    if (Math.abs(y - touchY) < 6) return;
    if (y < touchY) gesture(TOUCH_WINDOW);
    else armedUntil = 0;
    touchY = y;
  }, { passive: true });

  window.addEventListener('keydown', (event) => {
    const plain = !event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey;
    if (plain && ['ArrowDown', 'PageDown', ' '].includes(event.key)) gesture(WHEEL_WINDOW);
    else armedUntil = 0;
  });

  /* The label lies at the top of the copy, so what is left to scroll is also
     its height on the screen. It is the one thing the real page does not have,
     so it goes before it reaches the chrome and the two pictures can meet. */
  const LABEL_GONE = 110;
  const LABEL_FADE = 160;

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      if (!frame) return;
      const left = root.scrollHeight - window.scrollY - window.innerHeight;
      const shown = (left - LABEL_GONE) / LABEL_FADE;
      frame.style.setProperty('--chain-label', Math.max(0, Math.min(1, shown)));
      if (atEnd() && performance.now() < armedUntil) go();
    });
  }, { passive: true });

  window.addEventListener('resize', () => { if (frame) place(); });

  /* "Back" from the next case restores this page where it was left: at the
     very end, on the copy, the same picture the reader just saw, as if the
     button had done nothing. Correcting the scroll on return is too early on
     iOS, where Safari restores it after pageshow, so the copy goes on the way
     out instead: with nothing below it the page can only come back to the end
     of this case. The next gesture brings the copy back underneath. */
  window.addEventListener('pagehide', () => {
    if (frame) frame.hidden = true;
  });

  window.addEventListener('pageshow', () => {
    leaving = false;
    armedUntil = 0;
    if (!frame || !frame.hidden) return;
    const bring = () => { frame.hidden = false; };
    ['wheel', 'touchstart', 'keydown'].forEach((type) => {
      window.addEventListener(type, bring, { once: true, passive: true });
    });
  });
})();
