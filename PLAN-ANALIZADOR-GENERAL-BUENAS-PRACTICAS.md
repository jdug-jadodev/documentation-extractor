# Plan de desarrollo del analizador general de buenas prácticas

Estado: **propuesto — pendiente de implementación**

Proyecto: `documentation-extractor`

## 1. Objetivo

Construir una capa general de análisis técnico capaz de detectar, explicar y proponer correcciones para malas prácticas en diferentes lenguajes, frameworks y estilos arquitectónicos, sin limitarse a Java o WebFlux.

El analizador debe trabajar sobre el conocimiento ya extraído y documentado, reutilizar el índice semántico y consultar código fuente únicamente mediante evidencia puntual autorizada cuando la documentación no sea suficiente.

Debe soportar inicialmente:

- Java imperativo;
- Spring MVC;
- Spring WebFlux;
- JavaScript y TypeScript;
- Node.js;
- Express y NestJS;
- Angular;
- React;
- arquitecturas por capas, hexagonal, clean architecture, MVC, modular y orientada a microservicios.

La documentación existente se conserva sin reducir su contenido ni sustituir sus vistas actuales. El analizador se incorpora como una funcionalidad adicional.

## 2. Problema que debe resolver

La generación actual de propuestas puede recuperar documentación y ensamblar un documento, pero todavía no realiza una revisión técnica real. En particular puede:

- confundir requisitos deseados con decisiones humanas;
- seleccionar documentos de capacidades no relacionadas;
- enumerar relaciones globales en lugar de describir el flujo analizado;
- declarar confianza alta por cantidad de evidencia aunque esta no sea relevante;
- publicar propuestas sin hallazgos concretos;
- producir criterios, pruebas y correcciones genéricas;
- omitir archivo, símbolo, línea, regla incumplida y solución recomendada.

El caso que motiva este plan es la propuesta de deuda técnica de `permisos-admin`, que recuperó documentos ajenos al flujo y no explicó dónde estaban las malas prácticas ni cómo corregirlas.

## 3. Resultado esperado

Ante una solicitud como:

> Revisar las malas prácticas del flujo de permisos administrativos y proponer cómo corregirlas.

El sistema deberá producir hallazgos como:

```yaml
rule_id: ARCH-DIP-001
title: Dependencia hacia una implementación concreta
category: architecture
severity: high
status: confirmed
language: java
framework: webflux

location:
  repository: gr
  source_path: InspectorHandler.java
  symbol: InspectorHandler.inspectorsPortIn
  start_line: 14
  end_line: 14

observed:
  snippet: "private final InspectorDomainUseCase inspectorsPortIn;"

problem:
  summary: El adaptador de entrada depende de la implementación del caso de uso.
  impact: Aumenta el acoplamiento y rompe la inversión de dependencias.

remediation:
  summary: Inyectar el puerto de entrada InspectorsUsecasePortIn.
  strategy: Sustituir el tipo concreto, mantener la implementación registrada y agregar una prueba de wiring.

evidence_ids:
  - evidence-d46756d71ab8b6cec0038f02

confidence: high
```

La propuesta final deberá convertir esos hallazgos en cambios localizados, fases, riesgos, criterios de aceptación, pruebas y rollback.

## 4. Principios de diseño

1. **General y extensible:** el motor central no dependerá de un lenguaje o framework.
2. **Evidencia antes que opinión:** no se declarará una mala práctica sin símbolo, documento, hecho o fragmento que la sustente.
3. **Reglas explícitas:** cada hallazgo tendrá un identificador y una explicación estable.
4. **Detección determinista:** AST, relaciones, manifiestos y patrones estructurales producirán candidatos reproducibles.
5. **Síntesis asistida:** la IA podrá explicar alternativas y consecuencias, pero no inventar hallazgos ausentes.
6. **Contexto acotado:** el análisis se anclará a una capacidad, endpoint, flujo, módulo o conjunto explícito de símbolos.
7. **Escalamiento progresivo:** documentación, índice, investigación del flujo, evidencia puntual y solo después intervención adicional.
8. **Sin exploración masiva implícita:** una consulta de calidad no autoriza recorrer todo el repositorio.
9. **Configuración empresarial:** las reglas podrán habilitarse, ajustar severidad o declararse como excepción aceptada.
10. **Compatibilidad:** Node, frontend y Java conservarán la documentación y extracción actuales.

