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
  -> edición inmutable en Obsidian
```

El motor no ejecuta aplicaciones. Copilot es opcional y se conecta al mismo motor mediante MCP local por `stdio`; no existe una plataforma paralela ni un daemon permanente.

## Configuración pendiente

Mientras `knowledge.yaml` tenga `setup_status: configuration_pending`, ningún comando recorre aplicaciones. La falta del workspace no impide compilar, desarrollar extractores ni escribir pruebas.

## Capturas

`GitSnapshotReader` lee una rama o commit sin alterar HEAD, índice o working tree. `WorkingTreeSnapshotReader` solo acepta archivos elegidos expresamente, rechaza nombres sensibles, verifica estabilidad y marca la captura `dirty`; esa captura no puede compartirse hasta existir un commit y una revisión nueva.

## Datos privados

Cada ejecución vive en el `state_path` privado de la instalación, bajo `runs/<run-id>/`. Un run multirrepositorio conserva el snapshot y bundle separado de cada repo, además de un `scenario.json` y `graph.json` comunes. El estado privado no se guarda en el workspace ni sale en una edición.

## Ocho roles y skill

Se conservan Orquestador, Inventariador, Extractor, Integrador, Documentador, Revisor, Proponente y Publicador. No equivalen a ocho llamadas: inventario, extracción, grafo, validación y publicación son código. Los especialistas interpretativos reciben paquetes saneados con `tools: []`. `archify-documentation` aplica la estructura ASD-TSE-100 cuando corresponde.

## Copilot

El agente de entrada solo puede usar `docsys_*`. Puede consultar estado, listar repositorios, preparar un análisis solicitado, explicar relaciones, trazar flujos, consultar hechos, preparar propuestas y solicitar la documentación final. `docsys_prepare_documentation` valida y publica automáticamente; no hay herramientas de aprobar/publicar separadas. La carpeta contenedora del `.code-workspace` recibe solo la integración `.github` y `.vscode/mcp.json`; el motor y los repositorios de aplicaciones permanecen separados.

## Obsidian y compartición

El motor genera una bóveda candidata privada, aplica validaciones mecánicas y, si no existen errores o alertas de seguridad, crea una autorización automática ligada a hashes. El Publicador genera una edición inmutable y actualiza `Actual`. Los modos `local`, `folder` y `export` funcionan sin Azure. Azure permanece separado, opcional y desactivado.

## Estado de validación

La compilación, 42 pruebas automatizadas y un recorrido MCP real en Windows se completaron. El recorrido extrajo tres repositorios locales por sus commits `main`, sin ejecutar aplicaciones, y probó consulta, relación, flujo, documentación y publicación automática. Siguen pendientes la campaña completa P/N, especialistas instrumentados, Archify externo, Azure y la matriz Linux/macOS.
