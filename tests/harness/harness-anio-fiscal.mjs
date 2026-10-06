// Pruebas del plan 07-01: año fiscal derivado de la fecha, FLOOR, años congelados, chip ‹ año ›, banner de abril,
// Excel y comando de texto por año visible (sobre el <script> real de index.html, modo local, DOM falso, XLSX simulado).
// Datos sintéticos; el reloj de la app se fija con window._ukNowOverride en cada caso.
import fs from 'node:fs'; import vm from 'node:vm';
import { INDEX_PATH, FIXED_NOW } from '../lib.mjs';
const html = fs.readFileSync(INDEX_PATH, 'utf8');
const SCRIPT = html.match(/<script>\n([\s\S]*?)<\/script>\s*<\/body>/)[1];
const els = new Map();
const mk = () => new Proxy({ value: '', dataset: {}, style: {}, innerHTML: '', textContent: '' }, { get: (t, k) => k in t ? t[k] : k === 'classList' ? { add() {}, remove() {}, toggle() {}, contains() { return false; } } : k === 'querySelectorAll' ? () => [] : (k === 'closest' || k === 'querySelector') ? () => null : typeof k === 'symbol' ? undefined : () => mk(), set: (t, k, v) => (t[k] = v, true) });
const ls = new Map([['easylog_mode', 'local']]); const st = []; const confirms = []; let answer = true; let lsWrites = 0;
const win = { location: {}, _ukNowOverride: FIXED_NOW };
const xl = { rows: null, file: null, sheet: null };
const XLSX = { utils: { aoa_to_sheet: rows => (xl.rows = rows, {}), encode_cell: () => 'A1', book_new: () => ({}), book_append_sheet: (wb, ws, name) => { xl.sheet = name; } }, writeFile: (wb, name) => { xl.file = name; } };
const ctx = vm.createContext({ document: { getElementById: id => (els.has(id) || els.set(id, mk()), els.get(id)), querySelector: () => mk(), querySelectorAll: () => [], body: mk(), createElement: () => mk(), addEventListener() {} },
  localStorage: { getItem: k => ls.get(k) ?? null, setItem: (k, v) => (lsWrites++, ls.set(k, String(v))), removeItem: k => ls.delete(k) },
  window: win, navigator: {}, location: {}, console, Date, Math, JSON, Promise, Intl, XLSX, Blob: class { constructor(p) { this.p = p; } }, URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
  confirm: m => (confirms.push(m), answer), prompt: () => null, alert: m => st.push('alert: ' + m),
  setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, __st: st });
let bootError = null;
try { vm.runInContext(SCRIPT, ctx); } catch (e) { bootError = e; }
const run = c => vm.runInContext(c, ctx); let fails = 0;
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); if (!ok) fails++; };
check('arranque sin errores', !bootError, bootError && String(bootError));
if (bootError) process.exit(1);
run('showStatus = (t, m) => __st.push(t + ": " + m); var __persists = 0; const __p = persist; persist = function () { __persists++; return __p(); };');
const reset = () => { run('_cache = {}; _excelData = {}; _ukdays = {}; _dayMap = {}; _tyViewLabel = null; __persists = 0;'); xl.rows = xl.file = xl.sheet = null; answer = true; confirms.length = 0; };
const now = iso => { win._ukNowOverride = iso; };
const view = label => run(`_tyViewLabel = ${label ? `'${label}'` : 'null'}`);
const E = iso => JSON.parse(run(`JSON.stringify(_ukdays['${iso}'] ?? null)`));
const inHist = iso => run(`'${iso}' in loadHistory()`), inExcel = iso => run(`'${iso}' in _excelData`);
const paste = text => { ctx.document.getElementById('input').value = text; run('addDay()'); };
const body = () => (run('renderUKDays()'), ctx.document.getElementById('ukdays-body').innerHTML);
const chip = () => ctx.document.getElementById('ukdays-ty').innerHTML;
const email = (date, secs) => date + '\n\n' + secs.map((s, i) => [
  `FlightNumber : FR${100 + i}`, 'Registration : EIABC', `City Pair : ${s.cp}`, `STD : ${s.std ?? s.off}`, `STA : ${s.on ?? s.off}`,
  ...(s.off ? [`Airborne : ${s.off}`] : []), ...(s.on ? [`Landed : ${s.on}`] : []),
  ...(s.off ? [`Off Block : ${s.off}`] : []), ...(s.on ? [`On Block : ${s.on}`] : []), 'Total Block : 02:00',
  '', 'Pilot Flying :', 'Take Off : TSTCAP', 'Landing : TSTCAP', ''].join('\n')).join('\n\n');
