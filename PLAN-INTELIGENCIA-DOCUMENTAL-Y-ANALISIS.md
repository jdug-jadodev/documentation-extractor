# Plan de inteligencia documental, análisis de desarrollos y migraciones

Estado: **completado — fases 0 a 9 implementadas y validadas**
Proyecto: `documentation-extractor`  
Objetivo: conservar la documentación técnica enriquecida actual y añadir una capa nueva que permita a Copilot analizar flujos, responsabilidades, desarrollos y migraciones sin recorrer repositorios completos.

## 1. Objetivo del producto

El sistema debe analizar una vez cada repositorio autorizado, conservar conocimiento versionado por commit y reutilizarlo para:

- documentar microservicios y flujos;
- reconstruir flujos entre frontend, GR, microservicios nuevos y core legado;
- determinar la responsabilidad de cada sistema dentro de un desarrollo;
- analizar impacto técnico y operativo;
- proponer desarrollos respetando arquitectura, módulos y prácticas existentes;
- planear migraciones parciales o completas desde el core;
- identificar dependencias heredadas que todavía permanecen activas;
- estimar complejidad, criticidad, incertidumbre y alcance;
- reducir lecturas de repositorios, invocaciones de IA, tiempo y costo.

La operación objetivo es:

```text
repositorios analizados incrementalmente
        → documentación enriquecida
        → índice documental y grafo de navegación
        → recuperación de contexto relevante
        → análisis o investigación puntual
        → propuesta sustentada con evidencia
```

No debe operar así:

```text
pregunta
    → Copilot recorre todos los repositorios
    → abre archivos de forma indiscriminada
    → reconstruye la arquitectura desde cero
```

## 2. Garantías no negociables

### 2.1 Conservar la documentación productiva actual

Se mantiene el nivel actual de detalle para código productivo:

- páginas de servicio;
- arquitectura y diagramas Mermaid;
- árbol de carpetas y archivos;
- módulos de build;
- routers y endpoints;
- páginas de flujos;
- clases e interfaces;
- métodos y funciones;
- firmas;
- llamadores y llamadas;
- fragmentos de código;
- puertos, adaptadores, repositorios y mappers;
- evidencias, rutas y líneas;
- estados `supported`, `candidate` y `unresolved`;
- publicaciones `Actual`, `Publicaciones` y `Consultas`.

La nueva inteligencia documental será una capa consumidora. No reemplazará el generador ni convertirá la documentación actual en resúmenes pobres.

### 2.2 Excluir archivos de pruebas de futuras publicaciones

La única modificación deliberada al contenido publicado será retirar elementos derivados exclusivamente de pruebas.

Se excluirán, entre otros:

- Java: `src/test/**`;
- Node y TypeScript: `test/**`, `tests/**`, `__tests__/**`;
- archivos `*.test.*` y `*.spec.*`;
- Python: `tests/**` y `test_*.py`;
- proyectos y carpetas de pruebas .NET;
- fixtures, mocks, builders y utilitarios exclusivos de pruebas.

La exclusión aplicará a:

- páginas de clases y métodos;
- árboles y diagramas;
- tablas de símbolos;
- fragmentos;
- flujos;
- llamadores y llamadas;
- navegación por código;
- páginas agregadas de servicio.

Las publicaciones históricas no se reescribirán. La siguiente edición de `Actual` se construirá sin documentos de pruebas y el reemplazo atómico eliminará páginas obsoletas de tests únicamente de la edición vigente.

Los hechos de pruebas podrán conservarse internamente, clasificados y fuera de la documentación, para una consulta excepcional y explícita. No se incluirán por defecto en contextos para IA.

Configuración propuesta:

```yaml
documentation:
  include_tests: false
```

El valor predeterminado será `false`.

### 2.3 No explorar repositorios como fallback automático

La ausencia de información no autoriza una exploración general del código.

La IA deberá seguir esta secuencia:

1. usar documentación recuperada;
2. expandir documentos relacionados con el flujo;
3. ejecutar análisis determinista dirigido;
4. consultar fragmentos productivos concretos asociados con evidencia;
5. usar un agente investigador restringido;
6. solicitar autorización antes de ampliar materialmente el alcance.

## 3. Arquitectura objetivo

