# Prompts básicos

Estas plantillas sirven para cualquier repositorio configurado en el workspace.
Reemplaza los valores entre corchetes y envía el texto al agente
`docsys-orchestrator-entry`.

- [01-documentacion-completa.md](01-documentacion-completa.md): uno o varios repositorios.
- [02-flujo-o-endpoint.md](02-flujo-o-endpoint.md): un endpoint o flujo concreto.
- [03-relacion-entre-sistemas.md](03-relacion-entre-sistemas.md): comunicación entre dos sistemas.
- [04-plan-desarrollo-o-migracion.md](04-plan-desarrollo-o-migracion.md): ubicación de un desarrollo, ADR o migración.
- [05-actualizar-documentacion.md](05-actualizar-documentacion.md): actualización incremental después de commits.

También puedes pedirlo con lenguaje normal, por ejemplo:

```text
Genera la documentación completa de [repo-a], [repo-b] y [repo-c].
```

```text
Documenta el flujo completo de POST /login en [servicio].
```
