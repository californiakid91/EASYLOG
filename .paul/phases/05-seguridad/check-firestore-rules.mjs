// 05-02: comprueba que firestore.rules del repo = reglas activas en producción (solo GET, nunca despliega).
// Uso: node .paul/phases/05-seguridad/check-firestore-rules.mjs   (RULES_FILE=otra/ruta para probar el caso distinto)
// El token de firebase-tools nunca se imprime: en errores solo sale el status HTTP.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
const PROJECT = 'easylog-ce18d';
const RULES_FILE = process.env.RULES_FILE || '/home/ricardo/easylog/firestore.rules';
const fail = (msg) => { console.log(msg); process.exit(2); };

try { execFileSync('firebase', ['projects:list'], { stdio: 'ignore' }); }  // refresca el access token caducado
catch { fail('No se pudo ejecutar firebase-tools (¿sesión iniciada? firebase login)'); }
let token;
try { token = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config/configstore/firebase-tools.json'), 'utf8')).tokens.access_token; }
catch { fail('No se pudo leer el access token de firebase-tools'); }

async function get(url) {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) fail(`Error HTTP ${r.status} al leer las reglas de producción`);
  return r.json();
}
const base = `https://firebaserules.googleapis.com/v1/projects/${PROJECT}`;
const rel = await get(`${base}/releases/cloud.firestore`);
const rs = await get(`https://firebaserules.googleapis.com/v1/${rel.rulesetName}`);
token = null;
const prod = (rs.source?.files || []).map(f => f.content).join('\n');
const norm = s => s.split('\n').map(l => l.replace(/\/\/.*$/, '').replace(/\s+/g, '')).filter(Boolean);
const a = norm(fs.readFileSync(RULES_FILE, 'utf8')), b = norm(prod);
if (a.join('\n') === b.join('\n')) {
  console.log(`IDÉNTICO — repo = producción (ruleset ${rel.rulesetName.split('/').pop()}, actualizado ${rel.updateTime})`);
  process.exit(0);
}
console.log('DISTINTO — el repo no coincide con producción:');
const n = Math.max(a.length, b.length);
for (let i = 0; i < n; i++) if (a[i] !== b[i]) console.log(`  línea ${i + 1}\n    repo: ${a[i] ?? '(nada)'}\n    prod: ${b[i] ?? '(nada)'}`);
process.exit(1);
