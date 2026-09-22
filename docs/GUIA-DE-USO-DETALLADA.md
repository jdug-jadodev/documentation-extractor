# Guía detallada de uso

## 1. La idea en palabras sencillas

El sistema de documentación es una cocina separada de las aplicaciones:

- Los repositorios son los ingredientes.
- El `.code-workspace` es la lista de ingredientes permitidos.
- `knowledge.yaml` indica cuáles de esos ingredientes están habilitados.
- Los extractores son los utensilios que leen código sin ejecutarlo.
- Los ocho roles son las responsabilidades de la cocina.
- `archify-documentation` es la receta ASD-TSE-100.
- Obsidian es donde se revisa y presenta el resultado.
- Copilot puede hablar con la cocina mediante un conector MCP local.

No es un daemon permanente. Se inicia cuando el menú, la CLI o Copilot solicita una operación y termina al concluirla.

## 2. Qué se queda en cada lugar

```text
C:\Herramientas\documentation-extractor\   <- motor descargado de Azure
C:\Workspaces\equipo\equipo.code-workspace <- lista de repositorios
C:\Workspaces\equipo\knowledge.yaml        <- autorización de este workspace
C:\Workspaces\equipo\.vscode\mcp.json     <- conexión MCP
C:\Workspaces\equipo\.mcp.json             <- conexión MCP portátil/CLI
C:\Workspaces\equipo\.github\             <- agente, instrucciones y skill
C:\Proyectos\frontend\                     <- aplicación
C:\Proyectos\pedidos-api\                  <- aplicación
C:\Proyectos\pagos-api\                    <- aplicación
C:\Documentacion\Boveda-Obsidian\          <- documentación publicada
```

El motor, los ocho roles internos, los parsers, `dist` y los runs privados se quedan dentro de `documentation-extractor`. En la carpeta contenedora del workspace se instalan únicamente `.vscode/mcp.json`, `knowledge.yaml` y los archivos `.github` necesarios para que Copilot descubra el agente y la skill. No se escribe dentro de los repositorios de aplicaciones.

El workspace contiene una carpeta de control y las aplicaciones. La carpeta de control permite descubrir `.github` y MCP, pero no se incluye entre los repositorios autorizados:

```json
{
  "folders": [
    { "name": "documentacion-workspace", "path": "." },
    { "name": "frontend", "path": "C:\\Proyectos\\frontend" },
    { "name": "pedidos-api", "path": "C:\\Proyectos\\pedidos-api" },
    { "name": "pagos-api", "path": "C:\\Proyectos\\pagos-api" }
  ]
}
```

Una carpeta incluida en el workspace no queda habilitada automáticamente. También debe autorizarse durante la configuración.

## 3. Preparación inicial

### Crear el workspace

En VS Code:

1. Abrir **Archivo → Agregar carpeta al área de trabajo**.
2. Agregar cada repositorio de aplicación.
3. No agregar `documentation-extractor`.
4. Guardar el workspace, por ejemplo en `C:\Workspaces\equipo.code-workspace`.

Con IntelliJ se puede crear manualmente el mismo JSON. IntelliJ no necesita abrirlo; el motor lo usa como lista de raíces permitidas.

### Preparar Obsidian

1. Crear una carpeta separada, por ejemplo `C:\Documentacion\Boveda-Obsidian`.
2. Abrirla como bóveda en Obsidian.
3. No instalar plugins obligatorios.

### Instalar la integración en el workspace

Desde la carpeta del motor:

```powershell
pnpm workspace:install -- --workspace C:\Workspaces\equipo\equipo.code-workspace --vault C:\Documentacion\Boveda-Obsidian --repository-ids frontend,pedidos-api,pagos-api --branch main
```

Este comando no copia el motor ni analiza repositorios. Genera la configuración, añade la carpeta de control como primera raíz si falta y deja el estado privado apuntando a la instalación del motor. Ejecutarlo nuevamente con los mismos argumentos es idempotente.

### Iniciar manualmente

Windows:

```powershell
cd C:\Herramientas\documentation-extractor
nvm use 24.21.0
npm start
```

También se puede usar `INICIAR.cmd`. En Linux/macOS se usa `./iniciar`.

Mientras no se haya proporcionado y configurado el workspace, el sistema muestra **Configuración pendiente** y no inicia ningún análisis.

## 4. Configurar el workspace

El instalador anterior deja el workspace configurado. Alternativamente, en el menú se puede seleccionar **Configurar** e indicar:

1. Ruta del `.code-workspace`.
2. ID estable de cada repositorio.
3. Si cada repositorio queda habilitado.
4. Rama principal real, como `main` o `master`.
5. Ruta de la bóveda de Obsidian.
6. Copilot opcional; puede dejarse sin modelo.
7. Confirmación final.

Para agregar o quitar repositorios, se cambia primero el `.code-workspace` y luego se repite **Configurar**. Un repositorio puede permanecer en el workspace con `enabled: false`.

## 5. Menú principal

