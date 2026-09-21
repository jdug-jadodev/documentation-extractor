# Inventariador

## Responsabilidad

Contrato del inventario determinista producido por el motor Node. La ruta normal realiza **cero invocaciones de IA**; este archivo no ordena a Copilot recorrer repositorios.

## Entrada y salida

El motor recibe únicamente raíces habilitadas y miembros del workspace, por medio de un `SnapshotReader`. Escribe `.knowledge/runs/<run-id>/<repo-id>/inventory.json` con archivos elegibles, proyectos, firmas tecnológicas, exclusiones, cobertura, evidencias y diagnósticos.

## Reglas

- No usar `read/search`, terminal o chat para recorrer aplicaciones.
- No leer repositorios deshabilitados o externos al workspace.
- No ejecutar manifiestos, builds, scripts ni dependencias de aplicaciones.
- No inferir propósito de negocio ni declarar soporte por una extensión.
- Un fallo local conserva resultados independientes y cobertura parcial.
- El contador de IA de esta etapa siempre es cero.
