import type { BundleQuality, Coverage, Diagnostic, Evidence, ExtractionResult, Fact, Snapshot } from "./contracts/types.js";
import { contentHash, compareBytes } from "./platform/hash.js";
import { validateEvidence } from "./evidence.js";

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
  const facts = unique(results.flatMap((result) => result.facts), "id");
  const evidence = unique(results.flatMap((result) => result.evidence), "id");
  const diagnostics = unique(results.flatMap((result) => result.diagnostics), "id");
  validateEvidence(evidence, facts, [snapshot]);
  const capabilities = results.flatMap((result) => result.coverage_by_capability);
  const coverage: Coverage = { ...inventoryCoverage, capabilities };
  const quality: BundleQuality = inventoryCoverage.failed > 0 || capabilities.some((item) => item.status !== "implemented" || item.failed > 0) ? "partial" : results.length === 0 ? "unsupported" : "complete";
  const basis = { repository_id: snapshot.repository_id, snapshot_id: snapshot.id, quality, facts, evidence, diagnostics, coverage };
  return { schema_version: 3, ...basis, content_hash: contentHash(basis) };
}

function unique<T extends Record<K, string>, K extends keyof T>(items: readonly T[], key: K): T[] {
  const result = new Map<string, T>();
  for (const item of items) result.set(item[key], item);
  return [...result.values()].sort((a, b) => compareBytes(a[key], b[key]));
}
