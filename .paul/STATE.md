# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-10-03)

**Core value:** Pego el email del vuelo y obtengo sin errores logbook PilotLog, Excel Tax Year y UK Days.
**Current focus:** v0.2 Seguridad y robustez — Fase 7 (UK Days: año fiscal dinámico + límite)

## Current Position

Version: v0.1.0 (en curso v0.2.0)
Milestone: v0.2 Seguridad y robustez
Phase: 7 of 8 (UK Days año y límite) — Not started
Plan: Not started
Status: Ready to plan
Last activity: 2026-10-05 — Fase 6 completa (06-02: e2e propios + gate pre-commit/pre-push, 14/14); transición a Fase 7

Progress:
- v0.1 Datos fiables: [██████████] 100% ✓
- v0.2 Seguridad y robustez: [█████░░░░░] 50% (Fase 5 ✓, Fase 6 ✓)

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ✓     [Loop 06-02 cerrado — Fase 6 completa, ready to plan Fase 7]
```

## Accumulated Context

### Decisions
- Arnés node:vm sobre index.html real = base de tests de regresión (fases 2-3)
- Pistas: sin secretos en cliente; fuente por dialéctica en fase 4
- Fixtures con nombres de tripulación → gitignored (originales); copias anonimizadas versionadas en tests/fixtures (06-01, aprobadas por el usuario)
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
- 05-01: datos externos validados ANTES de interpolar (IATA_RE/ISO_RE/CAL_STATES, isoKeys filtra en origen de lista sin podar estado); onclick inline se mantiene (claves validadas = seguras); F-04-007 fórmulas CSV = monitor (REMARKS = nº vuelo, no tocar logbook legal)
- 05-02: SheetJS vendorizado (vendor/, sha384 fijado; nunca carga al clic por la activación de usuario en iOS); meta CSP con hosts concretos + #csp-watch (aviso solo para webs bloqueadas); firestore.rules = copia de prod, verificar con check-firestore-rules.mjs (solo GET, nunca deploy)
- Script inline del <head> SIEMPRE con atributo (p.ej. id): los harness localizan el principal con /<script>\n…<\/script>\s*<\/body>/
- E2E WebKit en Linux no tiene TLS → https:// vía Node (ctx.route + route.fetch); la CSP se sigue aplicando
- 06-01: tests en tests/ (harness/, fixtures/ anonimizadas, golden/); rutas SOLO desde tests/lib.mjs; `node tests/run-all.mjs` = barrera (✗ con exit≠0, SKIP, FAIL/✗ o 0 checks); golden de caracterización → cambios legítimos con `node tests/harness/harness-csv.mjs --update-golden` y revisar diff; lista importer PilotLog = 115 cabeceras; fixture 01 (18/09/2026) debe caer dentro de UK_DAYS_START/END (re-desplazar en Fase 7); BASELINES fa78eeb/6cb4a5a
- 06-02: `npm ci` (playwright-core 1.63.0) + `node tests/run-all.mjs tests/harness tests/e2e` = 14/14; e2e usan serveRepo/loadPlaywright/watchdog/FIXED_NOW de lib.mjs; reloj fijo solo sin Firebase; pre-commit = harness (bloquea), pre-push = harness + e2e (e2e-csp 1 reintento; escape solo `EASYLOG_PUSH_SKIP_NET=1 git push`); nunca --no-verify; push desde Bash de Claude con timeout ≥ 5 min
- _runways = mapa propio (localStorage + campo Firestore `runways` con guard _runwaysSaving); clave duty|vuelo|DEP-ARR(#n)

### Deferred Issues
| Issue | Origin | Effort | Revisit |
|-------|--------|--------|---------|
| PilotLog: fichero de cambios 2025 APLICADO por el usuario (2026-10-04); falta re-exportar CSV de PilotLog para re-verificar. Resto de años (2023, 2024, 2026) cuando el usuario reciba el roster plan completo desde que empezó a volar (ya pedido) | 2026-10-04 | S | — |
| Histórico ya importado en PilotLog: sin NIGHT y posibles fechas post-medianoche → informe sobre export de PilotLog (no reimportar meses) | Phase 2 | S | antes de Fase 3 |
| FLIGHTLOG > 250 chars: Report se trunca (preexistente) | Phase 2 | S | — |
| Barra «Hay una versión nueva» (fija abajo) tapa el final del botón de exportar mientras está visible → padding-bottom al body cuando se muestra | 03.1 checkpoint | XS | — |
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
| API key del navegador con apiTargets amplios por defecto → limitar a firestore/identitytoolkit/securetoken (consola GCP, opcional) | 05-02 | XS | — |
| Helpers duplicados entre harness (load/check/extract) → harness-lib | 06-01 (D6/F-06-006) | M | — |
| Fase 7: al hacer dinámico el año fiscal, mover FIXED_NOW (tests/lib.mjs), fixture 01 y calendario sembrado de e2e-csp | 06-02 | XS | Fase 7 |
| GitHub: ticket de purga de caché de commits (abierto 2026-10-05) → comprobar que los SHA antiguos dan 404 | 05 post | XS | cuando responda GitHub |

### Preguntas pendientes al usuario — de UNA en UNA
- Checkpoint 03-02 cerrado (detalle día a día en .paul/phases/03-ukdays/03-02-SUMMARY.md)
- [x] ¿El 02/10/2026 (FR2134/FR2135) está duplicado en PilotLog? → NO (captura PilotLog 05/10: una sola vez cada sector)
- [x] ¿Los DH vienen en el email de vuelo como un sector más? → NO: los DH nunca generan email «verified flights», solo aparecen en el ROCS
- [ ] Revisar uno a uno los 47 días previos (25 man + 22 R1) de 2026/27
- [x] ¿Añadir el año a las fechas de "Sin decidir"? → SÍ, en toda la app (dateISOToDisplay → dd/mm/aa), 2026-10-05
- (pendiente personal del usuario — detalle en memoria local)
- [ ] ¿Push de los commits de Fase 6 (06-01 + 06-02; solo tests/, docs, package.json, hooks — no cambia la app)? El push ya pasa por el gate nuevo (~50 s)
- [ ] ¿Tolerar en e2e-csp el beacon `connect-src https://apis.google.com/js/gen_204` (telemetría de gapi, intermitente)? Hoy lo amortigua el reintento del pre-push
- [ ] ¿Sacar del repo público el código de piloto/nombre (hoy fijos en index.html para T/O-LDG y CREWLIST; también en PROJECT.md, harness y AUDIT)? → requiere configuración en la app + quizá otra purga de historial (G8 Fase 5)

