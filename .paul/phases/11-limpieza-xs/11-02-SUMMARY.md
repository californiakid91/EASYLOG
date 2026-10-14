---
phase: 11-limpieza-xs
plan: 02
subsystem: sync / datos
tags: [firestore, sync, epoch, localStorage, corrupt-data, clipboard, data-act]
requires:
  - phase: 08-sin-perdidas
    provides: regla D2, _cloudWrites, _localCorrupt, requireHydrated
  - phase: 11-01
    provides: DATA_ACTS (tabla cerrada con validador)
provides:
  - epoch de sesión de escrituras (_cloudEpoch) + contador global _writesInFlight para la auto-actualización
  - _cloudCorrupt por campo del documento de Firestore (no se usa, no se reescribe, cambiarlo = error)
  - dayFlights/dayKeys (entradas sin vuelos legibles se saltan al pintar/exportar y se conservan)
  - «Descartar copia dañada» en modo Local (portapapeles + confirm)
affects: [sync, pilotCode (settings), futuras migraciones de forma de datos]
key-files:
  modified: [index.html, tests/harness/harness-sync.mjs, tests/harness/harness-merge.mjs, tests/harness/harness-sin-perdidas.mjs, tests/harness/harness-uklimit.mjs, tests/harness/harness-autoupdate.mjs]
key-decisions:
  - "Sin cuarentena por entrada (Fable): las entradas raras ya se conservan y se toleran al pintar; solo el campo entero no-objeto se trata como dañado"
  - "updateBlockers usa _writesInFlight (sin sesión): no recargar con una escritura vieja aún en la cola del SDK"
  - "Un intento de cambiar un campo dañado avisa y se descarta de memoria (no bloquea los guardados de otros datos)"
  - "Descartar una copia local dañada guarda lo que hay en pantalla (y recalcula UK Days), no lo vacía"
patterns-established:
  - "Leer vuelos de _cache/_excelData siempre vía dayFlights()/dayKeys(), nunca .flights directo"
  - "Escritura a Firestore: capturar ep = _cloudEpoch en el mismo tick que _cloudWrites++/_writesInFlight++ y pasar ep a watchWrite/cloudWriteDone"
duration: ~2h
completed: 2026-10-15
---

# Phase 11 Plan 02: Datos/sync — epoch, campos de la nube dañados, descartar copia local dañada

**Un guardado de una sesión anterior ya no bloquea la nueva; un campo de Firestore con forma rara ni rompe la app ni se borra; una copia local dañada se puede dar por perdida desde la app sin perder su texto.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~2 h (plan + Fable adversario + apply + G6 + checkpoint en prod) |
| Completed | 2026-10-15 |
| Tasks | 3 auto + 1 checkpoint |
| Files modified | 6 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Escritura de sesión anterior no bloquea la nueva | Pass | harness-sync EP (otra cuenta, misma cuenta con hasPendingWrites, vieja resuelve/rechaza, watchWrite, D2 en la nueva, updateBlockers) |
| AC-2: Aviso al salir con escrituras sin confirmar | Pass | confirm de «Salir» y switchMode con y sin escrituras; cancelar no cambia nada |
| AC-3: Forma rara de la nube no rompe ni se borra | Pass | harness-merge (doc normal, history=[], settings="x", dayMap=null, ukdays="x", entradas sin flights/null); harness-uklimit adaptado |
| AC-4: Descartar copia local dañada | Pass | harness-sin-perdidas + checkpoint en PRODUCCIÓN (WebKit iPhone 13) |

## Verification Results

- `node tests/run-all.mjs tests/harness tests/e2e` → 23/23 OK
- `node tests/run-all.mjs --now=2027-06-01T12:00:00Z tests/harness` → 19/19 OK
- Gate pre-push (harness + e2e-csp) OK en los 2 push
- Prod `2026.10.14-230928` comprobada con curl
- Checkpoint en producción (script WebKit/iPhone 13 de Claude, scratchpad): 21/21 PASS — arranque normal sin avisos; lista + calendario dañados → aviso con ambos y 2 botones; pegar → err sin pisar; portapapeles = texto original exacto (portapapeles simulado); cancelar = nada; aceptar = día pegado guardado + UK Days recalculado; recarga limpia; modo Nube: login, sin botones, sin errores.

