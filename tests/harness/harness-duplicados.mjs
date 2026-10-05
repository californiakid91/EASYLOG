// Pruebas del plan 03.2-02: duplicados al pegar (idéntico en lista / solo Excel / distinto / rol ignorado)
// (sobre el <script> real de index.html, modo local, DOM falso)
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { fileURLToPath } from 'node:url';
import { INDEX_PATH } from '../lib.mjs';
const html = fs.readFileSync(INDEX_PATH, 'utf8');
const SCRIPT = html.match(/<script>\n([\s\S]*?)<\/script>\s*<\/body>/)[1];
const els = new Map();
const mk = () => new Proxy({ value: '', dataset: {}, style: {}, innerHTML: '', textContent: '' }, { get: (t, k) => k in t ? t[k] : k === 'classList' ? { add() {}, remove() {}, toggle() {}, contains() { return false; } } : k === 'querySelectorAll' ? () => [] : (k === 'closest' || k === 'querySelector') ? () => null : typeof k === 'symbol' ? undefined : () => mk(), set: (t, k, v) => (t[k] = v, true) });
const ls = new Map([['easylog_mode', 'local']]); const st = [];
const confirms = []; let answer = true; const prompts = []; let promptAnswers = [];
let curRole = 'FO';
const win = { location: {} };
const ctx = vm.createContext({ document: { getElementById: id => (els.has(id) || els.set(id, mk()), els.get(id)),
    querySelector: sel => sel === 'input[name="role"]:checked' ? { value: curRole } : mk(), querySelectorAll: () => [], body: mk(), createElement: () => mk(), addEventListener() {} },
  localStorage: { getItem: k => ls.get(k) ?? null, setItem: (k, v) => ls.set(k, String(v)), removeItem: k => ls.delete(k) },
  window: win, navigator: {}, location: {}, console, Date, Math, JSON, Promise, Intl, Blob: class { constructor(p) { this.p = p; } }, URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
  confirm: m => (confirms.push(m), answer), prompt: m => (prompts.push(m), promptAnswers.length ? promptAnswers.shift() : null), alert: m => st.push('alert: ' + m),
  setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, __st: st });
let bootError = null;
try { vm.runInContext(SCRIPT, ctx); } catch (e) { bootError = e; }
const run = c => vm.runInContext(c, ctx); let fails = 0;
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); if (!ok) fails++; };
check('arranque sin errores', !bootError, bootError && String(bootError));
if (bootError) process.exit(1);
run('showStatus = (t, m) => __st.push(t + ": " + m);');
run('let __ukWrites = 0; const __setUK = setUKDays; setUKDays = u => { __ukWrites++; __setUK(u); };');
const reset = () => { run('_cache = {}; _excelData = {}; _ukdays = {}; _dayMap = {}; __ukWrites = 0;'); confirms.length = 0; prompts.length = 0; promptAnswers = []; st.length = 0; answer = true; curRole = 'FO'; };
const J = c => JSON.parse(run(`JSON.stringify(${c})`));
const H = iso => J(`_cache['${iso}'] ?? null`), X = iso => J(`_excelData['${iso}'] ?? null`), K = iso => J(`_ukdays['${iso}'] ?? null`);
const last = () => st[st.length - 1] || '';
const input = () => ctx.document.getElementById('input');
const paste = text => { input().value = text; run('addDay()'); };
const email = (date, secs, { crew = 'ABC123 : CP : JOHN SMITH', extra = [] } = {}) => date + '\n\n' + secs.map((s, i) => [
  `FlightNumber : ${s.fn ?? 'FR' + (100 + i)}`, `Registration : ${s.reg ?? 'EIABC'}`, `City Pair : ${s.cp}`, `STD : ${s.off}`, `STA : ${s.on}`,
  `Airborne : ${s.off}`, `Landed : ${s.on}`, `Off Block : ${s.off}`, `On Block : ${s.on}`, 'Total Block : 02:00',
  ...(s.remarks ? [`Captain Remarks : ${s.remarks}`] : []),
  '', 'Pilot Flying :', 'Take Off : VEGRIC', 'Landing : VEGRIC', ''].join('\n')).join('\n\n') + '\n' + extra.join('\n') +
  (crew ? `\nFlight Deck Crew :\n${crew}\nVEGRIC : FO : RICARDO VEGA\n` : '');