```text
┌─────────────────────────────────────────────────────────────┐
│ Repositorios autorizados                                    │
│ core · 8 micros · GR · frontend · sistemas relacionados     │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Extracción existente e incremental                          │
│ snapshots · facts · evidence · graph                        │
└───────────────────────┬───────────────────┬─────────────────┘
                        │                   │
                        ▼                   ▼
┌──────────────────────────────┐  ┌───────────────────────────┐
│ Documentación actual         │  │ Índices técnicos          │
│ servicio · flujos · clases   │  │ símbolos · endpoints      │
│ métodos · diagramas          │  │ bindings · relaciones     │
└──────────────┬───────────────┘  └─────────────┬─────────────┘
               │                                │
               └──────────────┬─────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Inteligencia documental                                    │
│ chunks semánticos · enlaces · capacidades · responsabilidades│
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Compilador de contexto                                     │
│ búsqueda · expansión · deduplicación · presupuesto          │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Copilot                                                    │
│ análisis · propuesta · migración · revisión                 │
└─────────────────────────────────────────────────────────────┘
```

## 4. Línea de trabajo A: exclusión de pruebas

### 4.1 Clasificador común

Crear un clasificador central de rutas y símbolos:

```ts
interface SourceClassification {
  scope: "production" | "test";
  reason: string;
}
```

Debe utilizarse en todos los renderizadores, no mediante filtros aislados por página.

### 4.2 Aplicación del filtro

Filtrar antes de construir los modelos documentales:

- módulos visibles;
- símbolos;
- llamadas;
- dependencias;
- bindings;
- pipelines;
- fragmentos;
- entradas del árbol;
- nodos y aristas de diagramas;
- páginas individuales.

Una relación productiva no debe desaparecer porque tenga llamadores de test; se eliminan únicamente los extremos de prueba.

### 4.3 Criterios de aceptación

- No existe ninguna página nueva cuyo archivo de origen sea de pruebas.
- `servicio.md` no contiene rutas `src/test` ni equivalentes.
- Los diagramas no contienen nodos de tests.
- Los flujos no presentan métodos de pruebas como participantes o llamadores.
- La documentación productiva conserva firmas, fragmentos, evidencia y enlaces.
- La publicación acumulativa y las ediciones históricas continúan funcionando.

## 5. Línea de trabajo B: índice de la documentación existente

### 5.1 Principio

La IA sí utilizará la documentación generada. No la leerá completa: el sistema la dividirá, indexará, relacionará y seleccionará.

Solo se indexará una copia por run. No se indexarán simultáneamente `Actual` y su copia equivalente en `Publicaciones`.

### 5.2 Artefactos nuevos

```text
run-.../
└── documentation-intelligence/
    ├── manifest.json
    ├── chunks.jsonl
    ├── lexical-index.json
    ├── endpoint-index.json
    ├── symbol-index.json
    ├── source-path-index.json
    ├── evidence-index.json
    ├── link-graph.json
    ├── capability-index.json
    └── context-cache/
```

Estos artefactos permanecerán en el estado privado. No contaminarán la bóveda.

### 5.3 Fragmentación semántica

Los Markdown se dividirán por secciones funcionales, no por tamaño arbitrario.

Tipos mínimos:

```text
service:summary
service:architecture
service:contracts
service:data
service:security
service:risks
service:navigation

flow:summary
flow:diagram
flow:steps
flow:data
flow:integrations
flow:snippet
flow:limitations

class:summary
class:methods
class:snippet

method:summary
method:signature
method:calls
method:callers
method:snippet

diagram:architecture
diagram:structure
diagram:modules
diagram:layers
diagram:routers
```

### 5.4 Metadatos del fragmento

```ts
interface DocumentationChunk {
  id: string;
  run_id: string;
  repository_id: string;
  ref: string;
  commit: string;
  document_path: string;
  document_type: string;
  section_type: string;
  heading: string | null;
  endpoint: { method: string; path: string } | null;
  symbols: string[];
  source_paths: string[];
  layers: string[];
  roles: string[];
  evidence_ids: string[];
  confidence_states: Array<"supported" | "candidate" | "unresolved">;
  outgoing_links: string[];
  content: string;
  sha256: string;
}
```

### 5.5 Actualización incremental

- Calcular hash por documento y sección.
- Reutilizar chunks sin cambios.
- Reindexar únicamente documentos modificados.
- Invalidar contextos dependientes de chunks cambiados.
- Asociar siempre el índice con run, repositorio y commit.

## 6. Línea de trabajo C: grafo de navegación documental

El grafo lateral conectará documentos aunque el Markdown no contenga un wikilink directo.

Relaciones mínimas:

