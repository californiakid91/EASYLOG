---
phase: 14-vuelo-otra-fecha
plan: 01
subsystem: pegado / Excel Tax Year
tags: [duplicados, pilotlog, excel, numero-de-vuelo]
requires:
  - phase: 03.2-datos-coherentes
    provides: duplicados misma fecha (flightsKey, crewDiff, changedMeanwhile)
provides:
  - aviso con confirm cuando un sector ya está guardado en otra fecha
  - número de vuelo del Excel con prefijos/sufijos tal cual (normFlightNo)
key-files:
  created: [tests/harness/harness-otra-fecha.mjs]
  modified: [index.html, REGLAS_EXCEL_TAX_YEAR.md, tests/harness/harness-anio-fiscal.mjs, tests/harness/harness-duplicados.mjs]
key-decisions:
  - "Firma de sector = normFlightNo + City Pair + matrícula (sin guiones) + Off Block; sin On Block (email corregido en la llegada sigue detectándose)"
  - "Solo avisan sectores que no estén ya en la misma fecha (re-pegar un día aceptado no repite el aviso)"
  - "FR solo delante de dígitos con, como mucho, una letra final; otros prefijos y sufijos tal cual"
completed: 2026-11-11
---

# Fase 14 Plan 01: aviso de vuelo repetido en otra fecha + número de vuelo del Excel

**Al pegar un día con un sector ya guardado en otra fecha, la app pregunta antes de escribir. El aviso dice el daño real (PilotLog puede duplicarlo, el Excel lo cuenta dos veces y puede sumar un UK Day) y cómo deshacerlo. El Excel Tax Year deja `RKxxxx` y `FRxxxxP` tal cual, ya no sale `FRRK…`.**

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Sector repetido en otra fecha → confirm con el daño real | Pass | casos (a), (b), (i), (j), (l): cancelar = 0 escrituras y el texto se conserva |
| AC-2: Firma sin falsos positivos | Pass | (c), (d), (f): otra matrícula u otro Off Block no avisan; otro On Block sí; variantes del número |
| AC-3: Convive con los flujos existentes | Pass | (e), (g), (k), (m): orden antes de «¿Reemplazar?», re-pegado idéntico sin aviso, post-medianoche |
| AC-4: Número de vuelo del Excel | Pass | (h) con 7 variantes; golden del CSV intacto |

## Verification

- `node tests/harness/harness-otra-fecha.mjs`: 29/29 PASS
- `node tests/run-all.mjs tests/harness tests/e2e`: 26/27. e2e-csp falló solo por la red de Node (ver Issues). Aparte, con `NODE_OPTIONS=--network-family-autoselection-attempt-timeout=2000`, E2E PASS → 27/27
- `node tests/run-all.mjs --now=2027-08-01T12:00:00Z tests/harness`: 23/23
- Golden del CSV sin cambios

## Review arms

- **Fable (adversario del plan):** aprobar con cambios. Se aplicaron todos:
  - el texto dice el daño real y que hay que quitar el día de la lista Y del Excel;
  - el número con letra final lleva FR;
  - re-pegar un día aceptado no vuelve a avisar;
  - Off Block en la firma, On Block fuera;
  - punto de inserción sin mover `changedMeanwhile`;
  - tests de orden, de otro dispositivo y post-medianoche.
- **G6 (/code-review, Sonnet):** 1 hallazgo VERIFICADO de severidad baja, en un test. harness-anio-fiscal (iv) «cancelar» cancelaba el aviso nuevo en vez del confirm de año cerrado. Arreglado: el 04/11 tiene otros calzos y el test comprueba qué confirm salió. Producción: refutados el resto (orden, TDZ, re-pegado, excelRowsForDay).
- **G7 (CRG):** riesgo 0,30, informativo (CRG no analiza el JS incrustado en index.html).
- **G8 (seguridad, inline):** sin superficie nueva. El aviso es un `confirm()` de texto plano, no hay interpolación en el DOM y el número del Excel viene del mismo campo del email que antes.

## Files

| File | Change |
|------|--------|
| index.html | `normFlightNo`, `sectorSig`, `sameFlightOtherDates`; confirm en `addDay` tras `otherDevice` y antes de `if (prev)`; `fNo` del Excel con `normFlightNo` |
| REGLAS_EXCEL_TAX_YEAR.md | regla FLIGHT NO: FR solo delante de dígitos (+ 1 letra); RK… y sufijos P tal cual |
| tests/harness/harness-otra-fecha.mjs | nuevo: casos (a)–(m) |
| tests/harness/harness-anio-fiscal.mjs | (iv): quita el día sintético repetido; el «cancelar» usa otros calzos y comprueba el confirm de año cerrado |
| tests/harness/harness-duplicados.mjs | «día nuevo» con otra matrícula (rotación normal) |

## Deviations

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 3 | 2 tests antiguos con sectores sintéticos repetidos en otra fecha (comportamiento nuevo esperado) + G6 |
| Deferred | 2 | ver abajo |

- **Diferido:** barrido en la app de sectores ya guardados en dos fechas (hoy solo avisa al pegar). Revisión única fuera del repo con el Excel del usuario: 0 coincidencias.
- **Diferido:** el e2e-csp no llega a internet desde Node 22 en este WSL. Causa: autoselección de familia IP con timeout corto; TCP y curl sí funcionan. Se pasa con `NODE_OPTIONS=--network-family-autoselection-attempt-timeout=2000`. Pendiente: meterlo en el hook pre-push o en lib.mjs.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| e2e-csp «sin red (ETIMEDOUT)», también sin los cambios | la causa es la red de Node; con la opción de timeout de autoselección pasa |
| (g) contaba avisos del pintado preexistente (dayKeys) | el test mide solo la búsqueda nueva |

## Next Phase Readiness

**Ready:** Fase 14 completa → v0.4 Datos y fiscal 3/3 → `/paul:complete-milestone`.
**Concerns:** ninguno nuevo.
**Blockers:** ninguno.

---
*Phase: 14-vuelo-otra-fecha, Plan: 01 · Completed: 2026-11-11*
