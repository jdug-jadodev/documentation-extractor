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
  -> revisión y aprobación humana
  -> edición inmutable en Obsidian
```

El motor no ejecuta aplicaciones. Copilot es opcional y se conecta al mismo motor mediante MCP local por `stdio`; no existe una plataforma paralela ni un daemon permanente.

## Configuración pendiente

Mientras `knowledge.yaml` tenga `setup_status: configuration_pending`, ningún comando recorre aplicaciones. La falta del workspace no impide compilar, desarrollar extractores ni escribir pruebas.

## Capturas

`GitSnapshotReader` lee una rama o commit sin alterar HEAD, índice o working tree. `WorkingTreeSnapshotReader` solo acepta archivos elegidos expresamente, rechaza nombres sensibles, verifica estabilidad y marca la captura `dirty`; esa captura no puede compartirse hasta existir un commit y una revisión nueva.

## Datos privados

Cada ejecución vive en `.knowledge/runs/<run-id>/`. Un run multirrepositorio conserva el snapshot y bundle separado de cada repo, además de un `scenario.json` y `graph.json` comunes. `.knowledge` no sale en una edición.

## Ocho roles y skill

Se conservan Orquestador, Inventariador, Extractor, Integrador, Documentador, Revisor, Proponente y Publicador. No equivalen a ocho llamadas: inventario, extracción, grafo, validación y publicación son código. Los especialistas interpretativos reciben paquetes saneados con `tools: []`. `archify-documentation` aplica la estructura ASD-TSE-100 cuando corresponde.

## Copilot

El agente de entrada solo puede usar `docsys_*`. Puede consultar estado, listar repositorios, preparar un análisis solicitado, explicar relaciones, trazar flujos, consultar hechos y preparar propuestas. No puede aprobar ni publicar. Desde un workspace de aplicaciones no se copia `.github`: se registra el MCP como configuración de usuario y, opcionalmente, el perfil del Orquestador como agente personal.

## Obsidian y compartición

La revisión genera una bóveda candidata. Una acción humana crea un recibo ligado a hashes y el Publicador genera una edición nueva. Los modos `local`, `folder` y `export` funcionan sin Azure. Azure permanece separado, opcional y desactivado.

## Estado de validación

La compilación no equivale a validación. Ninguna prueba, demo, ejecución del sistema, piloto, apertura de Obsidian o llamada a Copilot ha sido realizada.
