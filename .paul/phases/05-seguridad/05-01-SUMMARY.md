---
phase: 05-seguridad
plan: 01
subsystem: security
tags: [xss, input-validation, firestore, harness, webkit]

requires:
  - phase: 04-pista-en-uso
    provides: AIRPORT_DB, rwyKeys, harness-airports (patrón), e2e-runways
provides:
  - Validación IATA de tokens de aeropuerto del email (sin prompts ni _airports para no-IATA)
  - Filtrado ISO de claves de estado antes de pintar (isoKeys) — contadores coherentes
  - esc() en onBlock/tz/etiqueta de procedencia de UK Days; whitelist CAL_STATES en calendario
  - Parser ignora claves __…__ y >500 chars (Firestore); clave de pistas acotada a 64+64
  - removeAirportAt(i) para claves de aeropuerto inválidas (visibles escapadas, borrables)
  - harness-seguridad.mjs (rojo verificado contra el código anterior)
affects: [05-02 CSP/SRI, 06 barrera de tests, 08 sin pérdidas silenciosas]

tech-stack:
  added: []
  patterns: ["Validar formato antes de interpolar en onclick inline (no delegación)", "Filtrar en origen de lista, nunca podar estado"]

key-files:
  created: [.paul/phases/05-seguridad/harness-seguridad.mjs]
  modified: [index.html]

key-decisions:
  - "F-04-007 (fórmulas CSV) = monitor, fuera de alcance: REMARKS es el nº de vuelo y un ' alteraría el logbook legal"
  - "Claves inválidas de fecha se ocultan con console.warn, sin borrar; las de aeropuerto se muestran escapadas con borrado por índice"
  - "Checkpoint iPhone verificado por Claude a petición del usuario (WebKit iPhone 13, datos reales de Firestore, versión vieja vs nueva)"

patterns-established:
  - "Harness de seguridad: argumentos de onclick extraídos con /onclick=\"\\w+\\('(.*?)'\\)\"/ y validados; HTML 'unsafe' = etiqueta real o atributo de evento dentro de etiqueta real"
  - "Golden CSV pineado a un SHA fijo (BASE_SHA), no HEAD"

duration: ~1h
started: 2026-10-05T10:05:00+01:00
completed: 2026-10-05T10:40:00+01:00
---

# Phase 5 Plan 01: Anti-inyección Summary

**Ningún dato del email, localStorage o Firestore llega ya como código a la app: aeropuertos solo IATA, claves de fecha validadas antes de pintar, textos escapados, calendario con whitelist y claves del email que romperían Firestore descartadas — sin cambio visible con datos reales.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~1 h (plan + Fable + apply + G6 + verificación) |
| Tasks | 3 auto + 1 checkpoint, todas completadas |
| Files modified | 2 (index.html, harness nuevo) |
| Deploy | v2026.10.05-102039 (commit 16e5c94), verificado con curl/cmp |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Código de aeropuerto con payload no se guarda ni se ejecuta | Pass | harness (a)+(b): 0 prompts, _airports intacto; inválida visible escapada, "inválido", removeAirportAt(n), contador = filas |
| AC-2: Estado manipulado no llega crudo a HTML/onclick | Pass | harness (c)+(d): 0 args de onclick fuera de formato, 0 etiquetas/atributos de evento reales, contadores sobre lista filtrada, estado intacto |
| AC-3: Claves reservadas/enormes del email no rompen Firestore | Pass | harness (e): `__X__`, `a__b__c`, clave de 600 chars ignoradas; día guardado |
| AC-4: Sin regresiones + verificado en iPhone | Pass | 12 harness 0 FAIL; E2E WebKit PASS; CSV normal byte-idéntico a 33ae9b9; comparación vieja/nueva con datos reales idéntica (ver abajo) |

## Verification Results

- harness-seguridad.mjs contra el código anterior (33ae9b9): **11 FAIL** (rojo verificado); contra el nuevo: **TODO OK** (25 checks + 5 de G6).
- 11 harness previos + run.mjs: rc=0, 0 FAIL. E2E e2e-runways (WebKit iPhone 13): E2E PASS (antes y después de las correcciones G6).
- Producción: `curl` → `APP_VERSION = '2026.10.05-102039'`; `cmp prod.html new.html` idénticos.
- Checkpoint (delegado por el usuario: "compruébalo tú"): script Playwright WebKit iPhone 13 con los datos reales de Firestore cargados en modo local; versión 33ae9b9 vs nueva: #history, #ukdays-body (54/91), #airports-list (9), calendario de 12 meses, mensaje y estado tras pegar el email real del 02/10, CSV (4 filas) y Excel (482 líneas) **idénticos**; 0 errores de página. SheetJS servido localmente en la simulación (el CDN no cargaba desde el entorno de prueba). Copia local de los datos borrada tras la prueba. No probado: la importación en PilotLog (CSV idéntico al anterior, que ya importaba).

## Review arms

- **G6 /code-review** (opus, background, señal "REVIEW COMPLETE — 1 confirmed, 2 plausible"): 0 regresiones con datos reales. Corregidos los 3:
  1. CONFIRMED (preexistente): `source` no-texto rompía ukSourceLabel → guard de tipo.
  2. PLAUSIBLE: rwyKeys podía generar nombres de campo >1500 bytes desde el email → FlightNumber y City Pair acotados a 64 (claves reales sin cambio, verificado).
  3. PLAUSIBLE: backfillUKDays copiaba claves inválidas a _ukdays; "Borrar historial" deshabilitado con solo claves ocultas → isoKeys en backfill + disabled sobre Object.keys(hist).
- G7 CRG (commit hook): risk 0.40, "untested" = helpers del propio harness; CRG no parsea JS embebido → informativo.
- G8 /security-review: se ejecuta 1×/fase en la transición (tras 05-02).

## Deviations from Plan

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 4 | Esenciales, sin scope creep |
| Scope additions | 0 | — |
| Deferred | 0 | — |

1. **Harness: regex de argumentos de onclick demasiado blanda** (`[^']*` capturaba solo la fecha de `2026-10-06');alert(1);//`) → cambiado a `(.*?)'\)"`; con ello el rojo pasó de 9 a 11 FAIL (detecta más).
2. **Harness: detector "unsafe" daba falso positivo sobre texto ya escapado** (`&lt;img … onerror=`) — previsto por Fable → ahora solo etiqueta real o atributo de evento dentro de etiqueta real; se re-verificó que sigue en rojo (11 FAIL) contra 33ae9b9.
3. **Correcciones G6** (3) añadidas al plan con casos (c2) en el harness.
4. **Checkpoint humano hecho por Claude** a petición explícita del usuario, con verificación más fuerte que la manual (comparación byte a byte con datos reales).

## Next Phase Readiness

**Ready:** 05-02 (SRI/CSP para SheetJS y Firebase + firestore.rules versionado). Las listas ya no tienen sinks con datos no validados, lo que simplifica el CSP.

**Concerns:** los 51 onclick inline obligan a `script-src 'unsafe-inline'` en el CSP de 05-02 (su valor estará en connect-src/img-src/form-action). Valores con forma incorrecta (no claves) aún pueden romper un render → Fase 8.

**Blockers:** None

---
*Phase: 05-seguridad, Plan: 01 — Completed: 2026-10-05*
