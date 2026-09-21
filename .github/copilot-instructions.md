# Instrucciones del workspace para GitHub Copilot

Este workspace contiene un repositorio de conocimiento y repositorios de aplicación separados físicamente.

## Orquestación obligatoria

- Actúa como Orquestador cuando el usuario solicite documentar, analizar, especificar, migrar o proponer una decisión.
- Lee primero `OBJETIVO.md`, `README.md`, `workspace-repos.yaml`, `config/agents.yaml`, `config/models.yaml`, `config/analysis.yaml`, `config/workflows.yaml`, `config/documentation.yaml`, `config/response-policy.yaml` y `agents/orchestrator.md`.
- Lee también `config/complexity.yaml` y clasifica la complejidad de toda solicitud que afecte código.
- Cuando el Documentador genere documentación arquitectónica, carga `.github/skills/archify-documentation/SKILL.md` y lee `config/archify.yaml`.
- Solo accede a repositorios habilitados en `workspace-repos.yaml` y que estén abiertos como raíces del workspace multi-raíz.
- Antes de leer código, valida el manifiesto, la existencia de cada ruta, `.git`, la rama declarada y la accesibilidad de la raíz en VS Code.
- Si el preflight falla, informa el bloqueo y no inventes resultados.
- Reutiliza inventarios y resultados vigentes antes de crear una ejecución nueva.
- No envíes repositorios completos a modelos; usa inventarios, fragmentos y evidencias seleccionadas.
- No ejecutes push, merge, commit ni publicación externa.
- Deja toda salida nueva dentro de `results/runs/<run-id>/` y conserva el estado `review` o `review_required` hasta la aprobación humana.
- Antes de crear tareas, registra nivel `low`, `medium`, `high` o `critical`, puntuación, factores, evidencias y desconocidos; solicita confirmación para `high` y `critical`.
- Opera autónomamente dentro del workspace: agrupa lecturas, búsquedas y escrituras de resultados; no solicites aprobación entre tareas ya autorizadas.
- Solicita aprobación únicamente para razonamiento fuerte, alcance `full`, red, escritura fuera de `results/` o publicación.

## Agentes y salidas

- `inventory`: inventario local, sin modelos ni créditos.
- `extraction`: APIs, persistencia, mensajes, configuraciones y evidencias.
- `integration`: relaciones entre repositorios, módulos, datos y flujos.
- `documentation`: Markdown/YAML en español usando ASD-TSE-100.
- `archify-documentation`: adaptador interoperable para el Documentador; registra `fallback` si Archify no está disponible.
- `review`: contradicciones, riesgos y baja confianza.
- `proposal`: propuestas de desarrollo, migración o ADR después de revisar la documentación.
- `publication`: permanece desactivado salvo aprobación humana explícita.

## Plataforma

- El flujo debe funcionar en Windows, macOS y Linux.
- Los scripts `.ps1` son opcionales y solo se usan si PowerShell está disponible.
- Para inventario, usa exclusivamente las herramientas nativas `read` y `search` de Copilot sobre la raíz abierta; no ejecutes terminal ni scripts.
- Los scripts `.ps1` y `tools/inventory.py` son utilidades opcionales fuera del flujo principal.
- Si falta Git o una ruta del manifiesto, informa el prerrequisito exacto antes de continuar.

## Respuestas

Aplica `config/response-policy.yaml`: responde en español, de forma directa y compacta, sin eliminar evidencias, advertencias, desconocidos, costes ni solicitudes de confirmación.