## 5. Límites del producto

El analizador no debe:

- sustituir SonarQube, ESLint, Checkstyle, PMD, SpotBugs u otras herramientas especializadas;
- afirmar que una práctica es incorrecta únicamente por preferencias de estilo;
- aplicar una regla de WebFlux a Spring MVC o una regla de Angular a React;
- modificar código automáticamente como parte del análisis;
- aprobar decisiones arquitectónicas;
- convertir relaciones `candidate` o `unresolved` en hechos;
- asignar confianza alta por volumen de documentos;
- consultar fuentes de test para describir el comportamiento productivo;
- leer archivos completos cuando un fragmento de evidencia sea suficiente.

Sí debe poder importar resultados externos y correlacionarlos con capacidades, flujos, consumidores y responsabilidades.

## 6. Arquitectura propuesta

```text
Solicitud de revisión
        |
        v
ScopeResolver
        |-- capacidad
        |-- endpoint o flujo
        |-- repositorio o módulo
        `-- símbolos explícitos
        |
        v
TechnologyProfileResolver
        |-- lenguajes
        |-- frameworks
        |-- arquitectura
        `-- políticas de empresa
        |
        v
RuleRegistry
        |-- UniversalRulePack
        |-- LanguageRulePack
        |-- FrameworkRulePack
        |-- ArchitectureRulePack
        `-- OrganizationRulePack
        |
        v
CandidateDetector
        |
        v
EvidenceVerifier
        |-- documentación indexada
        |-- hechos AST
        |-- grafo técnico
        |-- herramientas externas
        `-- evidencia puntual autorizada
        |
        v
PracticeFindingClassifier
        |
        v
TechnicalReview
        |
        v
ProposalBuilder
```

## 7. Componentes nuevos

### 7.1 `ScopeResolver`

Determina el límite exacto del análisis.

Entradas posibles:

- `capability_id`;
- método y ruta del endpoint;
- `flow_id` o documento de flujo;
- repositorio y módulo;
- símbolos específicos;
- `context_id` previamente compilado.

Reglas:

- una capacidad explícita prevalece sobre coincidencias léxicas genéricas;
- los documentos seleccionados deben pertenecer al subgrafo conectado;
- términos como `repository`, `service`, `clean code` o `SOLID` no podrán desplazar el flujo principal;
- si el contexto no contiene el punto de entrada solicitado, se detiene la revisión y se investiga el flujo;
- se registran documentos descartados y el motivo de exclusión.

### 7.2 `TechnologyProfileResolver`

Construye el perfil tecnológico observable del alcance:

```ts
interface TechnologyProfile {
  languages: string[];
  frameworks: string[];
  architectural_styles: string[];
  reactive: boolean;
  frontend: boolean;
  backend: boolean;
  enabled_rule_packs: string[];
  confidence: "high" | "medium" | "low";
  evidence_ids: string[];
}
```

No debe inferir WebFlux solo porque aparezca `Mono` en una dependencia aislada. Debe combinar manifiestos, imports, anotaciones, tipos, estructura y hechos extraídos.

### 7.3 `RuleRegistry`

Registro de reglas versionadas y consultables:

```ts
interface PracticeRule {
  id: string;
  version: string;
  title: string;
  description: string;
  category: PracticeCategory;
  default_severity: Severity;
  supported_languages: string[];
  supported_frameworks: string[];
  required_facts: string[];
  detect(input: RuleContext): PracticeCandidate[];
  verify(candidate: PracticeCandidate, evidence: EvidenceContext): PracticeFinding;
}
```

Cada regla debe incluir:

- motivación;
- condiciones de aplicación;
- exclusiones;
- ejemplos positivos y negativos;
- evidencia mínima;
- estrategia de corrección;
- referencias opcionales a analizadores externos;
- pruebas unitarias.

### 7.4 `CandidateDetector`

Ejecuta únicamente los paquetes compatibles con el perfil tecnológico y produce candidatos, no conclusiones.

Ejemplo:

```text
Handler depende de clase cuyo nombre termina en UseCase
    -> candidato ARCH-DIP-001
    -> buscar interfaces implementadas
    -> comprobar binding e inyección
    -> confirmar, descartar o dejar unresolved
```

### 7.5 `EvidenceVerifier`

Comprueba candidatos en este orden:

