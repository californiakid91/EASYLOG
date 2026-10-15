// Pruebas del plan 13.1-01: el día de ayer (Londres) tiene 24 h de gracia antes de contar como pendiente
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

const offRange = (a, b) => run(`for (let d = '${a}'; d <= '${b}'; d = addDaysISO(d, 1)) _dayMap[d] = 'off';`);
const count = () => ctx.document.getElementById('ukdays-count').textContent;
const EM = d => email(d, [{ cp: 'STN - DUB', off: '15:00', on: '16:10' }, { cp: 'DUB - STN', off: '17:00', on: '18:10' }]);

// ── AC-1: hoy 16/10 (09:00 BST) → ayer = 15/10 en gracia, anteayer 14/10 pendiente
now('2026-10-16T08:00:00Z');
reset(); offRange('2026-04-06', '2026-10-13'); cal('2026-10-14', 'duty'); cal('2026-10-15', 'duty');
check('ayer = 15/10 (Londres)', run('londonYesterdayISO()') === '2026-10-15');
check('DUTY sin email de anteayer → pendiente; el de ayer no', JSON.stringify(pendIsos()) === '["2026-10-14"]', JSON.stringify(pendIsos()));
run(`delete _dayMap['2026-10-15']`);
check('hueco de ayer → no pendiente ni hueco del botón OFF', !pendIsos().includes('2026-10-15') && JSON.stringify(JSON.parse(run('JSON.stringify(pendingUKBlocks().map(b => b.days))'))) === '[]', run('JSON.stringify(pendingUKBlocks())'));
cal('2026-10-15', 'sim');
check('SIM de ayer → no pendiente (aunque su estado es cal-ask)', !pendIsos().includes('2026-10-15') && S('2026-10-15').kind === 'cal-ask');
reset(); offRange('2026-04-06', '2026-10-14'); cal('2026-10-15', 'off'); paste(EM('2026/10/15'));
check('conflicto (OFF + email) de ayer → no pendiente', S('2026-10-15').kind === 'conflict' && !pendIsos().includes('2026-10-15'));
reset(); offRange('2026-04-06', '2026-10-14'); paste(email('2026/10/15', [{ cp: 'STN - DUB', off: '15:00', on: '16:10' }, { cp: 'DUB - STN', off: '17:00' }]));
check('email incompleto de ayer → no pendiente', S('2026-10-15').kind === 'incomplete' && pendIsos().length === 0, JSON.stringify(pendIsos()));

// Excel, cabecera, máximo posible y «Fuera de UK»
reset(); offRange('2026-04-06', '2026-10-14'); cal('2026-10-15', 'duty');
run('downloadTaxExcel()');
check('ayer pendiente no bloquea el Excel', xl.file === 'TAX YEAR 26-27.xlsx', `${xl.file} · ${st.at(-1)}`);
const r15 = xl.rows?.find(x => x[0] === run(`isoToExcelSerial('2026-10-15')`));
check('en el Excel ayer sale con U «?»', r15 && r15[1] === 'DUTY' && r15[18] === '?', JSON.stringify(r15));
run('renderUKDays()');
check('cabecera sin «pend.»', !/pend\./.test(count()), count());
check('máximo posible cuenta ayer: «si el pendiente fuera UK (incl. ayer, en espera del email)»', /Máximo posible si el pendiente fuera UK \(incl\. ayer, en espera del email\): 1 de 90/.test(body()), (body().match(/Máximo posible[^<]*/) || [''])[0]);
check('«Fuera de UK» avisa «1 día (ayer) en espera» y sigue sin pendientes', /1 día \(ayer\) en espera/.test(body()) && !/sin decidir — confirma/.test(body()));
run('emailUKDaysBackup()');
check('backup: «· 1 (ayer) en espera del email»', /Total: 0 confirmados · 0 pendientes · 1 \(ayer\) en espera del email/.test(decodeURIComponent(String(win.location.href || ''))), (decodeURIComponent(String(win.location.href || '')).match(/Total:[^\n]*/) || [''])[0]);
check('«Fuera de UK» sigue incluyendo ayer si es No UK (ukPastDays sin cambios)', JSON.parse(run('JSON.stringify(ukPastDays())')).at(-1) === '2026-10-15');

// 24 h después: el 15/10 ya es pendiente
now('2026-10-17T00:30:00Z'); // 01:30 BST del 17/10 → ayer = 16/10
check('pasadas 24 h desde el final del 15/10 → pendiente', pendIsos().includes('2026-10-15') && !pendIsos().includes('2026-10-16'), JSON.stringify(pendIsos()));
run('downloadTaxExcel()');
check('… y entonces bloquea el Excel', /No se descarga el Excel 2026-27: 1 día sin decidir/.test(st.at(-1)), st.at(-1));

// Borde de año: el 06/04/2027 el 05/04/2027 (año anterior) está en gracia
now('2027-04-06T10:00:00Z');
reset(); offRange('2026-04-06', '2027-04-04'); cal('2027-04-05', 'duty');
check('06/04: el 05/04 del año anterior no cuenta en el banner de cierre (borde aceptado 13.1)', /Cierra 2026-27 · descarga su Excel/.test(run('tyCloseBannerHTML()')), run('tyCloseBannerHTML()'));
run(`ukShowTY('2026-27')`); xl.file = null; run('downloadTaxExcel()');
check('06/04: el Excel 2026-27 se descarga con el 05/04 en «?»', xl.file === 'TAX YEAR 26-27.xlsx', `${xl.file} · ${st.at(-1)}`);
now('2027-04-07T10:00:00Z'); run(`ukShowTY('2027-28')`);
check('07/04: el 05/04 ya es pendiente del año anterior', /Cierra 2026-27 · 1 pendiente/.test(run('tyCloseBannerHTML()')), run('tyCloseBannerHTML()'));

console.log(fails ? `\n${fails} FALLO(S)` : '\nTODO OK');
process.exit(fails ? 1 : 0);
