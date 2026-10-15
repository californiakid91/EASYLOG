# PAUL Session Handoff

**Session:** 2026-10-15 (noche)
**Milestone:** v0.4 Datos y fiscal: Fase 13 ✅ (1 de 2), sigue la Fase 14
**Context:** se creó v0.4 y se hizo la Fase 13 completa (plan revisado por Fable → apply → checkpoint con el Excel real → unify).

---

## Session Accomplishments

- Milestone v0.4 «Datos y fiscal» creado: Fase 13 (SBY/SIM/SD + UW) y Fase 14 (mismo vuelo con otra fecha).
- 13-01 (da202b9, desplegado prod 2026.10.15-222246):
  - SBY con email → manda la regla del email.
  - SIM/SD sin email → pendiente «cal-ask», que decide el usuario.
  - UW sin vuelos: SBY = 1; SIM/SD/DUTY se deciden por el día anterior (UK = 1, No UK = vacío, otro = '?').
  - ukDecidePending en año congelado pide confirmación.
- Revisiones:
  - G6: limpio.
  - G8: sin vulnerabilidades (diferido: filtrar _dayMap con CAL_STATES al hidratar).
  - Barrera: 25/25, 21/21 con --now=2027.
- Checkpoint: el Excel real 2026-27 se leyó con SheetJS y todas las filas sin vuelos cumplen la regla UW.
- Docs cerrados: SUMMARY, STATE, ROADMAP, PROJECT y paul.json (66ecfeb).

---

## Open Questions / pendientes del usuario

- Marcar UK en la app el día OFF de víspera de un DUTY en el que durmió en UK («Fuera de UK» → UK). Hay otros 2 posibles. Detalle solo en la memoria local, nunca en el repo.
- Pegar los emails que faltan en días DUTY que fueron de vuelo (UW vacía en el Excel).
- Sigue pendiente desde v0.3: el primer CSV en PilotLog (CREWLIST, TO/LDG).
- Idea diferida: «OFF seguido de DUTY temprano en STN = durmió en UK» → ¿aviso o regla? Solo si se repite.

---

## Prioritized Next Actions

| Priority | Action | Effort |
|----------|--------|--------|
| 1 | `/paul:plan 14`: detectar el mismo vuelo pegado con otra fecha (PilotLog lo duplicaría) | S |
| 2 | (Usuario) marcas UK pendientes y emails sin pegar | XS |

---

## State Summary

**Current:** v0.4, Fase 14 lista para planificar. Loop IDLE.
**Next:** `/paul:plan 14`
**Resume:** `/paul:resume` y leer este handoff.

**Privacidad:** nunca escribir en el repo, los planes, los SUMMARY, los handoffs ni los commits el código ni el nombre reales del piloto, ni fechas o cifras fiscales concretas. Nunca usar `git commit -n`.

---

*Handoff created: 2026-10-15*
