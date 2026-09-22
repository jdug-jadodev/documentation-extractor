# Prompts de prueba para GitHub Copilot

Estos prompts prueban el sistema desde GitHub Copilot usando exclusivamente las herramientas `docsys_*` del servidor MCP `sistema-documentacion`.

## Orden recomendado

1. Abrir una conversación nueva.
2. Seleccionar el agente `docsys-orchestrator-entry`.
3. Ejecutar [01-prueba-completa-desde-cero.md](01-prueba-completa-desde-cero.md).
4. Probar profundidad con [02-documentacion-profunda-estraviado.md](02-documentacion-profunda-estraviado.md).
5. Probar un recorrido concreto con [03-flujo-registro-estraviado-login.md](03-flujo-registro-estraviado-login.md).
6. Comprobar el estado real de Archify con [04-prueba-archify.md](04-prueba-archify.md).
7. Evaluar una decisión de desarrollo o migración con los prompts 05 y 06.
8. Comparar calidad con [07-comparacion-calidad.md](07-comparacion-calidad.md).

La documentación factual generada por MCP se valida y publica automáticamente en `Actual`. Las ADR, especificaciones y migraciones siguen siendo propuestas, no decisiones adoptadas.
