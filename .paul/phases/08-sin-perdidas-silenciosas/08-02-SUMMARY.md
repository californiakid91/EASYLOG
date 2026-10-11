---
phase: 08-sin-perdidas-silenciosas
plan: 02
subsystem: sync
tags: [firestore, onSnapshot, hasPendingWrites, getDocFromServer, pwa, ios, node-vm, playwright]

requires:
  - phase: 08-01
    provides: requireHydrated() al inicio de cada mutador, save*() → bool, payload capturado antes del await
provides:
  - Sincronización con regla basada en el estado de las escrituras, en lugar de temporizadores
  - Aviso visible de guardado sin confirmar (sin soltar la escritura)
  - Listener que se rearma solo
  - Relectura del servidor al volver de segundo plano (stale)
  - harness-sync (63 checks) + e2e-sync (WebKit iPhone, 20 checks)
affects: [sync, multi-dispositivo, auto-actualización]

tech-stack:
  added: []
  patterns:
    - "Regla D2: con _cloudWrites > 0, el snapshot sin hasPendingWrites se descarta (cloud.skipped → relectura al quedar 0)"
    - "_cloudWrites solo baja cuando setDoc resuelve o rechaza, nunca por tiempo"
    - "«Sincronizado ✓» solo con 0 escrituras en vuelo y sin stale (cloudWriteDone / cloudIndicator)"
    - "Vuelta de segundo plano: checkResume() en requireHydrated + eventos + tick de 15 s; stale bloquea escrituras con STALE_MSG"

key-files:
  created: [tests/harness/harness-sync.mjs, tests/e2e/e2e-sync.mjs, .paul/phases/08-sin-perdidas-silenciosas/08-02-DIALECTIC.md]
  modified: [index.html, tests/harness/harness-merge.mjs, tests/harness/harness-runways.mjs, tests/harness/harness-sin-perdidas.mjs]

key-decisions:
  - "Sync = opción A de la dialéctica (gana el último por mapa, endurecido); B (merge por día) y C (transacciones) diferidas"
  - "El aviso por timeout NO decrementa _cloudWrites: recargar perdería la escritura en cola"
  - "La detección de la vuelta va solo al inicio del mutador (requireHydrated), no en persist(): un confirm() largo no es «volver»"

duration: ~3h (dialéctica + plan + revisión + APPLY + G6 + e2e)
started: 2026-10-11T09:50:00+01:00
completed: 2026-10-11T13:00:00+01:00
---

# Fase 8, plan 02: sincronización endurecida — resumen

**Firestore deja de depender de temporizadores.** Los cambios ya no se pierden sin avisar en estos casos:
- un snapshot que llega tarde;
- un guardado que nunca se confirma;
- un listener muerto;
- volver al móvil después de editar en otro dispositivo.

Para este último caso, la versión anterior borraba el día escrito en el otro dispositivo. Lo demuestra el e2e.

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~3 h (dialéctica 4 min, revisión del plan, APPLY, G6, e2e) |
| Tasks | 3 de 3: 2 automáticas PASS, más el checkpoint verificado por Claude con e2e a petición del usuario |
| Files modified | 7 (index.html, 4 harness, 1 e2e nuevo, 1 harness nuevo) |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: un snapshot tardío no deshace un cambio propio | Pass | harness-sync T1; 0 guardas `_*Saving` en index.html |
| AC-2: guardado sin confirmar visible y no olvidado | Pass | T2: «Sin confirmar» a 20 s (5 s offline); `_cloudWrites` se mantiene; saveDayMap igual |
| AC-3: listener muerto bloquea y se rearma | Pass | T3 |
| AC-3b: rearme sin bucles | Pass | T3b: un aviso por racha, backoff 2/4 s, unauthenticated → signOut, switchMode/uid cancelan |
| AC-4: al volver no se escribe desde memoria vieja | Pass | T4 + e2e: el día del otro dispositivo se conserva |
| AC-5: hueco de reloj, reintento y backfill | Pass | T5: tick, escritura que detecta el hueco, backoff, 'online', backfill sin STALE_MSG |
| AC-5b: red de seguridad del orden de eventos | Pass | T1b |
| AC-6: sin regresiones | Pass | 15/15 harness; 15/15 con --now 2027 y 2028; 17/17 con e2e (pre-push); harness-sync falla contra HEAD previo en T1–T5 |

