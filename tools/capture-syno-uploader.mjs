#!/usr/bin/env node
// Загрузчик крупно: выбор файлов, прогресс, ошибка и повтор на плитке, Make cover.
// Прототип считает файл с fail в имени неудачным, повтор проходит.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const puppeteer = require(process.env.PUPPETEER_CORE || '/Users/vikitoria/.npm/_npx/f707fa550ae11110/node_modules/puppeteer-core');
const BASE = process.env.BASE || 'http://localhost:8791';
const SRC = new URL('../assets-syno-case/films/source-editor/', import.meta.url).pathname;
const OUT = new URL('../assets-syno-case/films/source-uploader/', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--hide-scrollbars'] });
const page = await browser.newPage(); await page.setCacheEnabled(false);
await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 3 });
await page.goto(BASE + '/syno-prototype/proto-registry.html?case=promo&signed=1#myprofile:published', { waitUntil: 'networkidle2', timeout: 60000 }); await sleep(1200);
await page.evaluate(() => document.querySelector('.myp-edit-profile-btn').click()); await sleep(1000);
await page.evaluate(() => document.querySelector('.myp-drawer-rail-item[data-edit-section="work"]').click()); await sleep(700);
await page.evaluate(() => document.getElementById('myp-work-add-open').click()); await sleep(900);
const clip = await page.evaluate(() => { const u = document.querySelector('#modal-card .media-uploader'); const r = u.getBoundingClientRect(); return { x: Math.floor(r.left) - 2, y: Math.floor(r.top) - 2, width: Math.ceil(r.width) + 4, height: 408 }; });
await page.addStyleTag({ content: '#modal-card .media-uploader ~ * { visibility: hidden !important; }' });
let n = 0; const T = [];
const shot = async () => { const name = String(++n).padStart(3, '0'); await page.screenshot({ path: `${OUT}${name}.png`, clip, captureBeyondViewport: false }); return name; };
const at = sel => page.evaluate(s => { const e = [...document.querySelectorAll(s)].filter(x => x.getClientRects().length).pop(); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
await page.mouse.move(clip.x + clip.width - 40, clip.y + 330); await sleep(300);
T.push({ op: 'start', pos: { x: clip.x + clip.width - 40, y: clip.y + 330 } });
T.push({ op: 'base', img: await shot() }); T.push({ op: 'hold', hold: 0.4 });
const z = await at('#modal-card .dnd-zone');
await page.mouse.move(z.x, z.y, { steps: 5 }); await sleep(450);
T.push({ op: 'move', to: z, img: await shot(), dur: 0.45 }); T.push({ op: 'hold', hold: 0.3 }); T.push({ op: 'click' });
const [ch] = await Promise.all([page.waitForFileChooser({ timeout: 5000 }), page.mouse.click(z.x, z.y)]);
await ch.accept(['work-1.jpg', 'work-fail.jpg', 'work-3.jpg'].map(f => SRC + f));
const prog = [];
for (let i = 0; i < 40; i++) { prog.push(await shot()); const busy = await page.evaluate(() => !!document.querySelector('#modal-card .dnd-thumb.loading')); if (!busy) break; await sleep(40); }
T.push({ op: 'frames', imgs: prog, each: 3 });
await sleep(500);
T.push({ op: 'fade', img: await shot(), dur: 0.12 }); T.push({ op: 'hold', hold: 0.6 });
const retry = await at('#modal-card .dnd-retry');
await page.mouse.move(retry.x, retry.y, { steps: 5 }); await sleep(450);
T.push({ op: 'move', to: retry, img: await shot(), dur: 0.4 }); T.push({ op: 'hold', hold: 0.3 }); T.push({ op: 'click' });
await page.mouse.click(retry.x, retry.y);
const again = [];
for (let i = 0; i < 30; i++) { again.push(await shot()); const busy = await page.evaluate(() => !!document.querySelector('#modal-card .dnd-thumb.loading')); if (!busy) break; await sleep(30); }
T.push({ op: 'frames', imgs: again, each: 3 });
await sleep(500); T.push({ op: 'fade', img: await shot(), dur: 0.1 }); T.push({ op: 'hold', hold: 0.4 });
const last = await page.evaluate(() => { const t = [...document.querySelectorAll('#modal-card .dnd-thumb')].pop(); const r = t.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
await page.mouse.move(last.x, last.y, { steps: 5 }); await sleep(450);
T.push({ op: 'move', to: last, img: await shot(), dur: 0.4 }); T.push({ op: 'hold', hold: 0.15 });
const mk = await at('#modal-card .dnd-thumb-makecover');
await page.mouse.move(mk.x, mk.y, { steps: 3 }); await sleep(400);
T.push({ op: 'move', to: mk, img: await shot(), dur: 0.2 }); T.push({ op: 'hold', hold: 0.3 }); T.push({ op: 'click' });
await page.mouse.click(mk.x, mk.y);
await page.evaluate(() => document.getAnimations().forEach(a => a.pause()));
const fly = [];
for (let i = 1; i <= 14; i++) { await page.evaluate(t => document.getAnimations().forEach(a => { if (a.effect.getTiming().duration === 400) a.currentTime = t; }), 400 * i / 14); await sleep(30); fly.push(await shot()); }
T.push({ op: 'frames', imgs: fly, each: 1 });
await page.evaluate(() => document.getAnimations().forEach(a => { if (a.effect.getTiming().duration === 400) a.finish(); })); await sleep(500);
T.push({ op: 'fade', img: await shot(), dur: 0.08 }); T.push({ op: 'hold', hold: 1.6 });
fs.writeFileSync(OUT + 'timeline.json', JSON.stringify({ clip, ops: T }));
console.log('frames', n, 'clip', clip, 'progress', prog.length, 'retry', again.length);
await browser.close();
