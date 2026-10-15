// Pruebas del plan 13-01: SBY + email por la regla del email, SIM/SD sin email pendientes, UW de días sin vuelos por el día anterior
// (sobre el <script> real de index.html, modo local, DOM falso, XLSX simulado)
import fs from 'node:fs'; import vm from 'node:vm';
import { INDEX_PATH, PILOT_SEED } from '../lib.mjs';
const html = fs.readFileSync(INDEX_PATH, 'utf8');
const SCRIPT = html.match(/<script>\n([\s\S]*?)<\/script>\s*<\/body>/)[1];
const els = new Map();
const mk = () => new Proxy({ value: '', dataset: {}, style: {}, innerHTML: '', textContent: '' }, { get: (t, k) => k in t ? t[k] : k === 'classList' ? { add() {}, remove() {}, toggle() {}, contains() { return false; } } : k === 'querySelectorAll' ? () => [] : (k === 'closest' || k === 'querySelector') ? () => null : typeof k === 'symbol' ? undefined : () => mk(), set: (t, k, v) => (t[k] = v, true) });
const ls = new Map([['easylog_mode', 'local'], PILOT_SEED]); const st = []; let answer = true; let asked = 0;
const win = { location: {} };
const xl = { rows: null, file: null };
const XLSX = { utils: { aoa_to_sheet: rows => (xl.rows = rows, {}), encode_cell: () => 'A1', book_new: () => ({}), book_append_sheet() {} }, writeFile: (wb, name) => { xl.file = name; } };
const ctx = vm.createContext({ document: { getElementById: id => (els.has(id) || els.set(id, mk()), els.get(id)), querySelector: () => mk(), querySelectorAll: () => [], body: mk(), createElement: () => mk(), addEventListener() {} },
  localStorage: { getItem: k => ls.get(k) ?? null, setItem: (k, v) => ls.set(k, String(v)), removeItem: k => ls.delete(k) },
  window: win, navigator: {}, location: {}, console, Date, Math, JSON, Promise, Intl, XLSX, Blob: class { constructor(p) { this.p = p; } }, URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
  confirm: m => (asked++, typeof answer === 'function' ? answer(m) : answer), prompt: () => null, alert: m => st.push('alert: ' + m),
  setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, __st: st });
let bootError = null;
try { vm.runInContext(SCRIPT, ctx); } catch (e) { bootError = e; }
const run = c => vm.runInContext(c, ctx); let fails = 0;
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); if (!ok) fails++; };
check('arranque sin errores', !bootError, bootError && String(bootError));
if (bootError) process.exit(1);
run('showStatus = (t, m) => __st.push(t + ": " + m);');
const reset = () => { run('_cache = {}; _excelData = {}; _ukdays = {}; _dayMap = {};'); xl.rows = xl.file = null; answer = true; asked = 0; };
const now = iso => { win._ukNowOverride = iso; };
const S = iso => JSON.parse(run(`JSON.stringify(ukDayStatus('${iso}'))`));
const E = iso => JSON.parse(run(`JSON.stringify(_ukdays['${iso}'] ?? null)`));
const rows = iso => JSON.parse(run(`JSON.stringify(excelRowsForDay('${iso}'))`));
const paste = text => { ctx.document.getElementById('input').value = text; run('addDay()'); };
const email = (date, secs) => date + '\n\n' + secs.map((s, i) => [
  `FlightNumber : FR${100 + i}`, 'Registration : EIABC', `City Pair : ${s.cp}`, `STD : ${s.std ?? s.off}`, `STA : ${s.on ?? s.off}`,
  ...(s.off ? [`Airborne : ${s.off}`] : []), ...(s.on ? [`Landed : ${s.on}`] : []),
  ...(s.off ? [`Off Block : ${s.off}`] : []), ...(s.on ? [`On Block : ${s.on}`] : []), 'Total Block : 02:00',
  '', 'Pilot Flying :', 'Take Off : FOXRAY', 'Landing : FOXRAY', ''].join('\n')).join('\n\n');
const cal = (iso, s) => run(`_dayMap['${iso}'] = '${s}'`);
const UW = r => r[0][17], U = r => r[0][18];
const body = () => ctx.document.getElementById('ukdays-body').innerHTML;
const pendIsos = () => JSON.parse(run('JSON.stringify(pendingUKDays().map(x => x.iso))'));

