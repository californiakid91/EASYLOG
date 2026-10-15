---
phase: 13-sby-y-dias-sin-vuelo
plan: 01
subsystem: ukdays-excel
tags: [uk-days, excel-tax-year, calendario, sby, sim, uw]
requires:
  - phase: 03.2
    provides: U/UW del Excel desde UK Days, pendientes con botones UK/No UK
provides:
  - SBY + email por la regla del email (sin conflicto)
  - SIM/SD sin email = pendiente cal-ask (el usuario decide)
  - UW de días sin vuelos por el día anterior (SBY = 1)
affects: [14-mismo-vuelo-otra-fecha]
key-files:
  created: [tests/harness/harness-sby-uw.mjs]
  modified: [index.html, REGLAS_EXCEL_TAX_YEAR.md, tests/harness/harness-excel-u.mjs, tests/harness/harness-ukdays-rules.mjs]
key-decisions:
  - "SBY activado (email) → manda R1/R2/R3; OFF/SIM/SD + email siguen en conflicto"
  - "SIM/SD sin email → pendiente siempre, todo 2026/27 (usuario)"
  - "UW sin vuelos: SBY 1; SIM/SD/DUTY = día anterior UK (1) / No UK (vacío) / otro ('?')"
patterns-established:
  - "Reglas de calendario solo al leer (ukDayStatus/excelRowsForDay); nunca migración de datos guardados"
completed: 2026-10-15
duration: ~1 sesión
---

# Phase 13 Plan 01: SBY con email, SIM/SD preguntados y UW sin vuelos — Summary

**UK Days aplica la regla del email a los SBY activados, pregunta los SIM/SD (pueden ser fuera de base) y el Excel calcula UW de días sin vuelos según dónde acabó el día anterior; desplegado (prod 2026.10.15-222246) y verificado con el Excel real del usuario.**

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: SBY activado → manda el email | Pass | R1/R2, email incompleto y marca manual previa (confirm cancelado) cubiertos en harness-sby-uw |
| AC-2: OFF/SIM/SD + email siguen siendo conflicto | Pass | 3 checks |
| AC-3: SIM/SD sin email → pendiente | Pass | pendiente cal-ask, botones, texto de ayuda, Excel bloqueado/liberado, motivo legible, futuro no bloquea |
| AC-4: UW de días sin vuelos | Pass | SBY, día anterior UK/No UK/pendiente, 06/04, OFF, UK manual sin calendario, días con vuelos sin cambio |
| AC-5: nada más cambia | Pass | 25/25 harness+e2e; 21/21 con --now=2027-06-01; golden CSV intacto |

## Verification

- `node tests/run-all.mjs tests/harness tests/e2e` → 25/25 OK (harness-sby-uw: 37 checks)
- `node tests/run-all.mjs --now=2027-06-01T12:00:00Z tests/harness` → 21/21 OK
- Golden CSV sin `--update-golden`; comparación preFase12 en verde
- Push con gate pre-push (harness + e2e-csp 24 checks); `curl … | grep APP_VERSION` = 2026.10.15-222246
- Checkpoint usuario (iPhone): UK Days carga con las mismas cifras de la revisión del 14/10 (ningún SIM/SD quedó sin decidir: ya tenían marca manual). Excel 2026-27 real leído con SheetJS: todas las filas SBY/SIM/SD/DUTY sin vuelos cumplen la regla UW; '?' solo en U de hoy/futuro.

## Review arms

- G6 /code-review (sonnet, background): VEREDICTO LIMPIO. Menores: test añadido (DUTY tras SBY «No UK» → UW vacío); resto informativo.
- G7 CRG (hook en commit): risk 0.40; test gaps = mocks de los harness (CRG no parsea el JS embebido → no informativo).
- G8 /security-review (sonnet): SIN VULNERABILIDADES. Defensa en profundidad: _dayMap no se filtra con CAL_STATES al hidratar (hoy seguro por comparaciones estrictas) → diferido.
- Revisión adversaria del plan (Fable): 2 bloqueantes + 5 importantes corregidos ANTES de APPLY (posición de cal-ask tras `if (e)`, caso 06/04, motivo legible, texto de ayuda, aviso del contador, confirm en año congelado, stub de confirm).

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1-3 | `da202b9` | ukDayStatus, ukReasonText, ukDecidePending (año congelado), excelUWPrevDay, REGLAS, tests |

## Deviations from Plan

- harness-ukfuera no necesitó cambios (el SIM tiene marca manual). Sin otras desviaciones.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| Primera apertura en el iPhone: «Sin conexión — UK Days no cargados» | Snapshot solo de caché (cobertura). Reabrir la app → cargó. No relacionado con el cambio |
| Excel: DUTY sin vuelos en un día que tuvo vuelos (UW vacío) | Dato: falta pegar el email de ese día; con el email, UW sale del primer sector. Se le indicó al usuario |

## Deferred

- (usuario) Pegar emails que faltan en días DUTY del Excel que fueron de vuelo; revisar con el roster.
- G6: SBY + email en año congelado sin entrada → «email incompleto» (mismo caso que el diferido 07-01 G6).

## Next Phase Readiness

**Ready:** Fase 14 (mismo vuelo pegado con otra fecha). **Blockers:** ninguno.

---
*Phase: 13-sby-y-dias-sin-vuelo, Plan: 01 — Completed: 2026-10-15*
