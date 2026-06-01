/* Shared case-study interactions: scroll-reveal + slider swipe dots.
   Loaded with `defer` on hooh.html / itab.html. The `.has-js` class is set
   synchronously in <head> so the reveal hidden-state is applied before paint
   (no flash) and never applies when JS is off. */
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
      dotsWrap.setAttribute('aria-hidden', 'true');

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
  // Drives the feed like a real gesture: a quick inertial flick that settles
  // on the next card, a beat to read, then the next flick — looping. Two
  // identical copies in the track make the wrap seamless. JS (not CSS) so the
  // px distances resolve correctly on the auto-height track.
  (() => {
    const track = document.querySelector('.case__feed-track');
    if (!track) return;
    const img = track.querySelector('.case__feed-img');
    if (!img) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const FLICK = 650;        // ms of inertial glide
    const PAUSE = 2000;       // ms to read before the next flick
    const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'; // strong ease-out = momentum
    let one = 0, winH = 0, step = 0, timer = null;
    let fracs = null;         // each card's centre as a fraction of one copy

    // Find each card's vertical centre by scanning the image's opaque rows
    // (cards are opaque, gaps are transparent). Robust if the feed is re-exported.
    const detectCenters = () => {
      try {
        const W = 40, scale = W / img.naturalWidth, H = Math.round(img.naturalHeight * scale);
        const c = document.createElement('canvas');
        c.width = W; c.height = H;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, W, H);
        const d = ctx.getImageData(0, 0, W, H).data;
        const bands = []; let s = -1;
        for (let y = 0; y < H; y++) {
          let op = 0;
          for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 40) op++;
          const card = op / W > 0.15;
          if (card && s < 0) s = y;
          if (!card && s >= 0) { bands.push((s + y - 1) / 2 / H); s = -1; }
        }
        if (s >= 0) bands.push((s + H - 1) / 2 / H);
        return bands.length ? bands : null;
      } catch (e) { return null; }
    };

    const measure = () => {
      one = img.getBoundingClientRect().height;
      const slide = track.closest('.case__slide');
      winH = slide ? slide.clientHeight : 0;
      if (!fracs) fracs = detectCenters();
    };

    // Position that puts card `s` centred in the window.
    const pos = (s) => {
      const n = fracs ? fracs.length : 3;
      const frac = fracs
        ? (s < n ? fracs[s] : fracs[0] + 1)              // wrap to next copy's 1st card
        : (s < n ? (s + 0.5) / n : (0.5) / n + 1);        // even-thirds fallback
      return winH / 2 - frac * one;
    };
    const cards = () => (fracs ? fracs.length : 3);

    const flick = () => {
      step += 1;
      track.style.transition = 'transform ' + FLICK + 'ms ' + EASE;
      track.style.transform = 'translateY(' + pos(step) + 'px)';
      if (step >= cards()) {
        // landed on the duplicate's first card — snap back to the real first
        // card with no transition (seamless), ready for the next flick.
        window.setTimeout(() => {
          track.style.transition = 'none';
          track.style.transform = 'translateY(' + pos(0) + 'px)';
          step = 0;
        }, FLICK + 30);
      }
    };

    const start = () => {
      measure();
      if (!one || !winH) return;
      step = 0;
      track.style.transition = 'none';
      track.style.transform = 'translateY(' + pos(0) + 'px)';
      if (timer) clearInterval(timer);
      timer = window.setInterval(flick, FLICK + PAUSE);
    };

    if (img.complete) start(); else img.addEventListener('load', start);
    window.addEventListener('resize', measure);
  })();

  /* ---- Tap-to-zoom lightbox -------------------------------------------- */
  (() => {
    const zoomables = document.querySelectorAll('.case__shot, .case__hero-plate img');
    if (!zoomables.length) return;

    let box, imgEl;

    const build = () => {
      box = document.createElement('div');
      box.className = 'lightbox';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
      box.setAttribute('aria-label', 'Enlarged screen');

      imgEl = document.createElement('img');
      imgEl.className = 'lightbox__img';
      imgEl.alt = '';

      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'lightbox__close';
      close.setAttribute('aria-label', 'Close');
      close.innerHTML = '&times;';

      box.appendChild(imgEl);
      box.appendChild(close);
      document.body.appendChild(box);

      box.addEventListener('click', (e) => { if (e.target !== imgEl) hide(); });
    };

    const show = (src, alt) => {
      if (!box) build();
      imgEl.src = src;
      imgEl.alt = alt || '';
      document.body.style.overflow = 'hidden';
      void box.offsetWidth; // reflow so the open transition runs from the hidden state
      box.classList.add('is-open');
    };

    const hide = () => {
      if (!box) return;
      box.classList.remove('is-open');
      document.body.style.overflow = '';
    };

    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });

    zoomables.forEach((img) => {
      img.addEventListener('click', () => show(img.currentSrc || img.src, img.alt));
    });
  })();
})();
