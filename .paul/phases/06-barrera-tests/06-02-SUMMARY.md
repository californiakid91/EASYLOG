---
phase: 06-barrera-tests
plan: 02
subsystem: testing
tags: [playwright-core, webkit, e2e, git-hooks, pre-commit, pre-push, clock]

requires:
  - phase: 06-01
    provides: tests/lib.mjs, tests/run-all.mjs, fixture 01 anonimizada
provides:
  - playwright-core 1.63.0 propio (package.json + lock; `npm ci`)
  - tests/e2e/ (e2e-runways hermético 10 checks, e2e-csp con red 24 checks) portables y con reloj fijo
  - gate git: pre-commit = harness; pre-push = harness + e2e (e2e-csp con reintento y escape explícito)
affects: [07 (FIXED_NOW y fixture 01 ligadas a UK_DAYS_START/END), 08, todo push a main]

tech-stack:
  added: [playwright-core 1.63.0 (devDependency, sin descarga de navegadores)]
  patterns:
    - "e2e: servidor serveRepo (puerto 0, ficheros del repo salvo ocultos), loadPlaywright (error claro si falta npm ci o webkit), watchdog propio, logs informativos con '# '"
    - "Reloj fijo (ctx.clock.setFixedTime(FIXED_NOW)) solo donde no carga Firebase; timezoneId Europe/London"
    - "Push = barrera completa (~50 s); escape solo EASYLOG_PUSH_SKIP_NET=1 para e2e-csp, nunca --no-verify"

key-files:
  created: [package.json, package-lock.json, .githooks/pre-push]
  modified: [tests/lib.mjs, tests/run-all.mjs, tests/e2e/e2e-runways.mjs, tests/e2e/e2e-csp.mjs (git mv), .githooks/pre-commit, .gitignore]

key-decisions:
  - "Reloj fijo solo en recorridos sin Firebase (Fable: setFixedTime cuelga Firestore/Auth)"
  - "pre-push: herméticos bloquean; e2e-csp 1 reintento + escape EASYLOG_PUSH_SKIP_NET=1 (flake gen_204 de gapi demostrado)"
  - "pre-commit avisa (no aborta) si tests/ tiene cambios fuera del stage"

duration: ~45 min (APPLY) + planificación con Fable
completed: 2026-10-05T23:30:00+01:00
---

# Fase 6, plan 02: Playwright propio, e2e portables y freno en git — resumen

**Los e2e se ejecutan desde el propio repo (`npm ci` + `node tests/run-all.mjs tests/harness tests/e2e` → 14/14), y git ya no deja commitear ni hacer push (= deploy) si la barrera falla.** De paso apareció y se arregló un fallo que llevaba roto desde 05-02 sin que nadie lo viera: e2e-runways daba 1 FAIL.

## Resultados

| Métrica | Valor |
|--------|-------|
| Tareas | 3/3 automáticas, todas PASS en qualify |
| Barrera | 14/14: 12 harness (~2 s) + e2e-runways (9 s) + e2e-csp (37 s); clon limpio + `npm ci` también 14/14 |
| Commits | 3460168 (plan), 8bf53d7 (T1+T2), f97e526 (T3), 0f817c1 (G6) |

## Criterios de aceptación

| Criterio | Estado | Evidencia |
|-----------|--------|-------|
| AC-1: Playwright propio y fijado | Pass | `require('playwright-core/package.json').version` → 1.63.0; lock versionado; node_modules/ gitignored; sin `manuales-motos` ni `/home/ricardo` en tests/, .githooks/ ni package.json |
| AC-2: e2e portables y deterministas | Pass | 10/10 y 24/24, desde la raíz, desde `/` y en clon limpio. Dentro de la app: `new Date()` = ukNow = 2026-10-05T11:00Z, `londonYesterdayISO` = 2026-10-04, `ukPastDays` = 182, TZ −60 |
| AC-3: e2e de red explícito | Pass | Sin red (`unshare -rn`): «FAIL sin red: e2e-csp necesita Internet (EAI_AGAIN)» en 0,1 s, exit 1. `--skip-net` → «excluido: e2e-csp (red, --skip-net)» |
| AC-4: Gate en git | Pass | Ver tabla de verificación |

## Verificación del gate

| Prueba | Resultado |
|---|---|
| Commit de solo docs, con un fichero sin trackear en tests/ | Pasa (12/12) y avisa `?? tests/zz-untracked.tmp` |
| Mutante TIME_DEPSCH→TIME_DEPSCHED en el stage → commit | Rechazado: 3 harness ✗; APP_VERSION intacta; HEAD sin cambio |
| Mutante solo en el árbol → `git push --dry-run` | «failed to push» (pre-push 10/13) |
| Sin mutante → `git push --dry-run` | 13/13 + e2e-csp 1/1; pasa |
| Sin node_modules → pre-push | «falta playwright-core. Ejecuta «npm ci»», exit 1 |
| Sin red (con loopback) → pre-push | Herméticos 13/13; e2e-csp falla 2 veces; push abortado y explica el escape |
| Sin red + `EASYLOG_PUSH_SKIP_NET=1` | Aviso «push sin e2e-csp…» y exit 0 |

