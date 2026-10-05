# Fase 4 — Dialéctica de fuente para DEP_RWY / ARR_RWY (2026-10-05)

Workflow `fable-dialectic` (run wf_5787f4bb-f96): 2× Fable + bus Opus, 2 rondas. Confianza: **media**.

## Datos verificados antes del debate
- **IEM** (mesonet.agron.iastate.edu asos.py): `Access-Control-Allow-Origin: *`, METAR global histórico, devuelve `drct`/`sknt` ya parseados.
- **OurAirports** runways.csv / airports.csv: CORS `*`; rumbos verdaderos `le_heading_degT`.
- **OpenSky**: histórico 403 sin cuenta.
- **FR24 API** (Flight summary full → `runway_takeoff`/`runway_landed`): CORS permite el origen github.io; requiere token, Explorer 9 $/mes, 30 días.
- **adsb.lol globe_history** (idea del usuario: rumbo real antes de aterrizar): trazas completas gratis (≥1 mes) **pero sin cabecera CORS** → inaccesible desde la PWA sin un proxy (servidor).
- **Backtest** con 12 pistas reales del usuario (export PilotLog 18-20/10/2025): regla pura de viento 6/12; con «calma/cola ≤5 kt/cruzado → pista preferente» ≈11/12 (proyección). El export grande (pl.csv) no trae columnas de pista → no hay más verdad de referencia.

## Polos
- **A:** METAR (IEM) + rumbos OurAirports + preferente aprendida + confirmación; vacío si no se confirma.
- **B:** FR24 API con token personal; vacío sin token o > 30 días.

## Recomendación del bus (adoptada)
Polo A ahora; FR24 solo si el usuario lo pide (pago + token = decisión suya).
- Niveles: **alta** (cara ≥ ~5 kt, o calma/cruzado con preferente conocida/aprendida) → sugerida y preseleccionada; **baja** (cola ≤5 kt sin preferente, cruzado exacto, VRB, sin METAR, aeropuerto desconocido) → no se preselecciona: chips con las cabeceras; **confirmada** = lo que el piloto confirma/elige (alimenta la preferente).
- **Exportación:** DEP_RWY/ARR_RWY solo si están confirmadas; sin confirmar → vacío. Un toque «Confirmar pistas» por día.
- `getRunwaySuggestion(sector)` como punto de enchufe para una fuente exacta futura (FR24 / ADS-B vía proxy).

## Trade-offs aceptados
Nunca exacta como ADS-B; fricción de confirmar (baja con el aprendizaje); riesgo de «aceptar sin mirar» en alta; preferente única por aeropuerto (sin matiz horario); IEM sin SLA → si cae, todo manual; más código que B.

## Diferido
- FR24 (decisión de pago del usuario) · ADS-B adsb.lol vía proxy (Cloudflare Worker = cuenta del usuario).
