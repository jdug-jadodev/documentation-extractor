# Roles y contratos de los agentes

## Propósito

Definir qué responsabilidad tiene cada agente, qué información recibe, qué artefacto produce, qué modelo puede utilizar y cuáles son sus límites. Los agentes intercambian archivos estructurados dentro de una ejecución; no dependen de conversaciones completas.

## Contrato común

Todos los agentes deben cumplir estas reglas:

- Leer únicamente repositorios habilitados en `workspace-repos.yaml`.
- Recibir entradas estructuradas y devolver una salida estructurada.
- Conservar `repository`, `branch`, `run_id`, fecha, estado, confianza y evidencias.
- Distinguir hechos, inferencias, desconocidos y elementos pendientes de revisión.
- No recibir ni enviar el repositorio completo a un modelo.
- No guardar secretos, tokens ni contraseñas en los resultados.
- No ejecutar `push`, `merge`, `commit` ni publicación externa.
- Escribir solo dentro de `results/runs/<run-id>/` durante una ejecución.
- Marcar una tarea como `failed` sin invalidar automáticamente las tareas independientes.
- Aplicar `config/response-policy.yaml` a los resúmenes destinados al usuario.
- Incluir la clasificación `complexity` en todo plan que afecte código.

## Estados de artefactos

| Estado | Significado |
| --- | --- |
| `planned` | La tarea está definida, pero aún no se ejecuta. |
| `pending` | La tarea espera una dependencia o confirmación. |
| `running` | La tarea está en ejecución. |
| `review` | El resultado existe y requiere revisión antes de considerarse aprobado. |
| `review_required` | El resultado contiene dudas, decisiones o impacto que requieren validación humana. |
| `approved` | Una persona validó el resultado para incorporarlo al conocimiento. |
| `failed` | La tarea no pudo completarse; el error debe quedar registrado. |

## Contrato mínimo de salida

Cada agente debe producir, como mínimo, un artefacto YAML con esta información cuando aplique:

```yaml
schema_version: 1
run_id: run-YYYYMMDD-HHmmss
agent: <agent-id>
status: review
inputs:
  - path: <archivo de entrada>
outputs:
  - path: <archivo generado>
repositories:
  - name: <repositorio>
    branch: <rama>
summary: <resumen breve>
facts: []
inferences: []
unknown: []
evidence: []
risks: []
review_required: []
metrics:
  tokens_input: 0
  tokens_output: 0
  credits_consumed: 0
```

## Agentes

### 1. Orquestador (`orchestrator`)

**Responsabilidad:** interpretar la solicitud, validar el alcance y coordinar el flujo completo.

**Entrada:** solicitud en lenguaje natural, manifiesto, configuraciones, contratos y resultados vigentes.

**Salida:** `results/runs/<run-id>/orchestration-plan.yaml`.

**Funciones:**

- Clasificar la solicitud como documentación, análisis de flujo, especificación, migración, ADR o búsqueda dirigida.
- Resolver repositorios y módulos contra `workspace-repos.yaml`.
- Clasificar la complejidad inicial y revisada según `config/complexity.yaml`.
- Ejecutar el preflight del workspace antes de inventariar.
- Reutilizar inventarios y resultados vigentes.
- Determinar dependencias, paralelismo, coste y necesidad de confirmación.
- Delegar tareas a los agentes adecuados.
- Solicitar confirmación antes de niveles `high` y `critical` o cuando el coste supere el umbral.

**Límites:** no sustituye la extracción técnica, no inventa resultados y no aprueba publicaciones ni decisiones arquitectónicas.

**Modelo:** `user_selected`.

### 2. Inventariador (`inventory`)

**Responsabilidad:** detectar la estructura técnica del repositorio mediante las herramientas nativas `read` y `search` de GitHub Copilot, sin ejecutar terminal.

**Entrada:** raíz autorizada abierta en el workspace multi-raíz, rama declarada y alcance `inventory`.

**Salida:** `results/runs/<run-id>/<repository>/inventory.yaml` y manifiesto de ejecución.

**Detecta:** archivos, extensiones, proyectos, módulos, tecnologías, configuraciones y pruebas.

**Límites:** no interpreta reglas de negocio, no afirma responsabilidades que no pueda detectar, trabaja en modo solo lectura y no usa `run_in_terminal`.

**Modelo:** `copilot_tools`; coste de modelo esperado cero, con consumo de contexto de Copilot.

### 3. Extractor (`extraction`)

**Responsabilidad:** convertir el inventario y fragmentos seleccionados del código en hallazgos técnicos con evidencia.

**Entrada:** `inventory.yaml`, alcance, fragmentos de archivos y reglas del agente.

**Salida:** `results/runs/<run-id>/<repository>/findings.yaml`.

**Extrae:** APIs, persistencia, mensajes, configuraciones, dependencias, componentes, símbolos y evidencias.

**Límites:** no recibe el repositorio completo, no inventa propósito ni reglas de negocio y marca lo no determinable como `unknown`.

**Modelo:** `economical_code`; presupuesto configurado: 500 créditos.

### 4. Integrador (`integration`)

**Responsabilidad:** relacionar hallazgos de módulos o repositorios y construir flujos técnicos transversales.

