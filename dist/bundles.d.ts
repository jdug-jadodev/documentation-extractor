import type { BundleQuality, Coverage, Diagnostic, Evidence, ExtractionResult, Fact, Snapshot } from "./contracts/types.js";
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
export declare function buildBundle(snapshot: Snapshot, results: readonly ExtractionResult[], inventoryCoverage: Coverage): FactBundle;
