// Pruebas de las reglas reales de UK Days (fase 3, plan 02) sobre el <script> real de index.html (modo local, DOM falso)
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.resolve(HERE, '../../../index.html'), 'utf8');
const SCRIPT = html.match(/<script>\n([\s\S]*?)<\/script>\s*<\/body>/)[1];
const els = new Map();
const mk = () => new Proxy({ value: '', dataset: {}, style: {}, innerHTML: '', textContent: '' }, { get: (t, k) => k in t ? t[k] : k === 'classList' ? { add() {}, remove() {}, toggle() {}, contains() { return false; } } : k === 'querySelectorAll' ? () => [] : (k === 'closest' || k === 'querySelector') ? () => null : typeof k === 'symbol' ? undefined : () => mk(), set: (t, k, v) => (t[k] = v, true) });
const ls = new Map([['easylog_mode', 'local']]); const st = []; const confirms = []; let answer = true;
const win = { location: {} };
const ctx = vm.createContext({ document: { getElementById: id => (els.has(id) || els.set(id, mk()), els.get(id)), querySelector: () => mk(), querySelectorAll: () => [], body: mk(), createElement: () => mk(), addEventListener() {} },
  localStorage: { getItem: k => ls.get(k) ?? null, setItem: (k, v) => ls.set(k, String(v)), removeItem: k => ls.delete(k) },
  window: win, navigator: {}, location: {}, console, Date, Math, JSON, Promise, Intl, confirm: m => (confirms.push(m), answer), prompt: () => null, alert: m => st.push('alert: ' + m),
  setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, __st: st });
let bootError = null;
try { vm.runInContext(SCRIPT, ctx); } catch (e) { bootError = e; }
const run = c => vm.runInContext(c, ctx); let fails = 0;
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); if (!ok) fails++; };
check('arranque en modo local sin ReferenceError (UK_AP/_dayMap declarados antes de usarse)', !bootError, bootError && String(bootError));
if (bootError) process.exit(1);
vm.runInContext('showStatus = (t, m) => __st.push(t + ": " + m); var __dm = 0; const __sdm = saveDayMap; saveDayMap = function () { __dm++; return __sdm(); };', ctx);
const reset = () => { run('_cache = {}; _excelData = {}; _ukdays = {}; _dayMap = {}; __dm = 0;'); answer = true; };
const e = iso => run(`JSON.stringify(_ukdays['${iso}'] ?? null)`);
const E = iso => JSON.parse(e(iso));
const S = iso => JSON.parse(run(`JSON.stringify(ukDayStatus('${iso}'))`));
const paste = text => { ctx.document.getElementById('input').value = text; run('addDay()'); };
const email = (date, secs) => date + '\n\n' + secs.map((s, i) => [
  `FlightNumber : FR${100 + i}`, 'Registration : EIABC', `City Pair : ${s.cp}`, `STD : ${s.std ?? s.off}`, `STA : ${s.on ?? s.off}`,
  ...(s.off ? [`Airborne : ${s.off}`] : []), ...(s.on ? [`Landed : ${s.on}`] : []),
  ...(s.off ? [`Off Block : ${s.off}`] : []), ...(s.on ? [`On Block : ${s.on}`] : []), 'Total Block : 02:00',
  '', 'Pilot Flying :', 'Take Off : VEGRIC', 'Landing : VEGRIC', ''].join('\n')).join('\n\n');
const now = iso => { win._ukNowOverride = iso; };