1. chunks documentales del flujo;
2. hechos AST y grafo lateral;
3. evidencias ya registradas;
4. resultados importados de herramientas externas;
5. `docsys_investigate_flow` limitado;
6. `docsys_read_source_evidence` para fragmentos concretos.

Cada lectura debe respetar presupuestos acumulativos de archivos y bytes, quedar auditada y redactar secretos.

### 7.6 `PracticeFindingClassifier`

Estados permitidos:

- `confirmed`: evidencia suficiente y regla aplicable;
- `candidate`: evidencia parcial, revisión recomendada;
- `unresolved`: falta información concreta;
- `accepted_exception`: excepción empresarial documentada;
- `not_applicable`: regla descartada por tecnología o contexto;
- `false_positive`: candidato refutado por evidencia.

Las propuestas utilizarán por defecto solo `confirmed` y, separados claramente, `candidate` de severidad relevante.

## 8. Contrato de hallazgo

```ts
type PracticeCategory =
  | "architecture"
  | "design"
  | "maintainability"
  | "reliability"
  | "security"
  | "performance"
  | "reactive"
  | "frontend"
  | "data"
  | "testing"
  | "observability";

type Severity = "critical" | "high" | "medium" | "low" | "info";

interface PracticeFinding {
  schema_version: 3;
  finding_id: string;
  rule_id: string;
  rule_version: string;
  title: string;
  category: PracticeCategory;
  severity: Severity;
  status: "confirmed" | "candidate" | "unresolved" | "accepted_exception" | "not_applicable" | "false_positive";
  repository_id: string;
  capability_ids: string[];
  flow_documents: string[];
  technology: {
    language: string | null;
    framework: string | null;
  };
  location: {
    source_path: string;
    symbol: string | null;
    start_line: number | null;
    end_line: number | null;
  };
  observed: {
    summary: string;
    snippet: string | null;
  };
  problem: {
    summary: string;
    impact: string;
  };
  remediation: {
    summary: string;
    steps: string[];
    example_before: string | null;
    example_after: string | null;
  };
  affected_consumers: string[];
  risks: string[];
  acceptance_criteria: string[];
  suggested_tests: string[];
  evidence_ids: string[];
  document_chunk_ids: string[];
  confidence: "high" | "medium" | "low";
  limitations: string[];
}
```

## 9. Paquetes de reglas

### 9.1 Reglas universales

Primera versión:

- `GEN-SRP-001`: responsabilidades heterogéneas en un símbolo;
- `GEN-DUP-001`: duplicación estructural significativa;
- `GEN-NAME-001`: nombre inconsistente con responsabilidad o contrato;
- `GEN-ERR-001`: error atrapado y descartado sin causa o contexto;
- `GEN-BOUND-001`: operación de colección o consulta sin límite observable;
- `GEN-CONTRACT-001`: entrada externa sin validación observable;
- `GEN-COUPLING-001`: dependencia excesiva o ciclo entre módulos;
- `GEN-SECRET-001`: posible secreto persistido o expuesto;
- `GEN-OBS-001`: operación crítica sin observabilidad suficiente;
- `GEN-DEAD-001`: endpoint o símbolo sin conexión productiva observable.

### 9.2 Arquitectura y diseño

- `ARCH-DIP-001`: adaptador depende de implementación concreta;
- `ARCH-LAYER-001`: dependencia entre capas en dirección incorrecta;
- `ARCH-DOMAIN-001`: dominio depende de infraestructura o framework;
- `ARCH-PORT-001`: puerto contaminado con tipos de transporte o persistencia;
- `ARCH-ADAPTER-001`: adaptador contiene lógica de negocio;
- `ARCH-CROSS-001`: comunicación entre microservicios sin contrato identificable;
- `ARCH-OWN-001`: responsabilidad o propiedad de datos ambigua;
- `ARCH-CORE-001`: dependencia heredada con core no declarada.

### 9.3 Java general y Spring imperativo

- inyección de implementaciones concretas;
- excepciones semánticamente incorrectas;
- pérdida de causa;
- transacciones en capas incorrectas;
- controlador accediendo directamente a repositorio;
- entidades de persistencia expuestas como contrato HTTP;
- recursos bloqueantes no cerrados;
- `Optional` utilizado como parámetro o campo sin justificación;
- estado mutable compartido;
- `equals`, `hashCode` o `toString` riesgosos en entidades.

