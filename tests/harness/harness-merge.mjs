// Test de forma y guards de escritura a la nube (fase 1.1).
// Ejecuta el <script> real de index.html en node:vm con Firebase falso que REGISTRA las llamadas.
// No prueba la semántica real de Firestore (eso lo prueba el usuario en el iPhone, AC-3);
// la semántica merge/mergeFields del doc falso sigue la doc del SDK solo para poder leer el estado resultante.
// Uso: node harness-merge.mjs [ruta/index.html]
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

import { INDEX_PATH, FIXED_NOW, PILOT_SEED } from '../lib.mjs';
const INDEX = process.argv[2] || INDEX_PATH;
const html = fs.readFileSync(INDEX, 'utf8');
let SCRIPT = html.match(/<script>\n([\s\S]*?)<\/script>\s*<\/body>/)[1];
// Único cambio al script: redirigir los import() dinámicos de Firebase al falso
SCRIPT = SCRIPT.replace(/await import\('https:\/\/www\.gstatic\.com\/firebasejs\/[^']+\/(firebase-[a-z]+)\.js'\)/g, "await __fakeImport('$1')");

// ── Firebase falso ──
const clone = o => JSON.parse(JSON.stringify(o));
let cloudDoc = {
  ukdays: { '2026-09-18': { route: 'STN→HAM', onBlock: '15:20', tz: 'BST' }, '2026-09-19': { route: 'AOI→STN', onBlock: '23:45', tz: 'BST' } },
  history: {}, excelData: { '2026-09-18': { role: 'FO', flights: [] } }, airports: {},
  dayMap: { '2026-09-18': 'sim', '2026-09-19': 'duty' },
};
const writes = [];
let snapCb = null;
function setDoc(_ref, data, opts) {
  writes.push({ data: clone(data), opts: clone(opts || {}) });
  if (opts && opts.mergeFields) { for (const f of opts.mergeFields) cloudDoc[f] = clone(data[f]); }
  else if (opts && opts.merge) {
    const deep = (t, s) => { for (const k of Object.keys(s)) {
      const v = s[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length && t[k] && typeof t[k] === 'object') deep(t[k], v);
      else t[k] = clone(v);
    } };
    deep(cloudDoc, data);
  } else cloudDoc = clone(data);
  return Promise.resolve();
}
const fire = (fromCache = false) => snapCb({ exists: () => !fromCache, data: () => (fromCache ? {} : clone(cloudDoc)), metadata: { fromCache } });
const fakeMods = {
  'firebase-app': { initializeApp: () => ({}) },
  'firebase-auth': {
    getAuth: () => ({}), setPersistence: async () => {}, browserLocalPersistence: {},
    onAuthStateChanged: (_a, cb) => { setTimeout(() => cb({ uid: 'u1', displayName: 'Test', photoURL: '' }), 0); },
    signInWithPopup: async () => {}, signOut: async () => {}, GoogleAuthProvider: function () {},
  },
  'firebase-firestore': {
    getFirestore: () => ({}), doc: () => ({}), setDoc,
    onSnapshot: (_r, cb) => { snapCb = cb; return () => {}; },
  },
};

// ── DOM falso ──
function makeEl() {
  const store = { value: '', textContent: '', innerHTML: '', checked: false, dataset: {}, style: {}, src: '' };
  const cl = { add() {}, remove() {}, toggle() { return false; }, contains() { return false; } };
  return new Proxy(store, {
    get(t, k) { if (k in t) return t[k]; if (k === 'classList') return cl; if (k === 'querySelectorAll') return () => [];
      if (k === 'closest' || k === 'querySelector') return () => null; if (typeof k === 'symbol') return undefined; return () => makeEl(); },
    set(t, k, v) { t[k] = v; return true; },
  });
}
const els = new Map(); const byId = id => (els.has(id) || els.set(id, makeEl()), els.get(id));
const role = makeEl(); role.value = 'FO';
const ls = new Map([['easylog_mode', 'cloud'], PILOT_SEED]);
const statuses = [];
const ctx = vm.createContext({
  document: { getElementById: byId, querySelector: s => (s.includes('role') ? role : makeEl()), querySelectorAll: () => [], body: makeEl(), createElement: () => makeEl(), addEventListener() {} },
  localStorage: { getItem: k => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => ls.set(k, String(v)), removeItem: k => ls.delete(k) },
  window: { _ukNowOverride: FIXED_NOW }, navigator: {}, location: {}, console, Date, Math, JSON, Promise, Intl,
  confirm: () => true, prompt: () => null, alert() {},
  setTimeout: (fn, ms) => (ms === 0 ? Promise.resolve().then(fn) : 0), // los timers de 2-3 s no vencen durante el test
  clearTimeout() {}, setInterval: () => 0,
  __fakeImport: async name => fakeMods[name],
  __statuses: statuses,
});
vm.runInContext(SCRIPT, ctx, { filename: 'index.html<script>' });
vm.runInContext('showStatus = (t, m) => __statuses.push(t + ": " + m);', ctx);
const run = c => vm.runInContext(c, ctx);
const tick = async () => { for (let i = 0; i < 20; i++) await new Promise(r => setImmediate(r)); };

let fails = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); if (!ok) fails++; };

