// E2E 04-02 (WebKit, iPhone 13, IEM interceptado): botón 🛬 → modal de pistas → confirmar → CSV con RWY_DEP/RWY_ARR.
// Uso: node tests/e2e/e2e-runways.mjs (o run-all tests/e2e). Hermético: sin red; reloj fijo en FIXED_NOW. Necesita «npm ci».
import fs from 'node:fs'; import path from 'node:path';
import { INDEX_PATH, TMP, FIXED_NOW, readFixture, serveRepo, loadPlaywright, watchdog } from '../lib.mjs';
watchdog();
const { webkit, devices } = await loadPlaywright();
const html = fs.readFileSync(INDEX_PATH, 'utf8');
const fixture = readFixture('01');
const srv = await serveRepo(html);
let fails = 0; const ok = (n, c, d = '') => { console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); if (!c) fails++; };
const browser = await webkit.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'], acceptDownloads: true, timezoneId: 'Europe/London' });
await ctx.clock.setFixedTime(new Date(FIXED_NOW));
const page = await ctx.newPage();
const iemCalls = [];
await page.route('https://mesonet.agron.iastate.edu/**', route => {
  const u = route.request().url(); iemCalls.push(u);
  const st = new URL(u).searchParams.get('station');
  const body = st === 'EGSS' ? 'station,valid,drct,sknt\nEGSS,2026-09-18 16:50,230.00,12.00\nEGSS,2026-09-18 22:50,230.00,10.00'
    : 'station,valid,drct,sknt\nEPRZ,2026-09-18 19:00,270.00,9.00\nEPRZ,2026-09-18 20:30,0.00,0.00';
  route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'content-type': 'text/plain' }, body });
});
await page.route('**/images.unsplash.com/**', r => r.abort());
await page.addInitScript(() => { if (!localStorage.getItem('easylog_mode')) localStorage.setItem('easylog_mode', 'local'); });
const errs = []; page.on('pageerror', e => errs.push(String(e)));
page.on('dialog', d => d.accept());
await page.goto(srv.url); await page.waitForTimeout(1500);
await page.fill('#input', fixture); await page.click('button[onclick="addDay()"]'); await page.waitForTimeout(500);
console.log("# status0:", JSON.stringify(await page.textContent("#status")), "hist:", JSON.stringify((await page.innerHTML("#history")).slice(0, 300)), "errs:", JSON.stringify(errs));
const btn = page.locator('.day-rwy').first();
ok('botón 🛬 en el día', (await btn.textContent()).includes('🛬'), await btn.textContent());
await btn.click(); await page.waitForTimeout(1500);
ok('modal visible', await page.isVisible('#rwy-modal-body'));
const body = await page.innerText('#rwy-modal-body');
console.log('# --- modal ---\n' + body.replace(/^/gm, '# ') + '\n# -------------');
ok('IEM llamado para EGSS y EPRZ', iemCalls.some(u => u.includes('EGSS')) && iemCalls.some(u => u.includes('EPRZ')), iemCalls.length);
const sel = await page.$$eval('.rwy-chip.sel', b => b.map(x => x.dataset.k + ':' + x.textContent));
console.log('# preseleccionadas:', sel);
const confirmTxt = await page.textContent('#rwy-confirm');
ok('botón Confirmar con recuento', /Confirmar \(\d\/4\)/.test(confirmTxt), confirmTxt);
await page.screenshot({ path: path.join(TMP, 'easylog-e2e-modal.png') });
// completar a mano lo que falte: primera cabecera de cada campo vacío
for (const k of ['dep', 'arr']) for (let i = 0; i < 2; i++) {
  const has = await page.$(`.rwy-chip.sel[data-i="${i}"][data-k="${k}"]`);
  if (!has) { const c = await page.$(`.rwy-chip[data-i="${i}"][data-k="${k}"]`); if (c) await c.click(); else { await page.fill(`.rwy-other[data-i="${i}"][data-k="${k}"]`, '27'); await page.dispatchEvent(`.rwy-other[data-i="${i}"][data-k="${k}"]`, 'change'); } }
}
ok('4/4 tras completar', (await page.textContent('#rwy-confirm')) === 'Confirmar (4/4)', await page.textContent('#rwy-confirm'));
const chosen = await page.$$eval('.rwy-chip.sel', b => b.map(x => x.dataset.k + ':' + x.textContent));
await page.click('#rwy-confirm'); await page.waitForTimeout(300);
ok('modal cerrado y día ✓', !(await page.isVisible('#rwy-modal-body')) && (await page.locator('.day-rwy').first().textContent()).includes('✓'));
await page.reload(); await page.waitForTimeout(1500); await page.locator('#history').screenshot({ path: path.join(TMP, 'easylog-e2e-hist.png') });
ok('tras recargar sigue ✓', (await page.locator('.day-rwy').first().textContent()).includes('✓'));
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btn-dl-all')]);
const csv = fs.readFileSync(await dl.path(), 'utf8');
const lines = csv.split('\r\n'); const head = lines[0].replace(/^﻿/, '').split(';');
ok('CSV: cabecera con RWY_DEP;RWY_ARR al final', head.slice(-2).join(';') === 'RWY_DEP;RWY_ARR');
const tails = lines.slice(1).map(l => l.split(';').slice(-2).join('/'));
console.log('# pistas en CSV:', tails, 'elegidas:', chosen);
ok('CSV: las 2 filas llevan pistas', tails.length === 2 && tails.every(t => /^\d{2}[LRC]?\/\d{2}[LRC]?$/.test(t)));
ok('sin errores de página', errs.length === 0, errs.join(' | '));
console.log('# status:', JSON.stringify(await page.textContent('#status')));
await browser.close(); await srv.close();
console.log(fails ? `${fails} FAIL` : 'E2E PASS'); process.exit(fails ? 1 : 0);