## Accomplishments

- **Regla D2 en lugar de las guardas por temporizador.** Antes había guardas de 2–3 s y solo cubrían ukdays, runways y dayMap; history, excelData y airports no tenían ninguna. Ahora todos los mapas están protegidos mientras hay escrituras propias en vuelo.
- **Guardado sin confirmar.** Si la nube no confirma, sale un aviso honesto («Sin confirmar · no recargues»). La auto-actualización sigue bloqueada mientras quede algo en cola, y cuando la nube confirma se avisa.
- **Uso secuencial (portátil y luego móvil).** Al volver de más de 60 s sin señal de vida, no se escribe hasta releer el servidor. Se reintenta solo y el iPhone standalone está cubierto aunque no emita `visibilitychange`.

## Task Commits

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Plan + dialéctica | `d9335ed` | docs | Dialéctica Fable y plan con la revisión adversaria incorporada (`1d6e58b` solo archivó el handoff) |
| Task 1 + Task 2 + G6 | `84bab47` | feat | Sync endurecida + harness-sync + harness ajustados (desplegado como v2026.10.11-093029) |
| Task 3 (checkpoint) | `e92209b` | test | e2e-sync WebKit iPhone 13 con Firebase falso |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `index.html` | Modified | `cloudWriteGate`/`blockedStaleWrite`/`watchWrite`/`cloudWriteDone`/`cloudIndicator`/`subscribeCloud`/`applyCloudData`/`onCloudListenerError`/`resetCloudSync`/`checkResume`/`revalidateCloud`/`initCloudFreshness`; sin `_*Saving` |
| `tests/harness/harness-sync.mjs` | Created | 63 checks con reloj y temporizadores controlables (`advance`/`jump`) que se componen con `--now` |
| `tests/e2e/e2e-sync.mjs` | Created | Página real en WebKit con Firebase falso que reproduce la semántica del SDK (overlay, ack sin snapshot, `getDocFromServer` offline) |
| `tests/harness/harness-runways.mjs` | Modified | El test del «snapshot viejo» ahora prueba la regla D2 con la escritura en vuelo (antes pasaba gracias a un temporizador que nunca vencía) |
| `tests/harness/harness-sin-perdidas.mjs` | Modified | AC-2 ya no es vacío: `setDoc` síncrono con `cloud.fs` y ruta de respaldo con `await import` |
| `tests/harness/harness-merge.mjs` | Modified | El primer snapshot manda aunque haya una escritura en vuelo |

## Review arms

- **Revisión adversaria del plan (Fable): aprobado con cambios.** 1 bloqueante (stale sin reintento: la app se quedaba bloqueada), 5 importantes y 5 menores. Todos incorporados antes del APPLY.
- **G6 (Fable, en segundo plano, `G6-RESULT: 6 hallazgos (5 verificados)`).** Todos arreglados, con test para los 3 primeros:
  1. **Bug:** «Sincronizado ✓» con otra escritura todavía sin confirmar → el indicador solo lo pone `cloudWriteDone` con 0 en vuelo y sin stale.
  2. Una pestaña oculta pero despierta releía la nube cada minuto → ahora el tick refresca `lastAliveAt` siempre.
  3. Un `confirm()` abierto más de 60 s dejaba la memoria mutada sin guardar → la detección de la vuelta va solo en `requireHydrated`.
  4. Texto del aviso tras la relectura → `RESUME_OK_MSG`.
  5. Comentario D2 corregido: el SDK no emite el cambio que solo afecta a metadatos.
  6. Eliminado `lastTickAt`, que no se usaba.
