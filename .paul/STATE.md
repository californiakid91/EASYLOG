# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-10-03)

**Core value:** Pego el email del vuelo y obtengo sin errores logbook PilotLog, Excel Tax Year y UK Days.
**Current focus:** v0.1 Datos fiables — Phase 4 (Pista en uso) · antes: plan de auto-actualización PWA (prioridad)

## Current Position

Milestone: v0.1 Datos fiables
Phase: 3.1 [INSERTED] (Auto-actualización PWA) — Planning (Fase 4 Pista en uso después)
Plan: 03.1-01 — APPLY en curso (tareas 1-2 hechas, G6 limpio; falta checkpoint iPhone)
Status: APPLY — checkpoint human-verify
Last activity: 2026-10-05 — Created .paul/phases/03.1-pwa-autoupdate/03.1-01-PLAN.md (revisado por Fable: 2 bloqueantes + 5 importantes incorporados)

Progress:
- Milestone: [████████░░] 75%
- Phase 3.1: [░░░░░░░░░░] 0%

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ◐        ○     [APPLY: esperando checkpoint iPhone]
```

## Accumulated Context

### Decisions
- Arnés node:vm sobre index.html real = base de tests de regresión (fases 2-3)
- Pistas: sin secretos en cliente; fuente por dialéctica en fase 4
- Fixtures con nombres de tripulación → gitignored
- Deploy: GitHub Pages cachea 10 min → para probar al momento abrir en Safari con ?v=N
- Noche = regla EASA (licencia IAA del usuario): sol < −6° (crepúsculo civil), NO sunset+30 (UK CAA). sunAltitude NOAA validado vs PyEphem ≤10 s
- PILOTLOG_DATE = fecha UTC de off-block (sectores post-medianoche → día siguiente)
- Escrituras a nube con mergeFields + guard hidratación (ignora fromCache); last-write-wins por campo aceptado
- UK Day: computeUKDay tri-estado (último sector cronológico vía sectorUTC; sin On Block → no tocar); manual:true nunca se recalcula
- Calzos a las 00:00 justas = UK Day (FA 2013 Sch 45 para 22, midnight test); solo después de 00:00 es No UK
- UK Days 03-02 (dialéctica + Fable): regla cerrada R1/R2/R3 exigiendo aterrizar en UK (sustituye "sin exigir aeropuerto UK"); estados uk/no con source/reason; calendario _dayMap como declaración de días sin email; P = pendientes pasados, alarma solo con N
- Días solo-Excel se borran sin tocar UK Days; "Cargando…" solo en UK Days (calendario desde caché local)

### Deferred Issues
| Issue | Origin | Effort | Revisit |
|-------|--------|--------|---------|
| PilotLog: fichero de cambios 2025 APLICADO por el usuario (2026-10-04); falta re-exportar CSV de PilotLog para re-verificar. Resto de años (2023, 2024, 2026) cuando el usuario reciba el roster plan completo desde que empezó a volar (ya pedido) | 2026-10-04 | S | — |
| Histórico ya importado en PilotLog: sin NIGHT y posibles fechas post-medianoche → informe sobre export de PilotLog (no reimportar meses) | Phase 2 | S | antes de Fase 3 |
| FLIGHTLOG > 250 chars: Report se trunca (preexistente) | Phase 2 | S | — |
| Avisos muestran fecha sin año ("04/10" para 04/10/2027) — dateISOToDisplay | 03-01 | XS | — |
| Literal 'Tax Year 2025-2026' en downloadTaxExcel | 03-01 | XS | — |
| iPhone sirve la versión antigua en caché sin ?v=N (pasó en el checkpoint 03-02: contó 80 en vez de 53) → mostrar versión en la app / cache-busting | 03-02 checkpoint | S | 03-03 |
| IDEA usuario: al pegar, detectar vuelo duplicado (ya en historial/Excel): si es idéntico → avisar "duplicado" y no guardar; si difiere → mostrar discrepancias campo a campo. Hoy addDay solo mira el historial (no _excelData) | 03-02 checkpoint | S-M | 03-03 (aclarar alcance) |
| Auto-actualización de la PWA (como Toca Cabeza): versión embebida + comprobación al abrir/volver → recarga sola | 03-02 checkpoint | S | siguiente plan (prioridad) |
| Calendario sin estado SD/ground duty (meeting): 06/05/2026 marcado SBY → Excel pone SBY U=1 aunque durmió en VLC | 03-02 checkpoint | S | 03-03 |
| semgrep: <script> CDN sin atributo integrity (SRI) en index.html:462 (preexistente) | Phase 2 | S | Aegis pre-deploy |
| UK Days: reconstrucción de tax years anteriores desde el plan ROCS (2024/25 falta plan abr–dic 2024) | Phase 2 | M | — |
| Columna U del Excel Tax Year no exige aeropuerto UK y pone SBY U=1 → puede divergir de UK Days | 03-02 | S | 03-03 |
| Revisar uno a uno los 47 días previos de 2026/27 (25 man + 22 R1); ¿el email trae los DH?; año en fechas "Sin decidir" | 03-02 checkpoint | S | otra sesión |
| ¿02/10/2026 (FR2134/FR2135) duplicado en PilotLog? (ya estaba antes del CSV de 9 vuelos) | 03-02 checkpoint | XS | preguntar al usuario |

### Preguntas pendientes al usuario — de UNA en UNA
- Checkpoint 03-02 cerrado (detalle día a día en .paul/phases/03-ukdays/03-02-SUMMARY.md)
- [ ] ¿El 02/10/2026 (FR2134/FR2135) está duplicado en PilotLog?
- [ ] ¿Los DH vienen en el email de vuelo como un sector más?
- [ ] Revisar uno a uno los 47 días previos (25 man + 22 R1) de 2026/27
- [ ] ¿Añadir el año a las fechas de "Sin decidir"?
- (pendiente personal del usuario — detalle en memoria local)

### Blockers/Concerns
- Ninguno. Nota: CRG (G7) no parsea JS embebido en index.html → su risk score no es informativo
- Phase 3: Safari/iPhone sirve versiones viejas en caché → ya causó pérdida de datos; auto-actualización PWA es la prioridad

### Git State
Last commit: 4910c67 (fase 3 completa) — pusheado y desplegado en GitHub Pages, verificado en la web
Branch: main

## Session Continuity

Last session: 2026-10-04
Stopped at: Plan 03.1-01 created
Next action: Review and approve plan, then run /paul:apply .paul/phases/03.1-pwa-autoupdate/03.1-01-PLAN.md
Resume file: .paul/phases/03.1-pwa-autoupdate/03.1-01-PLAN.md

---
*STATE.md — Updated after every significant action*
