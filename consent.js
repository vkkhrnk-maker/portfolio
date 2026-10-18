/* Cookie consent, and the gate in front of Clarity.

   The site's own counter (Cloudflare) is cookieless: it counts everyone
   without asking and needs no permission. Clarity is the opposite — it
   records how a page is actually used, which takes cookies, which takes
   consent. So nothing here loads Clarity until a visitor says yes.

   The build injects window.__clarityId, and only into the published site.
   Pages opened from disk have no id, so no banner appears and no session
   is recorded while the site is being worked on — the same reason the
   Cloudflare beacon is injected at build time rather than kept in source. */
(function () {
  var id = window.__clarityId;
  if (!id) return;

  var KEY = 'consent';
  var ru = (document.documentElement.lang || '').toLowerCase().indexOf('ru') === 0;

  /* Written dry on purpose. Everywhere else the site speaks in the first
     person, but here a visitor is being asked for permission rather than
     told about the work, and charm in that position reads as an attempt to
     charm them into yes. "Can record" and not "records": before consent
     nothing has been recorded, and the notice has to say what is true at
     the moment it is read. */
  var TEXT = ru ? {
    body: 'Сайт может записывать, как читают страницы: прокрутку и ' +
          'нажатия. Для этого нужны куки',
    yes: 'Разрешить',
    no: 'Не надо',
    link: 'Куки'
  } : {
    body: 'This site can record how pages are read — scrolling and ' +
          'clicks. That needs cookies',
    yes: 'Allow',
    no: 'No thanks',
    link: 'Cookies'
  };

  var saved = read();
  if (saved === 'granted') startClarity();
  addFooterLink();
  if (!saved) showBanner();

  /* localStorage throws outright in some privacy modes, so every touch is
     wrapped. A visitor whose browser refuses to remember the answer is
     asked again next time — annoying, but the alternative is recording
     someone who never agreed. */
  function read() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  function write(value) {
    try { localStorage.setItem(KEY, value); } catch (e) {}
  }

  /* Once per page: answering "yes" again from the footer link used to load
     the tag a second time. The consent call tells Clarity the visitor said
     yes to analytics storage, so it keeps its cookies rather than running
     as if no answer had been given. */
  var clarityStarted = false;
  function startClarity() {
    if (clarityStarted) return;
    clarityStarted = true;
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1;
      t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0];
      y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', id);
    window.clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' });
  }

  function showBanner() {
    var box = document.createElement('div');
    box.className = 'consent';
    box.setAttribute('role', 'region');
    box.setAttribute('aria-label', ru ? 'Согласие на куки' : 'Cookie consent');

    var text = document.createElement('p');
    text.className = 'consent__text';
    text.textContent = TEXT.body;

    var row = document.createElement('div');
    row.className = 'consent__row';
    row.appendChild(button(TEXT.yes, 'btn btn--dark', 'granted'));
    row.appendChild(button(TEXT.no, 'btn btn--light', 'denied'));

    box.appendChild(text);
    box.appendChild(row);
    document.body.appendChild(box);
    return box;

    function button(label, className, choice) {
      var el = document.createElement('button');
      el.type = 'button';
      el.className = className;
      el.textContent = label;
      el.addEventListener('click', function () { decide(choice, box); });
      return el;
    }
  }

  function decide(choice, box) {
    var had = read();
    write(choice);
    if (box) box.remove();

    /* Changing an earlier answer needs the page rebuilt, not patched:
       Clarity, once started, cannot be called back. Going from yes to no
       therefore drops its cookies and reloads. A first answer needs none
       of that — nothing has run yet. */
    if (had && had !== choice) {
      if (choice === 'denied') forgetClarityCookies();
      location.reload();
      return;
    }
    if (choice === 'granted') startClarity();
  }

  /* Clarity writes _clck/_clsk on the parent domain (.victoriakukharenko.com),
     and a cookie only goes when it is expired with the domain it was set
     with. Expiring host-only, as this used to, left them in place after a
     "no". So each name is expired every way it can have been written. */
  function forgetClarityCookies() {
    var host = location.hostname.replace(/^www\./, '');
    var scopes = ['', '; domain=' + host, '; domain=.' + host];
    var names = document.cookie.split(';');
    for (var i = 0; i < names.length; i++) {
      var name = names[i].split('=')[0].trim();
      if (name.indexOf('_cl') !== 0) continue;
      for (var j = 0; j < scopes.length; j++) {
        document.cookie = name + '=; max-age=0; path=/' + scopes[j];
      }
    }
  }

  /* The answer has to be changeable, or it is not consent. The control is
     the footer's right end, the year its left one: a two-end row on purpose.
     It is there before the first answer too, so the corner is never empty;
     with the plate already open, it moves focus to the plate. */
  function addFooterLink() {
    var row = document.querySelector('.footer__row');
    if (!row || row.querySelector('.consent__link')) return;

    var cell = document.createElement('p');
    cell.className = 'footer__cookies';

    var link = document.createElement('button');
    link.type = 'button';
    link.className = 'consent__link';
    link.textContent = TEXT.link;
    link.addEventListener('click', function () {
      var box = document.querySelector('.consent') || showBanner();
      box.querySelector('button').focus();
    });

    cell.appendChild(link);
    row.appendChild(cell);
  }
})();
