---
phase: 03-ukdays
plan: 02
subsystem: ui
tags: [uk-days, hmrc, statutory-residence-test, firestore, calendario, node-vm]

requires:
  - phase: 03-ukdays (03-01)
    provides: computeUKDay tri-estado con el último sector cronológico, applyUKDay, periodo 06/04–05/04, "Cargando…"
provides:
  - Regla cerrada R1/R2/R3 (aterrizar en UK antes de 00:00 Londres; calzos 00:00 justas = UK)
  - Estados uk/no con source/reason; "No UK" persistente (tombstone manual)
  - ukDayStatus con precedencia y pendientes P (solo días pasados); huecos con botón OFF
  - Contador "N / 91 · P pend." (alarma solo con N); backup con procedencia
  - Exportar CSV sin perder datos: barra "Quitar de la lista" + ✕ que solo quita de la lista
affects: [03-03 / siguiente plan: auto-actualización PWA, duplicados, estado SD en calendario, columna U del Excel]

tech-stack:
  added: []
  patterns:
    - "Estado derivado por función pura (ukDayStatus) en vez de materializar el calendario en _ukdays"
    - "Entradas con source/reason; las antiguas sin source se leen con defaults y nunca se migran en caliente"
    - "backfillUKDays recalcula solo entradas 'rule:*' (idempotente: 0 escrituras sin cambios)"
    - "ukNow() inyectable (window._ukNowOverride) para probar 'ayer en Londres'"

key-files:
  created: [.paul/phases/03-ukdays/harness-ukdays-rules.mjs, .paul/phases/03-ukdays/03-02-DIALECTIC.md]
  modified: [index.html, .paul/phases/03-ukdays/harness-ukdays.mjs, .paul/phases/01.2-ukdays-fecha-manual/harness-fecha.mjs, .paul/phases/01.1-borrados-nube/harness-merge.mjs]

key-decisions:
  - "Polo A enmendado (dialéctica wf_78cb92df-f8c): regla cerrada + excepciones explícitas; nada se infiere sin respaldo"
  - "La regla exige aterrizar en UK (UK_RES, sin JER/GCI) — sustituye 'sin exigir aeropuerto UK'"
  - "Calzos a las 00:00 justas = UK Day (FA 2013 Sch 45 para 22, midnight test)"
  - "P no entra en la alarma (N+P saltaría siempre); P = cobertura"
  - "✕ en 'Días guardados' solo quita de la lista; borrar del Excel solo desde 'Días en Excel sin historial'"

patterns-established:
  - "Verificación con el usuario: UNA pregunta por mensaje + lista escrita en STATE.md"
  - "Antes de afirmar 'desplegado': comprobar git show HEAD y que la web publicada contiene el código"

duration: ~7 h (dialéctica + plan + Fable + apply + checkpoint largo en iPhone + 4 arreglos)
started: 2026-10-04T16:55:00+01:00
completed: 2026-10-04T23:30:00+01:00
---

# Fase 3 Plan 02: Reglas reales de UK Days — resumen

**UK Days decide cada día del tax year con una regla cerrada y explicable: R1 (aterriza en UK antes de 00:00 Londres, o a las 00:00 justas), R2 (fuera de UK) y R3 (después de 00:00). Los "No UK" quedan visibles y persistentes, los días sin email se cubren desde el calendario o con un toque OFF por hueco, y el contador separa los confirmados de los pendientes. Verificado día a día con el usuario en el iPhone: 54/91 y 0 pendientes.**

## Performance

| Métrica | Valor |
|---|---|
| Duración | ~7 h (incluye un checkpoint largo, día a día con el usuario) |
| Tareas | 3/3 (2 auto + checkpoint en iPhone) |
| Commits de código | 81f0fb4, d385896, f421617, 8b5394b, d052120 (24dc4e2 vacío por error, ver incidencias) |
| Arneses | rules 64 ✓ · ukdays 40 ✓ · csv 43 ✓ · fecha 10 ✓ · merge 17 ✓ |

## Criterios de aceptación

| Criterio | Estado | Notas |
|---|---|---|
| AC-1: aterrizar en UK antes de 00:00 | Pass | R1/R2/R3 + JER no cuenta; ampliado: 00:00 justas = UK (decisión del usuario tras consultar la norma de HMRC) |
| AC-2: manuales intocables y "No UK" persiste | Pass | Tombstone tras ✕; sobrevive a backfill, snapshot y re-pegar; Forzar UK sobre un NO. Verificado en iPhone (06/05, 24/09) |
| AC-3: compatibilidad con la nube | Pass | Entradas antiguas = UK sin reescribirse; marca "⚠ revisar" si acaban fuera de UK |
| AC-3b: calendario vs email | Pass | Conflicto → pendiente; OFF nunca escribe en un día con email |
| AC-4: calendario y huecos | Pass | off/stby/sim/duty → no/uk/uk/pendiente; OFF por bloque con 1 saveDayMap (01/10 verificado en iPhone) |
| AC-5: contador y procedencia | Pass | "N / 91 · P pend.", alarma solo con N, R1·cal·man, sección "No UK" |
| AC-6: backup con procedencia | Pass | Verificado con el texto real del usuario: 53 → 54 confirmados · 0 pendientes |

