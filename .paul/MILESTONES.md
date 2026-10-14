# Milestones

Completed milestone log for this project.

| Milestone | Completed | Duration | Stats |
|-----------|-----------|----------|-------|
| v0.1 Datos fiables | 2026-10-05 | 3 días | 8 phases, 11 plans |
| v0.2 Seguridad y robustez | 2026-10-14 | 10 días | 5 phases, 9 plans |

---

## ✅ v0.2 Seguridad y robustez

**Completed:** 2026-10-14
**Duration:** 10 días (2026-10-05 → 2026-10-14)

### Stats

| Metric | Value |
|--------|-------|
| Phases | 5 (5, 6, 7, 8 + 7.1 insertada) |
| Plans | 9 |
| Files changed | 41 fuera de .paul/ (+4879 / −224; index.html +806 / −223) |
| Commits | 56 |

### Key Accomplishments

- Anti-inyección: datos externos (IATA, claves ISO, calendario, claves del email) validados antes de pintarse
- SheetJS vendorizado con hash fijado + meta CSP de control de salida con aviso visible de bloqueos
- Reglas de Firestore versionadas = producción (per-uid) + comprobador repo↔prod de solo lectura
- Barrera de tests: `run-all` con harness (fixtures anonimizadas, golden CSV/importer) + e2e WebKit; gate pre-commit (harness) y pre-push = deploy (harness + e2e)
- Sin pérdidas silenciosas: guarda de hidratación en todos los mutadores, OK solo si se guardó, errores de guardado visibles, copia local dañada protegida
- Sync endurecida (LWW por mapa sin temporizadores): «Sin confirmar», rearme del listener, relectura al volver de segundo plano
- UK Days multi-año: año fiscal derivado de la fecha con selector ‹ año ›, años cerrados congelados, límite configurable por año en los datos del usuario, días excepcionales (máx. 60), «máximo posible», sin «bonus»
- UK Days «Fuera de UK»: total real de días pasados fuera de UK con desglose trabajo / libres y backup con el desglose

### Key Decisions

- Sync = A (gana el último por mapa, endurecido); merge por día diferido salvo uso simultáneo en varios dispositivos (dialéctica Fable)
- Año fiscal derivado, sin estado persistido; FLOOR 06/04/2026; congelado a +30 días (dialéctica Fable)
- Límite de UK Days = dato del usuario, nunca en el repo público (default genérico 90)
- Push = deploy → bloqueado si fallan los tests; nunca --no-verify
- CSP con 'unsafe-inline' (onclick inline) = control de salida, no anti-XSS; residuales documentados

---

## ✅ v0.1 Datos fiables

**Completed:** 2026-10-05
**Duration:** 3 días (2026-10-03 → 2026-10-05)

### Stats

| Metric | Value |
|--------|-------|
| Phases | 8 (4 + 3 insertadas + 1.2) |
| Plans | 11 |
| Files changed | 68 (index.html +1340 / −481) |
| Commits | 61 |

### Key Accomplishments

- Arnés node:vm sobre el index.html real (11 harness + E2E WebKit) como base de regresión
- Borrados persisten en la nube (mergeFields + guard de hidratación)
- CSV PilotLog importa con 0 errores: TIME_NIGHT EASA (sol < −6°), DELAY único, fechas UTC post-medianoche, RWY_DEP/RWY_ARR
- UK Days con regla legal R1/R2/R3 (último sector aterriza en UK, calzos ≤ 00:00 Londres), pendientes/huecos y "No UK" persistente
- Auto-actualización de la PWA sin service worker (APP_VERSION + hook pre-commit), sin perder texto pegado
- Excel Tax Year coherente con UK Days (U/UW, estado SD, descarga bloqueada con pendientes)
- Detección de duplicados al pegar con resumen de diferencias
- Pistas sugeridas por viento METAR + base OurAirports embebida (896 aeropuertos) + preferente aprendida

### Key Decisions

- Noche = EASA (licencia IAA), no sunset+30
- UK Day exige aterrizar en UK (sustituye la regla "sin exigir aeropuerto UK" del 2026-10-03)
- Sin servidor ni claves secretas en cliente; pistas por METAR (FR24/ADS-B diferidos)
- CSV con nombres de columna del importer de CrewLounge

### Cierre

Auditoría Aegis pre-milestone (2026-10-05): 0 critical, 1 high (documento único de Firestore), 31 medium. Informe local en .aegis/report/AEGIS-REPORT.md; plan en 05-remediation-roadmap.md.

---
