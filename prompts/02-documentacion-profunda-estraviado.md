# Documentación profunda de estraviado

```text
Crea un run nuevo únicamente para estraviado en main.

Usa solo las herramientas docsys_*.
No leas el repositorio directamente con herramientas de archivos.
No modifiques ni ejecutes la aplicación.

Genera una documentación arquitectónica profunda de estraviado en Obsidian.

Necesito que incluya:

- propósito observable del repositorio;
- tecnologías y dependencias;
- estructura de módulos y capas;
- pantallas, componentes, hooks y navegación;
- servicios internos;
- clases, funciones utilitarias y métodos, con firma, clase propietaria, llamadas observadas y explicación de qué hace cada uno;
- clientes HTTP y servicios externos;
- variables utilizadas para construir URLs;
- entidades y almacenamiento;
- flujos desde pantallas o puntos de entrada hasta servicios externos;
- integración con login-estraviado;
- integración con backend-elevacion;
- integración con Valhalla y Mapbox;
- elementos no soportados o excluidos;
- evidencias por archivo;
- relaciones candidate y unresolved;
- un Mermaid de arquitectura del servicio;
- un Markdown con Mermaid independiente por cada endpoint o flujo detectado;
- mapa explícito de consumo entre microservicios, conservando `candidate` y `unresolved`.

No llames “microservicio” a una clase o módulo llamado service.
No conviertas imports estáticos en una traza de ejecución confirmada.
Deja explícito lo que no se puede demostrar.

Al terminar, informa:
- run_id;
- archivos analizados, excluidos y no soportados;
- hechos y relaciones;
- documentos generados;
- ruta de la edición final en Obsidian;
- estado real de Archify.
```
