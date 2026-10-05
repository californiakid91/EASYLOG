# PAUL Session Handoff

**Session:** 2026-10-05 ~12:10 – 13:45
**Phase:** 5 (Seguridad) COMPLETA → siguiente: Fase 6 (Barrera de tests) del milestone v0.2
**Context:** 2FA de GitHub activado; plan 05-02 (SheetJS vendorizado + CSP + reglas de Firestore versionadas) planificado con revisión adversaria de Fable, aplicado, verificado con datos reales y desplegado; transición de la Fase 5 cerrada.

---

## Session Accomplishments

- **2FA de GitHub ACTIVADO** (TOTP en la app Contraseñas de iOS). Códigos de recuperación guardados y contraseña de GitHub cambiada (antes estaba reutilizada). Capturas con el QR borradas del disco.
- **05-02 en producción** (v2026.10.05-120346; commits 76c76ce, 85a346a, cierre f8e06c6):
  - `vendor/xlsx-0.20.3.full.min.js`: sha384 = el oficial (también en producción). La app ya no pide nada a cdn.sheetjs.com.
  - Meta CSP con hosts concretos y `#csp-watch`: aviso rojo solo cuando se bloquea una web; las extensiones del navegador se ignoran.
  - `firestore.rules` + `firebase.json` = producción (per-uid). `check-firestore-rules.mjs` → IDÉNTICO (solo GET, no imprime el token).
  - `harness-sri.mjs`: 30 checks. `e2e-csp.mjs`: WebKit iPhone 13, en local y en nube, con línea base sin CSP.
- **Checkpoint verificado por Claude** a petición del usuario: producción frente a 5248861 con los datos reales de Firestore (leídos en solo lectura; la copia temporal se borró).
  - Listas, CSV y Excel celda a celda: idénticos.
  - Firestore Listen, securetoken, foto de Google, gapi e iframe: sin violaciones.
- **Review arms:**
  - G6: 0 confirmados; 2 plausibles corregidos.
  - G7 CRG: riesgo 0.40, informativo.
  - G8: 0 vulnerabilidades y 3 notas.
- **harness-seguridad arreglado**: su SHA base desapareció con la purga de historial; ahora usa 6cb4a5a.

---

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| SheetJS vendorizado, nunca cargado al clic | iOS pierde la activación de usuario tras un await de red (Fable B1) | La app ya no es un único fichero (`vendor/`) |
| connect-src con hosts concretos de Google | `*.googleapis.com` permitiría exfiltrar a un proyecto Firebase ajeno (Fable I1) | Si Firebase usara un host nuevo, saldría como aviso rojo |
| La CSP es control de salida, no anti-XSS | `'unsafe-inline'` sigue siendo necesario (53 onclick) | Residuales documentados en 05-02-SUMMARY |
| Las reglas de Firestore del repo son una copia de producción, nunca se despliegan desde aquí | El repo sirve para auditar; producción manda | `firebase deploy` sin --only las desplegaría (avisado en el fichero) |
| Checkpoint lo hace Claude si el usuario lo pide | Comparación con datos reales más fuerte que la prueba manual | Patrón repetido (05-01, 05-02) |

---

## Gap Analysis with Decisions

### Código de piloto y nombre en el repo público
**Status:** PENDIENTE DE DECISIÓN DEL USUARIO (pregunta en STATE.md)
**Notes:** El código de piloto y el nombre están fijos en `index.html` (T/O-LDG y CREWLIST) y aparecen en PROJECT.md, los harness y AUDIT.md. Quitarlos requiere que la app los lea de una configuración y quizá otra purga de historial. Lo señaló G8.
**Effort:** M

### Ticket de GitHub para purgar la caché de commits
**Status:** DEFER (esperando a GitHub)
**Notes:** Abierto el 2026-10-05. Comprobar que los SHA antiguos dan 404 cuando GitHub responda.

### apiTargets de la API key
**Status:** DEFER (opcional)
**Notes:** La restricción por referrer ya está verificada. Limitar los servicios a firestore, identitytoolkit y securetoken se hace en la consola de GCP.

---

## Open Questions

- ¿Sacar del repo público el código de piloto y el nombre? (de una en una; es la siguiente pregunta pendiente)
- Revisar uno a uno los 47 días previos de 2026/27 (otra sesión)
- Límite de la app (MAX) de UK Days → Fase 7 (detalle solo en la memoria local)

---

## Reference Files for Next Session

```
@.paul/STATE.md
@.paul/ROADMAP.md                                   (Fase 6: F-06-001/002/003)
@.paul/phases/05-seguridad/05-02-SUMMARY.md
@.paul/phases/05-seguridad/e2e-csp.mjs              (patrón E2E: HTTPS vía Node + línea base)
@.paul/phases/04-pista-en-uso/e2e-runways.mjs
.paul/phases/*/harness-*.mjs + .paul/phases/01-auditoria/harness/run.mjs   (los 13 harness a unificar)
.aegis/findings/ (local)                            (F-06-001/002/003)
```

---

## Prioritized Next Actions

| Priority | Action | Effort |
|----------|--------|--------|
| 1 | `/paul:plan 6`: runner único (13 harness + 2 E2E), fixtures anonimizadas versionadas, golden de cabeceras del importer, gate en pre-commit/pre-push, sin rutas /home/ricardo, playwright-core propio | M |
| 2 | Pregunta al usuario: código de piloto y nombre fuera del repo público | S |
| 3 | Comprobar el ticket de purga de caché de GitHub cuando responda | XS |

---

## State Summary

**Current:** Fase 5 ✅ (05-01 + 05-02); loop cerrado (PLAN ✓ APPLY ✓ UNIFY ✓); v0.2 al 25 %
**Next:** `/paul:plan 6`
**Resume:** `/paul:resume` y leer este handoff

---

*Handoff created: 2026-10-05*
