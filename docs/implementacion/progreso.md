# Progreso de implementación

Última actualización: 2026-09-22

Este registro separa código implementado, compilaciones, pruebas realizadas, pruebas pendientes y bloqueos reales. Una prueba automatizada superada no marca por sí sola todos los criterios P/N como aprobados.

## Código implementado

- Motor único Node.js + TypeScript, contratos v3, snapshots Git sin checkout, ocho roles, plantilla ASD-TSE-100, Obsidian obligatorio, Azure opcional, CLI y MCP bajo demanda.
- Extractor transversal de arquitectura para JavaScript, TypeScript y TSX: módulos, clases, funciones, métodos de clase, firmas, parámetros, llamadas estáticas observadas, capas, responsabilidades, imports internos, paquetes, scripts y tecnologías. La regla de símbolos está versionada como `source.symbol: 2` para invalidar cachés anteriores.
- Extractor Express ampliado: rutas, montajes, método, fragmento, ruta compuesta y expresión del handler. La composición se mantiene por componente para no mezclar servicios con rutas iguales.
- Documentación por servicio en un único `servicio.md`, con resumen, capacidades, arquitectura interna, responsabilidades, endpoints, datos, dependencias, tecnologías, scripts, evidencia y limitaciones.
- `Flujos/end-to-end.md` enlaza cada entrada y salida HTTP. Cada endpoint de entrada y cada llamada HTTP saliente tiene además su propio Markdown y Mermaid bajo `Servicios/<servicio>/<rama>/flujos/`.
- Cada servicio tiene `diagramas/arquitectura.md`; `Mapas/microservicios.md` muestra consumidores, llamadas, destinos, estados, evidencias y limitaciones; `Mapas/relaciones.md` queda reservado para la arquitectura general compatible con `archify-documentation`.
- Las conexiones conservan `supported`, `candidate` o `unresolved`. No se presenta la alcanzabilidad estática como tráfico ejecutado.
- Vista estable `Actual` en la bóveda, además de las ediciones inmutables en `Publicaciones`. El publicador intenta configurar el grafo para excluir `Publicaciones`, `Borradores` y `.staging`; Obsidian puede sobrescribir ese archivo si permanece abierto.
- `docsys_prepare_documentation` genera, valida mecánicamente y publica la edición factual final. Se retiraron del CLI los comandos de aprobación/publicación humana; ADR, especificación y migración siguen siendo propuestas.
- El publicador conserva hashes y ediciones inmutables e incorpora un fallback de copia para Windows cuando Obsidian bloquea el `rename` atómico de `Actual`.
- Ocho herramientas MCP `docsys_*`: estado, repositorios, análisis, relación, flujo, consulta, propuesta y documentación.
- El workspace recibe solo el agente de entrada, instrucciones, skill y configuración MCP. Los seis perfiles interpretativos se generan en el runtime privado con `tools: []`; Inventariador y Publicador son responsabilidades de código. No se copian ocho agentes con acceso directo a los repositorios.

## Configuración real usada

- Motor: `C:\Users\Usuario\Documents\documentation-extractor`.
- Workspace: `C:\Users\Usuario\Documents\prueba-extractor\.code-workspace`.
- Configuración: `C:\Users\Usuario\Documents\prueba-extractor\knowledge.yaml`.
- Bóveda: `C:\Users\Usuario\Documents\prueba-obsidian`.
- Estado privado: `C:\Users\Usuario\Documents\documentation-extractor\.knowledge\workspaces\prueba-extractor`.
- Repositorios: `backend-elevacion`, `estraviado` y `login-estraviado`, todos en `main`.

## Compilaciones realizadas

- Node.js 24.21.0 x64 mediante NVM y pnpm 10.0.0.
- `node scripts/typecheck.mjs`: completado sin errores después de la ampliación de extractores y documentación.
- `node scripts/build.mjs`: completado sin errores; `dist/` actualizado.
- Dependencias instaladas con scripts de paquetes desactivados.

