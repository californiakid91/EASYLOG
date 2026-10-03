// Arnés de auditoría: ejecuta el <script> REAL de index.html en node:vm con un DOM falso.
// Uso: node run.mjs [fixture.txt ...]   (sin args → todos los fixtures)
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const INDEX = path.resolve(HERE, '../../../../index.html');
const html = fs.readFileSync(INDEX, 'utf8');
const m = html.match(/<script>\n([\s\S]*?)<\/script>\s*<\/body>/);
if (!m) throw new Error('No se encontró el <script> principal en index.html');
const SCRIPT = m[1];

// ── DOM falso: elementos con almacén de propiedades; cualquier método desconocido es no-op ──
function makeEl(id) {
  const store = { id, value: '', textContent: '', innerHTML: '', checked: false, dataset: {}, style: {} };
  const noop = () => proxy;
  const classList = { add() {}, remove() {}, toggle() { return false; }, contains() { return false; } };
  const proxy = new Proxy(store, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'classList') return classList;
      if (k === 'querySelectorAll') return () => [];
      if (k === 'closest' || k === 'querySelector') return () => null;
      if (typeof k === 'symbol') return undefined;
      return noop;
    },
    set(t, k, v) { t[k] = v; return true; },
  });
  return proxy;
}
const els = new Map();
const byId = id => { if (!els.has(id)) els.set(id, makeEl(id)); return els.get(id); };
const roleEl = makeEl('role'); roleEl.value = 'FO';
const document = {
  getElementById: byId,
  querySelector: sel => (sel.includes('name="role"') ? roleEl : byId('q:' + sel)),
  querySelectorAll: () => [],
  body: makeEl('body'),
  createElement: t => makeEl('new:' + t),
  addEventListener() {},
};
const ls = new Map();
const localStorage = {
  getItem: k => (ls.has(k) ? ls.get(k) : null),
  setItem: (k, v) => ls.set(k, String(v)),
  removeItem: k => ls.delete(k),
};
localStorage.setItem('easylog_mode', 'local'); // fuerza modo local (Firebase nunca se carga)

const statusLog = [];
const ctx = vm.createContext({
  document, localStorage, console,
  window: {}, navigator: { userAgent: 'node' }, location: { href: '' },
  confirm: () => true, prompt: () => null, alert: () => {},
  setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0,
  fetch: () => Promise.reject(new Error('sin red en arnés')),
  Date, Math, JSON, Promise, Intl,
});
vm.runInContext(SCRIPT, ctx, { filename: 'index.html<script>' });
// Captura mensajes de estado de la UI
vm.runInContext('showStatus = (type, msg) => __status.push(type + ": " + msg);', Object.assign(ctx, { __status: statusLog }));

const run = code => vm.runInContext(code, ctx);

function audit(file) {
  const text = fs.readFileSync(file, 'utf8');
  console.log('\n══════════ ' + path.basename(file) + ' ══════════');
  const { flights, warnings } = run(`parseText(${JSON.stringify(text)})`);
  if (warnings.length) console.log('Avisos parser:', warnings);
  const header = run('HEADER').split(';');
  console.log(`Columnas CSV: ${header.length}`);
  for (const role of ['FO']) {
    for (const f of flights) {
      ctx.__f = f;
      const row = run(`toRow(__f, ${JSON.stringify(role)})`);
      // separar respetando comillas
      const cells = []; let cur = '', q = false;
      for (let i = 0; i < row.length; i++) {
        const c = row[i];
        if (q) { if (c === '"' && row[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
        else if (c === '"') q = true; else if (c === ';') { cells.push(cur); cur = ''; } else cur += c;
      }
      cells.push(cur);
      console.log(`\n── ${f.d.FlightNumber} ${f.d['City Pair']} (${role}) ── campos parseados: ${Object.keys(f.d).length}`);
      header.forEach((h, i) => {
        const v = (cells[i] ?? '').replace(/\n/g, ' ⏎ ');
        console.log(`  ${h.padEnd(12)} = ${v.length > 110 ? v.slice(0, 110) + '…' : v}`);
      });
      // Estimación de TIME_NIGHT (prototipo del método propuesto, NO está en la app):
      // posición interpolada dep→arr minuto a minuto entre Off Block y On Block + isNightAt real.
      ctx.__f = f;
      const est = run(`(() => {
        const [dep, arr] = (__f.d['City Pair']||'').split(' - ');
        const a = resolveAirport(dep), b = resolveAirport(arr);
        let t0 = buildUTCDate(__f.date, __f.d['Off Block']), t1 = buildUTCDate(__f.date, __f.d['On Block']);
        if (!a || !b || !t0 || !t1) return 'sin datos';
        if (t1 < t0) t1 = new Date(t1.getTime() + 86400000);
        const n = Math.round((t1 - t0) / 60000); let night = 0;
        for (let i = 0; i < n; i++) {
          const k = (i + 0.5) / n;
          if (isNightAt(new Date(t0.getTime() + (i + 0.5) * 60000), a.lat + (b.lat - a.lat) * k, a.lon + (b.lon - a.lon) * k)) night++;
        }
        return night + ' de ' + n + ' min';
      })()`);
      console.log('  [estimado] TIME_NIGHT ≈ ' + est);
      console.log('  [raw] Take Off=' + JSON.stringify(f.d['Take Off']) + ' Landing=' + JSON.stringify(f.d['Landing']));
    }
  }
  // UK Days: ejecuta addDay() real sobre un estado limpio
  run('_cache = {}; _excelData = {}; _ukdays = {};');
  byId('input').value = text;
  statusLog.length = 0;
  run('addDay()');
  console.log('\nUK Day calculado por addDay():', JSON.stringify(run('_ukdays')));
  console.log('Estado UI:', statusLog.join(' | '));
}

const fixDir = path.join(HERE, 'fixtures');
const files = process.argv.slice(2).length
  ? process.argv.slice(2).map(f => path.resolve(f))
  : fs.readdirSync(fixDir).filter(f => f.endsWith('.txt')).sort().map(f => path.join(fixDir, f));
files.forEach(audit);
