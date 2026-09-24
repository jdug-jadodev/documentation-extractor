# Progreso de implementación

Última actualización: 2026-09-23

Este registro separa código implementado, compilaciones, pruebas realizadas, pruebas pendientes y bloqueos reales. Una prueba automatizada superada no marca por sí sola todos los criterios P/N como aprobados.

## Código implementado

- Plan de arquitectura/WebFlux ejecutado: árbol físico exhaustivo en `diagramas/estructura.md`, Mermaid `flowchart TB`, nodos por archivo/clase, capas, roles, imports e inyecciones; vistas adicionales `modulos.md`, `capas.md` y `routers.md`.
- Spring anotado compone prefijos de clase y método, soporta anotaciones dentro de parámetros, enlaza cada endpoint con su handler y ya no publica el `@RequestMapping` de clase como endpoint independiente.
- Nuevo extractor `java-webflux`: `RouterFunction`, builders, `RouterFunctions.route`, `path`, `nest`, constantes, concatenaciones, referencias de método, lambdas inline, predicados, filtros y orden de declaración.
- Reactor conserva contenedor, payload, cardinalidad, operadores, estrategias de vacío/error, concurrencia, entrada `bodyToMono/bodyToFlux`, SSE y riesgos de suscripción manual. WebClient se registra como integración reactiva.
- La arquitectura distingue `main`/`test`, módulos Gradle, puertos `in/out`, `infrastructure`/`infraestructure`, routers, handlers, gateways, Lombok `@RequiredArgsConstructor`, herencia e implementaciones. Los tests permanecen en el árbol pero no se publican como endpoints operativos.
- Se corrigió el run multirrepositorio para no introducir caracteres nulos en rutas y se eliminaron expansiones masivas de arrays que desbordaban la pila al documentar más de 124.000 hechos.

- Motor único Node.js + TypeScript, contratos v3, snapshots Git sin checkout, ocho roles, plantilla ASD-TSE-100, Obsidian obligatorio, Azure opcional, CLI y MCP bajo demanda.
- Extractor transversal AST real para JavaScript, TypeScript, TSX y Java: módulos, clases, interfaces, funciones, constructores, métodos tradicionales y flecha, parámetros tipados, receptores, llamadas, líneas, fragmentos breves, imports y composición. La regla `source.symbol: 4` y el plugin `source-architecture: 2.1.0` invalidan correctamente las extracciones anteriores.
- El grafo interno conserva `caller_symbol_id`, receptor, clase/método destino y estado de resolución; construcciones, puntos de inyección y bindings de implementación se registran como hechos separados. Después de una actualización incremental se vuelve a resolver el grafo sobre hechos nuevos y reutilizados sin releer todo el repositorio.
- Extractor Express ampliado: rutas, montajes, método, fragmento, ruta compuesta y expresión del handler. La composición se mantiene por componente para no mezclar servicios con rutas iguales.
- Documentación por servicio con índices y páginas navegables bajo `clases/` y `metodos/`, incluyendo firma, responsabilidad derivada, archivo, líneas, llamadores, llamadas, fragmento breve y evidencia.
- `Flujos/end-to-end.md` enlaza entradas HTTP, pantallas detectadas y llamadas salientes. Cada flujo de entrada usa el subgrafo AST para mostrar clases, métodos, datos, integraciones, fragmentos y Mermaid; los nodos no resueltos quedan explícitos.
- Cada servicio tiene `diagramas/arquitectura.md`; `Mapas/microservicios.md` muestra consumidores, llamadas, destinos, estados, evidencias y limitaciones; `Mapas/relaciones.md` queda reservado para la arquitectura general compatible con `archify-documentation`.
- Cada repositorio se representa como un límite independiente. Los mapas separan aplicaciones cliente, microservicios/APIs y otros sistemas; una arista expresa consumo, no propiedad. `overrides.repository_metadata` permite fijar tipo, etiqueta y dominio sin alterar los hechos extraídos.
- Las conexiones conservan `supported`, `candidate` o `unresolved`. No se presenta la alcanzabilidad estática como tráfico ejecutado.
- Vista estable `Actual` en la bóveda y una sola edición canónica en `Publicaciones`. La edición anterior se elimina únicamente después de promover la nueva. El publicador intenta configurar el grafo para excluir `Publicaciones`, `Borradores` y `.staging`; Obsidian puede sobrescribir ese archivo si permanece abierto.
- `docsys_prepare_documentation` genera, valida mecánicamente y publica la edición factual final. Se retiraron del CLI los comandos de aprobación/publicación humana; ADR, especificación y migración siguen siendo propuestas.
- El publicador conserva hashes de la edición canónica e incorpora un fallback de copia para Windows cuando Obsidian bloquea el `rename` atómico de `Actual`.
- Once herramientas MCP `docsys_*`: se añadieron `docsys_explain_service` y `docsys_explain_endpoint`, que responden desde resúmenes y flujos precalculados sin devolver cientos de hechos a Copilot.
- `docsys_refresh_knowledge` sincroniza bajo demanda con `fetch` y `pull --ff-only`, rechaza ramas distintas, cambios locales o divergencias, compara commits y evita crear otro run cuando no cambió el contenido.
- La actualización incremental enumera el árbol nuevo, relee solo archivos agregados/modificados y dependientes por imports, elimina hechos ligados a rutas modificadas/eliminadas, reutiliza los hechos intactos y reconstruye el grafo completo. Los manifiestos o una base incompatible fuerzan extracción completa del repositorio afectado.
- La vista `Actual` se reemplaza completa y atómicamente; la edición anterior no participa en consultas ni en el grafo vigente. El run canónico queda registrado en `current-run.json`.
- La publicación mantiene `knowledge-catalog.json` por workspace. Un run parcial sustituye solo los repositorios que contiene, reutiliza el último run publicado de los demás y reconstruye la vista, los flujos y el grafo con el conjunto acumulado. Deshabilitar un repositorio no lo borra.
- El workspace recibe solo el agente de entrada, instrucciones, skill y configuración MCP. Los seis perfiles interpretativos se generan en el runtime privado con `tools: []`; Inventariador y Publicador son responsabilidades de código. No se copian ocho agentes con acceso directo a los repositorios.
- `workspace:install --integration-only --force` actualiza agente e integración MCP sin tocar `knowledge.yaml`; se aplicó al workspace real para exponer las once herramientas sin ejecutar análisis.

