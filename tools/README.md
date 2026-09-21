# Herramientas

Todos los comandos se ejecutan desde la carpeta raíz `proyecto-ia-integración`. En PowerShell, el prefijo `.` seguido de una barra invertida (`.\`) significa "ejecutar un script que está en esta carpeta".

Los scripts `.ps1` son utilidades opcionales para Windows. El flujo principal usa las herramientas nativas de Copilot para leer e inventariar el repositorio; no depende de terminal, Python ni PowerShell.

`validate-workspace.ps1` comprueba el manifiesto sin acceder a repositorios.

`setup-workspace.ps1` clona repositorios habilitados y selecciona su rama.

`pull-workspace.ps1` actualiza repositorios limpios mediante `git pull --ff-only`. No hace push, merge ni resolución automática de conflictos.

`run-inventory.ps1` conserva una alternativa manual para Windows, pero no forma parte del flujo principal de Copilot.

`tools/inventory.py` conserva una alternativa manual multiplataforma, pero no forma parte del flujo principal de Copilot:

```text
python tools/inventory.py --repository asistencia-core
```

Si el comando `python` no existe, instala Python 3.10 o posterior y verifica que esté disponible en el PATH. El script equivalente de PowerShell se conserva para Windows.

Ejemplo:

```powershell
.\tools\run-inventory.ps1 -Repository asistencia-core
```

Si usas Windows y quieres automatizar la preparación, el orden recomendado es:

```powershell
.\tools\validate-workspace.ps1
.\tools\setup-workspace.ps1
.\tools\run-inventory.ps1 -Repository asistencia-core
```

No ejecutes `pull-workspace.ps1` en la primera instalación. Ese comando sirve para actualizar una copia que ya existe.

En macOS o Linux puedes clonar y actualizar los repositorios con Git directamente. Después agrega cada repositorio como raíz del workspace multi-raíz de VS Code, o abre el archivo `.code-workspace` de ejemplo. Copilot debe comprobar el manifiesto, la ruta, Git, la rama y el acceso antes de solicitar el inventario.

Todos los scripts continúan con el siguiente repositorio cuando uno falla y devuelven código de salida `1` si hubo errores.
