# 03-02 — Dialéctica: reglas reales UK Days

Run: wf_78cb92df-f8c (2026-10-04) · confianza: high

## Polo A

POLO A — Determinista + excepciones explícitas (estado de residencia como dato, no como inferencia). La app modela «dónde duerme cada noche» con una regla cerrada y explicable: desde el 05/08/2025 (era LATES), último ON = UK si el on-block final es < 00:00 LT Londres y acaba en STN; todos los OFF/A/L/U/L/VTO/U/SELF = NO; primer ON del bloque = UK si acaba en STN antes de 00:00 LT; INTSP = NO; SBY/SIM = UK salvo activación que acabe fuera o después de 00:00; DH cuenta como vuelo; el sector pegado tras medianoche es un día aparte; UW = el duty empieza en UK (independiente de U). Lo que la regla no puede saber (viajes personales FR1735/FR1736, jumpseat, noches fuera, OFF/SBY/SIM no pegados) entra con un marcador explícito y barato desde el iPhone (1 toque en el calendario: «dormí en UK / fuera» o un tipo de día), o importando el plan ROCS (la fuente de verdad de la empresa) para rellenar los días sin email. Cada día guarda su procedencia (regla X / plan ROCS / manual) y las entradas manual:true nunca se recalculan. Ventajas: es auditable línea a línea ante HMRC (cada UK Day cita su regla y su evidencia: email con calzos, plan, nota contemporánea), es testeable en el arnés con casos cerrados, cabe en un plan M porque la era actual es casi determinista, y un error es visible y localizable en vez de una probabilidad silenciosa. El histórico anterior al 05/08/2025 no se infiere: queda como lo que el usuario declaró (sus registros contemporáneos mandan).

## Polo B

POLO B — Inferencia heurística con contexto + corrección del usuario (minimizar fricción, cubrir también el pasado). El usuario no va a marcar noches a mano de forma constante desde el iPhone; la experiencia real del proyecto es que solo pega emails y no usa el calendario. Por tanto la app debe proponer el mejor valor posible con lo que ya tiene: contexto del bloque (posición del día dentro de la secuencia ON/OFF inferida de los huecos entre días pegados), hora de fin vs. disponibilidad real del STN→VLC de esa tarde (tabla de horarios FR1736/FR1735 por temporada, no un umbral fijo), hora del primer vuelo del bloque para decidir si volvió la víspera (último libre = UK) o el mismo día, y patrón LATES/EARLIES detectado en vez de fecha de corte rígida. Cada día inferido se muestra con nivel de confianza y su motivo («acabó 17:36, había FR1736 a 19:xx → NO UK»), y el usuario solo corrige los de baja confianza; una corrección se convierte en manual:true y queda congelada. Ventajas: cubre los días no pegados sin exigir importar ROCS ni rellenar el calendario, funciona para el histórico de 2 años (pre-LATES, donde la regla determinista no aplica), y da un recuento del límite 91 días útil desde el primer momento; la auditabilidad se mantiene porque se expone el motivo de cada inferencia y lo declarado por el usuario siempre prevalece.

## Preguntas crux

- ¿Qué periodo hay que calcular de verdad en el plan 03-02: solo la era LATES (05/08/2025 en adelante, y en concreto el periodo 06/04/2026–05/04/2027) donde la regla es casi determinista, o también el histórico pre-LATES donde el patrón ida/vuelta dependía del horario de Ryanair de cada día? Si es solo la era actual, ¿qué aporta realmente la heurística?
- ¿Cómo conoce la app los días que no se pegan (OFF/SBY/SIM/A/L/INTSP) y los viajes personales: importando el plan ROCS (fuente de verdad, coste de parseo dentro de un plan M), marcándolos en el calendario con un toque desde el iPhone, o infiriéndolos de los huecos entre días pegados? ¿Cuál es el coste real por mes para el usuario de cada opción y cuál usará de verdad?
- Ante HMRC, ¿un UK Day 'inferido con confianza X' tiene el mismo valor que uno derivado de una regla fija con evidencia (email con calzos, plan, nota contemporánea)? Si los registros contemporáneos del usuario mandan y solo se corrige con respaldo documental, ¿puede la app producir por defecto un valor que no esté respaldado por un documento o una marca del usuario?
- Cuando la regla no puede decidir (p. ej. SBY activado con fin tardío, último ON sin email, sector tras medianoche), ¿qué debe hacer la app: dejar el día en estado 'pendiente/desconocido' visible (tri-estado actual) y contarlo aparte del límite de 91, o adivinar con un umbral y arriesgar un error silencioso en el recuento?

## Recomendación