### 9.4 WebFlux y Reactor

- `block`, `blockFirst`, `blockLast` o `toFuture().get` en flujo reactivo;
- `subscribe()` manual dentro de lógica de aplicación;
- trabajo bloqueante sin scheduler apropiado;
- `collectList()` sobre origen potencialmente ilimitado;
- `onErrorResume` usado únicamente para relanzar otro error;
- pérdida de causa durante traducción de excepciones;
- `flatMap` con concurrencia no acotada en operaciones sensibles;
- caché reactiva sin política observable de invalidación;
- `Mono` o `Flux` anidados;
- ruptura de backpressure;
- efectos secundarios fuera de operadores adecuados.

### 9.5 Node.js, JavaScript y TypeScript

- promesas no esperadas;
- callbacks que no propagan errores;
- operaciones síncronas de archivos o CPU en rutas;
- consultas sin paginación o límite;
- acceso directo a persistencia desde route/controller;
- errores capturados y silenciados;
- ausencia de validación en fronteras externas;
- uso inseguro de `any` en contratos;
- estado global mutable;
- configuración o secretos incrustados;
- mezcla de transporte, negocio y persistencia.

### 9.6 Express y NestJS

- handlers o controllers con lógica de negocio;
- middleware que no llama `next` ni termina la respuesta;
- errores asíncronos fuera del mecanismo global;
- providers que dependen de implementaciones en vez de tokens o contratos;
- DTO sin validación observable;
- repository accedido directamente desde controller;
- scopes inadecuados para estado mutable;
- módulos con dependencias circulares.

### 9.7 Angular

- componentes con lógica de negocio o acceso HTTP directo;
- suscripciones manuales sin estrategia de liberación;
- estado duplicado entre componente, servicio y store;
- servicios con responsabilidades heterogéneas;
- módulos o providers con ciclos;
- manipulación directa del DOM sin justificación;
- `subscribe` anidado sustituible por composición RxJS;
- efectos secundarios dentro de transformaciones;
- contratos externos sin tipado o validación;
- componentes grandes como candidato, nunca como conclusión basada solo en líneas.

### 9.8 React

- estado derivado almacenado y sincronizado mediante efectos;
- dependencias incorrectas en hooks;
- solicitudes sin cancelación o control de carrera;
- lógica de negocio acoplada a componentes de presentación;
- efectos con responsabilidades heterogéneas;
- mutación de estado;
- claves de listas inestables;
- Context usado como estado global indiscriminado;
- componentes grandes como candidato sujeto a responsabilidades reales;
- acceso directo a infraestructura desde componentes.

## 10. Configuración empresarial

Extender `knowledge.yaml`:

```yaml
quality_analysis:
  enabled: true

  default_architecture: hexagonal

  enabled_rule_packs:
    - universal
    - architecture
    - java
    - spring-mvc
    - webflux
    - typescript
    - node
    - express
    - nestjs
    - angular
    - react

  thresholds:
    minimum_finding_confidence: medium
    maximum_findings: 100
    maximum_source_files: 8
    maximum_source_bytes: 120000

  rules:
    ARCH-DIP-001:
      enabled: true
      severity: high

    RX-BUFFER-001:
      enabled: true
      severity: high

  accepted_exceptions:
    - rule_id: FRONT-COMPONENT-SIZE-001
      path: src/legacy/**
      reason: Módulo heredado pendiente de migración.
      expires_on: 2027-01-31
```

Las excepciones deben tener responsable, razón y fecha opcional de expiración. Una excepción no elimina el hallazgo: cambia su estado a `accepted_exception`.

## 11. Correcciones al recuperador de contexto

Antes de implementar reglas debe corregirse la selección del alcance:

1. `prepareAnalysisContext` aceptará anclas fuertes:
   - `capability_id`;
   - `endpoint`;
   - `flow_document`;
   - `symbols`.
2. Los términos genéricos de calidad no participarán en la selección funcional principal.
3. Se calculará una puntuación de pertenencia al flujo.
4. Se impondrá un límite de contaminación:
   - porcentaje máximo de chunks no conectados;
   - número máximo de capacidades distintas;
   - repositorios permitidos.
5. Se expondrán:
   - `included_documents`;
   - `excluded_documents`;
   - `scope_coverage`;
   - `scope_contamination`;
   - `required_symbols_present`.
