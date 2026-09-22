# Prueba de Archify

```text
Usa la skill archify-documentation para generar el esquema
arquitectónico del último run.

Quiero comprobar específicamente:

- estructura ASD-TSE-100;
- mapa general de arquitectura y relaciones;
- diagrama general Mermaid como fallback cuando no exista adaptador externo;
- rutas y contratos;
- datos y persistencia;
- tecnologías;
- evidencias;
- riesgos;
- desconocidos y limitaciones.

Antes de responder, informa exactamente:

- archify.skill_status;
- archify.mode;
- archify.external_implementation;
- archify.version.

No afirmes que Archify externo fue ejecutado si solamente se aplicó
la skill o el fallback Mermaid.

Después comprueba por separado que el motor, sin atribuirlo a Archify,
generó un Mermaid por servicio y un Mermaid independiente por endpoint.
```

En la instalación actual se espera `skill_status: available`, `mode: fallback` y `external_implementation: null`. Una respuesta `executed` sin adaptador externo sería incorrecta.
