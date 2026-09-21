---
id: DOCSYS-INDICE-V4-NODE
version: 4.0.0
fecha: 2026-09-21
estado: paquete-final-de-planificacion
---

# Empieza aquí — paquete Node.js + TypeScript

**Decisiones cerradas:** Obsidian obligatorio; repositorios en un mismo workspace, separados del sistema; motor determinista Node.js 24 LTS + TypeScript, para Windows/Linux/macOS; ocho roles conservados; configuración guiada; carpeta compartida sin Azure obligatorio. Azure Repo y Azure Pipelines son opciones independientes, desactivadas al empezar.

Este paquete contiene la especificación de la modificación, no la aplicación modificada. No incluye ejecutables del motor ni afirma haber probado tu repositorio real. El paquete V3 se conserva como histórico; **usa esta carpeta completa V4 Node y no mezcles sus archivos con V3**. Se reemplazan los comandos/runtime Python del motor; se mantienen el alcance funcional y los esquemas de datos v3. La demo Python es material analizado, no una dependencia de instalación.

## Qué abrir

| Documento | Para quién y para qué |
|---|---|
| [01 — Plan final de desarrollo](01-PLAN-FINAL-DESARROLLO.md) | IA implementadora: arquitectura, contratos, migración, 56 tareas, 112 pruebas funcionales conservadas y 16 adicionales de Node (128 casos especificados). |
| [02 — Subagentes corregidos](02-SUBAGENTES-CORREGIDOS.md) | IA implementadora: instrucciones de los ocho roles, perfiles y formatos para sustituir los actuales. |
| [03 — Qué necesito de ti](03-QUE-NECESITO-DE-TI.md) | Usuario: programas que instalar, rutas y permisos que proporcionar. |
| [04 — Guía de uso y pruebas](04-GUIA-DE-USO-Y-PRUEBAS.md) | Usuario e implementador: configuración, rutina, ramas, Obsidian, compartición y pruebas paso a paso. |
| [05 — Cambios y comprobación documental](05-CAMBIOS-Y-VALIDACION-NODE.md) | Diferencias frente a V3 y comprobaciones efectuadas sobre estos documentos, no sobre el software. |

**Para ti:** empieza por 03 y 04. **Para la IA:** entrega la carpeta completa y el acceso local al proyecto existente; empieza por T01 del plan. Las pruebas están definidas, no ejecutadas sobre el producto.

## Instrucción para la IA implementadora

```text
Modifica el sistema existente siguiendo este paquete V4 Node. Las decisiones obligatorias
son Obsidian, repositorios autorizados en un único workspace, motor Node.js 24 LTS
y TypeScript compilado, probado en Windows/Linux/macOS,
ocho roles conservados, configuración guiada y Azure opcional. No crees otra
plataforma ni elimines capacidades para simplificar.

Empieza por T01: inspecciona el proyecto real, incluidas configuraciones, esquemas,
plantilla ASD-TSE-100 y skill archify-documentation. Conserva lo compatible y registra
faltantes o conflictos. No inventes archivos no leídos ni modifiques aplicaciones.

Implementa una tarea acotada a la vez, respetando dependencias y pruebas del plan.
Carga las reglas comunes, la tarea activa y sus fuentes necesarias, no todos los
repositorios ni la conversación completa en cada paso. Usa pruebas sin proveedor
para el desarrollo; una prueba real de Copilot requiere autorización de consumo.

Mantén docs/implementacion/progreso.md con archivos modificados, pruebas ejecutadas,
resultados y pendientes. Verifica cada función antes de marcarla terminada. No
confundas mocks con integración real, perfiles escritos con agentes ejecutados ni
estimaciones con consumo observado. Continúa tareas independientes ante bloqueos.
La entrega local no depende de Azure ni de Python. Conserva schemas/v3 y la demo
FastAPI como texto analizado. Entrega dist y gramáticas WASM; npm start abre el menú.
Prueba typecheck, build, npm test y N01–N16, además de P01–P112. Comprueba la guía
humana antes de declarar utilizable el sistema; no compiles ni instales las apps.
```

## Cambio operativo principal

**Usuario:** instalar Node.js en lugar de Python y arrancar el producto con `npm start` o sus lanzadores. **Implementador:** código en `src/**/*.ts`, JavaScript distribuido en `dist/`, WASM incluido y dependencias fijadas en `package-lock.json`. **Lector:** únicamente Obsidian y la carpeta documental; sigue sin necesitar el motor.

Los archivos de esta carpeta son Markdown de planificación: no contienen todavía `package.json`, `dist/` ni los lanzadores ejecutables. Los ejemplos internos especifican qué debe construirse.

## Orden de demostración

Primero, instalación y demo sintética sin IA; después, extracción del repositorio autorizado; luego, una tarea real de Copilot autorizada; finalmente, revisión y publicación en Obsidian y lectura desde otro equipo sin instalar el motor.

El primer éxito verificable es **tres endpoints y una relación en la demo, con cero llamadas a IA**. La documentación completa y la integración real con el proveedor se validan después; no se declaran demostradas por ese primer resultado.
