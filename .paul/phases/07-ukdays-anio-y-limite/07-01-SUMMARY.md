---
phase: 07-ukdays-anio-y-limite
plan: 01
subsystem: ukdays
tags: [tax-year, uk-days, excel, tests, fake-clock]
requires:
  - phase: 06-barrera-tests
    provides: run-all, FIXED_NOW, e2e con reloj fijo, gate pre-commit/pre-push
provides:
  - año fiscal derivado de la fecha (taxYearOf/viewTY) sin estado persistido
  - UK_DAYS_FLOOR y congelación de años a +30 días
  - chip ‹ año ›, banner de cierre en abril, Excel/backup/comando por año visible
  - tests independientes del año real (run-all --now + tests/fake-now.mjs)
affects: [07-02 límite configurable por año (clave = taxYearOf().label)]
key-files:
  created: [tests/fake-now.mjs, tests/harness/harness-anio-fiscal.mjs]
  modified: [index.html, tests/lib.mjs, tests/run-all.mjs, tests/e2e/e2e-csp.mjs, tests/harness/harness-ukdays.mjs, tests/harness/harness-ukdays-rules.mjs, tests/harness/harness-fecha.mjs, tests/harness/harness-merge.mjs, tests/harness/harness-excel-u.mjs]
key-decisions:
  - "Año fiscal derivado y sin estado (dialéctica Fable, confianza alta); congelación derivada de la fecha"
  - "Año congelado: backfill solo lectura; pegar → confirm → manual; cancelar → no se guarda nada"
  - "Botón OFF identifica el hueco por su primer día, no por índice (G6)"
patterns-established:
  - "Funciones de periodo reciben un objeto ty (por defecto viewTY()); nunca constantes de año"
  - "Todo harness fija window._ukNowOverride = FIXED_NOW; `run-all --now=<ISO>` comprueba que nada depende del año real"
duration: ~3h (06/10 tarde)
completed: 2026-10-06
---

# Fase 7 Plan 01: Año fiscal dinámico de UK Days — Summary

**UK Days, Excel Tax Year, backup y comando de texto siguen al año fiscal de la fecha (Londres) con selector ‹ año ›, aviso de cierre en abril y años cerrados protegidos; en prod v2026.10.06-170132 sin cambio visible en los datos de hoy.**

## Performance

| Metric | Value |
|--------|-------|
| Duración | ~3 h (dialéctica + plan + revisión + apply + G6 + verificación) |
| Tareas | 3/3 auto + checkpoint (verificado por Claude a petición del usuario) |
| Ficheros | 2 creados, 9 modificados |

## Acceptance Criteria Results

| Criterio | Estado | Evidencia |
|-----------|--------|-------|
| AC-1: año visible sale de la fecha de hoy | Pass | harness-anio-fiscal (i): 05/04 23:30 BST → 2026-27; 06/04 00:30 BST → 2027-28 (pie, chip, input min/max). grep de literales → solo UK_DAYS_FLOOR |
| AC-2: pegar cualquier año ≥ FLOOR calcula y avisa | Pass | (ii) email 10/04/2027 → rule:R1 + "Guardado en Tax Year 2027-28 (no es el visible)"; (iii) marzo tardío → rule:R1 sin confirm |
| AC-3: años congelados / pre-FLOOR no se reescriben en silencio | Pass | (iv) backfill no recalcula ni crea; confirm al pegar/añadir/comando; cancelar → nada guardado (historial, Excel, UK Days) y backfill no lo crea después; (v) 01/04/2026 rechazado |
| AC-4: selector + banner de abril | Pass | chip FLOOR..hoy, ‹/› deshabilitados en extremos; banner 06/04–05/05 (sí el 05/05, no el 06/05); cambiar año = 0 escrituras localStorage/persist |
| AC-5: Excel y comando por año visible | Pass | (vii) 2026-27 visible con hoy en 2027-28 → TAX YEAR 26-27.xlsx, 365 días, bloqueo solo por pendientes de ese año; (vi) "abril 3 5" → 2027-04-03/05, "abril 2027 7", "6 abril" con 2027-28 |
| AC-6: tests independientes del año real | Pass | run-all harness 13/13 con reloj real, --now=2027-06-01 y --now=2028-01-01; barrera completa 15/15 (incl. e2e) |

## Verification Results

- `node tests/run-all.mjs tests/harness tests/e2e` → 15/15 (49 s)
- `node tests/run-all.mjs --now=2027-06-01T12:00:00Z tests/harness` y `--now=2028-01-01…` → 13/13
- Prueba del mecanismo: sin fijar el reloj, harness-ukdays-rules con --now=2027-06-01 → 17 FAIL (el preload sí desplaza el reloj)
- Golden CSV sin cambios; pre-push (harness + e2e) OK
- Checkpoint (el usuario pidió "compruébalo tú"):
  - prod (GitHub Pages) == index.html local byte a byte (v2026.10.06-170132)
  - versión de esta mañana (193e7ce) vs nueva con el MISMO dataset (92 emails + 92 días de calendario + manual + No UK): contador, 108 UK con procedencia, 30 No UK, pendientes, _ukdays y 469 filas del Excel → idénticos; solo cambia el mensaje "Excel 2026-27 descargado."
  - WebKit 390 px: chip ‹ 2026-27 › con ambos deshabilitados, botón "⬇ Descargar Excel Tax Year 2026-27", descarga `TAX YEAR 26-27.xlsx`, 0 errores JS
  - No verificable por Claude: los datos reales del usuario (tras su login Google)

