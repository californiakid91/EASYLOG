// Pruebas del plan 03.2-01: columnas U/UW del Excel desde UK Days, estado SD, decidir pendientes y descarga bloqueada
// (sobre el <script> real de index.html, modo local, DOM falso, XLSX simulado)
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.resolve(HERE, '../../../index.html'), 'utf8');
const SCRIPT = html.match(/<script>\n([\s\S]*?)<\/script>\s*<\/body>/)[1];
const els = new Map();
const mk = () => new Proxy({ value: '', dataset: {}, style: {}, innerHTML: '', textContent: '' }, { get: (t, k) => k in t ? t[k] : k === 'classList' ? { add() {}, remove() {}, toggle() {}, contains() { return false; } } : k === 'querySelectorAll' ? () => [] : (k === 'closest' || k === 'querySelector') ? () => null : typeof k === 'symbol' ? undefined : () => mk(), set: (t, k, v) => (t[k] = v, true) });
const ls = new Map([['easylog_mode', 'local']]); const st = []; let answer = true;
const win = { location: {} };
const xl = { rows: null, file: null, sheet: null };
const XLSX = { utils: { aoa_to_sheet: rows => (xl.rows = rows, {}), encode_cell: () => 'A1', book_new: () => ({}), book_append_sheet: (wb, ws, name) => { xl.sheet = name; } }, writeFile: (wb, name) => { xl.file = name; } };
const ctx = vm.createContext({ document: { getElementById: id => (els.has(id) || els.set(id, mk()), els.get(id)), querySelector: () => mk(), querySelectorAll: () => [], body: mk(), createElement: () => mk(), addEventListener() {} },
  localStorage: { getItem: k => ls.get(k) ?? null, setItem: (k, v) => ls.set(k, String(v)), removeItem: k => ls.delete(k) },
  window: win, navigator: {}, location: {}, console, Date, Math, JSON, Promise, Intl, XLSX, Blob: class { constructor(p) { this.p = p; } }, URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} }, confirm: () => answer, prompt: () => null, alert: m => st.push('alert: ' + m),
  setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, __st: st });
let bootError = null;
try { vm.runInContext(SCRIPT, ctx); } catch (e) { bootError = e; }
const run = c => vm.runInContext(c, ctx); let fails = 0;
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); if (!ok) fails++; };
check('arranque sin errores', !bootError, bootError && String(bootError));
if (bootError) process.exit(1);
run('showStatus = (t, m) => __st.push(t + ": " + m);');
const reset = () => { run('_cache = {}; _excelData = {}; _ukdays = {}; _dayMap = {};'); xl.rows = xl.file = xl.sheet = null; answer = true; };
const now = iso => { win._ukNowOverride = iso; };
const S = iso => JSON.parse(run(`JSON.stringify(ukDayStatus('${iso}'))`));
const E = iso => JSON.parse(run(`JSON.stringify(_ukdays['${iso}'] ?? null)`));
const rows = iso => JSON.parse(run(`JSON.stringify(excelRowsForDay('${iso}'))`));
const paste = text => { ctx.document.getElementById('input').value = text; run('addDay()'); };
const email = (date, secs) => date + '\n\n' + secs.map((s, i) => [
  `FlightNumber : FR${100 + i}`, 'Registration : EIABC', `City Pair : ${s.cp}`, `STD : ${s.std ?? s.off}`, `STA : ${s.on ?? s.off}`,
  ...(s.off ? [`Airborne : ${s.off}`] : []), ...(s.on ? [`Landed : ${s.on}`] : []),
  ...(s.off ? [`Off Block : ${s.off}`] : []), ...(s.on ? [`On Block : ${s.on}`] : []), 'Total Block : 02:00',
  '', 'Pilot Flying :', 'Take Off : VEGRIC', 'Landing : VEGRIC', ''].join('\n')).join('\n\n');
const cal = (iso, s) => run(`_dayMap['${iso}'] = '${s}'`);
const UW = r => r[0][17], U = r => r[0][18];

// Todo el periodo es futuro → no hay pendientes pasados (la descarga no se bloquea en estas pruebas)
now('2026-04-06T12:00:00Z');

