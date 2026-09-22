import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDocumentModel, ASD_SECTIONS } from "../src/documentation/model.js";
import { renderDocument } from "../src/documentation/render.js";
import { buildCandidateVault } from "../src/obsidian/vault.js";
import type { Fact, KnowledgeGraph, Snapshot } from "../src/contracts/types.js";
import { branchKey } from "../src/platform/paths.js";

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

test("la documentación compone el montaje Express con la ruta del router", () => {
  const model = createDocumentModel({
    runId: "run-routes",
    title: "Rutas",
    snapshots: [],
    facts: [
      { schema_version: 3, id: "route", kind: "http_endpoint_fragment", component_id: "login", value: { method: "POST", path: "/login", route_scope: "router", source_path: "src/routes/auth.ts" }, evidence_ids: ["ev-route"], rule_id: "express.route" },
      { schema_version: 3, id: "mount", kind: "http_route_mount", component_id: "login", value: { path: "/auth", router_symbol: "authRoutes", source_path: "src/index.ts" }, evidence_ids: ["ev-mount"], rule_id: "express.mount" },
      { schema_version: 3, id: "import", kind: "module_dependency", component_id: "login", value: { source_path: "src/index.ts", target_path: "src/routes/auth.ts", external: false, imports: ["authRoutes"] }, evidence_ids: ["ev-import"], rule_id: "source.import" }
    ],
    graph: { schema_version: 3, scenario_id: "s", snapshot_ids: [], nodes: [], edges: [] },
    archifyAvailable: false
  });
  assert.match(renderDocument(model), /\/auth\/login/u);
});

test("la composición de rutas no mezcla archivos homónimos de repositorios distintos", () => {
  const shared = (component_id: string, prefix: string, suffix: string) => [
    { schema_version: 3 as const, id: `route-${suffix}`, kind: "http_endpoint_fragment", component_id, value: { method: "GET", path: "/", route_scope: "router", source_path: "src/routes/health.ts" }, evidence_ids: [`ev-route-${suffix}`], rule_id: "express.route" },
    { schema_version: 3 as const, id: `mount-${suffix}`, kind: "http_route_mount", component_id, value: { path: prefix, router_symbol: "healthRoutes", source_path: "src/index.ts" }, evidence_ids: [`ev-mount-${suffix}`], rule_id: "express.mount" },
    { schema_version: 3 as const, id: `import-${suffix}`, kind: "module_dependency", component_id, value: { source_path: "src/index.ts", target_path: "src/routes/health.ts", external: false, imports: ["healthRoutes"] }, evidence_ids: [`ev-import-${suffix}`], rule_id: "source.import" }
  ];
  const model = createDocumentModel({ runId: "run-isolation", title: "Aislamiento", snapshots: [], facts: [...shared("a", "/health-a", "a"), ...shared("b", "/health-b", "b")], graph: { schema_version: 3, scenario_id: "s", snapshot_ids: [], nodes: [], edges: [] }, archifyAvailable: false });
  const rendered = renderDocument(model);
  assert.equal((rendered.match(/\/health-a/g) ?? []).length, 2);
  assert.equal((rendered.match(/\/health-b/g) ?? []).length, 2);
});

