// Test de forma y guards de escritura a la nube (fase 1.1).
// Ejecuta el <script> real de index.html en node:vm con Firebase falso que REGISTRA las llamadas.
// No prueba la semántica real de Firestore (eso lo prueba el usuario en el iPhone, AC-3);
// la semántica merge/mergeFields del doc falso sigue la doc del SDK solo para poder leer el estado resultante.
// Uso: node harness-merge.mjs [ruta/index.html]
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const INDEX = process.argv[2] || path.resolve(HERE, '../../../index.html');
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
const ls = new Map([['easylog_mode', 'cloud']]);
const statuses = [];
const ctx = vm.createContext({
  document: { getElementById: byId, querySelector: s => (s.includes('role') ? role : makeEl()), querySelectorAll: () => [], body: makeEl(), createElement: () => makeEl(), addEventListener() {} },
  localStorage: { getItem: k => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => ls.set(k, String(v)), removeItem: k => ls.delete(k) },
  window: {}, navigator: {}, location: {}, console, Date, Math, JSON, Promise, Intl,
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
fire(); await tick();
check('primer snapshot aplica ukdays de la nube aunque _ukdaysSaving=true', JSON.stringify(Object.keys(run('_ukdays')).sort()) === JSON.stringify(['2026-09-18', '2026-09-19']), JSON.stringify(Object.keys(run('_ukdays'))));
check('primer snapshot aplica dayMap de la nube', JSON.stringify(run('_dayMap')) === JSON.stringify(cloudDoc.dayMap));
check('aviso visible al usuario tras escritura bloqueada', statuses.some(s => s.startsWith('warn:') && s.includes('NO se ha guardado')), statuses.join(' | '));
check('nube intacta tras hidratar (nada pisado)', Object.keys(cloudDoc.ukdays).length === 2 && writes.length === 0, `writes=${writes.length}`);

// (d) borrar UK Day tras hidratar
run(`removeUKDay('2026-09-18')`); await tick();
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

check('ninguna escritura usa merge:true', writes.every(x => !x.opts.merge), `${writes.length} escrituras`);
console.log(fails ? `\n${fails} FALLO(S)` : '\nTODO OK');
process.exit(fails ? 1 : 0);