### Post-Aegis (2026-10-05)
- Reglas Firestore en producción = per-uid (request.auth.uid == uid) ✓ — versionadas en el repo (05-02), comprobador check-firestore-rules.mjs
- Doc Firestore medido: 127 KiB (12%) y ~1.9k entradas de índice (5%); excelData ≈2 KiB/día → ~2,5 años de margen → ya no es HIGH
- Rama main protegida (sin force-push ni borrado); 2FA GitHub ACTIVADO (TOTP, confirmado por el usuario 2026-10-05)
- Límite UK Days: criterio fiscal del usuario documentado SOLO en la memoria local de Claude (reference_srt_aircrew) — nunca en el repo (público)
- [ ] Límite de la app (MAX) pendiente de confirmación fiscal del usuario → Fase 7 lo hace configurable

### Blockers/Concerns
- Ninguno. Nota: CRG (G7) no parsea JS embebido en index.html → su risk score no es informativo
- Fase 5: la CSP lleva 'unsafe-inline' (53 onclick) → no frena ejecución de XSS, solo salida de datos; residuales documentados en 05-02-SUMMARY

### Git State
Last commit: ver git log — Fase 6 cerrada (local, sin push); prod sigue en v2026.10.05-120346
Branch: main

## Session Continuity

Last session: 2026-10-05
Stopped at: Fase 6 completa (06-01 + 06-02 UNIFY, transición con G7/G8)
Next action: /paul:plan 7 (UK Days: año fiscal dinámico + límite configurable); antes, decidir push de Fase 6
Resume file: .paul/phases/06-barrera-tests/06-02-SUMMARY.md

---
*STATE.md — Updated after every significant action*
