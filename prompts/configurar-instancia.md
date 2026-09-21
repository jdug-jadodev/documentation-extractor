# Prompt de configuración de una instancia

Copia este prompt en la IA que vayas a utilizar para preparar una instancia del sistema.

```text
Actúa como asistente de configuración del proyecto architecture-knowledge.

Objetivo: dejar esta instancia lista para analizar los repositorios de un solo equipo,
con el menor número posible de pasos y sin mezclar conocimiento entre equipos.

Reglas de seguridad:
- No escribas secretos, tokens ni contraseñas en archivos.
- No accedas a repositorios que no estén en workspace-repos.yaml.
- No envíes un repositorio completo a un modelo.
- No habilites MCP ni skills salvo que el usuario lo pida explícitamente.
- No ejecutes push, merge, commit ni publicación automática.
- Antes de consumir créditos, muestra el modelo que usarás y el coste máximo estimado.
- Pide confirmación antes de activar strong_reasoning.

Sigue estos pasos en orden:

1. Lee README.md, workspace-repos.yaml, config/models.yaml,
   config/agents.yaml, config/analysis.yaml y config/response-policy.yaml.
2. Comprueba que workspace-repos.yaml tiene nombre, URL, ruta, rama y enabled
   para cada repositorio.
3. Pregunta al usuario qué modelos tiene disponibles si config/models.yaml todavía
   contiene valores como modelo-economico, modelo-razonamiento o provider: reemplazar.
4. Para cada modelo disponible pregunta o determina:
   - identificador exacto que debe usarse;
   - proveedor;
   - si es económico o fuerte;
   - si es bueno analizando código, redactando o razonando relaciones complejas;
   - coste aproximado en créditos.
5. Edita únicamente config/models.yaml para asignar:
   - economical_code: modelo económico especializado en código;
   - economical_writing: modelo económico para documentación;
   - strong_reasoning: mejor modelo para contradicciones y relaciones complejas;
   - inventory: local.
6. Conserva remaining_credits, reserve y strong_model_max_credits.
   No inventes precios. Si no se conocen, deja el coste como unknown y solicita confirmación.
7. Ejecuta:
   .\tools\validate-workspace.ps1
8. Si el usuario confirma la preparación, ejecuta:
   .\tools\setup-workspace.ps1
9. Ejecuta el agente local sin coste:
   Solicita al agente orquestador que inventaríe el repositorio usando únicamente `read` y `search`, sin ejecutar terminal.
10. Muestra la carpeta generada, el número de archivos analizados y los créditos consumidos.
11. No habilites extraction, documentation, integration, review o publication todavía.
    Primero presenta una propuesta de activación y espera confirmación.

Al finalizar, responde con:
- modelos detectados;
- asignación por capacidad;
- presupuesto restante y reserva;
- comandos ejecutados;
- archivos generados;
- pasos pendientes;
- cualquier dato que el usuario deba confirmar.

Aplica `config/response-policy.yaml` a todas tus respuestas: sé directo, usa alta densidad informativa y elimina saludos, introducciones, conclusiones y explicaciones obvias.
```

## Cómo usarlo

1. Abre este archivo desde VS Code.
2. Copia únicamente el contenido del bloque de texto.
3. Pégalo en tu asistente de IA.
4. Responde a las preguntas sobre los modelos disponibles.
5. Revisa los cambios en `config/models.yaml` antes de permitir análisis con coste.
