import type { Fact, KnowledgeGraph, Snapshot } from "../contracts/types.js";
import type { Capability, DocumentationChunk, DocumentationIntelligenceManifest, DocumentationLink } from "./types.js";
export interface DocumentationIntelligenceIndex {
    root: string;
    manifest: DocumentationIntelligenceManifest;
    chunks: DocumentationChunk[];
    links: DocumentationLink[];
    capabilities: Capability[];
}
export declare function buildDocumentationIntelligence(input: {
    runId: string;
    runRoot: string;
    vaultRoot: string;
    snapshots: readonly Snapshot[];
    facts: readonly Fact[];
    graph?: KnowledgeGraph;
    overrides?: Record<string, unknown>;
}): Promise<DocumentationIntelligenceIndex>;
export declare function loadDocumentationIntelligence(runRoot: string): Promise<DocumentationIntelligenceIndex>;
