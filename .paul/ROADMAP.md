# Roadmap: EasyLog

## Overview

Corregir los datos que EasyLog genera para que el CSV de PilotLog y el tracker de UK Days sean fiables, partiendo de una auditoría completa del código actual.

## Current Milestone

**v0.3 Pegar sin sorpresas** (v0.3.0)
Status: ✅ Complete
Completed: 2026-10-15

## Next Milestone

Por definir: /paul:milestone (o /paul:discuss-milestone).

## Version Overview

| Version | Name | Status |
|---------|------|--------|
| v0.1.0 | Datos fiables | ✅ Complete 2026-10-05 |
| v0.2.0 | Seguridad y robustez | ✅ Complete 2026-10-14 |
| v0.3.0 | Pegar sin sorpresas | ✅ Complete 2026-10-15 |

## Completed Milestones

<details>
<summary>v0.3 Pegar sin sorpresas - 2026-10-15 (4 phases, 5 plans)</summary>

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 9 | SAFETY PILOT al pegar | 1/1 | ✅ Complete | 2026-10-14 |
| 10 | UK Days: avisos al pegar (marca manual vs email + motivo No UK) | 1/1 | ✅ Complete | 2026-10-14 |
| 11 | Limpieza XS (diferidos G6/G8) | 2/2 | ✅ Complete | 2026-10-15 |
| 12 | Código de piloto fuera del repo público | 1/1 | ✅ Complete | 2026-10-15 |

Detalle completo: .paul/milestones/v0.3.0-ROADMAP.md

</details>

<details>
<summary>v0.2 Seguridad y robustez - 2026-10-14 (5 phases, 9 plans)</summary>

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 5 | Seguridad: XSS aeropuerto, SRI/CSP, reglas Firestore en repo | 2/2 | ✅ Complete | 2026-10-05 |
| 6 | Barrera de tests: runner único + fixtures anonimizadas + gate | 2/2 | ✅ Complete | 2026-10-05 |
| 7 | UK Days: año fiscal dinámico + límite configurable + máximo posible | 2/2 | ✅ Complete | 2026-10-13 |
| 7.1 | [INSERTED] UK Days: «Fuera de UK» (total real + desglose trabajo/libres) | 1/1 | ✅ Complete | 2026-10-14 |
| 8 | Sin pérdidas silenciosas: avisos + sync endurecida | 2/2 | ✅ Complete | 2026-10-11 |

Detalle completo: .paul/milestones/v0.2.0-ROADMAP.md

</details>

<details>
<summary>v0.1 Datos fiables - 2026-10-05 (8 phases, 11 plans)</summary>

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 1 | Auditoría (arnés + causas raíz) | 1/1 | ✅ Complete | 2026-10-03 |
| 1.1 | [INSERTED] Borrados persisten en la nube (merge:true) | 1/1 | ✅ Complete | 2026-10-03 |
| 1.2 | [INSERTED] Botón "+ Añadir fecha" UK Days (petición usuario) | 1/1 | ✅ Complete | 2026-10-03 |
| 2 | CSV: esquema validado + TIME_NIGHT + delays | 1/1 | ✅ Complete | 2026-10-03 |
| 3 | UK Days: fixes (03-01) + reglas reales (03-02, dialéctica) | 2/2 | ✅ Complete | 2026-10-04 |
| 3.1 | [INSERTED] Auto-actualización PWA (Safari sirve versiones viejas) | 1/1 | ✅ Complete | 2026-10-05 |
| 3.2 | [INSERTED] Datos coherentes: Excel U/UW = UK Days + SD; duplicados al pegar | 2/2 | ✅ Complete | 2026-10-05 |
| 4 | Pista en uso (dialéctica de fuente + implementación) | 2/2 | ✅ Complete | 2026-10-05 |

Detalle completo: .paul/milestones/v0.1.0-ROADMAP.md

</details>

---
*Roadmap created: 2026-10-03 · Updated: 2026-10-15 (v0.3 cerrado)*
