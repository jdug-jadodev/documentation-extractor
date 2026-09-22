import type { Fact, GraphEdge, KnowledgeGraph, Scenario } from "../contracts/types.js";
import { stableId, compareBytes } from "../platform/hash.js";
import { asRecord, normalizeAlias, resolveIdentities } from "./identity.js";

export function buildGraph(facts: readonly Fact[], scenario: Scenario): KnowledgeGraph {
  const identity = resolveIdentities(facts, scenario);
  const nodes = new Map(identity.nodes.map((node) => [node.id, node]));
  const edges: GraphEdge[] = [];
  const evidenceByFact = new Map(facts.map((fact) => [fact.id, fact.evidence_ids]));
  const endpointIndex = buildEndpointIndex(facts);
  for (const fact of facts) {
    const from = `component:${fact.component_id}`;
    const value = asRecord(fact.value);
    if (fact.kind === "http_client_base") {
      const raw = String(value.base_url ?? "");
      const target = identity.aliases.get(normalizeAlias(raw));
      const to = target ?? stableId("node", "external_service", normalizeAlias(raw));
      if (!nodes.has(to)) nodes.set(to, { id: to, type: "external_service", label: normalizeAlias(raw) || "destino-no-resuelto", environment: scenario.environment, fact_ids: [fact.id] });
      edges.push(edge(from, to, "calls_http", target ? "supported" : "unresolved", fact, scenario, evidenceByFact, target ? [] : ["La base URL no tiene un alias explícito configurado."]));
    }
    if (fact.kind === "http_client_call") {
      const raw = String(value.path_expression ?? "");
      const alias = callBase(raw);
      const aliasedTarget = alias === null ? undefined : identity.aliases.get(normalizeAlias(alias));
      const matches = aliasedTarget === undefined ? matchEndpointTargets(fact, raw, endpointIndex) : [];
      const target = aliasedTarget ?? (matches.length === 1 ? `component:${matches[0]}` : undefined);
      if (target !== undefined) {
        const supported = aliasedTarget !== undefined;
        edges.push(edge(from, target, "calls_http", supported ? "supported" : "candidate", fact, scenario, evidenceByFact, supported ? [] : ["La relación se correlacionó por método y ruta; el montaje del router no pudo confirmarse estáticamente."]));
      } else {
        const label = normalizeAlias(alias ?? raw) || "destino-no-resuelto";
        const to = stableId("node", "external_service", label);
        if (!nodes.has(to)) nodes.set(to, { id: to, type: "external_service", label, environment: scenario.environment, fact_ids: [fact.id] });
        const limitation = matches.length > 1 ? "La ruta coincide con más de un componente y no existe un alias explícito configurado." : "La llamada no tiene un alias explícito configurado ni una ruta única coincidente.";
        edges.push(edge(from, to, "calls_http", "unresolved", fact, scenario, evidenceByFact, [limitation]));
      }
    }
    if (fact.kind === "message_producer" || fact.kind === "message_consumer") {
      const label = String(value.topic ?? value.destination ?? "unknown");
      const resource = stableId("node", "message_resource", value.environment ?? scenario.environment, label);
      if (!nodes.has(resource)) nodes.set(resource, { id: resource, type: "message_resource", label, environment: typeof value.environment === "string" ? value.environment : scenario.environment, fact_ids: [fact.id] });
      const type = fact.kind === "message_producer" ? "publishes_to" : "consumes_from";
      edges.push(edge(fact.kind === "message_producer" ? from : resource, fact.kind === "message_producer" ? resource : from, type, value.environment || scenario.environment ? "supported" : "candidate", fact, scenario, evidenceByFact, value.environment || scenario.environment ? [] : ["Entorno o namespace no resuelto."]));
    }
    if (["data_read", "data_write", "package_dependency"].includes(fact.kind)) {
      const label = String(value.resource ?? value.entity ?? value.package ?? "unknown");
      const nodeType = fact.kind === "package_dependency" ? "package" : "data_resource";
      const target = stableId("node", nodeType, scenario.environment, label);
      if (!nodes.has(target)) nodes.set(target, { id: target, type: nodeType, label, environment: scenario.environment, fact_ids: [fact.id] });
      const type = fact.kind === "data_read" ? "reads_data" : fact.kind === "data_write" ? "writes_data" : "depends_on_package";
      edges.push(edge(from, target, type, "supported", fact, scenario, evidenceByFact, []));
    }
  }
  return { schema_version: 3, scenario_id: scenario.id, snapshot_ids: scenario.snapshots.map((item) => item.snapshot_id), nodes: [...nodes.values()].sort((a, b) => compareBytes(a.id, b.id)), edges: uniqueEdges(edges) };
}

