# 06-01 — Revisión adversaria (Fable)

**Veredicto:** APPROVE WITH CHANGES. Los 13 puntos se incorporaron al PLAN.

Verificado por Fable:
- fa78eeb no contiene RWY_DEP, DEP_RWY ni _runways.
- harness-runways da 70/70 con fa78eeb como base.
- Los códigos de tripulación reales no aparecen en ningún fichero versionado.
- Las fixtures 90 y 91 son copias de la 01 y llevan la misma tripulación real.

| # | Nivel | Hallazgo | Cambio en el plan |
|---|-------|----------|-------------------|
| 1 | BLOCKER | Con −364 días, la fixture 01 cae fuera de UK_DAYS_START/END (index.html:1880) y rompe harness-ukdays; además, TIME_NIGHT cambia más de ±1 | −14 días (en BST y dentro del periodo); re-basar harness-csv:154-155; comentario sobre la dependencia en lib.mjs |
| 2 | IMPORTANT | La 90 y la 91 tienen fechas literales asertadas (harness-csv:171-175) | Sus fechas no cambian; misma tripulación, vuelo y matrícula ficticios que la 01 |
| 3 | IMPORTANT | Lista de campos a anonimizar incompleta | Verified By, Pilot Flying, textos libres y nombre del fichero; conjunto de búsqueda mecánico |
| 4 | IMPORTANT | autonomous:true en un repo público | checkpoint:human-verify antes del git add |
| 5 | IMPORTANT | El mutante AC_ENGTYPE ya lo atrapan aserciones antiguas | Mutantes TIME_DEPSCH (cabecera) y OPERATOR (celda) |
| 6 | IMPORTANT | Regenerar el golden no estaba documentado | --update-golden; los golden son de caracterización |
| 7 | IMPORTANT | La memoria guarda la cabecera del EXPORT, no la del importer | Pedir la página de nuevo; comprobar 120 cabeceras con HEADER ⊂ lista; si falla, el usuario la pega |
| 8 | IMPORTANT | Rutas relativas a mitad de fichero (harness-ukdays:96-97, etc.) | grep y sustitución de todas las apariciones |
| 9 | MINOR | Rename detection | Commit A: solo git mv; commit B: las ediciones |
| 10 | MINOR | Regex de checks y SKIP | /^\s*(PASS…)/ y /^\s*SKIP\b/m |
| 11 | MINOR | Paso del clon limpio poco concreto | Comando exacto |
| 12 | MINOR | ¿Merece la pena sacar los harness de .paul? | Sí (gate estable, las e2e se unen después) |
| 13 | MINOR | Previsión para 06-02 | run-all acepta un directorio; lib es la única fuente |
