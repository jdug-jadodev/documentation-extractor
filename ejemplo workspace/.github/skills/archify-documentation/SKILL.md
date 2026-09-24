---
name: archify-documentation
description: 'Adapta hechos y hallazgos validados al DocumentModel ASD-TSE-100 del sistema de documentación.'
user-invocable: false
disable-model-invocation: false
---

# Archify para documentación arquitectónica

## Propósito preservado

Aplicar la estructura compatible con Archify sin acoplar el Documentador a un proveedor, modelo o sistema operativo. La skill recibe datos estructurados, conserva ASD-TSE-100 y produce contenido revisable. No presupone un ejecutable Archify ni inventa su ejecución.

Esta revisión migra el contrato de transporte a `schema_version: 3`. El cuerpo original está respaldado con SHA-256 `c228070ad43550ef5a945e4020bb427d3377dba6ef7b55ef098a1b6cb8392188` en `.knowledge/migration-backup/t01-baseline/.github/skills/archify-documentation/SKILL.md`.

## Entradas

- `TaskPacket` validado con hechos, evidencias, cobertura, desconocidos y subgrafo pertinente.
- Secciones reales de `templates/asd-tse-100-es.md`.
- Contrato canónico `agents/documentation.md`.
- Estado del adaptador Archify y convenciones configuradas.

No recibir repositorios completos, logs brutos, rutas adicionales o conversaciones completas.

## Procedimiento

1. Comprobar el recurso real y el estado del adaptador.
2. Si hay implementación configurada y autorizada, registrar comando, versión y artefactos observados.
3. Si no existe, usar modo `fallback` y registrar `archify.status: unavailable`; no simular ejecución.
4. Producir `sections[]` para todas las secciones ASD-TSE-100.
5. Mantener `Desconocido`, `No soportado`, `No examinado` o `Pendiente de revisión` según corresponda.
6. Generar el diagrama de arquitectura general solo desde hechos, hallazgos y aristas referenciados. Este es el alcance Archify de la salida.
7. Los diagramas de cada servicio y cada endpoint se generan como Mermaid determinista por el motor; no atribuirlos a una ejecución externa de Archify.
8. Separar hechos, inferencias, desconocidos, riesgos y decisiones propuestas.
9. Permitir que el motor publique automáticamente la documentación factual después de la validación mecánica. La skill no aprueba decisiones ni propuestas.

## Salida

Un `AgentResult` v3 del rol `documentation` cuyo `payload.sections[]` contiene `section_id`, `paragraphs[]`, `fact_ids`, `finding_ids` y `unknowns`. El motor ensambla el documento ASD-TSE-100, el mapa arquitectónico, diagramas por servicio y un Markdown Mermaid por endpoint desde un único `DocumentModel` y los hechos canónicos.

`archify.status: executed` solo es válido con evidencia del adaptador externo. `skill_applied` significa que estas instrucciones se incorporaron al paquete, no que Archify se ejecutó.

## Reglas

- No cambiar hechos ni nombres de campos sin nueva versión de contrato.
- No acceder a terminal, fuentes, red, MCP, rutas o agentes.
- No usar rutas absolutas ni incluir secretos.
- No convertir una inferencia o decisión propuesta en un hecho. La documentación factual puede publicarse automáticamente sin ocultar limitaciones.
- Una contradicción se conserva como limitación explícita; solo un error mecánico o de seguridad bloquea la publicación.
- Propuestas de desarrollo, migración o ADR pertenecen al Proponente.
