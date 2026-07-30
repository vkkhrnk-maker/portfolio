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
      '.case__title', '.case__intro', '.case__proof-strip',
      '.case-meta--mobile', '.case__hero-image',
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
    /* `.shot img` and `.shot video` cover the fill pages' screens — a
       zoomed video keeps looping in the lightbox, picked up from the
       exact frame the inline copy was on. */
    const zoomables = document.querySelectorAll(
      '.case__shot, .case__hero-plate img, .case__figure-desktop img, .shot img, .shot video'
    );
    if (!zoomables.length) return;
    /* Lets the stylesheet scope zoom affordances (cursor) to pages where
       the lightbox is actually wired up. */
    document.documentElement.classList.add('has-lightbox');

    let box, imgEl, videoEl, closeBtn, lastFocused;
    let background = [];
    let sourceVideo = null; // the inline video the open lightbox mirrors

    const setBackgroundInert = (inert) => {
      background.forEach((el) => {
        if (inert) el.setAttribute('inert', '');
        else el.removeAttribute('inert');
      });
    };

    const build = () => {
      box = document.createElement('div');
      box.className = 'lightbox';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
      box.setAttribute('aria-label', 'Enlarged screen');
      box.setAttribute('aria-hidden', 'true');

      imgEl = document.createElement('img');
      imgEl.className = 'lightbox__img';
      imgEl.alt = '';

      videoEl = document.createElement('video');
      videoEl.className = 'lightbox__img lightbox__video';
      videoEl.muted = true;
      videoEl.loop = true;
      videoEl.setAttribute('playsinline', '');
      videoEl.hidden = true;

      closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'lightbox__close';
      closeBtn.setAttribute('aria-label', 'Close');
      closeBtn.innerHTML = '&times;';

      box.appendChild(imgEl);
      box.appendChild(videoEl);
      box.appendChild(closeBtn);
      document.body.appendChild(box);

      box.addEventListener('click', (e) => {
        if (e.target !== imgEl && e.target !== videoEl) hide();
      });
    };

    const show = (el) => {
      if (!box) build();
      lastFocused = document.activeElement;
      const isVideo = el.tagName === 'VIDEO';
      imgEl.hidden = isVideo;
      videoEl.hidden = !isVideo;
      if (isVideo) {
        /* Hand the loop over: the big copy starts on the frame the small
           one was showing, and the small one pauses so only one copy
           decodes at a time. */
        sourceVideo = el;
        if (el.poster) videoEl.poster = el.poster;
        videoEl.src = el.currentSrc || el.src || el.dataset.src;
        try { videoEl.currentTime = el.currentTime; } catch (err) {}
        el.pause();
        const p = videoEl.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
        videoEl.setAttribute('aria-label',
          el.getAttribute('aria-label') || 'Enlarged screen recording');
      } else {
        imgEl.src = el.currentSrc || el.src;
        imgEl.alt = el.alt || '';
      }
      background = Array.from(document.body.children)
        .filter((child) => child !== box && child.tagName !== 'SCRIPT');
      setBackgroundInert(true);
      document.body.style.overflow = 'hidden';
      void box.offsetWidth; // reflow so the open transition runs from the hidden state
      box.classList.add('is-open');
      box.setAttribute('aria-hidden', 'false');
      requestAnimationFrame(() => closeBtn.focus({ preventScroll: true }));
    };

    const hide = () => {
      if (!box || !box.classList.contains('is-open')) return;
      box.classList.remove('is-open');
      box.setAttribute('aria-hidden', 'true');
      setBackgroundInert(false);
      document.body.style.overflow = '';
      if (sourceVideo) {
        /* …and hand it back: the inline copy resumes where the big one
           left off, the lightbox releases its decoder. */
        try { sourceVideo.currentTime = videoEl.currentTime; } catch (err) {}
        videoEl.pause();
        videoEl.removeAttribute('src');
        videoEl.load();
        const p = sourceVideo.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
        sourceVideo = null;
      }
      if (lastFocused && document.contains(lastFocused)) {
        lastFocused.focus({ preventScroll: true });
      }
    };

    document.addEventListener('keydown', (e) => {
      if (!box || !box.classList.contains('is-open')) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        hide();
      } else if (e.key === 'Tab') {
        // Close is intentionally the only control in this modal.
        e.preventDefault();
        closeBtn.focus();
      }
    });

    zoomables.forEach((el) => {
      const open = () => show(el);
      el.addEventListener('click', open);
      // Keyboard access: images/videos aren't natively focusable/activatable.
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label',
        'Enlarge: ' + (el.alt || el.getAttribute('aria-label') || 'screen'));
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      });
    });

  })();
})();
