---
phase: 11-limpieza-xs
plan: 01
subsystem: ui
tags: [csp, csp-watch, onclick, data-act, event-delegation, mailto, clipboard]

requires:
  - phase: 05-seguridad
    provides: meta CSP + #csp-watch, ISO_RE/IATA_RE, esc()
  - phase: 10-ukdays-avisos-al-pegar
    provides: QUIET img-src www.google.com
provides:
  - "#csp-watch QUIET por directiva + host + ruta exacta (connect-src apis.google.com/js/gen_204)"
  - "e2e-csp tolera solo el beacon gen_204 (connect-src / «Refused to connect»)"
  - "DATA_ACTS: listener delegado con tabla cerrada; 0 onclick con datos interpolados"
  - "Backup de UK Days: mailto idéntico + texto completo al portapapeles"
affects: [11-02, fase datos personales (pilotCode)]

key-files:
  modified: [index.html, tests/e2e/e2e-csp.mjs, tests/e2e/e2e-uklimit.mjs, tests/harness/harness-sri.mjs, tests/harness/harness-seguridad.mjs, tests/harness/harness-ukfuera.mjs, tests/harness/harness-anio-fiscal.mjs, tests/harness/harness-ukdays.mjs, tests/harness/harness-ukdays-rules.mjs]

key-decisions:
  - "gen_204: silenciar solo connect-src + host apis.google.com + pathname /js/gen_204; origen solo → se muestra; CSP intacta"
  - "Botones con datos: data-act/data-arg + DATA_ACTS (funciones referenciadas, nunca window[act]); argumentos validados"
  - "Backup: sin umbral ni .txt (Fable F6); siempre portapapeles, mailto sin cambios"

patterns-established:
  - "Botón nuevo con un dato → data-act + data-arg (+ data-arg2) y entrada en DATA_ACTS con su validador; nunca onclick con ${}"
  - "Tests localizan esos botones por [data-act][data-arg], no por onclick"

duration: ~2h
completed: 2026-10-14
---

# Fase 11 Plan 01: Limpieza XS «pantalla» — Summary

**El aviso de telemetría de gapi deja de salir en rojo (solo consola, ruta exacta) sin tocar la CSP; los 17 botones con un dato pasan a data-act con un listener delegado que valida el argumento; el backup de UK Days copia el texto completo al portapapeles.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~2 h (plan + revisión Fable + apply + comprobación en prod) |
| Completed | 2026-10-14 |
| Tasks | 3 auto + 1 checkpoint |
| Files modified | 10 (index.html + 9 tests) |
| Commit | `46ec3a4` — prod `2026.10.14-200023` |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: gen_204 silenciado con coincidencia exacta | Pass | harness-sri: con/sin query → consola; otra ruta, solo origen, otra directiva, otro host → pantalla; img-src www.google.com igual |
| AC-2: e2e-csp tolera solo ese beacon | Pass | `isGapiBeacon`: window.__csp exige `connect-src `, consola exige «Refused to connect to»; imprime `# tolerado:`. El beacon no apareció en las ejecuciones de hoy (intermitente) → filtro probado solo por regex |
| AC-3: sin datos interpolados en onclick | Pass | `grep -nE 'onclick="[^"]*\$\{' index.html` = 0; harness-seguridad (c3): payload `x');alert(1);//`, acción desconocida y arg2 raro no llaman; preventDefault en <a> |
| AC-4: backup con copia en el portapapeles | Pass | harness-ukfuera: copia = cuerpo, mailto idéntico con/sin portapapeles, rechazo y throw no rompen; en prod: copia 1 vez, 530 = 530 chars, termina en «Computables» |
| AC-5: sin regresiones | Pass | `node tests/run-all.mjs tests/harness tests/e2e` 23/23; pre-push 19/19 + 22/22 + e2e-csp |

## Accomplishments

- Falsa alarma roja de gapi eliminada sin abrir ningún host en la CSP.
- Ningún botón ejecuta código construido con datos: tabla cerrada `DATA_ACTS` con validador por acción (ISO, mes, año fiscal, IATA, índice, uk|no).
- El registro HMRC (backup) ya no depende de que el cliente de correo acepte un texto largo.

## Checkpoint (human-verify)

El usuario pidió que lo comprobara Claude («Compruébalo tú. Si algo no puedes dímelo»). Script de comprobación (scratchpad, no versionado) contra **producción** con WebKit + perfil iPhone 13 — 25/25 PASS:
- Nube sin sesión ×3 (login + popup de Google): sin «Bloqueado», sin errores; versión en prod correcta.
- Local con la fixture 01 + calendario con hueco 01–03/10: día pendiente abre el día sin saltar; OFF marca el hueco; Exc abre el motivo; mes pliega/despliega; ✕ de UK Day y de Días guardados preguntan y al cancelar no cambian nada; 🛬 abre pistas; ⬇ CSV del mes descarga; backup: mailto y portapapeles con el texto completo y aviso «copiado también».
- **No comprobado (dicho al usuario):** el beacon gen_204 real (no apareció en 3 cargas); Safari/Mail/login reales del iPhone; botón «UK» de «Fuera de UK» (no visible con esos datos; cubierto por harness + mismo mecanismo). El usuario aprobó con «Si».

## Review arms

- **G6 (Fable, background):** sin hallazgos bloqueantes. 2 menores: (1) filtro de consola del e2e sin mirar directiva → **arreglado** (exige «Refused to connect to»); (2) el showStatus del backup pisa el estado anterior → comportamiento habitual de la app, aceptado.
- **Hook de commit:** CRG risk 0.40 (no informativo con JS embebido); semgrep 4 avisos `unknown-value-with-script-tag` en harness-sri (lee index.html como texto) = falsos positivos.
- G7/G8 de fase: al cerrar la Fase 11 (tras 11-02).

## Deviations from Plan

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 2 | Tests que localizaban por onclick viejo fuera de la lista del plan (harness-anio-fiscal, harness-ukdays, harness-ukdays-rules, harness-ukfuera) migrados a data-act; ONCLICK_LITERAL acepta `editUKLimit();return false;` estático |
| Scope additions | 0 | — |
| Deferred | 1 | Ver abajo |

- Plan decía `files_modified` sin harness-anio-fiscal/ukdays/ukdays-rules: solo cambian selectores, sin lógica.
- Checkpoint hecho por Claude en vez de en el iPhone, a petición del usuario.

### Deferred Items
- Vigilar en uso real: si aparece «Bloqueado por seguridad (connect-src): apis.google.com» en el iPhone (Safari daría solo el origen) o el correo del backup llega cortado → avisar. No se amplía QUIET a origen-solo.

## Next Phase Readiness

**Ready:** plan 11-02 (datos/sync): epoch de sesión para `_cloudWrites`, validación de forma en applyCloudData (incl. role ∈ {FO,CPT,SP}), «dar por perdida» la copia local dañada.

**Concerns:** ninguno nuevo.

**Blockers:** None

---
*Phase: 11-limpieza-xs, Plan: 01 · Completed: 2026-10-14*
