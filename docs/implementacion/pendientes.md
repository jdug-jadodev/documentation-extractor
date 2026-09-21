# Pendientes exactos

Estado de todos los casos: **pendiente; no ejecutado**.

## Aceptaciones funcionales

P01–P112: pendientes.

## Aceptaciones de migración Node

N01–N16: pendientes.

Los criterios completos permanecen en `SISTEMA-DOCUMENTACION-V4-NODE/01-PLAN-FINAL-DESARROLLO.md`; `tests/acceptance-catalog.ts` mantiene cada caso como `pending`.

## Pruebas adicionales escritas

- Escenario de varios repositorios en un mismo run.
- Camino dirigido con estado conservador.
- Destino no resuelto sin invención.
- Filtrado de relaciones incidentes.
- Superficie MCP de operaciones bajo demanda.
- Ausencia de herramientas MCP para aprobar o publicar.

## Ejecuciones que requieren autorización

1. Suite automatizada completa y evidencia P01–P112/N01–N16.
2. Pruebas adicionales de multirrepositorio y MCP.
3. Demo sintética y recorrido extremo a extremo sin IA.
4. Carga real de gramáticas WASM, incompatibilidad localizada y cancelación de worker.
5. `npm start`, `INICIAR.cmd` e `iniciar` desde rutas externas con espacios y tildes.
6. Revisión de ASD-TSE-100, enlaces, Mermaid y navegación en Obsidian.
7. Matriz Windows x64, Linux x64 y macOS Intel/Apple Silicon disponible.
8. Copilot CLI, perfiles, presupuesto, cancelación y resultados reales; ninguna llamada sin permiso específico.
9. MCP en Copilot CLI, VS Code e IntelliJ, incluido el aislamiento de herramientas.
10. Azure Pipelines/Azure Repo, solo si el usuario los elige.
11. Tareas programadas, solo con autorización separada.
12. Seguridad adversarial, rendimiento, caché, interrupción de publicación y recuperación.
13. Release mediante `scripts/release.mjs` cuando exista evidencia aprobada.

## Pendientes que requieren el workspace futuro

1. Importar el `.code-workspace` y confirmar cada raíz; ninguna raíz nueva se habilita por defecto.
2. Ejecutar preflight de Git, pertenencia, permisos, refs y alias.
3. Identificar stacks reales sin extrapolarlos desde fixtures.
4. Ejecutar un run individual y uno multirrepositorio.
5. Comprobar relaciones, flujo, comparación y propuesta sobre evidencia real.
6. Ejecutar piloto y medir cobertura.
7. Confirmar que repositorios deshabilitados siguen excluidos.
8. Completar T54–T56 y verificar la recuperación de los archivos heredados retirados desde el respaldo privado.

## Faltante documental

- No se recibió `SISTEMA-DOCUMENTACION-V4-NODE/03-QUE-NECESITO-DE-TI.md`; no se inventó su contenido.
