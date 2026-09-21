export function createRequestPlan(input) {
    const tasks = [];
    const add = (id, role, operation, dependencies = []) => tasks.push({ id, role, operation, dependencies });
    if (input.type === "inventory")
        add("inventory", "inventory", "inventory");
    if (["endpoints", "describe-service", "explain-connection", "refresh-docs", "specification", "migration", "adr"].includes(input.type)) {
        add("extract", "extract", "extract");
        if (input.type === "endpoints")
            add("query", "query", "endpoints", ["extract"]);
    }
    if (["explain-connection", "refresh-docs", "specification", "migration", "adr"].includes(input.type))
        add("graph", "graph", "correlate", ["extract"]);
    if (["describe-service", "refresh-docs", "specification", "migration", "adr"].includes(input.type)) {
        add("document", "documentation", "describe-service", input.type === "describe-service" ? ["extract"] : ["graph"]);
        add("validate", "validate", "review-mechanical", ["document"]);
    }
    if (input.type === "explain-connection")
        add("integrate", "integration", "explain-connection", ["graph"]);
    if (["specification", "migration", "adr"].includes(input.type))
        add("proposal", "proposal", input.type, ["validate"]);
    const confirmations = [];
    if ((input.scope ?? "standard") === "full")
        confirmations.push("scope_full");
    if (input.highImpact)
        confirmations.push("high_impact");
    if (input.strongModel)
        confirmations.push("strong_model");
    return { schema_version: 3, request_type: input.type, repository_ids: [...input.repository_ids], snapshot_ids: [...(input.snapshot_ids ?? [])], scope: input.scope ?? "standard", operation: input.type, tasks, dependencies: tasks.flatMap((task) => task.dependencies.map((dependency) => [dependency, task.id])), required_confirmations: confirmations, unknowns: [] };
}
export function planMenuRequest(type, repositoryIds) { return createRequestPlan({ type, repository_ids: repositoryIds }); }
//# sourceMappingURL=playbooks.js.map