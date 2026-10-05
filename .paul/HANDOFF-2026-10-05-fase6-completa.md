# Handoff de sesión PAUL

**Sesión:** 2026-10-05, de ~22:55 a ~23:45
**Fase:** 6 (Barrera de tests) COMPLETA. Siguiente: Fase 7 (UK Days: año fiscal dinámico + límite configurable).
**Contexto:** Se planificó el 06-02, Fable lo revisó en modo adversario, se aplicó y se cerró. Después vino la transición de la Fase 6 con G7 y G8. Todo está commiteado en local, sin push.

---

## Qué se hizo en la sesión

- **Plan 06-02, revisado por Fable:** lo aprobó con cambios. Dio 2 bloqueantes, los dos con pruebas:
  - `clock.setFixedTime` cuelga la sonda de Firebase. Por eso el reloj fijo solo se usa en los recorridos sin Firebase.
  - **e2e-runways llevaba roto desde 05-02 (1 FAIL)**: su servidor devolvía index.html cuando se pedía `vendor/xlsx…js`. Lo reproduje y lo arregla el servidor común.
- **APPLY:**
  - **Commits:** 3460168 (plan), 8bf53d7 (T1+T2), f97e526 (T3), 0f817c1 (G6).
  - **Playwright propio:** `package.json` y lock con playwright-core 1.63.0. Se instala con `npm ci`; node_modules/ queda gitignored.
  - **tests/e2e/** (con git mv). Usan de `tests/lib.mjs`:
    - serveRepo (puerto 0; solo ficheros versionados y no ocultos);
    - loadPlaywright;
    - watchdog;
    - FIXED_NOW (05/10/2026 12:00 BST);
    - además, la fixture 01 anonimizada y timezoneId Europe/London.
  - **run-all:** opción `--skip-net` y timeouts (60 s en harness, 240 s en e2e).
  - **Barrera:** `node tests/run-all.mjs tests/harness tests/e2e` da **14/14**, también en un clon limpio.
  - **Hooks:**
    - **pre-commit:** ejecuta los harness antes de subir APP_VERSION. Si falla, aborta. Si hay cambios en tests/ fuera del stage, avisa sin abortar.
    - **pre-push:** comprueba que se ha hecho `npm ci`, ejecuta harness y e2e herméticos (bloquean) y luego e2e-csp con 1 reintento. Si e2e-csp sigue fallando, el push se aborta, salvo con `EASYLOG_PUSH_SKIP_NET=1 git push`.
- **Verificado:**
  - Con un mutante, el commit se rechaza y APP_VERSION no cambia.
  - `git push --dry-run` con el mutante se rechaza; sin él, pasa (~50 s).
  - Sin `npm ci`, el push se rechaza.
  - Sin red, el push se bloquea; con el escape, pasa con un aviso.
- **G6:** 0 confirmados y 1 plausible: Playwright captura el SIGTERM del timeout. Se corrigió con `watchdog`.
- **Transición:**
  - **G7 CRG:** informativo (riesgo 0,40; 0 flujos afectados; index.html sin cambios).
  - **G8:** 0 reales. Encontró que serveRepo podía servir los Excel Tax Year locales sin trackear; se corrigió para servir solo lo que devuelve `git ls-files`.
  - **Commit de fase:** 3ac7c64.

---

## Decisiones

| Decisión | Motivo | Impacto |
|----------|-----------|--------|
| El reloj fijo solo se usa sin Firebase | Firestore y Auth se cuelgan con Date fijo (Fable) | El recorrido nube de e2e-csp va con la hora real |
| pre-push: los herméticos bloquean; e2e-csp tiene 1 reintento y el escape `EASYLOG_PUSH_SKIP_NET=1` | Push = deploy. Hay un flake demostrado (beacon gen_204 de gapi), y un arreglo urgente no puede esperar a que Google se recupere | Nunca `--no-verify` |
| pre-commit en todos los commits; avisa (no aborta) si tests/ tiene cambios fuera del stage | Tarda 1,8 s; abortar rompería commits de docs en mitad de un APPLY | — |
| serveRepo solo sirve ficheros versionados | En la carpeta hay Excel fiscales sin trackear (G8) | Si un e2e necesita un fichero nuevo, hay que versionarlo |

---

## Preguntas abiertas (al usuario, de UNA en UNA)

1. **¿Push de la Fase 6?** Hay 14 commits locales que solo tocan tests/, docs, package.json y hooks. No cambian la app desplegada. El push ya pasa por el gate (~50 s). Desde Bash de Claude, usar timeout ≥ 5 min.
2. ¿Tolerar en e2e-csp el beacon `connect-src https://apis.google.com/js/gen_204`? Es telemetría intermitente; hoy lo amortigua el reintento.
3. ¿Sacar del repo público el código y el nombre del piloto? (pendiente desde la Fase 5)
4. Revisar uno a uno los 47 días previos de 2026/27 (otra sesión).

---

## Para la Fase 7

- **Sin red de seguridad hasta ahora:** el año fiscal está fijo (`UK_DAYS_START/END` = 2026-04-06/2027-04-05 en index.html:1880). Hay que cambiarlo **antes del 06/04/2027**.
- **Hay que mover a la vez:** `FIXED_NOW` (tests/lib.mjs), la fixture 01 (18/09/2026, en múltiplos de 7 días y en BST) y el calendario sembrado de e2e-csp (06/04 a 04/10).
- **Límite configurable:** el valor está pendiente de la confirmación fiscal del usuario. El criterio está solo en la memoria local, nunca en el repo.

```
@.paul/STATE.md
@.paul/ROADMAP.md                                   (Fase 7: focus F-03-001, límite, máximo posible, F-03-006)
@.paul/phases/06-barrera-tests/06-02-SUMMARY.md
@tests/lib.mjs                                      (FIXED_NOW, readFixture)
@tests/e2e/e2e-csp.mjs                              (calendario sembrado)
```

---

## Siguientes pasos por prioridad

| Prioridad | Acción | Esfuerzo |
|----------|--------|--------|
| 1 | Preguntar por el push de la Fase 6 (y hacerlo si dice que sí) | XS |
| 2 | `/paul:plan 7` (año fiscal dinámico + límite configurable). Probablemente con dialéctica Fable, porque el diseño es abierto: selector o fecha, y la forma de configurar el límite | M |

---

## Estado

**Actual:** Fase 6 ✅ (06-01 y 06-02 cerrados). v0.2 al 50 %. Loop en IDLE.
**Siguiente:** decidir el push, después `/paul:plan 7`.
**Para retomar:** `/paul:resume` y leer este handoff.

---

*Handoff creado: 2026-10-05 23:45*
