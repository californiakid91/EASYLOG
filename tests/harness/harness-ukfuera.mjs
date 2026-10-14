// Test 07.1-01 — «Fuera de UK»: total real de días pasados no UK, desglose trabajo / libres, desplegable y backup.
// Ejecuta el <script> real de index.html en node:vm (modo local, DOM falso, reloj fijo FIXED_NOW = 05/10/2026).
import fs from 'node:fs'; import vm from 'node:vm';
import { INDEX_PATH, FIXED_NOW } from '../lib.mjs';
const html = fs.readFileSync(process.argv[2] || INDEX_PATH, 'utf8');
const SCRIPT = html.match(/<script>\n([\s\S]*?)<\/script>\s*<\/body>/)[1];
const els = new Map();
const mk = () => new Proxy({ value: '', dataset: {}, style: {}, innerHTML: '', textContent: '' }, { get: (t, k) => k in t ? t[k] : k === 'classList' ? { add() {}, remove() {}, toggle() {}, contains() { return false; } } : k === 'querySelectorAll' ? () => [] : (k === 'closest' || k === 'querySelector') ? () => null : typeof k === 'symbol' ? undefined : () => mk(), set: (t, k, v) => (t[k] = v, true) });
const ls = new Map([['easylog_mode', 'local']]);
const __confirms = []; let __answer = true;
const win = { location: {}, _ukNowOverride: FIXED_NOW };
const ctx = vm.createContext({ document: { getElementById: id => (els.has(id) || els.set(id, mk()), els.get(id)), querySelector: () => mk(), querySelectorAll: () => [], body: mk(), createElement: () => mk(), addEventListener() {} },
  localStorage: { getItem: k => ls.get(k) ?? null, setItem: (k, v) => ls.set(k, String(v)), removeItem: k => ls.delete(k) },
  window: win, navigator: {}, location: {}, console, Date, Math, JSON, Promise, Intl, Blob: class { constructor(p) { this.p = p; } }, URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} }, confirm: m => (__confirms.push(m), __answer), prompt: () => null, alert() {},
  setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0 });
let bootError = null;
try { vm.runInContext(SCRIPT, ctx); } catch (e) { bootError = e; }
const run = c => vm.runInContext(c, ctx); let fails = 0;
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); if (!ok) fails++; };
check('arranque sin errores', !bootError, bootError && String(bootError));
if (bootError) process.exit(1);
run('showStatus = () => {};');
const J = c => JSON.parse(run(`JSON.stringify(${c})`));
const body = () => String(ctx.document.getElementById('ukdays-body').innerHTML);
const paste = text => { ctx.document.getElementById('input').value = text; run('addDay()'); };
const email = (date, secs) => date + '\n\n' + secs.map((s, i) => [
  `FlightNumber : FR${100 + i}`, 'Registration : EIABC', `City Pair : ${s.cp}`, `STD : ${s.off}`, `STA : ${s.on}`,
  `Airborne : ${s.off}`, `Landed : ${s.on}`, `Off Block : ${s.off}`, `On Block : ${s.on}`, 'Total Block : 02:00',
  '', 'Pilot Flying :', 'Take Off : VEGRIC', 'Landing : VEGRIC', ''].join('\n')).join('\n\n');