const D = '2026/10/06', ISO = '2026-10-06';
const SECS = [{ cp: 'STN - DUB', off: '06:00', on: '07:10' }, { cp: 'DUB - STN', off: '08:00', on: '09:10' }];
const SECS_PLUS = [...SECS, { cp: 'STN - BCN', off: '10:00', on: '12:00' }];
// Ruido realista de copiar/pegar: sangría, espacios finales, líneas en blanco extra y espacios dobles dentro de los valores
const minify = t => t.split('\n').map(l => l ? '  ' + l.replace(/ - /, '  -  ') + '   ' : '\n').join('\n');
const win2 = () => { win._ukNowOverride = '2026-04-06T12:00:00Z'; }; win2();

// ── AC-1: normalización (helpers)
reset();
const f = t => J(`parseText(${JSON.stringify(t)}).flights`);
const base = f(email(D, SECS));
const k = fl => run(`flightsKey(${JSON.stringify(fl)})`);
check('espacios/líneas en blanco extra → idéntico', k(base) === k(f(minify(email(D, SECS)))));
check('mayúsculas distintas → idéntico', k(base) === k(f(email(D, SECS).replace('STN - DUB', 'stn - dub'))));
check('captain/allCrew no entran en flightsKey', k(base) === k(f(email(D, SECS, { crew: 'ZZZ999 : CP : OTRO CAPITAN' }))));
check('claves ruidosas (Verified by, pie) → idéntico', k(base) === k(f(email(D, SECS, { crew: '', extra: ['Verified by : XYZ, 05/10/2026', 'Footer : algo'] }))));
check('orden de sectores alterado → misma clave', k(base) === k([...base].reverse()));
check('una hora distinta → distinto', k(base) !== k(f(email(D, [SECS[0], { ...SECS[1], on: '09:15' }]))));

// ── AC-2: idéntico y en la lista
reset(); paste(email(D, SECS));
const at0 = H(ISO).addedAt; const uk0 = K(ISO); run('__ukWrites = 0');
paste(minify(email(D, SECS)));
check('AC-2 sin confirm', confirms.length === 0, JSON.stringify(confirms));
check('AC-2 addedAt intacto y UK Days sin escrituras', H(ISO).addedAt === at0 && J('__ukWrites') === 0 && JSON.stringify(K(ISO)) === JSON.stringify(uk0));
check('AC-2 aviso «ya está en la lista» y textarea limpio', /ya está en la lista \(sin cambios\)\./.test(last()) && last().startsWith('warn') && input().value === '', last());
// AC-2 reparación del Excel
run(`delete _excelData['${ISO}']`); paste(email(D, SECS));
check('AC-2 repara Excel ausente', X(ISO)?.flights?.length === 2 && /Añadido al Excel/.test(last()) && H(ISO).addedAt === at0, last());

