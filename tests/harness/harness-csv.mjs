// Arnés de regresión Fase 2 (CSV): ejecuta el <script> REAL de index.html en node:vm.
// Uso: node tests/harness/harness-csv.mjs [--out ruta.csv] [--update-golden]
// Golden (06-01): cabeceras ⊂ lista del importer de PilotLog y CSV celda a celda == tests/golden/csv-NN.csv.
// Los golden son de CARACTERIZACIÓN (congelan la salida de hoy): si un cambio legítimo los altera,
// regenerar con --update-golden y revisar el diff de tests/golden/ en el commit.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { GOLDEN_DIR, INDEX_PATH, readFixture } from '../lib.mjs';


const extract = html => {
  const m = html.match(/<script>\n([\s\S]*?)<\/script>\s*<\/body>/);
  if (!m) throw new Error('No se encontró el <script> principal');
  return m[1];
};

// ── DOM falso mínimo (como 01-auditoria/harness/run.mjs) ──
function makeEl() {
  const store = { value: '', textContent: '', innerHTML: '', checked: false, dataset: {}, style: {} };
  const classList = { add() {}, remove() {}, toggle() { return false; }, contains() { return false; } };
  const proxy = new Proxy(store, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'classList') return classList;
      if (k === 'querySelectorAll') return () => [];
      if (k === 'closest' || k === 'querySelector') return () => null;
      if (typeof k === 'symbol') return undefined;
      return () => proxy;
    },
    set(t, k, v) { t[k] = v; return true; },
  });
  return proxy;
}
function load(script) {
  const els = new Map();
  const byId = id => { if (!els.has(id)) els.set(id, makeEl()); return els.get(id); };
  const roleEl = makeEl(); roleEl.value = 'FO';
  const ls = new Map([['easylog_mode', 'local']]);
  const ctx = vm.createContext({
    document: {
      getElementById: byId,
      querySelector: sel => (sel.includes('name="role"') ? roleEl : byId('q:' + sel)),
      querySelectorAll: () => [], body: makeEl(), createElement: () => makeEl(), addEventListener() {},
    },
    localStorage: { getItem: k => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => ls.set(k, String(v)), removeItem: k => ls.delete(k) },
    console, window: {}, navigator: { userAgent: 'node' }, location: { href: '' },
    confirm: () => true, prompt: () => null, alert: () => {},
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0,
    fetch: () => Promise.reject(new Error('sin red')), Date, Math, JSON, Promise, Intl,
  });
  vm.runInContext(script, ctx);
  return { ctx, run: (code, vars = {}) => { Object.assign(ctx, vars); return vm.runInContext(code, ctx); } };
}

// CSV (sep ';', comillas, CRLF, BOM) → [{col: valor}]
function parseCSV(text) {
  const rows = []; let row = [], cur = '', q = false;
  text = text.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === ';') { row.push(cur); cur = ''; }
    else if (c === '\r' && text[i + 1] === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; i++; }
    else cur += c;
  }
  row.push(cur); rows.push(row);
  const [h, ...data] = rows;
  return { header: h, width: data.map(r => r.length), rows: data.map(r => Object.fromEntries(h.map((k, i) => [k, r[i]]))) };
}

let fails = 0, passes = 0;
const ok = (cond, msg, extra = '') => {
  if (cond) { passes++; console.log('  ✓ ' + msg); }
  else { fails++; console.log('  ✗ ' + msg + (extra ? '  → ' + extra : '')); }
};
const hm = s => { const m = /^(\d+):(\d{2})$/.exec(s || ''); return m ? +m[1] * 60 + +m[2] : NaN; };

const NEW = load(extract(fs.readFileSync(INDEX_PATH, 'utf8')));

const fixtures = Object.fromEntries(['01', '90', '91'].map(k => [k, readFixture(k)]));  // anonimizadas (tests/fixtures)
const csvOf = (env, text) => {
  const { flights } = env.run('parseText(__t)', { __t: text });
  return parseCSV(env.run('buildCSV(__l)', { __l: flights.map(flight => ({ flight, role: 'FO' })) }));
};
const flightsOf = (env, text) => env.run('parseText(__t).flights', { __t: text });

