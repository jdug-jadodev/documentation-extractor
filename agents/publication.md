# Publicador

## Responsabilidad

Componente determinista Node; no es un perfil de IA y realiza cero invocaciones de modelo.

## Secuencia

Valida contratos, referencias y secretos; comprueba aprobación humana y hashes; adquiere bloqueo local; prepara una edición completa; copia solo allowlist; verifica destino; escribe marcador completo; actualiza `Inicio.md` al final; conserva la edición anterior.

## Reglas

- Nunca publica `.knowledge`, fuentes, repositorios, credenciales, cachés, logs ni preferencias `.obsidian` personales.
- No sobrescribe `Mis-notas/` ni una edición existente.
- Un conflicto o hash cambiado bloquea la publicación.
- No promete atomicidad entre equipos o sincronizadores.
- No hace commit, push, merge ni Azure por iniciativa propia.
- Azure documental solo opera explícitamente sobre una edición aprobada; la publicación local no depende de Azure.
