# EasyLog

## What This Is

App web de una sola página (`index.html`, PWA en GitHub Pages + Firebase) para un FO de Ryanair. Se pega el email del vuelo de Ryanair y la app genera el CSV para importar en PilotLog (CrewLounge), rellena el Excel Tax Year, lleva el control de UK Days y mantiene un calendario OFF/STBY/DUTY/SIM.

## Core Value

Como piloto FO de Ryanair, pego el email del vuelo y obtengo sin errores mi logbook PilotLog, mi Excel Tax Year y el control de UK Days, sin introducir nada a mano dos veces.

## Current State

| Attribute | Value |
|-----------|-------|
| Type | Application |
| Version | 0.2.0 (v0.2 Seguridad y robustez, cerrado 2026-10-14) |
| Status | Production — v0.2.0; v0.3 Pegar sin sorpresas en curso |
| Last Updated | 2026-10-15 (Fase 11 Limpieza XS completa) |

**Production URLs:**
- https://californiakid91.github.io/EASYLOG/ — app (deploy automático al push a `main`)

## Requirements

### Core Features

- Parsear email de vuelo Ryanair → registro de vuelo
- Exportar CSV PilotLog (formato CrewLounge PILOTLOG)
- Exportar Excel Tax Year (reglas en `REGLAS_EXCEL_TAX_YEAR.md`)
- Tracker UK Days (6 abr – 5 abr, límite de días computables configurable por año)
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
- [x] Sin pérdidas silenciosas: sin nube cargada nada cambia ni se vacía el cuadro y se avisa donde se actúa; OK solo si se guardó; fallos de guardado visibles; copia local dañada nunca se pisa — Phase 8 (08-01)
- [x] Sync endurecida: sin guardas por temporizador (regla por escrituras en vuelo), «Sin confirmar · no recargues» si la nube no confirma, listener que se rearma solo, relectura del servidor al volver de segundo plano (no se escribe desde memoria vieja) — Phase 8 (08-02)
- [x] UK Days computables: límite por año fiscal guardado en los datos del usuario, días por circunstancia excepcional con motivo (no computan, máx. 60/año), «máximo posible» con pendientes, sin «bonus»; backup con excepcionales — Phase 7 (07-02)
- [x] UK Days «Fuera de UK»: total real de días pasados no UK (guardados + OFF de calendario), desglose trabajo / libres con desplegable, backup con el desglose; botón «UK» con confirmación — Phase 7.1 (07.1-01)
- [x] SAFETY PILOT al pegar: 3 pilotos y VEGRIC en ningún despegue/aterrizaje → pregunta; CSV con total 0:00, Pilot 3 SELF y remarks «FRxxxx SAFETY PILOT» (importado en PilotLog con 0 errores); emails de 2025 con tabuladores se pueden pegar — Phase 9 (09-01)
- [x] UK Days: avisos al pegar — email que contradice una marca manual → pregunta (también al re-pegar); «⚠ el email dice …» en la lista; motivos de decisiones a mano sin instrucciones («DUTY sin email») — Phase 10 (10-01)
- [x] Limpieza de pantalla: aviso de Google (gen_204) solo a consola con host+ruta exactos; botones con datos por data-act (tabla cerrada, sin onclick con datos); backup UK Days también al portapapeles — Phase 11 (11-01)
- [x] Sync y datos: una escritura de una sesión anterior no bloquea la nueva (epoch) ni deja recargar con algo en cola; campos de la nube con forma rara ni rompen la app ni se borran; «Descartar copia dañada» en modo Local (texto al portapapeles + confirmación) — Phase 11 (11-02)
- [x] e2e propios (playwright-core fijado, `npm ci`) + gate git: commit bloqueado si fallan los harness; push (= deploy) bloqueado si fallan harness o e2e — Phase 6 (06-02)

### Active (In Progress)

- [ ] Comprobar histórico ya importado en PilotLog (sin NIGHT; posibles fechas post-medianoche) con informe sobre export de PilotLog

