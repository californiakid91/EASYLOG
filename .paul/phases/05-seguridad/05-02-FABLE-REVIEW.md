# 05-02 — Revisión adversaria (Fable), 2026-10-05

Veredicto: **aprobar con enmiendas** (todas incorporadas al PLAN).

| # | Severidad | Problema | Enmienda aplicada |
|---|-----------|----------|-------------------|
| B1 | BLOQUEANTE | Cargar SheetJS al pulsar el botón mete un await de red entre el toque y `XLSX.writeFile` (`<a download>.click()`); en iOS standalone se pierde la activación de usuario y la descarga falla en silencio. El E2E de Linux no lo reproduce. | SheetJS **vendorizado** (`vendor/xlsx-0.20.3.full.min.js`, defer, sha384 fijado en el harness). downloadTaxExcel sigue síncrona. |
| I1 | IMPORTANTE | `connect-src https://*.googleapis.com` permite exfiltrar a un proyecto Firebase del atacante; con `'unsafe-inline'` la CSP no frena XSS. | Hosts concretos (firestore / identitytoolkit / securetoken). Residuales documentados. |
| I2 | IMPORTANTE | El E2E en modo local no ejercita gapi/iframe/Firestore. | Recorrido B en modo nube + flujo de nube en navegador real antes del push. |
| I3 | IMPORTANTE | Las extensiones del navegador dan falsos positivos; un listener en :707 pierde las violaciones del markup anterior. | Filtro de extensiones, etiquetas inline/eval/data, script inline tras la meta con cola. |
| I4 | IMPORTANTE | El comprobador lee el fichero con el refresh token de Google. | execFileSync sin shell, solo access_token, errores sin cuerpos, verify sin `ya29.`/`1//`. |
| M1–M4 | MENOR | `firebase deploy` sin --only desplegaría las reglas; posición de la meta OK; línea base de pageerror; AC-1 sin red. | Cabecera en firestore.rules; línea base en el E2E; AC-1 reescrito. |

Verificado por Fable contra el SDK v10: en Safari, getAuth precarga `apis.google.com/js/api.js` y el iframe `easylog-ce18d.firebaseapp.com/__/auth/iframe`; la popup es una navegación (no la gobierna la CSP); no hacen falta ssl.gstatic.com ni www.google.com.
