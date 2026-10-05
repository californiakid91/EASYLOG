# Milestones

Completed milestone log for this project.

| Milestone | Completed | Duration | Stats |
|-----------|-----------|----------|-------|
| v0.1 Datos fiables | 2026-10-05 | 3 días | 8 phases, 11 plans |

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