```text
1. Analizar un repositorio
2. Analizar varios repositorios
3. Explicar una relación
4. Trazar un flujo
5. Preparar propuesta
6. Consultar hechos
7. Preparar revisión
8. Abrir Obsidian
9. Configurar
0. Salir
```

Nada se analiza al abrir el menú. El usuario elige y confirma la operación.

## 6. Analizar uno o varios repositorios

Un repositorio:

```powershell
npm run docs -- actualizar --repo pedidos-api --rama main --sin-ia --sin-publicar
```

Varios repositorios en un mismo escenario:

```powershell
npm run docs -- actualizar --repos frontend,pedidos-api,pagos-api --ramas frontend=main,pedidos-api=main,pagos-api=main --sin-ia --sin-publicar
```

El sistema crea un `run-id`. Ese run contiene las capturas exactas, hechos, evidencias y el grafo común. No hace checkout, `pull`, build ni instala dependencias de las aplicaciones.

Para revisar archivos locales todavía no confirmados, la selección debe ser explícita y se hace para un solo repositorio:

```powershell
npm run docs -- actualizar --repo pedidos-api --rama main --incluir-cambios-locales --rutas src/api.ts,src/model.ts --sin-ia --sin-publicar
```

Esa captura queda marcada `dirty` y `working_tree`. Excluye rutas de dependencias/build y nombres sensibles; si un archivo cambia durante la captura se reintenta una vez y luego se bloquea. Puede revisarse localmente, pero no compartirse por carpeta o ZIP. Para compartirla se necesita un commit y un run nuevo.

## 7. Consultar hechos

```powershell
npm run docs -- consultar endpoints --run <run-id> --repo pedidos-api
npm run docs -- consultar messages --run <run-id>
npm run docs -- consultar data --run <run-id>
```

Categorías: `endpoints`, `dependencies`, `messages`, `data`, `coverage` y `evidence`. Omitir `--repo` consulta todos los repositorios del run.

## 8. Explicar cómo se comunican dos servicios

Primero se prepara un run que incluya ambos repositorios. Después:

```powershell
npm run docs -- relacion --run <run-id> --desde pedidos-api --hasta pagos-api
```

El resultado puede ser:

- `supported`: el camino está respaldado por los hechos.
- `candidate`: existe una relación probable con alguna identidad o ambiente pendiente.
- `unresolved`: no se encontró un camino suficiente.

El sistema no inventa el receptor cuando solo encuentra un cliente HTTP o una configuración externa.

Si una URL no contiene un nombre que identifique de forma inequívoca al repositorio receptor, se puede aprobar un alias en `knowledge.yaml`:

```yaml
overrides:
  aliases:
    "https://pagos.interno": "pagos-api"
```

El alias convierte esa base URL en la identidad `pagos-api`; no inventa endpoints ni contratos.

## 9. Trazar un flujo de extremo a extremo

```powershell
npm run docs -- flujo --run <run-id> --desde frontend --hasta pagos-api
```

El motor busca caminos dirigidos en el grafo y devuelve, en orden, los nodos y relaciones encontrados. HTTP, mensajería, datos y dependencias conservan su estado y evidencia. Un salto no demostrado queda como limitación, no como hecho.

## 10. Comparar dos ramas o momentos

Cada rama se captura en un run separado:

```powershell
npm run docs -- actualizar --repo pedidos-api --rama main --sin-ia --sin-publicar
npm run docs -- actualizar --repo pedidos-api --rama feature/nuevo-flujo --sin-ia --sin-publicar
npm run docs -- comparar --base <run-main> --run <run-feature> --repo pedidos-api
```

La comparación informa hechos agregados, eliminados, modificados y cambios desconocidos cuando una captura es parcial.

## 11. Preparar una migración o especificación

Hacia un microservicio existente:

```powershell
npm run docs -- proponer --run <run-core-y-destino> --tipo migration --solicitud "Mover facturación desde core hacia facturacion-api sin modificar aplicaciones"
```

Hacia un servicio que aún no existe:

```powershell
npm run docs -- proponer --run <run-core> --tipo migration --solicitud "Separar facturación en un servicio nuevo; no inventar tecnología, infraestructura ni propietarios"
```

Otros tipos:

```powershell
npm run docs -- proponer --run <run-id> --tipo specification --solicitud "Especificar el nuevo contrato de consulta"
npm run docs -- proponer --run <run-id> --tipo adr --solicitud "Evaluar separar el módulo de pagos"
```

El borrador incluye estado observado, componentes afectados, contratos, fases, riesgos, pruebas previstas, rollback, alternativas y decisiones pendientes. Siempre queda como `review_required`. No modifica repositorios.

## 12. Revisar, aprobar y publicar en Obsidian

```powershell
npm run docs -- revisar --run <run-id>
npm run docs -- aprobar --run <run-id>
npm run docs -- publicar --run <run-id>
```

- `revisar` prepara una bóveda candidata ASD-TSE-100.
- `aprobar` exige confirmación humana y fija hashes.
- `publicar` solo acepta ese recibo vigente y crea una edición inmutable.
- **Abrir Obsidian** abre la bóveda configurada.

