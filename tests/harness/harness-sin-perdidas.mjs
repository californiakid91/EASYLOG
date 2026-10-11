// Test 08-01 — sin pérdidas silenciosas (F-02-006, F-RG-003, F-02-001, F-02-004/005/007, F-RG-004).
// Ejecuta el <script> real de index.html en node:vm con Firebase falso; cada escenario arranca un entorno nuevo.
// Uso: node harness-sin-perdidas.mjs [ruta/index.html]
import fs from 'node:fs';
import vm from 'node:vm';
import { INDEX_PATH, FIXED_NOW, readFixture, FIXTURE_DATE } from '../lib.mjs';

const INDEX = process.argv[2] || INDEX_PATH;
const html = fs.readFileSync(INDEX, 'utf8');
const SCRIPT = html.match(/<script>\n([\s\S]*?)<\/script>\s*<\/body>/)[1]
  .replace(/await import\('https:\/\/www\.gstatic\.com\/firebasejs\/[^']+\/(firebase-[a-z]+)\.js'\)/g, "await __fakeImport('$1')");
const EMAIL = readFixture('01');
const clone = o => JSON.parse(JSON.stringify(o));
const tick = async () => { for (let i = 0; i < 20; i++) await new Promise(r => setImmediate(r)); };

let fails = 0, checks = 0;
const check = (name, ok, detail = '') => { checks++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); if (!ok) fails++; };

// ── Entorno: mode 'cloud' | 'local'; auth=false → la sesión nunca se resuelve (cloud.user = null) ──
async function makeEnv({ mode = 'cloud', auth = true, lsInit = {}, setItemThrows = () => false } = {}) {
  const env = { writes: [], statuses: [], alerts: [], confirms: 0, snapCb: null, beforeImport: null, setDocFails: false };
  let cloudDoc = { history: {}, excelData: {}, airports: {}, ukdays: {}, runways: {}, dayMap: {} };
  const setDoc = (_ref, data, opts) => {
    if (env.setDocFails) return Promise.reject(Object.assign(new Error('denied'), { code: 'permission-denied' }));
    env.writes.push({ data: clone(data), opts: clone(opts || {}) });
    for (const f of (opts?.mergeFields || [])) cloudDoc[f] = clone(data[f]);
    return Promise.resolve();
  };
  const fakeMods = {
    'firebase-app': { initializeApp: () => ({}) },
    'firebase-auth': {
      getAuth: () => ({}), setPersistence: async () => {}, browserLocalPersistence: {},
      onAuthStateChanged: (_a, cb) => { if (auth) setTimeout(() => cb({ uid: 'u1', displayName: 'Test', photoURL: '' }), 0); },
      signInWithPopup: async () => {}, signOut: async () => {}, GoogleAuthProvider: function () {},
    },
    'firebase-firestore': { getFirestore: () => ({}), doc: () => ({}), setDoc, onSnapshot: (_r, cb) => { env.snapCb = cb; return () => {}; } },
  };
  function makeEl() {
    const store = { value: '', textContent: '', innerHTML: '', className: '', checked: false, dataset: {}, style: {}, src: '' };
    const cl = { add() {}, remove() {}, toggle() { return false; }, contains() { return false; } };
    return new Proxy(store, {
      get(t, k) { if (k in t) return t[k]; if (k === 'classList') return cl; if (k === 'querySelectorAll') return () => [];
        if (k === 'closest' || k === 'querySelector') return () => null; if (typeof k === 'symbol') return undefined; return () => makeEl(); },
      set(t, k, v) { t[k] = v; return true; },
    });
  }
  const els = new Map(); const byId = id => (els.has(id) || els.set(id, makeEl()), els.get(id));
  const role = makeEl(); role.value = 'FO';
  const ls = new Map([['easylog_mode', mode], ...Object.entries(lsInit)]);
  env.ls = ls; env.byId = byId;
  const ctx = vm.createContext({
    document: { getElementById: byId, querySelector: s => (s.includes('role') ? role : makeEl()), querySelectorAll: () => [], body: makeEl(), createElement: () => makeEl(), addEventListener() {} },
    localStorage: {
      getItem: k => (ls.has(k) ? ls.get(k) : null),
      setItem: (k, v) => { if (setItemThrows(k)) throw new Error('QuotaExceededError'); ls.set(k, String(v)); },
      removeItem: k => ls.delete(k),
    },
    window: { _ukNowOverride: FIXED_NOW }, navigator: {}, location: {}, console, Date, Math, JSON, Promise, Intl,
    confirm: () => { env.confirms++; return env.confirmImpl ? env.confirmImpl() : true; },
    prompt: () => null, alert: m => env.alerts.push(String(m)),
    setTimeout: (fn, ms) => (ms === 0 ? Promise.resolve().then(fn) : 0), clearTimeout() {}, setInterval: () => 0,
    __fakeImport: async name => { if (env.beforeImport) env.beforeImport(); return fakeMods[name]; },
    __statuses: env.statuses,
  });
  vm.runInContext(SCRIPT, ctx, { filename: 'index.html<script>' });
  // Se registra cada aviso SIN sustituir showStatus (el #status real también se actualiza)
  vm.runInContext('{ const __orig = showStatus; showStatus = (t, m) => { __statuses.push(t + ": " + m); __orig(t, m); }; }', ctx);
  env.run = c => vm.runInContext(c, ctx);
  env.J = c => JSON.parse(JSON.stringify(vm.runInContext(c, ctx) ?? null));
  env.cloudDoc = () => cloudDoc;
  env.fire = () => env.snapCb({ exists: () => true, data: () => clone(cloudDoc), metadata: { fromCache: false } });
  env.setCloud = d => { cloudDoc = { ...cloudDoc, ...clone(d) }; };
  if (mode === 'cloud') for (let i = 0; i < 50 && !env.snapCb && auth; i++) await tick();
  await tick();
  return env;
}
const MAPS = '({ c: _cache, x: _excelData, u: _ukdays, a: _airports, r: _runways, d: _dayMap })';

