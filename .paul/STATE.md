# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-10-03)

**Core value:** Pego el email del vuelo y obtengo sin errores logbook PilotLog, Excel Tax Year y UK Days.
**Current focus:** v0.1.0 cerrado — siguiente: definir v0.2 (Seguridad y robustez, desde el roadmap Aegis)

## Current Position

Version: v0.1.0
Milestone: Awaiting next milestone
Phase: None active
Plan: None
Status: Milestone v0.1 Datos fiables complete — ready for next
Last activity: 2026-10-05 — Aegis pre-milestone + milestone completed (tag v0.1.0)

Progress:
- v0.1 Datos fiables: [██████████] 100% ✓

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ○        ○        ○     [Milestone complete - ready for next]
```

## Accumulated Context

### Decisions
- Arnés node:vm sobre index.html real = base de tests de regresión (fases 2-3)
- Pistas: sin secretos en cliente; fuente por dialéctica en fase 4
- Fixtures con nombres de tripulación → gitignored
- Deploy: la app se auto-actualiza (Fase 3.1) → ya NO hace falta ?v=N. Verificar deploy con `curl -s https://californiakid91.github.io/EASYLOG/ | grep "^const APP_VERSION"`. Hook `.githooks/pre-commit` sube la versión (core.hooksPath configurado); nunca `git commit -n`
- iOS standalone: abrir desde el icono recarga la página; desde el selector de apps no siempre emite visibilitychange → la app comprueba también en focus y cada 5 min
- Noche = regla EASA (licencia IAA del usuario): sol < −6° (crepúsculo civil), NO sunset+30 (UK CAA). sunAltitude NOAA validado vs PyEphem ≤10 s
- PILOTLOG_DATE = fecha UTC de off-block (sectores post-medianoche → día siguiente)
- Escrituras a nube con mergeFields + guard hidratación (ignora fromCache); last-write-wins por campo aceptado
- UK Day: computeUKDay tri-estado (último sector cronológico vía sectorUTC; sin On Block → no tocar); manual:true nunca se recalcula
- Calzos a las 00:00 justas = UK Day (FA 2013 Sch 45 para 22, midnight test); solo después de 00:00 es No UK
- UK Days 03-02 (dialéctica + Fable): regla cerrada R1/R2/R3 exigiendo aterrizar en UK (sustituye "sin exigir aeropuerto UK"); estados uk/no con source/reason; calendario _dayMap como declaración de días sin email; P = pendientes pasados, alarma solo con N
- DH (posicionamiento) NUNCA llega en email verified flights; solo en ROCS → UK Day/Excel de días con DH = manual o desde plan ROCS, nunca desde el email
- 03.2 (usuario 2026-10-05): SD = toggle ≈SIM; re-pegar idéntico solo-Excel → vuelve a la lista sin preguntar (PilotLog no duplica por fecha+vuelo; sí si cambia la fecha); U pendiente → '?' y Excel NO descargable con pendientes pasados (futuros no bloquean)
- 03.2-01: U del Excel = UK Days ('no' = vacío, pendiente con datos = '?'); UW = primer sector sale de UK_RES; vuelos > calendario en Excel; Excel bloqueado con pendientes pasados; pendientes no-hueco se deciden con botones UK/No UK (manual)
- Rol (usuario 2026-10-05): hoy SIEMPRE FO → SIC; PICUS lo pone él a mano en PilotLog (firma del capitán, raro); la app nunca genera PICUS; CPT/PIC en el futuro → al re-pegar no se cambia el rol guardado (revisar al ascender)
- 03.2-02: re-pegar compara solo CMP_KEYS normalizados + capitán/tripulación (crewDiff); idéntico no escribe (salvo volver a la lista / reparar Excel); distinto → confirm con resumen
- Días solo-Excel se borran sin tocar UK Days; "Cargando…" solo en UK Days (calendario desde caché local)
- Fase 4 (dialéctica + Fable): pistas = METAR IEM + rumbos OurAirports (AIRPORT_DB embebida, gen-airports.py) + preferente aprendida de _runways; solo lo confirmado va al CSV
- CSV: columnas con nombres del IMPORTER de CrewLounge (RWY_DEP/RWY_ARR); el importer empareja por nombre; el export usa otros nombres
- _runways = mapa propio (localStorage + campo Firestore `runways` con guard _runwaysSaving); clave duty|vuelo|DEP-ARR(#n)

### Deferred Issues
| Issue | Origin | Effort | Revisit |
|-------|--------|--------|---------|
| PilotLog: fichero de cambios 2025 APLICADO por el usuario (2026-10-04); falta re-exportar CSV de PilotLog para re-verificar. Resto de años (2023, 2024, 2026) cuando el usuario reciba el roster plan completo desde que empezó a volar (ya pedido) | 2026-10-04 | S | — |
| Histórico ya importado en PilotLog: sin NIGHT y posibles fechas post-medianoche → informe sobre export de PilotLog (no reimportar meses) | Phase 2 | S | antes de Fase 3 |
| FLIGHTLOG > 250 chars: Report se trunca (preexistente) | Phase 2 | S | — |
| Barra «Hay una versión nueva» (fija abajo) tapa el final del botón de exportar mientras está visible → padding-bottom al body cuando se muestra | 03.1 checkpoint | XS | — |
| semgrep: <script> CDN sin atributo integrity (SRI) en index.html:494 (preexistente) — confirmado por Aegis F-04-002 | Phase 2 | S | v0.2 |
| UK Days: reconstrucción de tax years anteriores desde el plan ROCS (2024/25 falta plan abr–dic 2024) | Phase 2 | M | — |
| Revisar uno a uno los 47 días previos de 2026/27 (25 man + 22 R1) | 03-02 checkpoint | S | otra sesión |
| SBY + email = conflicto; quizá debería mandar el email (regla usuario: SBY no cuenta solo si activado y acaba fuera/después de 00:00) | 03.2-01 checkpoint | S | — |
| UW en blanco en días sin vuelos con UK manual (DUTY sin email) → ¿UW=1? | 03.2-01 | XS | — |
| Regla de rol al re-pegar (rol guardado manda) → revisar al ascender a CPT | 03.2-02 | XS | ascenso |
| Mismo vuelo pegado con OTRA fecha (PilotLog lo duplicaría) no se detecta | 03.2-02 | S | — |
| Pistas exactas: FR24 API (token + 9 $/mes) o ADS-B adsb.lol vía proxy (sin CORS) — decisión del usuario | 04 dialéctica | M | si el usuario lo pide |
| Preferente de pista única por aeropuerto (sin franja horaria/flujo) | 04 dialéctica | S | — |
| Auto-actualización baja index.html entero cada 5 min (+32 KB DB) → fetch con cache:'no-cache' (304) | 04 Fable | XS | — |
| semgrep: urllib dinámico en gen-airports.py (script local, URL base fija; riesgo nulo) | 04 G8 | XS | — |

### Preguntas pendientes al usuario — de UNA en UNA
- Checkpoint 03-02 cerrado (detalle día a día en .paul/phases/03-ukdays/03-02-SUMMARY.md)
- [x] ¿El 02/10/2026 (FR2134/FR2135) está duplicado en PilotLog? → NO (captura PilotLog 05/10: una sola vez cada sector)
- [x] ¿Los DH vienen en el email de vuelo como un sector más? → NO: los DH nunca generan email «verified flights», solo aparecen en el ROCS
- [ ] Revisar uno a uno los 47 días previos (25 man + 22 R1) de 2026/27
- [x] ¿Añadir el año a las fechas de "Sin decidir"? → SÍ, en toda la app (dateISOToDisplay → dd/mm/aa), 2026-10-05
- (pendiente personal del usuario — detalle en memoria local)

### Blockers/Concerns
- Ninguno. Nota: CRG (G7) no parsea JS embebido en index.html → su risk score no es informativo

### Git State
Last commit: ver git log (fase 4 completa) — pusheado y desplegado en GitHub Pages (v2026.10.05-083341)
Branch: main

## Session Continuity

Last session: 2026-10-05
Stopped at: Milestone v0.1 Datos fiables complete (Aegis hecho, tag v0.1.0)
Next action: /paul:milestone (v0.2 Seguridad y robustez) — y acciones del propietario: medir doc Firestore, GitHub 2FA + protección de main
Resume file: .paul/MILESTONES.md

---
*STATE.md — Updated after every significant action*
