# Pendientes exactos

## Ya ejecutado

- Tipos, compilación y suite automatizada: 59/59 pruebas superadas.
- Configuración separada de motor, workspace, estado privado y bóveda.
- Run real de los tres repositorios en `main`, sin checkout ni ejecución de aplicaciones.
- Extracción de módulos, clases, funciones, métodos, firmas, llamadas observadas, capas, imports, tecnologías, paquetes, scripts, rutas Express, handlers, datos y llamadas salientes.
- Generación y publicación automática de fichas por servicio, Mermaid de servicio, Mermaid por entrada/salida HTTP y mapas de relaciones.
- Edición vigente `2026-09-22T17-15-52-515Z-be7c633cf0`, copiada a `Actual` y verificada por hashes con `status: complete` (29 archivos).
- El publicador genera el filtro del grafo para ocultar históricos, borradores y staging.
- MCP comprobado con 23 herramientas; incluye recuperación documental, contexto, capacidades, impacto, migración, investigación limitada y propuestas trazables.
- Sincronización incremental comprobada con Git sintético: fast-forward, diff de una clase, reutilización del archivo intacto, no-op sin commit nuevo y bloqueo ante cambios locales.
- Retención de Obsidian comprobada en una bóveda temporal: solo permanece la edición canónica más reciente y `Actual` contiene el contenido nuevo.

## Aceptaciones aún pendientes

- Ejecutar `docsys_refresh_knowledge` cuando se quiera promover los resultados a la bóveda principal; los runs antiguos no incorporan retroactivamente `source-architecture: 2.1.0`, WebFlux ni las nuevas vistas.
- Ejecutar `docsys_refresh_knowledge` contra el workspace real después de un commit remoto nuevo y revisar la sustitución de `Actual` en Obsidian; hasta ahora el ciclo fetch/pull/diff incremental se validó únicamente con repositorios Git sintéticos.
- Confirmar permisos y política de parches en el propio PC empresarial; Node 20.19.5 conserva compatibilidad declarada y Node 24.21.0 pasó tipos, build, 59/59 pruebas y smoke MCP local.
- P01–P112 y N01–N16 permanecen como `pending`; 46 pruebas automatizadas no equivalen a completar 128 criterios de aceptación.
- Revisión visual humana del contenido actual en Obsidian.
- Aplicar en la vista gráfica `-path:Publicaciones -path:Borradores -path:.staging`, o cerrar Obsidian antes de la siguiente publicación; la aplicación abierta sobrescribió el filtro generado.
- Prueba real de los seis especialistas interpretativos mediante Copilot CLI, incluyendo presupuesto, caché, cancelación y reanudación.
- Pruebas separadas de GitHub Copilot en VS Code, CLI e IntelliJ.
- Ejecución de un adaptador externo Archify; el fallback Mermaid no cuenta como tal.
- Matriz Windows/Linux/macOS, pruebas adversariales, rendimiento, recuperación y rollback.
- Azure y tareas programadas, únicamente si se activan expresamente.
- Release final mediante `scripts/release.mjs` cuando exista evidencia suficiente de aceptación.

## Limitaciones funcionales observadas

- Los tres bundles tienen calidad `partial`; archivos no soportados, excluidos o dinámicos pueden contener comportamiento no extraído.
- Los caminos internos nuevos representan llamadas AST resueltas desde endpoint o pantalla; siguen siendo análisis estático, no telemetría, y conservan como candidatos o no resueltos los enlaces que no pueden demostrarse.
- La relación `estraviado → login-estraviado` sigue como `candidate`; método y ruta coinciden, pero el montaje no pudo confirmarse estáticamente.
- Varias llamadas a Valhalla, Mapbox, keepalive y variables de backend siguen `unresolved` cuando no existe una identidad única o un alias explícito configurado.
- Sin Copilot CLI y modelo configurado no hay prosa interpretativa de especialistas; la edición vigente contiene hechos y derivados deterministas.

## Faltante documental

- No se recibió `SISTEMA-DOCUMENTACION-V4-NODE/03-QUE-NECESITO-DE-TI.md`; no se inventó su contenido.
