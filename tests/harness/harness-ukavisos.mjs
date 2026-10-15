// Pruebas del plan 10-01: UK Days — aviso al pegar un email que contradice una marca manual + motivos de decisiones manuales
// (sobre el <script> real de index.html, modo local, DOM falso; baseline = BASELINES.preFase10)
import fs from 'node:fs'; import vm from 'node:vm';
import { INDEX_PATH, FIXED_NOW, BASELINES, indexAt, PILOT_SEED, legacyAsTest } from '../lib.mjs';

const scriptOf = html => html.match(/<script>\n([\s\S]*?)<\/script>\s*<\/body>/)[1];
let fails = 0;
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); if (!ok) fails++; };

function makeEnv(script) {
  const els = new Map();
  const mk = () => new Proxy({ value: '', dataset: {}, style: {}, innerHTML: '', textContent: '' }, { get: (t, k) => k in t ? t[k] : k === 'classList' ? { add() {}, remove() {}, toggle() {}, contains() { return false; } } : k === 'querySelectorAll' ? () => [] : (k === 'closest' || k === 'querySelector') ? () => null : typeof k === 'symbol' ? undefined : () => mk(), set: (t, k, v) => (t[k] = v, true) });
  const ls = new Map([['easylog_mode', 'local'], PILOT_SEED]);
  const E = { st: [], confirms: [], answer: true };
  const win = { location: {}, _ukNowOverride: FIXED_NOW };
  const ctx = vm.createContext({ document: { getElementById: id => (els.has(id) || els.set(id, mk()), els.get(id)),
      querySelector: sel => sel === 'input[name="role"]:checked' ? { value: 'FO' } : mk(), querySelectorAll: () => [], body: mk(), createElement: () => mk(), addEventListener() {} },
    localStorage: { getItem: k => ls.get(k) ?? null, setItem: (k, v) => ls.set(k, String(v)), removeItem: k => ls.delete(k) },
    window: win, navigator: {}, location: {}, console: { ...console, error() {} }, Date, Math, JSON, Promise, Intl, URLSearchParams,
    Blob: class { constructor(p) { this.p = p; } }, URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
    confirm: m => (E.confirms.push(m), typeof E.answer === 'function' ? E.answer(m) : E.answer), prompt: () => null, alert: m => E.st.push('alert: ' + m),
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, __st: E.st });
  try { vm.runInContext(script, ctx); } catch (e) { E.bootError = e; }
  E.run = c => vm.runInContext(c, ctx);
  E.J = c => JSON.parse(E.run(`JSON.stringify(${c} ?? null)`));
  E.html = id => ctx.document.getElementById(id).innerHTML;
  if (!E.bootError) E.run('showStatus = (t, m) => __st.push(t + ": " + m); askUnknownAirports = () => ""; var __p = persist, __n = 0; persist = () => (++__n, __p());');
  E.reset = () => { E.run('_cache = {}; _excelData = {}; _ukdays = {}; _dayMap = {}; _settings = { pilotCode: "FOXRAY" }; __n = 0;'); E.st.length = 0; E.confirms.length = 0; E.answer = true; win._ukNowOverride = FIXED_NOW; };
  E.now = iso => { win._ukNowOverride = iso; };
  E.paste = t => { ctx.document.getElementById('input').value = t; E.run('addDay()'); };
  return E;
}
const email = (date, secs) => date + '\n\n' + secs.map((s, i) => [
  `FlightNumber : FR${100 + i}`, 'Registration : EIABC', `City Pair : ${s.cp}`, `STD : ${s.std ?? s.off}`, `STA : ${s.on ?? s.off}`,
  ...(s.off ? [`Airborne : ${s.off}`] : []), ...(s.on ? [`Landed : ${s.on}`] : []),
  ...(s.off ? [`Off Block : ${s.off}`] : []), ...(s.on ? [`On Block : ${s.on}`] : []), 'Total Block : 02:00',
  '', 'Pilot Flying :', 'Take Off : FOXRAY', 'Landing : FOXRAY', ''].join('\n')).join('\n\n');

const ISO = '2026-09-20', D = '2026/09/20';
const UKE = email(D, [{ cp: 'STN - DUB', off: '15:00', on: '16:10' }, { cp: 'DUB - STN', off: '17:00', on: '18:10' }]); // R1: UK
const NOE = email(D, [{ cp: 'STN - LIS', off: '18:00', on: '21:00' }]);                                              // R2: No UK
const NOON = email(D, [{ cp: 'STN - DUB', off: '15:00', on: '16:10' }, { cp: 'DUB - STN', off: '17:00' }]);            // sin On Block
const manualNo = 'decidido a mano (dormí fuera de UK): DUTY en calendario sin email: pega el email';
const setManual = (E, state, reason = manualNo) => E.run(`_ukdays['${ISO}'] = { state: '${state}', route: '—', onBlock: '--:--', tz: 'BST', manual: true, source: 'manual', reason: ${JSON.stringify(reason)}, at: 'x' }`);
const K = E => E.J(`_ukdays['${ISO}']`), H = E => E.J(`_cache['${ISO}']`), last = E => E.st.at(-1) || '';
const isMarca = m => /marca tuya/.test(m);

