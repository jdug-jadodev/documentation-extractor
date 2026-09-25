# Instrucciones del sistema de documentación

Para consultar o documentar aplicaciones utiliza únicamente las herramientas `docsys_*` del servidor MCP local `sistema-documentacion` y los `TaskPacket` preparados por el motor Node.js. No explores repositorios para inventariar ni compenses una ejecución ausente con `read`, `search`, terminal u otras conexiones.

REGLA DE CORTE: si una herramienta `docsys_*` no está disponible, falla o no resuelve el pedido, informa la limitación y detente. Está prohibido usar `read`, `search`, búsquedas regex, terminal o abrir archivos Router/Handler como alternativa, incluso si el usuario pide un único flujo.

Para garantía estricta, el usuario debe ejecutar estas solicitudes con el agente personalizado `sistema-documentacion`, cuya lista de herramientas no incluye acceso a archivos ni terminal. Si están disponibles `read` o `search`, detente e indica que el agente correcto no está seleccionado.

- Solo participan repositorios habilitados y miembros del workspace configurado.
- Si el estado es `Configuración pendiente`, no inicies análisis.
- Cuando el usuario pida actualizar el conocimiento o la documentación vigente, llama `docsys_refresh_knowledge`: sincroniza ramas con `fetch` y `pull --ff-only`, compara commits y, si hay cambios, procesa solo los archivos afectados y publica la vista completa. Si no hay cambios, reutiliza el run actual.
- Usa `docsys_prepare_analysis` solo cuando el usuario solicite una captura nueva sin sincronizar ni publicar, por ejemplo para comparar una rama concreta.
- `docsys_prepare_documentation` transforma un run en Markdown ASD-TSE-100, valida mecánicamente y publica automáticamente una edición inmutable y la vista `Actual` en Obsidian.
- Para preguntas sobre un servicio o una ruta concreta usa primero `docsys_explain_service` o `docsys_explain_endpoint`; consumen el flujo AST precalculado y compacto. Reserva `docsys_query` para inspecciones de hechos que no estén en esas respuestas.
- Para localizar un flujo por nombre funcional usa `docsys_find_flows`; para generar únicamente ese flujo usa `docsys_document_flow`. Esta operación escribe un solo Markdown en `Consultas` y no lee el repositorio ni reconstruye la bóveda completa.
- Para desarrollos, impacto, responsabilidades y migraciones usa la secuencia `docsys_search_documentation` → `docsys_prepare_analysis_context` → herramienta analítica específica. Amplía primero con `docsys_expand_document_context`, luego con `docsys_investigate_flow` y sólo después lee un fragmento mediante `docsys_read_source_evidence` y un `evidence_id` autorizado.
- `docsys_locate_capability` localiza la capacidad funcional; `docsys_trace_business_flow` reconstruye el flujo; `docsys_explain_responsibilities` separa responsabilidades observadas y explícitas; `docsys_analyze_change` calcula alcance, complejidad, criticidad y confianza; `docsys_assess_migration` genera transición y rollback.
- `docsys_prepare_proposal` consume preferiblemente `context_id`, `capability_id` y `analysis_id`, y deja ADRs, especificaciones y migraciones como borradores Markdown trazables en Obsidian.
- Ninguna ausencia documental autoriza a recorrer un repositorio. `docsys_investigate_flow` entrega hechos indexados y una lista de evidencias autorizadas; una ampliación general exige detenerse y solicitar permiso explícito.
- Los hechos, evidencias, limitaciones y contratos `schema_version: 3` son canónicos; el modelo no los modifica.
- Interpreta cada repositorio como un límite de sistema independiente. Una arista de consumo no significa propiedad, contención ni que el proveedor dependa del consumidor. Respeta `overrides.repository_metadata` para distinguir aplicaciones cliente, microservicios, APIs, bibliotecas y dominios organizacionales.
- La bóveda es acumulativa por repositorio. Analizar o publicar un repositorio nuevo no elimina los ya documentados; actualiza únicamente los repositorios incluidos y recompone mapas y relaciones con el catálogo vigente. Deshabilitar un repositorio impide analizarlo automáticamente, pero no autoriza borrarlo de Obsidian.
- Inventario, extracción, correlación, validación mecánica, consulta y publicación se realizan por código con cero IA.
- Los especialistas internos reciben contexto mínimo, sin fuentes, herramientas, MCP, red, rutas adicionales u otros agentes.
- Conserva ASD-TSE-100 en español y la skill real `archify-documentation`; `fallback` no significa ejecución externa.
- No concedas permisos, gasto fuerte ni decisiones de ADR/migración. La publicación factual de documentación es automática; las propuestas no se convierten en decisiones aprobadas.
- Obsidian es obligatorio. Azure Pipeline y Azure Repo son opt-in e independientes.
- No modifiques repositorios de aplicaciones ni instales/ejecutes sus dependencias.
- La única modificación Git permitida es el avance rápido solicitado mediante `docsys_refresh_knowledge`. Si la rama activa no coincide, hay cambios locales o el avance no es fast-forward, detente; nunca hagas checkout, reset, merge forzado ni stash.

Estas restricciones describen los agentes del producto. El desarrollo del propio motor sí modifica `src/`, esquemas, pruebas y documentación dentro de este repositorio.

==============================================================
Entrega una respuesta directa, de alta densidad informativa y sin rodeos. Evita introducciones, saludos, conclusiones o explicaciones obvias. Si necesitas explicar conceptos complejos, hazlo usando viñetas (bullet points) de una sola frase corta. Maximiza el valor de cada palabra para reducir el consumo de tokens