interface IndexedEndpoint { method: string; path: string; }

function buildEndpointIndex(facts: readonly Fact[]): Map<string, IndexedEndpoint[]> {
  const result = new Map<string, IndexedEndpoint[]>();
  const byComponent = new Map<string, Fact[]>();
  for (const fact of facts) {
    const list = byComponent.get(fact.component_id) ?? [];
    list.push(fact);
    byComponent.set(fact.component_id, list);
  }
  for (const [component, componentFacts] of byComponent) {
    const endpoints: IndexedEndpoint[] = [];
    const mounts = componentFacts.filter((fact) => fact.kind === "http_route_mount").map((fact) => String(asRecord(fact.value).path ?? "")).filter(Boolean);
    for (const fact of componentFacts) {
      if (fact.kind !== "http_endpoint" && fact.kind !== "http_endpoint_fragment") continue;
      const value = asRecord(fact.value);
      const path = String(value.path ?? "");
      const method = String(value.method ?? "UNKNOWN").toLocaleUpperCase("en-US");
      if (!path) continue;
      if (fact.kind === "http_endpoint" || value.route_scope === "application") endpoints.push({ method, path: normalizePath(path) });
      else if (mounts.length > 0) for (const mount of mounts) endpoints.push({ method, path: normalizePath(`${mount}/${path}`) });
      else endpoints.push({ method, path: normalizePath(path) });
    }
    result.set(component, endpoints);
  }
  return result;
}

function matchEndpointTargets(fact: Fact, raw: string, index: Map<string, IndexedEndpoint[]>): string[] {
  const path = callPath(raw);
  if (path === null) return [];
  const method = String(asRecord(fact.value).method ?? "UNKNOWN").toLocaleUpperCase("en-US");
  const matches: string[] = [];
  for (const [component, endpoints] of index) {
    if (component === fact.component_id) continue;
    if (endpoints.some((endpoint) => endpoint.path === path && (method === "UNKNOWN" || endpoint.method === "UNKNOWN" || endpoint.method === method))) matches.push(component);
  }
  return matches.sort(compareBytes);
}

function callBase(raw: string): string | null {
  const variable = raw.match(/^(\$\{[^}]+\})/u)?.[1];
  if (variable !== undefined) return variable;
  try { const url = new URL(raw); return `${url.protocol}//${url.host}`; } catch { return null; }
}

function callPath(raw: string): string | null {
  const withoutVariable = raw.replace(/^\$\{[^}]+\}/u, "");
  if (withoutVariable.startsWith("/")) return normalizePath(withoutVariable);
  try { return normalizePath(new URL(raw).pathname); } catch { return null; }
}

function normalizePath(value: string): string {
  const withSlash = value.startsWith("/") ? value : `/${value}`;
  const normalized = withSlash.replace(/\/{2,}/gu, "/").replace(/\/$/u, "");
  return normalized || "/";
}

function edge(from: string, to: string, type: GraphEdge["type"], status: GraphEdge["status"], fact: Fact, scenario: Scenario, evidenceByFact: Map<string, string[]>, limitations: string[]): GraphEdge {
  return { id: stableId("edge", scenario.id, from, to, type, fact.id), from, to, type, environment: scenario.environment, scenario_id: scenario.id, status, fact_ids: [fact.id], evidence_ids: evidenceByFact.get(fact.id) ?? [], rule_id: `graph.${type}.v1`, limitations };
}

function uniqueEdges(edges: GraphEdge[]): GraphEdge[] { return [...new Map(edges.map((item) => [item.id, item])).values()].sort((a, b) => compareBytes(a.id, b.id)); }
