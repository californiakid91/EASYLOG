---
phase: 03-ukdays
plan: 01
subsystem: ukdays
tags: [uk-days, dst, firestore, harness, node-vm]

requires:
  - phase: 02-csv
    provides: sectorDayOffsets / sectorUTC (modelo temporal UTC por sector)
  - phase: 01.1-borrados-nube
    provides: mergeFields + guard de hidratación
provides:
  - computeUKDay tri-estado (UK Day / no / sin datos) con último sector cronológico
  - recálculo del UK Day al re-pegar un día; removeDay limpia el UK Day automático
  - periodo 06/04/2026–05/04/2027 compartido con el Excel Tax Year
  - sección "Días en Excel sin historial" borrable
  - "Cargando…" / "Sin conexión" en UK Days hasta el primer snapshot de la nube
affects: [03-02 reglas reales UK Days]

key-files:
  created: [.paul/phases/03-ukdays/harness-ukdays.mjs]
  modified: [index.html]

key-decisions:
  - "computeUKDay tri-estado: sin On Block en el último sector → no tocar la entrada existente"
  - "Borrar un día solo-Excel NO toca UK Days (sobreviven al borrado del historial a propósito)"
  - "Cargando… solo en UK Days; el calendario se pinta desde caché local y no se toca"
  - "Offset BST/GMT del instante exacto del on-block (01:00Z último domingo mar/oct)"

patterns-established:
  - "setUKDays(u) cambia _ukdays sin escribir para agrupar con saveHistory → una sola persist() por acción"

duration: ~1h
completed: 2026-10-04
---

# Phase 3 Plan 01: Fixes UK Days — Summary

**El UK Day se calcula con el último sector cronológico real (H5), se recalcula al re-pegar (H6), se borra con el día, el periodo acaba el 05/04/2027, el 18/09 fantasma se pudo borrar del Excel y UK Days muestra "Cargando…" en vez de "0 / 91" — desplegado (b2d8244) y aprobado por el usuario en iPhone.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~1 h (plan + revisión Fable + apply + G6 + deploy + verificación) |
| Tasks | 3 (2 auto + 1 checkpoint) completadas |
| Files modified | 2 (+ estado PAUL) |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Último sector cronológico (H5) | Pass | Fixtures 01/90/91 + 2 sintéticos en el arnés |
| AC-2: Fecha local correcta en cambios de hora | Pass | 24-25/10/2026 y 27-28/03/2027; offset por instante exacto (mejor que lo planeado: también la hora es correcta) |
| AC-3: Recalcular al re-pegar (H6) | Pass | Con y sin historial previo; manual intacto; sin On Block no toca |
| AC-4: removeDay borra UK Day automático | Pass | Confirm lo dice; 1 sola persist(); manual se conserva |
| AC-5: Días en Excel sin historial | Pass | Arnés + usuario: 51 → 50 tras borrar el 18/09 en producción, persiste tras recargar |
| AC-6: Periodo 06/04/2026–05/04/2027 | Pass | Arnés + usuario (aviso "fuera del periodo … 5 abr 2027") |
| AC-7: "Cargando…" en UK Days | Pass | Arnés (simulación nube) + usuario (48/91 cargado en modo nube) |

## Verification Results

```
harness-ukdays.mjs          41 PASS → TODO OK
harness-csv.mjs (Fase 2)    43 ✓  0 ✗
harness-fecha.mjs (1.2)     TODO OK
harness-merge.mjs (1.1)     TODO OK
Sintaxis <script>           OK
Deploy GitHub Pages         computeUKDay servido a los ~45 s del push
```

## Review arms

- **Revisión adversaria del plan (Fable):** 15 hallazgos (7 MAJOR) incorporados antes de APPLY: DST dentro del periodo, rama vacía de renderHistory, solo-Excel en sección aparte sin tocar `_ukdays`, tri-estado, NO tocar renderCalendar, simulación de nube en el arnés, una escritura por acción, constantes compartidas con el Excel.
- **G6 `/code-review` (CLI en background, EXIT=0, "VEREDICTO: 2 HALLAZGOS"):** ambos sobre el ciclo de vida de `cloud.loadError` (snapshot `fromCache` no marcaba error → "Cargando…" infinito; `loadError` nunca se reseteaba). **Corregidos** (marcar en fromCache + re-render; reset en snapshot bueno, logout y cambio de modo) y re-verificados con los 4 arneses. 0 diferidos.
- G7/G8 (CRG + /security-review): se ejecutan 1×/fase en la transición (tras 03-02). CRG auto-update en el commit: risk 0.40, no informativo (no parsea JS embebido en index.html).

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `index.html` | Modified | computeUKDay/applyUKDay/ukOffsetAt/setUKDays; addDay y removeDay; backfill; periodo; comando abril ≤5→2027; excelOnlyHTML/removeExcelOnlyDay; Cargando…/Sin conexión + cloud.loadError; eliminados isUKDay/buildUTCOnBlock |
| `.paul/phases/03-ukdays/harness-ukdays.mjs` | Created | 41 comprobaciones node:vm sobre el script real (SKIP limpio si faltan fixtures gitignored) |

## Deviations from Plan

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed (G6) | 2 | Ciclo de vida de `cloud.loadError` — esencial para AC-7 |
| Mejora sobre lo planeado | 1 | `ukOffsetAt` usa el instante exacto (01:00Z) → la hora mostrada tampoco se desfasa el día del cambio |
| Scope additions | 1 | Helper `setUKDays` para deduplicar el flag `_ukdaysSaving` (refactor mínimo) |

**Total impact:** sin scope creep; todo dentro de los ACs.

### Deferred Items
- Los avisos muestran la fecha sin año ("04/10" para 04/10/2027) — `dateISOToDisplay`; el usuario lo vio en la prueba. XS.
- Literal `'Tax Year 2025-2026'` en downloadTaxExcel (ya registrado en el plan). XS.
- Sector post-medianoche pegado como día aparte (email con 2 fechas) → entrada para la dialéctica 03-02.

## Next Phase Readiness

**Ready:** base de cálculo fiable (`computeUKDay`) y arnés para meter las reglas reales en 03-02.
**Concerns:** 03-02 es de diseño abierto (cómo saber dónde duerme el usuario: VLC, HSBY activado, INTSP, viajes personales que no salen en el roster) → dialéctica Fable antes de planificar.
**Blockers:** ninguno.

---
*Phase: 03-ukdays, Plan: 01*
*Completed: 2026-10-04*
