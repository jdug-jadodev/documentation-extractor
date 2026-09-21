# Instalación y uso preparados

## Desarrollo

1. Seleccionar Node con `nvm use 24.21.0`.
2. Instalar con `pnpm install --frozen-lockfile --ignore-scripts`.
3. `pnpm run typecheck` comprueba fuentes y pruebas sin ejecutarlas.
4. `pnpm run build` produce `dist/` sin ejecutar aplicaciones ni pruebas.

Mientras siga la restricción actual, no usar `pnpm test`, `npm test`, `npm run docs -- demo`, `npm start` ni `pnpm mcp`.

## Uso cuando se autorice

1. Iniciar con `npm start`, `INICIAR.cmd` o `./iniciar`.
2. Elegir **Configurar** y seleccionar el `.code-workspace` proporcionado por el usuario.
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

## Pruebas futuras

Cuando el usuario entregue el workspace y autorice pruebas se ejecutarán por separado la suite, demo, piloto, Obsidian, clientes MCP, matrices de sistema operativo y, solo con permiso específico, llamadas reales a Copilot. Azure se probará únicamente si se activa expresamente.
