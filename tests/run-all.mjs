// Runner único (fase 6): ejecuta cada *.mjs de un directorio en un proceso aparte y falla si alguno falla o se salta casos.
// Uso: node tests/run-all.mjs [directorio …] [--only patrón]   (por defecto tests/harness)
import fs from 'node:fs'; import path from 'node:path'; import { spawnSync } from 'node:child_process';
import { ROOT } from './lib.mjs';

const args = process.argv.slice(2);
const oi = args.indexOf('--only');
const only = oi > -1 ? args.splice(oi, 2)[1] : null;
const dirs = (args.length ? args : ['tests/harness']).map(d => path.resolve(ROOT, d));

const files = dirs.flatMap(d => fs.readdirSync(d).filter(f => f.endsWith('.mjs')).sort().map(f => path.join(d, f)))
  .filter(f => !only || path.basename(f).includes(only));
if (!files.length) { console.error('run-all: no hay tests que ejecutar'); process.exit(1); }

const t0 = Date.now(); const bad = [];
for (const f of files) {
  const t = Date.now();
  const r = spawnSync(process.execPath, [f], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const out = (r.stdout || '') + (r.stderr || '');
  const checks = (out.match(/^\s*(PASS|FAIL|✓|✗)/gm) || []).length;
  const skipped = /^\s*SKIP\b/m.test(out);
  const okRun = r.status === 0 && !skipped;
  const why = r.status !== 0 ? `exit ${r.status ?? r.signal}` : skipped ? 'SKIP' : '';
  console.log(`${okRun ? '✓' : '✗'} ${path.relative(ROOT, f).padEnd(40)} ${String(checks).padStart(4)} checks ${String(Date.now() - t).padStart(6)} ms${why ? '  ← ' + why : ''}`);
  if (!okRun) bad.push({ f, out });
}
for (const { f, out } of bad) console.log(`\n──── ${path.relative(ROOT, f)} ────\n${out}`);
console.log(`\n${files.length - bad.length}/${files.length} OK en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
process.exit(bad.length ? 1 : 0);
