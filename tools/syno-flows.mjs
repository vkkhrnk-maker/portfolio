// Сценарии роликов кейса. Цели — селекторы настоящего прототипа.
const REG = '/syno-prototype/proto-registry.html';
const byText = (r, text) => r.page.evaluate(t => { const e = [...document.querySelectorAll('a, button')].find(x => x.getClientRects().length && x.textContent.trim() === t); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, text);
const tabApplications = r => r.page.evaluate(() => { const e = [...document.querySelectorAll('body *')].filter(x => x.children.length === 0 && /^Applications/.test(x.textContent.trim()) && x.getClientRects().length).find(x => x.getBoundingClientRect().top < 200); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
export default {
  async event(r) {
    await r.open(REG + '?case=promo&signed=1#home:member');
    await r.first(0.5);
    await r.press('#screen-home [data-go="addevent"]');
    await r.press('[data-ae-author="organisation"]', { wait: 1400 });
    await r.hover('#screen-addevent input[placeholder*="Echoes"], #screen-addevent input');
    await r.click({ wait: 300, fade: 0.08, hold: 0.15 });
    await r.type('Coastal Practices');
    // Обязательные поля настоящими действиями: тип, дата, описание, место, затем Publish и событие на дашборде.
    const option = (root, text) => r.page.evaluate((root, text) => { const e = [...document.querySelectorAll(root + ' *')].filter(x => x.children.length === 0 && x.textContent.trim() === text && x.getClientRects().length).pop(); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.left + Math.min(b.width / 2, 110), y: b.top + b.height / 2 }; }, root, text);
    const scrollTo = async (sel, top = 300) => r.wheel(await r.page.evaluate((s, t) => Math.round(document.querySelector(s).getBoundingClientRect().top - t), sel, top), { steps: 10, hold: 0.15 });
    await r.press('#ae-type-dd .dropdown-trigger', { wait: 400, fade: 0.08, hold: 0.15 });
    await r.press(await option('#ae-type-dd', 'Exhibition'), { wait: 300, fade: 0.08, hold: 0.1 });
    await r.hover({ x: 1250, y: 420 }, { dur: 0.3, dwell: 0.1 });
    await scrollTo('#ae-start', 320);
    await r.press('#ae-start', { wait: 250, fade: 0.08, hold: 0.1 });
    // Поле даты рисует своё лицо поверх нативного: значение ставим напрямую, кадр показывает настоящую запись.
    await r.page.evaluate(() => { const e = document.getElementById('ae-start'); e.value = '2026-11-15'; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); e.blur(); });
    await r.sleep(350); await r.show(0.45);
    r.log('date', await r.page.evaluate(() => document.getElementById('ae-start').value + ' | ' + (document.querySelector('#ae-shown,[id*=shown]')?.textContent || '').slice(0, 60)));
    await r.hover({ x: 1250, y: 420 }, { dur: 0.3, dwell: 0.1 });
    await scrollTo('#ae-desc', 300);
    await r.press('#ae-desc', { wait: 250, fade: 0.08, hold: 0.1 });
    await r.type('A group show on work made along the coast.', { every: 3, delay: 0.04 });
    await r.page.evaluate(() => document.activeElement?.blur());
    await r.hover({ x: 1250, y: 420 }, { dur: 0.3, dwell: 0.1 });
    await scrollTo('#ae-venue', 300);
    await r.sleep(300); await r.show(0.7);   // место подставлено из контекста организации
    await r.press('#ae-submit', { wait: 1700, hold: 1.0 });
    await r.press(await byText(r, 'Back to NiMAC'), { wait: 1500, hold: 0.6 });
    r.log('dashboard', await r.page.evaluate(() => location.hash + ' | ' + (document.querySelector('.screen.active')?.innerText || '').replace(/\s+/g, ' ').slice(0, 160)));
    const row = await r.page.evaluate(() => { const e = [...document.querySelectorAll('.screen.active *')].filter(x => x.children.length === 0 && x.textContent.trim() === 'Coastal Practices' && x.getClientRects().length).pop(); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, top: Math.round(b.top) }; });
    r.log('row', row);
    if (row && row.y > 700) { await r.hover({ x: 1250, y: 420 }, { dur: 0.3, dwell: 0.1 }); await r.wheel(Math.round(row.y - 420), { steps: 10, hold: 0.2 }); }
    const row2 = await r.page.evaluate(() => { const e = [...document.querySelectorAll('.screen.active *')].filter(x => x.children.length === 0 && x.textContent.trim() === 'Coastal Practices' && x.getClientRects().length).pop(); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
    if (row2) await r.hover(row2, { dur: 0.4, dwell: 1.8 });
  },
  async apply(r) {
    await r.open(REG + '?case=promo&signed=1#apply:step2', 1800);
    await r.first(0.5);
    const pick = () => r.page.evaluate(() => { const c = [...document.querySelectorAll('#works-grid .work-card:not(.selected)')].find(e => { const b = e.getBoundingClientRect(); return b.top > 150 && b.top < 660; }); const b = c.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + 70 }; });
    await r.press(await pick(), { wait: 500, fade: 0.08 });
    await r.press('#apply-next', { wait: 1100 });
    r.log('after works:', await r.page.evaluate(() => location.hash + ' | ' + (document.querySelector('#screen-apply h1')?.textContent || '')));
    const areas = await r.page.evaluate(() => [...document.querySelectorAll('#screen-apply textarea')].filter(t => t.offsetParent).map((t, i) => { t.dataset.film = i; return t.placeholder.slice(0, 30); }));
    r.log('textareas', areas);
    await r.press('[data-film="0"]', { wait: 250, fade: 0.08, hold: 0.1 });
    await r.type('Born in Limassol, I live and work in Nicosia.', { every: 3, delay: 0.04 });
    await r.press('[data-film="1"]', { wait: 250, fade: 0.08, hold: 0.1 });
    await r.type('Paintings of the coast from memory.', { every: 3, delay: 0.04 });
    await r.press('#apply-next', { wait: 1100 });
    r.log('after questions:', await r.page.evaluate(() => location.hash + ' | ' + (document.querySelector('#screen-apply h1')?.textContent || '')));
    await r.hover({ x: 760, y: 520 }, { dwell: 0.2 });
    await r.wheel(await r.page.evaluate(() => { const c = document.querySelector('#consent-box') || document.querySelector('[data-consent-toggle]'); return Math.max(0, Math.round(c.getBoundingClientRect().top - 420)); }), { steps: 18, hold: 0.3 });
    await r.press('[data-consent-toggle] .checkbox, [data-consent-toggle]', { wait: 500, fade: 0.08 });
    await r.press('#apply-next', { wait: 1500, hold: 1.1 });
    await r.press(await byText(r, 'View application status'), { wait: 1300, hold: 0.35 });
    r.log('end:', await r.page.evaluate(() => location.hash + ' | ' + [...document.querySelectorAll('.screen.active a, .screen.active button, .page-toolbar a, .page-toolbar button')].filter(b => b.getClientRects().length).map(b => b.textContent.trim().slice(0, 22)).slice(0, 10).join(' ; ')));
    await r.press(await tabApplications(r), { wait: 1300, hold: 2.2 });
    r.log('list:', await r.page.evaluate(() => location.hash + ' | ' + (document.querySelector('.screen.active')?.innerText || '').replace(/\s+/g, ' ').slice(0, 200)));
  },
  async 'apply-mobile'(r) {
    await r.open(REG + '?case=promo&signed=1#apply:step2', 1800);
    await r.first(0.6);
    const pick = () => r.page.evaluate(() => { const c = [...document.querySelectorAll('#works-grid .work-card:not(.selected)')].find(e => e.getClientRects().length); const b = c.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + 70, top: b.top }; });
    const first = await pick();
    await r.wheel(Math.max(0, Math.round(first.top - 260)), { steps: 12, hold: 0.25 });
    await r.tap(await pick(), { wait: 500, hold: 0.3 });
    await r.tap('#apply-next', { wait: 1100 });
    const areas = await r.page.evaluate(() => [...document.querySelectorAll('#screen-apply textarea')].filter(t => t.offsetParent).map((t, i) => { t.dataset.film = i; return i; }));
    r.log('areas', areas);
    await r.tap('[data-film="0"]', { wait: 300, hold: 0.1 });
    await r.type('Born in Limassol, I live and work in Nicosia.', { every: 4, delay: 0.04 });
    await r.page.evaluate(() => document.querySelector('[data-film="1"]').scrollIntoView({ block: 'center', behavior: 'instant' })); await r.sleep(250);
    await r.tap('[data-film="1"]', { wait: 300, hold: 0.1 });
    await r.type('Paintings of the coast from memory.', { every: 4, delay: 0.04 });
    await r.page.evaluate(() => document.activeElement?.blur()); await r.sleep(200);
    await r.tap('#apply-next', { wait: 1100 });
    r.log('review', await r.page.evaluate(() => location.hash));
    await r.wheel(await r.page.evaluate(() => { const c = document.querySelector('#consent-box'); return Math.max(0, Math.round(c.getBoundingClientRect().top - 360)); }), { steps: 18, hold: 0.3 });
    await r.tap('[data-consent-toggle] .checkbox, [data-consent-toggle]', { wait: 500, hold: 0.3 });
    await r.tap('#apply-next', { wait: 1500, hold: 1.1 });
    await r.page.evaluate(() => { const e = [...document.querySelectorAll('a, button')].find(x => x.getClientRects().length && x.textContent.trim() === 'View application status'); e.scrollIntoView({ block: 'center', behavior: 'instant' }); }); await r.sleep(200);
    await r.tap(await byText(r, 'View application status'), { wait: 1300, hold: 0.35 });
    await r.page.evaluate(() => scrollTo(0, 0)); await r.sleep(200);
    await r.tap(await tabApplications(r), { wait: 1300, hold: 2.2 });
    r.log('list', await r.page.evaluate(() => location.hash));
  },
  async 'map-mobile'(r) {
    await r.open('/syno-prototype/proto-v2.html?case=promo&seg=all', 2800);
    await r.first(0.7);
    const bar = await r.page.evaluate(() => { const e = [...document.querySelectorAll('body *')].filter(x => x.children.length < 3 && /tap to view/i.test(x.textContent) && x.getClientRects().length).pop(); const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
    r.log('bar', bar);
    await r.tap(bar, { wait: 900, hold: 0.5 });
    const card = await r.page.evaluate(() => { const c = [...document.querySelectorAll('.list-card')].find(e => /Echoes of Silence/.test(e.textContent)); const b = c.getBoundingClientRect(); return { x: b.left + 120, y: b.top + b.height / 2 }; });
    await r.tap(card, { wait: 1600, hold: 0.7 });
    const sc = await r.page.evaluate(() => { const c = [...document.querySelectorAll('body *')].filter(e => { const s = getComputedStyle(e); return /(auto|scroll)/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 200 && e.getClientRects().length && e.getBoundingClientRect().width > 300; }).pop(); c.dataset.film = 'drawer'; return { cls: String(c.className), h: c.scrollHeight, ch: c.clientHeight }; });
    r.log('scroller', sc);
    await r.wheel(Math.min(1250, sc.h - sc.ch), { steps: 24, at: '[data-film="drawer"]', hold: 1.6 });
  },
  async map(r) {
    await r.open('/syno-prototype/proto-v2.html?case=promo&seg=all', 2600);
    await r.first(0.5);
    const card = await r.page.evaluate(() => { const c = [...document.querySelectorAll('.list-panel .card, .list-panel [class*="card"]')].find(e => /Echoes of Silence/.test(e.textContent) && e.getBoundingClientRect().height > 80); const b = c.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, cls: c.className }; });
    r.log(card);
    await r.press(card, { wait: 3400, hold: 0.7 }); // карта успевает доехать и догрузить тайлы
    await r.page.mouse.move(card.x + 420, 500); 
    await r.hover({ x: card.x + 420, y: 520 }, { dwell: 0.2 });
    await r.wheel(1100, { steps: 22, hold: 1.8 });
  },
};