```text
documents
contains_symbol
calls
called_by
implements
implemented_by
injects
maps_to
persists_with
reads_from
writes_to
exposes
consumes
publishes
subscribes
tested_by
migrated_from
still_depends_on
used_by_front
```

Ejemplo esperado:

```text
GET /permisos-admin
  → InspectorRouter.routerInspector
  → InspectorHandler.permissionsAdmin
  → InspectorMapperDto.toDto
  → InspectorDomainUseCase.getInspectorsInfo
  → InspectorRepositoryPortOut.getInspectorInfo
  → InspectorsRepository.getInspectorInfo
  → InspectorR2dbcRepository.findAll
  → InspectorMapper.toDomain
  → InspectorEntity
```

Los operadores Reactor se modelarán como etapas técnicas y no como componentes de negocio no resueltos:

```text
map · flatMap · collectList · onErrorResume
```

## 7. Línea de trabajo D: recuperación y compilación de contexto

### 7.1 Búsqueda híbrida

Combinar:

- coincidencia exacta de rutas y símbolos;
- búsqueda textual por términos funcionales;
- índices de endpoints, evidencias y rutas fuente;
- expansión por relaciones;
- prioridad a código productivo;
- diversidad por repositorio y capa;
- frescura por commit;
- estado de confianza;
- deduplicación de fragmentos y snippets.

### 7.2 Presupuesto

```yaml
documentation_intelligence:
  enabled: true
  max_context_tokens: 15000
  max_documents: 40
  max_flows: 5
  max_symbols: 25
  max_documents_per_repository: 15
  include_tests_by_default: false
```

El compilador debe informar:

- documentos considerados;
- documentos seleccionados;
- repositorios representados;
- tokens o bytes estimados;
- relaciones no resueltas;
- contenido omitido por presupuesto;
- preguntas que siguen sin respuesta.

### 7.3 Plantillas por intención

#### Desarrollo

Priorizar:

- flujo actual;
- router y handler;
- DTO y mappers;
- caso de uso;
- puertos y adaptadores;
- persistencia;
- errores;
- módulos de build;
- patrones productivos análogos.

#### Migración

Priorizar:

- implementación del core;
- implementación en micros nuevos;
- consumidores;
- contratos;
- datos y propiedad;
- dependencias heredadas;
- lógica duplicada;
- transición y rollback.

#### Responsabilidades

Priorizar:

- capacidades;
- propietarios funcionales y de datos;
- expositores y consumidores;
- orquestadores;
- eventos e integraciones;
- dependencias con el core.

#### Impacto

Priorizar:

- llamadores y consumidores;
- contratos afectados;
- módulos y repositorios;
- configuración y despliegue;
- datos;
- incertidumbres.

## 8. Línea de trabajo E: investigación progresiva

### Nivel 1: contexto documental

Copilot recibe únicamente chunks seleccionados de la documentación.

Resultado posible:

```json
{
  "sufficient": false,
  "missing_information": [
    "implementación concreta del puerto",
    "propiedad de la persistencia"
  ]
}
```

### Nivel 2: expansión documental

Expandir por símbolos, bindings, adaptadores, datos, consumidores y documentos de otros repositorios.

No se lee código fuente.

### Nivel 3: análisis determinista dirigido

Ejecutar el extractor únicamente sobre el flujo y sus dependencias alcanzables desde archivos ya identificados.

```yaml
investigation:
  max_dependency_depth: 3
  default_max_files: 8
  hard_max_files: 20
  default_max_bytes: 262144
  hard_max_bytes: 1048576
  allow_repository_wide_scan: false
```

### Nivel 4: lectura puntual por evidencia

Permitir solo archivos productivos asociados con:

- evidencia existente;
- símbolo seleccionado;
- endpoint seleccionado;
- implementación de un puerto ya identificado;
- dependencia inmediata del flujo.

Cada lectura registrará:

- archivo;
- rango de líneas;
- bytes;
- motivo;
- evidencia que la autorizó;
- secretos redactados;
- conclusión obtenida.

### Nivel 5: agente investigador restringido

El agente recibirá:

- pregunta concreta;
- contexto documental;
- incógnitas;
- lista inicial de archivos autorizados;
- presupuesto;
- profundidad máxima;
- prohibición de búsqueda general.

No recibirá acceso irrestricto al workspace.

### Nivel 6: ampliación excepcional

Si el límite no es suficiente, detenerse e informar:

- qué se consultó;
- qué falta;
- por qué es necesario ampliar;
- módulo o repositorio adicional requerido;
- costo previsto de la ampliación.