## Qué se ha hecho

- **package.json** privado: `engines` node ≥18, playwright-core 1.63.0 exacto y scripts `test`, `test:e2e` y `test:all`. Los navegadores siguen en ~/.cache/ms-playwright (webkit-2359, el que pide 1.63.0).
- **tests/lib.mjs**:
  - `E2E_DIR`, `TMP` y `NET_TESTS`;
  - `FIXED_NOW` (2026-10-05T12:00+01:00, con el aviso de la Fase 7);
  - `loadPlaywright()`: import dinámico, para que los harness no dependan de node_modules; da un error claro si falta npm ci o webkit;
  - `serveRepo()`: puerto 0, sirve los ficheros del repo salvo los ocultos, protegido contra path traversal;
  - `watchdog()`.
- **tests/run-all.mjs**:
  - `--skip-net`, y en el resumen indica qué se ha excluido;
  - timeout por fichero (60 s en harness, 240 s en e2e) que se marca como ✗ «timeout».
- **tests/e2e/** (con git mv):
  - fixture 01 anonimizada (18/09), con los METAR de IEM en la fecha nueva;
  - calendario OFF del 06/04 al 04/10, salvo el 18/09;
  - `timezoneId` Europe/London;
  - reloj fijo en e2e-runways y en el recorrido local de e2e-csp; el recorrido nube va con reloj real;
  - sonda de red en e2e-csp;
  - logs informativos con «# ».
- **.githooks/pre-commit**: run-all antes de subir APP_VERSION, y aviso si hay cambios en tests/ fuera del stage.
- **.githooks/pre-push** (nuevo):
  - comprueba que npm ci está hecho;
  - lanza los harness y e2e herméticos;
  - lanza e2e-csp con un reintento y el escape explícito.

## Revisiones

- **Fable (adversario, en el PLAN):** aprobado con cambios, todos incorporados antes del APPLY.
  - 2 bloqueantes: setFixedTime cuelga Firebase; e2e-runways ya fallaba.
  - 7 ajustes: política de red en pre-push, avisar en vez de abortar, `--dry-run` sí ejecuta pre-push, SIGTERM, logs con «# », error si falta webkit, tamaño del plan.
- **G6 (/code-review en segundo plano):** 0 confirmados y 1 plausible, corregido en 0f817c1.
  - El hallazgo: el SIGTERM del timeout lo captura Playwright, así que un e2e colgado fuera del navegador no moría.
  - Se añadió `watchdog()`, probado con un e2e colgado: ✗ a los 5 s, sin WebKit huérfano.
  - Extra barato: serveRepo ya no sirve `.git/…` (404).
  - Sin hallazgos en: path traversal, falsos verdes, argumentos y códigos de salida de los hooks.
- **G7 (CRG, diff de fase 3c93a22..HEAD):** 40 ficheros, riesgo 0,40, 0 flujos afectados. Las «test gaps» son del propio código de tests, e index.html no cambió → informativo.
- **G8 (security-review de la fase):** 0 reales y 2 informativos.
  - gitleaks: sin fugas. Fixtures sin restos reales: solo TSTCAP/VEGRIC, FR9134/FR9135 y 9HZZA.
  - Nombre y código del usuario en golden y harness: ya públicos, a propósito (es la pregunta pendiente).
  - Lockfile con integrity y sin postinstall. Hooks sin inyección.
  - BAJA: serveRepo podía servir los Excel Tax Year sin trackear de la carpeta, en localhost y con puerto efímero. **Corregido en el commit de fase:** ahora solo sirve ficheros versionados (`git ls-files`). Excel → 404, node_modules → 404, vendor → 200; 14/14.

## Desviaciones

| # | Desviación | Motivo | Impacto |
|---|-----------|--------|---------|
| 1 | El grep de rutas encuentra un comentario histórico `01-auditoria` en tests/harness/harness-csv.mjs:18 | Es texto, no una dependencia; harness/ era DO NOT CHANGE | Ninguno |
| 2 | La primera prueba sin red con `unshare -rn` falló también en los herméticos | El namespace sin red apaga el loopback; se repitió con `ip link set lo up` | Ninguno: solo afecta al método de prueba |
| 3 | Una línea de relleno `<!-- -->` en STATE.md entró en f97e526 (prueba del commit) | Commit de prueba del hook | Se quitó en 0f817c1 |
| 4 | `watchdog()` y el filtro de ficheros ocultos de serveRepo no estaban en el plan | Corrección de G6 | Mejora; sin cambios de alcance |

## Pendiente (no bloquea)

- **Pregunta al usuario:** ¿tolerar el beacon `connect-src https://apis.google.com/js/gen_204` en el check «B: 0 violaciones de CSP»? Es intermitente; mientras tanto lo amortigua el reintento del pre-push.
- **Fase 7:** cuando el año fiscal sea dinámico hay que mover `FIXED_NOW`, la fixture 01 y el calendario sembrado de e2e-csp.
- **D6:** los helpers duplicados entre harness siguen aplazados.

---
*Fase: 06-barrera-tests, plan: 02 · Completado: 2026-10-05*
