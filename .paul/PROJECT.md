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
| Status | Production — CSV (Fase 2), UK Days (Fase 3) y auto-actualización (Fase 3.1); pistas pendientes |
| Last Updated | 2026-10-05 |

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
- [x] Borrados persisten en la nube (UK Days, días guardados, calendario) — Phase 1.1
- [x] Botón "+ Añadir fecha" para UK Days manuales — Phase 1.2
- [x] CSV con DELAY (1 código), TIME_NIGHT EASA, AC_ENGTYPE Jet, delays en notas y fechas UTC post-medianoche — importa con 0 errores/0 issues — Phase 2

- [x] CSV importa en PilotLog (separador `;`, minutos, PF TRUE/FALSE, SELF)
- [x] Excel Tax Year con fechas dd/mm/yyyy y prefijo FR
- [x] Calendario persistente con guard flags anti-race (`_dayMapSaving`, `_ukdaysSaving`)

- [x] UK Days fiables: último sector cronológico, recálculo al re-pegar, periodo 06/04–05/04 (03-01); regla R1/R2/R3 con aeropuerto UK y calzos 00:00 = UK, "No UK" persistente, pendientes/huecos, contador N·P, backup con procedencia (03-02) — Phase 3
- [x] Exportar CSV sin perder Excel/UK Days (barra "Quitar de la lista", ✕ seguro) — Phase 3
- [x] Auto-actualización de la PWA: APP_VERSION visible, recarga sola y segura, texto pegado conservado, hook que sube la versión — Phase 3.1

### Active (In Progress)

- [ ] Detectar vuelos duplicados al pegar (idéntico → no guardar; distinto → mostrar discrepancias)
- [ ] Calendario con estado SD/ground duty y columna U del Excel coherente con UK Days
- [ ] Comprobar histórico ya importado en PilotLog (sin NIGHT; posibles fechas post-medianoche) con informe sobre export de PilotLog

### Planned (Next)

- [ ] CSV: pista en uso (DEP_RWY / ARR_RWY) vacía — usuario propone derivarla de Flightradar (rumbo al despegue y justo antes de aterrizar)

### Out of Scope

- Backend propio / servidor — la app es estática a propósito

## Target Users

**Primary:** El propio usuario — FO de Ryanair (código VEGRIC, base STN), usa la app desde iPhone (PWA) y desktop.

## Constraints

### Technical Constraints

- Un solo `index.html`, sin build, sin servidor; deploy = push a `main`
- Todo client-side: cualquier API externa (Flightradar, etc.) debe ser accesible desde navegador (CORS) — Flightradar24 no tiene API pública gratuita → requiere investigación
- Caché de iOS PWA: resuelta con auto-actualización (Fase 3.1); verificar deploy con `curl … | grep "^const APP_VERSION"`; no usar `git commit -n`
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
| Noche = EASA (licencia IAA): sol < −6° (crepúsculo civil), no sunset+30 | Usuario con licencia irlandesa; validado vs PyEphem ≤10 s | 2026-10-03 | Active |
| DELAY = 1 código (el de más minutos); resto a FLIGHTLOG; PILOTLOG_DATE = fecha UTC off-block | Importer acepta 1 código; convención PilotLog UTC | 2026-10-03 | Active |
| UK Day = presente en UK a 00:00 Londres: último sector aterriza en UK (sin JER/GCI) con calzos ≤ 00:00 (FA 2013 Sch 45 para 22) | Criterio legal HMRC + reglas del usuario; dialéctica Fable | 2026-10-04 | Active |
| Días sin email: calendario (_dayMap) como declaración; nada se infiere sin respaldo; P fuera de la alarma | Dialéctica (Polo A enmendado) + revisión Fable | 2026-10-04 | Active |
| ✕ de "Días guardados" solo quita de la lista; borrar del Excel solo en "Días en Excel sin historial" | Usuario perdió datos 2 veces limpiando la lista tras exportar | 2026-10-04 | Active |
| Auto-actualización sin service worker: APP_VERSION + fetch no-store al arrancar/volver/foco/cada 5 min → location.replace(?v=); bloqueos si se perdería algo; texto pegado se conserva | Caché HTTP + iOS reanudando sin navegar causaron pérdida de datos; SW sería un 3er nivel de caché | 2026-10-05 | Active |
| Firestore: mergeFields por campo + no escribir antes del primer snapshot del servidor | merge:true no borraba claves; evitar pisar la nube desde caché offline | 2026-10-03 | Active |

## Success Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| CSV importa en PilotLog con night, pistas, T/O-LDG y delays correctos | 100% de vuelos de prueba | Night/T-O-LDG/delays OK (0 errores); pistas pendientes (Fase 4) | In progress |
| UK Days usa on-block correcto del último vuelo | 100% de días de prueba | 54/91 verificado día a día con el usuario (2026/27) | Done |

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
*Last updated: 2026-10-05 after Phase 3.1*