## Configuración real usada

- Motor: `C:\Users\Usuario\Documents\documentation-extractor`.
- Workspace: `C:\Users\Usuario\Documents\prueba-extractor\.code-workspace`.
- Configuración: `C:\Users\Usuario\Documents\prueba-extractor\knowledge.yaml`.
- Bóveda: `C:\Users\Usuario\Documents\prueba-obsidian`.
- Estado privado: `C:\Users\Usuario\Documents\documentation-extractor\.knowledge\workspaces\prueba-extractor`.
- Repositorios configurados actualmente: `backend-elevacion`, `estraviado`, `login-estraviado` y `template`; el run histórico descrito abajo contiene solo los tres primeros.

## Compilaciones realizadas

- Compatibilidad declarada Node.js 20.x–24.x mediante NVM y pnpm 10.x. Node 20.19.5, versión exacta del PC empresarial, y Node 24.21.0 fueron comprobados. Con Node 20.19.5 pasaron tipos, build, 46/46 pruebas y el smoke MCP sin reanálisis.
- `node scripts/typecheck.mjs`: completado sin errores después de la ampliación de extractores y documentación.
- `node scripts/build.mjs`: completado sin errores; `dist/` actualizado.
- Tras separar los límites de aplicaciones y microservicios, tipos y build volvieron a completarse con Node 20.19.5 sin errores.
- Dependencias instaladas con scripts de paquetes desactivados.

## Pruebas realizadas

- Suite actual: **52/52 superadas**, 0 fallos y 0 omitidas. Incluye regresión Express/TypeScript y nuevos fixtures Spring anotado, WebFlux funcional, lambdas, Reactor, Gradle, Lombok, source sets y diagramas verticales.
- Validación `template` (`main`, commit `9cd8acf3e5438d812a4d3145500b2e24bfe2f1ab`): 6 endpoints completos bajo `/user`, 329 hechos y handlers resueltos.
- Validación `gr` (`master`, commit `1ff19af62251be07dff4ad9d190ab8bc92b3f01b`): 124.931 hechos, 106 rutas WebFlux de producción, 0 rutas de tests, 947 pipelines Reactor, 2 SSE, 9 WebClient, 40 dependencias Gradle, 1.829 fuentes y 1.951 archivos documentables.
- La bóveda candidata de `gr` produjo árbol de 249.948 caracteres, Mermaid vertical de 80 archivos con aviso explícito de 1.749 omitidos y 9.203 archivos navegables. La publicación final se bloqueó por el detector de secretos; se conservó el candidato privado y no se desactivó la protección.

