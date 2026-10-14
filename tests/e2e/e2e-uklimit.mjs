// E2E 07-02 (WebKit, iPhone 13, modo local, reloj fijo): límite de UK Days por año y días excepcionales en la UI real.
// Toca «de 90 días (por defecto)» → prompt → límite; «Exc» → ventana con motivo → deja de computar; a 390 px nada desborda.
// Uso: node tests/e2e/e2e-uklimit.mjs (o run-all tests/e2e). Hermético: sin red. Necesita «npm ci».
import fs from 'node:fs';
import { INDEX_PATH, FIXED_NOW, serveRepo, loadPlaywright, watchdog } from '../lib.mjs';
watchdog();
const { webkit, devices } = await loadPlaywright();
const srv = await serveRepo(fs.readFileSync(INDEX_PATH, 'utf8'));
let fails = 0; const ok = (n, c, d = '') => { console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); if (!c) fails++; };

// Calendario: 12 días STBY (UK por calendario) del 06/04/2026 en adelante y OFF hasta ayer (04/10/2026) → 12 UK, 0 pendientes
const cal = {};
for (let t = Date.parse('2026-04-06T00:00:00Z'), i = 0; t <= Date.parse('2026-10-04T00:00:00Z'); t += 86400000, i++)
  cal[new Date(t).toISOString().slice(0, 10)] = i < 12 ? 'stby' : 'off';

const browser = await webkit.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'], timezoneId: 'Europe/London' });
await ctx.clock.setFixedTime(new Date(FIXED_NOW));
const page = await ctx.newPage();
await page.route('**/images.unsplash.com/**', r => r.abort());
await page.addInitScript(c => { localStorage.setItem('easylog_mode', 'local'); localStorage.setItem('easylog_days_v1', c); }, JSON.stringify(cal));
const errs = []; page.on('pageerror', e => errs.push(String(e)));
const answers = [];
page.on('dialog', d => (d.type() === 'prompt' ? d.accept(answers.shift() ?? '') : d.accept()));

await page.goto(srv.url); await page.waitForTimeout(800);
const count = () => page.textContent('#ukdays-count');
ok('cabecera con el límite por defecto «12 / 90»', (await count()).startsWith('12 / 90'), await count());
ok('la barra dice «(por defecto)»', /\(por defecto\)/.test(await page.textContent('#ukdays-body')));
ok('sin «bonus» en la página', !/bonus/i.test(await page.textContent('body')));

// Cambiar el límite tocando «de 90 días»
answers.push('80');
await page.click('#ukdays-body a[onclick^="editUKLimit"]'); await page.waitForTimeout(300);
ok('límite 80 → «12 / 80»', (await count()).startsWith('12 / 80'), await count());
ok('guardado en localStorage', /"2026-27":80/.test(await page.evaluate(() => localStorage.getItem('easylog_settings_v1') || '')));

// Abrir la lista de meses y marcar un día como excepcional
await page.click('.card-title[onclick="toggleUKDays()"]');
await page.click('[data-ukmonth="2026-04"] .month-header');
await page.waitForTimeout(200);
const vw = await page.evaluate(() => document.documentElement.clientWidth);
const overflow = await page.evaluate(() => {
  const doc = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
  const rows = [...document.querySelectorAll('#ukdays-months .day-item')].filter(r => r.scrollWidth > r.clientWidth + 1).length;
  return { doc, rows };
});
ok(`a ${vw} px la página y las filas con «Exc» no desbordan`, !overflow.doc && overflow.rows === 0, JSON.stringify(overflow));
await page.click('[data-ukmonth="2026-04"] button[onclick="toggleUKExceptional(\'2026-04-07\')"]');
ok('«Exc» abre la ventana del motivo', await page.isVisible('#ukexc-modal .day-modal-box'));
await page.click('#ukexc-modal button.btn-blue');   // sin motivo → alert (aceptado) y sigue abierta
ok('sin motivo no guarda y la ventana sigue abierta', await page.isVisible('#ukexc-modal .day-modal-box') && (await count()).startsWith('12 / 80'));
await page.fill('#ukexc-reason', 'Hospital: urgencias');
await page.click('#ukexc-modal button.btn-blue'); await page.waitForTimeout(200);
ok('con motivo: deja de computar «11 / 80» y se cierra la ventana', (await count()).startsWith('11 / 80') && !(await page.isVisible('#ukexc-modal .day-modal-box')), await count());
ok('la barra dice «12 UK · 1 excepcional (no computan)»', /12 UK · 1 excepcional \(no computan\)/.test(await page.textContent('#ukdays-body')));
ok('la fila muestra «excepcional · Hospital: urgencias»', /excepcional · Hospital: urgencias/.test(await page.textContent('#ukdays-months')));

// 07.1: «Fuera de UK» — 182 días pasados − 12 UK = 170 libres (todo OFF), 0 de trabajo
const fuera = () => page.textContent('[data-ukmonth="no"]');
ok('«Fuera de UK» con 170 días', /Fuera de UK\s*170 días/.test(await fuera()), (await fuera()).slice(0, 60));
await page.click('[data-ukmonth="no"] .month-header'); await page.waitForTimeout(200);
ok('desglose «0 trabajo · 170 libres» y lista de trabajo vacía («Ninguno»)', /0 trabajo · 170 libres/.test(await fuera()) && /Ninguno/.test(await fuera()));
await page.selectOption('#uk-out-kind', 'off'); await page.waitForTimeout(200);
const offRows = await page.$$eval('[data-ukmonth="no"] .day-item', r => r.length);
ok('al elegir «Días libres / OFF» se ven las 170 filas y el grupo sigue abierto', offRows === 170 && await page.isVisible('#uk-out-kind'), String(offRows));
ok('el select muestra «libres» tras repintar', (await page.$eval('#uk-out-kind', s => s.value)) === 'off');
const overflow2 = await page.evaluate(() => ({
  doc: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  sel: (() => { const s = document.getElementById('uk-out-kind'); return s.getBoundingClientRect().right > document.documentElement.clientWidth + 1; })(),
  rows: [...document.querySelectorAll('[data-ukmonth="no"] .day-item')].filter(r => r.scrollWidth > r.clientWidth + 1).length,
}));
ok(`a ${vw} px «Fuera de UK» (select y filas) no desborda`, !overflow2.doc && !overflow2.sel && overflow2.rows === 0, JSON.stringify(overflow2));

ok('sin errores de página', errs.length === 0, errs.join(' | '));
await browser.close(); await srv.close();
console.log(fails ? `\n${fails} FALLO(S)` : '\nTODO OK');
process.exit(fails ? 1 : 0);