// ── AC-1: R1 / R2 / R3 / sin On Block
reset(); paste(email('2026/10/06', [{ cp: 'STN - RZE', off: '17:00', on: '19:15' }, { cp: 'RZE - STN', off: '20:00', on: '22:30' }]));
let x = E('2026-10-06');
check('R1: on 22:30Z en STN (23:30 BST) → UK, source rule:R1', x?.state === 'uk' && x.source === 'rule:R1' && x.onBlock === '23:30' && x.tz === 'BST', e('2026-10-06'));
reset(); paste(email('2026/10/07', [{ cp: 'STN - DUB', off: '15:00', on: '16:10' }, { cp: 'DUB - MAN', off: '17:00', on: '18:00' }]));
check('R1: acaba en MAN (otro aeropuerto UK) → UK', E('2026-10-07')?.state === 'uk', e('2026-10-07'));
reset(); paste(email('2026/10/08', [{ cp: 'STN - LIS', off: '18:00', on: '21:00' }]));
x = E('2026-10-08');
check('R2: acaba en LIS 21:00Z → NO visible, source rule:R2, reason nombra LIS', x?.state === 'no' && x.source === 'rule:R2' && /LIS/.test(x.reason), e('2026-10-08'));
check('R2: no suma al contador (ukDayStatus = no)', S('2026-10-08').state === 'no');
reset(); paste(email('2026/10/09', [{ cp: 'STN - JER', off: '18:00', on: '19:00' }]));
check('JER (Crown Dependency) no cuenta como UK para la regla → R2', E('2026-10-09')?.source === 'rule:R2', e('2026-10-09'));
reset(); paste(email('2026/10/24', [{ cp: 'STN - DUB', off: '20:00', on: '21:10' }, { cp: 'DUB - STN', off: '22:00', on: '23:30' }]));
x = E('2026-10-24');
check('R3: 24/10/2026 on 23:30Z = 00:30 BST del 25 → NO, source rule:R3', x?.state === 'no' && x.source === 'rule:R3' && x.onBlock === '00:30', e('2026-10-24'));
check('R3: el día siguiente no se toca', e('2026-10-25') === 'null');
reset(); run(`_ukdays = { '2026-11-10': { state: 'uk', route: 'X→STN', onBlock: '10:00', tz: 'GMT', source: 'rule:R1' } };`);
paste(email('2026/11/10', [{ cp: 'STN - DUB', off: '15:00', on: '16:10' }, { cp: 'DUB - STN', off: '17:00' }]));
check('sin On Block en el último sector → no toca la entrada existente', E('2026-11-10')?.route === 'X→STN', e('2026-11-10'));

// ── AC-2: tombstone, manual intocable, forzar UK sobre un NO
reset(); paste(email('2026/11/12', [{ cp: 'STN - DUB', off: '15:00', on: '16:10' }, { cp: 'DUB - STN', off: '17:00', on: '18:10' }]));
run(`removeUKDay('2026-11-12')`);
x = E('2026-11-12');
check('✕ en UK automático → tombstone {state:no, manual, source:manual, at}', x?.state === 'no' && x.manual === true && x.source === 'manual' && !!x.at, e('2026-11-12'));
run('backfillUKDays()');
check('tombstone sobrevive a backfillUKDays', E('2026-11-12')?.state === 'no' && E('2026-11-12')?.manual === true);
paste(email('2026/11/12', [{ cp: 'STN - DUB', off: '15:00', on: '16:10' }, { cp: 'DUB - STN', off: '17:00', on: '18:10' }]));
check('tombstone sobrevive a re-pegar el email', E('2026-11-12')?.state === 'no' && E('2026-11-12')?.manual === true, e('2026-11-12'));
reset(); paste(email('2026/10/08', [{ cp: 'STN - LIS', off: '18:00', on: '21:00' }]));
run(`addUKDayManual('2026-10-08')`);
x = E('2026-10-08');
check('addUKDayManual sobre un R2 → UK manual (antes: "ya registrado")', x?.state === 'uk' && x.manual === true && x.source === 'manual', e('2026-10-08'));
reset(); paste(email('2026/10/08', [{ cp: 'STN - LIS', off: '18:00', on: '21:00' }]));
run(`openUKDateModal()`); ctx.document.getElementById('ukday-date').value = '2026-10-08'; run('confirmUKDateModal()');
check('"+ Añadir fecha" sobre un R2 → UK manual', E('2026-10-08')?.manual === true && E('2026-10-08')?.state === 'uk', e('2026-10-08'));
reset(); paste(email('2026/10/08', [{ cp: 'STN - LIS', off: '18:00', on: '21:00' }]));
ctx.document.getElementById('input').value = 'añade UK days 8 octubre'; run('addDay()');
check('comando de texto sobre un R2 → UK manual', E('2026-10-08')?.manual === true && E('2026-10-08')?.state === 'uk', e('2026-10-08') + ' · ' + st.at(-1));
reset(); run(`_ukdays = { '2026-11-15': { state: 'uk', route: '—', onBlock: '--:--', tz: 'GMT', manual: true, source: 'manual' } };`);
paste(email('2026/11/15', [{ cp: 'STN - LIS', off: '18:00', on: '21:00' }]));
check('re-pegar no cambia un UK manual', E('2026-11-15')?.manual === true && E('2026-11-15')?.state === 'uk', e('2026-11-15'));
run(`removeDay('2026-11-15')`);
check('removeDay no toca la entrada manual', E('2026-11-15')?.manual === true);
reset(); paste(email('2026/10/08', [{ cp: 'STN - LIS', off: '18:00', on: '21:00' }])); run(`removeDay('2026-10-08')`);
check('removeDay borra el NO automático del día', e('2026-10-08') === 'null');

