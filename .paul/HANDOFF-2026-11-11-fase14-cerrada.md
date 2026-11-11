# PAUL Session Handoff

**Session:** 2026-11-11, puesta al día tras ~4 semanas sin abrir el proyecto.
**Milestone:** v0.4 Datos y fiscal: 3/3 fases completas (13, 13.1 y 14). Falta cerrar el milestone.

---

## Session Accomplishments

- **Puesta al día con datos reales.** El usuario descargó el Excel Tax Year 2026/27 y se revisó día a día desde el 14/10.
  - Están todos los emails pegados y no hay días pendientes.
  - Un día marcado a mano fue confirmado por el usuario.
  - Cifras y detalle: SOLO en la memoria local (`project_ukdays_2026_27_reviewed`). No volver a revisar ese tramo.
- **Fallo del Excel.** El número de vuelo salía con `FR` delante de prefijos de otra compañía del grupo (`FRRK…`).
  - Contexto del usuario: RKxxxx = Ryanair UK; el sufijo P = positioning sin pasajeros (correcto).
  - Guardado en la memoria local (`reference_flight_number_prefixes`).
- **14-01 (81daee6, prod 2026.11.11-223758):**
  - **Aviso de vuelo repetido.** Al pegar un sector ya guardado en otra fecha, la app pregunta antes de escribir.
    - El sector se reconoce por número, ruta, matrícula y Off Block.
    - El aviso dice el daño (PilotLog, Excel, UK Day) y cómo deshacerlo.
  - **Excel:** número de vuelo tal cual y `FR` solo delante de dígitos. El CSV no cambia.
  - **Revisiones:**
    - Fable aprobó el plan con cambios, todos aplicados.
    - G6 encontró 1 fallo en un test, arreglado.
    - G7, CRG: informativo.
    - G8: sin superficie nueva.
- **Barrido único de duplicados en otra fecha** sobre el Excel del usuario: 0.

---

## Open Questions / pendientes del usuario

- Sigue pendiente desde v0.3: importar el primer CSV en PilotLog y revisar CREWLIST y TO/LDG.
- Opcional: descargar el Excel de nuevo para que los días con RK salgan bien.

---

## Prioritized Next Actions

| Priority | Action | Effort |
|----------|--------|--------|
| 1 | `/paul:complete-milestone`: cerrar v0.4 | XS |
| 2 | Meter `NODE_OPTIONS=--network-family-autoselection-attempt-timeout=2000` en el pre-push o en lib.mjs. Sin él, e2e-csp da «sin red» en este WSL con Node 22 | XS |

---

## State Summary

**Next:** `/paul:complete-milestone` · **Resume:** `/paul:resume`

**Push desde esta máquina:**
`NODE_OPTIONS="--network-family-autoselection-attempt-timeout=2000" git push origin main`
Usar timeout ≥ 10 min; el gate pre-push tarda unos 3 min.

**Privacidad:**
- Nunca escribir en el repo, los planes, los SUMMARY, los handoffs ni los commits el código o el nombre reales del piloto, ni fechas o cifras fiscales concretas.
- Nunca usar `git commit -n`.

---

*Handoff created: 2026-11-11*
