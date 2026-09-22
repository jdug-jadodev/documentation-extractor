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
- Generación Obsidian corregida para producir un modelo ASD-TSE-100 independiente por repositorio, representar endpoints fragmentarios y llamadas HTTP salientes, registrar montajes Express y conservar tipo/valor/evidencia de todos los hechos extraídos.

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
- `node scripts/typecheck.mjs` y `node scripts/build.mjs`: repetidos sin errores tras corregir la generación multirrepositorio para Obsidian.
- Las dependencias del motor se instalaron con scripts de paquetes desactivados.

## Pruebas realizadas

- Suite automatizada disponible: **38/38 superadas**, 0 fallos, 0 omitidas.
- Transporte MCP `stdio`: negociación `2025-06-18`, servidor `sistema-documentacion` 4.0.0 y superficie exacta de siete herramientas.
- Estado MCP: configuración `configured`, tres repositorios y `automatic_analysis: false`.
- Run real MCP: `run-2026-09-22T00-20-57-986Z-scenario-backend-el`.
- Commits leídos sin checkout: `backend-elevacion` `56bb4626cec6bd406514d2719302cb90c17a5ab0`, `estraviado` `4a578fc2b42ff89db0292aace59a84ccc0be2b5e` y `login-estraviado` `c719eab48c4a0a29408cfc5de51c35ea1bca7e37`.
- Resultado observado: 100 hechos, 28 relaciones, 8 endpoints; los tres bundles quedaron `partial`.
- Relación y flujo `estraviado → login-estraviado`: un camino `candidate`, conservando la limitación de montaje del router.
- Propuesta MCP de migración: creada sobre el run existente con estado `review_required`.
- GitHub Copilot real, confirmado por el usuario: ejecutó `status`, preparó el run `run-2026-09-22T00-59-08-007Z-scenario-backend-el` y consultó endpoints, evidencias, relación y flujo sin reanalizar. Obtuvo 8 endpoints, 100 evidencias y un camino `candidate` de un salto entre `estraviado` y `login-estraviado`.
- Hallazgo corregido durante el piloto: las propuestas `migration` ya no dejan vacíos `acceptance_criteria`, `tests` ni `pending_decisions`; generan contenido conservador desde los tipos/estados de arista sin inventar cuerpos o códigos HTTP.
- Hallazgo corregido durante el piloto: cada propuesta usa ahora `proposal-<hash>` estable y único; solicitudes diferentes del mismo run no se sobrescriben.
- Reprueba MCP sobre el run existente: `proposal-51cc98018dc3d6214a5d564c`, `review_required`, 3 criterios de aceptación, 3 pruebas y 14 decisiones pendientes; no hubo reanálisis.
- Run real de publicación: `run-2026-09-22T01-31-36-203Z-scenario-backend-el`, con las siete etapas deterministas `completed`, 100 hechos, 28 relaciones y 0 llamadas de IA.
- Revisión del candidato: 0 incidencias; se detectó manualmente y corrigió la duplicación del documento global en cada servicio y la omisión de endpoints Express en la sección de contratos.
- Edición Obsidian visible: `2026-09-22T01-44-51-467Z-f2be5250e8`, 29 archivos de contenido con manifiesto completo. Verificación posterior de hashes: `status: complete`. La primera edición `2026-09-22T01-39-25-249Z-a419df6729` se conserva como historial inmutable.
- La publicación contiene documentos separados para `backend-elevacion` (11 hechos), `estraviado` (56 hechos) y `login-estraviado` (33 hechos), además de `Mapas/relaciones.md` con el grafo Mermaid y sus 28 aristas.
- El mapa y las tablas de arquitectura muestran etiquetas legibles (`users`, `password_tokens`, `express`, `${BACKEND_URL}`, etc.) en lugar de identificadores internos `node-*`.
- No se descargaron repositorios ni se ejecutaron/buildaron aplicaciones. La publicación autorizada se limitó a `C:\Users\Usuario\Documents\prueba-obsidian`.

## Pruebas pendientes

- Ejecutar y documentar individualmente la campaña completa P01–P112 y N01–N16; el catálogo conserva sus estados `pending`.
- Demo sintética y revisión visual manual dentro de la aplicación Obsidian. La revisión estructural, aprobación, publicación y verificación criptográfica ya se ejecutaron.
- Completar la verificación diferenciada de GitHub Copilot en VS Code, CLI e IntelliJ. Ya existe una sesión real de Copilot confirmada por el usuario, pero todavía no se documentó la superficie/versión exacta ni se probaron las tres variantes.
- Llamadas reales a Copilot y validación de presupuesto, solamente con autorización específica.
- Linux x64, macOS Intel/Apple Silicon, lanzadores externos y rutas con espacios/tildes.
- Seguridad adversarial, rendimiento, caché, recuperación y rollback de publicación.
- Azure Pipelines/Azure Repo y tareas programadas, solamente si el usuario decide activarlos.

## Bloqueos reales

- Falta `SISTEMA-DOCUMENTACION-V4-NODE/03-QUE-NECESITO-DE-TI.md` en el paquete disponible.
- No hay entornos Linux/macOS. El motor no pudo abrir Obsidian automáticamente porque no encontró una asociación ejecutable; la bóveda publicada se abre manualmente como `C:\Users\Usuario\Documents\prueba-obsidian`.
- `scripts/release.mjs` exige evidencia de aceptación aprobada antes de producir una release declarada final.

## Estado de entrega

**Motor, servidor MCP y publicación Obsidian probados en Windows; validación multiplataforma y campaña completa pendientes.**
