# Roadmap: EasyLog

## Overview

Corregir los datos que EasyLog genera para que el CSV de PilotLog y el tracker de UK Days sean fiables, partiendo de una auditoría completa del código actual.

## Current Milestone

**v0.1 Datos fiables** (v0.1.0)
Status: In progress
Phases: 1 of 4 complete

## Phases

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 1 | Auditoría (arnés + causas raíz) | 1/1 | ✅ Complete | 2026-10-03 |
| 2 | CSV: esquema validado + TIME_NIGHT + delays | TBD | Not started | - |
| 3 | UK Days: orden cronológico + recálculo | TBD | Not started | - |
| 4 | Pista en uso (dialéctica de fuente + implementación) | TBD | Not started | - |

## Phase Details

### Phase 1: Auditoría
**Goal:** Causa raíz reproducible de cada fallo reportado, con arnés Node sobre index.html real.
**Plans:** - [x] 01-01: Arnés + AUDIT.md

### Phase 2: CSV
**Goal:** El CSV importa en PilotLog con T/O-LDG, night, delays y columnas correctas.
**Depends on:** Phase 1 (AUDIT.md H1, H4, H7, H8)
**Scope:** prueba de importación con el usuario (35 vs 37 cols, mapeo posicional H8; ENGTYPE/CREWLIST H7) → fijar esquema; TIME_NIGHT por interpolación; delays alfanuméricos + minutos; fecha de sectores post-medianoche.

### Phase 3: UK Days
**Goal:** El UK Day usa siempre el on-block del último sector real.
**Depends on:** Phase 1 (H5, H5b, H6)
**Scope:** orden cronológico con cruce de medianoche; recalcular al reemplazar un día (no `manual`); tests con fixtures 01/90/91.

### Phase 4: Pista en uso
**Goal:** DEP_RWY/ARR_RWY rellenos sin servidor ni claves públicas.
**Research:** Likely → dialéctica: viento METAR (IEM) + OurAirports vs FR24+proxy vs manual.

---
*Roadmap created: 2026-10-03*