// ── AC-1 / AC-2: vuelos
reset(); paste(email('2026/10/06', [{ cp: 'STN - RZE', off: '17:00', on: '19:15' }, { cp: 'RZE - STN', off: '20:00', on: '22:30' }]));
let r = rows('2026-10-06');
check('STN-RZE-STN calzos 23:30 BST → U=1, UW=1, 2 filas', r.length === 2 && U(r) === 1 && UW(r) === 1, JSON.stringify(r.map(x => [x[1], x[17], x[18]])));
check('U/UW solo en la primera fila', r[1][17] === '' && r[1][18] === '');
reset(); paste(email('2026/10/08', [{ cp: 'STN - BLQ', off: '18:00', on: '21:00' }]));
r = rows('2026-10-08');
check('último sector a BLQ antes de 00:00 → U vacía (antes ponía 1), UW=1', U(r) === '' && UW(r) === 1, JSON.stringify([UW(r), U(r)]));
reset(); paste(email('2026/10/09', [{ cp: 'BLQ - STN', off: '14:00', on: '16:30' }]));
r = rows('2026-10-09');
check('duty que empieza fuera de UK (BLQ→STN) → UW vacío, U=1', UW(r) === '' && U(r) === 1, JSON.stringify([UW(r), U(r)]));
reset(); paste(email('2026/10/24', [{ cp: 'STN - DUB', off: '20:00', on: '21:10' }, { cp: 'DUB - STN', off: '22:00', on: '23:30' }]));
r = rows('2026-10-24');
check('R3: calzos 00:30 BST del día siguiente → U vacía, UW=1', U(r) === '' && UW(r) === 1, JSON.stringify([UW(r), U(r)]));
reset(); paste(email('2026/10/10', [{ cp: 'JER - STN', off: '10:00', on: '11:00' }]));
check('duty que empieza en JER → UW vacío (como UK Days, sin Crown Dependencies)', UW(rows('2026-10-10')) === '');
// El email viene en orden cronológico (sectorDayOffsets lo asume); con cruce de medianoche UTC el primer sector sigue mandando
reset(); paste(email('2026/10/11', [{ cp: 'STN - DUB', off: '22:00', on: '23:10' }, { cp: 'DUB - STN', off: '00:10', on: '01:20' }]));
r = rows('2026-10-11');
check('cruce de medianoche UTC: UW por el primer sector (STN), filas en orden del email', UW(r) === 1 && r[0][2] === 'STN' && r[1][2] === 'DUB', JSON.stringify(r.map(x => [x[2], x[17], x[18]])));

// ── AC-1 / AC-4: calendario
reset(); cal('2026-05-06', 'stby');
r = rows('2026-05-06');
check('SBY sin decisión → fila SBY, UW=1, U=1', r[0][1] === 'SBY' && UW(r) === 1 && U(r) === 1, JSON.stringify(r));
run(`removeUKDay('2026-05-06')`);
r = rows('2026-05-06');
check('06/05: SBY con «No UK» manual → UW=1, U vacía', r[0][1] === 'SBY' && UW(r) === 1 && U(r) === '', JSON.stringify(r));
reset(); cal('2026-05-06', 'sd');
check('SD → ukDayStatus uk, source cal:sd', S('2026-05-06').state === 'uk' && S('2026-05-06').source === 'cal:sd', JSON.stringify(S('2026-05-06')));
r = rows('2026-05-06');
check('SD → fila «SD», UW=1, U=1', r[0][1] === 'SD' && UW(r) === 1 && U(r) === 1, JSON.stringify(r));
run(`removeUKDay('2026-05-06')`);
check('✕ en SD → «No UK» manual con motivo «SD»', E('2026-05-06')?.state === 'no' && E('2026-05-06')?.manual && /SD en calendario/.test(E('2026-05-06').reason), JSON.stringify(E('2026-05-06')));
check('SD con «No UK» → U vacía, UW=1', U(rows('2026-05-06')) === '' && UW(rows('2026-05-06')) === 1);
reset(); cal('2026-05-07', 'sim');
check('SIM → fila SIM, UW=1, U=1', rows('2026-05-07')[0][1] === 'SIM' && U(rows('2026-05-07')) === 1);
reset(); cal('2026-05-08', 'off');
check('OFF → [serial, OFF] sin U', JSON.stringify(rows('2026-05-08').map(x => x.slice(1))) === '[["OFF"]]');
run(`addUKDayManual('2026-05-08')`);
check('OFF con UK Day manual → fila OFF con U=1 (G6)', rows('2026-05-08')[0][1] === 'OFF' && U(rows('2026-05-08')) === 1, JSON.stringify(rows('2026-05-08')));
reset();
check('día futuro sin datos → fila vacía [serial]', rows('2026-05-09')[0].length === 1);

