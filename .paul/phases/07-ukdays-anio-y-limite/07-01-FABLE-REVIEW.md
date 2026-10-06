# Revisión adversaria Fable — 07-01-PLAN (año fiscal dinámico de UK Days)

Fecha: 2026-10-06 · Base: index.html @193e7ce, tests/ (12/12 harness en verde con reloj real y con reloj falso 2027-06-01 / 2028-01-01).
El diseño de la dialéctica (año derivado sin estado, congelación a +30 días, FLOOR, chip, banner, split 07-02) NO se cuestiona: no he encontrado ningún fallo en él.

## Veredicto: APROBADO CON CAMBIOS

Tres bloqueantes, todos de ejecución (no de diseño): una contradicción interna entre Task 1.4 y 1.5 que fabrica evidencia en un año congelado tras un «cancelar», un harness que falta en la lista de Task 3 y un mecanismo de reloj desplazado que, tal como está escrito, no funciona (pero hay uno que sí, probado).

## Bloqueantes

### B1. Task 1.5 deshace la decisión del usuario de Task 1.4 (fabrica evidencia en año congelado)
- Evidencia: `backfillUKDays()` corre en `applyLocalMode` (index.html:2591) y en CADA snapshot de la nube (index.html:2660). Task 1.5 dice: «Las que faltan se crean en cualquier año en scope». Task 1.4 dice: si el usuario CANCELA el confirm de año congelado «no se toca _ukdays (el día sí se guarda en history/Excel)». Resultado: el día queda en history sin entrada → en el siguiente arranque/snapshot el backfill crea la `rule:*` que el usuario acababa de rechazar, en silencio, y la escribe en la nube (`saveUKDays` → `persist` → `persistCloud`, :1333/:1380). Contradice AC-3 («no se reescriben en silencio»).
- Cambio al plan: (a) en un año congelado, `backfillUKDays` es de SOLO LECTURA (ni recalcula ni crea); el único camino de entrada a un año congelado es una acción explícita del usuario (confirm en addDay/modal/comando, botones UK/No UK/OFF). (b) Cancelar el confirm de año congelado en addDay cancela el pegado entero («Cancelado. No se ha guardado nada.»), igual que el cancel de «¿Reemplazar?» (:1558); si no, el día queda `pending/incomplete` para siempre en ese año (ukDayStatus :2002) y bloquea su Excel sin que el usuario entienda por qué. Añadir al harness-anio-fiscal (iv): tras cancelar, `backfillUKDays()` + snapshot falso no crean la entrada.

### B2. Falta `harness-ukdays-rules.mjs` en Task 3 (y sobran csv y sri)
- Evidencia: `tests/harness/harness-ukdays-rules.mjs:143` y `:219` hacen `delete win._ukNowOverride` y DESPUÉS pegan emails de 2026/04/06 comprobando `source === 'rule:R1'` / `'rule:R3'` (:147-150). Con la congelación de Task 1.4 y reloj real ≥ 2027-05-06, esos pegados disparan el confirm (el stub devuelve `answer = true`) y la entrada sale `manual:true` → FAIL. Lo mismo le pasa a `harness-ukdays.mjs` (window: {} sin override, :11; comandos «1 abril» :91 que dependen de viewTY), que sí está en la lista. En cambio `harness-csv.mjs` no toca UK Days (grep `ukdays|ukDay|pending` → 0) y `harness-sri.mjs` no carga el script de la app (solo el `<head>`, :5/:20): no dependen del reloj.
- Cambio al plan: files_modified y Task 3.2 → añadir `tests/harness/harness-ukdays-rules.mjs` (sustituir los dos `delete win._ukNowOverride` por `now(FIXED_NOW)`); quitar csv y sri de la lista o dejarlos como «verificado: no dependen».

### B3. El reloj desplazado de AC-6 no es ejecutable como está escrito; el mecanismo que funciona es otro
- Evidencia: `which faketime` → no instalado. «EASYLOG_TEST_NOW que lib.mjs aplique a Date en el contexto vm» no puede funcionar: cada harness construye su propio `vm.createContext({... Date ...})` con el `Date` global del host (p. ej. harness-ukdays.mjs:11, harness-csv.mjs:50, harness-merge.mjs:71) y lib.mjs no participa en esa construcción. Lo que SÍ funciona, probado hoy: un preload que sustituye `globalThis.Date` (constructor sin argumentos y `Date.now`) antes de cargar el harness, inyectado por `run-all` a los hijos vía `NODE_OPTIONS=--import=…`:
  `EASYLOG_TEST_NOW=2027-06-01T12:00:00Z NODE_OPTIONS="--import=<fake-now.mjs>" node tests/run-all.mjs tests/harness` → 12/12 OK; ídem con 2028-01-01. (`harness-autoupdate` extiende Date y sigue pasando.)