for (let i = 0; i < 50 && !snapCb; i++) await tick(); // applyCloudMode → login → onSnapshot registrado, aún sin snapshot
check('listener registrado', typeof snapCb === 'function');

// (b) + Fable #1: cambio local antes del primer snapshot
run(`saveUKDays({ '2026-10-03': { route: '—', onBlock: '--:--', tz: 'BST', manual: true } })`);
run(`_dayMap['2026-10-03'] = 'off'; saveDayMap();`);
await tick();
check('0 escrituras antes de hidratar', writes.length === 0, `writes=${writes.length}`);
check('pendingWrite marcado', run('cloud.pendingWrite') === true);
// Riesgo G6: snapshot de caché offline vacío no debe contar como nube cargada
fire(true); await tick();
check('snapshot de caché offline NO hidrata', run('cloud.hydrated') === false && Object.keys(run('_ukdays')).includes('2026-10-03'));
run(`saveHistory({ '2026-10-04': { role: 'FO', flights: [] } })`); await tick();
check('escritura offline bloqueada (nube no sustituida)', writes.length === 0 && Object.keys(cloudDoc.ukdays).length === 2, `writes=${writes.length}`);
run('_cloudWrites = 1'); // 08-02: aunque conste una escritura propia en vuelo, el primer snapshot (sin hidratar) manda
fire(); await tick();
run('_cloudWrites = 0');
check('primer snapshot aplica ukdays de la nube aunque haya escritura propia en vuelo', JSON.stringify(Object.keys(run('_ukdays')).sort()) === JSON.stringify(['2026-09-18', '2026-09-19']), JSON.stringify(Object.keys(run('_ukdays'))));
check('primer snapshot aplica dayMap de la nube', JSON.stringify(run('_dayMap')) === JSON.stringify(cloudDoc.dayMap));
check('aviso visible al usuario tras escritura bloqueada', statuses.some(s => s.startsWith('warn:') && s.includes('no se ha guardado nada')), statuses.join(' | '));
check('nube intacta tras hidratar (nada pisado)', Object.keys(cloudDoc.ukdays).length === 2 && writes.length === 0, `writes=${writes.length}`);

// (d) borrar UK Day tras hidratar
// 03-02: el 1.er ✕ sobre un UK automático lo marca "No UK" (manual); el 2.º ✕ borra la entrada → se prueba el borrado
run(`removeUKDay('2026-09-18')`); run(`removeUKDay('2026-09-18')`); await tick();
const w = writes.at(-1);
check('removeUKDay escribe con mergeFields (sin merge)', !!w && Array.isArray(w.opts.mergeFields) && !('merge' in w.opts), JSON.stringify(w && w.opts));
check('mergeFields incluye ukdays/history/excelData/airports y NO dayMap', !!w && ['ukdays', 'history', 'excelData', 'airports'].every(f => (w.opts.mergeFields || []).includes(f)) && !(w.opts.mergeFields || []).includes('dayMap'));
check('payload ukdays sin el 18/09', !!w && !('2026-09-18' in w.data.ukdays) && ('2026-09-19' in w.data.ukdays));
check('nube (doc falso) sin el 18/09 y dayMap intacto', !('2026-09-18' in cloudDoc.ukdays) && cloudDoc.dayMap['2026-09-18'] === 'sim');
fire(); await tick();
check('tras nuevo snapshot el 18/09 no vuelve', !('2026-09-18' in run('_ukdays')));

// (a) calendario: quitar estado de un día
run(`_calSel = '2026-09-19'; setDayStatus('duty');`); await tick();
const wd = writes.at(-1);
check('saveDayMap escribe mergeFields:[dayMap]', !!wd && JSON.stringify(wd.opts) === JSON.stringify({ mergeFields: ['dayMap'] }), JSON.stringify(wd && wd.opts));
check('estado del 19/09 borrado en la nube', !('2026-09-19' in cloudDoc.dayMap));

