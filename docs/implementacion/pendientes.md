# Pendientes exactos

## Ya ejecutado

- Suite automatizada disponible: 34/34 superadas.
- Tipos y compilación del motor.
- Configuración separada de motor, workspace, estado privado y bóveda.
- Protocolo MCP `stdio`, listado de siete herramientas y consultas de estado.
- Run real de tres repositorios en `main`, sin checkout ni ejecución de aplicaciones.
- Consultas de endpoints, relaciones, flujo y propuesta `review_required`.
- Sesión real de GitHub Copilot confirmada por el usuario: estado, análisis explícito y consultas sobre un run existente, sin publicación ni modificación de aplicaciones.

## Aceptaciones aún pendientes

- P01–P112 y N01–N16 permanecen como `pending` en `tests/acceptance-catalog.ts` hasta ejecutar la campaña completa criterio por criterio. La prueba de que el catálogo contiene 128 IDs no equivale a aprobarlos.
- Demo sintética y recorrido de revisión/publicación en Obsidian.
- Completar y registrar por separado GitHub Copilot CLI, VS Code e IntelliJ; ya se comprobó una sesión real, pero falta identificar formalmente su superficie/versión y cubrir las otras variantes.
- Cualquier llamada real a Copilot y sus casos de presupuesto/cancelación.
- Matriz Windows/Linux/macOS completa y lanzadores desde instalaciones externas.
- Pruebas adversariales, rendimiento, caché, interrupción, rollback y recuperación.
- Azure Pipelines/Azure Repo y tareas programadas, solo si se activan expresamente.
- Release final mediante `scripts/release.mjs` cuando exista evidencia de aceptación aprobada.

## Pendientes funcionales observados

- Los tres bundles reales tienen calidad `partial`; ampliar parsers solo a partir de capacidades comprobadas en esos repositorios.
- La relación `estraviado → login-estraviado` es `candidate` porque la ruta coincide, pero la vinculación semántica del montaje Express requiere revisión humana o un alias aprobado.
- Revisar manualmente en Obsidian la estructura ASD-TSE-100 antes de cualquier publicación.

## Faltante documental

- No se recibió `SISTEMA-DOCUMENTACION-V4-NODE/03-QUE-NECESITO-DE-TI.md`; no se inventó su contenido.
