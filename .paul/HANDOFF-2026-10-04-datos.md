# PAUL Session Handoff

**Session:** 2026-10-03 15:25 → 2026-10-04 (larga, con pausa)
**Phase:** 2 ✅ (CSV) completa y desplegada → siguiente: Phase 3 (UK Days)
**Context:** Fase 2 cerrada y en producción. Después, trabajo de verificación de datos personales del usuario FUERA del loop PAUL (sin cambios de código). Los datos personales/fiscales NO están en este repo (público): están en `/home/ricardo/easylog-private/` y en la memoria de Claude.

---

## Session Accomplishments

- **Fase 2 completa** (`faca7df`, desplegada y verificada en GitHub Pages): DELAY 1 código, TIME_NIGHT con regla EASA (sol < −6°, licencia IAA del usuario; `sunAltitude` NOAA validado vs PyEphem ≤10 s), AC_ENGTYPE Jet, modelo temporal UTC por sector (`sectorDayOffsets`/`sectorUTC`), aviso de aeropuertos sin coordenadas. Arnés `.paul/phases/02-csv/harness-csv.mjs` 43/43. Importación real en CrewLounge: 0 errores/0 issues.
- **Fuera del loop (entregables al usuario, en su carpeta Descargas, no en el repo):**
  - Revisión HTML de 593 vuelos del logbook (noche, T/O-LDG, fechas, block).
  - Lista de cambios PilotLog 2025 contra el plan oficial de la empresa (ROCS).
  - Documentación personal adicional (detalle solo en memoria y carpeta privada).
- **Reglas de dominio aprendidas** (en memoria): códigos del plan ROCS, definición real de UK Day y UK Workday, patrón de viajes a VLC, turno de lates fijo desde 05/08/2025.

## Decisions Made

| Decision | Rationale | Impact |
|---|---|---|
| El plan ROCS de la empresa es la fuente de verdad | Usuario | PilotLog y Excel se corrigen contra él |
| Registros contemporáneos del usuario > recuerdo; solo corregir con prueba documental | Usuario | Norma permanente (memoria `feedback_hmrc_records`) |
| Datos personales nunca en el repo público | Seguridad #1 | Carpeta `/home/ricardo/easylog-private/` |
| UK Days tax year = 6 abr – 5 abr | Usuario | Bug en la app: fin del periodo 2027-04-07 → debe ser 2027-04-05 (Fase 3) |

## Gap Analysis

### Fase 3 — UK Days (siguiente)
**Status:** CREATE. Diseñar con las reglas reales de memoria `project_excel_tax_rules` (medianoche en UK; HSBY solo cuenta si no te activan con noche fuera; INTSP/OOB; ida a VLC el último día ON si acaba pronto; lates; UW = duty que EMPIEZA en UK). Incluye bugs H5/H6, removeDay, `_excelData` fantasma, "Cargando…", fin de periodo 05-04. Posible `/dialectic` (diseño abierto: cómo capturar viajes personales que no salen en el roster).

### Pendientes del usuario (preguntar al retomar)
- Pendientes personales del usuario: ver memoria `project_hmrc_uk_days_record` (no detallar aquí: repo público).
- Aplicar los cambios de PilotLog 2025 y re-exportar el CSV para re-verificar.
- Enviar plan 2024 (→ tax year 2024/25) y plan/capturas 2026 (→ 2026/27 + cambios PilotLog 2026, incl. simuladores 28–29/03/2026).

## Reference Files for Next Session

```
@.paul/STATE.md
@.paul/phases/02-csv/02-01-SUMMARY.md
@.paul/phases/01-auditoria/AUDIT.md   (H5/H6 para Fase 3)
/home/ricardo/easylog-private/README.md   (privado: scripts e insumos)
Memoria: project_excel_tax_rules, reference_rocs_duty_plan, feedback_hmrc_records, project_hmrc_uk_days_record
```

## Prioritized Next Actions

| Priority | Action | Effort |
|---|---|---|
| 1 | `/paul:resume` → preguntar pendientes del usuario | XS |
| 2 | `/paul:plan` Fase 3 UK Days con las reglas reales | M |
| 3 | Re-verificar PilotLog cuando el usuario re-exporte; documentos 2024/25 y 2026/27 cuando lleguen los planes | S–M |

## State Summary

**Current:** Phase 2 ✅, loop cerrado. Código sin cambios desde `faca7df`. **Next:** Phase 3. **Resume:** `/paul:resume` y leer este handoff.

---
*Handoff created: 2026-10-04*
