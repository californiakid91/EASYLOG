// E2E 05-02 (WebKit, iPhone 13): la CSP no rompe ningún flujo. Uso: node tests/e2e/e2e-csp.mjs (o run-all tests/e2e). Necesita «npm ci».
// NECESITA INTERNET: gstatic, Google y Unsplash son REALES (vía Node, ver ctx.route); IEM interceptado. run-all --skip-net lo excluye.
// Línea base = el mismo recorrido con la meta CSP quitada del HTML servido → los pageerror deben ser los mismos.
// Reloj: recorrido local con FIXED_NOW; recorrido nube con reloj real (Firestore/Auth se cuelgan con Date fijo).
import fs from 'node:fs';
import { INDEX_PATH, FIXED_NOW, readFixture, serveRepo, loadPlaywright, watchdog } from '../lib.mjs';
watchdog();
const HTML = fs.readFileSync(INDEX_PATH, 'utf8');
const NOCSP = HTML.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>\n/, '');
if (NOCSP === HTML) { console.log('FAIL  no se encontró la meta CSP'); process.exit(1); }
try { await fetch('https://www.gstatic.com/', { method: 'HEAD', signal: AbortSignal.timeout(8000) }); }
catch (e) { console.log(`FAIL  sin red: e2e-csp necesita Internet (${e.cause?.code || e.name})`); process.exit(1); }
const { webkit, devices } = await loadPlaywright();
const fixture = readFixture('01');
let served = HTML;
const srv = await serveRepo(() => served);
const URL0 = srv.url;
let fails = 0; const ok = (n, c, d = '') => { console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); if (!c) fails++; };
const browser = await webkit.launch();

// Calendario OFF del 06/04 al 04/10 (= ayer según FIXED_NOW; salvo el día de la fixture 01) para que el Excel no quede bloqueado por pendientes
const cal = {}; for (let t = Date.UTC(2026, 3, 6); t <= Date.UTC(2026, 9, 4); t += 86400000) { const iso = new Date(t).toISOString().slice(0, 10); if (iso !== '2026-09-18') cal[iso] = 'off'; }

async function newPage(mode) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'], acceptDownloads: true, timezoneId: 'Europe/London' });
  if (mode === 'local') await ctx.clock.setFixedTime(new Date(FIXED_NOW));
  // El WebKit de Playwright en Linux no trae TLS: Node descarga los https:// y se los entrega al navegador.
  // La CSP se sigue aplicando (el navegador decide si pide la URL antes de llegar aquí).
  await ctx.route(/^https:\/\//, async route => { try { await route.fulfill({ response: await route.fetch() }); } catch { await route.abort(); } });
  const page = await ctx.newPage();
  const reqs = [], errs = [], cons = [];
  page.on('request', q => reqs.push(q.url()));
  page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  page.on('console', m => { if (/Content Security Policy|Refused/i.test(m.text())) cons.push(m.text().slice(0, 200)); });
  page.on('dialog', d => d.accept());
  await page.route('https://mesonet.agron.iastate.edu/**', route => route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'content-type': 'text/plain' },
    body: 'station,valid,drct,sknt\nEGSS,2026-09-18 16:50,230.00,12.00\nEPRZ,2026-09-18 19:00,270.00,9.00\n' }));
  await page.addInitScript(([mode, cal]) => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', e => window.__csp.push(`${e.effectiveDirective} ${e.blockedURI}`));
    if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('easylog_mode', mode); localStorage.setItem('easylog_days_v1', JSON.stringify(cal)); }
  }, [mode, cal]);
  return { ctx, page, reqs, errs, cons };
}

