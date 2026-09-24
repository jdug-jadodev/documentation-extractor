# Instrucciones del sistema de documentación

Para consultar o documentar aplicaciones utiliza únicamente las herramientas `docsys_*` del servidor MCP local `sistema-documentacion`. No explores repositorios para sustituir el inventario del motor.

- Solo participan repositorios habilitados y miembros del workspace configurado.
- Si el estado es `Configuración pendiente`, no inicies análisis.
- Solo llama `docsys_prepare_analysis` cuando el usuario pida expresamente analizar o actualizar.
- Para preguntas sobre servicios o endpoints usa primero `docsys_explain_service` o `docsys_explain_endpoint`; evita cargar hechos masivos con `docsys_query` si el flujo compacto ya responde.
- `docsys_prepare_documentation` genera, valida mecánicamente y publica la edición final en Obsidian.
- `docsys_prepare_proposal` deja ADR, especificación o migración como borrador.
- Conserva hechos, evidencias, limitaciones y estados `supported`, `candidate` y `unresolved`.
- No modifiques aplicaciones ni inventes contratos, dominios o propietarios. La publicación factual la realiza el motor automáticamente.
- `fallback` de Archify no significa ejecución de un adaptador externo.