// ══ AC-1: sin hidratar, nada cambia y se avisa por el canal correcto ══
{
  const E = await makeEnv();
  check('AC-1 entorno: listener registrado y nube sin hidratar', typeof E.snapCb === 'function' && E.run('cloud.hydrated') === false);
  // Estado sembrado (en nube sin hidratar los mapas están vacíos y varios mutadores retornarían antes de la guarda)
  E.run(`
    _cache = { '2026-09-20': { addedAt: 'A', role: 'FO', flights: [{ date: '2026/09/20', d: {} }] }, '${FIXTURE_DATE}': { addedAt: 'B', role: 'FO', flights: [] } };
    _excelData = { '2026-09-20': { role: 'FO', flights: [] }, '2026-09-21': { role: 'FO', flights: [] }, '${FIXTURE_DATE}': { role: 'FO', flights: [] } };
    _ukdays = { '2026-09-22': { state: 'uk', route: 'X', onBlock: '20:00', tz: 'BST', source: 'rule:R1', reason: 'r' }, '2026-09-23': { state: 'uk', route: '—', onBlock: '--:--', tz: 'BST', manual: true, source: 'manual', reason: 'm' } };
    _airports = { XYZ: { lat: 1, lon: 2 } };
    _runways = {};
    _dayMap = { '2026-09-25': 'duty' };
    _lastExport = { mk: null, n: 1, days: { '2026-09-20': 'A' } };
    _rwySel = { iso: '2026-09-20', token: 1, rows: [{ key: 'k1', fn: 'FR1', dep: 'STN', arr: 'ALC', confirmed: {}, val: { dep: '22', arr: '10' }, sug: {}, touched: {} }] };
    _calSel = '2026-09-26';
  `);
  const gapFirst = E.run(`(pendingUKBlocks(ukNow(), viewTY())[0] || {}).days?.[0] || null`);
  const pendingIso = E.run(`ukDayStatus('2026-09-25').state === 'pending' ? '2026-09-25' : null`);
  check('AC-1 entorno: hay pendiente DUTY y hueco OFF que probar', !!gapFirst && !!pendingIso, `gap=${gapFirst} pend=${pendingIso}`);

  const cases = [
    ['addDay (día nuevo)', 'status', () => { E.byId('input').value = EMAIL.replace(/2026\/09\/18/g, '2026/09/24'); E.run('addDay()'); }],
    ['addDay (re-pegar con cambios)', 'status', () => { E.byId('input').value = EMAIL; E.run('addDay()'); }],
    ['addDay (comando de texto UK)', 'status', () => { E.byId('input').value = 'añade uk days septiembre 27'; E.run('addDay()'); }],
    ['removeDay', 'status', () => E.run(`removeDay('2026-09-20')`)],
    ['clearHistory', 'status', () => E.run('clearHistory()')],
    ['clearExported', 'status', () => E.run('clearExported()')],
    ['addAirport', 'status', () => { E.byId('ap-iata').value = 'ABC'; E.byId('ap-lat').value = '40'; E.byId('ap-lon').value = '-3'; E.run('addAirport()'); }],
    ['removeAirport', 'status', () => E.run(`removeAirport('XYZ')`)],
    ['removeAirportAt', 'status', () => E.run('removeAirportAt(0)')],
    ['removeExcelOnlyDay', 'status', () => E.run(`removeExcelOnlyDay('2026-09-21')`)],
    ['confirmUKDateModal', 'alert', () => { E.byId('ukday-date').value = '2026-09-28'; E.run('confirmUKDateModal()'); }],
    ['addUKDayManual', 'alert', () => E.run(`addUKDayManual('2026-09-28')`)],
    ['removeUKDay (automático → No UK)', 'alert', () => E.run(`removeUKDay('2026-09-22')`)],
    ['removeUKDay (manual → borrar)', 'alert', () => E.run(`removeUKDay('2026-09-23')`)],
    ['ukDecidePending', 'alert', () => E.run(`ukDecidePending('${pendingIso}', 'uk')`)],
    ['ukMarkBlockOff', 'alert', () => E.run(`ukMarkBlockOff('${gapFirst}')`)],
    ['confirmRwyModal', 'alert', () => E.run('confirmRwyModal()')],
    ['setDayStatus (calendario)', 'alert', () => E.run(`setDayStatus('off')`)],
  ];
  for (const [name, channel, act] of cases) {
    const before = JSON.stringify(E.J(MAPS));
    const text = E.byId('input').value = E.byId('input').value || 'texto pegado de prueba';
    E.statuses.length = 0; E.alerts.length = 0; E.confirms = 0;
    act();
    await tick();
    const after = JSON.stringify(E.J(MAPS));
    const keepsText = E.byId('input').value !== '' ;
    const lastStatus = E.statuses.at(-1) || '';
    const warned = channel === 'alert'
      ? E.alerts.length === 1 && E.alerts[0].includes('no se ha guardado nada')
      : lastStatus.startsWith('warn:') && lastStatus.includes('no se ha guardado nada');
    check(`AC-1 ${name}: mapas idénticos, texto conservado, 0 confirm, aviso por ${channel}`,
      before === after && keepsText && E.confirms === 0 && warned && !E.statuses.some(s => s.startsWith('ok:')),
      `${before === after ? '' : 'MAPAS CAMBIADOS '}confirms=${E.confirms} alerts=${E.alerts.length} status=${lastStatus.slice(0, 60)} input=${keepsText ? 'ok' : 'VACIADO'} text=${text.length}`);
  }
  check('AC-1 0 escrituras a la nube', E.writes.length === 0, `writes=${E.writes.length}`);
  check('AC-1 #status real muestra el aviso (no sustituido)', /warn/.test(E.byId('status').className) && E.byId('status').textContent.includes('no se ha guardado nada'), E.byId('status').className);
  // Texto sin vuelos: la validación va antes de la guarda
  E.byId('input').value = 'hola, esto no es un email'; E.statuses.length = 0; E.run('addDay()');
  check('AC-1 texto sin vuelos → «No se encontraron vuelos»', (E.statuses.at(-1) || '').includes('No se encontraron vuelos'), E.statuses.at(-1));
  // Tras hidratar: aviso nuevo, ya se puede guardar
  E.fire(); await tick();
  check('AC-5 aviso tras cargar la nube', E.statuses.some(s => s.includes('Nube cargada: ya puedes guardar')), E.statuses.at(-1));
}

