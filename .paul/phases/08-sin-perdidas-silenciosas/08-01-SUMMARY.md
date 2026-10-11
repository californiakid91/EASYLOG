---
phase: 08-sin-perdidas-silenciosas
plan: 01
subsystem: persistencia
tags: [firestore, localStorage, hidratacion, avisos, harness]

requires:
  - phase: 06-barrera-de-tests
    provides: run-all + harness node:vm + gate pre-commit/pre-push
  - phase: 07-ukdays-anio-y-limite
    provides: FIXED_NOW / --now en harness
provides:
  - requireHydrated() en los 18 puntos de entrada de los mutadores
  - persist()/save*()/saveDayMap() devuelven bool (true = guardado en local / enviado a la nube)
  - payload de nube capturado antes del await import (persistCloud y saveDayMap)
  - errores de guardado visibles (cloudErrText) en nube, calendario y local
  - hydrateLocal clave a clave + _localCorrupt (la copia dañada nunca se pisa; calendario incluido en modo Local)
  - textos honestos (bienvenida, cambio de modo, aviso tras cargar la nube)
  - tests/harness/harness-sin-perdidas.mjs (48 checks)
affects: [08-02 política de sync, futura exportación/importación JSON]

key-files:
  created: [tests/harness/harness-sin-perdidas.mjs]
  modified: [index.html, tests/harness/harness-merge.mjs, tests/harness/harness-runways.mjs]

key-decisions:
  - "Guarda al inicio del mutador (antes de confirm/mutación/vaciado), tras las validaciones que no tocan estado"
  - "Canal del aviso según dónde se actúa: alert en modales y tarjeta UK; #status en el resto"
  - "Sin rollback de memoria: un fallo local avisa de que el cambio se perderá al recargar"
  - "OK de nube = enviado; el error async de setDoc lo sustituye"
  - "Copia local dañada: se carga vacía, no se sobrescribe nunca y un cambio sobre ese mapa devuelve false + aviso"

patterns-established:
  - "Todo mutador nuevo: `if (!requireHydrated(...)) return;` antes de tocar nada, y OK solo si save*() devolvió true"
  - "Lo que se envía a Firestore se captura antes de cualquier await"

duration: ~2h (plan + revisión Fable + apply + G6)
started: 2026-10-10
completed: 2026-10-11
---

# Phase 8 Plan 01: Sin pérdidas silenciosas — Summary

**Si un cambio no se puede guardar, la app ya no lo finge: no toca nada, conserva el texto pegado y lo dice donde el usuario mira; los fallos de guardado se ven y una copia local dañada no se pisa nunca. En producción v2026.10.11-083932.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~2 h (incluye revisión adversaria del plan y G6) |
| Completed | 2026-10-11 |
| Tasks | 3/3 PASS |
| Files modified | 4 (1 creado) |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Sin hidratar, ningún mutador cambia nada y lo dice | Pass | 18 casos (20 rutas) en el harness: mapas idénticos, texto conservado, 0 confirm, alert/#status según canal; cloud.user=null; «No se encontraron vuelos» antes de la guarda |
| AC-2: Payload capturado antes del await | Pass | Snapshot simulado durante el import del SDK → setDoc envía lo previo (history y dayMap) |
| AC-3: Fallos de guardado visibles | Pass | setDoc rechaza → err «No se ha guardado en la nube (permiso denegado)» + sync err; espejo local del calendario falla → err y aun así escribe en nube; local lleno → false + err, sin OK ni vaciado |
| AC-4: Clave local corrupta | Pass | Solo esa vacía, resto cargado, aviso que la nombra, el texto roto sigue tras backfill y tras mutar |
| AC-5: Textos honestos | Pass | Sin «importarlos», «en cualquier momento» ni «Repite el último cambio»; aviso «Nube cargada: ya puedes guardar» |
| AC-6: Nada se rompe | Pass | `run-all tests/harness tests/e2e` 16/16; `--now` 2027-06-01 y 2028-01-01 14/14; pegar/quitar/re-pegar/calendario con OK como antes |

## Verification Results

```
node tests/run-all.mjs tests/harness tests/e2e   → 16/16 OK (harness-sin-perdidas 48 checks)
node tests/run-all.mjs --now=2027-06-01T12:00:00Z tests/harness → 14/14
node tests/run-all.mjs --now=2028-01-01T12:00:00Z tests/harness → 14/14
pre-push (harness + e2e-csp) → OK; push dadd17e..0eee43f
curl prod → APP_VERSION 2026.10.11-083932, idéntico byte a byte a index.html
```

