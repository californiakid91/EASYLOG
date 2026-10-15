// Test 08-02 — sincronización endurecida (F-RG-007, F-02-012, F-02-008 y uso secuencial de F-02-001).
// Ejecuta el <script> real de index.html en node:vm con Firebase falso y un reloj/temporizadores controlables:
//   advance(ms) mueve el reloj y dispara los temporizadores que vencen (la app sigue «despierta»);
//   jump(ms) mueve el reloj SIN disparar nada (dispositivo suspendido / pestaña congelada).
// Uso: node harness-sync.mjs [ruta/index.html]
import fs from 'node:fs';
import vm from 'node:vm';
import { INDEX_PATH, FIXED_NOW, readFixture, FIXTURE_DATE, PILOT_SEED } from '../lib.mjs';

const INDEX = process.argv[2] || INDEX_PATH;
const html = fs.readFileSync(INDEX, 'utf8');
const SCRIPT = html.match(/<script>\n([\s\S]*?)<\/script>\s*<\/body>/)[1]
  .replace(/await import\('https:\/\/www\.gstatic\.com\/firebasejs\/[^']+\/(firebase-[a-z]+)\.js'\)/g, "await __fakeImport('$1')");
const EMAIL = readFixture('01');
const EMAIL_E = EMAIL.replace(/2026\/09\/18/g, '2026/09/24'); // otro día (E) con los mismos vuelos
const clone = o => JSON.parse(JSON.stringify(o));
const flush = async () => { for (let i = 0; i < 30; i++) await new Promise(r => setImmediate(r)); };

let fails = 0, checks = 0;
const check = (name, ok, detail = '') => { checks++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); if (!ok) fails++; };

