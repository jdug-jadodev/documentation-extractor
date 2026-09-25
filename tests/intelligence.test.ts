import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Fact, Snapshot } from "../src/contracts/types.js";
import { buildDocumentationIntelligence } from "../src/intelligence/index.js";
import { prepareAnalysisContext, searchDocumentation } from "../src/intelligence/retrieval.js";
import { explainResponsibilities, locateCapability } from "../src/intelligence/analysis.js";

test("el índice documental fragmenta, busca y reutiliza secciones sin leer repositorios", async () => {
  const root = await mkdtemp(join(tmpdir(), "docsys-intelligence-")), vault = join(root, "candidate-vault"), service = join(vault, "Servicios", "gr", "master-ref");
  await mkdir(join(service, "flujos"), { recursive: true });
  await mkdir(join(service, "clases"), { recursive: true });
  await writeFile(join(service, "servicio.md"), "# Servicio gr\n\n## Arquitectura\n\nMicroservicio reactivo con constructor explícito.\n\n## Navegación por código\n\n- [[flujos/get-permisos-admin|GET /permisos-admin]]\n");
  await writeFile(join(service, "flujos", "get-permisos-admin.md"), "# Entrada GET /permisos-admin\n\n## Diagrama del flujo\n\nInspectorHandler.permissionsAdmin --> InspectorMapperDto.toDto\nInspectorHandler.permissionsAdmin --> InspectorDomainUseCase.getInspectorsInfo --> InspectorRepositoryPortOut.getInspectorInfo\n\n## Clases y métodos del flujo\n\n`InspectorHandler.permissionsAdmin` en `src/main/java/InspectorHandler.java:10`.\n\n## Datos utilizados\n\nRepositorio de inspectores.\n\n## Evidencia\n\nevidence-admin\n");
  for (const [name, path] of [["InspectorHandler", "api/InspectorHandler.java"], ["InspectorMapperDto", "api/mapper/InspectorMapperDto.java"], ["InspectorDomainUseCase", "domain/InspectorDomainUseCase.java"], ["InspectorRepositoryPortOut", "domain/port/out/InspectorRepositoryPortOut.java"], ["InspectorsRepository", "infrastructure/repository/InspectorsRepository.java"], ["InspectorR2dbcRepository", "infrastructure/repository/InspectorR2dbcRepository.java"], ["InspectorMapper", "infrastructure/mapper/InspectorMapper.java"], ["InspectorEntity", "infrastructure/entity/InspectorEntity.java"]] as const) await writeFile(join(service, "clases", `${name.toLocaleLowerCase("en-US")}.md`), `# class ${name}\n\nArchivo: \`${path}\`.\n`);
  const snapshot: Snapshot = { schema_version: 3, id: "snapshot-gr", repository_id: "gr", requested_ref: "master", resolved_ref: "a".repeat(40), commit_oid: "a".repeat(40), capture_mode: "git", content_hash: "hash", dirty: false, captured_at: "2026-09-24T00:00:00.000Z" };
  const facts: Fact[] = [
    { schema_version: 3, id: "endpoint", kind: "http_endpoint", component_id: "gr", value: { method: "GET", path: "/permisos-admin", source_path: "src/main/java/InspectorRouter.java" }, evidence_ids: ["evidence-admin"], rule_id: "route" },
    { schema_version: 3, id: "impl", kind: "code_symbol", component_id: "gr", value: { name: "InspectorsRepository", symbol_type: "class", signature: "class InspectorsRepository implements InspectorRepositoryPortOut", snippet: "private final InspectorR2dbcRepository repositoryR2dbc; InspectorMapper::toDomain", source_path: "infrastructure/repository/InspectorsRepository.java", role: "repository" }, evidence_ids: [], rule_id: "symbol" },
    { schema_version: 3, id: "r2dbc", kind: "code_symbol", component_id: "gr", value: { name: "InspectorR2dbcRepository", symbol_type: "interface", signature: "interface InspectorR2dbcRepository extends R2dbcRepository<InspectorEntity,Integer>", snippet: "", source_path: "infrastructure/repository/InspectorR2dbcRepository.java", role: "repository" }, evidence_ids: [], rule_id: "symbol" },
    { schema_version: 3, id: "handler", kind: "code_symbol", component_id: "gr", value: { name: "permissionsAdmin", class_name: "InspectorHandler", symbol_type: "method", signature: "Mono<ServerResponse> permissionsAdmin(ServerRequest request)", snippet: "InspectorMapperDto::toDto", source_path: "api/InspectorHandler.java", role: "handler" }, evidence_ids: [], rule_id: "symbol" },
    { schema_version: 3, id: "port-method", kind: "code_symbol", component_id: "gr", value: { name: "getInspectorInfo", class_name: "InspectorRepositoryPortOut", symbol_type: "method", signature: "Flux<InspectorT> getInspectorInfo()", snippet: "", source_path: "domain/port/out/InspectorRepositoryPortOut.java", role: "port" }, evidence_ids: [], rule_id: "symbol" },
    { schema_version: 3, id: "mapper-dto", kind: "code_symbol", component_id: "gr", value: { name: "toDto", class_name: "InspectorMapperDto", symbol_type: "method", signature: "InspectorDto toDto(InspectorT value)", snippet: "", source_path: "api/mapper/InspectorMapperDto.java", role: "mapper" }, evidence_ids: [], rule_id: "symbol" },
    { schema_version: 3, id: "mapper", kind: "code_symbol", component_id: "gr", value: { name: "toDomain", class_name: "InspectorMapper", symbol_type: "method", signature: "InspectorT toDomain(InspectorEntity value)", snippet: "", source_path: "infrastructure/mapper/InspectorMapper.java", role: "mapper" }, evidence_ids: [], rule_id: "symbol" },
  ];
  const first = await buildDocumentationIntelligence({ runId: "run-index", runRoot: root, vaultRoot: vault, snapshots: [snapshot], facts, overrides: { intelligence: { capabilities: { "permisos-admin": { label: "Permisos de administración", aliases: ["administración de inspectores"], systems: ["gr", "core"] } }, ownership: { "permisos-admin": { api_orchestrator: "gr", business_owner: "core" } } } } });
  assert.ok(first.chunks.length >= 4);
  assert.ok(first.manifest.metrics.duration_ms >= 0);
  assert.ok(first.manifest.metrics.link_count > 0);
  assert.equal(first.capabilities.some((item) => item.id === "permisos-admin"), true);
  const search = await searchDocumentation(root, "permisos de administración");
  assert.equal(search.results[0]?.chunk.endpoint?.path, "/permisos-admin");
  const context = await prepareAnalysisContext({ runId: "run-index", runRoot: root, query: "desarrollo permisos administración", intent: "development" });
  assert.ok(context.statistics.estimated_tokens <= 15_000);
  assert.ok(context.chunks.some((chunk) => chunk.document_type === "flow"));
  const contextText = context.chunks.map((chunk) => `${chunk.heading} ${chunk.content}`).join("\n");
  for (const required of ["InspectorHandler", "InspectorMapperDto", "InspectorDomainUseCase", "InspectorRepositoryPortOut", "InspectorsRepository", "InspectorR2dbcRepository", "InspectorMapper", "InspectorEntity"]) assert.match(contextText, new RegExp(required, "u"));
  const located = await locateCapability(root, "administración de inspectores");
  assert.equal(located.matches[0]?.capability.id, "permisos-admin");
  const responsibilities = await explainResponsibilities(root, "permisos admin") as { responsibilities: Array<{ basis: string }> };
  assert.ok(responsibilities.responsibilities.some((item) => item.basis === "explicit"));
  const second = await buildDocumentationIntelligence({ runId: "run-index", runRoot: root, vaultRoot: vault, snapshots: [snapshot], facts });
  assert.equal(second.manifest.reused_chunks, second.manifest.chunks);
});
