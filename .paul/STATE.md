# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-10-03)

**Core value:** Pego el email del vuelo y obtengo sin errores logbook PilotLog, Excel Tax Year y UK Days.
**Current focus:** v0.1 Datos fiables — Phase 3 (UK Days)

## Current Position

Milestone: v0.1 Datos fiables
Phase: 3 of 4 (UK Days) — Not started
Plan: Not started
Status: Ready to plan
Last activity: 2026-10-04 — Revisión de datos fuera de PAUL (logbook vs plan de empresa, reglas UK Days); Fase 3 sin empezar

Progress:
- Milestone: [█████░░░░░] 50%
- Phase 3: [░░░░░░░░░░] 0%

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ✓     [Loop complete - ready for next PLAN]
```

## Accumulated Context

### Decisions
- Arnés node:vm sobre index.html real = base de tests de regresión (fases 2-3)
- UK Day = on-block último vuelo < 00:00 hora Londres (sin exigir aeropuerto UK)
- Pistas: sin secretos en cliente; fuente por dialéctica en fase 4
- Fixtures con nombres de tripulación → gitignored
- Deploy: GitHub Pages cachea 10 min → para probar al momento abrir en Safari con ?v=N
- Noche = regla EASA (licencia IAA del usuario): sol < −6° (crepúsculo civil), NO sunset+30 (UK CAA). sunAltitude NOAA validado vs PyEphem ≤10 s
- PILOTLOG_DATE = fecha UTC de off-block (sectores post-medianoche → día siguiente)
- Escrituras a nube con mergeFields + guard hidratación (ignora fromCache); last-write-wins por campo aceptado

### Deferred Issues
| Issue | Origin | Effort | Revisit |
|-------|--------|--------|---------|
| UK Days: el tracker usa reglas incompletas. Reglas reales (medianoche en UK, HSBY, INTSP/OOB, ida/vuelta VLC, lates desde 05/08/2025, UW = duty que EMPIEZA en UK) en memoria project_excel_tax_rules → base del diseño de Fase 3 | 2026-10-04 | M | Fase 3 |
| PilotLog: fichero de cambios 2025 entregado al usuario (fuera del repo); pendiente que lo aplique y re-exporte para re-verificar. 2024 y 2026 pendientes de sus planes | 2026-10-04 | S | — |
| removeDay no borra UK Day; día en _excelData imborrable si historial limpiado (18/09 espurio, día de SIM) | Phase 1 | S | Fase 3 |
| Histórico ya importado en PilotLog: sin NIGHT y posibles fechas post-medianoche → informe sobre export de PilotLog (no reimportar meses) | Phase 2 | S | antes de Fase 3 |
| FLIGHTLOG > 250 chars: Report se trunca (preexistente) | Phase 2 | S | — |
| semgrep: <script> CDN sin atributo integrity (SRI) en index.html:462 (preexistente) | Phase 2 | S | Aegis pre-deploy |
| UK Days: fin de periodo 2027-04-07 (index.html:643,1539,1641,1707,1717) → debe ser 2027-04-05 (tax year 6 abr–5 abr); el Excel ya usa 05-04 | Phase 2 | XS | Fase 3 |
| UK Days: reglas reales del usuario (medianoche en UK; HSBY activado; INTSP; ida/vuelta VLC en OFF/A/L) — ver memoria project_excel_tax_rules; reconstrucción por tax year desde el plan ROCS | Phase 2 | M | Fase 3 |
| UX: UK Days y calendario se ven vacíos durante la carga de la nube (usuario se alarmó: "han desaparecido") → mostrar "Cargando…" mientras !cloud.hydrated | Phase 1.2 | S | Fase 3 |

### Blockers/Concerns
- Ninguno. Nota: CRG (G7) no parsea JS embebido en index.html → su risk score no es informativo

### Git State
Last commit: add2d91 — pusheado y desplegado en GitHub Pages (verificado 2026-10-03)
Branch: main

## Session Continuity

Last session: 2026-10-03
Stopped at: Sesión 2026-10-04 de verificación de datos (fuera del loop) cerrada; código sin cambios
Next action: /paul:plan Phase 3 (UK Days) usando las reglas de memoria; antes, preguntar al usuario por sus pendientes personales (ver handoff)
Resume file: .paul/HANDOFF-2026-10-04-datos.md

---
*STATE.md — Updated after every significant action*
