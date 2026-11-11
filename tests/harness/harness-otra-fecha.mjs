// Pruebas del plan 14-01: sector ya guardado en OTRA fecha → confirm antes de escribir; número de vuelo del Excel
// (sobre el <script> real de index.html, modo local, DOM falso; datos sintéticos)
import fs from 'node:fs'; import vm from 'node:vm';
import { INDEX_PATH, PILOT_SEED, readFixture, FIXED_NOW } from '../lib.mjs';
const html = fs.readFileSync(INDEX_PATH, 'utf8');
const SCRIPT = html.match(/<script>\n([\s\S]*?)<\/script>\s*<\/body>/)[1];
const els = new Map();
const mk = () => new Proxy({ value: '', dataset: {}, style: {}, innerHTML: '', textContent: '' }, { get: (t, k) => k in t ? t[k] : k === 'classList' ? { add() {}, remove() {}, toggle() {}, contains() { return false; } } : k === 'querySelectorAll' ? () => [] : (k === 'closest' || k === 'querySelector') ? () => null : typeof k === 'symbol' ? undefined : () => mk(), set: (t, k, v) => (t[k] = v, true) });
const ls = new Map([['easylog_mode', 'local'], PILOT_SEED]); const st = [];
const confirms = []; let answer = true; const warns = [];
const win = { location: {}, _ukNowOverride: FIXED_NOW };
const con = { ...console, warn: (...a) => warns.push(a.join(' ')) };
const ctx = vm.createContext({ document: { getElementById: id => (els.has(id) || els.set(id, mk()), els.get(id)),
    querySelector: sel => sel === 'input[name="role"]:checked' ? { value: 'FO' } : mk(), querySelectorAll: () => [], body: mk(), createElement: () => mk(), addEventListener() {} },
  localStorage: { getItem: k => ls.get(k) ?? null, setItem: (k, v) => ls.set(k, String(v)), removeItem: k => ls.delete(k) },
  window: win, navigator: {}, location: {}, console: con, Date, Math, JSON, Promise, Intl, Blob: class { constructor(p) { this.p = p; } }, URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
  confirm: m => (confirms.push(m), typeof answer === 'function' ? answer(m) : answer), prompt: () => null, alert: m => st.push('alert: ' + m),
  setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, __st: st });
let bootError = null;
try { vm.runInContext(SCRIPT, ctx); } catch (e) { bootError = e; }
const run = c => vm.runInContext(c, ctx); let fails = 0;
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); if (!ok) fails++; };
check('arranque sin errores', !bootError, bootError && String(bootError));
if (bootError) process.exit(1);
run('showStatus = (t, m) => __st.push(t + ": " + m);');
run('let __ukWrites = 0, __hWrites = 0; const __setUK = setUKDays; setUKDays = u => { __ukWrites++; __setUK(u); }; const __saveH = saveHistory; saveHistory = h => { __hWrites++; return __saveH(h); }; const __reqH = requireHydrated;');
const reset = () => { run('_cache = {}; _excelData = {}; _ukdays = {}; _dayMap = {}; __ukWrites = 0; __hWrites = 0; requireHydrated = __reqH;'); confirms.length = 0; st.length = 0; answer = true; warns.length = 0; };
const J = c => JSON.parse(run(`JSON.stringify(${c})`));
const H = iso => J(`_cache['${iso}'] ?? null`), X = iso => J(`_excelData['${iso}'] ?? null`);
const snap = () => run('JSON.stringify([_cache, _excelData, _ukdays])');
const writes = () => J('[__hWrites, __ukWrites]').reduce((a, b) => a + b, 0);
const last = () => st[st.length - 1] || '';
const input = () => ctx.document.getElementById('input');
const paste = text => { input().value = text; run('addDay()'); };
const email = (date, secs) => date + '\n\n' + secs.map((s, i) => [
  `FlightNumber : ${s.fn ?? 'FR' + (100 + i)}`, ...(s.reg === '' ? [] : [`Registration : ${s.reg ?? 'EIABC'}`]), `City Pair : ${s.cp}`, `STD : ${s.off}`, `STA : ${s.on}`,
  `Airborne : ${s.off}`, `Landed : ${s.on}`, ...(s.off === '' ? [] : [`Off Block : ${s.off}`]), `On Block : ${s.on}`, 'Total Block : 02:00',
  '', 'Pilot Flying :', 'Take Off : FOXRAY', 'Landing : FOXRAY', ''].join('\n')).join('\n\n') +
  '\nFlight Deck Crew :\nABC123 : CP : JOHN SMITH\nFOXRAY : FO : FIRST OFFICER XRAY\n';
