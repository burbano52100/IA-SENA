// preguntar.mjs - Hace la misma pregunta al modelo local, al de la nube, a los dos o al flujo de n8n.
// Uso:  node banco/preguntar.mjs local "¿A qué hora abren?"
//       node banco/preguntar.mjs nube  "¿A qué hora abren?"
//       node banco/preguntar.mjs ambos "¿A qué hora abren?"
//       node banco/preguntar.mjs n8n   "¿A qué hora abren?"   (pasa por el flujo: el flujo decide quien responde)
import { readFileSync } from 'node:fs';
import { cargarEnv, proveedor, chat } from './cliente.mjs';

// Si falta el archivo .env o una variable, se muestra el mensaje y se termina.
process.on('uncaughtException', (e) => { console.log(`ERROR: ${e.message}`); process.exit(1); });

const [destino, pregunta] = process.argv.slice(2);
if (!['local', 'nube', 'ambos', 'n8n'].includes(destino) || !pregunta) {
  console.log('Uso: node banco/preguntar.mjs local|nube|ambos|n8n "su pregunta"');
  process.exit(1);
}

// Con n8n la pregunta va al webhook del flujo; local, nube y ambos hablan directo con los modelos.
if (destino === 'n8n') {
  const url = `${process.env.N8N_URL || 'http://localhost:5678'}/webhook/espiga`;
  console.log(`\n--- N8N (${url}) ---`);
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mensaje: pregunta }),
      signal: AbortSignal.timeout(180000),
    });
    const texto = await r.text();
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${texto.slice(0, 200)}`);
    const d = JSON.parse(texto);
    console.log(d.respuesta);
    console.log(
      `[${d.ms} ms | respondio: ${d.proveedor} (${d.modelo})${d.respaldo ? ' con respaldo' : ''} | ` +
        `clasificacion: ${d.clasificacion?.intencion}/${d.clasificacion?.urgente} | ` +
        `${d.tokens_entrada} tokens de entrada | ${d.tokens_salida} de salida | costo: US$ ${Number(d.costo_usd).toFixed(6)}]`,
    );
  } catch (e) {
    const causa = e.cause?.code ?? e.cause?.errors?.[0]?.code ?? e.message;
    console.log(causa === 'ECONNREFUSED'
      ? 'ERROR: n8n no esta corriendo. Enciendalo con: docker compose up -d'
      : `ERROR: ${causa}`);
  }
  process.exit(0);
}

const env = cargarEnv();
const sistema = readFileSync('prompts/espiga.txt', 'utf8').trim();
const mensajes = [
  { role: 'system', content: sistema },
  { role: 'user', content: pregunta },
];

for (const nombre of destino === 'ambos' ? ['local', 'nube'] : [destino]) {
  const p = proveedor(nombre, env);
  console.log(`\n--- ${nombre.toUpperCase()} (${p.modelo}) ---`);
  try {
    const r = await chat(p, mensajes, { temperatura: 0.2 });
    console.log(r.texto || `(respuesta vacia; motivo de fin: ${r.motivoFin})`);
    console.log(
      `[${r.ms} ms | ${r.tokensEntrada} tokens de entrada | ${r.tokensSalida} de salida | ` +
        `costo estimado: US$ ${r.costo.toFixed(6)}]`,
    );
  } catch (e) {
    console.log(`ERROR: ${e.message}`);
  }
}
