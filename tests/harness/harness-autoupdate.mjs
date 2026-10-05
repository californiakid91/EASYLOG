// Pruebas de la auto-actualización (fase 3.1) sobre el <script> real de index.html (modo local, DOM falso, fetch/location falsos)
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { fileURLToPath } from 'node:url';
import { INDEX_PATH } from '../lib.mjs';
const html = fs.readFileSync(INDEX_PATH, 'utf8');
const SCRIPT = html.match(/<script>\n([\s\S]*?)<\/script>\s*<\/body>/)[1];
const LOCAL_V = /^const APP_VERSION = '([^']*)';$/m.exec(html)[1];

// Elementos con classList real (la lógica mira la clase hidden)
const els = new Map();
const mk = () => { const cls = new Set(); const t = { value: '', dataset: {}, style: {}, innerHTML: '', textContent: '' };
  return new Proxy(t, { get: (o, k) => k in o ? o[k] : k === 'classList' ? { add: c => cls.add(c), remove: c => cls.delete(c), toggle() {}, contains: c => cls.has(c) } : k === 'querySelectorAll' ? () => [] : (k === 'closest' || k === 'querySelector') ? () => null : typeof k === 'symbol' ? undefined : () => mk(), set: (o, k, v) => (o[k] = v, true) }); };
const el = id => (els.has(id) || els.set(id, mk()), els.get(id));
const ls = new Map([['easylog_mode', 'local']]);
let NOW = 1_000_000; class FakeDate extends Date { static now() { return NOW; } }
let remoteHTML = null, fetchThrows = false, fetches = [];
const replaced = [], listeners = {}, intervals = [];
const loc = { pathname: '/EASYLOG/', search: '', replace: u => replaced.push(u) };
const ctx = vm.createContext({
  document: { getElementById: el, querySelector: () => mk(), querySelectorAll: () => [], body: mk(), createElement: () => mk(), addEventListener: (ev, fn) => (listeners[ev] = fn), visibilityState: 'visible' },
  localStorage: { getItem: k => ls.get(k) ?? null, setItem: (k, v) => ls.set(k, String(v)), removeItem: k => ls.delete(k) },
  window: { location: loc, addEventListener: (ev, fn) => (listeners['win:' + ev] = fn) }, navigator: {}, location: loc, console, Date: FakeDate, Math, JSON, Promise, Intl, URLSearchParams,
  fetch: async (url, opts) => { fetches.push({ url, opts }); if (fetchThrows) throw new TypeError('offline'); return { ok: true, text: async () => remoteHTML }; },
  Blob: class {}, URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} }, confirm: () => true, prompt: () => null, alert() {},
  setTimeout: () => 0, clearTimeout() {}, setInterval: (fn, ms) => (intervals.push(ms), 0) });
let bootError = null;
try { vm.runInContext(SCRIPT, ctx); } catch (e) { bootError = e; }
const run = c => vm.runInContext(c, ctx); let fails = 0;
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); if (!ok) fails++; };
check('arranque sin error', !bootError, bootError && String(bootError));
if (bootError) process.exit(1);

const page = v => `<html>\n<script>\n// x\nconst APP_VERSION = '${v}';\nconst MONTH_NAMES = [];\n</script>`;
const reset = () => { replaced.length = 0; fetches = []; fetchThrows = false; NOW += 120_000;
  run(`_lastExport = null; _cloudWrites = 0; cloud.pendingWrite = false; _pendingVersion = null; _bootV = null;`);
  for (const id of ['input', 'ap-iata', 'ap-lat', 'ap-lon']) el(id).value = '';
  for (const id of ['day-modal', 'ukdate-modal', 'rwy-modal', 'auth-overlay', 'welcome-overlay', 'update-bar']) el(id).classList.add('hidden'); };
const check1 = async () => { await run('checkForUpdate()'); };
const barShown = () => !el('update-bar').classList.contains('hidden');

// ── AC-1: versión visible
check('AC-1 pie muestra v+APP_VERSION', el('app-version').textContent === 'v' + LOCAL_V, el('app-version').textContent);
check('AC-1 formato YYYY.MM.DD-HHMMSS', /^\d{4}\.\d{2}\.\d{2}-\d{6}$/.test(LOCAL_V), LOCAL_V);
check('AC-2 initAutoUpdate registra visibilitychange', typeof listeners.visibilitychange === 'function');
check('AC-2 también foco de ventana y comprobación periódica de 5 min (iOS selector de apps)', typeof listeners['win:focus'] === 'function' && typeof listeners['win:pageshow'] === 'function' && intervals.includes(300000), JSON.stringify(intervals));

