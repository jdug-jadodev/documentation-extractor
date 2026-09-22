import test from "node:test";
import assert from "node:assert/strict";
import { createProposal } from "../src/proposal/model.js";
import { proposalIdentifier } from "../src/run_services.js";
import type { Evidence, Finding, KnowledgeGraph } from "../src/contracts/types.js";

test("una migración siempre incluye pruebas, criterios y decisiones pendientes trazables", () => {
  const graph: KnowledgeGraph = {
    schema_version: 3,
    scenario_id: "scenario",
    snapshot_ids: ["snapshot-a", "snapshot-b"],
    nodes: [
      { id: "component:client", type: "component", label: "client", environment: null, fact_ids: ["fact"] },
      { id: "component:service", type: "component", label: "service", environment: null, fact_ids: ["fact"] },
    ],
    edges: [{ id: "edge-candidate", from: "component:client", to: "component:service", type: "calls_http", environment: null, scenario_id: "scenario", status: "candidate", fact_ids: ["fact"], evidence_ids: ["evidence"], rule_id: "test", limitations: ["Montaje pendiente de revisión."] }],
  };
  const findings: Finding[] = [{ schema_version: 3, id: "finding", classification: "inference", statement: "client llama service", fact_ids: ["fact"], evidence_ids: ["evidence"], limitations: ["Montaje pendiente de revisión."] }];
  const evidence: Evidence[] = [{ schema_version: 3, id: "evidence", repository_id: "client", snapshot_id: "snapshot-a", relative_path: "src/client.ts", source_hash: "a".repeat(64), locator: { kind: "lines", start: 1, end: 1 }, rule_id: "test" }];
  const proposal = createProposal({ type: "migration", findings, graph, evidence, requestedChanges: ["Separar capacidad"] });
  assert.ok(proposal.acceptance_criteria.length >= 3);
  assert.ok(proposal.tests.some((item) => item.includes("HTTP")));
  assert.ok(proposal.pending_decisions.some((item) => item.includes("edge-candidate")));
  assert.equal(proposal.status, "review_required");
});

test("propuestas distintas del mismo run no comparten identificador", () => {
  const first = proposalIdentifier("run-example", "migration", "Separar autenticación", []);
  const second = proposalIdentifier("run-example", "migration", "Separar perfiles", []);
  assert.match(first, /^proposal-[a-f0-9]{24}$/u);
  assert.notEqual(first, second);
});
