#!/usr/bin/env node
// Снимает путь Save настоящими кликами в одной сессии браузера: главная -> гейт ->
// регистрация -> имя -> возврат к той же карточке -> меню -> Favourites нового аккаунта. Снимки 2x и координаты
// целей для курсора кладёт в assets-syno-case/films/source-save.
// Нужен сервер на BASE (по умолчанию http://localhost:8791, корень Portfolio).
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const puppeteer = require(process.env.PUPPETEER_CORE || '/Users/vikitoria/.npm/_npx/f707fa550ae11110/node_modules/puppeteer-core');
const BASE = process.env.BASE || 'http://localhost:8791';
const OUT = new URL('../assets-syno-case/films/source-save/', import.meta.url).pathname;
const TITLE = 'Limassol Art Walk 2026';
const NAME = ['Anna', 'Ioannou'];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--hide-scrollbars'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });
const coords = {};
const shot = async name => { await page.screenshot({ path: OUT + name + '.png' }); console.log(name, '|', page.url(), '| y', await page.evaluate(() => scrollY)); };
const rect = async (name, fn, arg) => {
  const r = await page.evaluate(fn, arg);
  if (!r) throw new Error('no target: ' + name);
  coords[name] = r; return r;
};
const box = e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
const heart = `(t => { const e = [...document.querySelectorAll('.coming-save')].find(b => b.dataset.save === t); return e; })`;

// Ручной выбор вкладки афиши останавливает автоплей: кадры одной сцены не должны разъехаться.
const stopHero = () => page.evaluate(() => document.querySelector('.hero-tab')?.click());
const xy = fn => page.evaluate(fn);
const ease = t => 1 - Math.pow(1 - t, 3);

await page.goto(BASE + '/syno-prototype/proto-home.html?case=promo', { waitUntil: 'networkidle2', timeout: 60000 });
await stopHero(); await sleep(800);
await page.evaluate(`${heart}(${JSON.stringify(TITLE)}).scrollIntoView({ block: 'center', behavior: 'instant' })`);
await page.mouse.move(4, 4); await sleep(1000);
await shot('home-card');
const h = await rect('heart', new Function('t', `const e = ${heart}(t); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };`), TITLE);
await page.mouse.move(h.x, h.y, { steps: 8 }); await sleep(600);
await shot('home-hover');
await page.mouse.click(h.x, h.y); await sleep(800);
await shot('guest-gate');
const c = await rect('continue', () => { const r = document.getElementById('gate-continue').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
await page.mouse.move(c.x, c.y, { steps: 6 }); await sleep(500); await shot('gate-hover');
await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }), page.mouse.click(c.x, c.y)]);
await sleep(1000);
// Гейт обещает бесплатный аккаунт, поэтому Continue открывает Create your account: человек новый
// и видит в кабинете только то, что сохранил. Вход демо-персоны показывал чужие события и избранное.
await shot('signup');
const g = await rect('google', () => { const e = [...document.querySelectorAll('[data-signin]:not([data-signin="returning"])')].find(b => b.offsetParent); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
await page.mouse.move(g.x, g.y, { steps: 6 }); await sleep(500); await shot('signup-hover');
await page.mouse.click(g.x, g.y); await sleep(1000);
await page.addStyleTag({ content: 'input { caret-color: transparent; }' });
await shot('welcome');
const field = await rect('name', () => { const r = document.getElementById('onb-firstname').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
await page.mouse.move(field.x, field.y, { steps: 6 }); await sleep(300); await page.mouse.click(field.x, field.y); await sleep(250);
await shot('name-00');
let typed = 0;
for (const part of NAME) {
  for (const ch of part) { await page.keyboard.type(ch); await sleep(40); await shot('name-' + String(++typed).padStart(2, '0')); }
  await page.keyboard.press('Tab'); await sleep(120);
}
coords.typed = typed;
const w = await rect('welcome', () => { const e = [...document.querySelectorAll('#screen-welcome .btn')].find(b => b.offsetParent && /Continue/.test(b.textContent)); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
await page.mouse.move(w.x, w.y, { steps: 6 }); await sleep(500); await shot('welcome-hover');
await Promise.all([page.waitForNavigation({ waitUntil: 'load', timeout: 30000 }), page.mouse.click(w.x, w.y)]);
const rest = { x: h.x - 70, y: h.y + 14 }; coords.rest = rest;
await stopHero(); await page.mouse.move(rest.x, rest.y); await sleep(500);
console.log('toast', await page.evaluate(() => document.getElementById('toast')?.textContent.trim().slice(0, 90)));
await shot('home-saved');
await page.evaluate(() => { document.getElementById('toast').style.display = 'none'; }); await sleep(120);
await shot('home-saved-clean');
// Шапка на главной не липнет: к меню аккаунта человек возвращается прокруткой.
const y0 = await page.evaluate(() => scrollY); const STEPS = 14;
for (let i = 1; i <= STEPS; i++) {
  await page.evaluate(v => window.scrollTo({ top: v, behavior: 'instant' }), Math.round(y0 * (1 - ease(i / STEPS))));
  const c0 = await page.evaluate(() => { const r = document.getElementById('ctx-switch').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await page.mouse.move(rest.x + (c0.x - rest.x) * i / STEPS, rest.y + (50 - rest.y) * i / STEPS);
  await sleep(40); await shot('scroll-' + String(i).padStart(2, '0'));
}
const m = await rect('chip', () => { const e = document.getElementById('ctx-switch'); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
await page.mouse.move(m.x, m.y, { steps: 6 }); await sleep(500); await shot('chip-hover'); await page.mouse.click(m.x, m.y); await sleep(600);
await shot('menu');
const f = await rect('favourites', () => { const e = [...document.querySelectorAll('#ctx-menu a')].find(a => /fav=1/.test(a.href)); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, href: e.getAttribute('href') }; });
await page.mouse.move(f.x, f.y, { steps: 6 }); await sleep(500);
await shot('menu-hover');
const nav = page.waitForNavigation({ waitUntil: 'load', timeout: 20000 }).catch(e => console.log('nav:', e.message));
await page.mouse.click(f.x, f.y); await nav;
await sleep(2600);
await shot('favourites');
fs.writeFileSync(OUT + 'coords.json', JSON.stringify(coords, null, 1));
console.log(JSON.stringify(coords));
await browser.close();
