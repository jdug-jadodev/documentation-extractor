import test from "node:test";
import assert from "node:assert/strict";
import { buildGraph } from "../src/correlation/graph.js";
import type { Fact, Scenario } from "../src/contracts/types.js";

test("P46: alias explícito sustenta relación HTTP", () => { const fact: Fact = { schema_version: 3, id: "f1", kind: "http_client_base", component_id: "consumer", value: { base_url: "http://producer.internal" }, evidence_ids: ["e1"], rule_id: "r1" }; const scenario: Scenario = { schema_version: 3, id: "s", snapshots: [{ repository_id: "consumer", snapshot_id: "sc" }, { repository_id: "producer", snapshot_id: "sp" }], environment: "demo", aliases: { "http://producer.internal": "producer" } }; const graph = buildGraph([fact], scenario); assert.equal(graph.edges[0]?.status, "supported"); assert.equal(graph.edges[0]?.to, "component:producer"); });
test("P44/P48: un nombre sin identidad no crea llamada entre servicios", () => { const scenario: Scenario = { schema_version: 3, id: "s", snapshots: [{ repository_id: "a", snapshot_id: "sa" }], environment: null, aliases: {} }; assert.equal(buildGraph([], scenario).edges.length, 0); });

test("una llamada se propone como candidata cuando método y ruta compuesta identifican un único servicio", () => {
  const facts: Fact[] = [
    { schema_version: 3, id: "call", kind: "http_client_call", component_id: "frontend", value: { method: "POST", path_expression: "${BACKEND_URL}/auth/self-register" }, evidence_ids: ["ev-call"], rule_id: "fetch" },
    { schema_version: 3, id: "mount", kind: "http_route_mount", component_id: "login", value: { path: "/auth" }, evidence_ids: ["ev-mount"], rule_id: "mount" },
    { schema_version: 3, id: "endpoint", kind: "http_endpoint_fragment", component_id: "login", value: { method: "POST", path: "/self-register", route_scope: "router" }, evidence_ids: ["ev-endpoint"], rule_id: "route" },
  ];
  const scenario: Scenario = { schema_version: 3, id: "s", snapshots: [{ repository_id: "frontend", snapshot_id: "sf" }, { repository_id: "login", snapshot_id: "sl" }], environment: null, aliases: {} };
  const relation = buildGraph(facts, scenario).edges.find((item) => item.from === "component:frontend" && item.to === "component:login");
  assert.equal(relation?.status, "candidate");
});
