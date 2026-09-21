import { stableId, compareBytes } from "../platform/hash.js";
import { asRecord, normalizeAlias, resolveIdentities } from "./identity.js";
export function buildGraph(facts, scenario) {
    const identity = resolveIdentities(facts, scenario);
    const nodes = new Map(identity.nodes.map((node) => [node.id, node]));
    const edges = [];
    const evidenceByFact = new Map(facts.map((fact) => [fact.id, fact.evidence_ids]));
    for (const fact of facts) {
        const from = `component:${fact.component_id}`;
        const value = asRecord(fact.value);
        if (fact.kind === "http_client_base") {
            const raw = String(value.base_url ?? "");
            const target = identity.aliases.get(normalizeAlias(raw));
            const to = target ?? stableId("node", "external_service", normalizeAlias(raw));
            if (!nodes.has(to))
                nodes.set(to, { id: to, type: "external_service", label: normalizeAlias(raw) || "destino-no-resuelto", environment: scenario.environment, fact_ids: [fact.id] });
            edges.push(edge(from, to, "calls_http", target ? "supported" : "unresolved", fact, scenario, evidenceByFact, target ? [] : ["La base URL no tiene alias humano aprobado."]));
        }
        if (fact.kind === "message_producer" || fact.kind === "message_consumer") {
            const label = String(value.topic ?? value.destination ?? "unknown");
            const resource = stableId("node", "message_resource", value.environment ?? scenario.environment, label);
            if (!nodes.has(resource))
                nodes.set(resource, { id: resource, type: "message_resource", label, environment: typeof value.environment === "string" ? value.environment : scenario.environment, fact_ids: [fact.id] });
            const type = fact.kind === "message_producer" ? "publishes_to" : "consumes_from";
            edges.push(edge(fact.kind === "message_producer" ? from : resource, fact.kind === "message_producer" ? resource : from, type, value.environment || scenario.environment ? "supported" : "candidate", fact, scenario, evidenceByFact, value.environment || scenario.environment ? [] : ["Entorno o namespace no resuelto."]));
        }
        if (["data_read", "data_write", "package_dependency"].includes(fact.kind)) {
            const label = String(value.resource ?? value.entity ?? value.package ?? "unknown");
            const nodeType = fact.kind === "package_dependency" ? "package" : "data_resource";
            const target = stableId("node", nodeType, scenario.environment, label);
            if (!nodes.has(target))
                nodes.set(target, { id: target, type: nodeType, label, environment: scenario.environment, fact_ids: [fact.id] });
            const type = fact.kind === "data_read" ? "reads_data" : fact.kind === "data_write" ? "writes_data" : "depends_on_package";
            edges.push(edge(from, target, type, "supported", fact, scenario, evidenceByFact, []));
        }
    }
    return { schema_version: 3, scenario_id: scenario.id, snapshot_ids: scenario.snapshots.map((item) => item.snapshot_id), nodes: [...nodes.values()].sort((a, b) => compareBytes(a.id, b.id)), edges: uniqueEdges(edges) };
}
function edge(from, to, type, status, fact, scenario, evidenceByFact, limitations) {
    return { id: stableId("edge", scenario.id, from, to, type, fact.id), from, to, type, environment: scenario.environment, scenario_id: scenario.id, status, fact_ids: [fact.id], evidence_ids: evidenceByFact.get(fact.id) ?? [], rule_id: `graph.${type}.v1`, limitations };
}
function uniqueEdges(edges) { return [...new Map(edges.map((item) => [item.id, item])).values()].sort((a, b) => compareBytes(a.id, b.id)); }
//# sourceMappingURL=graph.js.map