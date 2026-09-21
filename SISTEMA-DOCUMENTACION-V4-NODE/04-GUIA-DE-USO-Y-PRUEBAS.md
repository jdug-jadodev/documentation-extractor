---
id: DOCSYS-GUIA-V4-NODE
version: 4.0.0
fecha: 2026-09-21
estado: funcionamiento-que-debe-implementarse
---

# Guía de funcionamiento, uso y pruebas — Node.js

**Esta guía describe el sistema una vez implementado.** Los nombres de sus menús y lanzadores son requisitos del desarrollo, no funciones ya añadidas al prototipo. La IA implementadora debe ejecutar y verificar esta guía antes de entregar el producto.

## 1. Qué hace cada pieza

| Pieza | Explicación |
|---|---|
| Repositorios | Son tus proyectos existentes; no se mueven dentro del sistema. |
| Workspace | Reúne las carpetas de esos proyectos en una configuración común. |
| Motor Node.js | Ejecuta el programa ya compilado, lee archivos/versiones y obtiene datos comprobables sin IA. |
| Agentes | Explican y redactan cuando los datos por sí solos no bastan. |
| Bóveda | Carpeta con la documentación generada y aprobada. |
| Obsidian | Aplicación donde lees la bóveda, buscas información y sigues enlaces. |
| Edición | Conjunto de documentos aprobado en un momento concreto. |

```text
Proyectos del workspace
        ↓
Motor obtiene datos y relaciones
        ↓
Agentes redactan lo necesario
        ↓
Tú revisas
        ↓
Obsidian muestra la edición aprobada
```

Leer una edición en Obsidian no vuelve a examinar el código ni llama a Copilot. Actualizar documentación sí puede necesitar IA; el sistema debe mostrarlo antes de iniciarla.

## 2. Primera configuración

### Paso A — Abrir el programa

En Windows, Linux o macOS, abre una terminal en la carpeta del sistema implementado y ejecuta **`npm start`**. Como alternativa, en Windows haz doble clic en `INICIAR.cmd`; en macOS/Linux ejecuta `./iniciar`. Las tres entradas abren el mismo menú. No ejecutes estos comandos dentro de un microservicio.

Si falta un programa, aparecerá su nombre y cómo comprobarlo. No se inicia un análisis para diagnosticar la instalación. Sigue `03-QUE-NECESITO-DE-TI.md` para instalar únicamente lo necesario.

Si es la primera ejecución y faltan dependencias, el programa te mostrará lo que necesita descargar y pedirá autorización. Después instalará únicamente las del motor y abrirá el asistente. Los arranques posteriores no compilan, reinstalan ni consumen IA. Si falta el motor compilado, la release está incompleta: debe corregirla quien desarrolla el sistema.

**Windows:** si la terminal indica que `npm.ps1` está bloqueado, utiliza `npm.cmd start` o el lanzador; no cambies políticas corporativas. **macOS/Linux:** si `./iniciar` no tiene permiso de ejecución al descomprimir, utiliza `npm start` desde esa misma carpeta.

### Paso B — Elegir el workspace

Selecciona el `.code-workspace` que ya usas. El asistente mostrará las carpetas que contiene. Cuando no exista uno, elige las carpetas ya clonadas; el asistente generará el archivo.

**No hay que mover los repositorios ni clonarlos otra vez.** Deben estar declarados en el mismo workspace y autorizados. Abrir una carpeta nueva no la habilita automáticamente para analizarse.

### Paso C — Confirmar permisos

Comprueba que `gestor_novedades-ms` conserve su autorización y que un repositorio deshabilitado siga deshabilitado. El asistente no debe activar `asistencia-core` solamente para completar una demostración.

Confirma las ramas principales detectadas. Para el trabajo cotidiano se ofrecerá la rama actual o la última selección, siempre mostrándola antes de comenzar.

### Paso D — Elegir la bóveda

Para empezar, acepta `boveda/` o elige otra carpeta local. No selecciones una carpeta que contenga los repositorios de aplicaciones. Más adelante puedes configurar un destino compartido.

### Paso E — Configurar Copilot y guardar

El asistente comprueba la CLI y tu sesión. Elige un modelo permitido; el modelo fuerte queda desactivado. Puedes posponer este paso y realizar la demostración sin IA. En ese caso, la generación que necesite interpretar quedará pendiente, no utilizará otra cuenta ni otro modelo por su cuenta.

Revisa el resumen y guarda. No se volverán a preguntar las mismas rutas en cada inicio.

