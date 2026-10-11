// E2E 08-02 (WebKit, iPhone 13): sincronización endurecida vista por el usuario, con Firebase FALSO servido en lugar de gstatic.
// Recorre el checkpoint del plan: volver a la app tras > 1 min → «Comprobando la nube…» → «Sincronizado ✓» (sin escribir
// desde memoria vieja); cambio normal → «Sincronizado ✓»; modo avión → «Sin confirmar» + aviso; red de vuelta → confirmado.
// Uso: node tests/e2e/e2e-sync.mjs (o run-all tests/e2e). Hermético: sin red. Necesita «npm ci».
import fs from 'node:fs';
import { INDEX_PATH, FIXED_NOW, readFixture, serveRepo, loadPlaywright, watchdog } from '../lib.mjs';
watchdog();
const { webkit, devices } = await loadPlaywright();
const html = fs.readFileSync(INDEX_PATH, 'utf8');
const EMAIL = readFixture('01');
const EMAIL_E = EMAIL.replace(/2026\/09\/18/g, '2026/09/24');
const EMAIL_F = EMAIL.replace(/2026\/09\/18/g, '2026/09/25');
const srv = await serveRepo(html);
let fails = 0; const ok = (n, c, d = '') => { console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); if (!c) fails++; };

// ── Firebase falso (módulos ES servidos en las URLs de gstatic). Estado compartido en globalThis.__fb:
// server = documento en el servidor; net = hay red; pending = escrituras en cola. Semántica del SDK real:
// setDoc → snapshot local con hasPendingWrites y la escritura superpuesta; la promesa resuelve al confirmar el servidor
// (nunca sin red); tras confirmar NO se emite snapshot (solo cambian metadatos); getDocFromServer falla sin red.
const FS_MOD = `
const F = globalThis.__fb ||= { server: { history: {}, excelData: {}, airports: {}, ukdays: {}, runways: {}, dayMap: {} },
  net: true, ackMs: 300, readMs: 100, listeners: [], pending: [], reads: 0, writes: 0 };
const clone = o => JSON.parse(JSON.stringify(o));
const view = () => { const d = clone(F.server); for (const p of F.pending) for (const f of p.fields) d[f] = clone(p.data[f]); return d; };
const emit = () => { const d = view(), pend = F.pending.length > 0;
  F.listeners.forEach(l => setTimeout(() => l({ exists: () => true, data: () => clone(d), metadata: { fromCache: !F.net, hasPendingWrites: pend } }), 0)); };
const ack = p => setTimeout(() => { for (const f of p.fields) F.server[f] = clone(p.data[f]); F.pending = F.pending.filter(x => x !== p); p.res(); }, F.ackMs);
F.goOnline = () => { F.net = true; F.pending.forEach(ack); };
F.remoteWrite = (field, key, val) => { F.server[field] = { ...F.server[field], [key]: val }; }; // otro dispositivo (este no lo oye: está suspendido)
export const getFirestore = () => ({});
export const doc = () => ({});
export function setDoc(_r, data, opts) {
  F.writes++;
  return new Promise(res => { const p = { data: clone(data), fields: opts.mergeFields, res }; F.pending.push(p); emit(); if (F.net) ack(p); });
}
export function getDocFromServer() {
  F.reads++;
  return new Promise((res, rej) => setTimeout(() => F.net ? res({ exists: () => true, data: () => clone(F.server) })
    : rej(Object.assign(new Error('offline'), { code: 'unavailable' })), F.readMs));
}
export function onSnapshot(_r, cb, _err) {
  F.listeners.push(cb);
  setTimeout(() => cb({ exists: () => true, data: () => clone(view()), metadata: { fromCache: false, hasPendingWrites: false } }), 200);
  return () => { F.listeners = F.listeners.filter(x => x !== cb); };
}`;
const AUTH_MOD = `
export const getAuth = () => ({}); export const setPersistence = async () => {}; export const browserLocalPersistence = {};
export function onAuthStateChanged(_a, cb) { setTimeout(() => cb({ uid: 'u-e2e', displayName: 'E2E', photoURL: '' }), 50); }
export const signInWithPopup = async () => {}; export const signOut = async () => {}; export function GoogleAuthProvider() {}`;
const APP_MOD = `export const initializeApp = () => ({});`;
const MODS = { 'firebase-firestore.js': FS_MOD, 'firebase-auth.js': AUTH_MOD, 'firebase-app.js': APP_MOD };

const browser = await webkit.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'], timezoneId: 'Europe/London' });
const page = await ctx.newPage();
await page.clock.install({ time: new Date(FIXED_NOW) });
await page.route('https://www.gstatic.com/firebasejs/**', route => {
  const f = route.request().url().split('/').pop();
  return MODS[f] ? route.fulfill({ status: 200, headers: { 'content-type': 'application/javascript', 'access-control-allow-origin': '*' }, body: MODS[f] }) : route.abort();
});
await page.route('**/images.unsplash.com/**', r => r.abort());
await page.addInitScript(() => localStorage.setItem('easylog_mode', 'cloud'));
const errs = []; page.on('pageerror', e => errs.push(String(e)));
page.on('dialog', d => d.accept());