// cloud.user = null (la sesión no se ha resuelto)
{
  const E = await makeEnv({ auth: false });
  E.byId('input').value = EMAIL; E.run('addDay()'); await tick();
  check('AC-1 sin sesión (cloud.user=null): no guarda, avisa, texto intacto',
    Object.keys(E.J('_cache')).length === 0 && (E.statuses.at(-1) || '').startsWith('warn:') && E.byId('input').value === EMAIL && E.run('persist()') === false,
    E.statuses.at(-1));
}

// ══ AC-2: el payload de la nube se captura antes del await ══
{
  const E = await makeEnv(); E.fire(); await tick();
  E.beforeImport = () => E.run(`_cache = { '2099-01-01': { role: 'FO', flights: [] } }`); // "snapshot" durante el import del SDK
  E.run(`saveHistory({ '2026-09-29': { addedAt: 'Z', role: 'FO', flights: [] } })`); await tick();
  E.beforeImport = null;
  const w = E.writes.at(-1);
  check('AC-2 setDoc envía lo que había al guardar (no lo del snapshot)', !!w && Object.keys(w.data.history).join() === '2026-09-29', JSON.stringify(w?.data.history));
  // Mismo caso para el calendario
  E.beforeImport = () => E.run(`_dayMap = {}`);
  E.run(`_dayMap = { '2026-09-30': 'off' }; saveDayMap();`); await tick();
  E.beforeImport = null;
  check('AC-2 saveDayMap envía el calendario capturado', JSON.stringify(E.writes.at(-1)?.data.dayMap) === '{"2026-09-30":"off"}', JSON.stringify(E.writes.at(-1)?.data));
}

