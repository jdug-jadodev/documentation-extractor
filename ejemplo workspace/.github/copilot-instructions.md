# Instrucciones del sistema de documentación

Para consultar o documentar aplicaciones utiliza únicamente las herramientas `docsys_*` del servidor MCP local `sistema-documentacion`. No explores repositorios para sustituir el inventario del motor.

REGLA DE CORTE: si una herramienta `docsys_*` no está disponible, falla o no resuelve el pedido, informa la limitación y detente. Está prohibido usar `read`, `search`, búsquedas regex, terminal o abrir archivos Router/Handler como alternativa.

Para garantía estricta usa el agente personalizado `sistema-documentacion`. Si están disponibles `read`, `search` o terminal, detente e indica que el agente correcto no está seleccionado.

- Solo participan repositorios habilitados y miembros del workspace configurado.
- Si el estado es `Configuración pendiente`, no inicies análisis.
- Solo llama `docsys_prepare_analysis` cuando el usuario pida expresamente analizar o actualizar.
- Para preguntas sobre servicios o endpoints usa primero `docsys_explain_service` o `docsys_explain_endpoint`; evita cargar hechos masivos con `docsys_query` si el flujo compacto ya responde.
- Para localizar un flujo por nombre usa `docsys_find_flows`; para generar únicamente ese flujo usa `docsys_document_flow`, que trabaja sobre el índice y escribe un solo Markdown en `Consultas`.
- `docsys_prepare_documentation` genera, valida mecánicamente y publica la edición final en Obsidian.
- `docsys_prepare_proposal` deja ADR, especificación o migración como borrador.
- Conserva hechos, evidencias, limitaciones y estados `supported`, `candidate` y `unresolved`.
- No modifiques aplicaciones ni inventes contratos, dominios o propietarios. La publicación factual la realiza el motor automáticamente.
- `fallback` de Archify no significa ejecución de un adaptador externo.