6. Un contexto sin el endpoint o flujo solicitado será insuficiente aunque tenga muchas evidencias.

## 12. Confianza y severidad

La confianza no se calculará por cantidad de evidencias únicamente.

Factores de confianza:

- coincidencia exacta con capacidad o endpoint;
- presencia del símbolo y fragmento;
- evidencia AST;
- relación soportada en el grafo;
- regla compatible con la tecnología;
- cobertura de componentes requeridos;
- ausencia de contradicciones;
- vigencia del snapshot y hashes de evidencia.

La severidad medirá impacto, no certeza:

- `critical`: seguridad, pérdida de datos, indisponibilidad o incumplimiento grave;
- `high`: riesgo arquitectónico, de rendimiento o confiabilidad considerable;
- `medium`: mantenibilidad, evolución o defectos probables;
- `low`: claridad, consistencia o deuda localizada;
- `info`: oportunidad sin incumplimiento demostrado.

Un hallazgo puede ser `high severity` y `low confidence`; ambas dimensiones deben mostrarse separadas.

## 13. Integración con herramientas externas

Definir un contrato de importación normalizado para:

- SonarQube;
- ESLint;
- TypeScript compiler;
- Checkstyle;
- PMD;
- SpotBugs;
- Semgrep;
- Angular ESLint;
- herramientas de arquitectura o dependencias.

Los resultados externos se almacenarán como evidencia, no como verdad absoluta. El analizador los correlacionará con:

- capacidad;
- flujo;
- endpoint;
- símbolo;
- consumidores;
- datos;
- relaciones entre repositorios.

## 14. Nuevas herramientas MCP

### `docsys_review_practices`

Entradas:

```json
{
  "run_id": "...",
  "query": "...",
  "capability_id": "permisos-admin",
  "context_id": "...",
  "rule_packs": ["universal", "architecture", "java", "webflux"],
  "minimum_severity": "low"
}
```

Salida:

- perfil tecnológico;
- alcance y cobertura;
- hallazgos confirmados;
- candidatos;
- excepciones aceptadas;
- información faltante;
- estadísticas y auditoría de lectura.

### `docsys_explain_practice_finding`

Explica un hallazgo, su evidencia, impacto, alternativas y corrección sin volver a analizar todo el repositorio.

### `docsys_list_practice_rules`

Permite consultar reglas activas, tecnologías, severidad, versión y excepciones.

### Cambios a herramientas existentes

- `docsys_prepare_analysis_context`: aceptar anclas fuertes y reportar contaminación.
- `docsys_analyze_change`: aceptar `review_id` y usar hallazgos técnicos.
- `docsys_prepare_proposal`: exigir `review_id` para solicitudes de deuda técnica o buenas prácticas.
- `docsys_investigate_flow`: investigar únicamente información faltante de hallazgos candidatos.
- `docsys_read_source_evidence`: conservar límites acumulativos y asociar la lectura al hallazgo.

## 15. Persistencia privada

```text
documentation-intelligence/
├── practice-rules/
│   └── registry.json
├── technical-reviews/
│   └── review-<id>.json
├── practice-findings/
│   └── finding-<id>.json
├── imported-quality-results/
├── context-cache/
└── audit/
    └── source-reads.jsonl
```

En la bóveda podrán generarse vistas derivadas:

```text
Inteligencia/
├── calidad-tecnica.md
├── hallazgos-por-capacidad.md
├── deuda-por-repositorio.md
└── excepciones-aceptadas.md
```

Estas vistas no sustituyen clases, métodos, flujos, mapas o documentación existente.

## 16. Integración con propuestas

Para solicitudes de calidad o deuda técnica, `docsys_prepare_proposal` debe rechazar la generación útil si no existe una revisión técnica válida.

La propuesta incluirá:

1. alcance analizado;
2. tecnologías y arquitectura detectadas;
3. cobertura e información faltante;
4. hallazgos priorizados;
5. ubicación exacta;
6. por qué constituye un problema;
7. corrección recomendada;
8. alternativas;
9. código antes/después cuando la evidencia lo permita;
10. cambios por archivo, símbolo, módulo y repositorio;
11. impacto en contratos, datos y consumidores;
12. orden de implementación;
13. criterios de aceptación por hallazgo;
14. pruebas específicas;
15. rollback;
16. decisiones humanas pendientes;
17. evidencias y limitaciones.