## Review arms

- **Revisión adversaria del plan (Fable):** APROBADO CON CAMBIOS — B1 (backfill de solo lectura + cancelar = no guardar), B2 (harness-ukdays-rules), B3 (preload fake-now). Incorporados antes del APPLY.
- **G6 /code-review (Opus, en segundo plano, cada hallazgo ejecutado):** 1 CONFIRMED, 11 REFUTED.
  - CONFIRMED: `ukMarkBlockOff(i)` por índice → con la app abierta al cruzar el 06/04, OFF marcaba días del año nuevo. Arreglado en `dadd17e` (identifica por primer día, recalcula en su año) + test de regresión.
  - REFUTED destacados: orden confirm/mutación, bordes BST/GMT y del 05/05, comando con año, XSS en chip/banner, fake-now.
- G7/G8: en la transición de fase (tras 07-02).

## Task Commits

| Tarea | Commit | Tipo | Descripción |
|------|--------|------|-------------|
| Plan + revisión Fable | `aa68b40` | docs | Plan 07-01 (dialéctica) + revisión adversaria incorporada |
| Tareas 1–3 | `86cd30f` | feat | Año derivado, FLOOR, congelación, chip, banner, Excel/comando; tests sin año real |
| G6 | `dadd17e` | fix | Botón OFF por primer día del hueco |

## Files Created/Modified

| Fichero | Cambio | Para qué |
|------|--------|---------|
| `index.html` | Modificado | taxYearOf/viewTY/UK_DAYS_FLOOR/ukYearFrozen/ukInScope/londonTodayISO; funciones de periodo con `ty`; addDay/comando/manual con congelación; chip, banner, Excel y backup por año |
| `tests/fake-now.mjs` | Creado | Preload que fija `new Date()`/`Date.now()` (EASYLOG_TEST_NOW) |
| `tests/run-all.mjs` | Modificado | Opción `--now=<ISO>` vía NODE_OPTIONS |
| `tests/lib.mjs` | Modificado | FIXTURE_DATE, BASE_TY, seedCalendar; comentario de Fase 7 retirado |
| `tests/harness/harness-anio-fiscal.mjs` | Creado | 46 checks: casos (i)–(vii), banner, chip sin escrituras, regresión G6 |
| `tests/harness/harness-ukdays*.mjs`, `-fecha`, `-merge` | Modificado | Reloj fijo FIXED_NOW (antes reloj real) |
| `tests/harness/harness-excel-u.mjs`, `-ukdays.mjs`, `-ukdays-rules.mjs` | Modificado | 4 aserciones que citaban literales/semántica del año fijo |
| `tests/e2e/e2e-csp.mjs` | Modificado | Siembra del calendario con seedCalendar(BASE_TY…) |

## Deviations from Plan

| Tipo | N | Impacto |
|------|-------|--------|
| Cambio de ubicación UI | 1 | Chip en la fila de botones (junto a + Añadir fecha / Backup), no en la cabecera: la cabecera pliega la tarjeta y en el iPhone no cabía junto a "N / 91 · P pend." |
| Añadido menor | 1 | Botón del Excel muestra el año ("… Tax Year 2026-27"); backup por email incluye el año |
| Tests adaptados | 4 | Aserciones acopladas al año fijo (mensaje "No se descarga el Excel 2026-27", regex de downloadTaxExcel, ukPastDays tras el periodo) |
| Auto-fix G6 | 1 | ukMarkBlockOff por primer día |
| Checkpoint | 1 | Verificado por Claude (el usuario lo delegó); datos reales no verificables sin su login |

**Impacto total:** sin cambio de alcance; todo dentro del plan.

## Decisions Made

| Decisión | Motivo | Impacto |
|----------|-----------|--------|
| Año derivado y sin estado | Dialéctica Fable: estado "closed" en Firestore añade carreras de sync y migración | 07-02 cuelga del label |
| Congelación a end+30 | Protege evidencia declarada sin estado; gracia para emails tardíos | rule:* de años cerrados no se recalculan (corregirlas = migración explícita) |
| Cancelar en año congelado = no guardar nada | Si no, día pendiente para siempre (Fable B1) | Coherente con "¿Reemplazar?" |
| Hueco OFF por primer día | G6: índice inestable al cruzar el 06/04 | Botones robustos a repintados tardíos |

## Next Phase Readiness

**Listo:**
- 07-02 puede añadir `settings.ukLimit[label]` (mergeFields + guard de hidratación) sobre `taxYearOf().label`, más "máximo posible" y textos sin "bonus".
- F-03-001 y F-03-006 cerrados.

**Pendiente / riesgos:**
- 07-02 bloqueado por la respuesta del asesor fiscal (valor y forma del límite).
- Reconstruir años anteriores al FLOOR = plan propio (bajar FLOOR conscientemente).
- Mensaje "email incompleto: re-pégalo" en un año congelado con email completo y sin entrada es engañoso (G6 REFUTED como no alcanzable en la práctica) → anotado.

**Bloqueantes:** ninguno para cerrar 07-01.

---
*Fase: 07-ukdays-anio-y-limite, Plan: 01 · Completado: 2026-10-06*
