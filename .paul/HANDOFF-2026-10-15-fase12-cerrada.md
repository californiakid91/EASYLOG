# PAUL Session Handoff

**Session:** 2026-10-15 (mañana)
**Phase:** 12 — Código de piloto fuera del repo público — ✅ Complete
**Context:** Fase 12 añadida a v0.3, planificada (Fable), aplicada, desplegada, verificada en prod y cerrada. v0.3 tiene 4/4 fases → falta cerrar el milestone.

---

## Session Accomplishments

- `/paul:add-phase` Fase 12 (9f656ad) → plan 12-01 revisado por Fable, 13 hallazgos incorporados (30f53e6 = `BASELINES.preFase12`).
- APPLY: d18ee1e (feat) + 1517094 (fix G6). Push hecho; prod = `2026.10.15-105223`.
  - App: `settings.pilotCode` vía `myCode()` / `askPilotCode()` / `exportCode()`; nombre de CREWLIST y de la fila NAME del Excel desde el email (`pilotNameFor`).
  - Tests: código/nombre sintéticos (`FOXRAY` / `FIRST OFFICER XRAY`), `legacyAsTest()`, comparación permanente del CSV con preFase12, nuevo `harness-pilotcode.mjs`.
  - Hooks: `.githooks/pre-commit` + `.githooks/commit-msg` contra `.private-words` (local, gitignored); exentos fijos en `.githooks/private-words-exempt`.
- Emails reales (script fuera del repo): CSV 6/6 idéntico byte a byte (FO/CPT/SP).
- Checkpoint en producción (WebKit/iPhone 13): 16/16, aprobado con capturas.
- UNIFY: `12-01-SUMMARY.md`. Transición: G7 CRG riesgo 0,40 (informativo); G8 security-review (Fable) sin vulnerabilidades reales. Commit de fase 0ce9646.
- Tests: 24/24 (harness + e2e) y 20/20 con `--now=2027-06-01`.

---

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Fase pilotCode dentro de v0.3 (usuario: «Si») | Cerrarla antes del milestone | v0.3 = 4 fases |
| Nombre de la fila NAME = el del email (usuario: «Del email») | No guardar más datos personales | Sale como lo escribe el email |
| Sin botón para cambiar el código | Fable #12: sobreingeniería; se corrige desde el confirm de AC-2 | Menos UI |
| Forward-only, sin purga ni force-push | Decisión previa Fable + usuario | Historial antiguo intacto |

---

## Gap Analysis with Decisions

Todos DEFER (registrados en STATE.md → Deferred Issues):
- Sugerencia del prompt asume FO aunque el rol sea CPT — revisar al ascender.
- Aviso «No se ha podido guardar tu código» tapado por el OK del pegado (sin pérdida).
- CREWLIST propia cambia si el email escribe el nombre con otra grafía / `SELF` sin tripulación (aceptado).
- G8: ficheros exentos del hook no controlan palabras NUEVAS → comprobar solo líneas añadidas.
- G8: la lista de exentos es pública (índice de lo ya publicado).

---

## Open Questions

- Ninguna de diseño. Pendiente del usuario en su iPhone con la nube: (1) el primer pegado pedirá el código UNA vez; (2) importar en PilotLog el primer CSV y comprobar CREWLIST y TO/LDG como siempre.

---

## Reference Files for Next Session

```
@.paul/STATE.md
@.paul/ROADMAP.md
@.paul/PROJECT.md
@.paul/phases/12-codigo-piloto-fuera-del-repo/12-01-SUMMARY.md
```

---

## Prioritized Next Actions

| Priority | Action | Effort |
|----------|--------|--------|
| 1 | `/paul:complete-milestone` v0.3 | S |
| 2 | (Usuario) verificar en el iPhone el prompt del código y el primer CSV en PilotLog | XS |

---

## State Summary

**Current:** Fase 12 ✅, loop PLAN ✓ APPLY ✓ UNIFY ✓; v0.3 4/4 fases.
**Next:** `/paul:complete-milestone`
**Resume:** `/paul:resume` y leer este handoff

**Recordatorios de privacidad:** nunca escribir el código ni el nombre reales en el repo, planes, SUMMARY, handoffs ni mensajes de commit; la lista vive en `.private-words` (local). Nunca `git commit -n`. Push con timeout ≥ 5 min.

---

*Handoff created: 2026-10-15*
