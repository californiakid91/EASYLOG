# Handoff de sesión PAUL

**Sesión:** del 06/10/2026 (~09:15) al 07/10/2026
**Fase:** 7 (UK Days: año y límite), 1 de 2 planes. El 07-01 está cerrado.
**Contexto:** se subió a GitHub la Fase 6. Se diseñó el año fiscal dinámico con una dialéctica Fable y luego se planificó, se aplicó, pasó la revisión G6, se desplegó, se verificó y se cerró (UNIFY).

---

## Lo que se hizo

- **Peticiones sueltas del usuario:**
  - Se explicó la sección «Días en Excel sin historial»: son días que siguen en el Excel Tax Year pero que ya no están en la lista del CSV. Su ✕ borra el día del Excel.
  - Se convirtió el Excel Tax Year 26-27 a PDF para el iPhone, con SheetJS vendorizado y Chromium de Playwright. El PDF quedó en el scratchpad y no se guardó en el repo. Las filas TOTAL del Excel original vienen vacías: no tienen valores ni fórmulas.
- **Push de la Fase 6** (`3c93a22..193e7ce`), con el gate pre-push en verde.
- **Dialéctica Fable para la Fase 7.** Decisión: **el año se deriva de la fecha y no se guarda ningún estado**, y la congelación también se deriva de la fecha. Se mantiene el reparto 07-01/07-02.
- **Plan 07-01**, revisado por Fable en modo adversario: APROBADO CON CAMBIOS, con 3 bloqueantes ya incorporados:
  - B1: el backfill es de solo lectura en años congelados, y cancelar no guarda nada.
  - B2: harness-ukdays-rules.
  - B3: preload fake-now.
- **APPLY 07-01:** el commit `86cd30f` y el fix G6 `dadd17e` están en producción, **v2026.10.06-170132**.
  - **Modelo de año fiscal:** `taxYearOf`, `viewTY` y `_tyViewLabel` (solo en memoria). Además `UK_DAYS_FLOOR = '2026-04-06'`, `ukYearFrozen` (fin del año + 30 días) y `ukInScope`.
  - **Interfaz:**
    - un selector ‹ año › en la fila de botones de UK Days;
    - un banner «Cierra AAAA-AA» del 06/04 al 05/05;
    - el Excel, el backup y el comando de texto usan el año visible (el comando admite un año explícito).
  - **Años congelados:** el backfill no los modifica. Pegar o añadir un día ahí pide confirmación y la entrada queda como manual; cancelar no guarda nada.
  - **Tests:**
    - `harness-anio-fiscal.mjs`, nuevo, con 46 checks;
    - el reloj fijo (`FIXED_NOW`) en todos los harness;
    - `node tests/run-all.mjs --now=<ISO>`, que usa el preload `tests/fake-now.mjs`;
    - `BASE_TY`/`seedCalendar` en lib.mjs.
  - **Resultado de los tests:** la barrera da 15/15; los harness dan 13/13 con el reloj real y simulando 2027-06-01 y 2028-01-01.
- **G6:** 1 fallo confirmado y arreglado. El botón OFF identificaba el hueco por su índice y, al cruzar el 06/04, marcaba días del año nuevo. Además, 11 sospechas descartadas tras ejecutarlas.
- **Checkpoint, verificado por Claude** a petición del usuario:
  - producción es idéntica al código local, byte a byte;
  - la versión vieja y la nueva dan resultados idénticos con el mismo dataset (UK Days, «No UK», pendientes y las 469 filas del Excel);
  - en WebKit a 390 px todo funciona.
  - Los datos reales del usuario no se pudieron ver, porque están tras su login de Google.
- **UNIFY:** `07-01-SUMMARY.md` creado, y STATE, ROADMAP, PROJECT y paul.json actualizados (commit `d1ff4e7`, local y sin subir; solo toca .paul/).

---

## Decisiones

| Decisión | Motivo | Impacto |
|----------|-----------|--------|
| El año fiscal se deriva de la fecha y no se guarda estado | Un flag «closed» en Firestore añadiría carreras de sincronización y una migración (dialéctica) | 07-02 usa como clave `taxYearOf().label` |
| FLOOR = 06/04/2026 | 2025/26 y los años anteriores se declararon fuera de la app; no se fabrica evidencia para ellos | Reconstruir años anteriores pedirá un plan propio que baje el FLOOR |
| Un año se congela 30 días después de terminar | Protege lo ya declarado ante HMRC y deja margen para emails tardíos | Las entradas `rule:*` de años congelados nunca se recalculan solas |
| El selector va en la fila de botones, no en la cabecera | La cabecera pliega la tarjeta y en el iPhone no cabía | Desviación documentada en el SUMMARY |
| El botón OFF identifica el hueco por su primer día | Hallazgo G6 | — |

---

## Preguntas abiertas (al usuario, de UNA en UNA)

1. **¿Ha respondido ya el asesor fiscal sobre el límite?** El detalle está solo en la memoria local, nunca en el repo. La respuesta desbloquea el 07-02.
2. ¿Hay que tolerar en e2e-csp el beacon `gen_204` de gapi?
3. ¿Hay que sacar del repo público el código y el nombre del piloto?
4. Revisar uno a uno los 47 días previos de 2026/27.
5. Si al abrir la app ve algo raro en UK Days o en el Excel después de la v2026.10.06-170132, avisar.

---

## Referencias para la próxima sesión

```
@.paul/STATE.md
@.paul/ROADMAP.md                                         (07-02 y Fase 8)
@.paul/phases/07-ukdays-anio-y-limite/07-01-SUMMARY.md
@.paul/phases/07-ukdays-anio-y-limite/07-01-PLAN.md       (diseño completo y split con 07-02)
@index.html                                               (taxYearOf, viewTY, renderUKDays/MAX=91, textos "bonus")
@tests/harness/harness-anio-fiscal.mjs
```

---

## Siguientes pasos por prioridad

| Prioridad | Acción | Esfuerzo |
|----------|--------|--------|
| 1 | Preguntar si el asesor ha respondido. Si sí → `/paul:plan 7` (07-02: límite por año en `settings.ukLimit[label]`, «máximo posible» N+P y textos sin «bonus») | M |
| 2 | Si no ha respondido → `/paul:plan 8` (sin pérdidas silenciosas: avisos de escritura bloqueada y estado obsoleto tras confirm()), y dejar el 07-02 para después | M |
| 3 | El commit `d1ff4e7` (solo .paul/) se subirá con el siguiente push | XS |

---

## Estado

**Actual:** Fase 7 con 1 de 2 planes hechos. Loop cerrado (PLAN ✓ APPLY ✓ UNIFY ✓). v0.2 al 62 %. Producción en v2026.10.06-170132.
**Siguiente:** ver las prioridades 1 y 2.
**Para retomar:** `/paul:resume` y leer este handoff.

---

*Handoff creado: 07/10/2026*
