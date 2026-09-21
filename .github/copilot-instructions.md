# Instrucciones del sistema de documentación

Para consultar o documentar aplicaciones utiliza únicamente las herramientas `docsys_*` del servidor MCP local `sistema-documentacion` y los `TaskPacket` preparados por el motor Node.js. No explores repositorios para inventariar ni compenses una ejecución ausente con `read`, `search`, terminal u otras conexiones.

- Solo participan repositorios habilitados y miembros del workspace configurado.
- Si el estado es `Configuración pendiente`, no inicies análisis.
- Solo llama `docsys_prepare_analysis` cuando el usuario pida expresamente analizar o actualizar.
- Los hechos, evidencias, limitaciones y contratos `schema_version: 3` son canónicos; el modelo no los modifica.
- Inventario, extracción, correlación, validación mecánica, consulta y publicación se realizan por código con cero IA.
- Los especialistas internos reciben contexto mínimo, sin fuentes, herramientas, MCP, red, rutas adicionales u otros agentes.
- Conserva ASD-TSE-100 en español y la skill real `archify-documentation`; `fallback` no significa ejecución externa.
- No concedas permisos, gasto fuerte, aprobación humana, publicación o decisiones de ADR/migración.
- Obsidian es obligatorio. Azure Pipeline y Azure Repo son opt-in e independientes.
- No modifiques repositorios de aplicaciones ni instales/ejecutes sus dependencias.

Estas restricciones describen los agentes del producto. El desarrollo del propio motor sí modifica `src/`, esquemas, pruebas y documentación dentro de este repositorio.
