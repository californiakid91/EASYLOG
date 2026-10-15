// Pruebas del plan 12-01: el código de tripulante es un ajuste del usuario (settings.pilotCode), nunca un literal
// (sobre el <script> real de index.html, modo local, DOM falso). Código y nombre SINTÉTICOS (tests/lib.mjs).
import fs from 'node:fs'; import vm from 'node:vm';
import { INDEX_PATH, readFixture, TEST_PILOT, TEST_PILOT_NAME, PILOT_SEED, FIXED_NOW } from '../lib.mjs';

const SRC = fs.readFileSync(INDEX_PATH, 'utf8');
const scriptOf = html => html.match(/<script>\n([\s\S]*?)<\/script>\s*<\/body>/)[1];
let fails = 0, n = 0;
const check = (name, ok, d = '') => { n++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${d ? '  — ' + d : ''}`); if (!ok) fails++; };

function makeEnv({ seed = false } = {}) {
  const els = new Map();
  const mk = () => new Proxy({ value: '', dataset: {}, style: {}, innerHTML: '', textContent: '' }, { get: (t, k) => k in t ? t[k] : k === 'classList' ? { add() {}, remove() {}, toggle() {}, contains() { return false; } } : k === 'querySelectorAll' ? () => [] : (k === 'closest' || k === 'querySelector') ? () => null : typeof k === 'symbol' ? undefined : () => mk(), set: (t, k, v) => (t[k] = v, true) });
  const ls = new Map([['easylog_mode', 'local'], ...(seed ? [PILOT_SEED] : [])]);
  // prompt: valor fijo o función (msg, def) → valor; confirm: idem
  const E = { st: [], prompts: [], confirms: [], alerts: [], dl: [], promptAns: null, confirmAns: true, ls };
  const win = { location: {}, _ukNowOverride: FIXED_NOW };
  const ctx = vm.createContext({ document: { getElementById: id => (els.has(id) || els.set(id, mk()), els.get(id)),
      querySelector: sel => sel === 'input[name="role"]:checked' ? { value: 'FO' } : mk(), querySelectorAll: () => [], body: mk(), createElement: () => mk(), addEventListener() {} },
    localStorage: { getItem: k => ls.get(k) ?? null, setItem: (k, v) => ls.set(k, String(v)), removeItem: k => ls.delete(k) },
    window: win, navigator: {}, location: {}, console: { ...console, error() {}, warn() {} }, Date, Math, JSON, Promise, Intl, URLSearchParams,
    Blob: class { constructor(p) { this.p = p; } }, URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
    confirm: m => (E.confirms.push(m), typeof E.confirmAns === 'function' ? E.confirmAns(m) : E.confirmAns),
    prompt: (m, d) => (E.prompts.push({ m, d }), typeof E.promptAns === 'function' ? E.promptAns(m, d) : E.promptAns),
    alert: m => E.alerts.push(m), setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, __st: E.st, __dl: E.dl });
  try { vm.runInContext(scriptOf(SRC), ctx); } catch (e) { E.bootError = e; }
  E.run = c => vm.runInContext(c, ctx);
  E.J = c => JSON.parse(E.run(`JSON.stringify(${c})`));
  if (!E.bootError) E.run('showStatus = (t, m) => __st.push(t + ": " + m); askUnknownAirports = () => ""; triggerDownload = (t, f) => __dl.push({ t, f });');
  E.input = () => ctx.document.getElementById('input');
  E.paste = t => { E.input().value = t; E.run('addDay()'); };
  E.days = () => Object.keys(E.J('_cache'));
  E.lsSettings = () => JSON.parse(ls.get('easylog_settings_v1') || '{}');
  E.clear = () => { E.st.length = 0; E.prompts.length = 0; E.confirms.length = 0; E.alerts.length = 0; E.dl.length = 0; };
  return E;
}
const F01 = readFixture('01-'), F90 = readFixture('90-'), F92 = readFixture('92-');
const ISO01 = '2026-09-18';
const last = E => E.st[E.st.length - 1] || '';

// ── AC-1: sin código → se pide una vez al pegar
{
  const E = makeEnv();
  check('arranque sin errores', !E.bootError, E.bootError && String(E.bootError));
  if (E.bootError) process.exit(1);
  check('sin ajuste → myCode() vacío', E.run('myCode()') === '');
  E.promptAns = ' foxray ';
  E.paste(F01);
  const p = E.prompts[0] || {};
  check('AC-1 pide el código al pegar (una vez)', E.prompts.length === 1, String(E.prompts.length));
  check('AC-1 1 CP + 1 FO → sugerencia = el FO', p.d === TEST_PILOT, String(p.d));
  check('AC-1 el texto muestra su línea «CÓDIGO : FO : NOMBRE»', (p.m || '').includes(`${TEST_PILOT} : FO : ${TEST_PILOT_NAME}`));
  check('AC-1 se guarda en mayúsculas y sin espacios', E.lsSettings().pilotCode === TEST_PILOT && E.run('myCode()') === TEST_PILOT, JSON.stringify(E.lsSettings()));
  check('AC-1 el pegado sigue en la misma acción (día guardado)', E.days().includes(ISO01), last(E));
  E.clear(); E.paste(F90);
  check('AC-1 segundo pegado: no vuelve a preguntar', E.prompts.length === 0 && E.days().length === 2, `${E.prompts.length} · ${last(E)}`);
}
{
  const E = makeEnv(); E.promptAns = null; E.paste(F01);
  check('AC-1 cancelar → nada guardado, texto en el cuadro, aviso', E.days().length === 0 && E.input().value === F01 && /código de tripulante/.test(last(E)) && !E.lsSettings().pilotCode, last(E));
  E.clear(); E.promptAns = '  '; E.paste(F01);
  check('AC-1 vacío → nada guardado', E.days().length === 0 && !E.lsSettings().pilotCode);
  E.clear(); E.promptAns = 'FO-X!'; E.paste(F01);
  check('AC-1 formato inválido → alert y nada guardado', E.alerts.length === 1 && E.days().length === 0 && !E.lsSettings().pilotCode, E.alerts.join(' | '));
}
{
  const E = makeEnv(); E.promptAns = TEST_PILOT; E.confirmAns = false; E.paste(F92);
  check('AC-1 3 pilotos → sin sugerencia ni línea', (E.prompts[0] || {}).d === '' && !/¿Eres tú\?/.test((E.prompts[0] || {}).m || ''), JSON.stringify(E.prompts[0]));
}
{
  // Vuelta de segundo plano mientras el prompt estaba abierto: la nube deja de estar lista → no se escribe nada
  const E = makeEnv();
  E.promptAns = () => { E.ls.set('easylog_mode', 'cloud'); E.run('cloud.hydrated = false'); return TEST_PILOT; };
  E.paste(F01);
  check('AC-1 nube no lista tras el prompt → nada guardado', !E.lsSettings().pilotCode && E.days().length === 0 && E.run('myCode()') === '', last(E));
  check('G6 … y el aviso de la nube no queda tapado por «Sin tu código»', !/Sin tu código/.test(last(E)), last(E));
}
{
  // Exportar sin código con la nube no lista: lo dice requireHydrated, sin prompt ni descarga (hay un día guardado)
  const E = makeEnv({ seed: true }); E.paste(F01);
  E.run('_settings = {}'); E.ls.set('easylog_mode', 'cloud'); E.run('cloud.hydrated = false');
  E.clear(); E.promptAns = TEST_PILOT; E.run('downloadAllCSV()');
  check('G6 exportar con la nube no lista → sin prompt, sin descarga y sin «Sin tu código»', E.days().length === 1 && E.prompts.length === 0 && E.dl.length === 0 && !E.st.some(x => /Sin tu código/.test(x)) && /nube/.test(E.st.join(' ')), E.st.join(' | '));
}
{
  // saveSettings falla (copia local de la configuración dañada): el código se usa en este pegado y se avisa
  const E = makeEnv();
  E.run('_localCorrupt.add(SETTINGS_KEY)');
  E.promptAns = TEST_PILOT; E.paste(F01);
  check('AC-1 sin poder guardar el código: aviso', E.st.some(s => /No se ha podido guardar tu código/.test(s)), E.st.join(' | '));
  check('AC-1 … el código no se queda en memoria (no bloquea los demás guardados)', E.run('myCode()') === '');
  check('AC-1 … y el día se guarda igualmente', E.days().includes(ISO01) && E.ls.has('easylog_history_v1'), last(E));
}
{
  const E = makeEnv(); E.run(`_settings = { ukLimit: { '2026-27': 77 }, ukExceptional: { '2026-05-01': { reason: 'r', at: 'x' } } }`);
  E.promptAns = TEST_PILOT; E.paste(F01);
  const s = E.lsSettings();
  check('el código se guarda junto al límite y los excepcionales (sin pisarlos)', s.pilotCode === TEST_PILOT && s.ukLimit['2026-27'] === 77 && !!s.ukExceptional['2026-05-01'], JSON.stringify(s));
}

// ── AC-2: el código tiene que salir en la tripulación del email
{
  const E = makeEnv(); E.run(`_settings = { pilotCode: 'ZZZQQQ' }`); E.confirmAns = false; E.paste(F01);
  check('AC-2 código ausente → confirm que lo nombra', E.confirms.length === 1 && E.confirms[0].includes('ZZZQQQ'), E.confirms.join(' | '));
  check('AC-2 Cancelar → error, nada guardado, texto en el cuadro', E.days().length === 0 && last(E).startsWith('err') && E.input().value === F01, last(E));
  E.clear(); E.confirmAns = true; E.promptAns = TEST_PILOT; E.paste(F01);
  check('AC-2 Aceptar + código bueno → se guarda el día con el código nuevo', E.days().includes(ISO01) && E.run('myCode()') === TEST_PILOT, last(E));
  E.run(`_settings = { pilotCode: 'ZZZQQQ' }; _cache = {}; _excelData = {};`); E.clear(); E.confirmAns = true; E.promptAns = 'YYYWWW'; E.paste(F01);
  check('AC-2 Aceptar + otro código que tampoco sale → error, nada guardado', E.days().length === 0 && last(E).startsWith('err'), last(E));
}
{
  const E = makeEnv({ seed: true });
  const noCrew = F01.replace(/Flight Deck Crew\s*:?[\s\S]*?(?=\n\s*\n|$)/g, '');
  E.paste(noCrew);
  check('AC-2 email sin «Flight Deck Crew» → como hoy: se guarda (con el aviso del parser)', !/Flight Deck Crew/.test(noCrew) && E.days().includes(ISO01) && E.confirms.length === 0, last(E));
}

// ── AC-4: exportar sin código
{
  const E = makeEnv({ seed: true }); E.paste(F01);
  E.run(`_settings = {}`); E.clear(); E.promptAns = null; E.run('downloadAllCSV()');
  check('AC-4 exportar sin código → se pide (sin sugerencia)', E.prompts.length === 1 && E.prompts[0].d === '');
  check('AC-4 cancelar → no se descarga nada y se avisa', E.dl.length === 0 && /no se puede generar el CSV/.test(last(E)), last(E));
  E.clear(); E.promptAns = TEST_PILOT; E.run('downloadAllCSV()');
  check('AC-4 con código → descarga con ese código', E.dl.length === 1 && E.dl[0].t.includes(`;${TEST_PILOT};SELF;`), E.dl.length ? E.dl[0].f : '');
  E.run(`_settings = {}`); E.clear(); E.run('_localCorrupt.add(SETTINGS_KEY)'); E.promptAns = TEST_PILOT; E.run(`downloadMonthCSV('2026-09')`);
  check('AC-4 código que no se puede guardar → se usa en esta descarga y se avisa', E.dl.length === 1 && E.st.some(s => /No se ha podido guardar tu código/.test(s)), E.st.join(' | '));
  E.run(`_settings = {}`);
  let threw = false; try { E.run('buildCSV(allFlights())'); } catch (e) { threw = /sin código/.test(String(e)); }
  check('AC-4 buildCSV sin código lanza (nunca TO/LDG a 0 en silencio)', threw);
}

// ── AC-5: nombre de la fila NAME del Excel
{
  const E = makeEnv({ seed: true }); E.paste(F01);
  check('AC-5 fila NAME = nombre de la línea propia del email', E.run('pilotNameFor(viewTY())') === TEST_PILOT_NAME, E.run('pilotNameFor(viewTY())'));
  E.run(`_settings = {}`);
  check('AC-5 sin código → celda vacía', E.run('pilotNameFor(viewTY())') === '');
  check('AC-5 el Excel usa pilotNameFor (sin nombre literal)', /\['NAME',pilotNameFor\(ty\),/.test(SRC));
}

// ── AC-6: el código no pasa de un modo a otro
{
  const E = makeEnv();
  E.ls.set('easylog_mode', 'cloud'); E.run(`_settings = { pilotCode: 'CLOUDX' }; cloud.hydrated = true;`);
  E.confirmAns = true;
  try { E.run('switchMode()'); } catch { /* applyLocalMode pinta con el DOM falso */ }
  check('AC-6 cambiar de nube a local → el código de la nube no se arrastra', E.ls.get('easylog_mode') === 'local' && E.run('myCode()') === '', E.run('myCode()'));
}

// ── SAFETY PILOT y lector defensivo
{
  const E = makeEnv({ seed: true });
  check('SP: la fixture 92 se detecta con el código del ajuste', E.run(`detectSafetyPilot(parseText(${JSON.stringify(F92)}).flights)`) === true);
  check('SP: sin código nunca se infiere', E.run(`detectSafetyPilot(parseText(${JSON.stringify(F92)}).flights, '')`) === false);
  E.run(`_settings = { pilotCode: '<img src=x>' }`);
  check('myCode() ignora un ajuste con formato raro', E.run('myCode()') === '');
  E.run(`_settings = { pilotCode: 123456 }`);
  check('myCode() ignora un ajuste que no es texto', E.run('myCode()') === '');
}

console.log(`\n${fails ? fails + ' FAIL' : 'OK'} (${n} checks)`);
process.exit(fails || !n ? 1 : 0);