// ══ AC-3: fallos visibles ══
{
  const E = await makeEnv(); E.fire(); await tick();
  E.setDocFails = true; E.statuses.length = 0;
  E.byId('input').value = EMAIL; E.run('addDay()'); await tick();
  check('AC-3 setDoc rechaza → aviso err visible (sustituye al OK)', (E.statuses.at(-1) || '').startsWith('err:') && E.statuses.at(-1).includes('No se ha guardado en la nube (permiso denegado)'), E.statuses.at(-1));
  check('AC-3 indicador de sync en error', /err/.test(E.byId('sync-indicator').className), E.byId('sync-indicator').className);
  E.statuses.length = 0;
  E.run(`_dayMap['2026-10-01'] = 'off'; saveDayMap();`); await tick();
  check('AC-3 saveDayMap en nube rechaza → aviso err', E.statuses.some(s => s.startsWith('err:') && s.includes('calendario en la nube')), E.statuses.join(' | '));
}
{
  const E = await makeEnv({ setItemThrows: k => k === 'easylog_days_v1' }); E.fire(); await tick();
  const n = E.writes.length; E.statuses.length = 0;
  E.run(`_dayMap['2026-10-02'] = 'sim'; saveDayMap();`); await tick();
  check('AC-3 espejo local del calendario falla → aviso err y aun así se escribe en la nube',
    E.statuses.some(s => s.startsWith('err:') && s.includes('copia del calendario')) && E.writes.length === n + 1 && E.writes.at(-1).data.dayMap?.['2026-10-02'] === 'sim',
    `${E.statuses.join(' | ')} writes=${E.writes.length - n}`);
}
{
  let full = false;
  const E = await makeEnv({ mode: 'local', setItemThrows: k => full && k.startsWith('easylog_') && k !== 'easylog_mode' });
  full = true; E.statuses.length = 0;
  const r = E.run(`saveHistory({ '2026-09-29': { role: 'FO', flights: [] } })`);
  check('AC-3 modo local con almacenamiento lleno → false + aviso err', r === false && (E.statuses.at(-1) || '').startsWith('err:') && E.statuses.at(-1).includes('se perderá al recargar'), E.statuses.at(-1));
  E.statuses.length = 0;
  E.byId('input').value = EMAIL; E.run('addDay()');
  check('AC-3 modo local lleno: pegar no dice OK ni vacía el cuadro', !E.statuses.some(s => s.startsWith('ok:')) && E.byId('input').value === EMAIL, E.statuses.join(' | '));
}

// ══ AC-4: clave local corrupta ══
{
  const excel = { [FIXTURE_DATE]: { role: 'FO', flights: [] } };
  const E = await makeEnv({ mode: 'local', lsInit: { easylog_runways_v1: '{roto', easylog_excel_v1: JSON.stringify(excel), easylog_ukdays_v1: '{}' } });
  check('AC-4 solo la clave rota queda vacía; las demás se cargan', JSON.stringify(E.J('_runways')) === '{}' && Object.keys(E.J('_excelData')).includes(FIXTURE_DATE));
  // El aviso sale durante el arranque (antes de envolver showStatus): se lee del #status real
  check('AC-4 aviso warn que la nombra (sigue visible tras arrancar)', /warn/.test(E.byId('status').className) && E.byId('status').textContent.includes('No se pudo leer: las pistas'), `${E.byId('status').className} ${E.byId('status').textContent}`);
  check('AC-4 tras arrancar (backfill) el texto roto sigue', E.ls.get('easylog_runways_v1') === '{roto');
  E.byId('input').value = EMAIL; E.run('addDay()');
  check('AC-4 tras una mutación el texto roto sigue y lo demás se guarda',
    E.ls.get('easylog_runways_v1') === '{roto' && Object.keys(JSON.parse(E.ls.get('easylog_history_v1'))).includes(FIXTURE_DATE));
}

