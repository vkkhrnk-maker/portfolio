#!/usr/bin/env node
// Снимает сценарии кейса настоящими действиями: мышь наводится на цель, кадр с ховером
// снимается до клика, текст набирается по буквам, на телефоне вместо курсора след касания.
// node tools/capture-syno-flow.mjs <event|map|apply|apply-mobile|map-mobile>
// Кадры и timeline.json — в assets-syno-case/films/source-<flow>; собирает build-syno-flow-video.py.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const puppeteer = require(process.env.PUPPETEER_CORE || '/Users/vikitoria/.npm/_npx/f707fa550ae11110/node_modules/puppeteer-core');
const BASE = process.env.BASE || 'http://localhost:8791';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const flow = process.argv[2];
const mobile = /mobile/.test(flow);
const DIR = new URL(`../assets-syno-case/films/source-flow-${flow}/`, import.meta.url).pathname;
fs.mkdirSync(DIR, { recursive: true });
for (const f of fs.readdirSync(DIR)) if (/^\d+\.png$/.test(f)) fs.unlinkSync(DIR + f);
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--hide-scrollbars', '--lang=en-GB'] });
const page = await browser.newPage();
await page.setCacheEnabled(false);
await page.setViewport(mobile ? { width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { width: 1280, height: 800, deviceScaleFactor: 2 });
const errors = []; page.on('pageerror', e => errors.push(e.message));
const T = []; let n = 0, pos = mobile ? null : { x: 820, y: 640 };
const snap = async () => { const name = String(++n).padStart(3, '0'); await page.screenshot({ path: `${DIR}${name}.png` }); return name; };
const rect = t => typeof t === 'object' ? Promise.resolve(t) : page.evaluate(s => { const e = [...document.querySelectorAll(s)].find(x => x.getClientRects().length && getComputedStyle(x).visibility !== 'hidden'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, t);
const R = {
  page, sleep,
  async open(url, wait = 1500) { await page.goto(BASE + url, { waitUntil: 'networkidle2', timeout: 60000 }); await sleep(wait); if (pos) await page.mouse.move(pos.x, pos.y); await sleep(300); T.push({ op: 'start', pos }); },
  async show(hold = 0.45) { const img = await snap(); T.push({ op: 'fade', img, dur: 0.14 }); T.push({ op: 'hold', hold }); },
  async first(hold = 0.45) { const img = await snap(); T.push({ op: 'base', img }); T.push({ op: 'hold', hold }); },
  async hover(t, { dur = 0.45, dwell = 0.3, ox = 0, oy = 0 } = {}) { const c = await rect(t); if (!c) throw new Error('no target ' + t); const to = { x: c.x + ox, y: c.y + oy }; await page.mouse.move(to.x, to.y, { steps: 6 }); await sleep(500); const img = await snap(); T.push({ op: 'move', to, img, dur }); T.push({ op: 'hold', hold: dwell }); pos = to; return to; },
  async click({ wait = 900, nav = false, hold = 0.35, fade = 0.14 } = {}) { T.push({ op: 'click' }); if (nav) await Promise.all([page.waitForNavigation({ waitUntil: 'load', timeout: 20000 }).catch(() => {}), page.mouse.click(pos.x, pos.y)]); else await page.mouse.click(pos.x, pos.y); await sleep(wait); const img = await snap(); T.push({ op: 'fade', img, dur: fade }); T.push({ op: 'hold', hold }); },
  async press(t, o = {}) { await R.hover(t, o); await R.click(o); },
  async tap(t, { wait = 900, hold = 0.5 } = {}) { const c = await rect(t); if (!c) throw new Error('no target ' + t); T.push({ op: 'tap', at: c }); await page.touchscreen.tap(c.x, c.y); await sleep(wait); const img = await snap(); T.push({ op: 'fade', img, dur: 0.14 }); T.push({ op: 'hold', hold }); },
  async type(text, { every = 1, hold = 0.25, delay = 0.05 } = {}) { const imgs = []; for (let i = 0; i < text.length; i += every) { await page.keyboard.type(text.slice(i, i + every)); await sleep(40); imgs.push(await snap()); } T.push({ op: 'frames', imgs, each: Math.max(1, Math.round(delay * 30)) }); T.push({ op: 'hold', hold }); },
  async wheel(total, { steps = 16, each = 2, hold = 0.4, at = null } = {}) { const imgs = []; const ease = t => t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2; let done = 0; for (let i = 1; i <= steps; i++) { const to = Math.round(total * ease(i / steps)); const d = to - done; done = to; if (mobile) await page.evaluate(([s, v]) => { const e = s ? document.querySelector(s) : document.scrollingElement; e.scrollTop += v; }, [at, d]); else await page.mouse.wheel({ deltaY: d }); await sleep(60); imgs.push(await snap()); } T.push({ op: 'frames', imgs, each }); T.push({ op: 'hold', hold }); },
  log: (...a) => console.log(...a),
};
const flows = (await import(new URL('./syno-flows.mjs', import.meta.url))).default;
try { await flows[flow](R); } finally {
  fs.writeFileSync(DIR + 'timeline.json', JSON.stringify({ flow, mobile, view: mobile ? [375, 812] : [1280, 800], ops: T }, null, 0));
  console.log(flow, 'frames', n, 'errors', errors.slice(0, 3));
  await browser.close();
}
