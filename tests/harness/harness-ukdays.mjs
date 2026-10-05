// Pruebas de UK Days (fase 3, plan 01) sobre el <script> real de index.html (modo local, DOM falso)
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.resolve(HERE, '../../../index.html'), 'utf8');
const SCRIPT = html.match(/<script>\n([\s\S]*?)<\/script>\s*<\/body>/)[1];
const els = new Map();
const mk = () => new Proxy({ value: '', dataset: {}, style: {}, innerHTML: '', textContent: '' }, { get: (t, k) => k in t ? t[k] : k === 'classList' ? { add() {}, remove() {}, toggle() {}, contains() { return false; } } : k === 'querySelectorAll' ? () => [] : (k === 'closest' || k === 'querySelector') ? () => null : typeof k === 'symbol' ? undefined : () => mk(), set: (t, k, v) => (t[k] = v, true) });
const ls = new Map([['easylog_mode', 'local']]); const st = []; const confirms = []; let answer = true;
const ctx = vm.createContext({ document: { getElementById: id => (els.has(id) || els.set(id, mk()), els.get(id)), querySelector: () => mk(), querySelectorAll: () => [], body: mk(), createElement: () => mk(), addEventListener() {} },
  localStorage: { getItem: k => ls.get(k) ?? null, setItem: (k, v) => ls.set(k, String(v)), removeItem: k => ls.delete(k) },
  window: {}, navigator: {}, location: {}, console, Date, Math, JSON, Promise, Intl, confirm: m => (confirms.push(m), answer), prompt: () => null, alert: m => st.push('alert: ' + m),
  setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, __st: st });
vm.runInContext(SCRIPT, ctx);
vm.runInContext('showStatus = (t, m) => __st.push(t + ": " + m); var __persists = 0; const __p = persist; persist = function () { __persists++; return __p(); };', ctx);
const run = c => vm.runInContext(c, ctx); let fails = 0, skips = 0;
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); if (!ok) fails++; };
const reset = () => run('_cache = {}; _excelData = {}; _ukdays = {}; __persists = 0;');
// 03-02: las entradas llevan state/source/reason; un "No UK" (state 'no') no cuenta → se lee como null
const uk = iso => run(`(e => !e || (e.state || 'uk') === 'no' ? 'null' : JSON.stringify({ route: e.route, onBlock: e.onBlock, tz: e.tz, ...(e.manual ? { manual: true } : {}) }))(_ukdays['${iso}'])`);
const paste = text => { ctx.document.getElementById('input').value = text; run('addDay()'); };
// Email sintético: date "YYYY/MM/DD", sectores [{cp, std, off, on}]
const email = (date, secs) => date + '\n\n' + secs.map((s, i) => [
  `FlightNumber : FR${100 + i}`, 'Registration : EIABC', `City Pair : ${s.cp}`, `STD : ${s.std ?? s.off}`, `STA : ${s.on ?? s.off}`,
  ...(s.off ? [`Airborne : ${s.off}`] : []), ...(s.on ? [`Landed : ${s.on}`] : []),
  ...(s.off ? [`Off Block : ${s.off}`] : []), ...(s.on ? [`On Block : ${s.on}`] : []), 'Total Block : 02:00',
  '', 'Pilot Flying :', 'Take Off : VEGRIC', 'Landing : VEGRIC', ''].join('\n')).join('\n\n');

