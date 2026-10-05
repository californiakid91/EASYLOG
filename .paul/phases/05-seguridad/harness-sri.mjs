// Harness 05-02: SheetJS vendorizado (mismo origen, hash fijado) + meta CSP + aviso de violaciones.
// Uso: node .paul/phases/05-seguridad/harness-sri.mjs
import fs from 'node:fs'; import crypto from 'node:crypto'; import vm from 'node:vm';
const ROOT = '/home/ricardo/easylog';
const html = fs.readFileSync(`${ROOT}/index.html`, 'utf8');
const XLSX_FILE = 'vendor/xlsx-0.20.3.full.min.js';
const XLSX_SHA384 = 'EnyY0/GSHQGSxSgMwaIPzSESbqoOLSexfnSMN2AP+39Ckmn92stwABZynq1JyzdT';  // oficial cdn.sheetjs.com 0.20.3
let fails = 0; const ok = (n, c, d = '') => { console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); if (!c) fails++; };

// (a) SheetJS fuera del CDN
ok('a: ninguna referencia a cdn.sheetjs.com', !html.includes('cdn.sheetjs.com'));
// (b) etiqueta same-origin con defer + hash del fichero
ok('b: <script src="vendor/xlsx…" defer>', html.includes(`<script src="${XLSX_FILE}" defer></script>`));
let sha = '';
try { sha = crypto.createHash('sha384').update(fs.readFileSync(`${ROOT}/${XLSX_FILE}`)).digest('base64'); } catch {}
ok('b: sha384 del fichero vendorizado = oficial 0.20.3', sha === XLSX_SHA384, sha || 'no existe');
ok('b: el script principal sigue siendo localizable por los harness', !!html.match(/<script>\n([\s\S]*?)<\/script>\s*<\/body>/)?.[1]?.includes('const APP_VERSION'));

// (c) meta CSP: primer elemento tras charset y política exacta
const head = html.slice(0, html.indexOf('</head>'));
ok('c: meta CSP justo tras <meta charset>', /<meta charset="UTF-8">\n<meta http-equiv="Content-Security-Policy" content="/.test(head));
const csp = (head.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/) || [])[1] || '';
const dir = Object.fromEntries(csp.split(';').map(s => s.trim()).filter(Boolean).map(s => { const [k, ...v] = s.split(/\s+/); return [k, v]; }));
const same = (k, exp) => ok(`c: ${k}`, JSON.stringify((dir[k] || []).slice().sort()) === JSON.stringify(exp.slice().sort()), (dir[k] || []).join(' '));
same('default-src', ["'self'"]);
same('script-src', ["'self'", "'unsafe-inline'", 'https://www.gstatic.com', 'https://apis.google.com']);
same('connect-src', ["'self'", 'https://firestore.googleapis.com', 'https://identitytoolkit.googleapis.com', 'https://securetoken.googleapis.com', 'https://mesonet.agron.iastate.edu']);
same('frame-src', ['https://easylog-ce18d.firebaseapp.com']);
same('img-src', ["'self'", 'data:', 'blob:', 'https://images.unsplash.com', 'https://*.googleusercontent.com']);
same('style-src', ["'self'", "'unsafe-inline'"]);
same('object-src', ["'none'"]); same('base-uri', ["'none'"]); same('form-action', ["'none'"]);
ok('c: sin comodines amplios', !Object.values(dir).flat().some(v => v === '*' || v === 'https:' || v === 'http:'));
ok('c: la meta CSP va antes de cualquier <script>/<style>', head.indexOf('Content-Security-Policy') > 0 && head.indexOf('Content-Security-Policy') < Math.min(...['<script', '<style'].map(t => head.indexOf(t)).filter(i => i >= 0)));

// (d) listener de violaciones (script inline del head, ejecutado en vm)
const watch = (head.match(/<script id="csp-watch">([\s\S]*?)<\/script>/) || [])[1];
ok('d: script #csp-watch presente', !!watch);
if (watch) {
  const shown = [], warns = []; let handler = null;
  const win = {};
  const ctx = vm.createContext({ window: win, document: { addEventListener: (t, f) => { if (t === 'securitypolicyviolation') handler = f; } }, console: { warn: (...a) => warns.push(a.join(' ')) }, URL, Set });
  vm.runInContext(watch, ctx);
  ok('d: registra securitypolicyviolation en document', typeof handler === 'function');
  const fire = e => handler({ effectiveDirective: 'connect-src', sourceFile: '', blockedURI: '', ...e });
  fire({ blockedURI: 'https://evil.example.com/steal?token=SECRETO' });
  ok('d: antes de que exista el aviso, se encola', win.__cspQ?.length === 1, JSON.stringify(win.__cspQ));
  ok('d: muestra directiva y host, sin ruta ni query', win.__cspQ?.[0] === 'Bloqueado por seguridad (connect-src): evil.example.com', win.__cspQ?.[0]);
  win.__cspShow = m => shown.push(m);
  fire({ blockedURI: 'https://evil.example.com/otra' });
  ok('d: un aviso por host (deduplica)', shown.length === 0);
  fire({ blockedURI: 'chrome-extension://abc/x.js' }); fire({ sourceFile: 'safari-web-extension://x/c.js', blockedURI: 'inline', effectiveDirective: 'script-src-elem' });
  fire({ sourceFile: 'moz-extension://y/z.js', blockedURI: 'https://otro.example.com/' });
  ok('d: ignora extensiones del navegador', shown.length === 0, JSON.stringify(shown));
  fire({ blockedURI: 'inline', effectiveDirective: 'script-src-attr' }); fire({ blockedURI: 'eval', effectiveDirective: 'script-src' }); fire({ blockedURI: 'data', effectiveDirective: 'img-src' });
  ok('d: etiquetas inline/eval/data', JSON.stringify(shown) === JSON.stringify(['Bloqueado por seguridad (script-src-attr): inline', 'Bloqueado por seguridad (script-src): eval', 'Bloqueado por seguridad (img-src): data']), JSON.stringify(shown));
  ok('d: detalle completo solo en consola', warns.some(w => w.includes('steal?token')) && !shown.concat(win.__cspQ).some(m => m.includes('token')));
}
// (e) el script principal vacía la cola en showStatus
const main = html.match(/<script>\n([\s\S]*?)<\/script>\s*<\/body>/)?.[1] || '';
ok('e: el script principal conecta __cspShow con showStatus y vacía la cola', /window\.__cspShow\s*=/.test(main) && /__cspQ/.test(main) && /showStatus\('err'/.test(main.slice(main.search(/window\.__cspShow\s*=/))));

console.log(fails ? `\n${fails} FAIL` : '\nTODO PASS'); process.exit(fails ? 1 : 0);