Controles obligatorios:

- una propuesta no puede tener confianza alta con `facts` vacío;
- una propuesta no puede tener confianza alta si falta el flujo solicitado;
- no puede incluir documentos fuera del alcance sin justificar la relación;
- no puede presentar placeholders como criterios finales;
- los requisitos humanos no se convierten automáticamente en hechos o decisiones aprobadas;
- cada cambio debe referenciar al menos un hallazgo;
- cada hallazgo confirmado debe tener evidencia y corrección;
- una propuesta con solo candidatos queda en estado `insufficient_evidence` o `review_required` con confianza baja.

## 17. Renderizado del informe

Formato mínimo por hallazgo:

```markdown
## ARCH-DIP-001 — Dependencia de implementación concreta

- Severidad: alta
- Estado: confirmado
- Confianza: alta
- Archivo: `.../InspectorHandler.java`
- Símbolo: `InspectorHandler.inspectorsPortIn`
- Evidencia: `evidence-...`

### Código observado

```java
private final InspectorDomainUseCase inspectorsPortIn;
```

### Por qué es un problema

El adaptador de entrada queda acoplado a una implementación del caso de uso.

### Corrección

Depender de `InspectorsUsecasePortIn` y conservar el binding hacia la implementación.

### Criterios de aceptación

- El Handler no importa `InspectorDomainUseCase`.
- El contexto de Spring resuelve `InspectorsUsecasePortIn`.
- El endpoint conserva su respuesta y manejo de errores.

### Pruebas

- Prueba de wiring.
- Prueba del Handler usando un mock del puerto.
- Regresión del endpoint.
```

## 18. Fases de implementación

### Fase 0 — Baseline y regresión

- [ ] Congelar como caso negativo la propuesta actual de `permisos-admin`.
- [ ] Crear assertions que detecten documentos irrelevantes, hechos vacíos y confianza alta inválida.
- [ ] Medir tokens, documentos, evidencias, tiempo y lecturas de fuente.
- [ ] Confirmar que la documentación actual no cambia.

### Fase 1 — Contratos y configuración

- [ ] Crear contratos `PracticeRule`, `PracticeCandidate`, `PracticeFinding` y `TechnicalReview`.
- [ ] Crear esquemas JSON v3.
- [ ] Extender `knowledge.yaml` y su validador.
- [ ] Implementar excepciones empresariales.
- [ ] Versionar reglas y resultados.

### Fase 2 — Resolución estricta de alcance

- [ ] Implementar anclas por capacidad, endpoint, flujo y símbolo.
- [ ] Separar términos funcionales de términos de calidad.
- [ ] Calcular cobertura y contaminación.
- [ ] Descartar documentos no conectados.
- [ ] Bloquear contextos sin el flujo requerido.
- [ ] Corregir el caso `permisos-admin` para reutilizar el contexto adecuado.

### Fase 3 — Motor y registro de reglas

- [ ] Crear `RuleRegistry`.
- [ ] Implementar activación por perfil tecnológico.
- [ ] Implementar ejecución determinista.
- [ ] Implementar deduplicación de candidatos.
- [ ] Implementar verificación y estados.
- [ ] Registrar métricas por regla.

### Fase 4 — Reglas universales y arquitectónicas

- [ ] Implementar las primeras reglas universales.
- [ ] Implementar dirección de dependencias.
- [ ] Implementar puertos, adaptadores y límites de capas.
- [ ] Implementar consultas o colecciones sin límites.
- [ ] Implementar manejo y pérdida de causas de error.
- [ ] Implementar propiedad y responsabilidades ambiguas.

### Fase 5 — Java, Spring MVC y WebFlux

- [ ] Implementar reglas Java generales.
- [ ] Implementar reglas Spring MVC.
- [ ] Implementar reglas Reactor/WebFlux.
- [ ] Diferenciar código imperativo de reactivo.
- [ ] Probar que reglas reactivas no se ejecutan sobre Spring MVC.
- [ ] Validar `permisos-admin` como caso real.

### Fase 6 — Node.js y TypeScript

- [ ] Implementar reglas JavaScript/TypeScript.
- [ ] Implementar reglas Node.js.
- [ ] Implementar Express.
- [ ] Implementar NestJS.
- [ ] Validar promesas, fronteras, errores, consultas y capas.