const E = makeEnv(scriptOf(fs.readFileSync(INDEX_PATH, 'utf8')));
check('arranque sin errores', !E.bootError, E.bootError && String(E.bootError));
if (E.bootError) process.exit(1);

// ── AC-1: día nuevo con marca manual que el email contradice
E.reset(); setManual(E, 'no'); E.paste(UKE);
check('AC-1 contradice → un confirm con marca, email y botones', E.confirms.length === 1 && isMarca(E.confirms[0]) && /No UK \(decidido a mano \(dormí fuera de UK\) · DUTY sin email\)/.test(E.confirms[0]) && /El email dice UK Day: on-block 19:10 BST en STN/.test(E.confirms[0]) && /Aceptar = usar el email · Cancelar = mantener tu marca \(los vuelos se guardan igual\)/.test(E.confirms[0]), E.confirms[0]);
check('AC-1 aceptar → regla del email (rule:R1, sin manual) en UNA escritura', K(E)?.state === 'uk' && K(E)?.source === 'rule:R1' && !K(E)?.manual && H(E)?.flights?.length === 2 && E.run('__n') === 1, JSON.stringify(K(E)) + ' n=' + E.run('__n'));
check('AC-1 aceptar → nota «se usa el email»', /UK Day: se usa el email \(UK Day\)/.test(last(E)) && last(E).startsWith('ok:'), last(E));
E.reset(); setManual(E, 'no'); E.answer = m => !isMarca(m); E.paste(UKE);
check('AC-1 cancelar → vuelos guardados, marca intacta, nota', H(E)?.flights?.length === 2 && K(E)?.manual === true && K(E)?.state === 'no' && /se mantiene tu marca \(el email dice UK Day\)/.test(last(E)), JSON.stringify(K(E)) + ' · ' + last(E));
E.reset(); setManual(E, 'no'); E.paste(NOE);
check('AC-1 coincide (no/no) → sin confirm, marca intacta', E.confirms.length === 0 && K(E)?.manual === true && K(E)?.reason === manualNo);
E.reset(); setManual(E, 'no'); E.paste(NOON);
check('AC-1 sin On Block → sin confirm, nada cambia', E.confirms.length === 0 && K(E)?.manual === true && K(E)?.state === 'no');
E.reset(); setManual(E, 'uk', 'añadido a mano'); E.paste(NOE);
check('AC-1 marca UK + email No UK → pregunta; aceptar → rule:R2', E.confirms.length === 1 && /UK Day \(añadido a mano\)/.test(E.confirms[0]) && K(E)?.state === 'no' && K(E)?.source === 'rule:R2', JSON.stringify(K(E)));
// reemplazo (vuelos distintos)
E.reset(); E.paste(NOE); setManual(E, 'no'); E.confirms.length = 0; E.run('__n = 0'); E.paste(UKE);
check('AC-1 reemplazo → «¿Reemplazar?» + marca; aceptar → R1 en una escritura', E.confirms.length === 2 && /Reemplazar/.test(E.confirms[0]) && isMarca(E.confirms[1]) && K(E)?.source === 'rule:R1' && E.run('__n') === 1, JSON.stringify(E.confirms.map(m => m.slice(0, 30))) + ' n=' + E.run('__n'));

// ── AC-2: re-pegar el mismo email
E.reset(); E.paste(UKE); setManual(E, 'no'); E.confirms.length = 0; E.run('__n = 0'); E.paste(UKE);
check('AC-2 idéntico en lista → confirm; aceptar → R1 con saveUKDays (1 escritura)', E.confirms.length === 1 && isMarca(E.confirms[0]) && K(E)?.source === 'rule:R1' && E.run('__n') === 1 && last(E).startsWith('ok:') && /se usa el email/.test(last(E)), last(E) + ' n=' + E.run('__n'));
E.reset(); E.paste(UKE); setManual(E, 'no'); E.confirms.length = 0; E.run('__n = 0'); E.answer = false; E.paste(UKE);
check('AC-2 idéntico en lista, cancelar → marca intacta, 0 escrituras', K(E)?.manual === true && E.run('__n') === 0 && /se mantiene tu marca/.test(last(E)), last(E));
E.reset(); E.paste(UKE); E.run(`delete _cache['${ISO}']`); setManual(E, 'no'); E.confirms.length = 0; E.run('__n = 0'); E.paste(UKE);
check('AC-2 idéntico solo-Excel → vuelve a la lista + R1 en UNA escritura', H(E)?.flights?.length === 2 && K(E)?.source === 'rule:R1' && E.run('__n') === 1 && /vuelve a la lista/.test(last(E)), last(E) + ' n=' + E.run('__n'));
E.reset(); E.paste(UKE); setManual(E, 'no'); E.run('__n = 0'); E.answer = false; E.paste(UKE); E.answer = true; E.confirms.length = 0;
E.paste(UKE);
check('AC-2 sigue preguntando mientras haya contradicción', E.confirms.length === 1);

