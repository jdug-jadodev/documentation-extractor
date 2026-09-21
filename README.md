# Architecture Knowledge MVP

Plantilla aislada para analizar repositorios de un equipo y generar conocimiento técnico verificable.

## Principios

- Los repositorios de aplicación viven fuera de este repositorio.
- El análisis es explícito: validar acceso, inventariar y después extraer.
- Los resultados temporales no se mezclan con el conocimiento publicado.
- Los agentes intercambian archivos estructurados, no conversaciones completas.
- La skill `archify-documentation` está habilitada para el Documentador; MCP permanece desactivado en el MVP.

El punto de entrada normal es el Orquestador. El usuario escribe una solicitud en lenguaje natural y el Orquestador decide qué repositorios, alcance y subagentes necesita. No es necesario ejecutar manualmente cada agente. Los subagentes están disponibles para el Orquestador, pero no se ejecutan todos en cada solicitud.

Los documentos Markdown se generan por defecto en español con la plantilla configurable `ASD-TSE-100`, definida en [config/documentation.yaml](config/documentation.yaml) y [templates/asd-tse-100-es.md](templates/asd-tse-100-es.md). Incluyen responsabilidades por microservicio, APIs, mensajería, datos, flujos, seguridad, operación, riesgos, decisiones y evidencias.

Todos los agentes aplican desde la primera respuesta la política de [config/response-policy.yaml](config/response-policy.yaml): respuesta directa, alta densidad informativa, sin saludos ni texto obvio y con viñetas breves cuando sea necesario explicar algo complejo. Esta reducción nunca elimina evidencias, advertencias, desconocidos, costes ni solicitudes de confirmación.

Para usarlo desde Copilot, las instrucciones persistentes están en [.github/copilot-instructions.md](.github/copilot-instructions.md) y el agente personalizado en [.github/agents/orquestador.agent.md](.github/agents/orquestador.agent.md). El prompt de [prompts/orquestador.md](prompts/orquestador.md) se conserva como referencia. A partir de entonces puedes escribir solicitudes normales como "genera la documentación de asistencia-core con el microservicio de novedades".

## Guía para empezar

Esta sección explica el proceso como una receta. En la primera prueba Copilot ejecuta el Inventariador mediante sus herramientas nativas de lectura y búsqueda. No se utiliza terminal para inventariar; MCP permanece desactivado.

### Paso 1: abrir una terminal en el proyecto

Abre PowerShell desde VS Code o desde el menú Inicio. Después sitúate en la carpeta del proyecto:

```powershell
Set-Location "C:\Users\jdurrego\Documentos\proyecto-ia-integración"
```

Puedes comprobar dónde estás con:

```powershell
Get-Location
```

La ruta mostrada debe terminar en `proyecto-ia-integración`.

### Paso 2: entender el manifiesto

El archivo `workspace-repos.yaml` indica qué repositorio se analizará. Actualmente contiene el repositorio `asistencia-core`:

```yaml
repositories:
  - name: asistencia-core
    url: https://dev.azure.com/SuraColombia/Gerencia_Tecnologia/_git/474-asistencia-asistencia-ml
    path: ../asistencia-core
    branch: master
    enabled: true
```

Cada propiedad significa:

- `name`: nombre corto que usarás en los comandos.
- `url`: dirección Git del repositorio.
- `path`: carpeta donde se descargará, fuera de este proyecto.
- `branch`: rama que se analizará.
- `enabled`: `true` significa que participa; `false` significa que se ignora.

No cambies `url` ni `path` si no necesitas conectar otro repositorio. Nunca escribas contraseñas o tokens en este archivo.

### Paso 3: abrir el workspace multi-raíz

Abre `proyecto-ia-integración.code-workspace` en VS Code. Incluye este proyecto y las rutas externas declaradas en `workspace-repos.yaml`.

Si agregas otro repositorio, incorpora también su carpeta como una raíz del workspace. La carpeta debe permanecer fuera de `proyecto-ia-integración`.

### Paso 4: validar la configuración

Ejecuta:

```powershell
.\tools\validate-workspace.ps1
```

Este comando solo revisa el YAML. No descarga nada ni modifica el repositorio de aplicación. El resultado esperado es parecido a:

