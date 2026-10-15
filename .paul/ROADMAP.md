# Roadmap: EasyLog

## Overview

Corregir los datos que EasyLog genera para que el CSV de PilotLog y el tracker de UK Days sean fiables, partiendo de una auditoría completa del código actual.

## Current Milestone

**v0.3 Pegar sin sorpresas** (v0.3.0)
Status: ✅ Phases complete (4 of 4) — pendiente /paul:complete-milestone
Phases: 4 of 4 complete
Theme: Que al pegar un email la app detecte los casos especiales (SAFETY PILOT, contradicciones con marcas manuales de UK Days) y avise, y cerrar los diferidos XS de G6/G8.

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 9 | SAFETY PILOT al pegar | 1/1 | ✅ Complete | 2026-10-14 |
| 10 | UK Days: avisos al pegar (marca manual vs email + motivo No UK) | 1/1 | ✅ Complete | 2026-10-14 |
| 11 | Limpieza XS (diferidos G6/G8) | 2/2 | ✅ Complete | 2026-10-15 |
| 12 | Código de piloto fuera del repo público | 1/1 | ✅ Complete | 2026-10-15 |

### Phase 9: SAFETY PILOT al pegar

Focus: detectar al pegar los vuelos en que el usuario va de SAFETY PILOT (3er FO, sin PF) y proponer funciones 0:00, Pilot 3 SELF y remarks «SAFETY PILOT», con confirmación del usuario (criterio del usuario, memoria local).
Plans: TBD (defined during /paul:plan)

### Phase 10: UK Days: avisos al pegar

Focus: al pegar un email de un día con marca manual que lo contradice, avisar y ofrecer volver a la regla del email (caso 03/10/2026); texto correcto del motivo de los «No UK» decididos a mano sin email.
Plans: 10-01 ✅ (SUMMARY: .paul/phases/10-ukdays-avisos-al-pegar/10-01-SUMMARY.md)

### Phase 11: Limpieza XS (diferidos G6/G8)

Focus: onclick con iso → data-iso + addEventListener; epoch de sesión para `_cloudWrites`; validación mínima de forma en applyCloudData; límite de longitud del motivo en el backup (mailto); «dar por perdida» la copia local dañada; selección final al planificar.
Plans: 11-01 ✅ (pantalla: gen_204, onclick → data-act, backup al portapapeles) · 11-02 ✅ (datos: epoch de sesión, campos de la nube dañados, descartar copia local dañada)

### Phase 12: Código de piloto fuera del repo público

Focus: dejar de publicar el código y el nombre del piloto a partir de ahora, sin purgar el historial. El código pasa a ser un ajuste del usuario (`settings.pilotCode` en `_settings`, se pide una vez tras `requireHydrated`); `myCode()` sustituye a los literales; CREWLIST sale del email; fixtures y golden con código/nombre sintéticos; docs de .paul/ solo hacia adelante.
Plans: 12-01 ✅ (SUMMARY: .paul/phases/12-codigo-piloto-fuera-del-repo/12-01-SUMMARY.md)

## Version Overview

| Version | Name | Status |
|---------|------|--------|
| v0.1.0 | Datos fiables | ✅ Complete 2026-10-05 |
| v0.2.0 | Seguridad y robustez | ✅ Complete 2026-10-14 |
| v0.3.0 | Pegar sin sorpresas | 🚧 Fases completas — por cerrar |

## Completed Milestones

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
*Roadmap created: 2026-10-03 · Updated: 2026-10-15 (Fase 12 completa)*
