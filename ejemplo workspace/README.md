# Ejemplo de workspace

Esta carpeta muestra cómo queda el workspace usado con el sistema de documentación. Es un ejemplo seguro: `knowledge.yaml` está en `configuration_pending` y las rutas deben reemplazarse antes de usarlo.

## Estructura

```text
ejemplo workspace/
├── prueba-extractor.code-workspace
├── knowledge.yaml
├── .mcp.json
├── .vscode/
│   └── mcp.json
└── .github/
    ├── copilot-instructions.md
    ├── agents/
    │   └── orquestador.agent.md
    └── skills/
        └── archify-documentation/
            └── SKILL.md
```

El workspace recibe solamente el agente de entrada. Los perfiles especializados permanecen dentro del servidor de documentación y reciben paquetes controlados del motor. Al solicitar documentación, el motor valida mecánicamente y publica la edición final en Obsidian; no existe un paso separado de aprobación humana.

## Correspondencia con la prueba local

| Elemento | Ruta utilizada en la prueba |
|---|---|
| Motor | `C:\Users\Usuario\Documents\documentation-extractor` |
| Workspace | `C:\Users\Usuario\Documents\prueba-extractor\.code-workspace` |
| Configuración | `C:\Users\Usuario\Documents\prueba-extractor\knowledge.yaml` |
| Bóveda | `C:\Users\Usuario\Documents\prueba-obsidian` |
| backend-elevacion | `C:\Users\Usuario\Documents\back-elevation` |
| estraviado | `D:\documents\estraviado` |
| login-estraviado | `D:\documents\mcp-server\Loggin-Mcp` |

## Crear un workspace real

No copie y edite todos los archivos a mano. Desde el motor ejecute:

```powershell
pnpm workspace:install -- --workspace C:\ruta\equipo.code-workspace --vault C:\ruta\boveda --repository-ids repo-a,repo-b --branch main
```

El instalador escribe rutas absolutas correctas para Node, el motor, el workspace y la bóveda.
