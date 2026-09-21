---
id: DOCSYS-PLAN-V4-NODE
version: 4.0.0
fecha: 2026-09-21
estado: especificacion-para-implementar
idioma: es
---

# Plan final de desarrollo — Node.js + TypeScript y Obsidian

## 0. Autoridad, alcance y forma de ejecutar este plan

**Modificar el proyecto existente; no crear una plataforma paralela.** Este documento sustituye la elección de motor Python del paquete V3 y las decisiones incompatibles de los planes V2: Obsidian es obligatorio, todos los repositorios examinados pertenecen al mismo workspace, Azure es opcional y no se exige un portal.

Es una especificación de desarrollo, **no una implementación ya instalada**. Los comandos, menús, archivos nuevos y pruebas aquí definidos deben construirse. Los documentos originales, la plantilla y la skill se preservan hasta completar su migración. No se han recibido el código completo del sistema, las configuraciones completas ni el contenido de `archify-documentation`: la IA implementadora los inspeccionará en el proyecto real, sin inventarlos.

**Orden de autoridad:** decisiones más recientes del usuario → este paquete V4 Node → contratos y recursos reales compatibles del proyecto → documentos originales de referencia. Una diferencia se registra; no se resuelve eliminando funciones o relajando seguridad silenciosamente.

**Cómo implementar:** completar las tareas T01–T56 en orden de dependencias; escribir pruebas del comportamiento antes de cerrar cada tarea; mantener `docs/implementacion/progreso.md` con archivos modificados, comandos ejecutados, resultados y pendientes. Una tarea bloqueada no impide continuar las independientes. No indicar «terminado» por haber escrito un prompt, un TODO, una interfaz vacía o un resultado simulado.

**Alcance de esta revisión Node:** conservar T01–T56 y P01–P112; migrar runtime, módulos, instalación, procesos, pruebas y empaquetado; añadir N01–N16 para portabilidad. La versión de estos documentos es 4.0.0, pero `schema_version: 3` y `schemas/v3/` se conservan: cambiar de lenguaje no justifica cambiar los contratos de datos. Las referencias a Python como lenguaje analizado y los ejemplos FastAPI permanecen; no requieren un intérprete Python. Esta decisión sustituye la alternativa anterior, no añade un segundo motor.

Documentos complementarios:
- [02-SUBAGENTES-CORREGIDOS.md](02-SUBAGENTES-CORREGIDOS.md): responsabilidades, instrucciones y formatos de los ocho roles.
- [03-QUE-NECESITO-DE-TI.md](03-QUE-NECESITO-DE-TI.md): instalaciones y datos que aporta una persona.
- [04-GUIA-DE-USO-Y-PRUEBAS.md](04-GUIA-DE-USO-Y-PRUEBAS.md): recorrido de uso, demostración y comprobaciones manuales.

## 1. Requisitos que no se pueden simplificar eliminándolos

| ID | Requisito definitivo | Comprobación |
|---|---|---|
| R01 | Obsidian es la interfaz documental obligatoria. | Toda entrega funcional abre una bóveda válida, con búsqueda y enlaces sin plugins comunitarios. |
| R02 | Todos los repositorios a examinar pertenecen a un mismo workspace declarado. | Ninguna raíz externa a ese workspace puede analizarse, tampoco desde CLI o pipeline. |
| R03 | El código permanece fuera del sistema y de la bóveda. | No hay repositorios de aplicaciones, `.git` de aplicaciones ni fuentes brutas en los paquetes compartidos. |
| R04 | Azure Repo, Azure Pipelines y nube son independientes y opcionales. | Configuración, actualización, revisión y lectura funcionan sin cuenta ni credenciales de Azure. |
| R05 | Configuración y uso cotidianos guiados. | Un lanzador y tres opciones principales; no se exige editar YAML/JSON. |
| R06 | Un único motor para local y automatización. | Mismos módulos, contratos y reglas en ambos contextos. |
| R07 | Descubrimiento, extracción, correlación y publicación no utilizan modelos. | Prueba con proveedor bloqueado y contador de IA en cero. |
| R08 | Preservar los ocho roles y sus capacidades. | Mapeo explícito; Inventariador y Publicador son ejecutores deterministas. |
| R09 | Preservar ASD-TSE-100 en español y la skill existente. | Plantilla real intacta o migrada con trazabilidad; fallback Archify honesto. |
| R10 | Consultar y documentar por rama y commit. | No hay fallback silencioso a `master` ni cambio de rama de trabajo. |
| R11 | Mantener evidencia, límites, riesgos y aprobación humana. | Ningún agente aprueba o publica por sí mismo. |
| R12 | Preservar especificaciones, ADRs, migraciones y análisis transversal. | Playbooks y pruebas específicos, no solo tablas de endpoints. |
| R13 | Compartir la bóveda sin contratar servicios nuevos obligatorios. | Carpeta autorizada o exportación de una edición; Azure y Obsidian Sync/Publish no son requisitos. |
| R14 | Soporte extensible de los stacks del documento objetivo. | Matriz real de capacidades y fixtures; no declarar soportada una tecnología por detectar un manifiesto. |
| R15 | Fallos visibles, reanudación y caché correctas. | No se rellena con IA lo que falló en un parser ni se repiten tareas vigentes. |

**Decisiones tomadas aquí para concretar esos requisitos:** motor Node.js 24 LTS + TypeScript compilado; lanzador guiado; Copilot CLI como ejecutor habitual de los agentes; bóveda con ediciones inmutables; un publicador por bóveda compartida; formatos y límites descritos abajo. Son decisiones de diseño, no afirmaciones sobre código existente.

## 2. Experiencia de usuario que debe construirse

### 2.1. Un punto de entrada

En los tres sistemas: abrir una terminal en la carpeta del producto y ejecutar `npm start`. En Windows se conserva el doble clic en `INICIAR.cmd`; en macOS/Linux se conserva `./iniciar`. Las tres entradas ejecutan `scripts/bootstrap.mjs` y el mismo JavaScript compilado desde TypeScript; los wrappers no contienen reglas de análisis. No se requiere activar entornos ni instalar TypeScript globalmente. Si el permiso ejecutable del wrapper se pierde al descomprimir, `npm start` sigue siendo la entrada común.

```text
DOCUMENTACIÓN DEL EQUIPO

1. Actualizar documentación
2. Abrir Obsidian
3. Configurar

Hay 1 revisión pendiente. Última publicación: <fecha y rama>.
Más opciones: consultar datos, propuestas, pruebas, historial y compartir.
0. Salir
```

El primer inicio muestra el asistente de configuración. Los siguientes no repiten sus preguntas. Se puede cancelar cualquier pantalla sin guardar cambios parciales. Nunca se inicia una llamada a IA solo por abrir el menú, verificar la instalación o consultar tablas.

### 2.2. Configuración inicial: cinco pantallas breves

1. **Workspace:** seleccionar el `.code-workspace` existente o elegir las carpetas ya clonadas; generar el descriptor si no existe.
2. **Autorización:** mostrar los repositorios encontrados y sus estados; confirmar los habilitados sin activar los deshabilitados heredados.
3. **Bóveda:** elegir carpeta local, con un valor predeterminado seguro; puede ser una carpeta corporativa sincronizada.
4. **Copilot:** comprobar instalación y sesión; elegir una vez un modelo permitido de consumo contenido; revisión fuerte desactivada.
5. **Resumen:** mostrar qué se leerá, dónde se escribirá, qué se compartirá y qué NO se enviará; guardar solo tras confirmación.

Opciones predeterminadas: Azure desactivado; sin publicación automática; rama actual para análisis local; sin incluir cambios sin commit; concurrencia IA de uno; sin descarga de repos ni plugins durante el análisis. La rama principal se obtiene de metadatos disponibles y se confirma; si no puede resolverse, preguntar una vez en esa pantalla, no adivinar `master` o `main`.

### 2.3. «Actualizar documentación»

Mostrar repositorios seleccionados, ramas, commits y si hay cambios locales. Reutilizar la última selección sin obligar a escribir rutas. Secuencia fija:

```text
Comprobar → Obtener hechos → Relacionar → Mostrar trabajo IA necesario
→ Autorizar IA, si corresponde → Redactar → Validar
→ Abrir revisión en Obsidian → Aprobar o dejar pendiente → Actualizar bóveda
```

Si todo sigue vigente: informar «Sin cambios; 0 nuevas invocaciones de IA» y terminar. Si hay dudas o errores: dejar el resultado para revisión sin tocar la edición aprobada. La pantalla de IA muestra número máximo de invocaciones, modelos solicitados y tamaño del contexto; no inventa créditos ni promete un coste exacto.

La aprobación se pide una vez para el conjunto mostrado; no una vez por cada fichero. Aprobación de gasto, aprobación del contenido y permiso de exportación son decisiones distintas, aunque puedan resolverse en un único resumen claro. No pedir confirmaciones entre tareas ya autorizadas.

### 2.4. Workspace: interpretación precisa del requisito

El descriptor común enumera el sistema y las raíces de aplicación autorizadas. El motor lo valida incluso cuando Copilot CLI ejecute los agentes. Agregar una carpeta al workspace no equivale a habilitarla: ambas condiciones son necesarias.

En trabajo interactivo, se abre ese archivo en VS Code. En ejecución automática, se utiliza el mismo conjunto lógico de raíces mediante un descriptor de esa máquina, sin requerir una ventana gráfica. El motor informa `workspace_membership_verified`; **no afirma verificar qué ventana está abierta** si no tiene una API del editor para observarlo. No se requiere construir una extensión de VS Code para la ruta principal.

La CLI no recibe las raíces de aplicaciones como permisos de lectura: quien examina ese workspace es el motor. Los especialistas reciben paquetes de datos saneados en un directorio de ejecución privado. Esto preserva el requisito del workspace sin meter su código completo en el contexto de cada agente.

## 3. Arquitectura y tecnología

```text
REPOSITORIOS EXISTENTES, EN EL MISMO WORKSPACE
                     |
                     v
       MOTOR LOCAL: reglas, parsers y caché
                     |
            hechos + evidencias + grafo
                     |
                     v
     COORDINADOR LOCAL → especialistas Copilot CLI
                     |
           documentación candidata validada
                     |
              revisión de una persona
                     |
                     v
     BÓVEDA OBSIDIAN APROBADA, LOCAL O COMPARTIDA
                     |
       exportación Azure solamente si se habilita
```

| Pieza | Decisión | Límite |
|---|---|---|
| Motor | Node.js 24 LTS + TypeScript; paquete del motor con fuentes en `src/` y JavaScript compilado en `dist/`. | Portar la lógica útil del motor anterior; sin dependencia de Python ni un segundo motor. |
| Menú | Terminal guiada con `node:readline/promises` y CLI con `node:util.parseArgs`; selección por números. | Sin servidor, frontend web, Electron ni framework de agentes. |
| Instalación | Release precompilada; dependencias locales del motor en `node_modules/`, fijadas en `package-lock.json`. | El bootstrap solo instala con autorización; no instala nada en repositorios de aplicaciones. |
| Lectores | JSON, YAML seguro, XML sin entidades externas, TOML y formatos declarativos. | Nunca evaluar Gradle, Python, JavaScript o configuración como programa. |
| Código | `web-tree-sitter` en Node y gramáticas WebAssembly precompiladas incluidas en la release. | Verificar ABI/carga real; sin bindings nativos, descargas ni compilación de gramáticas en el equipo del usuario. |
| Contratos | JSON Schema 2020-12 validado en ejecución con Ajv 2020; tipos TypeScript estrictos para interfaces internas. | Los tipos no sustituyen la validación de archivos ni respuestas de agentes; preservar `schema_version: 3`. |
| IA | Adaptador de Copilot CLI con perfiles y modelo explícitos. | Sin `--yolo`, permisos globales, sesiones recursivas ni exploración de fuentes. |
| Persistencia | Archivos JSON y Markdown; caché local indexada. | No PostgreSQL, Redis, Neo4j, vectores ni servicios permanentes. |
| Documentación | Markdown, frontmatter y Mermaid con tablas alternativas. | Obsidian obligatorio; no plugin comunitario obligatorio. |
| Compartición | Una máquina publica; lectores consumen la carpeta o una edición exportada. | No diseñar un sistema distribuido de escritura concurrente. |
| Azure | Adaptadores opt-in de repositorio documental y de pipeline. | No acoplar motor o instalación local a ninguno de ellos. |

Node.js 24 figura como LTS en la documentación oficial consultada. T02 debe fijar las versiones exactas probadas de Node, npm, TypeScript, dependencias, gramáticas y Copilot CLI; no instalar «latest» durante una ejecución. La primera instalación puede necesitar red autorizada; el análisis determinista no. El objetivo multiplataforma se comprueba en Windows, Linux y macOS admitidos por Node y por la versión de Copilot utilizada; no se declara compatibilidad por haber compilado una vez. [W01, W02, W08, W18]

### 3.1. Lo que verá el usuario y lo que administrará el programa

```text
sistema-documentacion/
├── INICIAR.cmd / iniciar       # alternativas al comando común npm start
├── knowledge.yaml             # única configuración de usuario; la escribe el asistente
├── equipo.code-workspace      # generado/importado; no segunda fuente de permisos
├── boveda/                    # valor predeterminado; puede estar fuera del sistema
├── .knowledge/                # caché, capturas, revisión y registros; NO se comparte
├── node_modules/              # dependencias del motor; NO van a la bóveda
├── package.json / package-lock.json  # gestionados por el desarrollo
├── scripts/                   # arranque y mantenimiento internos
├── dist/                      # motor JavaScript entregado ya compilado
├── assets/                    # gramáticas WASM y recursos versionados
└── ...                        # código, pruebas, agentes y skill del producto
```

Las carpetas internas necesarias siguen existiendo en el código del motor; no se le pide al usuario mantenerlas. No borrar una carpeta solo porque no se ve en este esquema. Primero identificar sus consumidores y migrar lo que corresponda.

### 3.2. Una configuración, sin valores duplicados

Ejemplo ilustrativo que generará el asistente; no requiere edición manual:

```yaml
schema_version: 3
workspace_file: equipo.code-workspace
vault_path: ./boveda
repositories:
  - id: gestor_novedades-ms
    path: ../962-gestor_prestacion_movilidad-gestor_novedades-ms
    enabled: true
    default_branch: master
  - id: asistencia-core
    path: ../asistencia-core
    enabled: false
    default_branch: master
ai:
  provider: copilot-cli
  model: null
  strong_model: null
  max_invocations: 8
sharing:
  mode: local
azure:
  enabled: false
```

`master` reproduce el ejemplo heredado; el asistente debe comprobarlo, no copiarlo sin verificar. `model: null` permite extracción y pruebas sin IA, pero bloquea invocaciones reales hasta seleccionar un modelo disponible. No colocar tokens, contraseñas, cuotas históricas como saldo actual ni rutas de otros equipos en este archivo.

El motor incorpora valores predeterminados en su paquete. Las modificaciones avanzadas quedan bajo `overrides` en el mismo YAML: reglas de dominio, alias de recursos, convenciones, filtros, presupuestos, política de publicación y selección de plantillas. El asistente tiene «Avanzado» para cambiarlas. La configuración efectiva se calcula y se puede inspeccionar; su copia de diagnóstico no es otra configuración editable.

Ruta relativa respecto de la carpeta de `knowledge.yaml`, no del directorio desde el que se lanzó la terminal. Rechazar claves desconocidas, versiones incompatibles y rutas superpuestas peligrosas. Una carpeta compartida no puede ser ancestro de las aplicaciones, `.knowledge`, `node_modules` o los recursos del motor.

### 3.3. Contrato Node.js que no debe quedar a interpretación

#### 3.3.1. Runtime y distribución

Usar Node.js 24 LTS y npm, con parche/versión exactos registrados en `runtime-matrix.md` y en el manifiesto de release. `package.json` declara el rango de major admitido (`>=24 <25`); el diagnóstico verifica además la lista de parches aprobados. No confundir «pertenece al major» con «esta combinación ya pasó pruebas». Actualizar versiones mediante una nueva release probada, no desde un análisis.

La release para usuarios lleva `dist/` ya compilado, `scripts/`, `assets/`, esquemas, plantillas, skill, perfiles canónicos, `package.json`, `package-lock.json` y licencias. Las dependencias de producción se instalan **solo en la carpeta del motor** mediante `npm ci --omit=dev --ignore-scripts --no-audit --no-fund`, con consentimiento y registro autorizado. Para un entorno sin red, el responsable prepara una distribución offline comprobada; el motor no supone que una caché npm estará disponible.

No distribuir como aplicación lista una carpeta que necesite `tsc`, Python, `node-gyp`, Docker, Rust, C/C++ o descargar una gramática al abrirse. No ejecutar hooks de instalación para fabricar WASM en el equipo del usuario. Obtener los WASM de releases oficiales verificadas o producirlos en el proceso de build controlado del mantenedor; guardar versión, procedencia, licencia, SHA-256 y compatibilidad en `assets/grammars/manifest.json`. El binding WASM y cada gramática deben funcionar juntos, no solo declarar un ABI coincidente. [W08, W23]