// ── parseRemoteVersion
check('parseRemoteVersion lee la versión', run(`parseRemoteVersion(${JSON.stringify(page('2030.01.01-120000'))})`) === '2030.01.01-120000');
check('parseRemoteVersion sin versión → null', run(`parseRemoteVersion('<html></html>')`) === null);
check('parseRemoteVersion del propio index.html = APP_VERSION', run(`parseRemoteVersion(${JSON.stringify(html)})`) === LOCAL_V);

// ── AC-2 / AC-3: misma versión → nada
reset(); remoteHTML = page(LOCAL_V); await check1();
check('AC-2 fetch sin caché y con anti-caché', fetches.length === 1 && fetches[0].opts?.cache === 'no-store' && /\?_=\d+/.test(fetches[0].url), JSON.stringify(fetches));
check('misma versión → no recarga ni aviso', replaced.length === 0 && !barShown());

// ── distinta y sin bloqueos → replace con ?v=
reset(); remoteHTML = page('2030.01.01-120000'); await check1();
check('AC-3 versión nueva sin bloqueos → location.replace(?v=nueva)', replaced[0] === '/EASYLOG/?v=2030.01.01-120000', JSON.stringify(replaced));

// ── cada bloqueo por separado
const blockers = [
  ['aeropuerto a medio añadir', () => { el('ap-lat').value = '40.4'; }, 'aeropuerto'],
  ['modal de día abierto', () => el('day-modal').classList.remove('hidden'), 'ventana'],
  ['modal UK Day abierto', () => el('ukdate-modal').classList.remove('hidden'), 'ventana'],
  ['modal de pistas abierto (fase 4)', () => el('rwy-modal').classList.remove('hidden'), 'ventana'],
  ['login abierto', () => el('auth-overlay').classList.remove('hidden'), 'sesión'],
  ['bienvenida abierta', () => el('welcome-overlay').classList.remove('hidden'), 'sesión'],
  ['barra de exportación', () => run(`_lastExport = { mk: null, n: 3, days: {} }`), 'exportación'],
  ['escritura en vuelo', () => run(`_cloudWrites = 1`), 'guardando'],
  ['cambio sin guardar en la nube', () => run(`cloud.pendingWrite = true`), 'sin guardar'],
];
for (const [name, set, word] of blockers) {
  reset(); remoteHTML = page('2030.01.01-120000'); set(); await check1();
  check(`AC-3 bloqueo «${name}» → no recarga + aviso con motivo`, replaced.length === 0 && barShown() && el('update-msg').textContent.includes(word), el('update-msg').textContent);
}
// ── texto pegado: no bloquea; se guarda y se repone tras la recarga
reset(); ls.delete('easylog_draft'); el('input').value = 'FlightNumber : FR1'; remoteHTML = page('2030.01.01-120000'); await check1();
const draft = JSON.parse(ls.get('easylog_draft') || 'null');
check('texto pegado → recarga igualmente y guarda el borrador', replaced.length === 1 && draft?.text === 'FlightNumber : FR1', ls.get('easylog_draft'));
el('input').value = ''; run('restoreDraft()');
check('al arrancar se repone el texto y se borra el borrador', el('input').value === 'FlightNumber : FR1' && !ls.has('easylog_draft'), el('input').value);
el('input').value = ''; ls.set('easylog_draft', JSON.stringify({ text: 'viejo', at: NOW - 11 * 60000 })); run('restoreDraft()');
check('borrador de hace > 10 min no se repone (y se borra)', el('input').value === '' && !ls.has('easylog_draft'));
el('input').value = 'ya escrito'; ls.set('easylog_draft', JSON.stringify({ text: 'borrador', at: NOW })); run('restoreDraft()');
check('no pisa texto que ya esté en el cuadro', el('input').value === 'ya escrito');
reset(); const realSet = ctx.localStorage.setItem; ctx.localStorage.setItem = () => { throw new Error('QuotaExceeded'); };
el('input').value = 'texto'; remoteHTML = page('2030.01.01-120000'); await check1(); ctx.localStorage.setItem = realSet;
check('si no se puede guardar el borrador → no recarga + aviso «se perderá el texto pegado»', replaced.length === 0 && barShown() && el('update-msg').textContent.includes('texto pegado'), el('update-msg').textContent);
reset(); ctx.localStorage.setItem = (k, v) => { if (k === 'easylog_draft') throw new Error('QuotaExceeded'); ls.set(k, String(v)); };
el('input').value = 'email largo'; remoteHTML = page('2030.01.01-120000'); await check1(); ctx.localStorage.setItem = realSet;
check('cuota llena solo para el borrador (otras escrituras OK) → no recarga + aviso', replaced.length === 0 && barShown() && el('update-msg').textContent.includes('texto pegado'), el('update-msg').textContent);
reset(); ls.delete('easylog_draft'); el('input').value = '   '; remoteHTML = page('2030.01.01-120000'); await check1();
check('texto solo de espacios: recarga y no guarda borrador', replaced.length === 1 && !ls.has('easylog_draft'));

