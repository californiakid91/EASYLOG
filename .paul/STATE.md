# Project State

## Project Reference

See: .paul/PROJECT.md (updated 2026-10-03)

**Core value:** Pego el email del vuelo y obtengo sin errores logbook PilotLog, Excel Tax Year y UK Days.
**Current focus:** v0.2 Seguridad y robustez — todas las fases completas (5, 6, 7, 7.1, 8); siguiente: cerrar milestone

## Current Position

Version: v0.1.0 (en curso v0.2.0)
Milestone: v0.2 Seguridad y robustez
Phase: 7.1 [INSERTED] (UK Days: fuera de UK) — ✅ Complete — milestone v0.2: 5/5 fases
Plan: 07.1-01 completo (UNIFY)
Status: Loop cerrado — milestone v0.2 listo para /paul:complete-milestone
Last activity: 2026-10-14 — UNIFY 07.1-01 + transición Fase 7.1; prod v2026.10.14-112255

Progress:
- v0.1 Datos fiables: [██████████] 100% ✓
- v0.2 Seguridad y robustez: [██████████] 100% (Fase 5 ✓, 6 ✓, 7 ✓, 7.1 ✓, 8 ✓)

## Loop Position

Current loop state:
```
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ✓     [Loop 07.1-01 cerrado — Fase 7.1 completa; v0.2 con todas sus fases]
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
- Escrituras a nube con mergeFields + guard hidratación (ignora fromCache); last-write-wins por campo aceptado (endurecido en 08-02)
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
- 07 (dialéctica Fable 2026-10-06, confianza alta): año fiscal DERIVADO de la fecha (taxYearOf/viewTY, sin estado persistido); UK_DAYS_FLOOR=2026-04-06 (no se fabrica evidencia anterior); año congelado a end+30 días (backfill solo lectura; pegar = confirm → manual, cancelar = no guardar); chip ‹ año › + banner 06/04–05/05; Excel por año visible; split 07-01 (año) / 07-02 (límite por año = settings.ukLimit[label] + máximo posible + sin "bonus")
- 07-01 (aplicado): funciones de periodo reciben `ty` (por defecto viewTY()), nunca constantes de año; harness fijan window._ukNowOverride = FIXED_NOW; `node tests/run-all.mjs --now=<ISO> tests/harness` debe dar verde en cualquier año; botones OFF identifican el hueco por su primer día; chip ‹ año › en la fila de botones de UK Days
- 08-01 (aplicado): todo mutador empieza con `if (!requireHydrated(...)) return;` (alert en modales/tarjeta UK, #status en el resto) y solo muestra OK / vacía el cuadro si save*() devolvió true; lo que va a Firestore se captura antes de cualquier await; copia local dañada (_localCorrupt) nunca se sobrescribe sola; OK de nube = enviado (el error async lo sustituye)
- 08-02 (aplicado; dialéctica Fable, confianza alta): sync = A — LWW por mapa endurecido. Regla D2: con _cloudWrites>0 se descarta el snapshot sin hasPendingWrites (skipped → relectura); _cloudWrites solo baja al resolver/rechazar setDoc (NUNCA por timeout); «Sincronizado ✓» solo con 0 en vuelo y sin stale; setDoc síncrono con cloud.fs; listener con rearme (subscribeCloud/onCloudListenerError); vuelta >60 s sin señal → stale (checkResume en requireHydrated + eventos + tick 15 s), no se escribe hasta releer (revalidateCloud). Tests con reloj: harness-sync (advance/jump) + e2e-sync (Firebase falso por page.route). B/C diferidas: solo si se usa en varios dispositivos a la vez
- 07-02 (aplicado): _settings = { ukLimit[label], ukExceptional[iso]: {reason, at} } persistido como mapa más (local SETTINGS_KEY + campo Firestore 'settings' en mergeFields); límite = dato del usuario (default genérico 90, nunca su valor ni su criterio en el repo); comp = UK − min(exc, 60); lectores defensivos (ukLimitSet/ukExcMap), escritores desde ukExcRaw; requireHydrated antes y después de prompt/confirm/modal; claves locales no-objeto = dañadas
- 07.1-01 (aplicado): «Fuera de UK» = ukPastDays con estado no (hoy/futuros nunca); outKind work = email | ruta real guardada | DUTY/SBY/SIM/SD, si no off; solo se pinta la lista activa; apertura desde _ukOutOpen (no del DOM); botón UK de la lista → ukForceUKFromOut con confirm; backup: OFF de calendario en rangos, decisiones a mano con motivo
- _runways = mapa propio (localStorage + campo Firestore `runways`); clave duty|vuelo|DEP-ARR(#n)

### Deferred Issues
| Issue | Origin | Effort | Revisit |
|-------|--------|--------|---------|
| PilotLog histórico 2023-05→2026-09 comparado con el plan ROCS completo (2026-10-08/10): checklist privada en curso por el usuario; al terminar, re-exportar CSV de PilotLog y re-verificar (scripts fuera del repo) | 2026-10-08 | S | cuando avise el usuario |
| Histórico ya importado en PilotLog: sin NIGHT y posibles fechas post-medianoche → informe sobre export de PilotLog (no reimportar meses) | Phase 2 | S | antes de Fase 3 |
| FLIGHTLOG > 250 chars: Report se trunca (preexistente) | Phase 2 | S | — |
| Barra «Hay una versión nueva» (fija abajo) tapa el final del botón de exportar mientras está visible → padding-bottom al body cuando se muestra | 03.1 checkpoint | XS | — |
| UK Days: reconstrucción de tax years anteriores desde el plan ROCS (2024/25 falta plan abr–dic 2024) | Phase 2 | M | — |
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
| Año congelado con email completo y sin entrada muestra "email incompleto: re-pégalo" (re-pegar idéntico no lo arregla; se decide con UK/No UK) — mensaje engañoso, no alcanzable en la práctica | 07-01 G6 | XS | — |
| rule:* de años congelados no se recalculan aunque se corrija un bug de la regla → requiere migración explícita revisada | 07-01 dialéctica | S | si cambia la regla |
| Al pegar un email de un día con marca manual que lo contradice, la app conserva la marca sin avisar (caso 03/10/2026) → avisar y ofrecer volver a la regla del email | 2026-10-14 usuario | XS | — |
| Motivo de los No UK manuales decididos sin email («DUTY en calendario sin email: pega el email») no explica la causa real (p. ej. calzos tras 00:00) → texto «No UK decidido a mano (DUTY sin email)» o pegar el email y quitar la marca | 07.1 checkpoint | XS | — |
| G8 07.1: onclick con iso interpolado (seguro hoy por ISO_RE/ukPastDays) → data-iso + addEventListener; reason muy largo podría pasarse del límite de mailto en el backup | 07.1 G8 | XS | — |
| Detectar vuelos de SAFETY PILOT al pegar (VEGRIC 3er FO, sin PF) → proponer funciones 0:00, Pilot 3 SELF y remarks «SAFETY PILOT» (criterio del usuario) | 2026-10-10 sesión PilotLog | S | fase propia tras 08 |
| Sync: dos dispositivos editando casi a la vez → gana el último por mapa (F-02-001 mitigado, no cerrado); merge por día (opción B) si cambia el uso | 08-02 dialéctica | M | si usa 2 dispositivos a la vez |
| 08-02 no verificado en iPhone real + Firebase real (e2e simulado); vigilar «Comprobando…» que no termina o «Sin confirmar» con buena cobertura | 08-02 checkpoint | XS | si el usuario lo ve |
| G8 08: `_cloudWrites` de una sesión anterior (escritura sin confirmar) no se resetea en logout/switchMode → la sesión nueva descarta snapshots hasta que resuelva (solo disponibilidad, no cruza datos) → epoch de sesión | 08 G8 | XS | — |
| G8 08: validación mínima de forma en applyCloudData (objetos, claves ISO, CAL_STATES) antes de asignar y del espejo CAL_KEY (defensa en profundidad) | 08 G8 | XS | — |
| Copia local dañada: no se puede «dar por perdida» desde la app (_localCorrupt no se limpia) | 08-01 G6 | XS | — |
| GitHub: ticket de purga de caché de commits (abierto 2026-10-05) → comprobar que los SHA antiguos dan 404 | 05 post | XS | cuando responda GitHub |

### Preguntas pendientes al usuario — de UNA en UNA
- Checkpoint 03-02 cerrado (detalle día a día en .paul/phases/03-ukdays/03-02-SUMMARY.md)
- [x] ¿El 02/10/2026 (FR2134/FR2135) está duplicado en PilotLog? → NO (captura PilotLog 05/10: una sola vez cada sector)
- [x] ¿Los DH vienen en el email de vuelo como un sector más? → NO: los DH nunca generan email «verified flights», solo aparecen en el ROCS
- [x] Revisar uno a uno los días de 2026/27 → HECHO por el usuario 2026-10-14 (todos, hasta el 13/10; cifra confirmada, detalle solo en memoria local). No volver a revisarlos
- [x] ¿Añadir el año a las fechas de "Sin decidir"? → SÍ, en toda la app (dateISOToDisplay → dd/mm/aa), 2026-10-05
- (pendiente personal del usuario — detalle en memoria local)
- [x] ¿Push de los commits de Fase 6? → SÍ, hecho 2026-10-06 (3c93a22..193e7ce, gate pre-push 13/13 + e2e-csp OK)
- [ ] ¿Tolerar en e2e-csp el beacon `connect-src https://apis.google.com/js/gen_204` (telemetría de gapi, intermitente)? Hoy lo amortigua el reintento del pre-push
- [ ] ¿Sacar del repo público el código de piloto/nombre (hoy fijos en index.html para T/O-LDG y CREWLIST; también en PROJECT.md, harness y AUDIT)? → requiere configuración en la app + quizá otra purga de historial (G8 Fase 5)