// ── Escenario sintético (año 2026-27; hoy = 05/10/2026, ayer = 04/10/2026)
run('_cache = {}; _excelData = {}; _ukdays = {}; _dayMap = {};');
paste(email('2026/09/01', [{ cp: 'STN - DUB', off: '15:00', on: '16:10' }, { cp: 'DUB - STN', off: '17:00', on: '18:10' }])); // R1 → UK
paste(email('2026/09/02', [{ cp: 'STN - LIS', off: '18:00', on: '21:00' }]));                                                  // R2 → trabajo
paste(email('2026/09/03', [{ cp: 'STN - DUB', off: '20:00', on: '21:10' }, { cp: 'DUB - STN', off: '22:00', on: '23:30' }])); // R3 → trabajo
const man = (reason) => ({ state: 'no', route: '—', onBlock: '--:--', tz: 'BST', manual: true, source: 'manual', reason, at: 'x' });
run(`
  _dayMap['2026-09-04'] = 'off';                       // OFF calendario → libre
  _dayMap['2026-09-05'] = 'stby';                      // SBY → UK
  _ukdays['2026-09-06'] = ${JSON.stringify(man('<img src=x onerror=alert(1)>'))}; // No UK manual sin datos → libre (motivo escapado)
  _dayMap['2026-09-07'] = 'duty'; _ukdays['2026-09-07'] = ${JSON.stringify(man('dormí fuera'))};   // DUTY + No UK manual → trabajo
  _ukdays['2026-09-08'] = { state: 'no', route: 'STN→LIS', onBlock: '22:00', tz: 'BST', source: 'rule:R2', reason: 'acaba en LIS' };
  _dayMap['2026-09-08'] = 'off';                       // R2 sin email + OFF → trabajo (la ruta real manda)
  _dayMap['2026-09-09'] = 'sim'; _ukdays['2026-09-09'] = ${JSON.stringify(man('sim fuera'))};      // SIM + No UK manual → trabajo
  _dayMap['2026-09-10'] = 'off'; _dayMap['2026-09-11'] = 'off';                                     // rango de libres
  _dayMap['2026-10-05'] = 'off';                       // hoy → excluido
  _dayMap['2026-10-10'] = 'off';                       // futuro → excluido
  _dayMap['2026-10-12'] = 'stby';                      // SBY futuro: está en ukList pero no es pasado
  _ukdays['2026-10-15'] = ${JSON.stringify(man('viaje previsto'))}; // No UK manual futuro → aparte
  renderUKDays();`);

// ── AC-1: total
const S = J('(() => { const s = ukSummary(); return { out: s.outList.map(x => x.iso), outKind: Object.fromEntries(s.outList.map(x => [x.iso, x.outKind])), uk: s.ukList.map(x => x.iso), pend: s.pending.length, past: ukPastDays().length, yest: londonYesterdayISO() }; })()');
const ukPast = S.uk.filter(i => i <= S.yest).length;
check('AC-1 fuera + UK pasados + pendientes = días pasados', S.out.length + ukPast + S.pend === S.past, `${S.out.length} + ${ukPast} + ${S.pend} vs ${S.past}`);
check('AC-1 la identidad falla con ukList.length (SBY futuro): el test no es vacío', S.out.length + S.uk.length + S.pend !== S.past, `${S.uk.length} vs ${ukPast}`);
check('AC-1 hoy y futuros excluidos', !S.out.some(i => i >= '2026-10-05'), S.out.join(','));
check('AC-1 outList = días pasados en estado no', JSON.stringify(S.out) === JSON.stringify(['2026-09-02', '2026-09-03', '2026-09-04', '2026-09-06', '2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11']), S.out.join(','));

// ── AC-2: clasificación
const K = S.outKind;
check('AC-2 R2 con email → trabajo', K['2026-09-02'] === 'work');
check('AC-2 R3 con email → trabajo', K['2026-09-03'] === 'work');
check('AC-2 OFF calendario → libre', K['2026-09-04'] === 'off');
check('AC-2 No UK manual sin datos → libre', K['2026-09-06'] === 'off');
check('AC-2 DUTY + No UK manual → trabajo', K['2026-09-07'] === 'work');
check('AC-2 R2 sin email con OFF en calendario → trabajo (ruta real manda)', K['2026-09-08'] === 'work');
check('AC-2 SIM + No UK manual → trabajo', K['2026-09-09'] === 'work');
const nW = Object.values(K).filter(k => k === 'work').length, nO = Object.values(K).filter(k => k === 'off').length;
check('AC-2 trabajo + libres = total (5 + 4 = 9)', nW === 5 && nO === 4 && nW + nO === S.out.length, `${nW}+${nO}`);