// ── AC-1: SBY activado → manda la regla del email
now('2026-10-20T12:00:00Z');
reset(); cal('2026-09-24', 'stby'); paste(email('2026/09/24', [{ cp: 'STN - DUB', off: '15:00', on: '16:10' }, { cp: 'DUB - STN', off: '17:00', on: '18:10' }]));
let r = rows('2026-09-24');
check('AC-1 SBY + email R1 → UK por la regla (rule:R1), sin conflicto', S('2026-09-24').state === 'uk' && S('2026-09-24').source === 'rule:R1', JSON.stringify(S('2026-09-24')));
check('AC-1 … filas de vuelo, U=1, UW=1 (primer sector sale de STN)', r[0][1] === 'FR100' && U(r) === 1 && UW(r) === 1, JSON.stringify(r.map(x => [x[1], x[17], x[18]])));
reset(); cal('2026-09-26', 'stby'); paste(email('2026/09/26', [{ cp: 'STN - BLQ', off: '15:00', on: '17:15' }]));
check('AC-1 SBY + email que acaba en BLQ → No UK (rule:R2), U vacía', S('2026-09-26').state === 'no' && S('2026-09-26').source === 'rule:R2' && U(rows('2026-09-26')) === '', JSON.stringify(S('2026-09-26')));
reset(); cal('2026-09-27', 'stby'); paste(email('2026/09/27', [{ cp: 'STN - DUB', off: '15:00', on: '16:10' }, { cp: 'DUB - STN', off: '17:00' }]));
check('AC-1 SBY + email sin On Block → pendiente «email incompleto»', S('2026-09-27').state === 'pending' && S('2026-09-27').kind === 'incomplete', JSON.stringify(S('2026-09-27')));
reset(); cal('2026-09-28', 'stby'); run(`removeUKDay('2026-09-28')`);
check('AC-1 (prep) ✕ en SBY → «No UK» manual', E('2026-09-28')?.state === 'no' && E('2026-09-28')?.manual, JSON.stringify(E('2026-09-28')));
answer = false; asked = 0;
paste(email('2026/09/28', [{ cp: 'STN - DUB', off: '15:00', on: '16:10' }, { cp: 'DUB - STN', off: '17:00', on: '18:10' }]));
check('AC-1 SBY + email con «No UK» manual previo: se pregunta y, al cancelar, la marca manual se mantiene', asked >= 1 && E('2026-09-28')?.state === 'no' && E('2026-09-28')?.manual && S('2026-09-28').state === 'no', JSON.stringify([asked, E('2026-09-28')]));
reset();
check('AC-1 SBY sin email → sigue contando UK (cal:stby)', (cal('2026-09-29', 'stby'), S('2026-09-29').state === 'uk' && S('2026-09-29').source === 'cal:stby'), JSON.stringify(S('2026-09-29')));

// ── AC-2: OFF / SIM / SD + email siguen siendo conflicto
for (const [iso, c] of [['2026-09-10', 'off'], ['2026-09-11', 'sim'], ['2026-09-12', 'sd']]) {
  reset(); cal(iso, c); paste(email(iso.replaceAll('-', '/'), [{ cp: 'STN - DUB', off: '15:00', on: '16:10' }, { cp: 'DUB - STN', off: '17:00', on: '18:10' }]));
  check(`AC-2 ${c.toUpperCase()} + email → conflicto`, S(iso).state === 'pending' && S(iso).kind === 'conflict', JSON.stringify(S(iso)));
}

// ── AC-3: SIM / SD sin email → pendiente
reset(); cal('2026-10-01', 'sim'); cal('2026-11-01', 'sd');
check('AC-3 SIM pasado sin email → pendiente cal-ask con motivo', S('2026-10-01').state === 'pending' && S('2026-10-01').kind === 'cal-ask' && S('2026-10-01').reason === 'SIM en calendario: ¿dormiste en UK?', JSON.stringify(S('2026-10-01')));
check('AC-3 SD futuro sin email → pendiente cal-ask', S('2026-11-01').state === 'pending' && S('2026-11-01').kind === 'cal-ask', JSON.stringify(S('2026-11-01')));
check('AC-3 en «sin decidir» solo el pasado', pendIsos().includes('2026-10-01') && !pendIsos().includes('2026-11-01'));
check('AC-3 U del Excel «?» mientras está pendiente (pasado y futuro)', U(rows('2026-10-01')) === '?' && U(rows('2026-11-01')) === '?');
run('renderUKDays()');
check('AC-3 aparece con botones UK / No UK', /data-act="ukDecidePending" data-arg="2026-10-01" data-arg2="uk"/.test(body()) && /data-act="ukDecidePending" data-arg="2026-10-01" data-arg2="no"/.test(body()));
check('AC-3 texto de ayuda nuevo', /pulsa una fecha si fue STBY \(cuenta UK\) o SIM\/SD \(luego se deciden abajo con UK \/ No UK\)/.test(body()));
// Excel bloqueado con el SIM pasado pendiente; se libera al decidirlo
for (let d = '2026-04-06'; d <= '2026-10-19'; d = run(`addDaysISO('${d}', 1)`)) if (d !== '2026-10-01') cal(d, 'off');
run('downloadTaxExcel()');
check('AC-3 SIM pasado sin decidir → el Excel no se descarga', xl.file === null && /por decidir 01\/10\/26/.test(st.at(-1)), st.at(-1));
run(`ukDecidePending('2026-10-01', 'uk')`);
check('AC-3 decidido UK → manual uk', E('2026-10-01')?.state === 'uk' && E('2026-10-01')?.manual && S('2026-10-01').state === 'uk', JSON.stringify(E('2026-10-01')));
check('AC-3 motivo guardado legible: «decidido a mano (dormí en UK) · SIM en calendario»', run(`ukReasonText(_ukdays['2026-10-01'].reason)`) === 'decidido a mano (dormí en UK) · SIM en calendario', run(`ukReasonText(_ukdays['2026-10-01'].reason)`));
run('downloadTaxExcel()');
check('AC-3 sin pendientes pasados → se descarga (el SD futuro no bloquea)', xl.file === 'TAX YEAR 26-27.xlsx', `${xl.file}`);