const D1 = '2026/10/06', I1 = '2026-10-06', D2 = '2026/10/08', I2 = '2026-10-08', D3 = '2026/10/07', I3 = '2026-10-07';
const S = { fn: 'FR1234', cp: 'STN - DUB', off: '06:00', on: '07:10' };
const T = { fn: 'FR1235', cp: 'DUB - STN', off: '08:00', on: '09:10' };
const isOtra = m => /ya están guardados en otra fecha/.test(m);

// ── (a) D1 en la lista + pegar D2 con el mismo sector
reset(); paste(email(D1, [S, T])); confirms.length = 0;
const s0 = snap(); run('__ukWrites = 0; __hWrites = 0'); answer = false;
const txt = email(D2, [S, { ...T, off: '10:00', on: '11:00' }]); paste(txt);
check('(a) un confirm que nombra D1 y FR1234', confirms.length === 1 && isOtra(confirms[0]) && /06\/10\/26: FR1234\b/.test(confirms[0]) && !/FR1235/.test(confirms[0]), confirms[0]);
check('(a) el confirm explica el daño y cómo deshacerlo', /PilotLog puede salir dos veces/.test(confirms[0]) && /Excel Tax Year se cuenta dos veces/.test(confirms[0]) && /lista Y del Excel/.test(confirms[0]) && /UK Day/.test(confirms[0]) && /Guardar también el 08\/10\/26/.test(confirms[0]));
check('(a) cancelar → 0 escrituras, estado igual, texto en el cuadro', writes() === 0 && snap() === s0 && input().value === txt && /Cancelado/.test(last()), last());
answer = true; confirms.length = 0; paste(txt);
check('(a) aceptar → D2 guardado, D1 intacto', H(I2)?.flights?.length === 2 && X(I2)?.flights?.length === 2 && H(I1)?.flights?.length === 2 && /añadidos al 08\/10\/26/.test(last()), last());

// ── (b) D1 solo en el Excel / en lista y Excel → nombrado una vez
reset(); paste(email(D1, [S])); run(`delete _cache['${I1}']`); confirms.length = 0; answer = false; paste(email(D2, [S]));
check('(b) D1 solo en el Excel → avisa', confirms.length === 1 && isOtra(confirms[0]) && /06\/10\/26/.test(confirms[0]), confirms[0]);
reset(); paste(email(D1, [S])); confirms.length = 0; answer = false; paste(email(D2, [S]));
check('(b) D1 en lista y Excel → nombrado una sola vez', (confirms[0].match(/06\/10\/26/g) || []).length === 1, confirms[0]);

// ── (c) rotaciones normales
reset(); paste(email(D1, [S])); confirms.length = 0;
paste(email(D2, [{ ...S, reg: 'EIXYZ' }]));
check('(c) misma ruta y número con otra matrícula → sin aviso', confirms.length === 0 && H(I2), last());
reset(); paste(email(D1, [S])); confirms.length = 0;
paste(email(D2, [{ ...S, off: '06:05' }]));
check('(c) otro Off Block → sin aviso', confirms.length === 0 && H(I2), last());
reset(); paste(email(D1, [S])); confirms.length = 0; answer = false;
paste(email(D2, [{ ...S, on: '07:20' }]));
check('(c) mismo sector con otro On Block (email corregido) → avisa', confirms.length === 1 && isOtra(confirms[0]));
reset(); paste(email(D1, [S])); confirms.length = 0; answer = false;
paste(email(D2, [{ ...S, reg: 'EI-ABC' }]));
check('(c) matrícula con guión = misma matrícula → avisa', confirms.length === 1 && isOtra(confirms[0]));