## 3. Menú de uso cotidiano

```text
DOCUMENTACIÓN DEL EQUIPO

1. Actualizar documentación
2. Abrir Obsidian
3. Configurar

Hay <cantidad> revisiones pendientes.
Última publicación: <fecha> · <repositorios y ramas>.
Más opciones: consultar datos, propuestas, pruebas, historial y compartir.
0. Salir
```

La pantalla debe funcionar con números y mensajes cortos. Las opciones avanzadas no obligan a aprender comandos.

## 4. Primera prueba: sin repositorios reales ni consumo de IA

Selecciona **Más opciones → Pruebas → Probar con ejemplos**.

El sistema creará dos repositorios ficticios en una carpeta de demostración y su propio workspace. No los añadirá al workspace real sin autorización ni tocará aplicaciones existentes. Los ejemplos contienen código Python de FastAPI/httpx únicamente para lectura por el motor Node; no necesitas Python ni instalar o ejecutar esos servicios.

| Acción en la prueba | Resultado esperado |
|---|---|
| Analizar `demo-productor` y `demo-consumidor`, ambos en `master`. | Tres endpoints en total y una relación HTTP entre componentes. |
| Consultar la tabla de endpoints. | Se muestran ruta, método, repositorio, rama y evidencia. |
| Elegir `feature/notificaciones` para el productor. | Cuatro endpoints en total, incluido el nuevo `GET /novedades/estado`. |
| Comparar esa rama con `master`. | Una incorporación; la rama abierta no cambia. |
| Repetir sin modificaciones. | Datos reutilizados; cero nuevas invocaciones de IA. |
| Generar la ficha demostrativa y abrirla en Obsidian. | Índice, contratos, relación y aviso «datos sintéticos, sin interpretación IA». |

Los tres endpoints iniciales son `POST /novedades`, `GET /novedades/{id}` y `GET /resumen/{id}`. No son hallazgos de tu servicio real: forman parte del caso controlado incluido en el desarrollo.

**Resultado visible exigido:** el programa indicará qué comprobaciones pasaron y cuáles fallaron. No basta con mostrar un mensaje genérico de éxito. Esta prueba verifica el motor y la bóveda; no demuestra que la integración real con Copilot funcione.

## 5. Primera actualización de un repositorio real

### Paso A — Seleccionar un alcance pequeño

Elige **Actualizar documentación**, selecciona `gestor_novedades-ms` y un alcance inicial concreto, por ejemplo contratos HTTP. Verifica el nombre de la rama y el commit mostrado.

Cuando haya cambios sin guardar en Git, el sistema ofrecerá:

| Elección | Resultado |
|---|---|
| Documentar el último commit de la rama elegida. | Resultado reproducible para esa versión. |
| Incluir cambios locales. | Borrador privado identificado; no se comparte como versión aprobada del repositorio. |
| Cancelar. | No cambia tu trabajo ni la edición publicada. |

Un archivo sin guardar en el editor no está todavía en disco: guárdalo antes de solicitar un borrador local que deba incluirlo.

### Paso B — Obtener datos

El motor mostrará archivos procesados, capacidades soportadas y problemas. Esto no utiliza IA. Un error en un archivo no debe borrar los resultados correctos de otros archivos.

«No se pudo analizar mensajería» no significa «el servicio no utiliza mensajería». Esa diferencia debe aparecer en la documentación.

### Paso C — Decidir si se utiliza IA

Cuando haga falta redactar o interpretar, verás el trabajo propuesto, los modelos y el máximo de invocaciones autorizable. El límite inicial es ocho por ejecución, incluidas correcciones; **no equivale a ocho créditos ni garantiza un precio fijo**.

Puedes autorizar la generación o conservar solo los datos y dejar la interpretación pendiente. No se habilita razonamiento fuerte ni alcance completo en silencio.

### Paso D — Revisar en Obsidian

El sistema abrirá una bóveda temporal de revisión, distinta de la compartida. Llevará un aviso visible de borrador. Comprueba:

| Pregunta de revisión | Dónde mirar |
|---|---|
| ¿Es el proyecto y la rama correctos? | Encabezado del documento. |
| ¿Las APIs corresponden al código analizado? | Contratos y referencias de archivos. |
| ¿Las relaciones están justificadas? | Dependencias, entorno y evidencias. |
| ¿Se identifican limitaciones? | Cobertura, desconocidos y revisión. |
| ¿Se conservaron todas las secciones obligatorias? | `document.md`, no solo el resumen. |
| ¿Hay decisiones propuestas tratadas como hechos? | Clasificación y estado de las propuestas. |

