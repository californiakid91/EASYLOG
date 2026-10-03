// Arnés de regresión Fase 2 (CSV): ejecuta el <script> REAL de index.html en node:vm.
// Uso: node .paul/phases/02-csv/harness-csv.mjs [--out ruta.csv]
// Compara además con el <script> de `git show HEAD:index.html` (golden test, AC-1).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const FIX = path.resolve(HERE, '../01-auditoria/harness/fixtures'); // gitignored (nombres de tripulación)

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

const NEW = load(extract(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')));
const OLD = load(extract(execFileSync('git', ['-C', ROOT, 'show', 'HEAD:index.html']).toString()));

const fixtures = {};
for (const f of fs.readdirSync(FIX).filter(f => f.endsWith('.txt')).sort()) {
  fixtures[f.slice(0, 2)] = fs.readFileSync(path.join(FIX, f), 'utf8');
}
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
const CHANGED = new Set(['TAG_DELAY', 'DELAY', 'TIME_NIGHT', 'AC_ENGTYPE', 'FLIGHTLOG', 'PILOTLOG_DATE', 'TO_DAY', 'TO_NIGHT', 'LDG_DAY', 'LDG_NIGHT']);
for (const k of ['01', '90', '91']) {
  const o = csvOf(OLD, fixtures[k]), n = csvOf(NEW, fixtures[k]);
  const diffs = [];
  o.rows.forEach((r, i) => o.header.forEach(col => {
    if (!CHANGED.has(col) && r[col] !== n.rows[i][col]) diffs.push(`${r.FLIGHTNUMBER}.${col}`);
  }));
  ok(diffs.length === 0, `golden fixture ${k}: resto de columnas idénticas a HEAD`, diffs.join(', '));
  o.rows.forEach((r, i) => {
    const ch = ['PILOTLOG_DATE', 'TO_DAY', 'TO_NIGHT', 'LDG_DAY', 'LDG_NIGHT'].filter(c => r[c] !== n.rows[i][c]);
    if (ch.length) console.log(`    · info ${k} ${r.FLIGHTNUMBER}: cambia ${ch.map(c => `${c} ${r[c]}→${n.rows[i][c]}`).join(', ')}`);
  });
}

// ═══ AC-2: DELAY único ═══
console.log('\nAC-2 DELAY');
ok(c01.rows.every(r => r.DELAY === '93'), 'fixture 01: DELAY = 93 en FR2134 y FR2135', c01.rows.map(r => r.DELAY).join('|'));
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
ok(fl0[0] === 'Delays: 93 0:40, 41 0:11', 'FR2134: primera línea "Delays: 93 0:40, 41 0:11"', fl0[0]);
ok(c01.rows[1].FLIGHTLOG.split('\n')[0] === 'Delays: 93 0:41, 62 0:14, 15 0:05', 'FR2135: todos los códigos en orden de minutos', c01.rows[1].FLIGHTLOG.split('\n')[0]);
ok(c01.rows.every(r => !/^DT\//m.test(r.FLIGHTLOG)), 'sin líneas DT/n antiguas');
ok(!D({}).FLIGHTLOG.includes('Delays:'), 'sin delays → sin línea "Delays:"');
ok(D({ 'Delay Time 1': '00:07' }).FLIGHTLOG.startsWith('Delays: ? 0:07'), 'tiempo sin código se conserva como "?"');
ok(D({ 'Delay Code 1': 'ra', 'Delay Time 1': '00:03' }).FLIGHTLOG.startsWith('Delays: RA 0:03'), 'alfanumérico conservado en notas (mayúsculas)');

// ═══ AC-4: TIME_NIGHT ═══
console.log('\nAC-4 TIME_NIGHT');
const near = (v, ref) => Math.abs(hm(v) - hm(ref)) <= 3;
ok(near(c01.rows[0].TIME_NIGHT, '1:35'), 'FR2134 ≈ 1:35 (±3)', c01.rows[0].TIME_NIGHT);
ok(near(c01.rows[1].TIME_NIGHT, '2:36'), 'FR2135 ≈ 2:36 (±3)', c01.rows[1].TIME_NIGHT);
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
ok(u91.off === '2026-10-06T00:10' && u91.on === '2026-10-06T02:35', 'fixture 91 FR2135: off/on = duty+1', JSON.stringify(u91));
ok(c91.rows[1].PILOTLOG_DATE === '2026-10-06' && c91.rows[0].PILOTLOG_DATE === '2026-10-05', 'fixture 91: PILOTLOG_DATE 05 → 06');
ok(u90.off === '2026-10-05T23:59' && u90.airborne === '2026-10-06T00:15' && u90.landed === '2026-10-06T02:26' && u90.on === '2026-10-06T02:35',
  'fixture 90 FR2135: off duty 23:59, airborne/landed/on duty+1', JSON.stringify(u90));
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
NEW.run('showDownloadStatus(__l, "OK.")', { __l: [synth({})].map(flight => ({ flight, role: 'FO' })) });
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