### Fase 7 — Angular y React

- [ ] Implementar perfil Angular.
- [ ] Implementar reglas Angular y RxJS.
- [ ] Implementar perfil React.
- [ ] Implementar reglas React y hooks.
- [ ] Evitar reglas basadas únicamente en tamaño.
- [ ] Validar separación entre presentación, negocio e infraestructura.

### Fase 8 — Evidencia e integraciones

- [ ] Asociar candidatos con chunks y hechos AST.
- [ ] Integrar investigación limitada.
- [ ] Integrar lectura puntual de evidencia.
- [ ] Crear contrato para analizadores externos.
- [ ] Importar al menos un fixture Sonar y uno ESLint.
- [ ] Auditar todos los accesos a código.

### Fase 9 — MCP y propuestas

- [ ] Implementar las tres herramientas MCP nuevas.
- [ ] Exigir revisión técnica para propuestas de deuda.
- [ ] Renderizar hallazgos y correcciones.
- [ ] Generar criterios y pruebas por hallazgo.
- [ ] Implementar compuertas de suficiencia y confianza.
- [ ] Publicar borradores sin alterar documentación vigente.

### Fase 10 — Validación integral

- [ ] Ejecutar typecheck, build y suite completa.
- [ ] Validar Java imperativo.
- [ ] Validar WebFlux.
- [ ] Validar Node/Express o NestJS.
- [ ] Validar Angular.
- [ ] Validar React.
- [ ] Confirmar cero regresiones en documentación.
- [ ] Confirmar cero exploraciones masivas implícitas.
- [ ] Medir precisión, falsos positivos, tokens, tiempo y lecturas.

## 19. Casos verticales de aceptación

### 19.1 GR — permisos administrativos

Debe recuperar exclusivamente el flujo `GET /permisos-admin` y sus componentes relacionados.

Hallazgos mínimos esperados, sujetos a verificación:

- dependencia del Handler hacia el UseCase concreto;
- `findAll` seguido de `collectList` sin límite observable;
- traducción de error mediante `onErrorResume` que vuelve a emitir error;
- excepción de guardado utilizada durante una lectura;
- error tipográfico `insperctorsByServiceCenter`;
- seguridad del endpoint marcada como `unresolved`, no como vulnerabilidad confirmada, si no existe evidencia suficiente.

No deben aparecer `GestionCentroServicioUseCase`, `UpsertClientUseCase`, alertas o vehículos salvo que exista una relación técnica demostrada con el flujo.

### 19.2 Java imperativo

Fixture con Controller, Service, Repository y transacción.

Debe detectar:

- Controller accediendo directamente a Repository;
- entidad de persistencia expuesta como respuesta;
- transacción ubicada incorrectamente;
- excepción sin causa.

No debe ejecutar reglas Reactor.

### 19.3 Node/Express o NestJS

Fixture con endpoint, servicio y persistencia.

Debe detectar:

- promesa no esperada;
- consulta sin límite;
- lógica de negocio en controlador;
- entrada sin validación observable.

### 19.4 Angular

Fixture con componente, servicio HTTP y RxJS.

Debe detectar:

- acceso HTTP directo desde componente;
- suscripción anidada;
- ausencia de liberación o estrategia declarativa;
- lógica de negocio mezclada con presentación.

### 19.5 React

Fixture con hooks y acceso remoto.

Debe detectar:

- efecto usado para mantener estado derivado;
- dependencias incorrectas;
- carrera de solicitudes sin cancelación;
- componente acoplado directamente a infraestructura.

## 20. Estrategia de pruebas

### Unitarias

- una prueba positiva y una negativa por regla;
- tecnología incompatible;
- excepción aceptada;
- evidencia insuficiente;
- deduplicación;
- severidad y confianza independientes.

### Integración

- extracción → contexto → regla → hallazgo;
- investigación limitada;
- lectura por `evidence_id`;
- importación de análisis externo;
- propuesta construida desde `review_id`.

### Regresión

- documentación sin archivos de test;
- publicación acumulativa;
- Node, JavaScript y TypeScript actuales;
- Java anotado y WebFlux funcional;
- MCP sin análisis automático;
- propuesta normal de desarrollo sin revisión de deuda obligatoria.

### Seguridad

