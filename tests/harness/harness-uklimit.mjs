// Test 07-02 — límite de UK Days por año fiscal, días excepcionales (no computan, tope 60), «máximo posible», textos.
// Ejecuta el <script> real de index.html en node:vm con Firebase falso; prompt/confirm controlables por caso.
// Uso: node harness-uklimit.mjs [ruta/index.html]
import fs from 'node:fs';
import vm from 'node:vm';
import { INDEX_PATH, FIXED_NOW } from '../lib.mjs';

const INDEX = process.argv[2] || INDEX_PATH;
const html = fs.readFileSync(INDEX, 'utf8');
const SCRIPT = html.match(/<script>\n([\s\S]*?)<\/script>\s*<\/body>/)[1]
  .replace(/await import\('https:\/\/www\.gstatic\.com\/firebasejs\/[^']+\/(firebase-[a-z]+)\.js'\)/g, "await __fakeImport('$1')");
const clone = o => JSON.parse(JSON.stringify(o));
const tick = async () => { for (let i = 0; i < 20; i++) await new Promise(r => setImmediate(r)); };

let fails = 0, checks = 0;
const check = (name, ok, detail = '') => { checks++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); if (!ok) fails++; };

async function makeEnv({ mode = 'local', lsInit = {}, cloudInit = {} } = {}) {
  const env = { writes: [], statuses: [], alerts: [], prompts: [], confirms: [], snapCb: null, promptImpl: null, confirmImpl: null, authCb: null };
  let cloudDoc = { history: {}, excelData: {}, airports: {}, ukdays: {}, runways: {}, dayMap: {}, ...clone(cloudInit) };
  const setDoc = (_ref, data, opts) => {
    env.writes.push({ data: clone(data), opts: clone(opts || {}) });
    for (const f of (opts?.mergeFields || [])) cloudDoc[f] = clone(data[f]);
    return Promise.resolve();
  };
  const fakeMods = {
    'firebase-app': { initializeApp: () => ({}) },
    'firebase-auth': {
      getAuth: () => ({}), setPersistence: async () => {}, browserLocalPersistence: {},
      onAuthStateChanged: (_a, cb) => { env.authCb = cb; setTimeout(() => cb({ uid: 'u1', displayName: 'T', photoURL: '' }), 0); },
      signInWithPopup: async () => {}, signOut: async () => {}, GoogleAuthProvider: function () {},
    },
    'firebase-firestore': { getFirestore: () => ({}), doc: () => ({}), setDoc,
      getDocFromServer: async () => ({ exists: () => true, data: () => clone(cloudDoc) }),
      onSnapshot: (_r, cb) => { env.snapCb = cb; return () => {}; } },
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
  const loc = { href: '' };
  env.ls = ls; env.byId = byId; env.loc = loc;
  const ctx = vm.createContext({
    document: { getElementById: byId, querySelector: s => (s.includes('role') ? role : makeEl()), querySelectorAll: () => [], body: makeEl(), createElement: () => makeEl(), addEventListener() {} },
    localStorage: { getItem: k => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => ls.set(k, String(v)), removeItem: k => ls.delete(k) },
    window: { _ukNowOverride: FIXED_NOW, location: loc }, navigator: {}, location: loc, console, Date, Math, JSON, Promise, Intl,
    confirm: m => { env.confirms.push(String(m)); return env.confirmImpl ? env.confirmImpl(m) : true; },
    prompt: (m, d) => { env.prompts.push(String(m)); return env.promptImpl ? env.promptImpl(m, d) : null; },
    alert: m => env.alerts.push(String(m)),
    setTimeout: (fn, ms) => (ms === 0 ? Promise.resolve().then(fn) : 0), clearTimeout() {}, setInterval: () => 0,
    __fakeImport: async name => fakeMods[name], __statuses: env.statuses,
  });
  vm.runInContext(SCRIPT, ctx, { filename: 'index.html<script>' });
  vm.runInContext('{ const __orig = showStatus; showStatus = (t, m) => { __statuses.push(t + ": " + m); __orig(t, m); }; }', ctx);
  env.run = c => vm.runInContext(c, ctx);
  env.J = c => JSON.parse(JSON.stringify(vm.runInContext(c, ctx) ?? null));
  env.cloudDoc = () => cloudDoc;
  env.fire = () => env.snapCb({ exists: () => true, data: () => clone(cloudDoc), metadata: { fromCache: false, hasPendingWrites: false } });
  env.count = () => byId('ukdays-count').textContent;
  env.body = () => byId('ukdays-body').innerHTML;
  env.render = () => env.run('renderUKDays()');
  if (mode === 'cloud') for (let i = 0; i < 50 && !env.snapCb; i++) await tick();
  await tick();
  return env;
}

// Calendario del año 2026-27 hasta ayer (FIXED_NOW = 05/10/2026 → ayer 04/10): `uk` días STBY (UK por calendario),
// luego `pend` días sin datos (pendientes) y el resto OFF (no UK)
const TY = '2026-27', START = '2026-04-06', YESTERDAY = '2026-10-04';
function dayList(from = START, to = YESTERDAY) {
  const out = []; for (let t = Date.parse(from + 'T00:00:00Z'); t <= Date.parse(to + 'T00:00:00Z'); t += 86400000) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}
const DAYS = dayList();
function calendar(uk, pend = 0) {
  const cal = {};
  DAYS.forEach((iso, i) => { if (i < uk) cal[iso] = 'stby'; else if (i >= uk + pend) cal[iso] = 'off'; });
  return cal;
}
const seed = (E, uk, pend = 0) => { E.run(`_dayMap = ${JSON.stringify(calendar(uk, pend))}; renderUKDays();`); };

// ══ AC-1: límite por año, editable, no fijo en el código ══
{
  check('AC-1 sin «MAX = 91» ni «/ 91» en index.html', !/MAX = 91|\/ 91/.test(html));
  const E = await makeEnv();
  seed(E, 10);
  check('AC-1 por defecto: cabecera «10 / 90»', E.count().startsWith('10 / 90'), E.count());
  check('AC-1 por defecto: la barra dice «(por defecto)»', /de 90 días.*\(por defecto\)/s.test(E.body()), '');
  E.promptImpl = () => '85';
  E.run('editUKLimit()');
  check('AC-1 editar 85 → cabecera «10 / 85»', E.count().startsWith('10 / 85'), E.count());
  check('AC-1 guardado en _settings.ukLimit[año] y en localStorage', E.J('_settings.ukLimit')?.[TY] === 85 && /"2026-27":85/.test(E.ls.get('easylog_settings_v1') || ''), E.ls.get('easylog_settings_v1'));
  check('AC-1 sin «(por defecto)» una vez configurado', !/\(por defecto\)/.test(E.body()));
  check('AC-1 otro año sigue con el valor por defecto', E.run(`ukLimitFor('2027-28')`) === 90);
  for (const v of [null, '', '0', '400', 'abc', '12.5']) {
    E.alerts.length = 0; E.statuses.length = 0;
    E.promptImpl = () => v;
    E.run('editUKLimit()');
    const warned = E.alerts.length + E.statuses.filter(s => s.startsWith('warn') || s.startsWith('err')).length > 0;
    check(`AC-1 «${v}» no cambia el límite${v ? ' y avisa' : ''}`, E.J('_settings.ukLimit')?.[TY] === 85 && (v ? warned : true), `${E.J('_settings.ukLimit')?.[TY]} warned=${warned}`);
  }
}
{
  // Nube sin hidratar: el mutador no toca nada ni pregunta
  const E = await makeEnv({ mode: 'cloud' });
  E.promptImpl = () => '70';
  E.run('editUKLimit()');
  check('AC-1 nube sin hidratar: no pregunta ni guarda', E.prompts.length === 0 && !E.J('_settings')?.ukLimit && E.writes.length === 0, `prompts=${E.prompts.length}`);
  check('AC-1 nube sin hidratar: cabecera «… / …»', E.count().startsWith('… / …'), E.count());
}

// ══ AC-3: estados de alarma, máximo posible, sin «bonus» ══
{
  check('AC-3 «bonus» no aparece en index.html', !/bonus/i.test(html));
  const E = await makeEnv();
  const state = (uk, pend = 0) => { seed(E, uk, pend); return E.body(); };
  check('AC-3 comp=90 → «En el límite»', /En el límite/.test(state(90)));
  check('AC-3 comp=91 → «Por encima del límite: 91 de 90»', /Por encima del límite: 91 de 90/.test(state(91)));
  check('AC-3 comp=70 → «20 días de margen» (⚠️)', /⚠️ 20 días de margen/.test(state(70)));
  check('AC-3 comp=50 → «40 días de margen» (✅)', /✅ 40 días de margen/.test(state(50)));
  check('AC-3 comp=85 → «Solo 5 días de margen»', /Solo 5 días de margen/.test(state(85)));
  const b = state(88, 5);
  check('AC-3 5 pendientes y comp=88 → «Máximo posible … 93 de 90»', /Máximo posible[^<]*93 de 90/.test(b), (b.match(/Máximo posible[^<]*/) || [''])[0]);
  check('AC-3 sin pendientes no hay línea de máximo posible', !/Máximo posible/.test(state(88, 0)));
}

// ══ AC-4: persistencia y sync ══
{
  const E = await makeEnv({ mode: 'cloud', cloudInit: { dayMap: calendar(10) } });
  E.fire(); await tick();
  check('AC-4 doc sin settings: «10 / 90» y «(por defecto)»', E.count().startsWith('10 / 90') && /\(por defecto\)/.test(E.body()), E.count());
  E.promptImpl = () => '80';
  E.run('editUKLimit()'); await tick();
  const w = E.writes.at(-1);
  check('AC-4 escritura con settings en payload y mergeFields', !!w && w.data.settings?.ukLimit?.[TY] === 80 && (w.opts.mergeFields || []).includes('settings'), JSON.stringify(w?.opts));
  E.fire(); await tick();
  check('AC-4 tras el snapshot el límite se conserva (80)', E.count().startsWith('10 / 80'), E.count());
  E.authCb(null); await tick();
  check('AC-4 cerrar sesión deja _settings vacío', JSON.stringify(E.J('_settings')) === '{}', JSON.stringify(E.J('_settings')));
}
{
  const E = await makeEnv({ lsInit: { easylog_settings_v1: '{roto' } });
  // hydrateLocal avisa al arrancar (antes de registrar los avisos): se lee de la línea de estado
  check('AC-4 local: settings dañado → el aviso nombra «la configuración»', /la configuración/.test(E.byId('status').textContent), E.byId('status').textContent);
  E.promptImpl = () => '80';
  E.run('editUKLimit()');
  check('AC-4 local: la clave dañada no se sobrescribe', E.ls.get('easylog_settings_v1') === '{roto');
}

// ══ G6 (revisión Fable del código) ══
const EXC0 = '2026-04-10';
{
  // #1: una marca sin «at» (otra versión) no produce undefined en el payload (Firestore lo rechazaría)
  const E = await makeEnv({ mode: 'cloud', cloudInit: { dayMap: calendar(10), settings: { ukExceptional: { '2026-04-06': { reason: 'viejo' } } } } });
  E.fire(); await tick();
  E.run(`toggleUKExceptional('${EXC0}')`); E.byId('ukexc-reason').value = 'Motivo'; E.run('confirmUKExcModal()'); await tick();
  const w = E.writes.at(-1);
  const hasUndef = JSON.stringify(w?.data, (k, v) => (v === undefined ? '__UNDEF__' : v)).includes('__UNDEF__') || E.run(`Object.values(_settings.ukExceptional).some(x => Object.values(x).includes(undefined))`);
  check('G6#1 marca sin «at» → sin undefined en lo que se envía', !!w && !hasUndef, JSON.stringify(w?.data.settings));
}
{
  // #2: marcar o quitar un día no borra campos extra ni entradas de otras versiones
  const E = await makeEnv();
  seed(E, 10);
  E.run(`_settings = { ukExceptional: { '2026-04-06': { reason: 'a', at: 'x', docs: 'carta.pdf' }, '2026-04-07': { at: 'sin motivo' } } }; renderUKDays();`);
  E.run(`toggleUKExceptional('${EXC0}')`); E.byId('ukexc-reason').value = 'b'; E.run('confirmUKExcModal()');
  check('G6#2 marcar otro día conserva campos extra y entradas ajenas', E.J(`_settings.ukExceptional['2026-04-06'].docs`) === 'carta.pdf' && !!E.J(`_settings.ukExceptional['2026-04-07']`), JSON.stringify(E.J('_settings.ukExceptional')));
  E.confirmImpl = () => true;
  E.run(`toggleUKExceptional('${EXC0}')`);
  check('G6#2 quitar una marca conserva las demás', !E.J(`_settings.ukExceptional['${EXC0}']`) && E.J(`_settings.ukExceptional['2026-04-06'].docs`) === 'carta.pdf');
}
{
  // #3: una clave local que no es un objeto (null) se trata como dañada y no rompe editUKLimit
  const E = await makeEnv({ lsInit: { easylog_settings_v1: 'null' } });
  E.promptImpl = () => '80';
  let threw = false; try { E.run('editUKLimit()'); } catch { threw = true; }
  check('G6#3 settings «null» en local: sin excepción y no se sobrescribe', !threw && E.ls.get('easylog_settings_v1') === 'null' && /la configuración/.test(E.byId('status').textContent), E.byId('status').textContent);
}

{
  // G8: settings que no es un objeto en la nube → se ignora (no se «esparce» en el siguiente guardado)
  const E = await makeEnv({ mode: 'cloud', cloudInit: { dayMap: calendar(10), settings: 'abc' } });
  E.fire(); await tick();
  E.promptImpl = () => '80';
  E.run('editUKLimit()'); await tick();
  const w = E.writes.at(-1);
  check('G8 settings no-objeto en la nube: se guarda limpio', !!w && JSON.stringify(w.data.settings) === JSON.stringify({ ukLimit: { [TY]: 80 } }), JSON.stringify(w?.data.settings));
  E.run(`ukShowTY('<x>')`);
  check('G8 ukShowTY con etiqueta no válida no cambia el año', E.run('_tyViewLabel') === null);
}

// ══ AC-2: días excepcionales ══
const EXC = '2026-04-10';
const markExc = (E, iso, reason) => { E.run(`toggleUKExceptional('${iso}')`); E.byId('ukexc-reason').value = reason; E.run('confirmUKExcModal()'); };
{
  const E = await makeEnv();
  seed(E, 10);
  markExc(E, EXC, 'Hospital urgencias');
  markExc(E, '2026-04-11', 'Hospital urgencias (2)');
  check('AC-2 2 excepcionales: cabecera «8 / 90»', E.count().startsWith('8 / 90'), E.count());
  check('AC-2 barra «10 UK · 2 excepcionales (no computan)»', /10 UK · 2 excepcionales \(no computan\)/.test(E.body()));
  check('AC-2 la marca guarda el motivo', E.J(`_settings.ukExceptional['${EXC}'].reason`) === 'Hospital urgencias');
  check('AC-2 la lista muestra «excepcional · motivo»', /excepcional · Hospital urgencias/.test(E.body()));
  // Motivo vacío → no marca
  E.alerts.length = 0;
  markExc(E, '2026-04-12', '   ');
  check('AC-2 motivo vacío: no marca y avisa', !E.J(`_settings.ukExceptional['2026-04-12']`) && E.alerts.length > 0, E.alerts.join(' | '));
  // Desmarcar pide confirmación
  E.confirms.length = 0; E.confirmImpl = () => false;
  E.run(`toggleUKExceptional('2026-04-11')`);
  check('AC-2 desmarcar cancelado: sigue marcado', !!E.J(`_settings.ukExceptional['2026-04-11']`) && E.confirms.length === 1);
  E.confirmImpl = () => true;
  E.run(`toggleUKExceptional('2026-04-11')`);
  check('AC-2 desmarcar aceptado: «9 / 90»', !E.J(`_settings.ukExceptional['2026-04-11']`) && E.count().startsWith('9 / 90'), E.count());
  check('AC-2 el día marcado era de calendario (cal:stby)', E.run(`ukDayStatus('${EXC}').source`) === 'cal:stby');
  // Marca huérfana: el día deja de ser UK → no resta
  E.run(`_dayMap['${EXC}'] = 'off'; renderUKDays();`);
  check('AC-2 marca sobre día que ya no es UK no resta («9 / 90»)', E.count().startsWith('9 / 90'), E.count());
  // Huérfana visible en la lista No UK (entrada manual No UK con marca)
  E.run(`_ukdays['2026-04-13'] = { state: 'no', route: '—', onBlock: '--:--', tz: 'BST', manual: true, source: 'manual', reason: 'dormí fuera' };
         _settings.ukExceptional['2026-04-13'] = { reason: 'x', at: 'y' }; renderUKDays();`);
  check('AC-2 la lista No UK muestra «(marca exc. conservada)»', /\(marca exc\. conservada\)/.test(E.body()));
  // XSS
  markExc(E, '2026-04-14', '<img src=x onerror=alert(1)>');
  check('AC-2 motivo escapado en la lista', E.body().includes('&lt;img') && !E.body().includes('<img'), '');
  // Backup por email
  E.run('emailUKDaysBackup()');
  const mail = decodeURIComponent(E.loc.href);
  check('AC-2 backup: «[exc] motivo» y línea de computables', mail.includes('[exc] <img src=x onerror=alert(1)>') && /Computables: \d+ \(\d+ UK − \d+ excepcionales\) · límite 90/.test(mail), (mail.match(/Computables:[^\n]*/) || [''])[0]);
}
{
  // Tope de 60
  const E = await makeEnv();
  seed(E, 100);
  E.run(`_settings = { ukExceptional: Object.fromEntries(${JSON.stringify(DAYS.slice(0, 70))}.map(d => [d, { reason: 'r', at: 'a' }])) }; renderUKDays();`);
  check('AC-2 70 excepcionales: solo 60 descuentan («40 / 90»)', E.count().startsWith('40 / 90'), E.count());
  check('AC-2 70 excepcionales: aviso del tope de 60', /solo 60/i.test(E.body()));
}
{
  // Año congelado: marcar pide confirmación
  const E = await makeEnv();
  seed(E, 10);
  E.run(`window._ukNowOverride = '2027-06-15T12:00:00+01:00'; _tyViewLabel = '2026-27';`);
  E.confirms.length = 0; E.confirmImpl = () => false;
  E.run(`toggleUKExceptional('${EXC}')`);
  check('AC-2 año congelado: marcar pide confirmación y cancelar no abre nada', E.confirms.length === 1 && !E.J(`_settings.ukExceptional?.['${EXC}']`), E.confirms.join(' | '));
}
{
  // Nube sin hidratar: marcar no hace nada
  const E = await makeEnv({ mode: 'cloud' });
  E.run(`toggleUKExceptional('${EXC}')`);
  check('AC-2 nube sin hidratar: no marca y avisa', !E.J('_settings')?.ukExceptional && E.alerts.length > 0, E.alerts.join(' | '));
}

console.log(`\n${checks} checks`);
console.log(fails ? `${fails} FALLO(S)` : 'TODO OK');
process.exit(fails ? 1 : 0);
