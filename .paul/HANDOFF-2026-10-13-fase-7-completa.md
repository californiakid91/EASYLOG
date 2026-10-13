# Handoff de sesión PAUL

**Sesión:** 12/10/2026 → 13/10/2026
**Fase:** 7 (UK Days año y límite) ✅ **COMPLETA**. Con ella, el **milestone v0.2 tiene sus 4 fases completas** (5, 6, 7 y 8). Falta cerrarlo formalmente.
**Contexto:** revisión del PilotLog fuera del repo, respuesta del asesor fiscal (el detalle está SOLO en la memoria local), y el ciclo completo del 07-02.

---

## Lo que se hizo

1. **PilotLog, fuera del repo** (detalle en `~/easylog-private/README.md` y en la memoria local).
   - Se reenvió al usuario la checklist sin conexión, y él la anotó durante un vuelo. Paró el 27/07/2024 (página 16).
   - El NIGHT histórico de PilotLog está calculado desde la puesta de sol y no con la regla EASA de −6°. Por eso las correcciones bajan entre 20 y 30 min y son correctas (memoria `reference_pilotlog_night_sunset`).
   - Hay 200 vuelos de marzo a agosto de 2024 sin hora de T/O ni LDG: solo calzos. El usuario decidió dejarlo («no es el fin del mundo»).
   - Quedan dudas suyas por resolver: ver «Preguntas abiertas».
2. **Asesor fiscal (13/10).** Su respuesta y la situación del usuario están **solo en la memoria local** (`reference_srt_aircrew`). Se hizo además una búsqueda de qué acepta HMRC como circunstancias excepcionales (memoria `reference_srt_exceptional`).
3. **07-02.**
   - **Plan con revisión adversaria de Fable.** Bloqueante: el borrador revelaba datos fiscales en el repo público, y se corrigió antes del commit.
   - **APPLY:**
     - `_settings` persistido como un mapa más;
     - límite de días computables por año, como dato del usuario (por defecto 90, genérico);
     - días por circunstancia excepcional con motivo, que no computan (máximo 60 por año);
     - «máximo posible»;
     - textos sin «bonus»;
     - backup por email con las marcas excepcionales;
     - tests: `harness-uklimit` (51 checks) y `e2e-uklimit` (WebKit iPhone, 12 checks).
   - **G6 (Fable):** 6 hallazgos, todos arreglados.
   - **Checkpoint:** aprobado por el usuario.
   - **Transición:** G7 CRG con riesgo 0,40; G8 sin vulnerabilidades y sus 2 notas arregladas.
   - **Commits:** `b0fa524` (plan), `d58d545` (feat), `678a3ff` (fase). Producción en `v2026.10.13-144210`, comprobada byte a byte.

---

## Decisiones

| Decisión | Motivo | Impacto |
|----------|--------|---------|
| El límite es un dato del usuario por año, no del código | El criterio es suyo y de su asesor, cambia por año, y el repo es público | `settings.ukLimit[label]`; el default genérico es 90 |
| La app registra la marca de excepcional con su motivo; no la valida | Es decisión del usuario y su asesor; HMRC puede pedir pruebas | Backup con `[exc] motivo` |
| Ni datos fiscales ni situación de residencia en el repo (planes, SUMMARY, commits, handoffs) | Repo público | Se revisa con `git grep` antes de cada commit de documentos |

---

## Preguntas abiertas (al usuario, de UNA en UNA)
1. **PilotLog**, cuando quiera:
   - **FR7396, 10/06/2026:** en espera.
   - **Simulador MAX, 14/08/2023:** ¿existió esa sesión?
   - **FR2534 y FR579:** comprobarlos en la roster app.
   - **FR5553, 02/05/2026 (JUMPSEAT):** ¿cómo apuntarlo?
   - Al terminar, hará un re-export del CSV y se verifica.
2. Siguen pendientes:
   - tolerar el `gen_204` en e2e-csp;
   - sacar el código y el nombre del piloto del repo público;
   - revisar los 47 días previos de 2026/27.

---

## Siguientes pasos por prioridad

| Prioridad | Acción | Esfuerzo |
|-----------|--------|----------|
| 1 | `/paul:complete-milestone`: cerrar v0.2 | S |
| 2 | Siguiente milestone o fase: detección de SAFETY PILOT al pegar (diferido) y lista de diferidos de STATE | S–M |
| 3 | Cuando el usuario avise: verificar su PilotLog con un export nuevo (fuera del repo) | S |

---

## Estado

**Actual:** Fases 5, 6, 7 y 8 ✅. Loop cerrado. v0.2 al 100 % de fases. Producción en `v2026.10.13-144210`.
**Siguiente:** `/paul:complete-milestone`.
**Para retomar:** `/paul:resume` y leer este handoff.

---

*Handoff creado: 13/10/2026*
