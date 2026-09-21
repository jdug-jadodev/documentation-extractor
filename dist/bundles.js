import { contentHash, compareBytes } from "./platform/hash.js";
import { validateEvidence } from "./evidence.js";
export function buildBundle(snapshot, results, inventoryCoverage) {
    const facts = unique(results.flatMap((result) => result.facts), "id");
    const evidence = unique(results.flatMap((result) => result.evidence), "id");
    const diagnostics = unique(results.flatMap((result) => result.diagnostics), "id");
    validateEvidence(evidence, facts, [snapshot]);
    const capabilities = results.flatMap((result) => result.coverage_by_capability);
    const coverage = { ...inventoryCoverage, capabilities };
    const quality = inventoryCoverage.failed > 0 || capabilities.some((item) => item.status !== "implemented" || item.failed > 0) ? "partial" : results.length === 0 ? "unsupported" : "complete";
    const basis = { repository_id: snapshot.repository_id, snapshot_id: snapshot.id, quality, facts, evidence, diagnostics, coverage };
    return { schema_version: 3, ...basis, content_hash: contentHash(basis) };
}
function unique(items, key) {
    const result = new Map();
    for (const item of items)
        result.set(item[key], item);
    return [...result.values()].sort((a, b) => compareBytes(a[key], b[key]));
}
//# sourceMappingURL=bundles.js.map