// ── AC-3: rol ignorado
reset(); paste(email(D, SECS)); curRole = 'CPT'; paste(email(D, SECS));
check('AC-3 idéntico con CPT marcado → sin confirm, rol FO intacto', confirms.length === 0 && H(ISO).role === 'FO' && X(ISO).role === 'FO');
check('AC-3 aviso «Rol CPT ignorado: se mantiene FO.»', /Rol CPT ignorado: se mantiene FO\./.test(last()), last());
reset(); paste(email(D, SECS)); curRole = 'CPT'; paste(email(D, SECS_PLUS));
check('AC-3 distinto aceptado con CPT marcado → rol FO, vuelos nuevos', H(ISO).role === 'FO' && X(ISO).role === 'FO' && H(ISO).flights.length === 3 && /Rol CPT ignorado/.test(last()), last());
reset(); run(`_excelData['${ISO}'] = { flights: parseText(${JSON.stringify(email(D, SECS))}).flights }`); curRole = 'CPT'; paste(email(D, SECS));
check('AC-3 entrada sin rol → FO', H(ISO)?.role === 'FO', JSON.stringify(H(ISO)?.role));
reset(); curRole = 'CPT'; paste(email(D, SECS));
check('día nuevo con CPT marcado → CPT (como antes)', H(ISO).role === 'CPT');

// ── AC-4: idéntico y solo en el Excel
reset(); paste(email(D, SECS)); const xl0 = JSON.stringify(X(ISO)); const uk4 = JSON.stringify(K(ISO));
run(`delete _cache['${ISO}']`); run('__ukWrites = 0'); paste(email(D, SECS, { crew: 'ABC123 : CP : JOHN  SMITH' }));
check('AC-4 vuelve a la lista sin preguntar', confirms.length === 0 && H(ISO)?.flights?.length === 2, JSON.stringify(confirms));
check('AC-4 conserva vuelos del Excel (captain original)', H(ISO).flights[0].captain === 'JOHN SMITH');
check('AC-4 Excel y UK Days intactos', JSON.stringify(X(ISO)) === xl0 && JSON.stringify(K(ISO)) === uk4 && J('__ukWrites') === 0);
check('AC-4 aviso «vuelve a la lista»', /vuelve a la lista \(ya estaba en el Excel\)\./.test(last()) && last().startsWith('ok'), last());

// ── AC-5: distinto
reset(); paste(email(D, SECS)); const at5 = H(ISO).addedAt; answer = false;
paste(email(D, [SECS[0], { ...SECS[1], on: '09:15' }]));
check('AC-5 confirm con «en la lista» y el campo cambiado', confirms.length === 1 && /ya está en la lista con otros datos/.test(confirms[0]) && /FR101 On Block: 09:10 → 09:15/.test(confirms[0]), confirms[0]);
check('AC-5 cancelar → nada cambia', H(ISO).flights[1].d['On Block'] === '09:10' && H(ISO).addedAt === at5 && X(ISO).flights[1].d['On Block'] === '09:10' && /Cancelado/.test(last()));
answer = true; paste(email(D, [SECS[0], { ...SECS[1], on: '09:15' }]));
check('AC-5 aceptar → reemplaza historial y Excel', H(ISO).flights[1].d['On Block'] === '09:15' && X(ISO).flights[1].d['On Block'] === '09:15');
reset(); paste(email(D, SECS)); run(`delete _cache['${ISO}']`); answer = false;
paste(email(D, SECS_PLUS));
check('AC-5 solo Excel → confirm «en el Excel (lo quitaste de la lista)» y «+ FR102»', /en el Excel \(lo quitaste de la lista\)/.test(confirms[0]) && /\+ FR102 STN-BCN/.test(confirms[0]), confirms[0]);
check('AC-5 solo Excel cancelar → no vuelve a la lista ni cambia el Excel', H(ISO) === null && X(ISO).flights.length === 2);
reset(); paste(email(D, SECS_PLUS)); answer = false; paste(email(D, SECS));
check('AC-5 sector quitado → «− FR102»', /− FR102/.test(confirms[0]), confirms[0]);
// corte a 6 líneas
reset(); paste(email(D, SECS)); answer = false;
paste(email(D, SECS.map(s => ({ ...s, reg: 'EIXYZ', off: '05:00', on: '06:00' }))));
check('AC-5 resumen cortado a 6 + «…y N más»', /…y \d+ más/.test(confirms[0]) && confirms[0].split('\n').filter(l => /^FR10/.test(l)).length === 6, confirms[0]);
reset(); paste(email(D, [{ ...SECS[0], remarks: 'A'.repeat(200) }])); answer = false;
paste(email(D, [{ ...SECS[0], remarks: 'B'.repeat(200) }]));
check('AC-5 valores largos cortados', confirms[0].length < 200, String(confirms[0].length));
// UK manual no se toca al aceptar un distinto
reset(); paste(email(D, SECS)); run(`_ukdays['${ISO}'] = ukManualEntry('${ISO}')`); const man = JSON.stringify(K(ISO));
paste(email(D, SECS_PLUS));
check('AC-5 aceptar respeta entrada UK manual', JSON.stringify(K(ISO)) === man && H(ISO).flights.length === 3);
// orden del email conservado
reset(); const SECS_MN = [{ cp: 'STN - DUB', fn: 'FR900', off: '22:00', on: '23:10' }, { cp: 'DUB - STN', fn: 'FR100', off: '00:10', on: '01:20' }];
paste(email(D, SECS_MN)); run(`delete _cache['${ISO}']`); paste(email(D, SECS_MN));
check('orden del email conservado tras AC-4 (FR900 primero)', H(ISO).flights[0].d.FlightNumber === 'FR900');

