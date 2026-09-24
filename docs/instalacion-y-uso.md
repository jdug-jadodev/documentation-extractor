# Instalación y uso preparados

## Desarrollo

1. Seleccionar Node con `nvm use 20.19.5` en el equipo empresarial. El motor admite Node 20.x–24.x.
2. Instalar con `pnpm install --frozen-lockfile --ignore-scripts`.
3. `pnpm run typecheck` comprueba fuentes y pruebas sin ejecutarlas.
4. `pnpm run build` produce `dist/` sin ejecutar aplicaciones ni pruebas.

Las pruebas del motor y del servidor MCP ya fueron autorizadas. La demo, Copilot real, publicación, Azure y ejecución de aplicaciones continúan requiriendo autorización específica.

## Uso cuando se autorice

1. Mantener el motor descargado en una carpeta propia; no agregarlo al workspace de aplicaciones.
2. Ejecutar `pnpm workspace:install -- --workspace <archivo.code-workspace> --vault <bóveda> --repository-ids <ids> --branch main`.
   Para actualizar únicamente `.github` y MCP en un workspace existente, usar `pnpm workspace:install -- --workspace <archivo.code-workspace> --integration-only --force`; este modo conserva `knowledge.yaml`.
3. Confirmar individualmente repositorios y ramas; ninguno se habilita por herencia.
4. Elegir una bóveda Obsidian fuera de repositorios y del motor.
5. Configurar Copilot solo si se desea; la extracción determinista no lo necesita.
6. Preparar un run individual o multirrepositorio.
7. Consultar, relacionar, trazar, comparar o preparar una propuesta.
8. Ejecutar `documentar`; el motor valida y publica automáticamente la edición final.

## Copilot local

- `pnpm copilot:config ide` imprime el JSON para VS Code/IntelliJ.
- `pnpm copilot:config cli` imprime el JSON para `~/.copilot/mcp-config.json`.
- El cliente inicia `pnpm mcp` por `stdio` bajo demanda; no queda un daemon.
- `docsys_prepare_documentation` genera y publica la documentación final; no existe aprobación humana intermedia.
- `docsys_refresh_knowledge` sincroniza las ramas configuradas con fast-forward, actualiza solo los archivos afectados y reemplaza la vista vigente en Obsidian.

## Estado de pruebas

La suite disponible pasa 52/52. El transporte MCP y sus once herramientas, AST TypeScript/Java, Spring anotado, WebFlux funcional, Reactor, resolución de llamadas e inyección, árbol físico, sincronización incremental sobre Git sintético y Mermaid vertical fueron comprobados en Windows. Sigue pendiente la aceptación exhaustiva P01–P112/N01–N16, especialistas instrumentados, Archify externo, Linux/macOS y, solo si se activa expresamente, Azure.
