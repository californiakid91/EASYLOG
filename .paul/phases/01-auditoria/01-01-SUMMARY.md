---
phase: 01-auditoria
plan: 01
subsystem: testing
tags: [csv, pilotlog, crewlounge, ukdays, night, runway, node-vm]
requires: []
provides:
  - "Arnés Node (node:vm) que ejecuta el <script> real de index.html sobre fixtures"
  - "AUDIT.md con causa raíz de los 5 fallos reportados + H1-H8"
  - "Fixtures 01 (real, gitignored), 90/91 (sintéticos medianoche)"
affects: [02-csv, 03-ukdays, 04-pistas]
tech-stack:
  added: []
  patterns: ["Auditar/testear index.html vía node:vm con DOM-Proxy, sin copiar código"]
key-files:
  created: [.paul/phases/01-auditoria/AUDIT.md, .paul/phases/01-auditoria/harness/run.mjs, .gitignore]
  modified: []
key-decisions:
  - "Fixtures con nombres de tripulación no se commitean (.gitignore)"
  - "Fuente de pistas: decidir en dialéctica (fase 4); FR24 descartado sin proxy por exponer token"
duration: ~60min
completed: 2026-10-03
---

# Phase 1 Plan 01: Auditoría Summary

**Arnés Node sobre el código real de index.html + AUDIT.md: night y pistas no existen en el CSV; T/O-LDG y delays salen bien de la app y fallan al importar (sospecha: mapeo posicional 35→37 columnas); UK Days elige mal el último vuelo cuando sale tras 00:00Z.**

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Arnés ejecuta el código real | Pass | `node harness/run.mjs` corre los 3 fixtures sin excepción; extrae el `<script>` en runtime |
| AC-2: Cada fallo con causa raíz | Pass | 5/5 con cita index.html:línea, fixture y fase destino. T/O-LDG y delays: causa localizada fuera de la app (importer), pendiente confirmación del usuario |
| AC-3: Hipótesis confirmadas/refutadas | Pass | H1, H2, H5, H6 confirmadas; H3 refutada (fixture real); H4 parcial; H7 PENDIENTE-IMPORTACIÓN; H8 nueva (pendiente usuario) |
| AC-4: Viabilidad de pistas | Pass | 10 opciones evaluadas; CORS de IEM METAR y OurAirports verificado con curl |

## Accomplishments

- **H8 descubierta:** inserción de TO_NIGHT/LDG_NIGHT (commit a0b8681, 19/05) desplaza 14 columnas; bloqueante de mayo nunca cerrado. Explica landing ausente + delays "raros" (TAG_DELAY recibiría FUEL).
- **H5 reproducida:** fixture 91 genera UK Day falso `STN→RZE onBlock 20:16` — el síntoma exacto reportado.
- TIME_NIGHT estimado para el vuelo real: FR2134 ≈95/135 min, FR2135 156/156 min (método para fase 2).

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `.paul/phases/01-auditoria/AUDIT.md` | Created | Informe de causas raíz y fixes propuestos |
| `.paul/phases/01-auditoria/harness/run.mjs` | Created | Arnés reutilizable como test de regresión en fases 2-3 |
| `.paul/phases/01-auditoria/harness/fixtures/*` | Created (gitignored) | 1 real + 2 sintéticos |
| `.gitignore` | Created | Excluye fixtures con datos personales |
| `index.html` | Sin cambios | Boundary respetado |

## Review arms

- **G6 /code-review (sonnet, background):** 0 bugs, 4 NITs (setTimeout no-op inocuo en modo local; split de cabecera; estimación night lineal → etiquetada como aproximada en AUDIT). Ninguna conclusión invalidada.
- **Fable adversario (plan):** añadió H5b, H7, corrigió AC_ENGTYPE y requisitos de pistas (histórico + sin secretos).
- **G7 CRG:** risk 0.00 (sin cambios de código de app).
- **G8 security:** diff sin código desplegado; verificado que ningún fichero commiteado contiene nombres de tripulación (fixtures excluidos).

## Deviations from Plan

| Type | Count | Impact |
|------|-------|--------|
| Scope additions | 1 | H8 (mapeo posicional) — hallazgo clave, no estaba en el plan |
| Partial inputs | 1 | Task 1: 1 email real (no 3-6); casos de medianoche cubiertos con fixtures sintéticos 90/91 |
| Deferred | 1 | Preguntas H8 al usuario (qué muestra PilotLog en FR2134; ¿plantilla de mapeo?) → primer plan fase 2 |

## Next Phase Readiness

**Ready:** arnés como base de tests; causas de UK Days listas para fix (fase 3 no depende de nada externo).
**Concerns:** fase 2 depende de una prueba de importación real del usuario en PilotLog (H7/H8).
**Blockers:** ninguno para planificar; la fase 2 arranca con un checkpoint de importación.

---
*Phase: 01-auditoria, Plan: 01 · Completed: 2026-10-03*