const sync = () => page.textContent('#sync-indicator');
const status = () => page.textContent('#status');
const fb = expr => page.evaluate(`(() => { const F = globalThis.__fb; return ${expr}; })()`);
const paste = async txt => { await page.fill('#input', txt); await page.click('button[onclick="addDay()"]'); };
const waitSync = async (re, ms = 5000) => { for (let t = 0; t < ms; t += 100) { if (re.test(await sync())) return true; await page.clock.runFor(100); } return false; };

await page.goto(srv.url);
ok('arranque: «Sincronizado ✓» con la nube falsa', await waitSync(/Sincronizado ✓/), await sync());

// ── Paso 2 del checkpoint: un cambio normal acaba en «Sincronizado ✓»
await paste(EMAIL);
ok('pegar: el indicador acaba en «Sincronizado ✓»', await waitSync(/Sincronizado ✓/), await sync());
ok('pegar: el día está en el servidor', await fb(`!!F.server.history['2026-09-18']`));
await page.click('#cal-grid [data-iso="2026-10-07"]');
await page.click('button.opt-off');
ok('calendario: marcar OFF → «Sincronizado ✓»', await waitSync(/Sincronizado ✓/) && await fb(`F.server.dayMap['2026-10-07'] === 'off'`), await sync());
await page.click('#cal-grid [data-iso="2026-10-07"]');
await page.click('button.opt-off');
ok('calendario: desmarcar → «Sincronizado ✓» y quitado del servidor', await waitSync(/Sincronizado ✓/) && await fb(`!('2026-10-07' in F.server.dayMap)`), await sync());

// ── Paso 1: volver a la app tras > 1 min en segundo plano, con un día escrito desde otro dispositivo mientras tanto
await fb(`(F.remoteWrite('history', '2026-09-20', { addedAt: 'otro', role: 'FO', flights: [] }), F.readMs = 1500, true)`);
const w0 = await fb('F.writes');
await page.clock.fastForward(5 * 60000);                       // el iPhone «duerme» 5 min (los temporizadores no corren)
await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
await page.clock.runFor(50);
ok('volver: «Comprobando la nube…»', /Comprobando la nube/.test(await sync()), await sync());
await paste(EMAIL_E);                                          // guardar ANTES de releer la nube
ok('volver: guardar antes de releer se bloquea (nada enviado)', (await fb('F.writes')) === w0 && /Comprobando que no haya cambios/.test(await status()), await status());
ok('volver: el texto pegado sigue en el cuadro', (await page.inputValue('#input')) === EMAIL_E);
ok('volver: tras la relectura «Sincronizado ✓»', await waitSync(/Sincronizado ✓/, 4000), await sync());
ok('volver: avisa de que ya se puede repetir', /Nube comprobada: ya puedes repetir/.test(await status()), await status());
ok('volver: se ha leído del servidor', (await fb('F.reads')) >= 1, String(await fb('F.reads')));
await fb('(F.readMs = 100, true)');
await page.click('button[onclick="addDay()"]');               // repetir (el texto seguía en el cuadro)
ok('volver: al repetir, el servidor conserva el día del otro dispositivo y el nuevo',
  await waitSync(/Sincronizado ✓/) && await fb(`!!F.server.history['2026-09-20'] && !!F.server.history['2026-09-24']`),
  JSON.stringify(await fb('Object.keys(F.server.history)')));

// ── Paso 3: modo avión → «Sin confirmar» + aviso; al volver la red → confirmado
await ctx.setOffline(true);
await fb('(F.net = false, true)');
await paste(EMAIL_F);
await page.clock.runFor(1000);
ok('avión: antes de 5 s aún «Guardando…» (sin aviso)', /Guardando/.test(await sync()) && !/No recargues/.test(await status()), await sync());
await page.clock.runFor(5000);
ok('avión: a los 5 s «Sin confirmar»', /Sin confirmar/.test(await sync()), await sync());
ok('avión: aviso de no recargar', /No recargues/.test(await status()), await status());
ok('avión: la escritura sigue en cola (no se ha perdido)', (await fb('F.pending.length')) === 1 && !(await fb(`!!F.server.history['2026-09-25']`)));
await ctx.setOffline(false);
await fb('(F.goOnline(), true)');
ok('red de vuelta: «Sincronizado ✓»', await waitSync(/Sincronizado ✓/), await sync());
ok('red de vuelta: aviso de que la nube confirmó', /ya ha confirmado/.test(await status()), await status());
ok('red de vuelta: el día está en el servidor', await fb(`!!F.server.history['2026-09-25']`));

ok('sin errores de página', errs.length === 0, errs.join(' | '));
await browser.close(); await srv.close();
console.log(fails ? `\n${fails} FALLO(S)` : '\nTODO OK');
process.exit(fails ? 1 : 0);