async function makeEnv({ mode = 'cloud' } = {}) {
  const env = { writes: [], statuses: [], alerts: [], subs: 0, serverCalls: 0, signOuts: 0, held: [], hold: false,
    serverMode: 'ok', serverHeld: [], snapCb: null, errCb: null, listeners: {} };
  // Reloj: deriva del Date del proceso (con --now, tests/fake-now.mjs ya lo ha fijado) + desplazamiento controlable
  const Base = Date; let off = 0;
  const now = () => Base.now() + off;
  class FDate extends Base {
    constructor(...a) { super(...(a.length ? a : [now()])); }
    static now() { return now(); }
  }
  // Temporizadores: ms=0 → microtarea (como los harness existentes); el resto, a una cola por hora de vencimiento
  let seq = 0; const timers = new Map();
  const addTimer = (fn, ms, every) => { const id = ++seq; timers.set(id, { fn, at: now() + (ms || 0), every }); return id; };
  const setTimeoutF = (fn, ms) => { if (!ms) { Promise.resolve().then(fn); return 0; } return addTimer(fn, ms, 0); };
  const setIntervalF = (fn, ms) => addTimer(fn, ms, ms);
  const clearT = id => { timers.delete(id); };
  env.advance = async ms => {
    const end = now() + ms;
    for (;;) {
      let next = null;
      for (const [id, t] of timers) if (t.at <= end && (!next || t.at < next[1].at)) next = [id, t];
      if (!next) break;
      const [id, t] = next;
      off += Math.max(0, t.at - now()); // un temporizador atrasado (tras jump) vence «ahora», sin retroceder el reloj
      if (t.every) t.at = now() + t.every; else timers.delete(id); // como el navegador: el intervalo no se pone al día
      t.fn(); await flush();
    }
    off += end - now(); await flush();
  };
  env.jump = ms => { off += ms; };

  let cloudDoc = { history: {}, excelData: {}, airports: {}, ukdays: {}, runways: {}, dayMap: {}, settings: { pilotCode: 'FOXRAY' } };
  env.cloudDoc = () => cloudDoc;
  env.setCloud = d => { cloudDoc = { ...cloudDoc, ...clone(d) }; };
  const applyWrite = (data, opts) => { for (const f of (opts?.mergeFields || [])) cloudDoc[f] = clone(data[f]); };
  const setDoc = (_ref, data, opts) => {
    env.writes.push({ data: clone(data), opts: clone(opts || {}) });
    if (!env.hold) { applyWrite(data, opts); return Promise.resolve(); }
    return new Promise((res, rej) => env.held.push({ res: () => { applyWrite(data, opts); res(); }, rej }));
  };
  env.releaseOne = async () => { const x = env.held.shift(); if (x) x.res(); await flush(); };
  env.release = async (ok = true) => {
    const h = env.held.splice(0);
    h.forEach(x => (ok ? x.res() : x.rej(Object.assign(new Error('denied'), { code: 'permission-denied' }))));
    await flush();
  };
  const snapOf = d => ({ exists: () => true, data: () => clone(d) });
  const getDocFromServer = () => {
    env.serverCalls++;
    if (env.serverMode === 'fail') return Promise.reject(Object.assign(new Error('offline'), { code: 'unavailable' }));
    if (env.serverMode === 'hold') return new Promise((res, rej) => env.serverHeld.push({ res: () => res(snapOf(cloudDoc)), rej }));
    return Promise.resolve(snapOf(cloudDoc));
  };
  env.serverRelease = async (ok = true) => {
    env.serverHeld.splice(0).forEach(x => (ok ? x.res() : x.rej(Object.assign(new Error('offline'), { code: 'unavailable' }))));
    await flush();
  };
  const fakeMods = {
    'firebase-app': { initializeApp: () => ({}) },
    'firebase-auth': {
      getAuth: () => ({}), setPersistence: async () => {}, browserLocalPersistence: {},
      onAuthStateChanged: (_a, cb) => { env.authCb = cb; setTimeoutF(() => cb({ uid: 'u1', displayName: 'Test', photoURL: '' }), 0); },
      signInWithPopup: async () => {}, signOut: async () => { env.signOuts++; }, GoogleAuthProvider: function () {},
    },
    'firebase-firestore': {
      getFirestore: () => ({}), doc: () => ({}), setDoc, getDocFromServer,
      onSnapshot: (_r, cb, errCb) => { env.subs++; env.snapCb = cb; env.errCb = errCb; return () => {}; },
    },
  };
  // fire: snapshot del listener. data por defecto = la nube; pending = hasPendingWrites
  env.fire = ({ pending = false, fromCache = false, data } = {}) =>
    env.snapCb({ exists: () => true, data: () => clone(data || cloudDoc), metadata: { fromCache, hasPendingWrites: pending } });

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
  env.byId = byId;
  const role = makeEl(); role.value = 'FO';
  const ls = new Map([['easylog_mode', mode], PILOT_SEED]);
  env.ls = ls;
  const on = (type, fn) => { (env.listeners[type] ||= []).push(fn); };
  env.dispatch = async type => { (env.listeners[type] || []).forEach(fn => fn({ persisted: true })); await flush(); };
  const nav = { onLine: true };
  env.nav = nav;
  const doc = { getElementById: byId, querySelector: s => (s.includes('role') ? role : makeEl()), querySelectorAll: () => [],
    body: makeEl(), createElement: () => makeEl(), addEventListener: on, visibilityState: 'visible' };
  env.setVisible = v => { doc.visibilityState = v ? 'visible' : 'hidden'; };
  const ctx = vm.createContext({
    document: doc,
    localStorage: { getItem: k => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => ls.set(k, String(v)), removeItem: k => ls.delete(k) },
    window: { _ukNowOverride: FIXED_NOW, addEventListener: on }, navigator: nav, location: {}, console, Date: FDate, Math, JSON, Promise, Intl,
    confirm: m => (env.confirmImpl ? env.confirmImpl(m) : true), prompt: () => null, alert: m => env.alerts.push(String(m)),
    setTimeout: setTimeoutF, clearTimeout: clearT, setInterval: setIntervalF, clearInterval: clearT,
    __fakeImport: async name => fakeMods[name],
    __statuses: env.statuses,
  });
  vm.runInContext(SCRIPT, ctx, { filename: 'index.html<script>' });
  vm.runInContext('{ const __orig = showStatus; showStatus = (t, m) => { __statuses.push(t + ": " + m); __orig(t, m); }; }', ctx);
  env.run = c => vm.runInContext(c, ctx);
  env.J = c => JSON.parse(JSON.stringify(vm.runInContext(c, ctx) ?? null));
  env.sync = () => byId('sync-indicator').textContent;
  env.paste = async txt => { byId('input').value = txt; env.run('addDay()'); await flush(); };
  if (mode === 'cloud') { for (let i = 0; i < 50 && !env.snapCb; i++) await flush(); }
  await flush();
  return env;
}
// Entorno en nube ya hidratado con un primer snapshot del servidor
async function hydrated(seed) {
  const E = await makeEnv();
  if (seed) E.setCloud(seed);
  E.fire(); await flush();
  return E;
}
const has = (E, map, key) => E.run(`Object.prototype.hasOwnProperty.call(${map}, '${key}')`);
const D = '2026-09-20', E_ISO = '2026-09-24';

