# Reglas Excel Tax Year — Ricardo Vega Burgueño

Documento de referencia para rellenar el Excel TAX YEAR desde emails de vuelo Ryanair y el calendario de EasyLog.

---

## Estructura general

- 1 fila por vuelo (un día con 4 vuelos = 4 filas con la misma fecha)
- UW y U solo se ponen en la **primera fila** del día
- E siempre en blanco (manual)

---

## Columna FLIGHT NO

- Días de vuelo: `FR` + número de vuelo, ej. `FR1234`
- El prefijo `FR` se añade automáticamente si no está en el email
- Días OFF: `OFF`
- Días STBY: `SBY`
- Días SIM: `SIM`

---

## Por tipo de día

### OFF
| Columna | Valor |
|---|---|
| FLIGHT NO | `OFF` |
| Resto | en blanco |

### STBY
| Columna | Valor |
|---|---|
| FLIGHT NO | `SBY` |
| UW | 1 (primera fila) |
| U | 1 (primera fila) |

### SIM
| Columna | Valor |
|---|---|
| FLIGHT NO | `SIM` |
| UK TRAINING | rellenar manualmente (variable) |
| UW | 1 (primera fila) |
| U | 1 (primera fila) |

### E (Exceptional days)
- Siempre en blanco
- El usuario los rellena manualmente
- Máximo 12 días por año fiscal
- Se descuentan del total de UK Days

---

## Columnas DUTY day (desde email de vuelo)

### OFFBLOCKS / ONBLOCKS
- Directamente del campo `Off Block` / `On Block` del email
- Las horas son **UTC/Zulu** — se guardan tal cual en el Excel

### Report time
- **1:00** fijo
- Solo en la **primera fila** del día
- Solo si el **primer vuelo sale de un aeropuerto UK**
- Va en columna **UK DUTY TIME → Report time**

### Flight time
| Situación | UK Flight time | Non-UK Flight time |
|---|---|---|
| Origen UK o destino UK (no ambos) | 0:15 | Total Block − 0:15 |
| Origen Y destino ambos UK | Total Block | — |
| Origen Y destino ambos Non-UK | — | Total Block |

- `Total Block` se coge del campo `Total Block` del email

### Turnaround
- **1:30** fijo
- Solo entre vuelos — el **último vuelo del día NO tiene turnaround**
- UK o Non-UK según el **aeropuerto de destino** de ese vuelo

**Ejemplo día de 4 vuelos:**
| Vuelo | Destino | Turnaround |
|---|---|---|
| Vuelo 1 | Non-UK | Non-UK 1:30 |
| Vuelo 2 | UK (STN) | UK 1:30 |
| Vuelo 3 | Non-UK | Non-UK 1:30 |
| Vuelo 4 (último) | — | Sin turnaround |

### Debrief time
- **0:30** fijo
- Solo en la **última fila** del día
- UK o Non-UK según el **aeropuerto donde termina el día**

---

## Columnas UW / U / E

### UW — UK Working Day
- `1` en la primera fila de todos los días **excepto OFF**

### U — UK Day
`1` en la primera fila si se cumple alguna de estas condiciones:
- Día de **SIM**
- Día de **STBY**
- Día de **DUTY** donde el On Block del último vuelo es **antes de las 00:00 hora local de Londres**

**Conversión horaria (horas del email son UTC/Zulu):**
| Periodo | Zona | Conversión |
|---|---|---|
| Finales marzo – finales octubre | BST (verano) | UTC+1 |
| Finales octubre – finales marzo | GMT (invierno) | UTC+0 |

**Ejemplo:** On Block 23:30 UTC en mayo (BST) = 00:30 hora local → después de medianoche → **U = 0**

> **LÍMITE ANUAL: 91 UK Days (abril–abril). No superar.**

### E — Exceptional Day
- Siempre en blanco (relleno manual)

---

## Aeropuertos UK

Base principal: **STN** (Stansted)

Otros aeropuertos UK habituales: LHR, LGW, MAN, EDI, BHX, BRS, LPL, NCL, ABZ, GLA, BFS, LCY

Cualquier aeropuerto fuera de esta lista = **Non-UK** a efectos de cálculo.

---

## Recuperación del Excel

Si el Excel se pierde, exportar el CSV de PilotLog (CrewLounge) para el periodo abril–abril y enviárselo a Claude — puede regenerar el Excel completo desde ese CSV.