```text
Manifiesto válido: 1 repositorio(s), 1 habilitado(s).
```

Si aparece un error, corrige primero `workspace-repos.yaml`. En el flujo normal, Copilot hará además un preflight para confirmar que las rutas existen, son repositorios Git, tienen disponible la rama solicitada y están accesibles desde el workspace.

### Paso 5: disponer del repositorio

Clona manualmente cada repositorio con Git en la ruta declarada. Los scripts PowerShell de `tools/` son opcionales para usuarios de Windows.

### Paso 6: descargar el repositorio (opcional en Windows)

Ejecuta:

```powershell
.\tools\setup-workspace.ps1
```

El script hace lo siguiente:

1. Lee los repositorios con `enabled: true`.
2. Crea la carpeta indicada en `path` si no existe.
3. Ejecuta un clon Git usando la autenticación configurada en tu equipo.
4. Cambia a la rama indicada.

El código quedará en:

```text
C:\Users\jdurrego\Documentos\asistencia-core
```

El código no se copia dentro de `proyecto-ia-integración`.

Si el repositorio ya existe, el script no lo vuelve a clonar. Para actualizarlo posteriormente usa:

```powershell
.\tools\pull-workspace.ps1
```

Ese comando requiere que no tengas cambios locales sin confirmar. No hace `push`, merge ni elimina cambios.

### Paso 7: ejecutar el primer agente

Cuando el repositorio esté disponible y Copilot haya confirmado el preflight, solicita al agente `orquestador` que ejecute el inventario mediante `read` y `search`. Los scripts locales son alternativas manuales, no pasos requeridos:

```text
Inventaría gestor_novedades-ms usando únicamente las herramientas read y search de Copilot. No ejecutes terminal ni scripts.
```

Este es el Inventariador. Trabaja localmente y en modo lectura. Cuenta archivos, extensiones, proyectos, configuraciones y pruebas. No envía el código a ningún modelo.

El resultado se guarda en una carpeta nueva como esta:

```text
results/runs/run-20260918-115440-asistencia-core/asistencia-core/
├── inventory.yaml
└── run-manifest.yaml
```

El nombre exacto de `run-...` cambiará en cada ejecución.

### Flujo normal: hablar con el Orquestador

Una vez preparada la instancia, escribe en Copilot una solicitud como:

```text
Genera la documentación de asistencia-core centrada en el microservicio de novedades.
Incluye APIs, persistencia, mensajes, dependencias y relaciones con otros repositorios.
```

El Orquestador debe:

1. Identificar `documentation` como tipo de solicitud.
2. Resolver `asistencia-core` y el microservicio de novedades desde `workspace-repos.yaml`.
3. Reutilizar inventarios existentes.
4. Crear un plan en `results/runs/<run-id>/orchestration-plan.yaml`.
5. Enviar tareas al Inventariador, Extractor, Integrador, Documentador y Revisor cuando corresponda.
6. Para especificaciones, migraciones o ADRs, enviar los resultados revisados al Proponente técnico.
7. Guardar cada resultado en la misma ejecución.
8. Dejar el conocimiento en `review` hasta que una persona lo apruebe.

También puedes pedir:

```text
Documenta todos los repositorios habilitados del workspace.
```

```text
Analiza el flujo de creación de una novedad y muestra qué microservicios participan.
```

```text
Propón una especificación y un ADR para modificar la funcionalidad de novedades.
```

El alcance `full`, el uso del modelo fuerte y la publicación requieren confirmación antes de ejecutarse.

### Paso 6: revisar el resultado

Para abrir el inventario desde PowerShell:

```powershell
Get-Content .\results\runs\<run-id>\asistencia-core\inventory.yaml
```

También puedes abrir la carpeta `results/runs` desde el explorador de VS Code y seleccionar la ejecución más reciente.

En `inventory.yaml` encontrarás métricas como:

- número de archivos procesados;
- módulos o proyectos detectados;
- extensiones utilizadas;
- configuraciones encontradas;
- pruebas detectadas;
- tokens y créditos consumidos, que en esta etapa deben ser `0`.

