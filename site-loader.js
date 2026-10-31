/* The first page of a visit waits behind frosted glass until what is on the
   first screen is ready to show: the cover photo or hero, the phones on the
   home cards, and the fonts. Going from page to page the browser already has
   most of it, so the inline snippet in <head> only asks for the loader once.
   The wait is capped, because a slow file must not hold the whole site back. */
(() => {
  const root = document.documentElement;
  if (!root.classList.contains('site-loading')) return;

  const MAX_WAIT = 3000;
  const FADE = 350;

  const ready = (image) => new Promise((resolve) => {
    const done = () => {
      if (image.decode) image.decode().catch(() => {}).then(resolve);
      else resolve();
    };
    if (image.complete) { done(); return; }
    image.addEventListener('load', done, { once: true });
    image.addEventListener('error', resolve, { once: true });
  });

  const fold = window.innerHeight * 1.1;
  const onFirstScreen = (el) => {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.top < fold;
  };

  const waits = [];
  if (document.fonts && document.fonts.ready) waits.push(document.fonts.ready);
  document.querySelectorAll('img:not([loading="lazy"])').forEach((image) => {
    if (onFirstScreen(image)) waits.push(ready(image));
  });
  document.querySelectorAll('video').forEach((video) => {
    if (!video.poster || !(video.closest('.project-card') || onFirstScreen(video))) return;
    const poster = new Image();
    poster.src = video.poster;
    waits.push(ready(poster));
  });

  const finish = () => {
    try { sessionStorage.setItem('site-seen', '1'); } catch (error) {}
    const loader = document.querySelector('.site-loader');
    if (loader) loader.classList.add('is-done');
    window.setTimeout(() => root.classList.remove('site-loading'), FADE + 50);
  };

  Promise.race([
    Promise.all(waits),
    new Promise((resolve) => { window.setTimeout(resolve, MAX_WAIT); }),
  ]).then(finish);
})();
