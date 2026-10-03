# AUDIT — EasyLog CSV + UK Days (Plan 01-01)

**Fecha:** 2026-10-03 · **Arnés:** `harness/run.mjs` (ejecuta el `<script>` real de `index.html` en `node:vm`)
**Fixtures:** `01` real (02/10 STN-RZE-STN, noche + delays) · `90`, `91` sintéticos (último vuelo cruzando 00:00Z)
**index.html:** sin modificar.

## Resumen

| # | Fallo reportado | Veredicto | Causa raíz | Fase |
|---|---|---|---|---|
| 1 | Horas de night no aparecen | **CONFIRMADO (H1)** | `TIME_NIGHT` no existe en `HEADER` (index.html:927) ni se calcula | 2 |
| 2 | Pista en uso vacía | **CONFIRMADO (H2)** | `DEP_RWY`/`ARR_RWY` no existen; el email no trae pista | 4 |
| 3 | T/O y LDG a veces faltan | **App OK → fallo al importar (H3 refutada, H8 nueva)** | La app genera TO_DAY=1 / LDG_NIGHT=1 correctos para FR2134. Sospecha principal: mapeo por posición en el importer tras pasar de 35→37 columnas | 2 (requiere prueba del usuario) |
| 4 | Delays "muy raros" | **App OK en códigos numéricos → probable mismo desplazamiento (H8)** + minutos perdidos | Mapeo DELAY_CODES razonable; con mapeo posicional antiguo, la casilla TAG_DELAY recibe FUEL | 2 |
| 5 | UK Days on-block del último vuelo | **CONFIRMADO (H5, H6)** | Orden del último vuelo por `Off Block` HHMM (index.html:1284-1287, 1550-1553) + UK Day nunca se recalcula (1283, 1547) | 3 |

---

## 1. Night — H1 CONFIRMADA

- `HEADER` (index.html:927-935) tiene 37 columnas; ninguna es `TIME_NIGHT`. La referencia CrewLounge la tiene (minutos enteros, col. 26).
- La app solo calcula flags TO_NIGHT/LDG_NIGHT (index.html:970-987, `isNightAt` 803) — funcionan: FR2134 → `LDG_NIGHT=1` (aterrizaje RZE 19:13Z, de noche).
- **Evidencia (estimación aproximada: interpolación lineal lat/lon Off→On Block minuto a minuto + `isNightAt` real; el fix usará círculo máximo):**
  - FR2134 STN-RZE: **≈95 de 135 min** de noche (despegue de día, coincide con lo que dice el usuario)
  - FR2135 RZE-STN: **≈156 de 156 min** (todo de noche)
- **Fix propuesto (fase 2):** añadir `TIME_NIGHT` (minutos, Off Block→On Block) con interpolación en círculo máximo; aeropuertos sin coordenadas → vacío + aviso. Validar contra 1-2 vuelos con night conocido de PilotLog/CrewLounge.
- Nota: la definición actual de noche es "puesta de sol +30 min → salida −30 min" (proxy EASA). Mantener.

## 2. Pistas — H2 CONFIRMADA

- Ni `HEADER` ni `parseText` (850) manejan pista; el email de Ryanair no la incluye. Siempre vacía.
- **Viabilidad (investigado + verificado con curl 2026-10-03):**

| Opción | Histórico | Navegador (CORS) | Clave secreta | Coste | Precisión |
|---|---|---|---|---|---|
| Flightradar24 API (rumbo del track) | 30 días (Explorer) | Sí | **Sí** → quedaría pública en index.html | ~9 $/mes | Alta |
| OpenSky `/tracks` | 30 días | **No** | Sí (OAuth2) | Gratis | Baja (puntos cada ≤15 min) |
| adsb.lol / airplanes.live / ADS-B Exchange | Solo vivo o volcados masivos | No | — | — | — |
| **IEM METAR archivo** (viento real) | Años | **Sí** (verificado) | No | Gratis | Media: pista *probable* |
| Open-Meteo (viento modelo) | Años | Sí | No | Gratis | Media-baja |
| **OurAirports runways.csv** (rumbos de pista) | Estático | **Sí** (verificado, 4 MB → prefiltrar) | No | Gratis | — |
| Selector manual | — | — | No | Gratis | 100% |