// ── AC-4: UW de días sin vuelos (todo futuro: no hay bloqueo)
now('2026-04-06T12:00:00Z');
reset(); cal('2026-05-10', 'stby');
check('AC-4 SBY → UW=1', UW(rows('2026-05-10')) === 1);
run(`removeUKDay('2026-05-10')`);
check('AC-4 SBY con «No UK» manual → UW=1, U vacía', UW(rows('2026-05-10')) === 1 && U(rows('2026-05-10')) === '', JSON.stringify(rows('2026-05-10')));
reset(); cal('2026-05-11', 'stby'); cal('2026-05-12', 'sim'); cal('2026-05-13', 'sd');
check('AC-4 SIM con día anterior UK (SBY) → UW=1', UW(rows('2026-05-12')) === 1, JSON.stringify(rows('2026-05-12')));
check('AC-4 SD con día anterior pendiente (SIM sin decidir) → UW «?»', UW(rows('2026-05-13')) === '?', JSON.stringify(rows('2026-05-13')));
run(`ukDecidePending('2026-05-12', 'no')`);
check('AC-4 SD con día anterior No UK (SIM decidido fuera) → UW vacío', UW(rows('2026-05-13')) === '', JSON.stringify(rows('2026-05-13')));
reset(); cal('2026-05-20', 'off'); cal('2026-05-21', 'duty'); cal('2026-05-22', 'duty');
check('AC-4 DUTY con día anterior OFF (No UK) → UW vacío', UW(rows('2026-05-21')) === '', JSON.stringify(rows('2026-05-21')));
check('AC-4 DUTY con día anterior pendiente → UW «?»', UW(rows('2026-05-22')) === '?', JSON.stringify(rows('2026-05-22')));
run(`ukDecidePending('2026-05-21', 'uk')`);
check('AC-4 DUTY con día anterior UK (decidido) → UW=1', UW(rows('2026-05-22')) === 1, JSON.stringify(rows('2026-05-22')));
reset(); cal('2026-06-10', 'stby'); cal('2026-06-11', 'duty'); run(`removeUKDay('2026-06-10')`);
check('AC-4 DUTY con día anterior SBY decidido «No UK» → UW vacío (manda el estado, no el calendario)', UW(rows('2026-06-11')) === '', JSON.stringify(rows('2026-06-11')));
reset(); cal('2026-04-06', 'sim');
check('AC-4 06/04/2026 (día anterior fuera de alcance) → UW «?»', UW(rows('2026-04-06')) === '?', JSON.stringify(rows('2026-04-06')));
reset(); cal('2026-05-30', 'stby'); cal('2026-05-31', 'off');
check('AC-4 OFF → sin UW', JSON.stringify(rows('2026-05-31').map(x => x.slice(1))) === '[["OFF"]]');
reset(); cal('2026-06-30', 'stby'); run(`addUKDayManual('2026-07-01')`);
check('AC-4 UK Day a mano sin calendario → UW vacío', UW(rows('2026-07-01')) === '' && U(rows('2026-07-01')) === 1, JSON.stringify(rows('2026-07-01')));
reset(); cal('2026-07-09', 'stby'); paste(email('2026/07/10', [{ cp: 'BLQ - STN', off: '14:00', on: '16:30' }]));
check('AC-4 día con vuelos: UW por el primer sector (BLQ → vacío) aunque el día anterior sea UK', UW(rows('2026-07-10')) === '', JSON.stringify(rows('2026-07-10')));

// ── Año congelado: decidir un pendiente pide confirmación
now('2027-05-10T12:00:00Z');
reset(); cal('2026-10-02', 'sim');
check('congelado (prep) 2026/27 cerrado y el SIM pendiente', run(`ukFrozenDay('2026-10-02')`) === true && S('2026-10-02').kind === 'cal-ask');
answer = false; asked = 0; run(`ukDecidePending('2026-10-02', 'uk')`);
check('congelado: cancelar la confirmación → no se escribe nada', asked === 1 && E('2026-10-02') === null, JSON.stringify([asked, E('2026-10-02')]));
answer = true; asked = 0; run(`ukDecidePending('2026-10-02', 'uk')`);
check('congelado: aceptar → manual uk', asked === 1 && E('2026-10-02')?.state === 'uk' && E('2026-10-02')?.manual, JSON.stringify(E('2026-10-02')));

console.log(fails ? `\n${fails} FALLO(S)` : '\nTODO OK');
process.exit(fails ? 1 : 0);