Vuelve al menú y elige **Aprobar y publicar** o **Dejar pendiente**. Si quieres correcciones, regístralas en la revisión; no edites silenciosamente los archivos generados y después apruebes una versión diferente.

### Paso E — Incorporar la edición

El programa valida la aprobación, crea la nueva edición documental y actualiza el índice. Si cambió un archivo después de aprobar, bloqueará la publicación hasta revisar la versión nueva.

Aprobar una documentación que describe un ADR propuesto no significa aprobar automáticamente la decisión del ADR. Esas decisiones conservan su estado propio.

## 6. Leer y buscar con Obsidian

La primera vez, en Obsidian selecciona **Open folder as vault / Abrir carpeta como bóveda**, elige `boveda/` y abre `Inicio.md`. En las siguientes ocasiones utiliza **Abrir Obsidian** desde el menú. Obsidian trabaja con los archivos de la carpeta; no hay que importar cada nota por separado. [U1, U2]

Desde el índice irás a **edición actual → repositorio → rama → tema**. El documento completo se llama `document.md`; las fichas numeradas permiten ir directamente a contratos, dependencias, datos o decisiones.

El grafo de Obsidian representa enlaces entre notas, no conexiones de microservicios descubiertas por la aplicación. El motor generará los enlaces y diagramas técnicos; habrá tablas con evidencias además del dibujo. [U3]

Las ediciones anteriores se conservan para recuperar información. Una búsqueda global puede encontrarlas también: mira siempre la edición, rama y commit del resultado. Para limitar la búsqueda, usa el filtro de ruta de la edición actual que mostrará el índice; por ejemplo `path:"Publicaciones/<edicion>/" novedades`, sustituyendo `<edicion>` por el valor real. No presentes un resultado antiguo como vigente. [U4]

**Notas personales:** escríbelas en `Mis-notas/`. No se convierten automáticamente en hechos del código ni autorizan nuevas publicaciones. No uses esa carpeta para guardar secretos.

## 7. Consultar otra rama sin alterar tu trabajo

Para obtener datos, selecciona **Más opciones → Consultar datos**, luego repositorio, rama y categoría. El sistema informará qué captura utiliza y si existe documentación aprobada para ella.

Para actualizar una rama diferente, selecciona esa rama en **Actualizar documentación**. El motor leerá los objetos Git del commit correspondiente, sin hacer checkout, crear otro clon ni cambiar tu directorio de trabajo.

| Situación | Comportamiento esperado |
|---|---|
| La rama existe localmente. | Se resuelve su commit y se analiza esa versión. |
| Solo existe una referencia remota ya descargada. | Se muestra exactamente esa referencia y su commit; no se promete que sea el último del servidor. |
| La rama no está disponible en la copia local. | Se informa que falta; no se sustituye por `master`. |
| Solicitas varios servicios con ramas diferentes. | Se muestra la combinación exacta de versiones; no se llama «producción». |
| Otra rama contiene más funcionalidades. | Sus resultados se conservan separados; no se mezclan con la rama principal. |

Actualizar tus repositorios desde sus servidores es una acción distinta del análisis. El sistema no hará `pull`, resolverá conflictos ni moverá ramas por su cuenta. La lectura de objetos versionados se implementa con operaciones Git de consulta. [U5]

## 8. Compartir sin Azure

### Carpeta sincronizada existente

Configura **Más opciones → Compartir** y selecciona la carpeta corporativa autorizada. El sistema utilizará ese destino para las ediciones aprobadas. Debe haber una sola máquina publicadora de los archivos generados.

La otra persona necesita tener los archivos descargados completamente, abrir esa carpeta en Obsidian y entrar por `Inicio.md`. No necesita tus aplicaciones, Copilot ni el motor. La aplicación y el servicio de sincronización son piezas distintas. [U1, U6]

No compartas la carpeta completa del sistema: `.knowledge`, `node_modules`, `dist`, registros, credenciales y repositorios no forman parte de la bóveda distribuible. Tampoco es necesario sincronizar preferencias personales `.obsidian`.

### Exportar una edición

Elige **Compartir → Exportar edición**, comprueba el destino y entrega el ZIP o carpeta generados. El receptor descomprime todo antes de abrirlo. Para actualizarlo posteriormente tendrás que entregar una nueva edición.

