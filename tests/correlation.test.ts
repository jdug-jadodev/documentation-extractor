import test from "node:test";
import assert from "node:assert/strict";
import { buildGraph } from "../src/correlation/graph.js";
import type { Fact, Scenario } from "../src/contracts/types.js";

test("P46: alias explícito sustenta relación HTTP", () => { const fact: Fact = { schema_version: 3, id: "f1", kind: "http_client_base", component_id: "consumer", value: { base_url: "http://producer.internal" }, evidence_ids: ["e1"], rule_id: "r1" }; const scenario: Scenario = { schema_version: 3, id: "s", snapshots: [{ repository_id: "consumer", snapshot_id: "sc" }, { repository_id: "producer", snapshot_id: "sp" }], environment: "demo", aliases: { "http://producer.internal": "producer" } }; const graph = buildGraph([fact], scenario); assert.equal(graph.edges[0]?.status, "supported"); assert.equal(graph.edges[0]?.to, "component:producer"); });
test("P44/P48: un nombre sin identidad no crea llamada entre servicios", () => { const scenario: Scenario = { schema_version: 3, id: "s", snapshots: [{ repository_id: "a", snapshot_id: "sa" }], environment: null, aliases: {} }; assert.equal(buildGraph([], scenario).edges.length, 0); });
