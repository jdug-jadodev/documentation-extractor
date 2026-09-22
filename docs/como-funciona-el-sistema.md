# Cómo funciona el sistema V4 Node

```text
Petición explícita por menú, CLI o MCP
  -> workspace y repositorios autorizados
  -> preflight
  -> una o varias capturas Git sin checkout
  -> inventario + parsers Node/WASM
  -> hechos/evidencias por repositorio
  -> escenario y grafo común
  -> consulta, relación, flujo, comparación o propuesta
  -> DocumentModel ASD-TSE-100
  -> validación mecánica
  -> edición canónica vigente en Obsidian
```

El motor no ejecuta aplicaciones. Copilot es opcional y se conecta al mismo motor mediante MCP local por `stdio`; no existe una plataforma paralela ni un daemon permanente.

## Configuración pendiente

Mientras `knowledge.yaml` tenga `setup_status: configuration_pending`, ningún comando recorre aplicaciones. La falta del workspace no impide compilar, desarrollar extractores ni escribir pruebas.

## Capturas

`GitSnapshotReader` lee una rama o commit sin alterar HEAD, índice o working tree. `WorkingTreeSnapshotReader` solo acepta archivos elegidos expresamente, rechaza nombres sensibles, verifica estabilidad y marca la captura `dirty`; esa captura no puede compartirse hasta existir un commit y una revisión nueva.

## Actualización incremental

`docsys_refresh_knowledge` es la operación canónica después de un commit. Comprueba la rama activa y que el árbol esté limpio, ejecuta `fetch` y solo aplica `pull --ff-only` cuando el remoto cambió. Nunca cambia de rama ni descarta trabajo local.

El commit del último run se compara con el commit sincronizado. Sin cambios se reutiliza el run y no se regenera nada. Con cambios se obtiene el diff Git: los parsers leen los archivos agregados o modificados y los importadores afectados; los hechos intactos se rebasan al snapshot nuevo sin releer sus fuentes; los hechos de archivos modificados o eliminados desaparecen antes de incorporar los nuevos. El grafo y la edición completa se reconstruyen con ambos conjuntos, de modo que `Actual` nunca mezcla dos versiones. Un cambio de manifiesto fuerza el análisis completo de ese repositorio.

Este mecanismo reduce trabajo determinista y, sobre todo, el contexto que necesitaría una interpretación posterior de IA. No promete un número fijo de tokens: el consumo real depende del cliente/modelo, pero la IA puede consultar hechos y relaciones ya indexados sin recibir nuevamente el repositorio entero.

## Datos privados

Cada ejecución vive en el `state_path` privado de la instalación, bajo `runs/<run-id>/`. Un run multirrepositorio conserva el snapshot y bundle separado de cada repo, además de un `scenario.json` y `graph.json` comunes. El estado privado no se guarda en el workspace ni sale en una edición.

## Ocho roles y skill

Se conservan Orquestador, Inventariador, Extractor, Integrador, Documentador, Revisor, Proponente y Publicador. No equivalen a ocho llamadas: inventario, extracción, grafo, validación y publicación son código. Los especialistas interpretativos reciben paquetes saneados con `tools: []`. `archify-documentation` aplica la estructura ASD-TSE-100 cuando corresponde.

## Copilot

El agente de entrada solo puede usar `docsys_*`. Puede actualizar el conocimiento con `docsys_refresh_knowledge`, consultar estado, listar repositorios, preparar una captura sin publicar, explicar relaciones, trazar flujos, consultar hechos, preparar propuestas y solicitar la documentación final. `docsys_refresh_knowledge` sincroniza, analiza y publica en una sola operación; `docsys_prepare_documentation` publica un run ya existente. No hay herramientas de aprobar/publicar separadas. La carpeta contenedora del `.code-workspace` recibe solo la integración `.github` y `.vscode/mcp.json`; el motor y los repositorios de aplicaciones permanecen separados.

## Obsidian y compartición

El motor genera una bóveda candidata privada, aplica validaciones mecánicas y, si no existen errores o alertas de seguridad, crea una autorización automática ligada a hashes. El Publicador reemplaza `Actual`, conserva una sola edición canónica en `Publicaciones` y elimina la anterior después de promover correctamente la nueva. Los modos `local`, `folder` y `export` funcionan sin Azure. Azure permanece separado, opcional y desactivado.

## Estado de validación

La compilación, 45 pruebas automatizadas y un recorrido MCP real en Windows se completaron. El recorrido extrajo tres repositorios locales por sus commits `main`, sin ejecutar aplicaciones, y probó consulta, relación, flujo, documentación y publicación automática. La sincronización incremental se comprobó con repositorios Git sintéticos; todavía no se ha ejecutado contra los tres repositorios reales. Siguen pendientes la campaña completa P/N, especialistas instrumentados, Archify externo, Azure y la matriz Linux/macOS.
