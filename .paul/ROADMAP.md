# Roadmap: EasyLog

## Overview

Corregir los datos que EasyLog genera para que el CSV de PilotLog y el tracker de UK Days sean fiables, partiendo de una auditoría completa del código actual.

## Current Milestone

**v0.2 Seguridad y robustez** (v0.2.0)
Status: 🚧 In Progress
Phases: 2 of 4 complete
Theme: Cerrar los hallazgos de la auditoría Aegis (2026-10-05) sin cambiar el flujo de uso: que nadie pueda inyectar código, que nada se pierda en silencio, que UK Days siga bien el año que viene y que los tests frenen regresiones.
Source: .aegis/report/05-remediation-roadmap.md (local, no versionado)

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 5 | Seguridad: XSS aeropuerto, SRI/CSP, reglas Firestore en repo | 2/2 | ✅ Complete | 2026-10-05 |
| 6 | Barrera de tests: runner único + fixtures anonimizadas + gate | 2/2 | ✅ Complete | 2026-10-05 |
| 7 | UK Days: año fiscal dinámico + límite configurable + máximo posible | TBD | Not started | - |
| 8 | Sin pérdidas silenciosas: avisos de escritura bloqueada + estado tras confirm() | TBD | Not started | - |

### Phase 5: Seguridad
Plans:
- [x] 05-01: anti-inyección (IATA, claves ISO al pintar, esc, whitelist calendario, claves email Firestore) — prod v2026.10.05-102039
- [x] 05-02: SheetJS vendorizado + meta CSP + firestore.rules = producción — prod v2026.10.05-120346
Status: ✅ Complete 2026-10-05
Focus: F-04-001 (código de aeropuerto → /^[A-Z]{3}$/ + esc + sin onclick inline en esa lista), F-04-002 (SRI SheetJS o vendorizar + meta CSP con connect-src/img-src/form-action), F-04-003 (firestore.rules versionado = producción), F-04-004 (shape-check mínimo de estado cargado), F-04-007 (CSV formula injection).
Plans: TBD (defined during /paul:plan)

### Phase 6: Barrera de tests
Focus: F-06-001/002/003 — un `run-all` que ejecuta todos los harness con fixtures anonimizadas versionadas y golden de cabeceras del importer; gate en pre-commit/pre-push; Playwright sin rutas absolutas.
Plans:
- [x] 06-01: fixtures anonimizadas + golden (cabeceras importer + CSV) + harness en tests/ + run-all — 12/12 en 1,3 s, clon limpio OK
- [x] 06-02: Playwright propio (package.json) + e2e en tests/e2e + gate pre-commit/pre-push — 14/14, e2e-runways reparado
Status: ✅ Complete 2026-10-05

### Phase 7: UK Days año y límite
Focus: F-03-001 (año fiscal derivado de la fecha / selector, antes del 06/04/2027), límite configurable (valor a confirmar por el usuario), "máximo posible" con pendientes, etiqueta sin "bonus" (F-DA-008/D-010), F-03-006 (año explícito en comando manual).
Plans: TBD

### Phase 8: Sin pérdidas silenciosas
Focus: F-02-006 + F-RG-003 (escritura bloqueada tapada por "ok"), F-02-001 (estado obsoleto tras confirm()), F-02-004/005/007 (fallos de localStorage/nube solo en consola), F-RG-004 (textos que prometen importar). Política de sync (LWW vs merge por día) se decide en el plan.
Plans: TBD

## Version Overview

| Version | Name | Status |
|---------|------|--------|
| v0.1.0 | Datos fiables | ✅ Complete 2026-10-05 |
| v0.2.0 | Seguridad y robustez | 🚧 In Progress |

## Completed Milestones

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
*Roadmap created: 2026-10-03 · Updated: 2026-10-05 (Fase 6 completa)*