**Entrada:** hallazgos, documentos existentes, contratos y evidencias seleccionadas.

**Salida:** `results/runs/<run-id>/relations.yaml`.

**Relaciona:** APIs proveedor/consumidor, mensajes, datos, dependencias, flujos y límites entre componentes.

**Límites:** solo se ejecuta cuando existen relaciones relevantes o varios repositorios; no convierte correlaciones en hechos sin evidencia.

**Modelo:** `strong_reasoning` cuando sea necesario; presupuesto configurado: 400 créditos y confirmación según las reglas de coste.

### 5. Documentador (`documentation`)

**Responsabilidad:** convertir hallazgos validados en documentación ASD-TSE-100 en español.

**Entrada:** hallazgos, evidencias, relaciones y configuración documental.

**Salida:** `results/runs/<run-id>/<repository>/documents.yaml` y documentos Markdown cuando corresponda.

**Debe incluir:** control documental, contexto, responsabilidades, interfaces, APIs, mensajes, datos, flujos, seguridad, operación, pruebas, riesgos, decisiones y evidencias.

**Límites:** no elimina información existente silenciosamente, no presenta inferencias como hechos y conserva secciones obligatorias aunque estén incompletas.

**Archify:** puede cargar `.github/skills/archify-documentation/SKILL.md`; debe usar `config/archify.yaml`, registrar si Archify está disponible y producir el contrato ASD-TSE-100 incluso en modo `fallback`.

**Modelo:** `economical_writing`; presupuesto configurado: 300 créditos.

### 6. Revisor (`review`)

**Responsabilidad:** revisar contradicciones, hallazgos dudosos, referencias incompletas y afirmaciones de alto impacto.

**Entrada:** hallazgos inciertos, documentos, relaciones y evidencias de soporte.

**Salida:** `results/runs/<run-id>/<repository>/review.yaml`.

**Revisa:** consistencia, confianza, cobertura, contradicciones, riesgos y necesidad de confirmación.

**Límites:** no convierte una inferencia en hecho sin evidencia y no aprueba decisiones ni publicaciones.

**Modelo:** `strong_reasoning` solo para dudas o impacto alto; presupuesto configurado: 300 créditos.

### 7. Proponente técnico (`proposal`)

**Responsabilidad:** redactar propuestas de desarrollo, migración o decisión arquitectónica después de que la documentación y los hallazgos hayan sido revisados.

**Entrada:** documentación, hallazgos, relaciones, resultado del Revisor y tipo `specification`, `migration` o `adr`.

**Salida:** `results/runs/<run-id>/proposal.yaml` y documento Markdown cuando corresponda.

**Debe incluir:** objetivo, alcance, estado actual, propuesta, componentes afectados, contratos, fases, alternativas, riesgos, pruebas, rollback o reversibilidad, decisiones pendientes y evidencias.

**Límites:** no modifica código, no publica cambios y deja el resultado en `review_required`. No inventa requisitos, costes, contratos ni dependencias.

**Complejidad:** debe reflejar el nivel recibido en la propuesta y ampliar fases, compatibilidad, pruebas, rollback y riesgos cuando sea `high` o `critical`.

**Modelo:** rol `proposal`, actualmente asignado a `economical_writing`; presupuesto configurado: 300 créditos.

### 8. Publicador (`publication`)

**Responsabilidad:** incorporar resultados aprobados al catálogo o cuerpo de conocimiento publicado.

**Entrada:** resultados con aprobación humana explícita.

**Salida:** catálogo o documentos publicados según el proceso del equipo.

**Límites:** está desactivado en el MVP; no puede ejecutarse automáticamente ni publicar resultados en estado `review` o `review_required`.

**Modelo:** `local`.

## Dependencias de ejecución

```text
Orquestador
    -> Inventariador
    -> Extractor
    -> Integrador (si aplica)
    -> Documentador
    -> Revisor
    -> Proponente (solo specification, migration o adr)
    -> aprobación humana
    -> Publicador (cuando se habilite)
```

Las tareas independientes pueden ejecutarse en paralelo, pero el Proponente debe esperar a que existan la documentación, las relaciones relevantes y la revisión correspondiente.

## Contratos entre etapas

| Etapa | Consume | Produce | Condición de avance |
| --- | --- | --- | --- |
| Preflight | Manifiesto y workspace | Resultado de acceso | Todas las rutas habilitadas son accesibles o el bloqueo queda registrado. |
| Inventario | Ruta local y rama | `inventory.yaml` | Inventario reproducible en estado `review`. |
| Extracción | Inventario y fragmentos | `findings.yaml` | Hallazgos con evidencias seleccionadas. |
| Integración | Hallazgos y documentos | `relations.yaml` | Relaciones justificadas o desconocidas explícitas. |
| Documentación | Hallazgos y evidencias | Markdown/YAML ASD-TSE-100 | Secciones obligatorias presentes. |
| Revisión | Resultados previos | `review.yaml` | Contradicciones y riesgos clasificados. |
| Propuesta | Resultados revisados | `proposal.yaml` | Propuesta completa en `review_required`. |
| Publicación | Resultado aprobado | Conocimiento publicado | Aprobación humana registrada. |