- [x] Seguridad y robustez post-Aegis (informe 2026-10-05) — v0.2:
  - [x] Documento único de Firestore: medido 127 KiB (12 %) y ~1,9k entradas de índice (5 %) → ~2,5 años de margen; deja de ser HIGH (vigilar)
  - [x] XSS por código de aeropuerto + SRI/CSP para CDNs — Phase 5
  - [x] Reglas de Firestore versionadas en el repo (per-uid) + restricciones de la apiKey — Phase 5
  - [x] Año fiscal derivado de la fecha + selector ‹ año › + años cerrados protegidos — Phase 7 (07-01)
  - [x] Límite configurable por año + días excepcionales + máximo posible + sin «bonus» — Phase 7 (07-02)
  - [x] Avisos "ok" que tapan escrituras bloqueadas; errores de guardado visibles; copia local dañada protegida — Phase 8 (08-01)
  - [x] Política de sincronización entre dispositivos: LWW por mapa endurecido (dialéctica Fable; merge por día diferido) — Phase 8 (08-02)
  - [x] Barrera de tests (runner único + fixtures anonimizadas versionadas + gate pre-commit/pre-push) — Phase 6
- [x] Propietario (sin código): GitHub 2FA activado + protección de rama main; historial git purgado (2026-10-05, ticket de caché a GitHub abierto)

### Planned (Next)

- [x] Limpieza XS de diferidos G6/G8 (Fase 11, 2026-10-15)
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
| Mutadores: guarda requireHydrated al inicio + OK solo si se guardó; payload de Firestore capturado antes de await; copia local dañada nunca se sobrescribe sola | Aegis F-02-006/F-RG-003/F-02-004 + revisión Fable (carrera real del await; backfill pisaba la clave dañada) | 2026-10-11 | Active |
| Sync = gana el último por mapa, endurecido: con escrituras en vuelo se descarta el snapshot sin hasPendingWrites; _cloudWrites solo baja al confirmar/rechazar (nunca por tiempo); al volver de >60 s sin señal no se escribe hasta releer el servidor | Dialéctica Fable (un usuario, online, un dispositivo cada vez); merge por día añadiría una base que diverge justo cuando algo falla; G6 Fable | 2026-10-11 | Active |
| UK Days: límite = ajuste del usuario por año (en sus datos, nunca en el código; default genérico 90); computables = UK − excepcionales (máx. 60); la app registra la marca con motivo, no la valida | El criterio fiscal es del usuario y su asesor y cambia por año; el repo es público; Sch 45 para 22(6) | 2026-10-13 | Active |
| «Fuera de UK» = días pasados no UK; trabajo = email / ruta real / DUTY-SBY-SIM-SD, resto libre; acciones de la lista con confirm | La lista «No UK» solo mostraba entradas guardadas y se leyó como total; un toque accidental en «UK» cambió un día | 2026-10-14 | Active |
| SAFETY PILOT = día entero (3+ CP/FO y VEGRIC sin TO/LDG) con confirm; CSV sin TIME_TO/TIME_LDG y total 0 | Criterio del usuario (nunca cambio de asiento a mitad); PilotLog rechaza AIR > TOTAL si van despegue/aterrizaje (import real 27/09/2025) | 2026-10-14 | Active |
| Marca manual de UK Days contradicha por el email → confirm (Aceptar = email, Cancelar = marca), también al re-pegar idéntico; relectura tras cada confirm; avisos de la CSP: el píxel img-src www.google.com solo a consola | La marca manual ganaba en silencio (03/10/2026); re-pegar es como el usuario comprueba un día; el aviso rojo de Google alarmaba sin ser un riesgo | 2026-10-14 | Active |
| Sesión de nube con epoch (escrituras viejas no tocan la sesión nueva; recarga bloqueada por un contador global); campo de Firestore no-objeto = dañado (no se usa, nunca se reescribe, cambiarlo = error); sin cuarentena por entrada | Disponibilidad tras logout (G8 08) y defensa en profundidad sin poder borrar datos de la nube (Fable: la cuarentena por entrada reimplementaba lo que ya había y abría un bloqueo silencioso) | 2026-10-15 | Active |
| Año fiscal derivado de la fecha, sin estado; FLOOR 06/04/2026; año congelado a +30 días (solo el usuario escribe, con confirm) | Dialéctica Fable: un flag "closed" en Firestore añade carreras y migración; la evidencia declarada no se recalcula sola | 2026-10-06 | Active |

## Success Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| CSV importa en PilotLog con night, pistas, T/O-LDG y delays correctos | 100% de vuelos de prueba | Night/T-O-LDG/delays OK (0 errores); pistas confirmadas importan (Fase 4) | Done |
| UK Days usa on-block correcto del último vuelo | 100% de días de prueba | 2026/27 revisado día a día por el usuario (2026-10-14; cifras solo en memoria local) | Done |

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
*Last updated: 2026-10-15 after Phase 11*