// ══ T1 / AC-1: un snapshot tardío no deshace un cambio propio ══
{
  const E = await hydrated({ dayMap: { '2026-09-01': 'off' } });
  check('T1 entorno: hidratado', E.run('cloud.hydrated') === true);
  E.hold = true;
  await E.paste(EMAIL_E);
  E.run(`_calSel = '2026-09-26'; setDayStatus('duty');`); await flush();
  check('T1 escrituras enviadas y sin confirmar', E.writes.length >= 2 && E.run('_cloudWrites') >= 2, `writes=${E.writes.length} cw=${E.run('_cloudWrites')}`);
  const old = clone(E.cloudDoc()); // estado del servidor ANTES de nuestras escrituras
  await E.advance(5000);           // más de los 2-3 s de las antiguas guardas
  E.fire({ data: old }); await flush();
  check('T1 snapshot tardío sin hasPendingWrites NO revierte _cache/_excelData', has(E, '_cache', E_ISO) && has(E, '_excelData', E_ISO));
  check('T1 … ni _ukdays ni _dayMap', has(E, '_ukdays', E_ISO) && E.run(`_dayMap['2026-09-26']`) === 'duty', JSON.stringify(E.J('Object.keys(_ukdays)')));
  // Snapshot CON hasPendingWrites (nuestras escrituras superpuestas) que además trae un día D de otro dispositivo
  const withPending = clone(old);
  withPending.history = { ...E.J('_cache'), [D]: { addedAt: 'X', role: 'FO', flights: [] } };
  withPending.excelData = { ...E.J('_excelData') }; withPending.ukdays = E.J('_ukdays'); withPending.dayMap = E.J('_dayMap');
  E.fire({ pending: true, data: withPending }); await flush();
  check('T1 snapshot con hasPendingWrites se aplica (trae D de otro dispositivo)', has(E, '_cache', D) && has(E, '_cache', E_ISO));
  await E.release(); await E.advance(100);
  check('T1 _cloudWrites vuelve a 0 al confirmar', E.run('_cloudWrites') === 0, String(E.run('_cloudWrites')));
  check('T1 sin guardas por temporizador en index.html', !/_ukdaysSaving|_runwaysSaving|_dayMapSaving/.test(html));
}

// ══ T1b / AC-5b: snapshot descartado → al confirmar la escritura se relee del servidor ══
{
  const E = await hydrated();
  E.hold = true;
  await E.paste(EMAIL_E);
  const before = E.serverCalls;
  E.fire({ data: { history: {}, excelData: {}, airports: {}, ukdays: {}, runways: {}, dayMap: {} } }); await flush(); // descartado
  check('T1b snapshot sin pending descartado (memoria intacta)', has(E, '_cache', E_ISO));
  E.hold = false;
  E.setCloud({ dayMap: { '2026-09-02': 'sim' } }); // cambio de otro dispositivo en un campo que esta escritura no reemplaza
  await E.release(); await E.advance(100);
  check('T1b al llegar _cloudWrites a 0 se lanza una lectura del servidor', E.serverCalls === before + 1, `${before} → ${E.serverCalls}`);
  check('T1b la memoria queda igual que la nube', E.run(`_dayMap['2026-09-02']`) === 'sim' && has(E, '_cache', E_ISO));
}