### Si la sincronización va lenta o se corta

No se garantiza que un servicio externo transfiera todos los archivos al mismo tiempo. Si el índice nuevo aparece antes que sus documentos, espera a que termine la sincronización o abre la edición anterior conservada. No apruebes una edición basándote en archivos que aún no llegaron.

Para una transferencia controlada, exporta una edición completa y ábrela después de finalizar la copia. El producto incluirá una comprobación de manifiesto para quienes tengan el motor; los lectores normales no están obligados a instalarlo.

No borres ediciones antiguas manualmente mientras se comparten. Utiliza **Historial → Limpiar ediciones**, revisa la lista y confirma; la vigente y la anterior están protegidas por defecto.

## 9. Volver a una edición anterior

Selecciona **Más opciones → Historial**, identifica la edición por fecha, repositorios y commits, y elige **Restaurar como visible**. El programa validará que la edición esté completa y pedirá confirmación antes de cambiar el índice.

Esta acción restaura la documentación visible, no cambia ramas ni archivos de tus aplicaciones. La edición más reciente no se borra automáticamente. Ante un conflicto de archivos generados, se detiene la operación en lugar de sobrescribir cambios humanos.

## 10. Solicitar especificaciones, migraciones o ADRs

Selecciona **Más opciones → Propuestas**, indica el tipo, los repositorios/ramas y el objetivo. El sistema recupera documentación pertinente y muestra el trabajo IA necesario.

Una propuesta contendrá lo que se sabe, lo que se recomienda y lo que necesita decisión. Las migraciones deben incluir fases y reversión; las especificaciones, aceptación y pruebas; los ADRs, alternativas y consecuencias. El sistema no implementa esas propuestas en las aplicaciones ni las aprueba automáticamente.

Si no existe conocimiento suficiente, pide preparar la información faltante; no inventa un diseño como si conociera todo el proyecto.

## 11. Pruebas manuales de entrega

Las pruebas técnicas P01–P112 y las adicionales de Node N01–N16 están en el plan (128 casos especificados). Esta lista comprueba la experiencia humana. **Se ejecuta sobre fixtures salvo la prueba real autorizada; no introduzcas fallos ni secretos en tus aplicaciones para probar el sistema.**

| Prueba | Acción | Debes observar |
|---|---|---|
| Instalación | Abrir el lanzador en un entorno soportado. | Menú o diagnóstico exacto; no cierre sin explicación. |
| Configuración | Completar el asistente y volver a abrir. | Conserva selecciones, sin preguntas repetidas. |
| Sin Azure | Mantener Azure desactivado. | Todo el recorrido local funciona. |
| Sin IA | Ejecutar demo y consultar endpoints. | Tres endpoints y cero invocaciones al proveedor. |
| Rama distinta | Analizar la rama de demostración adicional. | Cuatro endpoints, sin cambiar la rama abierta. |
| Reutilización | Repetir la misma demo. | Datos reutilizados; cero nueva interpretación. |
| Acceso bloqueado | Solicitar una raíz ficticia no autorizada. | Rechazo sin lectura de su contenido. |
| Parser fallido | Activar el caso de archivo inválido de la demo. | Cobertura parcial; resultados válidos conservados. |
| Sin aprobación | Dejar una revisión pendiente. | La bóveda compartida mantiene la edición anterior. |
| Aprobación alterada | Activar el caso de hash cambiado de la demo. | Publicación bloqueada. |
| Compartición | Exportar y abrir en otro equipo con Obsidian. | Puede leer sin motor, IA ni repositorios. |
| IA real | Autorizar una tarea pequeña con Copilot. | Perfil/tarea identificados, salida validada y limitaciones visibles. |

La prueba real tiene un consumo posible; la demo con proveedor simulado no lo sustituye. El informe de entrega debe distinguir pruebas ejecutadas, omitidas, fallidas y pendientes.

### Comprobación por comandos, sin aprender otra configuración

Estos comandos son alternativas a las opciones del menú; se ejecutan **en la carpeta del motor ya implementado**:

```text
npm run docs -- verificar
npm run docs -- demo
npm run docs -- consultar endpoints --repo demo-productor --rama master --config "<ruta-config-demo>"
```

La demo utiliza un workspace temporal propio: su informe debe mostrar la ruta de su `knowledge.yaml`. En el tercer comando, reemplaza `<ruta-config-demo>` por la ruta mostrada; no cambies la configuración real ni esperes que el ejemplo encuentre repositorios fuera del workspace activo. Desde el menú de demo, esa selección es automática.