## Logros

- La regla del tracker sigue el criterio legal de HMRC (presente en UK al final del día). Investigado en la ley: FA 2013 Sch 45 para 22 y HMRC RFIG20710.
- Repaso día a día con el usuario. Correcciones de datos:
  - 06/05 (SD/meeting, no SBY) y 24/09 (SBY activado, noche en BLQ) → "No UK".
  - 27/09 VTO → OFF.
  - Pegados los emails que faltaban: 09/04, 12/05, 20/05, 23/09, 24/09, 26/09.
- Revisado todo el histórico (PilotLog, 940 vuelos) en busca de calzos a las 00:00 justas. Hay 3 casos:
  - 06/04/2026 (app).
- (pendiente personal del usuario — detalle en memoria local)
- Exportar el CSV ya no puede llevarse por delante el Excel ni los UK Days.

## Revisiones

- **G6 #1** (cambio principal): 1 hallazgo. Los días solo en el Excel no se recalculaban y salían como "email incompleto" → `ukFlightsOf`. Corregido.
- **G6 #2** (arreglos del checkpoint): 1 hallazgo. "Quitar de la lista" borraba días pegados después de exportar → snapshot `{iso: addedAt}` + reset en cambio de modo y logout. Corregido; arnés ampliado (idempotencia del backfill y días de cambio de hora).
- **G7 CRG**: riesgo 0.40, informativo. CRG no parsea el JS embebido; los "untested" son proxies del arnés.
- **G8 security-review** (fase entera): 1 hallazgo BAJO — self-XSS almacenado vía `City Pair` (reason R2 / ruta en innerHTML). Corregido en la transición: `esc()` en ruta/motivo/listas + `computeUKDay` solo acepta códigos IATA `[A-Z]{3}`; caso en el arnés. Fuera del diff (preexistente, diferido a Aegis): sin CSP, SheetJS sin SRI.

## Desviaciones

| Tipo | Nº | Impacto |
|---|---|---|
| Auto-fixed | 4 | TDZ de `_dayMap` en el arranque (declaración movida arriba); los 2 de G6; el commit 24dc4e2 salió vacío |
| Añadidos de alcance (durante el checkpoint, con OK del usuario) | 4 | ✕ en UK Days del calendario; barra "Quitar de la lista" tras exportar; ✕ de "Días guardados" solo quita de la lista; calzos 00:00 = UK |
| Arneses antiguos | 3 | Se adaptó más que las 6 expectativas previstas: `uk()` del 03-01, harness-fecha (forma de la entrada), harness-merge (doble ✕) y 2 de removeDay. Mismo significado, nueva forma de los datos |

## Incidencias

| Incidencia | Resolución |
|---|---|
| El commit 24dc4e2 no llevaba el código (`git add` falló por una ruta inexistente y su error estaba silenciado) y se informó de "desplegado" sin comprobarlo | Commit 81f0fb4 correcto. Ahora se comprueba siempre con `git show HEAD` y en la web publicada antes de afirmar un despliegue |
| En el iPhone, el `confirm()` que aparecía tras descargar el CSV se perdía → el usuario limpiaba la lista con ✕, que borraba el Excel y los UK Days (lo hizo 2 veces, la segunda desde una pestaña `?v=27` con código viejo) | Barra fija + ✕ seguro; el usuario re-pegó los 5 emails dos veces; verificado 54/91 |
| Safari sirve versiones viejas en caché (contó 80 en vez de 53) | Diferido como prioridad: auto-actualización de la PWA |
| Demasiadas preguntas en un mismo mensaje confundieron al usuario | Una pregunta por mensaje + lista en STATE (memoria feedback-one-question) |

## Diferidos (en STATE.md)

- **Auto-actualización de la PWA**, como Toca Cabeza. Prioridad del siguiente plan.
- **Detectar vuelos duplicados al pegar:** si son idénticos, no se guardan; si difieren, se muestran las discrepancias. Incluye el posible duplicado del 02/10 en PilotLog.
- **Estado SD (ground duty) en el calendario.** Columna U del Excel: no exige aeropuerto UK y toma el SBY como U=1.
- **Revisar uno a uno los 47 días previos.** Pendiente también: si el email de vuelo trae los DH, y el año en las fechas.
- **PilotLog 2025:** el usuario ya aplicó los cambios; falta re-exportar para re-verificar.

## Preparado para lo siguiente

**Listo:** fase 3 completa. El tracker es fiable para el periodo 2026/27 y está verificado con los datos reales del usuario.
**Preocupaciones:**
- La caché de Safari puede servir código viejo, y eso ya ha provocado pérdidas.
- El Excel Tax Year (columna U) puede divergir de UK Days.

**Bloqueos:** ninguno.

---
*Fase: 03-ukdays, Plan: 02 · Completado: 2026-10-04*
