# Cómo funciona el sistema de conocimiento

## 1. Propósito

Este proyecto permite analizar repositorios de software desde GitHub Copilot y convertir el conocimiento técnico del código en documentación arquitectónica verificable.

El sistema está diseñado para:

- analizar repositorios, módulos y microservicios;
- identificar APIs, persistencia, mensajes, configuraciones y dependencias;
- describir flujos técnicos y funcionales;
- producir documentación ASD-TSE-100 en español;
- generar propuestas de desarrollo, migración y ADRs;
- conservar evidencias, desconocidos, riesgos y decisiones pendientes;
- mantener el código de aplicación separado del repositorio de conocimiento.

## 2. Dónde vive cada cosa

```text
proyecto-ia-integración/
├── config/                         # configuración, presupuesto y contratos
├── agents/                         # responsabilidades de los agentes
├── .github/                        # instrucciones, agente Copilot y skills
├── templates/                      # plantilla ASD-TSE-100
├── docs/                           # documentación del sistema y decisiones
├── results/runs/<run-id>/          # resultados de cada análisis
└── workspace-repos.yaml             # repositorios autorizados

../962-gestor_prestacion_movilidad-gestor_novedades-ms/
                                      # código de aplicación externo
```

El repositorio de conocimiento contiene configuración, contratos, plantillas y documentación aprobada. Los repositorios de aplicación permanecen fuera de él y se abren como raíces adicionales del workspace multi-raíz de VS Code.

El archivo `workspace-repos.yaml` controla qué repositorios pueden analizarse. Actualmente `gestor_novedades-ms` está habilitado y `asistencia-core` está deshabilitado.

## 3. Cómo se inicia un análisis

El usuario abre el archivo `.code-workspace`, selecciona el agente personalizado `orquestador` en GitHub Copilot y escribe una solicitud en lenguaje natural.

Ejemplo recomendado:

```text
Analiza el flujo de creación y actualización de novedades en gestor_novedades-ms.

Ejecuta el preflight y clasifica la complejidad. Usa únicamente las herramientas nativas
read y search de Copilot para leer el repositorio; no ejecutes terminal ni scripts.

Identifica componentes, APIs, persistencia, mensajes, dependencias, configuraciones,
pruebas, riesgos y desconocidos. Genera documentación ASD-TSE-100 en español usando
archify-documentation o su modo fallback. Conserva evidencias y deja el resultado en review.
```

Para una documentación amplia:

```text
Genera la documentación arquitectónica de gestor_novedades-ms.
Incluye estructura, responsabilidades, APIs, persistencia, mensajes, flujos,
seguridad, configuración, despliegue, operación, pruebas, riesgos y dependencias.
Usa ASD-TSE-100 y la skill archify-documentation. No modifiques código ni ejecutes
terminal. Deja los resultados en review_required si existen dudas.
```

El alcance `full` requiere más análisis y puede activar razonamiento fuerte. Para controlar costes se recomienda comenzar con un flujo o módulo concreto.

## 4. Flujo completo

```text
Solicitud del usuario
        |
        v
Orquestador
        |
        +--> Preflight del workspace
        |      - manifiesto válido
        |      - repositorio habilitado
        |      - ruta existente
        |      - repositorio Git
        |      - rama correcta
        |      - raíz abierta en VS Code
        |
        +--> Clasificación de complejidad
        |      - low, medium, high o critical
        |      - puntuación y factores
        |      - evidencias y desconocidos
        |
        +--> Plan de ejecución
        |      - repositorios y alcance
        |      - agentes necesarios
        |      - coste estimado
        |      - confirmaciones necesarias
        |
        v
Inventariador nativo de Copilot
        |  Usa read y search; no usa terminal
        v
Extractor
        |  Selecciona fragmentos y produce hallazgos con evidencias
        v
Integrador, si existen relaciones o varios componentes
        |  Construye relaciones entre APIs, datos, mensajes y flujos
        v
Documentador
        |  Usa ASD-TSE-100 y la skill archify-documentation
        v
Revisor
        |  Detecta contradicciones, riesgos y baja confianza
        v
Proponente técnico, solo para especificaciones, migraciones o ADRs
        |
        v
Resultado en review o review_required
        |
        v
Aprobación humana
        |
        v
Publicación, cuando el Publicador sea habilitado
```

## 5. Qué hace cada agente

### Orquestador

Interpreta la solicitud, selecciona repositorios y módulos, clasifica complejidad, calcula el alcance, crea el plan y coordina las etapas.

No analiza todo el código directamente, no aprueba decisiones y no publica resultados.