test("la bóveda genera arquitectura, relaciones y un Mermaid por endpoint", async () => {
  const snapshot: Snapshot = { schema_version: 3, id: "snapshot-login", repository_id: "login", requested_ref: "main", resolved_ref: "main", commit_oid: "1234567890abcdef", capture_mode: "git", content_hash: "hash", dirty: false, captured_at: "2026-09-22T00:00:00.000Z" };
  const facts: Fact[] = [
    { schema_version: 3, id: "endpoint-login", kind: "http_endpoint", component_id: "login", value: { method: "POST", path: "/login", handler_expression: "loginController", source_path: "src/routes/login.ts" }, evidence_ids: ["ev-endpoint"], rule_id: "express.route" },
    { schema_version: 3, id: "module-route", kind: "source_module", component_id: "login", value: { path: "src/routes/login.ts", role: "route", layer: "api" }, evidence_ids: ["ev-route"], rule_id: "source.module" },
    { schema_version: 3, id: "module-controller", kind: "source_module", component_id: "login", value: { path: "src/controllers/login.ts", role: "controller", layer: "api" }, evidence_ids: ["ev-controller"], rule_id: "source.module" },
    { schema_version: 3, id: "import-controller", kind: "module_dependency", component_id: "login", value: { source_path: "src/routes/login.ts", target_path: "src/controllers/login.ts", external: false, imports: ["loginController"] }, evidence_ids: ["ev-import"], rule_id: "source.import" },
    { schema_version: 3, id: "client-login", kind: "http_client_call", component_id: "web", value: { method: "POST", path_expression: "${LOGIN_URL}/login" }, evidence_ids: ["ev-client"], rule_id: "react.fetch" },
    { schema_version: 3, id: "client-status", kind: "http_client_call", component_id: "login", value: { library: "fetch", method: "GET", path_expression: "${STATUS_URL}/health", source_path: "src/controllers/login.ts" }, evidence_ids: ["ev-status"], rule_id: "node.fetch" }
  ];
  const graph: KnowledgeGraph = {
    schema_version: 3,
    scenario_id: "scenario-docs",
    snapshot_ids: [snapshot.id],
    nodes: [
      { id: "component:web", type: "component", label: "web", environment: null, fact_ids: ["client-login"] },
      { id: "component:login", type: "component", label: "login", environment: null, fact_ids: ["endpoint-login", "client-status"] },
      { id: "external:status", type: "external_service", label: "status externo", environment: null, fact_ids: ["client-status"] }
    ],
    edges: [
      { id: "edge-login", from: "component:web", to: "component:login", type: "calls_http", environment: null, scenario_id: "scenario-docs", status: "supported", fact_ids: ["client-login"], evidence_ids: ["ev-client"], rule_id: "graph.calls_http.v1", limitations: [] },
      { id: "edge-status", from: "component:login", to: "external:status", type: "calls_http", environment: null, scenario_id: "scenario-docs", status: "unresolved", fact_ids: ["client-status"], evidence_ids: ["ev-status"], rule_id: "graph.calls_http.v1", limitations: ["Destino configurado por variable"] }
    ]
  };
  const model = createDocumentModel({ runId: "run-diagrams", title: "Login", snapshots: [snapshot], facts, graph, archifyAvailable: false });
  const root = await mkdtemp(join(tmpdir(), "docsys-vault-"));
  await buildCandidateVault(root, model, graph, new Map([["login", model]]), facts, {
    web: { type: "mobile_application", label: "Aplicación web móvil" },
    login: { type: "microservice", label: "Servicio de login" }
  });
  const flow = await readFile(join(root, "Servicios", "login", branchKey("main"), "flujos", "post-login.md"), "utf8");
  const service = await readFile(join(root, "Servicios", "login", branchKey("main"), "diagramas", "arquitectura.md"), "utf8");
  const outgoing = await readFile(join(root, "Servicios", "login", branchKey("main"), "flujos", "salida-get-status-url-health.md"), "utf8");
  const relations = await readFile(join(root, "Mapas", "microservicios.md"), "utf8");
  assert.match(flow, /flowchart LR/u);
  assert.match(flow, /loginController/u);
  assert.match(flow, /src\/controllers\/login\.ts/u);
  assert.match(service, /Arquitectura de login/u);
  assert.match(outgoing, /Salida GET \$\{STATUS_URL\}\/health/u);
  assert.match(outgoing, /status externo/u);
  assert.match(relations, /web.*POST \$\{LOGIN_URL\}\/login.*login/su);
  assert.match(relations, /Aplicaciones cliente independientes/u);
  assert.match(relations, /Microservicios y APIs independientes/u);
  assert.match(relations, /Aplicación web móvil · Aplicación móvil/u);
  assert.match(relations, /Servicio de login · Microservicio independiente/u);
  assert.match(service, /subgraph boundary\["Microservicio independiente · Servicio de login"\]/u);
  assert.match(service, /\n  end\n  rel/u);
});
