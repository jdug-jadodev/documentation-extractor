# Pendientes exactos

## Ya ejecutado

- Suite automatizada disponible: 38/38 superadas.
- Tipos y compilación del motor.
- Configuración separada de motor, workspace, estado privado y bóveda.
- Protocolo MCP `stdio`, listado de siete herramientas y consultas de estado.
- Run real de tres repositorios en `main`, sin checkout ni ejecución de aplicaciones.
- Consultas de endpoints, relaciones, flujo y propuesta `review_required`.
- Sesión real de GitHub Copilot confirmada por el usuario: estado, análisis explícito y consultas sobre un run existente, sin publicación ni modificación de aplicaciones.
- Propuestas de migración corregidas y reprobadas: campos de pruebas/decisiones no vacíos e identificadores únicos por solicitud.
- Generación ASD-TSE-100 corregida para documentos independientes por servicio, contratos HTTP observados, montajes Express, llamadas salientes y detalle trazable de todos los hechos.
- Publicación real en Obsidian completada y verificada por hashes: edición visible `2026-09-22T01-44-51-467Z-f2be5250e8`, 29 archivos de contenido, tres servicios y mapa de relaciones con etiquetas legibles.

## Aceptaciones aún pendientes

- P01–P112 y N01–N16 permanecen como `pending` en `tests/acceptance-catalog.ts` hasta ejecutar la campaña completa criterio por criterio. La prueba de que el catálogo contiene 128 IDs no equivale a aprobarlos.
- Demo sintética y revisión visual manual desde la aplicación Obsidian; el recorrido real de revisión, aprobación, publicación y verificación ya se completó.
- Completar y registrar por separado GitHub Copilot CLI, VS Code e IntelliJ; ya se comprobó una sesión real, pero falta identificar formalmente su superficie/versión y cubrir las otras variantes.
- Cualquier llamada real a Copilot y sus casos de presupuesto/cancelación.
- Matriz Windows/Linux/macOS completa y lanzadores desde instalaciones externas.
- Pruebas adversariales, rendimiento, caché, interrupción, rollback y recuperación.
- Azure Pipelines/Azure Repo y tareas programadas, solo si se activan expresamente.
- Release final mediante `scripts/release.mjs` cuando exista evidencia de aceptación aprobada.

## Pendientes funcionales observados

- Los tres bundles reales tienen calidad `partial`; ampliar parsers solo a partir de capacidades comprobadas en esos repositorios.
- La relación `estraviado → login-estraviado` es `candidate` porque la ruta coincide, pero la vinculación semántica del montaje Express requiere revisión humana o un alias aprobado.
- Abrir manualmente `C:\Users\Usuario\Documents\prueba-obsidian` en Obsidian y revisar visualmente la navegación; la apertura automática no encontró una asociación ejecutable.

## Faltante documental

- No se recibió `SISTEMA-DOCUMENTACION-V4-NODE/03-QUE-NECESITO-DE-TI.md`; no se inventó su contenido.
