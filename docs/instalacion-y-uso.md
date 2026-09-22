# Instalación y uso preparados

## Desarrollo

1. Seleccionar Node con `nvm use 24.21.0`.
2. Instalar con `pnpm install --frozen-lockfile --ignore-scripts`.
3. `pnpm run typecheck` comprueba fuentes y pruebas sin ejecutarlas.
4. `pnpm run build` produce `dist/` sin ejecutar aplicaciones ni pruebas.

Las pruebas del motor y del servidor MCP ya fueron autorizadas. La demo, Copilot real, publicación, Azure y ejecución de aplicaciones continúan requiriendo autorización específica.

## Uso cuando se autorice

1. Mantener el motor descargado en una carpeta propia; no agregarlo al workspace de aplicaciones.
2. Ejecutar `pnpm workspace:install -- --workspace <archivo.code-workspace> --vault <bóveda> --repository-ids <ids> --branch main`.
3. Confirmar individualmente repositorios y ramas; ninguno se habilita por herencia.
4. Elegir una bóveda Obsidian fuera de repositorios y del motor.
5. Configurar Copilot solo si se desea; la extracción determinista no lo necesita.
6. Preparar un run individual o multirrepositorio.
7. Consultar, relacionar, trazar, comparar o preparar una propuesta.
8. Revisar, aprobar humanamente y publicar cuando corresponda.

## Copilot local

- `pnpm copilot:config ide` imprime el JSON para VS Code/IntelliJ.
- `pnpm copilot:config cli` imprime el JSON para `~/.copilot/mcp-config.json`.
- El cliente inicia `pnpm mcp` por `stdio` bajo demanda; no queda un daemon.
- El conector no ofrece operaciones de aprobación o publicación.

## Estado de pruebas

La suite disponible pasa 34/34. El transporte MCP, sus siete herramientas y un run real de tres repositorios fueron comprobados en Windows sin IA ni publicación. Siguen pendientes la aceptación exhaustiva P01–P112/N01–N16, demo, Obsidian, clientes Copilot reales, Linux/macOS y, solo si se activa expresamente, Azure.
