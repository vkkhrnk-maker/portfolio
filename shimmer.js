/* Media shimmer: a Syno-style loading sweep over the big opaque images
   (case heroes, home monitor shots). Applied only from JS, so visitors
   without JS never see a stuck placeholder. The container gets
   .is-loading until every image inside it has loaded (or errored). */
(() => {
  document.querySelectorAll('[data-shimmer]').forEach((box) => {
    const imgs = Array.from(box.querySelectorAll('img')).filter(
      (img) => !(img.complete && img.naturalWidth)
    );
    if (!imgs.length) return;

    if (getComputedStyle(box).position === 'static') {
      box.style.position = 'relative';
    }
    box.classList.add('is-loading');

    let left = imgs.length;
    const done = () => {
      left -= 1;
      if (left === 0) box.classList.remove('is-loading');
    };
    imgs.forEach((img) => {
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
    });
  });
})();
