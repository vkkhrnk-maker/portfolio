#!/usr/bin/env node
// Снимает редактор работ настоящими кликами: профиль -> Edit profile -> Works -> Add a work ->
// три снимка одной работы -> заполненные поля. Десктоп 1280x800 и телефон 375x812, оба 2x.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const puppeteer = require(process.env.PUPPETEER_CORE || '/Users/vikitoria/.npm/_npx/f707fa550ae11110/node_modules/puppeteer-core');
const BASE = process.env.BASE || 'http://localhost:8791';
const OUT = new URL('../assets-syno-case/films/source-editor/', import.meta.url).pathname;
const URLP = BASE + '/syno-prototype/proto-registry.html?case=promo&signed=1#myprofile:published';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--hide-scrollbars'] });
const center = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
const dropFiles = page => page.evaluate(async base => {
  const dt = new DataTransfer();
  for (const n of ['work-1.jpg', 'work-2.jpg', 'work-3.jpg']) {
    const blob = await (await fetch(base + '/assets-syno-case/films/source-editor/' + n)).blob();
    dt.items.add(new File([blob], n, { type: 'image/jpeg' }));
  }
  const z = document.querySelector('#modal-card .dnd-zone');
  for (const t of ['dragenter', 'dragover', 'drop']) z.dispatchEvent(new DragEvent(t, { bubbles: true, cancelable: true, dataTransfer: dt }));
}, BASE);
const fill = page => page.evaluate(() => {
  const card = document.getElementById('modal-card');
  const set = (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
  const inputs = [...card.querySelectorAll('input')];
  set(inputs.find(i => i.placeholder === 'Work title'), 'Primavera');
  set(inputs.find(i => /e\.g\. 20/.test(i.placeholder)), '2024');
});

// Desktop film
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });
  page.on('dialog', async d => { console.log('DIALOG', JSON.stringify(d.message())); await d.accept(); });
  const coords = {};
  const shot = async n => { await page.screenshot({ path: OUT + n + '.png' }); console.log(n); };
  await page.goto(URLP, { waitUntil: 'networkidle2', timeout: 60000 }); await sleep(1500);
  await page.mouse.move(800, 620); await sleep(500);
  await shot('profile');
  // Настоящая мышь: кадр с ховером снимается до клика, ховер приходит переходом 0,15 с.
  const hover = async (name, sel) => { const c = await center(page, sel); if (!c) throw new Error('no ' + sel); coords[name] = c; await page.mouse.move(c.x, c.y, { steps: 6 }); await sleep(500); await shot(name + '-hover'); return c; };
  const press = async (name, sel, wait = 1100) => { const c = await hover(name, sel); await page.mouse.click(c.x, c.y); await sleep(wait); };
  await press('edit', '.myp-edit-profile-btn', 1500); await shot('main');
  await press('rail', '.myp-drawer-rail-item[data-edit-section="work"]'); await shot('works');
  // Порядок работ: ручка строки, настоящая мышь, первая работа открывает портфолио.
  const rows = await page.evaluate(() => [...document.querySelectorAll('#modal-card .myp-wlist-row')].map(r => { const g = r.querySelector('[data-wgrip]').getBoundingClientRect(); return { x: g.left + g.width / 2, y: g.top + g.height / 2 }; }));
  const from = rows[3], to = rows[0];
  coords.grip = from; coords.gripTo = { x: to.x, y: to.y - 8 };
  await page.mouse.move(from.x, from.y, { steps: 6 }); await sleep(500); await shot('row-hover');
  await page.mouse.down(); await sleep(150);
  const DRAG = 12;
  for (let i = 1; i <= DRAG; i++) { await page.mouse.move(from.x, from.y + (coords.gripTo.y - from.y) * i / DRAG); await sleep(90); await shot('row-' + String(i).padStart(2, '0')); }
  await page.mouse.up(); await sleep(450); await shot('row-done');
  await page.evaluate(() => { const t = document.getElementById('toast'); if (t) t.style.display = 'none'; }); await sleep(100); await shot('row-clean');
  console.log('order', await page.evaluate(() => [...document.querySelectorAll('#modal-card .myp-wlist-row')].slice(0, 3).map(r => r.innerText.split('\n')[0])));
  await press('add', '#myp-work-add-open'); await shot('add');
  const zone = await hover('zone', '#modal-card .dnd-zone');
  // Диалог выбора файлов в безголовом браузере открывается не всегда: тогда те же файлы приходят через drop.
  try {
    const [chooser] = await Promise.all([page.waitForFileChooser({ timeout: 8000 }), page.mouse.click(zone.x, zone.y)]);
    await chooser.accept(['work-1.jpg', 'work-2.jpg', 'work-3.jpg'].map(n => OUT + n));
  } catch { console.log('chooser fallback'); await dropFiles(page); }
  await sleep(350); await shot('uploading');
  await page.waitForFunction(() => { const t = document.querySelectorAll('#modal-card .dnd-previews .dnd-thumb'); return t.length === 3 && !document.querySelector('#modal-card .dnd-thumb.loading'); }, { timeout: 15000 });
  await sleep(500); await shot('files');
  // Обложка: клик по Make cover, снимок перелетает на первое место. Анимацию ставим на паузу
  // и снимаем по шагам, поэтому кадры ровные, а движение настоящее.
  const tiles = await page.evaluate(() => [...document.querySelectorAll('#modal-card .dnd-previews .dnd-thumb')].map(t => { const r = t.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }));
  coords.tile = tiles[2];
  await page.mouse.move(tiles[2].x, tiles[2].y, { steps: 6 }); await sleep(500); await shot('tile-hover');
  const mk = await page.evaluate(() => { const b = [...document.querySelectorAll('#modal-card .dnd-thumb-makecover')].pop(); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  coords.make = mk;
  await page.mouse.move(mk.x, mk.y, { steps: 4 }); await sleep(450); await shot('make-hover');
  await page.mouse.click(mk.x, mk.y);
  await page.evaluate(() => document.getAnimations().forEach(a => a.pause()));
  const FLY = 14;
  for (let i = 1; i <= FLY; i++) { await page.evaluate(t => document.getAnimations().forEach(a => { if (a.effect.getTiming().duration === 400) a.currentTime = t; }), 400 * i / FLY); await sleep(30); await shot('fly-' + String(i).padStart(2, '0')); }
  await page.evaluate(() => document.getAnimations().forEach(a => { if (a.effect.getTiming().duration === 400) a.finish(); }));
  await sleep(500); await shot('tile-done');
  const field = async (name, match) => {
    const c = await page.evaluate(m => { const e = [...document.querySelectorAll('#modal-card input')].find(i => i.placeholder === m); e.id = e.id || 'film-' + m.replace(/\W/g, ''); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, id: e.id }; }, match);
    coords[name] = c; await page.mouse.move(c.x, c.y, { steps: 6 }); await sleep(500); await shot(name + '-hover');
    await page.mouse.click(c.x, c.y); await sleep(300); await shot(name + '-focus');
    return c;
  };
  await field('title', 'Work title');
  let i = 0; for (const ch of 'Primavera') { await page.keyboard.type(ch); await sleep(60); await shot('title-' + String(++i).padStart(2, '0')); }
  await field('year', 'e.g. 2024');
  i = 0; for (const ch of '2024') { await page.keyboard.type(ch); await sleep(60); await shot('year-' + String(++i).padStart(2, '0')); }
  // Ниже Year: скролл формы настоящим колесом, обязательный Medium, размеры, материалы, сохранение.
  const padded = n => String(n).padStart(2, '0');
  const wheel = async (prefix, total, steps) => { for (let k = 1; k <= steps; k++) { await page.mouse.wheel({ deltaY: total / steps }); await sleep(70); await shot(prefix + '-' + padded(k)); } };
  const park = await page.evaluate(() => { const r = document.querySelector('#modal-card .myp-drawer-content').getBoundingClientRect(); return { x: r.right - 10, y: r.top + r.height * 0.5 }; });
  coords.park = park;
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.mouse.move(park.x, park.y, { steps: 6 }); await sleep(450); await shot('park');
  await wheel('scrollA', 190, 12);
  const trigger = await hover('medium', '#myp-w-medium .dropdown-trigger');
  await page.mouse.click(trigger.x, trigger.y); await sleep(450); await shot('medium-open');
  const opt = await page.evaluate(() => { const e = [...document.querySelectorAll('#myp-w-medium *, .dropdown-menu *')].filter(x => x.children.length === 0 && x.textContent.trim() === 'Painting' && x.getClientRects().length).pop(); if (!e) return null; const h = e.closest('[role=option], button, li, .dropdown-item') || e; const r = h.getBoundingClientRect(); return { x: r.left + Math.min(r.width / 2, 120), y: r.top + r.height / 2 }; });
  if (!opt) throw new Error('no Painting option');
  coords.option = opt;
  await page.mouse.move(opt.x, opt.y, { steps: 5 }); await sleep(450); await shot('option-hover');
  await page.mouse.click(opt.x, opt.y); await sleep(450); await shot('medium-done');
  const typed = async (name, sel, text) => {
    const c = await center(page, sel); coords[name] = c;
    await page.mouse.move(c.x, c.y, { steps: 6 }); await sleep(450); await shot(name + '-hover');
    await page.mouse.click(c.x, c.y); await sleep(250); await shot(name + '-focus');
    let k = 0; for (const ch of text) { await page.keyboard.type(ch); await sleep(40); await shot(name + '-' + padded(++k)); }
    return text.length;
  };
  coords.dimsLen = await typed('dims', '#myp-w-dimensions', '120 × 90 cm');
  coords.matLen = await typed('mat', '#myp-w-materials', 'Oil on linen');
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.mouse.move(park.x, park.y, { steps: 6 }); await sleep(450); await shot('park2');
  await wheel('scrollB', 170, 9);
  const save = await hover('save', '#myp-work-add-local');
  await page.mouse.click(save.x, save.y); await sleep(700); await shot('saved');
  console.log('after save', JSON.stringify(await page.evaluate(() => ({ head: document.querySelector('#modal-card')?.innerText.slice(0, 60), rows: [...document.querySelectorAll('#modal-card .myp-wlist-row')].map(r => r.innerText.split('\n')[0]) }))));
  await sleep(3600);
  await page.evaluate(() => { const t = document.getElementById('toast'); if (t) t.style.display = 'none'; }); await sleep(120); await shot('list-clean');
  const close = await page.evaluate(() => { const e = [...document.querySelectorAll('#modal-card button, #modal-overlay button, .modal-overlay button')].filter(b => b.getClientRects().length).find(b => /close/i.test(b.getAttribute('aria-label') || '') || /^(close|×)$/i.test(b.textContent.trim())); if (!e) return null; e.id = e.id || 'film-close'; return '#' + e.id; });
  if (!close) throw new Error('no close button');
  await press('close', close, 900);
  const dialog = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.getClientRects().length && /discard changes/i.test(x.textContent)); return b ? true : false; });
  console.log('discard dialog', dialog);
  await sleep(600); await shot('back');
  const target = await page.evaluate(() => { const e = [...document.querySelectorAll('#screen-myprofile *')].filter(x => x.children.length === 0 && x.textContent.trim().startsWith('Primavera') && x.getClientRects().length).pop(); if (!e) return null; const r = e.getBoundingClientRect(); return { y: r.top + scrollY, text: e.textContent.trim().slice(0, 30) }; });
  console.log('target', JSON.stringify(target));
  if (!target) throw new Error('no Primavera on the profile');
  const parkP = { x: 1215, y: 420 }; coords.parkP = parkP;
  await page.mouse.move(parkP.x, parkP.y, { steps: 6 }); await sleep(450); await shot('back-park');
  const dist = Math.round(target.y - 500 - await page.evaluate(() => scrollY));
  coords.pageDist = dist;
  await wheel('scrollP', dist, 22);
  await sleep(700); await shot('end');
  // Дальше камера идёт по странице: сведения, практика и CV, профиль целиком.
  const cvTop = await page.evaluate(() => { const e = document.getElementById('myp-cv-row'); return e.getBoundingClientRect().top; });
  coords.pageDist2 = Math.round(cvTop + 260);
  await wheel('scrollQ', coords.pageDist2, 20);
  await sleep(600); await shot('end2');
  fs.writeFileSync(OUT + 'coords.json', JSON.stringify(coords, null, 1));
  await page.close();
}

// Phone still
{
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(URLP, { waitUntil: 'networkidle2', timeout: 60000 }); await sleep(1500);
  await page.evaluate(() => document.querySelector('.myp-edit-profile-btn').click()); await sleep(1300);
  await page.evaluate(() => { const e = [...document.querySelectorAll('[data-edit-section="work"]')].find(x => x.offsetParent); e.click(); }); await sleep(900);
  await page.evaluate(() => document.getElementById('myp-work-add-open').click()); await sleep(1000);
  await dropFiles(page);
  await page.waitForFunction(() => { const t = document.querySelectorAll('#modal-card .dnd-previews .dnd-thumb'); return t.length === 3 && !document.querySelector('#modal-card .dnd-thumb.loading'); }, { timeout: 15000 });
  await fill(page); await sleep(300);
  await page.evaluate(() => document.querySelector('#modal-card .dnd-previews').scrollIntoView({ block: 'center', behavior: 'instant' })); await sleep(400);
  await page.screenshot({ path: OUT + 'phone.png' }); console.log('phone');
  await page.close();
}
await browser.close();
