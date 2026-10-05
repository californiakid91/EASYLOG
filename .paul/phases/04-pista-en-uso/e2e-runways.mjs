// E2E 04-02 (WebKit, iPhone 13, IEM interceptado). Uso: node e2e-runways.mjs — necesita playwright-core (aquí desde ~/manuales-motos) y el fixture 01 (gitignored).
import http from 'node:http'; import fs from 'node:fs'; import { createRequire } from 'node:module';
const require = createRequire('/home/ricardo/manuales-motos/');
const { webkit, devices } = require('playwright-core');
const html = fs.readFileSync('/home/ricardo/easylog/index.html', 'utf8');
const fixture = fs.readFileSync('/home/ricardo/easylog/.paul/phases/01-auditoria/harness/fixtures/01-2026-10-02-STN-RZE-noche-delays.txt', 'utf8');
const srv = http.createServer((q, r) => { if (q.url.startsWith('/EASYLOG/')) { r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); } else { r.writeHead(404); r.end(); } }).listen(8791);
let fails = 0; const ok = (n, c, d = '') => { console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); if (!c) fails++; };
const browser = await webkit.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'], acceptDownloads: true });
const page = await ctx.newPage();
const iemCalls = [];
await page.route('https://mesonet.agron.iastate.edu/**', route => {
  const u = route.request().url(); iemCalls.push(u);
  const st = new URL(u).searchParams.get('station');
  const body = st === 'EGSS' ? 'station,valid,drct,sknt\nEGSS,2026-10-02 16:50,230.00,12.00\nEGSS,2026-10-02 22:50,230.00,10.00'
    : 'station,valid,drct,sknt\nEPRZ,2026-10-02 19:00,270.00,9.00\nEPRZ,2026-10-02 20:30,0.00,0.00';
  route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'content-type': 'text/plain' }, body });
});
await page.route('**/images.unsplash.com/**', r => r.abort());
await page.addInitScript(() => { if (!localStorage.getItem('easylog_mode')) localStorage.setItem('easylog_mode', 'local'); });
const errs = []; page.on('pageerror', e => errs.push(String(e)));
page.on('dialog', d => d.accept());
await page.goto('http://localhost:8791/EASYLOG/'); await page.waitForTimeout(1500);
await page.fill('#input', fixture); await page.click('button[onclick="addDay()"]'); await page.waitForTimeout(500);
console.log("status0:", await page.textContent("#status"), "hist:", (await page.innerHTML("#history")).slice(0,300), "errs:", errs);
const btn = page.locator('.day-rwy').first();
ok('botón 🛬 en el día', (await btn.textContent()).includes('🛬'), await btn.textContent());
await btn.click(); await page.waitForTimeout(1500);
ok('modal visible', await page.isVisible('#rwy-modal-body'));
const body = await page.innerText('#rwy-modal-body');
console.log('--- modal ---\n' + body + '\n-------------');
ok('IEM llamado para EGSS y EPRZ', iemCalls.some(u => u.includes('EGSS')) && iemCalls.some(u => u.includes('EPRZ')), iemCalls.length);
const sel = await page.$$eval('.rwy-chip.sel', b => b.map(x => x.dataset.k + ':' + x.textContent));
console.log('preseleccionadas:', sel);
const confirmTxt = await page.textContent('#rwy-confirm');
ok('botón Confirmar con recuento', /Confirmar \(\d\/4\)/.test(confirmTxt), confirmTxt);
await page.screenshot({ path: '/tmp/easylog-e2e-modal.png' });
// completar a mano lo que falte: primera cabecera de cada campo vacío
for (const k of ['dep', 'arr']) for (let i = 0; i < 2; i++) {
  const has = await page.$(`.rwy-chip.sel[data-i="${i}"][data-k="${k}"]`);
  if (!has) { const c = await page.$(`.rwy-chip[data-i="${i}"][data-k="${k}"]`); if (c) await c.click(); else { await page.fill(`.rwy-other[data-i="${i}"][data-k="${k}"]`, '27'); await page.dispatchEvent(`.rwy-other[data-i="${i}"][data-k="${k}"]`, 'change'); } }
}
ok('4/4 tras completar', (await page.textContent('#rwy-confirm')) === 'Confirmar (4/4)', await page.textContent('#rwy-confirm'));
const chosen = await page.$$eval('.rwy-chip.sel', b => b.map(x => x.dataset.k + ':' + x.textContent));
await page.click('#rwy-confirm'); await page.waitForTimeout(300);
ok('modal cerrado y día ✓', !(await page.isVisible('#rwy-modal-body')) && (await page.locator('.day-rwy').first().textContent()).includes('✓'));
await page.reload(); await page.waitForTimeout(1500); await page.locator('#history').screenshot({ path: '/tmp/easylog-e2e-hist.png' });
ok('tras recargar sigue ✓', (await page.locator('.day-rwy').first().textContent()).includes('✓'));
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btn-dl-all')]);
const csv = fs.readFileSync(await dl.path(), 'utf8');
const lines = csv.split('\r\n'); const head = lines[0].replace(/^﻿/, '').split(';');
ok('CSV: cabecera con DEP_RWY;ARR_RWY al final', head.slice(-2).join(';') === 'DEP_RWY;ARR_RWY');
const tails = lines.slice(1).map(l => l.split(';').slice(-2).join('/'));
console.log('pistas en CSV:', tails, 'elegidas:', chosen);
ok('CSV: las 2 filas llevan pistas', tails.length === 2 && tails.every(t => /^\d{2}[LRC]?\/\d{2}[LRC]?$/.test(t)));
ok('sin errores de página', errs.length === 0, errs.join(' | '));
console.log('status:', await page.textContent('#status'));
await browser.close(); srv.close();
console.log(fails ? `${fails} FAIL` : 'E2E PASS'); process.exit(fails ? 1 : 0);