### Inventariador

Usa exclusivamente `read` y `search` de Copilot sobre la raíz abierta del repositorio. Identifica estructura, proyectos, tecnologías, configuraciones, pruebas y archivos relevantes.

No usa terminal, no modifica el código y no interpreta reglas de negocio.

### Extractor

Lee el inventario y fragmentos seleccionados para identificar APIs, persistencia, mensajes, configuraciones, dependencias, componentes y evidencias.

No recibe el repositorio completo ni debe afirmar algo que no pueda respaldar con archivos, símbolos o líneas.

### Integrador

Relaciona módulos, repositorios, APIs, datos, mensajes y flujos. Solo se necesita cuando existe análisis transversal o una relación que no puede resolverse localmente.

Usa razonamiento fuerte únicamente cuando la configuración y la confirmación lo permiten.

### Documentador

Convierte los hallazgos en documentos Markdown y YAML en español usando ASD-TSE-100. Debe incluir responsabilidades, interfaces, datos, flujos, seguridad, operación, pruebas, riesgos, decisiones y evidencias.

### Skill `archify-documentation`

Es el adaptador de Archify para GitHub Copilot. Mantiene un contrato interoperable con Codex, Claude Code y OpenCode.

Archify está configurado en modo `fallback` porque todavía no existe un comando o implementación externa instalada. Por ello, el Documentador puede producir la documentación compatible, pero debe registrar que Archify no se ejecutó realmente.

### Revisor

Comprueba contradicciones, confianza, referencias, riesgos y desconocidos. No transforma inferencias en hechos ni aprueba decisiones.

### Proponente técnico

Genera propuestas de desarrollo, migración o ADR después de que la documentación y la revisión estén disponibles. Su resultado siempre queda pendiente de revisión humana.

### Publicador

Está desactivado en el MVP. Solo podrá incorporar conocimiento aprobado después de una validación humana explícita.

## 6. Clasificación de complejidad

Toda solicitud que afecte código debe clasificarse antes de ejecutar el plan.

| Nivel | Significado | Comportamiento |
| --- | --- | --- |
| `low` | Cambio localizado y reversible. | Análisis acotado; no requiere razonamiento fuerte por defecto. |
| `medium` | Varias piezas o contratos que requieren validación. | Puede requerir Integrador, Documentador y Revisor. |
| `high` | Cambio transversal, migración relevante o riesgo alto. | Requiere confirmación humana antes de continuar. |
| `critical` | Datos críticos, ruptura de contratos o migración irreversible. | Requiere confirmación y revisión humana de diseño. |

Los factores son cantidad de repositorios, componentes, interfaces, datos, impacto operativo e incertidumbre.

Una solicitud de documentación puede recibir nivel bajo por no modificar código, pero el alcance `full` puede exigir confirmación por coste y cobertura aunque la complejidad técnica sea baja.

## 7. Costes y créditos

### Presupuesto configurado

La configuración del proyecto contiene actualmente estos valores:

```yaml
remaining_credits: 1800
reserve: 300
usable_limit: 1500
strong_model_max_credits: 700
require_confirmation_above_credits: 80
```

Tú indicas que dispones de aproximadamente 2.000 créditos. Esa cifra debe considerarse el saldo real del proveedor; el valor `1800` del archivo es una configuración local y debe actualizarse cuando se confirme el saldo oficial.

### Qué consume créditos

- El Orquestador consume créditos según el modelo usado en Copilot.
- El Inventariador nativo usa `read` y `search`; no ejecuta un modelo adicional dedicado, aunque las lecturas pueden consumir contexto de la sesión.
- El Extractor usa el rol `economical_code`.
- El Documentador usa `economical_writing`.
- El Integrador y el Revisor pueden usar `strong_reasoning`.
- El Proponente usa actualmente el modelo económico de escritura.
- La skill Archify no añade por sí misma un coste; el coste depende del modelo que la ejecute.

### Coste observado en el último run

El último análisis fue:

```text
run-20260918-gestor_novedades-full-2
repositorio: gestor_novedades-ms
alcance: full
```

El usuario observó un consumo real de **8 créditos**. Ese es el dato operativo más relevante para medir el coste de una ejecución de Copilot.

Sin embargo, los artefactos generados contienen valores de planificación que no deben interpretarse como consumo real:

- `orchestration-plan.yaml`: estimación de hasta 1.500 créditos.
- `run-manifest.yaml`: registra 1.500 créditos.
- `relations.yaml`: registra 400 créditos.