La exploración amplia requerirá autorización explícita.

## 9. Línea de trabajo F: capacidades y responsabilidades

### 9.1 Modelo de capacidad

```ts
interface Capability {
  id: string;
  name: string;
  aliases: string[];
  repositories: string[];
  entrypoints: string[];
  flows: string[];
  responsibilities: Responsibility[];
  legacy_dependencies: LegacyDependency[];
  contracts: string[];
  data_resources: string[];
  document_chunk_ids: string[];
  evidence_ids: string[];
  confidence: "high" | "medium" | "low";
}
```

### 9.2 Responsabilidades

Roles soportados:

- propietario de negocio;
- propietario de datos;
- expositor de API;
- orquestador;
- consumidor;
- adaptador;
- compatibilidad heredada;
- origen de migración;
- destino de migración;
- sistema externo.

### 9.3 Configuración humana

La inferencia automática no debe inventar propiedad de negocio. Se permiten confirmaciones explícitas:

```yaml
intelligence:
  capabilities:
    permisos-administracion:
      label: "Permisos de administración"
      aliases:
        - permisos-admin
        - administración de inspectores
      systems:
        - front-administracion
        - gr
        - core
        - micro-identidad

  ownership:
    permisos-administracion:
      business_owner: micro-identidad
      api_orchestrator: gr
      consumer: front-administracion

  migrations:
    permisos-administracion:
      from: core
      to: micro-identidad
      status: partial
```

Las configuraciones humanas se marcarán como decisiones explícitas, no como hechos extraídos.

## 10. Línea de trabajo G: impacto y criticidad

Dimensiones mínimas:

- repositorios y módulos afectados;
- consumidores;
- dependencias síncronas;
- eventos;
- datos compartidos;
- propiedad de datos;
- escrituras en el core;
- compatibilidad de contratos;
- seguridad;
- número de despliegues;
- rollback;
- relaciones candidatas o no resueltas;
- dependencia heredada;
- confianza de la evidencia.

Salida:

```text
Complejidad técnica: alta
Criticidad operativa: crítica
Confianza: media

Factores:
- cuatro consumidores activos;
- persistencia todavía propiedad del core;
- dos contratos potencialmente incompatibles;
- una relación no resuelta;
- tres despliegues coordinados.
```

No se producirán estimaciones de tiempo o dinero como hechos si no existen métricas históricas del equipo.

## 11. Herramientas MCP nuevas

### `docsys_search_documentation`

Busca chunks de documentación por frase, ruta, símbolo, repositorio o capacidad.

### `docsys_expand_document_context`

Expande un documento o flujo mediante relaciones documentales y técnicas.

### `docsys_prepare_analysis_context`

Construye un contexto acotado para desarrollo, migración, impacto o responsabilidades.

### `docsys_locate_capability`

Localiza una capacidad y los sistemas que participan.

### `docsys_trace_business_flow`

Reconstruye un flujo entre frontend, GR, micros, core, datos y sistemas externos.

### `docsys_explain_responsibilities`

Explica la responsabilidad actual y objetivo de cada sistema con evidencia.

### `docsys_analyze_change`

Calcula alcance, impacto, criticidad e incertidumbre.

### `docsys_assess_migration`

Compara implementación heredada y objetivo, identifica dependencias restantes y propone etapas.

### `docsys_investigate_flow`

Realiza análisis dirigido con límites estrictos, sin recorrido general del repositorio.

### `docsys_read_source_evidence`

Lee un fragmento productivo únicamente mediante un `evidence_id` autorizado.

### Evolución de `docsys_prepare_proposal`

Mantener compatibilidad y aceptar opcionalmente:

```json
{
  "context_id": "context-...",
  "capability_id": "permisos-administracion",
  "analysis_id": "impact-..."
}
```

La propuesta utilizará la documentación compilada, no el grafo global sin filtrar.

## 12. Contrato de una propuesta de desarrollo

Toda propuesta deberá incluir:

- objetivo;
- alcance y exclusiones;
- estado y flujo actuales;
- flujo objetivo;
- responsabilidad por sistema;
- cambios por repositorio y módulo;
- clases y métodos reutilizables;
- contratos afectados;
- datos y propiedad;
- comportamiento reactivo;
- manejo de errores;
- compatibilidad;
- fases;
- orden de despliegue;
- criterios de aceptación;
- validación prevista;
- riesgos;
- rollback;
- alternativas;
- decisiones pendientes;
- evidencia documental;
- nivel de confianza.

