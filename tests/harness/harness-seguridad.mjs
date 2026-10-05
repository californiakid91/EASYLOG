// Pruebas del plan 05-01: datos de fuera (email, localStorage/Firestore) no llegan como código a innerHTML/onclick/clase
// (sobre el <script> real de index.html, modo local, DOM falso). Emails sintéticos: los fixtures reales son privados.
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { ROOT, BASELINES, indexAt } from '../lib.mjs';
// Último commit que tocó index.html antes de la Fase 5: referencia fija para "el CSV no cambia" (HEAD sería auto-comparación)
const BASE_SHA = BASELINES.preFase5;  // index.html previo a 05-01 (ver tests/lib.mjs)
const scriptOf = html => html.match(/<script>\n([\s\S]*?)<\/script>\s*<\/body>/)[1];

function load(src) {
  const els = new Map();
  const mk = () => new Proxy({ value: '', dataset: {}, style: {}, innerHTML: '', textContent: '' }, { get: (t, k) => k in t ? t[k] : k === 'classList' ? { add() {}, remove() {}, toggle() {}, contains() { return false; } } : k === 'querySelectorAll' ? () => [] : (k === 'closest' || k === 'querySelector') ? () => null : typeof k === 'symbol' ? undefined : () => mk(), set: (t, k, v) => (t[k] = v, true) });
  const ls = new Map([['easylog_mode', 'local']]);
  const env = { prompts: [], confirms: [], answer: true, els, warns: [] };
  const ctx = vm.createContext({ document: { getElementById: id => (els.has(id) || els.set(id, mk()), els.get(id)),
      querySelector: sel => sel === 'input[name="role"]:checked' ? { value: 'FO' } : mk(), querySelectorAll: () => [], body: mk(), createElement: () => mk(), addEventListener() {} },
    localStorage: { getItem: k => ls.get(k) ?? null, setItem: (k, v) => ls.set(k, String(v)), removeItem: k => ls.delete(k) },
    window: { location: {}, _ukNowOverride: '2026-10-20T12:00:00Z' }, navigator: {}, location: {},
    console: { ...console, warn: (...a) => env.warns.push(a.join(' ')) }, Date, Math, JSON, Promise, Intl,
    Blob: class { constructor(p) { this.p = p; } }, URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
    confirm: m => (env.confirms.push(m), env.answer), prompt: m => (env.prompts.push(m), null), alert() {},
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0 });
  vm.runInContext(src, ctx);
  env.run = c => vm.runInContext(c, ctx);
  env.J = c => JSON.parse(env.run(`JSON.stringify(${c})`));
  env.html = id => String(els.get(id)?.innerHTML ?? '');
  env.run('showStatus = () => {};');
  return env;
}

let fails = 0;
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); if (!ok) fails++; };

const email = (date, secs, extra = []) => date + '\n\n' + secs.map((s, i) => [
  `FlightNumber : ${s.fn ?? 'FR' + (100 + i)}`, 'Registration : EIABC', `City Pair : ${s.cp}`, `STD : ${s.off}`, `STA : ${s.on}`,
  `Airborne : ${s.off}`, `Landed : ${s.on}`, `Off Block : ${s.off}`, `On Block : ${s.on}`, 'Total Block : 02:00',
  ...extra, '', 'Pilot Flying :', 'Take Off : VEGRIC', 'Landing : VEGRIC', ''].join('\n')).join('\n\n') +
  '\nFlight Deck Crew :\nABC123 : CP : JOHN SMITH\nVEGRIC : FO : RICARDO VEGA\n';

// Analiza el HTML: nada ejecutable sin escapar y todos los argumentos de onclick con formato conocido
const ARG_OK = a => /^\d{4}-\d{2}-\d{2}$/.test(a) || /^[A-Z]{3}$/.test(a) || /^\d{4}-\d{2}$/.test(a) || ['no', 'excel-only'].includes(a);
// Etiqueta real (con < sin escapar) o atributo de evento dentro de una etiqueta real; el texto escapado (&lt;img …) es inofensivo
const unsafe = h => /<(img|script|svg)\b/i.test(h) || /<[^>]*\s(onerror|onmouseover|onload)=/i.test(h);
const badArgs = h => [...h.matchAll(/onclick="\w+\('(.*?)'\)"/g)].map(m => m[1]).filter(a => !ARG_OK(a));

