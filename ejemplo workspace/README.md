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

Después de un commit, el agente de entrada usa `docsys_refresh_knowledge`: compara commits, hace `fetch` y `pull --ff-only`, procesa el diff y publica una vista `Actual` completa. Si no cambió ningún commit, no crea otro run. Los repositorios deben estar en la rama configurada y sin cambios locales.

`knowledge.yaml` incluye `overrides.repository_metadata` para declarar que `estraviado` es una aplicación móvil y que los otros dos repositorios son microservicios. Cada repositorio se dibuja como límite independiente; las flechas solo representan consumo. En una instalación empresarial puede añadirse `domain` a cada entrada con el dominio organizacional confirmado.

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
