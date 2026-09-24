/** Returns true when a path belongs to test-only source code. */
export function isTestSourcePath(input) {
    const path = input.replace(/\\/gu, "/").replace(/^\.\//u, "");
    const segments = path.toLocaleLowerCase("en-US").split("/").filter(Boolean);
    if (segments.some((segment) => ["test", "tests", "spec", "specs", "__tests__"].includes(segment) || segment.endsWith(".tests")))
        return true;
    const file = segments.at(-1) ?? "";
    if (/(?:^|\.)test\.[^.]+$/u.test(file) || /(?:^|\.)spec\.[^.]+$/u.test(file))
        return true;
    if (/^test_.*\.py$/u.test(file) || /_test\.py$/u.test(file))
        return true;
    return /(?:test|tests|spec|it|itcase)\.(?:java|kt|kts|groovy|cs)$/u.test(file);
}
/** Classifies a fact without discarding the raw analysis artifact that produced it. */
export function isTestFact(fact) {
    const value = asRecord(fact.value);
    if (String(value.source_set ?? "").toLocaleLowerCase("en-US") === "test")
        return true;
    for (const candidate of [value.source_path, value.path, value.manifest]) {
        if (typeof candidate === "string" && isTestSourcePath(candidate))
            return true;
    }
    if (fact.kind !== "symbol_call" && typeof value.target_path === "string" && isTestSourcePath(value.target_path))
        return true;
    return false;
}
/** Facts eligible for user-facing production documentation. */
export function productionFacts(facts) {
    return facts.filter((fact) => !isTestFact(fact)).map(withoutTestTarget);
}
/** Removes graph relations that are supported only by excluded test facts. */
export function graphForFacts(graph, facts) {
    const factIds = new Set(facts.map((fact) => fact.id));
    const componentIds = new Set(facts.map((fact) => `component:${fact.component_id.split(":", 1)[0]}`));
    const edges = graph.edges.filter((edge) => edge.fact_ids.length === 0 || edge.fact_ids.some((id) => factIds.has(id)));
    const referencedNodes = new Set(edges.flatMap((edge) => [edge.from, edge.to]));
    const nodes = graph.nodes.filter((node) => referencedNodes.has(node.id) || componentIds.has(node.id) || node.fact_ids.some((id) => factIds.has(id)));
    return { ...graph, nodes, edges };
}
function asRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function withoutTestTarget(fact) {
    if (fact.kind !== "symbol_call")
        return fact;
    const value = asRecord(fact.value);
    if (typeof value.target_path !== "string" || !isTestSourcePath(value.target_path))
        return fact;
    const sanitized = { ...value, target_symbol_id: null, target_class: null, target_path: null, resolution: "unresolved" };
    return { ...fact, value: sanitized };
}
//# sourceMappingURL=source_scope.js.map