let app;
try { app = load(scriptOf(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'))); }
catch (e) { check('arranque sin errores', false, String(e)); process.exit(1); }
check('arranque sin errores', true);
const reset = () => app.run('_cache = {}; _excelData = {}; _ukdays = {}; _dayMap = {}; _airports = {}; _runways = {};');
const paste = t => { app.els.get('input') ?? app.run("document.getElementById('input')"); app.run("document.getElementById('input').value = " + JSON.stringify(t)); app.run('addDay()'); };
const P = '<IMG SRC=X ONERROR=ALERT(1)>';

// ── (a) City Pair con payload / __PROTO__ → sin prompt, sin guardar
reset(); app.prompts.length = 0;
paste(email('2026/10/06', [{ cp: `${P} - STN`, off: '06:00', on: '08:00' }]));
paste(email('2026/10/07', [{ cp: '__PROTO__ - STN', off: '06:00', on: '08:00' }]));
check('(a) City Pair payload/__PROTO__: 0 prompts de coordenadas', app.prompts.length === 0, JSON.stringify(app.prompts));
check('(a) _airports sin claves nuevas', app.J('Object.keys(_airports)').length === 0, JSON.stringify(app.J('_airports')));

// ── (b) _airports guardado con clave payload + una válida
reset();
app.run(`_airports = { 'XXQ': { lat: 1, lon: 2 }, ${JSON.stringify("x');alert(1);//<img src=x onerror=alert(1)>")}: { lat: 0, lon: 0 } }; renderAirports();`);
const ah = app.html('airports-list');
check('(b) lista de aeropuertos sin HTML ejecutable', !unsafe(ah), ah.slice(0, 200));
check('(b) onclick de aeropuertos con argumentos válidos', badArgs(ah).length === 0, JSON.stringify(badArgs(ah)));
check('(b) clave inválida visible marcada "inválido"', /inválido/.test(ah));
check('(b) la inválida se borra por índice (removeAirportAt(n))', /removeAirportAt\(\d+\)/.test(ah));
const rows = (ah.match(/class="day-item"/g) || []).length;
check('(b) contador = filas pintadas', String(app.els.get('airports-count')?.textContent).includes(String(rows)) && rows === 2, `rows=${rows} cnt=${app.els.get('airports-count')?.textContent}`);
if (/removeAirportAt\(\d+\)/.test(ah)) {
  const idx = ah.match(/removeAirportAt\((\d+)\)/)[1];
  app.run(`removeAirportAt(${idx})`);
  check('(b) removeAirportAt borra solo la inválida', JSON.stringify(app.J('Object.keys(_airports)')) === '["XXQ"]', JSON.stringify(app.J('Object.keys(_airports)')));
}

// ── (c) _ukdays/_cache/_excelData con claves y textos manipulados
reset();
const BADK = "2026-10-06');alert(1);//";
const XSS = '<img src=x onerror=alert(1)>';
app.run(`
  _ukdays = {
    '2026-10-05': { state: 'uk', route: 'DUB→STN', onBlock: ${JSON.stringify(XSS)}, tz: ${JSON.stringify(XSS)}, source: ${JSON.stringify('rule:' + XSS)}, reason: 'r' },
    '2026-10-04': { state: 'no', route: 'STN→DUB', onBlock: '20:00', tz: 'BST', source: ${JSON.stringify('rule:' + XSS)}, reason: 'R2' },
    ${JSON.stringify(BADK)}: { state: 'no', route: 'x', onBlock: '--:--', tz: 'BST', manual: true, source: 'manual', reason: 'x' },
  };
  _cache = { '2026-10-05': { flights: [] }, ${JSON.stringify(BADK)}: { flights: [] } };
  _excelData = { '2026-09-01': { flights: [] }, ${JSON.stringify(BADK)}: { flights: [] } };
`);
const before = app.J('{ u: _ukdays, c: _cache, x: _excelData }');
app.run('renderUKDays(); renderHistory();');
const uh = app.html('ukdays-body'), hh = app.html('history');
check('(c) UK Days sin HTML ejecutable', !unsafe(uh), (uh.match(/.{0,60}(<img|onerror=).{0,40}/i) || [''])[0]);
check('(c) UK Days: onclick con argumentos válidos', badArgs(uh).length === 0, JSON.stringify(badArgs(uh)));
check('(c) Días guardados / solo Excel sin HTML ejecutable', !unsafe(hh));
check('(c) Días guardados / solo Excel: onclick con argumentos válidos', badArgs(hh).length === 0, JSON.stringify(badArgs(hh)));
check('(c) claves válidas siguen pintándose', hh.includes("removeDay('2026-10-05')") && hh.includes("removeExcelOnlyDay('2026-09-01')"));
check('(c) contador de días sobre lista filtrada', /^1 día\b/.test(String(app.els.get('hist-count')?.textContent)), String(app.els.get('hist-count')?.textContent));
check('(c) estado intacto tras renderizar', JSON.stringify(before) === JSON.stringify(app.J('{ u: _ukdays, c: _cache, x: _excelData }')));

// ── (c2) revisión G6: source no-texto no rompe el panel; backfill no copia claves inválidas; borrar historial habilitado
reset();
app.run(`_ukdays = { '2026-10-05': { state: 'uk', route: 'DUB→STN', onBlock: '23:00', tz: 'BST', source: 1, reason: 'r' } };`);
let c2err = null; try { app.run('renderUKDays()'); } catch (e) { c2err = e; }
check('(c2) source no-texto no rompe UK Days', !c2err, String(c2err));
app.run(`_ukdays = {}; _cache = { ${JSON.stringify(BADK)}: { flights: [] } }; backfillUKDays(); renderHistory();`);
check('(c2) backfill no copia claves inválidas a _ukdays', !app.J('Object.keys(_ukdays)').includes(BADK));
check('(c2) "Borrar historial" habilitado con solo claves ocultas', app.els.get('btn-clear-all')?.disabled === false, String(app.els.get('btn-clear-all')?.disabled));
const longCP = app.J(`rwyKeys([{ date: '2026/10/06', d: { FlightNumber: 'FR1', 'City Pair': 'STN - ' + 'X'.repeat(3000) } }])[0].length`);
check('(c2) clave de pistas acotada (< 200 chars)', longCP < 200, String(longCP));
check('(c2) clave de pistas normal sin cambios', app.J(`rwyKeys([{ date: '2026/10/06', d: { FlightNumber: 'FR 1', 'City Pair': 'STN - DUB' } }])[0]`) === '2026-10-06|FR1|STN-DUB');

// ── (d) calendario con estado manipulado
reset();
app.run(`_calYear = 2026; _calMonth = 9; _dayMap = { '2026-10-03': 'x" onmouseover="alert(1)', '2026-10-04': 'off' }; renderCalendar();`);
const ch = app.html('cal-grid');
check('(d) estado manipulado no entra en la clase', !/onmouseover/.test(ch), (ch.match(/.{0,40}onmouseover.{0,20}/) || [''])[0]);
check('(d) estados válidos siguen como clase', /s-off/.test(ch));

// ── (e) claves reservadas/enormes del email
reset();
paste(email('2026/10/08', [{ cp: 'STN - DUB', off: '06:00', on: '08:00' }], ['__X__ : y', 'a__b__c : y', 'K'.repeat(600) + ' : y']));
const keys = app.J("Object.keys((_cache['2026-10-08']?.flights?.[0]?.d) || {})");
check('(e) día guardado', keys.length > 0);
check('(e) sin claves __…__ ni de >500 chars', !keys.some(k => /__.*__/.test(k) || k.length > 500), JSON.stringify(keys.filter(k => k.length > 40 || /__/.test(k)).map(k => k.slice(0, 20))));

// ── (f) CSV de un email normal byte-idéntico al de BASE_SHA
const base = load(scriptOf(indexAt(BASE_SHA)));
const normal = email('2026/10/09', [{ cp: 'STN - DUB', off: '06:00', on: '07:15' }, { cp: 'DUB - STN', off: '08:00', on: '09:10', fn: 'FR201' }]);
const csvOf = env => env.run(`buildCSV(parseText(${JSON.stringify(normal)}).flights.map(flight => ({ flight, role: 'FO' })))`);
check('(f) CSV de email normal idéntico a ' + BASE_SHA, csvOf(app) === csvOf(base));

console.log(fails ? `\n${fails} FAIL` : '\nTODO OK');
process.exit(fails ? 1 : 0);
