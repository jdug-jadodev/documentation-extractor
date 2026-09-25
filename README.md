# Sistema de documentación V4 — Node.js + TypeScript

Motor local y determinista que extrae hechos de repositorios autorizados, correlaciona varios servicios y publica documentación ASD-TSE-100 en Obsidian.

## Estado

El motor está implementado en `src/`. La suite automatizada disponible pasa 59/59 y el servidor MCP se probó por `stdio` sobre un workspace real. La extracción AST TypeScript/Java, Spring anotado, WebFlux funcional, Reactor, resolución de llamadas e inyección, actualización incremental, documentación sin tests, índice documental, compilación de contexto, análisis y propuestas trazables se comprobaron en Windows con fixtures y con el flujo real `GET /permisos-admin`. Los 128 criterios P01–P112/N01–N16 siguen catalogados individualmente hasta ejecutar la campaña completa de aceptación; tampoco se han probado de forma instrumentada Archify externo, Azure ni la matriz Linux/macOS.

La instalación del motor conserva su `knowledge.yaml` en `configuration_pending`. Cada workspace recibe su propia configuración e integración; los runs privados permanecen en el motor y la bóveda Obsidian es una tercera ubicación separada. Ninguna entrada inicia análisis automáticamente.

## Requisitos

- Node.js 20.x–24.x mediante NVM. Versión empresarial objetivo: 20.19.5; también comprobado con 24.21.0.
- pnpm 10.x como gestor preferido; `npm start` sigue siendo la entrada sencilla.
- Git para leer commits y ramas sin checkout.
- Obsidian para revisar la documentación.
- Copilot opcional; no se necesita para inventario, extracción, grafo, consultas ni publicación.

No se necesita ejecutar Python, .NET, Java, Maven, Gradle, npm de las aplicaciones ni Docker.

> Node 20 es compatible con el motor, pero Node.js lo declaró EOL el 24 de marzo de 2026. Si la empresa obliga a usarlo, conviene tratarlo como una excepción temporal gestionada y planificar Node 22/24 para recuperar actualizaciones oficiales de seguridad.

## Instalación y arranque

```powershell
nvm use 20.19.5
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
npm run docs -- sincronizar
npm run docs -- relacion --run <id> --desde <componente> --hasta <componente>
npm run docs -- flujo --run <id> --desde <componente> --hasta <componente>
npm run docs -- comparar --base <run-base> --run <run-objetivo> --repo <id>
npm run docs -- proponer --run <id> --tipo <specification|migration|adr> --solicitud <texto>
npm run docs -- consultar endpoints --run <id> --repo <id>
npm run docs -- revisar --run <id>
npm run docs -- documentar --run <id>
npm run docs -- compartir --edicion <id> --destino <ruta-o-zip>
npm run docs -- verificar-edicion --ruta <carpeta>
npm run docs -- restaurar --edicion <id>
npm run docs -- migrar --origen <manifiesto-heredado> --dry-run
npm run docs -- migrar --origen <manifiesto-heredado> --aplicar
npm run docs -- revertir-migracion --recibo <receipt.json>
```

`--json` reserva stdout para la respuesta. `documentar` valida mecánicamente y publica la edición final; no existe un paso de aprobación humana. `demo` solo se ejecuta cuando se solicita.

## Copilot bajo demanda

```powershell
pnpm copilot:config ide
pnpm copilot:config cli
pnpm mcp
```

`copilot:config ide` imprime el formato `servers` para VS Code/IntelliJ; `copilot:config cli` imprime `mcpServers` para Copilot CLI. Esos clientes inician `mcp` por `stdio` cuando lo necesitan; no es un daemon permanente. El conector ofrece 23 herramientas: además de documentar y consultar hechos, puede buscar documentación, compilar contexto acotado, localizar capacidades, analizar impacto o migraciones, investigar un flujo con límites y preparar propuestas sin recorrer repositorios completos.

Para preparar un workspace sin copiar el motor dentro de él:

```powershell
pnpm workspace:install -- --workspace C:\ruta\equipo.code-workspace --vault C:\ruta\boveda-obsidian --repository-ids repo-a,repo-b --branch main
```

Para actualizar solo el agente y la configuración MCP después de actualizar el motor, sin sobrescribir `knowledge.yaml`:

```powershell
pnpm workspace:install -- --workspace C:\ruta\equipo.code-workspace --integration-only --force
```

El instalador coloca en la carpeta contenedora del workspace únicamente `knowledge.yaml`, `.vscode/mcp.json` y los archivos `.github` de integración. También incorpora esa carpeta de control como primera raíz del workspace para que VS Code descubra una sola definición del servidor; no la autoriza como repositorio analizable ni escribe dentro de las aplicaciones. Si otro cliente necesita el formato portátil, se puede generar adicionalmente `.mcp.json` con `--portable-mcp`. El motor conserva sus ocho roles, parsers, binarios y estado privado.

## Arquitectura

- `src/contracts/` y `schemas/v3/`: contratos runtime y tipos estrictos.
- `src/snapshots/`: ramas y commits con Git, sin checkout.
- `src/discovery/` y `src/extractors/`: inventario y plugins .NET, Spring, JEE/WebLogic, Angular, React, Python y Node/Express; el extractor transversal AST registra clases, métodos, receptores, llamadas, composición, inyección, fragmentos, módulos, imports y tecnologías para TypeScript/JavaScript y Java.
- `assets/grammars/`: gramáticas WASM locales con hashes y licencias.
- `src/correlation/`, `src/engine.ts` y `src/run_services.ts`: escenarios, grafo, relaciones, flujos, comparación y propuestas.
- `src/intelligence/`: fragmentación e índices documentales, grafo lateral, capacidades, recuperación presupuestada, impacto, migraciones e investigación progresiva.
- `src/mcp.ts`: conexión local de Copilot.
- `src/ai/`: perfiles aislados, presupuesto, JSONL y adaptador Copilot.
- `src/documentation/`, `src/review/`, `src/obsidian/`: ASD-TSE-100, validación mecánica, Mermaid por servicio y flujo, y bóveda candidata privada.
- `src/publication/`: autorización automática ligada a hashes, reemplazo de `Actual` y retención de una sola edición canónica.
- `.knowledge/`: runs, caché, candidatos y respaldo privado; nunca se publica.

## Seguridad

- Solo se leen repositorios habilitados que pertenecen al workspace configurado.
- No se hace clone, pull, checkout, build, import, `eval` ni instalación en aplicaciones.
- La publicación es automática después de la validación mecánica y conserva hashes verificables.
- Azure permanece desactivado y es opcional.
- Los especialistas interpretativos se generan con `tools: []`; el agente MCP de entrada solo ve `docsys_*`.

Consulta la [guía detallada](docs/GUIA-DE-USO-DETALLADA.md), los [prompts para Copilot](prompts/README.md), el [workspace de ejemplo](ejemplo%20workspace/README.md), el [progreso](docs/implementacion/progreso.md) y los [pendientes exactos](docs/implementacion/pendientes.md).