// ── AC-3: seguridad del confirm
E.reset(); setManual(E, 'no'); E.run('var __rh = requireHydrated, __rhN = 0; requireHydrated = () => ++__rhN < 2;'); E.paste(UKE);
check('AC-3 nube desfasada tras el confirm → nada escrito', E.confirms.length === 1 && H(E) === null && K(E)?.manual === true && E.run('__n') === 0);
E.run('requireHydrated = __rh;');
E.reset(); setManual(E, 'no'); E.run(`var __cf = confirm; confirm = m => { _ukdays = { ..._ukdays, '${ISO}': { state: 'no', route: 'X→LIS', onBlock: '20:00', tz: 'BST', source: 'rule:R2', reason: 'x' } }; return __cf(m); };`); E.paste(UKE);
check('AC-3 entrada cambiada durante el confirm → no se aplica la decisión; nota «cambió», sin «se mantiene»', /cambió desde otro dispositivo/.test(last(E)) && !/se mantiene tu marca/.test(last(E)) && H(E)?.flights?.length === 2, last(E));
E.run('confirm = __cf;');
E.reset(); setManual(E, 'no'); E.run(`var __cf2 = confirm; confirm = m => { _cache = { '${ISO}': { addedAt: 'x', role: 'FO', flights: [] } }; return __cf2(m); };`); E.paste(UKE);
check('AC-3 otro dispositivo guarda el día durante el confirm → nada escrito, aviso', E.J(`_cache['${ISO}'].addedAt`) === 'x' && K(E)?.manual === true && /otro dispositivo/.test(last(E)), last(E));
E.run('confirm = __cf2;');
E.reset(); E.paste(NOE); setManual(E, 'no'); E.run(`var __cf3 = confirm; confirm = m => { if (/Reemplazar/.test(m)) _cache = { ..._cache, '${ISO}': { ..._cache['${ISO}'], flights: [] } }; return __cf3(m); };`); E.run('__n = 0'); E.paste(UKE);
check('AC-3 otro dispositivo cambia los vuelos durante «¿Reemplazar?» → nada escrito', E.run('__n') === 0 && /otro dispositivo/.test(last(E)) && K(E)?.manual === true, last(E));
E.run('confirm = __cf3;');
E.reset(); E.now('2027-05-10T12:00:00+01:00'); setManual(E, 'no'); E.paste(UKE);
check('AC-3 año cerrado → el confirm lo dice; aceptar → manual con prefijo «año cerrado»', E.confirms.length === 1 && /Año cerrado: quedará como entrada manual/.test(E.confirms[0]) && K(E)?.manual === true && K(E)?.state === 'uk' && /^año cerrado, pegado el /.test(K(E)?.reason), JSON.stringify(K(E)));
E.reset(); E.now('2027-05-10T12:00:00+01:00'); E.run(`var __cf4 = confirm; confirm = m => { if (/año fiscal/.test(m)) _cache = { '${ISO}': { addedAt: 'otro', role: 'FO', flights: [] } }; return __cf4(m); };`); E.paste(UKE);
check('G6 otro dispositivo guarda el día durante el confirm de año cerrado → no se pisa, aviso', E.J(`_cache['${ISO}'].addedAt`) === 'otro' && /otro dispositivo/.test(last(E)), last(E));
E.run('confirm = __cf4;');
E.reset(); setManual(E, 'no'); E.run(`_settings = { pilotCode: 'FOXRAY', ukExceptional: { '${ISO}': { reason: 'motivo de prueba', at: 'x' } } }`); E.answer = false; E.paste(UKE);
check('AC-3 excepcional → el confirm dice que se conserva', /circunstancia excepcional se conserva/.test(E.confirms[0] || ''), E.confirms[0]);
E.reset(); setManual(E, 'no'); E.run('var __p2 = persist; persist = () => false;'); E.paste(UKE);
check('AC-3 saveHistory falla → la marca manual sigue en memoria', K(E)?.manual === true && K(E)?.state === 'no', JSON.stringify(K(E)));
E.run('persist = __p2;');

