import { stableId } from "../platform/hash.js";
export function resolveIdentities(facts, scenario) {
    const nodes = new Map();
    const aliases = new Map();
    const conflicts = [];
    for (const { repository_id } of scenario.snapshots) {
        const componentId = `component:${repository_id}`;
        nodes.set(componentId, { id: componentId, type: "component", label: repository_id, environment: scenario.environment, fact_ids: facts.filter((fact) => fact.component_id === repository_id).map((fact) => fact.id) });
    }
    for (const [alias, configuredTarget] of Object.entries(scenario.aliases)) {
        const candidates = [...nodes.values()].filter((node) => node.id === configuredTarget || node.label === configuredTarget).map((node) => node.id);
        if (candidates.length === 1)
            aliases.set(normalizeAlias(alias), candidates[0]);
        else
            conflicts.push({ alias, candidates });
    }
    for (const fact of facts) {
        if (!["message_resource", "data_resource", "package_dependency"].includes(fact.kind))
            continue;
        const value = asRecord(fact.value);
        const label = String(value.topic ?? value.destination ?? value.resource ?? value.package ?? "unknown");
        const environment = typeof value.environment === "string" ? value.environment : scenario.environment;
        const type = fact.kind === "message_resource" ? "message_resource" : fact.kind === "data_resource" ? "data_resource" : "package";
        const id = stableId("node", type, environment, label);
        const existing = nodes.get(id);
        if (existing)
            existing.fact_ids.push(fact.id);
        else
            nodes.set(id, { id, type, label, environment, fact_ids: [fact.id] });
    }
    return { nodes: [...nodes.values()], aliases, conflicts };
}
export function normalizeAlias(value) {
    try {
        const url = new URL(value);
        return `${url.protocol}//${url.host}`.toLocaleLowerCase("en-US");
    }
    catch {
        return value.trim().toLocaleLowerCase("en-US").replace(/\/$/u, "");
    }
}
export function asRecord(value) { return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {}; }
//# sourceMappingURL=identity.js.map