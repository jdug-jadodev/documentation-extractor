import type { Evidence, Fact, Snapshot } from "./contracts/types.js";
export declare function validateEvidence(evidence: readonly Evidence[], facts: readonly Fact[], snapshots: readonly Snapshot[]): void;
export declare function verifyEvidenceBytes(item: Evidence, bytes: Uint8Array): boolean;