// ── AC-3: compatibilidad con la nube (entradas antiguas)
reset(); run(`_ukdays = { '2026-09-19': { route: 'AOI→STN', onBlock: '23:45', tz: 'BST' }, '2026-09-20': { route: '—', onBlock: '--:--', tz: 'BST', manual: true }, '2026-09-18': { route: 'STN→HAM', onBlock: '15:20', tz: 'BST' } };`);
const before = e('2026-09-19');
run('backfillUKDays()');
check('entrada antigua sin state = UK, source rule:R1', S('2026-09-19').state === 'uk' && S('2026-09-19').source === 'rule:R1');
check('manual antigua = UK, source manual', S('2026-09-20').state === 'uk' && S('2026-09-20').source === 'manual');
check('las entradas antiguas no se reescriben al cargar', e('2026-09-19') === before);
check('antigua automática que acaba fuera (STN→HAM) → marca de revisar', S('2026-09-18').legacyOutside === true && S('2026-09-19').legacyOutside === false);

// ── AC-3b / AC-4: calendario, conflicto, pendientes y huecos
reset(); run(`_dayMap = { '2026-11-01': 'off', '2026-11-02': 'stby', '2026-11-03': 'sim', '2026-11-04': 'duty' };`);
check('calendario off → NO', S('2026-11-01').state === 'no' && S('2026-11-01').source === 'cal:off');
check('calendario stby → UK', S('2026-11-02').state === 'uk' && S('2026-11-02').source === 'cal:stby');
check('calendario sim → UK', S('2026-11-03').state === 'uk');
check('calendario duty sin email → pendiente', S('2026-11-04').state === 'pending' && S('2026-11-04').kind === 'duty');
reset(); paste(email('2026/11/05', [{ cp: 'STN - DUB', off: '15:00', on: '16:10' }, { cp: 'DUB - STN', off: '17:00', on: '18:10' }]));
run(`_dayMap['2026-11-05'] = 'off';`);
check('email + off en calendario → conflicto (pendiente)', S('2026-11-05').state === 'pending' && S('2026-11-05').kind === 'conflict');
reset(); paste(email('2026/11/06', [{ cp: 'STN - DUB', off: '15:00', on: '16:10' }, { cp: 'DUB - STN', off: '17:00' }]));
check('email sin On Block y sin entrada → pendiente "incompleto"', S('2026-11-06').state === 'pending' && S('2026-11-06').kind === 'incomplete');
check('fuera del periodo → no aplica', S('2026-04-05').state === 'none' && S('2027-04-06').state === 'none');

