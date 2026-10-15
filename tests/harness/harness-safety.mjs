// Pruebas del plan 09-01: SAFETY PILOT al pegar (detección por día, confirm, rol SP, CSV con PILOT3 SELF)
// (sobre el <script> real de index.html, modo local, DOM falso; baseline = BASELINES.preFase9)
import fs from 'node:fs'; import vm from 'node:vm';
import { INDEX_PATH, readFixture, BASELINES, indexAt, PILOT_SEED, legacyAsTest } from '../lib.mjs';

const scriptOf = html => html.match(/<script>\n([\s\S]*?)<\/script>\s*<\/body>/)[1];
let fails = 0;
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); if (!ok) fails++; };

function makeEnv(script) {
  const els = new Map();
  const mk = () => new Proxy({ value: '', dataset: {}, style: {}, innerHTML: '', textContent: '' }, { get: (t, k) => k in t ? t[k] : k === 'classList' ? { add() {}, remove() {}, toggle() {}, contains() { return false; } } : k === 'querySelectorAll' ? () => [] : (k === 'closest' || k === 'querySelector') ? () => null : typeof k === 'symbol' ? undefined : () => mk(), set: (t, k, v) => (t[k] = v, true) });
  const ls = new Map([['easylog_mode', 'local'], PILOT_SEED]);
  const E = { st: [], confirms: [], answer: true, role: 'FO' };
  const win = { location: {}, _ukNowOverride: '2026-10-05T12:00:00+01:00' };
  const ctx = vm.createContext({ document: { getElementById: id => (els.has(id) || els.set(id, mk()), els.get(id)),
      querySelector: sel => sel === 'input[name="role"]:checked' ? { value: E.role } : mk(), querySelectorAll: () => [], body: mk(), createElement: () => mk(), addEventListener() {} },
    localStorage: { getItem: k => ls.get(k) ?? null, setItem: (k, v) => ls.set(k, String(v)), removeItem: k => ls.delete(k) },
    window: win, navigator: {}, location: {}, console: { ...console, error() {} }, Date, Math, JSON, Promise, Intl, URLSearchParams,
    Blob: class { constructor(p) { this.p = p; } }, URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
    confirm: m => (E.confirms.push(m), E.answer), prompt: () => null, alert: m => E.st.push('alert: ' + m),
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, __st: E.st });
  try { vm.runInContext(script, ctx); } catch (e) { E.bootError = e; }
  E.run = c => vm.runInContext(c, ctx);
  E.J = c => JSON.parse(E.run(`JSON.stringify(${c})`));
  if (!E.bootError) E.run('showStatus = (t, m) => __st.push(t + ": " + m); askUnknownAirports = () => "";');
  E.reset = () => { E.run('_cache = {}; _excelData = {}; _ukdays = {}; _dayMap = {};'); E.st.length = 0; E.confirms.length = 0; E.answer = true; E.role = 'FO'; };
  E.paste = t => { els.get('input') || els.set('input', mk()); ctx.document.getElementById('input').value = t; E.run('addDay()'); };
  return E;
}
// CSV del día con un rol: filas como arrays de celdas (respetando comillas)
const splitCSV = l => { const out = []; let cur = '', q = false;
  for (let i = 0; i < l.length; i++) { const c = l[i];
    if (q) { if (c === '"' && l[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true; else if (c === ';') { out.push(cur); cur = ''; } else cur += c; }
  out.push(cur); return out; };
const rowsOf = (E, text, role) => {
  const csv = E.run(`buildCSV(parseText(${JSON.stringify(text)}).flights.map(flight => ({ flight, role: ${JSON.stringify(role)} })))`).replace(/^﻿/, '');
  // separar filas por \r\n fuera de comillas
  const lines = []; let cur = '', q = false;
  for (let i = 0; i < csv.length; i++) { const c = csv[i]; if (c === '"') q = !q;
    if (!q && c === '\r' && csv[i + 1] === '\n') { lines.push(cur); cur = ''; i++; } else cur += c; }
  if (cur) lines.push(cur);
  const head = splitCSV(lines[0]);
  return lines.slice(1).map(l => { const cells = splitCSV(l); return Object.fromEntries(head.map((h, i) => [h, cells[i]])); });
};

const E = makeEnv(scriptOf(fs.readFileSync(INDEX_PATH, 'utf8')));
check('arranque sin errores', !E.bootError, E.bootError && String(E.bootError));
if (E.bootError) process.exit(1);

const F92 = readFixture('92-'), F93 = readFixture('93-'), F01 = readFixture('01-'), F90 = readFixture('90-'), F91 = readFixture('91-');
const det = t => E.run(`detectSafetyPilot(parseText(${JSON.stringify(t)}).flights)`);

// ── AC-1: detección por día
check('AC-1 92 (FOXRAY en ningún PF, 3 pilotos) → true', det(F92) === true);
check('AC-1 93 (caso real 12/10: FOXRAY en 2 de 4) → false', det(F93) === false);
check('AC-1 01 (2 pilotos) → false', det(F01) === false);
check('AC-1 92 con un Take Off vacío → false', det(F92.replace('Take Off : CPTAAA', 'Take Off : ')) === false);
check('AC-1 92 con un Landing vacío → false', det(F92.replace('Landing : CPTAAA', 'Landing : ')) === false);
check('AC-1 92 con FOXRAY en un solo Landing → false', det(F92.replace('Landing : FOBBBB', 'Landing : FOXRAY')) === false);
// Formato con tabuladores de los emails de 2025 (caso real del usuario, 27/09/2025): mismo resultado que con espacios
const tabbed = t => t.replace(/ : /g, ' \t:\t').replace(/^(Take Off|Landing)/gm, '\t$1').replace(/FlightNumber \t:\tFR(\d)/g, 'FlightNumber \t:\tFR $1');
const nFl = t => E.run(`parseText(${JSON.stringify(t)}).flights.length`);
check('formato con tabuladores: 92 → mismos 4 vuelos y detecta SP', nFl(tabbed(F92)) === 4 && det(tabbed(F92)) === true, nFl(tabbed(F92)));
check('formato con tabuladores: CSV de 01 == con espacios', E.run(`buildCSV(parseText(${JSON.stringify(tabbed(F01))}).flights.map(flight => ({ flight, role: 'FO' })))`) === E.run(`buildCSV(parseText(${JSON.stringify(F01)}).flights.map(flight => ({ flight, role: 'FO' })))`));
check('AC-1 92 con el tercero de otro rol (OB) → false', det(F92.replace('FOBBBB : FO :', 'FOBBBB : OB :')) === false);

// ── AC-4: CSV de un día SP
const sp = rowsOf(E, F92, 'SP'), fo = rowsOf(E, F92, 'FO');
check('AC-4 4 filas', sp.length === 4 && fo.length === 4, sp.length + '/' + fo.length);
const lit = (k, v) => sp.every(r => r[k] === v);
check("AC-4 TIME_AIR '0:00' y TIME_NIGHT '0:00'", lit('TIME_AIR', '0:00') && lit('TIME_NIGHT', '0:00'), sp.map(r => r.TIME_AIR + '/' + r.TIME_NIGHT).join(' '));
check("AC-4 TIME_TOTAL/SIC/IFR '0' y TIME_PIC ''", lit('TIME_TOTAL', '0') && lit('TIME_SIC', '0') && lit('TIME_IFR', '0') && lit('TIME_PIC', ''), JSON.stringify(sp.map(r => [r.TIME_TOTAL, r.TIME_SIC, r.TIME_IFR, r.TIME_PIC])));
check("AC-4 TO/LDG '0' y PF 'FALSE'", ['TO_DAY', 'TO_NIGHT', 'LDG_DAY', 'LDG_NIGHT'].every(k => lit(k, '0')) && lit('PF', 'FALSE'));
check('AC-4 PILOT1 = capitán', lit('PILOT1_ID', 'CPTAAA') && lit('PILOT1_NAME', 'CAPTAIN ALPHA'));
check('AC-4 PILOT2 = el otro FO (vuele él o el CP)', lit('PILOT2_ID', 'FOBBBB') && lit('PILOT2_NAME', 'FIRST OFFICER BRAVO'), sp.map(r => r.PILOT2_ID).join(','));
check('AC-4 PILOT3 = FOXRAY / SELF', lit('PILOT3_ID', 'FOXRAY') && lit('PILOT3_NAME', 'SELF'));
check('AC-4 REMARKS «<vuelo> SAFETY PILOT»', sp.every(r => r.REMARKS === `${r.FLIGHTNUMBER} SAFETY PILOT`), sp.map(r => r.REMARKS).join(' | '));
check("AC-4 TIME_TO y TIME_LDG vacías (PilotLog rechaza AIR > TOTAL si van)", lit('TIME_TO', '') && lit('TIME_LDG', '') && fo.every(r => r.TIME_TO && r.TIME_LDG), sp.map(r => r.TIME_TO + '/' + r.TIME_LDG).join(' '));
const SAME = ['PILOTLOG_DATE', 'FLIGHTNUMBER', 'AF_DEP', 'AF_ARR', 'TIME_DEP', 'TIME_DEPSCH', 'TIME_ARR', 'TIME_ARRSCH', 'OPERATOR',
  'CREWLIST', 'FLIGHTLOG', 'PAX', 'FUEL', 'FUELUSED', 'DELAY', 'AC_MAKE', 'AC_MODEL', 'AC_VARIANT', 'AC_REG', 'AC_ENGTYPE', 'RWY_DEP', 'RWY_ARR'];
const diffSame = sp.flatMap((r, i) => SAME.filter(k => r[k] !== fo[i][k]).map(k => `${i}:${k}`));
check('AC-4 calzos, STD/STA, CREWLIST, FLIGHTLOG, fuel, pax, avión y pistas == mismo día con FO', diffSame.length === 0, diffSame.join(','));
check('AC-4 calzos rellenos (no vacíos)', sp.every(r => r.TIME_DEP && r.TIME_ARR), sp.map(r => r.TIME_DEP + '-' + r.TIME_ARR).join(' '));
// 4 en cabina: CP + 2 FO + FOXRAY → PILOT2 = el FO que vuela cada sector
const F4 = F92.replace('FOBBBB : FO : FIRST OFFICER BRAVO', 'FOBBBB : FO : FIRST OFFICER BRAVO\nFOCCCC : FO : FIRST OFFICER CHARLIE')
  .replace(/Take Off : FOBBBB\nLanding : CPTAAA/, 'Take Off : FOCCCC\nLanding : CPTAAA');
const sp4 = rowsOf(E, F4, 'SP');
check('AC-4 4 en cabina: PILOT2 = el FO que vuela cada sector', det(F4) === true && sp4.map(r => r.PILOT2_ID).join(',') === 'FOBBBB,FOBBBB,FOBBBB,FOCCCC', sp4.map(r => r.PILOT2_ID).join(','));

// ── AC-4: días FO/CPT idénticos a la baseline (solo cambian PILOT3_* vacías)
const B = makeEnv(legacyAsTest(scriptOf(indexAt(BASELINES.preFase9))));
check('baseline preFase9 arranca', !B.bootError, B.bootError && String(B.bootError));
for (const [name, t, r] of [['93', F93, 'FO'], ['01', F01, 'FO'], ['90', F90, 'FO'], ['91', F91, 'FO'], ['01 CPT', F01, 'CPT']]) {
  const n = rowsOf(E, t, r), o = rowsOf(B, t, r);
  const d = n.flatMap((row, i) => Object.keys(o[i] || {}).filter(k => row[k] !== o[i][k]).map(k => `${i}:${k}`));
  const extra = n.flatMap(row => Object.keys(row).filter(k => !(k in (o[0] || {}))));
  check(`AC-4 ${name} ${r} == ${BASELINES.preFase9} (solo PILOT3_* nuevas y vacías)`, n.length === o.length && d.length === 0 &&
    [...new Set(extra)].join(',') === 'PILOT3_ID,PILOT3_NAME' && n.every(row => row.PILOT3_ID === '' && row.PILOT3_NAME === ''), d.join(',') + ' extra=' + [...new Set(extra)]);
}

// ── AC-2: confirm al pegar
const ISO = '2026-09-28';
const H = () => E.J(`_cache['${ISO}'] ?? null`), X = () => E.J(`_excelData['${ISO}'] ?? null`);
const last = () => E.st[E.st.length - 1] || '';
E.reset(); E.answer = true; E.paste(F92);
check('AC-2 día nuevo 92 → un confirm de SAFETY PILOT', E.confirms.length === 1 && /SAFETY PILOT los 4 vuelos/.test(E.confirms[0]) && /Aceptar = safety pilot · Cancelar = a los mandos/.test(E.confirms[0]), E.confirms[0]);
check("AC-2 aceptar → role 'SP' en historial y Excel", H()?.role === 'SP' && X()?.role === 'SP', JSON.stringify([H()?.role, X()?.role]));
check('AC-2 OK menciona SAFETY PILOT', last().startsWith('ok:') && /· SAFETY PILOT/.test(last()), last());
check('AC-2 lista de días: etiqueta SP', /class="day-sp"[^>]*>SP</.test(E.run(`document.getElementById('history').innerHTML`)));
E.reset(); E.answer = false; E.paste(F92);
check("AC-2 cancelar → se guarda igual con role 'FO'", E.confirms.length === 1 && H()?.role === 'FO' && X()?.role === 'FO' && last().startsWith('ok:') && !/SAFETY/.test(last()), last());
E.reset(); E.role = 'CPT'; E.paste(F92);
check('AC-2 rol CPT marcado → no pregunta, CPT', E.confirms.length === 0 && H()?.role === 'CPT');
E.reset(); E.paste(F93);
check('AC-2 93 (a los mandos) → no pregunta, FO', E.confirms.length === 0 && H()?.role === 'FO');
// stale durante el confirm: requireHydrated true antes, false después → no se escribe nada
E.reset(); E.run('var __rh = requireHydrated, __rhN = 0; requireHydrated = () => ++__rhN < 2;'); E.answer = true; E.paste(F92);
check('AC-2 nube desfasada durante el confirm → no se escribe nada', E.confirms.length === 1 && H() === null && X() === null && E.J('_ukdays')[ISO] === undefined);
E.run('requireHydrated = __rh;');
// snapshot de otro dispositivo durante el confirm que guarda el mismo día → no se pisa, aviso
E.reset(); E.run(`var __rh2 = requireHydrated; requireHydrated = () => true; var __cf = confirm; confirm = m => { _cache = { '${ISO}': { addedAt: 'x', role: 'FO', flights: [] } }; return __cf(m); };`); E.answer = true; E.paste(F92);
check('G6 snapshot con el mismo día durante el confirm → no se pisa, aviso', E.J(`_cache['${ISO}'].addedAt`) === 'x' && X() === null && /otro dispositivo/.test(last()), last());
E.run('requireHydrated = __rh2; confirm = __cf;');

// ── AC-3: re-pegar respeta el rol guardado
E.reset(); E.answer = false; E.paste(F92); E.confirms.length = 0; E.answer = true; E.paste(F92);
check('AC-3 re-pegar 92 sobre un día FO → no pregunta, sigue FO', E.confirms.length === 0 && H()?.role === 'FO', JSON.stringify(E.confirms));
E.reset(); E.answer = true; E.paste(F92); E.confirms.length = 0; E.paste(F92);
check('AC-3 re-pegar 92 sobre un día SP → no pregunta, sigue SP', E.confirms.length === 0 && H()?.role === 'SP');
E.role = 'CPT'; E.paste(F92);
check('AC-3 nota de rol ignorado dice SAFETY PILOT', /Rol CPT ignorado: se mantiene SAFETY PILOT\./.test(last()) && H()?.role === 'SP', last());

// ── AC-5: UK Days y Excel iguales con SP que con FO
E.reset(); E.answer = true; E.paste(F92);
const ukSP = E.J(`_ukdays['${ISO}'] ?? null`), xlSP = E.J(`excelRowsForDay('${ISO}')`), cuSP = E.J(`computeUKDay('${ISO}', _excelData['${ISO}'].flights)`);
E.reset(); E.answer = false; E.paste(F92);
const ukFO = E.J(`_ukdays['${ISO}'] ?? null`), xlFO = E.J(`excelRowsForDay('${ISO}')`), cuFO = E.J(`computeUKDay('${ISO}', _excelData['${ISO}'].flights)`);
check('AC-5 UK Day con SP == con FO', ukSP !== null && JSON.stringify(ukSP) === JSON.stringify(ukFO), JSON.stringify([ukSP, ukFO]));
check('AC-5 computeUKDay con SP == con FO', JSON.stringify(cuSP) === JSON.stringify(cuFO));
check('G6 «solo Excel» de un día SP lleva la etiqueta SP', (() => { E.reset(); E.answer = true; E.paste(F92); E.run(`delete _cache['${ISO}']; renderHistory()`); return /solo Excel <span class="day-sp"/.test(E.run(`document.getElementById('history').innerHTML`)); })());
check('AC-5 filas del Excel con SP == con FO', Array.isArray(xlSP) ? xlSP.length > 0 && JSON.stringify(xlSP) === JSON.stringify(xlFO) : JSON.stringify(xlSP) === JSON.stringify(xlFO), JSON.stringify(xlSP).slice(0, 80));

console.log(fails ? `\n${fails} FAIL` : '\nTODO OK');
process.exit(fails ? 1 : 0);
