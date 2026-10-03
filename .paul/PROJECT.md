# EasyLog

## What This Is

App web de una sola página (`index.html`, PWA en GitHub Pages + Firebase) para un FO de Ryanair. Se pega el email del vuelo de Ryanair y la app genera el CSV para importar en PilotLog (CrewLounge), rellena el Excel Tax Year, lleva el control de UK Days y mantiene un calendario OFF/STBY/DUTY/SIM.

## Core Value

Como piloto FO de Ryanair, pego el email del vuelo y obtengo sin errores mi logbook PilotLog, mi Excel Tax Year y el control de UK Days, sin introducir nada a mano dos veces.

## Current State

| Attribute | Value |
|-----------|-------|
| Type | Application |
| Version | 0.0.0 (en producción, sin versionado formal) |
| Status | Production — auditoría completa, fixes pendientes |
| Last Updated | 2026-10-03 |

**Production URLs:**
- https://californiakid91.github.io/EASYLOG/ — app (deploy automático al push a `main`)

## Requirements

### Core Features

- Parsear email de vuelo Ryanair → registro de vuelo
- Exportar CSV PilotLog (formato CrewLounge PILOTLOG)
- Exportar Excel Tax Year (reglas en `REGLAS_EXCEL_TAX_YEAR.md`)
- Tracker UK Days (6 abr – 5 abr, límite 91 días)
- Calendario mensual OFF/STBY/DUTY/SIM con sync Firestore

### Validated (Shipped)

- [x] Auditoría con causa raíz de los 5 fallos (AUDIT.md) — Phase 1

- [x] CSV importa en PilotLog (separador `;`, minutos, PF TRUE/FALSE, SELF)
- [x] Excel Tax Year con fechas dd/mm/yyyy y prefijo FR
- [x] Calendario persistente con guard flags anti-race (`_dayMapSaving`, `_ukdaysSaving`)

### Active (In Progress)

- [ ] Fase 2: confirmar H8 (mapeo posicional 35→37 cols) con prueba de importación del usuario

### Planned (Next)

- [ ] CSV: horas de night (TIME_NIGHT, TO_NIGHT, LDG_NIGHT) no aparecen
- [ ] CSV: pista en uso (DEP_RWY / ARR_RWY) vacía — usuario propone derivarla de Flightradar (rumbo al despegue y justo antes de aterrizar)
- [ ] CSV: T/O y landing (TO_DAY/LDG_DAY…) a veces no se ponen
- [ ] CSV: delays (TAG_DELAY) salen "muy raros"
- [ ] UK Days: a veces no coge bien la hora de on-block del último vuelo
- [ ] Resolver contradicción AC_ENGTYPE (`Turbine (jet-fan)` actual vs `Jet` que el importer aceptaba), CREWLIST y FLIGHTLOG — requiere prueba de importación
- [ ] Minutos de delay y códigos alfanuméricos se pierden

### Out of Scope

- Backend propio / servidor — la app es estática a propósito

## Target Users

**Primary:** El propio usuario — FO de Ryanair (código VEGRIC, base STN), usa la app desde iPhone (PWA) y desktop.

## Constraints

### Technical Constraints

- Un solo `index.html`, sin build, sin servidor; deploy = push a `main`
- Todo client-side: cualquier API externa (Flightradar, etc.) debe ser accesible desde navegador (CORS) — Flightradar24 no tiene API pública gratuita → requiere investigación
- Caché agresiva de iOS PWA: verificar con hard refresh / incógnito
- Importer de PilotLog estricto con enums (TAG_DELAY, AC_ENGTYPE) — validar contra referencia CrewLounge

### Business Constraints

- Usuario no es desarrollador: preferir la solución más simple que funcione
- Planificar y confirmar el diseño antes de implementar

### Compliance Constraints

- Seguridad de la cuenta Google/Firebase del usuario es prioridad #1

## Key Decisions

| Decision | Rationale | Date | Status |
|----------|-----------|------|--------|
| Prioridad v0.1 = corrección de datos CSV + UK Days | Fallos reportados por el usuario | 2026-10-03 | Active |
| Auditoría la hace Claude contra referencia CrewLounge | Usuario: "audita tú todo esto" | 2026-10-03 | Active |
| Testear index.html vía node:vm sin copiar código | Evita desincronización; arnés reutilizable | 2026-10-03 | Active |
| UK Day = on-block último vuelo antes de 00:00 hora Londres (sin exigir aeropuerto UK) | Confirmado por usuario + REGLAS_EXCEL_TAX_YEAR.md | 2026-10-03 | Active |
| Pistas: sin claves secretas en cliente; fuente a decidir por dialéctica | Seguridad #1; app sin servidor | 2026-10-03 | Active |

## Success Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| CSV importa en PilotLog con night, pistas, T/O-LDG y delays correctos | 100% de vuelos de prueba | Fallos en 4 áreas | Not started |
| UK Days usa on-block correcto del último vuelo | 100% de días de prueba | Falla a veces | Not started |

## Tech Stack / Tools

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend | HTML/JS vanilla en `index.html` | Una sola página, PWA |
| Hosting | GitHub Pages | Deploy al push a `main` |
| Datos | localStorage + Firebase Firestore | Auth Google |
| Excel | SheetJS 0.20.3 (CDN) | |
| Referencia CSV | Export CrewLounge PILOTLOG (memoria `reference_crewlounge_export`) | 99 columnas |

## Links

| Resource | URL |
|----------|-----|
| Repository | https://github.com/californiakid91/EASYLOG |
| Production | https://californiakid91.github.io/EASYLOG/ |

---
*PROJECT.md — Updated when requirements or context change*
*Last updated: 2026-10-03 after Phase 1*