- Cambio al plan: Task 3.2 → crear `tests/fake-now.mjs` (≈5 líneas) y que `run-all` acepte `--now=<ISO>` (o lea `EASYLOG_TEST_NOW`) y lo pase a los hijos por `NODE_OPTIONS`; e2e: el reloj de la página ya viene de `ctx.clock.setFixedTime(FIXED_NOW)` (e2e-runways:13, e2e-csp:26 en el recorrido local), así que el preload de Node solo afecta al runner y no hace falta tocar WebKit. Verificar que con el preload los tiempos del runner salen a 0 ms (cosmético, no es fallo).

## Mejoras no bloqueantes
1. Dos confirm seguidos. Re-pegar con datos distintos un día de año congelado: «¿Reemplazar?» (:1558) y luego «año cerrado». Aceptable, pero fijar el orden en el plan: el confirm de congelación va DESPUÉS del de reemplazo y ANTES de cualquier mutación (`_excelData[iso]` se escribe en :1569 antes del cálculo UK: con B1(b) hay que mover el confirm por delante). Las entradas `manual` existentes nunca preguntan (`applyUKDay` ya devuelve false, :1942).
2. `removeUKDay` sobre una entrada manual de un año congelado vuelve a aplicar la regla sin pasar por la congelación (:2317 `applyUKDay`). Es una acción explícita con confirm que ya avisa «volverá a la regla del email»: documentarlo como excepción deliberada en Task 1.5 para que el ejecutor no la «arregle».
3. `ukMarkBlockOff(i)` usa un índice de `pendingUKBlocks()` (:2185) que tiene que ser del MISMO `ty` que pintó `renderUKDays`; con el default `viewTY()` en ambos basta, pero decirlo. Y dejar explícito que ukDecidePending/ukMarkBlockOff/botones UK/No UK escriben en años congelados sin confirm (es justo la forma de «cerrar» los pendientes del banner).
4. Chip «+1 solo si hay datos»: como `ukInScope` corta en el fin del año de HOY, el único dato posible en el año +1 es history pegado con el reloj del iPhone mal puesto. Simplificar: rango fijo FLOOR..hoy, sin +1 (menos código, menos casos en el harness).
5. Mensajes fuera de rango: `harness-ukdays.mjs:87` exige `/fuera del periodo/` y `harness-fecha.mjs:23` `/fuera del/`; mantener la frase «fuera del periodo UK Days (…)» al generarla.
6. Comando con año de 4 dígitos: hoy `\b(\d{1,2})\b` (:1476) ya ignora «2027», así que la regla nueva es aditiva y no rompe ningún formato aceptado. Añadir al harness (vi) el caso «abril 2027» sin día → null, y «6 abril» con 2027-28 visible → 2027-04-06.
7. Checkpoint humano paso 1 presupone APP_VERSION nueva: recordar el bump (o confirmar que el hook de commit lo hace).
8. e2e-csp recorrido nube (reloj real, decisión 06-02): no toca UK Days ni el año (solo login/CSP), así que no depende del año real; la siembra del calendario del recorrido local sí se genera con `seedCalendar(BASE_TY.start, ayer(FIXED_NOW))` como dice el plan. Correcto, nada que cambiar; dejarlo anotado en el SUMMARY.

## Lo que está bien
- Cobertura de usos: el grep de `UK_DAYS_*`, `6 abr 2026`, `2027` y el año hardcodeado del comando (:698, :1469-1480, :1571, :1960, :1992, :2009-2039, :2094, :2229, :2244, :2856-2913) coincide con los sitios que el plan enumera; no hay ningún otro texto visible ni cálculo del Excel (`excelU` :2764 va por `ukDayStatus`) que dependa del periodo. `_calYear/_calMonth` (:2927) usan `new Date()` pero son el calendario mensual, fuera de alcance por diseño.
- Congelación: no choca con el re-pegado idéntico (sale en :1554 antes del cálculo UK), ni con «No UK» manual, ni con el conflicto calendario/email (todo precede en `ukDayStatus`), ni con `_excelData` sin history (`ukFlightsOf` :1953). Ventana 06/04-05/05 ↔ `ukYearFrozen` (> end+30) coherentes.
- Fechas futuras: `ukPastDays` corta en ayer, así que ni pendientes ni huecos cambian; el contador ya incluía `cal:stby` futuros antes de este plan (no es regresión).
- Nube: el chip y el banner solo tocan `_tyViewLabel` en memoria; la única escritura nueva es la manual confirmada. `setUKDays` antes de `saveHistory` mantiene UNA escritura por pegado. Sin campos nuevos en Firestore.
- Zona horaria: `londonTodayISO` junto a `londonYesterdayISO` con `ukOffsetAt` (genérico por año vía `lastSundayOf`) resuelve AC-1 en BST.
- AC verificables, boundaries claros (R1/R2/R3, golden, fixtures intactos), checkpoint humano con pasos concretos en el iPhone.
