---
phase: 06-barrera-tests
plan: 01
subsystem: testing
tags: [node-vm, golden, fixtures, runner, pilotlog-importer]

requires:
  - phase: 01-05
    provides: los 12 harness node:vm sobre index.html real
provides:
  - tests/ con lib común, fixtures anonimizadas versionadas, golden de CSV y de cabeceras del importer
  - runner único `node tests/run-all.mjs` (12/12, 1,3 s, funciona en clon limpio)
  - harness-runways vuelve a ejecutar sus checks (base fa78eeb tras la purga)
affects: [06-02 (gate + e2e), 07 (fecha de la fixture 01 ligada a UK_DAYS_START/END)]

tech-stack:
  added: []
  patterns:
    - "Rutas de tests solo desde tests/lib.mjs (ROOT, INDEX_PATH, FIXTURES_DIR, GOLDEN_DIR, BASELINES, indexAt)"
    - "Golden de caracterización: cambios legítimos → --update-golden + revisar diff de tests/golden en el commit"
    - "Falta de fixture = fallo; el runner marca ✗ con exit≠0, SKIP, línea FAIL/✗ o 0 checks"

key-files:
  created: [tests/lib.mjs, tests/run-all.mjs, tests/fixtures/*.txt, tests/golden/*, .gitattributes]
  modified: [tests/harness/*.mjs (movidos desde .paul/phases), .paul/phases/01-auditoria/harness/run.mjs]

key-decisions:
  - "Fixture 01: fecha −14 días (no −364: saldría de UK_DAYS_START/END) — Fable"
  - "La lista del importer son 115 cabeceras (página oficial), no 120"
  - "Golden absoluto en fichero sustituye a la comparación con git HEAD"

duration: ~2h (21:50–22:40, más la planificación previa)
completed: 2026-10-05T22:45:00+01:00
---

# Fase 6, plan 01: barrera de tests portable — resumen

**Hay un único comando, `node tests/run-all.mjs`, que ejecuta los 12 harness en 1,3 s.**
- Las fixtures son emails anonimizados y versionados.
- El CSV se compara celda a celda con un golden absoluto, y sus cabeceras con la lista oficial del importer de PilotLog.
- Funciona en un clon limpio, sin ficheros privados.
- harness-runways vuelve a ejecutarse: estaba roto desde la purga del historial.

## Resultados

| Métrica | Valor |
|--------|-------|
| Tareas | 3 automáticas + 1 checkpoint (fixtures aprobadas por el usuario) |
| Harness | 12/12 en 1,3 s (435 checks); también desde `/` y en clon limpio |
| Commits | efa0c4a, c51a5a1, 9a96bbe, 3b89fc7, 1cc9e3c (+ docs a71dc24, c9709c3) |

## Criterios de aceptación

| Criterio | Estado | Notas |
|-----------|--------|-------|
| AC-1: Fixtures anonimizadas y versionadas | Pass | El anon-check solo da diferencias permitidas. TO/LDG noche y día son idénticos. Cero identificadores del capitán, matrícula o vuelo reales en tests/. El usuario las aprobó |
| AC-2: Golden de cabeceras y CSV | Pass | Comprueba que cabeceras ⊂ lista del importer (115) y el CSV celda a celda contra csv-NN.csv. Ya no compara con HEAD. Existe `--update-golden` |
| AC-3: Harness en tests/ sin rutas absolutas ni casos saltados | Pass | Todo sale de lib.mjs. harness-runways: 70 checks con fa78eeb. Si falta una fixture, csv y ukdays salen con exit 1 |
| AC-4: Runner único | Pass | El mutante TIME_DEPSCH→TIME_DEPSCHED da exit 1 («no aceptadas por el importer»). El mutante OPERATOR da exit 1 («FR9134.OPERATOR …»). Al revertir, exit 0 |

## Qué se ha hecho

- `tests/fixtures/`: copias anonimizadas de los 3 emails de la auditoría.
  - Capitán ficticio TSTCAP / ALEX EXAMPLE, también en «Verified By» y en T/O-LDG.
  - El nombre del usuario en el email pasa a FIRST OFFICER. El código VEGRIC se mantiene, porque la app decide con él.
  - Vuelos FR9134/FR9135, matrícula 9HZZA y comentarios neutros.
  - 01: 18/09/2026. 90 y 91 conservan sus fechas sintéticas.
- `tests/golden/`:
  - pilotlog-importer-headers.txt: 115 nombres, con la fuente en la primera línea.
  - csv-01/90/91.csv: salida de buildCSV, rol FO.
- `tests/lib.mjs`:
  - rutas comunes;
  - readFixture, que lanza un error si falta la fixture;
  - BASELINES (preFase4 fa78eeb, preFase5 6cb4a5a), con el mapeo de la purga;
  - indexAt, con un mensaje claro si falta el commit base.
- `tests/run-all.mjs`: lanza cada *.mjs en su propio proceso. Admite `[dir…]` y `--only` / `--only=`, y sale con exit 2 si los argumentos son incorrectos.
- `.gitattributes`: golden y fixtures con `-text`, porque los saltos de línea son mixtos a propósito (CRLF entre filas, LF dentro de FLIGHTLOG).

## Verificación

- `node tests/run-all.mjs` → 12/12 OK, exit 0. También desde `/`.
- Clon limpio: `git clone . <scratch>/elclone`, sin `.paul/phases/01-auditoria/harness/fixtures` → 12/12, exit 0.
- Mutantes A (cabecera) y B (celda) → exit 1, nombrando la columna. `git diff --quiet index.html` tras revertir.
- Sin fixture 91 → harness-csv y harness-ukdays ✗ (10/12).
- `--update-golden` → aviso de que no comprueba nada; regenera byte a byte idéntico (cmp).

## Revisiones

- **G6 (/code-review sobre a71dc24..HEAD, en segundo plano):** 0 errores que falseen un resultado.
  - **Confirmados (4), todos corregidos en 1cc9e3c:**
    - `--only` sin patrón se ignoraba;
    - `--only=` y un directorio inexistente daban un stack trace;
    - un harness con exit 0 y 0 checks, o con líneas FAIL/✗, salía como ✓;
    - `--update-golden` se comparaba contra sí mismo.
  - **Plausibles (3), también corregidos:** `.gitattributes`, mensaje claro si falta un commit base, y comprobar las cabeceras de las 3 fixtures con el set en mayúsculas.
- **G7/G8:** se ejecutan una vez por fase, en la transición, al cerrar 06-02.

## Desviaciones

| # | Desviación | Motivo | Impacto |
|---|-----------|--------|---------|
| 1 | La lista del importer tiene 115 cabeceras, no 120 | El «120» venía del resumen automático de WebFetch. La tabla de la página (curl directo) tiene 115 nombres únicos. Las 40 de HEADER están dentro | Ninguno: la comprobación usa la lista real |
| 2 | TIME_NIGHT de FR9134 re-basado 1:35 → 1:15 (harness-csv) | Fecha anonimizada 14 días antes, con más luz. FR9135 sin cambio | Previsto en el plan |
| 3 | FLIGHTLOG también es columna permitida en el anon-check | Incluye el texto de «Captain Remarks», que ahora es ficticio | Ninguno |
| 4 | «Reason For Extra Fuel» no se neutralizó | Es un código operativo genérico (no personal). Se lo dije al usuario en el checkpoint | Ninguno |
| 5 | El anon-check también cuenta el nombre del usuario (golden y harness antiguos) y la fecha 02/10/2026 (harness-ukdays-rules, emails sintéticos) | Ya estaban en el repo. La app escribe el nombre en CREWLIST (index.html:1109) | Depende de la pregunta pendiente sobre sacar el código y el nombre del repo |
| 6 | El commit a71dc24 solo incluyó el handoff archivado | Un `git add` con una ruta inexistente abortó sin aviso (2>/dev/null) | PLAN, revisión de Fable y STATE commiteados en c9709c3 |
| 7 | harness-runways y harness-seguridad también fallan con los mutantes | Comparan la cabecera y el CSV contra la versión anterior | Positivo |

## Pendiente (no bloquea)

- Los helpers duplicados entre harness (load/check/extract) siguen copiados en cada fichero. Es la deuda D6 / F-06-006.
- Las rutas antiguas de los harness en SUMMARY y handoffs anteriores se quedan como están (es histórico).

## Para el plan 06-02

**Listo:**
- runner con directorio como argumento, para añadir `tests/e2e`;
- lib.mjs con INDEX_PATH, FIXTURES_DIR y BASELINES;
- fixture 01 anonimizada para las e2e.

**Cuidado:**
- la fecha de la fixture 01 depende de UK_DAYS_START/END: hay que volver a desplazarla cuando la Fase 7 haga dinámico el año fiscal;
- las e2e usan playwright-core de ~/manuales-motos, rutas absolutas y la fixture real: esto se resuelve en 06-02.

**Bloqueantes:** ninguno.

---
*Fase: 06-barrera-tests, plan: 01 · Completado: 2026-10-05*