// ── AC-1: fixtures reales/sintéticos de la auditoría (gitignored: solo en la máquina del usuario)
const fixDir = path.resolve(HERE, '../01-auditoria/harness/fixtures');
const fix = p => { const f = fs.existsSync(fixDir) && fs.readdirSync(fixDir).find(x => x.startsWith(p)); return f ? fs.readFileSync(path.join(fixDir, f), 'utf8') : null; };
const isoOf = text => { const m = text.match(/^(\d{4})\/(\d{2})\/(\d{2})/m); return m && `${m[1]}-${m[2]}-${m[3]}`; };
for (const [p, expect, name] of [['01', '{"route":"RZE→STN","onBlock":"23:36","tz":"BST"}', 'fixture 01 RZE→STN 23:36 BST → UK Day'],
                                 ['90', 'null', 'fixture 90 (Off 23:59Z, On 02:35Z) → NO UK Day'],
                                 ['91', 'null', 'fixture 91 (último Off 00:10Z) → NO UK Day (H5)']]) {
  const t = fix(p); if (!t) { console.log(`SKIP  ${name} — fixtures ausentes`); skips++; continue; }
  reset(); paste(t); check(name, uk(isoOf(t)) === expect, uk(isoOf(t)));
}

// ── AC-1 sintético: último sector listado primero NO importa; orden cronológico real
reset(); paste(email('2026/10/06', [{ cp: 'STN - RZE', off: '17:00', on: '19:15' }, { cp: 'RZE - STN', std: '19:00', off: '00:10', on: '02:35' }]));
check('sintético: último sector Off 00:10Z (on 03:35 BST día+1) → NO UK Day', uk('2026-10-06') === 'null', uk('2026-10-06'));
reset(); paste(email('2026/10/06', [{ cp: 'STN - RZE', off: '17:00', on: '19:15' }, { cp: 'RZE - STN', off: '20:00', on: '22:30' }]));
check('sintético: on 22:30Z (23:30 BST) → UK Day RZE→STN 23:30 BST', uk('2026-10-06') === '{"route":"RZE→STN","onBlock":"23:30","tz":"BST"}', uk('2026-10-06'));

// ── AC-2: cambios de hora dentro del periodo
reset(); paste(email('2026/10/24', [{ cp: 'STN - DUB', off: '20:00', on: '21:10' }, { cp: 'DUB - STN', off: '22:00', on: '23:30' }]));
check('DST: 24/10/2026 on 23:30Z = 00:30 BST del 25 → NO UK Day', uk('2026-10-24') === 'null', uk('2026-10-24'));
reset(); paste(email('2026/10/25', [{ cp: 'STN - DUB', off: '20:00', on: '21:10' }, { cp: 'DUB - STN', off: '22:00', on: '23:30' }]));
check('DST: 25/10/2026 (ya GMT) on 23:30Z → UK Day 23:30 GMT', uk('2026-10-25') === '{"route":"DUB→STN","onBlock":"23:30","tz":"GMT"}', uk('2026-10-25'));
reset(); paste(email('2027/03/27', [{ cp: 'STN - DUB', off: '20:00', on: '21:10' }, { cp: 'DUB - STN', off: '22:00', on: '23:30' }]));
check('DST: 27/03/2027 (aún GMT) on 23:30Z → UK Day 23:30 GMT', uk('2027-03-27') === '{"route":"DUB→STN","onBlock":"23:30","tz":"GMT"}', uk('2027-03-27'));
reset(); paste(email('2027/03/28', [{ cp: 'STN - DUB', off: '20:00', on: '21:10' }, { cp: 'DUB - STN', off: '22:00', on: '22:45' }]));
check('DST: 28/03/2027 (BST) on 22:45Z = 23:45 BST → UK Day', uk('2027-03-28') === '{"route":"DUB→STN","onBlock":"23:45","tz":"BST"}', uk('2027-03-28'));