// ── (d) variantes del número
const sig = fn => run(`sectorSig(parseText(${JSON.stringify(email(D1, [{ ...S, fn }]))}).flights[0])`);
check('(d) «FR 1234» = «FR1234» = «fr1234» = «1234»', new Set([sig('FR 1234'), sig('FR1234'), sig('fr1234'), sig('1234')]).size === 1);
check('(d) «RK1234» ≠ «FR1234»', sig('RK1234') !== sig('FR1234'));
check('(d) «FR1234P» ≠ «FR1234» y «1234P» = «FR1234P»', sig('FR1234P') !== sig('FR1234') && sig('1234P') === sig('FR1234P'));
reset(); paste(email(D1, [{ ...S, fn: 'FR 1234' }])); confirms.length = 0; answer = false; paste(email(D2, [S]));
check('(d) pegado real «FR 1234» → «FR1234» avisa', confirms.length === 1 && isOtra(confirms[0]));

// ── (e) re-pegar idéntico un D2 ya aceptado → sin aviso (03.2-02 intacto)
reset(); paste(email(D1, [S])); answer = true; paste(email(D2, [S])); confirms.length = 0; run('__ukWrites = 0; __hWrites = 0');
paste(email(D2, [S]));
check('(e) re-pegar D2 idéntico → sin confirm, «ya está en la lista», 0 escrituras', confirms.length === 0 && /ya está en la lista \(sin cambios\)/.test(last()) && writes() === 0, last());
reset(); paste(email(D1, [S])); answer = true; paste(email(D2, [S])); confirms.length = 0; answer = false;
paste(email(D2, [S, { ...T }]));
check('(e) re-pegar D2 distinto con un sector nuevo no repetido → solo «¿Reemplazar?»', confirms.length === 1 && !isOtra(confirms[0]) && /Reemplazar/.test(confirms[0]), confirms[0]);

// ── (f) firma incompleta
reset(); paste(email(D1, [{ ...S, off: '' }])); confirms.length = 0; paste(email(D2, [{ ...S, off: '' }]));
check('(f) sin Off Block → sin aviso', !confirms.some(isOtra));
reset(); paste(email(D1, [{ ...S, reg: '' }])); confirms.length = 0; paste(email(D2, [{ ...S, reg: '' }]));
check('(f) sin Registration → sin aviso', !confirms.some(isOtra));

// ── (g) entrada rara
reset(); run(`_excelData['2026-10-01'] = 'raro'; _excelData['2026-10-02'] = { flights: 7 }; _excelData['nope'] = { flights: [] };`); warns.length = 0;
let threw = null; try { run(`sameFlightOtherDates('${I2}', parseText(${JSON.stringify(email(D2, [S]))}).flights, [])`); } catch (e) { threw = e; }
check('(g) la búsqueda salta entradas raras sin lanzar ni console.warn', !threw && warns.length === 0, String(threw) + ' ' + warns.join(' | '));
threw = null; try { paste(email(D2, [S])); } catch (e) { threw = e; }
check('(g) pegar con entradas raras → no lanza y guarda', !threw && H(I2), String(threw));