// Recorrido A — modo local: pegar, CSV, pistas, Excel, calendario, UK Days
async function runLocal(label) {
  const { ctx, page, reqs, errs, cons } = await newPage('local');
  const r = {};
  await page.goto(URL0); await page.waitForTimeout(1500);
  await page.fill('#input', fixture); await page.click('button[onclick="addDay()"]'); await page.waitForTimeout(500);
  r.added = /vuelos añadidos/.test(await page.textContent('#status'));
  const [csv] = await Promise.all([page.waitForEvent('download'), page.click('#btn-dl-all')]);
  r.csv = fs.readFileSync(await csv.path(), 'utf8');
  await page.locator('.day-rwy').first().click(); await page.waitForTimeout(1200);
  r.rwyChips = await page.locator('.rwy-chip').count();
  await page.keyboard.press('Escape'); await page.evaluate(() => document.getElementById('rwy-modal')?.classList.add('hidden'));
  r.xlsxBeforeClick = reqs.filter(u => u.includes('xlsx')).map(u => u.replace(/^.*\/EASYLOG\//, ''));
  const [xl] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), page.click('button[onclick="downloadTaxExcel()"]')]);
  r.xlName = xl.suggestedFilename(); r.xlSize = fs.statSync(await xl.path()).size;
  r.calCells = await page.locator('#cal-grid > *').count();
  await page.click('[onclick="toggleUKDays()"]'); await page.waitForTimeout(400);
  r.ukBody = (await page.innerText('#ukdays-body')).length;
  r.statusBeforeNeg = await page.textContent('#status');
  r.cspBeforeNeg = await page.evaluate(() => window.__csp.slice());
  r.neg = await page.evaluate(() => fetch('https://example.com/').then(() => 'ok', () => 'bloqueado'));
  await page.waitForTimeout(300);
  r.cspAfterNeg = await page.evaluate(() => window.__csp.slice());
  r.statusAfterNeg = await page.textContent('#status');
  r.sheetjsCdn = reqs.some(u => u.includes('cdn.sheetjs.com'));
  r.unsplash = reqs.some(u => u.includes('images.unsplash.com'));
  r.unsplashOk = await page.evaluate(() => Promise.all(Array.from(document.querySelectorAll('.bg-slide')).map(d => new Promise(res => { const m = getComputedStyle(d).backgroundImage.match(/url\("?(.*?)"?\)/); if (!m) return res(0); const i = new Image(); i.onload = () => res(1); i.onerror = () => res(0); i.src = m[1]; }))).then(a => a.reduce((x, y) => x + y, 0)));
  r.errs = errs; r.cons = cons; r.label = label;
  await ctx.close(); return r;
}

// Recorrido B — modo nube sin sesión: Firebase desde gstatic, gapi + iframe de auth, clic en «Entrar con Google»
async function runCloud(label) {
  const { ctx, page, reqs, errs, cons } = await newPage('cloud');
  const r = {};
  await page.goto(URL0); await page.waitForTimeout(6000);
  r.gstatic = reqs.filter(u => u.includes('gstatic.com/firebasejs')).length;
  r.btnVisible = await page.isVisible('#btn-login');
  const popupP = ctx.waitForEvent('page', { timeout: 8000 }).catch(() => null);
  await page.click('#btn-login');
  const popup = await popupP; await page.waitForTimeout(4000);
  r.popupUrl = popup ? popup.url().replace(/\?.*/, '') : null;
  r.gapi = reqs.some(u => u.startsWith('https://apis.google.com/'));
  r.authIframe = page.frames().some(f => f.url().startsWith('https://easylog-ce18d.firebaseapp.com/__/auth/iframe'));
  // Sin sesión: Firestore e Identity Toolkit deben LLEGAR al servidor (y que este rechace), no ser bloqueados por la CSP
  r.probe = await page.evaluate(async () => {
    const V = 'https://www.gstatic.com/firebasejs/10.13.2/';
    const { getApp } = await import(V + 'firebase-app.js'); const fsm = await import(V + 'firebase-firestore.js'); const am = await import(V + 'firebase-auth.js');
    const out = {};
    try { await fsm.getDocFromServer(fsm.doc(fsm.getFirestore(getApp()), 'users', 'e2e-csp-probe')); out.fs = 'leído(!)'; } catch (e) { out.fs = e.code || String(e); }
    try { await am.signInAnonymously(am.getAuth(getApp())); out.auth = 'anónimo(!)'; } catch (e) { out.auth = e.code || String(e); }
    return out;
  });
  r.fsReq = reqs.some(u => u.startsWith('https://firestore.googleapis.com/'));
  r.itReq = reqs.some(u => u.startsWith('https://identitytoolkit.googleapis.com/'));
  r.csp = await page.evaluate(() => window.__csp.slice());
  r.status = await page.textContent('#status');
  r.errs = errs; r.cons = cons; r.label = label;
  await ctx.close(); return r;
}