En `run-manifest.yaml` encontrarás el estado de la ejecución. `review` significa que el inventario fue generado y está listo para revisión; no significa todavía que la documentación esté validada por una persona.

### Paso 7: qué agentes se ejecutan actualmente

El Orquestador y los agentes de análisis están disponibles en `config/agents.yaml`. El Orquestador decide cuáles utilizar en cada solicitud:

```text
Orquestador     activo, recibe solicitudes normales
Inventariador   activo, local, sin créditos
Extractor       disponible, lo ejecuta el Orquestador
Documentador    disponible, lo ejecuta el Orquestador
Integrador      disponible, solo si hace falta razonamiento transversal
Revisor         disponible, solo para dudas o alto impacto
Proponente      disponible, redacta propuestas técnicas después de la revisión
Publicador      desactivado
```

No ejecutes directamente los subagentes. Usa el Orquestador para que respete dependencias, presupuesto y revisión humana.

### Configurar los modelos de cada compañía

Los modelos disponibles dependen de cada compañía. Por eso no debes modificar los nombres de modelo dentro de cada agente. Edita únicamente [config/models.yaml](config/models.yaml).

Ese archivo separa:

- el modelo económico para analizar código (`economical_code`);
- el modelo económico para redactar (`economical_writing`);
- el mejor modelo para razonar sobre relaciones complejas (`strong_reasoning`);
- el procesamiento local (`inventory` y `publication`).

Si no sabes cómo asignarlos, usa el prompt de [prompts/configurar-instancia.md](prompts/configurar-instancia.md) con tu asistente de IA. Ese prompt le indica que lea el proyecto, pregunte qué modelos tienes, edite la configuración, valide el workspace y ejecute el inventario local. También le prohíbe activar modelos de pago sin pedir confirmación.

Como los modelos se ejecutarán directamente desde Copilot/VS Code, no necesitas configurar una API. Después del inventario, usa [prompts/ejecutar-extractor.md](prompts/ejecutar-extractor.md) para pedirle a Copilot que ejecute el Extractor con el modelo asignado a `economical_code` y genere los hallazgos estructurados.

En este proyecto, los roles iniciales consumen el presupuesto así:

```text
Análisis de código económico: 500 créditos
Documentación económica:      300 créditos
Razonamiento fuerte:           700 créditos
Reserva:                       300 créditos
Total:                       1.800 créditos
```

Los nombres concretos de los modelos son etiquetas de tu proveedor. No se asume que todas las compañías tengan los mismos modelos.

### Errores comunes

**`No existe la copia local`**

Ejecuta primero `.\tools\setup-workspace.ps1`. Si el clon falla, revisa la autenticación de Git y los permisos del repositorio.

**`Hay cambios locales; resuélvelos antes de actualizar`**

El repositorio tiene cambios sin confirmar. Guárdalos, confírmalos o resuélvelos antes de ejecutar `pull-workspace.ps1`.

**`El repositorio habilitado no existe`**

El nombre usado después de `-Repository` no coincide con `name` en `workspace-repos.yaml`. En este caso debes usar `-Repository asistencia-core`.

### El comando no se reconoce

Comprueba que la terminal está ubicada en `proyecto-ia-integración` y que escribes la ruta con `.\tools\`.

Los scripts funcionan con Windows PowerShell 5.1 o PowerShell 7 y Git. Si está disponible el módulo `powershell-yaml`, se usará para leer YAML; si no, el manifiesto de workspace usa un lector de respaldo limitado al contrato definido.

## Estructura

- `workspace-repos.yaml`: repositorios locales autorizados para esta instancia.
- `catalog.yaml`: índice del conocimiento generado.
- `config/`: alcance, presupuesto, modelos y extensiones.
- `tools/`: preparación, actualización y validación local.
- `schemas/`: contratos de salida de los agentes.
- `agents/`: instrucciones y límites de cada agente.
- `results/`: ejecuciones temporales y métricas; no es conocimiento publicado.
- `services/`, `apis/`, `messages/`, `flows/`, `evidence/`: conocimiento consolidado.

No guardes secretos, tokens ni código fuente de los repositorios en este repositorio.
#   d o c u m e n t a t i o n - e x t r a c t o r  
 