// ── (h) número de vuelo del Excel
reset();
const fnos = ['RK1234', 'FR1234P', 'FR1234', '1234', '1234P', 'fr1234', ' FR 1234 '];
run(`_excelData['${I1}'] = { role: 'FO', flights: parseText(${JSON.stringify(email(D1, fnos.map((fn, i) => ({ ...S, fn, off: `0${i}:00` }))))}).flights }`);
const got = J(`excelRowsForDay('${I1}').map(r => r[1])`);
check('(h) Excel: RK1234 FR1234P FR1234 FR1234 FR1234P FR1234 FR1234', JSON.stringify(got) === JSON.stringify(['RK1234', 'FR1234P', 'FR1234', 'FR1234', 'FR1234P', 'FR1234', 'FR1234']), JSON.stringify(got));
const csvNo = run(`(() => { const t = parseText(${JSON.stringify(email(D1, [{ ...S, fn: 'RK1234' }]))}); return t.flights[0].d.FlightNumber; })()`);
check('(h) el dato del email (fuente del CSV) sigue siendo RK1234', csvNo === 'RK1234');

// ── (i) hidratación perdida tras aceptar
reset(); paste(email(D1, [S])); const s1 = snap(); run('__ukWrites = 0; __hWrites = 0');
answer = m => { if (isOtra(m)) run('requireHydrated = () => false'); return true; };
paste(email(D2, [S]));
check('(i) requireHydrated false tras aceptar → 0 escrituras', writes() === 0 && snap() === s1 && H(I2) === null);

// ── (j) otro dispositivo guarda D2 durante el confirm
reset(); paste(email(D1, [S])); run('__ukWrites = 0; __hWrites = 0');
answer = m => { if (isOtra(m)) run(`_cache['${I2}'] = { addedAt: 'x', role: 'FO', flights: parseText(${JSON.stringify(email(D2, [T]))}).flights }`); return true; };
paste(email(D2, [S]));
check('(j) otro dispositivo → otherDevice y 0 escrituras', writes() === 0 && /otro dispositivo/.test(last()) && H(I2).flights[0].d.FlightNumber === 'FR1235', last());

// ── (k) D2 existe y difiere: aceptar «otra fecha», cancelar «¿Reemplazar?»
reset(); paste(email(D1, [S])); paste(email(D2, [T])); const s2 = snap(); run('__ukWrites = 0; __hWrites = 0'); confirms.length = 0;
answer = m => isOtra(m);
paste(email(D2, [S, T]));
check('(k) dos confirms en orden (otra fecha → Reemplazar) y 0 escrituras', confirms.length === 2 && isOtra(confirms[0]) && /Reemplazar/.test(confirms[1]) && writes() === 0 && snap() === s2, JSON.stringify(confirms.map(c => c.slice(0, 40))));

// ── (l) varios días coincidentes → por fecha
reset(); paste(email(D2, [S])); answer = true; paste(email(D1, [S])); confirms.length = 0; answer = false;
paste(email(D3, [S]));
const ln = (confirms[0] || '').split('\n').filter(l => /^\d\d\/\d\d\/\d\d:/.test(l));
check('(l) dos días listados en orden de fecha', ln.length === 2 && ln[0].startsWith('06/10/26') && ln[1].startsWith('08/10/26'), JSON.stringify(ln));

// ── (m) sector post-medianoche (fixture 91) pegado con fecha D+1
reset(); const fx = readFixture('91'); paste(fx); const day0 = J('Object.keys(_cache)')[0]; confirms.length = 0; answer = false;
paste(fx.replace(/^2026\/10\/05/m, '2026/10/06'));
check('(m) post-medianoche en D+1 → avisa con D', day0 === '2026-10-05' && confirms.length >= 1 && isOtra(confirms[0]) && /05\/10\/26/.test(confirms[0]), (confirms[0] || '').slice(0, 120));

// ── sin regresión: día nuevo sin coincidencias
reset(); paste(email(D1, [S])); confirms.length = 0; paste(email(D2, [T]));
check('día nuevo sin coincidencias → sin confirm', confirms.length === 0 && H(I2), last());

console.log(fails ? `\n${fails} FAIL` : '\nTODO OK');
process.exit(fails ? 1 : 0);
