# Progreso de implementación

Última actualización: 2026-09-21

Este registro separa código implementado, compilaciones, pruebas realizadas, pruebas pendientes y bloqueos reales. Una prueba automatizada superada no marca por sí sola todos los criterios P/N como aprobados.

## Código implementado

- T01–T56: motor único Node.js + TypeScript, contratos v3, snapshots Git sin checkout, inventario, parsers locales, ocho roles, ASD-TSE-100, Obsidian, revisión, propuestas, publicación controlada, CLI, lanzadores y MCP bajo demanda.
- Extractores preparados para .NET, Spring, JEE/WebLogic, Angular, React, Python y Node/Express; este último cubre rutas, montajes, `fetch` y acceso Supabase observable.
- Escenarios multirrepositorio, consultas, comparación, relaciones y flujos con estados `supported`, `candidate` y `unresolved`.
- Correlación HTTP conservadora por alias aprobado o por coincidencia única de método/ruta; una composición de router no demostrada queda como `candidate`.
- Siete herramientas MCP `docsys_*`; no existen herramientas MCP para aprobar o publicar.
- Instalación por workspace mediante `pnpm workspace:install`: coloca solamente `knowledge.yaml`, `.vscode/mcp.json`, `.mcp.json`, instrucciones, agente y skill junto al `.code-workspace`; la carpeta de control se añade como primera raíz sin autorizarla para análisis.
- Separación física: motor, workspace y bóveda Obsidian pueden estar en tres rutas diferentes. `state_path` mantiene runs, evidencias y propuestas dentro de la instalación del motor.
- Release preparada para incluir los archivos de integración; Azure sigue siendo opcional y está desactivado.

## Configuración real usada

- Motor: `C:\Users\Usuario\Documents\documentation-extractor`.
- Workspace: `C:\Users\Usuario\Documents\prueba-extractor\.code-workspace`.
- Configuración del workspace: `C:\Users\Usuario\Documents\prueba-extractor\knowledge.yaml`.
- Bóveda: `C:\Users\Usuario\Documents\prueba-obsidian`.
- Estado privado: `C:\Users\Usuario\Documents\documentation-extractor\.knowledge\workspaces\prueba-extractor`.
- Repositorios habilitados: `backend-elevacion`, `estraviado` y `login-estraviado`, todos en `main`.

## Compilaciones realizadas

- Node.js 24.21.0 x64 mediante NVM y pnpm 10.0.0.
- `node scripts/typecheck.mjs`: completado sin errores después de separar configuración y estado.
- `node scripts/build.mjs`: completado sin errores; `dist/` actualizado.
- Las dependencias del motor se instalaron con scripts de paquetes desactivados.

## Pruebas realizadas

- Suite automatizada disponible: **34/34 superadas**, 0 fallos, 0 omitidas.
- Transporte MCP `stdio`: negociación `2025-06-18`, servidor `sistema-documentacion` 4.0.0 y superficie exacta de siete herramientas.
- Estado MCP: configuración `configured`, tres repositorios y `automatic_analysis: false`.
- Run real MCP: `run-2026-09-22T00-20-57-986Z-scenario-backend-el`.
- Commits leídos sin checkout: `backend-elevacion` `56bb4626cec6bd406514d2719302cb90c17a5ab0`, `estraviado` `4a578fc2b42ff89db0292aace59a84ccc0be2b5e` y `login-estraviado` `c719eab48c4a0a29408cfc5de51c35ea1bca7e37`.
- Resultado observado: 100 hechos, 28 relaciones, 8 endpoints; los tres bundles quedaron `partial`.
- Relación y flujo `estraviado → login-estraviado`: un camino `candidate`, conservando la limitación de montaje del router.
- Propuesta MCP de migración: creada sobre el run existente con estado `review_required`.
- GitHub Copilot real, confirmado por el usuario: ejecutó `status`, preparó el run `run-2026-09-22T00-59-08-007Z-scenario-backend-el` y consultó endpoints, evidencias, relación y flujo sin reanalizar. Obtuvo 8 endpoints, 100 evidencias y un camino `candidate` de un salto entre `estraviado` y `login-estraviado`.
- En todas estas pruebas: 0 llamadas de IA, 0 publicaciones, 0 descargas de repositorios y 0 ejecuciones/builds de aplicaciones.

## Pruebas pendientes

- Ejecutar y documentar individualmente la campaña completa P01–P112 y N01–N16; el catálogo conserva sus estados `pending`.
- Demo sintética, revisión manual y publicación controlada en Obsidian.
- Completar la verificación diferenciada de GitHub Copilot en VS Code, CLI e IntelliJ. Ya existe una sesión real de Copilot confirmada por el usuario, pero todavía no se documentó la superficie/versión exacta ni se probaron las tres variantes.
- Llamadas reales a Copilot y validación de presupuesto, solamente con autorización específica.
- Linux x64, macOS Intel/Apple Silicon, lanzadores externos y rutas con espacios/tildes.
- Seguridad adversarial, rendimiento, caché, recuperación y rollback de publicación.
- Azure Pipelines/Azure Repo y tareas programadas, solamente si el usuario decide activarlos.

## Bloqueos reales

- Falta `SISTEMA-DOCUMENTACION-V4-NODE/03-QUE-NECESITO-DE-TI.md` en el paquete disponible.
- No hay entornos Linux/macOS ni clientes Copilot/Obsidian abiertos en esta validación.
- `scripts/release.mjs` exige evidencia de aceptación aprobada antes de producir una release declarada final.

## Estado de entrega

**Motor y servidor MCP probados en Windows; validación completa pendiente.**
