// Pruebas del plan 04-01: AIRPORT_DB (OurAirports) — airportInfo, precedencia, sin prompts de coordenadas
// (sobre el <script> real de index.html, modo local, DOM falso)
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.resolve(HERE, '../../../index.html'), 'utf8');
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
win._ukNowOverride = '2026-04-06T12:00:00Z';

// ── AC-3: pistas e ICAO
const A = c => J(`airportInfo(${JSON.stringify(c)})`);
const ends = a => (a?.rw || []).map(r => r.id).sort().join(',');
const hdgOf = (a, id) => a.rw.find(r => r.id === id)?.hdg;
const stn = A('STN');
check('STN → EGSS 04/22 con rumbo ≈44/224', stn?.icao === 'EGSS' && ends(stn) === '04,22' && Math.abs(hdgOf(stn, '04') - 44) <= 2 && Math.abs(hdgOf(stn, '22') - 224) <= 2, JSON.stringify(stn));
const alc = A('ALC');
check('ALC → LEAL 10/28', alc?.icao === 'LEAL' && ends(alc) === '10,28', JSON.stringify(alc));
const dub = A('DUB');
check('DUB incluye 10L/28R y 16/34', dub?.icao === 'EIDW' && ['10L', '28R', '16', '34'].every(x => ends(dub).split(',').includes(x)), ends(dub));
check('minúsculas y espacios → mismo aeropuerto', A(' stn ')?.icao === 'EGSS');
['TFN', 'RHO', 'FUE', 'LPA', 'ACE', 'TFS', 'GDN', 'TTU'].forEach(c => check(`${c} en la DB con ICAO de 4 letras`, /^[A-Z]{4}$/.test(A(c)?.icao || ''), JSON.stringify(A(c))));
check('JFK fuera de la zona → null', A('JFK') === null);
check('sin helipuertos ni idents raros', J(`[...(airportInfo(), _airportDB.values())].every(a => a.rw.every(r => /^\\d{2}[LRC]?$/.test(r.id)))`));
check('rumbos 0..359 y cabeceras opuestas a 180°', J(`[...(airportInfo(), _airportDB.values())].every(a => a.rw.every(r => r.hdg >= 0 && r.hdg < 360))`));
const ttu = A('TTU');
check('pista sin rumbo → aproximada ident×10', ttu.rw.some(r => r.approx) && hdgOf(ttu, '07') === 70, JSON.stringify(ttu));
check('nº de aeropuertos > 800', J('airportCount()') > 800, J('airportCount()'));

// ── AC-2: precedencia
const R = c => J(`resolveAirport(${JSON.stringify(c)})`);
check('AIRPORTS manda sobre la DB (STN)', JSON.stringify(R('STN')) === JSON.stringify({ lat: 51.8849, lon: 0.2353 }), JSON.stringify(R('STN')));
run(`_airports = { STN: { lat: 1, lon: 2 } }`);
check('personalizado manda sobre todo', R('STN').lat === 1);
run(`_airports = {}`);
check('fuera de AIRPORTS → coords de la DB (TTU)', Math.abs(R('TTU').lat - 35.5943) < 1e-3, JSON.stringify(R('TTU')));

// ── AC-1: sin prompts de coordenadas
reset(); paste(email(D, [{ cp: 'GDN - TTU', off: '06:00', on: '09:10' }, { cp: 'TTU - GDN', off: '10:00', on: '13:10' }]));
check('GDN/TTU pegados sin prompts', prompts.length === 0 && H(ISO)?.flights?.length === 2, JSON.stringify(prompts) + ' ' + last());
const csv = run(`buildCSV(allFlights())`);
check('CSV con TIME_NIGHT calculado (no vacío)', csv.split('\r\n')[1].split(';')[15] !== '', csv.split('\r\n')[1]);
reset(); paste(email(D, [{ cp: 'STN - JFK', off: '06:00', on: '14:10' }]));
check('JFK (fuera) sigue pidiendo lat/lon', prompts.length >= 1 && /JFK/.test(prompts[0] || ''), JSON.stringify(prompts));

console.log(fails ? `\n${fails} FAIL` : '\nTODO PASS'); process.exit(fails ? 1 : 0);