## Review arms

- **Revisión adversaria del PLAN (Fable):** aprobado con cambios — 1 bloqueante (backfill pisaba la clave corrupta), 4 importantes (AC-2 teórico → carrera real del await; avisos invisibles desde modales; semántica sin rollback; persistCloud sin login), 5 menores. Todos incorporados antes de APPLY.
- **G6 /code-review (Fable, background, veredicto explícito):** 2 hallazgos, ambos VERIFICADOS y arreglados — (1) BUG: con una copia local dañada, persist() saltaba la clave pero devolvía true → «OK» falso y pérdida al recargar; ahora devuelve false con aviso si el mapa dañado tiene cambios. (2) MENOR: calendario local dañado se pisaba en silencio → protegido igual en modo Local (en Nube es solo espejo). Fable confirmó con 6 mutantes que el harness no es vacuo.
- **Por commit (hooks):** semgrep marcó `'index.html<script>'` en los harness (nombre de fichero del vm) → falso positivo. CRG G7 y /security-review (G8) se ejecutan 1×/fase en la transición de Fase 8.

## Accomplishments

- Cerrada la pérdida silenciosa principal del informe Aegis (F-02-006/F-RG-003): pegar sin nube cargada ya no deja un «OK» sobre un día que desaparece al recargar.
- Cerrada una carrera real no listada en Aegis: un snapshot entre `await import` y `setDoc` podía descartar el cambio del usuario.
- F-02-004/005/007: fallos de almacenamiento visibles y la copia local dañada protegida (incluido el calendario).

## Task Commits

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Plan + revisión Fable | `89a643b` | docs | 08-01-PLAN, STATE/ROADMAP, handoff 07-01 archivado |
| Tasks 1-3 + G6 | `0eee43f` | feat | guarda, bool, payload, errores, hydrateLocal, textos, harness |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `index.html` | Modified | requireHydrated, cloudErrText, persist/save* con bool, _localCorrupt, saveDayMap/loadDayMap robustos, textos |
| `tests/harness/harness-sin-perdidas.mjs` | Created | 48 checks AC-1..AC-6 + hallazgos G6 |
| `tests/harness/harness-merge.mjs` | Modified | texto del aviso nuevo («no se ha guardado nada») |
| `tests/harness/harness-runways.mjs` | Modified | JSON roto: ya no se resetea todo (era F-02-004); + no se sobrescribe al guardar |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Quitar «releer estado tras confirm()» | confirm() bloquea el hilo JS; un snapshot no puede entrar durante el diálogo (Fable) | Menos riesgo en addDay; F-02-001 queda cubierto por la carrera real del await |
| alert en modales/tarjeta UK | La línea de estado no se ve desde ahí (precedente en confirmUKDateModal) | Avisos visibles donde se actúa |
| Copia local dañada nunca se sobrescribe sola | Recuperable a mano; evita destruir lo único que queda | Mapa bloqueado hasta intervención (ver diferidos) |

## Deviations from Plan

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed (G6) | 2 | Esenciales: OK falso con clave dañada; calendario local dañado |
| Scope additions | 1 | Calendario (CAL_KEY) en la protección de clave dañada — misma clase F-02-004, solo en modo Local |
| Tests ajustados | 2 | harness-merge (texto) y harness-runways (comportamiento corregido F-02-004) |

**Total impact:** arreglos esenciales, sin scope creep.

### Deferred Items
- F-02-012: setDoc sin timeout offline («Guardando…» eterno) / persistentLocalCache.
- F-02-008: listener muerto tras error del snapshot sigue con hydrated=true.
- Mapas del modo anterior visibles en memoria tras cambio de modo/logout hasta el snapshot → 08-02.
- Copia local dañada: no hay forma desde la app de «darla por perdida» y volver a escribir (hoy solo a mano); `_localCorrupt` no se limpia.
- Exportación/importación JSON (Aegis C5, F-02-009).

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| El aviso de AC-4 sale durante el arranque, antes de envolver showStatus en el harness | El check lee el #status real |

## Next Phase Readiness

**Ready:**
- Todos los mutadores tienen un punto único de guarda y un bool de guardado: 08-02 (política de sync) puede cambiar cómo se escribe sin tocar los puntos de entrada.

**Concerns:**
- 08-02 es diseño abierto (LWW por mapa vs merge por día / transacciones): dialéctica Fable antes de planificar.

**Blockers:** Ninguno.

---
*Phase: 08-sin-perdidas-silenciosas, Plan: 01*
*Completed: 2026-10-11*