// ── AC-3: re-pegar recalcula (con y sin historial previo); manual intacto; sin datos no toca
const UKD = email('2026/11/10', [{ cp: 'STN - DUB', off: '15:00', on: '16:10' }, { cp: 'DUB - STN', off: '17:00', on: '18:10' }]);
const NOT = email('2026/11/10', [{ cp: 'STN - DUB', off: '20:00', on: '21:10' }, { cp: 'DUB - STN', std: '22:00', off: '00:20', on: '01:30' }]);
const NOON = email('2026/11/10', [{ cp: 'STN - DUB', off: '15:00', on: '16:10' }, { cp: 'DUB - STN', off: '17:00' }]);
reset(); paste(UKD); const before = uk('2026-11-10'); paste(NOT);
check('re-pegar (Reemplazar) día UK → no UK: se elimina la entrada automática', before !== 'null' && uk('2026-11-10') === 'null', `${before} → ${uk('2026-11-10')}`);
reset(); run(`_ukdays = { '2026-11-10': { route: 'X→Y', onBlock: '10:00', tz: 'GMT' } };`); paste(NOT);
check('re-pegar SIN historial previo (tras Borrar historial) → recalcula y elimina', uk('2026-11-10') === 'null');
reset(); paste(NOT); paste(UKD);
check('re-pegar no UK → UK: se crea', uk('2026-11-10') === '{"route":"DUB→STN","onBlock":"18:10","tz":"GMT"}', uk('2026-11-10'));
reset(); run(`_ukdays = { '2026-11-10': { route: '—', onBlock: '--:--', tz: 'GMT', manual: true } };`); paste(NOT);
check('entrada manual + pegar día no UK → manual intacta', JSON.parse(uk('2026-11-10'))?.manual === true);
reset(); paste(UKD); const keep = uk('2026-11-10'); paste(NOON);
check('último sector sin On Block → entrada existente NO se toca', uk('2026-11-10') === keep, uk('2026-11-10'));
check('addDay: una sola escritura persist() por pegado', (reset(), paste(UKD), run('__persists')) === 1, `persists=${run('__persists')}`);

// ── AC-4: removeDay
reset(); paste(UKD); run('__persists = 0'); confirms.length = 0; run(`removeDay('2026-11-10')`);
// 03-02 (decisión del usuario en el checkpoint): ✕ solo quita de la lista; el UK Day y el Excel se conservan
check('removeDay conserva el UK Day automático (03-02)', uk('2026-11-10') !== 'null');
check('removeDay: el confirm menciona el UK Day', /UK Day/.test(confirms.at(-1) || ''), confirms.at(-1));
check('removeDay: una sola escritura persist()', run('__persists') === 1, `persists=${run('__persists')}`);
check('removeDay: persistido en localStorage (UK Day sigue)', '2026-11-10' in JSON.parse(ls.get('easylog_ukdays_v1')));
reset(); paste(NOT); run(`_ukdays = { '2026-11-10': { route: '—', onBlock: '--:--', tz: 'GMT', manual: true } };`); run(`removeDay('2026-11-10')`);
check('removeDay conserva UK Day manual', JSON.parse(uk('2026-11-10'))?.manual === true);

// ── backfill: añade días que antes fallaban, no pisa existentes
reset(); run(`_cache = { '2026-11-10': { flights: parseText(${JSON.stringify(UKD)}).flights } }; _ukdays = {}; backfillUKDays();`);
check('backfillUKDays usa computeUKDay (añade)', uk('2026-11-10') === '{"route":"DUB→STN","onBlock":"18:10","tz":"GMT"}', uk('2026-11-10'));
check('isUKDay/buildUTCOnBlock eliminados (una sola lógica)', !/function isUKDay|function buildUTCOnBlock/.test(html));

