---
phase: 05-seguridad
plan: 02
subsystem: security
tags: [csp, sri, sheetjs, firestore-rules, firebase-auth, webkit-e2e]

requires:
  - phase: 05-01
    provides: datos externos validados antes de interpolar (permite CSP con 'unsafe-inline' sin sinks abiertos)
provides:
  - SheetJS vendorizado (mismo origen, sha384 fijado) — cdn.sheetjs.com fuera del conjunto de confianza
  - meta CSP de control de salida con hosts concretos + aviso visible de bloqueos
  - firestore.rules + firebase.json versionados = producción, con comprobador de solo lectura
affects: [06-barrera-tests, 08-sin-perdidas]

tech-stack:
  added: [vendor/xlsx-0.20.3.full.min.js (SheetJS 0.20.3, Apache-2.0)]
  patterns: [meta CSP + script #csp-watch con cola → showStatus; e2e con HTTPS vía Node (WebKit Linux sin TLS)]

key-files:
  created: [firestore.rules, firebase.json, vendor/xlsx-0.20.3.full.min.js, .paul/phases/05-seguridad/check-firestore-rules.mjs, .paul/phases/05-seguridad/harness-sri.mjs, .paul/phases/05-seguridad/e2e-csp.mjs, .paul/phases/05-seguridad/05-02-FABLE-REVIEW.md]
  modified: [index.html, .paul/phases/05-seguridad/harness-seguridad.mjs]

key-decisions:
  - "SheetJS vendorizado en vez de carga al clic: el await rompería la activación de usuario de la descarga en iOS (Fable B1)"
  - "connect-src con hosts concretos de Google (no *.googleapis.com) — evita exfiltrar a un proyecto Firebase ajeno"
  - "Aviso en pantalla solo para webs bloqueadas (http/https/wss); inline/eval/data/blob y extensiones a consola (G6)"
  - "gstatic (Firebase 10.13.2 fijado) aceptado como origen de confianza; import() no admite SRI"

patterns-established:
  - "Script inline del <head> con id (no '<script>\\n'): los harness localizan el script principal con /<script>\\n…<\\/script>\\s*<\\/body>/"
  - "E2E con línea base: mismo recorrido sin la meta CSP → resultados y pageerrors deben coincidir"
  - "Sondas sin sesión (getDoc/onSnapshot/signInAnonymously/securetoken) prueban que la CSP deja pasar los hosts de la sesión: el servidor rechaza, no la CSP"

duration: ~75min
started: 2026-10-05T11:20:00Z
completed: 2026-10-05T12:35:00Z
---

# Phase 5 Plan 02: SheetJS vendorizado + CSP + reglas de Firestore versionadas

**SheetJS servido desde el propio repo con hash fijado, meta CSP con hosts concretos y aviso visible de bloqueos, y reglas de Firestore de producción versionadas con un comprobador de solo lectura. En producción v2026.10.05-120346, sin ningún cambio de resultado con los datos reales.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~75 min (plan + Fable + apply + checkpoint) |
| Tasks | 4/4 (3 auto + checkpoint) |
| Files | 7 creados, 2 modificados |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: SheetJS de mismo origen e íntegro | Pass | 0 peticiones a cdn.sheetjs.com. sha384 del fichero vendorizado = oficial, también en producción (curl). downloadTaxExcel sigue síncrona; harness-excel-u verde sin tocarlo. |
| AC-2: CSP con hosts concretos sin romper nada | Pass | e2e-csp A (local) y B (nube): 0 violaciones, pageerrors = línea base, CSV y Excel idénticos con y sin CSP. La prueba negativa (fetch a example.com) queda bloqueada. |
| AC-3: aviso visible sin falsos positivos | Pass | harness-sri (d)+(e): cola antes del arranque, deduplicación por host, extensiones ignoradas, inline/eval/data/blob solo a consola. En E2E el aviso aparece en la negativa. |
| AC-4: reglas versionadas = producción, sin credenciales | Pass | check-firestore-rules → IDÉNTICO (exit 0). Copia alterada → exit 1 con diff. La salida no contiene ya29./1//. |
| AC-5: nada se rompe en el móvil real | Pass (verificado por Claude a petición del usuario) | Ver «Checkpoint». |

## Checkpoint (Task 4) — verificado por Claude

El usuario pidió «compruébalo tú». Se compararon en WebKit iPhone 13 la producción (v2026.10.05-120346, con CSP) y la versión anterior (5248861), con los datos reales de Firestore leídos en solo lectura. La copia de los datos estaba en el scratchpad y se borró después.
- Historial, contador y lista de UK Days, calendario, aeropuertos y CSV: **idénticos**.
- Excel TAX YEAR 26-27.xlsx: hoja **idéntica celda a celda** (sheet1.xml).
- Conexiones de una sesión iniciada, desde el origen de producción, sin violaciones:
  - Firestore Listen (onSnapshot) → permission-denied de las reglas.
  - securetoken → 400 INVALID_REFRESH_TOKEN.
  - Foto de googleusercontent cargada.
  - gapi + iframe de auth.
- No probado: el toque físico de la descarga en la PWA instalada. Riesgo nulo, porque downloadTaxExcel no cambia y sigue siendo síncrona.

## Accomplishments

- cdn.sheetjs.com sale del conjunto de confianza. El Excel funciona sin conexión y el arranque ya no depende de ese CDN.
- Primera CSP de la app: limita a dónde puede enviar datos un payload genérico, y el usuario ve cualquier bloqueo.
- Las reglas de Firestore (el único control de acceso real) son auditables desde el repo y comprobables contra producción en un comando.
- Confirmado de paso: sin sesión, Firestore niega la lectura, y el login anónimo está deshabilitado (admin-restricted-operation).

## Task Commits

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Plan | `00bf5ac` | docs | Plan + revisión Fable |
| Tasks 1-3 | `76c76ce` | feat | Reglas + comprobador, SheetJS vendorizado, CSP + #csp-watch, harness-sri, e2e-csp |
| G6 | `85a346a` | fix | Aviso solo para webs bloqueadas; test real del vaciado de la cola |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `index.html` | Modified | meta CSP + #csp-watch, SheetJS desde vendor/ con defer, enganche __cspShow → showStatus |
| `vendor/xlsx-0.20.3.full.min.js` | Created | SheetJS 0.20.3 byte a byte del oficial |
| `firestore.rules` | Created | Copia de las reglas de producción (per-uid) |
| `firebase.json` | Created | Apunta a firestore.rules (sin hosting) |
| `.paul/phases/05-seguridad/check-firestore-rules.mjs` | Created | Repo vs producción por REST, solo GET, sin imprimir el token |
| `.paul/phases/05-seguridad/harness-sri.mjs` | Created | 30 checks: hash, etiqueta, política exacta, listener, cola |
| `.paul/phases/05-seguridad/e2e-csp.mjs` | Created | WebKit iPhone 13: local + nube + sondas, con línea base sin CSP |
| `.paul/phases/05-seguridad/harness-seguridad.mjs` | Modified | SHA base 33ae9b9 → 6cb4a5a (la purga de historial lo había invalidado) |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Vendorizar SheetJS (no cargarlo al clic) | La activación de usuario de iOS se pierde tras un await de red (Fable B1) | La app ya no es un único fichero; +930 KB en el repo |
| Hosts concretos en connect-src | `*.googleapis.com` permitiría exfiltrar a un proyecto Firebase ajeno (Fable I1) | Un host nuevo de Firebase saldría como aviso rojo, visible y sin perder datos |
| Aviso solo para http/https/wss | Las extensiones generan inline/eval/blob sin sourceFile (G6) | Menos ruido; los bloqueos de red, que son los relevantes, se siguen viendo |
| gstatic como origen de confianza | import() no admite SRI; los import maps con integrity no son fiables en iOS | Riesgo residual aceptado (Google, versión fijada) |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 3 | Necesarios, sin ampliar alcance |
| Scope additions | 1 | Sondas sin sesión en el E2E (mejoran la cobertura) |
| Deferred | 1 | Opcional (apiTargets) |

### Auto-fixed Issues

1. **Tests: harness-seguridad roto por la purga de historial.** Su BASE_SHA 33ae9b9 ya no existía. Se cambió a 6cb4a5a (mismo index.html previo a 05-01). Verificado: TODO OK.
2. **Tests: WebKit de Playwright en Linux sin TLS.** Ningún https:// cargaba, ni en la línea base ni con CSP. Ahora Node descarga los https:// (`ctx.route` + `route.fetch`) y se los entrega al navegador; la CSP se sigue aplicando antes de la petición. Verificado: recorrido B en PASS.
3. **G6 (2 plausibles):**
   - Aviso falso por extensiones (inline/eval sin sourceFile, `safari-extension:`).
   - El vaciado de la cola solo se comprobaba con regex.
   Ambos corregidos en 85a346a; harness-sri pasa a 30 checks.

### Desviación de proceso

- **El plan pedía probar los flujos de nube con login real en un navegador ANTES del push.** No se hizo, porque requería la sesión de Google del usuario. Se sustituyó por:
  - sondas sin sesión en el E2E;
  - la verificación posterior en producción con datos reales y las mismas sondas desde el origen de producción.

  Riesgo residual mínimo: los mismos hosts, y un fallo saldría como aviso visible sin escribir en la nube (guard de hidratación).

### Deferred Items

- Reducir los apiTargets de la API key del navegador (hoy son la lista amplia por defecto). Opcional, desde la consola de GCP.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| La CLI firebase 15.18 no tiene `firestore:rules:get` | REST de firebaserules (solo GET) con el access token de firebase-tools |
| El regex de los harness habría capturado un `<script>` del head | El script del head lleva `id="csp-watch"`, así que no casa con `<script>\n` (check en harness-sri b) |

## Review arms

- **G6 /code-review** (background, sonnet): 0 confirmados, 2 plausibles. Los dos corregidos.
- **G7 CRG:** se ejecutó en el commit 76c76ce (riesgo 0.40, 29 test gaps en funciones de los scripts de test). No es informativo para el JS embebido en index.html.
- **G7 CRG (fase completa, 31a37b7..HEAD):** riesgo 0.40, informativo (gaps = funciones de los scripts de test).
- **G8 /security-review (fase completa):** 0 vulnerabilidades reales. Notas: (1) 'unsafe-inline' + apis.google.com en script-src → la CSP no frena ejecución (ya documentado); (2) rutas /home/ricardo en los .mjs (portabilidad → Fase 6); (3) preexistente: código de piloto y nombre en el repo público (index.html los usa para T/O-LDG y CREWLIST; PROJECT.md, harness, AUDIT) → pregunta al usuario.
- **semgrep:** 4 avisos `unknown-value-with-script-tag` en harness-sri.mjs. Falsos positivos: el script de test lee index.html del disco y no pinta nada.

## Next Phase Readiness

**Ready:**
- Fase 5 completa (05-01 + 05-02). Hallazgos de Aegis cerrados: F-04-001, F-04-002, F-04-003 y F-04-004 (mínimo, en 05-01).
- La Fase 6 (barrera de tests) puede reunir los 13 harness + 2 E2E en un runner único. El patrón de HTTPS vía Node y de línea base ya existe.

**Concerns:**
- Los E2E dependen de playwright-core en ~/manuales-motos y de un fixture con datos reales gitignored. La Fase 6 debe resolverlo con fixtures anonimizadas.
- `'unsafe-inline'` sigue siendo necesario (53 onclick). La CSP no frena la ejecución de un XSS, solo la salida de datos.

**Blockers:** None

---
*Phase: 05-seguridad, Plan: 02*
*Completed: 2026-10-05*
