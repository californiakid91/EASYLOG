# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-10-03)

**Core value:** Pego el email del vuelo y obtengo sin errores logbook PilotLog, Excel Tax Year y UK Days.
**Current focus:** v0.1 Datos fiables — Phase 2 (CSV)

## Current Position

Milestone: v0.1 Datos fiables
Phase: 1.2 [INSERTED] complete → next: Phase 2 (CSV)
Plan: 01.2-01 complete
Status: Ready to plan Phase 2
Last activity: 2026-10-03 15:21 — Phase 1.2 complete (botón + Añadir fecha), verificado en iPhone

Progress:
- Milestone: [██░░░░░░░░] 25%
- Phase 2: [░░░░░░░░░░] 0%

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
- Escrituras a nube con mergeFields + guard hidratación (ignora fromCache); last-write-wins por campo aceptado

### Deferred Issues
| Issue | Origin | Effort | Revisit |
|-------|--------|--------|---------|
| Landing ausente en el CSV habitual del usuario (con PRUEBA_C sí importa) — pedido el CSV original | Phase 1 | S | Fase 2 |
| removeDay no borra UK Day; día en _excelData imborrable si historial limpiado (18/09 espurio, día de SIM) | Phase 1 | S | Fase 3 |
| Fecha PILOTLOG_DATE de sectores post-medianoche | Phase 1 | S | Fase 2 |
| UX: UK Days y calendario se ven vacíos durante la carga de la nube (usuario se alarmó: "han desaparecido") → mostrar "Cargando…" mientras !cloud.hydrated | Phase 1.2 | S | Fase 3 |

### Blockers/Concerns
- Ninguno: esquema de importación validado con el usuario (AUDIT.md, 'Esquema de importación validado')

### Git State
Last commit: (ver git log — feat(01-auditoria))
Branch: main

## Session Continuity

Last session: 2026-10-03
Stopped at: Phase 1.2 complete (deploy 70e0106 verificado por usuario)
Next action: /paul:plan Phase 2 (CSV: DELAY 1 código, TIME_NIGHT H:MM, ENGTYPE Jet, minutos delay a notas)
Resume file: .paul/HANDOFF-2026-10-03-fase1.2.md

---
*STATE.md — Updated after every significant action*
