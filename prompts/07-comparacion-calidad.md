# Comparación de calidad

Usar el mismo prompt en dos conversaciones nuevas:

1. Con el agente `docsys-orchestrator-entry`.
2. Con un agente normal de Copilot.

## Prompt común

```text
Explica completamente cómo se registra un usuario desde estraviado
hasta login-estraviado.

Incluye punto de entrada, cliente HTTP, URL, endpoint receptor,
montaje, middleware, controlador, caso de uso, repositorios, datos,
respuesta, dependencias, riesgos y evidencia.

Separa hechos confirmados, relaciones candidatas, elementos no
resueltos e información que no puede demostrarse.

No modifiques código.
```

## Criterios para comparar

- Exactitud factual.
- Evidencia identificable.
- Ausencia de invenciones.
- Cobertura del recorrido completo.
- Claridad sobre `candidate` y `unresolved`.
- Utilidad práctica del documento.
- Tiempo empleado.
- Consumo indicado por Copilot.

