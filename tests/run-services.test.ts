import test from "node:test";
import assert from "node:assert/strict";
import type { KnowledgeGraph } from "../src/contracts/types.js";
import { explainRelations, queryRunArtifacts, traceFlow, type RunArtifacts } from "../src/run_services.js";

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
