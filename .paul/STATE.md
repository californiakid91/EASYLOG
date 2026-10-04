# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-10-03)

**Core value:** Pego el email del vuelo y obtengo sin errores logbook PilotLog, Excel Tax Year y UK Days.
**Current focus:** v0.1 Datos fiables — Phase 3 (UK Days)

## Current Position

Milestone: v0.1 Datos fiables
Phase: 3 of 4 (UK Days) — Planning
Plan: 03-02 created, awaiting approval
Status: PLAN created, ready for APPLY
Last activity: 2026-10-04 — Dialéctica (wf_78cb92df-f8c) + plan 03-02 revisado por Fable (aprobar con cambios → aplicados)

Progress:
- Milestone: [██████░░░░] 60%
- Phase 3: [█████░░░░░] 50%

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
- Deploy: GitHub Pages cachea 10 min → para probar al momento abrir en Safari con ?v=N
- Noche = regla EASA (licencia IAA del usuario): sol < −6° (crepúsculo civil), NO sunset+30 (UK CAA). sunAltitude NOAA validado vs PyEphem ≤10 s
- PILOTLOG_DATE = fecha UTC de off-block (sectores post-medianoche → día siguiente)
- Escrituras a nube con mergeFields + guard hidratación (ignora fromCache); last-write-wins por campo aceptado
- UK Day: computeUKDay tri-estado (último sector cronológico vía sectorUTC; sin On Block → no tocar); manual:true nunca se recalcula
- UK Days 03-02 (dialéctica + Fable): regla cerrada R1/R2/R3 exigiendo aterrizar en UK (sustituye "sin exigir aeropuerto UK"); estados uk/no con source/reason; calendario _dayMap como declaración de días sin email; P = pendientes pasados, alarma solo con N
- Días solo-Excel se borran sin tocar UK Days; "Cargando…" solo en UK Days (calendario desde caché local)

### Deferred Issues
| Issue | Origin | Effort | Revisit |
|-------|--------|--------|---------|
| UK Days → plan 03-02 (dialéctica primero; incluir sector post-medianoche pegado como día aparte): el tracker usa reglas incompletas. Reglas reales (medianoche en UK, HSBY, INTSP/OOB, ida/vuelta VLC, lates desde 05/08/2025, UW = duty que EMPIEZA en UK) en memoria project_excel_tax_rules → base del diseño de Fase 3 | 2026-10-04 | M | Fase 3 |
| PilotLog: fichero de cambios 2025 entregado al usuario (fuera del repo); pendiente que lo aplique y re-exporte para re-verificar. Resto de años (2023, 2024, 2026) cuando el usuario reciba el roster plan completo desde que empezó a volar (ya pedido) | 2026-10-04 | S | — |
| Histórico ya importado en PilotLog: sin NIGHT y posibles fechas post-medianoche → informe sobre export de PilotLog (no reimportar meses) | Phase 2 | S | antes de Fase 3 |
| FLIGHTLOG > 250 chars: Report se trunca (preexistente) | Phase 2 | S | — |
| Avisos muestran fecha sin año ("04/10" para 04/10/2027) — dateISOToDisplay | 03-01 | XS | — |
| Literal 'Tax Year 2025-2026' en downloadTaxExcel | 03-01 | XS | — |
| semgrep: <script> CDN sin atributo integrity (SRI) en index.html:462 (preexistente) | Phase 2 | S | Aegis pre-deploy |
| UK Days: reglas reales del usuario (medianoche en UK; HSBY activado; INTSP; ida/vuelta VLC en OFF/A/L) — ver memoria project_excel_tax_rules; reconstrucción por tax year desde el plan ROCS | Phase 2 | M | Fase 3 |

### Preguntas pendientes al usuario (checkpoint 03-02) — de UNA en UNA
- [x] 01/10/2026 → OFF (marcado por el usuario)
- [~] 1. ¿Cuadra el total de 54 UK Days? → repaso uno por uno con el backup (54 = 48 previos + 6 SBY del calendario)
  - [x] 06/05 SBY(cal) → NO UK: meeting por la mañana y a VLC por la tarde (falta: usuario pulsa ✕ tras deploy). Nota: el Excel lo pondrá como SBY U=1 → divergencia
  - [ ] 25/07 SBY · [ ] 03/08 SBY · [ ] 06/09 SBY · [ ] 24/09 SBY · [ ] 25/09 SBY
  - [ ] luego: 48 previos mes a mes (abril 14 man, mayo 9 man + 3 R1, …)
- [ ] 2. Lista "No UK": ¿algún día no encaja?
- [ ] 3. 6 DUTY sin email (09/04, 12/05, 20/05, 23/09, 26/09, 27/09/2026): ¿vuelo sin pegar, tierra o marca errónea? (uno a uno)
- [ ] 4. ¿Los DH vienen en el email de vuelo como un sector más?
- [ ] 5. ¿Añadir el año a las fechas de "Sin decidir"? (propuesta)

### Blockers/Concerns
- Ninguno. Nota: CRG (G7) no parsea JS embebido en index.html → su risk score no es informativo

### Git State
Last commit: b2d8244 — pusheado y desplegado en GitHub Pages (verificado 2026-10-04, aprobado por el usuario)
Branch: main

## Session Continuity

Last session: 2026-10-04
Stopped at: Plan 03-02 created
Next action: Review and approve plan, then run /paul:apply .paul/phases/03-ukdays/03-02-PLAN.md
Resume file: .paul/phases/03-ukdays/03-02-PLAN.md

---
*STATE.md — Updated after every significant action*
