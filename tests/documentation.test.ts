import test from "node:test";
import assert from "node:assert/strict";
import { createDocumentModel, ASD_SECTIONS } from "../src/documentation/model.js";
import { renderDocument } from "../src/documentation/render.js";

test("P69/P70: ASD conserva secciones y fallback honesto", () => { const model = createDocumentModel({ runId: "run-x", title: "Demo", snapshots: [], facts: [], graph: { schema_version: 3, scenario_id: "s", snapshot_ids: [], nodes: [], edges: [] }, archifyAvailable: false }); assert.equal(model.sections.length, ASD_SECTIONS.length); assert.equal(model.archify.status, "unavailable"); assert.match(renderDocument(model), /Desconocido/u); });

test("la documentación representa endpoints fragmentarios, clientes HTTP y el valor de cada hecho", () => {
  const model = createDocumentModel({
    runId: "run-http",
    title: "HTTP",
    snapshots: [],
    facts: [
      { schema_version: 3, id: "endpoint", kind: "http_endpoint_fragment", component_id: "api", value: { method: "POST", path: "/login", route_scope: "router" }, evidence_ids: ["ev-1"], rule_id: "express.route" },
      { schema_version: 3, id: "client", kind: "http_client_call", component_id: "web", value: { method: "POST", path_expression: "${API}/login", target: null }, evidence_ids: ["ev-2"], rule_id: "react.fetch" }
    ],
    graph: { schema_version: 3, scenario_id: "s", snapshot_ids: [], nodes: [], edges: [] },
    archifyAvailable: false
  });
  const rendered = renderDocument(model);
  assert.match(rendered, /\/login/u);
  assert.match(rendered, /\$\{API\}\/login/u);
  assert.match(rendered, /http_endpoint_fragment/u);
});

test("las relaciones documentadas usan etiquetas legibles de los nodos", () => {
  const model = createDocumentModel({
    runId: "run-graph",
    title: "Grafo",
    snapshots: [],
    facts: [],
    graph: {
      schema_version: 3,
      scenario_id: "s",
      snapshot_ids: [],
      nodes: [
        { id: "component:api", type: "component", label: "api", environment: null, fact_ids: [] },
        { id: "node-data", type: "data_resource", label: "users", environment: null, fact_ids: [] }
      ],
      edges: [{ id: "edge", type: "reads_data", from: "component:api", to: "node-data", status: "supported", environment: null, fact_ids: [], evidence_ids: ["ev"], limitations: [], scenario_id: "s", rule_id: "graph.data.v1" }]
    },
    archifyAvailable: false
  });
  const rendered = renderDocument(model);
  assert.match(rendered, /api \(component\)/u);
  assert.match(rendered, /users \(data_resource\)/u);
  assert.doesNotMatch(rendered, /node-data/u);
});