### Post-Aegis (2026-10-05)
- Reglas Firestore en producción = per-uid (request.auth.uid == uid) ✓ — versionadas en el repo (05-02), comprobador check-firestore-rules.mjs
- Doc Firestore medido: 127 KiB (12%) y ~1.9k entradas de índice (5%); excelData ≈2 KiB/día → ~2,5 años de margen → ya no es HIGH
- Rama main protegida (sin force-push ni borrado); 2FA GitHub ACTIVADO (TOTP, confirmado por el usuario 2026-10-05)
- Límite UK Days: criterio fiscal del usuario documentado SOLO en la memoria local de Claude (reference_srt_aircrew) — nunca en el repo (público)
- [x] Límite de la app: el asesor respondió 2026-10-13 (detalle SOLO en memoria local). 07-02: límite configurable por año guardado en los datos del usuario + días excepcionales (no computables, tope 60)

### Blockers/Concerns
- Ninguno. Nota: CRG (G7) no parsea JS embebido en index.html → su risk score no es informativo
- Fase 5: la CSP lleva 'unsafe-inline' (53 onclick) → no frena ejecución de XSS, solo salida de datos; residuales documentados en 05-02-SUMMARY

### Git State
Last commit: cf881d6 (07.1-01 fix) + commit de fase — prod = v2026.10.14-112255 (verificado byte a byte)
Branch: main

## Session Continuity

Last session: 2026-10-14
Stopped at: Fase 7.1 completa (UNIFY 07.1-01 + transición) — v0.2 con todas sus fases
Next action: /paul:complete-milestone (v0.2); después, fase propia SAFETY PILOT (diferido)
Resume file: .paul/phases/07.1-ukdays-fuera-de-uk/07.1-01-SUMMARY.md

---
*STATE.md — Updated after every significant action*