// P con "ahora" fijo: 20/11/2026 12:00Z → ayer en Londres = 19/11
reset(); now('2026-11-20T12:00:00Z');
run(`(() => { const d = {}; for (let t = new Date('2026-04-06T00:00:00Z'); t < new Date('2026-11-12T00:00:00Z'); t = new Date(t.getTime() + 86400000)) d[t.toISOString().slice(0,10)] = 'off'; _dayMap = d; })()`);
// 12–15/11 hueco · 16/11 email UK · 17/11 email incompleto · 18/11 off · 19/11 hueco · 20/11 hoy
paste(email('2026/11/16', [{ cp: 'STN - DUB', off: '15:00', on: '16:10' }, { cp: 'DUB - STN', off: '17:00', on: '18:10' }]));
paste(email('2026/11/17', [{ cp: 'STN - DUB', off: '15:00', on: '16:10' }, { cp: 'DUB - STN', off: '17:00' }]));
run(`_dayMap['2026-11-18'] = 'off';`);
const pend = JSON.parse(run('JSON.stringify(pendingUKDays().map(x => x.iso))'));
check('P = 12,13,14,15,17,19/11 (hoy 20/11 excluido)', JSON.stringify(pend) === JSON.stringify(['2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15', '2026-11-17', '2026-11-19']), JSON.stringify(pend));
const blocks = JSON.parse(run('JSON.stringify(pendingUKBlocks().map(b => b.days))'));
check('huecos = [12–15/11], [19/11]; el 17/11 (email incompleto) no entra', JSON.stringify(blocks) === JSON.stringify([['2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15'], ['2026-11-19']]), JSON.stringify(blocks));
now('2026-10-24T23:30:00Z'); // 00:30 BST del 25 → ayer Londres = 24/10
check('"ayer" se calcula en hora de Londres (23:30Z 24/10 BST → ayer = 24/10)', run('londonYesterdayISO()') === '2026-10-24', run('londonYesterdayISO()'));
now('2027-06-01T12:00:00Z');
check('después del periodo, los días pasados acaban en 05/04/2027', run('ukPastDays().at(-1)') === '2027-04-05');
delete win._ukNowOverride;

// G6: día solo en el Excel (historial borrado) sin entrada → backfill aplica la regla (no queda "incompleto")
reset(); paste(email('2026/10/24', [{ cp: 'STN - DUB', off: '20:00', on: '21:10' }, { cp: 'DUB - STN', off: '22:00', on: '23:30' }]));
run(`_cache = {}; delete _ukdays['2026-10-24'];`); run('backfillUKDays()');
check('solo-Excel sin entrada → backfill crea R3 (no "email incompleto")', E('2026-10-24')?.source === 'rule:R3' && S('2026-10-24').state === 'no', e('2026-10-24'));
run(`_ukdays['2026-10-24'] = { state: 'uk', route: '—', onBlock: '--:--', tz: 'BST', manual: true, source: 'manual' };`); run(`removeUKDay('2026-10-24')`);
check('quitar UK manual de un día solo-Excel → vuelve a la regla del email', E('2026-10-24')?.source === 'rule:R3', e('2026-10-24'));

// Checkpoint: ✕ en un UK que viene del calendario (SBY) → "No UK" manual; el calendario no cambia
reset(); run(`_dayMap = { '2026-05-06': 'stby' };`);
run(`removeUKDay('2026-05-06')`);
check('✕ en SBY de calendario → No UK manual y _dayMap intacto', S('2026-05-06').state === 'no' && S('2026-05-06').source === 'manual' && run(`_dayMap['2026-05-06']`) === 'stby', JSON.stringify(S('2026-05-06')));
run(`addUKDayManual('2026-05-06')`);
check('…y "UK" lo deshace (UK manual)', S('2026-05-06').state === 'uk');