- **G7 (CRG, fase completa b8739bb..HEAD):** riesgo 0,40, sin impacto alto. CRG no analiza el JS embebido en index.html (limitación conocida).
- **G8 (`/security-review`, fase completa b8739bb..HEAD, Fable):** `G8-RESULT: 0 vulnerabilidades reales, 2 notas`.
  - Verificado sin problema: textos con textContent; validación de 05-01 intacta en los consumidores; sin cruce de uid (payload y uid se capturan antes del await y la relectura se descarta si cambia la sesión); sin orígenes de red nuevos; sin datos personales nuevos en tests.
  - Notas diferidas en STATE: `_cloudWrites` de la sesión anterior no se resetea al cambiar de usuario (solo afecta a la disponibilidad); validación de forma en `applyCloudData` (defensa en profundidad).

## Deviations from Plan

| Type | Count | Impact |
|------|-------|--------|
| Correcciones al diseño (revisiones) | 2 | Mejoran la seguridad de datos; sin ampliar el alcance |
| Tests añadidos | 1 | e2e-sync (no estaba en el plan) |
| Checkpoint | 1 | Verificado por Claude a petición del usuario |

1. **La síntesis de la dialéctica proponía decrementar `_cloudWrites` en el timeout.** Se corrigió en el plan: el aviso no suelta la escritura. Si la soltara, la auto-actualización podría recargar y perder la cola.
2. **La detección de la vuelta en `persist()`/`saveDayMap()`**, que venía de la revisión del plan, se retiró por el hallazgo #3 de la G6. Queda solo en `requireHydrated()`, que está al inicio de todos los mutadores.
3. **Checkpoint humano.** El usuario pidió «compruébalo tú». Claude no puede usar su iPhone ni su cuenta, porque la seguridad de la cuenta es prioridad #1. En su lugar escribió `e2e-sync`: la página real en WebKit con perfil iPhone 13, con la nube, la red y el reloj controlados. Pasa 20/20 y falla en 14 checks contra la versión anterior, que borraba el día del otro dispositivo. **No cubre** la suspensión real de iOS ni el Firebase real.
4. **El commit `1d6e58b` salió sin el plan.** `git add` falló por una ruta del handoff ya movida. Se corrigió en `d9335ed`.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| Reloj del harness: un temporizador atrasado hacía retroceder la hora | `advance` ya no retrocede, y el intervalo no se pone al día (como en el navegador) |
| El test del «snapshot viejo» de harness-runways pasaba solo gracias a un temporizador que nunca vencía | Reescrito para probar D2 con la escritura en vuelo |
| semgrep `unknown-value-with-script-tag` en harness | Falso positivo: es el filename `index.html<script>` de `vm.runInContext` |

## Residual (documentado, sin cambio)

- **Dos dispositivos editando casi a la vez:** gana el último por mapa. F-02-001 queda mitigado, no cerrado por construcción. La opción B (merge por día) queda como mejora futura.
- **Dos escrituras encadenadas en milisegundos:** el eco de la primera puede revertir la segunda en memoria durante un instante. Converge con el eco de la segunda.
- **Cada guardado envía unos 127 KiB.** Con mala cobertura puede tardar, y el aviso «Sin confirmar» salta a los 20 s.

## Next Phase Readiness

**Ready:**
- La Fase 8 queda completa (08-01 + 08-02). F-RG-007, F-02-012 y F-02-008 cerrados; F-02-001 mitigado en el uso secuencial.

**Concerns:**
- No se ha verificado en el iPhone real con Firebase real. Si aparece un «Comprobando…» que no termina o un «Sin confirmar» con buena cobertura, se reabre.

**Blockers:** Ninguno. El 07-02 sigue esperando al asesor.

---
*Phase: 08-sin-perdidas-silenciosas, Plan: 02*
*Completed: 2026-10-11*
