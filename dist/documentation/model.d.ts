import type { DocumentModel, Fact, Finding, KnowledgeGraph, Snapshot } from "../contracts/types.js";
export declare const ASD_SECTIONS: ReadonlyArray<{
    id: string;
    title: string;
    required: boolean;
}>;
export declare function createDocumentModel(input: {
    runId: string;
    title: string;
    snapshots: Snapshot[];
    facts: Fact[];
    findings?: Finding[];
    graph: KnowledgeGraph;
    interpretedSections?: Array<{
        section_id: string;
        paragraphs: string[];
        fact_ids: string[];
        finding_ids: string[];
        unknowns: string[];
    }>;
    archifyAvailable: boolean;
    archifyVersion?: string | null;
}): DocumentModel;
export interface ResolvedEndpoint {
    component: string;
    method: string;
    path: string;
    handler: string;
    source_path: string;
    status: string;
    evidence: string;
}
export declare function resolveEndpointFacts(allFacts: readonly Fact[]): ResolvedEndpoint[];
