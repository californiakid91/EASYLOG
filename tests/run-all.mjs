// Runner único (fase 6): ejecuta cada *.mjs de un directorio en un proceso aparte y falla si alguno falla o se salta casos.
// Uso: node tests/run-all.mjs [directorio …] [--only patrón] [--skip-net] [--now=<ISO>]   (por defecto tests/harness)
// --skip-net excluye los e2e que necesitan Internet (NET_TESTS de lib.mjs) y lo dice en el resumen.
// --now=<ISO> simula el reloj del sistema en cada test (preload tests/fake-now.mjs): los tests no deben depender del año real.
// ✗ si: exit ≠ 0, alguna línea SKIP, alguna línea FAIL/✗, o 0 checks.
import fs from 'node:fs'; import path from 'node:path'; import { spawnSync } from 'node:child_process'; import { pathToFileURL } from 'node:url';
import { ROOT, NET_TESTS } from './lib.mjs';

const die = m => { console.error('run-all: ' + m); process.exit(2); };
const args = process.argv.slice(2);
let only = null;
const si = args.indexOf('--skip-net');
const skipNet = si > -1; if (skipNet) args.splice(si, 1);
const eq = args.findIndex(a => a.startsWith('--only='));
if (eq > -1) only = args.splice(eq, 1)[0].slice(7);
const oi = args.indexOf('--only');
if (oi > -1) { only = args[oi + 1]; args.splice(oi, 2); }
if (only !== null && !only) die('--only necesita un patrón');
const ni = args.findIndex(a => a.startsWith('--now='));
const fakeNow = ni > -1 ? args.splice(ni, 1)[0].slice(6) : null;
if (fakeNow !== null && Number.isNaN(new Date(fakeNow).getTime())) die(`--now no es una fecha válida: ${fakeNow}`);
const env = fakeNow ? { ...process.env, EASYLOG_TEST_NOW: fakeNow,
  NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --import=${pathToFileURL(path.join(ROOT, 'tests', 'fake-now.mjs')).href}`.trim() } : process.env;
const unknown = args.find(a => a.startsWith('--'));
if (unknown) die(`opción desconocida ${unknown}`);
const dirs = (args.length ? args : ['tests/harness']).map(d => path.resolve(ROOT, d));
for (const d of dirs) if (!fs.existsSync(d) || !fs.statSync(d).isDirectory()) die(`no existe el directorio ${path.relative(ROOT, d) || d}`);

const all = dirs.flatMap(d => fs.readdirSync(d).filter(f => f.endsWith('.mjs')).sort().map(f => path.join(d, f)))
  .filter(f => !only || path.basename(f).includes(only));
const excluded = skipNet ? all.filter(f => NET_TESTS.includes(path.basename(f))) : [];
const files = all.filter(f => !excluded.includes(f));
if (!files.length) { console.error('run-all: no hay tests que ejecutar'); process.exit(1); }

const t0 = Date.now(); const bad = [];
for (const f of files) {
  const t = Date.now();
  // timeout → SIGTERM (playwright cierra WebKit con ella; no SIGKILL, dejaría el navegador huérfano)
  const timeout = path.basename(path.dirname(f)) === 'e2e' ? 240000 : 60000;
  const r = spawnSync(process.execPath, [f], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout, env });
  const timedOut = r.error?.code === 'ETIMEDOUT';
  const out = (r.stdout || '') + (r.stderr || '');
  const checks = (out.match(/^\s*(PASS|FAIL|✓|✗)/gm) || []).length;
  const skipped = /^\s*SKIP\b/m.test(out);
  const failLine = /^\s*(FAIL|✗)/m.test(out);
  const okRun = !timedOut && r.status === 0 && !skipped && !failLine && checks > 0;
  const why = timedOut ? `timeout ${timeout / 1000} s` : r.status !== 0 ? `exit ${r.status ?? r.signal}` : skipped ? 'SKIP' : failLine ? 'línea FAIL/✗ con exit 0' : checks === 0 ? '0 checks' : '';
  console.log(`${okRun ? '✓' : '✗'} ${path.relative(ROOT, f).padEnd(40)} ${String(checks).padStart(4)} checks ${String(Date.now() - t).padStart(6)} ms${why ? '  ← ' + why : ''}`);
  if (!okRun) bad.push({ f, out });
}
for (const { f, out } of bad) console.log(`\n──── ${path.relative(ROOT, f)} ────\n${out}`);
for (const f of excluded) console.log(`\nexcluido: ${path.basename(f, '.mjs')} (red, --skip-net)`);
console.log(`\n${files.length - bad.length}/${files.length} OK en ${((Date.now() - t0) / 1000).toFixed(1)} s${fakeNow ? ` (reloj simulado: ${fakeNow})` : ''}`);
process.exit(bad.length ? 1 : 0);
