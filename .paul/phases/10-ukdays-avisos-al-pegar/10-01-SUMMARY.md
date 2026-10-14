---
phase: 10-ukdays-avisos-al-pegar
plan: 01
subsystem: ui
tags: [ukdays, confirm, sync, csp]
requires:
  - phase: 07.1-ukdays-fuera
    provides: lista «Fuera de UK», ukForceUKFromOut, motivos manuales en el backup
  - phase: 08-sin-perdidas
    provides: requireHydrated, patrón de relectura tras confirm
provides:
  - aviso + confirm al pegar/re-pegar un email que contradice una marca manual de UK Days
  - «⚠ el email dice …» persistente en la lista del mes y en «Fuera de UK»
  - motivos de decisiones manuales sin instrucciones (ukReasonText)
affects: [11-limpieza-xs]
key-files:
  created: [tests/harness/harness-ukavisos.mjs]
  modified: [index.html, tests/lib.mjs, tests/harness/harness-duplicados.mjs, tests/harness/harness-ukdays-rules.mjs, tests/harness/harness-ukdays.mjs, tests/harness/harness-sri.mjs]
key-decisions:
  - "Marca manual contradicha por el email → confirm (Aceptar = email, Cancelar = marca); nunca se cambia sola"
  - "Re-pegar un día idéntico también pregunta (M4 de Fable rechazado: re-pegar es como el usuario comprueba un día)"
  - "Píxel img-src www.google.com (telemetría del login de Google) se sigue bloqueando pero solo va a consola"
duration: ~2h
completed: 2026-10-14T17:55:00+01:00
---

# Fase 10 Plan 01: UK Days — avisos al pegar

**Al pegar o re-pegar el email de un día con marca manual que lo contradice, la app pregunta qué usar; la lista marca en ámbar «⚠ el email dice …»; los motivos de decisiones a mano describen la causa («DUTY sin email»).**

## Acceptance Criteria Results

| Criterio | Estado | Evidencia |
|----------|--------|-----------|
| AC-1: contradicción al pegar día nuevo / datos distintos | Pass | harness-ukavisos; captura del usuario (confirm del 13/10/26) |
| AC-2: contradicción al re-pegar el email idéntico | Pass | harness-ukavisos; captura: re-pegar 13/10 → confirm → «sin cambios. UK Day: se usa el email (No UK)» |
| AC-3: seguridad del confirm (hidratación, otro dispositivo, año cerrado, excepcional, revertir si falla el guardado) | Pass | harness-ukavisos (incl. relectura tras confirm de año cerrado, hallazgo G6) |
| AC-4: aviso persistente en la lista | Pass | captura: 13/10/26 forzado a UK → «⚠ el email dice No UK» en la lista del mes |
| AC-5: motivos sin instrucciones | Pass | harness-ukavisos (ukReasonText sobre los 3 textos viejos + ukDecidePending) |

## Verificación

- `node tests/run-all.mjs tests/harness tests/e2e`: 19/19 harness + 4/4 e2e (e2e-csp falló una vez por el beacon gen_204 y pasó en el reintento, como siempre).
- Producción: 8e4965c → 2026.10.14-150501; 8e126a8 → 2026.10.14-164017; a108274 → 2026.10.14-165223 (curl).
- Checkpoint humano en iPhone: aviso ámbar, confirm y vuelta a R3 al aceptar → aprobado por capturas.

## Commits

| Commit | Qué |
|--------|-----|
| 8e4965c | feat(10-01): aviso al pegar email que contradice marca manual + harness-ukavisos (33 checks) |
| 8e126a8 | fix(10-01): píxel de Google img-src www.google.com solo a consola (+2 checks en harness-sri) |
| a108274 | fix(10-01): «⚠ el email dice …» en línea propia con letra normal (en móvil se partía palabra a palabra) |

## Review arms

- **G6 (Fable, background):** 1 CONFIRMED — faltaba relectura (requireHydrated + changedMeanwhile) tras el confirm de año cerrado → arreglado con test. Menor: doble ukEmailSays por fila → saysTag. Resto REFUTED (XSS: todo pasa por esc(); prevUK; regex anclados; tests modificados siguen probando lo mismo).
- **G7 (CRG):** riesgo 0.00 en los commits (no informativo con JS embebido en index.html).
- **G8 (/security-review, sonnet) + semgrep:** sin vulnerabilidades (semgrep 0 reglas). XSS limpio (ukSaysTag solo cadenas fijas; motivos con esc()); filtro QUIET de #csp-watch no abusable (host exacto vía new URL, solo img-src, sigue en consola); sin camino de pérdida de datos (relecturas tras confirm, prevUK). INFO: código de piloto en fixtures — ya preexistente, cubierto por la pregunta pendiente de sacarlo del repo.

## Deviations

| Tipo | Detalle |
|------|---------|
| Scope addition (checkpoint) | Aviso rojo «Bloqueado por seguridad (img-src): www.google.com» visto por el usuario: telemetría del login de Google. Se mantiene bloqueado (CSP intacta) y solo va a consola; host exacto y solo img-src (otras directivas/hosts siguen avisando, con test) |
| Auto-fix (checkpoint) | Etiqueta ámbar heredaba la fuente monoespaciada de la ruta y se partía palabra a palabra en el iPhone → display:block + system-ui |
| Tests antiguos ajustados | 5 checks de duplicados / ukdays-rules / ukdays: el stub de confirm acepta función; mantienen su intención (respetar la marca manual cuando el usuario cancela) |
| Nota | El 03/10/2026 ya no tenía marca manual al verificar (R3 del email): el caso se probó forzando el 13/10 a UK y re-pegando |

## Next Phase

Fase 11 «Limpieza XS (diferidos G6/G8)»: data-iso + addEventListener, epoch de `_cloudWrites`, validación de forma en applyCloudData (incl. role), mailto largo, «dar por perdida» la copia local dañada. Con ella se cierra el milestone v0.3.

---
*Phase: 10-ukdays-avisos-al-pegar, Plan: 01 · Completed: 2026-10-14*
