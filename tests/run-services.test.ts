import test from "node:test";
import assert from "node:assert/strict";
import type { Fact, KnowledgeGraph } from "../src/contracts/types.js";
import { explainRelations, findDocumentableFlows, queryRunArtifacts, traceFlow, type RunArtifacts } from "../src/run_services.js";
import { explainEndpointFromFacts, explainServiceFromFacts } from "../src/documentation/semantic.js";

const graph: KnowledgeGraph = {
  schema_version: 3,
  scenario_id: "scenario-test",
  snapshot_ids: ["snapshot-a", "snapshot-b", "snapshot-c"],
  nodes: [
    { id: "component:frontend", type: "component", label: "frontend", environment: null, fact_ids: [] },
    { id: "component:pedidos", type: "component", label: "pedidos", environment: null, fact_ids: [] },
    { id: "component:pagos", type: "component", label: "pagos", environment: null, fact_ids: [] },
  ],
  edges: [
    { id: "edge-1", from: "component:frontend", to: "component:pedidos", type: "calls_http", environment: null, scenario_id: "scenario-test", status: "supported", fact_ids: ["fact-1"], evidence_ids: ["evidence-1"], rule_id: "test", limitations: [] },
    { id: "edge-2", from: "component:pedidos", to: "component:pagos", type: "calls_http", environment: null, scenario_id: "scenario-test", status: "candidate", fact_ids: ["fact-2"], evidence_ids: ["evidence-2"], rule_id: "test", limitations: ["Receptor inferido mediante alias."] },
  ],
};

test("un flujo conserva la secuencia y el estado más conservador", () => {
  const result = traceFlow(graph, "run-test", "frontend", "pagos");
  assert.equal(result.status, "candidate");
  assert.deepEqual(result.paths[0]?.nodes.map((node) => node.label), ["frontend", "pedidos", "pagos"]);
  assert.deepEqual(result.paths[0]?.edges.map((edge) => edge.id), ["edge-1", "edge-2"]);
});

test("un destino ausente se declara no resuelto sin inventar un camino", () => {
  const result = traceFlow(graph, "run-test", "frontend", "facturacion");
  assert.equal(result.status, "unresolved");
  assert.equal(result.paths.length, 0);
  assert.match(result.limitations[0] ?? "", /Destino no resuelto/u);
});

test("la consulta de relaciones filtra las aristas incidentes", () => {
  const result = explainRelations(graph, "run-test", "pedidos") as { edges: Array<{ id: string }> };
  assert.deepEqual(result.edges.map((edge) => edge.id), ["edge-1", "edge-2"]);
});

test("P86: cobertura y evidencia usan sus índices tipados", () => {
  const artifacts = {
    run_id: "run-test", root: "ignored", snapshots: [], facts: [], graph,
    evidence: [{ schema_version: 3, id: "evidence-1", repository_id: "pedidos", snapshot_id: "snapshot-b", relative_path: "src/api.ts", source_hash: "a".repeat(64), locator: { kind: "lines", start: 1, end: 2 }, rule_id: "test" }],
    inventories: [{ schema_version: 3, repository_id: "pedidos", snapshot_id: "snapshot-b", projects: [], files: [], candidate_stacks: [], diagnostics: [], coverage: { discovered: 1, excluded: 0, eligible: 1, processed: 1, failed: 0, unsupported: 0, not_scanned: 0, capabilities: [], exclusion_reasons: {} } }],
  } satisfies RunArtifacts;
  assert.equal(queryRunArtifacts(artifacts, "coverage").total, 1);
  assert.equal(queryRunArtifacts(artifacts, "evidence", { repositoryId: "pedidos" }).total, 1);
});

test("las explicaciones compactas usan el flujo precalculado sin devolver todos los hechos", () => {
  const facts: Fact[] = [
    { schema_version: 3, id: "endpoint", kind: "http_endpoint", component_id: "pedidos", value: { method: "POST", path: "/orders", handler_expression: "controller.create", source_path: "routes.ts" }, evidence_ids: ["ev-1"], rule_id: "test" },
    { schema_version: 3, id: "construction", kind: "object_construction", component_id: "pedidos", value: { variable: "controller", constructed_type: "OrderController", arguments: [], source_path: "routes.ts" }, evidence_ids: ["ev-1"], rule_id: "test" },
    { schema_version: 3, id: "controller", kind: "code_symbol", component_id: "pedidos", value: { symbol_id: "controller.create", name: "create", symbol_type: "method", class_name: "OrderController", signature: "create(input)", description: "Recibe la orden.", source_path: "controller.ts", start_line: 4 }, evidence_ids: ["ev-2"], rule_id: "test" },
    { schema_version: 3, id: "usecase", kind: "code_symbol", component_id: "pedidos", value: { symbol_id: "usecase.execute", name: "execute", symbol_type: "method", class_name: "CreateOrder", signature: "execute(input)", description: "Crea la orden.", source_path: "usecase.ts", start_line: 5 }, evidence_ids: ["ev-3"], rule_id: "test" },
    { schema_version: 3, id: "call", kind: "symbol_call", component_id: "pedidos", value: { caller_symbol_id: "controller.create", callee_name: "execute", receiver: "this.useCase", expression: "this.useCase.execute", target_symbol_id: "usecase.execute", resolution: "supported" }, evidence_ids: ["ev-2"], rule_id: "test" },
    { schema_version: 3, id: "data", kind: "data_write", component_id: "pedidos", value: { entity: "orders", operation: "insert", source_path: "usecase.ts" }, evidence_ids: ["ev-4"], rule_id: "test" },
    { schema_version: 3, id: "tech", kind: "package_dependency", component_id: "pedidos", value: { package: "express" }, evidence_ids: ["ev-5"], rule_id: "test" }
  ];
  const endpoint = explainEndpointFromFacts("run-test", "pedidos", "POST", "/orders", facts) as { steps?: Array<{ name: string }>; data?: Array<{ entity: string }> };
  assert.deepEqual(endpoint.steps?.map((step) => step.name), ["create", "execute"]);
  assert.equal(endpoint.data?.[0]?.entity, "orders");
  const service = explainServiceFromFacts("run-test", "pedidos", facts, graph) as { technologies: string[]; summary: { symbols: number } };
  assert.deepEqual(service.technologies, ["express"]);
  assert.equal(service.summary.symbols, 2);
});

test("la búsqueda funcional localiza un flujo sin leer el repositorio", () => {
  const facts: Fact[] = [
    { schema_version: 3, id: "admin", kind: "http_endpoint", component_id: "gr", value: { method: "GET", path: "/permisos-admin", handler_expression: "permissionHandler.getAdminPermissions", source_path: "api/PermissionRouter.java" }, evidence_ids: ["ev-admin"], rule_id: "webflux.functional-route" },
    { schema_version: 3, id: "user", kind: "http_endpoint", component_id: "gr", value: { method: "PUT", path: "/permisos-dni", handler_expression: "permissionHandler.updateByDni", source_path: "api/PermissionRouter.java" }, evidence_ids: ["ev-user"], rule_id: "webflux.functional-route" },
  ];
  const matches = findDocumentableFlows("gr", "permisos de administración", facts);
  assert.equal(matches[0]?.path, "/permisos-admin");
  assert.equal(matches[0]?.method, "GET");
});