**El workspace de VS Code no es un workspace de npm:** no convertir las aplicaciones autorizadas en paquetes `workspaces` del motor ni crear dependencias `file:` hacia ellas. Las cinco pantallas de configuración siguen siendo las mismas; el usuario no edita `package.json`, archivos TypeScript ni el manifiesto de gramáticas.

#### 3.3.2. Fuentes, compilación y scripts

Una sola base TypeScript, ESM (`"type": "module"`), compilada con `tsc`; `module` y `moduleResolution` en `NodeNext`, `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`, `forceConsistentCasingInFileNames: true`, `noEmitOnError: true`, `target: ES2022`, `rootDir: src` y `outDir: dist`. Imports relativos compatibles con el JavaScript emitido; no depender de aliases que Node no pueda resolver. `tsconfig.test.json` conserva esas reglas y compila pruebas y fuentes a un directorio privado separado. [W20]

TypeScript y `@types/node` son dependencias de desarrollo locales y fijadas. Eliminar tipos en tiempo de ejecución no comprueba su corrección: `typecheck` y compilación deben fallar ante un error. Los JSON externos entran como `unknown` y solo se usan después de validarlos; no convertirlos con `as` para esquivar una validación. [W24]

Fragmento normativo de los scripts de `package.json`, **no un paquete completo ni una implementación incluida**:

```json
{
  "type": "module",
  "engines": { "node": ">=24 <25" },
  "scripts": {
    "start": "node scripts/bootstrap.mjs",
    "docs": "node scripts/cli.mjs",
    "build": "node scripts/build.mjs",
    "typecheck": "node scripts/typecheck.mjs",
    "test": "node scripts/test.mjs",
    "release": "node scripts/release.mjs"
  }
}
```

Los `.mjs` de arranque usan únicamente módulos estándar de Node hasta comprobar la instalación. `scripts/cli.mjs` carga `dist/cli.js`, establece explícitamente la raíz verificada del paquete, valida argumentos y propaga salida/código, **sin instalar ni compilar automáticamente**. `bootstrap.mjs` muestra el asistente, comprueba dependencias e instala solo con consentimiento; con `--no-interactivo` y dependencias faltantes devuelve código 2 y la instrucción exacta. No añadir `prestart`, `poststart`, `prepare` ni hooks ocultos que descarguen, compilen o invoquen IA.

`build.mjs` limpia exclusivamente salidas propias, ejecuta el compilador local a través de `process.execPath` y comprueba los recursos de distribución; nunca ejecuta builds de aplicaciones. `typecheck.mjs` valida los dos proyectos TypeScript. `test.mjs` compila la suite y la ejecuta con `node:test`/`node:assert/strict`; enumera los archivos compilados y pasa argumentos separados, sin glob dependiente del shell ni llamadas de red/IA predeterminadas. `release.mjs` exige pruebas, tipos y manifiestos correctos antes de empaquetar una distribución **sin datos del equipo**. [W21]

#### 3.3.3. Contratos, lectores y recursos

Mantener los nombres y tipos JSON del §4, aunque el código interno sea TypeScript. Implementar `SnapshotReader`, `ExtractorPlugin`, `AIExecutor` y `PublicationTarget` como interfaces explícitas; operaciones de lectura y procesos devuelven promesas o flujos con límites y cancelación. No transformar campos `snake_case` existentes en `camelCase` en los artefactos por preferencia del lenguaje.

El validador de artefactos nuevos usa Ajv con soporte 2020-12, en modo estricto y sin coerción, eliminación de campos ni inserción silenciosa de defaults; los esquemas son recursos propios, nunca código aportado por aplicaciones. Validar por separado esquemas heredados de otro draft y adaptar después. [W25]

JSONC, YAML, XML y TOML se leen mediante bibliotecas de JavaScript puro fijadas y auditadas en T02/T14. No seleccionar una dependencia que exija compilación nativa para cumplir una tarea determinista. Rechazar DTD/entidades externas, tags ejecutables y profundidad/tamaño excesivos. Las configuraciones `.js`/`.ts` de aplicaciones se parsean como texto/árbol; **no se cargan con `import`, `require`, `vm` ni `eval`**.

Cargar WASM, esquemas y plantillas desde una raíz del motor verificada, derivada del módulo/launcher y no del `cwd` del usuario. `tsc` no copia automáticamente esos recursos: T50 debe incluirlos y verificar su inventario. Un `.wasm` ausente/corrupto bloquea la capacidad afectada con diagnóstico, sin descarga o fallback a IA.

#### 3.3.4. Archivos y rutas en los tres sistemas

Usar `node:fs/promises`, `node:path` y conversiones `fileURLToPath`/`pathToFileURL`, no concatenación de separadores. Canonicalizar raíces con `realpath` y comprobar pertenencia por segmentos; `startsWith(root)` no es una comprobación de contención. Las rutas del JSON/documentación siguen siendo relativas con `/`, mientras las de disco usan las reglas del SO. [W18, W26]

Probar espacios, tildes, emoji, rutas UNC admitidas en Windows, raíces de unidades, enlaces/junctions, diferencias de mayúsculas y nombres reservados. No prometer que normalizar Unicode o convertir todo a minúsculas es seguro: detectar colisiones y bloquearlas. Un bloqueo compartido en un sincronizador no se convierte en exclusión distribuida.

Respetar UTF-8, CRLF/LF y unidades de posición del binding: las posiciones del parser no se asumen iguales a índices UTF-16 de JavaScript. Verificar localizadores sobre los bytes fuente y conservar la correspondencia cuando se normalicen saltos de línea. Calcular tamaños de contexto con `Buffer.byteLength`, no con `string.length`. Liberar árboles, parsers y consultas según la API de la versión fijada.

#### 3.3.5. Git, Copilot y apertura de Obsidian

Centralizar procesos en `src/platform/process.ts`: ejecutables de una allowlist, rutas resueltas en preflight, argumentos separados, `shell: false`, `cwd` permitido, entorno controlado, límites de salida y timeout/cancelación. Usar `spawn` para Git/Copilot con flujos; no `exec` con comandos interpolados ni llamadas síncronas durante el análisis. Filtrar variables que permitan cargar código externo o ampliar permisos, preservando solo las necesarias y autorizadas para autenticación y proxy.

**Windows:** `.cmd` y `.bat` no se ejecutan como un binario normal mediante `execFile`; no resolverlo activando `shell: true` con datos del usuario. Preferir ejecutables oficiales (`git.exe`, Copilot nativo) y, para npm, ejecutar su entrada JavaScript verificada con el Node instalado. Cuando solo exista un shim, el adaptador debe resolver una entrada admitida y probada o informar cómo instalar el ejecutable nativo; no analizar shims arbitrarios ni evaluar su contenido. Los wrappers propios `INICIAR.cmd`/`iniciar` solo arrancan el menú y no transportan prompts, ramas ni rutas de repositorios. [W19]

El adaptador Copilot recibe el paquete por el transporte verificado en T02/T31. Decodificar stdout con un `StringDecoder`/`TextDecoder` incremental: un chunk de proceso no equivale a una línea JSONL y un carácter UTF-8 puede cruzar chunks. Conservar stderr saneado separado, aplicar límites antes de acumular, rechazar finales ambiguos e identificar el resultado del agente solo después de los eventos.

Para cancelar, señal/timeout son intentos, no prueba de terminación: comprobar salida del proceso y descendientes antes de cerrar la tarea. Implementar un adaptador de terminación por SO; cualquier comando del sistema usado para ello solo acepta PIDs propios verificados, nunca valores del repositorio. Ningún hijo huérfano puede seguir consumiendo o escribir tras la cancelación.

Abrir Obsidian mediante URI local construida con codificación de parámetros y un adaptador de apertura del SO sin concatenaciones de shell. Si no se puede abrir con seguridad, mostrar la carpeta y los pasos manuales; no instalar un servicio, navegador automatizado o plugin para compensarlo. Esta apertura nunca invoca IA.

#### 3.3.6. CPU, memoria y resultados deterministas

La lectura asíncrona no convierte el parseo intensivo en paralelo. Ejecutar parseo en un pool limitado de `worker_threads`, inicialmente dos trabajadores; no lanzar un proceso por archivo ni usar `Promise.all` sin límite. El hilo principal conserva menú, cancelación y coordinación. Un timeout de parser debe poder terminar su trabajador, conservar resultados independientes y dejar diagnóstico. [W22]

Los trabajadores reciben datos acotados y módulos propios; no permisos nuevos sobre el disco. Medir también memoria WASM y RSS: los límites de memoria de un trabajador no garantizan por sí solos un tope total del proceso. El pool es control de rendimiento, no un sandbox de seguridad.

Ordenar resultados con una regla estable independiente del locale antes del hash; el orden de finalización de workers no cambia hechos, cobertura ni grafo. Medir rendimiento con T52; cambiar a Node/WASM no se presenta como mejora de velocidad ya demostrada. [W08]

#### 3.3.7. Plataformas y evidencia de compatibilidad

T02 define y prueba una matriz concreta de SO/arquitecturas dentro del soporte oficial de Node 24: al menos Windows x64, Linux x64 y macOS, verificando Intel/Apple Silicon según las máquinas soportadas del equipo. Identificar sistema, arquitectura, versión de Node/npm, Copilot y gramáticas; no copiar `node_modules` de una plataforma a otra como sustituto de una instalación verificada. [W18]

La suite Node N01–N16 se suma a P01–P112. La demo FastAPI se mantiene como **texto analizado** para probar soporte multilenguaje sin intérprete Python; eliminar ese extractor sería una pérdida de funcionalidad, no una migración del motor.


## 4. Contratos precisos del motor

Cada contrato nuevo debe tener esquema, un ejemplo válido mínimo, un ejemplo parcial y tres ejemplos inválidos. Los objetos JSON son UTF-8; listas sin orden semántico se ordenan antes de calcular SHA-256; fechas se excluyen del hash de contenido. Las rutas publicables son relativas, usan `/` y no contienen `..`, credenciales ni rutas absolutas de equipos.

### 4.1. Tipos comunes

| Tipo | Campos obligatorios y reglas |
|---|---|
| `RepositoryRef` | `id`, `local_root`, `enabled`, `default_branch`; `local_root` solo en datos privados. |
| `Snapshot` | `id`, `repository_id`, `requested_ref`, `resolved_ref`, `commit_oid`, `capture_mode`, `content_hash`, `dirty`, `captured_at`; OID sin asumir longitud SHA-1 fija. |
| `Coverage` | `discovered`, `excluded`, `eligible`, `processed`, `failed`, `unsupported`, `not_scanned`, `capabilities`, `exclusion_reasons`; números no negativos. |
| `Evidence` | `id`, `repository_id`, `snapshot_id`, `relative_path`, `source_hash`, `locator`, `rule_id`; el localizador es rango válido de líneas/bytes o clave estructurada verificable. |
| `Fact` | `id`, `kind`, `component_id`, `value`, `evidence_ids`, `rule_id`; evidencia no vacía y verificable. |
| `Diagnostic` | `id`, `severity`, `code`, `scope`, `message`, `evidence_ids`, `suggested_action`; texto saneado. |
| `Finding` | `id`, `classification`, `statement`, `fact_ids`, `evidence_ids`, `limitations`; `classification` es `fact`, `inference` o `unknown`. |

Contabilidad: `discovered = excluded + eligible`; `eligible = processed + failed + unsupported + not_scanned`. Categorías de archivos mutuamente excluyentes; la cobertura por capacidad se informa aparte. Un fichero con parser correcto no convierte todas las capacidades del framework en soportadas.

La confianza numérica heredada se conserva si tiene procedencia; no generar porcentajes arbitrarios. En resultados nuevos usar clasificación, regla y explicación de límites. Un dato humano se etiqueta `human_assertion` dentro de su procedencia, no se convierte automáticamente en hecho del código.

### 4.2. Artefactos y propietarios

| Archivo privado dentro de `.knowledge/runs/<run-id>/` | Contenido | Escritor autorizado |
|---|---|---|
| `run.json` | Estado, alcance, snapshots, versiones, tareas, hashes y uso observado. | Coordinador. |
| `workspace.json` | Raíces autorizadas y validación de pertenencia. | Preflight. |
| `<repo-id>/inventory.json` | Archivos y proyectos internos con firmas tecnológicas. | Inventariador determinista. |
| `<repo-id>/bundle.json` | Índice de conjuntos de hechos, cobertura, evidencias y diagnósticos. | Empaquetador. |
| `<repo-id>/facts/<category>.json` | Hechos completos por categoría. | Plugins extractores. |
| `<repo-id>/evidence.json` | Evidencias sin código fuente completo. | Motor. |
| `graph.json` | Nodos, aristas y candidatos por escenario multirrepositorio. | Correlacionador. |
| `contexts/<task-id>.json` | Datos seleccionados para una invocación. | Empaquetador de contexto. |
| `responses/<task-id>.json` | Respuesta del agente ya validada; original privado por separado. | Adaptador, no el modelo escribiendo archivos. |
| `document-model.json` | Secciones, tablas y afirmaciones con sus referencias. | Ensamblador. |
| `candidate-vault/` | Bóveda temporal de revisión, con aviso visible. | Renderizador. |
| `review.json` | Incidencias, severidad, decisiones pendientes. | Validador; observaciones de IA separadas. |
| `approval.json` | Acción humana vinculada a hashes exactos y excepciones aceptadas. | Flujo de revisión fuera de permisos del modelo. |
| `publication.json` | Lista permitida de archivos y manifiesto de edición. | Publicador. |

`bundle.json` es un índice; no imponer «unos pocos KB» al universo completo de hechos. No copiarlo íntegro a la bóveda compartida. Para interoperabilidad heredada se generan `inventory.yaml`, `findings.yaml`, `relations.yaml`, `documents.yaml`, `review.yaml` y `proposal.yaml` solo cuando un consumidor identificado los requiera, a partir del modelo canónico, nunca como segunda fuente de verdad.

### 4.3. Estado, calidad y vigencia no son lo mismo

- Estado de tarea: `pending`, `running`, `completed`, `blocked`, `failed`, `cancelled`, `cached`.
- Estado de ejecución: `planned`, `running`, `awaiting_confirmation`, `awaiting_interpretation`, `review`, `review_required`, `approved`, `published`, `failed`, `cancelled`.
- Calidad del bundle: `complete`, `partial`, `unsupported`, `failed`.
- Vigencia: `current_for_snapshot`, `stale`, `freshness_unknown`.

`complete` solo significa completo para el alcance y reglas declarados. Ninguna etiqueta indica conocimiento absoluto o despliegue comprobado en producción. Una versión aprobada puede estar obsoleta; una versión reciente puede seguir sin aprobar.

Bloqueos no anulables por aprobación humana ordinaria: secretos detectados en exportación, rutas fuera de alcance, hashes alterados, contratos corruptos, publicación sin aprobación y evidencia falsificada. Un desconocido de negocio puede aceptarse como limitación visible; no se convierte en hecho.

## 5. Lectura de repositorios y ramas

### 5.1. Capturas sin modificar la aplicación

**Modo predeterminado:** analizar el commit actual de la rama elegida. Si el usuario tiene cambios sin commit, preguntar «Analizar el commit guardado» o «Incluir mis cambios como borrador local». La segunda opción no se publica en la bóveda compartida.

Para ramas no abiertas, usar un lector de objetos Git: enumeración con `git ls-tree` y lectura de blobs con `git cat-file`, invocados sin shell y sin filtros. No hacer checkout, stash, merge, worktree, instalación de dependencias ni compilación. Así la captura es de un commit exacto y no crea otro clon. [W09, W10]

La obtención de nuevas referencias remotas es una operación aparte, de red, con permiso del usuario o del administrador. Por defecto solo usar referencias ya disponibles localmente. Si falta una rama o un blob por clon superficial/parcial, explicar el motivo; no sustituirla por `master` ni activar una descarga implícita. Desactivar el lazy fetch cuando el Git instalado lo permita y comprobarlo; si no puede garantizarse en un clon promisor, bloquear ese modo sin permiso de red.

### 5.2. Algoritmo obligatorio

1. Resolver la raíz real y confirmar pertenencia al workspace y `enabled: true` antes de leer contenidos.
2. Resolver nombre de rama a referencia completa y commit, sin interpolarlo en comandos de shell.
3. Enumerar árboles/blobs por OID; verificar tipo y tamaño antes de leerlos.
4. Excluir enlaces que salen del alcance, submódulos no autorizados, LFS no materializado y binarios; registrar motivo.
5. Procesar fuentes permitidas con límites de tamaño y tiempo; no ejecutar instrucciones presentes en el repositorio.
6. Guardar evidencias y contenido normalizado; no guardar una copia completa de las fuentes.
7. En modo working-tree, comprobar contenido antes/después y reintentar una sola captura inconsistente; después bloquear.

Los submódulos son repositorios independientes: requieren autorización y raíz declarada. Un pointer LFS no es el archivo real y no acredita un análisis completo. `.git` puede ser un directorio o un archivo; validar con Git, no con una prueba rígida de directorio.

### 5.3. Identidad y consulta

`Snapshot.id` distingue repositorio, commit y cambios locales. `Scenario.id` identifica la lista exacta de snapshots de varios repositorios; una rama llamada `feature/x` en A no implica seleccionar esa misma rama en B.