- **Ejemplo real:** EGSS 02/10 16:50Z viento 220°/11kt → pista 22 para el despegue del FR2134 a las 17:15Z.
- **La idea del usuario (Flightradar)** es la más precisa, pero FR24 exige token y en una app sin servidor el token sería público (choca con seguridad #1) o requiere un pequeño proxy/Atajo de iOS.
- **Recomendación inicial (a decidir en dialéctica, fase 4):** pista sugerida por viento METAR + rumbos OurAirports, con confirmación de un toque por el piloto; manual como fallback. FR24 solo si el usuario acepta coste + proxy.

## 3. T/O y Landing — H3 REFUTADA para el fixture; H8 nueva

- `isMyTO = d['Take Off'] === 'VEGRIC'` (index.html:967). Con el email real `Take Off : VEGRIC` → match exacto. Salida del arnés FR2134: `TO_DAY=1 TO_NIGHT=0 LDG_DAY=0 LDG_NIGHT=1 PF=TRUE`. **Correcto.**
- El usuario dice que tras importar faltan → el fallo está **entre el CSV y PilotLog**.
- **H8 (nueva, más probable):** el 19/05 (commit a0b8681) el CSV pasó de 35 a 37 columnas (se insertaron TO_NIGHT y LDG_NIGHT). El bloqueante "validar el wizard con el nuevo esquema" (HANDOFF de mayo) **nunca se cerró**. Si el importer usa un mapeo guardado **por posición**, todo lo que va después de la col. 21 se desplaza:

| Col | Mapeo antiguo esperaba | Ahora recibe |
|---|---|---|
| 22 | LDG_DAY | TO_NIGHT (→ aterrizaje "desaparece") |
| 23 | PF | LDG_DAY |
| 30 | **TAG_DELAY** | **FUEL (ej. 7160)** → delays "raros" |
| 32 | AC_MODEL | TAG_DELAY |
| … | … | … |

- Encaja con los dos síntomas (landing que falta + delays raros). No explica por sí solo el T/O que falta (col. 21 no se mueve) → **necesita confirmación del usuario** (ver Preguntas).

## 4. Delays — H4 parcialmente confirmada

- Arnés FR2134: códigos 41, 93 → `TECHNICAL DEFECTS|AIRCRAFT ROTATION`. FR2135: 93, 62, 15 → `AIRCRAFT ROTATION|OPERATIONAL REQUIREMENT|BOARDING`. Formato coincide con el enum CrewLounge.
- **Confirmado:** `DELAY_CODES[Number(c)]` (1012) descarta códigos alfanuméricos (`93A`, `RA`…) en silencio — no presentes en este fixture.
- **Confirmado:** los **minutos** de delay solo van a `FLIGHTLOG` (1037-1040), campo que el importer ignora → se pierden.
- Dato del email (no bug de la app): FR2135 trae `Delay Code 3 : 15`, el comandante escribe "code 19 … PRM".
- "Muy raros" → lo más probable es H8 (la casilla de delay recibe el número de fuel). Pendiente confirmación.

## 5. UK Days — H5 y H6 CONFIRMADAS

- **H5 CONFIRMADA (fixture 91):** último vuelo con Off Block 00:10Z → al ordenar por HHMM (index.html:1284-1287 y 1550-1553) queda **primero**; se toma como "último" el STN-RZE → UK Day guardado con `route STN→RZE, onBlock 20:16` (debería ser RZE→STN y no ser UK Day: on-block 03:35 BST del día siguiente). **Este es exactamente el síntoma reportado.**
- **H5b:** fixture 90 (Off 23:59Z, On 02:35Z) → sin UK Day: correcto (el salto de fecha on<off funciona). Con Off ≥00:00Z (fixture 91) la fecha nunca se desplaza → contribuye al error. El fix debe tratar la secuencia de sectores cronológicamente (si un Off Block es menor que el On Block del sector anterior → +1 día).
- **H6 CONFIRMADA por código:** `!_ukdays[iso]` (1283) y `updated[iso]` (1547) → si se re-pega el email corregido de un día, el UK Day erróneo **no se recalcula**. Fix: recalcular cuando se reemplaza el día (salvo entradas `manual: true`).
- Fixture real 01: `RZE→STN onBlock 23:36 BST` → correcto (coincide con el usuario).
- Definición confirmada por el usuario: UK Day = on-block del último vuelo antes de 00:00 hora de Londres (no exige aeropuerto UK).
- Colateral: el CSV fecha ese sector post-medianoche con la fecha del duty (`PILOTLOG_DATE`) — revisar en fase 2.

## 6. H7 — diferencias vs referencia CrewLounge (PENDIENTE-IMPORTACIÓN)

| Campo | App ahora | Referencia / historial | Estado |
|---|---|---|---|
| AC_ENGTYPE | `Turbine (jet-fan)` (1056) | Commit 5079179: *"importer rejects 'Turbine (jet-fan)'"* → volvió a `Jet` | Contradicción: requiere prueba |
| CREWLIST | multilínea `CODE : ROLE : NAME` con cabecera "Flight Deck Crew" | `CP - CODE - NAME\|…` en una línea | Requiere prueba |
| FLIGHTLOG | relleno multilínea | Vacío en todo el export real (no soportado) | Probablemente inútil |
| AF_DEP/AF_ARR | IATA (`STN`) | ICAO (`EGSS`) | Importa OK según usuario → bajo riesgo |
| TIME_NIGHT, DEP_RWY, ARR_RWY | ausentes | presentes | → fases 2 y 4 |

## Preguntas para el usuario (desbloquean H8)

1. En PilotLog, para el **FR2134 del 02/10** ya importado: ¿qué muestra en **Delay**, **PAX**, **Fuel** y **modelo de avión**? (Si Delay muestra un número tipo 7160 → H8 confirmada.)
2. ¿El importador de CrewLounge te pide asignar columnas, o usas una plantilla/mapeo guardado?
3. Prueba decisiva (fase 2, plan 1): te generaré 2 CSV pequeños de ese mismo día (actual vs. variante) para importar y ver cuál sale bien.

## Fases derivadas (ROADMAP)

- **Fase 2 — CSV:** (a) prueba de importación H8/H7 con el usuario → fijar esquema; (b) TIME_NIGHT; (c) delays: alfanuméricos + minutos donde PilotLog los acepte; (d) fecha de sectores post-medianoche.
- **Fase 3 — UK Days:** orden cronológico de sectores con cruce de medianoche; recalcular al reemplazar un día; tests con fixtures 01/90/91.
- **Fase 4 — Pistas:** dialéctica sobre la fuente (viento+OurAirports vs FR24+proxy vs manual) → implementación.

---

## Addendum 2026-10-03 — Prueba 1 del usuario (capturas PilotLog FR2134) + docs oficiales

**Fuente:** capturas del usuario + [CrewLounge: import flight records](https://support.crewlounge.aero/support/solutions/articles/24000034487-import-flight-records-from-another-logbook-or-my-excel-sheet)

- **H8 REFUTADA:** el importer mapea por **nombre de cabecera** (docs: "columns in any order, not case sensitive"). PAX 185, FUEL 7160, FUEL USED 4550, avión 9H-VUL B737-8200 correctos.
- **Delays — CAUSA REAL:** el wizard avisa en cada importación *"column headers not recognized: tag_delay … data ignored"*. `TAG_DELAY` es nombre del *export*, no del *import*. La cabecera de import es **`DELAY`** con códigos IATA **numéricos**. → Fase 2: renombrar + mandar códigos (separador múltiple por confirmar con PRUEBA_C).
- **Pistas:** cabeceras de import son **`RWY_DEP` / `RWY_ARR`** (no DEP_RWY/ARR_RWY como en el export).
- **TIME_NIGHT:** cabecera aceptada; además PilotLog puede **recalcular night time y TO/LDG día/noche** en bloque (Multiselect en Flights) con coordenadas de aeródromo → posible solución sin código.
- **T/O-LDG:** FR2134 muestra TO DAY=1 ✓, pero LDG NIGHT vacío aunque el CSV envía `LDG_NIGHT=1` → pendiente: ver informe de "Issues" del wizard (19/19 registros con Issues).
- **FLIGHTLOG:** límite 250 caracteres; la app manda ~480-490 → probable causa de los Issues en todos los registros.
- **REMARKS:** límite 50 caracteres (ahora = nº vuelo, OK).
- **CREWLIST** multilínea y **AC_ENGTYPE** `Turbine (jet-fan)`: aceptados (se ven bien en la app) → H7 parcialmente cerrada.
- Archivo de prueba: Escritorio `PRUEBA_C_delay_night.csv` = formato actual + `DELAY` (FR2134 `41|93`, FR2135 `93`) + `TIME_NIGHT` (1:35 / 2:36).

### Informe de Issues del wizard (CSV habitual del usuario, 19 vuelos 14/09–02/10)
- **19/19 "Invalid value for Aircraft Engine Type" → importado como "Jet"**: confirma commit 5079179. `AC_ENGTYPE` debe ser **`Jet`** (index.html:1056). H7-ENGTYPE cerrada.
- **FLIGHTLOG >250 chars NO genera issue** (se descarta como causa de los Issues; posible truncado silencioso, sin importancia).
- **Fila 14, 2026-09-18 STN-HAM: "PIC / Captain Name is missing"** → el parser no encontró capitán ese día (¿rol distinto de `CP`, sin sección Flight Deck Crew, o CP no verificado?). Nuevo bug → pedir ese email al usuario (fase 2).
- Ningún issue menciona LDG/landing → LDG_NIGHT vacío sigue sin explicar; se resuelve con PRUEBA_C.

### PRUEBA_C importada (2026-10-03 14:24)
- Aviso "tag_delay" desaparece con cabecera `DELAY` ✓
- **TIME_NIGHT** en `H:MM` importa: FR2134 1:35 (Day 0:40), FR2135 2:36 ✓ → método de estimación validado
- **LDG_NIGHT=1** importa en FR2134 ✓ (TO DAY 1) → el formato actual de T/O-LDG funciona; el landing ausente del CSV habitual queda por explicar (pedido el CSV original)
- **DELAY** con un código (`93`) → "93 (RA)" ✓; con varios `41|93` → **vacío** ✗. PRUEBA_D prueba `41,93` y `93 62 15`.

### PRUEBA_D importada (2026-10-03 14:27)
- `41,93` → DELAY vacío ✗ · `93 62 15` → DELAY vacío ✗ (y `41|93` en PRUEBA_C vacío)
- **Conclusión:** el importer acepta **un único código IATA numérico por vuelo**. Fix fase 2: `DELAY` = código con más minutos (FR2134 → 93/40min, FR2135 → 93/41min); resto de códigos + minutos a FLIGHTLOG (≤250 chars) / REMARKS (≤50).

## Esquema de importación validado (base para fase 2)
| Columna | Formato que funciona |
|---|---|
| `DELAY` (no `TAG_DELAY`) | 1 código numérico IATA |
| `TIME_NIGHT` | `H:MM` |
| `TO_DAY/TO_NIGHT/LDG_DAY/LDG_NIGHT` | 0/1 (funciona) |
| `AC_ENGTYPE` | `Jet` |
| `RWY_DEP/RWY_ARR` | designador (`22`, `36R`) — sin probar aún |

### CSV habitual del usuario (pilotlog_2026-10-03.csv, 19 vuelos, generado por la app actual)
- FR2134 trae **igual** que PRUEBA_C: `TO_DAY=1 TO_NIGHT=0 LDG_DAY=0 LDG_NIGHT=1`. Diferencias con PRUEBA_C: sin `TIME_NIGHT` y con `TAG_DELAY` (ignorada).
- **H9 (nueva, muy probable):** PilotLog descarta TO/LDG nocturnos cuando el vuelo no trae tiempo de noche (`TIME_NIGHT` vacío → noche 0 → aterrizaje nocturno incoherente). Con TIME_NIGHT=1:35 el LDG_NIGHT sí entró. → Añadir TIME_NIGHT (fase 2) lo arregla. Verificación barata: FR3591 15/09 y FR5681 16/09 llevan TO_NIGHT=1/LDG_NIGHT=1 en el CSV → si en PilotLog salen vacíos, H9 confirmada.
- **18/09 "PIC missing":** la fila 2026-09-18 FR1520 STN-HAM es **idéntica** (horas, fuel, PAX, matrícula) al FR1520 del 19/09, pero con crew solo VEGRIC y sin vuelo de vuelta → no es un fallo del parser: parece un email duplicado/incompleto pegado en el 18/09. Pendiente confirmar con el usuario.

### Verificación H9 (FR3591 15/09 en PilotLog)
- FR3591 (TO_NIGHT=1, LDG_NIGHT=1, sin TIME_NIGHT) → PilotLog muestra **TO NIGHT 1 / LDG NIGHT 1**, NIGHT vacío → **H9 REFUTADA** en su forma general.
- FR2134 (mixto: TO_DAY=1 + LDG_NIGHT=1) sin TIME_NIGHT → LDG perdido; con TIME_NIGHT (PRUEBA_C) → OK. Causa exacta desconocida (posible validación del importer en vuelos mixtos o import previo distinto). **Decisión:** no investigar más; la fase 2 manda siempre TIME_NIGHT y se verifica con el primer vuelo mixto real tras el fix.

### 18/09 confirmado espurio (usuario: "no volé, tuve simulador")
- Vuelo FR1520 del 18/09 = copia del 19/09 → borrar en PilotLog y en la app.
- **Bug colateral (fase 3):** `removeDay` (index.html:1334) borra `_cache` y `_excelData` pero **no** `_ukdays` → UK Day huérfano con ruta falsa. Y si el historial ya se limpió tras exportar (`clearHistory`), el día sigue en `_excelData` sin forma de borrarlo desde la UI → aparecería un vuelo fantasma en el Excel Tax Year en un día de SIM.

### Bug UK Days "no me deja borrar" (reportado 2026-10-03 14:36)
- `removeUKDay` (index.html:1704) borra, pero `backfillUKDays()` se ejecuta en cada `onSnapshot` (index.html:1874) y al cargar modo local (1823) → **recrea** el UK Day desde `_cache` mientras el día siga en el historial. El borrado "no funciona" para cualquier día con vuelos en historial.
- Workaround dado al usuario: borrar primero el día en Historial (`removeDay`), luego el UK Day, y re-añadirlo manual con el comando `añade uk days 18 septiembre`.
- Fix fase 3: backfill no debe resucitar días borrados explícitamente (p.ej. marca `deleted`/tombstone, o backfill solo en primera migración).

- **CORRECCIÓN (14:39):** captura del usuario muestra "Días guardados: 0 días · 0 vuelos" → `_cache` vacío → `backfillUKDays` NO puede recrear el 18/09. La hipótesis de resurrección por backfill es **refutada para este caso** (sigue siendo un riesgo real cuando el día está en historial). Causa real pendiente: (a) confirm() no aparece, (b) onSnapshot sobrescribe tras la ventana de 3 s de `_ukdaysSaving`, (c) PWA iOS con versión cacheada sin el fix 1b9c240. Preguntado al usuario.
- Confirmado: el vuelo falso del 18/09 sigue en `_excelData` sin forma de borrarlo desde la UI (historial vacío) → fila fantasma en Excel Tax Year.
