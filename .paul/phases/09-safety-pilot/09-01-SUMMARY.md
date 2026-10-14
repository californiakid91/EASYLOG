---
phase: 09-safety-pilot
plan: 01
subsystem: csv-pilotlog
tags: [safety-pilot, pilotlog, csv, parser]

requires:
  - phase: 03.2-datos-coherentes
    provides: rol guardado por día que manda al re-pegar
  - phase: 08-sin-perdidas-silenciosas
    provides: requireHydrated antes y después de cada confirm
provides:
  - detectSafetyPilot(flights) por día
  - rol 'SP' (historial + Excel) con confirm al pegar un día nuevo
  - CSV SAFETY PILOT importable en PilotLog (0 errores, verificado con datos reales)
  - columnas PILOT3_ID/PILOT3_NAME al final del CSV
  - parser tolerante a tabuladores (emails de 2025)
affects: [10-ukdays-avisos-al-pegar, 11-limpieza-xs]

key-files:
  created: [tests/harness/harness-safety.mjs, tests/fixtures/92-SINTETICO-safety-pilot-dia-entero.txt, tests/fixtures/93-SINTETICO-tres-pilotos-a-los-mandos.txt]
  modified: [index.html, tests/lib.mjs, tests/harness/harness-runways.mjs, tests/harness/harness-seguridad.mjs, tests/e2e/e2e-runways.mjs, tests/golden/csv-01.csv, tests/golden/csv-90.csv, tests/golden/csv-91.csv]

key-decisions:
  - "SP = 3+ pilotos CP/FO y VEGRIC en ningún Take Off/Landing del día (criterio del usuario); nunca vuelo a vuelo"
  - "SP sin TIME_TO/TIME_LDG: PilotLog calcula AIR con ellas y rechaza AIR > TOTAL 0"
  - "Columnas nuevas siempre al final; los tests localizan columnas por nombre"

patterns-established:
  - "Tests de CSV: localizar columnas por nombre de cabecera, nunca por posición"
  - "Tras cualquier confirm en addDay: requireHydrated() y releer el historial (un snapshot pudo sustituirlo)"

duration: ~1h30
completed: 2026-10-14T15:30:00+01:00
---

# Phase 9 Plan 01: SAFETY PILOT al pegar — Summary

**Al pegar un día de 3 pilotos en el que VEGRIC no despega ni aterriza ningún vuelo, la app pregunta «¿Ibas de SAFETY PILOT?» y exporta esos vuelos como el usuario los apunta en PilotLog (total 0:00, Pilot 3 SELF, remarks «FRxxxx SAFETY PILOT»); verificado importando el 27/09/2025 real con 0 errores.**

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Detección por día | Pass | harness-safety: 92 → true; 93 (patrón real 12/10) → false; 2 pilotos, PF vacío (TO o LDG), VEGRIC en un Landing, tercero no-FO → false; email real 27/09/2025 → true |
| AC-2: Confirm al pegar, nunca en silencio | Pass | Aceptar → SP en historial y Excel; Cancelar → FO; CPT/93 no preguntan; nube desfasada o snapshot con el mismo día durante el confirm → no escribe; etiqueta SP en lista y «solo Excel». Visto en iPhone real |
| AC-3: Re-pegar respeta el rol | Pass | SP sigue SP, FO sigue FO, sin preguntar; nota «se mantiene SAFETY PILOT» |
| AC-4: CSV SP con el criterio del usuario | Pass | Literales estrictos; PILOT2 = FO que vuela cada sector (también con 4 en cabina); TIME_TO/TIME_LDG vacías (desviación, ver abajo); días FO/CPT == a4f135a salvo PILOT3_* vacías |
| AC-5: Nada más cambia | Pass | UK Day, computeUKDay y excelRowsForDay deep-equal SP vs FO; run-all 22/22 |
| AC-6: PilotLog lo importa | Pass | Import real 27/09/2025: 0 errores, avisos «TOTAL time is zero!» y «Function time is not logged» (esperados); capturas: total 0:00, OFF/ON vacíos, calzos 16:22–18:45 / 19:10–21:34, Pilot 1/2/3 = capitán / otro FO / SELF, remarks «FR2518/FR2517 SAFETY PILOT», pistas y delay correctos |

## Verification

- `node tests/harness/harness-safety.mjs` → 43 PASS (incluye 2 de formato con tabuladores y 2 de los arreglos G6)
- `node tests/run-all.mjs tests/harness tests/e2e` → 22/22 OK (gate pre-push en cada push)
- `git diff tests/golden/` → solo `;PILOT3_ID;PILOT3_NAME` en cabecera y `;;` al final de cada fila
- Producción: `2026.10.14-142413` verificada con curl

## Review arms

- **Fable adversarial (plan):** B1 (3 suites posicionales rotas por las columnas nuevas), B2 (contradicción PF vacío), I1–I5, M1–M3 → todos incorporados antes de APPLY
- **G6 (Fable, diff):** 2 hallazgos → arreglados: releer el historial tras el confirm (un snapshot de otro dispositivo se habría pisado) + etiqueta SP en «solo Excel»
- **G7 (CRG):** en cada commit, riesgo 0.40 (no informativo con JS embebido en index.html)
- **G8 (/security-review, sonnet):** sin vulnerabilidades. BAJA: fórmulas CSV (=,+,-,@) sin neutralizar también en PILOT2/REMARKS — mismo patrón preexistente que F-04-007 (monitor; CSV va a PilotLog, no a Excel). INFO: rol sin lista blanca al cargar de la nube (solo comparaciones literales, sin XSS) → sumado al diferido de validación en applyCloudData. Sin datos de terceros en el repo (fixtures sintéticas)

## Deviations from Plan

| Type | Count | Impact |
|------|-------|--------|
| Spec fix (checkpoint) | 1 | Esencial: sin él PilotLog rechazaba los vuelos SP |
| Auto-fixed (preexistente) | 1 | Esencial: los emails de 2025 no se podían pegar |
| G6 fixes | 2 | Robustez, sin cambio de alcance |

1. **TIME_TO/TIME_LDG vacías en SP** (fallo de especificación). El plan decía «iguales que un vuelo normal». En el import real, PilotLog calculó AIR (2:01) a partir de despegue/aterrizaje, vio AIR > TOTAL 0 y rechazó los 2 vuelos. Ahora van vacías y los calzos se mantienen (TOTAL 0 es solo aviso). Commit b9e9f80; AC-4 del plan actualizado.
2. **Parser con tabuladores** (bug preexistente, fuera del plan). Los emails de 2025 separan campos con tabuladores (`FlightNumber ⇥:⇥FR 2518`) y `startsWith('FlightNumber :')` no los reconocía → «No se encontraron vuelos». Tabuladores → espacios y `/^FlightNumber\s*:/`; CSV de los emails actuales idéntico (test). Commit 79f8357.

## Deferred Items

- Cambiar el rol de un día ya guardado desde la lista (hoy: borrar y re-pegar) — solo si hace falta
- Días SP guardados antes de esta fase no se reprocesan (no hay ninguno en la app)

## Next Phase Readiness

**Ready:** Fase 10 (avisos de UK Days al pegar) toca el mismo flujo `addDay`; patrón establecido: requireHydrated + releer historial tras cada confirm.
**Concerns:** ninguno nuevo.
**Blockers:** None

---
*Phase: 09-safety-pilot, Plan: 01 · Completed: 2026-10-14*
