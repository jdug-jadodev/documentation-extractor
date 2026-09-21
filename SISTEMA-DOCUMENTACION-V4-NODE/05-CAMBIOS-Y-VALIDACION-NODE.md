---
id: DOCSYS-CAMBIOS-V4-NODE
version: 4.0.0
fecha: 2026-09-21
estado: revision-documental-completada
---

# Cambios a Node.js y comprobación del paquete

## 1. Qué se entregó

**Cinco documentos V3 corregidos íntegramente y este registro.** Usar juntos los archivos de V4 Node; no aplicar un anexo sobre un plan Python todavía activo. Los originales V3 no se sobrescribieron.

El paquete contiene planificación, instrucciones y guías: **no contiene el motor implementado, ejecutables, gramáticas WASM, dependencias npm instaladas ni resultados de pruebas del producto**. Los comandos y recursos citados indican lo que debe construir la IA implementadora en el proyecto real.

## 2. Cambios precisos

| Área | Antes, V3 | Ahora, V4 Node |
|---|---|---|
| Motor | Python 3.13. | Node.js 24 LTS y TypeScript compilado, con versiones exactas fijadas al implementar. |
| Fuentes y distribución | Módulos Python y entorno privado. | Módulos `src/**/*.ts`, JavaScript `dist/` y recursos de release incluidos. |
| Dependencias | Entorno virtual y lock Python. | `package.json`/`package-lock.json`, `node_modules` exclusivo del motor e instalación sin hooks. |
| Arranque | Lanzadores del intérprete anterior. | `npm start`, conservando `INICIAR.cmd` y `iniciar` como alternativas. |
| Comandos | Invocación como módulo Python. | `npm run docs -- ...`; CLI Node directa para jobs y JSON limpio. |
| Parseo | Binding Tree-sitter de Python. | `web-tree-sitter` y gramáticas WASM locales, verificadas e incluidas. |
| Procesos | subprocess. | Adaptador Node con binarios autorizados, argumentos separados, streams y cancelación comprobada por SO. |
| Trabajo intensivo | Implementación a concretar. | Pool acotado de workers, límites y hashes independientes del orden de finalización. |
| Pruebas | Suite pytest prevista. | `npm run typecheck`, `npm run build`, `npm test` y demo Node sin IA. |
| Subagentes | Roles sobre el coordinador anterior. | Mismos roles y contratos sobre coordinador Node; sin herramientas Python auxiliares. |
| Pipeline opcional | Ejecución del motor anterior. | Node y release preinstalados; sin clonar/exportar aplicaciones ni instalar durante el análisis. |
| Guías humanas | Instalación de Python. | Instalación de Node/npm; sin TypeScript global ni compiladores para usar el producto. |

## 3. Lo que no se eliminó

Se conservan los ocho roles, las cinco etapas, la plantilla ASD-TSE-100, la skill `archify-documentation`, los repositorios autorizados en un mismo workspace, Obsidian obligatorio, Azure opcional, las ramas/commits, cachés, evidencias, desconocidos y aprobación humana.

Los **56 identificadores de tareas T01–T56 y 112 pruebas P01–P112** se preservan. Se añaden **16 pruebas N01–N16**, para un total de **128 casos especificados**. La revisión explicita cuándo una prueba de integración depende de tareas posteriores, sin permitir resultados simulados para cerrarla.

**Los esquemas de datos siguen en versión 3:** la versión 4.0.0 identifica este paquete documental; no obliga a migrar los artefactos JSON solamente por cambiar de lenguaje.

**Python permanece como lenguaje a analizar:** las fuentes `.py` de demostración y el adaptador Flask/FastAPI/Django se conservan. Ese adaptador se implementa en TypeScript y lee código mediante WASM; no necesita ejecutar Python. Las menciones al runtime anterior solo documentan su sustitución o retirada.

## 4. Comprobaciones ejecutadas sobre estos archivos

| Comprobación documental | Resultado |
|---|---|
| Cinco archivos de origen procesados; contenido completo, no resúmenes. | Correcto. |
| Identificadores T01–T56 únicos, completos y en orden. | Correcto. |
| Identificadores P01–P112 conservados; N01–N16 únicos y completos. | Correcto. |
| Dependencias explícitas de tareas sin ciclos. | Correcto. |
| Contratos `schema_version: 3`/`schemas/v3` conservados. | Correcto. |
| Código de las tres muestras Python idéntico al material V3. | Correcto. |
| Sin comandos activos del motor Python, módulos `knowledge_engine` ni rutas de entorno virtual. | Correcto. |
| Módulos de salida del motor referidos como TypeScript. | Correcto. |
| Cabeceras YAML, ejemplos JSON, cierres de bloques y tablas Markdown. | Correcto. |
| Enlaces internos del paquete. | Correcto, verificados después de generar este registro. |
| ZIP nuevo e integridad de sus seis documentos. | Verificado al empaquetar. |

**Estas comprobaciones no son P01–P112 ni N01–N16:** esas pruebas del software deben implementarse y ejecutarse durante el desarrollo. No se ejecutó el motor en Windows, Linux o macOS, no se consumió Copilot para probarlo ni se modificó el código real del usuario.

## 5. Archivos completos incluidos

| Documento | Líneas V3 | Líneas V4 Node |
|---|---:|---:|
| [00-EMPEZAR-AQUI.md](00-EMPEZAR-AQUI.md) | 54 | 64 |
| [01-PLAN-FINAL-DESARROLLO.md](01-PLAN-FINAL-DESARROLLO.md) | 1516 | 1659 |
| [02-SUBAGENTES-CORREGIDOS.md](02-SUBAGENTES-CORREGIDOS.md) | 303 | 317 |
| [03-QUE-NECESITO-DE-TI.md](03-QUE-NECESITO-DE-TI.md) | 154 | 171 |
| [04-GUIA-DE-USO-Y-PRUEBAS.md](04-GUIA-DE-USO-Y-PRUEBAS.md) | 270 | 299 |

El aumento de líneas corresponde al contrato de instalación/compilación, portabilidad, procesos, WASM y las pruebas Node; no se sustituyeron capítulos funcionales por resúmenes.

## 6. Cómo aplicar la revisión

Entregar la carpeta completa y acceso local al sistema existente a la IA implementadora. Usar el prompt actualizado de `00-EMPEZAR-AQUI.md` y empezar por T01. Revisar primero §3.3, los comandos del §15 y la instalación del documento 03. El implementador debe portar las utilidades reales, conservar datos/permisos y pasar la matriz correspondiente antes de declarar compatibilidad.

No copiar estas especificaciones como si fueran agentes ya registrados ni crear `package-lock.json` con hashes inventados. La versión exacta de dependencias se resolverá, fijará y probará al implementar T02.

## 7. Base y verificación externa

Base: los cinco documentos completos del paquete V3 y la decisión posterior del usuario de utilizar Node.js + TypeScript. Las referencias nuevas oficiales están en §17.2 del plan: Node LTS/plataformas, TypeScript, npm, Tree-sitter WASM, procesos, workers, pruebas y Ajv. Los detalles funcionales de Obsidian, Azure y Copilot no se rediseñaron por cambiar el runtime.