// ── AC-4/5/6: UI (render, botón OFF, backup)
const body = () => ctx.document.getElementById('ukdays-body').innerHTML;
const count = () => ctx.document.getElementById('ukdays-count').textContent;
reset(); now('2026-11-20T12:00:00Z');
run(`(() => { const d = {}; for (let t = new Date('2026-04-06T00:00:00Z'); t < new Date('2026-11-12T00:00:00Z'); t = new Date(t.getTime() + 86400000)) d[t.toISOString().slice(0,10)] = 'off'; _dayMap = d; })()`);
paste(email('2026/11/16', [{ cp: 'STN - DUB', off: '15:00', on: '16:10' }, { cp: 'DUB - STN', off: '17:00', on: '18:10' }]));
paste(email('2026/11/17', [{ cp: 'STN - LIS', off: '18:00', on: '21:00' }]));
run(`_dayMap['2026-11-18'] = 'off'; _dayMap['2026-11-19'] = 'off';`);
run('renderUKDays()');
check('cabecera "1 / 91 · 4 pend." (hueco 12–15/11)', count() === '1 / 91 · 4 pend.', count());
check('texto neutro "sin decidir", sin clase danger por P', /4 días sin decidir/.test(body()) && /uk-status safe/.test(body()), '');
check('el R2 aparece en "No UK" con su motivo y botón Forzar UK', /No UK/.test(body()) && /LIS \(fuera de UK\)/.test(body()) && /addUKDayManual\('2026-11-17'\)/.test(body()));
check('UK listado con procedencia R1', /OB 18:10 GMT · R1/.test(body()));
run('ukMarkBlockOff(0)');
check('OFF del hueco: 4 días a off con 1 sola llamada a saveDayMap', run('__dm') === 1 && ['12', '13', '14', '15'].every(d => run(`_dayMap['2026-11-${d}']`) === 'off'), `__dm=${run('__dm')}`);
check('tras OFF, P = 0 y la cabecera sin "pend."', count() === '1 / 91', count());
reset(); now('2026-11-20T12:00:00Z');
paste(email('2026/11/17', [{ cp: 'STN - DUB', off: '15:00', on: '16:10' }, { cp: 'DUB - STN', off: '17:00' }]));
run(`_dayMap['2026-11-18'] = 'off';`);
const b0 = JSON.parse(run('JSON.stringify(pendingUKBlocks().map(b => b.days))'));
run(`(() => { const i = pendingUKBlocks().findIndex(b => b.days.includes('2026-11-16')); ukMarkBlockOff(i); })()`);
check('el botón OFF nunca escribe en un día con email (17/11 sin On Block)', run(`_dayMap['2026-11-17']`) === undefined && run(`_dayMap['2026-11-16']`) === 'off', JSON.stringify(b0.at(-1)));
reset(); now('2026-11-20T12:00:00Z'); run(`_dayMap = { '2026-11-02': 'stby' };`); run('renderUKDays()');
check('stby en el calendario → N = 1 (cal)', count().startsWith('1 / 91') && /calendario · cal/.test(body()), count());
reset(); run(`_ukdays = { '2026-09-18': { route: 'STN→HAM', onBlock: '15:20', tz: 'BST' } };`); run('renderUKDays()');
check('entrada antigua STN→HAM se pinta con "revisar"', /revisar/.test(body()));
// Backup
reset(); now('2026-11-20T12:00:00Z');
paste(email('2026/11/16', [{ cp: 'STN - DUB', off: '15:00', on: '16:10' }, { cp: 'DUB - STN', off: '17:00', on: '18:10' }]));
paste(email('2026/11/17', [{ cp: 'STN - LIS', off: '18:00', on: '21:00' }]));
run('emailUKDaysBackup()');
const mail = decodeURIComponent(String(run('window.location.href')).split('body=')[1] || '');
check('backup: UK con procedencia, No UK con motivo y resumen "N confirmados · P pendientes"', /\[R1\]/.test(mail) && /No UK/.test(mail) && /LIS/.test(mail) && /Total: 1 confirmados · \d+ pendientes/.test(mail), mail.split('\n').slice(-3).join(' | '));
// Nube sin hidratar: no se calculan pendientes
reset(); ls.set('easylog_mode', 'cloud'); run('cloud.hydrated = false; renderUKDays()');
check('nube sin hidratar → "Cargando…" sin bloque de pendientes', /Cargando/.test(body()) && !/sin decidir/.test(body()));
ls.set('easylog_mode', 'local'); delete win._ukNowOverride;

console.log(fails ? `\n${fails} FALLO(S)` : '\nTODO OK');
process.exit(fails ? 1 : 0);
