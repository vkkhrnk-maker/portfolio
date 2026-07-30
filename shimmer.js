/* Video files are substantially heavier than their posters. Keep only the
   poster in the initial page load, then attach the source shortly before the
   video reaches the viewport. */
(() => {
  const videos = Array.from(document.querySelectorAll('video[data-src]'));
  if (!videos.length) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hydrate = (video) => {
    const src = video.dataset.src;
    if (!src) return;
    video.src = src;
    video.removeAttribute('data-src');
    video.load();
    if (video.autoplay && !reducedMotion) {
      const playback = video.play();
      if (playback && typeof playback.catch === 'function') playback.catch(() => {});
    }
  };

  if (!('IntersectionObserver' in window)) {
    videos.forEach(hydrate);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      hydrate(entry.target);
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '160px 0px', threshold: 0.01 });

  videos.forEach((video) => observer.observe(video));
})();

/* Media blur-up (the Syno profile-cover pattern): a tiny (~1KB, base64)
   blurred placeholder sits under each big case image from the first paint,
   and the sharp file fades in over it once loaded. Replaces the old shimmer
   sweep. LQIP thumbs are 28px JPEGs baked in at build time (sips -Z 28).
   Applied only from JS, so visitors without JS see plain native loading. */
(() => {
  const LQIP = {
    "syno-desktop.webp":
      "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAASABIAAD/4QBMRXhpZgAATU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAHKADAAQAAAABAAAAEQAAAAD/7QA4UGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAAA4QklNBCUAAAAAABDUHYzZjwCyBOmACZjs+EJ+/8AAEQgAEQAcAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/bAEMABAQEBAQECAQECAsICAgLDwsLCwsPEg8PDw8PEhYSEhISEhIWFhYWFhYWFhsbGxsbGx8fHx8fIyMjIyMjIyMjI//bAEMBBQYGCQgJDwgIDyQZFBkkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJP/dAAQAAv/aAAwDAQACEQMRAD8A+i7nxDZaZrbWqJO8szBWOWaNctgYBOB17DpXdSvDAP3rgc4+pryi1m8ejxbdwzwQtp/nFoZMANs3AYPPXGTmvTpohOWaZFbjAGP4TjI+p9awpRkr80r/AC2N6s4NR5I2+e5b27hn+VQw5+ZMltrEZP51k3MkekzCWHczycPzkED+XJzWnaXK3cZmQEDOOa6lB2vY5XNXsnqf/9D7FPWlHSkPWlHSpKI37U+P7tMftT4/u1RPU//Z",
    "itab-desktop.webp":
      "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAASABIAAD/4QBMRXhpZgAATU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAHKADAAQAAAABAAAAFwAAAAD/7QA4UGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAAA4QklNBCUAAAAAABDUHYzZjwCyBOmACZjs+EJ+/8AAEQgAFwAcAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/bAEMABAQEBAQECAQECAsICAgLDwsLCwsPEg8PDw8PEhYSEhISEhIWFhYWFhYWFhsbGxsbGx8fHx8fIyMjIyMjIyMjI//bAEMBBQYGCQgJDwgIDyQZFBkkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJP/dAAQAAv/aAAwDAQACEQMRAD8A+4J5EtW+33UxjUAj5mwnP9fSp2uZ1fYEJ/Ef41j6/wCHrTxNbQ29y5CQuHIU9TgjB/OtWdbjzTsiLDjkNiklqNpJabla91u0sbgWl3JscqGxz0PHatMzyRfLkN3zzSR26tKJZEwdm3J5P0zUMy7GCegwM0K93clX6n//0PvKG3j8vJ/jwTVKYTJKRHCGXjnIrVh/1S/Son+8aAKCLdMQWhXk/wB6n3CKkmF9K0E6CqV3/rfwoA//2Q==",
    "itab-mobile.webp":
      "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAASABIAAD/4QBMRXhpZgAATU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAADaADAAQAAAABAAAAHAAAAAD/7QA4UGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAAA4QklNBCUAAAAAABDUHYzZjwCyBOmACZjs+EJ+/8AAEQgAHAANAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/bAEMABAQEBAQECAQECAsICAgLDwsLCwsPEg8PDw8PEhYSEhISEhIWFhYWFhYWFhsbGxsbGx8fHx8fIyMjIyMjIyMjI//bAEMBBQYGCQgJDwgIDyQZFBkkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJP/dAAQAAf/aAAwDAQACEQMRAD8A+2tT1K30mI3l7JtjJwBjJyegHNSaDqVprWmx61p7s0FyNybsg4HHQk45rz74h+G7/XbvT57LzmW3ky8aE7CCw5ZcgZAzg9a7bwhpJ0Lw1aaQST5CFctwepPP51Cb5rdDdxgqad/eP//Q+tZ/EPhu0v5YJ54i6uQ4aReCDzweR9K6bRdY0rVYn/suWORYzz5bA4J9cdKbrFpYwgSi3iLSE7iUGfrnrn3ratLa2giBt40j3AE7VAz+VZrnvra3z/zMkp3u3of/2Q==",
    "case-hero.webp":
      "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAASABIAAD/4QBMRXhpZgAATU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAHKADAAQAAAABAAAAEQAAAAD/7QA4UGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAAA4QklNBCUAAAAAABDUHYzZjwCyBOmACZjs+EJ+/8AAEQgAEQAcAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/bAEMABAQEBAQECAQECAsICAgLDwsLCwsPEg8PDw8PEhYSEhISEhIWFhYWFhYWFhsbGxsbGx8fHx8fIyMjIyMjIyMjI//bAEMBBQYGCQgJDwgIDyQZFBkkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJP/dAAQAAv/aAAwDAQACEQMRAD8A+rInCKRsDE9zXJ6i91f301pazSQi3MORAMt+8Zs5BHT5ccV1U01vZxefcuqKOMsQBk9Bk1y8d7891ftbSTRSGOBTEdr7wWGR7Df16UsxxCq/ulLlv1Tt+J5+Elfmm0nbRX11fkdXo6zNA0E5LPDI8ZY9TtY4J/CuiWD5a4bwdFd2Wp3WmXbNIzDzlMhyx5AIYjqQTXpCpKB822vlMRJp25182aywC9pKXR6/ef/Q9m+Ln/IpD/r4T+TVo/B7/kTV/wCu7/8AstZ3xc/5FIf9fCfyatH4Pf8AImr/ANd3/wDZa8nHfwvmfG4b/e5eiOjX/keYvo38hXpleZr/AMjzF9G/kK9Mr5XGfGvRH6B9mPof/9k=",
    "hooh-pdf-cover-final.jpg":
      "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAASABIAAD/4QBMRXhpZgAATU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAHKADAAQAAAABAAAADwAAAAD/7QA4UGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAAA4QklNBCUAAAAAABDUHYzZjwCyBOmACZjs+EJ+/8IAEQgADwAcAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAMCBAEFAAYHCAkKC//EAMMQAAEDAwIEAwQGBAcGBAgGcwECAAMRBBIhBTETIhAGQVEyFGFxIweBIJFCFaFSM7EkYjAWwXLRQ5I0ggjhU0AlYxc18JNzolBEsoPxJlQ2ZJR0wmDShKMYcOInRTdls1V1pJXDhfLTRnaA40dWZrQJChkaKCkqODk6SElKV1hZWmdoaWp3eHl6hoeIiYqQlpeYmZqgpaanqKmqsLW2t7i5usDExcbHyMnK0NTV1tfY2drg5OXm5+jp6vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAQIAAwQFBgcICQoL/8QAwxEAAgIBAwMDAgMFAgUCBASHAQACEQMQEiEEIDFBEwUwIjJRFEAGMyNhQhVxUjSBUCSRoUOxFgdiNVPw0SVgwUThcvEXgmM2cCZFVJInotIICQoYGRooKSo3ODk6RkdISUpVVldYWVpkZWZnaGlqc3R1dnd4eXqAg4SFhoeIiYqQk5SVlpeYmZqgo6SlpqeoqaqwsrO0tba3uLm6wMLDxMXGx8jJytDT1NXW19jZ2uDi4+Tl5ufo6ery8/T19vf4+fr/2wBDAAQEBAQEBAgEBAgLCAgICw8LCwsLDxIPDw8PDxIWEhISEhISFhYWFhYWFhYbGxsbGxsfHx8fHyMjIyMjIyMjIyP/2wBDAQUGBgkICQ8ICA8kGRQZJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCT/2gAMAwEAAhEDEQAAAXnUN3fs/H8436Bzvyf/2gAIAQEAAQUCELsbWCVqhBPu7SliRVu4CJY8X//aAAgBAxEBPwH4kw9+snr4/wAL1UduaYH5l//aAAgBAhEBPwHr5yOPhwZz7cb/ACf/2gAIAQEABj8CZTJ5as07laBV5+vb/8QAMxABAAMAAgICAgIDAQEAAAILAREAITFBUWFxgZGhscHw0RDh8SAwQFBgcICQoLDA0OD/2gAIAQEAAT8hvCfYU7CNa2dNElzPiiIxr+am/wD/2gAMAwEAAhEDEQAAEAwv/8QAMxEBAQEAAwABAgUFAQEAAQEJAQARITEQQVFhIHHwkYGhsdHB4fEwQFBgcICQoLDA0OD/2gAIAQMRAT8QEPgZ+Ymf4n4cAZ9OW//aAAgBAhEBPxD6Ajr+QMx1rj+1/9oACAEBAAE/EBeqVoYRBjJCo5lheIgOCGKM8VBVwoAJCEvXiWg/Qo5jVC8X/9k="
  };
  document.querySelectorAll('[data-shimmer]').forEach((box) => {
    const imgs = Array.from(box.querySelectorAll('img')).filter((img) => {
      const file = (img.getAttribute('src') || '').split('/').pop().split('?')[0];
      return LQIP[file];
    });
    if (!imgs.length) return;

    if (getComputedStyle(box).position === 'static') {
      box.style.position = 'relative';
    }
    box.classList.add('bu');

    /* One placeholder per box, painted from the first covered image —
       it sits at z-index:-1 inside the box, under every real image. */
    const file = (imgs[0].getAttribute('src') || '').split('/').pop().split('?')[0];
    const ph = document.createElement('span');
    ph.className = 'bu-lqip';
    ph.style.backgroundImage = 'url("' + LQIP[file] + '")';
    box.insertBefore(ph, box.firstChild);

    /* When every image has revealed, fade the LQIP out (.bu-done) — kept
       under a partially-covering image it bleeds a soft gradient past the
       edges (the iTAB group is wider than its shots). */
    let left = imgs.length;
    const settle = () => {
      left -= 1;
      if (left === 0) setTimeout(() => box.classList.add('bu-done'), 650);
    };
    imgs.forEach((img) => {
      let settled = false;
      const reveal = () => {
        img.classList.add('bu-in');
        if (!settled) { settled = true; settle(); }
      };
      if (img.complete && img.naturalWidth) {
        img.classList.add('bu-full', 'bu-in'); // cached: no fade, no flash
        settled = true;
        settle();
      } else {
        img.classList.add('bu-full');
        img.addEventListener('load', reveal, { once: true });
        img.addEventListener('error', reveal, { once: true });
        setTimeout(reveal, 4000); // never let the blur stick
      }
    });
  });
})();