// ══ T2 / AC-2: guardado sin confirmar → aviso visible, sin olvidar la escritura ══
{
  const E = await hydrated();
  E.hold = true;
  await E.paste(EMAIL_E);
  await E.advance(19000);
  check('T2 antes de 20 s no hay aviso', !E.statuses.some(s => s.includes('No recargues')));
  await E.advance(2000);
  check('T2 a los 20 s: indicador «Sin confirmar»', /Sin confirmar/.test(E.sync()), E.sync());
  check('T2 a los 20 s: aviso err con «No recargues»', E.statuses.some(s => s.startsWith('err:') && s.includes('No recargues')), E.statuses.at(-1));
  check('T2 _cloudWrites sigue en 1 (la recarga sigue bloqueada)', E.run('_cloudWrites') === 1 && E.J('updateBlockers()').includes('guardando en la nube'), E.run('_cloudWrites'));
  await E.release(); await E.advance(100);
  check('T2 al confirmar: _cloudWrites 0 e indicador «Sincronizado ✓»', E.run('_cloudWrites') === 0 && /Sincronizado ✓/.test(E.sync()), `${E.run('_cloudWrites')} ${E.sync()}`);
  check('T2 al confirmar: aviso de que la nube ya confirmó', /ya ha confirmado/.test(E.statuses.at(-1) || ''), E.statuses.at(-1));
  // saveDayMap igual
  E.statuses.length = 0;
  E.run(`_calSel = '2026-09-27'; setDayStatus('off');`); await flush();
  await E.advance(21000);
  check('T2 saveDayMap: aviso y _cloudWrites 1', E.statuses.some(s => s.includes('No recargues')) && E.run('_cloudWrites') === 1, E.statuses.join(' | '));
  await E.release(); await E.advance(100);
  check('T2 saveDayMap: confirmado → 0', E.run('_cloudWrites') === 0);
  // Sin red conocida (navigator.onLine=false): aviso a los 5 s
  E.statuses.length = 0; E.nav.onLine = false;
  await E.paste(EMAIL);
  await E.advance(6000);
  check('T2 sin red: aviso a los 5 s', E.statuses.some(s => s.includes('No recargues')), E.statuses.join(' | '));
  E.nav.onLine = true; await E.release(); await E.advance(100);
}

// ══ T3 / AC-3: listener muerto → bloquea escrituras y se rearma ══
{
  const E = await hydrated();
  const subs0 = E.subs;
  E.errCb(Object.assign(new Error('x'), { code: 'permission-denied' })); await flush();
  check('T3 tras errCb: hydrated = false', E.run('cloud.hydrated') === false);
  check('T3 aviso con el motivo', E.statuses.some(s => s.includes('permiso denegado')), E.statuses.at(-1));
  const w0 = E.writes.length;
  await E.paste(EMAIL_E);
  check('T3 mutador no escribe y el texto sigue en el cuadro', E.writes.length === w0 && E.byId('input').value === EMAIL_E);
  await E.advance(2100);
  check('T3 tras el backoff se vuelve a suscribir', E.subs === subs0 + 1, `${subs0} → ${E.subs}`);
  E.fire(); await flush();
  check('T3 el primer snapshot rehidrata', E.run('cloud.hydrated') === true);
}

// ══ T3b / AC-3b: rearme sin bucles ══
{
  const E = await hydrated();
  const subs0 = E.subs;
  const err = () => E.errCb(Object.assign(new Error('x'), { code: 'permission-denied' }));
  err(); await flush();
  await E.advance(2100);                // 1.er reintento (2 s)
  err(); await flush();                 // vuelve a fallar
  const warns = E.statuses.filter(s => s.includes('se ha cortado')).length;
  check('T3b un solo aviso por racha', warns === 1, `avisos=${warns}`);
  await E.advance(2100);
  check('T3b backoff: a los 2 s del 2.º error aún no reintenta', E.subs === subs0 + 1, `${E.subs - subs0}`);
  await E.advance(2000);
  check('T3b backoff: a los 4 s sí', E.subs === subs0 + 2, `${E.subs - subs0}`);
  // unauthenticated → cerrar sesión, sin rearme
  const subs1 = E.subs;
  E.errCb(Object.assign(new Error('x'), { code: 'unauthenticated' })); await flush();
  await E.advance(70000);
  check('T3b unauthenticated → signOut y sin rearme', E.signOuts === 1 && E.subs === subs1, `signOuts=${E.signOuts} subs+${E.subs - subs1}`);
}
{
  // Cambio de modo con reintento pendiente → no crea otro listener
  const E = await hydrated();
  E.errCb(Object.assign(new Error('x'), { code: 'permission-denied' })); await flush();
  const subs0 = E.subs;
  E.run('switchMode()'); await flush();
  await E.advance(70000);
  check('T3b switchMode cancela el reintento', E.subs === subs0, `subs+${E.subs - subs0}`);
}
{
  // El reintento de otro usuario no rearma
  const E = await hydrated();
  E.errCb(Object.assign(new Error('x'), { code: 'permission-denied' })); await flush();
  const subs0 = E.subs;
  E.run(`cloud.user = { uid: 'u2' }`);
  await E.advance(2100);
  check('T3b reintento de un usuario que ya no es el actual no rearma', E.subs === subs0, `subs+${E.subs - subs0}`);
}

