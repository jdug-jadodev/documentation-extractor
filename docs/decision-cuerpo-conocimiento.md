# Recomendación sobre dónde vivirá el cuerpo de conocimiento

## Estado de la decisión

- **Estado:** propuesta para revisión humana.
- **Fecha:** 2026-09-18.
- **Alcance:** arquitectura del repositorio de conocimiento y sus resultados de análisis.
- **Decisión recomendada:** mantener el cuerpo de conocimiento en un repositorio Git independiente por equipo o instancia.

## Recomendación

El cuerpo de conocimiento debe vivir en el repositorio independiente `architecture-knowledge` o en la instancia equivalente del equipo. Ese repositorio debe contener la configuración, los contratos, las plantillas, las evidencias seleccionadas, la documentación validada y los resultados aprobados.

Los repositorios de aplicación deben permanecer fuera de ese repositorio y abrirse como raíces adicionales del workspace multi-raíz de VS Code. El código fuente se analiza localmente, pero no se copia ni se versiona dentro del repositorio de conocimiento.

El workspace local será el entorno de ejecución, no la fuente permanente de verdad. Allí pueden existir clones de aplicación y resultados temporales de una ejecución; solo los artefactos aprobados deben incorporarse al cuerpo de conocimiento.

Confluence u otra plataforma documental puede utilizarse como canal de publicación o consulta humana posterior, pero no debe ser la fuente primaria para los agentes.

## Por qué esta opción

### 1. Trazabilidad y control de cambios

Git permite revisar quién cambió una afirmación, qué evidencia la respalda, cuándo se actualizó y qué versión estaba aprobada. Esto es esencial para documentación técnica que puede influir en desarrollo, migraciones y decisiones arquitectónicas.

### 2. Aislamiento por equipo

Cada equipo puede mantener su propia instancia, permisos, ramas, políticas de revisión y repositorios habilitados sin mezclar conocimiento de otros equipos. El manifiesto `workspace-repos.yaml` define explícitamente qué código puede analizarse.

### 3. Separación entre código y conocimiento

El código de aplicación conserva su propiedad, ciclo de vida y permisos originales. El repositorio de conocimiento almacena documentación y evidencias seleccionadas, no una copia del código fuente ni secretos de autenticación.

### 4. Compatibilidad con Copilot y VS Code

Copilot puede leer la configuración, los contratos y los resultados desde una raíz estable del workspace, mientras accede al código autorizado desde raíces externas. El Orquestador puede coordinar ambos contextos sin enviar el repositorio completo a un modelo.

### 5. Reutilización y bajo consumo

Los inventarios, hallazgos y relaciones pueden reutilizarse por ejecución y por módulo. Esto evita escanear todo el código o volver a consumir créditos para preguntas que ya tienen resultados vigentes.

### 6. Revisión humana antes de publicar

Los resultados generados por agentes permanecen en `review` o `review_required`. El equipo decide qué documentación, propuesta o relación pasa a ser conocimiento aprobado; no se sobrescribe conocimiento validado automáticamente.

### 7. Portabilidad

Git funciona con independencia del sistema operativo y del proveedor documental. El análisis puede ejecutarse desde Windows, macOS o Linux, siempre que el repositorio esté disponible en el workspace y se cumplan los prerrequisitos locales.

## Ubicación y clasificación de artefactos

```text
architecture-knowledge/
├── config/                         # contratos y configuración de la instancia
├── agents/                        # responsabilidades de los agentes
├── prompts/                       # prompts de compatibilidad y operación
├── templates/                     # formatos documentales
├── docs/                          # decisiones y contratos aprobados
├── results/runs/<run-id>/         # resultados de ejecución, inicialmente revisables
├── workspace-repos.yaml           # repositorios autorizados y ramas
└── tools/                         # utilidades locales de análisis

../asistencia-core/                # código de aplicación, fuera del repositorio
../otro-repositorio/               # código de aplicación, fuera del repositorio
```

| Artefacto | Ubicación recomendada | Estado | Motivo |
| --- | --- | --- | --- |
| Configuración y manifiestos | Repositorio de conocimiento | Versionado | Define alcance, contratos y controles. |
| Inventario local | `results/runs/<run-id>/` | Temporal y revisable | Se puede reutilizar sin convertirlo automáticamente en conocimiento aprobado. |
| Hallazgos y evidencias | `results/runs/<run-id>/` | Revisable | Conserva el origen de las afirmaciones. |
| Documentación ASD-TSE-100 | Repositorio de conocimiento tras aprobación | Aprobado | Es el cuerpo consultable por personas y agentes. |
| Propuestas de desarrollo, migración y ADR | `results/runs/<run-id>/` | `review_required` | No deben confundirse con decisiones aprobadas. |
| Código fuente | Repositorio de aplicación externo | Propiedad del equipo | No debe copiarse ni versionarse en el repositorio de conocimiento. |
| Publicación externa | Confluence u otra plataforma | Derivada | Puede facilitar consulta humana, pero no reemplaza la fuente versionada. |

## Alternativas descartadas

### Guardar todo en Confluence

No se recomienda como fuente primaria porque dificulta el versionado fino, la trazabilidad de evidencias, la reutilización local y el control de consumo de consultas.

### Guardar el conocimiento dentro de cada repositorio de aplicación

No se recomienda como ubicación única porque mezcla documentación con ciclos de desarrollo distintos, complica el conocimiento transversal y puede impedir el aislamiento entre equipos.

### Guardar el conocimiento únicamente en el workspace local

No se recomienda porque el workspace no es por sí mismo una unidad de revisión, respaldo, colaboración y versionado suficiente.

### Enviar el repositorio completo a un modelo

Se descarta por coste, privacidad, límites de contexto y pérdida de control sobre las evidencias. Los agentes deben trabajar con inventarios, fragmentos y resultados estructurados.

## Reglas de operación

- Cada equipo mantiene una instancia o espacio de conocimiento separado.
- `workspace-repos.yaml` es la lista permitida de repositorios analizables.
- Las rutas de aplicación apuntan fuera del repositorio de conocimiento.
- Los secretos se gestionan mediante la autenticación local de Git y nunca se guardan en el manifiesto.
- Los resultados nuevos se crean en una ejecución independiente.
- Solo una persona puede aprobar que un resultado pase de `review` a conocimiento publicado.
- Las afirmaciones importantes conservan evidencia de repositorio, archivo y símbolo o líneas cuando sea posible.
- El cuerpo de conocimiento debe indicar fecha, rama, estado, confianza, desconocidos y limitaciones.

## Decisión pendiente

Validar con el equipo si el repositorio de conocimiento será uno por equipo, uno por producto o uno por organización. La recomendación inicial es **uno por equipo o dominio**, con relaciones transversales explícitas y controladas cuando participen varios repositorios.
