// Rutas y bases comunes de los tests (fase 6). Única fuente para tests/harness/* y tests/e2e/*.
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import http from 'node:http'; import { fileURLToPath } from 'node:url'; import { execFileSync } from 'node:child_process';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const INDEX_PATH = path.join(ROOT, 'index.html');
export const FIXTURES_DIR = path.join(ROOT, 'tests', 'fixtures');
export const GOLDEN_DIR = path.join(ROOT, 'tests', 'golden');
export const E2E_DIR = path.join(ROOT, 'tests', 'e2e');
export const TMP = os.tmpdir();
// e2e que necesitan Internet real (run-all --skip-net los excluye a propósito)
export const NET_TESTS = ['e2e-csp.mjs'];

// Fixtures anonimizadas (versionadas). Si falta una, es un FALLO, nunca un SKIP.
// OJO: la fecha de la fixture 01 (2026/09/18) tiene que caer dentro de UK_DAYS_START/END de index.html;
// cuando el año fiscal cambie (Fase 7) hay que volver a desplazarla (múltiplos de 7 días, en BST).
export function readFixture(prefix) {
  const f = fs.existsSync(FIXTURES_DIR) && fs.readdirSync(FIXTURES_DIR).find(x => x.startsWith(prefix) && x.endsWith('.txt'));
  if (!f) throw new Error(`Falta la fixture ${prefix}* en ${FIXTURES_DIR}`);
  return fs.readFileSync(path.join(FIXTURES_DIR, f), 'utf8');
}

// Commits base de los golden «versión anterior». La purga de historial del 2026-10-05 cambió los SHA:
// cbbbb44 → fa78eeb (index.html anterior a 04-02, sin pistas) y 33ae9b9 → 6cb4a5a (anterior a 05-01).
export const BASELINES = { preFase4: 'fa78eeb', preFase5: '6cb4a5a' };

// index.html de un commit base, con un error claro si falta (clon superficial u otra purga de historial)
export function indexAt(sha) {
  try { return execFileSync('git', ['-C', ROOT, 'show', `${sha}:index.html`], { stdio: ['ignore', 'pipe', 'pipe'] }).toString(); }
  catch { throw new Error(`Falta el commit base ${sha} (¿clon superficial o historial reescrito?). Trae el historial completo o actualiza BASELINES en tests/lib.mjs.`); }
}

// ── e2e ──
// «Ahora» fijo del navegador en los e2e sin Firebase (page/ctx.clock.setFixedTime): dentro de UK_DAYS_START/END,
// posterior a la fixture 01 (18/09/2026); ayer en Londres = 2026-10-04 → el calendario sembrado cubre todos los días pasados
// y el Excel no se bloquea. OJO Fase 7 (año fiscal dinámico): moverla junto con la fixture 01.
export const FIXED_NOW = '2026-10-05T12:00:00+01:00';

// playwright-core del repo (npm ci) + navegador ya instalado; error claro en vez de descargar nada.
// Import dinámico: los harness importan lib.mjs y no deben depender de node_modules.
export async function loadPlaywright() {
  let pw;
  try { pw = await import('playwright-core'); }
  catch { throw new Error('Falta playwright-core: ejecuta «npm ci» en la raíz del repo.'); }
  if (!fs.existsSync(pw.webkit.executablePath()))
    throw new Error(`Faltan los navegadores de Playwright (webkit) en ~/.cache/ms-playwright: ${pw.webkit.executablePath()}`);
  return pw;
}

// Vigilante propio de cada e2e: el SIGTERM del timeout de run-all lo captura Playwright (cierra WebKit, no sale);
// si el test se cuelga en otra cosa, esto lo termina con FAIL antes del timeout del runner (240 s). unref → no retiene el proceso.
export function watchdog(ms = 220000) {
  setTimeout(() => { console.log(`FAIL  watchdog: el e2e no terminó en ${ms / 1000} s`); process.exit(1); }, ms).unref();
}

// Servidor local de la app: /EASYLOG/ → html (string o función, p. ej. variante sin CSP); /EASYLOG/<fichero> → fichero VERSIONADO del repo (vendor/…), nunca ocultos (.git/…) ni sin trackear.
// Puerto libre (0). Devuelve { url, close }.
// Solo ficheros versionados (como GitHub Pages): nunca los Excel Tax Year ni otros sin trackear de la carpeta (G8 Fase 6)
let _tracked = null;
const tracked = () => _tracked ??= new Set(execFileSync('git', ['-C', ROOT, 'ls-files', '-z']).toString().split('\0').filter(Boolean));
const TYPES = { '.js': 'application/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.html': 'text/html' };
export function serveRepo(html) {
  const srv = http.createServer((q, r) => {
    const u = new URL(q.url, 'http://x');
    if (u.pathname === '/EASYLOG/') { r.writeHead(200, { 'content-type': 'text/html' }); return r.end(typeof html === 'function' ? html() : html); }
    const rel = u.pathname.replace(/^\/EASYLOG\//, '');
    const f = path.join(ROOT, rel);
    if (u.pathname.startsWith('/EASYLOG/') && f.startsWith(ROOT + path.sep) && !rel.includes('..') && !rel.split('/').some(x => x.startsWith('.')) && tracked().has(rel) && fs.existsSync(f) && fs.statSync(f).isFile()) {
      r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); return r.end(fs.readFileSync(f));
    }
    r.writeHead(404); r.end();
  });
  return new Promise(res => srv.listen(0, '127.0.0.1', () => res({ url: `http://localhost:${srv.address().port}/EASYLOG/`, close: () => new Promise(c => srv.close(c)) })));
}
