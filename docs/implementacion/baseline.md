# Línea base de migración V4 Node

Fecha de auditoría: 2026-09-21  
Alcance: exclusivamente el repositorio del sistema de documentación. No se leyó ningún repositorio de aplicaciones ni ninguna ruta heredada externa.

## Resultado T01

- El proyecto existente es un repositorio de contratos, agentes, configuración y utilidades; todavía no contenía un motor Node.js/TypeScript, `package.json`, `src/`, `dist/` ni suite automatizada.
- Se preservan ocho roles: Orquestador, Inventariador, Extractor, Integrador, Documentador, Revisor, Proponente y Publicador.
- Se preservan la plantilla real `templates/asd-tse-100-es.md` (ASD-TSE-100) y la skill real `.github/skills/archify-documentation/SKILL.md`.
- `workspace-repos.yaml` mantiene `gestor_novedades-ms` habilitado y `asistencia-core` deshabilitado. Sus rutas no se inspeccionaron: el workspace de aplicaciones está pendiente y la aplicación debe mostrar **Configuración pendiente**.
- El paquete V4 disponible no contiene `03-QUE-NECESITO-DE-TI.md`, aunque los documentos 00, 01, 04 y 05 lo referencian.
- Los contratos heredados usan `schema_version: 1`; el motor nuevo debe conservarlos como entrada legada y producir artefactos canónicos `schema_version: 3`.
- Las utilidades heredadas `tools/inventory.py` y PowerShell recorren el working tree, cambian ramas o hacen red en algunos flujos. Se conservan solo como material de migración; no serán invocadas por el motor Node.
- Las instrucciones activas ordenaban inventariar con `read/search`, cargar numerosas configuraciones y ejecutar el inventario como agente. Deben sustituirse conjuntamente con los perfiles, sin perder los ocho roles.
- La configuración heredada contiene números presentados como “créditos” y modelos codificados. Se migran como datos históricos, nunca como consumo observado ni saldo actual.
- La plantilla y varios documentos existentes muestran texto con codificación histórica en algunas consolas; sus bytes originales quedan preservados en el respaldo.

## Respaldo privado

Antes de editar se creó `.knowledge/migration-backup/t01-baseline/`. Contiene la configuración, agentes, skill, plantilla, esquemas, documentos y utilidades originales. `.knowledge/` es privado y no forma parte de una boveda ni de una exportación.

## Inventario y hashes SHA-256 originales