// ── AC-4: aviso en la lista
E.reset(); E.paste(NOE); E.run(`_ukdays['${ISO}'] = ukManualEntry('${ISO}')`);
check('AC-4 ukEmailSays: marca UK + email guardado No UK → no', E.run(`ukEmailSays('${ISO}')`) === 'no');
E.run('renderUKDays()');
check('AC-4 lista del mes: «⚠ el email dice No UK» con title', /⚠ el email dice No UK/.test(E.html('ukdays-body')) && /Pulsa ✕ para volver a lo que dice el email/.test(E.html('ukdays-body')));
E.reset(); E.paste(UKE); setManual(E, 'no'); E.run("_ukOutKind = 'work'; _ukOutOpen = true; renderUKDays()");
check('AC-4 «Fuera de UK»: «⚠ el email dice UK Day» y motivo normalizado', /⚠ el email dice UK Day/.test(E.html('ukdays-body')) && /· DUTY sin email/.test(E.html('ukdays-body')) && !/pega el email<\/span>/.test(E.html('ukdays-body')));
E.reset(); setManual(E, 'no'); E.run("_ukOutKind = 'off'; _ukOutOpen = true; renderUKDays()");
check('AC-4 manual sin email → sin aviso', E.run(`ukEmailSays('${ISO}')`) === undefined && !/el email dice/.test(E.html('ukdays-body')));
E.reset(); E.paste(NOE); setManual(E, 'no'); E.run("_ukOutKind = 'work'; _ukOutOpen = true; renderUKDays()");
check('AC-4 manual que coincide con el email → sin aviso', !/el email dice/.test(E.html('ukdays-body')));

// ── AC-5: motivos de las decisiones manuales
E.reset(); E.run(`_dayMap = { '${ISO}': 'duty' }; ukDecidePending('${ISO}', 'no')`);
check('AC-5 DUTY sin email → «… · DUTY sin email»', K(E)?.reason === 'decidido a mano (dormí fuera de UK) · DUTY sin email', K(E)?.reason);
E.reset(); E.paste(NOON); E.run(`ukDecidePending('${ISO}', 'uk')`);
check('AC-5 email sin On Block → «… · email sin On Block»', K(E)?.reason === 'decidido a mano (dormí en UK) · email sin On Block', K(E)?.reason);
E.reset(); E.paste(UKE); E.run(`_ukdays = {}; _dayMap = { '${ISO}': 'off' }; ukDecidePending('${ISO}', 'no')`);
check('AC-5 conflicto → «… · calendario (OFF) y email discrepan»', K(E)?.reason === 'decidido a mano (dormí fuera de UK) · calendario (OFF) y email discrepan', K(E)?.reason);
// anti-deriva: los textos de los pendientes del baseline se normalizan con el ukReasonText actual
const OLD = legacyAsTest(scriptOf(indexAt(BASELINES.preFase10)));
const oldDuty = OLD.match(/reason: '(DUTY en calendario sin email: pega el email)'/)?.[1];
const oldInc = OLD.match(/reason: '(email incompleto \(sin On Block\): re-pégalo)'/)?.[1];
const oldConf = OLD.match(/reason: `(calendario \(\$\{cal\.toUpperCase\(\)\}\) y email discrepan)`/)?.[1];
check('AC-5 los 3 textos viejos existen en el baseline', !!(oldDuty && oldInc && oldConf));
const norm = r => E.run(`ukReasonText(${JSON.stringify(r)})`);
check('AC-5 ukReasonText normaliza los 3 textos viejos', norm(`decidido a mano (dormí fuera de UK): ${oldDuty}`) === 'decidido a mano (dormí fuera de UK) · DUTY sin email'
  && norm(`decidido a mano (dormí en UK): ${oldInc}`) === 'decidido a mano (dormí en UK) · email sin On Block'
  && norm(`decidido a mano (dormí en UK): ${oldConf.replace('${cal.toUpperCase()}', 'SBY')}`) === 'decidido a mano (dormí en UK) · calendario (SBY) y email discrepan');
check('AC-5 ukReasonText no toca otros motivos', norm('añadido a mano') === 'añadido a mano' && norm('marcado por el usuario: dormí fuera de UK') === 'marcado por el usuario: dormí fuera de UK');

// ── Baseline: antes de la Fase 10 la marca ganaba en silencio
const B = makeEnv(OLD);
B.reset(); setManual(B, 'no'); B.paste(UKE);
check('baseline preFase10: sin pregunta y marca intacta (el fallo que arregla esta fase)', B.confirms.length === 0 && K(B)?.manual === true);

console.log(fails ? `\n${fails} FALLO(S)` : '\nTODO OK');
process.exit(fails ? 1 : 0);
