---
name: archify-documentation
description: 'Adapta hechos y hallazgos validados al DocumentModel ASD-TSE-100 del sistema de documentación.'
user-invocable: false
disable-model-invocation: false
---

# Archify para documentación arquitectónica

## Propósito

Aplicar la estructura compatible con Archify sin acoplar el Documentador a un proveedor, modelo o sistema operativo. La skill recibe datos estructurados, conserva ASD-TSE-100 y produce contenido revisable. No presupone un ejecutable Archify ni inventa su ejecución.

## Entradas

- `TaskPacket` validado con hechos, evidencias, cobertura, desconocidos y subgrafo pertinente.
- Secciones de `templates/asd-tse-100-es.md`.
- Contrato del Documentador.
- Estado del adaptador Archify y convenciones configuradas.

No recibir repositorios completos, logs brutos, rutas adicionales o conversaciones completas.

## Procedimiento

1. Comprobar el recurso real y el estado del adaptador.
2. Si existe una implementación configurada y autorizada, registrar comando, versión y artefactos observados.
3. Si no existe, usar modo `fallback` y registrar `archify.status: unavailable`; no simular ejecución.
4. Producir todas las secciones ASD-TSE-100.
5. Mantener `Desconocido`, `No soportado`, `No examinado` o `Pendiente de revisión` cuando corresponda.
6. Generar con Archify únicamente el mapa de arquitectura general.
7. Dejar los diagramas por servicio y por endpoint al generador Mermaid determinista del motor.
8. Separar hechos, inferencias, desconocidos, riesgos y decisiones propuestas.
9. Permitir que el motor publique automáticamente la documentación factual validada; la skill no aprueba decisiones.

## Regla de estado

`archify.status: executed` solo es válido con evidencia de un adaptador externo. `skill_applied` significa que estas instrucciones se incorporaron al paquete, no que Archify se ejecutó.