| Recurso | SHA-256 |
|---|---|
| `.github/agents/orquestador.agent.md` | `ff5b92d677fe7b50df2a71025193d915d0e1920cf80e46620ed01047aa9c3856` |
| `.github/copilot-instructions.md` | `c6559be9c28b99d778d40ae7e1015ff5a2c8ac283e9afb8b4ee167361ab122d0` |
| `.github/skills/archify-documentation/SKILL.md` | `c228070ad43550ef5a945e4020bb427d3377dba6ef7b55ef098a1b6cb8392188` |
| `agents/documentation.md` | `ff36e0a5872cd3a20dd7e110f4e0781edd25b9c4f6cf864aa96e3c4767c55925` |
| `agents/extraction.md` | `ebfc57f28da813d3720e656218cf70c1e4a08decd0aaf48be0791e46a6f36f7e` |
| `agents/integration.md` | `6bc21cd26143c677208236cd78981c2013acb87386ca3540298fec9b83495a39` |
| `agents/inventory.md` | `b68b456052ca349b9e14457148fa1ccd42c023f546b6710023ea9ff5581c93ad` |
| `agents/orchestrator.md` | `f03cb5e1bbf86d9430ee4dc0d58040b0414f62fc233abcb423968af708ea5275` |
| `agents/proposal.md` | `5a5305e21dd130070705af2ba9a28d898a861d67fceeaa6fefc53c9ba9f0b75c` |
| `agents/publication.md` | `315b354397f54255865c85b746b7298a8065a0a09e2caff82d7ce6cb60bcce1c` |
| `agents/review.md` | `be539dac61a90053f21b5b0c638060239595c84eb0a2297259315255ae381c4a` |
| `config/agents.yaml` | `1a953abd9408fa70c87e9c6319f88320aa044f44c148436a492769ad499a825d` |
| `config/analysis.yaml` | `1a5386d28fa50ea6f23768f3c9afdc89f150476dcdb9bb3cbd1d7ab815a42fb2` |
| `config/archify.yaml` | `3f972caff7705a1634d88875dc7f0efcd1dd3601f786b217521c72c8cfd7f645` |
| `config/complexity.yaml` | `e0e37abbf5ef966b5460d1b06d9d9a4cba44d0f3f127a0014eec9e91a0eca8c9` |
| `config/documentation.yaml` | `a8d3c9a2efbaa6234bbc462690eecb111acaef9716e3f837701c1a8910d90dff` |
| `config/extensions.yaml` | `a09bc3d3d4c2f5f551d87b738ce25e62e6005333ce65f49387b179c30ea248bb` |
| `config/models.yaml` | `52dea1d7397de41730c26f6ac602845ec87a5ec7d23cc08b854f0f86add7fff5` |
| `config/response-policy.yaml` | `8dd2ebc22ace6f4fc9ae92df77673f4604ef3f00ed3efe04a2885dd70e11346e` |
| `config/workflows.yaml` | `7cceb9fdc76cd2d9dfae57f2cee491e26b72243d4366435578d4a0ca39c74ce0` |
| `schemas/api.schema.yaml` | `91dfe06f9929cb07a0e2753399306b051bf7702d8b5b07803b9d6fa0642a160c` |
| `schemas/evidence.schema.yaml` | `b66b116b423b568f3a918b63b57e199a8afd130f0c1990079249d8db0524e66c` |
| `schemas/finding.schema.yaml` | `bbe8c983324d3cd934d895e24a8b55385c34cf5c2ee5fe111c74a81261921719` |
| `schemas/message.schema.yaml` | `7b005b79f28af2408180030bf400595016b431c6b6157f0f13b8a6fec773eb18` |
| `schemas/orchestration-plan.schema.yaml` | `a7a0cf0eba7f0b3d4e3d7d6b3a255db169d966d0e788c8ea41d7c9538504efb4` |
| `schemas/repository.schema.yaml` | `b8e29fb99d2785db3b942c3f9a0515c63607b523bec8ef08f2240bdf711be6e1` |
| `schemas/run-manifest.schema.yaml` | `4a03106b2e53227ae00d0bdb20770b2e95aba1c3547b1249745d2ad038867ff6` |
| `templates/asd-tse-100-es.md` | `e6af224ace93bcadeee8e93710dfc6a23cc2eeaa5a02a6f5175723f3d1684fae` |
| `tools/inventory.py` | `c6951075a757b4ae0d55351405d07dd70241cca2e7a93af5f1cde5f6d1173274` |
| `tools/run-inventory.ps1` | `f5fe8825423422fb653d56d077180d0d34f9bc09d94ed0f1c18ab52416eaa596` |
| `tools/setup-workspace.ps1` | `18a4816049eddee83e0c676d06d208c720dcad6fa1f862a2ad7ef3122cf354f8` |
| `tools/pull-workspace.ps1` | `b2902adaae2367a6eb7df01af8f75a139716a86fb798f882d3623412943e6d73` |
| `tools/validate-workspace.ps1` | `8230be1eef193dc494a5ad41bc9513ac19387f21a764ff9a661a4e01feed0579` |
| `tools/lib/Manifest.ps1` | `2b3f36eee62eee95eb923bae0f70e90418469ed95e87fcef73201daceaf7aba6` |
| `workspace-repos.yaml` | `6dda67c52cce05425f435271befe238623924d0b5622214c814972135919c780` |
| `proyecto-ia-integración.code-workspace` | `904d41c2b52ad3423007d89c4bdb0a76a6dd2b95df968f44778b291f8a2595f9` |
| `README.md` | `6304ac5df9dbbd18be1a2373c73f6d35eafa3c2a507f241d489e3898c961e7e3` |

## Limitaciones de la línea base

- El stack real del piloto no se identifica hasta recibir el workspace de aplicaciones; no se inferirá desde nombres o URLs.
- No se ejecutaron P01/P02 ni otras pruebas. Sus criterios quedan escritos y pendientes por instrucción expresa del usuario.
- La disponibilidad y comportamiento real de Copilot CLI no se comprobaron ni se invocó el proveedor.
- La compatibilidad Windows/Linux/macOS no está validada; solo se registran objetivos y código portable hasta que se autoricen pruebas.