## Pruebas realizadas

- Suite automatizada disponible: **42/42 superadas**, 0 fallos y 0 omitidas.
- Transporte MCP `stdio`: protocolo `2025-06-18`, servidor `sistema-documentacion` 4.0.0 y ocho herramientas.
- Prueba MCP de documentación sobre el run vigente: no reanalizó, devolvió `published: true`, reutilizó la edición y apuntó a `Actual/Inicio.md`.
- Run vigente y único: `run-2026-09-22T17-13-48-082Z-scenario-backend-el`.
- Commits: `backend-elevacion` `56bb4626cec6bd406514d2719302cb90c17a5ab0`, `estraviado` `4a578fc2b42ff89db0292aace59a84ccc0be2b5e` y `login-estraviado` `c719eab48c4a0a29408cfc5de51c35ea1bca7e37`.
- Resultado: 1.877 hechos, 85 relaciones y 0 llamadas de IA; los tres bundles quedaron `partial`. Se extrajeron 28 métodos en `backend-elevacion`, 11 en `estraviado` y 56 en `login-estraviado`.
- Revisión mecánica del candidato: 0 incidencias.
- Edición publicada vigente: `2026-09-22T17-15-52-515Z-be7c633cf0`, 29 archivos de contenido, manifiesto completo y hashes verificados con `status: complete`.
- `Actual` contiene tres fichas, tres diagramas de servicio, ocho flujos de entrada, once flujos de salida, mapa de microservicios, mapa general e índice extremo a extremo.
- Durante la comprobación final Obsidian estaba abierto y volvió a dejar vacío el filtro de la vista gráfica. La consulta correcta es `-path:Publicaciones -path:Borradores -path:.staging`; debe aplicarse en la interfaz o publicarse con Obsidian cerrado.
- No se descargaron repositorios ni se ejecutaron, compilaron o modificaron aplicaciones.
- Limpieza solicitada el 2026-09-22: en el estado privado solo permanece `run-2026-09-22T17-13-48-082Z-scenario-backend-el`; el historial documental inmutable de Obsidian no se eliminó.
- Se añadieron `prompts/` con siete pruebas reproducibles para Copilot y `ejemplo workspace/` con un workspace seguro en `configuration_pending`, configuración MCP, agente de entrada y skill Archify.

## Pruebas pendientes

- Revisión visual manual del contenido nuevo dentro de la aplicación Obsidian.
- Campaña completa P01–P112 y N01–N16; el catálogo conserva sus estados `pending`.
- El usuario confirmó el funcionamiento desde Copilot. Sigue pendiente una campaña instrumentada de los seis especialistas interpretativos con medición de tokens/créditos, presupuesto, caché, cancelación y reanudación; esta publicación se produjo con extracción determinista y 0 llamadas de IA.
- Verificación diferenciada de GitHub Copilot en VS Code, CLI e IntelliJ.
- Adaptador externo Archify. La skill y el fallback Mermaid están activos, pero `archify.status: executed` no puede declararse sin un ejecutable/adaptador comprobado.
- Linux x64, macOS Intel/Apple Silicon, lanzadores externos, rutas especiales, seguridad adversarial, rendimiento, caché, cancelación, rollback y recuperación.
- Azure Pipelines/Azure Repo y tareas programadas, solo si el usuario decide activarlos.

## Bloqueos reales

- Falta `SISTEMA-DOCUMENTACION-V4-NODE/03-QUE-NECESITO-DE-TI.md` en el paquete recibido.
- No existe todavía una ejecución instrumentada de los seis especialistas que permita atribuir consumo de tokens/créditos al motor.
- No hay implementación externa de Archify configurada; los diagramas actuales son Mermaid determinista conforme a la skill.
- No hay entornos Linux/macOS disponibles.

## Estado de entrega

**Motor, MCP, extracción arquitectónica y publicación Obsidian comprobados en Windows; interpretación por agentes, Archify externo y campaña completa de aceptación permanecen pendientes.**
