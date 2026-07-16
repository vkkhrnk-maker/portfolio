/* Shared case-study interactions: scroll-reveal + slider swipe dots +
   tap-to-zoom lightbox. Loaded with `defer` on hooh.html / itab.html and
   the fill pages (which use it for the lightbox only — they have no
   .case__slider and no `.has-js`, so the other blocks are no-ops there).
   The `.has-js` class is set synchronously in <head> so the reveal
   hidden-state is applied before paint (no flash) and never applies when
   JS is off. */
(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Scroll-reveal --------------------------------------------------- */
  (() => {
    if (reducedMotion) return;

    const selector = [
      '.case__title', '.case__intro', '.case-meta--mobile', '.case__hero-image',
      '.case__block', '.case__section-title', '.case__section-body',
      '.case__gap-card', '.case__figure', '.case__outcome', '.case__pager'
    ].join(',');

    let pending = Array.from(document.querySelectorAll(selector));
    if (!pending.length) return;

    // Reveal anything whose top has entered the lower ~92% of the viewport.
    // A plain scroll handler (not IntersectionObserver) so it fires reliably
    // everywhere and content can never get stuck hidden.
    const reveal = () => {
      const trigger = window.innerHeight * 0.92;
      pending = pending.filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < trigger && r.bottom > 0) {
          el.classList.add('is-visible');
          return false;
        }
        return true;
      });
      if (!pending.length) {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      }
    };

    let ticking = false;
    const onScroll = () => {
      if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; reveal(); }); }
    };

    reveal(); // reveal above-the-fold immediately
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
  })();

  /* ---- Slider swipe dots ----------------------------------------------- */
  (() => {
    const sliders = document.querySelectorAll('.case__slider');

    sliders.forEach((slider) => {
      const slides = Array.from(slider.children).filter(
        (c) => c.classList && c.classList.contains('case__slide')
      );
      if (slides.length < 2) return;

      const dotsWrap = document.createElement('div');
      dotsWrap.className = 'case__dots';

      const dots = slides.map((slide, i) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'case__dot' + (i === 0 ? ' is-active' : '');
        dot.setAttribute('aria-label', 'Go to screen ' + (i + 1));
        dot.addEventListener('click', () => {
          const left = slide.offsetLeft - (slider.clientWidth - slide.clientWidth) / 2;
          slider.scrollTo({ left, behavior: 'smooth' });
        });
        dotsWrap.appendChild(dot);
        return dot;
      });

      slider.insertAdjacentElement('afterend', dotsWrap);

      let ticking = false;
      const setActive = () => {
        ticking = false;
        const center = slider.scrollLeft + slider.clientWidth / 2;
        let best = 0, bestDist = Infinity;
        slides.forEach((s, i) => {
          const c = s.offsetLeft + s.clientWidth / 2;
          const d = Math.abs(c - center);
          if (d < bestDist) { bestDist = d; best = i; }
        });
        dots.forEach((dot, i) => dot.classList.toggle('is-active', i === best));
      };

      slider.addEventListener('scroll', () => {
        if (!ticking) { ticking = true; requestAnimationFrame(setActive); }
      }, { passive: true });
    });
  })();

  /* ---- Feed: flick-and-settle scroll ----------------------------------- */
  // A real-feeling gesture: a soft inertial flick that settles each card
  // centred in the window, a beat to read, then the next flick.
  // The track is [c3, c1, c2, c3, c1, c2] — a clone before and two after — so
  // every shown card (indices 1..3) always has matching neighbours peeking,
  // and the wrap (index 4 -> 1, both = c1) is perfectly seamless (no jump).
  (() => {
    const track = document.querySelector('.case__feed-track');
    if (!track) return;
    const cards = Array.from(track.querySelectorAll('.case__feed-card'));
    if (cards.length < 4) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const FLICK = 700;        // ms of glide
    const PAUSE = 1200;       // ms to read before the next flick
    const EASE = 'cubic-bezier(0.33, 1, 0.68, 1)'; // easeOutCubic — smooth, no lurch
    const REAL = cards.length - 3; // real cards (clones: 1 before, 2 after)
    const START = 1;               // first real card index
    const WRAP = START + REAL;      // clone of the first card — seamless wrap point
    let winH = 0, centers = [], step = START, timer = null;

    const measure = () => {
      const slide = track.closest('.case__slide');
      winH = slide ? slide.clientHeight : 0;
      centers = cards.map((c) => c.offsetTop + c.offsetHeight / 2);
    };

    const pos = (i) => winH / 2 - centers[i]; // card i centred in the window

    const flick = () => {
      step += 1;
      track.style.transition = 'transform ' + FLICK + 'ms ' + EASE;
      track.style.transform = 'translateY(' + pos(step) + 'px)';
      if (step >= WRAP) {
        // landed on the first card's clone — snap to the real first card
        // (identical surroundings, so the jump is invisible).
        window.setTimeout(() => {
          track.style.transition = 'none';
          track.style.transform = 'translateY(' + pos(START) + 'px)';
          step = START;
        }, FLICK + 40);
      }
    };

    /* Run the loop only while the feed is actually on screen — the
       interval used to keep flicking (and forcing repaints) for the whole
       page life, even with the feed scrolled far away or swiped to
       another slide. Watches the page scroll AND the horizontal slider
       scroll, with the same rAF-throttled pattern as the reveal code. */
    let ready = false;
    const setRunning = (run) => {
      if (run && !timer && ready) {
        timer = window.setInterval(flick, FLICK + PAUSE);
      } else if (!run && timer) {
        clearInterval(timer);
        timer = null;
      }
    };
    const sync = () => {
      const host = track.closest('.case__slide');
      if (!host) return;
      const r = host.getBoundingClientRect();
      const vh = window.innerHeight, vw = window.innerWidth;
      const vert = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0)) / (r.height || 1);
      const horiz = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0)) / (r.width || 1);
      setRunning(vert >= 0.2 && horiz >= 0.2);
    };
    let ticking = false;
    const onScroll = () => {
      if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; sync(); }); }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    const hostSlider = track.closest('.case__slider');
    if (hostSlider) hostSlider.addEventListener('scroll', onScroll, { passive: true });

    const start = () => {
      measure();
      if (!winH || !centers.length) return;
      step = START;
      track.style.transition = 'none';
      track.style.transform = 'translateY(' + pos(START) + 'px)';
      if (timer) { clearInterval(timer); timer = null; }
      ready = true;
      sync(); // begin only if the feed is in view right now
    };

    // Cards need layout (offsetTop/Height) — wait for all images to load.
    Promise.all(cards.map((c) => c.complete ? Promise.resolve()
      : new Promise((r) => c.addEventListener('load', r, { once: true }))
    )).then(start);
    window.addEventListener('resize', measure);
  })();

  /* ---- Tap-to-zoom lightbox -------------------------------------------- */
  (() => {
    /* `.shot img` covers the fill pages' screens (their videos stay
       plain — a lightbox can't show a running loop). */
    const zoomables = document.querySelectorAll(
      '.case__shot, .case__hero-plate img, .case__figure-desktop img, .shot img'
    );
    if (!zoomables.length) return;

    let box, imgEl, closeBtn, lastFocused;

    const build = () => {
      box = document.createElement('div');
      box.className = 'lightbox';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
      box.setAttribute('aria-label', 'Enlarged screen');

      imgEl = document.createElement('img');
      imgEl.className = 'lightbox__img';
      imgEl.alt = '';

      closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'lightbox__close';
      closeBtn.setAttribute('aria-label', 'Close');
      closeBtn.innerHTML = '&times;';

      box.appendChild(imgEl);
      box.appendChild(closeBtn);
      document.body.appendChild(box);

      box.addEventListener('click', (e) => { if (e.target !== imgEl) hide(); });
    };

    const show = (src, alt) => {
      if (!box) build();
      lastFocused = document.activeElement;
      imgEl.src = src;
      imgEl.alt = alt || '';
      document.body.style.overflow = 'hidden';
      void box.offsetWidth; // reflow so the open transition runs from the hidden state
      box.classList.add('is-open');
      // Focus after styles apply — while visibility is still 'hidden',
      // focus() silently fails.
      requestAnimationFrame(() => closeBtn.focus());
    };

    const hide = () => {
      if (!box || !box.classList.contains('is-open')) return;
      box.classList.remove('is-open');
      document.body.style.overflow = '';
      if (lastFocused && document.contains(lastFocused)) lastFocused.focus();
    };

    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });

    zoomables.forEach((img) => {
      const open = () => show(img.currentSrc || img.src, img.alt);
      img.addEventListener('click', open);
      // Keyboard access: images aren't natively focusable/activatable.
      img.setAttribute('tabindex', '0');
      img.setAttribute('role', 'button');
      img.setAttribute('aria-label', 'Enlarge: ' + (img.alt || 'screen'));
      img.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      });
    });
  })();
})();