// Vuelo sintético a partir de uno real (copia profunda) con campos sobrescritos
const base = flightsOf(NEW, fixtures['01'])[0];
const synth = (over, date = base.date) => {
  const f = JSON.parse(JSON.stringify(base));
  f.date = date;
  for (let n = 1; n <= 9; n++) { delete f.d[`Delay Code ${n}`]; delete f.d[`Delay Time ${n}`]; }
  Object.assign(f.d, over);
  for (const k of Object.keys(f.d)) if (f.d[k] === null) delete f.d[k];
  return f;
};
const rowOf = flights => parseCSV(NEW.run('buildCSV(__l)', { __l: flights.map(flight => ({ flight, role: 'FO' })) })).rows;

// ═══ AC-1: esquema ═══
console.log('\nAC-1 Esquema');
const c01 = csvOf(NEW, fixtures['01']), c90 = csvOf(NEW, fixtures['90']), c91 = csvOf(NEW, fixtures['91']);
ok(c01.header.includes('DELAY') && c01.header.includes('TIME_NIGHT') && !c01.header.includes('TAG_DELAY'), 'cabecera con DELAY + TIME_NIGHT, sin TAG_DELAY');
for (const [k, c] of Object.entries({ '01': c01, '90': c90, '91': c91 })) {
  ok(c.width.every(w => w === c.header.length), `fixture ${k}: todas las filas con ${c.header.length} columnas`);
  ok(c.rows.every(r => r.AC_ENGTYPE === 'Jet'), `fixture ${k}: AC_ENGTYPE = Jet`);
}
// ═══ Golden (06-01): cabeceras del importer + CSV celda a celda ═══
console.log('\nGolden');
const IMPORTER = new Set(fs.readFileSync(path.join(GOLDEN_DIR, 'pilotlog-importer-headers.txt'), 'utf8').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#')));
const notInImporter = c01.header.filter(h => !IMPORTER.has(h.toUpperCase()));
ok(IMPORTER.size >= 100 && notInImporter.length === 0, `cabeceras del CSV ⊂ lista del importer (${IMPORTER.size})`, 'no aceptadas por el importer: ' + notInImporter.join(', '));
const rawCSV = k => { const { flights } = NEW.run('parseText(__t)', { __t: fixtures[k] }); return NEW.run('buildCSV(__l)', { __l: flights.map(flight => ({ flight, role: 'FO' })) }); };
const goldenPath = k => path.join(GOLDEN_DIR, `csv-${k}.csv`);
if (process.argv.includes('--update-golden')) {
  for (const k of ['01', '90', '91']) { fs.writeFileSync(goldenPath(k), rawCSV(k)); console.log('  · golden regenerado: ' + path.relative(process.cwd(), goldenPath(k))); }
}
for (const [k, n] of Object.entries({ '01': c01, '90': c90, '91': c91 })) {
  if (!fs.existsSync(goldenPath(k))) { ok(false, `golden fixture ${k}: existe tests/golden/csv-${k}.csv`, 'falta; generar con --update-golden'); continue; }
  const g = parseCSV(fs.readFileSync(goldenPath(k), 'utf8'));
  const diffs = [];
  if (g.header.join(';') !== n.header.join(';')) diffs.push(`cabecera: ${g.header.filter(h => !n.header.includes(h)).join(',') || '(orden)'} → ${n.header.filter(h => !g.header.includes(h)).join(',') || '(orden)'}`);
  if (g.rows.length !== n.rows.length) diffs.push(`filas ${g.rows.length}→${n.rows.length}`);
  g.rows.forEach((r, i) => g.header.forEach(col => {
    const v = n.rows[i] && n.rows[i][col];
    if (r[col] !== v) diffs.push(`${r.FLIGHTNUMBER}.${col} ${JSON.stringify(r[col])}→${JSON.stringify(v)}`);
  }));
  ok(diffs.length === 0, `golden fixture ${k}: CSV idéntico a tests/golden/csv-${k}.csv`, diffs.join(' | '));
}

// ═══ AC-2: DELAY único ═══
console.log('\nAC-2 DELAY');
ok(c01.rows.every(r => r.DELAY === '93'), 'fixture 01: DELAY = 93 en FR9134 y FR9135', c01.rows.map(r => r.DELAY).join('|'));
const D = over => rowOf([synth(over)])[0];
ok(D({}).DELAY === '', 'sin delays → DELAY vacío');
ok(D({ 'Delay Code 1': '41', 'Delay Time 1': '00:10', 'Delay Code 2': '93A', 'Delay Time 2': '00:30' }).DELAY === '93', '"93A" con más minutos → 93');
ok(D({ 'Delay Code 1': 'RA', 'Delay Time 1': '00:50', 'Delay Code 2': '41', 'Delay Time 2': '00:10' }).DELAY === '41', '"RA" nunca va a DELAY (el siguiente numérico sí)');
ok(D({ 'Delay Code 1': 'RA', 'Delay Time 1': '00:50' }).DELAY === '', 'solo "RA" → DELAY vacío');
ok(D({ 'Delay Code 1': '41', 'Delay Time 1': '00:20', 'Delay Code 2': '93', 'Delay Time 2': '00:20' }).DELAY === '41', 'empate de minutos → primero del email');
ok(D({ 'Delay Code 1': '81', 'Delay Code 2': '93' }).DELAY === '81', 'ningún delay con tiempo → primero del email');
ok(D({ 'Delay Code 1': '81', 'Delay Code 2': '93', 'Delay Time 2': '00:05' }).DELAY === '93', 'código sin tiempo cuenta 0 min');

// ═══ AC-3: delays en notas ═══
console.log('\nAC-3 FLIGHTLOG');
const fl0 = c01.rows[0].FLIGHTLOG.split('\n');
ok(fl0[0] === 'Delays: 93 0:40, 41 0:11', 'FR9134: primera línea "Delays: 93 0:40, 41 0:11"', fl0[0]);
ok(c01.rows[1].FLIGHTLOG.split('\n')[0] === 'Delays: 93 0:41, 62 0:14, 15 0:05', 'FR9135: todos los códigos en orden de minutos', c01.rows[1].FLIGHTLOG.split('\n')[0]);
ok(c01.rows.every(r => !/^DT\//m.test(r.FLIGHTLOG)), 'sin líneas DT/n antiguas');
ok(!D({}).FLIGHTLOG.includes('Delays:'), 'sin delays → sin línea "Delays:"');
ok(D({ 'Delay Time 1': '00:07' }).FLIGHTLOG.startsWith('Delays: ? 0:07'), 'tiempo sin código se conserva como "?"');
ok(D({ 'Delay Code 1': 'ra', 'Delay Time 1': '00:03' }).FLIGHTLOG.startsWith('Delays: RA 0:03'), 'alfanumérico conservado en notas (mayúsculas)');

// ═══ AC-4: TIME_NIGHT ═══
console.log('\nAC-4 TIME_NIGHT');
const near = (v, ref) => Math.abs(hm(v) - hm(ref)) <= 3;
// 06-01: fixture 01 anonimizada (fecha −14 días, 18/09) → FR9134 1:15 (antes 1:35 el 02/10); FR9135 sin cambio
ok(near(c01.rows[0].TIME_NIGHT, '1:15'), 'FR9134 ≈ 1:15 (±3)', c01.rows[0].TIME_NIGHT);
ok(near(c01.rows[1].TIME_NIGHT, '2:36'), 'FR9135 ≈ 2:36 (±3)', c01.rows[1].TIME_NIGHT);
ok([...c01.rows, ...c90.rows, ...c91.rows].every(r => /^\d+:\d{2}$/.test(r.TIME_NIGHT)), 'formato H:MM en fixtures');
ok([...c01.rows, ...c90.rows, ...c91.rows].every(r => (r.TO_NIGHT !== '1' && r.LDG_NIGHT !== '1') || hm(r.TIME_NIGHT) > 0), 'fixtures: TO/LDG noche ⇒ TIME_NIGHT > 0:00');
ok(D({ 'City Pair': 'STN - ZZZ' }).TIME_NIGHT === '', 'aeropuerto sin coordenadas → TIME_NIGHT vacío');
ok(D({ 'Off Block': '', 'On Block': '' }).TIME_NIGHT === '', 'sin horas → TIME_NIGHT vacío');
ok(D({ 'Off Block': '11:00', 'Airborne': '11:15', 'Landed': '13:00', 'On Block': '13:10' }).TIME_NIGHT === '0:00', 'vuelo de día → 0:00');

// ═══ AC-5: modelo temporal UTC ═══
console.log('\nAC-5 Fechas UTC por sector');
const utc = (fx, i) => {
  const fl = flightsOf(NEW, fixtures[fx]);
  const offs = NEW.run('sectorDayOffsets(__f)', { __f: fl });
  const t = NEW.run('sectorUTC(__x, __o)', { __x: fl[i], __o: offs[i] });
  return Object.fromEntries(Object.entries(t).map(([k, v]) => [k, v && v.toISOString().slice(0, 16)]));
};
const u91 = utc('91', 1), u90 = utc('90', 1);
ok(u91.off === '2026-10-06T00:10' && u91.on === '2026-10-06T02:35', 'fixture 91 FR9135: off/on = duty+1', JSON.stringify(u91));
ok(c91.rows[1].PILOTLOG_DATE === '2026-10-06' && c91.rows[0].PILOTLOG_DATE === '2026-10-05', 'fixture 91: PILOTLOG_DATE 05 → 06');
ok(u90.off === '2026-10-05T23:59' && u90.airborne === '2026-10-06T00:15' && u90.landed === '2026-10-06T02:26' && u90.on === '2026-10-06T02:35',
  'fixture 90 FR9135: off duty 23:59, airborne/landed/on duty+1', JSON.stringify(u90));
ok(c90.rows.every(r => r.PILOTLOG_DATE === '2026-10-05'), 'fixture 90: PILOTLOG_DATE = duty');
const duty01 = flightsOf(NEW, fixtures['01'])[0].date.replace(/\//g, '-');
ok(c01.rows.every(r => r.PILOTLOG_DATE === duty01), 'fixture 01: ninguna fecha cambia');
const offs = fl => NEW.run('sectorDayOffsets(__f)', { __f: fl }).join(',');
const S = (off, on, std = '') => synth({ 'Off Block': off, 'On Block': on, 'Airborne': null, 'Landed': null, 'STD': std });
ok(offs([S('17:00', '19:00'), S('', ''), S('00:30', '02:00')]) === '0,0,1', 'sector sin horas no rompe la cadena');
ok(offs([S('00:20', '02:10', '23:30')]) === '1', 'único sector post-medianoche detectado por STD');
ok(offs([S('23:59', '02:35', '23:40'), S('03:30', '05:00', '03:20')]) === '0,1', 'sector tras uno que aterriza pasada medianoche → +1');
ok(offs([S('15:55', '18:00', '16:10'), S('19:00', '21:00', '18:50')]) === '0,0', 'adelanto normal sobre STD no dispara');
const rowsChain = rowOf([S('23:59', '02:35', '23:40'), S('03:30', '05:00', '03:20')]);
ok(rowsChain[1].PILOTLOG_DATE === addDays(base.date, 1), 'buildCSV aplica el offset a PILOTLOG_DATE', rowsChain[1].PILOTLOG_DATE);
function addDays(raw, n) { const [y, m, d] = raw.split('/').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); }

// Aviso de descarga con aeropuertos sin coordenadas
console.log('\nAviso de descarga');
const st = [];
NEW.run('showStatus = (t, m) => __st.push(t + ": " + m)', { __st: st });
NEW.run('showDownloadStatus(__l, "OK.")', { __l: [synth({ 'City Pair': 'STN - ZZZ' })].map(flight => ({ flight, role: 'FO' })) });
// (fase 4) con las pistas del sector confirmadas, para aislar el aviso de coordenadas
NEW.run('_runways = Object.fromEntries(rwyKeys(__l.map(x => x.flight)).map(k => [k, { dep: "22", arr: "10" }])); showDownloadStatus(__l, "OK."); _runways = {}', { __l: [synth({})].map(flight => ({ flight, role: 'FO' })) });
ok(st[0].startsWith('warn:') && st[0].includes('ZZZ'), 'sin coordenadas → aviso con el IATA', st[0]);
ok(st[1] === 'ok: OK.', 'con coordenadas → mensaje normal', st[1]);

// Sectores que cambian de fecha (riesgo de duplicado en PilotLog si ya se importaron)
console.log('\nSectores con fecha desplazada en fixtures:');
for (const k of ['01', '90', '91']) {
  const fl = flightsOf(NEW, fixtures[k]);
  NEW.run('sectorDayOffsets(__f)', { __f: fl }).forEach((o, i) => { if (o) console.log(`  · fixture ${k} ${fl[i].d.FlightNumber} ${fl[i].date} +${o}`); });
}

const outIdx = process.argv.indexOf('--out');
if (outIdx > -1) {
  const { flights } = NEW.run('parseText(__t)', { __t: fixtures['01'] });
  fs.writeFileSync(process.argv[outIdx + 1], NEW.run('buildCSV(__l)', { __l: flights.map(flight => ({ flight, role: 'FO' })) }));
  console.log('\nCSV de prueba escrito en ' + process.argv[outIdx + 1]);
}

console.log(`\n${passes} ✓  ${fails} ✗`);
process.exit(fails ? 1 : 0);
