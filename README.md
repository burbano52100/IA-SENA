# IA-SENA · Asistente con dos modelos: local y en la nube

Proyecto del **Instructivo N.° 2** (Implementación de soluciones de inteligencia artificial, SENA 21730210).
Un asistente para la Panadería La Espiga que usa **llama3.2** en local (Ollama) y **openai/gpt-oss-20b** en la nube (Groq),
con un banco de pruebas de prompts y un flujo de **n8n** con enrutamiento y respaldo.

## Contenido
| Carpeta / archivo | Qué es |
|---|---|
| `banco/` | Cliente compatible con OpenAI, banco de pruebas (`evaluar.mjs`), casos y esquema JSON |
| `prompts/` | `v1` (ingenuo), `v2` (diseñado), `v3` (propio) y `espiga.txt` (asistente) |
| `flujos/` | `mi-flujo.json` (flujo exportado de n8n) y textos para copiar |
| `resultados/` | CSV de cada corrida y `resumen.csv` |
| `informe/` | Informe comparativo en PDF |
| `capturas/` | Lienzo publicado y ejecución con respaldo |
| `docker-compose.yml` | Ollama + n8n |
| `groq.mjs` | Chat en la terminal con el modelo de la nube |

## Puesta en marcha (PowerShell)
```powershell
copy .env.ejemplo .env        # y pegue su llave en NUBE_KEY
docker compose up -d
docker exec ollama ollama pull llama3.2
```

## Hacer preguntas
```powershell
docker exec -it ollama ollama run llama3.2          # chat local (salir: /bye)
node groq.mjs                                        # chat en la nube (salir: salir)
node banco/preguntar.mjs ambos "¿Abren los domingos?"
node banco/mensaje.mjs "Pedí hace una hora y no ha llegado nada"   # pasa por n8n
node banco/evaluar.mjs --proveedor local --prompt prompts/v3.txt   # banco de pruebas
```

## Resultados principales
| Corrida | Ambos campos |
|---|---|
| Local v1 / v2 / v3 | 46 % / 79 % / 83 % |
| Nube v1 / v2 | 83 % / 88 % |
| Flujo completo | 79 % (11 local, 13 nube) · US$ 0,057/mes para 80 mensajes diarios |

> El archivo `.env` no se sube: contiene la llave. El flujo lee la configuración con `$env`.
