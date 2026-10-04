# PAUL Session Handoff

**Session:** 2026-10-04 ~16:55 → ~23:45
**Phase:** 3 de 4 (UK Days) ✅ COMPLETA → siguiente: auto-actualización de la PWA (prioridad), luego Fase 4 (Pista en uso)
**Context:** Retomada tras /clear. Dialéctica Fable → plan 03-02 (diseño y revisión de Fable) → APPLY → checkpoint largo en el iPhone, día a día con el usuario → UNIFY y transición de fase.

---

## Session Accomplishments

- **Dialéctica** `wf_78cb92df-f8c`: gana el Polo A enmendado (regla cerrada + excepciones explícitas, sin inferir). Detalle en `.paul/phases/03-ukdays/03-02-DIALECTIC.md`.
- **Plan 03-02** diseñado y revisado en modo adversario por Fable (3 bloqueantes corregidos antes del APPLY).
- **Código desplegado** (último commit de código `4910c67`, verificado en la web):
  - Regla R1/R2/R3: hay que aterrizar en UK (UK_RES, sin JER/GCI); calzos a las 00:00 justas = UK Day; después de 00:00 = No UK.
  - Estados uk/no con `source`/`reason`; ✕ → "No UK" manual persistente; botón UK para forzarlo; ✕ también en los SBY/SIM del calendario.
  - `ukDayStatus` con precedencia; pendientes P solo de días pasados (hasta ayer en Londres); huecos con botón OFF.
  - Contador `N / 91 · P pend.` (la alarma usa solo N); sección "No UK"; backup con procedencia.
  - Exportar CSV: barra fija «🗑 Quitar de la lista» (en el iPhone se perdía el confirm). Solo borra los días exportados y sin cambios. ✕ de "Días guardados" solo quita de la lista.
  - Seguridad: `esc()` en el innerHTML de rutas y motivos; `computeUKDay` solo acepta IATA `[A-Z]{3}`.
- **Arneses:** `harness-ukdays-rules.mjs` (66 casos) + regresiones 03-01/csv/fecha/merge, todos en verde.
- **Revisiones:** G6 ×2 (1 hallazgo cada una, corregidos) · G7 informativo · G8 1 hallazgo bajo (self-XSS) corregido.
- **Datos del usuario verificados en el iPhone:** **54/91, 0 pendientes**.
  - Corregidos: 06/05 (SD/meeting) y 24/09 (SBY activado, noche en BLQ) → No UK; 27/09 VTO → OFF.
  - Pegados los emails que faltaban: 09/04, 12/05, 20/05, 23/09, 24/09, 26/09, 02/10, 03/10.
- **Research HMRC:** FA 2013 Sch 45 para 22 + RFIG20710 (midnight test) → calzos a las 00:00 = presente al final del día.
  - Revisado todo el histórico de PilotLog (940 vuelos): 3 casos de calzos a las 00:00.
- (pendiente personal del usuario — detalle en memoria local)

## Decisions Made

| Decision | Rationale | Impact |
|---|---|---|
| Regla cerrada, nada inferido; pendientes visibles | HMRC: mandan los registros contemporáneos; la dialéctica | El usuario confirma huecos/SBY |
| La regla exige aterrizar en UK | Criterio: estar en UK a las 00:00 | Sustituye "sin exigir aeropuerto UK" |
| Calzos a las 00:00 justas = UK Day | Norma del usuario + ley (FA 2013 Sch 45 para 22) | 06/04/2026 cuenta |
| P fuera de la alarma | N+P saltaría siempre | La alarma solo usa los confirmados |
| ✕ solo quita de la lista; botón tras exportar | El usuario perdió datos 2 veces | El Excel y los UK Days nunca se borran al limpiar |
| Matiz INTSP: si vuelve a dormir en UK, sí es UK Day | Usuario (25/09/2026) | Memoria project_excel_tax_rules |
| Preguntar de una en una, con lista en STATE | El usuario: "me estoy liando" | Memoria feedback-one-question |

## Gap Analysis with Decisions

### Auto-actualización de la PWA (como Toca Cabeza)
**Status:** CREATE — **prioridad 1**. Safari sirve versiones viejas: contó 80 en vez de 53 y hubo un borrado desde una pestaña vieja.
**Notes:** Toca Cabeza (`/home/ricardo/motos`) usa vite-plugin-pwa (`registerType: 'prompt'`, `injectManifest`, `useRegisterSW` en `src/app/actualizacion.tsx`). EasyLog es un único `index.html` sin build. Propuesta: versión embebida + `version.json` (o comprobación de `index.html` con `no-store`) al abrir y al volver a la app → recargar sola. Valorar un SW mínimo. Decidir si va como fase 3.1 o como primer plan de la 4.
**Effort:** S

### Detectar vuelos duplicados al pegar
**Status:** CREATE (aclarar el alcance con el usuario). Si es idéntico → avisar "duplicado" y no guardar; si difiere → mostrar las discrepancias campo a campo. Hoy `addDay` solo mira el historial, no `_excelData`.
**Effort:** S–M

### Estado SD en el calendario + columna U del Excel
**Status:** DEFER (03-03 o el plan de la PWA). El calendario no tiene SD (ground duty); la columna U del Excel no exige aeropuerto UK y pone SBY con U=1.
**Effort:** S

## Open Questions (UNA en UNA, en este orden)

1. ¿El 02/10/2026 (FR2134/FR2135) está duplicado en PilotLog?
2. ¿Los DH vienen en el email de vuelo como un sector más?
3. Revisar uno a uno los 47 días previos de 2026/27 (25 manuales + 22 R1).
4. ¿Añadir el año a las fechas de "Sin decidir"?
- (pendiente personal del usuario — detalle en memoria local)

## Reference Files for Next Session

```
@.paul/STATE.md
@.paul/phases/03-ukdays/03-02-SUMMARY.md
@.paul/phases/03-ukdays/harness-ukdays-rules.mjs
@index.html  (UK Days ~1530-1960; export ~1410-1460; calendario ~2400+)
/home/ricardo/motos/src/app/actualizacion.tsx + vite.config.ts (referencia de auto-actualización)
Memoria: project_excel_tax_rules, project_hmrc_uk_days_record, feedback_one_question, feedback_hmrc_records
```

## Prioritized Next Actions

| Priority | Action | Effort |
|---|---|---|
| 1 | `/paul:plan` — auto-actualización de la PWA (decidir fase 3.1 vs 4) | S |
| 2 | Preguntas abiertas 1–2 (duplicado del 02/10 y DH), de una en una | XS |
| 3 | Plan de duplicados al pegar + SD/columna U | S–M |
| 4 | Fase 4: pista en uso (dialéctica de la fuente) | M |
| 5 | Re-exportar PilotLog para re-verificar los cambios de 2025 | S |

## State Summary

**Current:** Fase 3 ✅ (2/2 planes), loop cerrado. Producción = `4910c67`. Milestone v0.1 al 75%.
**Next:** `/paul:plan` para la auto-actualización de la PWA.
**Resume:** `/paul:resume` y luego leer este handoff.
**Para probar en el iPhone hasta que exista la auto-actualización:** abrir con `?v=N`, usando un número nuevo cada vez; el último usado fue 30.

---

*Handoff created: 2026-10-04 23:45*
