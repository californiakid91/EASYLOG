# PAUL Session Handoff

**Session:** 2026-10-15/16 (noche)
**Milestone:** v0.4 Datos y fiscal. Fases 13 y 13.1 ✅; sigue la Fase 14.

---

## Session Accomplishments

- **v0.4 creado** con 3 fases: 13, 13.1 (insertada a petición del usuario) y 14.
- **13-01** (da202b9):
  - SBY con email: manda la regla del email.
  - SIM y SD sin email: quedan pendientes y los decide el usuario.
  - UW sin vuelos: se calcula por el día anterior; SBY siempre vale 1.
  - Verificado con el Excel real del usuario.
- **13.1-01** (edbed0b, prod 2026.10.15-231555):
  - Ayer tiene 24 h de gracia antes de contar como pendiente, sea del tipo que sea.
  - Hasta entonces no bloquea el Excel, donde sale con U «?».
  - «Máximo posible», «Fuera de UK» y el backup lo muestran como «en espera».
- **Datos (usuario):** marcó UK el OFF de víspera de un DUTY tras dormir en UK. Los otros 2 casos eran correctos como No UK. El detalle está solo en la memoria local.
- **Revisiones:**
  - Fable revisó ambos planes antes de aplicarlos.
  - G6 en las dos fases; en la 13.1 se aplicaron sus menores.
  - G8 de la Fase 13: sin vulnerabilidades.
  - G8 de la 13.1: revisión inline, sin superficie nueva.

---

## Open Questions / pendientes del usuario

- Pegar el email del día de ayer (llega hacia las 9:00).
- Pegar los emails que faltan en días DUTY que fueron de vuelo (UW vacío en el Excel).
- Sigue pendiente desde v0.3: el primer CSV en PilotLog (CREWLIST, TO/LDG).
- Comprobar en el iPhone que el «1 pend.» de ayer ya no aparece. Es la verificación ligera de la 13.1; no se pidió checkpoint.

---

## Prioritized Next Actions

| Priority | Action | Effort |
|----------|--------|--------|
| 1 | `/paul:plan 14`: avisar si se pega un vuelo ya guardado con otra fecha | S |

---

## State Summary

**Next:** `/paul:plan 14` · **Resume:** `/paul:resume`

**Privacidad:** nunca escribir en el repo, los planes, los SUMMARY, los handoffs ni los commits el código o el nombre reales del piloto, ni fechas o cifras fiscales concretas. Nunca usar `git commit -n`.

---

*Handoff created: 2026-10-16*