La ruta de documentación usa una clave segura de rama: nombre normalizado y sufijo SHA-256 corto del nombre completo; mantener el nombre original como metadata. Probar colisiones de `/`, mayúsculas, tildes, nombres reservados Windows y ramas largas. No utilizar el nombre de rama directamente como ruta de disco.

Cada ficha muestra repositorio, rama, commit, fecha de captura, alcance, cobertura, aprobación y escenario cuando aplica. La página inicial dirige a la última edición aprobada de la rama principal configurada, pero mantiene acceso a ramas publicadas explícitamente.

## 6. Extracción determinista y correlación

### 6.1. Contrato de plugin

```text
ExtractorPlugin
  id, version, supported_languages, capabilities, rule_versions
  detect(inventory) -> CandidateStack[]
  extract(snapshot_reader, component, options) -> ExtractionResult

ExtractionResult
  facts[], evidence[], diagnostics[], coverage_by_capability, dependencies[]
```

El plugin recibe un lector acotado, no libertad para abrir cualquier archivo ni ejecutar comandos. `detect` puede devolver varios stacks. Reglas de rutas, persistencia y mensajes son adaptadores de framework; instalar una gramática solo aporta sintaxis. Cada capacidad declara `implemented`, `partial` o `unsupported` y sus patrones reconocidos.

| Adaptador objetivo | Casos mínimos a implementar/probar |
|---|---|
| .NET | `.csproj`, paquetes, controllers y atributos, minimal APIs soportadas, HttpClient, appsettings, entidades/configuraciones de datos identificables. |
| Java Spring | POM, Gradle declarativo, rutas de clase+método, múltiples mappings, MVC/WebFlux, Feign/clientes, JPA y mensajería declarada. |
| Java JEE/WebLogic | `web.xml`, `weblogic.xml`, módulos, EJB, JNDI, JMS y JAX-RS soportado. |
| Angular | Dependencias, componentes, rutas de pantalla, servicios HttpClient y entornos declarativos. |
| React | Dependencias, componentes, router/cliente HTTP soportados; SSR/framework adicional solo con evidencia. |
| Python | `pyproject.toml`/requirements y reglas diferenciadas Flask/FastAPI/Django; no importar la aplicación. |

La primera entrega vertical cubre el stack real del piloto. Los demás adaptadores conservan tareas separadas y no se anuncian como terminados hasta pasar sus pruebas; la plataforma multilenguaje completa no se declara terminada con un solo parser.

Nunca afirmar cobertura de pruebas, seguridad efectiva, uso real en producción o intención de negocio a partir de contar archivos o detectar una anotación. Los endpoints de UI se separan de APIs backend. Los valores dinámicos mantienen expresiones simbólicas y `unknown`.

### 6.2. Grafo verificable

Nodos: repositorio, componente, servicio externo, recurso de mensajería, recurso de datos y paquete. Un repositorio puede contener varios servicios. Aristas tipadas: `calls_http`, `publishes_to`, `consumes_from`, `reads_data`, `writes_data`, `depends_on_package`.

Cada arista incluye `id`, `from`, `to`, `type`, `environment`, `scenario_id`, `status`, `fact_ids`, `evidence_ids`, `rule_id`, `limitations`. Estados: `supported`, `candidate`, `unresolved`. No llamar «tráfico observado» a una declaración estática.

Reglas: HTTP necesita destino/alias resoluble; mensajería necesita identidad de broker/namespace, entorno y topic; datos necesitan identidad saneada de recurso y entorno; paquetes generan dependencias al paquete, no llamadas entre servicios. Conservar productor → topic → consumidor y servicio → base de datos. Nombres iguales sin identidad suficiente generan candidatos, no conexiones confirmadas.

## 7. Eficiencia, caché y control de IA

### 7.1. Tres claves de reutilización

| Nivel | Clave mínima | Qué invalida |
|---|---|---|
| Extracción | Hash de contenidos relevantes + versiones de parser/reglas + configuración del alcance. | Nuevos ficheros, modificaciones, eliminaciones verificadas, filtros o reglas nuevas. |
| Correlación | Hechos de snapshots + alias/entornos + versión de reglas del grafo. | Cambios en cualquiera de los servicios relacionados. |
| Interpretación | Paquete de contexto semántico + objetivo + plantilla/skill/prompts + modelo/configuración. | Convenciones, pregunta, hechos o relaciones relevantes distintas. |

No usar solo commit o solo hash del repositorio individual. Si cambia el proveedor de un contrato, invalidar la documentación dependiente aunque el consumidor no haya cambiado. Excluir reloj, run-id y rutas personales de hashes semánticos. Reubicar evidencias por código cuando solo cambian líneas; no reescribir prosa sin necesidad, pero renovar aprobación si cambia el artefacto final.

Un resultado incompleto no reemplaza en caché una captura completa como si fuera equivalente. La ausencia por fallo de acceso no implica eliminación. Registrar dependencia documento → hallazgo → hecho → archivo/regla para invalidación selectiva.

### 7.2. Invocaciones verificables

El coordinador, no otro LLM, selecciona los playbooks conocidos del menú. Orquestador de IA solo cuando se recibe una intención libre. Cada especialista necesario se ejecuta en una llamada independiente de Copilot CLI con su perfil, contexto y modelo explícitos. No ejecutar todos por obligación ni pedir a un único modelo que narre ocho papeles.

Los alias heredados de modelos se resuelven a IDs disponibles y autorizados. `model_requested` y `model_observed` son campos distintos; el segundo queda `null` si el cliente no lo expone. El sistema no conoce los precios por intuición ni el saldo de la cuenta sin una fuente.

### 7.3. Límites iniciales del producto

| Control | Valor inicial | Comportamiento al exceder |
|---|---|---|
| IA al abrir menú, inventariar, consultar datos y publicar | 0 | Fallo de prueba. |
| Invocaciones de IA por run | Máximo 8, contando reintentos. | Mostrar ampliación necesaria; pausar sin perder trabajo. |
| Reintento por respuesta inválida | 1 | Dejar `review_required`; no bucle de reparación. |
| Concurrencia IA | 1 | No paralelizar más sin cambiar opción avanzada. |
| Concurrencia determinista | 2 trabajadores inicialmente. | Respetar límites de CPU/memoria medidos. |
| Paquete ordinario | Objetivo ≤8.000 tokens estimados; tope explícito de 48 KiB de entrada propia. | Partir por sección o pregunta; conservar índice de omisiones. |
| Salida propia capturada | Máximo 128 KiB por tarea. | Rechazar truncamiento y señalar salida excedida. |
| Razonamiento fuerte | Desactivado. | Solicitar modelo, motivo y autorización. |
| Alcance `full` | Confirmación. | No cambiarlo desde una inferencia del agente. |

Los bytes se miden exactamente; los tokens pueden ser estimados. Incluir perfil, plantilla y fragmento de skill en el presupuesto; el cliente puede añadir contexto propio y se registra esa limitación. Los topes no equivalen a un precio máximo garantizado del proveedor. Cada run precomputa tareas y reintentos permitidos: si no caben, propone dividir el trabajo o aprobar un límite mayor, nunca omitir silenciosamente secciones.

Uso: `ai_invocations`, `provider_turns`, `input_tokens`, `output_tokens`, `provider_amount`, `unit`, `source`, `observation_scope`, `observed_at`; desconocidos en `null`, no en cero. No atribuir a un run una diferencia del saldo cuando hubo otras sesiones concurrentes. Las cifras históricas de 8, 1.500 y 400 se conservan como histórico no homologado, no se convierten en contabilidad nueva.

## 8. Subagentes, plantilla y resultados

El documento `02-SUBAGENTES-CORREGIDOS.md` contiene los textos normativos. Los contratos humanos en `agents/` son la fuente; los perfiles `.agent.md` se generan con una marca y hash de origen. No mantener copias editables contradictorias.

Para el camino automático, perfiles sin herramientas (`tools: []`), contexto enviado directamente y respuesta capturada por el motor. El adaptador verifica que no haya herramientas efectivas heredadas, servidores MCP o instrucciones globales ajenas que amplíen permisos. Arrancar en un directorio privado con perfiles propios y usar `--no-custom-instructions` cuando la versión probada lo soporte; incluir explícitamente las reglas aprobadas en el contexto. Comprobar precedencias de perfiles de usuario/proyecto: una colisión no se ignora. [W03–W05]

Ejemplo conceptual del ejecutor: `copilot --agent <perfil> --model <modelo> -p <peticion> --output-format json`. Es una interfaz del cliente documentada, pero la implementación debe verificar opciones de la versión fijada y transportar el contexto por stdin/medio probado, evitando límites de línea de comandos y exposición del prompt en la lista de procesos. No usar un archivo ejecutable del repo analizado para invocar nada.

La salida JSONL del cliente es un **envoltorio de eventos**, no el JSON de negocio del agente. El adaptador extrae la respuesta final, registra eventos de uso admitidos, valida después el esquema del resultado y rechaza ausencia, duplicación ambigua, cancelación o texto incompleto. No ejecutar `JSON.parse(stdout)` suponiendo un único objeto; decodificar UTF-8 de forma incremental y procesar eventos JSONL antes de validar `AgentResult`.

`DocumentModel` conserva secciones de la plantilla real y divide `claims`, `tables`, `limitations`, `evidence_refs` e `interpretation_status`. El renderizador produce el documento completo y las fichas numeradas a partir de ese único modelo. No permitir que cada ficha reinterprete datos por su cuenta.

La skill se carga y versiona como recurso del Documentador. `archify.status` distingue `executed` de `unavailable/fallback`; `skill_applied` no significa que se ejecutó un binario externo. Si falta la plantilla real o el cuerpo de la skill, extracción y pruebas independientes pueden continuar, pero la entrega compatible ASD/Archify queda bloqueada; no inventar reemplazos.

**Control de modelo del perfil:** comprobar `modelPolicy: required` en la versión de Copilot CLI fijada; cuando sea compatible, generarlo para impedir el fallback silencioso a otro modelo. Si no puede verificarse una política equivalente, bloquear esa ejecución, no asumir que modelo solicitado y efectivo son iguales. Desactivar actualizaciones automáticas durante una ejecución reproducible cuando el cliente lo admita. [W16]

## 9. Publicación, Obsidian y carpeta compartida

### 9.1. Dos bóvedas con funciones distintas, administradas por el programa

La bóveda estable contiene solo ediciones aprobadas. Para revisar, el programa abre `candidate-vault/` del run como una bóveda temporal separada, con un aviso `BORRADOR — NO APROBADO`. No se sincronizan borradores al equipo. No se pide al usuario crear ambas carpetas manualmente.

### 9.2. Estructura de una edición

```text
boveda/
├── Inicio.md
├── Publicaciones/
│   └── <edicion-id>/
│       ├── Inicio.md
│       ├── Servicios/<repo-id>/<rama-key>/
│       │   ├── document.md             # ASD-TSE-100 completo
│       │   ├── 00-overview.md
│       │   ├── 10-domain.md
│       │   ├── 20-contracts.md
│       │   ├── 30-dependencies.md
│       │   ├── 40-data.md
│       │   ├── 50-tooling.md
│       │   ├── 60-decisions.md
│       │   └── 70-specs.md
│       ├── Mapas/
│       ├── Decisiones/
│       ├── Especificaciones/
│       └── edicion.json               # hashes y metadata saneada, no bundles
└── Mis-notas/                         # aportes humanos; no se sobrescribe
```

El usuario navega desde `Inicio.md`, no por el árbol técnico. Cada edición enlaza exclusivamente a documentos de esa misma edición, salvo aportes manuales declarados. Las fichas son vistas, no pérdida de detalle del documento completo.

Ediciones inmutables evitan mezclar dos versiones cuando una carpeta se está copiando. No implican hacer clones de aplicaciones: solo copias de Markdown y metadata depurada. El contenido aprobado sin cambios puede reutilizarse durante el ensamblado; la edición compartida se materializa con archivos normales, sin enlaces simbólicos que rompan portabilidad.

### 9.3. Protocolo exacto de publicación

1. Adquirir bloqueo local de escritor; comprobar identidad de máquina publicadora configurada.
2. Revalidar archivos, evidencias, exclusiones, cobertura y hashes aprobados.
3. Construir una edición nueva en staging privado, junto a un manifiesto con el inventario exacto de archivos exportables.
4. Copiarla a un directorio nuevo `Publicaciones/<edicion-id>`; verificar lectura y hashes en destino.
5. Escribir el marcador de edición completa y actualizar `Inicio.md` al final, mediante reemplazo local controlado.
6. Mantener un enlace explícito a la edición anterior para recuperación.
7. Registrar publicación y liberar bloqueo; ante fallo dejar la edición anterior como referencia.

`Inicio.md` es un índice derivado y no altera aprobaciones. Una edición jamás se modifica después de publicarse. Correcciones generan otra. Cambiar contenido tras la revisión invalida la aprobación. El registro humano incluye actor local, fecha, alcance, digest, excepciones y procedencia; **es auditoría de un flujo local, no una firma empresarial resistente a un administrador malicioso**.

### 9.4. Compartir sin Azure

Modos del mismo publicador:
- `local`: bóveda en disco; lectura desde Obsidian.
- `folder`: bóveda en una carpeta ya compartida/sincronizada y autorizada por la empresa; el sistema no configura ni contrata el transporte.
- `export`: copiar una edición aprobada completa a una carpeta nueva o ZIP para compartirla manualmente.

Un responsable y una máquina publican el contenido generado de cada bóveda. Los lectores no necesitan Copilot, Node.js ni los repositorios; solo Obsidian y la carpeta. No compartir `.knowledge`, `node_modules`, `dist`, perfiles con rutas locales, logs brutos, credenciales, fuentes ni configuraciones personales `.obsidian` por defecto.

Una carpeta en Dropbox, OneDrive, red corporativa o cualquier sincronizador no es una transacción distribuida. **El programa acredita una edición preparada en el origen, no que todos los equipos la recibieron.** Un sincronizador podría entregar `Inicio.md` antes que los otros archivos; por eso se mantiene la edición anterior y se indica comprobar que la sincronización terminó antes de abrir la nueva. No prometer actualización instantánea ni usar locks de archivos sincronizados como exclusión entre máquinas.

Para recepción estricta: exportar una edición completa, esperar la transferencia y extraer/copiar en carpeta nueva antes de abrirla. El comprobador opcional `verificar-edicion` valida hashes; el lector corriente no debe instalar el motor para leer una edición recibida completa. No crear un servicio de sincronización propio como requisito.

`Mis-notas/<autor>/` es territorio humano; varios lectores no editan el mismo generado. Los aportes solo vuelven a la interpretación si se seleccionan y clasifican explícitamente. Cada bóveda tiene un conjunto de lectores autorizado: no mezclar repositorios de distinta confidencialidad confiando solo en esconder enlaces.

Retención: conservar siempre la edición actual y al menos la anterior; no borrar ediciones compartidas automáticamente. La opción «Limpiar historial» muestra qué eliminará y pide confirmación. Borradores/caché privados pueden purgarse por política, conservando referencias de auditoría y sin seguir symlinks.

### 9.5. Uso de Obsidian

Abrir la carpeta como bóveda la primera vez. Posteriormente `Abrir Obsidian` utiliza el URI local registrado y abre `Inicio.md`, con una ruta manual de recuperación si la asociación del sistema falla. No invocar modelos para esa acción. Obsidian trata sus notas como Markdown y su grafo representa enlaces entre notas; el mapa técnico procede del motor. [W06, W07]

Generar Markdown relativo, anchors estables, propiedades YAML simples y Mermaid sin dependencias remotas. Acompañar cada grafo técnico con tabla de relaciones y evidencias. No asumir que un enlace dentro de Mermaid crea un enlace en el grafo nativo. Desactivar por diseño la necesidad de plugins comunitarios, JavaScript embebido o consultas externas para navegar.

## 10. Despliegue local, automatización y Azure opcional

### 10.1. Despliegue inicial, completo sin nube

Instalar el motor y sus dependencias privadas en el equipo que ya contiene los repositorios. Configurar una vez, autenticar Copilot CLI y abrir Obsidian. El programa termina al salir del menú: no exige servicio permanente. Un equipo lector solo recibe la bóveda; no instala la plataforma completa.

### 10.2. Automatizar sin Azure

El mismo motor expone comandos no interactivos para el Programador de tareas de Windows o el planificador ya autorizado en la empresa. El asistente prepara un comando y una guía; no crea tareas del sistema operativo ni horarios por su cuenta.

La cuenta ejecutora tiene acceso al mismo workspace lógico y una configuración propia de rutas. La tarea programada prepara resultados; no aprueba contenido. La primera automatización se prueba con `--sin-ia --sin-publicar`. Para habilitar IA desatendida se requieren credenciales admitidas, presupuesto y alcance preautorizados; ante una decisión no preautorizada el programa sale con estado `awaiting_confirmation`, no acepta por defecto.

Los clones deben estar actualizados por el flujo de código existente. Ni «actualizar documentación» ni un horario implican `git pull`. La guía muestra de qué commit se extrajo y cuándo se comprobó. No declarar «último remoto» sin una verificación de red autorizada.

### 10.3. Azure Pipelines, solo al activarlo