- Casos AST sintéticos superados para TypeScript —incluido método flecha, receptor, composición e inyección— y Java —clases, métodos, receptor e inyección de constructor—.
- La bóveda sintética verificó flujo endpoint → controlador → servicio → datos, Mermaid semántico, páginas/índices de código y fragmentos navegables.
- Las explicaciones compactas de servicio y endpoint se probaron contra hechos precalculados; no invocan IA ni reanalizan repositorios.
- La prueba acumulativa reproduce la publicación de un repositorio nuevo después de otro ya publicado y confirma que ambos permanecen en la bóveda candidata.
- La prueba de documentación comprueba que una aplicación cliente y un microservicio aparecen en grupos independientes, que las etiquetas configuradas se respetan y que los sistemas relacionados quedan fuera del límite interno del repositorio.
- Transporte MCP `stdio`: protocolo `2025-06-18`, servidor `sistema-documentacion` 4.0.0 y once herramientas declaradas. El smoke de solo lectura reconoció los cuatro repositorios configurados y confirmó `analysis_executed: false`.
- Pruebas de actualización con repositorios Git sintéticos: sincronización fast-forward, cambio de una sola clase, reproceso de un único archivo, reutilización del intacto, incorporación del método nuevo, no-op sin otro commit y rechazo de un árbol sucio.
- Prueba de publicación temporal: la segunda edición reemplazó `Actual` y eliminó de `Publicaciones` la edición anterior, dejando una sola canónica.
- Prueba MCP de documentación sobre el run vigente: no reanalizó, devolvió `published: true`, reutilizó la edición y apuntó a `Actual/Inicio.md`.
- Run vigente y único: `run-2026-09-22T17-13-48-082Z-scenario-backend-el`.
- Commits: `backend-elevacion` `56bb4626cec6bd406514d2719302cb90c17a5ab0`, `estraviado` `4a578fc2b42ff89db0292aace59a84ccc0be2b5e` y `login-estraviado` `c719eab48c4a0a29408cfc5de51c35ea1bca7e37`.
- Resultado: 1.877 hechos, 85 relaciones y 0 llamadas de IA; los tres bundles quedaron `partial`. Se extrajeron 28 métodos en `backend-elevacion`, 11 en `estraviado` y 56 en `login-estraviado`.
- Revisión mecánica del candidato: 0 incidencias.
- Edición publicada vigente: `2026-09-22T17-15-52-515Z-be7c633cf0`, 29 archivos de contenido, manifiesto completo y hashes verificados con `status: complete`.
- `Actual` contiene tres fichas, tres diagramas de servicio, ocho flujos de entrada, once flujos de salida, mapa de microservicios, mapa general e índice extremo a extremo.
- Durante la comprobación final Obsidian estaba abierto y volvió a dejar vacío el filtro de la vista gráfica. La consulta correcta es `-path:Publicaciones -path:Borradores -path:.staging`; debe aplicarse en la interfaz o publicarse con Obsidian cerrado.
- No se descargaron repositorios ni se ejecutaron, compilaron o modificaron aplicaciones.
- Limpieza solicitada el 2026-09-22: en el estado privado solo permanece `run-2026-09-22T17-13-48-082Z-scenario-backend-el`. La próxima publicación eliminará de `Publicaciones` cualquier edición anterior y conservará únicamente la nueva canónica.
- Se añadieron `prompts/` con siete pruebas reproducibles para Copilot y `ejemplo workspace/` con un workspace seguro en `configuration_pending`, configuración MCP, agente de entrada y skill Archify.

## Pruebas pendientes

- Regenerar el conocimiento y la bóveda reales con `docsys_refresh_knowledge` para que los runs anteriores incorporen los nuevos hechos AST, páginas por símbolo y flujos semánticos; esta implementación no reanalizó aplicaciones.
- Regenerar la bóveda real para confirmar visualmente que `estraviado` aparece como aplicación móvil independiente y que `backend-elevacion` y `login-estraviado` aparecen como microservicios independientes. El código y el ejemplo quedaron preparados, pero no se movieron ni reanalizaron los repositorios para esta corrección.
- Ejecutar la nueva sincronización incremental contra un cambio remoto real de los tres repositorios y revisar la sustitución completa de `Actual`; no se hizo para evitar mover sus ramas sin una solicitud expresa de ejecución.
- Confirmar en el propio PC empresarial la instalación y permisos de ejecución. La versión exacta 20.19.5 ya fue validada localmente; Node 20 está EOL y debe tratarse como restricción temporal de plataforma.
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