// G6 #1: clave rota de un mapa que el usuario cambia → no hay «OK» ni se vacía el cuadro
{
  const E = await makeEnv({ mode: 'local', lsInit: { easylog_history_v1: '{roto' } });
  E.statuses.length = 0; E.byId('input').value = EMAIL; E.run('addDay()');
  check('G6 lista rota: pegar → err, sin OK, cuadro conservado, texto roto intacto',
    !E.statuses.some(s => s.startsWith('ok:')) && (E.statuses.at(-1) || '').startsWith('err:') && E.statuses.at(-1).includes('la lista de días') &&
    E.byId('input').value === EMAIL && E.ls.get('easylog_history_v1') === '{roto', E.statuses.join(' | '));
}
// G6 #2: calendario local roto → aviso, no se pisa; en Nube es solo espejo (se reescribe sin avisos)
{
  const E = await makeEnv({ mode: 'local', lsInit: { easylog_days_v1: '{roto' } });
  check('G6 calendario roto (Local): aviso al arrancar', /warn/.test(E.byId('status').className) && E.byId('status').textContent.includes('el calendario'), E.byId('status').textContent);
  E.statuses.length = 0; E.run(`_calSel = '2026-09-26'; setDayStatus('off')`);
  check('G6 calendario roto (Local): cambiar un día → err y la copia rota no se pisa',
    E.ls.get('easylog_days_v1') === '{roto' && (E.statuses.at(-1) || '').startsWith('err:'), E.statuses.join(' | '));
}
{
  const E = await makeEnv({ lsInit: { easylog_days_v1: '{roto' } }); E.fire(); await tick();
  check('G6 calendario roto (Nube): el espejo se reescribe desde la nube sin avisos', E.ls.get('easylog_days_v1') !== '{roto' && !/No se pudo leer/.test(E.byId('status').textContent), E.ls.get('easylog_days_v1'));
}

// ══ AC-5: textos ══
check('AC-5 sin «vuelve a importarlos»', !html.includes('importarlos'));
check('AC-5 sin promesa «en cualquier momento»', !html.includes('cualquier momento'));
check('AC-5 sin «Repite el último cambio si no aparece»', !html.includes('Repite el último cambio'));

// ══ AC-6: hidratado, todo como siempre ══
{
  const E = await makeEnv(); E.fire(); await tick();
  E.statuses.length = 0; E.byId('input').value = EMAIL; E.run('addDay()'); await tick();
  check('AC-6 pegar con nube cargada → OK, guardado y cuadro vacío',
    (E.statuses.at(-1) || '').startsWith('ok:') && Object.keys(E.cloudDoc().history).includes(FIXTURE_DATE) && E.byId('input').value === '', E.statuses.at(-1));
  E.run(`removeDay('${FIXTURE_DATE}')`); await tick();
  check('AC-6 quitar de la lista → OK', (E.statuses.at(-1) || '').startsWith('ok:') && !Object.keys(E.cloudDoc().history).includes(FIXTURE_DATE), E.statuses.at(-1));
  E.byId('input').value = EMAIL; E.run('addDay()'); await tick();
  check('AC-6 re-pegar idéntico solo-Excel → vuelve a la lista', (E.statuses.at(-1) || '').includes('vuelve a la lista') && Object.keys(E.cloudDoc().history).includes(FIXTURE_DATE), E.statuses.at(-1));
  E.run(`_calSel = '2026-09-26'; setDayStatus('off')`); await tick();
  check('AC-6 calendario con nube cargada se guarda', E.cloudDoc().dayMap['2026-09-26'] === 'off' && E.alerts.length === 0);
}

console.log(`\n${fails ? fails + ' FAIL' : 'TODO OK'} (${checks} checks)`);
process.exit(fails ? 1 : 0);
