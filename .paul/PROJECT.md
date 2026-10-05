# EasyLog

## What This Is

App web de una sola página (`index.html`, PWA en GitHub Pages + Firebase) para un FO de Ryanair. Se pega el email del vuelo de Ryanair y la app genera el CSV para importar en PilotLog (CrewLounge), rellena el Excel Tax Year, lleva el control de UK Days y mantiene un calendario OFF/STBY/DUTY/SIM.

## Core Value

Como piloto FO de Ryanair, pego el email del vuelo y obtengo sin errores mi logbook PilotLog, mi Excel Tax Year y el control de UK Days, sin introducir nada a mano dos veces.

## Current State

| Attribute | Value |
|-----------|-------|
| Type | Application |
| Version | 0.1.0 (v0.1 Datos fiables, cerrado 2026-10-05) |
| Status | Production — v0.1.0 cerrado; v0.2 en curso: Fase 5 Seguridad y Fase 6 Barrera de tests completas |
| Last Updated | 2026-10-05 (Fase 6) |

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
- [x] Excel coherente con UK Days: U = estado UK Days ('?' pendiente), UW por primer sector, estado SD, decidir pendientes, descarga bloqueada con pendientes pasados — Phase 3.2
- [x] Duplicados al pegar: idéntico en lista → aviso; idéntico solo-Excel → vuelve a la lista; distinto (incl. capitán/tripulación) → resumen y confirmación — Phase 3.2
- [x] Base OurAirports embebida (896 aeropuertos: ICAO, coordenadas, pistas) — sin prompts de lat/lon — Phase 4
- [x] Pistas RWY_DEP/RWY_ARR: sugeridas por viento METAR (IEM) + preferente aprendida, confirmadas por día (🛬); importa en PilotLog — Phase 4
- [x] Datos externos validados antes de pintarse (IATA, claves ISO, calendario, claves del email) — Phase 5 (05-01)
- [x] SheetJS servido desde el propio repo (hash fijado) + meta CSP de control de salida con aviso visible de bloqueos — Phase 5 (05-02)
- [x] Reglas de Firestore versionadas = producción (per-uid) + comprobador repo↔prod de solo lectura; API key restringida por referrer verificada — Phase 5 (05-02)
- [x] Barrera de tests: `node tests/run-all.mjs` (12 harness, fixtures anonimizadas versionadas, golden de CSV y cabeceras del importer) — Phase 6 (06-01)
- [x] e2e propios (playwright-core fijado, `npm ci`) + gate git: commit bloqueado si fallan los harness; push (= deploy) bloqueado si fallan harness o e2e — Phase 6 (06-02)

### Active (In Progress)

- [ ] Comprobar histórico ya importado en PilotLog (sin NIGHT; posibles fechas post-medianoche) con informe sobre export de PilotLog

- [ ] Seguridad y robustez post-Aegis (informe 2026-10-05, roadmap en .aegis/report/05-remediation-roadmap.md):
  - [ ] Documento único de Firestore: medir tamaño + entradas de índice; partir history/excelData o eximir índices (único HIGH)
  - [x] XSS por código de aeropuerto + SRI/CSP para CDNs — Phase 5
  - [x] Reglas de Firestore versionadas en el repo (per-uid) + restricciones de la apiKey — Phase 5
  - [ ] Año fiscal derivado de la fecha (hoy fijo 2026/27) — antes del 06/04/2027
  - [ ] Avisos "ok" que tapan escrituras bloqueadas; estado obsoleto tras confirm()
  - [x] Barrera de tests (runner único + fixtures anonimizadas versionadas + gate pre-commit/pre-push) — Phase 6
- [x] Propietario (sin código): GitHub 2FA activado + protección de rama main; historial git purgado (2026-10-05, ticket de caché a GitHub abierto)

### Planned (Next)

- [ ] (opcional) Pistas exactas: FR24 API (token + 9 $/mes del usuario) o ADS-B adsb.lol vía proxy — decisión del usuario

### Out of Scope

- Backend propio / servidor — la app es estática a propósito

## Target Users

**Primary:** El propio usuario — FO de Ryanair (código VEGRIC, base STN), usa la app desde iPhone (PWA) y desktop.

## Constraints

### Technical Constraints

