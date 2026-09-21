export function selectSemanticReview(issues, basePacket) {
    const selected = issues.filter((issue) => issue.severity === "error" || issue.severity === "security");
    if (selected.length === 0)
        return null;
    const evidence = new Set(selected.flatMap((issue) => issue.evidence_ids));
    const factIds = new Set(basePacket.facts.filter((fact) => fact.evidence_ids.some((id) => evidence.has(id))).map((fact) => fact.id));
    return { ...basePacket, role: "review", operation: "semantic-review", request: `Revisa únicamente estas incidencias: ${JSON.stringify(selected)}`, facts: basePacket.facts.filter((fact) => factIds.has(fact.id)), evidence: basePacket.evidence.filter((item) => evidence.has(item.id)) };
}
//# sourceMappingURL=semantic.js.map