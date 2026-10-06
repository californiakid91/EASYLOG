// Preload de run-all --now=<ISO> (fase 7): simula el reloj del sistema en el proceso del test.
// new Date() sin argumentos y Date.now() devuelven ese instante (fijo); el resto de Date no cambia.
// Sirve para comprobar que los tests no dependen del año real (cada harness crea su vm con el Date del host).
const NOW = process.env.EASYLOG_TEST_NOW;
if (NOW) {
  const Real = Date, t = new Real(NOW).getTime();
  if (Number.isNaN(t)) throw new Error(`EASYLOG_TEST_NOW no es una fecha válida: ${NOW}`);
  globalThis.Date = class extends Real {
    constructor(...a) { super(...(a.length ? a : [t])); }
    static now() { return t; }
  };
}