## 13. Conectar GitHub Copilot

La conexión es local por MCP `stdio`: Copilot inicia `scripts/mcp.mjs` como proceso hijo bajo demanda. No hay puerto, servidor web ni daemon permanente.

Generar la configuración exacta para esta instalación:

```powershell
pnpm copilot:config ide -- --config C:\Workspaces\equipo\knowledge.yaml
pnpm copilot:config cli -- --config C:\Workspaces\equipo\knowledge.yaml
```

El primer comando imprime el formato `servers` usado por VS Code/JetBrains. El segundo imprime el formato `mcpServers`, con `tools`, usado por Copilot CLI. No son intercambiables. El formato de IDE es similar a este:

```json
{
  "servers": {
    "sistema-documentacion": {
      "type": "stdio",
      "command": "C:\\ruta\\a\\node.exe",
      "args": [
        "C:\\Herramientas\\documentation-extractor\\scripts\\mcp.mjs",
        "--config",
        "C:\\Workspaces\\equipo\\knowledge.yaml"
      ]
    }
  }
}
```

### VS Code

1. Abrir el archivo `.code-workspace` desde su carpeta contenedora.
2. VS Code detecta `.vscode/mcp.json`; confirmar el inicio del servidor `sistema-documentacion` cuando lo solicite.
3. Iniciar el servidor desde la vista MCP cuando se quiera usar.
4. En Copilot Chat pedir primero: `Consulta el estado de sistema-documentacion`.

El archivo se encuentra junto al `.code-workspace`, no dentro de ninguna aplicación.

### Copilot CLI

1. Abrir Copilot CLI desde la carpeta de control; el instalador deja allí `.mcp.json`. Como alternativa personal, usar `pnpm copilot:config cli -- --config <ruta-a-knowledge.yaml>` y agregar la salida a `~/.copilot/mcp-config.json`.
2. Confiar explícitamente en la carpeta/configuración cuando el cliente lo solicite.
3. Comprobar que aparecen las herramientas `docsys_*`.
4. Pedir una operación concreta, por ejemplo: `Analiza pedidos-api y pagos-api en main, sin publicar`.

### IntelliJ

1. Abrir la configuración de GitHub Copilot y su sección de servidores MCP.
2. Crear un servidor local `stdio` llamado `sistema-documentacion`.
3. Copiar `command` y `args` del JSON generado.
4. Usar Copilot Chat desde el proyecto abierto.

Los nombres exactos de los menús pueden cambiar entre versiones del plugin, pero los valores del proceso son los mismos.

### Agente conversacional opcional

El instalador coloca `.github/agents/orquestador.agent.md`, las instrucciones y `archify-documentation` junto al `.code-workspace`. Copilot descubre allí la entrada conversacional, que está limitada a las herramientas `docsys_*`. Los archivos no se copian dentro de las aplicaciones.

El motor, no Copilot, decide qué responsabilidades internas intervienen. Los especialistas interpretativos se generan en un runtime aislado con `tools: []`; Inventariador y Publicador son código. La skill `archify-documentation` se conserva dentro del sistema y se empaqueta en ese runtime cuando se generan perfiles. Por eso las aplicaciones no necesitan saber qué skill o agente elegir.

Herramientas MCP disponibles:

- `docsys_status`: estado, sin analizar.
- `docsys_list_repositories`: repositorios configurados.
- `docsys_prepare_analysis`: run de uno o varios repositorios, solo por solicitud expresa.
- `docsys_explain_relation`: relaciones de un run.
- `docsys_trace_flow`: camino entre componentes.
- `docsys_query`: hechos ya extraídos.
- `docsys_prepare_proposal`: borrador pendiente de revisión.

No existen herramientas MCP para aprobar ni publicar. Esas acciones siguen siendo humanas desde el sistema.

## 14. Ejemplos de conversación

```text
Consulta el estado. No analices nada.
```

```text
Analiza solamente pedidos-api en main. No publiques.
```

```text
Prepara un run con pedidos-api y pagos-api en main y explica cómo se comunican.
```

```text
Usa el run <id> y traza el flujo desde frontend hasta pagos-api. Marca los saltos no resueltos.
```

```text
Usa el run <id> y prepara un plan para extraer facturación de core hacia un servicio nuevo. No inventes infraestructura y no modifiques aplicaciones.
```

## 15. Lo que sigue pendiente antes de usarlo como validado

- Completar la campaña exhaustiva P01–P112/N01–N16; la suite disponible pasa 34/34.
- Autorizar la demo sintética si se desea ejecutarla.
- Verificar VS Code, Copilot CLI e IntelliJ con sus versiones instaladas.
- Autorizar cualquier llamada real a Copilot.
- Revisar Obsidian manualmente.
- Verificar Windows, Linux y macOS.
- Activar Azure solamente si se decide usarlo.

Estado actual: **motor y MCP probados en Windows; validación completa pendiente**.
