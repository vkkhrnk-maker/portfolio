(function () {
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function setup() {
    var models = Array.prototype.slice.call(
      document.querySelectorAll('.profile-character__model[data-src]')
    );
    if (!models.length || reducedMotion.matches || !window.customElements) return;

    window.customElements.whenDefined('model-viewer').then(function () {
      models.forEach(function (model) {
        var character = model.closest('.profile-character');
        var fallback = character && character.querySelector('.profile-character__fallback');
        var source = model.getAttribute('data-src');
        if (!character || !source) return;

        model.addEventListener('load', function () {
          if (fallback) fallback.classList.add('is-hidden');
          character.classList.add('is-3d-ready');
          if (document.visibilityState === 'visible' && typeof model.play === 'function') {
            model.play();
          }
        }, { once: true });

        model.addEventListener('error', function () {
          character.classList.remove('is-3d-ready');
          if (fallback) fallback.classList.remove('is-hidden');
          model.removeAttribute('src');
        });

        model.setAttribute('src', source);

        if ('IntersectionObserver' in window) {
          new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
              if (typeof model.play !== 'function' || typeof model.pause !== 'function') return;
              if (entry.isIntersecting && document.visibilityState === 'visible') model.play();
              else model.pause();
            });
          }, { threshold: 0.05 }).observe(model);
        }
      });

      document.addEventListener('visibilitychange', function () {
        models.forEach(function (model) {
          if (typeof model.play !== 'function' || typeof model.pause !== 'function') return;
          if (document.visibilityState === 'visible') model.play();
          else model.pause();
        });
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup, { once: true });
  else setup();
})();
