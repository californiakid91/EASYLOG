# PAUL Session Handoff

**Session:** 2026-10-03 12:18 – 15:25
**Phase:** 1, 1.1 y 1.2 completas → siguiente: Phase 2 (CSV)
**Context:** Init PAUL + auditoría + pruebas de importación reales en PilotLog + 2 arreglos desplegados y verificados en iPhone.

---

## Session Accomplishments

- **Fase 1 Auditoría** (`.paul/phases/01-auditoria/AUDIT.md`): causas raíz con arnés node:vm sobre index.html real + 4 importaciones de prueba del usuario en CrewLounge.
- **Fase 1.1** (deploy `7b922f7`): borrados persistían mal en la nube (`setDoc merge:true` no borra claves anidadas) → `mergeFields` + guard de hidratación (ignora snapshots `fromCache`, aviso visible). Verificado en iPhone (18/09 borrado).
- **Fase 1.2** (deploy `70e0106`): "+ Añadir hoy" → "+ Añadir fecha" (ventana con selector nativo, solo añade al pulsar "Añadir"). Verificado en iPhone.
- Datos del usuario corregidos: 18/09 (era SIM) → UK Day manual sin ruta falsa; 20/09 borrado (OFF); vuelo falso 18/09 borrado en PilotLog. 02/06 añadido de prueba → el usuario lo borra.

## Esquema de importación CrewLounge VALIDADO (base de la Fase 2)

| Columna | Formato que funciona | Estado actual en la app |
|---|---|---|
| `DELAY` (no `TAG_DELAY`, que el wizard ignora: aviso "tag_delay not recognized") | **1 solo** código IATA numérico. `41\|93`, `41,93`, `93 62 15` → vacío | ❌ manda `TAG_DELAY` con nombres |
| `TIME_NIGHT` | `H:MM` (probado 1:35 y 2:36) | ❌ no existe |
| `TO_DAY/TO_NIGHT/LDG_DAY/LDG_NIGHT` | 0/1 — funciona | ✅ (vuelo mixto día/noche perdía LDG sin TIME_NIGHT; con TIME_NIGHT OK) |
| `AC_ENGTYPE` | `Jet` (wizard: "Invalid value for Aircraft Engine Type" en 19/19) | ❌ manda `Turbine (jet-fan)` |
| `RWY_DEP/RWY_ARR` (no DEP_RWY) | designador (`22`) — sin probar | Fase 4 |
| FLIGHTLOG (límite 250 chars, no da error), REMARKS (≤50) | | |

## Decisions Made

| Decision | Rationale |
|---|---|
| DELAY = código con más minutos; resto de códigos+minutos a notas | Importer acepta 1 código |
| TIME_NIGHT por interpolación Off→On Block + isNightAt (validar círculo máximo) | Estimación del arnés coincidió con lo importado |
| Firestore: mergeFields + no escribir antes de snapshot real del servidor | merge:true no borraba; evitar pisar nube desde caché offline |
| Last-write-wins por campo entre dispositivos | Usuario único, aceptado |
| Pistas: sin claves secretas en cliente; dialéctica en fase 4 (METAR IEM + OurAirports vs FR24+proxy vs manual) | Seguridad #1 |

## Deferred / Open

- Fase 2: fecha `PILOTLOG_DATE` de sectores post-medianoche; códigos de delay alfanuméricos (`Number()` → NaN).
- Fase 3: selección del último vuelo por Off Block HHMM (H5, fixture 91); UK Day no se recalcula al re-pegar (H6); `removeDay` no borra UK Day; `_excelData['2026-09-18']` fantasma sin UI para borrarlo (fila FR1520 18/09 en Excel Tax Year — avisado al usuario); mostrar "Cargando…" en UK Days/calendario mientras `!cloud.hydrated` (usuario se alarmó).
- Fase 4: pistas.

## Lecciones operativas

- **GitHub Pages cachea 10 min** (`max-age=600`): para probar en el iPhone al momento → abrir en Safari `https://californiakid91.github.io/EASYLOG/?v=N`.
- iOS `<input type=date>` autocompleta hoy al abrirse y dispara `change` → nunca confirmar en `change`.
- Pedir siempre OK explícito antes de `git push` (repo PÚBLICO; `.paul/` se publica — sin nombres de tripulación; fixtures gitignored).

## Reference Files

```
@.paul/STATE.md
@.paul/phases/01-auditoria/AUDIT.md          (todo el detalle + addenda de importación)
@.paul/phases/01-auditoria/harness/run.mjs   (node .paul/phases/01-auditoria/harness/run.mjs)
@.paul/phases/01.1-borrados-nube/harness-merge.mjs
@.paul/phases/01.2-ukdays-fecha-manual/harness-fecha.mjs
@index.html  (HEADER ~927, toRow ~956, DELAY_CODES 648)
```

## Prioritized Next Actions

| Priority | Action |
|---|---|
| 1 | `/paul:plan` Fase 2 CSV: DELAY 1 código + TIME_NIGHT + ENGTYPE Jet + minutos delay a notas + fecha post-medianoche; verificar con CSV real del usuario |
| 2 | Fase 3 UK Days (H5, H6, removeDay, _excelData fantasma, "Cargando…") |
| 3 | Fase 4 pistas: `/dialectic` antes de planificar |

## State Summary

**Current:** Fase 1.2 completa, loop cerrado (✓✓✓). **Next:** `/paul:plan` (Fase 2). **Resume:** `/paul:resume` y leer este handoff.

---
*Handoff created: 2026-10-03T15:25+01:00*