// ══ T4 / AC-4: al volver a la app no se escribe desde memoria vieja ══
{
  const E = await hydrated();
  // Otro dispositivo escribe D mientras este está suspendido
  E.setCloud({ history: { [D]: { addedAt: 'X', role: 'FO', flights: [] } }, excelData: { [D]: { role: 'FO', flights: [] } } });
  E.jump(5 * 60000);
  E.serverMode = 'hold';
  await E.dispatch('visibilitychange');
  check('T4 al volver: stale y «Comprobando la nube…»', E.run('cloud.stale') === true && /Comprobando/.test(E.sync()), E.sync());
  const w0 = E.writes.length;
  await E.paste(EMAIL_E);
  check('T4 guardar antes de revalidar: bloqueado, nada a la nube', E.writes.length === w0 && has(E, '_cache', E_ISO) === false);
  check('T4 aviso STALE_MSG', E.statuses.some(s => s.includes('Comprobando que no haya cambios')), E.statuses.at(-1));
  check('T4 el indicador sigue en «Comprobando…» (no «Sin conexión»)', /Comprobando/.test(E.sync()), E.sync());
  await E.serverRelease(); await flush();
  check('T4 tras la lectura: stale = false y la memoria tiene D', E.run('cloud.stale') === false && has(E, '_cache', D));
  check('T4 avisa de que ya se puede repetir el cambio', E.statuses.some(s => s.includes('Nube comprobada: ya puedes repetir')), E.statuses.at(-1));
  await E.paste(EMAIL_E);
  check('T4 al guardar E la nube conserva D y E', !!E.cloudDoc().history[D] && !!E.cloudDoc().history[E_ISO], JSON.stringify(Object.keys(E.cloudDoc().history)));
}
{
  // Si la lectura falla, sigue bloqueado y lo indica
  const E = await hydrated();
  E.jump(5 * 60000); E.serverMode = 'fail';
  await E.dispatch('visibilitychange');
  check('T4 lectura fallida: sigue stale e indicador «reintentando»', E.run('cloud.stale') === true && /reintentando/.test(E.sync()), E.sync());
  const w0 = E.writes.length;
  E.run(`_calSel = '2026-09-27'; setDayStatus('off');`); await flush();
  check('T4 lectura fallida: escritura bloqueada', E.writes.length === w0);
}

