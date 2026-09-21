export interface DependencyIndex {
    documents: Record<string, {
        fact_ids: string[];
        edge_ids: string[];
        evidence_ids: string[];
    }>;
}
export declare function impactedDocuments(index: DependencyIndex, changed: {
    fact_ids?: readonly string[];
    edge_ids?: readonly string[];
    evidence_ids?: readonly string[];
}): string[];
