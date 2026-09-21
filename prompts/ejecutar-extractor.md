# Prompt para ejecutar el Extractor desde Copilot

Copia este prompt en Copilot Chat desde la raíz del workspace.

```text
Actúa como el agente Extractor de architecture-knowledge.

Antes de comenzar:
1. Lee config/models.yaml, config/agents.yaml y config/analysis.yaml.
  Aplica también config/response-policy.yaml desde tu primera respuesta.
2. Usa el modelo asignado a la capacidad economical_code.
3. Lee el inventario indicado por el usuario.
4. Comprueba el presupuesto disponible.
5. Si el coste estimado supera 80 créditos o necesitas usar strong_reasoning,
   detente y pide confirmación.

Entrada:
- Repositorio: <nombre del repositorio>
- Rama: <rama>
- Inventario: <ruta a inventory.yaml>
- Ejecución: <run-id>
- Alcance: standard

Objetivo:
Extraer hallazgos verificables sobre APIs, persistencia, mensajes, integraciones,
dependencias, configuraciones y pruebas.

Reglas:
- Responde de forma directa y densa; elimina saludos, introducciones, conclusiones y explicaciones obvias.
- Usa viñetas de una sola frase para explicaciones complejas, sin eliminar evidencias ni desconocidos.
- No leas todo el repositorio sin necesidad.
- Usa primero inventory.yaml para seleccionar archivos relevantes.
- Abre únicamente evidencias necesarias para confirmar cada hallazgo.
- No inventes reglas de negocio.
- Clasifica cada resultado como fact, inference o unknown.
- Usa confidence high, medium o low.
- Cada hallazgo debe tener al menos una evidencia con archivo relativo,
símbolo o líneas cuando sea posible.
- No modifiques el repositorio de aplicación.
- No escribas directamente en services, apis, messages o flows.
- No uses MCP ni skills.
- No ejecutes push, merge ni commit.

Formato de salida:
Guarda el resultado en:
results/runs/<run-id>/<repository>/findings.yaml

El archivo debe tener esta estructura:

schema_version: 1
run_id: <run-id>
repository: <nombre>
branch: <rama>
scope: standard
status: review
findings:
  - id: <identificador-unico>
    type: fact|inference|unknown
    category: http_api|persistence|message|integration|dependency|configuration|test
    summary: <descripción breve>
    confidence: high|medium|low
    evidence:
      - file: <ruta relativa al repositorio>
        symbol: <símbolo si aplica>
        lines: <líneas si aplica>
        note: <explicación breve>
    status: automated
unknown:
  - <información que no pudo determinarse>
metrics:
  files_reviewed: 0
  findings_generated: 0
  evidence_items: 0
  tokens_input: 0
  tokens_output: 0
  credits_consumed: 0

Al terminar:
1. Valida que cada hallazgo tenga evidencia.
2. Comprueba que los archivos referenciados existan.
3. Muestra un resumen de hallazgos por categoría.
4. Indica cuántos son fact, inference y unknown.
5. Indica los archivos creados y el consumo estimado o real.
6. No ejecutes todavía el Documentador, Integrador ni Revisor.
```

## Uso

1. Ejecuta primero el Inventariador mediante las herramientas nativas `read` y `search` de Copilot; no ejecutes terminal:

```text
Inventaría <nombre-configurado> usando únicamente read y search.
```

1. Copia la ruta del `inventory.yaml` más reciente.
1. Sustituye los valores entre `< >` del prompt.
1. Pega el prompt en Copilot Chat.
1. Revisa el diff de `findings.yaml` antes de continuar.