**No comprobado (huecos):** Firestore real (logout con escritura pendiente, campo dañado de verdad: cubierto por harness), portapapeles real de Safari, iPhone del usuario.

## Review arms

- **Fable adversario al plan:** 9 hallazgos (1 bloqueante: bloqueo silencioso con campo dañado en nube), todos incorporados; Task 2 reducida (sin cuarentena por entrada).
- **G6 (Fable, background):** 2 hallazgos, 0 bloqueantes, ambos arreglados: (1) bloqueo pegajoso tras intentar cambiar un campo dañado → se descarta de memoria; (2) descartar la copia vaciaba lo pegado en pantalla → se guarda.
- **Checkpoint:** 2 fallos reales encontrados y arreglados (e6b135b): UK Days no se recalculaba al descartar («re-pégalo»); aviso de arranque solo nombraba el calendario.
- G7/G8: en la transición de fase.

## Task Commits

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Tasks 1–3 + G6 | `19a0504` | feat | epoch de sesión, _cloudCorrupt + guardas de pintado, descartar copia dañada, tests |
| Checkpoint | `e6b135b` | fix | backfill UK Days al descartar; aviso de arranque con todas las copias dañadas |

## Files Modified

| File | Change | Purpose |
|------|--------|---------|
| `index.html` | Modified | _cloudEpoch/_writesInFlight, unconfirmedWritesNote, _cloudCorrupt/cloudCorruptBlocked, dayFlights/dayKeys, #corrupt-box/renderCorruptBox/discardCorrupt, DATA_ACTS.discardCorrupt, CAL_KEY arriba + en LOCAL_KEY_NAMES |
| `tests/harness/harness-sync.mjs` | Modified | +17 checks de epoch/sesión |
| `tests/harness/harness-merge.mjs` | Modified | +15 checks de campos dañados y entradas raras |
| `tests/harness/harness-sin-perdidas.mjs` | Modified | +14 checks de descartar; confirm recibe el mensaje; navigator.clipboard stub |
| `tests/harness/harness-uklimit.mjs` | Modified | settings no-objeto: de «se guarda limpio» (= borrado) a «no se escribe + error» |
| `tests/harness/harness-autoupdate.mjs` | Modified | bloqueo «escritura en vuelo» con _writesInFlight |

## Deviations from Plan

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 4 | Esenciales, sin ampliar alcance |
| Scope additions | 0 | — |
| Deferred | 0 | — |

1. **CAL_KEY movido al bloque de claves** (Task 3): añadirlo a LOCAL_KEY_NAMES daba TDZ al cargar.
2. **Tests existentes adaptados**: harness-uklimit codificaba el borrado de settings que el plan corrige; harness-autoupdate usaba `_cloudWrites` para el bloqueo de recarga.
3. **Guardas extra no listadas**: rama «idéntico» de addDay (`prev === hist[iso]`), changedMeanwhile con la misma regla que prev, exportSnapshot y excelOnlyHTML con dayKeys/dayFlights.
4. **Arreglos G6 + checkpoint** (ver Review arms).

## Next Phase Readiness

**Ready:** Fase 11 completa (2/2) → transición (G7 + G8) y cierre de v0.3 tras decidir la fase pilotCode.

**Concerns:**
- Con un campo dañado en la nube el usuario no tiene botón para repararlo (aviso visible; se decide si ocurre).
- Logout no vacía _excelData/_airports/_ukdays (preexistente, visto por G6).

**Blockers:** None

---
*Phase: 11-limpieza-xs, Plan: 02 — Completed: 2026-10-15*
