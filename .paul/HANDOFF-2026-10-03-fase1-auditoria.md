# PAUL Session Handoff

**Session:** 2026-10-03 12:18 - 14:00
**Phase:** 1 completa → 2 (CSV) lista para planificar
**Context:** Init de PAUL en EasyLog + auditoría completa de los fallos del CSV y UK Days reportados por el usuario.

---

## Session Accomplishments

- `/paul:init`: PROJECT.md, ROADMAP.md (milestone v0.1 Datos fiables, 4 fases), STATE.md, paul.json
- Plan 01-01 (auditoría) revisado por Fable adversario → ejecutado → unificado
- Arnés `.paul/phases/01-auditoria/harness/run.mjs`: ejecuta el `<script>` REAL de index.html en node:vm con DOM-Proxy; imprime fila CSV campo a campo, TIME_NIGHT estimado y el UK Day que produce `addDay()` real
- Fixtures (gitignored): `01` real del usuario (02/10 STN-RZE-STN FR2134/2135), `90`/`91` sintéticos (último vuelo cruzando 00:00Z)
- `AUDIT.md`: causa raíz de los 5 fallos con citas index.html:línea
- Commit `0223835` en main (index.html sin tocar)

## Hallazgos clave (detalle en AUDIT.md)

| Fallo | Causa | Fase |
|---|---|---|
| Night | `TIME_NIGHT` no existe en HEADER (index.html:927). Estimado FR2134 ≈95/135, FR2135 156/156 min | 2 |
| T/O-LDG faltan al importar | La app los genera bien. **H8:** el 19/05 (a0b8681) el CSV pasó de 35→37 cols; si el importer mapea por posición, 14 columnas se desplazan (LDG_DAY recibe TO_NIGHT, TAG_DELAY recibe FUEL) | 2 |
| Delays raros | Probablemente H8; además minutos de delay solo en FLIGHTLOG (ignorado) y códigos alfanuméricos descartados (index.html:1012) | 2 |
| UK Days on-block | **H5:** sort por Off Block HHMM (1284-1287, 1550-1553) — vuelo con Off ≥00:00Z queda primero → UK Day falso con on-block del vuelo anterior. **H6:** nunca se recalcula (1283, 1547) | 3 |
| Pista | No existe; email no la trae | 4 |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Auditar antes de arreglar, con arnés sobre código real | Historial de ciclos fix→revert (7bfe0dc, f45f7e2, 7ca1987) | Fases 2-3 usan el arnés como test de regresión |
| UK Day = on-block último vuelo < 00:00 hora Londres, sin exigir aeropuerto UK | Usuario + REGLAS_EXCEL_TAX_YEAR.md | Fix fase 3 |
| Fixtures con nombres de tripulación → .gitignore | Privacidad; repo público (GitHub Pages) | Nunca commitear emails reales |
| Pistas: sin claves secretas en cliente | Seguridad #1; FR24 exige token que sería público | Fase 4: dialéctica entre viento METAR (IEM, CORS ok) + OurAirports runways.csv (CORS ok) + confirmación 1 toque vs FR24+proxy vs manual |
| No activar SonarQube / enterprise audit / special flows | App personal de 1 fichero | Activables con /paul:config |

## Open Questions (para el usuario — desbloquean H8)

1. En PilotLog, FR2134 del 02/10 ya importado: ¿qué muestra en **Delay**, **PAX**, **Fuel**, **modelo de avión**? (Delay = número tipo 7160 → H8 confirmada)
2. ¿El importador de CrewLounge (my.crewlounge.center) pide asignar columnas o usa plantilla/mapeo guardado?
3. H7 sin resolver: AC_ENGTYPE actual `Turbine (jet-fan)` vs commit 5079179 "importer rejects it" → volvió a `Jet`; CREWLIST multilínea vs canónico `CP - CODE - NAME|…`; FLIGHTLOG (no soportado).

## Reference Files for Next Session

```
@.paul/STATE.md
@.paul/phases/01-auditoria/AUDIT.md
@.paul/phases/01-auditoria/01-01-SUMMARY.md
@.paul/phases/01-auditoria/harness/run.mjs   (node .paul/phases/01-auditoria/harness/run.mjs)
@index.html  (HEADER 927, toRow 956, DELAY_CODES 648, addDay 1224, buildUTCOnBlock 1515, backfillUKDays 1542)
Memoria: reference_crewlounge_export (99 cols canónicas)
```

## Prioritized Next Actions

| Priority | Action | Effort |
|----------|--------|--------|
| 1 | `/paul:plan` fase 2: plan 02-01 = generar 2 CSV de prueba del 02/10 (37 cols actual vs variante canónica por nombre de cabecera) + checkpoint de importación del usuario → fijar esquema | S |
| 2 | Fase 2 resto: TIME_NIGHT (interpolación círculo máximo Off→On Block), delays (alfanuméricos + minutos), fecha sectores post-medianoche | M |
| 3 | Fase 3 UK Days (independiente de H8 — se puede adelantar si el usuario tarda en probar la importación) | S |
| 4 | Fase 4 pistas: `/dialectic` antes de planificar | M |

## State Summary

**Current:** Phase 2 of 4, sin plan, loop cerrado (✓✓✓)
**Next:** `/paul:plan` (fase 2)
**Resume:** `/paul:resume` then read this handoff

---

*Handoff created: 2026-10-03T14:00+01:00*
