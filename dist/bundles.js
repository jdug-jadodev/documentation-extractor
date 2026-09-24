import { contentHash, compareBytes, stableId } from "./platform/hash.js";
import { validateEvidence } from "./evidence.js";
import { redactValue, sanitizeDiagnostic } from "./security/redaction.js";
export function buildBundle(snapshot, results, inventoryCoverage) {
    const facts = unique(results.flatMap((result) => result.facts).map(redactFactAndReidentify), "id");
    const evidence = unique(results.flatMap((result) => result.evidence), "id");
    const diagnostics = unique(results.flatMap((result) => result.diagnostics).map(redactDiagnostic), "id");
    validateEvidence(evidence, facts, [snapshot]);
    const capabilities = results.flatMap((result) => result.coverage_by_capability).map((capability) => ({ ...capability, limitations: capability.limitations.map(sanitizeDiagnostic) }));
    const coverage = { ...inventoryCoverage, capabilities };
    const quality = inventoryCoverage.failed > 0 || capabilities.some((item) => item.status !== "implemented" || item.failed > 0) ? "partial" : results.length === 0 ? "unsupported" : "complete";
    const basis = { repository_id: snapshot.repository_id, snapshot_id: snapshot.id, quality, facts, evidence, diagnostics, coverage };
    return { schema_version: 3, ...basis, content_hash: contentHash(basis) };
}
function redactFactAndReidentify(fact) {
    const value = redactValue(fact.value);
    return { ...fact, id: stableId("fact", fact.component_id, fact.kind, value, ...fact.evidence_ids), value };
}
function redactDiagnostic(diagnostic) {
    const scope = sanitizeDiagnostic(diagnostic.scope);
    const message = sanitizeDiagnostic(diagnostic.message);
    const suggestedAction = sanitizeDiagnostic(diagnostic.suggested_action);
    return { ...diagnostic, id: stableId("diagnostic", diagnostic.severity, diagnostic.code, scope, message, ...diagnostic.evidence_ids), scope, message, suggested_action: suggestedAction };
}
function unique(items, key) {
    const result = new Map();
    for (const item of items)
        result.set(item[key], item);
    return [...result.values()].sort((a, b) => compareBytes(a[key], b[key]));
}
//# sourceMappingURL=bundles.js.map