const ukTrip = d => email(d, [{ cp: 'STN - DUB', off: '15:00', on: '16:10' }, { cp: 'DUB - STN', off: '17:00', on: '18:10' }]); // R1 (UK)
const lisTrip = d => email(d, [{ cp: 'STN - LIS', off: '15:00', on: '18:00' }]);                                                  // R2 (no UK)

// ── Modelo puro
check('taxYearOf: 05/04 cae en el año anterior, 06/04 abre año', run(`taxYearOf('2027-04-05').label`) === '2026-27' && run(`taxYearOf('2027-04-06').label`) === '2027-28' && run(`taxYearOf('2026-12-31').end`) === '2027-04-05');
check('taxYearOf: etiqueta de cambio de siglo', run(`taxYearOf('2099-05-01').label`) === '2099-00');
check('año congelado a los 30 días de su fin (desde el 06/05)', run(`ukYearFrozen(taxYearByLabel('2026-27'), new Date('2027-05-05T12:00:00Z'))`) === false && run(`ukYearFrozen(taxYearByLabel('2026-27'), new Date('2027-05-06T12:00:00Z'))`) === true);
check('sin literales de periodo en index.html (solo UK_DAYS_FLOOR)', !/UK_DAYS_START|UK_DAYS_END|2027-04-05|6 abr 2026/.test(html) && (html.match(/2026-04-06/g) || []).length === 1);