served = NOCSP; const A0 = await runLocal('base'); const B0 = await runCloud('base');
served = HTML;  const A = await runLocal('csp');  const B = await runCloud('csp');

console.log('# --- A (local) ---');
ok('A: pegar email añade los vuelos', A.added);
ok('A: CSV idéntico con y sin CSP', A.csv === A0.csv && A.csv.length > 100, `${A.csv.length} bytes`);
ok('A: modal de pistas con cabeceras sugeridas', A.rwyChips > 0 && A.rwyChips === A0.rwyChips, `${A.rwyChips}`);
ok('A: SheetJS cargado de vendor/ (mismo origen) al arrancar', A.xlsxBeforeClick.includes('vendor/xlsx-0.20.3.full.min.js'), A.xlsxBeforeClick.join(','));
ok('A: Excel descargado (nombre y tamaño)', /^TAX YEAR \d\d-\d\d\.xlsx$/.test(A.xlName) && A.xlSize > 1000 && A.xlSize === A0.xlSize, `${A.xlName} ${A.xlSize} B (base ${A0.xlSize})`);
ok('A: ninguna petición a cdn.sheetjs.com', !A.sheetjsCdn && !A0.sheetjsCdn);
ok('A: calendario y UK Days pintados', A.calCells > 27 && A.ukBody > 20, `${A.calCells} celdas, ${A.ukBody} chars`);
ok('A: Unsplash cargado (img-src)', A.unsplash && A.unsplashOk, `${A.unsplashOk} ok`);
ok('A: 0 violaciones de CSP en el recorrido', A.cspBeforeNeg.length === 0 && A.cons.filter(c => !c.includes('example.com')).length === 0, JSON.stringify(A.cspBeforeNeg.concat(A.cons)));
ok('A: sin aviso «Bloqueado» antes de la prueba negativa', !/Bloqueado/.test(A.statusBeforeNeg), A.statusBeforeNeg);
ok('A: negativa — fetch a example.com bloqueado por connect-src', A.neg === 'bloqueado' && A.cspAfterNeg.some(v => v.startsWith('connect-src') && v.includes('example.com')), JSON.stringify(A.cspAfterNeg));
ok('A: negativa — el usuario ve el aviso', /Bloqueado por seguridad \(connect-src\): example\.com/.test(A.statusAfterNeg), A.statusAfterNeg);
ok('A: pageerror = línea base', JSON.stringify(A.errs) === JSON.stringify(A0.errs), `csp ${JSON.stringify(A.errs)} | base ${JSON.stringify(A0.errs)}`);
console.log('# --- B (nube) ---');
ok('B: Firebase cargado de gstatic', B.gstatic >= 3, `${B.gstatic}`);
ok('B: botón «Entrar con Google» visible', B.btnVisible);
ok('B: gapi (apis.google.com) cargado', B.gapi);
ok('B: iframe de auth de firebaseapp.com cargado', B.authIframe);
ok('B: popup de Google abierta', !!B.popupUrl, B.popupUrl);
ok('B: Firestore alcanzado y rechazado por las reglas (no por la CSP)', B.fsReq && B.probe.fs === 'permission-denied' && B.probe.fs === B0.probe.fs, `${B.probe.fs} (base ${B0.probe.fs})`);
ok('B: Identity Toolkit alcanzado (respuesta del servidor, no CSP)', B.itReq && B.probe.auth === B0.probe.auth && !/network/.test(B.probe.auth), `${B.probe.auth} (base ${B0.probe.auth})`);
ok('B: 0 violaciones de CSP', B.csp.length === 0 && B.cons.length === 0, JSON.stringify(B.csp.concat(B.cons)));
ok('B: sin aviso «Bloqueado»', !/Bloqueado/.test(B.status), B.status);
ok('B: pageerror = línea base', JSON.stringify(B.errs) === JSON.stringify(B0.errs), `csp ${JSON.stringify(B.errs)} | base ${JSON.stringify(B0.errs)}`);
ok('B: línea base equivalente (gapi/iframe/popup también sin CSP)', B0.gapi === B.gapi && B0.authIframe === B.authIframe && !!B0.popupUrl === !!B.popupUrl);
await browser.close(); await srv.close();
console.log(fails ? `\n${fails} FAIL` : '\nE2E PASS'); process.exit(fails ? 1 : 0);
