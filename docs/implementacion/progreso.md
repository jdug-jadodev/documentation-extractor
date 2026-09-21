# Progreso de implementación

Última actualización: 2026-09-21

Este registro separa código preparado, compilaciones, pruebas pendientes y bloqueos reales. Ningún criterio P/N se considera aprobado mientras las pruebas sigan prohibidas.

## Código implementado

- T01: línea base, hashes, respaldo privado y mapa de migración en `docs/implementacion/baseline.md`, `.knowledge/migration-backup/t01-baseline/` y `migration-map.json`.
- T02–T07: proyecto único Node.js + TypeScript, contratos v3, configuración transaccional, migración explícita, bootstrap, CLI y lanzadores Windows/Linux/macOS.
- T08–T14: asistente `.code-workspace`, preflight, snapshots Git sin checkout, inventario seguro, plugins y gramáticas WASM locales.
- T15–T22: extractores .NET, Spring, JEE/WebLogic, Angular, React y Python. No importan, compilan ni ejecutan aplicaciones.
- T23–T29: bundles, evidencia, cobertura, identidades, grafo, caché, impacto, journal, coordinación y contexto acotado.
- T30–T36: ocho roles corregidos, perfiles aislados generables, skill `archify-documentation`, adaptador Copilot restringido, ASD-TSE-100, revisión y propuestas `review_required`.
- T37–T45: bóveda candidata Obsidian, aprobación humana por hash, ediciones inmutables, carpeta/ZIP, historial, consultas y comparación.
- T46–T50: demo sintética preparada, modo no interactivo, instrucciones de scheduler, Azure opt-in desactivado, plantilla de pipeline y release condicionada a evidencia.
- T51–T56: fixtures, catálogo de 128 aceptaciones y archivos de prueba preparados. Auditoría ejecutada, piloto y cierre por evidencia continúan pendientes.
- Escenario multirrepositorio: un run puede capturar varios repositorios y construir un solo grafo sin leer rutas no configuradas.
- Relaciones y flujos: comandos `relacion` y `flujo`, resolución de nodos, búsqueda dirigida, estados `supported/candidate/unresolved` y limitaciones conservadas.
- Comparación: comando `comparar` entre dos runs, con altas, bajas, modificaciones y ausencias desconocidas si la entrada es parcial.
- Propuestas: comando `proponer` para `specification`, `migration` y `adr`; genera JSON y Markdown y nunca modifica aplicaciones.
- MCP bajo demanda: `src/mcp.ts` y `scripts/mcp.mjs` exponen estado, repositorios, análisis explícito, relaciones, flujos, consultas y propuestas. No exponen aprobación ni publicación.
- Integración Copilot: `pnpm copilot:config ide` y `pnpm copilot:config cli` imprimen los formatos locales correctos para cada cliente; `.github/agents/orquestador.agent.md` solo permite herramientas `docsys_*`; los especialistas internos siguen con `tools: []`.
- Menú ampliado con análisis individual/múltiple, relaciones, flujos, propuestas, consultas, revisión, Obsidian y configuración.
- Guía actualizada en `docs/GUIA-DE-USO-DETALLADA.md` para workspace, uso diario, multi-repo, migraciones y Copilot CLI/VS Code/IntelliJ.
- Limpieza autorizada: se retiraron del árbol activo configuraciones, utilidades, resultados, placeholders, esquemas y workspace heredados sin uso. Sus originales quedan solo en el respaldo privado T01.
- `knowledge.yaml` sigue siendo la única autoridad activa, con `setup_status: configuration_pending`, sin workspace ni repositorios.

## Dependencias instaladas

- Node.js 24.21.0 x64 mediante NVM.
- pnpm 10.0.0 como gestor preferido; npm sigue soportado por `npm start` y el lockfile de release.
- `@modelcontextprotocol/server` 2.0.0 y `zod` 4.6.5 para el conector local.
- Dependencias instaladas con scripts de paquetes desactivados. No se ejecutaron hooks ni analizadores.

## Comprobaciones de tipos y compilaciones realizadas

- `node scripts/typecheck.mjs`: completado sin errores después de los cambios multirrepositorio, CLI, perfiles y MCP. Solo ejecuta `tsc --noEmit`.
- `node scripts/build.mjs`: completado sin errores después de esos cambios. Solo transpila y copia recursos autorizados.
- `node --check` sobre `scripts/print-mcp-config.mjs`, `scripts/mcp.mjs` y `scripts/test.mjs`: sintaxis correcta; no se ejecutó su lógica.
- `dist/cli.js`, `dist/engine.js`, `dist/mcp.js` y `dist/run_services.js` quedaron generados.
- No se importó ni ejecutó el CLI compilado, el servidor MCP ni el sistema para comprobar runtime.

## Pruebas escritas y pendientes

- Todas las aceptaciones P01–P112 y N01–N16 continúan pendientes.
- Se agregaron pruebas sin ejecutar para caminos multirrepositorio, destinos no resueltos, filtros de relaciones y superficie MCP sin aprobar/publicar.
- No se ejecutaron pruebas unitarias, integración, extremo a extremo, demo, análisis piloto, benchmarks, Obsidian ni llamadas a Copilot.
- No se activaron pipelines, tareas programadas, publicación, Azure Repo ni agentes del sistema.
- La compilación no acredita exactitud de extractores, carga WASM, funcionamiento de lanzadores, clientes MCP ni criterios de aceptación.

## Bloqueos reales

- El workspace de aplicaciones no fue proporcionado intencionalmente. El estado visible es **Configuración pendiente**. Esto no bloqueó el desarrollo y sí impide cualquier análisis automático.
- Falta `SISTEMA-DOCUMENTACION-V4-NODE/03-QUE-NECESITO-DE-TI.md` en el paquete disponible.
- El comportamiento runtime de Copilot CLI, VS Code, IntelliJ, Obsidian, Azure y la matriz Windows/Linux/macOS necesita autorización y entornos posteriores.
- T50 no puede producir una release declarada aprobada: `scripts/release.mjs` exige evidencia de pruebas autorizadas.
- T54–T56 necesitan el workspace real, el piloto y resultados observados.

## Lista exacta para terminar y probar

1. Recibir el `.code-workspace` real del usuario.
2. Ejecutar el asistente y confirmar uno por uno los repositorios, ramas, alias y bóveda.
3. Recibir autorización expresa para pruebas.
4. Ejecutar la suite P01–P112, N01–N16 y las pruebas nuevas; registrar resultados reales.
5. Ejecutar la demo sintética autorizada.
6. Probar un run individual y uno multirrepositorio sobre el workspace autorizado.
7. Verificar relaciones, flujo, comparación, propuesta y revisión ASD-TSE-100.
8. Abrir la bóveda candidata en Obsidian y revisarla manualmente.
9. Configurar y probar MCP en los clientes elegidos; cualquier llamada real a Copilot requiere autorización específica.
10. Verificar lanzadores y compatibilidad en los sistemas disponibles.
11. Probar publicación y rollback con aprobación humana.
12. Activar Azure o tareas programadas solo si el usuario las elige expresamente.
13. Ejecutar la auditoría final y generar la release aprobada.

## Estado de entrega

**Implementación preparada; pendiente de pruebas.**
