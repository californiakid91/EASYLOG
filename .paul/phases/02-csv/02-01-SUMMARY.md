---
phase: 02-csv
plan: 01
subsystem: csv-export
tags: [pilotlog, crewlounge, csv, night, easa, delays, utc]

requires:
  - phase: 01-auditoria
    provides: esquema de importación validado (AUDIT.md), arnés node:vm, fixtures 01/90/91
provides:
  - CSV importable en PilotLog sin errores ni issues (DELAY, TIME_NIGHT, AC_ENGTYPE Jet)
  - Modelo temporal UTC por sector (sectorDayOffsets + sectorUTC) reutilizable en Fase 3
  - Noche EASA (sol < −6°) con sunAltitude NOAA
  - Arnés de regresión harness-csv.mjs con golden test contra HEAD
affects: [03-uk-days, 04-pistas]

tech-stack:
  added: []
  patterns:
    - "Helpers puros de tiempo por sector: sectorDayOffsets(flights) + sectorUTC(f, offset)"
    - "Golden test: <script> de git show HEAD:index.html vs actual en dos contextos vm"

key-files:
  created: [.paul/phases/02-csv/harness-csv.mjs]
  modified: [index.html]

key-decisions:
  - "Noche = EASA (licencia IAA): sol < −6°, no sunset+30 (UK CAA)"
  - "DELAY = un único código numérico, el de más minutos; todos los códigos+minutos en 1ª línea de FLIGHTLOG"
  - "PILOTLOG_DATE = fecha UTC de off-block"

duration: ~95min
started: 2026-10-03T15:30:00+01:00
completed: 2026-10-03T16:00:00+01:00
---

# Phase 2 Plan 01: CSV con esquema validado Summary

**El CSV de EasyLog importa en PilotLog con 0 errores/0 issues: DELAY de un código, TIME_NIGHT EASA (crepúsculo civil) en H:MM, AC_ENGTYPE Jet, todos los delays en notas y fechas UTC correctas en sectores post-medianoche.**

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Esquema de columnas | Pass | DELAY + TIME_NIGHT, sin TAG_DELAY, Jet; golden test: resto de columnas idénticas a HEAD en 01/90/91 |
| AC-2: DELAY único | Pass | 93 en FR2134/FR2135; 93A→93, RA nunca, empate→primero, sin tiempo=0 |
| AC-3: Delays en notas | Pass | "Delays: 93 0:40, 41 0:11" primera línea; sin DT/n; tiempo sin código → "?" |
| AC-4: TIME_NIGHT | Pass | 1:34 / 2:36; vacío sin coords u horas; 0:00 de día; aviso al descargar con IATA sin coordenadas |
| AC-5: Modelo temporal UTC | Pass | fixture 91 → duty+1; fixture 90 off duty / airborne-on duty+1; cadena con sector sin horas; primer sector vía STD |
| AC-6: Importación real | Pass | PRUEBA_E en CrewLounge: 2 registros, 0 errores, 0 issues; NIGHT 1:34 (Day 0:41) y 2:36; FR2134 TO DAY 1 + LDG NIGHT 1; DELAY 93 (RA) |

## Verification Results

- `node .paul/phases/02-csv/harness-csv.mjs` → 43 ✓ 0 ✗ (exit 0)
- Arneses previos: 01-auditoria run.mjs exit 0 · 01.1 harness-merge "TODO OK" · 01.2 harness-fecha "TODO OK"
- sunAltitude vs PyEphem (inicio de noche civil, 4 aeropuertos × 3 estaciones): máx 10 s
- **G6 /code-review** (agente en background): verified, sin hallazgos de corrección; 3 observaciones menores (fecha mal formada lanzaría RangeError — no alcanzable por el parser; heurística solo hacia delante; Jet intencionado)
- **G7 CRG:** ejecutado; risk 0.00, pero CRG no parsea JS embebido en HTML → no informativo
- **G8 /security-review:** limpio en código (showStatus usa textContent; formula injection preexistente y de impacto mínimo, el CSV va a PilotLog). Añadido *.xlsx y sidecars Windows a .gitignore (Excel Tax Year sin trackear en repo público)

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `index.html` | Modified | HEADER (TIME_NIGHT, DELAY), toRow(f, r, dayOffset), buildCSV con offsets por duty, parseDelays, sectorDayOffsets, sectorUTC, nightMinutes, minToHM, addDaysRaw, sunAltitude (NOAA) + isNightAt EASA, aviso de aeropuertos sin coordenadas; eliminados DELAY_CODES y sunTimes |
| `.paul/phases/02-csv/harness-csv.mjs` | Created | Regresión AC-1..AC-5 + golden test vs HEAD + `--out` para CSV de prueba |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Noche EASA (sol < −6°) | Licencia del usuario es IAA (EASA), no CAA | Cambia también TO/LDG día/noche; validado vs PyEphem |
| sunAltitude NOAA en vez de sunTimes | Error del algoritmo previo hasta 0,22° (~1-2 min); NOAA ≤10 s | Menos código, sin ambigüedad de ventana de día |
| Interpolación lineal (no círculo máximo) | Rutas europeas: diferencia < 1 min; menos complejidad (revisión Fable) | — |
| DELAY_CODES eliminado | El importer solo acepta el código numérico | −37 líneas |

## Deviations from Plan

| Type | Count | Impact |
|------|-------|--------|
| Spec change (aprobada por el usuario) | 1 | isNightAt estaba en DO NOT CHANGE; cambiado a EASA tras confirmar licencia IAA |
| Corrección de premisa | 1 | El plan decía que PRUEBA_C validó el valor de TIME_NIGHT; solo validó el formato. Valor validado ahora vs PyEphem + importación |

## Deferred Items

- Sectores ya importados en PilotLog con fecha antigua (post-medianoche) o sin NIGHT (todo lo importado antes de esta fase): no reimportar meses; comprobar con informe sobre export de PilotLog
- FLIGHTLOG > 250 chars: `Report:` se trunca (preexistente)
- Emails con sectores desordenados / salida antes de 00:00 con STD posterior: heurística no lo cubre

## Next Phase Readiness

**Ready:** sectorDayOffsets/sectorUTC listos para el bug H5 de UK Days (Fase 3); arnés reutilizable.
**Concerns:** el histórico ya importado en PilotLog no tiene TIME_NIGHT y puede tener fechas de sectores post-medianoche desplazadas.
**Blockers:** None

---
*Phase: 02-csv, Plan: 01*
*Completed: 2026-10-03*