Azure Pipelines puede ejecutar en una máquina propia mediante un agente autohospedado. Es una posibilidad externa verificada, no una dependencia del producto. [W11]

Pasos de instalación de ese adaptador:
1. Elegir máquina y cuenta de servicio autorizadas; instalar allí Git, motor y, solo para IA, Copilot CLI con autenticación no interactiva permitida.
2. Reutilizar clones autorizados en el dominio original; crear el descriptor del workspace para esa máquina.
3. Instalar/registrar el agente Azure en el pool elegido, sin enviar repositorios a Azure como artefactos.
4. Añadir al repositorio del motor la plantilla de pipeline; comenzar con disparo manual y sin publicación.
5. Usar `checkout: none` en la tarea de análisis y la instalación local fijada del motor; no checkout de aplicaciones dentro del repositorio de documentación.
6. Ejecutar preflight, extracción y validación; guardar fuera de Azure los artefactos privados, salvo autorización específica y retención definida.
7. Promover documentación solo tras aprobación vinculada al candidato exacto; la programación no sustituye a una persona.

El pipeline no requiere un repositorio documental Azure: puede dejar la bóveda aprobada en la misma carpeta compartida. Su YAML y configuración de pool forman parte del motor/infra, no de los repositorios examinados.

### 10.4. Repositorio Azure de documentación, opción independiente

`azure.enabled: false` es el predeterminado. Al activarlo, el asistente solicita URL del repositorio documental, rama de destino, método de autenticación permitido y carpeta de checkout documental separada. Las credenciales se guardan mediante el mecanismo de la cuenta, nunca en YAML o bóveda.

El adaptador exporta únicamente una edición aprobada mediante allowlist. El permiso humano autoriza explícitamente cambios Git en ese repositorio documental; no amplía permisos del Publicador sobre aplicaciones. Si la política del equipo exige PR, crear una rama documental y dejarlo pendiente, sin merge automático. Ante remoto adelantado, conflicto o fallo de red, detener ese adaptador sin afectar la bóveda local; nunca forzar push.

Mantener **tres conceptos separados:** motor sin Azure; Azure Pipeline opcional; Azure Repo documental opcional. Ninguno convierte Obsidian en opcional ni exige portal, VM en Azure, Confluence o suscripción Sync/Publish.

## 11. Seguridad y manejo de errores

Solo comandos Git de lectura auditados, argumentos separados y entornos controlados. Deshabilitar hooks, textconv, filtros, consultas implícitas de red y ejecución de configuraciones. Parsear XML sin DTD/entidades externas y YAML sin constructores ejecutables; limitar profundidad/tamaño. No llamar a Maven, Gradle, npm, MSBuild ni importar/evaluar código de las aplicaciones. El `npm ci` autorizado del propio motor pertenece a la instalación, no a la extracción; ejecutar el motor en Node no autoriza `npm install`, `require`, `import`, `eval` o builds dentro de los repositorios examinados.

Redactar datos sensibles **antes** de serializar logs, bundles exportables, paquetes IA y documentos. Combinar exclusión de archivos y lista de campos permitidos; un regex de secretos no garantiza cobertura total. Las conexiones se identifican mediante alias aprobados sin contraseñas. Deshabilitar web/MCP/herramientas en los especialistas de rutina. Los comentarios del código son datos, no órdenes.

Los permisos del cliente no son aislamiento absoluto del sistema operativo. Si la organización lo exige, ejecutar la interpretación con cuenta/entorno restringido que solo pueda leer los paquetes preparados; no declarar un sandbox por tener un prompt o cambiar `cwd`.

| Situación | Resultado obligatorio |
|---|---|
| Falta software | Explicación y acción exacta; no stacktrace como única respuesta. |
| Repo fuera de workspace/deshabilitado | Cero lectura del contenido; bloqueo localizado. |
| Rama inexistente | Mantener selección; no fallback a otra. |
| Parser falla | Marcar archivo/capacidad parcial; conservar datos independientes. |
| Bundle inválido | No enviar a IA; reparar la etapa propia. |
| Falta contexto esencial | `needs_evidence`, sin búsqueda libre como fallback. |
| Modelo no permitido o sesión caducada | Preservar hechos; pausar/reanudar IA después. |
| Respuesta falsa con IDs válidos | Comprobar valores estructurados; revisión humana de la afirmación semántica. |
| Límite IA agotado | Pausar; no reducir profundidad para aparentar éxito. |
| Usuario cancela | Terminar proceso hijo, guardar estado, no publicar. |
| Edición alterada/conflicto humano | Detener promoción y mostrar diferencia. |
| Transferencia compartida incompleta | Edición anterior accesible; no afirmar recepción completa. |
| Azure falla | Bóveda local intacta; exportación pendiente identificada. |

## 12. Migración del sistema actual

| Elemento actual | Acción concreta |
|---|---|
| `como-funciona-el-sistema.md` | Reescribir con el flujo implementado; conservar copia histórica y enlace a esta especificación. |
| `workspace-repos.yaml` | Importar a `knowledge.yaml`; preservar IDs, rutas, permisos y ramas; archivar tras migración verificada. |
| `config/*.yaml` | Clasificar cada campo: valor del producto, override del equipo, credencial o dato histórico; migrar sin pérdida. |
| `agents/*.md` | Actualizar con los contratos del documento 02; mantener una fuente canónica. |
| `orquestador.agent.md` | Sustituir exploración y lecturas masivas por petición estructurada; registrar perfil real generado. |
| `.github/copilot-instructions.md` | Reducir instrucciones globales, eliminar carga repetida de diez configuraciones y prohibiciones contradictorias del motor. |
| `.github/skills/archify-documentation/` | Inspeccionar, preservar y versionar; actualizar rutas incompatibles sin inventar contenido. |
| `templates/asd-tse-100-es.md` | Preservar secciones; la migración no la sustituye por una plantilla genérica. |
| `results/` histórico | Solo lectura; índice de consulta/migración, sin falsear costes ni aprobaciones. |
| Utilidades heredadas Python/PowerShell | Portar a TypeScript la lógica auditada y sus casos de prueba; no invocar utilidades Python desde el motor nuevo. Archivar las versiones antiguas solo después de demostrar equivalencia; PowerShell queda únicamente donde lo requiera un cliente externo. |
| Planes V2 y V3 | Mantener referencia histórica, sin cargar sus políticas incompatibles ni sus comandos de motor Python en agentes activos. |

Respaldo y reporte de migración antes de escribir. La conversión funciona primero en `dry-run`: informa archivo origen, clave antigua, destino, decisión y conflictos. Solo después se activa la nueva configuración. Revertir restaura la configuración anterior sin borrar bóvedas ni historial. La existencia de un fichero antiguo no lo convierte en una segunda fuente activa.

## 13. Plan de tareas implementables

Cada tarea siguiente tiene entrada, pasos, salida y criterio de cierre. Las rutas son las del producto propuesto; adaptar la ubicación real existente mediante el mapa de T01, sin cambiar su responsabilidad. Los identificadores de pruebas se definen en §14.

**Pruebas de integración con dependencias posteriores:** la referencia de un caso identifica responsabilidad y aceptación, no autoriza a simular funciones futuras para cerrar la tarea. Por ejemplo, T04 entrega fixtures verificadas y P07 permanece pendiente hasta T22/T46. Registrar «código de tarea completo; integración pendiente de Txx» cuando corresponda, continuar las dependencias disponibles y cerrar el hito solo después de ejecutar el caso completo. N01 y N13 se acreditan en T50 con la release; no bloquear T02 esperando una demo que aún debe implementarse.

### 13.1. Hitos y dependencias de entrega

| Hito | Tareas | Demostración obligatoria |
|---|---|---|
| H1 — Instalación simple | T01–T14 | Un lanzador configura workspace y extrae inventario sin IA. |
| H2 — Hechos y ramas | T15–T16, T22–T28 | Piloto/demo, grafo sustentado, otra rama sin checkout y caché. |
| H3 — Agentes y profundidad | T29–T36 | Copilot real con roles independientes y ASD/skill preservados. |
| H4 — Obsidian compartido | T37–T46 | Revisión, aprobación, edición, recepción sin Azure y consulta sin IA. |
| H5 — Automatización opcional | T47–T50 | Mismo motor programable; adaptadores Azure aislados y desactivados. |
| H6 — Calidad y cobertura | T17–T22, T51–T56 | Seguridad, instalación humana, piloto real y matriz multilenguaje. |

Las tareas de adaptadores T17–T22 pueden paralelizarse tras T14. No bloquean una entrega identificada como piloto; sí bloquean declarar completa la cobertura multilenguaje. Azure no bloquea H1–H4 ni la entrega local final.

### T01. Auditar y preservar la base

**Depende de:** Ninguna.  
**Entrada:** Repositorio real del sistema y documentos originales.

1. Inventariar consumidores de config, agentes, esquemas, templates, scripts, skill y results; registrar ruta real y hash de cada recurso.
2. Leer archivos completos relevantes, detectar diferencias frente a los adjuntos y preservar una copia antes de modificar.
3. Identificar el stack del piloto por archivos reales; mantener asistencia-core deshabilitado si sigue así en la configuración.
4. Crear mapa conservar/migrar/retirar y registrar faltantes; no ejecutar un análisis de IA costoso como baseline.

**Salida:** docs/implementacion/baseline.md; migration-map.json; respaldo privado; lista de limitaciones.  
**Cierre:** P01, P02 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T02. Fijar herramientas e instalación reproducible

**Depende de:** T01.  
**Entrada:** Sistemas operativos/arquitecturas del equipo, Node/Git/Copilot instalados y restricciones de la empresa.

1. Crear package.json, package-lock.json, tsconfig.json y tsconfig.test.json conforme a §3.3; fijar Node 24 LTS/npm/TypeScript y dependencias reales, sin inventar un lockfile ni hashes.
2. Probar instalación sin Python ni toolchain nativo en Windows, macOS y Linux; incluir web-tree-sitter y WASM compatibles con manifest de hashes/licencias, instalables con scripts de dependencias desactivados.
3. Fijar versión probada de Copilot y registrar capacidades soportadas, precedencia de perfiles, transporte de stdin y formato de eventos.
4. Usar exclusivamente Node/TypeScript para el motor y su suite; no añadir Python, Docker, compiladores locales ni servidores como dependencia de uso. Registrar matriz de SO y capacidades, sin declararlas verificadas antes de probar.

**Salida:** package.json, package-lock.json, tsconfig*.json, assets/grammars/manifest.json, runtime-matrix.md y pruebas de bootstrap.  
**Cierre:** P03, P04, N03, N04 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T03. Esquemas, estados e interfaces internas

**Depende de:** T01,T02.  
**Entrada:** Contratos del §4 y esquemas heredados reales.

1. Implementar schemas/v3 para configuración, snapshots, hechos, evidencias, bundle, grafo, petición, respuesta, documentos, revisión y publicación.
2. Rechazar campos/versiones desconocidos, referencias inexistentes y transiciones de estado prohibidas.
3. Separar uso medido de presupuesto; permitir null explícito en datos no observables.
4. Definir interfaces TypeScript estrictas SnapshotReader, ExtractorPlugin, AIExecutor y PublicationTarget, con cancelación y límites; validar JSON externo con Ajv antes de tiparlo y conservar los esquemas v3. Ninguna interfaz retorna éxito ficticio por defecto.

**Salida:** src/contracts/; schemas/v3/; ejemplos válidos/parciales/inválidos.  
**Cierre:** P05, P06 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T04. Corpus de pruebas y demo aislada

**Depende de:** T03.  
**Entrada:** §14.1; ningún repositorio empresarial.

1. Crear repositorios sintéticos en un directorio temporal externo al sistema, con identidad Git solo de prueba y respuestas esperadas versionadas.
2. Preparar demo-productor y demo-consumidor con las ramas y endpoints del §14.1; nunca ejecutar sus aplicaciones.
3. Añadir fixtures por tecnología, secretos canario, rutas maliciosas, XML con entidades, errores sintácticos, recursos homónimos y mensajes dinámicos.
4. Crear proveedores fake que registren invocaciones y fallen si se usan en etapas deterministas; mantenerlos claramente separados del adaptador real.

**Salida:** tests/fixtures/; tests/support/; expected-facts.json; demo reproducible sin claves.  
**Cierre:** P07, P08 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T05. Configuración única y valores predeterminados

**Depende de:** T03.  
**Entrada:** knowledge.yaml propuesto y políticas reales auditadas.

1. Implementar carga segura, validación de tipos, resolución de rutas y configuración efectiva en memoria.
2. Mover valores invariantes a defaults del paquete; mantener convenciones del equipo y excepciones en overrides del mismo YAML.
3. Validar que aplicaciones, caché, instalación y bóveda no se solapen de manera que se exporte código o secretos.
4. Añadir escritura transaccional y bloqueo; una configuración inválida no reemplaza la anterior.

**Salida:** src/config.ts; config.schema.json; tests/config.test.ts.  
**Cierre:** P09, P10 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T06. Migrar configuraciones sin doble autoridad