Adoptar el Polo A enmendado: una regla cerrada por tipo de día para la era LATES, aplicada a los días ON pegados. El último ON es UK Day si el on-block en STN es anterior a las 00:00 de Londres. El primer ON es UK Day si termina en STN antes de las 00:00. INTSP no es UK Day. El DH cuenta como vuelo. Un sector pegado después de medianoche es un día aparte. Cada UK Day guarda `source` ('rule:Rn' | 'rocs' | 'manual') y `reason` con su evidencia (calzos del email, línea del ROCS o nota fechada). Las entradas manual:true no se tocan nunca. Lo que la regla no puede decidir (SBY activado tarde, ON sin email, día no pegado) queda en el tri-estado `undefined`, es decir, 'sin dato / pendiente', y nunca entra como NO UK Day.

De B se toma una sola idea, y solo como sugerencia. Los huecos entre bloques se muestran como propuesta («¿bloque OFF 12–15/11? → NO UK Day») que el usuario confirma con un toque por bloque. Al confirmarla se graba `source: 'manual'` con fecha de confirmación. Un hueco sin confirmar no cuenta como NO UK Day.

El contador nunca da un número optimista. Muestra «UK Days confirmados N · pendientes P» frente a 91, y el aviso de riesgo usa N+P (el peor caso).

El texto del ROCS pegado queda como fuente opcional, con un parser de líneas para los códigos documentados. Si cabe en el plan M, va al final; si no, pasa a otro plan. Se retiran la tabla de horarios FR1736/FR1735 y cualquier umbral horario. El histórico pre-LATES no se recalcula: manda el Excel del usuario como manual:true.

## Razonamiento

1) El periodo que hay que calcular (06/04/2026–05/04/2027) cae entero en la era LATES. Ahí el propio usuario definió el patrón: se va a VLC la mañana del primer OFF y vuelve la mañana del primer ON. Por eso la regla de A no es una heurística, es la definición del usuario. Los 13 días «E» que cita B (earlies que acaban hacia las 14:00) pertenecen a 2025/26, que en su mayoría o en parte es pre-LATES. No refutan la regla en el periodo que importa. Además, el caso que B quería resolver con la tabla de horarios (acabó pronto, ¿cogió el FR1736?) no se da con lates fijos.

2) El argumento más fuerte de B es práctico. El ROCS 2026/27 no existirá hasta 2027, y el usuario no usa el calendario manual. Por tanto, depender de que el usuario introduzca los OFF uno a uno dejaría el recuento vacío. Ese argumento justifica facilitar la captura de huecos, pero no contarlos inferidos. La sugerencia de bloque confirmada con un toque cubre el problema de cobertura con el coste que pedía B. Solo mueve el número cuando hay una declaración contemporánea del usuario, que es lo que exige feedback_hmrc_records.

3) El error está mal repartido, y eso decide la cuestión. Un hueco de 3 días puede ser OFF, pero también SBY+SIM, un email sin pegar o un día que no se pegó. Si se cuenta como NO UK Day y no lo era, el recuento hacia 91 queda por debajo de la realidad, que es justo el lado peligroso para el límite y ante HMRC. Mostrar «pendientes P» y avisar con N+P convierte la duda en algo visible y conservador.

4) Las dos partes ya coincidieron en `source`/`reason`, el tri-estado y que manual:true sea intocable. Por eso la diferencia real se reducía a si se cuentan los huecos inferidos. Una regla cerrada con confirmación explícita se puede probar en el arnés con casos de resultado fijo. Un umbral de confianza no tiene contra qué compararse.

5) El alcance cabe en un plan M. Lleva la regla por tipo de día, los campos de procedencia, la UI de pendientes con sugerencia de bloque y el contador doble. El parser del ROCS es la primera parte que se recorta si no cabe.

## Trade-offs

- Hasta que el usuario confirme los bloques sugeridos, el contador mostrará muchos pendientes. No ofrece la falsa sensación de un calendario 100% completo desde el primer pegado que daba B, y exige algún toque (aprox. 1 por bloque de libres, 2–4 al mes).
- Los viajes personales que la regla no ve (jumpseat a VLC después de un duty, noche fuera no pegada) siguen dependiendo de que el usuario los marque. Ninguno de los dos polos los detecta, pero A no lo disimula.
- Se renuncia a reconstruir automáticamente el histórico pre-LATES (2 años). Ahí la app no ayuda más allá de importar el Excel como manual:true.
- Si los turnos del usuario dejan de ser LATES fijos, la regla deja de ser determinista. Habría que reabrir el diseño, quizá con la tabla de horarios que se descarta ahora.
- El aviso por peor caso (N+P) puede dar falsas alarmas de acercarse al límite de 91 mientras haya muchos pendientes.
- El parser del ROCS puede quedar fuera de este plan. Hasta que exista el PDF/texto 2026/27, los SBY/SIM dependen de que el usuario los marque.