// ── AC-6: periodo 06/04/2026 – 05/04/2027
const pick = v => { run('openUKDateModal()'); ctx.document.getElementById('ukday-date').value = v; run('confirmUKDateModal()'); };
reset(); st.length = 0; pick('2027-04-06');
check('modal: 06/04/2027 rechazado (fuera de periodo)', !run(`'2027-04-06' in _ukdays`) && /fuera del periodo/.test(st.at(-1) || ''), st.at(-1));
check('aviso dice "5 abr 2027"', /5 abr 2027/.test(st.at(-1) || ''));
pick('2027-04-05'); check('modal: 05/04/2027 aceptado (último día)', run(`'2027-04-05' in _ukdays`));
reset(); paste('añade uk days 1 y 6 abril'); 
check('comando: "1 abril" → 2027-04-01; "6 abril" → 2026-04-06', run(`'2027-04-01' in _ukdays && '2026-04-06' in _ukdays && !('2026-04-01' in _ukdays)`), Object.keys(run('_ukdays')).join(','));
reset(); paste('añade uk days 6 y 7 abril'); 
check('comando: "7 abril" → 2026-04-07 (no 2027-04-07)', run(`'2026-04-07' in _ukdays && !('2027-04-07' in _ukdays)`), Object.keys(run('_ukdays')).join(','));
check('sin restos de 2027-04-07 / "7 abr 2027" en index.html', !/2027-04-07|7 abr 2027/.test(fs.readFileSync(path.resolve(HERE, '../../../index.html'), 'utf8')));
check('downloadTaxExcel usa UK_DAYS_START/END', /TAX_START = UK_DAYS_START;[\s\S]{0,40}TAX_END\s+= UK_DAYS_END;/.test(fs.readFileSync(path.resolve(HERE, '../../../index.html'), 'utf8')));

// ── AC-5: días en Excel sin historial
const histHTML = () => ctx.document.getElementById('history').innerHTML;
reset(); run(`_excelData = { '2026-09-18': { role: 'FO', flights: [] } }; _ukdays = { '2026-09-18': { route: 'A→B', onBlock: '20:00', tz: 'BST' } }; renderHistory();`);
check('historial vacío: aparece "Días en Excel sin historial" con el 18/09', /Días en Excel sin historial/.test(histHTML()) && /removeExcelOnlyDay\('2026-09-18'\)/.test(histHTML()));
check('la sección va plegada', /month-group collapsed" data-month="excel-only"/.test(histHTML()));
paste(UKD); check('con historial: la sección sigue apareciendo (18/09 no está en historial)', /removeExcelOnlyDay\('2026-09-18'\)/.test(histHTML()) && !/removeExcelOnlyDay\('2026-11-10'\)/.test(histHTML()));
run(`removeExcelOnlyDay('2026-09-18')`);
check('borrar solo-Excel: fuera de _excelData y persistido', !run(`'2026-09-18' in _excelData`) && !('2026-09-18' in JSON.parse(ls.get('easylog_excel_v1'))));
check('borrar solo-Excel NO toca UK Days', uk('2026-09-18') !== 'null');
check('sección desaparece cuando no quedan días', !/Días en Excel sin historial/.test(histHTML()));

// ── AC-7: "Cargando…" en UK Days (simulación de nube)
const ukHTML = () => ctx.document.getElementById('ukdays-body').innerHTML;
const ukCount = () => ctx.document.getElementById('ukdays-count').textContent;
reset(); paste(UKD); ls.set('easylog_mode', 'cloud'); run('cloud.hydrated = false; cloud.loadError = false; renderUKDays()');
check('nube sin hidratar: "Cargando…" y contador "… / 91"', /Cargando…/.test(ukHTML()) && ukCount() === '… / 91', ukCount());
run('cloud.loadError = true; renderUKDays()');
check('nube con error de carga: "Sin conexión — UK Days no cargados"', /Sin conexión — UK Days no cargados/.test(ukHTML()));
run('cloud.hydrated = true; renderUKDays()');
check('nube hidratada: contenido real (1 / 91)', !/Cargando|Sin conexión/.test(ukHTML()) && ukCount().startsWith('1 / 91'), ukCount()); // 03-02: + "· P pend."
ls.set('easylog_mode', 'local'); run('cloud.hydrated = false; renderUKDays()');
check('modo local: sin "Cargando…" aunque hydrated=false', !/Cargando/.test(ukHTML()) && ukCount().startsWith('1 / 91'));
check('renderCalendar sin cambios (no menciona hydrated)', !/function renderCalendar\(\) \{[\s\S]{0,600}hydrated/.test(html));

console.log(fails ? `\n${fails} FALLO(S)` : `\nTODO OK${skips ? ` (${skips} SKIP)` : ''}`); process.exit(fails ? 1 : 0);