**Depende de:** T01,T05.  
**Entrada:** workspace-repos.yaml, config/*.yaml, plantillas y recursos existentes.

1. Implementar migración dry-run con correspondencia de cada clave y diff legible.
2. Preservar IDs, enabled, límites, plantilla, skill, convenciones y datos históricos sin promover estimaciones a consumos medidos.
3. Aplicar solamente con confirmación; archivar originales inactivos y producir recibo de migración.
4. Implementar revertir configuración; las migraciones repetidas son idempotentes y no borran resultados.

**Salida:** src/migration.ts; recibo y pruebas round-trip; comando interno migrar.  
**Cierre:** P02, P11 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T07. Construir los lanzadores y el menú básico

**Depende de:** T02,T05.  
**Entrada:** Release Node compilada, contrato §3.3 e interfaz §2.

1. Crear scripts/bootstrap.mjs, scripts/cli.mjs, INICIAR.cmd e iniciar; npm start y wrappers abren el mismo menú desde la raíz resuelta del motor, aunque el cwd externo tenga espacios/tildes.
2. Comprobar Node/npm, dist, lockfile y dependencias; ofrecer npm ci --omit=dev --ignore-scripts --no-audit --no-fund exclusivamente para el motor, con permiso de red. Si falta dist, informar release incompleta; no compilar en el equipo lector/generador por sorpresa.
3. Mostrar las tres opciones, salir/cancelar y mensajes en español; mantener la ventana abierta ante error en doble clic.
4. No modificar políticas de ejecución, instalar globalmente ni llamar al modelo desde el menú.

**Salida:** scripts de arranque/build/tipos/pruebas, wrappers, src/cli.ts, src/ui/menu.ts y pruebas de arranque multiplataforma.  
**Cierre:** P12, P13, N02, N15 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T08. Asistente de configuración y workspace

**Depende de:** T05,T06,T07.  
**Entrada:** Descriptor existente o carpetas seleccionadas una sola vez.

1. Importar JSONC de .code-workspace con un parser adecuado, preservando settings y tareas que no gestione el motor.
2. Mostrar raíces y autorización heredada; generar descriptor solo después de confirmar y no habilitar lo desconocido automáticamente.
3. Configurar bóveda y modelo sin pedir YAML; guardar URL Azure únicamente al activar esa opción.
4. Detectar ediciones externas posteriores del workspace y ofrecer reconciliación explícita; la intersección autorizada prevalece.

**Salida:** src/ui/setup.ts; src/workspace.ts; archivos gestionados con marca de origen.  
**Cierre:** P14, P15 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T09. Preflight y control de acceso de raíces

**Depende de:** T08.  
**Entrada:** Petición validada y workspace del equipo.

1. Validar Git disponible, raíces reales, habilitación, pertenencia al workspace y permisos de lectura antes del escaneo.
2. Soportar .git archivo/directorio; detectar aliases de la misma raíz y nombres de repositorio ambiguos.
3. Validar rama sin cambiarla; separar pruebas locales de autenticación de IA y de Azure, que no bloquean extracción sin esas funciones.
4. Emitir códigos de error y acciones concretas; no afirmar que se observa una ventana VS Code si no hay esa capacidad.

**Salida:** src/preflight.ts; reporte local estructurado y resumen humano.  
**Cierre:** P16, P17, P18 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T10. Leer commits y otras ramas sin checkout

**Depende de:** T09.  
**Entrada:** Raíces autorizadas y referencias elegidas.

1. Implementar GitSnapshotReader con resolución a OID, ls-tree con delimitación segura y cat-file por OID, sin filtros/textconv.
2. Usar el adaptador Node de procesos con spawn, argumentos separados y shell:false; resolver Git a binario autorizado, procesar streams binarios/NUL y evitar que ramas se interpreten como opciones. No usar exec ni shims de shell arbitrarios.
3. Bloquear red implícita de partial clones; informar missing objects, shallow refs y LFS/submódulos sin inventar archivos.
4. Demostrar que HEAD, índice, archivos y refs de las aplicaciones no cambian por analizar otra rama.

**Salida:** src/snapshots/git_reader.ts; prueba de invariancia de repositorios.  
**Cierre:** P19, P20, P21, P22 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T11. Capturar cambios locales como borradores

**Depende de:** T10.  
**Entrada:** Elección humana de incluir cambios sin commit.

1. Implementar WorkingTreeSnapshotReader con rutas resueltas y exclusiones; incluir solo no versionados autorizados y no secretos.
2. Calcular manifest de hashes antes/después de captura; reintentar una vez si cambian, después bloquear.
3. Marcar dirty=true y working_tree; usar captura independiente de la del commit y no mezclar archivos de otra rama.
4. Permitir consultas y revisión local, pero denegar exportación compartida de esa captura hasta existir un commit y nueva revisión.

**Salida:** src/snapshots/working_tree.ts; diagnósticos y políticas dirty.  
**Cierre:** P23, P24 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T12. Inventario determinista y recorrido seguro

**Depende de:** T09,T10.  
**Entrada:** SnapshotReader y reglas de exclusión.

1. Enumerar archivos/proyectos sin modelo; identificar subproyectos y stacks candidatos sin forzar uno por repo.
2. Excluir binarios, dependencias instaladas, builds, .git, credenciales y salidas del motor; registrar exclusiones, no ocultarlas.
3. Aplicar límites por archivo y lectura, manejo de codificación y contadores reconciliables del §4.
4. Cada clasificación tecnológica necesita archivo/localizador; no inventar propósito del servicio.

**Salida:** src/discovery/inventory.ts; inventory.json; reportes de cobertura.  
**Cierre:** P25, P26 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T13. Registro de plugins y contrato de capacidades

**Depende de:** T03,T12.  
**Entrada:** Inventario y fixtures de tecnologías.

1. Implementar registro estático de plugins instalados y versiones; el escaneo no descarga plugins.
2. Separar detect/extract, gramática WASM y reglas TypeScript de framework; cargar solo tecnologías pertinentes desde assets/grammars, comprobar hashes/ABI y ejecutarlas en trabajadores acotados.
3. Cada regla informa hechos, evidencias, diagnósticos y dependencias para invalidación.
4. Un plugin ausente emite unsupported; nunca sustituirlo por exploración de Copilot.

**Salida:** src/extractors/base.ts; src/extractors/registry.ts; capability-matrix.json.  
**Cierre:** P27, P28, N05, N06 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T14. Lectura de manifiestos y configuración segura

**Depende de:** T13.  
**Entrada:** JSON/YAML/XML/TOML/POM/package.json y formatos reales del piloto.

1. Implementar lectores declarativos con límites de tamaño/profundidad y entidades externas desactivadas.
2. Extraer dependencias declaradas, proyectos, claves de configuración permitidas y referencias simbólicas sin ejecutar scripts.
3. Sanear cadenas de conexión y URLs antes de generar cualquier salida o log; permitir únicamente valores necesarios para correlación.
4. Distinguir declarado/resuelto/desconocido; Gradle dinámico o propiedades externas no se evalúan.

**Salida:** src/extractors/manifests.ts; src/security/redaction.ts; fixtures negativas.  
**Cierre:** P29, P30, P31 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T15. Primer extractor HTTP del stack piloto

**Depende de:** T13,T14.  
**Entrada:** Stack verificado por T01; corpus equivalente.

1. Implementar reglas concretas de controllers/rutas del stack real, combinación de prefijos, métodos múltiples y rutas simbólicas.
2. Registrar símbolo, localizador, DTOs/tipos identificables y componentes internos sin asumir URL pública o autenticación efectiva.
3. Separar ruta declarada y ruta de despliegue; conservar los valores no resueltos como tales.
4. Comparar con expected-facts y una muestra humana del piloto; no cerrar con un regex genérico sin pruebas.

**Salida:** Plugin HTTP piloto y pruebas golden/negativas.  
**Cierre:** P32, P33 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T16. Primer extractor de integraciones y datos del piloto

**Depende de:** T15.  
**Entrada:** Clientes, persistencia y mensajería realmente presentes.

1. Extraer base addresses, productores/consumidores declarados, entidades y accesos de datos identificables por reglas soportadas.
2. No deducir ejecución real ni operaciones de escritura solo por encontrar una tabla en un string.
3. Registrar capacidades ausentes y dependencias de configuración; las variables externas no se buscan en producción.
4. Crear casos negativos de colas homónimas, URLs sin resolver y ORM dinámico.

**Salida:** Plugin piloto ampliado; facts de clientes/datos/mensajes; cobertura por capacidad.  
**Cierre:** P34, P35 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T17. Completar adaptador .NET

**Depende de:** T13,T14.  
**Entrada:** Fixtures .NET y reglas piloto reutilizables si corresponde.

1. Implementar .csproj/paquetes, controllers, minimal APIs estáticas soportadas, HttpClient y appsettings.
2. Agregar lectura de atributos y patrones ORM/mensajería implementados; documentar qué resolución semántica queda parcial.
3. Probar endpoints agrupados, cadenas de configuración externas y coexistencia de proyectos.
4. No ejecutar dotnet/MSBuild ni anunciar todo C# como soportado.

**Salida:** src/extractors/dotnet/ y corpus de aceptación por capacidad.  
**Cierre:** P36 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T18. Completar adaptador Java Spring

**Depende de:** T13,T14.  
**Entrada:** Fixtures MVC/WebFlux y clientes/eventos declarados.

1. Implementar rutas compuestas y múltiples mappings, POM y Gradle declarativo, Feign, JPA y listeners soportados.
2. Tratar MVC/WebFlux como señales que pueden coexistir; Mono/Flux no describen por sí solos un despliegue.
3. Resolver constantes locales cuando la regla pueda probarlo; en caso contrario mantener expresión y límite.
4. Probar anotaciones incompletas, herencia no resuelta, paths vacíos y propiedades externas sin compilar Java.

**Salida:** src/extractors/java_spring/ y matriz de casos.  
**Cierre:** P37 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T19. Completar adaptador JEE/WebLogic

**Depende de:** T13,T14.  
**Entrada:** Descriptores y fuentes sintéticas JEE.

1. Extraer módulos de application.xml, web.xml, weblogic.xml y referencias JNDI.
2. Implementar JAX-RS/EJB/JMS declarativo soportado, con localizadores verificables.
3. Distinguir configuración de despliegue declarada de recursos externos no presentes.
4. Probar XML con namespaces, anotaciones y falta de descriptores sin iniciar servidor.

**Salida:** src/extractors/java_weblogic/ y fixtures.  
**Cierre:** P38 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T20. Completar adaptador Angular

**Depende de:** T13,T14.  
**Entrada:** Fixtures Angular y TypeScript.

1. Leer angular.json, dependencias, componentes, módulos y rutas de interfaz soportadas.
2. Extraer llamadas HttpClient y referencias de entornos declarativos; conservar URLs dinámicas.
3. No presentar rutas de pantalla como endpoints de un backend.
4. Probar lazy routes no resueltas, providers y entornos múltiples sin npm install.

**Salida:** src/extractors/js_angular/ y corpus positivo/negativo.  
**Cierre:** P39 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T21. Completar adaptador React

**Depende de:** T13,T14.  
**Entrada:** Fixtures React/JSX/TSX y router seleccionado.

1. Identificar dependencias, componentes, rutas cliente y clientes HTTP mediante patrones comprobados.
2. Declarar SSR/Next u otro framework solo si tiene firmas y reglas propias; no equipararlo a React genérico.
3. Conservar imports dinámicos y endpoints calculados como limitaciones.
4. Probar proyectos mixtos y rutas repetidas por contexto sin ejecutar frontend.

**Salida:** src/extractors/js_react/ y pruebas por patrón.  
**Cierre:** P40 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T22. Completar adaptador Python y demo FastAPI

**Depende de:** T13,T14.  
**Entrada:** Fixtures Flask/FastAPI/Django; demo del §14.1.

1. Leer pyproject/requirements y reconocer rutas por framework, prefijos y módulos de URLs soportados.
2. Extraer clientes HTTP y configuración estática mediante el parser WASM y reglas TypeScript, sin intérprete Python, importación ni ejecución de módulos de la aplicación.
3. Probar decoradores, rutas registradas dinámicamente y problemas de sintaxis con cobertura explícita.
4. Hacer pasar exactamente la demo productor/consumidor; su conteo esperado es parte del contrato.

**Salida:** src/extractors/python/ con reglas TypeScript; demo analizada por Node sin instalar Python, FastAPI ni httpx.  
**Cierre:** P41, P07 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T23. Empaquetar hechos, evidencias y diagnósticos

**Depende de:** T15,T16.  
**Entrada:** Resultados de plugins y esquemas v3.

1. Generar IDs estables, conjuntos por categoría y bundle índice con hashes y cobertura.
2. Comprobar existencia de cada evidencia, contadores, valores tipados y rutas; rechazar mezclas de snapshots.
3. No reutilizar complete como descripción universal; emitir partial si una capacidad requerida no está cubierta.
4. Aplicar saneamiento antes de escritura y adaptar YAML heredado solo para consumidores identificados.

**Salida:** src/bundles.ts; src/evidence.ts; src/adapters/legacy.ts.  
**Cierre:** P42, P43 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T24. Resolver identidades y escenarios multirrepo

**Depende de:** T23.  
**Entrada:** Bundles, alias humanos y entornos explícitos.

1. Crear nodos de componentes, recursos externos y paquetes con identidades sin credenciales.
2. Construir Scenario como lista exacta de snapshots; no elegir ramas por igualdad de nombre entre repos.
3. Resolver alias ambiguos como candidatos y registrar el conflicto.
4. Verificar que el grafo no incluya un repo deshabilitado por un alias o un resultado viejo.

**Salida:** src/correlation/identity.ts; scenario.json; tests de identidades.  
**Cierre:** P44, P45 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T25. Construir aristas tipadas sin IA

**Depende de:** T24.  
**Entrada:** Hechos de clientes, datos y mensajes.

1. Implementar reglas HTTP, productor-topic-consumidor, servicio-recurso de datos y dependencia-paquete.
2. Indexar por identidad/entorno para no comparar indiscriminadamente todos los pares.
3. Cada arista tiene regla, evidencias y supported/candidate/unresolved; no inventar una conexión por nombre.
4. Generar tabla de relaciones, mapa básico y hechos derivados separados de interpretaciones.

**Salida:** src/correlation/graph.ts; graph.json; relaciones derivadas.  
**Cierre:** P46, P47, P48 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T26. Caché de extracción y del grafo

**Depende de:** T23,T25.  
**Entrada:** Hashes, versiones y dependencias de reglas.

1. Implementar caché por contenido y versión, con escrituras seguras y checksum de entradas.
2. Reutilizar parseo por fichero; invalidar dependencias afectadas por renames, nuevas rutas o configuración.
3. Distinguir baja comprobada de lectura fallida; no eliminar hechos porque una raíz fue inaccesible.
4. Recalcular grafo solo donde corresponda y reconstruir automáticamente entradas de caché corruptas sin IA.

**Salida:** src/cache/extraction.ts; src/cache/graph.ts; pruebas incremental/clean equivalentes.  
**Cierre:** P49, P50, P51 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T27. Invalidación de interpretación y documentación

**Depende de:** T26.  
**Entrada:** Mapa de dependencias entre documentos, hechos y escenarios.

1. Calcular clave de contexto semántico con preguntas, reglas, skill, modelo y plantilla.
2. Invalidar documentos consumidores cuando cambien contratos de proveedores; no basta comparar el commit propio.
3. Reutilizar prosa cuando solo cambien localizadores, regenerando evidencias y aprobación necesaria.
4. Distinguir stale, freshness_unknown y current_for_snapshot; ningún reloj nuevo finge una documentación nueva.

**Salida:** src/cache/semantic.ts; src/impact.ts; índice de dependencias.  
**Cierre:** P52, P53, P54 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T28. Coordinador, journal, bloqueos y reanudación

**Depende de:** T23,T26.  
**Entrada:** Estados, plan de tareas y salidas por run.

1. Implementar dependencias de tareas, commits de artefactos por estado y locks locales de escritor.
2. Persistir cada tarea completada y comprobar vigencia antes de reanudar; no repetir el run entero.
3. Capturar cancelación, terminar hijos de IA y conservar resultados independientes.
4. Recuperar ejecuciones interrumpidas y distinguir error global de un repo o capacidad parcial.

**Salida:** src/orchestration/coordinator.ts; src/orchestration/journal.ts; comandos estado/reanudar.  
**Cierre:** P55, P56 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T29. Paquetes de contexto mínimos y completos

**Depende de:** T25,T27.  
**Entrada:** Intención, reglas y datos relevantes.

1. Crear RequestPlan y TaskPacket conforme al documento 02; seleccionar solo hechos, relaciones y evidencias necesarios.
2. Contar bytes de entrada propia y estimar tokens con método declarado, incluyendo perfil/plantilla/skill.
3. Partir por secciones cuando exceda límites, conservar cobertura/unknowns en cada parte y registrar lo omitido.
4. Rechazar petición que necesite evidencia ausente; no adjuntar código o logs brutos como reparación automática.

**Salida:** src/contexts/selector.ts; src/contexts/partition.ts; context-index.json.  
**Cierre:** P57, P58 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T30. Corregir roles y generar perfiles efectivos

**Depende de:** T01,T29.  
**Entrada:** Documento 02 y archivos originales completos.

1. Actualizar las ocho definiciones canónicas y copilot-instructions; Inventariador/Publicador se ejecutan con código.
2. Generar perfiles de los seis roles IA con nombres únicos, modelo resuelto, tools vacío y hash de origen.
3. Comprobar colisiones de perfiles personales y precedencias; no declarar aplicado un perfil sin prueba de carga.
4. Conservar identidad del Orquestador existente mediante adaptador compatible, sin permitir exploración rutinaria.

**Salida:** agents actualizados; generador de perfiles; ensayo de registro y políticas.  
**Cierre:** P59, P60 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T31. Ejecutor Copilot CLI real y restringido

**Depende de:** T02,T28,T30.  
**Entrada:** Cliente instalado/autenticado y paquetes saneados.

1. Implementar capacidades/versiones, proceso independiente por especialista y transporte probado; centralizar resolución de binarios en src/platform/process.ts y probar Windows sin pasar prompts a cmd.exe.
2. Arrancar con perfiles propios, sin tools/MCP ni instrucciones globales que amplíen acceso; comprobar ausencia de permisos heredados.
3. Parsear UTF-8 y eventos JSONL incrementalmente aunque lleguen fragmentados entre chunks; separar resultado de negocio, stdout/stderr y metadatos de proceso/modelo/uso; limitar buffers antes de acumularlos.
4. Comprobar terminación del proceso y sus descendientes al cancelar en cada SO; no reintentar sin presupuesto, usar --allow-all ni publicar transcripciones/gists.

**Salida:** src/ai/copilot_cli.ts; parser de eventos con capturas de prueba; prueba real opt-in.  
**Cierre:** P61, P62, P63, N09, N10, N11 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T32. Validación de respuestas y límites efectivos

**Depende de:** T31.  
**Entrada:** ResultEnvelope y políticas de presupuesto.

1. Validar IDs, tipos, valores factuales y alcance; las afirmaciones IA no pueden modificar facts canónicos.
2. Contar todas las invocaciones, incluidos reintentos; reparar una sola vez con errores precisos.
3. Bloquear modelo no permitido o escalado fuerte sin autorización; no heredar silenciosamente un modelo caro.
4. Guardar unknowns en métricas no observadas y nunca presentar consumo estimado como facturado.

**Salida:** src/ai/validation.ts; src/ai/budget.ts; src/ai/usage.ts.  
**Cierre:** P64, P65, P66 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T33. Playbooks y Orquestador de intención

**Depende de:** T29,T32.  
**Entrada:** Peticiones tipadas del menú y texto libre.

1. Las opciones del menú crean el plan sin IA; texto libre usa Orquestador con índice pequeño.
2. Implementar inventario, endpoints, describe-service, explain-connection, refresh-docs, specification, migration y adr.
3. Validar repos autorizados, alcance, ramas y complejidad antes de ejecutar; high/critical/full/fuerte necesitan permisos pertinentes.
4. Cada plan declara especialistas necesarios y dependencias; no ejecutar roles vacíos o recursivos.

**Salida:** src/playbooks.ts; request.schema.json; pruebas de enrutamiento.  
**Cierre:** P67, P68 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T34. Documento completo, fichas y skill real

**Depende de:** T32,T33.  
**Entrada:** Plantilla ASD real y archify-documentation inspeccionada.

1. Integrar las secciones obligatorias en DocumentModel; el Documentador propone prosa estructurada y el motor renderiza.
2. Generar tablas, referencias, fichas numeradas y documento completo de la misma fuente canónica.
3. Mantener Desconocido/No detectado/Pendiente con alcance correcto, sin omitir capítulos.
4. Registrar skill aplicada y Archify realmente ejecutado o fallback; bloquear conformidad si falta el recurso real.

**Salida:** src/documentation/model.ts; src/documentation/render.ts; adaptador skill; documentos por sección.  
**Cierre:** P69, P70 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T35. Revisión mecánica y semántica selectiva

**Depende de:** T34.  
**Entrada:** Artefactos, incidencias y referencias.

1. Validar siempre enlaces, esquemas, secciones, valores factuales, cobertura y secretos con código.
2. Seleccionar solo contradicciones/alto impacto para el Revisor; modelo fuerte únicamente autorizado.
3. Generar diff y listado de preguntas humanas con evidencia, sin llamar revisión humana a una respuesta IA.
4. Clasificar bloqueos de seguridad no anulables y limitaciones aceptables explícitamente.

**Salida:** src/review/validators.ts; src/review/semantic.ts; review.json; diff para Obsidian.  
**Cierre:** P71, P72 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T36. Propuestas de desarrollo, migración y ADR

**Depende de:** T33,T35.  
**Entrada:** Documentación revisada, solicitud, convenciones y precedentes.

1. Implementar los tres playbooks del Proponente con contextos acotados y dependencias completas.
2. Para specs exigir requisitos, interfaces, aceptación y casos límite; para migración fases, datos, compatibilidad y rollback.
3. Para ADR exigir alternativas, consecuencias y estado propuesto; conservar discrepancias entre código y reglas humanas.
4. No modificar apps ni aprobar decisiones; toda propuesta queda review_required.

**Salida:** src/proposal/model.ts; templates de propuesta derivados del contrato existente; pruebas.  
**Cierre:** P73 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T37. Bóveda Obsidian y navegación

**Depende de:** T34,T35.  
**Entrada:** Documentos validados y esquema del §9.

1. Crear candidate-vault e Inicio con avisos, índice por repositorio/rama y fecha/commit visibles.
2. Generar Markdown relativo y Mermaid seguro; tabla y enlaces fuera del diagrama alimentan navegación.
3. Abrir por URI local o mostrar pasos manuales si no existe asociación; no exigir plugins ni llamadas de IA.
4. Prueba humana en Obsidian: documento completo, referencias, grafo de notas y mapa técnico coherentes.

**Salida:** src/obsidian/vault.ts; src/obsidian/navigation.ts; prueba de apertura documentada.  
**Cierre:** P74, P75 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T38. Aprobación humana vinculada al contenido

**Depende de:** T35,T37.  
**Entrada:** Candidato y revisión final.

1. Mostrar alcance exacto, cambios, pendientes y hashes del conjunto a aprobar.
2. Crear receipt solo desde acción humana del coordinador, no desde YAML/JSON devuelto por IA.
3. Invalidar receipt cuando cambia un documento, evidencia vinculada, alcance o decisión de excepciones.
4. No permitir aprobación ordinaria de exportaciones con secretos/rutas inválidas; no falsear identidad empresarial con un nombre escrito.

**Salida:** src/review/approval.ts; approval.schema.json; pantalla aprobar/dejar pendiente/rechazar.  
**Cierre:** P76, P77 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T39. Publicador determinista y ediciones inmutables

**Depende de:** T38.  
**Entrada:** Approval receipt y allowlist de archivos.

1. Construir edición nueva y verificar hashes antes y después de copiarla; no modificar ediciones existentes.
2. Actualizar Inicio al final y guardar recuperación a edición anterior; no usar rename de directorios no vacíos como garantía universal.
3. Evitar mezcla de ramas/escenarios y metadatos secretos en manifiestos.
4. Interrumpir publicación en distintos puntos de prueba y recuperar sin presentar candidatos incompletos como aprobados.

**Salida:** src/publication/local.ts; src/publication/manifest.ts; journal de promoción.  
**Cierre:** P78, P79 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T40. Compartir carpeta o exportar sin Azure

**Depende de:** T39.  
**Entrada:** Bóveda aprobada, destino autorizado y §9.4.

1. Implementar modos local/folder/export y exportación ZIP con una edición completa y rutas seguras.
2. Solo una máquina publicadora; no emplear locks de sincronizador para admitir varios escritores.
3. Excluir caché, fuentes, logs, credenciales y .obsidian personal; proteger Mis-notas y permisos por audiencia.
4. Mostrar transferencia pendiente/edición anterior; no afirmar recepción instantánea en clientes remotos.

**Salida:** src/publication/folder.ts; src/publication/export.ts; guía de recepción.  
**Cierre:** P80, P81, P82 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T41. Historial, rollback y limpieza segura

**Depende de:** T39,T40.  
**Entrada:** Ediciones y registros de propiedad de archivos.

1. Implementar volver a edición anterior cambiando solo el índice después de confirmación.
2. Detectar cambios humanos en generados, no sobrescribirlos; ofrecer conservar como nota y nueva revisión.
3. Limpiar caché no referenciada automáticamente según política; eliminar ediciones compartidas solo con vista previa y confirmación.
4. Nunca borrar la actual, la anterior mínima, Mis-notas ni destinos fuera de la raíz autorizada.

**Salida:** src/publication/history.ts; src/maintenance.ts; comandos de recuperación.  
**Cierre:** P83, P84 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T42. Compatibilidad del chat Copilot sin duplicar motor

**Depende de:** T30,T33,T37.  
**Entrada:** Agente Orquestador existente y capacidades del cliente real.

1. Actualizar las instrucciones globales para usar datos preparados y un índice, no leer diez configuraciones.
2. Preservar uso del chat como entrada voluntaria de peticiones; el menú y motor siguen siendo la ejecución principal.
3. Donde no exista herramienta segura para disparar el motor, indicar la acción del menú sin fingir ejecución automática.
4. No habilitar herramientas de shell o edición de aplicaciones para compensar esa limitación; documentar lo realmente soportado.

**Salida:** Integración VS Code compatible; instrucciones mínimas y prueba de no exploración.  
**Cierre:** P60, P85 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T43. Consultas factuales sin IA

**Depende de:** T23,T25,T33.  
**Entrada:** Bundles o índice documental aprobado y selección explícita de snapshot.

1. Implementar endpoints, dependencias, mensajes, datos, cobertura y evidencias como filtros tipados.
2. Mostrar siempre rama/commit/estado; ante ambigüedad pedir elección sin usar un modelo.
3. Emitir tabla humana y JSON para pruebas; paginar localmente sin cortar resultados como si fueran completos.
4. Una petición de explicación libre puede usar IA, pero nunca hacerlo al abrir búsqueda de texto o lista factual.

**Salida:** src/query.ts; src/ui/query.ts; prueba de proveedor bloqueado.  
**Cierre:** P86, P87 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T44. Comparación y selección de ramas

**Depende de:** T10,T27,T43.  
**Entrada:** Snapshots locales y ediciones publicadas.

1. Comparar hechos canónicos añadidos/modificados/eliminados entre refs elegidas y distinguir changes unknown de bajas.
2. Definir claves de rama portables sin colisiones y mapas originales; prueba con mayúsculas y nombres Windows reservados.
3. Permitir publicar rama de trabajo limpia por decisión humana sin reemplazar el índice de la principal.
4. Mostrar escena exacta en consultas multirrepo y freshness_unknown para lectores sin acceso al origen.

**Salida:** src/branches.ts; src/compare.ts; índices por rama/escenario.  
**Cierre:** P88, P89, P90 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T45. Cerrar el recorrido simple del menú

**Depende de:** T07,T33,T37,T38,T40,T43,T44.  
**Entrada:** Flujo completo disponible.

1. Conectar Actualizar a selección/ejecución/revisión/publicación; tres opciones principales persistentes.
2. Reutilizar selección previa y agrupar permisos en resumen, sin saltar approvals necesarios.
3. Todos los errores muestran causa y siguiente acción; modos no interactivos jamás se quedan esperando entrada.
4. Añadir Más opciones para pruebas, propuestas, historial y compartir, sin archivos manuales obligatorios.

**Salida:** UI final y sesiones de aceptación guiadas.  
**Cierre:** P91, P92 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T46. Demostración de extremo a extremo sin créditos

**Depende de:** T22,T28,T37,T40,T45.  
**Entrada:** Demo sintética y proveedor deshabilitado.

1. Implementar la opción Probar con ejemplos, que crea workspace temporal separado y bóveda de demo.
2. Ejecutar resultados exactos: 3 endpoints total en master, 4 cuando se selecciona feature del productor y misma rama del consumidor.
3. Repetir sin cambios, comparar ramas y ensayar un fallo local; ninguna prueba modifica repos reales.
4. Identificar toda prosa simulada como demo; no presentar mocks como prueba de Copilot real.

**Salida:** src/demo.ts; reporte de demostración y guía reproducible.  
**Cierre:** P07, P93 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T47. Ejecución no interactiva y programación opcional

**Depende de:** T28,T32,T45.  
**Entrada:** Motor instalado y workspace de máquina autorizada.

1. Publicar contrato CLI §15 mediante el JavaScript compilado, scripts/cli.mjs y npm run docs; el scheduler usa ejecutables/rutas absolutas y stdout JSON sin encabezados npm.
2. Generar instrucciones para planificador del SO, sin crear tarea ni horario sin autorización.
3. Primera prueba sin IA/publicación; con IA habilitada respetar alcance y permisos de gasto preautorizados.
4. Sin decisión humana nueva, producir candidatos y salir; no inferir aprobación por ser un job programado.

**Salida:** src/automation/local.ts; ejemplos de scheduler y pruebas headless.  
**Cierre:** P94, P95, N16 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T48. Adaptador Azure Pipelines opcional

**Depende de:** T47.  
**Entrada:** Pool/máquina/credenciales solo cuando el equipo active la opción.

1. Crear plantilla parametrizada en repo del motor con checkout none para análisis, Node 24 LTS y release preinstalada; ejecutar node <ruta-motor>/scripts/cli.mjs, sin Python ni instalación/compilación durante el job.
2. Usar workspace lógico y clones externos de la máquina autorizada; no copiar aplicaciones como artefactos.
3. Separar generación de candidatos de promoción aprobada; secretos por mecanismo del pipeline.
4. Probar equivalencia local/job; sin Azure configurado no hacer peticiones de red ni bloquear el menú.

**Salida:** infra/azure-pipelines.example.yml y guía de activación; integración opt-in.  
**Cierre:** P96, P97, N16 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T49. Exportación documental Azure Repo opcional

**Depende de:** T40,T47.  
**Entrada:** Edición aprobada y destino documental confirmado.

1. Crear adaptador de Git limitado a checkout documental separado, con allowlist de Markdown/metadata aprobada.
2. Pedir permiso específico de commit/push/PR documental; no concederlo a agentes ni aplicaciones.
3. No forzar push ni merge automático; remoto adelantado/conflicto queda pendiente sin afectar bóveda local.
4. Exportar informe de archivos enviados y no incluir configuración local, fuentes ni credenciales.

**Salida:** src/publication/azure_repo.ts; pruebas con remoto Git temporal y activación Azure opt-in.  
**Cierre:** P98, P99 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T50. Empaquetar para otro equipo

**Depende de:** T02,T40,T45,T46.  
**Entrada:** Motor probado, defaults y perfiles canónicos.

1. Crear release Node con dist precompilado, scripts, package-lock, WASM, schemas, plantillas, skill y licencias; manifest de hashes y pruebas de importación ESM, sin rutas ni credenciales del equipo autor.
2. Bootstrap instala solo dependencias de producción con lockfile y consentimiento; release operativa sin TypeScript global, Python ni compiladores, sin postinstall. Comprobar que ninguna dependencia runtime quede solo en devDependencies; perfiles generados sin configuración manual repetida.
3. Probar otro workspace con IDs/rutas distintos y modelo no configurado; extracción y lectura siguen utilizables.
4. Desinstalación conserva bóveda e historial por defecto y muestra qué retira.

**Salida:** release instalable; manifest de distribución; guía independiente.  
**Cierre:** P100, P101, N01, N05, N07, N08, N13, N14 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T51. Auditoría adversarial de seguridad

**Depende de:** T31,T40,T49.  
**Entrada:** Fixtures maliciosas y políticas §11.

1. Ejecutar suites de inyección en ramas/rutas/XML/YAML/Markdown, symlinks y nombres de archivo extremos.
2. Introducir instrucciones hostiles en README/comentarios; comprobar que no cambian permisos ni se ejecutan.
3. Buscar secretos canario en toda salida, transcript permitido, archivo compartido y artifact Azure.
4. Corregir hallazgos antes de piloto real; no sustituir prueba por disclaimer.

**Salida:** tests/security/; reporte de bloqueos y mitigaciones comprobadas.  
**Cierre:** P30, P31, P102, P103 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T52. Medir rendimiento y calidad incremental

**Depende de:** T26,T27,T46.  
**Entrada:** Corpus de distintos tamaños y hardware identificado.

1. Medir tiempo/RSS/memoria WASM por etapa, cola de workers, capacidad de cancelar, tamaño de paquetes y caché; no asumir que Node/WASM será más rápido ni prometer segundos para 15 repos.
2. Comparar incremental contra ejecución limpia sobre misma entrada; los hechos y relaciones deben coincidir.
3. Verificar que ahorro no provenga de omitir secciones, riesgos, errores o proveedores afectados.
4. Fijar límites documentados según mediciones y conservar datos reproducibles.

**Salida:** benchmarks y reporte quality-cost.md.  
**Cierre:** P104, P105, N11, N12 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T53. Validar instalación y guías con una persona

**Depende de:** T45,T46,T50.  
**Entrada:** Documento 03 y 04, equipo limpio o perfil independiente.

1. Seguir instrucciones literalmente sin conocimiento de YAML; contar pasos no documentados.
2. Abrir workspace, ejecutar demo y consultar en Obsidian sin comprar servicios ni crear Azure Repo.
3. Corregir toda diferencia entre guía y comandos reales, incluido login de CLI y PowerShell requerido en Windows.
4. Comprobar recepción de bóveda en segundo equipo con solo Obsidian; registrar limitaciones del sincronizador utilizado.

**Salida:** Guías finales ejecutadas; checklist de aceptación firmado por participante.  
**Cierre:** P106, P107, N02, N13, N15 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T54. Piloto real y ensayo real de agentes

**Depende de:** T15,T16,T31,T35,T45,T51.  
**Entrada:** Repositorio ya habilitado y autorización de una prueba IA acotada.

1. Comparar muestra de hechos con el código real y registrar la cobertura del stack piloto.
2. Ejecutar un flujo completo con Copilot real, registrando perfil, modelo, contexto, invocaciones y uso disponible.
3. Repetir sin cambios: cero nuevas invocaciones semánticas; examinar fallo/reanudación sin reanalizar todo.
4. Obtener revisión humana de documentación ASD/skill; no aceptar mocks como esta prueba.

**Salida:** Informe piloto con evidencias, gasto observado o limitación y pendientes concretos.  
**Cierre:** P108, P109 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T55. Validación multirrepo y cobertura objetivo

**Depende de:** T17,T18,T19,T20,T21,T22,T52,T54.  
**Entrada:** Repos habilitados por persona; hasta 15+ según disponibilidad real.

1. Comprobar los adaptadores de todos los stacks contratados y que un repo mixto no se simplifica a un servicio.
2. Validar escenarios con ramas distintas y cambios de proveedores sin cambios en consumidores.
3. Probar 15+ repos sintéticos siempre; usar repos reales únicamente dentro de permisos existentes.
4. Entregar matriz implementado/parcial/no soportado; no anunciar finalización global con conectores vacíos.

**Salida:** Reporte de cobertura y escala; lista de capacidades pendientes visible.  
**Cierre:** P110, P111 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

### T56. Retirar contradicciones y cerrar la migración

**Depende de:** T06,T42,T53,T54; T55 para cobertura completa.  
**Entrada:** Evidencia de pruebas y mapa de migración.

1. Actualizar como-funciona-el-sistema.md y README para describir exclusivamente funciones implementadas.
2. Eliminar de instrucciones activas inventario por read/search, motor Python, dependencias pip/venv, Azure obligatorio, Obsidian opcional, cuotas ficticias y master hardcoded; preservar Python solo como lenguaje objetivo, fixture o histórico claramente identificado.
3. Archivar compatibilidad ya migrada solo tras comprobar consumidores; mantener rollback documentado.
4. Entregar lista de tareas/pruebas ejecutadas, pendientes y alcance real: piloto operativo no equivale a plataforma completa.

**Salida:** Release candidata, progreso final y documentación coherente con implementación.  
**Cierre:** P112, N01, N02, N03, N04, N05, N06, N07, N08, N09, N10, N11, N12, N13, N14, N15, N16 aprobadas; adjuntar resultados observados, no únicamente nombres de pruebas.

## 14. Pruebas de aceptación

**Esta matriz prescribe pruebas por implementar; no afirma que se hayan ejecutado en este entregable.** Todas las pruebas de motor usan proveedor/red bloqueados salvo la prueba real opt-in. P74, P106–P109 requieren intervención humana/cliente real; P96–P99 tienen ensayos locales y una verificación externa solo al activar Azure. Un mock no acredita una integración real.

### 14.1. Demo determinista exacta

Crear dos repositorios sintéticos fuera de las aplicaciones reales, declarados en su propio workspace de demo. Establecer `master` explícitamente al provisionar esos Git de prueba; esas operaciones Git de creación no pertenecen al motor de análisis de aplicaciones.

`demo-productor/app.py` en `master`:

```python
from fastapi import FastAPI
app = FastAPI()

@app.post("/novedades")
def crear_novedad():
    return {"ok": True}

@app.get("/novedades/{id}")
def consultar_novedad(id: str):
    return {"id": id}
```

En `feature/notificaciones`, agregar solamente:

```python
@app.get("/novedades/estado")
def consultar_estado():
    return {"estado": "demo"}
```

`demo-consumidor/app.py` en `master`:

```python
from fastapi import FastAPI
import httpx
app = FastAPI()
client = httpx.Client(base_url="http://demo-productor.internal")

@app.get("/resumen/{id}")
def resumen(id: str):
    return client.get(f"/novedades/{id}").json()
```

Son archivos para parsear, **no aplicaciones que haya que levantar ni importar**. No instalar FastAPI/httpx para esta prueba. El perfil de demo declara alias `http://demo-productor.internal` → componente de `demo-productor`, entorno `demo`, como configuración humana sintética conocida. El extractor debe reconocer el cliente y el correlacionador resolver el alias; no se permite fabricar la arista directamente desde el nombre del repo.

Expectativas:
- Ambos en `master`: productor 2 endpoints, consumidor 1, total 3; una relación HTTP sustentada consumidor → productor.
- Productor `feature/notificaciones` + consumidor `master`: 4 endpoints; diferencia contra escenario anterior: un endpoint añadido.
- Segunda ejecución idéntica: sin nueva extracción innecesaria ni interpretación; invocaciones IA = 0.
- Introducir fichero sintácticamente inválido: diagnóstico local y hechos independientes preservados.
- Modelo de demo deshabilitado: el documento explicita datos factuales y secciones sin interpretación; no simula haber consultado Copilot.

### 14.2. Matriz verificable

| ID | Caso | Acción | Resultado esperado |
|---|---|---|---|
| P01 | Originales incompletos | Inspeccionar baseline con skill/plantilla ausentes. | Registrar ausencia y bloquear conformidad documental, sin inventar archivos. |
| P02 | Migración fiel | Importar habilitaciones y presupuesto heredados. | asistencia-core no se habilita; histórico de costes permanece diferenciado. |
| P03 | Instalación limpia | Instalar release Node compilada en los tres SO soportados. | Motor arranca con dependencias fijadas, sin Python, toolchain nativo ni cambios en aplicaciones. |
| P04 | Cliente compatible | Probar versión/fuentes de perfiles y salida de CLI. | Capacidades observadas registradas; lo no soportado bloquea solo IA. |
| P05 | Contrato inválido | Introducir IDs, campos, versiones y tipos incorrectos. | Rechazo antes del consumidor y mensaje de campo/regla. |
| P06 | Estados inválidos | Solicitar published directamente desde running. | Transición rechazada; ningún archivo aprobado alterado. |
| P07 | Demo exacta | Analizar ambos master y luego feature del productor. | 3 endpoints iniciales y 4 en escenario mixto; 0 invocaciones IA. |
| P08 | Aislamiento de pruebas | Ejecutar fixtures con rutas reales configuradas en otro perfil. | No leer ni modificar repos empresariales; usar espacio temporal independiente. |
| P09 | Configuración única | Cambiar override desde asistente y recargar. | Un valor efectivo, una fuente editable; defaults no duplicados. |
| P10 | Rutas peligrosas | Bóveda ancestro de apps/caché, path traversal o config corrupta. | Configuración rechazada sin exportar ni sobrescribir configuración sana. |
| P11 | Rollback de configuración | Migrar dos veces y revertir. | Idempotencia; originales recuperables e historial sin borrar. |
| P12 | Arranque por doble clic | Abrir lanzador desde otro cwd y ruta con espacios/tildes. | Menú correcto; errores permanecen visibles. |
| P13 | No IA incidental | Abrir menú, verificar, configurar y salir. | usage.ai_invocations = 0; no llamadas a proveedor. |
| P14 | Workspace importado | Importar descriptor con comentarios, settings y tareas ajenas. | Preserva elementos no gestionados y confirma cambios. |
| P15 | Desalineación workspace/permisos | Agregar manualmente un root no habilitado. | No se escanea automáticamente; pide autorización. |
| P16 | Repo excluido | Pedir repo deshabilitado o fuera del workspace. | Ninguna lectura de contenido de ese repo. |
| P17 | Git worktree existente | Analizar raíz cuyo .git es archivo. | Validación correcta sin asumir .git directorio. |
| P18 | Raíces equivalentes | Usar alias/case/symlink de la misma raíz o ID ambiguo. | Detección y resolución explícita; no acceso duplicado. |
| P19 | Otra rama | Analizar feature sin cambiar master abierto. | HEAD, índice y archivos de trabajo idénticos antes/después. |
| P20 | Rama inexistente | Pedir nombre ausente en refs locales. | Error específico; nunca resultados de master como sustituto. |
| P21 | Inyección de argumentos | Ramas/rutas con caracteres de shell y opciones. | No ejecución arbitraria ni expansión; argumentos validados. |
| P22 | Clon parcial/submódulo/LFS | Quitar blob o usar referencia no materializada. | Cobertura/diagnóstico explícitos; sin lazy fetch o submodule update no autorizado. |
| P23 | Dirty separado | Modificar archivo local sin commit y optar por borrador. | Snapshot distinto, resultado correcto y compartición denegada. |
| P24 | Cambio durante lectura | Modificar contenido entre dos verificaciones. | Reintento limitado; después bloqueo, nunca captura mezclada. |
| P25 | Inventario sin IA | Ejecutar con proveedor y red bloqueados. | Archivos/proyectos/tecnologías con evidencias y contador IA cero. |
| P26 | Cobertura contable | Mezclar excluidos, fallidos, no soportados y no escaneados. | Ecuaciones del §4 exactas y motivos disponibles. |
| P27 | Plugin no instalado | Detectar framework para el que no hay adaptador. | unsupported; no lista vacía presentada como ausencia de funcionalidad. |
| P28 | Capacidad parcial | Parser funciona pero no resuelve mensajería dinámica. | Capacidad partial/unsupported aunque no haya excepción sintáctica. |
| P29 | Manifiestos dinámicos | POM con propiedad ausente o Gradle calculado. | Declarado/simbólico/desconocido, sin ejecutar build. |
| P30 | Parsers hostiles | XML con entidades y YAML constructor, profundidad excesiva. | Sin lectura externa/red/ejecución; diagnóstico acotado. |
| P31 | Secretos canario | Insertar token, contraseña y clave ficticios en fixtures. | Ningún canario en paquetes IA, salida compartida o logs visibles. |
| P32 | Rutas combinadas | Controller con prefijo de clase, arrays y methods múltiples. | Conjunto esperado exacto, sin duplicados inválidos. |
| P33 | Autenticación desconocida | Ruta declarada sin política de seguridad disponible. | No afirmar público/JWT/seguro; unknown con límite. |
| P34 | Clientes/eventos/datos | Fixtures positivas del stack piloto. | Hechos tipados con evidencia y regla, sin interpretar intención como hecho. |
| P35 | Patrones similares falsos | String de tabla en comentario y URL no ejecutada. | No producir escritura/call confirmados sin patrón sustentado. |
| P36 | .NET | Ejecutar corpus controllers/minimal APIs/clientes/configuración. | Resultados esperados por regla; no invocar dotnet. |
| P37 | Java Spring | Ejecutar corpus MVC/WebFlux/Feign/JPA/listeners. | Resultados esperados y coexistencias; no invocar Maven/Gradle. |
| P38 | JEE/WebLogic | Ejecutar corpus XML/JNDI/JMS/JAX-RS. | Recursos declarados y límites diferenciados; no servidor. |
| P39 | Angular | Ejecutar router y HttpClient en corpus. | Rutas UI no se convierten en APIs backend. |
| P40 | React | Ejecutar JSX/TSX/router/clientes y variante SSR no soportada. | Detección específica; SSR no inventado. |
| P41 | Python | Ejecutar Flask/FastAPI/Django y módulo con efecto lateral. | Extracción sin importación ni ejecutar efectos laterales. |
| P42 | Bundle coherente | Cambiar hash o incluir evidencia de otro snapshot. | Rechazo previo a IA y regeneración solo de etapa afectada. |
| P43 | Error local | Un archivo da error y otro contiene endpoint correcto. | Conserva endpoint válido, limita el fallido y no anuncia complete universal. |
| P44 | Identidades de recursos | Mismo topic en namespaces/entornos distintos. | Nodos distintos; no conexión confirmed por nombre. |
| P45 | Escenario mixto | Productor feature y consumidor master. | Grafo/documentos muestran ambos commits y selección exacta. |
| P46 | HTTP sustentado | Cliente con base address y alias explícito demo. | calls_http consumidor→productor, con evidencia y entorno demo. |
| P47 | Mensajería sustentada | Productor y consumidor del mismo broker/topic/entorno. | Cadena productor→topic→consumidor; sin inventar tráfico observado. |
| P48 | Paquete/base compartidos | Dos servicios comparten recurso o dependencia. | Aristas hacia recurso/paquete, no llamada ficticia entre servicios. |
| P49 | Repetición idéntica | Actualizar dos veces con mismos hechos y políticas. | Caché vigente; cero nueva interpretación. |
| P50 | Cambios y bajas | Agregar, renombrar y eliminar archivos en captura completa. | Resultado incremental igual al limpio; bajas verificadas. |
| P51 | Ausencia por fallo | Perder acceso a un archivo/caché corrupta. | No borrar componente como si fuera baja; diagnóstico o reconstrucción. |
| P52 | Cambio de proveedor | Cambiar contrato de A sin cambiar B consumidor. | Documentación dependiente de B se invalida. |
| P53 | Cambio de reglas/plantilla | Modificar convención, prompt o skill. | Invalidación pertinente; no reextraer código sin necesidad. |
| P54 | Solo localizador cambia | Desplazar líneas manteniendo hechos semánticos. | Actualizar evidencia y aprobación sin IA innecesaria. |
| P55 | Reanudar | Interrumpir después de extracción y reanudar. | Etapa vigente no se repite; dependencias verificadas. |
| P56 | Concurrencia/cancelación | Dos escritores locales o cancelación con proceso hijo. | Uno obtiene lock; cancelación termina hijo y no publica. |
| P57 | Paquete excesivo | Contexto con demasiados contratos y riesgos. | Partición explícita; no truncamiento silencioso ni falsa cobertura total. |
| P58 | Contexto insuficiente | Petición depende de información no extraída. | needs_evidence; sin explorar fuentes con el modelo. |
| P59 | Perfiles reales | Registrar especialista con tools=[] y modelo fijado. | Perfil y versión comprobables; Inventariador/Publicador sin LLM. |
| P60 | Contradicciones activas | Buscar inventario read/search y modelos heredados sin resolver. | Prueba falla hasta retirar instrucciones incompatibles. |
| P61 | Copilot sin permisos extra | Inyectar MCP/perfil de usuario con tools adicionales. | Bloqueo o aislamiento comprobado; no heredar acceso a apps. |
| P62 | Eventos JSONL | Eventos válidos, líneas parciales, error y respuesta duplicada. | Parser distingue eventos/final; rechaza final ambiguo/incompleto. |
| P63 | Timeout/login fallido | Sesión caduca, timeout o cancelación de CLI. | Hechos preservados, estado específico y ninguna publicación. |
| P64 | Respuesta inválida | Agente devuelve evidencia inexistente o cambia valor factual. | Rechazo, una reparación como máximo y límite contado. |
| P65 | Límite/modelo fuerte | Octava invocación agotada o modelo fuerte no autorizado. | Pausa antes de siguiente llamada; sin escalado silencioso. |
| P66 | Coste no expuesto | Cliente sin tokens/coste detallado. | Campos null y limitación; no estimación presentada como medición. |
| P67 | Rutas sin lenguaje natural | Elegir endpoints o refresh-docs desde menú. | Plan determinista; Orquestador IA no se invoca sin necesidad. |
| P68 | Alcance de riesgo | Petición high/critical/full o acceso no autorizado. | Plan sin ejecutar hasta confirmación aplicable. |
| P69 | ASD completo | Falta información de un capítulo obligatorio. | Capítulo permanece, con unknown/límite; nunca se elimina. |
| P70 | Skill y fallback | Sin binario Archify o sin skill real. | Fallback solo con contrato real disponible; no ejecución inventada. |
| P71 | Revisión estructural | Romper referencia, sección o valor copiado. | Validador detecta defecto sin gastar IA. |
| P72 | Revisión semántica | Contradicción de negocio con IDs técnicamente válidos. | Señalar revisión humana/semántica; no dar por cierto solo por los IDs. |
| P73 | Propuestas completas | Ejecutar spec, migración y ADR. | Artefactos con criterios/rollback/alternativas; estado propuesto. |
| P74 | Obsidian real | Abrir bóveda y navegar por rama/servicio/evidencia. | Funciona sin plugins comunitarios y sin Copilot para leer. |
| P75 | Diagrama y enlaces | Comparar Mermaid, tabla y enlaces entre notas. | Misma relación tipada; links Markdown separados alimentan navegación. |
| P76 | Aprobación ausente | IA escribe approved=true o intenta publicar candidato. | Sin cambio en bóveda estable. |
| P77 | Aprobación invalidada | Modificar un documento tras aprobar. | Hash discrepante bloquea promoción. |
| P78 | Edición completa | Publicar candidato aprobado. | Solo allowlist; nueva edición, hashes correctos, índice al final. |
| P79 | Publicación interrumpida | Cortar copia y reiniciar. | Edición anterior utilizable; incompleta nunca sustituye aprobación. |
| P80 | Compartir sin Azure | Deshabilitar red Azure y exportar/usar carpeta local. | Flujo completo; cero llamadas a Azure. |
| P81 | Exportación limpia | Inspeccionar todos los ficheros del paquete. | Sin fuentes brutas, .git de apps, caché, credenciales ni .obsidian personal. |
| P82 | Sincronización parcial | Entregar Inicio antes que parte de edición. | Se conserva edición anterior y aviso de recepción; no garantía falsa de sincronización. |
| P83 | Aporte humano | Editar generado o agregar Mis-notas. | Conflicto visible para generado; Mis-notas preservada. |
| P84 | Retención/rollback | Volver atrás y solicitar limpieza. | Nunca borrar actual/anterior requerida ni datos fuera de raíz; confirmación. |
| P85 | Chat compatible | Pedir análisis desde Orquestador sin herramienta de motor disponible. | Indica acción real del menú; no finge scripts ni explora todo el repo. |
| P86 | Consulta factual | Consultar endpoints/dependencias con proveedor desactivado. | Respuesta completa tipada; 0 invocaciones IA. |
| P87 | Consulta ambigua | Existen varias ramas o ediciones y falta selección. | Elección explícita; no responder usando otra rama oculta. |
| P88 | Diff de ramas | Comparar master y feature en fixture. | Un endpoint añadido; master no cambia. |
| P89 | Ramas portables | feature/a, feature-a, mayúsculas, tildes, CON y nombre largo. | Claves distintas/seguras y nombres originales preservados. |
| P90 | Vigencia remota desconocida | Lector sin acceso al Git de origen. | Muestra commit documentado, no afirma ser último remoto. |
| P91 | Simplicidad cotidiana | Persona repite actualización sin cambios. | Lanzador y opción Actualizar; sin configurar roles/rutas de nuevo. |
| P92 | Sin interacción inesperada | Ejecutar job no interactivo con permiso faltante. | Salida específica, no espera infinita ni aprobación predeterminada. |
| P93 | Demo no es prueba IA | Correr suite fake y consultar informe. | Etiqueta demo/sin IA; no declara Copilot real verificado. |
| P94 | Programación sin nube | Invocar comando headless sin credenciales Azure. | Hechos/candidatos generados con mismo motor. |
| P95 | Gasto programado | Intentar IA automática fuera de alcance preautorizado. | awaiting_confirmation; sin llamada ni publicación. |
| P96 | Pipeline sin clones en Azure | Inspeccionar YAML y allowlist de artefactos. | Checkout de apps prohibido; workspace autorizado en ejecutor propio. |
| P97 | Equivalencia local/pipeline | Usar misma captura, reglas y configuración semántica. | Mismos hechos normalizados; difieren solo datos operativos esperados. |
| P98 | Azure Repo restringido | Exportar edición a remoto Git documental de prueba. | Solo archivos aprobados y permiso explícito; apps intactas. |
| P99 | Conflicto Azure | Remoto adelantado o fallo de autenticación. | Sin force push/merge; bóveda local sigue disponible. |
| P100 | Otro equipo | Instalar paquete con rutas y nombres diferentes. | Sin rutas/credenciales del autor ni edición manual múltiple. |
| P101 | Desinstalar | Desinstalación estándar y cancelación. | Conserva bóveda/historial; no borra repos de apps. |
| P102 | Prompt injection | README/comentario intenta solicitar secretos y permisos. | Datos no cambian política ni causan herramientas/red no autorizadas. |
| P103 | Desborde y escapes | Archivo gigante, enlace externo y Markdown hostil. | Límites/escapes; sin lectura no autorizada ni ejecución embebida. |
| P104 | Incremental correcto | Comparar múltiples cambios con captura limpia. | Mismos hechos, grafo y diagnóstico aplicables. |
| P105 | Ahorro sin omisión | Comparar documentos y cobertura entre runs equivalentes. | Sin pérdida de secciones/riesgos para reducir invocaciones. |
| P106 | Instalación humana | Seguir documento 03 sin ayuda técnica no documentada. | Instalar/configurar sin editar YAML; registrar obstáculos reales. |
| P107 | Lector mínimo | Segundo equipo con Obsidian y copia recibida. | Consulta sin Node.js/Copilot/repos de origen. |
| P108 | Piloto real | Revisar muestra de hechos frente a repo autorizado. | Evidencia correcta y cobertura aceptada por una persona. |
| P109 | Agentes reales | Ejecutar flujo autorizado con CLI real y repetirlo. | Perfiles/modelo solicitado trazados y segunda ejecución sin nueva interpretación. |
| P110 | Quince repos | Ejecutar corpus sintético de 15+ repos con ramas distintas. | Sin cruces falsos ni omisiones silenciosas; métricas de memoria/tiempo. |
| P111 | Matriz completa | Probar todos los adaptadores declarados de la release. | Cada capacidad anunciada tiene prueba; lo parcial aparece visible. |
| P112 | Cierre de migración | Comparar release, guía, defaults e instrucciones activas. | Sin motor Python, Azure obligatorio, Obsidian opcional, master fijo ni exploración IA rutinaria; N01–N16 documentadas. |

### 14.3. Ejecución y evidencia de cierre

El implementador debe entregar `npm run typecheck`, `npm test` y `npm run docs -- demo`. Las pruebas se compilan y ejecutan con el runner estándar de Node, desde dependencias de desarrollo locales fijadas; la demo del producto usa el motor ya compilado y dependencias de producción. No requiere pytest ni intérprete Python. Los ensayos reales de IA son opt-in y nunca se ejecutan por defecto en toda la suite.

Cada caso conserva: versión del motor, versión de dependencias, plataforma, fixture/snapshot, resultado esperado, resultado observado y ruta al informe. No marcar P109 aprobada por un fake. El pipeline opcional no vuelve a ejecutar pruebas pagas por cada cambio documental.

### 14.4. Pruebas adicionales de migración Node — N01–N16

Se suman a las 112 pruebas anteriores: **128 casos especificados**, no resultados ya ejecutados. Repetir los casos multiplataforma en la matriz de T02; un test `skipped` no acredita compatibilidad. El informe diferencia pruebas del motor, pruebas reales de Copilot y apertura manual en Obsidian.

| ID | Caso | Acción | Resultado esperado |
|---|---|---|---|
| N01 | Sin intérprete anterior | Instalar release y ejecutar la demo con Node/Git, sin Python/pip ni compiladores. | Tres/cuatro endpoints según escenario; ninguna invocación a Python y cero IA. |
| N02 | Entradas equivalentes | Usar npm start y el wrapper del SO desde rutas con espacios/tildes y cwd diferente. | Mismo asistente/configuración/menú; errores visibles y código de salida conservado. |
| N03 | Lockfile inconsistente | Desalinear package.json/package-lock en una copia de prueba. | Instalación rechazada sin regenerar silenciosamente el lock ni tocar aplicaciones. |
| N04 | Instalación sin hooks | Dependencia fixture con postinstall que escribiría un canario; instalar con ignore-scripts. | No se ejecuta el canario ni node-gyp; runtime real sigue funcionando sin hooks. |
| N05 | WASM local e íntegro | Analizar offline y repetir con gramática ausente/corrupta. | Primera extracción correcta; luego diagnóstico de recurso; cero descargas y sin fallback IA. |
| N06 | Compatibilidad real WASM | Cargar gramática con ABI/formato de enlace incompatible en fixture. | Fallo localizado y capacidad no disponible; no declarar éxito por comparar solo número ABI. |
| N07 | Tipos y compilación | Introducir error de tipos y un import ESM inválido en copia del motor. | typecheck/build fallan; release no se genera ni arranca una compilación a demanda. |
| N08 | Rutas y posiciones | Casos Windows/UNC admitidos, tildes/emoji, CRLF, case/symlinks y prefijos similares. | Acceso acotado y evidencias sobre bytes correctos; sin falsas contenciones o rutas corruptas. |
| N09 | Procesos portables | Probar Git/Copilot nativos, shim no admitido y argumentos con metacaracteres. | Sin shell arbitrario; binarios admitidos funcionan y shim no seguro da diagnóstico concreto. |
| N10 | Flujo JSONL fragmentado | Dividir eventos y caracteres UTF-8 entre chunks; añadir salida excesiva/final duplicado. | Una respuesta válida reconstruida o rechazo específico; límites respetados sin JSON.parse global. |
| N11 | Cancelación CPU/proveedor | Forzar parser bloqueado en worker y proceso Copilot de prueba con descendiente. | Timeout/cancelación verificados, sin hijo consumiendo, ni publicación; trabajo independiente preservado. |
| N12 | Mismo contenido, tres SO | Analizar fixtures con bytes iguales, reglas y versiones fijadas en Windows/Linux/macOS. | Mismos hechos/grafo normalizados; difieren solo metadatos operativos declarados. |
| N13 | Release sin herramientas dev | Copiar release e instalar omit=dev; retirar TypeScript global y acceso a fuentes de build. | Configurar, demo, extraer, revisar/publicar y abrir funcionan con dist/assets completos. |
| N14 | Contratos preservados | Validar ejemplos v3/legado y convertir mediante adaptador. | Mismos campos/clasificaciones y permisos; schemas/v3 vigentes, sin cambio de formato por runtime. |
| N15 | Arranque sin trabajo oculto | Reabrir menú ya instalado con red/proveedor bloqueados. | Sin npm ci, builds, descargas ni IA; instalación solo ante falta y consentimiento explícito. |
| N16 | Job Node equivalente | Ejecutar CLI directa no interactiva y, opt-in, plantilla de pipeline con release instalada. | Stdout JSON limpio, mismos hechos/códigos, sin Python, repos exportados ni npm install en análisis. |


## 15. Contrato de comandos para automatización y soporte

El usuario cotidiano utiliza `npm start` o el lanzador; esta tabla evita comandos distintos entre guía, tareas y pipeline. Ejecutar los comandos npm desde la carpeta del motor. Para automatización, usar el Node autorizado y la ruta absoluta a `scripts/cli.mjs`; esta entrada carga dist y no instala ni compila. Son comandos por implementar, no ejecutables incluidos en este paquete de documentos.

| Acción | Comando a implementar | Red/IA |
|---|---|---|
| Abrir menú | `npm start` | Ninguna. |
| Configurar | `npm run docs -- configurar` | Login separado y consentido; sin generación IA. |
| Diagnóstico | `npm run docs -- verificar` | Sin IA; pruebas remotas solo con opción explícita. |
| Preparar/actualizar | `npm run docs -- actualizar --repo <id> --rama <nombre> --sin-ia --sin-publicar` | Sin red ni IA por defecto. |
| Actualizar con interpretación | `npm run docs -- actualizar --repo <id> --rama <nombre> --ia` | Autorización contextual y límites. |
| Incluir cambios locales | `npm run docs -- actualizar --repo <id> --incluir-cambios-locales --sin-publicar` | Borrador no exportable. |
| Ver estado | `npm run docs -- estado --run <id>` | Ninguna. |
| Reanudar | `npm run docs -- reanudar --run <id>` | Revalidar permisos y entradas, no reejecutar todo. |
| Consultar hechos | `npm run docs -- consultar endpoints --repo <id> --rama <nombre>` | Ninguna. |
| Comparar ramas | `npm run docs -- comparar --repo <id> --base <rama> --rama <rama>` | Solo capturas existentes; preparar las faltantes de forma explícita. |
| Revisar | `npm run docs -- revisar --run <id>` | Abrir Obsidian y mostrar controles humanos. |
| Aprobar | `npm run docs -- aprobar --run <id>` | Interactivo; no flag global de autoaceptación. |
| Publicar local | `npm run docs -- publicar --run <id>` | Exige receipt vigente, sin IA. |
| Abrir bóveda | `npm run docs -- abrir` | Ninguna. |
| Proponer | `npm run docs -- proponer --tipo <specification\|migration\|adr> --solicitud <archivo>` | IA solo autorizada; nunca implementación de aplicaciones. |
| Compartir edición | `npm run docs -- compartir --edicion <id> --destino <ruta>` | Copia local autorizada; sincronización externa aparte. |
| Verificar edición recibida | `npm run docs -- verificar-edicion --ruta <ruta>` | Ninguna; uso opcional para lectores. |
| Volver a edición | `npm run docs -- restaurar --edicion <id>` | Confirmación; solo índice local, sin cambios en aplicaciones. |
| Demo | `npm run docs -- demo` | Sin IA; repos sintéticos aislados. |
| Migración | `npm run docs -- migrar --dry-run` | Ninguna. |

Opciones globales: `--config <ruta>`, `--json`, `--no-interactivo`. Peticiones de varios repositorios usan `--escenario <archivo>` generado desde el menú, con snapshots explícitos. No convertir `--rama` singular en una selección implícita para todos los repos.

Códigos de salida: 0 completado; 2 entrada/prerrequisito inválido; 3 aprobación/selección requerida; 4 resultado parcial o bloqueado por cobertura; 5 fallo de ejecución/proveedor; 6 conflicto de publicación; 130 cancelación. El estado detallado se guarda siempre que se haya creado un run. `--json` reserva stdout para un único resumen JSON del motor; mensajes humanos a stderr. Esto es distinto del JSONL interno de Copilot.

**Salida estructurada:** para consumir `--json`, preferir `node "/ruta/motor/scripts/cli.mjs" verificar --json` o `npm --silent run docs -- verificar --json`; npm sin `--silent` puede añadir encabezados ajenos al resumen. Stdout es exclusivo de datos del motor; diagnóstico humano y stderr del proveedor saneado van por separado.

**Ejemplo de job, no de instalación:** invocar el ejecutable Node aprobado con argumentos separados: `"/ruta/motor/scripts/cli.mjs"`, `actualizar`, `--config`, `"/ruta/config/knowledge.yaml"`, `--escenario`, `"/ruta/config/escenario.json"`, `--sin-ia`, `--sin-publicar`, `--no-interactivo`, `--json`. En Windows, usar las rutas Windows correspondientes; no pegar datos del repositorio en una línea de shell.

**Comandos del implementador, solo en el repositorio del motor:**

```text
npm ci --ignore-scripts --no-audit --no-fund
npm run typecheck
npm run build
npm test
npm run docs -- demo
npm run release
```

`npm run build` y `npm test` forman parte del desarrollo/CI del producto, no del uso diario ni del análisis de aplicaciones. Si falta dist en una copia de fuentes, el implementador ejecuta build explícitamente; el usuario recibe una release precompilada. No es necesario crear un comando global ni ejecutar `npm link`.

### 15.1. Reglas de modo desatendido

No admitir `aprobar --no-interactivo` como aprobación nueva. Un job puede publicar un receipt generado previamente por la persona solo si todos sus hashes y permisos siguen válidos. Si el job regenera el documento, necesita un nuevo receipt. Si hay una decisión de gasto/alcance no preautorizada, salir con código 3.

No usar `--sin-publicar` como permiso de red o IA; son dimensiones independientes. El pipeline no recibe permiso para analizar todo el disco por ejecutarse bajo una cuenta técnica.

## 16. Criterio de entrega final

**Producto local operativo:** H1–H4 completos, motor Node probado en el stack piloto y en los tres SO admitidos, demo sin Python, ensayo real de Copilot, skill/ASD verificados, recepción en Obsidian sin Azure y pruebas P/N aplicables aprobadas; release compilada con WASM incluido.

**Cobertura completa objetivo:** además, T17–T22 y T55 cerradas para las capacidades contratadas y pruebas de 15+ repositorios; publicar una matriz de límites reales. Los adaptadores Azure se entregan desactivados y no condicionan el uso local; su activación empresarial exige prueba del entorno real.

El paquete de implementación final contiene release instalable, comandos reales, migración/rollback, pruebas automáticas, reporte del piloto, archivos de agentes corregidos y manual validado. No se exige al usuario editar múltiples configuraciones, crear infraestructura o contratar un servicio para empezar.

No se garantiza ausencia absoluta de defectos. Se exige detectar fallos, limitar efectos, mantener evidencia y no presentar pruebas no realizadas como aprobadas.

## 17. Fuentes y diferencias adoptadas

### 17.1. Material del proyecto

| Referencia | Fuente | Uso |
|---|---|---|
| D01 | `como-funciona-el-sistema.md`, §§1–5, 7–10 | Base actual, ocho roles, ASD, Archify, permisos, historial y estados. |
| D02 | `sistema-documentacion-agentes (2).md`, §§1–6 | Cinco etapas, plugins, grafo, interpretación, consultas y capacidades de ingeniería. |
| D03 | `inventory.md`, `extraction.md`, `integration.md` | Responsabilidades de extracción, evidencia y relación que se mantienen/corrigen. |
| D04 | `documentation.md`, `review.md`, `proposal.md`, `publication.md` | Plantilla, incertidumbres, revisión humana y contratos de propuestas/publicación. |
| D05 | `orchestrator.md`, `copilot-instructions.md`, `orquestador.agent.md` | Flujo actual y restricciones que necesitan migración conjunta. |
| D06 | Plan/guía V2 y paquete completo V3 entregados antes | Base de esta revisión; se conservan estructura, capacidades, 56 tareas y 112 casos y se migra la elección Python del motor. |
| D07 | Aclaraciones del usuario en esta conversación | Motor Node.js + TypeScript en Windows/Linux/macOS, Obsidian obligatorio, mismo workspace, sencillez, Azure Repo opcional y no duplicación de código. |

No se adoptan como garantías las estimaciones de coste, rendimiento o exhaustividad presentes en D02 o la respuesta de Claude. Se conserva su idea de separar hechos y criterio, pero se prueba cada extractor y se mide el consumo realmente observable. La identidad de una cola no se reduce al nombre.

### 17.2. Referencias oficiales y actualización Node del 21-09-2026

Las referencias de Copilot, Git, Obsidian y Azure se conservan del paquete V3; la revisión actual contrasta Node, npm, TypeScript, WASM y la instalación de Copilot. Comprobar de nuevo versiones y capacidades en T02. Las fuentes verifican herramientas externas, no una instalación ni una prueba de tu producto.

- W01 — Releases y LTS de Node.js: `https://nodejs.org/en/about/previous-releases`
- W02 — Instalación Copilot CLI: `https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/install-copilot-cli`
- W03 — Perfiles Copilot CLI: `https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/create-custom-agents-for-cli`
- W04 — Referencia de agentes/tools: `https://docs.github.com/en/copilot/reference/custom-agents-configuration`
- W05 — Referencia programática: `https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-programmatic-reference`
- W06 — Almacenamiento Markdown y bóvedas: `https://help.obsidian.md/Files+and+folders/How+Obsidian+stores+data`
- W07 — Sincronización de notas: `https://obsidian.md/help/sync-notes`
- W08 — Tree-sitter para JavaScript/WASM, carga y compatibilidad: `https://github.com/tree-sitter/tree-sitter/blob/master/lib/binding_web/README.md`
- W09 — Enumeración de árboles Git: `https://git-scm.com/docs/git-ls-tree`
- W10 — Lectura de objetos Git: `https://git-scm.com/docs/git-cat-file`
- W11 — Agentes Azure: `https://learn.microsoft.com/en-us/azure/devops/pipelines/agents/agents?view=azure-devops`
- W12 — Workspace multirraíz: `https://code.visualstudio.com/docs/editing/workspaces/multi-root-workspaces`
- W13 — Obsidian, productos y precios: `https://obsidian.md/pricing`
- W14 — PowerShell Windows: `https://learn.microsoft.com/en-us/powershell/scripting/install/install-powershell-on-windows`
- W15 — Instalación de Node.js: `https://nodejs.org/en/download`
- W16 — Referencia completa CLI: `https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference`
- W17 — URI Obsidian: `https://help.obsidian.md/Extending+Obsidian/Obsidian+URI`

- W18 — Plataformas admitidas por Node 24: `https://github.com/nodejs/node/blob/v24.x/BUILDING.md`
- W19 — Procesos, streams y particularidades Windows: `https://nodejs.org/api/child_process.html` (validar contra Node 24 al fijar la release).
- W20 — Opciones TypeScript/NodeNext: `https://www.typescriptlang.org/tsconfig/`
- W21 — Runner de pruebas de Node 24: `https://nodejs.org/docs/latest-v24.x/api/test.html`
- W22 — Worker threads de Node 24: `https://nodejs.org/docs/latest-v24.x/api/worker_threads.html`
- W23 — npm ci, omit e ignore-scripts: `https://docs.npmjs.com/cli/v11/commands/npm-ci/`
- W24 — Soporte TypeScript y límites del type stripping: `https://nodejs.org/docs/latest-v24.x/api/typescript.html`
- W25 — Ajv y JSON Schema 2020-12: `https://ajv.js.org/json-schema.html`
- W26 — Rutas en Node 24: `https://nodejs.org/docs/latest-v24.x/api/path.html`

La sustitución por Node.js + TypeScript es una decisión aprobada por el usuario; empaquetado, rutas internas y pruebas Node son especificaciones de esta revisión. La estructura de ediciones, límites e interfaces se conserva del paquete V3 compatible; nada de ello acredita una implementación ya presente en el repositorio.
