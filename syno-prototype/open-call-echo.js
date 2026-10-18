/* Syno / Open Call · echo cover (прототип главной). Надпись «Open Call» и срок набраны
   контурами Schengen Core Medium и стоят на сетке обложки; по буквам один раз проходит
   полая волна (заливка ↔ контур 1,5 px). Раскладки — C, C2, D, D2, D3 из пробы в Claude Design:
   поле 12, колонки 2 × 592 / 20 на 1280, край титула 20, заголовок → лид 20; надпись
   выравнивается по краям букв, тексты делят базовую линию с надписью. Живые h1 и мета слайда
   остаются в DOM и только переставляются. */
(() => {
  'use strict';
  /* generated from fonts/schengen/Core-Medium.woff2: outlines per word, 1000 upm, box 0..adv x 0..900, baseline y=800 */
  const WORDS = {"Until":{"adv":1536,"d":["M155 801Q86 801 58.0 772.0Q30 743 30 673V100H171V639Q171 685 183.5 702.5Q196 720 233 720Q270 720 283.0 702.5Q296 685 296 639V100H436V673Q436 743 407.5 772.0Q379 801 311 801Z","M492 800V269H768Q829 269 852.5 293.5Q876 318 876 383V800H739V418Q739 374 727.5 358.5Q716 343 684 343Q653 343 641.5 356.5Q630 370 630 403V800Z","M1026 800Q973 800 949.5 777.5Q926 755 926 704V138H1066V269H1147V355H1066V673Q1066 697 1075.0 706.0Q1084 715 1107 715H1147V800Z","M1178 800V269H1318V800ZM1178 215V100H1318V215Z","M1370 800V100H1510V800Z"]},"Open":{"adv":1752,"d":["M152 801Q84 801 55.5 772.0Q27 743 27 673V227Q27 156 55.5 127.5Q84 99 152 99H309Q378 99 406.0 128.0Q434 157 434 227V673Q434 743 405.5 772.0Q377 801 309 801ZM231 720Q267 720 280.5 702.5Q294 685 294 639V262Q294 215 280.5 197.5Q267 180 231 180Q194 180 181.0 197.5Q168 215 168 262V639Q168 685 181.0 702.5Q194 720 231 720Z","M765 269Q826 269 849.5 293.5Q873 318 873 383V687Q873 751 849.5 775.5Q826 800 765 800H625V969H487V269ZM680 343Q649 343 637.0 357.0Q625 371 625 405V664Q625 698 637.0 712.0Q649 726 680 726Q712 726 724.0 710.0Q736 694 736 651V418Q736 374 724.0 358.5Q712 343 680 343Z","M1026 800Q965 800 941.5 775.5Q918 751 918 687V382Q918 317 942.0 293.0Q966 269 1026 269H1188Q1249 269 1272.0 293.0Q1295 317 1295 382V553H1055V655Q1055 697 1066.0 712.0Q1077 727 1108 727Q1139 727 1149.5 712.0Q1160 697 1160 657V624H1295V687Q1295 751 1271.5 775.5Q1248 800 1188 800ZM1055 476H1160V412Q1160 370 1149.5 355.0Q1139 340 1108 340Q1077 340 1066.0 355.5Q1055 371 1055 414Z","M1343 800V269H1619Q1680 269 1703.5 293.5Q1727 318 1727 383V800H1590V418Q1590 374 1578.5 358.5Q1567 343 1535 343Q1504 343 1492.5 356.5Q1481 370 1481 403V800Z"]},"Call":{"adv":1239,"d":["M152 801Q84 801 55.5 772.0Q27 743 27 673V227Q27 156 55.5 127.5Q84 99 152 99H309Q377 99 405.0 128.0Q433 157 433 227V325H293V262Q293 215 279.5 197.5Q266 180 231 180Q194 180 181.0 197.5Q168 215 168 262V639Q168 685 181.0 702.5Q194 720 231 720Q266 720 279.5 702.5Q293 685 293 639V553H433V673Q433 743 405.0 772.0Q377 801 309 801Z","M572 800Q518 800 493.0 775.0Q468 750 468 697V652Q468 606 485.0 578.0Q502 550 544 522L656 445Q683 427 692.0 414.0Q701 401 701 383Q701 342 654 342Q628 342 617.0 355.0Q606 368 606 401V437H478V381Q478 320 503.0 294.5Q528 269 586 269H726Q784 269 807.0 292.0Q830 315 830 373V800ZM650 726Q679 726 689.0 712.0Q699 698 699 663V512L643 560Q616 581 606.5 602.0Q597 623 597 667Q598 700 609.5 713.0Q621 726 650 726Z","M881 800V100H1021V800Z","M1073 800V100H1213V800Z"]},"30":{"adv":873,"d":["M136 801Q72 801 45.5 773.5Q19 746 19 680V582H155V651Q155 693 166.5 708.0Q178 723 210 723Q242 723 253.5 708.0Q265 693 265 651V532Q265 497 252.0 483.5Q239 470 205 470H152V372H207Q239 372 252.0 357.5Q265 343 265 309V248Q265 207 253.5 192.0Q242 177 210 177Q179 177 167.5 192.0Q156 207 156 248V292H23V221Q23 154 49.5 126.5Q76 99 140 99H281Q346 99 372.0 126.5Q398 154 398 221V316Q398 407 320 422Q364 429 383.0 456.0Q402 483 402 537V680Q402 747 375.5 774.0Q349 801 284 801Z","M573 801Q509 801 482.5 773.5Q456 746 456 680V220Q456 153 482.5 126.0Q509 99 573 99H728Q793 99 819.0 126.5Q845 154 845 220V680Q845 747 818.5 774.0Q792 801 728 801ZM650 723Q684 723 696.0 707.0Q708 691 708 647V253Q708 209 696.0 193.0Q684 177 650 177Q616 177 604.0 193.0Q592 209 592 253V647Q592 691 604.0 707.0Q616 723 650 723Z"]},"Sep":{"adv":1283,"d":["M139 801Q75 801 46.0 771.5Q17 742 17 679V564H149V644Q149 685 162.5 702.5Q176 720 210 720Q244 720 257.0 704.5Q270 689 270 652Q270 629 260.5 606.5Q251 584 219 548L99 413Q70 382 53.5 357.5Q37 333 30.5 308.5Q24 284 24 253V219Q24 157 53.0 128.0Q82 99 144 99H283Q346 99 375.0 128.0Q404 157 404 220V317H271V250Q271 211 258.0 195.5Q245 180 214 180Q183 180 170.5 193.0Q158 206 158 238Q158 259 167.5 277.5Q177 296 199 320L317 448Q355 487 375.0 516.0Q395 545 403.0 571.0Q411 597 411 629V678Q411 742 381.5 771.5Q352 801 288 801Z","M558 800Q497 800 473.5 775.5Q450 751 450 687V382Q450 317 474.0 293.0Q498 269 558 269H720Q781 269 804.0 293.0Q827 317 827 382V553H587V655Q587 697 598.0 712.0Q609 727 640 727Q671 727 681.5 712.0Q692 697 692 657V624H827V687Q827 751 803.5 775.5Q780 800 720 800ZM587 476H692V412Q692 370 681.5 355.0Q671 340 640 340Q609 340 598.0 355.5Q587 371 587 414Z","M1153 269Q1214 269 1237.5 293.5Q1261 318 1261 383V687Q1261 751 1237.5 775.5Q1214 800 1153 800H1013V969H875V269ZM1068 343Q1037 343 1025.0 357.0Q1013 371 1013 405V664Q1013 698 1025.0 712.0Q1037 726 1068 726Q1100 726 1112.0 710.0Q1124 694 1124 651V418Q1124 374 1112.0 358.5Q1100 343 1068 343Z"]}};
  const INK = {"Until 30 Sep":{"ink":3.892,"lsb":0.03},"Open Call":{"ink":3.064,"lsb":0.027},"Open":{"ink":1.7,"lsb":0.027},"Call":{"ink":1.186,"lsb":0.027},"30 Sep":{"ink":2.241,"lsb":0.019},"30":{"ink":0.826,"lsb":0.019},"Sep":{"ink":1.244,"lsb":0.017}};
  const SVG = 'http://www.w3.org/2000/svg';
  const EDGE = 12, TITLE = 20, LEAD = 20, CLEAR = 12, COL_GAP = 20, DESC = .169;
  const HINT_DELAY = 1100, PASS = 1800, BAND = .36, SKEW = .35;
  // Блоки надписи по раскладке: строки из слов; индекс строки ведёт волну наискосок.
  const LAYOUTS = {
    c:  {desktop: [[['Open', 'Call']]], mobile: [[['Open'], ['Call']]]},
    c2: {desktop: [[['Open', 'Call']]], mobile: [[['Open'], ['Call']]]},
    d:  {desktop: [[['Open', 'Call'], ['Open', 'Call'], ['30', 'Sep']]], mobile: [[['Open'], ['Call'], ['30', 'Sep']]]},
    d2: {desktop: [[['Open', 'Call']], [['30', 'Sep']]], mobile: [[['Open', 'Call']], [['30'], ['Sep']]]},
    d3: {desktop: [[['Until', '30', 'Sep']], [['Open', 'Call']]], mobile: [[['Until', '30', 'Sep']], [['Open'], ['Call']]]},
  };
  const key = words => words.join(' ');

  window.createSynoEcho = function ({host, layout = 'c', span = 4, align = 'left', onHintState = () => {}}) {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const narrow = matchMedia('(max-width: 1023px)');
    const copy = host.querySelector('.hero-copy');
    const meta = host.querySelector('.hero-meta');
    const art = document.createElement('div');
    art.className = 'open-call-echo'; art.setAttribute('aria-hidden', 'true');
    host.insertBefore(art, host.querySelector('.hero-scrim') || copy);
    let blocks = [], paths = [], active = false, played = false, raf = 0, timer = 0, startAt = 0, bp = '';

    function build() {
      const next = narrow.matches ? 'mobile' : 'desktop';
      if (next === bp) return;
      bp = next; art.textContent = ''; let row = 0;
      blocks = LAYOUTS[layout][bp].map(rows => {
        const el = document.createElement('div'); el.className = 'echo-block';
        const rowEls = rows.map(words => {
          const r = document.createElement('div'); r.className = 'echo-row';
          for (const w of words) {
            const svg = document.createElementNS(SVG, 'svg');
            svg.setAttribute('viewBox', `0 0 ${WORDS[w].adv} 900`);
            svg.style.width = WORDS[w].adv / 1000 + 'em';
            for (const d of WORDS[w].d) {
              const p = document.createElementNS(SVG, 'path');
              p.setAttribute('d', d); p.dataset.r = row; svg.appendChild(p);
            }
            r.appendChild(svg);
          }
          row++; el.appendChild(r);
          return {el: r, words};
        });
        art.appendChild(el);
        return {el, rows: rowEls};
      });
      paths = Array.from(art.querySelectorAll('path')).map(el => ({el, row: +el.dataset.r, x: 0, hollow: false}));
    }
    // Ставит блок так, чтобы край первой буквы встал на inkLeft, а верх заглавной — на capTop.
    function place(b, em, inkLeft, capTop) {
      const first = INK[key(b.rows[0].words)].lsb;
      b.el.style.fontSize = em + 'px';
      b.el.style.left = inkLeft - first * em + 'px';
      b.el.style.top = capTop - .1 * em + 'px';
      for (const r of b.rows) r.el.style.marginLeft = (first - INK[key(r.words)].lsb) * em + 'px';
    }
    const ink = (b, i = 0) => INK[key(b.rows[i].words)].ink;
    function setCopy(style) {
      copy.removeAttribute('style');
      Object.assign(copy.style, {position: 'absolute', padding: '0', maxWidth: 'none', top: 'auto', right: 'auto', bottom: 'auto', left: 'auto'}, style);
    }
    // Последняя базовая линия меты от низа её блока (Schengen A: ascent .975, descent .275).
    function metaBaseFromBottom() {
      const cs = getComputedStyle(meta), fs = parseFloat(cs.fontSize), lh = parseFloat(cs.lineHeight);
      return (lh - 1.25 * fs) / 2 + .275 * fs;
    }
    const h1Size = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fs-h1')) || (bp === 'mobile' ? 56 : 84);

    function layoutNow() {
      if (!host.clientWidth) return;
      build();
      const W = host.clientWidth, H = host.clientHeight, CW = W - 2 * EDGE, col = (CW - COL_GAP) / 2;
      const [b1, b2] = blocks, mobile = bp === 'mobile';
      const stack = {display: 'flex', flexDirection: 'column', gap: '8px'};
      if (layout === 'c' || layout === 'c2') {
        setCopy(mobile ? {...stack, left: EDGE + 'px', right: EDGE + 'px', bottom: EDGE + 'px'}
          : {display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: COL_GAP + 'px', left: EDGE + 'px', right: EDGE + 'px', bottom: EDGE + 'px'});
        const copyTop = H - EDGE - copy.offsetHeight;
        const rows = b1.rows.length, lastDesc = rows === 1 ? DESC : 0;   // «Call» внизу без выносного
        const maxEm = (copyTop - LEAD - TITLE) / (.7 + .9 * (rows - 1) + lastDesc);
        const em = Math.min(CW / ink(b1), maxEm);
        const cap = layout === 'c2' ? TITLE : copyTop - LEAD - (lastDesc + .7 + .9 * (rows - 1)) * em;
        place(b1, em, EDGE, cap);
      } else if (layout === 'd') {
        if (mobile) {
          setCopy({...stack, left: EDGE + 'px', right: EDGE + 'px', bottom: EDGE + 'px'});
          const em = Math.min(CW / INK['30 Sep'].ink, (H - EDGE - copy.offsetHeight - LEAD - TITLE) / (2.5 + DESC));
          place(b1, em, EDGE, TITLE);
        } else {
          const em = Math.min(col / INK['Open Call'].ink, (H - 2 * TITLE) / (2.5 + DESC));
          const base = H - TITLE - DESC * em;
          place(b1, em, EDGE, base - 2.5 * em);
          setCopy({...stack, left: EDGE + col + COL_GAP + 'px', width: col + 'px', bottom: H - base - metaBaseFromBottom() + 'px'});
        }
      } else if (layout === 'd2') {
        if (mobile) {
          setCopy({...stack, left: EDGE + 'px', right: EDGE + 'px', bottom: EDGE + 'px'});
          const e1 = CW / ink(b1), p1 = TITLE + (.7 + DESC) * e1;
          place(b1, e1, EDGE, TITLE);
          const e2 = Math.min(CW / INK['Sep'].ink, (H - EDGE - copy.offsetHeight - LEAD - p1 - CLEAR) / (1.6 + DESC));
          place(b2, e2, EDGE, p1 + CLEAR);
        } else {
          const e1 = Math.min(CW / ink(b1), (H - 3 * TITLE) / (.7 + .869 * .75));   // дата не мельче 3/4 имени
          const cap2 = TITLE + .7 * e1 + LEAD;
          const e2 = (H - TITLE - cap2) / (.7 + DESC), base2 = cap2 + .7 * e2;
          const left2 = W - EDGE - ink(b2) * e2;
          place(b1, e1, EDGE, TITLE); place(b2, e2, left2, cap2);
          setCopy({...stack, left: EDGE + 'px', width: Math.max(160, left2 - COL_GAP - EDGE) + 'px', bottom: H - base2 - metaBaseFromBottom() + 'px'});
        }
      } else if (layout === 'd3') {
        // Срок заголовком H1 («Until 30 Sep»), под ним на 20 одна строка — аудитория и программа;
        // «Open Call» — главное слово, прижато к низу на 20 (правка заказчицы в Draft, 19 сентября 2026).
        const e1 = h1Size();
        place(b1, e1, EDGE, TITLE);
        const copyTop = TITLE + .7 * e1 + LEAD;
        setCopy({...stack, left: EDGE + 'px', right: EDGE + 'px', top: copyTop + 'px'});
        const room = H - TITLE - (copyTop + copy.offsetHeight + 2 * LEAD);
        if (mobile) {
          const e2 = Math.min(CW / INK['Open'].ink, room / 1.6);
          place(b2, e2, EDGE, H - TITLE - 1.6 * e2);
        } else {
          // span — сколько колонок сетки 4 × 307 занимает «Open Call» (проба размера, 19 сентября 2026)
          const spanW = W * span / 4 - 2 * EDGE;
          const e2 = Math.min(spanW / ink(b2), room / (.7 + DESC));
          const left = align === 'right' ? W - EDGE - ink(b2) * e2 : EDGE;
          place(b2, e2, left, H - TITLE - (.7 + DESC) * e2);
        }
      }
      measure();
    }
    function measure() {
      const rects = blocks.map(b => b.el.getBoundingClientRect());
      const left = Math.min(...rects.map(r => r.left)), width = Math.max(...rects.map(r => r.right)) - left || 1;
      for (const p of paths) { const r = p.el.getBoundingClientRect(); p.x = (r.left + r.width / 2 - left) / width; }
    }
    function set(p, hollow) { if (p.hollow !== hollow) { p.hollow = hollow; p.el.classList.toggle('is-hollow', hollow); } }
    function rest() { for (const p of paths) set(p, false); }
    // Полоса идёт наискосок: x буквы по всей надписи плюс сдвиг строки.
    function renderAt(t) {
      const rows = 1 + Math.max(...paths.map(p => p.row)), span = 1 + SKEW * (rows - 1);
      const pos = -BAND + (span + 2 * BAND) * Math.min(1, t / PASS);
      for (const p of paths) set(p, Math.abs(p.x + p.row * SKEW - pos) < BAND / 2);
    }
    function frame(now) {
      raf = 0;
      const t = now - startAt;
      renderAt(t);
      if (t < PASS && active) raf = requestAnimationFrame(frame);
      else { rest(); onHintState('complete'); }
    }
    function cancel() { clearTimeout(timer); timer = 0; cancelAnimationFrame(raf); raf = 0; rest(); }
    function play(delay) {
      cancel();
      if (reduced.matches || !active) { onHintState(reduced.matches ? 'unavailable' : 'complete'); return; }
      played = true; onHintState(delay ? 'waiting' : 'playing');
      timer = setTimeout(() => { timer = 0; measure(); startAt = performance.now(); onHintState('playing'); raf = requestAnimationFrame(frame); }, delay);
    }
    const ro = new ResizeObserver(layoutNow); ro.observe(host);
    narrow.addEventListener('change', layoutNow);
    reduced.addEventListener('change', () => { if (reduced.matches) cancel(); });
    if (document.fonts) document.fonts.ready.then(layoutNow);
    layoutNow();
    return {
      // Один проход после паузы при первом показе слайда; уход со слайда гасит волну.
      sync(value) {
        const next = Boolean(value);
        if (next === active) return;
        active = next;
        if (active && !played) play(HINT_DELAY); else if (!active) cancel();
      },
      stop() { this.sync(false); },
      replay() { if (active) play(0); },
      // Статичный кадр прохода — для стенда и проверки без анимации.
      renderAt(t) { measure(); t < 0 ? rest() : renderAt(t); },
      destroy() { cancel(); ro.disconnect(); art.remove(); copy.removeAttribute('style'); },
    };
  };
})();
