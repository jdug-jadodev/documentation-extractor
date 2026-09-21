# Objetivo del proyecto

## Propósito

Crear una solución reutilizable que permita a cada equipo analizar sus repositorios de software y convertir el conocimiento técnico disperso en documentación estructurada, verificable y útil para desarrolladores y agentes de IA.

## Resultado esperado

El proyecto debe permitir solicitar en lenguaje natural:

- Documentación de un repositorio, microservicio o módulo.
- Documentación de todos los repositorios habilitados.
- Análisis de un flujo funcional o técnico entre microservicios.
- Búsqueda de APIs, mensajes, tablas, dependencias o relaciones.
- Generación de especificaciones técnicas.
- Propuestas de migración.
- Propuestas de ADRs.
- Identificación de responsabilidades por microservicio.

El Orquestador debe interpretar la solicitud, seleccionar los repositorios y módulos involucrados, reutilizar resultados existentes, coordinar subagentes y entregar los resultados para revisión humana.

## Forma de operación

```text
Solicitud del usuario
    -> Orquestador
    -> Plan de ejecución
    -> Inventariador local
    -> Extractor de evidencias
    -> Integrador de relaciones
    -> Documentador
    -> Revisor
    -> Resultado pendiente de aprobación
```

Cada agente debe recibir y producir información estructurada; ningún agente debe depender de conversaciones completas ni enviar un repositorio completo a un modelo.

## Documentación generada

Los documentos Markdown se generan en español mediante el formato configurable ASD-TSE-100 e incluyen, cuando aplique:

- Control documental.
- Resumen, objetivo y alcance.
- Contexto y arquitectura.
- Responsabilidades por microservicio.
- APIs, mensajes y contratos.
- Datos y persistencia.
- Flujos funcionales y técnicos.
- Seguridad, configuración y operación.
- Pruebas y validación.
- Riesgos, limitaciones y desconocidos.
- Decisiones, recomendaciones y evidencias.

La información no confirmada debe marcarse como `inference`, `unknown` o `review_required`; nunca debe presentarse como un hecho sin evidencia.

## Aislamiento por equipo

Cada equipo debe mantener su propia instancia de conocimiento, configuración, resultados, evidencias y permisos.

Los repositorios de aplicación se clonan fuera de este proyecto y no se copian ni versionan dentro del repositorio de conocimiento.

Las relaciones entre repositorios se almacenan como resultados transversales independientes, manteniendo separado el conocimiento propio de cada repositorio.

## Modelos y consumo

La selección de modelos se configura por capacidades, no por nombres fijos:

- `local`: inventario, validaciones y publicación determinista.
- `economical_code`: extracción de información técnica del código.
- `economical_writing`: redacción y normalización documental.
- `strong_reasoning`: relaciones complejas, contradicciones, migraciones y decisiones arquitectónicas.

El modelo fuerte solo se utiliza cuando el Orquestador detecta una necesidad real y confirma el coste cuando corresponda.

El sistema debe:

- Procesar localmente todo lo posible.
- Reutilizar resultados vigentes.
- Dividir el trabajo por repositorio, módulo o flujo.
- Enviar a los modelos únicamente resúmenes y evidencias seleccionadas.
- Registrar tokens, créditos, tiempos, reutilización, errores y resultados pendientes.
- Mantener una reserva para reintentos y casos complejos.

## Principios de seguridad y control

- No guardar secretos, tokens ni contraseñas en archivos versionados.
- No acceder a repositorios fuera de `workspace-repos.yaml`.
- No ejecutar `push`, merge o commit automáticamente.
- No publicar conocimiento sin revisión humana.
- No sobrescribir conocimiento aprobado sin conservar el cambio revisable.
- Conservar evidencias navegables para cada afirmación relevante.

## Criterio de éxito

El proyecto será válido cuando un usuario pueda escribir una solicitud como:

```text
Genera la documentación de asistencia-core centrada en el microservicio de novedades.
```

Y el sistema pueda:

- Identificar el alcance y los repositorios implicados.
- Crear un plan de ejecución.
- Coordinar los agentes necesarios.
- Reutilizar análisis previos.
- Generar documentación ASD-TSE-100 en español.
- Mostrar relaciones entre microservicios sin mezclar sus conocimientos.
- Señalar evidencias, incertidumbres y riesgos.
- Entregar el resultado para revisión humana.
- Registrar el consumo y los artefactos generados.
