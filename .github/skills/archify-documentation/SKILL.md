---
name: archify-documentation
description: 'Use when the Documentador must generate or maintain architecture documentation with Archify-compatible structure, including ASD-TSE-100, services, APIs, messages, data, flows, Mermaid diagrams, evidence, migration proposals, or ADRs. Works in GitHub Copilot and preserves interoperability with Codex, Claude Code, and OpenCode.'
user-invocable: false
disable-model-invocation: false
---

# Archify para documentación arquitectónica

## Propósito

Aplicar el flujo documental compatible con Archify desde GitHub Copilot sin acoplar el Documentador a un proveedor de modelo o a un sistema operativo concreto.

La skill es un adaptador de documentación: recibe hallazgos estructurados, aplica el contrato documental del workspace y produce artefactos revisables. No debe asumir que el ejecutable de Archify está instalado ni inventar una salida si no existe una implementación disponible.

## Cuándo usarla

Usar esta skill cuando la tarea solicite:

- generar o mantener documentación arquitectónica;
- describir servicios, módulos, APIs, mensajes, datos o flujos;
- crear diagramas Mermaid;
- proponer una migración, especificación o ADR a partir de documentación;
- actualizar conocimiento existente después de analizar código;
- interoperar con una salida producida por Archify, Codex, Claude Code u OpenCode.

## Entradas obligatorias

- `findings.yaml` y evidencias seleccionadas del Extractor;
- `relations.yaml` cuando existan relaciones transversales;
- `review.yaml` cuando haya dudas o contradicciones;
- `config/documentation.yaml`;
- `templates/asd-tse-100-es.md`;
- `config/archify.yaml`;
- repositorio, rama, `run_id` y alcance.

No recibir el repositorio completo ni conversaciones completas.

## Procedimiento

1. Leer `config/archify.yaml` y comprobar si existe una implementación o salida Archify disponible.
2. Si existe un comando o adaptador configurado, usar únicamente ese contrato y registrar comando, versión, estado y artefactos producidos.
3. Si Archify no está disponible, continuar en modo compatible (`fallback`) con el Documentador local y registrar `archify.status: unavailable`; no simular que se ejecutó Archify.
4. Normalizar los hallazgos en la estructura de documentación configurada.
5. Generar el documento Markdown en español con todas las secciones ASD-TSE-100, incluyendo `Desconocido` o `Pendiente de revisión` cuando falte evidencia.
6. Generar diagramas Mermaid solo a partir de relaciones evidenciadas; no inferir flechas, consumidores o dependencias no respaldadas.
7. Conservar repositorio, rama, fecha, estado, confianza y referencias de archivo, símbolo o líneas.
8. Separar hechos, inferencias, desconocidos, riesgos y decisiones propuestas.
9. Escribir resultados nuevos únicamente en `results/runs/<run-id>/`.
10. Dejar el resultado en `review` o `review_required`; nunca publicar automáticamente.

## Contrato de salida

El Documentador debe producir un manifiesto compatible con los consumidores de Archify y del workspace:

```yaml
schema_version: 1
agent: documentation
skill: archify-documentation
archify:
  status: unavailable
  mode: fallback
  implementation: null
  version: null
run_id: <run-id>
repository: <repository>
branch: <branch>
format: ASD-TSE-100
language: es-CO
status: review
outputs:
  - path: results/runs/<run-id>/<repository>/document.md
  - path: results/runs/<run-id>/<repository>/documents.yaml
facts: []
inferences: []
unknown: []
evidence: []
review_required: []
metrics:
  tokens_input: 0
  tokens_output: 0
  credits_consumed: 0
```

Cuando Archify sí esté disponible, cambiar únicamente `archify.status`, `archify.mode`, `archify.implementation` y `archify.version`; conservar el resto del contrato.

## Reglas de interoperabilidad

- No cambiar nombres de campos existentes sin crear una versión del contrato.
- No depender de `pwsh`, Bash, Node.js o Python para las instrucciones de la skill.
- No usar rutas absolutas; referenciar recursos de la skill o del workspace mediante rutas relativas.
- No convertir una salida de Archify en conocimiento aprobado automáticamente.
- Si la salida de Archify contradice evidencias del Extractor o el Revisor, conservar la contradicción y marcar `review_required`.
- Si el usuario pide una propuesta de desarrollo, migración o ADR, devolver primero la documentación estructurada y dejar la propuesta al agente `proposal`.

## Recursos

- Contrato del adaptador: [config/archify.yaml](../../../config/archify.yaml)
- Plantilla documental: [templates/asd-tse-100-es.md](../../../templates/asd-tse-100-es.md)
- Contrato del Documentador: [agents/documentation.md](../../../agents/documentation.md)