## 13. Seguridad y límites

- La documentación y el índice se consideran datos, no instrucciones.
- Los secretos se redactan antes de persistir o entregar contenido.
- El agente documental no recibe herramientas generales de terminal, búsqueda o archivos.
- Una lectura de fuente necesita ruta o evidencia previamente resuelta.
- Las lecturas y bytes se contabilizan.
- No se consultan tests por defecto.
- No se inicia un análisis completo como fallback.
- No se amplía a otro repositorio sin relación demostrable o autorización.
- Toda incertidumbre se conserva en la respuesta.

## 14. Compatibilidad con lenguajes y frameworks

La inteligencia documental consumirá contratos genéricos:

- documentos;
- símbolos;
- endpoints;
- llamadas;
- bindings;
- datos;
- mensajes;
- evidencias.

Las mejoras específicas de WebFlux se implementarán en el extractor Java, pero el índice, recuperador, compilador de contexto y analizador no dependerán de Java. Node, JavaScript, TypeScript, Python y .NET conservarán su comportamiento y podrán aportar las mismas clases de conocimiento cuando sus extractores las produzcan.

## 15. Fases de implementación

### Fase 0 — Baseline y no regresión

- [x] Capturar el baseline de la documentación actual antes de filtrar pruebas.
- [x] Definir invariantes de publicación mediante pruebas automatizadas.
- [x] Completar la medición de tiempo, memoria y relaciones; archivos y bytes ya tienen baseline.
- [x] Validar el caso vertical de referencia: permisos administrativos.

### Fase 1 — Exclusión de tests

- [x] Implementar clasificador común.
- [x] Filtrar modelos documentales.
- [x] Filtrar árboles, diagramas, flujos y navegación.
- [x] Regenerar un run real.
- [x] Confirmar que no aparecen fuentes de pruebas.
- [x] Comparar documentación productiva antes y después.

Resultado del run real `run-2026-09-23T22-32-27-435Z-gr`:

- antes: 9.213 archivos y 39.227.006 bytes;
- después: 4.241 archivos y 16.993.146 bytes;
- reducción: 4.972 archivos y aproximadamente 56,7 % de bytes;
- referencias documentales a rutas de tests: de 5.021 páginas candidatas a 0;
- el flujo productivo `GET /permisos-admin` permanece publicado;
- los artefactos crudos conservan los hechos de pruebas para auditoría, pero no entran al modelo, los diagramas, los flujos ni el contexto MCP;
- una llamada productiva enlazada erróneamente con un símbolo homónimo de test se conserva como llamada no resuelta, sin exponer el destino de prueba.

### Fase 2 — Índice documental

- [x] Crear chunker semántico.
- [x] Implementar manifiesto y hashes.
- [x] Crear índices exactos.
- [x] Construir grafo de wikilinks.
- [x] Indexar incrementalmente.
- [x] Evitar duplicación entre ediciones.

### Fase 3 — Grafo lateral

- [x] Relacionar flujo con clases y métodos.
- [x] Resolver puerto con implementación.
- [x] Resolver inyección y bindings.
- [x] Conectar mappers, repositorios y datos.
- [x] Clasificar operadores reactivos.
- [x] Conectar relaciones entre repositorios.

### Fase 4 — Recuperación y contexto

- [x] Implementar búsqueda híbrida.
- [x] Implementar expansión por relaciones.
- [x] Aplicar presupuesto y deduplicación.
- [x] Crear plantillas por intención.
- [x] Exponer estadísticas del contexto.

### Fase 5 — Investigación progresiva

- [x] Implementar niveles de escalada.
- [x] Crear lector por evidencia.
- [x] Aplicar límites de archivos, bytes y profundidad.
- [x] Registrar auditoría de lecturas.
- [x] Implementar agente investigador restringido.
- [x] Detenerse antes de exploraciones amplias.

### Fase 6 — Capacidades y responsabilidades

- [x] Definir contratos.
- [x] Inferir candidatos.
- [x] Incorporar overrides humanos.
- [x] Componer conocimiento multi-repositorio.
- [x] Exponer responsabilidad y confianza.

### Fase 7 — Impacto y migraciones

- [x] Implementar modelo de impacto.
- [x] Implementar criticidad y confianza.
- [x] Detectar dependencias restantes con core.
- [x] Comparar implementación heredada y objetivo.
- [x] Producir fases, transición y rollback.

### Fase 8 — Propuestas