// ══ 11-02 AC-3: campos de la nube con forma rara ══
const realDoc = () => ({
  history: { '2026-09-18': { addedAt: 'X', role: 'FO', flights: [] }, '2026-09-20': { addedAt: 'Y', role: 'SP', flights: [] } },
  excelData: { '2026-09-18': { role: 'FO', flights: [] }, '2026-09-21': { role: 'CPT', flights: [] } },
  airports: { XYZ: { lat: 1, lon: 2 } },
  ukdays: { '2026-09-18': { state: 'uk', source: 'rule:R1', route: 'STN→HAM', onBlock: '15:20', tz: 'BST' }, '2026-09-22': { state: 'no', manual: true, reason: 'x' } },
  runways: {}, settings: { ukLimit: { '2026-27': 90 } }, dayMap: { '2026-09-19': 'duty', '2026-09-23': 'sd' },
});
const resetCloud = d => { cloudDoc = d; statuses.length = 0; fire(); };
{
  resetCloud(realDoc()); await tick();
  check('11-02 doc normal: _cloudCorrupt vacío y sin aviso', run('_cloudCorrupt.size') === 0 && !statuses.some(x => /dañado/.test(x)), statuses.join(' | '));
  const n0 = writes.length;
  run(`_calSel = '2026-09-24'; setDayStatus('off');`); await tick();
  check('11-02 doc normal: el calendario se guarda como siempre', writes.length === n0 + 1 && cloudDoc.dayMap['2026-09-24'] === 'off');
}
{
  const d = realDoc(); d.history = [];
  resetCloud(d); await tick();
  check('11-02 history = [] → memoria {} y marcado', JSON.stringify(run('_cache')) === '{}' && run(`_cloudCorrupt.has('history')`) === true);
  check('11-02 history = [] → aviso una vez con «la lista de días»', statuses.filter(x => /En la nube está dañado: la lista de días/.test(x)).length === 1, statuses.join(' | '));
  fire(); await tick();
  check('11-02 mismo documento otra vez → sin aviso repetido', statuses.filter(x => /En la nube está dañado/.test(x)).length === 1);
  const n0 = writes.length;
  run(`removeUKDay('2026-09-22')`); await tick();
  const w = writes.at(-1);
  check('11-02 con history dañado otros cambios se guardan sin history en payload ni mergeFields', writes.length === n0 + 1 && !('history' in w.data) && !w.opts.mergeFields.includes('history') && w.opts.mergeFields.includes('ukdays'), JSON.stringify(w.opts));
  check('11-02 la nube conserva history = [] (no se borra)', Array.isArray(cloudDoc.history));
  const n1 = writes.length; statuses.length = 0;
  const ok = run(`saveHistory({ '2026-10-01': { addedAt: 'Z', role: 'FO', flights: [] } })`); await tick();
  check('11-02 cambiar history dañado → persist false, sin escritura y aviso de error', ok === false && writes.length === n1 && statuses.some(x => x.startsWith('err:') && /la lista de días/.test(x)), statuses.join(' | '));
  // G6 #1: el intento fallido no deja bloqueados los guardados siguientes de otros datos
  statuses.length = 0;
  run(`removeUKDay('2026-09-18')`); await tick();
  check('11-02 G6 tras el intento fallido, otro dato se guarda (sin bloqueo pegajoso)', writes.length === n1 + 1 && !statuses.some(x => x.startsWith('err:')) && !writes.at(-1).opts.mergeFields.includes('history'), statuses.join(' | '));
}
{
  const d = realDoc(); d.dayMap = null;
  ls.set('easylog_days_v1', JSON.stringify({ '2026-01-01': 'off' }));
  resetCloud(d); await tick();
  check('11-02 dayMap = null → espejo CAL_KEY intacto', ls.get('easylog_days_v1') === JSON.stringify({ '2026-01-01': 'off' }));
  const n0 = writes.length;
  run(`_calSel = '2026-09-25'; setDayStatus('off');`); await tick();
  check('11-02 dayMap dañado → saveDayMap no escribe (ni el espejo) y avisa', writes.length === n0 && cloudDoc.dayMap === null && ls.get('easylog_days_v1') === JSON.stringify({ '2026-01-01': 'off' }) && statuses.some(x => x.startsWith('err:') && /el calendario/.test(x)), statuses.join(' | '));
}
{
  const d = realDoc(); d.ukdays = 'x';
  resetCloud(d); await tick();
  check('11-02 ukdays dañado → backfill no intenta guardar (sin error al cargar)', !statuses.some(x => x.startsWith('err:')) && cloudDoc.ukdays === 'x', statuses.join(' | '));
}
{
  // Entradas que romperían la pantalla: se saltan al pintar/exportar y vuelven intactas a la nube
  const d = realDoc();
  d.history['2026-09-26'] = { role: 'FO' };       // sin flights
  d.history['2026-09-27'] = null;
  d.excelData['2026-09-28'] = { role: 'FO', flights: 'x' };
  resetCloud(d); await tick();
  let threw = null;
  try { run('renderHistory(); flightsForMonth("2026-09"); allFlights(); excelRowsForDay("2026-09-28"); ukHasEmail("2026-09-27"); exportSnapshot(null, 0);'); } catch (e) { threw = e; }
  check('11-02 entradas raras: pintar/exportar no lanza', !threw, String(threw));
  check('11-02 entradas raras: no cuentan como días en la lista', run(`dayKeys(_cache, 'H').length`) === 2);
  run(`removeUKDay('2026-09-22')`); await tick();
  const w = writes.at(-1);
  check('11-02 entradas raras vuelven intactas en el payload', '2026-09-26' in w.data.history && w.data.history['2026-09-27'] === null && w.data.excelData['2026-09-28'].flights === 'x', JSON.stringify(Object.keys(w.data.history)));
}

check('ninguna escritura usa merge:true', writes.every(x => !x.opts.merge), `${writes.length} escrituras`);
console.log(fails ? `\n${fails} FALLO(S)` : '\nTODO OK');
process.exit(fails ? 1 : 0);