// ══ T5 / AC-5: hueco de reloj, escritura que detecta el hueco, reintento, backfill ══
{
  // Hueco visto por el tick, sin eventos
  const E = await hydrated();
  E.serverMode = 'hold';
  E.jump(70000);
  await E.advance(1000); // el tick atrasado vence ya (menos que el timeout de 10 s de la lectura)
  check('T5 el tick ve el hueco y lanza una lectura', E.serverCalls === 1 && E.run('cloud.stale') === true, `calls=${E.serverCalls}`);
  await E.dispatch('visibilitychange'); await E.dispatch('focus');
  check('T5 una sola lectura aunque coincidan varios disparadores', E.serverCalls === 1, `calls=${E.serverCalls}`);
  await E.serverRelease();
  check('T5 tras la lectura: stale = false', E.run('cloud.stale') === false);
}
{
  // lastAliveAt reciente → ningún disparador revalida (alt-tab de escritorio)
  const E = await hydrated();
  await E.advance(90000); // despierta: los ticks mantienen lastAliveAt
  await E.dispatch('focus'); await E.dispatch('visibilitychange');
  check('T5 con la app despierta, focus/visibilitychange no revalidan', E.serverCalls === 0, `calls=${E.serverCalls}`);
}
{
  // La propia escritura detecta el hueco antes del siguiente tick
  const E = await hydrated();
  E.serverMode = 'hold';
  E.jump(70000);
  const w0 = E.writes.length;
  E.run(`_calSel = '2026-09-27'; setDayStatus('off');`); await flush();
  check('T5 escritura tras hueco: bloqueada + lectura lanzada', E.writes.length === w0 && E.serverCalls === 1 && E.run('cloud.stale') === true, `w+${E.writes.length - w0} calls=${E.serverCalls}`);
  await E.serverRelease();
}
{
  // Lectura que falla y listener mudo → reintento solo hasta que funciona
  const E = await hydrated();
  E.serverMode = 'fail';
  E.jump(70000); await E.dispatch('visibilitychange');
  check('T5 primer intento fallido', E.serverCalls === 1 && E.run('cloud.stale') === true);
  await E.advance(3100);
  check('T5 reintenta solo (backoff)', E.serverCalls >= 2, `calls=${E.serverCalls}`);
  E.serverMode = 'ok';
  await E.advance(30000);
  check('T5 cuando la lectura funciona: stale = false sin intervención', E.run('cloud.stale') === false && /Sincronizado/.test(E.sync()), E.sync());
}
{
  // window 'online' también reintenta
  const E = await hydrated();
  E.serverMode = 'fail';
  E.jump(70000); await E.dispatch('visibilitychange');
  E.serverMode = 'ok';
  await E.dispatch('online');
  check('T5 «online» reintenta', E.run('cloud.stale') === false, `calls=${E.serverCalls}`);
}
{
  // El backfill de UK Days que corre al aplicar los datos guarda sin STALE_MSG espurio
  const E = await hydrated();
  await E.paste(EMAIL);
  check('T5 entorno: UK Day del día pegado en la nube', !!E.cloudDoc().ukdays[FIXTURE_DATE]);
  E.setCloud({ ukdays: {} }); // otro dispositivo deja ukdays sin ese día → el backfill lo recalcula
  E.jump(70000); E.statuses.length = 0; const w0 = E.writes.length;
  await E.dispatch('visibilitychange'); await flush();
  check('T5 backfill tras revalidar: escribe UK Days', E.writes.length > w0 && !!E.cloudDoc().ukdays[FIXTURE_DATE], `w+${E.writes.length - w0}`);
  check('T5 backfill tras revalidar: sin STALE_MSG ni «ya puedes guardar» espurios', !E.statuses.some(s => /Comprobando que no haya|ya puedes guardar/.test(s)), E.statuses.join(' | '));
}

