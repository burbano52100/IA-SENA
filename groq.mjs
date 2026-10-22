// groq.mjs - Pregunta a Groq desde la terminal, en bucle.
// Uso: node groq.mjs   (desde la carpeta IA-SENA)
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const env = readFileSync('.env', 'utf8');
const key = (env.match(/^NUBE_KEY=(.*)$/m)?.[1] ?? '').trim().replace(/^["']|["']$/g, '');
const modelo = (env.match(/^NUBE_MODELO=(.*)$/m)?.[1] ?? 'openai/gpt-oss-20b').trim();

if (!key || key === 'pegue_aqui_su_llave') {
  console.log('ERROR: falta NUBE_KEY en .env');
  process.exit(1);
}

const rl = createInterface({ input, output });
console.log('Groq listo. Escribe o pega tu pregunta. Para salir: salir\n');

while (true) {
  let pregunta;
  try {
    pregunta = (await rl.question('Pregunta: ')).trim();
  } catch {
    break;
  }
  if (!pregunta) continue;
  if (['salir', 'exit', 'quit'].includes(pregunta.toLowerCase())) break;

  const cuerpo = {
    model: modelo,
    messages: [
      { role: 'system', content: 'Eres un asistente técnico que ayuda a un aprendiz del SENA con el proyecto del Instructivo 2: un asistente con dos modelos (Ollama local llama3.2 y Groq nube openai/gpt-oss-20b), un banco de pruebas de prompts y un flujo en n8n con enrutamiento y respaldo. La carpeta del proyecto es IA-SENA y contiene banco/, prompts/, flujos/ y resultados/. Responde en español, claro y breve, e incluye comandos cuando corresponda.' },
      { role: 'user', content: pregunta },
    ],
    temperature: 0,
  };

  const inicio = performance.now();
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(60000),
    });
    const texto = await r.text();

    if (!r.ok) {
      console.log(`ERROR HTTP ${r.status}: ${texto.slice(0, 300)}\n`);
      if (r.status === 429) console.log('Superaste el límite gratuito. Espera un minuto.\n');
      continue;
    }

    const d = JSON.parse(texto);
    const ms = Math.round(performance.now() - inicio);
    console.log(`\n--- NUBE (${d.model ?? modelo}) ---`);
    console.log(d.choices?.[0]?.message?.content?.trim() ?? '(respuesta vacía)');
    console.log(`[${ms} ms | ${d.usage?.prompt_tokens ?? 0} tokens de entrada | ${d.usage?.completion_tokens ?? 0} de salida]\n`);
  } catch (e) {
    console.log(`ERROR: ${e.message}\n`);
  }
}

rl.close();
