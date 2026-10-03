// Prueba de addUKDayManual / pickUKDayDate sobre el <script> real de index.html (modo local, DOM falso)
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.resolve(HERE, '../../../index.html'), 'utf8');
const SCRIPT = html.match(/<script>\n([\s\S]*?)<\/script>\s*<\/body>/)[1];
const mk = () => new Proxy({ value: '', dataset: {}, style: {} }, { get: (t, k) => k in t ? t[k] : k === 'classList' ? { add() {}, remove() {}, toggle() {}, contains() { return false; } } : k === 'querySelectorAll' ? () => [] : (k === 'closest' || k === 'querySelector') ? () => null : typeof k === 'symbol' ? undefined : () => mk(), set: (t, k, v) => (t[k] = v, true) });
const ls = new Map([['easylog_mode', 'local']]); const st = []; let answer = true;
const ctx = vm.createContext({ document: { getElementById: () => mk(), querySelector: () => mk(), querySelectorAll: () => [], body: mk(), createElement: () => mk(), addEventListener() {} },
  localStorage: { getItem: k => ls.get(k) ?? null, setItem: (k, v) => ls.set(k, String(v)), removeItem: k => ls.delete(k) },
  window: {}, navigator: {}, location: {}, console, Date, Math, JSON, Promise, Intl, confirm: () => answer, prompt: () => null, alert() {},
  setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, __st: st });
vm.runInContext(SCRIPT, ctx); vm.runInContext('showStatus = (t, m) => __st.push(t + ": " + m); _ukdays = {};', ctx);
const run = c => vm.runInContext(c, ctx); let fails = 0;
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); if (!ok) fails++; };
const pick = v => { ctx.__inp = { value: v, blur() {} }; run('pickUKDayDate(__inp)'); return ctx.__inp.value; };
check('elegir 25/09 y confirmar → añadido manual', pick('2026-09-25') === '' && run(`JSON.stringify(_ukdays['2026-09-25'])`) === JSON.stringify({ route: '—', onBlock: '--:--', tz: 'BST', manual: true }));
check('persistido en localStorage', JSON.parse(ls.get('easylog_ukdays_v1'))['2026-09-25']?.manual === true);
pick('2026-09-25'); check('repetido → aviso, sin duplicar', st.at(-1).includes('ya está registrado') && Object.keys(run('_ukdays')).length === 1, st.at(-1));
pick('2026-04-01'); check('fuera de rango → aviso', st.at(-1).includes('fuera del rango') && !run(`'2026-04-01' in _ukdays`), st.at(-1));
answer = false; pick('2026-12-01'); check('cancelar confirmación → no se añade', !run(`'2026-12-01' in _ukdays`));
answer = true; pick('2027-01-15'); check('enero 2027 (GMT) → tz GMT', run(`_ukdays['2027-01-15'].tz`) === 'GMT');
pick(''); check('valor vacío → nada', Object.keys(run('_ukdays')).length === 2);
check('addTodayAsUKDay eliminado', !/addTodayAsUKDay/.test(html));
console.log(fails ? `\n${fails} FALLO(S)` : '\nTODO OK'); process.exit(fails ? 1 : 0);