Una comprobación de un repositorio real, sin interpretación ni publicación, será:

```text
npm run docs -- actualizar --repo gestor_novedades-ms --sin-ia --sin-publicar
```

El programa mostrará la rama actual resuelta y pedirá elegir cuando sea ambiguo; puedes seleccionar otra con `--rama <nombre>`. Los marcadores entre `< >` se reemplazan por valores reales. Ninguno de estos comandos instala dependencias de las aplicaciones ni ejecuta sus scripts.

Quien desarrolla la modificación también ejecuta `npm run typecheck`, `npm run build` y `npm test`; son pruebas de desarrollo, no pasos que deba repetir quien consulta Obsidian. La demo debe funcionar sin Python, con gramáticas WASM ya incluidas y sin red durante el análisis.

## 12. Errores habituales

| Mensaje o síntoma | Qué significa | Qué hacer |
|---|---|---|
| Node.js, npm o Git no encontrado | Falta instalación o ruta. | Comprobar node --version, npm --version o git --version según corresponda. |
| npm.ps1 bloqueado en Windows | La política limita scripts PowerShell. | Usar npm.cmd o INICIAR.cmd sin cambiar la política de seguridad. |
| Falta dist o una gramática WASM | Release incompleta o archivo alterado. | Reinstalar la release autorizada; no descargar parsers ni compilar por cuenta propia. |
| Dependencias/lockfile incompatibles | Paquete mezclado con otra versión. | Solicitar la release íntegra; no borrar el lockfile para forzar instalación. |
| Copilot no autorizado | Falta sesión o política empresarial. | Iniciar sesión o pedir habilitación; los datos sin IA siguen disponibles. |
| Modelo no disponible | La cuenta no admite la selección. | Elegir otro permitido; no se escala automáticamente. |
| Repositorio fuera del workspace | No pertenece a las raíces declaradas. | Revisar la configuración, sin desactivar la validación. |
| Rama no disponible | La copia local no contiene esa referencia. | Actualizar el repo por tu procedimiento habitual y volver a seleccionar. |
| Capacidad no soportada | Faltan reglas del extractor. | Mantener la limitación; el implementador añade soporte probado. |
| Falló la interpretación | El proveedor o la salida falló. | Usar reanudar; no repetir el inventario válido. |
| Documento pendiente | Aún no tiene aprobación. | Revisarlo; no cambiar `status` manualmente. |
| Otra publicación activa | Hay un escritor usando la misma bóveda. | Terminar/cancelar esa ejecución y verificar el bloqueo antes de reintentar. |
| Enlace aún no disponible | Edición incompleta, conflicto o sincronización pendiente. | Usar la anterior y completar/verificar la transferencia. |
| Cambio humano detectado | Se editó un archivo generado. | Revisar el conflicto; no forzar sobrescritura. |

## 13. Automatización posterior

El flujo inicial se ejecuta en tu computador, sin despliegue de servidor. Un programador de tareas puede ejecutar el mismo motor Node ya compilado en una máquina autorizada cuando esté encendida y tenga acceso a las carpetas; usará la ruta absoluta de Node y de `scripts/cli.mjs`, sin reinstalar dependencias o compilar durante el job. No se omite la revisión humana para publicar contenido nuevo.

Azure Pipelines es una opción adicional de coordinación; puede utilizar una máquina propia. Un Azure Repo documental es otra opción independiente. Ninguna se necesita para que Obsidian o la carpeta compartida funcionen. En ambos casos solo sale documentación aprobada; no se suben clones de aplicaciones al repositorio documental. [U7]

## Fuentes oficiales

Referencias de uso conservadas del paquete V3 (21-09-2026); los cambios Node se sustentan en W01, W08 y W18–W26 del documento 01. Los menús, políticas y pruebas son especificación del proyecto, no funciones ya implementadas.

- U1: `https://help.obsidian.md/Files+and+folders/How+Obsidian+stores+data`
- U2: `https://help.obsidian.md/Getting+started/Create+a+vault`
- U3: `https://help.obsidian.md/Plugins/Graph+view`
- U4: `https://help.obsidian.md/Plugins/Search`
- U5: `https://git-scm.com/docs/git-cat-file`
- U6: `https://obsidian.md/help/sync-notes`
- U7: `https://learn.microsoft.com/en-us/azure/devops/pipelines/agents/agents?view=azure-devops`