Existe una inconsistencia entre esos campos y el consumo real observado de 8 créditos. Por tanto, el sistema todavía no tiene una medición automática fiable del coste real del proveedor. Debe distinguir siempre:

```text
coste_estimado   !=   presupuesto_reservado   !=   coste_real_del_proveedor
```

### Por qué 8 créditos es costoso

Con un saldo de 2.000 créditos, una ejecución de 8 créditos representa aproximadamente:

$$
\frac{8}{2000} \times 100 = 0.4\%
$$

Una ejecución aislada no consume una proporción alta del saldo, pero el coste se vuelve importante si se repite sobre muchos repositorios, se reanaliza el mismo código o se activa razonamiento fuerte sin necesidad.

### Estrategia recomendada de ahorro

- Empezar con alcance `targeted` o `standard`, no `full`.
- Analizar primero un flujo o módulo concreto.
- Reutilizar inventarios y hallazgos vigentes.
- No repetir el inventario si el repositorio no cambió.
- Ejecutar Integrador solo cuando haya relaciones reales.
- Ejecutar Revisor solo sobre hallazgos dudosos o de alto impacto.
- Reservar `strong_reasoning` para contradicciones, migraciones y decisiones complejas.
- Generar documentación después de tener evidencias seleccionadas.
- Evitar enviar conversaciones o repositorios completos al modelo.
- Mantener una reserva mínima para errores y reintentos.

Un flujo económico recomendado es:

```text
Preflight local
    -> Inventario nativo reutilizable
    -> Búsqueda dirigida
    -> Extractor sobre fragmentos relevantes
    -> Documentador económico
    -> Revisión solo si existen dudas
```

## 8. Qué significa cada estado

- `planned`: existe un plan, pero todavía no se ejecuta.
- `running`: la ejecución está en curso.
- `review`: hay resultados disponibles para revisión.
- `review_required`: existen dudas, contradicciones o decisiones que requieren una persona.
- `approved`: una persona acepta incorporar el resultado al conocimiento.
- `failed`: una tarea falló, pero las tareas independientes pueden conservarse.

El resultado del último run quedó en `review_required` porque la documentación requería validar seguridad, operación, persistencia, configuración externa y pruebas.

## 9. Artefactos de una ejecución

Cada ejecución vive en:

```text
results/runs/<run-id>/
├── orchestration-plan.yaml
├── run-manifest.yaml
├── <repository>/
│   ├── inventory.yaml
│   ├── findings.yaml
│   ├── documents.yaml
│   ├── document.md
│   └── review.yaml
├── relations.yaml
└── final-review.yaml
```

El plan explica qué se decidió ejecutar. El manifiesto resume el estado. Los hallazgos contienen evidencias técnicas. Las relaciones conectan componentes. El documento presenta el conocimiento en formato ASD-TSE-100. La revisión identifica riesgos y pendientes.

## 10. Qué puede hacer automáticamente y qué no

El sistema puede hacer automáticamente dentro del workspace:

- leer repositorios habilitados;
- buscar archivos, símbolos y configuraciones;
- reutilizar resultados previos;
- clasificar complejidad;
- crear planes;
- generar inventarios, hallazgos y documentos;
- escribir resultados en `results/runs/<run-id>/`;
- dejar resultados en revisión.

Debe conservar confirmación humana para:

- alcance `full` cuando el coste o cobertura lo justifique;
- uso de razonamiento fuerte;
- acceso de red;
- escritura fuera de `results/`;
- cambios en repositorios de aplicación;
- publicación del conocimiento;
- decisiones de migración o ADRs.

Además, GitHub Copilot puede mostrar confirmaciones propias de seguridad para usar herramientas. Esas confirmaciones pertenecen al cliente de VS Code y no se pueden eliminar desde los archivos del proyecto.

## 11. Resumen operativo

```text
1. Abrir el workspace multi-raíz.
2. Seleccionar el agente orquestador.
3. Solicitar un análisis acotado.
4. Copilot valida el workspace.
5. Copilot clasifica la complejidad.
6. Copilot reutiliza resultados existentes.
7. Copilot lee el repositorio con read y search.
8. Extractor, Integrador, Documentador y Revisor trabajan sobre evidencias seleccionadas.
9. Archify se usa como skill o se registra fallback si no está instalado.
10. El resultado queda en review o review_required.
11. Una persona valida antes de aprobar o publicar.
```

La recomendación para proteger los 2.000 créditos es no iniciar con `full`. El primer análisis debe ser dirigido a un flujo o módulo, medir el consumo real y ampliar el alcance solo si la información obtenida justifica el coste.
