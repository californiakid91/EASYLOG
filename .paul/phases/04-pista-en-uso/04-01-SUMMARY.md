---
phase: 04-pista-en-uso
plan: 01
subsystem: aeropuertos
tags: [ourairports, coordenadas, pistas, icao]
requires: []
provides: [airportInfo (IATA → ICAO, lat/lon, pistas con rumbo verdadero), AIRPORT_DB embebida]
affects: [04-02 pista en uso, noche (más aeropuertos con coordenadas)]
key-files: [index.html, .paul/phases/04-pista-en-uso/gen-airports.py, .paul/phases/04-pista-en-uso/harness-airports.mjs]
key-decisions:
  - Subconjunto OurAirports embebido (no fetch en ejecución); precedencia personalizados > AIRPORTS > DB
  - Pista sin rumbo en OurAirports → ident×10 marcado aproximado
duration: ~25 min
completed: 2026-10-05
---

# 04-01: Base de aeropuertos OurAirports embebida

**La app conoce 896 aeropuertos (Europa, Canarias, Norte de África, Oriente Medio cercano) con ICAO, coordenadas y 979 pistas con rumbo verdadero: ya no pide lat/lon para la red Ryanair.**

## Acceptance Criteria

| AC | Resultado | Evidencia |
|---|---|---|
| AC-1 Coordenadas sin preguntar | Pass | GDN→TTU pegado sin prompts y con TIME_NIGHT calculado; JFK (fuera de la zona) sigue pidiendo; los 134 aeropuertos del export privado de PilotLog se resuelven |
| AC-2 Precedencia sin regresión | Pass | Personalizado > AIRPORTS > DB; STN conserva sus coordenadas; 9 arneses previos en verde |
| AC-3 Pistas e ICAO | Pass | STN EGSS 04/22 (44°/224°), ALC LEAL 10/28, DUB EIDW 10L/28R/10R/28L/16/34; TTU con rumbo aproximado 07/25 |
| AC-4 Tamaño y regenerable | Pass | Bloque 31,9 KB entre marcadores; dos ejecuciones → mismo md5 |

## Revisiones
- Fable (adversario, 04-01 + 04-02): aprobar con cambios. Los 13 puntos se incorporaron (04-FABLE-REVIEW.md); para 04-01: excluir RU/BY/UA/KZ, ICAO `^[A-Z]{4}$`, rumbo aproximado, ≤ 60 KB, ejemplo JFK.
- G6 `/code-review` (sonnet): **sin hallazgos de corrección**. Formato de las 896 entradas verificado, string JS seguro (sin `'`, `\`, saltos), inserción idempotente.

## Archivos
| Archivo | Cambio |
|---|---|
| index.html | `AIRPORT_DB` (generado), `airportInfo`, `airportCount`, `resolveAirport` con la DB como último recurso, texto de la tarjeta Aeropuertos |
| gen-airports.py | Generador idempotente (stdlib) desde airports.csv + runways.csv de OurAirports |
| harness-airports.mjs | 24 pruebas |

## Desviaciones
- Ninguna sobre el plan corregido por Fable. Nota: el generador se ejecutó con airports.csv del 04/10 (copia local) y runways.csv descargado hoy.

## Siguiente
04-02: sugerencia de pista (METAR IEM + rumbos + preferente) con confirmación y DEP_RWY/ARR_RWY en el CSV.
