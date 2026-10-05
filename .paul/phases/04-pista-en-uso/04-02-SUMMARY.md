---
phase: 04-pista-en-uso
plan: 02
subsystem: csv
tags: [pistas, metar, iem, ourairports, pilotlog, firestore]
requires:
  - phase: 04-01
    provides: airportInfo (ICAO + rumbos de pista)
provides:
  - Sugerencia de pista por viento METAR (IEM) + preferente aprendida
  - Confirmación de pistas por día (🛬) con persistencia local + nube (campo runways)
  - RWY_DEP / RWY_ARR en el CSV (solo confirmadas)
affects: [CSV PilotLog, Firestore users/{uid}.runways]
key-files:
  created: [.paul/phases/04-pista-en-uso/harness-runways.mjs, .paul/phases/04-pista-en-uso/e2e-runways.mjs]
  modified: [index.html, .paul/phases/02-csv/harness-csv.mjs, .paul/phases/03.1-pwa-autoupdate/harness-autoupdate.mjs]
key-decisions:
  - "Polo A (dialéctica): METAR + rumbos + preferente + confirmación; FR24/ADS-B diferidos"
  - "Solo lo confirmado va al CSV; sin confirmar → vacío"
  - "Cabeceras del IMPORTER: RWY_DEP/RWY_ARR (no DEP_RWY/ARR_RWY del export)"
patterns-established:
  - "Nombres de columnas del CSV = lista del importer de CrewLounge (no el export)"
  - "Nuevo mapa en la nube = campo propio en mergeFields + guard *_Saving + reset en signOut/switchMode"
duration: ~2h (incl. dialéctica y revisión Fable de la fase)
completed: 2026-10-05
---

# 04-02: Pista en uso — sugerida por el viento, confirmada por el piloto

**Cada día de «Días guardados» tiene 🛬: la app sugiere la pista con el METAR real (IEM) a la hora de despegue/aterrizaje + rumbos OurAirports + la pista habitual aprendida; el piloto confirma con un toque y PilotLog importa RWY_DEP/RWY_ARR (verificado por el usuario).**

## Acceptance Criteria

| AC | Resultado | Evidencia |
|---|---|---|
| AC-1 Motor de sugerencia | Pass | 16 pruebas, incl. los casos del backtest real (EGSS 13010KT→22 con preferente, LEAL calma→10, EICK→16, LBSF 09010→09, LBSF 08003→low, paralelas DUB) |
| AC-2 Viento a la hora correcta | Pass | parseIEM por nombre de cabecera, HTML/ERROR→null, ≤75 min, post-medianoche usa el METAR del día siguiente, 1 llamada por icao+duty, fallo no cacheado; smoke real IEM (LEAL 18/10/2025 19:30Z calma) |
| AC-3 Confirmar pistas por día | Pass | Arnés (preselección, etiquetas, «otra» validada, Cancelar, desmarcar, persistencia local, re-pegar/horas corregidas/quitar de la lista/recargar) + E2E WebKit iPhone 13 |
| AC-4 Preferente aprendida | Pass | Más confirmada, empate → más reciente, semilla STN 22, sin almacenamiento aparte |
| AC-5 CSV | Pass | Columnas nuevas al final, resto idéntico al pre-fase (golden), vacío si no confirmada, aviso warn en la descarga |
| AC-6 Importa en PilotLog | Pass | Usuario «approved» (2026-10-05) tras corregir los nombres de cabecera (ver desviación 1) |

## Revisiones
- **Fable adversario** (planes 04-01 + 04-02): aprobar con cambios, 13 puntos incorporados (04-FABLE-REVIEW.md).
- **G6 `/code-review`** (sonnet): 2 PLAUSIBLE, ambos corregidos con pruebas: «otra» tecleada sin `change` en iOS se perdía al confirmar (+ sugerencia tardía pisaba un campo ya tocado; + texto pendiente pisaba el botón elegido); re-confirmar sin cambios alteraba la fecha (desempate).
- **G8 `/security-review`** (sonnet, toda la fase): sin HIGH/MEDIUM. 2 LOW aplicados: valor de pista re-validado al exportar (anti-fórmula), `referrerPolicy: no-referrer` hacia IEM. INFO: IEM ve aeropuerto + fecha del duty (sin credenciales).
- **G7 CRG**: riesgo 0,40 informativo (no parsea el JS embebido en index.html).
- Arneses: 11 en verde (harness-runways 70 pruebas) + E2E PASS.

## Desviaciones
1. **Nombres de cabecera** (encontrado en el checkpoint): el importer rechazó `DEP_RWY`/`ARR_RWY` («column headers are not recognized») aunque son los del export de PilotLog. La guía oficial de importación usa **`RWY_DEP`/`RWY_ARR`** y empareja por nombre. Corregido en 33ae9b9; memoria `reference_crewlounge_export` actualizada.
2. Ajustes de UI tras la E2E: «viento en calma», placeholder en minúsculas, fila del día más compacta en pantallas ≤ 430 px.
3. Arneses previos adaptados (no regresiones): harness-csv (el aviso de descarga ahora incluye las pistas) y harness-autoupdate (la ventana de pistas bloquea la recarga como las demás).

## Diferido
- FR24 API (pistas exactas, 9 $/mes + token del usuario) · ADS-B adsb.lol (sin CORS → necesitaría proxy, p. ej. Cloudflare Worker con cuenta del usuario).
- Preferente única por aeropuerto (sin matiz horario/flujo, p. ej. STN de noche).
- Auto-actualización descarga index.html entero cada 5 min (+32 KB por la DB) → `cache:'no-cache'` (304).

## Archivos
| Archivo | Cambio |
|---|---|
| index.html | rwyKeys, rwyPref, suggestRunway, parseIEM/fetchWinds/windAt, getRunwaySuggestion, dutyMeta/buildCSV, runwaysMissing, _runways (local + nube + guard), modal 🛬 (CSS + HTML + JS), RWY_DEP/RWY_ARR |
| harness-runways.mjs | 70 pruebas (motor, viento, UI lógica, persistencia, nube, CSV, G6/G8) |
| e2e-runways.mjs | E2E WebKit iPhone 13 con IEM interceptado |

## Commits
`60efbe5` feat(04-02) · `4cd03f1` docs checkpoint · `33ae9b9` fix(04-02) cabeceras RWY_DEP/RWY_ARR