// ── AC-3: sección con desplegable
let b = body();
const sec = () => body().slice(body().indexOf('data-ukmonth="no"'));
check('AC-3 cabecera «Fuera de UK» con «9 días»', /<span>Fuera de UK<\/span>\s*<span class="meta">9 días<\/span>/.test(b));
check('AC-3 ya no existe la lista «No UK» antigua', !/<span>No UK<\/span>/.test(b));
check('AC-3 desglose «5 trabajo · 4 libres»', sec().includes('5 trabajo · 4 libres'));
check('AC-3 select con contadores y «trabajo» seleccionado', /<option value="work" selected>Días de trabajo fuera de UK \(5\)<\/option>/.test(sec()) && /<option value="off">Días libres \/ OFF \(4\)<\/option>/.test(sec()));
check('AC-3 solo la lista activa (trabajo): 02/09 sí, 04/09 no', sec().includes('02/09/26') && !sec().includes('04/09/26'));
check('AC-3 grupo cerrado por defecto', /data-ukmonth="no"[\s\S]*?<div class="day-list" style="display:none">/.test(b));
check('AC-3 No UK manual futuro visible aparte con ✕', /Marcados para hoy o fechas futuras/.test(sec()) && sec().includes('15/10/26') && /removeUKDay\('2026-10-15'\)/.test(sec()));
check('AC-3 sin pendientes no hay nota… (hay huecos → nota presente)', /pendientes? sin decidir no incluidos?/.test(sec()));
run(`setUKOutKind('off')`);
check('AC-3 setUKOutKind(off): libres visibles, trabajo no', sec().includes('04/09/26') && sec().includes('10/09/26') && !sec().includes('02/09/26'));
check('AC-3 «libres» seleccionado tras repintar', /<option value="off" selected>/.test(sec()) && !/<option value="work" selected>/.test(sec()));
check('AC-3 grupo abierto tras cambiar la opción', /data-ukmonth="no"[\s\S]*?<div class="day-list" style="display:">/.test(body()));
check('AC-3 motivo con HTML escapado', sec().includes('&lt;img') && !sec().includes('<img'));
run('renderUKDays()');
check('AC-3 opción y apertura sobreviven a un repintado', /<option value="off" selected>/.test(sec()) && /style="display:">/.test(sec()));
run(`setUKOutKind('x<script>')`);
check('AC-3 valor inválido ignorado', run('_ukOutKind') === 'off');
check('AC-3 filas con botón UK y ✕ solo en manuales', /ukForceUKFromOut\('2026-09-04'\)/.test(sec()) && /removeUKDay\('2026-09-06'\)/.test(sec()) && !/removeUKDay\('2026-09-04'\)/.test(sec()));
// Botón «UK» de la lista: pide confirmación; cancelar no cambia nada, aceptar → UK manual
__answer = false; run(`ukForceUKFromOut('2026-09-04')`);
check('UK en «Fuera de UK» pide confirmación con fecha y estado actual', /¿Pasar el 04\/09\/26 a UK Day\?/.test(__confirms.at(-1) || '') && /OFF en calendario/.test(__confirms.at(-1) || ''), __confirms.at(-1));
check('cancelar → el día sigue fuera de UK', J(`ukDayStatus('2026-09-04').state`) === 'no');
__answer = true; run(`ukForceUKFromOut('2026-09-04')`);
check('aceptar → UK manual', J(`ukDayStatus('2026-09-04')`).state === 'uk' && J(`_ukdays['2026-09-04'].manual`) === true);
run(`delete _ukdays['2026-09-04']; ukForceUKFromOut('x'); renderUKDays();`);
check('fecha inválida ignorada', __confirms.length === 2);