- secretos redactados;
- traversal rechazado;
- hash de evidencia validado;
- presupuestos acumulativos;
- repositorios no autorizados inaccesibles.

## 21. Métricas

Por revisión se almacenarán:

- reglas evaluadas;
- candidatos generados;
- confirmados, descartados y no resueltos;
- hallazgos por severidad;
- cobertura de símbolos requeridos;
- contaminación del contexto;
- documentos y chunks consumidos;
- tokens estimados;
- archivos y bytes leídos directamente;
- duración y memoria;
- resultados reutilizados;
- hallazgos provenientes de herramientas externas;
- falsos positivos marcados por humanos.

Metas iniciales:

- cero documentos ajenos al subgrafo funcional sin justificación;
- cero propuestas de deuda con hechos vacíos y confianza alta;
- cero lecturas amplias del repositorio como fallback automático;
- reutilización de resultados cuando no cambien hashes ni versión de regla;
- contexto dentro del presupuesto configurado;
- cada hallazgo confirmado con ubicación, evidencia y corrección.

## 22. Riesgos y mitigaciones

### Falsos positivos

Mitigación:

- candidatos antes de hallazgos;
- exclusiones por tecnología;
- evidencia mínima;
- excepciones empresariales;
- estados `candidate` y `unresolved`;
- retroalimentación humana persistida.

### Reglas demasiado prescriptivas

Mitigación:

- separar regla universal de preferencia organizacional;
- permitir deshabilitar o ajustar severidad;
- exigir impacto técnico explicado;
- no usar tamaño como única evidencia.

### Costo de análisis

Mitigación:

- ejecución por alcance;
- caché por hash de símbolo, regla y versión;
- activación selectiva de paquetes;
- lectura puntual;
- importación de resultados existentes.

### Contaminación entre flujos

Mitigación:

- anclas fuertes;
- filtro por subgrafo;
- métricas de contaminación;
- compuerta antes de generar propuestas.

### Duplicación con Sonar o ESLint

Mitigación:

- importar y correlacionar resultados;
- concentrar el valor propio en arquitectura, flujo, responsabilidad e impacto;
- identificar origen del hallazgo.

## 23. Compatibilidad y migración

- El índice documental actual se mantiene.
- Los contratos nuevos son aditivos dentro de schema v3 mientras sea compatible.
- Los runs anteriores podrán reindexarse sin volver a analizar repositorios cuando contengan hechos suficientes.
- Las propuestas de desarrollo normales seguirán funcionando.
- Las propuestas de deuda usarán el nuevo `review_id`.
- Las vistas actuales de Obsidian no se reemplazan.
- Node, JavaScript, TypeScript, Java, Angular y React comparten el motor, pero activan reglas distintas.
- Si una tecnología no tiene paquete especializado, se ejecutan únicamente reglas universales y arquitectónicas compatibles.

## 24. Definición de terminado

La funcionalidad estará completa cuando:

- exista un registro versionado y extensible de reglas;
- los paquetes se activen por tecnología y arquitectura;
- el alcance quede anclado y medido;
- cada hallazgo incluya evidencia, ubicación, impacto y corrección;
- las propuestas de deuda dependan de una revisión técnica;
- no se pueda obtener confianza alta con hechos vacíos o flujo faltante;
- se validen casos Java imperativo, WebFlux, Node, Angular y React;
- el caso real `permisos-admin` produzca hallazgos concretos y no incluya documentos ajenos;
- las reglas reactivas no afecten código imperativo;
- la documentación actual permanezca intacta;
- la suite automatizada, typecheck, build y smoke MCP pasen;
- la consulta normal no realice lecturas masivas del repositorio;
- la bóveda publique informes revisables y trazables.

## 25. Orden recomendado de implementación

1. Crear el caso de regresión de la propuesta defectuosa.
2. Corregir alcance y propagación de `context_id`/`capability_id`.
3. Crear contratos y registro de reglas.
4. Implementar reglas universales y arquitectónicas.
5. Validar Java imperativo y WebFlux.
6. Integrar los hallazgos con propuestas.
7. Implementar Node y TypeScript.
8. Implementar Angular y React.
9. Importar herramientas externas.
10. Ejecutar validación integral y documentar operación.

Este orden resuelve primero el defecto observado sin acoplar el diseño a WebFlux y deja preparada la extensión progresiva a todos los lenguajes y frameworks soportados por el extractor.