// ══ G6 (revisión Fable del código) ══
{
  // #1: con dos escrituras sin confirmar, confirmar UNA no pone «Sincronizado ✓» (el aviso dice no recargar hasta verlo)
  const E = await hydrated();
  E.hold = true;
  await E.paste(EMAIL_E);
  E.run(`_calSel = '2026-09-27'; setDayStatus('off');`); await flush();
  await E.advance(21000);
  check('G6#1 entorno: dos escrituras sin confirmar y aviso', E.run('_cloudWrites') === 2 && /Sin confirmar/.test(E.sync()), `${E.run('_cloudWrites')} ${E.sync()}`);
  await E.releaseOne();
  check('G6#1 confirma una: el indicador NO dice «Sincronizado ✓»', !/Sincronizado/.test(E.sync()) && E.run('_cloudWrites') === 1, E.sync());
  await E.releaseOne();
  check('G6#1 confirman las dos: «Sincronizado ✓»', /Sincronizado ✓/.test(E.sync()) && E.run('_cloudWrites') === 0, E.sync());
  // Escritura que confirma mientras se relee la nube (stale): el indicador sigue en «Comprobando…»
  E.hold = true; await E.paste(EMAIL);
  E.serverMode = 'hold'; E.jump(70000); await E.dispatch('visibilitychange');
  await E.releaseOne();
  check('G6#1 confirma con stale: sigue «Comprobando…»', /Comprobando/.test(E.sync()), E.sync());
  await E.serverRelease();
}
{
  // #2: pestaña oculta pero despierta (escritorio): no relee la nube cada minuto
  const E = await hydrated();
  E.setVisible(false);
  await E.advance(5 * 60000);
  check('G6#2 oculta 5 min con la app despierta: 0 lecturas', E.serverCalls === 0, `calls=${E.serverCalls}`);
  E.setVisible(true); await E.dispatch('visibilitychange');
  check('G6#2 al volver tras estar despierta: tampoco relee', E.serverCalls === 0, `calls=${E.serverCalls}`);
}
{
  // #3: un confirm() abierto > 60 s a mitad de un mutador no deja la memoria cambiada sin guardar
  const E = await hydrated();
  await E.paste(EMAIL_E);
  check('G6#3 entorno: día E en la nube', !!E.cloudDoc().history[E_ISO]);
  E.confirmImpl = () => { E.jump(70000); return true; };
  E.statuses.length = 0;
  E.run(`removeDay('${E_ISO}')`); await flush();
  E.confirmImpl = null;
  check('G6#3 el borrado se guarda (memoria y nube coinciden)', !has(E, '_cache', E_ISO) && !E.cloudDoc().history[E_ISO], `mem=${has(E, '_cache', E_ISO)} nube=${!!E.cloudDoc().history[E_ISO]}`);
  check('G6#3 sin STALE_MSG engañoso', !E.statuses.some(s => s.includes('Comprobando que no haya')), E.statuses.join(' | '));
}