- Un solo `index.html` (+ `vendor/` con SheetJS desde 05-02), sin build, sin servidor; deploy = push a `main`
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
| UK Day = on-block último vuelo antes de 00:00 hora Londres (sin exigir aeropuerto UK) | Confirmado por usuario + REGLAS_EXCEL_TAX_YEAR.md | 2026-10-03 | Superseded (2026-10-04, regla R1/R2/R3) |
| Pistas: sin claves secretas en cliente; fuente a decidir por dialéctica | Seguridad #1; app sin servidor | 2026-10-03 | Active |
| Noche = EASA (licencia IAA): sol < −6° (crepúsculo civil), no sunset+30 | Usuario con licencia irlandesa; validado vs PyEphem ≤10 s | 2026-10-03 | Active |
| DELAY = 1 código (el de más minutos); resto a FLIGHTLOG; PILOTLOG_DATE = fecha UTC off-block | Importer acepta 1 código; convención PilotLog UTC | 2026-10-03 | Active |
| UK Day = presente en UK a 00:00 Londres: último sector aterriza en UK (sin JER/GCI) con calzos ≤ 00:00 (FA 2013 Sch 45 para 22) | Criterio legal HMRC + reglas del usuario; dialéctica Fable | 2026-10-04 | Active |
| Días sin email: calendario (_dayMap) como declaración; nada se infiere sin respaldo; P fuera de la alarma | Dialéctica (Polo A enmendado) + revisión Fable | 2026-10-04 | Active |
| ✕ de "Días guardados" solo quita de la lista; borrar del Excel solo en "Días en Excel sin historial" | Usuario perdió datos 2 veces limpiando la lista tras exportar | 2026-10-04 | Active |
| Auto-actualización sin service worker: APP_VERSION + fetch no-store al arrancar/volver/foco/cada 5 min → location.replace(?v=); bloqueos si se perdería algo; texto pegado se conserva | Caché HTTP + iOS reanudando sin navegar causaron pérdida de datos; SW sería un 3er nivel de caché | 2026-10-05 | Active |
| Excel U = UK Days (no = vacío, pendiente = '?'); Excel no descargable con pendientes pasados | Excel fiscal no puede contradecir a UK Days (06/05 SBY); usuario | 2026-10-05 | Active |
| Re-pegar: compara solo campos usados (CMP_KEYS) + capitán/tripulación; rol guardado manda (siempre FO/SIC; PICUS manual) | Fable + G6 + usuario | 2026-10-05 | Active |
| Pistas: METAR (IEM) + rumbos OurAirports + preferente aprendida; solo lo confirmado va al CSV | Dialéctica Fable: gratis, sin claves; libro legal sin datos inventados | 2026-10-05 | Active |
| CSV: nombres de columna = lista del IMPORTER de CrewLounge (RWY_DEP/RWY_ARR), no los del export | El importer rechazó DEP_RWY/ARR_RWY | 2026-10-05 | Active |
| Firestore: mergeFields por campo + no escribir antes del primer snapshot del servidor | merge:true no borraba claves; evitar pisar la nube desde caché offline | 2026-10-03 | Active |
| Datos externos validados antes de interpolar; onclick inline se mantiene | Claves validadas no llevan comillas; migrar 53 handlers no compensa | 2026-10-05 | Active |
| SheetJS vendorizado (no CDN, no carga al clic) | iOS pierde la activación de usuario tras un await de red; quita un tercero de confianza (Fable) | 2026-10-05 | Active |
| Meta CSP con hosts concretos ('unsafe-inline' necesario): control de salida, no anti-XSS | *.googleapis.com permitiría exfiltrar a otro proyecto Firebase; residuales documentados | 2026-10-05 | Active |
| Reglas Firestore = copia de prod en repo, nunca se despliegan desde aquí | El repo audita; prod manda; check-firestore-rules.mjs detecta divergencia | 2026-10-05 | Active |
| Tests en tests/ con golden absoluto en fichero (no git HEAD); cambios legítimos con --update-golden | Un fallo commiteado no puede pasar a ser «lo correcto» (F-06-003) | 2026-10-05 | Active |
| Gate git: pre-commit = harness; pre-push = harness + e2e; e2e-csp (terceros) con reintento y escape EASYLOG_PUSH_SKIP_NET=1; nunca --no-verify | Push = deploy; no bloquear un arreglo urgente por Google caído (flake gen_204 demostrado, Fable) | 2026-10-05 | Active |
| e2e con reloj fijo (FIXED_NOW) solo sin Firebase | Resultado independiente del día; Firestore/Auth se cuelgan con Date fijo (Fable) | 2026-10-05 | Active |

## Success Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| CSV importa en PilotLog con night, pistas, T/O-LDG y delays correctos | 100% de vuelos de prueba | Night/T-O-LDG/delays OK (0 errores); pistas confirmadas importan (Fase 4) | Done |
| UK Days usa on-block correcto del último vuelo | 100% de días de prueba | 54/91 calculados; 47 días previos de 2026/27 aún sin revisar uno a uno (Aegis F-RG-002) | Parcial |

## Tech Stack / Tools

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend | HTML/JS vanilla en `index.html` | Una sola página, PWA |
| Hosting | GitHub Pages | Deploy al push a `main` |
| Datos | localStorage + Firebase Firestore | Auth Google |
| Excel | SheetJS 0.20.3 (vendorizado en `vendor/`, sha384 fijado) | Desde 05-02; antes CDN |
| Tests | node:vm harness + playwright-core 1.63.0 (WebKit) | `npm ci`; `node tests/run-all.mjs tests/harness tests/e2e` |
| Referencia CSV | Export CrewLounge PILOTLOG (memoria `reference_crewlounge_export`) | 99 columnas |

## Links

| Resource | URL |
|----------|-----|
| Repository | https://github.com/californiakid91/EASYLOG |
| Production | https://californiakid91.github.io/EASYLOG/ |

---
*PROJECT.md — Updated when requirements or context change*
*Last updated: 2026-10-05 after Phase 6 (Barrera de tests)*