// ── AC-3: SBY activado con vuelos
reset(); cal('2026-09-24', 'stby'); paste(email('2026/09/24', [{ cp: 'LTN - BLQ', off: '15:00', on: '17:15' }]));
r = rows('2026-09-24');
check('SBY + vuelos → filas de vuelo (no SBY)', r[0][1] === 'FR100' && r[0][3] === 'BLQ', JSON.stringify(r.map(x => x[1])));
check('SBY + vuelos → conflicto en UK Days → U «?»', S('2026-09-24').kind === 'conflict' && U(r) === '?', JSON.stringify([S('2026-09-24'), U(r)]));
cal('2026-09-25', 'sd'); paste(email('2026/09/25', [{ cp: 'BLQ - STN', off: '14:00', on: '16:20' }]));
check('SD + email → conflicto (como SBY/SIM/OFF)', S('2026-09-25').kind === 'conflict');

// ── AC-6: decidir pendientes desde UK Days
run(`ukDecidePending('2026-09-24', 'no')`);
check('ukDecidePending(no) sobre conflicto → manual no, motivo original, sale de pendientes', E('2026-09-24')?.state === 'no' && E('2026-09-24')?.manual && /discrepan/.test(E('2026-09-24').reason) && S('2026-09-24').state === 'no', JSON.stringify(E('2026-09-24')));
check('… y el Excel pasa de «?» a vacío', U(rows('2026-09-24')) === '');
reset(); cal('2026-06-02', 'duty');
check('DUTY sin email (p. ej. solo DH) → pendiente duty', S('2026-06-02').kind === 'duty');
run(`ukDecidePending('2026-06-02', 'uk')`);
check('ukDecidePending(uk) sobre DUTY sin email → manual uk', E('2026-06-02')?.state === 'uk' && E('2026-06-02')?.manual && S('2026-06-02').state === 'uk', JSON.stringify(E('2026-06-02')));
run(`ukDecidePending('2026-06-02', 'no')`);
check('ukDecidePending sobre un día ya decidido no hace nada', E('2026-06-02')?.state === 'uk');
reset(); paste(email('2026/10/12', [{ cp: 'STN - DUB', off: '15:00', on: '16:10' }, { cp: 'DUB - STN', off: '17:00' }]));
check('email incompleto (sin On Block) → pendiente incomplete, U «?»', S('2026-10-12').kind === 'incomplete' && U(rows('2026-10-12')) === '?');

// ── AC-5: descarga bloqueada
reset(); now('2026-04-12T12:00:00Z');
cal('2026-04-06', 'off'); cal('2026-04-07', 'off'); cal('2026-04-08', 'duty');
run('downloadTaxExcel()');
check('pendientes pasados → no se descarga (writeFile no llamado)', xl.file === null);
check('aviso con total, huecos por rango y días por decidir', /No se descarga: 4 días sin decidir/.test(st.at(-1)) && /huecos 09\/04\/26–11\/04\/26/.test(st.at(-1)) && /por decidir 08\/04\/26/.test(st.at(-1)), st.at(-1));
for (const d of ['2026-04-09', '2026-04-10', '2026-04-11']) cal(d, 'off');
run(`ukDecidePending('2026-04-08', 'uk')`);
run('downloadTaxExcel()');
check('sin pendientes pasados → se descarga', xl.file === 'TAX YEAR 26-27.xlsx' && xl.sheet === 'TAX 26-27', `${xl.file} / ${xl.sheet}`);
check('título del tax year derivado del periodo', xl.rows?.[2]?.[4] === 'Tax Year 2026-2027', JSON.stringify(xl.rows?.[2]));
const serial08 = run(`isoToExcelSerial('2026-04-08')`);
const r08 = xl.rows.find(x => x[0] === serial08);
check('DUTY sin email decidido UK → fila «DUTY» con U=1 y UW vacío', r08 && r08[1] === 'DUTY' && r08[18] === 1 && r08[17] === '', JSON.stringify(r08));
const r12 = xl.rows.find(x => x[0] === run(`isoToExcelSerial('2026-04-12')`));
check('hoy (12/04) sin datos no bloquea y sale vacío', r12 && r12.length === 1, JSON.stringify(r12));
reset(); now('2026-04-06T12:00:00Z'); run(`addUKDayManual('2026-07-01')`);
check('UK Day añadido a mano sin vuelos ni calendario → U=1 en el Excel', U(rows('2026-07-01')) === 1 && rows('2026-07-01')[0][1] === '', JSON.stringify(rows('2026-07-01')));

console.log(fails ? `\n${fails} FALLO(S)` : '\nTODO OK');
process.exit(fails ? 1 : 0);