// ══ 11-02 AC-1/AC-2: epoch de sesión — una escritura de la sesión anterior no bloquea la nueva ══
{
  // Otra cuenta: logout con una escritura sin confirmar → login → la nueva sesión aplica snapshots
  const E = await hydrated();
  E.hold = true;
  await E.paste(EMAIL_E);
  check('EP entorno: 1 escritura en vuelo', E.run('_cloudWrites') === 1 && E.run('_writesInFlight') === 1);
  let msg = '';
  E.confirmImpl = m => { msg = String(m); return true; };
  await E.run(`document.getElementById('btn-logout').onclick()`); await flush();
  E.confirmImpl = null;
  check('EP AC-2 el confirm de «Salir» avisa de cambios sin confirmar', /aún no ha confirmado/.test(msg), msg);
  E.authCb(null); await flush();
  check('EP logout: _cloudWrites 0, _writesInFlight sigue en 1', E.run('_cloudWrites') === 0 && E.run('_writesInFlight') === 1);
  check('EP logout: la auto-actualización sigue bloqueada', E.J('updateBlockers()').includes('guardando en la nube'));
  E.authCb({ uid: 'u2', displayName: 'Otro', photoURL: '' }); await flush();
  const other = { history: { [D]: { addedAt: 'X', role: 'FO', flights: [] } }, excelData: {}, airports: {}, ukdays: {}, runways: {}, dayMap: {}, settings: { pilotCode: 'FOXRAY' } };
  E.fire({ data: other }); await flush();
  check('EP sesión nueva: el snapshot del servidor se aplica (no se descarta)', has(E, '_cache', D) && !has(E, '_cache', E_ISO) && E.run('cloud.skipped') === false);
  E.statuses.length = 0;
  await E.release(false); await E.advance(100);
  check('EP la vieja rechaza: sin aviso de error en la sesión nueva', !E.statuses.some(s => s.startsWith('err:')), E.statuses.join(' | '));
  check('EP la vieja rechaza: contadores 0/0 e indicador sin «Error»', E.run('_cloudWrites') === 0 && E.run('_writesInFlight') === 0 && !/Error/.test(E.sync()), `${E.run('_cloudWrites')}/${E.run('_writesInFlight')} ${E.sync()}`);
  check('EP la auto-actualización ya no está bloqueada por escrituras', !E.J('updateBlockers()').includes('guardando en la nube'));
  // D2 sigue funcionando en la sesión nueva
  E.hold = true;
  await E.paste(EMAIL_E);
  E.fire({ data: other }); await flush();
  check('EP D2 en la sesión nueva: snapshot sin pending descartado', has(E, '_cache', E_ISO) && E.run('cloud.skipped') === true);
  E.hold = false; await E.release(); await E.advance(100);
  check('EP D2: al confirmar, 0 en vuelo', E.run('_cloudWrites') === 0 && E.run('_writesInFlight') === 0);
}
{
  // Misma cuenta: la vieja resuelve en la sesión nueva sin «Sincronizado ✓» espurio ni contador negativo
  const E = await hydrated();
  E.hold = true;
  await E.paste(EMAIL_E);
  E.authCb(null); await flush();
  E.authCb({ uid: 'u1', displayName: 'Test', photoURL: '' }); await flush();
  // El SDK superpone la escritura vieja aún en cola: el snapshot llega con hasPendingWrites
  const withOld = clone(E.cloudDoc()); withOld.history = { ...withOld.history, [E_ISO]: { addedAt: 'X', role: 'FO', flights: [] } };
  E.fire({ pending: true, data: withOld }); await flush();
  check('EP misma cuenta: snapshot con hasPendingWrites aplicado (día de la escritura vieja presente)', has(E, '_cache', E_ISO));
  E.run(`setSync('', 'X')`);
  await E.release(); await E.advance(100);
  check('EP misma cuenta: la vieja resuelve → contadores 0, sin negativo', E.run('_cloudWrites') === 0 && E.run('_writesInFlight') === 0);
  check('EP misma cuenta: la vieja no pone «Sincronizado ✓» en la sesión nueva', E.sync() === 'X', E.sync());
  // watchWrite de la vieja no avisa en la nueva
  const F = await hydrated();
  F.hold = true;
  await F.paste(EMAIL_E);
  F.authCb(null); await flush();
  F.authCb({ uid: 'u1', displayName: 'Test', photoURL: '' }); await flush();
  F.fire(); await flush();
  F.statuses.length = 0;
  await F.advance(25000);
  check('EP watchWrite: la escritura vieja no avisa «No recargues» en la sesión nueva', !F.statuses.some(s => s.includes('No recargues')), F.statuses.join(' | '));
  await F.release();
}
{
  // switchMode con escritura pendiente → el confirm lo avisa; cancelar no cambia nada
  const E = await hydrated();
  E.hold = true;
  await E.paste(EMAIL_E);
  let msg = '';
  E.confirmImpl = m => { msg = String(m); return false; };
  E.run('switchMode()'); await flush();
  E.confirmImpl = null;
  check('EP AC-2 switchMode avisa de cambios sin confirmar', /aún no ha confirmado/.test(msg), msg);
  check('EP AC-2 cancelar no cambia nada', E.run('getMode()') === 'cloud' && E.run('_cloudWrites') === 1);
  await E.release();
}
{
  // Sin escrituras en vuelo el confirm no lleva la línea
  const E = await hydrated();
  let msg = '';
  E.confirmImpl = m => { msg = String(m); return false; };
  E.run('switchMode()'); await flush();
  check('EP sin escrituras en vuelo: confirm sin la línea extra', msg && !/aún no ha confirmado/.test(msg), msg);
}

// ══ Modo Local: ni revalidación ni vigilante ══
{
  const E = await makeEnv({ mode: 'local' });
  E.run('applyLocalMode()'); await flush();
  E.jump(70000); await E.dispatch('visibilitychange'); await E.advance(30000);
  check('Local: no hay lecturas del servidor', E.serverCalls === 0);
  await E.paste(EMAIL_E);
  check('Local: guardar funciona (localStorage)', /2026-09-24/.test(E.ls.get('easylog_history_v1') || ''));
  check('Local: sin avisos de nube', !E.statuses.some(s => /nube|Comprobando/.test(s)), E.statuses.join(' | '));
}

console.log(`\n${checks} checks`);
console.log(fails ? `${fails} FALLO(S)` : 'TODO OK');
process.exit(fails ? 1 : 0);
