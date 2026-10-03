# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-10-03)

**Core value:** Pego el email del vuelo y obtengo sin errores logbook PilotLog, Excel Tax Year y UK Days.
**Current focus:** v0.1 Datos fiables — botón fecha UK Days (quick-fix), luego Phase 2 (CSV)

## Current Position

Milestone: v0.1 Datos fiables
Phase: 1.2 [INSERTED] (Botón fecha manual UK Days) — Planning
Plan: 01.2-01 created, awaiting approval
Status: PLAN created, ready for APPLY
Last activity: 2026-10-03 15:05 — Phase 1.1 complete, verificado en iPhone

Progress:
- Milestone: [██░░░░░░░░] 25%
- Phase 2: [░░░░░░░░░░] 0%

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ○        ○     [Plan created, awaiting approval]
```

## Accumulated Context

### Decisions
- Arnés node:vm sobre index.html real = base de tests de regresión (fases 2-3)
- UK Day = on-block último vuelo < 00:00 hora Londres (sin exigir aeropuerto UK)
- Pistas: sin secretos en cliente; fuente por dialéctica en fase 4
- Fixtures con nombres de tripulación → gitignored
- Escrituras a nube con mergeFields + guard hidratación (ignora fromCache); last-write-wins por campo aceptado

### Deferred Issues
| Issue | Origin | Effort | Revisit |
|-------|--------|--------|---------|
| Landing ausente en el CSV habitual del usuario (con PRUEBA_C sí importa) — pedido el CSV original | Phase 1 | S | Fase 2 |
| removeDay no borra UK Day; día en _excelData imborrable si historial limpiado (18/09 espurio, día de SIM) | Phase 1 | S | Fase 3 |
| Fecha PILOTLOG_DATE de sectores post-medianoche | Phase 1 | S | Fase 2 |
| Petición usuario: botón "📅 Añadir otra fecha" (date picker) en UK Days en vez de recordar el comando de texto | Phase 1.1 | S | Quick-fix justo tras cerrar 1.1 |

### Blockers/Concerns
- Ninguno: esquema de importación validado con el usuario (AUDIT.md, 'Esquema de importación validado')

### Git State
Last commit: (ver git log — feat(01-auditoria))
Branch: main

## Session Continuity

Last session: 2026-10-03
Stopped at: Phase 1.1 complete (deploy 7b922f7 verificado por usuario)
Next action: aprobar y /paul:apply .paul/phases/01.2-ukdays-fecha-manual/01.2-01-PLAN.md
Resume file: .paul/phases/01.1-borrados-nube/01.1-01-SUMMARY.md

---
*STATE.md — Updated after every significant action*
