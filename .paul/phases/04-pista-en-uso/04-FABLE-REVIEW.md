# Fase 4 — Revisión adversaria de Fable (04-01 + 04-02), 2026-10-05

Veredicto: **aprobar con cambios**. Todos incorporados a los planes:

| # | Sev | Hallazgo | Cambio |
|---|---|---|---|
| 1 | ALTA | rwyKey colisiona si el mismo vuelo/par se repite en el día | ordinal `#2` por día; sin Off Block en la clave |
| 2 | ALTA | `runways` en la nube sin guard; cliente viejo | guard `_runwaysSaving`; arnés «cliente viejo no borra»; reglas Firestore → checkpoint «Sincronizado ✓» |
| 3 | MEDIA | pistas sin rumbo en OurAirports se pierden | rumbo ≈ ident×10 marcado `~` |
| 4 | MEDIA | 40 KB / subconjunto amplio; ICAO raros | excluir RU/BY/UA/KZ; ≤ 60 KB; ICAO `^[A-Z]{4}$` |
| 5 | MEDIA | 🛬 inaccesible tras «Quitar de la lista» | aviso en la descarga (decisión: solo en «Días guardados») |
| 6 | MEDIA | IEM sin timeout / columnas por posición | AbortController 10 s; columnas por nombre; HTML/ERROR → low |
| 7 | MEDIA | E2E dependiente de IEM real | `page.route()` con fixture; smoke real no bloqueante |
| 8 | MEDIA | caché por día UTC → 2 llamadas | caché `icao|duty` |
| 9 | BAJA | TTU sí entra (MA) | ejemplo fuera de zona: JFK |
| 10 | BAJA | hydrateLocal catch / signOut no resetean | resetear `_runways` (y `_excelData`) |
| 11 | BAJA | claves en onclick | data-* + índices; «otra» validada `^\d{2}[LRC]?$` |
| 12 | BAJA | derivar aeropuertos de la clave | guardar depAp/arrAp |
| 13 | BAJA | auto-update descarga index entero cada 5 min | Deferred: `cache:'no-cache'` (304) |
