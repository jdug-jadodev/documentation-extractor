# Sistema de documentación V4 — Node.js + TypeScript

Motor local y determinista que extrae hechos de repositorios autorizados, correlaciona varios servicios y prepara documentación ASD-TSE-100 para revisión y publicación en Obsidian.

## Estado

El motor está implementado en `src/`. Las pruebas P01–P112 y N01–N16, además de las pruebas nuevas de escenario multirrepositorio y MCP, están escritas pero no se han ejecutado por instrucción del usuario. Tampoco se han ejecutado la demo, el sistema, un análisis, Copilot, Obsidian ni Azure.

El workspace de aplicaciones no ha sido proporcionado. `knowledge.yaml` conserva `setup_status: configuration_pending`, `workspace_file: null` y `repositories: []`. En este estado ninguna entrada inicia análisis automáticos.

## Requisitos

- Node.js 24.x mediante NVM; versión de desarrollo: 24.21.0.
- pnpm 10.x como gestor preferido; `npm start` sigue siendo la entrada sencilla.
- Git para leer commits y ramas sin checkout.
- Obsidian para revisar la documentación.
- Copilot opcional; no se necesita para inventario, extracción, grafo, consultas ni publicación.

No se necesita ejecutar Python, .NET, Java, Maven, Gradle, npm de las aplicaciones ni Docker.

## Instalación y arranque

```powershell
nvm use 24.21.0
pnpm install --frozen-lockfile --ignore-scripts
npm start
```

También existen `INICIAR.cmd` para Windows y `./iniciar` para Linux/macOS. Cargan `dist/`; no compilan ni prueban al arrancar.

## Operaciones

```text
npm run docs -- configurar
npm run docs -- verificar
npm run docs -- actualizar --repo <id> --rama <ref> --sin-ia --sin-publicar
npm run docs -- actualizar --repos <id-a,id-b> --ramas <id-a=ref,id-b=ref> --sin-ia --sin-publicar
npm run docs -- actualizar --repo <id> --rama <ref> --incluir-cambios-locales --rutas <archivo-a,archivo-b> --sin-ia --sin-publicar
npm run docs -- relacion --run <id> --desde <componente> --hasta <componente>
npm run docs -- flujo --run <id> --desde <componente> --hasta <componente>
npm run docs -- comparar --base <run-base> --run <run-objetivo> --repo <id>
npm run docs -- proponer --run <id> --tipo <specification|migration|adr> --solicitud <texto>
npm run docs -- consultar endpoints --run <id> --repo <id>
npm run docs -- revisar --run <id>
npm run docs -- aprobar --run <id>
npm run docs -- publicar --run <id>
npm run docs -- compartir --edicion <id> --destino <ruta-o-zip>
npm run docs -- verificar-edicion --ruta <carpeta>
npm run docs -- restaurar --edicion <id>
npm run docs -- migrar --origen <manifiesto-heredado> --dry-run
npm run docs -- migrar --origen <manifiesto-heredado> --aplicar
npm run docs -- revertir-migracion --recibo <receipt.json>
```

`--json` reserva stdout para la respuesta. `--no-interactivo` nunca concede aprobaciones. `demo` existe, pero permanece sin ejecutar hasta autorización expresa.

## Copilot bajo demanda

```powershell
pnpm copilot:config ide
pnpm copilot:config cli
pnpm mcp
```

`copilot:config ide` imprime el formato `servers` para VS Code/IntelliJ; `copilot:config cli` imprime `mcpServers` para Copilot CLI. Esos clientes inician `mcp` por `stdio` cuando lo necesitan; no es un daemon permanente. El conector ofrece estado, lista de repositorios, análisis explícito, relaciones, flujos, consultas y propuestas. No ofrece aprobación ni publicación.

La carpeta `.github` permanece en este proyecto. No se copia a las aplicaciones. El perfil de entrada puede instalarse opcionalmente como agente personal; el motor conserva internamente los ocho roles y la skill `archify-documentation`.

## Arquitectura

- `src/contracts/` y `schemas/v3/`: contratos runtime y tipos estrictos.
- `src/snapshots/`: ramas y commits con Git, sin checkout.
- `src/discovery/` y `src/extractors/`: inventario y plugins .NET, Spring, JEE/WebLogic, Angular, React y Python.
- `assets/grammars/`: gramáticas WASM locales con hashes y licencias.
- `src/correlation/`, `src/engine.ts` y `src/run_services.ts`: escenarios, grafo, relaciones, flujos, comparación y propuestas.
- `src/mcp.ts`: conexión local de Copilot.
- `src/ai/`: perfiles aislados, presupuesto, JSONL y adaptador Copilot.
- `src/documentation/`, `src/review/`, `src/obsidian/`: ASD-TSE-100, validación y bóveda candidata.
- `src/publication/`: aprobación por hash y ediciones inmutables.
- `.knowledge/`: runs, caché, candidatos y respaldo privado; nunca se publica.

## Seguridad

- Solo se leen repositorios habilitados que pertenecen al workspace configurado.
- No se hace clone, pull, checkout, build, import, `eval` ni instalación en aplicaciones.
- La publicación exige un recibo humano vigente.
- Azure permanece desactivado y es opcional.
- Los especialistas interpretativos se generan con `tools: []`; el agente MCP de entrada solo ve `docsys_*`.

Consulta la [guía detallada](docs/GUIA-DE-USO-DETALLADA.md), el [progreso](docs/implementacion/progreso.md) y los [pendientes exactos](docs/implementacion/pendientes.md).
