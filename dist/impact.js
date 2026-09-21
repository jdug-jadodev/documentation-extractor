export function impactedDocuments(index, changed) {
    const facts = new Set(changed.fact_ids ?? []), edges = new Set(changed.edge_ids ?? []), evidence = new Set(changed.evidence_ids ?? []);
    return Object.entries(index.documents).filter(([, refs]) => refs.fact_ids.some((id) => facts.has(id)) || refs.edge_ids.some((id) => edges.has(id)) || refs.evidence_ids.some((id) => evidence.has(id))).map(([id]) => id).sort();
}
//# sourceMappingURL=impact.js.map