run(`delete _excelData['2026-09-02']; delete _cache['2026-09-02']; delete _ukdays['2026-09-02'];
     delete _excelData['2026-09-03']; delete _cache['2026-09-03']; delete _ukdays['2026-09-03'];
     ['2026-09-07','2026-09-08','2026-09-09'].forEach(i => { delete _ukdays[i]; delete _dayMap[i]; });
     setUKOutKind('work');`);
check('AC-3 lista vacía → «Ninguno»', sec().includes('>Ninguno<') && sec().includes('(0)'), '');

// Solo futuros (sin pasados fuera): sin select ni «Ninguno», solo la cabecera «0 días» y el bloque de futuros
run(`_cache = {}; _excelData = {}; _ukdays = { '2026-10-05': ${JSON.stringify(man('hoy fuera'))} }; _dayMap = {}; renderUKDays();`);
check('G6 solo hoy/futuros: cabecera «0 días», sin select ni «Ninguno», hoy en «hoy o fechas futuras»',
  /<span class="meta">0 días<\/span>/.test(sec()) && !/uk-out-kind/.test(sec()) && !/Ninguno/.test(sec()) && /hoy o fechas futuras[\s\S]*05\/10\/26/.test(sec()));
// toggleUKMonth('no') sin grupo pintado no altera el flag
run(`_ukOutOpen = false; var __qs = document.querySelector; document.querySelector = () => null; toggleUKMonth('no'); document.querySelector = __qs;`);
check('G6 toggleUKMonth sin grupo no invierte _ukOutOpen', run('_ukOutOpen') === false);

// ── AC-4: backup
run('_cache = {}; _excelData = {}; _ukdays = {}; _dayMap = {};');
paste(email('2026/09/01', [{ cp: 'STN - DUB', off: '15:00', on: '16:10' }, { cp: 'DUB - STN', off: '17:00', on: '18:10' }]));
paste(email('2026/09/02', [{ cp: 'STN - LIS', off: '18:00', on: '21:00' }]));
run(`['2026-09-04','2026-09-10','2026-09-11','2026-09-12'].forEach(i => _dayMap[i] = 'off');
     _ukdays['2026-09-20'] = ${JSON.stringify(man('dormí en VLC'))}; _ukdays['2026-10-20'] = ${JSON.stringify(man('viaje previsto'))};
     emailUKDaysBackup();`);
const mail = decodeURIComponent(String(run('window.location.href')).split('body=')[1] || '');
check('AC-4 línea «Fuera de UK: 6 (1 trabajo · 5 libres)»', mail.includes('Fuera de UK: 6 (1 trabajo · 5 libres)'), mail.split('\n').filter(l => /Fuera/.test(l)).join(' | '));
check('AC-4 trabajo uno a uno con motivo y procedencia', /02\/09\/26 .*LIS.*\[R2\]/.test(mail));
check('AC-4 libres en rangos (04/09 suelto + 10–12/09)', /04\/09\/26 {2}\(1 día\)/.test(mail) && /10\/09\/26–12\/09\/26 {2}\(3 días\)/.test(mail) && !/^ {2}11\/09\/26/m.test(mail));
check('G6 libre guardado a mano sale uno a uno con motivo y [man]', /20\/09\/26 {2}dormí en VLC {2}\[man\]/.test(mail));
check('G6 No UK futuro en el backup', /hoy o fechas futuras[\s\S]*20\/10\/26 {2}viaje previsto/.test(mail));
check('AC-4 ya no hay sección «No UK (no cuentan)»', !/No UK \(no cuentan\)/.test(mail));
check('AC-4 Total y Computables intactos', /Total: 1 confirmados · \d+ pendientes/.test(mail) && /Computables: 1 \(1 UK − 0 excepcionales\)/.test(mail));

console.log(fails ? `\n${fails} FALLO(S)` : '\nTODO OK');
process.exit(fails ? 1 : 0);