// ── G6: capitán / tripulación distintos con los mismos vuelos → se pregunta (van al CSV)
reset(); paste(email(D, SECS)); answer = false; paste(email(D, SECS, { crew: 'ZZZ999 : CP : OTRO CAPITAN' }));
check('mismos vuelos, otro capitán → confirm «Capitán: JOHN SMITH → OTRO CAPITAN»', confirms.length === 1 && /Capitán: JOHN SMITH → OTRO CAPITAN/.test(confirms[0]), confirms[0]);
check('cancelar → capitán intacto', H(ISO).flights[0].captain === 'JOHN SMITH');
answer = true; paste(email(D, SECS, { crew: 'ZZZ999 : CP : OTRO CAPITAN' }));
check('aceptar → capitán nuevo en historial y Excel', H(ISO).flights[0].captain === 'OTRO CAPITAN' && X(ISO).flights[0].captain === 'OTRO CAPITAN');
reset(); paste(email(D, SECS)); answer = false; paste(email(D, SECS, { crew: 'ABC123 : CP : JOHN SMITH\nSEN111 : SO : OTRO' }));
check('mismo capitán, tripulación distinta → confirm «Tripulación distinta»', /Tripulación distinta/.test(confirms[0] || ''), confirms[0]);
reset(); paste(email(D, SECS)); paste(email(D, SECS, { crew: 'ABC123 : CP : John  Smith' }));
check('mismo capitán con otra grafía del nombre → idéntico', confirms.length === 0 && /ya está en la lista/.test(last()), last());

// ── AC-6: sin regresiones
reset(); paste(email(D, SECS)); paste(email('2026/10/07', SECS));
check('día nuevo → se añade como antes', H('2026-10-07')?.flights?.length === 2 && confirms.length === 0 && /2 vuelos añadidos/.test(last()), last());
reset(); paste(email(D, SECS) + '\n' + email('2026/10/07', SECS));
check('paste multi-día → error como antes', /Pega solo uno a la vez/.test(last()) && H(ISO) === null, last());
// coordenadas en re-pegado idéntico
reset(); const SECS_X = [{ cp: 'STN - QQQ', off: '06:00', on: '07:10' }]; paste(email(D, SECS_X));
check('día nuevo con aeropuerto desconocido pide coords', prompts.length === 1);
prompts.length = 0; promptAnswers = ['43.3', '3.3']; paste(email(D, SECS_X));
check('re-pegado idéntico vuelve a pedir coords y las guarda', prompts.length === 2 && J(`_airports.QQQ ?? null`)?.lat === 43.3 && /ya está en la lista/.test(last()), last());

console.log(fails ? `\n${fails} FAIL` : '\nTODO OK');
process.exit(fails ? 1 : 0);
