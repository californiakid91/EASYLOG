# Handoff de sesión PAUL

**Sesión:** 11/10/2026, desde el `/paul:resume` hasta el cierre de la Fase 8
**Fase:** 8 (Sin pérdidas silenciosas). ✅ **COMPLETA** (08-01 + 08-02). La Fase 7 sigue en 1/2: el 07-02 espera al asesor.
**Contexto:** ciclo completo del 08-02 (política de sincronización): dialéctica, plan, revisión de Fable, APPLY, G6, e2e, UNIFY y transición de fase con G7 y G8.

---

## Lo que se hizo

1. **Resume.** Se archivó el handoff del 08-01. El usuario confirmó que **el asesor aún no ha respondido**, así que el 07-02 sigue bloqueado.
2. **Dato del usuario para la dialéctica:** *«Es raro que hoy haga algo sin conexión para esta app porque necesito internet para subir a PILOTLOG. Así que no»*. Es decir, casi nunca usa la app sin conexión y no edita en dos dispositivos a la vez.
3. **Dialéctica Fable sobre la sincronización** (2 rondas, confianza alta): **opción A**, que mantiene que gana el último por mapa y lo endurece. B (merge por día) y C (transacciones) quedan diferidas. Detalle en `08-02-DIALECTIC.md`.
4. **Plan 08-02.** Revisión adversaria de Fable: aprobado con cambios (1 bloqueante, 5 importantes, 5 menores), todo incorporado. Una corrección propia a la síntesis de la dialéctica: el aviso por timeout **no** decrementa `_cloudWrites`.
5. **APPLY**, desplegado como `v2026.10.11-093029` (verificado byte a byte):
   - Regla D2 en lugar de las guardas por temporizador.
   - `setDoc` síncrono con `cloud.fs`.
   - «Sin confirmar · no recargues» a los 20 s, o a los 5 s sin red.
   - Listener que se rearma con backoff; `unauthenticated` cierra la sesión.
   - Relectura del servidor al volver de más de 60 s sin señal: con `stale` no se escribe.
   - `harness-sync` (63 checks), con reloj `advance`/`jump`.
   - Harness existentes ajustados. El snapshot viejo de runways y el AC-2 de sin-perdidas ya no son vacíos.
6. **G6 (Fable):** 6 hallazgos, los 6 arreglados. El más grave: «Sincronizado ✓» aparecía con otra escritura todavía sin confirmar.
7. **Checkpoint.** El usuario dijo *«Compruébalo tú»*. Claude escribió `tests/e2e/e2e-sync.mjs`: WebKit con perfil iPhone 13 y Firebase falso que reproduce la semántica del SDK. Pasa 20/20. Contra la versión anterior falla en 14, y la versión anterior **borraba el día escrito desde el otro dispositivo**. No cubre la suspensión real de iOS ni el Firebase real.
8. **Transición de Fase 8:**
   - G7 CRG: riesgo 0,40, sin impacto alto.
   - G8 security-review: **0 vulnerabilidades**, 2 notas diferidas.
   - PROJECT, ROADMAP, STATE y paul.json actualizados y coherentes entre sí.
   - Commits `d9335ed`, `84bab47`, `e92209b`, `f241e82` y `be2f454`, todos subidos. El pre-push pasó 17/17.

---

## Decisiones

| Decisión | Motivo | Impacto |
|----------|--------|---------|
| Sync = A (gana el último por mapa, endurecido) | Un usuario, siempre con red, un dispositivo cada vez. Con B, la base del diff se desfasa justo cuando algo falla. | F-02-001 mitigado, no cerrado. Si cambia el uso, se reabre con B |
| `_cloudWrites` nunca baja por timeout | La auto-actualización recargaría y perdería la escritura en cola | Patrón obligatorio para cualquier escritura nueva |
| «Sincronizado ✓» solo con 0 escrituras en vuelo y sin stale | El aviso «Sin confirmar» dice que no se recargue hasta verlo | `cloudWriteDone`/`cloudIndicator` |
| La detección de la vuelta va solo en `requireHydrated` | Un `confirm()` largo no es «volver» (G6 #3) | Todo mutador nuevo debe empezar con `requireHydrated` (ya era norma desde 08-01) |
| Checkpoint con e2e simulado en vez de con el dispositivo | A petición del usuario. La seguridad de su cuenta impide usar su login. | Residual: vigilar el comportamiento en el iPhone real |

---

## Gaps

### 07-02: límite de UK Days configurable por año
**Estado:** BLOQUEADO por la respuesta del asesor fiscal.
**Referencia:** STATE (Post-Aegis) y ROADMAP, Fase 7.

### Detección de SAFETY PILOT al pegar
**Estado:** DIFERIDO, como fase propia tras la 8. Si VEGRIC aparece como tercer FO sin PF, proponer funciones a 0:00, SELF como Pilot 3 y «SAFETY PILOT» en Remarks.
**Esfuerzo:** S.

### Diferidos nuevos de la Fase 8 (todos XS, sin urgencia)
- **G8:** `_cloudWrites` de una sesión anterior no se resetea al cerrar sesión ni al cambiar de modo. Solo afecta a la disponibilidad. Arreglo: un epoch de sesión.
- **G8:** validación mínima de forma en `applyCloudData`.
- **08-02:** verificar en el iPhone real que «Comprobando…» termina y que «Sin confirmar» no sale con buena cobertura.

---

## Preguntas abiertas (al usuario, de UNA en UNA)
1. ¿Ha respondido ya el asesor? Si sí, `/paul:plan 7`.
2. Si no: ¿abrimos la fase de SAFETY PILOT?
3. Siguen pendientes:
   - checklist de PilotLog y re-export del CSV;
   - PDF de issues de CrewLounge;
   - tolerar el `gen_204` en e2e-csp;
   - sacar el código y el nombre del piloto del repo público;
   - revisar los 47 días previos de 2026/27.

---

## Referencias para la próxima sesión

```
@.paul/STATE.md
@.paul/ROADMAP.md
@.paul/phases/08-sin-perdidas-silenciosas/08-02-SUMMARY.md
@.paul/phases/08-sin-perdidas-silenciosas/08-02-DIALECTIC.md
@index.html   (cloudWriteGate/watchWrite/cloudWriteDone/subscribeCloud/applyCloudData/revalidateCloud/initCloudFreshness)
@tests/harness/harness-sync.mjs
@tests/e2e/e2e-sync.mjs
```

---

## Siguientes pasos por prioridad

| Prioridad | Acción | Esfuerzo |
|-----------|--------|----------|
| 1 | Preguntar por el asesor. Si respondió → `/paul:plan 7` (07-02) | M |
| 2 | Si no → `/paul:add-phase` para SAFETY PILOT y luego `/paul:plan` | S |
| 3 | Cuando el usuario avise: re-export de PilotLog y verificación (fuera del repo) | S |

---

## Estado

**Actual:** Fase 8 ✅. Loop cerrado (PLAN ✓ APPLY ✓ UNIFY ✓). v0.2 al 88 %. Producción en `v2026.10.11-093029`.
**Siguiente:** las prioridades 1 y 2.
**Para retomar:** `/paul:resume` y leer este handoff.

---

*Handoff creado: 11/10/2026*