// ── (i) 05/04 23:30 BST → 06/04 00:30 BST: el año visible cambia solo
reset(); now('2027-04-05T22:30:00Z');
check('(i) 05/04/2027 23:30 BST → visible 2026-27, pie 6 abr 2026 – 5 abr 2027', run('viewTY().label') === '2026-27' && body().includes('6 abr 2026 – 5 abr 2027') && chip().includes('2026-27'), chip());
now('2027-04-05T23:30:00Z');
check('(i) 06/04/2027 00:30 BST → visible 2027-28, pie 6 abr 2027 – 5 abr 2028, chip con ‹ activo', run('viewTY().label') === '2027-28' && body().includes('6 abr 2027 – 5 abr 2028') && chip().includes('2027-28') && !/ukShiftTY\(-1\)" disabled/.test(chip()), chip());
check('(i) input date del modal: min = FLOOR, max = fin del año de hoy', (run('openUKDateModal()'), ctx.document.getElementById('ukday-date').min === '2026-04-06' && ctx.document.getElementById('ukday-date').max === '2028-04-05'));

// ── (ii) hoy 15/04/2027: email del 10/04/2027 con 2026-27 visible → entrada en 2027-28 + aviso; banner de cierre
reset(); now('2027-04-15T12:00:00Z'); view('2026-27');
paste(ukTrip('2027/04/10'));
check('(ii) email del 10/04/2027 → rule:R1 en _ukdays (nunca none en silencio)', E('2027-04-10')?.source === 'rule:R1', JSON.stringify(E('2027-04-10')));
check('(ii) aviso "Guardado en Tax Year 2027-28 (no es el visible)"', st.at(-1).includes('Guardado en Tax Year 2027-28 (no es el visible)'), st.at(-1));
view(null);
const b2 = body();
check('(ii) viendo 2027-28 en abril → banner "Cierra 2026-27"', b2.includes('ty-banner') && b2.includes('Cierra 2026-27'), b2.slice(0, 200).replace(/\s+/g, ' '));
check('(ii) chip recorre 2026-27 … 2027-28 (sin +1)', JSON.stringify(run('tyLabels()')) === '["2026-27","2027-28"]');
run(`ukShowTY('2026-27')`);
check('(ii) tocar el banner → visible 2026-27 y el banner desaparece', run('viewTY().label') === '2026-27' && !body().includes('ty-banner'));
run('ukShiftTY(1)');
check('(ii) › vuelve al año de hoy (_tyViewLabel = null)', run('_tyViewLabel') === null && run('viewTY().label') === '2027-28');

// ── (iii) email tardío de marzo pegado en la gracia → rule:* sin confirmación
reset(); now('2027-04-15T12:00:00Z');
paste(ukTrip('2027/03/20'));
check('(iii) 20/03/2027 pegado el 15/04/2027 → rule:R1, sin confirm', E('2027-03-20')?.source === 'rule:R1' && confirms.length === 0, JSON.stringify(E('2027-03-20')));

// ── (iv) año congelado: backfill de solo lectura; pegar pide confirmación
reset(); now('2027-06-01T12:00:00Z');
run(`_excelData['2026-10-01'] = { role: 'FO', flights: parseText(${JSON.stringify(lisTrip('2026/10/01'))}).flights };`);
run(`_ukdays['2026-10-01'] = { state: 'uk', route: 'XXX→STN', onBlock: '20:00', tz: 'BST', source: 'rule:R1', reason: 'manipulada' };`);
run(`_excelData['2026-10-02'] = { role: 'FO', flights: parseText(${JSON.stringify(ukTrip('2026/10/02'))}).flights };`);
run('backfillUKDays()');
check('(iv) backfill no recalcula una rule:* de un año congelado', E('2026-10-01')?.route === 'XXX→STN' && E('2026-10-01')?.state === 'uk', JSON.stringify(E('2026-10-01')));
check('(iv) backfill no crea entradas en un año congelado', E('2026-10-02') === null);
answer = true; paste(ukTrip('2026/11/03'));
check('(iv) pegar un día nuevo de 2026-27 congelado → confirm "ya está cerrado" y entrada manual', confirms.length === 1 && /2026-27 ya está cerrado/.test(confirms[0]) && E('2026-11-03')?.manual === true && E('2026-11-03')?.state === 'uk' && /año cerrado/.test(E('2026-11-03')?.reason), JSON.stringify(E('2026-11-03')));
answer = false; paste(ukTrip('2026/11/04'));
check('(iv) cancelar → nada guardado (historial, Excel ni UK Days)', !inHist('2026-11-04') && !inExcel('2026-11-04') && E('2026-11-04') === null && /Cancelado/.test(st.at(-1)), st.at(-1));
run('backfillUKDays()');
check('(iv) tras cancelar, backfill tampoco la crea', E('2026-11-04') === null);
answer = true; confirms.length = 0; paste(ukTrip('2026/11/03'));
check('(iv) re-pegar idéntico un día congelado → sin confirm (no cambia nada)', confirms.length === 0 && E('2026-11-03')?.manual === true);
answer = false; run(`addUKDayManual('2026-12-01')`);
check('(iv) añadir a mano en año congelado y cancelar → no se añade', E('2026-12-01') === null && confirms.length === 1);
answer = false; view('2026-27'); paste('añade uk days octubre 9');
check('(iv) comando en año congelado y cancelar → no se añade', E('2026-10-09') === null && /Cancelado/.test(st.at(-1)), st.at(-1));
answer = true; paste('añade uk days octubre 9');
check('(iv) comando en año congelado y aceptar → manual', E('2026-10-09')?.manual === true);
view(null);
reset(); now('2027-06-01T12:00:00Z'); paste(ukTrip('2027/05/20'));
check('(iv) el año en curso no está congelado: rule:R1 sin confirm', E('2027-05-20')?.source === 'rule:R1' && confirms.length === 0);

// ── (v) antes del FLOOR → rechazado para UK Days (el día sí se guarda en historial/Excel)
reset(); now(FIXED_NOW);
paste(ukTrip('2026/04/01'));
check('(v) 01/04/2026 (antes del FLOOR) → sin UK Day, historial sí, aviso', E('2026-04-01') === null && inHist('2026-04-01') && /anterior al primer año gestionado \(2026-27\)/.test(st.at(-1)), st.at(-1));
run(`addUKDayManual('2026-04-01')`);
check('(v) añadir a mano antes del FLOOR → "fuera del periodo UK Days"', E('2026-04-01') === null && /fuera del periodo UK Days \(6 abr 2026 – 5 abr 2027\)/.test(st.at(-1)), st.at(-1));
check('(v) ukDayStatus antes del FLOOR y tras el año de hoy → none', run(`ukDayStatus('2026-04-05').state`) === 'none' && run(`ukDayStatus('2027-04-06').state`) === 'none');

// ── (vi) comando de texto: año del visible, 1-5 abril → año de fin, año explícito
reset(); now('2027-04-15T12:00:00Z'); view('2026-27');
const cmd = t => JSON.stringify(run(`tryParseUKDaysCommand(${JSON.stringify(t)})`)?.dates ?? null);
check('(vi) "abril 3 5" con 2026-27 visible → 2027-04-03/05', cmd('añade uk days abril 3 5') === '["2027-04-03","2027-04-05"]', cmd('añade uk days abril 3 5'));
check('(vi) "abril 2027 7" → año explícito 2027-04-07', cmd('añade uk days abril 2027 7') === '["2027-04-07"]', cmd('añade uk days abril 2027 7'));
check('(vi) "octubre 3" → 2026-10-03', cmd('añade uk days octubre 3') === '["2026-10-03"]');
check('(vi) "abril 2027" sin día → null', cmd('añade uk days abril 2027') === 'null');
view('2027-28');
check('(vi) "6 abril" con 2027-28 visible → 2027-04-06', cmd('añade uk days 6 abril') === '["2027-04-06"]', cmd('añade uk days 6 abril'));
check('(vi) fechas fuera de alcance se descartan ("abril 2025 7" → null)', cmd('añade uk days abril 2025 7') === 'null');

// ── (vii) Excel del año visible
reset(); now('2027-04-20T12:00:00Z'); view('2026-27');
run(`(() => { for (let iso = '2026-04-06'; iso <= '2027-04-05'; iso = addDaysISO(iso, 1)) _dayMap[iso] = 'off'; })()`);
run('downloadTaxExcel()');
const s0 = run(`isoToExcelSerial('2026-04-06')`), s1 = run(`isoToExcelSerial('2027-04-05')`);
const days = new Set((xl.rows || []).filter(r => typeof r[0] === 'number' && r[0] >= s0 && r[0] <= s1).map(r => r[0]));
check('(vii) 2026-27 visible (hoy 2027-28, con huecos en 2027-28) → se descarga TAX YEAR 26-27', xl.file === 'TAX YEAR 26-27.xlsx' && xl.sheet === 'TAX 26-27', `${xl.file} / ${st.at(-1)}`);
check('(vii) título "Tax Year 2026-2027" y 365 días', xl.rows?.[2]?.[4] === 'Tax Year 2026-2027' && days.size === 365, `${xl.rows?.[2]?.[4]} · ${days.size}`);
check('(vii) mensaje "Excel 2026-27 descargado."', st.at(-1) === 'ok: Excel 2026-27 descargado.', st.at(-1));
xl.file = null; view(null); run('downloadTaxExcel()');
check('(vii) 2027-28 visible con huecos pasados → bloqueado solo por los de 2027-28', xl.file === null && /No se descarga el Excel 2027-28: 14 días sin decidir/.test(st.at(-1)), st.at(-1));

// ── G6: el botón OFF pintado antes del 06/04 sigue marcando SU hueco aunque el año visible cambie solo
reset(); now('2027-04-05T12:00:00Z');
run(`(() => { for (let iso = '2026-04-06'; iso <= '2027-03-31'; iso = addDaysISO(iso, 1)) _dayMap[iso] = 'off'; })()`);
const offBtn = (body().match(/ukMarkBlockOff\('([\d-]+)'\)/) || [])[1];
check('G6: OFF pintado el 05/04 apunta al hueco 01/04/2027', offBtn === '2027-04-01', offBtn);
now('2027-04-09T12:00:00Z'); run(`ukMarkBlockOff('${offBtn}')`);
// el 09/04 el hueco de 2026-27 ya incluye el 05/04 (pasado): se marca entero, pero nada de 2027-28
check('G6: pulsado el 09/04 (visible ya 2027-28) → marca 01–05/04/2027 y no toca 06–08/04', ['01', '02', '03', '04', '05'].every(d => run(`_dayMap['2027-04-${d}']`) === 'off') && ['06', '07', '08'].every(d => run(`_dayMap['2027-04-${d}']`) === undefined));
run(`ukMarkBlockOff('<img>')`); run(`ukMarkBlockOff('2027-01-01')`);
check('G6: primer día inválido o sin hueco → no hace nada', run(`_dayMap['2027-01-01']`) === 'off' && Object.keys(run('_dayMap')).length === 365, String(Object.keys(run('_dayMap')).length));

// ── Banner solo en la gracia (06/04–05/05) y el chip no escribe nada
reset(); now('2027-05-05T12:00:00Z');
check('banner el 05/05/2027', body().includes('ty-banner'));
now('2027-05-06T12:00:00Z');
check('sin banner el 06/05/2027', !body().includes('ty-banner'));
check('2026-27 congelado se marca "cerrado" en el pie', (view('2026-27'), body().includes('· cerrado')));
view(null);
const w0 = lsWrites; run('__persists = 0; ukShiftTY(-1); ukShiftTY(1); ukShowTY("2026-27"); ukShiftTY(1);');
check('cambiar de año (chip/banner) no escribe en localStorage ni llama a persist', lsWrites === w0 && run('__persists') === 0, `${lsWrites - w0} · ${run('__persists')}`);
check('chip en el primer año: ‹ deshabilitado', (view('2026-27'), run('renderUKDays()'), /ukShiftTY\(-1\)" disabled/.test(chip())), chip());

console.log(fails ? `\n${fails} FALLO(S)` : '\nTODO OK'); process.exit(fails ? 1 : 0);
