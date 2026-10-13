---
phase: 07-ukdays-anio-y-limite
plan: 02
subsystem: ukdays
tags: [uk-days, srt, settings, firestore, mergeFields, node-vm, playwright]

requires:
  - phase: 07-01
    provides: año fiscal derivado (taxYearOf/viewTY, label), años congelados (ukFrozenDay)
  - phase: 08-02
    provides: persistencia y sync endurecidas (persistCloud/applyCloudData, requireHydrated, cloudWriteGate)
provides:
  - Límite de días computables configurable por año fiscal (dato del usuario, no del código)
  - Días por circunstancia excepcional con motivo, que no computan (máximo 60 por año)
  - «Máximo posible» con pendientes y textos sin «bonus»
  - Backup por email con las marcas excepcionales y el recuento computable
affects: [uk-days, backup, settings]

tech-stack:
  added: []
  patterns:
    - "_settings como mapa persistido más (local SETTINGS_KEY + campo Firestore 'settings' en mergeFields)"
    - "Lectores defensivos (ukLimitSet/ukExcMap); escritores parten del objeto original (ukExcRaw) para no borrar campos de otras versiones"
    - "requireHydrated antes y después de prompt/confirm/modal"
    - "Claves locales que no son objeto JSON = dañadas (no se sobrescriben)"

key-files:
  created: [tests/harness/harness-uklimit.mjs, tests/e2e/e2e-uklimit.mjs]
  modified: [index.html, tests/harness/harness-autoupdate.mjs, tests/harness/harness-ukdays.mjs, tests/harness/harness-ukdays-rules.mjs]

key-decisions:
  - "El límite vive en los datos del usuario; el código solo lleva un valor por defecto genérico (90, borde de banda del SRT)"
  - "La app registra la marca excepcional con motivo; no decide si es excepcional"
  - "El Excel Tax Year no cambia (columna U = presencia en UK)"

duration: ~2h (plan + revisión + APPLY + G6 + checkpoint)
completed: 2026-10-13
---

# Fase 7, plan 02: límite de UK Days por año y días excepcionales — resumen

**UK Days cuenta días computables (UK menos excepcionales, con un máximo de 60) frente a un límite que el usuario fija para cada año, avisa con el «máximo posible» si hay pendientes y ya no habla de «bonus».**

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: el límite es del año y no está fijo en el código | Pass | Sin `MAX = 91` ni `/ 91`. Muestra «(por defecto)» hasta que se configura. Rechaza valores no válidos. Sin nube cargada no pregunta nada. |
| AC-2: excepcionales con motivo, sin computar, máximo 60 | Pass | Ventana con textarea y motivo obligatorio. Funciona con días de calendario. La marca huérfana no resta y se muestra. Motivo escapado. Backup con `[exc]`. Año cerrado pide confirmación. |
| AC-3: alarma y «máximo posible» | Pass | «En el límite», «Por encima del límite» y márgenes. «Máximo posible … N de L» en ámbar. Sin «bonus». |
| AC-4: persistencia y sync | Pass | `settings` va en el payload y en mergeFields, y sobrevive al snapshot. Un doc sin `settings` usa el valor por defecto. Una clave local dañada no se pisa y se avisa. Cerrar sesión vacía `_settings`. |

## Verification Results

- `harness-uklimit`: 49 checks en verde. Con la versión anterior falla (ReferenceError + 3 FAIL).
- `node tests/run-all.mjs tests/harness`: 16/16. Con `--now` 2027 y 2028: 16/16.
- `e2e-uklimit` (WebKit iPhone 13): 12/12. A 390 px nada desborda.
- Pre-push: 19/19 + e2e-csp.
- Producción `v2026.10.13-142842`, comprobada byte a byte.
- Checkpoint: aprobado por el usuario.

## Review arms

- **Revisión adversaria del plan (Fable): aprobado con cambios.**
  - **1 bloqueante:** el borrador del plan contenía datos fiscales del usuario y se corrigió antes del commit.
  - **Importantes:** backup con excepcionales; reset de `_settings`; modal en vez de `prompt` para el motivo; `requireHydrated` después del `prompt`; `promptImpl` en el harness.
  - **Menores:** etiqueta «(por defecto)», marca huérfana, validación de forma, checks no triviales y layout a 390 px.
  - Todo incorporado.
- **G6 (Fable): `G6-RESULT: 6 hallazgos (5 verificados)`**, todos arreglados, con tests para los 3 primeros:
  1. Una marca sin `at` provocaba `undefined` en el payload y Firestore habría rechazado la escritura.
  2. Marcar o quitar un día borraba campos o entradas de otras versiones → los escritores parten de `ukExcRaw()`.
  3. Una clave local `null` rompía `editUKLimit` → todo lo que no sea objeto se trata como dañado.
  4. La ventana seguía abierta cuando el guardado fallaba.
  5. Faltaba el aviso de año cerrado al quitar una marca.
  6. Había una condición redundante en `editUKLimit`.
- **G7 (CRG, fase 7 completa):** riesgo 0,40, sin impacto alto. CRG no analiza el JS embebido.
- **G8 (`/security-review`, fase 7 = 07-01 + 07-02, Fable): `G8-RESULT: 0 vulnerabilidades reales, 2 notas`.**
  - Verificado sin problema: motivo libre siempre escapado; etiquetas de año e ISO en `onclick` derivadas o validadas; mailto con cuerpo codificado; sin prototype pollution; reglas per-uid sin cambios; sin red nueva; **sin datos fiscales ni personales nuevos en el repo**.
  - Las 2 notas se arreglaron en la transición, con test: `settings` que no es un objeto en la nube se ignora en `applyCloudData`, y `ukShowTY` valida la etiqueta.

## Deviations from Plan

| Type | Count | Impact |
|------|-------|--------|
| Tests añadidos | 1 | `e2e-uklimit` (el plan pedía comprobar el layout; quedó como e2e versionado) |
| Ajuste de alcance | 1 | `hydrateLocal`: tratar como dañado lo que no sea objeto (G6 #3). Afecta a todos los mapas locales; es más seguro. |

- El texto del backup «Total: N confirmados» se mantuvo para no romper la compatibilidad; se añadió la línea «Computables».

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| harness-autoupdate veía la ventana nueva como «abierta», porque solo marcaba como ocultos los modales conocidos | Se añadió `ukexc-modal` a la lista y un caso que comprueba que bloquea la auto-actualización |
| El aviso de clave dañada sale al arrancar, antes de registrar los avisos del harness | El check lee la línea de estado (`#status`) |
| semgrep `unknown-value-with-script-tag` en harness-uklimit | Falso positivo (filename de `vm.runInContext`) |

## Next Phase Readiness

**Ready:** Fase 7 completa (07-01 + 07-02). Con ella, todas las fases del milestone v0.2.

**Concerns:**
- La app no calcula lazos ni bandas del SRT: el límite de cada año lo pone el usuario según su asesor.
- La marca de excepcional no se valida (es decisión del usuario y su asesor).

**Blockers:** Ninguno.

---
*Phase: 07-ukdays-anio-y-limite, Plan: 02*
*Completed: 2026-10-13*
