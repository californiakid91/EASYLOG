// Pruebas del plan 04-02: pista en uso — motor de sugerencia, viento IEM (fetch simulado), confirmación, persistencia (local + nube) y CSV
// (sobre el <script> real de index.html en node:vm; la versión anterior sale de `git show HEAD:index.html` para el golden y el «cliente viejo»)
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { fileURLToPath } from 'node:url'; import { execFileSync } from 'node:child_process';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const extract = html => html.match(/<script>\n([\s\S]*?)<\/script>\s*<\/body>/)[1];
const NEW_SRC = extract(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'));
const OLD_SRC = extract(execFileSync('git', ['-C', ROOT, 'show', 'HEAD:index.html']).toString());
let fails = 0;
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); if (!ok) fails++; };
const clone = o => JSON.parse(JSON.stringify(o));

// ── Entorno: DOM falso con classList real, fetch simulado, Firebase falso opcional
function load(src, { mode = 'local', fetchImpl, cloudDoc } = {}) {
  const env = { st: [], prompts: [], fetches: [], writes: [], snapCb: null, cloudDoc: cloudDoc || {} };
  const mkEl = () => { const cls = new Set(); const t = { value: '', dataset: {}, style: {}, innerHTML: '', textContent: '', src: '' };
    return new Proxy(t, { get: (o, k) => k in o ? o[k] : k === 'classList' ? { add: c => cls.add(c), remove: c => cls.delete(c), toggle: c => cls.has(c) ? cls.delete(c) : cls.add(c), contains: c => cls.has(c) }
      : k === 'querySelectorAll' ? () => [] : (k === 'closest' || k === 'querySelector') ? () => null : typeof k === 'symbol' ? undefined : () => mkEl(), set: (o, k, v) => (o[k] = v, true) }); };
  const els = new Map(); const byId = id => (els.has(id) || els.set(id, mkEl()), els.get(id));
  const ls = new Map([['easylog_mode', mode]]);
  const fakeMods = {
    'firebase-app': { initializeApp: () => ({}) },
    'firebase-auth': { getAuth: () => ({}), setPersistence: async () => {}, browserLocalPersistence: {},
      onAuthStateChanged: (_a, cb) => { Promise.resolve().then(() => cb({ uid: 'u1', displayName: 'T', photoURL: '' })); },
      signInWithPopup: async () => {}, signOut: async () => {}, GoogleAuthProvider: function () {} },
    'firebase-firestore': { getFirestore: () => ({}), doc: () => ({}),
      setDoc: (_r, data, opts) => { env.writes.push({ data: clone(data), opts: clone(opts || {}) });
        for (const f of opts?.mergeFields || []) { if (data[f] === undefined) throw new Error('undefined en ' + f); env.cloudDoc[f] = clone(data[f]); } return Promise.resolve(); },
      onSnapshot: (_r, cb) => { env.snapCb = cb; return () => {}; } },
  };
  let script = src.replace(/await import\('https:\/\/www\.gstatic\.com\/firebasejs\/[^']+\/(firebase-[a-z]+)\.js'\)/g, "await __fakeImport('$1')");
  const ctx = vm.createContext({
    document: { getElementById: byId, querySelector: s => s === 'input[name="role"]:checked' ? { value: 'FO' } : mkEl(), querySelectorAll: () => [], body: mkEl(), createElement: () => mkEl(), addEventListener() {} },
    localStorage: { getItem: k => ls.get(k) ?? null, setItem: (k, v) => ls.set(k, String(v)), removeItem: k => ls.delete(k) },
    window: { location: {} }, navigator: {}, location: {}, console, Date, Math, JSON, Promise, Intl, URLSearchParams, AbortController,
    Blob: class { constructor(p) { this.p = p; } }, URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
    confirm: () => true, prompt: m => (env.prompts.push(m), null), alert() {},
    setTimeout: (fn, ms) => (ms === 0 ? Promise.resolve().then(fn) : 0), clearTimeout() {}, setInterval: () => 0,
    fetch: (url, opts) => { env.fetches.push(String(url)); return fetchImpl ? fetchImpl(String(url), opts) : Promise.reject(new Error('sin red')); },
    __fakeImport: async n => fakeMods[n], __st: env.st,
  });
  vm.runInContext(script, ctx);
  vm.runInContext('showStatus = (t, m) => __st.push(t + ": " + m);', ctx);
  env.run = c => vm.runInContext(c, ctx);
  env.J = c => JSON.parse(env.run(`JSON.stringify(${c})`));
  env.ls = ls; env.byId = byId;
  env.fire = () => env.snapCb({ exists: () => true, data: () => clone(env.cloudDoc), metadata: { fromCache: false } });
  return env;
}
const tick = async (n = 20) => { for (let i = 0; i < n; i++) await new Promise(r => setImmediate(r)); };

// Email sintético (patrón de harness-duplicados)
const email = (date, secs) => date + '\n\n' + secs.map((s, i) => [
  `FlightNumber : ${s.fn ?? 'FR' + (100 + i)}`, 'Registration : EIABC', `City Pair : ${s.cp}`, `STD : ${s.std ?? s.off}`, `STA : ${s.on}`,
  `Airborne : ${s.air ?? s.off}`, `Landed : ${s.ldg ?? s.on}`, `Off Block : ${s.off}`, `On Block : ${s.on}`, 'Total Block : 02:00',
  '', 'Pilot Flying :', 'Take Off : VEGRIC', 'Landing : VEGRIC', ''].join('\n')).join('\n\n') +
  '\nFlight Deck Crew :\nABC123 : CP : JOHN SMITH\nVEGRIC : FO : RICARDO VEGA\n';
// CSV de IEM a partir de [ 'YYYY-MM-DD HH:MM', drct, sknt ]
const iem = (station, rows, cols = ['station', 'valid', 'drct', 'sknt']) => [cols.join(','), ...rows.map(([t, d, k]) => {
  const v = { station, valid: t, drct: d ?? '', sknt: k ?? '' }; return cols.map(c => v[c]).join(','); })].join('\n');
const okResp = text => Promise.resolve({ ok: true, text: () => Promise.resolve(text) });

// ══ AC-1: motor puro (casos del backtest real 18-20/10/2025)
{
  const E = load(NEW_SRC);
  const S = (ap, wind, pref) => E.J(`suggestRunway(airportInfo('${ap}'), ${JSON.stringify(wind)}, ${JSON.stringify(pref)})`);
  const is = (r, level, pick) => r.level === level && r.pick === pick;
  check('EGSS 13010KT (cruzado) + preferente 22 → 22', is(S('STN', { drct: 130, sknt: 10 }, '22'), 'high', '22'));
  check('LEAL 00000KT + preferente 10 → 10', is(S('ALC', { drct: 0, sknt: 0 }, '10'), 'high', '10'));
  check('LEAL VRB02 (sin dirección) + preferente 10 → 10', is(S('ALC', { drct: null, sknt: 2 }, '10'), 'high', '10'));
  check('LEAL calma sin preferente → low sin preselección', is(S('ALC', { drct: 0, sknt: 0 }, null), 'low', null));
  check('EICK 19011KT → 16', is(S('ORK', { drct: 190, sknt: 11 }, null), 'high', '16'));
  check('LBSF 09010KT → 09', is(S('SOF', { drct: 90, sknt: 10 }, null), 'high', '09'));
  check('LBSF 08003KT sin preferente → low', is(S('SOF', { drct: 80, sknt: 3 }, null), 'low', null));
  check('EGSS 23012KT → 22', is(S('STN', { drct: 230, sknt: 12 }, '22'), 'high', '22'));
  check('cara fuerte manda sobre la preferente (EGSS 04015KT → 04)', is(S('STN', { drct: 40, sknt: 15 }, '22'), 'high', '04'));
  check('preferente con cola ≤ 5 kt se mantiene (EGSS 04004KT → 22)', is(S('STN', { drct: 40, sknt: 4 }, '22'), 'high', '22'));
  check('EPWR 13008KT sin preferente → 11 (fallo conocido del backtest; lo corrige el piloto)', is(S('WRO', { drct: 130, sknt: 8 }, null), 'high', '11'));
  check('paralelas DUB 28L/28R sin preferente → low', is(S('DUB', { drct: 280, sknt: 15 }, null), 'low', null));
  check('paralelas DUB con preferente 28L → 28L', is(S('DUB', { drct: 280, sknt: 15 }, '28L'), 'high', '28L'));
  check('sin METAR + preferente → preferente; sin preferente → low', is(S('STN', null, '22'), 'high', '22') && is(S('ALC', null, null), 'low', null));
  const none = E.J(`suggestRunway(null, { drct: 90, sknt: 10 }, null)`);
  check('aeropuerto desconocido → low con opciones vacías', none.level === 'low' && none.options.length === 0);
  check('opciones = todas las cabeceras', S('DUB', { drct: 280, sknt: 15 }, null).options.length === 6);
}

// ══ AC-2: viento a la hora correcta (IEM simulado)
{
  const E = load(NEW_SRC);
  const obs = c => E.J(`parseIEM(${JSON.stringify(c)})`);
  const p = obs(iem('EGSS', [['2026-10-06 05:20', 220, 8], ['2026-10-06 05:50', 230, 12]], ['station', 'valid', 'sknt', 'drct']));
  check('parseIEM lee por nombre de cabecera (sknt antes que drct)', p.length === 2 && p[1].drct === 230 && p[1].sknt === 12, JSON.stringify(p));
  check('respuesta HTML / ERROR → null', obs('<html>error</html>') === null && obs('ERROR: bad station') === null);
  check('filas sin velocidad se descartan; VRB (drct vacío) se conserva', (() => { const q = obs(iem('X', [['2026-10-06 05:20', '', 3], ['2026-10-06 05:50', 200, '']])); return q.length === 1 && q[0].drct === null; })());
  const W = (when) => E.J(`windAt(parseIEM(${JSON.stringify(iem('EGSS', [['2026-10-06 05:20', 220, 8], ['2026-10-06 05:50', 230, 12], ['2026-10-06 08:20', 40, 9]]))}), new Date('${when}'))`);
  check('elige el METAR ≤ instante más reciente', W('2026-10-06T06:10:00Z')?.drct === 230);
  check('sin METAR anterior en 75 min → el más cercano dentro de ±75 min', W('2026-10-06T05:00:00Z')?.drct === 220);
  check('nada dentro de ±75 min → null', W('2026-10-06T12:00:00Z') === null);
}
{
  // getRunwaySuggestion: caché por icao|duty, post-medianoche, fallo de red sin caché
  let calls = 0;
  const E = load(NEW_SRC, { fetchImpl: url => { calls++; return okResp(iem('EGSS', [['2026-10-06 22:50', 40, 12], ['2026-10-07 01:20', 230, 14]])); } });
  E.run(`window._ukNowOverride = '2026-04-06T12:00:00Z'`);
  const f = E.J(`parseText(${JSON.stringify(email('2026/10/06', [{ cp: 'STN - DUB', off: '06:00', on: '07:10' }, { cp: 'DUB - STN', std: '23:30', off: '23:30', air: '23:40', ldg: '01:30', on: '01:40' }]))}).flights`);
  E.run(`__f = ${JSON.stringify(f)}; __offs = sectorDayOffsets(__f); __r = null;
    Promise.all([getRunwaySuggestion(__f[0], __offs[0], 'dep', '2026-10-06'), getRunwaySuggestion(__f[1], __offs[1], 'arr', '2026-10-06')]).then(v => { __r = v; });`);
  await tick();
  const r = E.J('__r');
  check('una sola llamada a IEM por aeropuerto y duty', calls === 1 && E.fetches[0].includes('station=EGSS') && E.fetches[0].includes('day1=5') && E.fetches[0].includes('day2=8'), `${calls} ${E.fetches[0]}`);
  check('llegada post-medianoche usa el METAR del día siguiente (01:20Z, 230°) → 22', r[1].wind?.drct === 230 && r[1].pick === '22', JSON.stringify(r[1]));
  check('METAR 22:50 del día no se usa a las 06:00 (fuera de ±75 min) → sin viento → preferente STN 22', r[0].wind === null && r[0].pick === '22' && r[0].metar === true, JSON.stringify(r[0]));
  const E2 = load(NEW_SRC);
  E2.run(`__r = null; getRunwaySuggestion(${JSON.stringify(f[0])}, 0, 'arr', '2026-10-06').then(v => { __r = v; })`);
  await tick();
  const r2 = E2.J('__r');
  check('red caída → sin METAR, low (DUB sin preferente)', r2.metar === false && r2.level === 'low', JSON.stringify(r2));
  E2.run(`getRunwaySuggestion(${JSON.stringify(f[0])}, 0, 'arr', '2026-10-06')`); await tick();
  check('un fallo no se queda en caché (se reintenta)', E2.fetches.length === 2, E2.fetches.length);
}

// ══ AC-3 / AC-4: confirmación, claves, preferente, persistencia local
{
  const E = load(NEW_SRC, { fetchImpl: url => okResp(url.includes('EGSS') ? iem('EGSS', [['2026-10-06 05:50', 230, 12], ['2026-10-06 08:50', 230, 12]]) : iem('EIDW', [['2026-10-06 06:50', 280, 15], ['2026-10-06 07:50', 280, 15]])) });
  E.run(`window._ukNowOverride = '2026-04-06T12:00:00Z'`);
  const paste = t => { E.byId('input').value = t; E.run('addDay()'); };
  const SECS = [{ cp: 'STN - DUB', off: '06:00', on: '07:10' }, { cp: 'DUB - STN', off: '08:00', on: '09:10' }];
  paste(email('2026/10/06', SECS));
  const keys = E.J(`rwyKeys(_cache['2026-10-06'].flights)`);
  check('clave = duty|vuelo|DEP-ARR', keys[0] === '2026-10-06|FR100|STN-DUB' && keys[1] === '2026-10-06|FR101|DUB-STN', JSON.stringify(keys));
  const dupKeys = E.J(`rwyKeys(parseText(${JSON.stringify(email('2026/10/06', [{ fn: 'FR100', cp: 'STN - DUB', off: '06:00', on: '07:10' }, { fn: 'FR100', cp: 'STN - DUB', off: '08:00', on: '09:10' }]))}).flights)`);
  check('mismo vuelo dos veces en el día → #2', dupKeys[1] === dupKeys[0] + '#2', JSON.stringify(dupKeys));
  check('botón 🛬 0/4 en la lista', E.byId('history').innerHTML.includes('🛬 0/4'));
  E.run(`openRwyModal('2026-10-06')`);
  check('al abrir: «buscando viento…»', E.byId('rwy-modal-body').innerHTML.includes('buscando viento'));
  await tick();
  const rows = () => E.J('_rwySel.rows.map(r => r.val)');
  // STN dep 06:00 230/12 → 22 high; DUB arr 07:10 → 28L/28R paralelas → low; DUB dep 08:00 → low; STN arr 09:10 → 22 high
  check('preselección: alta marcada, paralelas sin marcar', JSON.stringify(rows()) === JSON.stringify([{ dep: '22', arr: null }, { dep: null, arr: '22' }]), JSON.stringify(rows()));
  const body = E.byId('rwy-modal-body').innerHTML;
  check('etiquetas sugerida / elige y línea de viento', body.includes('t-sugerida') && body.includes('t-elige') && body.includes('viento 230°/12 kt'), '');
  check('botón Confirmar (2/4)', E.byId('rwy-confirm').textContent === 'Confirmar (2/4)', E.byId('rwy-confirm').textContent);
  E.run(`rwyPick({ dataset: { i: '0', k: 'arr', v: '28L' } })`);
  E.run(`rwyOther({ dataset: { i: '1', k: 'dep' }, value: '10r' })`);
  E.run(`rwyOther({ dataset: { i: '1', k: 'arr' }, value: '<img>' })`);
  check('«otra» inválida se rechaza con aviso y no cambia nada', E.st.at(-1).startsWith('warn') && E.J('_rwySel.rows[1].val.arr') === '22', E.st.at(-1));
  check('«otra» válida en minúsculas → 10R', E.J('_rwySel.rows[1].val.dep') === '10R');
  E.run(`rwyPick({ dataset: { i: '0', k: 'dep', v: '22' } })`);
  check('tocar la marcada la desmarca', E.J('_rwySel.rows[0].val.dep') === null);
  E.run(`rwyPick({ dataset: { i: '0', k: 'dep', v: '22' } })`);
  E.run(`rwyPick({ dataset: { i: '9', k: 'dep', v: '22' } }); rwyPick({ dataset: { i: '0', k: '__proto__', v: '22' } })`);
  check('índice o campo raros se ignoran', E.J('Object.keys(_rwySel.rows[0].val).sort().join()') === 'arr,dep');
  E.run('confirmRwyModal()');
  const saved = E.J('_runways');
  check('confirmar guarda las 4 con aeropuertos y sin undefined', saved[keys[0]]?.dep === '22' && saved[keys[0]]?.arr === '28L' && saved[keys[0]].depAp === 'STN' && saved[keys[0]].arrAp === 'DUB' && saved[keys[1]]?.dep === '10R' && saved[keys[1]]?.arr === '22', JSON.stringify(saved));
  check('persistido en localStorage', JSON.parse(E.ls.get('easylog_runways_v1'))[keys[1]].dep === '10R');
  check('lista: 🛬 ✓ y aviso «Pistas guardadas (4/4)»', E.byId('history').innerHTML.includes('🛬 ✓') && /Pistas guardadas \(4\/4\)/.test(E.st.at(-1)), E.st.at(-1));
  check('modal cerrado', E.byId('rwy-modal').classList.contains('hidden'));
  // Cancelar no guarda
  E.run(`openRwyModal('2026-10-06')`); await tick();
  check('al reabrir: confirmadas marcadas «confirmada»', E.byId('rwy-modal-body').innerHTML.includes('t-confirmada'));
  E.run(`rwyPick({ dataset: { i: '0', k: 'dep', v: '04' } }); closeRwyModal()`);
  check('Cancelar no guarda nada', E.J('_runways')[keys[0]].dep === '22');
  // Vaciar un campo → solo queda el otro; vaciar ambos → se borra la entrada
  E.run(`openRwyModal('2026-10-06')`); await tick();
  E.run(`rwyPick({ dataset: { i: '1', k: 'dep', v: '10R' } }); rwyOther({ dataset: { i: '1', k: 'arr' }, value: '' }); confirmRwyModal()`);
  check('desmarcar ambos campos borra la entrada', !(keys[1] in E.J('_runways')) && E.J('_runways')[keys[0]].dep === '22');
  // AC-4 preferente
  check('preferente semilla STN = 22; aeropuerto sin datos → null', E.J(`rwyPref('LTN')`) === null);
  E.run(`_runways = { a: { dep: '10', depAp: 'ALC', at: 1 }, b: { arr: '10', arrAp: 'ALC', at: 2 }, c: { arr: '28', arrAp: 'ALC', at: 9 } }`);
  check('preferente = la más confirmada (ALC 10 ×2 frente a 28 ×1)', E.J(`rwyPref('alc')`) === '10');
  E.run(`_runways = { a: { dep: '10', depAp: 'ALC', at: 1 }, c: { arr: '28', arrAp: 'ALC', at: 9 } }`);
  check('empate → la más reciente', E.J(`rwyPref('ALC')`) === '28');
  E.run(`_runways = { a: { dep: '04', depAp: 'STN', at: 1 } }`);
  check('lo confirmado sustituye a la semilla (STN 04)', E.J(`rwyPref('STN')`) === '04');
}

// ══ G6/G8: «otra» tecleada sin change (iOS), sugerencia tardía no pisa lo tocado, fecha conservada, valores manipulados no salen al CSV
{
  let release; const gate = new Promise(r => { release = r; });
  const E = load(NEW_SRC, { fetchImpl: url => gate.then(() => okResp(iem(url.includes('EGSS') ? 'EGSS' : 'LEAL', [['2026-10-06 05:50', 230, 12], ['2026-10-06 08:50', 100, 12], ['2026-10-06 09:50', 100, 12], ['2026-10-06 11:50', 230, 12]]))) });
  E.run(`window._ukNowOverride = '2026-04-06T12:00:00Z'`);
  E.byId('input').value = email('2026/10/06', [{ cp: 'STN - ALC', off: '06:00', on: '08:40' }, { cp: 'ALC - STN', off: '09:20', on: '11:50' }]); E.run('addDay()');
  E.run(`openRwyModal('2026-10-06')`);
  E.run(`rwyPick({ dataset: { i: '0', k: 'dep', v: '22' } }); rwyPick({ dataset: { i: '0', k: 'dep', v: '22' } })`); // marcada y desmarcada antes de llegar el METAR
  release(); await tick();
  check('sugerencia tardía no rellena un campo que el piloto ya tocó', E.J('_rwySel.rows[0].val.dep') === null && E.J('_rwySel.rows[0].val.arr') === '10', JSON.stringify(E.J('_rwySel.rows[0].val')));
  // input «otra» con texto pero sin change
  const fake = { value: '04', dataset: { i: '0', k: 'dep' } };
  E.run(`__inputs = []; document.querySelectorAll = sel => sel.includes('rwy-other') ? __inputs : []`);
  E.run(`__inputs.push(${JSON.stringify(fake)})`);
  E.run('confirmRwyModal()');
  check('confirmar recoge lo tecleado en «otra» sin change (iOS)', E.J(`_runways['2026-10-06|FR100|STN-ALC'].dep`) === '04', JSON.stringify(E.J('_runways')));
  const at0 = E.J(`_runways['2026-10-06|FR100|STN-ALC'].at`);
  E.run(`__inputs.length = 0; openRwyModal('2026-10-06')`); await tick();
  E.run(`__inputs.push({ value: 'xx', dataset: { i: '1', k: 'dep' } }); confirmRwyModal()`);
  check('«otra» inválida al confirmar → aviso y no guarda', E.st.at(-1).startsWith('warn') && /No se ha guardado nada/.test(E.st.at(-1)) && !E.byId('rwy-modal').classList.contains('hidden'), E.st.at(-1));
  E.run(`__inputs.length = 0; confirmRwyModal()`);
  check('re-confirmar sin cambios conserva la fecha de la entrada', E.J(`_runways['2026-10-06|FR100|STN-ALC'].at`) === at0);
  // tocar un botón con texto pendiente en «otra» del mismo campo → manda el botón
  E.run(`openRwyModal('2026-10-06')`); await tick();
  E.run(`__o = { value: '27R', dataset: { i: '0', k: 'arr' } }; __inputs.push(__o);
    rwyPick({ dataset: { i: '0', k: 'arr', v: '28' }, closest: () => ({ querySelector: () => __o }) })`);
  check('botón elegido manda sobre texto pendiente en «otra»', E.J('_rwySel.rows[0].val.arr') === '28', E.J('_rwySel.rows[0].val.arr'));
  E.run(`__inputs.length = 0; closeRwyModal()`);
  // valor manipulado en la nube/localStorage no sale al CSV
  E.run(`_runways['2026-10-06|FR100|STN-ALC'] = { dep: '=HYPERLINK("x")', arr: '10', depAp: 'STN', arrAp: 'ALC', at: 1 }`);
  const row = E.run('buildCSV(allFlights())').split('\r\n')[1];
  check('valor no válido (fórmula) → vacío en el CSV', !row.includes('HYPERLINK') && row.endsWith(';10'), row.slice(-30));
}

// ══ Sobrevive a re-pegar idéntico, a corregir horas, a «Quitar de la lista» y a recargar
{
  const E = load(NEW_SRC);
  E.run(`window._ukNowOverride = '2026-04-06T12:00:00Z'`);
  const paste = t => { E.byId('input').value = t; E.run('addDay()'); };
  const SECS = [{ cp: 'STN - ALC', off: '06:00', on: '08:40' }, { cp: 'ALC - STN', off: '09:20', on: '11:50' }];
  paste(email('2026/10/06', SECS));
  E.run(`saveRunways({ '2026-10-06|FR100|STN-ALC': { dep: '22', arr: '10', depAp: 'STN', arrAp: 'ALC', at: 1 } })`);
  paste(email('2026/10/06', SECS));
  check('re-pegar idéntico conserva', E.J(`_runways['2026-10-06|FR100|STN-ALC'].arr`) === '10');
  paste(email('2026/10/06', [{ ...SECS[0], on: '08:45' }, SECS[1]]));
  check('re-pegar con horas corregidas conserva (clave sin horas)', E.J(`_runways['2026-10-06|FR100|STN-ALC'].arr`) === '10');
  E.run(`removeDay('2026-10-06')`);
  check('quitar el día de la lista conserva las pistas', E.J(`_runways['2026-10-06|FR100|STN-ALC'].dep`) === '22');
  E.run('hydrateLocal()');
  check('recargar (hydrateLocal) conserva', E.J(`_runways['2026-10-06|FR100|STN-ALC'].dep`) === '22');
  E.ls.set('easylog_runways_v1', '{roto'); E.run('hydrateLocal()');
  check('JSON roto → todo reseteado sin romper', JSON.stringify(E.J('_runways')) === '{}' && JSON.stringify(E.J('_excelData')) === '{}');
}

// ══ AC-5: CSV
{
  const E = load(NEW_SRC), O = load(OLD_SRC);
  for (const X of [E, O]) X.run(`window._ukNowOverride = '2026-04-06T12:00:00Z'`);
  const t = email('2026/10/06', [{ cp: 'STN - ALC', off: '06:00', on: '08:40' }, { cp: 'ALC - STN', off: '09:20', on: '11:50' }]);
  for (const X of [E, O]) { X.byId('input').value = t; X.run('addDay()'); }
  E.run(`_runways = { '2026-10-06|FR100|STN-ALC': { dep: '22', arr: '10', depAp: 'STN', arrAp: 'ALC', at: 1 } }`);
  const nw = E.run('buildCSV(allFlights())').split('\r\n'), od = O.run('buildCSV(allFlights())').split('\r\n');
  const hN = nw[0].replace(/^﻿/, '').split(';'), hO = od[0].replace(/^﻿/, '').split(';');
  check('HEADER termina en …;AC_ENGTYPE;DEP_RWY;ARR_RWY', hN.slice(-3).join(';') === 'AC_ENGTYPE;DEP_RWY;ARR_RWY', hN.slice(-3).join(';'));
  check('columnas anteriores idénticas y en el mismo orden', hN.slice(0, -2).join(';') === hO.join(';'));
  const split = l => { const out = []; let cur = '', q = false;
    for (let i = 0; i < l.length; i++) { const c = l[i];
      if (q) { if (c === '"' && l[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else if (c === '"') q = true; else if (c === ';') { out.push(cur); cur = ''; } else cur += c; }
    out.push(cur); return out; };
  const r1 = split(nw[1]), r2 = split(nw[2]), o1 = split(od[1]);
  check('fila con pistas confirmadas → 22 / 10', r1.at(-2) === '22' && r1.at(-1) === '10', r1.slice(-2).join('|'));
  check('fila sin confirmar → vacías', r2.at(-2) === '' && r2.at(-1) === '', r2.slice(-2).join('|'));
  check('resto de la fila idéntico al de antes', r1.slice(0, -2).join(';') === o1.join(';'));
  E.run(`showDownloadStatus(allFlights(), 'OK.')`);
  check('aviso de descarga: 1 sector sin pista (warn, no bloquea)', E.st.at(-1).startsWith('warn: OK. 1 sector sin pista confirmada'), E.st.at(-1));
}

// ══ Nube: campo runways con mergeFields, guard, cliente viejo
{
  const base = { history: {}, excelData: {}, airports: {}, ukdays: {}, dayMap: {}, runways: { 'k|FR1|STN-ALC': { dep: '22', arr: '10', depAp: 'STN', arrAp: 'ALC', at: 1 } } };
  const C = load(NEW_SRC, { mode: 'cloud', cloudDoc: clone(base) });
  await tick(); C.fire(); await tick();
  check('nube → _runways hidratado del primer snapshot', C.J(`_runways['k|FR1|STN-ALC'].dep`) === '22');
  C.run(`saveRunways({ ..._runways, 'k|FR2|ALC-STN': { dep: '28', depAp: 'ALC', arrAp: 'STN', at: 2 } })`); await tick();
  const w = C.writes.at(-1);
  check('escritura con runways en mergeFields', w && w.opts.mergeFields.includes('runways') && w.data.runways['k|FR2|ALC-STN'].dep === '28', JSON.stringify(w?.opts));
  const stale = clone(base); C.cloudDoc = stale; C.fire(); await tick();
  check('guard: un snapshot viejo mientras se guarda no pisa lo confirmado', C.J(`'k|FR2|ALC-STN' in _runways`) === true);
  const V = load(OLD_SRC, { mode: 'cloud', cloudDoc: clone(base) });
  await tick(); V.fire(); await tick();
  V.run(`saveUKDays({ '2026-10-06': { state: 'uk' } })`); await tick();
  check('cliente viejo (sin runways en mergeFields) no borra el campo', V.writes.length > 0 && !V.writes.at(-1).opts.mergeFields.includes('runways') && V.cloudDoc.runways['k|FR1|STN-ALC'].dep === '22');
}

console.log(fails ? `\n${fails} FAIL` : '\nTODO PASS'); process.exit(fails ? 1 : 0);
