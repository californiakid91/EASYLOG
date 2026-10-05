// Rutas y bases comunes de los tests (fase 6). Única fuente para tests/harness/* (y tests/e2e/* en 06-02).
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const INDEX_PATH = path.join(ROOT, 'index.html');
export const FIXTURES_DIR = path.join(ROOT, 'tests', 'fixtures');
export const GOLDEN_DIR = path.join(ROOT, 'tests', 'golden');

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