- [x] Hacer que `docsys_prepare_proposal` consuma un contexto.
- [x] Validar la salida con esquema.
- [x] Citar documentos y evidencias.
- [x] Separar hechos, inferencias y decisiones.
- [x] Publicar la propuesta como borrador revisable.

### Fase 9 — Vistas adicionales opcionales

- [x] Agregar páginas de capacidades.
- [x] Agregar matrices de responsabilidades.
- [x] Agregar estado de migraciones.
- [x] Agregar análisis de impacto solicitados.
- [x] Mantener intactas las vistas actuales.

### Evidencia de cierre

- run real: `run-2026-09-23T22-32-27-435Z-gr`;
- índice v6: 17.083 chunks, 94.262 relaciones y 73 capacidades;
- segunda indexación: 17.079 chunks reutilizados, 4 nuevos (las vistas derivadas) y 0 lecturas del repositorio;
- medición de la segunda indexación: 55.869 ms y 190.661.560 bytes de incremento de heap;
- caso vertical: los nueve símbolos requeridos recuperados en 3.061 tokens, 27 chunks y 15 documentos, sin información faltante;
- investigación limitada: 246 hechos, 20 evidencias autorizadas, 0 lecturas directas y sin exploración amplia;
- documentación publicada: 0 referencias a fuentes de test y 0 incidencias bloqueantes;
- calidad: typecheck, build, 59/59 pruebas y smoke MCP de 23 herramientas superados.

## 16. Caso vertical de aceptación

Solicitud:

> Proponer un desarrollo relacionado con permisos de administración respetando la arquitectura actual de GR y determinando las responsabilidades de los demás sistemas.

El sistema deberá recuperar, como mínimo:

- flujo `GET /permisos-admin`;
- `InspectorRouter`;
- `InspectorHandler`;
- `InspectorMapperDto`;
- `InspectorDomainUseCase`;
- `InspectorRepositoryPortOut`;
- `InspectorsRepository`;
- `InspectorR2dbcRepository`;
- `InspectorMapper`;
- `InspectorEntity`;
- errores relacionados;
- módulos de build implicados;
- documentación de consumidores y servicios relacionados cuando estén indexados.

No deberá incluir páginas de pruebas ni iniciar una lectura general de `gr`.

La propuesta deberá indicar:

- responsabilidad por sistema;
- módulos afectados;
- flujo actual y objetivo;
- contratos;
- persistencia;
- archivos reutilizables o candidatos de cambio;
- comportamiento reactivo;
- riesgos;
- criticidad;
- incertidumbres;
- evidencia utilizada.

## 17. Métricas de éxito

### Documentación

- cero páginas de tests en nuevas publicaciones;
- reducción de archivos y bytes sin perder código productivo;
- mismos tipos de páginas y nivel de detalle productivo;
- enlaces válidos;
- publicación acumulativa intacta.

### Recuperación

- contexto dentro del presupuesto configurado;
- representación de todos los repositorios relevantes;
- ausencia de duplicados;
- rutas y símbolos exactos priorizados;
- evidencia incluida en cada conclusión importante.

### Investigación

- cero escaneos generales automáticos;
- archivos y bytes leídos registrados;
- consultas limitadas al flujo;
- ampliaciones de alcance justificadas;
- secretos redactados.

### Calidad de propuesta

- responsabilidades explícitas;
- cambios separados por sistema;
- contratos y datos identificados;
- fases y rollback;
- riesgos sustentados;
- incertidumbres visibles;
- revisión humana obligatoria.

### Eficiencia

- extracción reutilizada por múltiples preguntas;
- actualización incremental por commit;
- una o dos invocaciones de IA para la síntesis final;
- ausencia de relectura completa de repositorios;
- comparación medible de tokens, tiempo y bytes frente al enfoque directo.

## 18. Definición de terminado

El plan estará completo cuando:

1. la documentación productiva mantenga su formato enriquecido;
2. las nuevas publicaciones excluyan pruebas;
3. la documentación pueda buscarse y expandirse semánticamente;
4. Copilot reciba contextos pequeños y trazables;
5. el sistema pueda analizar un desarrollo multi-repositorio;
6. el sistema pueda evaluar una migración desde el core;
7. la investigación adicional permanezca limitada al flujo;
8. ninguna ausencia de información provoque un recorrido automático del repositorio;
9. las propuestas incluyan responsabilidad, impacto, criticidad, evidencia y confianza;
10. Node, JavaScript y los extractores existentes continúen funcionando.
