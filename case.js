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
