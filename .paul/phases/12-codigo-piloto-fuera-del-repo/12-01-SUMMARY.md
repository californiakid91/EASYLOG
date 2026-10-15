---
phase: 12-codigo-piloto-fuera-del-repo
plan: 01
subsystem: privacy
tags: [settings, csv, pilotlog, git-hooks, tests]
requires:
  - phase: 07-anio-fiscal
    provides: _settings persistido (local + campo Firestore 'settings')
  - phase: 09-safety-pilot
    provides: detectSafetyPilot y filas CSV SP
provides:
  - settings.pilotCode + myCode() en lugar de literales
  - CREWLIST y fila NAME del Excel con el nombre del email
  - hooks pre-commit/commit-msg con lista privada local (.private-words)
  - comparación permanente viejo-contra-nuevo del CSV (BASELINES.preFase12)
affects: [csv, excel, safety-pilot, tests, hooks]
key-files:
  created: [tests/harness/harness-pilotcode.mjs, .githooks/commit-msg, .githooks/private-words-exempt]
  modified: [index.html, tests/lib.mjs, tests/harness/*.mjs, tests/fixtures/*.txt, tests/golden/*.csv, .githooks/pre-commit, .gitignore, REGLAS_EXCEL_TAX_YEAR.md, .paul/PROJECT.md, .paul/STATE.md]
key-decisions:
  - "Nombre de la fila NAME = el de la línea propia del email (usuario 2026-10-15); no se guarda en settings"
  - "Sin botón para cambiar el código: se corrige desde el confirm de AC-2 (Fable #12, sobreingeniería)"
  - "askPilotCode devuelve {code, saved, blocked}: blocked = nube no lista → no se pisa su aviso"
patterns-established:
  - "Tests con código/nombre sintéticos (TEST_PILOT/TEST_PILOT_NAME); index viejos vía legacyAsTest()"
  - "Nada personal en el repo: .private-words local + hooks; los ficheros históricos exentos son una lista fija"
duration: ~2h
started: 2026-10-15T10:20:00+01:00
completed: 2026-10-15T13:00:00+01:00
---

# Fase 12 Plan 01: Código de piloto fuera del repo público — Summary

**El código de tripulante es un ajuste del usuario (se pide una vez), el nombre sale del email, el CSV de PilotLog es idéntico byte a byte y unos hooks locales impiden volver a commitear datos personales.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~2 h |
| Tasks | 3 de 3 + checkpoint en producción |
| Files modified | 37 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Se pide una vez al pegar | Pass | Sugerencia del FO con su línea si hay 1 CP + 1 FO; requireHydrated antes y después; fallo de guardado → se usa y se avisa (harness-pilotcode + prod) |
| AC-2: El código tiene que salir en la tripulación | Pass | confirm «¿Cambiar el código?»; sin Flight Deck Crew → como antes |
| AC-3: El CSV no cambia | Pass | 5 fixtures × FO/CPT/SP idénticas a preFase12 (mutación detectada: 15 fallos); emails reales 6/6 byte a byte + SP igual (script fuera del repo) |
| AC-4: Exportar sin código | Pass | Prompt sin sugerencia; Cancelar = no descarga; buildCSV/toRow lanzan sin código |
| AC-5: Fila NAME del Excel | Pass | Línea propia del día más reciente del año; vacía si no hay |
| AC-6: Logout / cambio de modo | Pass | `_settings = {}` → se pide de nuevo en el otro modo |
| AC-7: Nada personal hacia adelante | Pass | Árbol vivo limpio con la lista privada; hooks probados en clon desechable; página de prod sin palabras privadas; tests 24/24 y 20/20 (--now=2027-06-01) |

## Accomplishments

- `PILOT_CODE_RE`, `myCode()`, `askPilotCode()`, `exportCode()`, `pilotNameFor(ty)`; `toRow/buildCSV/detectSafetyPilot` reciben el código.
- CREWLIST: la línea propia al final con el nombre del email (o `SELF` sin línea).
- Tests con datos sintéticos; harness-csv compara siempre contra el index de antes de la fase; nuevo harness-pilotcode (37 checks).
- `.githooks/pre-commit` y `commit-msg`: bloquean palabras de `.private-words` en contenido staged, renombrados y nombres de fichero no-ASCII, y en el mensaje; muestran solo fichero:línea.

## Task Commits

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Plan | `30f53e6` | docs | Plan revisado por Fable |
| Tasks 1-3 | `d18ee1e` | feat | App + tests + hooks + docs vivos |
| G6 | `1517094` | fix | Hooks -z/no-ASCII, líneas vacías, errores de grep; flag `blocked` |

## Review arms

- **G6 (Fable, background):** sin bugs de corrección en la app. Arreglados: rutas no-ASCII en el hook, líneas en blanco en la lista, `|| true` que tragaba errores, aviso de nube no lista tapado.
- **G7 (CRG):** riesgo 0,40, informativo (CRG no parsea el JS embebido).
- **G8 (/security-review, Fable):** sin vulnerabilidades reales. `pilotCode` de la nube siempre revalidado por `myCode()`; nombre/código solo a prompt/confirm/textContent; hooks sin inyección ni fuga (solo fichero:línea, fail-closed). BAJA diferidas: exentos sin control de palabras nuevas; la lista de exentos es pública. BAJA preexistente: fórmulas CSV (ya diferida en 09 G8).

## Deviations from Plan

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 4 (G6) | Endurecen los hooks; la app no cambia de comportamiento |
| Scope additions | 0 | — |
| Deferred | 3 | Menores, abajo |

### Deferred Items
- La sugerencia del prompt asume FO aunque el rol marcado sea CPT (hoy siempre FO).
- El aviso «No se ha podido guardar tu código» lo tapa luego el OK del pegado (se vuelve a pedir; sin pérdida).
- CREWLIST cambia si el email escribe el nombre con otra grafía o sale `SELF` sin tripulación (aceptado en el plan).

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| Los harness con index de fases anteriores llevaban el literal viejo | `legacyAsTest()` lo sustituye en memoria |
| Reset de `_settings` en harness borraba el código | Sembrar `pilotCode` también en resets y docs falsos de la nube |

## Next Phase Readiness

**Ready:** v0.3 con 4/4 fases → cierre de milestone.

**Concerns:** Verificar en el iPhone con la nube: se pide el código una vez y el primer CSV importa en PilotLog como siempre.

**Blockers:** Ninguno.

---
*Phase: 12-codigo-piloto-fuera-del-repo, Plan: 01*
*Completed: 2026-10-15*
