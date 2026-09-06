/* iTAB specialists case — live specialist card on the cover.
   Replaces the middle phone of the hero with an HTML rebuild of the Figma
   card (390×844, scaled to the phone). Tapping an avatar in the strip switches
   the specialist: the strip slides so the chosen one sits under the fixed
   ring, and the card below repaints. Data = the same five people the Figma
   prototype carries (collection "Specialist"), Stas in the middle.
   Progressive enhancement: the static webp stays in the markup and is only
   hidden once this script has built the live screen. */
(function () {
  'use strict';
  var host = document.querySelector('[data-itab-live]');
  if (!host || !host.parentNode) return;
  var assets = host.getAttribute('data-assets') || 'assets/';

  var PEOPLE = [
    { id: 'tatyana', name: 'Tatyana Krylova', spec: 'Nutritionist • Dietitian',
      chips: ['PhD', '9 yrs', 'Adults'], date: 'October 6, 2026',
      slots: ['10:00', '10:30', '15:00', '15:30', '16:00', '17:00'], addr: '5 Pokrovka St',
      about: 'Nutritionist with a PhD in clinical nutrition. Works with weight management, food intolerances and eating in pregnancy, building plans around real habits rather than bans.' },
    { id: 'marina', name: 'Marina Volkova', spec: 'Endocrinologist • Nutrition',
      chips: ['Top category', '15 yrs', 'Adults'], date: 'October 6, 2026',
      slots: ['11:00', '11:30', '12:00', '14:00', '15:00', '16:00'], addr: '18 Dmitrovka St',
      about: 'Endocrinologist with 15 years in outpatient practice. Focuses on thyroid disorders, diabetes and metabolic health, and reads hormone panels together with diet and sleep.' },
    { id: 'stas', name: 'Stas Bokcharev', spec: 'GP • Preventive medicine',
      chips: ['Top category', '12 yrs', 'Adults', 'Children'], date: 'October 6, 2026',
      slots: ['10:00', '10:30', '11:00', '11:30', '12:00', '12:30'], addr: '64 Belorusskaya St',
      about: 'A highly qualified GP with over 12 years of experience. Specialises in diagnosing and treating internal diseases, including cardiovascular and respiratory conditions.' },
    { id: 'pavel', name: 'Pavel Ilyin', spec: 'Gastroenterologist • Gut health',
      chips: ['12 yrs', 'Adults', 'Children'], date: 'October 6, 2026',
      slots: ['11:00', '11:30', '12:00', '12:30', '17:00', '17:30'], addr: '7 Sadovaya St',
      about: 'Treats reflux, IBS and inflammatory bowel disease in adults and children. Prefers a short, targeted set of tests to a full panel and explains what each result changes in the plan.' },
    { id: 'david', name: 'David Okafor', spec: 'Neurologist • Sleep medicine',
      chips: ['PhD', '10 yrs', 'Adults'], date: 'October 6, 2026',
      slots: ['10:00', '10:30', '15:00', '15:30', '18:00', '18:30'], addr: '3 Bronnaya St',
      about: 'Neurologist specialising in sleep disorders, migraine and chronic headache. Builds consultations around a two-week sleep diary and treats medication as the last step, not the first.' }
  ];
  var START = 2; // Stas, in the middle of the strip
  var PITCH = 34, VIEW_W = 260, AVATAR = 32;

  var ICON = {
    back: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true"><path d="M15 6L9 12L15 18" stroke="#1C1F28" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    heart: '<svg viewBox="0 0 28 28" width="28" height="28" fill="none" aria-hidden="true"><path d="M24.18 9.77l.07.42c.16.97.09 1.97-.23 2.9l-.12.37a7.5 7.5 0 0 1-1.84 2.98l-1.65 1.64-4.94 4.04a2.33 2.33 0 0 1-2.95 0l-4.94-4.04-1.65-1.64a7.5 7.5 0 0 1-1.84-2.98l-.12-.37a6.24 6.24 0 0 1-.23-2.9l.07-.42a5.83 5.83 0 0 1 10.19-2.98a5.83 5.83 0 0 1 10.19 2.98z" stroke="#D1D2D0" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3" stroke="#496DF0" stroke-width="1.5"/><path d="M3 9.5h18M8 3v4M16 3v4" stroke="#496DF0" stroke-width="1.5" stroke-linecap="round"/><circle cx="8" cy="13.5" r="1" fill="#496DF0"/><circle cx="12" cy="13.5" r="1" fill="#496DF0"/><circle cx="16" cy="13.5" r="1" fill="#496DF0"/><circle cx="8" cy="17" r="1" fill="#496DF0"/><circle cx="12" cy="17" r="1" fill="#496DF0"/></svg>',
    pin: '<svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><path fill="#496DF0" d="M10 18.3a1.4 1.4 0 0 1-.58-.31c-.9-.84-1.7-1.65-2.4-2.44-.69-.79-1.27-1.56-1.74-2.3a11.6 11.6 0 0 1-1.06-2.15A5.9 5.9 0 0 1 3.83 9.1c0-2.08.67-3.74 2.01-4.98A6.1 6.1 0 0 1 10 2.27c1.76 0 3.32.62 4.66 1.85 1.34 1.24 2.01 2.9 2.01 4.98 0 .63-.12 1.28-.36 1.97-.24.69-.6 1.4-1.06 2.15-.47.74-1.05 1.5-1.74 2.3-.7.79-1.5 1.6-2.4 2.44a1.4 1.4 0 0 1-1.11.34zm0-7.3a1.9 1.9 0 1 0 0-3.8 1.9 1.9 0 0 0 0 3.8z"/></svg>',
    cam: '<svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><path fill="#496DF0" d="M3.33 16.67c-.46 0-.85-.16-1.18-.49A1.6 1.6 0 0 1 1.67 15V5c0-.46.16-.85.49-1.18.32-.32.72-.49 1.17-.49h10c.46 0 .85.16 1.18.49.32.33.49.72.49 1.18v3.75l2.63-2.63c.14-.14.29-.17.46-.1.16.07.25.2.25.4v7.17c0 .2-.09.33-.25.4a.4.4 0 0 1-.46-.1L15 11.25V15c0 .46-.16.85-.49 1.18-.33.33-.72.49-1.18.49h-10z"/></svg>'
  };
  var STATUS = '<svg viewBox="0 0 78 13" width="78" height="13" aria-hidden="true"><rect x="0" y="9" width="3" height="4" rx="1" fill="#000"/><rect x="5" y="6.5" width="3" height="6.5" rx="1" fill="#000"/><rect x="10" y="3.5" width="3" height="9.5" rx="1" fill="#000"/><rect x="15" y="0" width="3" height="13" rx="1" fill="#000"/><path d="M30.5 4.6a9.5 9.5 0 0 1 12 0l-1.4 1.6a7.4 7.4 0 0 0-9.2 0zm2.3 2.6a6 6 0 0 1 7.4 0l-1.4 1.6a3.9 3.9 0 0 0-4.6 0zm2.3 2.6a2.7 2.7 0 0 1 2.8 0l-1.4 1.7z" fill="#000"/><rect x="51" y="0.5" width="24" height="12" rx="3.5" stroke="#000" stroke-opacity=".35" fill="none"/><rect x="53" y="2.5" width="20" height="8" rx="2" fill="#000"/><path d="M76.5 4.5v4a2 2 0 0 0 0-4z" fill="#000" fill-opacity=".4"/></svg>';

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  /* ---------- markup ---------- */
  var phone = document.createElement('div');
  phone.className = host.className.replace(/\bbu-in\b/g, '') + ' itab-live';
  phone.setAttribute('role', 'group');
  phone.setAttribute('aria-label', 'Live specialist card: tap an avatar in the strip to switch the specialist');

  var avatars = PEOPLE.map(function (p, i) {
    return '<button type="button" class="il-avatar" data-i="' + i + '" aria-label="' + esc(p.name) + ', ' + esc(p.spec) + '" aria-pressed="' + (i === START) + '">' +
      '<img src="' + assets + 'case-itab-sp-live-' + p.id + '.webp" alt="" width="32" height="32" decoding="async"></button>';
  }).join('');

  phone.innerHTML =
    '<div class="itab-live__wrap"><div class="itab-live__screen">' +
      '<div class="il-status"><span class="il-time">9:41</span><span class="il-island"></span><span class="il-sysicons">' + STATUS + '</span></div>' +
      '<div class="il-header">' +
        '<span class="il-back">' + ICON.back + '</span>' +
        '<div class="il-strip"><span class="il-ring"></span><div class="il-row">' + avatars + '</div><span class="il-fade il-fade--l"></span><span class="il-fade il-fade--r"></span></div>' +
        '<span class="il-heart">' + ICON.heart + '</span>' +
      '</div>' +
      '<div class="il-content">' +
        '<div class="il-photo"><img class="il-photo__img" alt="" width="160" height="160" decoding="async"></div>' +
        '<div class="il-title"><div class="il-name"></div><div class="il-spec"></div></div>' +
        '<div class="il-chips"></div>' +
        '<div class="il-switch"><span class="il-switch__tab is-on">Consultations</span><span class="il-switch__tab">Services</span></div>' +
        '<div class="il-slots"><div class="il-slots__head"><span class="il-date"></span>' + ICON.calendar + '</div><div class="il-slots__grid"></div></div>' +
        '<div class="il-section"><div class="il-h">Consultation format</div><div class="il-format"><span class="il-tab is-on">' + ICON.pin + '<span class="il-addr"></span></span><span class="il-tab">' + ICON.cam + '<span>Online</span></span></div></div>' +
        '<div class="il-section"><div class="il-h">About the specialist</div><p class="il-about"></p><span class="il-more">Read more</span></div>' +
      '</div>' +
    '</div></div>';

  host.parentNode.insertBefore(phone, host);
  host.hidden = true;
  host.classList.add('itab-live-fallback');

  var q = function (sel) { return phone.querySelector(sel); };
  var screen = q('.itab-live__screen'), row = q('.il-row'), photo = q('.il-photo__img'),
      name = q('.il-name'), spec = q('.il-spec'), chips = q('.il-chips'), date = q('.il-date'),
      grid = q('.il-slots__grid'), addr = q('.il-addr'), about = q('.il-about');
  var buttons = Array.prototype.slice.call(phone.querySelectorAll('.il-avatar'));

  /* ---------- scale the 390 px screen to the phone ---------- */
  var wrap = q('.itab-live__wrap');
  function fit() {
    var w = wrap.clientWidth;
    if (w) screen.style.setProperty('--il-scale', (w / 390).toFixed(4));
  }
  if (window.ResizeObserver) new ResizeObserver(fit).observe(wrap); else window.addEventListener('resize', fit);
  fit();

  /* ---------- state ---------- */
  var current = -1, fadeTimer = null;
  PEOPLE.forEach(function (p) { var im = new Image(); im.src = assets + 'case-itab-sp-live-' + p.id + '.webp'; });

  function render(i, animate) {
    var p = PEOPLE[i];
    row.style.transform = 'translateX(' + (VIEW_W / 2 - AVATAR / 2 - PITCH * i) + 'px)';
    buttons.forEach(function (b, k) { b.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
    var paint = function () {
      photo.src = assets + 'case-itab-sp-live-' + p.id + '.webp';
      name.textContent = p.name;
      spec.textContent = p.spec;
      chips.innerHTML = p.chips.map(function (c) { return '<span class="il-chip">' + esc(c) + '</span>'; }).join('');
      date.textContent = p.date;
      grid.innerHTML = p.slots.map(function (s) { return '<span class="il-slot">' + esc(s) + '</span>'; }).join('');
      addr.textContent = p.addr;
      about.textContent = p.about;
    };
    if (!animate) { paint(); return; }
    screen.classList.add('is-switching');
    clearTimeout(fadeTimer);
    fadeTimer = setTimeout(function () { paint(); screen.classList.remove('is-switching'); }, 160);
  }

  buttons.forEach(function (b) {
    b.addEventListener('click', function () {
      var i = Number(b.getAttribute('data-i'));
      if (i === current) return;
      current = i;
      render(i, true);
    });
  });

  current = START;
  render(START, false);
})();
