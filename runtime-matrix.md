# Matriz de runtime

## Versiones fijadas

| Componente | Versión | Estado |
|---|---:|---|
| Node.js | 24.21.0 x64 | Instalado con NVM en el equipo de desarrollo; pruebas pendientes |
| npm | 11.19.0 | Incluido con Node 24.21.0; pruebas de arranque pendientes |
| pnpm | 10.0.0 | Gestor preferido y versión fijada; pruebas de arranque pendientes |
| TypeScript | 7.0.2 | Fijado; typecheck y compilación completados, pruebas pendientes |
| web-tree-sitter | 0.27.0 | Fijado; carga real pendiente de pruebas |
| Ajv | 8.20.0 | Fijado; pruebas pendientes |
| Copilot CLI | No comprobado | Prohibido probar hasta autorización |

## Plataformas objetivo

Windows x64, Linux x64 y macOS (Apple Silicon/Intel según disponibilidad). Ninguna plataforma se marca validada: la instrucción vigente prohíbe ejecutar pruebas. Node 24.21.0 fue instalado en Windows mediante NVM únicamente para instalar dependencias, comprobar tipos y compilar.

## Instalación reproducible

Desarrollo preferido: `pnpm install --frozen-lockfile --ignore-scripts`. La release mantiene compatibilidad con `npm ci --omit=dev --ignore-scripts --no-audit --no-fund`. Ninguna instalación se ejecuta dentro de repositorios de aplicaciones.