// ── botón Actualizar ignora bloqueos
reset(); remoteHTML = page('2030.01.01-120000'); run(`_lastExport = { mk: null, n: 1, days: {} }`); await check1(); run('applyUpdate()');
check('botón Actualizar recarga aunque haya bloqueo', replaced[0] === '/EASYLOG/?v=2030.01.01-120000');

// ── sin red / respuesta rara
reset(); fetchThrows = true; await check1();
check('AC-2 fetch que lanza → nada', replaced.length === 0 && !barShown());
reset(); remoteHTML = '<html>Error</html>'; await check1();
check('respuesta sin APP_VERSION → nada', replaced.length === 0 && !barShown());

// ── throttle 60 s
reset(); remoteHTML = page(LOCAL_V); await check1(); NOW += 30_000; await check1();
check('AC-2 throttle: 2ª comprobación a los 30 s no hace fetch', fetches.length === 1, String(fetches.length));
NOW += 31_000; await check1();
check('AC-2 throttle: a los 61 s sí', fetches.length === 2, String(fetches.length));

// ── anti-bucle
reset(); run(`_bootV = '2030.01.01-120000'`); remoteHTML = page('2030.01.01-120000'); await check1();
check('AC-4 ya arrancamos pidiendo esa versión → no recarga otra vez, solo aviso', replaced.length === 0 && barShown());
reset(); run(`_bootV = '2030.01.01-120000'`); remoteHTML = page('2030.02.02-120000'); await check1();
check('AC-4 versión aún más nueva → sí recarga', replaced[0] === '/EASYLOG/?v=2030.02.02-120000');

// ── G8: ruta con '//' inicial no puede llevar a otro host
reset(); loc.pathname = '//evil.com/'; remoteHTML = page('2030.01.01-120000'); await check1(); loc.pathname = '/EASYLOG/';
check('G8 pathname //evil.com/ → fetch y replace quedan en el mismo origen', fetches[0]?.url.startsWith('/evil.com/') && replaced[0] === '/evil.com/?v=2030.01.01-120000', JSON.stringify([fetches[0]?.url, replaced[0]]));

// ── contador de escrituras
reset(); run(`cloud.user = { uid: 'u' }; cloud.db = {}; cloud.hydrated = true; __p = persistCloud();`);
const during = run('_cloudWrites'); await run('__p');
check('persistCloud: _cloudWrites = 1 en vuelo y vuelve a 0 (aunque setDoc falle)', during === 1 && run('_cloudWrites') === 0, `${during} → ${run('_cloudWrites')}`);
reset(); run(`ls_mode = localStorage.setItem('easylog_mode', 'cloud'); saveDayMap();`);
const duringDM = run('_cloudWrites'); await new Promise(r => setImmediate(r)); await new Promise(r => setImmediate(r));
check('saveDayMap: _cloudWrites = 1 en vuelo y vuelve a 0', duringDM === 1 && run('_cloudWrites') === 0, `${duringDM} → ${run('_cloudWrites')}`);
run(`cloud.user = null; cloud.db = null; cloud.hydrated = false; localStorage.setItem('easylog_mode', 'local');`);

console.log(fails ? `${fails} FALLOS` : 'TODO OK');
process.exit(fails ? 1 : 0);
