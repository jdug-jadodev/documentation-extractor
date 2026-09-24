import type { BundleQuality, Coverage, Diagnostic, Evidence, ExtractionResult, Fact, Snapshot } from "./contracts/types.js";
import { contentHash, compareBytes, stableId } from "./platform/hash.js";
import { validateEvidence } from "./evidence.js";
import { redactValue, sanitizeDiagnostic } from "./security/redaction.js";

export interface FactBundle {
  schema_version: 3;
  repository_id: string;
  snapshot_id: string;
  quality: BundleQuality;
  facts: Fact[];
  evidence: Evidence[];
  diagnostics: Diagnostic[];
  coverage: Coverage;
  content_hash: string;
}

export function buildBundle(snapshot: Snapshot, results: readonly ExtractionResult[], inventoryCoverage: Coverage): FactBundle {
  const facts = unique(results.flatMap((result) => result.facts).map(redactFactAndReidentify), "id");
  const evidence = unique(results.flatMap((result) => result.evidence), "id");
  const diagnostics = unique(results.flatMap((result) => result.diagnostics).map(redactDiagnostic), "id");
  validateEvidence(evidence, facts, [snapshot]);
  const capabilities = results.flatMap((result) => result.coverage_by_capability).map((capability) => ({ ...capability, limitations: capability.limitations.map(sanitizeDiagnostic) }));
  const coverage: Coverage = { ...inventoryCoverage, capabilities };
  const quality: BundleQuality = inventoryCoverage.failed > 0 || capabilities.some((item) => item.status !== "implemented" || item.failed > 0) ? "partial" : results.length === 0 ? "unsupported" : "complete";
  const basis = { repository_id: snapshot.repository_id, snapshot_id: snapshot.id, quality, facts, evidence, diagnostics, coverage };
  return { schema_version: 3, ...basis, content_hash: contentHash(basis) };
}

function redactFactAndReidentify(fact: Fact): Fact {
  const value = redactValue(fact.value) as Fact["value"];
  return { ...fact, id: stableId("fact", fact.component_id, fact.kind, value, ...fact.evidence_ids), value };
}

function redactDiagnostic(diagnostic: Diagnostic): Diagnostic {
  const scope = sanitizeDiagnostic(diagnostic.scope);
  const message = sanitizeDiagnostic(diagnostic.message);
  const suggestedAction = sanitizeDiagnostic(diagnostic.suggested_action);
  return { ...diagnostic, id: stableId("diagnostic", diagnostic.severity, diagnostic.code, scope, message, ...diagnostic.evidence_ids), scope, message, suggested_action: suggestedAction };
}

function unique<T extends Record<K, string>, K extends keyof T>(items: readonly T[], key: K): T[] {
  const result = new Map<string, T>();
  for (const item of items) result.set(item[key], item);
  return [...result.values()].sort((a, b) => compareBytes(a[key], b[key]));
}
